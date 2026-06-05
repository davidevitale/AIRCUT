# Task — Correzioni post-audit (sicurezza, bug, cleanup)

> **Per il coding agent.** Questo documento è una specifica di implementazione derivata da un audit del repo AirCut. Leggilo tutto prima di scrivere codice. I riferimenti ai file seguono `PROJECT_STRUCTURE.md`. Ogni intervento ha: contesto, file, cosa fare, criteri di accettazione. Rispetta sempre le convenzioni del repo (service layer per i dati, i18n per i testi, niente chiamate Firestore dirette negli screen).

---

## 0. Regole trasversali (valide per tutti gli step)

- ⚠️ **Modifica SOLO sotto `src/app/**` per le schermate attive (expo-router).** NON toccare `src/screens/**` né `src/navigation/HomeStackNavigator.js` salvo lo Step 8, che ne prevede la rimozione esplicita.
- Nessuna stringa hardcoded negli screen: nuove stringhe → **entrambe** le locale `src/i18n/locales/it-IT/translation.json` e `en-UK/translation.json`.
- I dati passano dai service (`src/services/*`), mai Firestore diretto nello screen.
- Dopo ogni modifica significativa, esegui i test (`npm test`) e il lint (`npx eslint <file>`); vedi Step 9.
- Ogni step è indipendente: puoi aprirli come commit/PR separati. Ordine consigliato di priorità: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10**.

---

## Step 1 — [CRITICO] Aggiungere `storage.rules` (Firebase Storage non protetto)

**Contesto.** Nel repo esiste `firestore.rules` ma **non** esiste alcun file di regole per Firebase Storage. L'app carica avatar e media su path noti (`profile/{uid}/...`, `portfolio/images/{uid}/...`, `portfolio/videos/{uid}/...`, `posts/{postId}/...`). Senza regole, lo Storage è potenzialmente aperto in lettura/scrittura/eliminazione anche a file di altri utenti. È il rischio di sicurezza più grave.

**File da creare:** `storage.rules` (root del progetto, accanto a `firestore.rules`).

**Cosa fare.**
1. Crea `storage.rules` con `rules_version = '2'` e logica di ownership coerente con `firestore.rules`:
   - `profile/{uid}/**`: `read` per utenti autenticati; `write` (create/update/delete) solo se `request.auth.uid == uid`.
   - `portfolio/images/{uid}/**` e `portfolio/videos/{uid}/**`: idem (write solo owner).
   - `posts/{postId}/**`: `read` per autenticati; `write` solo se l'utente è un barbiere proprietario. Poiché Storage rules non possono leggere Firestore facilmente, in mancanza di `firebase.storage` cross-service, vincola almeno la scrittura ad utenti autenticati e valida `request.auth != null`; documenta nel file il limite e proponi (commento) la verifica ownership lato Cloud Function se serve granularità per-post.
   - Limita la dimensione massima upload (es. `request.resource.size < 15 * 1024 * 1024`) e il content-type (`request.resource.contentType.matches('image/.*|video/.*')`).
2. Aggiorna `firebase.json` (se presente) o la documentazione di deploy aggiungendo il target storage. Se `firebase.json` non esiste, creane uno minimale che dichiari `firestore.rules` **e** `storage.rules`.
3. Aggiungi una riga al README / IMPLEMENTATION_NOTES con il comando di deploy: `firebase deploy --only storage`.

**Criteri di accettazione.**
- [ ] `storage.rules` esiste, sintatticamente valido (`firebase deploy --only storage --dry-run` o validazione equivalente).
- [ ] Scrittura su `profile/{uid}` consentita solo al proprietario; lettura agli autenticati.
- [ ] Limite di dimensione e content-type presenti.
- [ ] Deploy documentato.

---

## Step 2 — [BUG] `checkUsernameUniqueness` interroga un campo inesistente e riceve l'argomento sbagliato

**Contesto.** In `src/services/authService.js`:
- `checkUsernameUniqueness(username)` esegue `where('nomeUtente', '==', username)` sulla collection `clients`, ma il documento cliente salva il campo come **`userName`** (camelCase): `nomeUtente` non esiste su nessun documento → la query torna sempre vuota.
- In `registerClient` la funzione è chiamata come `checkUsernameUniqueness(userData.email)`: passa la **email**, non lo username. Quindi il controllo di unicità dello username non viene mai realmente eseguito.

**File:** `src/services/authService.js` (funzioni `checkUsernameUniqueness` ~riga 184 e `registerClient` ~riga 243–272).

**Cosa fare.**
1. In `checkUsernameUniqueness`, correggi la query clienti in `where('userName', '==', username)`. Mantieni il controllo barbieri su `salonName` (corretto). Valuta una normalizzazione case-insensitive coerente con `checkBarberNicknameUniqueness` (trim + lowercase) per evitare duplicati con sola differenza di maiuscole.
2. In `registerClient`, decidi la semantica desiderata (vedi nota sotto) e correggi la chiamata:
   - Se l'unicità deve essere sullo **username**, chiama `checkUsernameUniqueness(userData.userName)` e usa una chiave d'errore dedicata (es. `userNameAlreadyExist`).
   - L'unicità della **email** è già garantita da Firebase Auth (`auth/email-already-in-use`, già gestito nel catch) → **non** serve duplicarla con una query Firestore. Rimuovi l'uso improprio di `checkUsernameUniqueness` per la email.
3. Se aggiungi la chiave d'errore `userNameAlreadyExist`, aggiungila a `knownErrorKeys` in `RegisterClientScreen.js` e alle due locale i18n (namespace `ClientRegistrationScreen`).

> **Nota di prodotto (richiede decisione, non bloccante):** verifica se lo username cliente deve davvero essere univoco. Se sì, applica i punti sopra; se no, rimuovi del tutto la chiamata di unicità per i clienti e affidati solo all'unicità email di Auth. Annota la scelta nella PR.

**Criteri di accettazione.**
- [ ] La query usa `userName` (campo reale), non `nomeUtente`.
- [ ] `registerClient` non passa più `userData.email` a un controllo di unicità username.
- [ ] Registrazione cliente con username duplicato → errore tradotto (se l'unicità username è confermata come requisito).
- [ ] Nessuna regressione sull'errore email-già-in-uso (resta gestito via Firebase Auth).

---

## Step 3 — [BUG] `checkFirestoreConnection` è codice morto e rotto

**Contesto.** In `config/firebase.js`, `checkFirestoreConnection` fa `db._delegate._databaseId.then(...)`: accede ad API interne private (`_delegate` non esiste più nel SDK modulare recente) e chiama `.then()` su un valore non-Promise. Se invocata, lancia. Verificato che **non è importata da nessun file** del progetto (solo `enableFirestoreNetwork`/`disableFirestoreNetwork` sono potenzialmente utili).

**File:** `config/firebase.js`.

**Cosa fare (scegli UNA opzione).**
- **Opzione A (consigliata):** rimuovi del tutto `checkFirestoreConnection` (è morta) e affida il monitoraggio connessione a `hooks/useFirebaseConnection.js`, che è il meccanismo realmente usato.
- **Opzione B:** riscrivila con una vera operazione: un `getDoc` leggero su un documento sentinella (es. `doc(db, 'tags', '<noto>')`) con timeout, ritornando `true/false` senza accedere ad API interne.

> Il prompt di sistema vieta di modificare `config/firebase.js` **salvo** manchi un export necessario di `auth`/`db`/`storage`. Qui si tratta di rimuovere/riscrivere una utility rotta non legata a quegli export: è un intervento di cleanup ammesso. Se preferisci non toccare il file, sposta la utility in un nuovo modulo `src/services/connectionService.js` e lascia `firebase.js` invariato.

**Criteri di accettazione.**
- [ ] Nessun accesso a `_delegate`/`_databaseId` o altre API interne.
- [ ] Nessun import rotto residuo (la funzione era già non importata).

---

## Step 4 — [BUG/VERIFICA] Aggiornamento email potenzialmente non funzionante

**Contesto.** `updateUserEmail` in `src/services/userService.js` usa `updateEmail()`. Nelle versioni recenti di Firebase Auth, con "Email enumeration protection" attiva, `updateEmail` è bloccato e va sostituito da `verifyBeforeUpdateEmail` (l'utente conferma dal link nella nuova casella prima dell'effettivo cambio).

**File:** `src/services/userService.js` (`updateUserEmail`).

**Cosa fare.**
1. Verifica sul progetto Firebase corrente se `updateEmail` funziona o lancia `auth/operation-not-allowed` / richiede verifica.
2. Se richiede verifica: sostituisci con `verifyBeforeUpdateEmail(user, newEmail)` dopo la `reauthenticateWithCredential`. Aggiorna il documento Firestore **solo dopo** che il cambio è confermato (oppure rinuncia ad aggiornare Firestore inline e affidati a un trigger, documentandolo). Adatta i messaggi: l'utente va informato che deve confermare dalla nuova email.
3. Aggiungi/aggiorna le stringhe i18n relative al nuovo flusso (entrambe le locale).

> Questa funzione oggi è richiamata solo dallo screen legacy `src/screens/EditClientProfileScreen.js`. Se lo Step 8 rimuove i legacy e il cambio email non è esposto altrove, valuta se l'intervento è ancora necessario o solo da documentare come "fuori scope finché non esiste una UI attiva". Annota la decisione.

**Criteri di accettazione.**
- [ ] Comportamento di `updateUserEmail` verificato sul progetto reale (funziona / richiede verifica).
- [ ] Se serve verifica: flusso `verifyBeforeUpdateEmail` implementato e Firestore aggiornato in modo coerente.
- [ ] Stringhe del flusso presenti in entrambe le locale.

---

## Step 5 — [DATI] Pulizia incompleta su eliminazione account

**Contesto.** `deleteAccount` (`src/services/userService.js`) cancella: media Storage del proprietario, post del barbiere, subcollezioni `blocked`, documento utente, utente Auth. Restano **orfani**: like/engagement messi dall'utente su post altrui, documenti `reports` con `reporterUid` dell'utente, eventuali riferimenti in cache feed. Il cleanup è inoltre client-side: se `deleteUser` perde i permessi a metà, alcune cancellazioni possono restare incomplete.

**File:** `src/services/userService.js` (`deleteAccount`), `src/services/engagementService.js` (per capire dove vivono i like).

**Cosa fare.**
1. Mappa nel codice cosa è legato all'`uid`: leggi `engagementService.js`/`postService.js` per individuare dove sono memorizzati like/engagement (array su documento post? subcollection?).
2. Estendi `deleteAccount` per rimuovere almeno: i like dell'utente sui post altrui (es. `arrayRemove(uid)` sui post likati) se la struttura lo consente in modo efficiente.
3. Per ciò che non è ragionevolmente eliminabile client-side (es. `reports`, scansioni costose), **documenta** nel codice e nella PR cosa resta orfano e proponi una **Cloud Function** `onUserDelete` server-side come soluzione robusta (con privilegi admin), che è l'approccio corretto per il "diritto alla cancellazione".
4. Non rimuovere la gestione esistente di `auth/requires-recent-login`.

> Questo step ha una componente di **decisione di prodotto/infra** (Cloud Function sì/no). Se l'infra serverless non è in scope ora, limita l'implementazione al cleanup client-side fattibile e lascia il resto documentato. Non introdurre scorciatoie che saltino la conferma utente.

**Criteri di accettazione.**
- [ ] Documentato (codice + PR) l'elenco preciso di dati che restano orfani.
- [ ] Like dell'utente rimossi dai post altrui (o motivata l'impossibilità).
- [ ] Proposta Cloud Function descritta se il cleanup completo non è client-side.

---

## Step 6 — [CLEANUP] Rimuovere i `console.log` con PII dai service

**Contesto.** ~95 `console.log` nei soli `src/services/*` (16 in authService, 16 in xpService, 15 in barberService, 13 in userService, ecc.). Molti loggano `uid`, ruolo e contenuto di documenti utente → rumore in produzione ed esposizione di PII nei log del dispositivo.

**File:** tutti i `src/services/*.js` (e, dove presenti, gli screen attivi).

**Cosa fare.**
1. Rimuovi i log puramente diagnostici, oppure incapsulali dietro un guard `if (__DEV__) { ... }`, oppure introduci un piccolo logger centralizzato (`src/services/logger.js`) che no-op in produzione.
2. Priorità: eliminare i log che stampano `uid`, email, dati documento, payload registrazione.
3. Non rimuovere i `console.error`/`console.warn` legati a gestione errori reale (utili per crash reporting), ma valuta di non includervi PII.

**Criteri di accettazione.**
- [ ] Nessun `console.log` che stampa PII in produzione (gated da `__DEV__` o rimosso).
- [ ] App funzionante; nessun riferimento a un logger inesistente.

---

## Step 7 — [CLEANUP] Rimuovere file spuri dal repository

**Contesto.** Nel repo sono presenti artefatti che non dovrebbero essere versionati e creano rischio di import accidentali e confusione nelle ricerche:
- `*.tmp` / `*.js.tmp`: `src/services/authService.js.tmp`, `src/services/postService.js.tmp`, `src/services/barberProfileStore.js.tmp`, `src/app/(protected)/BarberProfileScreen.js.tmp`, `ClientAccountScreen.js.tmp`, `HomeScreen.js.tmp`, `PostScreen.js.tmp`, `SearchScreen.js.tmp`, `src/components/BarberPost.js.tmp`.
- `src/app/(protected)/.fuse_hidden0000000d00000001` (file fuse residuo).
- Legacy duplicati: `src/screens/SearchScreen_old.js`, `src/screens/SearchScreen_new.js` (vedi anche Step 8).

**Cosa fare.**
1. Verifica che **nessun** file `.tmp`/`.fuse_hidden` sia importato (grep degli import) — non dovrebbero esserlo.
2. Rimuovili dal repo (`git rm`).
3. Aggiungi al `.gitignore` i pattern: `*.tmp`, `*.js.tmp`, `.fuse_hidden*`, eventuali `*~`.

**Criteri di accettazione.**
- [ ] Nessun `.tmp`/`.js.tmp`/`.fuse_hidden*` tracciato nel repo.
- [ ] `.gitignore` aggiornato con i pattern.
- [ ] Build e test invariati (i file rimossi non erano referenziati).

---

## Step 8 — [CLEANUP/ARCHITETTURA] Eliminare l'albero legacy `src/screens/**` e la navigazione morta

**Contesto.** Coesistono due alberi di schermate: `src/app/**` (attivo, expo-router) e `src/screens/**` (legacy, non instradato). È una trappola permanente: le modifiche rischiano di finire nel codice morto. Le funzioni legacy `getUserByName`, `getUserProfileData`, `updateUserProfile` (in `userService.js`) leggono/scrivono campi fantasma (`nome`, `cognome`, `citta`, `username`, `userType`) **non** coerenti con la shape reale (`userName`, `firstName`, `role`) e sono usate **solo** dagli screen legacy `src/screens/EditClientProfileScreen.js` e `EditBarberProfileScreen.js`.

**Cosa fare (procedura sicura).**
1. Per ogni file in `src/screens/**`, verifica con grep che **nessun** file sotto `src/app/**` lo importi. (Lo screen client edit attivo è ora inline e non importa più il legacy.)
2. Rimuovi gli screen legacy non referenziati, inclusi `SearchScreen_old.js`/`SearchScreen_new.js`, e `src/navigation/HomeStackNavigator.js` se non importato.
3. Dopo aver rimosso gli screen legacy, rimuovi da `src/services/userService.js` le funzioni legacy ormai morte (`getUserByName`, `getUserProfileData`, `updateUserProfile`, e le relative export) **solo se** confermato che nessun file attivo le usa. Attenzione: `updateUserEmail`/`updateUserPassword` potrebbero servire a un futuro flusso "cambia password/email" → valuta prima di rimuoverle (vedi Step 4).
4. Aggiorna `PROJECT_STRUCTURE.md` rimuovendo i riferimenti all'albero legacy.

> **Step a rischio:** procedi per piccoli commit e fai girare `npm test` + un avvio dell'app dopo ogni rimozione. Se un import inatteso emerge, fermati e annota.

**Criteri di accettazione.**
- [ ] Nessun file sotto `src/app/**` importa più da `src/screens/**` o `src/navigation/`.
- [ ] Screen legacy non referenziati rimossi.
- [ ] Funzioni service legacy morte rimosse (o motivata la conservazione).
- [ ] `npm test` verde; app si avvia; nessuna route rotta.
- [ ] `PROJECT_STRUCTURE.md` aggiornato.

---

## Step 9 — [TOOLING] Ripristinare ESLint e la pipeline di verifica

**Contesto.** `node_modules/type-check/package.json` risulta corrotto e blocca ESLint (`Invalid package config`). Finché non si risolve, il linting è cieco.

**Cosa fare.**
1. `rm -rf node_modules package-lock.json` e reinstalla pulito (`npm install`). Verifica che `npx eslint .` giri senza errori di config.
2. Esegui `npx eslint` sull'intero `src/` e correggi/segnala i warning rilevanti emersi dagli step precedenti.
3. Esegui `npm test` e verifica che i test puri esistenti passino (`feedRanking`, `genderMapping`, `photoPreview`).
4. (Opzionale ma consigliato) aggiungi uno script CI minimale che esegua lint + test.

**Criteri di accettazione.**
- [ ] `npx eslint .` eseguibile senza crash di configurazione.
- [ ] `npm test` verde.
- [ ] Nessun errore di lint nei file toccati dagli step 1–8.

---

## Step 10 — [HARDENING, opzionale] Config Firebase via variabili d'ambiente

**Contesto.** Le chiavi Firebase sono hardcoded in `config/firebase.js`. Per un client Firebase le chiavi web non sono segrete, ma hardcodarle lega il binario a un singolo progetto e impedisce di separare dev/prod.

**Cosa fare.**
1. Sposta la config in variabili d'ambiente Expo: usa `app.config.js` (al posto o accanto a `app.json`) con `extra` popolato da `process.env.EXPO_PUBLIC_FIREBASE_*`, e leggi via `expo-constants` o le variabili `EXPO_PUBLIC_*`.
2. Aggiungi un `.env.example` con i nomi delle variabili (senza valori).
3. Verifica che `.gitignore` ignori i file `.env` reali (già presente `.env*.local`; estendi se necessario).

> Step **non bloccante** e con impatto su build/EAS: pianificalo separatamente. Le chiavi attuali non sono un leak di sicurezza in senso stretto.

**Criteri di accettazione.**
- [ ] Config Firebase letta da env (`EXPO_PUBLIC_FIREBASE_*`).
- [ ] `.env.example` presente; `.env` reali ignorati da git.
- [ ] Build dev e prod funzionanti con i rispettivi env.

---

## Riepilogo priorità

| Step | Tipo | Priorità | Rischio intervento |
|---|---|---|---|
| 1 — storage.rules | Sicurezza | 🔴 Alta | Basso |
| 2 — unicità username | Bug | 🔴 Alta | Basso |
| 3 — checkFirestoreConnection | Bug/cleanup | 🟠 Media | Basso |
| 4 — updateEmail | Bug/verifica | 🟠 Media | Medio (dipende da Firebase) |
| 5 — cleanup deleteAccount | Dati/privacy | 🟠 Media | Medio (decisione infra) |
| 6 — console.log PII | Cleanup | 🟡 Bassa | Basso |
| 7 — file spuri | Cleanup | 🟡 Bassa | Basso |
| 8 — rimozione legacy | Architettura | 🟡 Bassa | Medio (verifica import) |
| 9 — ESLint/CI | Tooling | 🟠 Media | Basso |
| 10 — config env | Hardening | ⚪ Opzionale | Medio (build) |

## Note finali per il coding agent

- Gli step **2, 4, 5, 8** contengono decisioni che richiedono conferma (semantica unicità username, comportamento email su Firebase, Cloud Function, conservazione funzioni service): se la scelta non è desumibile dal codice, implementa l'opzione conservativa indicata e **annota la decisione nella PR**.
- Non toccare `config/firebase.js` se non per quanto previsto dallo Step 3/10; non toccare `firestore.rules` (è corretto). 
- Mantieni la regola "service layer = livello dati": nessuna nuova chiamata Firestore diretta negli screen.
- Per ogni step, includi nella PR i criteri di accettazione spuntati e l'output di `npm test`.
