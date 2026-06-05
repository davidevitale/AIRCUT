// Logica PURA di ranking del feed Home (Task 1), estratta da postService.js
// così da poterla testare senza importare Firebase.

const normalizeTagKey = (value) => (
  String(value || '')
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\s+/g, '')
);

export const extractTagKeys = (tags = []) => (
  (Array.isArray(tags) ? tags : [])
    .flatMap((tag) => {
      if (typeof tag === 'string') return [tag];
      return [tag?.id, tag?.en, tag?.it, tag?.label?.en, tag?.label?.it].filter(Boolean);
    })
    .map(normalizeTagKey)
    .filter(Boolean)
);

// Converte createdAt (ISO string | Firestore Timestamp | number) in millis.
export const toCreatedAtMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Fasce di priorità (M1 §Task 1):
//   HIGH   = post con >= 2 tag in comune con l'utente
//   MEDIUM = post con esattamente 1 tag in comune
//   LOW    = post senza tag in comune (contenuto generico)
export const FEED_PRIORITY = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export const getFeedPriority = (matchCount) => {
  if (matchCount >= 2) return FEED_PRIORITY.HIGH;
  if (matchCount === 1) return FEED_PRIORITY.MEDIUM;
  return FEED_PRIORITY.LOW;
};

// Ordina il feed Home in base alla sovrapposizione di tag tra post e utente.
// A parità di fascia/match, i post più recenti vengono prima.
export const rankPostsByUserTags = (posts = [], userSelectedTags = []) => {
  const list = Array.isArray(posts) ? posts : [];
  const userTagSet = new Set(extractTagKeys(userSelectedTags));

  // Utente senza tag -> feed cronologico standard (più recenti prima).
  if (userTagSet.size === 0) {
    return [...list].sort(
      (a, b) => toCreatedAtMillis(b?.createdAt) - toCreatedAtMillis(a?.createdAt),
    );
  }

  return [...list]
    .map((post, index) => {
      const postTagSet = new Set(extractTagKeys(post?.selectedTags));
      let matchCount = 0;
      userTagSet.forEach((tag) => {
        if (postTagSet.has(tag)) matchCount += 1;
      });

      return {
        post,
        index,
        matchCount,
        priority: getFeedPriority(matchCount),
        createdAtMillis: toCreatedAtMillis(post?.createdAt),
      };
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      if (b.createdAtMillis !== a.createdAtMillis) {
        return b.createdAtMillis - a.createdAtMillis;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.post);
};
