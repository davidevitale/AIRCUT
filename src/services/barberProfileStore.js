let barberProfileContext = {
  returnTo: null,
};

export const setBarberProfileContext = ({ returnTo = null } = {}) => {
  barberProfileContext = {
    returnTo,
  };
};

export const getBarberProfileContext = () => barberProfileContext;

// --- Scroll restore (Task 3) --------------------------------------------
// Memorizza l'offset di scroll del profilo barbiere per chiave (uid o nome),
// così tornando dalla schermata foto si ripristina la posizione esatta anche
// se il componente viene rimontato.
const barberProfileScrollOffsets = new Map();

const buildScrollKey = ({ uid, barberName } = {}) => {
  if (uid) return `uid:${uid}`;
  if (barberName) return `name:${barberName}`;
  return null;
};

export const setBarberProfileScrollOffset = (identity, offsetY) => {
  const key = buildScrollKey(identity);
  if (!key) return;
  barberProfileScrollOffsets.set(key, Math.max(0, Number(offsetY) || 0));
};

export const getBarberProfileScrollOffset = (identity) => {
  const key = buildScrollKey(identity);
  if (!key) return 0;
  return barberProfileScrollOffsets.get(key) || 0;
};

export const clearBarberProfileScrollOffset = (identity) => {
  const key = buildScrollKey(identity);
  if (!key) return;
  barberProfileScrollOffsets.delete(key);
};
