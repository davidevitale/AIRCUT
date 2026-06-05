import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit as fbLimit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { handleFirebaseConnectionError, normalizeUploadedPost, toCreatedAtMillis, withRetry } from "./authService";
import { updateUserXP } from "./xpService";
// Logica di ranking del feed estratta in un modulo PURO e testabile (Task 1).
import {
  rankPostsByUserTags,
  getFeedPriority,
  extractTagKeys,
} from "./feedRanking";

// ===== Paginazione + caching del feed =====
// Obiettivo (richiesta utente): NON rileggere tutta la collezione `posts` ad
// ogni apertura della home.
//  - Paginazione: si legge una pagina alla volta (orderBy createdAt desc + limit),
//    le successive con startAfter(cursor) su onEndReached.
//  - Caching documenti: la prima pagina viene tenuta in memoria con un TTL.
//    Riaprendo la home entro il TTL si riusa la cache senza toccare Firestore.
//  - Profili barbiere: niente più getDocs su tutta la collezione `barbers`;
//    si caricano (con cache) solo i profili dei barberId presenti nella pagina.
export const FEED_PAGE_SIZE = 12;
const FEED_CACHE_TTL_MS = 60 * 1000; // 60s: riaprendo la home a breve, no refetch.

// Cache prima pagina del feed (normalizzata, pre-likeStatus).
const feedFirstPageCache = {
  posts: null,
  cursor: null,
  hasMore: true,
  fetchedAt: 0,
};

// Cache profili barbiere (uid -> data), per evitare riletture ripetute.
const barberProfileCache = new Map();

const isFeedCacheFresh = () =>
  Array.isArray(feedFirstPageCache.posts) &&
  Date.now() - feedFirstPageCache.fetchedAt < FEED_CACHE_TTL_MS;

// Invalida la cache del feed (chiamata dal pull-to-refresh e dopo nuovo post).
const invalidateFeedCache = () => {
  feedFirstPageCache.posts = null;
  feedFirstPageCache.cursor = null;
  feedFirstPageCache.hasMore = true;
  feedFirstPageCache.fetchedAt = 0;
};

// Carica i profili barbiere mancanti per un set di uid, usando la cache.
const loadBarberProfiles = async (barberIds = []) => {
  const uniqueIds = [...new Set(barberIds.filter(Boolean))];
  const missing = uniqueIds.filter((id) => !barberProfileCache.has(id));

  if (missing.length > 0) {
    await Promise.all(
      missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "barbers", uid));
          barberProfileCache.set(uid, snap.exists() ? snap.data() : {});
        } catch (error) {
          console.warn("loadBarberProfiles: errore profilo", uid, error?.message || error);
          barberProfileCache.set(uid, {});
        }
      })
    );
  }

  const result = {};
  uniqueIds.forEach((id) => {
    result[id] = barberProfileCache.get(id) || {};
  });
  return result;
};

// Costruisce la query paginata della collezione posts (più recenti prima).
const buildPostsPageQuery = (cursor = null) => {
  const constraints = cursor
    ? [orderBy("createdAt", "desc"), startAfter(cursor), fbLimit(FEED_PAGE_SIZE)]
    : [orderBy("createdAt", "desc"), fbLimit(FEED_PAGE_SIZE)];
  return query(collection(db, "posts"), ...constraints);
};

// Carica UNA pagina di post normalizzati. Ritorna { posts, cursor, hasMore }.
// cursor === null => prima pagina (usa la cache TTL salvo force).
const getBarberPostsPage = async ({ cursor = null, force = false } = {}) => {
  const isFirstPage = !cursor;

  if (isFirstPage && !force && isFeedCacheFresh()) {
    console.log("getBarberPostsPage: prima pagina servita dalla cache");
    return {
      posts: feedFirstPageCache.posts,
      cursor: feedFirstPageCache.cursor,
      hasMore: feedFirstPageCache.hasMore,
    };
  }

  try {
    const snapshot = await withRetry(async () => {
      return await getDocs(buildPostsPageQuery(cursor));
    }, 3, 1000);

    const docs = snapshot.docs;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    const hasMore = docs.length === FEED_PAGE_SIZE;

    const barberIds = docs.map((d) => d.data()?.barberId);
    const barberProfiles = await loadBarberProfiles(barberIds);

    const posts = docs
      .map((postDoc) => {
        const postData = postDoc.data();
        return normalizeUploadedPost(
          postDoc.id,
          postData,
          barberProfiles[postData.barberId] || {}
        );
      })
      .filter(Boolean);

    if (isFirstPage) {
      feedFirstPageCache.posts = posts;
      feedFirstPageCache.cursor = lastDoc;
      feedFirstPageCache.hasMore = hasMore;
      feedFirstPageCache.fetchedAt = Date.now();
    }

    return { posts, cursor: lastDoc, hasMore };
  } catch (error) {
    console.error("getBarberPostsPage: errore caricamento pagina:", error);
    const errorInfo = handleFirebaseConnectionError(error);
    if (errorInfo.isConnectionError) {
      return { posts: [], cursor: null, hasMore: false };
    }
    throw new Error(`Errore caricamento posts: ${error.message}`);
  }
};

// Ottieni tutti i post caricati dai parrucchieri per la home.
// Mantenuta per compatibilità (profilo barbiere via getBarberPostsByUid e
// percorsi che vogliono l'elenco completo). Usa comunque la query ordinata e
// la cache profili; NON usa la cache TTL della prima pagina.
const getAllBarberPosts = async () => {
  try {
    console.log('getAllBarberPosts: Starting to fetch uploaded posts...');

    const postsSnapshot = await withRetry(async () => {
      return await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
    }, 3, 1000);

    const barberIds = postsSnapshot.docs.map((d) => d.data()?.barberId);
    const barberProfiles = await loadBarberProfiles(barberIds);

    const posts = postsSnapshot.docs
      .map((postDoc) => {
        const postData = postDoc.data();
        return normalizeUploadedPost(
          postDoc.id,
          postData,
          barberProfiles[postData.barberId] || {}
        );
      })
      .filter(Boolean)
      .sort((a, b) => toCreatedAtMillis(b.createdAt) - toCreatedAtMillis(a.createdAt));

    console.log('getAllBarberPosts: Returning uploaded posts:', posts.length);
    return posts;
  } catch (error) {
    console.error('Errore nel recupero dei post dei parrucchieri:', error);

    const errorInfo = handleFirebaseConnectionError(error);
    if (errorInfo.isConnectionError) {
      console.warn('getAllBarberPosts: Firebase offline, returning empty posts array');
      return [];
    }

    throw new Error(`Errore caricamento posts: ${error.message}`);
  }
};

// Crea o aggiorna un documento post in Firestore
const createOrUpdatePost = async (postData) => {
  try {
    const postId = `${postData.barberId}_${postData.photoId}`;
    const postRef = doc(db, 'posts', postId);

    const postDoc = {
      barberId: postData.barberId,
      photoId: postData.photoId,
      imageUrl: postData.imageUrl,
      selectedTags: Array.isArray(postData.selectedTags) ? postData.selectedTags : [],
      likes: [], // Array di userId che hanno messo like
      createdAt: new Date().toISOString(),
      ...postData
    };

    await setDoc(postRef, postDoc, { merge: true });
    console.log('Post created/updated:', postId);

    return postId;
  } catch (error) {
    console.error('Errore creazione/aggiornamento post:', error);
    throw error;
  }
};

// Ottieni un singolo post con stato like per l'utente corrente
const getPost = async (postId, currentUserId = null) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      return null;
    }

    const postData = { id: postDoc.id, ...postDoc.data() };

    // Aggiungi stato like per l'utente corrente
    if (currentUserId) {
      postData.isLiked = postData.likes?.includes(currentUserId) || false;
    } else {
      postData.isLiked = false;
    }

    postData.likesCount = postData.likes?.length || 0;

    return postData;
  } catch (error) {
    console.error('Errore recupero post:', error);
    throw error;
  }
};

// Toggle like per un singolo post
const togglePostLike = async (postId, userId) => {
  try {
    console.log('togglePostLike: Starting for postId:', postId, 'userId:', userId);

    return await withRetry(async () => {
      const postRef = doc(db, 'posts', postId);

      // Prova a ottenere il documento
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        // Se il post non esiste, crealo e aggiungi il like
        console.log('togglePostLike: Post non trovato, creandolo:', postId);

        await setDoc(postRef, {
          barberId: postId.split('_')[0],
          photoId: postId.split('_')[2] || 'unknown',
          imageUrl: '',
          selectedTags: [],
          likes: [userId], // Aggiungi subito il like
          createdAt: new Date().toISOString()
        });

        console.log('togglePostLike: Post creato e like aggiunto:', postId);
        return { isLiked: true, likesCount: 1 };
      }

      const postData = postDoc.data();
      const likes = postData.likes || [];
      const isCurrentlyLiked = likes.includes(userId);

      if (isCurrentlyLiked) {
        // Rimuovi like
        await updateDoc(postRef, {
          likes: arrayRemove(userId)
        });
        console.log('togglePostLike: Like rimosso dal post:', postId);
        return { isLiked: false, likesCount: Math.max(0, likes.length - 1) };
      } else {
        // Aggiungi like e XP
        await updateDoc(postRef, {
          likes: arrayUnion(userId)
        });

        // Aggiungi 10 XP per il like
        try {
          await updateUserXP(userId, 10);
          console.log('togglePostLike: 10 XP aggiunti per il like');
        } catch (xpError) {
          console.warn('togglePostLike: Errore aggiunta XP:', xpError.message);
          // Non bloccare il like se l'XP fallisce
        }

        console.log('togglePostLike: Like aggiunto al post:', postId);
        return { isLiked: true, likesCount: likes.length + 1 };
      }
    });
  } catch (error) {
    console.error('togglePostLike: Errore generale:', error);

    const errorInfo = handleFirebaseConnectionError(error);
    if (errorInfo.isConnectionError) {
      throw new Error('Connessione lenta. Il like verrà sincronizzato quando la connessione migliorerà.');
    }

    throw error;
  }
};

// Ottieni tutti i post con stato like per l'utente corrente
const getAllPostsWithLikeStatus = async (currentUserId = null, userSelectedTags = []) => {
  try {
    console.log('getAllPostsWithLikeStatus: Starting for user:', currentUserId);

    const barberPosts = await withRetry(async () => {
      return await getAllBarberPosts();
    }, 2, 500);

    // console.log('getAllPostsWithLikeStatus: Got barber posts:', JSON.stringify(barberPosts, null, 2));

    if (!currentUserId) {
      const basePosts = barberPosts.map(post => ({
        ...post,
        isLiked: false,
        likesCount: post.likesCount || post.likes || 0
      }));
      return rankPostsByUserTags(basePosts, userSelectedTags);
    }

    const postsWithLikeStatus = await Promise.all(
      barberPosts.map(async (post) => {
        const fallbackCount = post.likesCount || post.likes || 0;
        const postId = post.postId || `${post.barberId}_img_${post.id.split('_').pop()}`;

        try {
          return await withRetry(async () => {
            const postRef = doc(db, 'posts', postId);
            const postDoc = await getDoc(postRef);

            if (postDoc.exists()) {
              const postData = postDoc.data();
              const likes = Array.isArray(postData.likes) ? postData.likes : [];
              const likesCount = likes.length || postData.likeCount || postData.likesCount || fallbackCount;

              return {
                ...post,
                postId,
                isLiked: likes.includes(currentUserId),
                likesCount,
                likes: likesCount
              };
            }

            return {
              ...post,
              postId,
              isLiked: false,
              likesCount: fallbackCount,
              likes: fallbackCount
            };
          }, 1, 500);
        } catch (error) {
          console.error('getAllPostsWithLikeStatus: Errore nel controllo like status per post:', post.id, error);
          return {
            ...post,
            postId,
            isLiked: false,
            likesCount: fallbackCount,
            likes: fallbackCount
          };
        }
      })
    );

    const rankedPosts = rankPostsByUserTags(postsWithLikeStatus, userSelectedTags);
    console.log('getAllPostsWithLikeStatus: Posts con stato like aggiornato:', rankedPosts.length);
    return rankedPosts;
  } catch (error) {
    console.error('getAllPostsWithLikeStatus: Errore nel recupero posts con like status:', error);

    const errorInfo = handleFirebaseConnectionError(error);
    if (errorInfo.isConnectionError) {
      console.warn('getAllPostsWithLikeStatus: Modalita offline attivata, restituendo post base');
    }

    try {
      const barberPosts = await getAllBarberPosts();
      const basePosts = barberPosts.map(post => ({
        ...post,
        postId: post.postId || `${post.barberId}_img_${post.id.split('_').pop()}`,
        isLiked: false,
        likesCount: post.likesCount || post.likes || 0,
        likes: post.likesCount || post.likes || 0
      }));
      return rankPostsByUserTags(basePosts, userSelectedTags);
    } catch (fallbackError) {
      console.error('getAllPostsWithLikeStatus: Errore anche nel fallback:', fallbackError);
      return [];
    }
  }
};

// Versione PAGINATA del feed con stato like, per la Home.
// Differenze chiave rispetto a getAllPostsWithLikeStatus:
//  - legge una sola pagina (FEED_PAGE_SIZE) invece di tutta la collezione;
//  - prima pagina servita dalla cache TTL (no refetch a ogni apertura);
//  - lo stato like è derivato dai dati GIÀ letti (likedBy), senza un secondo
//    getDoc per ogni post.
// Il ranking per tag è applicato sulla singola pagina (i post più rilevanti
// salgono all'interno della pagina). Ritorna { posts, cursor, hasMore }.
const getPostsPageWithLikeStatus = async ({
  currentUserId = null,
  userSelectedTags = [],
  cursor = null,
  force = false,
} = {}) => {
  try {
    const { posts, cursor: nextCursor, hasMore } = await getBarberPostsPage({ cursor, force });

    const withLike = posts.map((post) => {
      const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
      const likesCount = likedBy.length || post.likesCount || post.likes || 0;
      const postId = post.postId || `${post.barberId}_img_${String(post.id).split('_').pop()}`;
      return {
        ...post,
        postId,
        isLiked: currentUserId ? likedBy.includes(currentUserId) : false,
        likesCount,
        likes: likesCount,
      };
    });

    return {
      posts: rankPostsByUserTags(withLike, userSelectedTags),
      cursor: nextCursor,
      hasMore,
    };
  } catch (error) {
    console.error('getPostsPageWithLikeStatus: errore:', error);
    const errorInfo = handleFirebaseConnectionError(error);
    if (errorInfo.isConnectionError) {
      return { posts: [], cursor: null, hasMore: false };
    }
    return { posts: [], cursor: null, hasMore: false };
  }
};

// Ottieni i post di un barbiere filtrando per authorUid (= barberId) (M4 §6).
// Stesso Document ID dei post del feed: riusa getAllPostsWithLikeStatus così
// lo stato like e i campi normalizzati sono identici a quelli mostrati nel feed.
const getBarberPostsByUid = async (barberUid, currentUserId = null) => {
  if (!barberUid) return [];

  try {
    const allPosts = await getAllPostsWithLikeStatus(currentUserId);
    return allPosts.filter((post) => post.barberId === barberUid);
  } catch (error) {
    console.error("getBarberPostsByUid: errore filtraggio post per uid:", error);
    return [];
  }
};

export {
  getAllBarberPosts,
  createOrUpdatePost,
  getPost,
  togglePostLike,
  getAllPostsWithLikeStatus,
  getBarberPostsByUid,
  // Feed paginato + caching (Home).
  getPostsPageWithLikeStatus,
  getBarberPostsPage,
  invalidateFeedCache,
  // Esportati per i test unitari dell'algoritmo di feed (Task 1).
  rankPostsByUserTags,
  getFeedPriority,
  extractTagKeys,
}
