// Store minimale in-memory per i filtri di ricerca attivi (Task 4).
// Permette alla Home di mostrare un badge sul pulsante Filters quando
// sono presenti filtri attivi, condividendo lo stato con la SearchScreen.
// Non persiste oltre la sessione (coerente con gli altri *Store in-memory).

let activeFilterTags = [];
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(activeFilterTags);
    } catch (error) {
      console.warn("filterStore listener error:", error?.message || error);
    }
  });
};

export const setActiveFilterTags = (tags = []) => {
  activeFilterTags = Array.isArray(tags) ? [...tags] : [];
  notify();
};

export const getActiveFilterTags = () => activeFilterTags;

export const getActiveFilterCount = () => activeFilterTags.length;

export const clearActiveFilterTags = () => {
  if (activeFilterTags.length === 0) return;
  activeFilterTags = [];
  notify();
};

// Sottoscrizione per i componenti che vogliono reagire ai cambi di filtro.
// Ritorna una funzione di unsubscribe.
export const subscribeActiveFilters = (listener) => {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
};
