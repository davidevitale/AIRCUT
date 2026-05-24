import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { updateUserXP } from "./xpService";

// Gestione Like - Aggiungi like
const addLike = async (userId, postId, postData) => {
  try {
    // Verifica se è client o barber
    const clientDoc = await getDoc(doc(db, 'clients', userId));
    const collection = clientDoc.exists() ? 'clients' : 'barbers';

    const userRef = doc(db, collection, userId);
    const userDoc = await getDoc(userRef);
    const currentLikes = userDoc.data()?.likedPosts || [];

    // Aggiungi il like se non esiste già
    if (!currentLikes.find(like => like.postId === postId)) {
      const newLike = {
        postId,
        ...postData,
        likedAt: new Date().toISOString()
      };
      currentLikes.push(newLike);

      await setDoc(userRef, { likedPosts: currentLikes }, { merge: true });
    }

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Gestione Like - Rimuovi like
const removeLike = async (userId, postId) => {
  try {
    // Verifica se è client o barber
    const clientDoc = await getDoc(doc(db, 'clients', userId));
    const collection = clientDoc.exists() ? 'clients' : 'barbers';

    const userRef = doc(db, collection, userId);
    const userDoc = await getDoc(userRef);
    const currentLikes = userDoc.data()?.likedPosts || [];

    // Rimuovi il like
    const updatedLikes = currentLikes.filter(like => like.postId !== postId);

    await setDoc(userRef, { likedPosts: updatedLikes }, { merge: true });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Ottieni tutti i like dell'utente
const getUserLikes = async (userId) => {
  try {
    // Verifica se è client o barber
    const clientDoc = await getDoc(doc(db, 'clients', userId));
    const collection = clientDoc.exists() ? 'clients' : 'barbers';

    const userDoc = await getDoc(doc(db, collection, userId));
    return userDoc.data()?.likedPosts || [];
  } catch (error) {
    throw new Error(error.message);
  }
};
// Gestione Like per Portfolio Images || Like Management for Portfolio Images
const addPortfolioImageLike = async (userId, imageId, imageData) => {
  try {
    const imageDocRef = doc(db, 'portfolioImages', imageId);
    const imageDoc = await getDoc(imageDocRef);

    if (imageDoc.exists()) {
      // Aggiorna documento esistente
      const currentData = imageDoc.data();
      const currentLikes = currentData.likedBy || [];

      if (!currentLikes.includes(userId)) {
        await updateDoc(imageDocRef, {
          likedBy: [...currentLikes, userId],
          likesCount: (currentData.likesCount || 0) + 1,
          lastLikedAt: new Date().toISOString()
        });
      }
    } else {
      // Crea nuovo documento && Create new document
      await setDoc(imageDocRef, {
        imageUrl: imageData.imageUrl,
        barberId: imageData.barberId,
        barberName: imageData.barberName,
        likedBy: [userId],
        likesCount: 1,
        createdAt: new Date().toISOString(),
        lastLikedAt: new Date().toISOString()
      });
    }

    // Aggiungi 5 XP per il like al portfolio
    try {
      await updateUserXP(userId, 5);
      console.log('addPortfolioImageLike: 5 XP aggiunti per il like al portfolio');
    } catch (xpError) {
      console.warn('addPortfolioImageLike: Errore aggiunta XP:', xpError.message);
    }

    console.log('Like aggiunto alla foto del portfolio:', imageId);
  } catch (error) {
    console.error('Errore aggiunta like foto portfolio:', error);
    throw error;
  }
};

const removePortfolioImageLike = async (userId, imageId) => {
  try {
    const imageDocRef = doc(db, 'portfolioImages', imageId);
    const imageDoc = await getDoc(imageDocRef);

    if (imageDoc.exists()) {
      const currentData = imageDoc.data();
      const currentLikes = currentData.likedBy || [];

      if (currentLikes.includes(userId)) {
        const updatedLikes = currentLikes.filter(id => id !== userId);
        await updateDoc(imageDocRef, {
          likedBy: updatedLikes,
          likesCount: Math.max(0, (currentData.likesCount || 0) - 1),
          lastUnlikedAt: new Date().toISOString()
        });
      }
    }

    console.log('Like rimosso dalla foto del portfolio:', imageId);
  } catch (error) {
    console.error('Errore rimozione like foto portfolio:', error);
    throw error;
  }
};

const getPortfolioImageLikes = async (barberId, userImages) => {
  try {
    const likesData = {};

    for (const imageUrl of userImages) {
      const imageId = `${barberId}_${btoa(imageUrl).replace(/[^a-zA-Z0-9]/g, '')}`;
      const imageDocRef = doc(db, 'portfolioImages', imageId);
      const imageDoc = await getDoc(imageDocRef);

      if (imageDoc.exists()) {
        const data = imageDoc.data();
        likesData[imageUrl] = {
          likesCount: data.likesCount || 0,
          likedBy: data.likedBy || [],
          imageId: imageId
        };
      } else {
        likesData[imageUrl] = {
          likesCount: 0,
          likedBy: [],
          imageId: imageId
        };
      }
    }

    return likesData;
  } catch (error) {
    console.error('Errore caricamento like foto portfolio:', error);
    return {};
  }
};

// Ottieni tutte le foto portfolio che un utente ha messo like
const getUserPortfolioLikes = async (userId) => {
  try {
    console.log('getUserPortfolioLikes: Fetching likes for user:', userId);

    // Query per trovare tutte le immagini portfolio che l'utente ha messo like
    const portfolioRef = collection(db, 'portfolioImages');
    const q = query(portfolioRef, where('likedBy', 'array-contains', userId));
    const snapshot = await getDocs(q);

    const likedImages = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      likedImages.push({
        id: doc.id,
        imageUrl: data.imageUrl,
        barberId: data.barberId,
        barberName: data.barberName,
        likesCount: data.likesCount || 0,
        likedAt: data.lastLikedAt || data.createdAt,
        // Formato compatibile con LikeScreen
        postId: doc.id
      });
    });

    // Ordina per data di like più recente
    likedImages.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));

    console.log('getUserPortfolioLikes: Found liked images:', likedImages.length);
    return likedImages;
  } catch (error) {
    console.error('Errore nel recupero dei like utente portfolio:', error);
    return [];
  }
};

// Rimuovi like di un utente da una foto portfolio (per LikeScreen)
const removeUserLikeFromPortfolio = async (userId, portfolioImageId) => {
  try {
    console.log('removeUserLikeFromPortfolio: Removing like for user:', userId, 'image:', portfolioImageId);

    const imageDocRef = doc(db, 'portfolioImages', portfolioImageId);
    const imageDoc = await getDoc(imageDocRef);

    if (imageDoc.exists()) {
      const currentData = imageDoc.data();
      const currentLikes = currentData.likedBy || [];

      if (currentLikes.includes(userId)) {
        const updatedLikes = currentLikes.filter(id => id !== userId);
        await updateDoc(imageDocRef, {
          likedBy: updatedLikes,
          likesCount: Math.max(0, (currentData.likesCount || 0) - 1),
          lastUnlikedAt: new Date().toISOString()
        });

        console.log('removeUserLikeFromPortfolio: Like rimosso con successo');
        return true;
      }
    }

    console.log('removeUserLikeFromPortfolio: Like non trovato o già rimosso');
    return false;
  } catch (error) {
    console.error('Errore rimozione like portfolio:', error);
    throw error;
  }
};
export {
  addLike,
  removeLike,
  getUserLikes,
  addPortfolioImageLike,
  removePortfolioImageLike,
  getPortfolioImageLikes,
  getUserPortfolioLikes,
  removeUserLikeFromPortfolio,
}

