// Opzioni tag statiche condivise (Task 2).
// "colore" è un tag speciale: selezionandolo si rivelano i colori come tag.
// I colori NON esistono nella collezione Firestore `tags`, quindi sono definiti
// qui nel codice e trattati come tag selezionabili a tutti gli effetti.

// Id del tag speciale che apre la selezione colori.
export const COLOR_TAG_ID = 'colore';

// Tag "colore" sintetico, con label localizzata, compatibile con la struttura
// dei tag Firestore (id + label.{en,it}).
export const COLOR_TAG = {
  id: COLOR_TAG_ID,
  synthetic: true,
  label: { en: 'Colour', it: 'Colore' },
  // visibility larga così compare in tutti i contesti di selezione.
  visibility: 'male_unisex',
  active: true,
};

// Colori selezionabili come tag. `hex` è usato solo per il pallino UI.
export const COLOR_OPTIONS = [
  { id: 'color_biondo', hex: '#E6C067', label: { en: 'Blonde', it: 'Biondo' } },
  { id: 'color_platino', hex: '#E8E8EA', label: { en: 'Platinum', it: 'Platino' } },
  { id: 'color_castano', hex: '#6B4226', label: { en: 'Brown', it: 'Castano' } },
  { id: 'color_nero', hex: '#1C1C1C', label: { en: 'Black', it: 'Nero' } },
  { id: 'color_rosso', hex: '#C0392B', label: { en: 'Red', it: 'Rosso' } },
  { id: 'color_blu', hex: '#2E5BBA', label: { en: 'Blue', it: 'Blu' } },
  { id: 'color_rosa', hex: '#E48FB0', label: { en: 'Pink', it: 'Rosa' } },
  { id: 'color_grigio', hex: '#9AA0A6', label: { en: 'Grey', it: 'Grigio' } },
  { id: 'color_viola', hex: '#7E57C2', label: { en: 'Purple', it: 'Viola' } },
  { id: 'color_verde', hex: '#2E8B57', label: { en: 'Green', it: 'Verde' } },
];

const COLOR_IDS = new Set(COLOR_OPTIONS.map((c) => c.id));

export const isColorTagId = (id) => COLOR_IDS.has(id);

// Restituisce le opzioni colore come "tag" compatibili (id + label).
export const getColorTagOptions = () =>
  COLOR_OPTIONS.map((c) => ({
    id: c.id,
    hex: c.hex,
    label: c.label,
    synthetic: true,
    active: true,
  }));
