import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { handleFirebaseConnectionError, normalizeUploadedPost, toCreatedAtMillis, withRetry } from "./authService";
import { updateUserXP } from "./xpService";
// Logica di ranking del feed estratta in un modulo PURO e testabile (Task 1).
import {
  rankPostsByUserTags,
  getFeedPriority,
  extractTagKeys,
} from "./feedRanking";

// Ottieni tutti i post caricati dai parrucchieri per la home.
const getAllBarberPosts = async () => {
  try {
    console.log('getAllBarberPosts: Starting to fetch uploaded posts...');

    const barbersSnapshot = await withRetry(async () => {
      return await getDocs(collection(db, 'barbers'));
    }, 3, 1000);
    console.log("barbersSnapshot", barbersSnapshot)

    const barberProfiles = {};
    barbersSnapshot.docs.forEach((barberDoc) => {
      barberProfiles[barberDoc.id] = barberDoc.data();
    });

    const postsSnapshot = await withRetry(async () => {
      return await getDocs(collection(db, 'posts'));
    }, 3, 1000);

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
  // Esportati per i test unitari dell'algoritmo di feed (Task 1).
  rankPostsByUserTags,
  getFeedPriority,
  extractTagKeys,
}
