# Project Structure — AirCut

> **Per il coding agent:** questo file è la mappa del repository. Usalo per individuare subito i file da modificare per ogni task. La regola fondamentale è in cima alla sezione [⚠️ Routing attivo vs codice legacy](#-routing-attivo-vs-codice-legacy).

## Stack

App mobile **React Native + Expo (SDK 54)** con **expo-router** (file-based routing). Backend **Firebase** (Auth, Firestore, Storage). State con **zustand** + store/context locali. i18n con **i18next** (IT/EN). Form con **Formik + Yup**.

- Entry point: `index.js` → `App.js` → expo-router (`main: "expo-router/entry"` in `package.json`)
- Linguaggio: JavaScript (no TypeScript)
- Piattaforme: iOS (cartella `ios/` nativa presente), Android, web

## ⚠️ Routing attivo vs codice legacy

Il repo contiene **due alberi di schermate**. Sapere quale è attivo è la cosa più importante per non modificare file morti:

| Cartella | Stato | Quando intervenire |
|---|---|---|
| `src/app/**` | ✅ **ATTIVO** — routing reale (expo-router) | **Modifica qui** per qualsiasi cambiamento a schermate/navigazione visibili in app |
| `src/screens/**` | ⚠️ **LEGACY** — non instradato da expo-router | Toccare **solo** se un file in `src/app/` lo importa esplicitamente, o per cleanup |
| `src/navigation/HomeStackNavigator.js` | ⚠️ Legacy (React Navigation) | Navigazione gestita da expo-router, non da qui |

Indizi di file legacy: `SearchScreen_old.js`, `SearchScreen_new.js`, `VipScreen.js`, `GiftScreen.js`, `PrenotazioniScreen.js`, `AccountScreen.js` (esistono in `src/screens/` ma **non** in `src/app/`).

> Prima di editare uno screen, verifica che esista un file corrispondente in `src/app/(protected)/` o `src/app/auth/`. Se è solo in `src/screens/`, probabilmente è morto.

## Mappa per tipo di task

| Devi lavorare su… | File / cartella |
|---|---|
| **Navigazione / tab bar / route** | `src/app/_layout.js` (root stack), `src/app/(protected)/_layout.js` (tab bar protette), `src/app/auth/_layout.js` |
| **Auth, login, registrazione** | `src/app/auth/`, `src/context/AuthContext.js`, `src/services/authService.js` |
| **Sessione / ruolo utente (client vs barber)** | `src/context/AuthContext.js` (espone `authStatus`, `role`) |
| **Firebase config / chiavi** | `config/firebase.js` |
| **Post (creazione, feed, like)** | `src/services/postService.js`, `engagementService.js`, schermate `PostScreen.js` / `PostListingScreen.js` / `HomeScreen.js` |
| **Upload immagini / media** | `src/services/mediaService.js` |
| **Ricerca / hashtag** | `src/services/searchService.js`, `src/app/(protected)/SearchScreen.js` |
| **Profili barbiere / cliente** | `src/services/barberService.js`, `userService.js`, schermate `*ProfileScreen.js` / `*AccountScreen.js` |
| **XP / gamification** | `src/services/xpService.js`, `hooks/useUserXP.js` |
| **Traduzioni (testi UI)** | `src/i18n/locales/{en-UK,it-IT}/translation.json` |
| **Toast / notifiche in-app** | `src/context/ToastContext.js`, `src/components/Toast.js` |
| **Stato connessione Firebase** | `hooks/useFirebaseConnection.js`, `src/components/ConnectionStatus.js` |
| **Componenti UI riutilizzabili** | `src/components/` |
| **Build / config Expo** | `app.json`, `eas.json`, `babel.config.js`, `eslint.config.mjs` |

## Albero (sorgenti, esclusi `node_modules` / `ios` nativo)

```
.
├── index.js                      # entry: registra App
├── App.js                        # root component
├── app.json / eas.json           # config Expo / EAS build
├── babel.config.js
├── eslint.config.mjs
├── config/
│   └── firebase.js               # init Firebase (auth, db, storage)
├── hooks/
│   ├── useFirebaseConnection.js  # monitora connessione Firestore
│   └── useUserXP.js              # XP utente in tempo reale
├── scripts/
│   └── migrate-posts-thumbnail-only.mjs   # script migrazione one-off
└── src/
    ├── app/                      # ✅ ROUTING ATTIVO (expo-router)
    │   ├── _layout.js            #   root Stack + ToastProvider + AuthProvider
    │   ├── index.js              #   splash + redirect iniziale (auth gate)
    │   ├── +not-found.js
    │   ├── auth/                 #   flusso non autenticato
    │   │   ├── _layout.js
    │   │   ├── index.js
    │   │   ├── LoginScreen.js
    │   │   ├── RoleSelectionScreen.js
    │   │   ├── RegisterClientScreen.js
    │   │   └── RegisterBarberScreen.js
    │   ├── (protected)/          #   flusso autenticato — Tabs (redirect a /auth se non loggato)
    │   │   ├── _layout.js        #     definizione tab bar (icone, ruolo client/barber)
    │   │   ├── HomeScreen.js
    │   │   ├── SearchScreen.js
    │   │   ├── LikeScreen.js
    │   │   ├── PostScreen.js  /  PostListingScreen.js
    │   │   ├── ShopScreen.js
    │   │   ├── ClientAccountScreen.js / BarberAccountScreen.js
    │   │   ├── EditClientProfileScreen.js / EditBarberProfileScreen.js
    │   │   ├── BarberProfileScreen.js
    │   │   └── account/index.js
    │   └── Modal/                #   route modale (attualmente in pausa)
    ├── screens/                  # ⚠️ LEGACY — non instradato (vedi sezione sopra)
    ├── navigation/
    │   └── HomeStackNavigator.js # ⚠️ legacy React Navigation
    ├── components/               # UI riutilizzabile
    │   ├── Header.js  BottomNavigation.js  SplashScreen.js
    │   ├── BarberPost.js  PostGrid.js  UserListItem.js
    │   ├── Toast.js  ConnectionStatus.js  LanguageToggle.js
    ├── context/
    │   ├── AuthContext.js        # authStatus + role (client | barber)
    │   └── ToastContext.js
    ├── services/                 # tutta la logica Firebase
    │   ├── authService.js        # auth + utility condivise (retry, normalizzazioni)
    │   ├── userService.js  barberService.js
    │   ├── postService.js  postListingStore.js (zustand-like in-memory)
    │   ├── engagementService.js  # like → XP
    │   ├── searchService.js  mediaService.js
    │   ├── xpService.js
    │   └── barberProfileStore.js # context navigazione profilo (in-memory)
    └── i18n/
        ├── index.js
        └── locales/{en-UK,it-IT}/translation.json
```

## Convenzioni utili

- **I servizi sono il livello dati.** Le schermate non parlano direttamente con Firestore: importano funzioni da `src/services/*`. Per cambiare logica dati, modifica il service, non lo screen.
- **`authService.js` è anche un modulo di utility.** Esporta helper condivisi (`withRetry`, `normalizeUploadedPost`, `getLocalizedTagText`, `includesSearchQuery`, ecc.) usati da altri service — non solo auth.
- **Ruolo utente** (`client` vs `barber`) determina tab e schermate: viene da `useAuth().role`. La tab "add" (`PostScreen`) è nascosta ai client in `(protected)/_layout.js`.
- **`*Store.js`** (`postListingStore`, `barberProfileStore`) sono store in-memory minimali per passare contesto tra schermate durante la navigazione, non persistono.
- **Testi UI sempre via i18n**: nuove stringhe vanno aggiunte a **entrambe** le locale `it-IT` e `en-UK`.
- **Firestore collections principali**: `clients`, `barbers`, post dei barbieri (vedi `postService.js` / `engagementService.js`).
```
