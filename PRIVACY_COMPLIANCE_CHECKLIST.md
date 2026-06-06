# AirCut — Checklist conformità legale & riduzione del rischio

> **Disclaimer.** Questo documento NON è un parere legale e chi lo ha redatto non è un avvocato.
> **Nessuna implementazione tecnica rende un'app "inattaccabile".** Anche aziende con team legali
> dedicati vengono citate in giudizio e sanzionate. L'obiettivo realistico è:
> 1. **Conformità** (rispettare GDPR e store policy),
> 2. **Accountability** (poter *dimostrare* la conformità),
> 3. **Riduzione del rischio** (limitare l'esposizione tramite documenti e flussi corretti).
>
> La parte che effettivamente delimita la tua responsabilità sono i **testi legali**
> (Informativa Privacy, Termini di Servizio, EULA): vanno **redatti o validati da un legale**.
> Il codice serve solo a renderli efficaci, esibibili e dimostrabili.

---

## 0. Premessa sul perimetro normativo

AirCut tratta dati personali (email, username, foto/portfolio, like/engagement, contatti del salone,
eventuali dati di provider social). Se hai anche un solo utente in UE/Italia sei quasi certamente
soggetto al **GDPR**. Si aggiungono:

- **App Store / Google Play policy** (privacy label, account deletion obbligatoria, EULA contenuti).
- **Direttiva ePrivacy / cookie** se esiste un sito web companion.
- Eventuali obblighi su **minori** (se l'app è accessibile a under 16/14 servono tutele dedicate).

> Le tre azioni che il legale deve fare e che il codice **non può sostituire**:
> redigere Privacy Policy, Termini di Servizio ed EULA; definire la base giuridica del trattamento;
> stabilire ruoli (titolare/responsabile) e tempi di conservazione.

---

## 1. Stato attuale nel repo (cosa esiste già)

| Elemento | Stato | Dove |
|---|---|---|
| URL legali centralizzati | ✅ presente (URL placeholder da sostituire) | `config/legal.js` → `LEGAL_URLS` |
| Checkbox accettazione termini (registrazione email) | ✅ presente, obbligatoria (Yup `.oneOf([true])`) | `src/app/auth/RegisterClientScreen.js`, `RegisterBarberScreen.js` |
| Link EULA in registrazione | ✅ presente | stessi file, `EULA_URL` |
| Salvataggio consenso su documento utente | ⚠️ parziale (solo booleano) | `src/services/authService.js` → `liabilityAccepted`, `termsAccepted` |
| Link a Privacy/Termini per utenti già registrati | ⚠️ solo barber | `src/app/(protected)/EditBarberProfileScreen.js` |
| Cancellazione account (diritto GDPR) | ⚠️ presente ma incompleta | `src/services/userService.js` → `deleteAccount` |
| Login "anti-enumeration" (privacy by design) | ✅ presente | `src/app/auth/ForgotPasswordScreen.js` |

---

## 2. Cosa manca o va corretto nel codice (con posizione precisa)

### 2.1 — [ALTO] Linkare la Privacy Policy al momento del consenso
**Problema.** In registrazione la checkbox copre i "termini", ma il link visibile punta solo all'EULA.
Il GDPR richiede che, **nel momento della raccolta dati**, l'utente possa accedere all'**Informativa Privacy**.
**Dove:** `src/app/auth/RegisterClientScreen.js`, `src/app/auth/RegisterBarberScreen.js`.
**Cosa fare:** mostrare e linkare **sia** Termini **sia** Privacy Policy (usando `LEGAL_URLS` invece dell'`EULA_URL` hardcoded).

### 2.2 — [ALTO] Registrare *quando* e *quale versione* è stata accettata
**Problema.** Oggi si salva solo `liabilityAccepted: true`. Per l'accountability GDPR serve la **prova**:
data/ora e versione del documento accettato.
**Dove:** `src/services/authService.js` (creazione documento utente).
**Cosa fare:** salvare anche `termsAcceptedAt` (timestamp) e `legalVersion` (es. `"2026-06-01"`).

### 2.3 — [ALTO] Consenso mancante nel flusso di login social
**Problema.** `signInWithGoogle/Facebook/Apple` + `CompleteClientScreen`/`CompleteBarberProfileScreen`
creano l'account **senza** passare dalla checkbox dei termini. Chi entra via social non accetta nulla.
**Dove:** `src/app/auth/CompleteClientScreen.js`, `CompleteBarberProfileScreen.js`,
e le `createClientDocFromSocial`/`createBarberDocFromSocial` in `src/services/authService.js`.
**Cosa fare:** inserire lo stesso step di consenso (Termini + Privacy) prima di creare il documento utente.

### 2.4 — [ALTO] Completare la cancellazione account (diritto all'oblio, art. 17 GDPR)
**Problema.** `deleteAccount` lascia dati orfani: like/engagement su post altrui, documenti `reports`
con `reporterUid` dell'utente. Coincide con lo **Step 5** dell'audit, ancora aperto.
**Dove:** `src/services/userService.js` → `deleteAccount`; `src/services/engagementService.js`.
**Cosa fare:** rimuovere i like dell'utente; documentare/cancellare i `reports`; valutare Cloud Function
`onUserDelete` server-side per il cleanup robusto.

### 2.5 — [MEDIO] Esporre la cancellazione in una UI attiva
**Problema.** `deleteAccount` è richiamata solo dagli screen **legacy** (`src/screens/...`),
non instradati. Apple e Google **richiedono** la cancellazione account accessibile dall'app attiva.
**Dove:** una schermata account sotto `src/app/(protected)/`.
**Cosa fare:** aggiungere un punto "Elimina account" raggiungibile e funzionante.

### 2.6 — [MEDIO] Diritto di accesso / portabilità (art. 15 e 20 GDPR)
**Problema.** Non esiste alcuna funzione di **export dei dati** dell'utente.
**Dove:** nuovo flusso lato `src/services/` + un punto in `src/app/(protected)/`.
**Cosa fare:** consentire all'utente di richiedere/scaricare i propri dati (anche via richiesta email gestita manualmente, in prima battuta).

### 2.7 — [MEDIO] Link legali anche nell'account cliente
**Problema.** I link Privacy/Termini post-registrazione ci sono solo per il barber.
**Dove:** schermata account cliente sotto `src/app/(protected)/`.
**Cosa fare:** replicare i link `LEGAL_URLS.privacyPolicy` / `termsOfService`.

### 2.8 — [DIPENDE] Tutela minori
**Problema.** Se l'app è accessibile a minori, serve gestione dell'età/consenso genitoriale.
**Cosa fare:** **decisione di prodotto + legale.** Definire età minima nei Termini ed eventuale gate.

---

## 3. Sicurezza dei dati (un trattamento non sicuro è già una violazione GDPR)

La sicurezza tecnica fa parte della conformità (art. 32 GDPR "misure adeguate"). Questi punti
dell'audit hanno quindi **rilevanza legale diretta**:

- **Step 1 — `storage.rules` assente:** lo Storage potenzialmente aperto = rischio di data breach. **Priorità.**
- **Step 6 — `console.log` con PII (~99):** uid/email/dati nei log = esposizione dati personali.
- **Step 10 — chiavi/config:** separare dev/prod riduce il rischio operativo.

Vedi `TASK_correzioni-audit-VERIFICA.md` per i dettagli e lo stato di questi step.

---

## 4. Cosa NON puoi fare con il codice (lo deve fare un legale)

- Scrivere/validare **Informativa Privacy**, **Termini di Servizio**, **EULA** e pubblicarli agli URL di `config/legal.js`.
- Definire **base giuridica** del trattamento, **finalità**, **tempi di conservazione**.
- Stabilire ruoli **titolare/responsabile** (es. tu vs. Firebase/Google come sub-processor) e firmare i **DPA**.
- Valutare obblighi su **trasferimenti extra-UE** (Firebase/Google Cloud) e clausole standard.
- Predisporre il **registro dei trattamenti** e, se necessario, una **DPIA**.
- Definire la procedura di **notifica data breach** (72 ore).

---

## 5. Sequenza operativa consigliata

1. **Far redigere i testi legali** a un avvocato e pubblicarli → aggiornare `config/legal.js` con gli URL reali.
2. **Sicurezza prima di tutto:** Step 1 (`storage.rules`) e Step 6 (log PII) dell'audit.
3. **Consenso completo:** 2.1, 2.2, 2.3 (Privacy linkata + timestamp/versione + flusso social).
4. **Diritti utente:** 2.4 e 2.5 (cancellazione completa ed esposta), poi 2.6 (export dati).
5. **Coerenza UI:** 2.7 (link legali nell'account cliente).
6. **Decisioni di prodotto + legale:** 2.8 (minori), conservazione dati, trasferimenti extra-UE.

---

## 6. Promemoria finale

L'obiettivo non è "essere inattaccabili" — non esiste. L'obiettivo è essere **conformi** e poterlo
**dimostrare**: documenti legali validi, consenso tracciato, dati sicuri, diritti dell'utente garantiti.
Questo, insieme a una buona Privacy Policy redatta da un professionista, è ciò che concretamente
riduce e delimita la responsabilità. La validazione finale spetta a un legale.
