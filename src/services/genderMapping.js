// Mapping del campo genere cliente (Task 6).
// La sorgente dati (registrazione) salva `sex` con valori 'M' | 'F' | 'ALTRO',
// ma in giro possono esistere varianti legacy ('male', 'maschio', 'donna', ...).
// Questa funzione PURA normalizza qualsiasi variante in una chiave canonica,
// così l'UI può mappare la chiave sulla stringa localizzata corretta.
//
// Ritorna: 'male' | 'female' | 'other' | null (valore sconosciuto/vuoto).

const MALE_VALUES = new Set([
  'm', 'male', 'maschio', 'maschile', 'man', 'uomo',
]);

const FEMALE_VALUES = new Set([
  'f', 'female', 'femmina', 'femminile', 'woman', 'donna',
]);

const OTHER_VALUES = new Set([
  'altro', 'other', 'o', 'non-binary', 'nonbinary', 'nb',
]);

export const resolveGenderKey = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (MALE_VALUES.has(normalized)) return 'male';
  if (FEMALE_VALUES.has(normalized)) return 'female';
  if (OTHER_VALUES.has(normalized)) return 'other';
  return null;
};

// Estrae il valore grezzo del genere da un documento cliente, gestendo gli
// alias di campo (`sex` canonico, `gender` legacy).
export const extractRawGender = (userData) => (
  userData?.sex ?? userData?.gender ?? null
);
