import { create } from "zustand";
import { togglePostLike } from "./postService";

// ============================================================================
// SINGLE SOURCE OF TRUTH per lo stato "like" condiviso tra feed e profilo (M4 §4.2)
// ----------------------------------------------------------------------------
// - `liked`: mappa postId -> boolean (l'utente corrente ha messo like)
// - `counts`: mappa postId -> numero like
// Sia HomeScreen (feed) sia BarberProfileScreen (griglia) leggono da qui, così
// un like messo da una parte si riflette IMMEDIATAMENTE dall'altra, senza reload.
// La persistenza usa il meccanismo esistente `togglePostLike` (post doc `likes[]`
// + XP). NON viene introdotto un secondo sistema di like (vincolo §2.4 / §6).
// ============================================================================

const useLikesStore = create((set, get) => ({
  liked: {},
  counts: {},

  // Idrata lo store dai post caricati (es. dopo getAllPostsWithLikeStatus).
  // Non sovrascrive uno stato già toggle-ato localmente per lo stesso postId
  // a meno che `force` sia true (es. pull-to-refresh).
  hydrateFromPosts: (posts = [], { force = false } = {}) => {
    if (!Array.isArray(posts) || posts.length === 0) return;

    set((state) => {
      const liked = { ...state.liked };
      const counts = { ...state.counts };

      posts.forEach((post) => {
        const postId = resolvePostId(post);
        if (!postId) return;

        if (force || !(postId in liked)) {
          liked[postId] = !!post.isLiked;
        }
        if (force || !(postId in counts)) {
          counts[postId] =
            typeof post.likesCount === "number"
              ? post.likesCount
              : typeof post.likes === "number"
                ? post.likes
                : 0;
        }
      });

      return { liked, counts };
    });
  },

  isLiked: (postId) => !!get().liked[postId],

  getCount: (postId) => get().counts[postId] || 0,

  // Toggle ottimistico: aggiorna lo store subito, poi persiste con togglePostLike.
  // In caso di errore esegue il rollback. Restituisce il risultato del server.
  toggleLike: async (postId, userId) => {
    if (!postId || !userId) return null;

    const prevLiked = !!get().liked[postId];
    const prevCount = get().counts[postId] || 0;

    // Update ottimistico
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
    set((state) => ({
      liked: { ...state.liked, [postId]: nextLiked },
      counts: { ...state.counts, [postId]: nextCount },
    }));

    try {
      const result = await togglePostLike(postId, userId);
      // Allinea allo stato reale del server
      set((state) => ({
        liked: { ...state.liked, [postId]: result.isLiked },
        counts: { ...state.counts, [postId]: result.likesCount },
      }));
      return result;
    } catch (error) {
      // Rollback
      set((state) => ({
        liked: { ...state.liked, [postId]: prevLiked },
        counts: { ...state.counts, [postId]: prevCount },
      }));
      throw error;
    }
  },

  reset: () => set({ liked: {}, counts: {} }),
}));

// Risoluzione del postId coerente con postService (doc id Firestore = source of truth).
// I post normalizzati espongono `postId`; come fallback ricostruiamo dallo schema
// `${barberId}_img_${suffix}` usato altrove nel codice.
export const resolvePostId = (post) => {
  if (!post) return null;
  if (post.postId) return post.postId;
  if (post.id && post.barberId && typeof post.id === "string") {
    return `${post.barberId}_img_${post.id.split("_").pop()}`;
  }
  return post.id || null;
};

export default useLikesStore;
