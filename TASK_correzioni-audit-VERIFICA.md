# Verifica audit — Stato al 2026-06-06

> Re-verifica del documento `TASK_correzioni-audit.md` contro lo stato attuale del repo AirCut.
> Per ogni step: **stato attuale**, evidenze trovate nel codice, e cosa resta da fare.
> **Esito sintetico: nessuno dei 10 step risulta completato.** Alcune voci hanno nuovi dettagli emersi dalla verifica (Step 2, 4, 8, 9).
> Nota: `IMPLEMENTATION_NOTES.md` documenta solo il lavoro su una spec di *feature* (feed ranking, search, image optimization), **non** questo audit. Nessuno degli interventi di sicurezza/bug/cleanup elencati qui è stato toccato lì.

---

## Tabella riepilogativa

| Step | Tema | Stato | Note |
|---|---|---|---|
| 1 | storage.rules | ❌ NON FATTO | `storage.rules` e `firebase.json` assenti |
| 2 | unicità username | ❌ NON FATTO | query ancora su `nomeUtente`; ancora passa `userData.email`; nuovo dettaglio sotto |
| 3 | checkFirestoreConnection | ❌ NON FATTO | `_delegate._databaseId` ancora presente (config/firebase.js:88) |
| 4 | updateUserEmail | ❌ NON FATTO | usa ancora `updateEmail`; ma usata solo da screen legacy (vedi Step 8) |
| 5 | deleteAccount cleanup | ❌ NON FATTO | nessun cleanup like/reports; nessuna proposta Cloud Function |
| 6 | console.log PII | ❌ NON FATTO | ~99 `console.log` nei service; nessun `__DEV__` guard; nessun logger |
| 7 | file spuri | ❌ NON FATTO | 11 file `.tmp`/`.fuse_hidden`/`_old`/`_new` ancora presenti; `.gitignore` non aggiornato |
| 8 | rimozione legacy | ⚠️ PARZIALE | `src/app` non importa più da `src/screens`; funzioni legacy non usate da codice attivo MA file e funzioni ancora presenti |
| 9 | ESLint / test | ❌ NON FATTO (anzi peggiorato) | `node_modules` rotto: eslint e jest non partono; reinstall pulito non fatto |
| 10 | config env | ❌ NON FATTO | chiavi ancora hardcoded; nessun `.env.example`/`app.config.js` |

---

## Step 1 — storage.rules — ❌ NON FATTO

**Evidenza.**
- `storage.rules`: **assente** nella root.
- `firebase.json`: **assente**.
- Presente solo `firestore.rules`.

**Cosa resta:** tutto lo Step 1 come da spec originale. Lo Storage resta potenzialmente non protetto. Resta la priorità di sicurezza più alta.

---

## Step 2 — Unicità username — ❌ NON FATTO (con dettaglio aggiuntivo)

**Evidenza (`src/services/authService.js`).**
- Riga 194: la query clienti usa ancora `where('nomeUtente', '==', username)`.
- Riga 253: `registerClient` chiama ancora `checkUsernameUniqueness(userData.email)` (passa la **email**, non lo username), e in caso di "non unico" lancia `emailAlreadyExist`. Resta presente anche un `console.log('isUnique')` di debug.

**⚠️ Dettaglio nuovo / da non dare per scontato.**
È comparsa una funzione `createClientDocFromSocial` (registrazione social, ~riga 681) che scrive il documento cliente con **entrambi** i campi `userName` **e** `nomeUtente` (riga 694-695). Quindi:
- Per i clienti creati via social, `nomeUtente` **esiste**.
- Per i clienti creati via email (`registerClient`), va verificato se `nomeUtente` viene scritto: se NO, la query su `nomeUtente` resta cieca per quegli utenti.
- Questo crea uno **schema incoerente** (due campi per lo stesso dato). La correzione dovrebbe consolidare su un solo campo (`userName`) e, se serve, fare data-migration o cercare su entrambi.

**Cosa resta:** correggere la query (`userName`), correggere/rimuovere la chiamata con `userData.email` in `registerClient`, rimuovere il `console.log('isUnique')`, e **decidere la sorte del doppio campo `userName`/`nomeUtente`** (nuovo punto rispetto all'audit originale).

---

## Step 3 — checkFirestoreConnection — ❌ NON FATTO

**Evidenza (`config/firebase.js`).**
- Riga 80: `checkFirestoreConnection` ancora presente.
- Riga 88: accede ancora a `db._delegate._databaseId` (API interna).
- Confermato: **non importata da nessun file** (nessun riferimento fuori da `config/firebase.js`). Resta codice morto e rotto.

**Cosa resta:** rimuovere o riscrivere la funzione (Opzione A consigliata: rimozione).

---

## Step 4 — updateUserEmail — ❌ NON FATTO

**Evidenza (`src/services/userService.js`).**
- Riga 3: import ancora di `updateEmail` (non `verifyBeforeUpdateEmail`).
- Riga 191: `updateUserEmail` usa ancora `await updateEmail(user, newEmail)` dopo la reauth.

**Contesto rilevante per la decisione (conferma la nota dell'audit).**
- `updateUserEmail`/`updateUserPassword` sono usate **solo** dagli screen legacy `src/screens/EditClientProfileScreen.js` e `EditBarberProfileScreen.js`.
- **Nessuno** screen attivo sotto `src/app/**` espone il cambio email.

**Cosa resta:** o (a) implementare `verifyBeforeUpdateEmail` se/quando una UI attiva esporrà il cambio email; oppure (b) marcare lo step come "fuori scope finché non esiste UI attiva" e documentarlo. Decisione da intrecciare con lo Step 8 (se i legacy vengono rimossi, la funzione resta orfana).

---

## Step 5 — deleteAccount cleanup — ❌ NON FATTO

**Evidenza (`src/services/userService.js`, `deleteAccount` ~riga 329).**
La funzione cancella: media Storage (profile/portfolio), post del barbiere (con relativo Storage), subcollezioni `blocked`, documento utente, utente Auth. Gestisce `auth/requires-recent-login`.
**Restano orfani (invariato rispetto all'audit):**
- like/engagement messi dall'utente sui post altrui (nessun `arrayRemove`).
- documenti `reports` con `reporterUid` dell'utente.
- nessuna proposta/implementazione di Cloud Function `onUserDelete`.

**Cosa resta:** tutto lo Step 5 come da spec.

---

## Step 6 — console.log con PII — ❌ NON FATTO

**Evidenza.** `console.log` nei `src/services/*.js` (totale **99**):

| File | console.log |
|---|---|
| authService.js | 16 |
| xpService.js | 16 |
| barberService.js | 15 |
| userService.js | 14 |
| postService.js | 13 |
| searchService.js | 10 |
| engagementService.js | 8 |
| mediaService.js | 7 |

- Nessun file service usa un guard `__DEV__`.
- Non esiste `src/services/logger.js`.
- Esempi con PII tuttora presenti: `deleteAccount` logga `{ uid, isBarber, isClient }` (userService.js:343) e `uid` (riga 396).

**Cosa resta:** tutto lo Step 6.

---

## Step 7 — File spuri — ❌ NON FATTO

**Evidenza.** Ancora presenti (11 file):
- `src/services/authService.js.tmp`, `src/services/postService.js.tmp`, `src/services/barberProfileStore.js.tmp`
- `src/app/(protected)/BarberProfileScreen.js.tmp`, `ClientAccountScreen.js.tmp`, `HomeScreen.js.tmp`, `PostScreen.js.tmp`, `SearchScreen.js.tmp`
- `src/components/BarberPost.js.tmp`
- `src/app/(protected)/.fuse_hidden0000000d00000001`
- `src/screens/SearchScreen_old.js`, `src/screens/SearchScreen_new.js`

**`.gitignore`:** verificato — **non** contiene `*.tmp`, `*.js.tmp`, `.fuse_hidden*`, `*~`.

**Cosa resta:** tutto lo Step 7.

---

## Step 8 — Rimozione legacy `src/screens/**` — ⚠️ PARZIALE

**Buona notizia (parte di verifica già soddisfatta).**
- **Nessun** file sotto `src/app/**` importa da `src/screens/` o `src/navigation/` (l'unico match per `navigation` è `@react-navigation/native`, falso positivo). → Il criterio "nessun import attivo dal legacy" è **già verificato**.
- Le funzioni service legacy `getUserByName`, `getUserProfileData`, `updateUserProfile` **non sono usate** da alcun file sotto `src/app/**` (solo dagli screen legacy stessi). → Rimozione sicura.

**Cosa NON è ancora fatto.**
- `src/screens/**` esiste ancora con tutti i file (incl. `SearchScreen_old.js`, `SearchScreen_new.js`).
- `src/navigation/HomeStackNavigator.js` ancora presente.
- Le funzioni legacy `getUserByName` (riga 33), `getUserProfileData` (riga 75), `updateUserProfile` (riga 112) sono ancora definite ed **esportate** (riga 401) in `userService.js`.
- `PROJECT_STRUCTURE.md` non risulta aggiornato.

**Cosa resta:** la verifica degli import è già fatta; manca l'esecuzione della rimozione (file legacy + funzioni service morte) e l'aggiornamento di `PROJECT_STRUCTURE.md`. Coordinare con lo Step 4 (`updateUserEmail`/`updateUserPassword`).

---

## Step 9 — ESLint / pipeline — ❌ NON FATTO (peggiorato)

**Evidenza.**
- `node_modules/type-check/package.json` ora ha un `name` valido (il problema originale specifico è cambiato), **ma** `node_modules/type-check/index.js` **manca**.
- `npx eslint .` fallisce comunque: `Cannot find module '.../node_modules/is-extglob/index.js'` (la cartella esiste ma `index.js` manca).
- `npx jest` non parte: `Cannot find module 'find-up'` (idem: cartella presente, `index.js` mancante) nello stack di `pkg-dir`/`import-local`/`jest`.

In pratica `node_modules` è in uno **stato corrotto/parziale** (cartelle presenti ma file `index.js` mancanti su più pacchetti). Né lint né test sono eseguibili.

**Nota:** i 3 file di test esistono (`src/services/__tests__/feedRanking.test.js`, `genderMapping.test.js`, `photoPreview.test.js`) ma non si possono eseguire finché `node_modules` non è ripristinato.

**Cosa resta:** il reinstall pulito (`rm -rf node_modules package-lock.json && npm install`) **non è stato fatto** o non è andato a buon fine. Va completato prima di poter spuntare qualsiasi criterio di lint/test degli altri step.

---

## Step 10 — Config Firebase via env — ❌ NON FATTO

**Evidenza.**
- `config/firebase.js` riga 14: `apiKey: "AIzaSy..."` hardcoded (nessun `process.env` / `EXPO_PUBLIC_FIREBASE_*`).
- `.env.example`: assente.
- `app.config.js`: assente.

**Cosa resta:** tutto lo Step 10 (resta opzionale/non bloccante come da audit).

---

## Conclusione e ordine consigliato

Nessuno step è stato completato. L'ordine di priorità originale resta valido, **con un'eccezione operativa**: lo **Step 9** va affrontato per primo come prerequisito, perché finché `node_modules` è rotto non si possono eseguire lint/test e quindi non si possono validare i criteri di accettazione degli altri step.

Ordine suggerito: **9 (sblocco tooling) → 1 → 2 → 3 → 7 → 8 → 5 → 4 → 6 → 10**.

Punti nuovi da decidere emersi dalla verifica:
1. **Step 2:** doppio campo `userName` + `nomeUtente` introdotto da `createClientDocFromSocial` → consolidare su un solo campo e gestire la coerenza dei dati esistenti.
2. **Step 4 + 8:** `updateUserEmail`/`updateUserPassword` sono orfane di UI attiva → decidere se rifattorizzare ora o congelare/documentare prima della rimozione dei legacy.
