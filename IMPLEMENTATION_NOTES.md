# Aircut — Note di implementazione

Riepilogo degli interventi rispetto a `aircut-implementation-spec.md`. Parte del lavoro era già presente nel repo: di seguito cosa esisteva, cosa è stato corretto e cosa è stato aggiunto.

## Task 1 — Smart Home Feed Algorithm

**Stato precedente:** esisteva un ranking a 2 fasce (match / no-match) in `postService.js`, con tiebreak basato sull'ordine d'ingresso.

**Intervento:** estratta la logica in un modulo puro e testabile `src/services/feedRanking.js` con il modello a **3 fasce** richiesto dallo spec:

- Alta = ≥ 2 tag in comune
- Media = esattamente 1 tag
- Bassa = 0 tag

Tiebreak esplicito: a parità di fascia → più match prima; a parità di match → data di pubblicazione decrescente; poi ordine stabile. Utente senza tag → feed cronologico standard. `postService.js` ora importa da `feedRanking.js` (single source of truth).

## Task 2 — Search Layout (banner + 3 foto)

**Stato precedente:** in `SearchScreen.js` il banner profilo (`UserListItem`) era già renderizzato **prima** delle foto, ma le 3 preview erano un semplice `slice(0,3)` senza ordinamento.

**Intervento:** estratto `src/services/photoPreview.js` (`getTopPostsByLikes`) che ordina le foto per **numero di like** (fallback alle più recenti) e prende le prime 3. Applicato a entrambi i percorsi di rendering. Se il profilo ha < 3 foto si mostrano solo quelle disponibili.

## Task 3 — Navigation / Scroll State

**Stato precedente:** `PostListingScreen.js` già usava `router.back()` (niente più salto alla Home).

**Intervento:** reso esplicito e robusto il ripristino dello scroll del profilo barbiere. `barberProfileStore.js` ora memorizza l'offset per profilo; `BarberProfileScreen.js` salva l'offset su scroll e prima di aprire la foto, e lo ripristina (senza animazione, precisione ±10px) via `onContentSizeChange` dopo il caricamento del portfolio — corretto anche in caso di rimontaggio del componente.

## Task 4 — Filter Button su Home

**Stato precedente:** il pulsante Filters accanto alla search bar della Home **esisteva già** e apriva il pannello filtri della SearchScreen.

**Intervento:** aggiunto l'indicatore visivo opzionale. Nuovo `src/services/filterStore.js` condivide i filtri attivi; la Home mostra un **badge con il conteggio** e cambia colore quando ci sono filtri attivi, sincronizzandosi via subscription.

## Task 6 — Client Account Gender Mapping

**Stato precedente:** `getGenderLabel` gestiva già M/F/ALTRO (la registrazione salva `sex` ∈ `{M,F,ALTRO}`). Mancava un test.

**Intervento:** estratta la logica pura in `src/services/genderMapping.js` (`resolveGenderKey`, `extractRawGender`), usata dalla schermata. Aggiunto test unitario che copre i valori canonici, le varianti legacy, gli alias di campo e la regressione nota "maschio mostrato come femmina".

## Task 7 — Image Optimization

**Stato precedente:** `PostScreen.js` aveva già smesso di generare `standard.webp` (creava solo `thumbnail.webp`). Le immagini profilo barber erano già salvate come `profile/{uid}/thumbnail.webp` (Task 7b ✅). Migration script `standard.webp` + profili legacy già presente.

**Intervento (Task 7a):** introdotto il sistema a 2 livelli:

| Livello | File | Dim. | Quality |
|---|---|---|---|
| L1 | `thumbnail.webp` | 400×400 | 45 |
| L2 | `zoom-ready.webp` | 1000×1000 | 75 |

`PostScreen.js` genera e carica entrambe le varianti e salva `zoomReadyUrl` sul documento post. `normalizeUploadedPost` propaga `zoomReadyUrl` a feed/profilo. In `BarberPost.js`, dopo **1.2s** nel viewport si fa il prefetch di L2 (`Image.prefetch`) e si passa a mostrarla per il pinch-to-zoom.

**Strategia migrazione legacy:** i post esistenti non hanno `zoomReadyUrl` → `BarberPost` resta su L1 (nessuna immagine rotta). Lo script `scripts/migrate-posts-thumbnail-only.mjs` continua a rimuovere i vecchi `standard.webp` e a normalizzare i profili `.jpeg` → `.webp`. La generazione retroattiva di `zoom-ready.webp` per i post storici (se desiderata) può essere aggiunta come job batch separato.

## Test

`npm test` (Jest configurato per `src/services/__tests__/`). Test puri, senza dipendenze React Native:

- `feedRanking.test.js` — fasce, tiebreak per match e per data, tag localizzati, immutabilità
- `genderMapping.test.js` — mapping genere + regressione
- `photoPreview.test.js` — ordinamento per like + fallback recenti

> Nota: `@babel/preset-env`, `jest` e `babel-jest` aggiunti a `devDependencies`. Eseguire `npm install` prima di `npm test`.
