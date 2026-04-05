import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, arrayUnion, arrayRemove, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

// Funzione helper per gestire errori di connessione Firebase || Helper function to handle Firebase connection errors
const handleFirebaseConnectionError = (error) => {
  console.error('Firebase connection error:', error);

  if (error.code === 'unavailable' ||
    error.message?.includes('Could not reach Cloud Firestore backend') ||
    error.message?.includes('Backend didn\'t respond within')) {

    console.warn('Firebase offline mode activated due to connection issues');
    return {
      isConnectionError: true,
      message: 'Connessione lenta o assente. L\'app funziona in modalità offline.',
      canRetry: true
    };
  }

  return {
    isConnectionError: false,
    message: error.message || 'Errore sconosciuto',
    canRetry: false
  };
};

// Wrapper per operazioni Firebase con retry automatico || Wrapper for Firebase operations with automatic retry
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Firebase operation attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error;
      const errorInfo = handleFirebaseConnectionError(error);

      console.warn(`Attempt ${attempt} failed:`, errorInfo.message);

      if (!errorInfo.canRetry || attempt === maxRetries) {
        break;
      }

      // Aspetta prima del prossimo tentativo
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
};

// Verifica unicità del nome utente || Check username uniqueness
export const checkUsernameUniqueness = async (username) => {
  try {
    return await withRetry(async () => {
      // Controlla nei clienti
      const clientsQuery = query(
        collection(db, 'clients'),
        where('nomeUtente', '==', username)
      );
      const clientsSnapshot = await getDocs(clientsQuery);

      // Controlla nei parrucchieri (nomeSalone)
      const barbersQuery = query(
        collection(db, 'barbers'),
        where('nomeSalone', '==', username)
      );
      const barbersSnapshot = await getDocs(barbersQuery);

      // Se trovato in qualsiasi collezione, il nome non è unico
      return clientsSnapshot.empty && barbersSnapshot.empty;
    });
  } catch (error) {
    console.error('Errore nella verifica unicità username:', error);
    const errorInfo = handleFirebaseConnectionError(error);

    if (errorInfo.isConnectionError) {
      // In caso di errore di connessione, assumiamo che il nome sia unico per non bloccare l'utente
      console.warn('Username uniqueness check failed due to connection issues, allowing registration');
      return true;
    }

    return false;
  }
};

// Gestione Like per Portfolio Images || Like Management for Portfolio Images
export const addPortfolioImageLike = async (userId, imageId, imageData) => {
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

export const removePortfolioImageLike = async (userId, imageId) => {
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

export const getPortfolioImageLikes = async (barberId, userImages) => {
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
export const getUserPortfolioLikes = async (userId) => {
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
export const removeUserLikeFromPortfolio = async (userId, portfolioImageId) => {
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

// Ottieni dati utente tramite nome
export const getUserByName = async (username) => {
  try {
    // Cerca nei clienti
    const clientsQuery = query(
      collection(db, 'clients'),
      where('nomeUtente', '==', username)
    );
    const clientsSnapshot = await getDocs(clientsQuery);

    if (!clientsSnapshot.empty) {
      const clientDoc = clientsSnapshot.docs[0];
      return {
        id: clientDoc.id,
        ...clientDoc.data(),
        type: 'client'
      };
    }

    // Cerca nei parrucchieri
    const barbersQuery = query(
      collection(db, 'barbers'),
      where('nomeSalone', '==', username)
    );
    const barbersSnapshot = await getDocs(barbersQuery);

    if (!barbersSnapshot.empty) {
      const barberDoc = barbersSnapshot.docs[0];
      return {
        id: barberDoc.id,
        ...barberDoc.data(),
        type: 'barber'
      };
    }

    return null; // Nome non trovato
  } catch (error) {
    console.error('Errore ricerca utente per nome:', error);
    return null;
  }
};

// Registrazione Cliente
export const registerClient = async (userData) => {
  let createdUser = null; // ✅ declared safely

  try {
    // Verifica unicità del nome utente (solo se fornito)
    if (userData.email) {
      const isUnique = await checkUsernameUniqueness(userData.email);
      if (!isUnique) {
        console.log('isUnique')
        throw new Error('emailAlreadyExist');
      }
    }

    // Create account Firebase Auth
    const { user } = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    createdUser = user; // 🔑 save reference
    const {
      password,
      confirmPassword,
      ...safeUserData
    } = userData;

    // return console.log(JSON.stringify(userData, null, 2))
    // Salva dati specifici del cliente in Firestore
    await setDoc(doc(db, 'clients', user.uid), safeUserData);

    return { user, role: 'client' };
  } catch (error) {
    // 🔥 ROLLBACK
    if (createdUser) {
      try {
        await deleteUser(createdUser);
        console.log('🧹 Auth user rolled back');
      } catch (deleteError) {
        console.error('❌ Failed to rollback user:', deleteError);
      }
    }

    let errorKey = error.message;

    if (error.code === 'auth/email-already-in-use') {
      console.log(error.code)
      errorKey = 'emailAlreadyExist';
    } else if (error.code === 'auth/weak-password') {
      errorKey = 'passwordWeak';
    } else if (error.code === 'auth/invalid-email') {
      errorKey = 'invaildEmail';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorKey = 'notAllowed';
    }

    throw new Error(errorKey);
  }
};

// Registrazione Parrucchiere
export const registerBarber = async (userData) => {
  let createdUser = null; // ✅ declared safely

  try {
    const isUnique = await checkUsernameUniqueness(userData.salonName);
    if (!isUnique) {
      throw new Error('salonNameExists');
    }

    const { user } = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    createdUser = user; // 🔑 save reference


    await setDoc(doc(db, 'barbers', user.uid), {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      salonName: userData.salonName,
      address: userData.salonAddress,
      typesCut: userData.typesCut,
      telephone: userData.phoneNumber,
      website: userData.website,
      emailContact: userData.contactEmail,
      liabilityAccepted: userData.termsService,
      termsAccepted: userData.termsService,
      portfolioImages: userData.portfolioImages || [],
      portfolioVideos: userData.portfolioVideos || [],
      role: 'barber',
      accountType: 'barber',
      roleCode: 1,
      createdAt: userData.createdAt || new Date().toISOString(),
    });

    return { user, role: 'barber' };
  } catch (error) {
    // 🔥 ROLLBACK
    if (createdUser) {
      try {
        await deleteUser(createdUser);
        console.log('🧹 Auth user rolled back');
      } catch (deleteError) {
        console.error('❌ Failed to rollback user:', deleteError);
      }
    }
    let errorKey = error.message;

    if (error.code === 'auth/email-already-in-use') {
      errorKey = 'emailAlreadyExist';
    } else if (error.code === 'auth/weak-password') {
      errorKey = 'passwordWeak';
    } else if (error.code === 'auth/invalid-email') {
      errorKey = 'invalidEmail';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorKey = 'notAllowed';
    }

    throw new Error(errorKey);
  }
};


// Login universale
export const loginUser = async (email, password, userRole) => {
  try {
    const normalizedRole = userRole === 'barber' ? 'barber' : 'client';
    const expectedCollection = normalizedRole === 'barber' ? 'barbers' : 'clients';
    const normalizedEmail = email.trim();

    // Role check before auth sign-in prevents transient auth-state changes
    // when email exists only in the opposite collection.
    const roleQuery = query(
      collection(db, expectedCollection),
      where('email', '==', normalizedEmail),
      limit(1)
    );
    const roleSnapshot = await getDocs(roleQuery);

    if (roleSnapshot.empty) {
      throw new Error(
        normalizedRole === 'barber'
          ? 'barberAccountNotFound'
          : 'clientAccountNotFound'
      );
    }

    const { user } = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const userDoc = await getDoc(doc(db, expectedCollection, user.uid));

    // Auth can succeed even when selected role is wrong.
    // In that case, sign out immediately to avoid protected-route access.
    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error(
        normalizedRole === 'barber'
          ? 'barberAccountNotFound'
          : 'clientAccountNotFound'
      );
    }

    return {
      user,
      userData: userDoc.data(),
      role: normalizedRole,
    };
  } catch (error) {
    // Always throw stable translation keys. UI handles localization.
    let errorKey = error.message || 'invalidCredentials';

    if (error.code === 'auth/user-not-found') {
      errorKey = 'userNotFound';
    } else if (error.code === 'auth/wrong-password') {
      errorKey = 'wrongPassword';
    } else if (error.code === 'auth/invalid-email') {
      errorKey = 'invalidEmail';
    } else if (error.code === 'auth/user-disabled') {
      errorKey = 'userDisabled';
    } else if (error.code === 'auth/too-many-requests') {
      errorKey = 'tooManyRequests';
    } else if (error.message === 'barberAccountNotFound') {
      errorKey = 'barberAccountNotFound';
    } else if (error.message === 'clientAccountNotFound') {
      errorKey = 'clientAccountNotFound';
    }

    throw new Error(errorKey);
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message);
  }
};

// Observer per stato autenticazione || Observer for authentication status
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    // console.log('onAuthStateChanged', auth)
    // console.log('onAuthStateChanged called with user:', user ? user.email : null);
    if (user) {
      // Utente loggato, recupera i dati
      console.log('Checking user documents for uid:', user.uid);
      const clientDoc = await getDoc(doc(db, 'clients', user.uid));
      const barberDoc = await getDoc(doc(db, 'barbers', user.uid));

      console.log('Client doc exists:', clientDoc.exists());
      console.log('Barber doc exists:', barberDoc.exists());

      let userData = null;
      let role = null;

      if (clientDoc.exists()) {
        userData = clientDoc.data();
        role = 'client';
        console.log('User is a client with roleCode:', userData.roleCode);
      } else if (barberDoc.exists()) {
        userData = barberDoc.data();
        role = 'barber';
        console.log('User is a barber with roleCode:', userData.roleCode);
      } else {
        console.log('No user document found in either collection');
      }

      console.log('Calling callback with role:', role, 'roleCode:', userData?.roleCode);
      callback({ user, userData, role });
    } else {
      // Utente non loggato
      console.log('No user logged in');
      callback(null);
    }
  });
};

// Recupera dati utente corrente
export const getCurrentUserData = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  console.log('getCurrentUserData called for user:', user.uid);
  const clientDoc = await getDoc(doc(db, 'clients', user.uid));
  const barberDoc = await getDoc(doc(db, 'barbers', user.uid));

  console.log('Client doc exists:', clientDoc.exists());
  console.log('Barber doc exists:', barberDoc.exists());

  if (clientDoc.exists()) {
    const userData = clientDoc.data();
    console.log('Found client data with roleCode:', userData.roleCode);
    return { user, userData, role: 'client', roleCode: userData.roleCode || 0 };
  } else if (barberDoc.exists()) {
    const userData = barberDoc.data();
    console.log('Found barber data with roleCode:', userData.roleCode);
    return { user, userData, role: 'barber', roleCode: userData.roleCode || 1 };
  }

  console.log('No user data found in getCurrentUserData');
  return null;
};

// Aggiorna portfolio parrucchiere
export const updateBarberPortfolio = async (userId, portfolioData) => {
  try {
    console.log('updateBarberPortfolio: Updating data for user:', userId);
    console.log('updateBarberPortfolio: Data to save:', JSON.stringify(portfolioData, null, 2));

    const barberRef = doc(db, 'barbers', userId);
    await setDoc(barberRef, portfolioData, { merge: true });

    console.log('updateBarberPortfolio: Data saved successfully');
    return true;
  } catch (error) {
    console.error('updateBarberPortfolio: Error saving data:', error);
    throw new Error(error.message);
  }
};

// Gestione Like - Aggiungi like
export const addLike = async (userId, postId, postData) => {
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
export const removeLike = async (userId, postId) => {
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
export const getUserLikes = async (userId) => {
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

// Debug function - get all barbers raw data
export const getAllBarbersRawData = async () => {
  try {
    console.log('getAllBarbersRawData: Starting to fetch all barber data...');
    const barbersRef = collection(db, 'barbers');
    const snapshot = await getDocs(barbersRef);

    console.log('getAllBarbersRawData: Found barbers count:', snapshot.size);

    const barbersData = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`getAllBarbersRawData: Barber ${doc.id}:`, {
        nomeSalone: data.nomeSalone,
        portfolioImages: data.portfolioImages,
        portfolioVideos: data.portfolioVideos,
        hasImages: !!(data.portfolioImages && data.portfolioImages.length > 0),
        hasVideos: !!(data.portfolioVideos && data.portfolioVideos.length > 0)
      });
      barbersData.push({
        id: doc.id,
        ...data
      });
    });

    return barbersData;
  } catch (error) {
    console.error('getAllBarbersRawData: Error:', error);
    throw error;
  }
};

// Ottieni tutti i parrucchieri con le loro foto per la home (con like reali)
export const getAllBarberPosts = async () => {
  try {
    console.log('getAllBarberPosts: Starting to fetch barber posts...');

    // Usa withRetry per gestire errori di connessione
    const snapshot = await withRetry(async () => {
      const barbersRef = collection(db, 'barbers');
      return await getDocs(barbersRef);
    }, 3, 1000); // 3 tentativi con 1 secondo di intervallo

    console.log('getAllBarberPosts: Found barbers:', snapshot.size);

    const posts = [];

    // Processiamo ogni barbiere
    for (const doc of snapshot.docs) {
      const barberData = doc.data();
      const barberId = doc.id;

      console.log(`getAllBarberPosts: Processing barber ${barberId}:`, {
        nomeSalone: barberData.nomeSalone,
        portfolioImages: barberData.portfolioImages?.length || 0,
        portfolioVideos: barberData.portfolioVideos?.length || 0
      });

      // Crea post per ogni immagine del portfolio
      if (barberData.portfolioImages && barberData.portfolioImages.length > 0) {
        console.log(`getAllBarberPosts: Processing ${barberData.portfolioImages.length} images for ${barberId}`);

        // Ottieni i like reali per tutte le immagini di questo barbiere
        let portfolioLikes = {};
        try {
          portfolioLikes = await getPortfolioImageLikes(barberId, barberData.portfolioImages);
        } catch (likeError) {
          console.warn(`getAllBarberPosts: Error loading likes for barber ${barberId}:`, likeError.message);
          // Continua con likes vuoti se c'è un errore
        }

        // Determina avatar: preferisci immagine profilo, altrimenti prima foto del portfolio
        const firstPortfolio = barberData.portfolioImages?.[0];
        const firstPortfolioUrl = typeof firstPortfolio === 'string' ? firstPortfolio : (firstPortfolio?.url || null);
        const avatarUrl = barberData.profileImage || firstPortfolioUrl || null;

        barberData.portfolioImages.forEach((imageUrl, index) => {
          console.log(`getAllBarberPosts: Adding image post ${index} for ${barberId}:`, imageUrl);

          // Verifica che imageUrl sia una stringa (URL) e non un oggetto
          const finalImageUrl = typeof imageUrl === 'string' ? imageUrl : imageUrl.url || imageUrl;

          // Ottieni i like reali per questa specifica immagine
          const imageLikes = portfolioLikes[finalImageUrl] || { likesCount: 0, likedBy: [] };

          posts.push({
            id: `${barberId}_img_${index}`,
            barberId: barberId,
            salonName: barberData.nomeSalone || 'Salone',
            barberName: barberData.nomiDipendenti?.[0] || 'Parrucchiere',
            avatar: avatarUrl,
            postImage: finalImageUrl,
            image: finalImageUrl, // Per compatibilità con BarberPost
            mainImage: finalImageUrl,
            name: barberData.nomeSalone || 'Salone',
            likes: imageLikes.likesCount, // Like reali dal database
            likedBy: imageLikes.likedBy || [], // Utenti che hanno messo like
            isLiked: false, // Verrà aggiornato in base all'utente corrente
            isFollowing: false,
            caption: `Guarda il nostro lavoro! 💇‍♂️ #${barberData.nomeSalone?.replace(/\s+/g, '').toLowerCase()} #haircut`,
            location: barberData.via || '',
            specialties: barberData.typesCut || barberData.tipiTaglio || [],
            phone: barberData.telefono || '',
            website: barberData.sitoWeb || '',
            email: barberData.emailContatto || '',
            createdAt: barberData.createdAt || new Date().toISOString(),
            imageUrl: finalImageUrl // Per identificare la foto nei like
          });
        });
      }

      // Crea post per ogni video del portfolio
      if (barberData.portfolioVideos && barberData.portfolioVideos.length > 0) {
        console.log(`getAllBarberPosts: Processing ${barberData.portfolioVideos.length} videos for ${barberId}`);

        // Per ora i video non hanno sistema di like, quindi usiamo 0
        // Determina avatar: preferisci immagine profilo, altrimenti prima foto del portfolio
        const firstPortfolio = barberData.portfolioImages?.[0];
        const firstPortfolioUrl = typeof firstPortfolio === 'string' ? firstPortfolio : (firstPortfolio?.url || null);
        const avatarUrl = barberData.profileImage || firstPortfolioUrl || null;

        barberData.portfolioVideos.forEach((videoUrl, index) => {
          console.log(`getAllBarberPosts: Adding video post ${index} for ${barberId}:`, videoUrl);

          // Verifica che videoUrl sia una stringa (URL) e non un oggetto
          const finalVideoUrl = typeof videoUrl === 'string' ? videoUrl : videoUrl.url || videoUrl;

          posts.push({
            id: `${barberId}_vid_${index}`,
            barberId: barberId,
            salonName: barberData.nomeSalone || 'Salone',
            barberName: barberData.nomiDipendenti?.[0] || 'Parrucchiere',
            avatar: avatarUrl,
            postImage: finalVideoUrl, // Per i video usiamo l'URL come immagine temporanea
            image: finalVideoUrl,
            mainImage: finalVideoUrl,
            name: barberData.nomeSalone || 'Salone',
            isVideo: true,
            likes: 0, // I video per ora non hanno like
            likedBy: [],
            isLiked: false,
            isFollowing: false,
            caption: `Video del nostro lavoro! 🎬 #${barberData.nomeSalone?.replace(/\s+/g, '').toLowerCase()} #barbershop`,
            location: barberData.via || '',
            specialties: barberData.typesCut || barberData.tipiTaglio || [],
            phone: barberData.telefono || '',
            website: barberData.sitoWeb || '',
            email: barberData.emailContatto || '',
            createdAt: barberData.createdAt || new Date().toISOString(),
            imageUrl: finalVideoUrl
          });
        });
      }
    }

    console.log('getAllBarberPosts: Total posts created:', posts.length);

    // Ordina per data di creazione (più recenti prima)
    const sortedPosts = posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log('getAllBarberPosts: Returning sorted posts with real likes:', sortedPosts.length);

    return sortedPosts;
  } catch (error) {
    console.error('Errore nel recupero dei post dei parrucchieri:', error);

    // Gestione speciale per errori di connessione Firebase
    const errorInfo = handleFirebaseConnectionError(error);
    if (errorInfo.isConnectionError) {
      console.warn('getAllBarberPosts: Firebase offline, returning empty posts array');
      // Restituisce array vuoto invece di lanciare l'errore
      return [];
    }

    // Per altri tipi di errore, lancia l'errore
    throw new Error(`Errore caricamento posts: ${error.message}`);
  }
};

// ===============================
// FUNZIONI DI RICERCA SMART
// ===============================

// Parsing hashtag da caption
export const parseHashtagsFromCaption = (caption) => {
  if (!caption) return [];
  const hashtagRegex = /#\w+/g;
  const hashtags = caption.match(hashtagRegex) || [];
  return [...new Set(hashtags)]; // Rimuove duplicati
};

// Ricerca per hashtag
export const searchPostsByHashtag = async (hashtag) => {
  try {
    console.log('searchPostsByHashtag: Searching for hashtag:', hashtag);

    // Assicurati che l'hashtag inizi con #
    const searchHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

    // Prima ottieni tutti i post
    const allPosts = await getAllBarberPosts();

    // Filtra i post che contengono l'hashtag nella caption
    const filteredPosts = allPosts.filter(post => {
      if (!post.caption) return false;

      const postHashtags = parseHashtagsFromCaption(post.caption);
      return postHashtags.some(tag => tag.toLowerCase() === searchHashtag.toLowerCase());
    });

    console.log('searchPostsByHashtag: Found posts:', filteredPosts.length);
    return filteredPosts;
  } catch (error) {
    console.error('Errore ricerca per hashtag:', error);
    return [];
  }
};

// Ricerca barbieri per nome
export const searchBarbersByName = async (searchText) => {
  try {
    console.log('searchBarbersByName: Searching for:', searchText);

    if (!searchText || searchText.trim().length < 2) {
      return [];
    }

    const searchQuery = searchText.toLowerCase().trim();
    const barbersRef = collection(db, 'barbers');

    // Carica tutti i barbieri e filtra lato client per maggiore flessibilità
    console.log('searchBarbersByName: Loading all barbers for client-side filtering...');
    const barbersSnapshot = await getDocs(barbersRef);

    console.log('searchBarbersByName: Total barbers in database:', barbersSnapshot.size);

    const results = [];

    barbersSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('searchBarbersByName: Checking barber:', {
        id: doc.id,
        nomeSalone: data.nomeSalone,
        nomiDipendenti: data.nomiDipendenti,
        via: data.via
      });

      const nomeSalone = (data.nomeSalone || '').toLowerCase();
      const nomiDipendenti = (data.nomiDipendenti || '').toLowerCase();
      const via = (data.via || '').toLowerCase();

      // Controlla se il testo di ricerca è contenuto in qualsiasi campo
      const matchesNomeSalone = nomeSalone.includes(searchQuery);
      const matchesDipendenti = nomiDipendenti.includes(searchQuery);
      const matchesVia = via.includes(searchQuery);

      console.log(`searchBarbersByName: Checking ${data.nomeSalone}:`, {
        nomeSalone: data.nomeSalone,
        searchQuery,
        matchesNomeSalone,
        matchesDipendenti,
        matchesVia
      });

      if (matchesNomeSalone || matchesDipendenti || matchesVia) {
        results.push({
          id: doc.id,
          nomeSalone: data.nomeSalone,
          nomiDipendenti: data.nomiDipendenti,
          via: data.via,
          telefono: data.telefono,
          emailContatto: data.emailContatto,
          sitoWeb: data.sitoWeb,
          typesCut: data.typesCut || data.tipiTaglio || [],
          profileImage: data.portfolioImages?.[0] || null,
          followerCount: Math.floor(Math.random() * 1000), // Placeholder
          isFollowing: false, // Da implementare
          type: 'barber'
        });
        console.log('searchBarbersByName: Added to results:', data.nomeSalone);
      }
    });

    console.log('searchBarbersByName: Found results:', results.length);
    console.log('searchBarbersByName: Results:', results.map(r => r.nomeSalone));
    return results;
  } catch (error) {
    console.error('Errore ricerca barbieri:', error);
    return [];
  }
};

// Ricerca intelligente combinata
export const smartSearch = async (searchText, excludeUserId = null) => {
  try {
    console.log('smartSearch: Searching for:', searchText);

    if (!searchText || searchText.trim().length === 0) {
      return { type: 'empty', results: [] };
    }

    const trimmedText = searchText.trim();

    if (trimmedText.startsWith('#')) {
      // Ricerca per hashtag
      const posts = await searchPostsByHashtag(trimmedText);
      return { type: 'hashtag', hashtag: trimmedText, posts: posts, users: [] };
    } else {
      // Ricerca per nome barbiere/salone
      const barbers = await searchBarbersByName(trimmedText);
      console.log('smartSearch: Barbers found:', barbers.length);

      // Filtra per escludere l'utente corrente (non mostrare se stesso)
      let filteredBarbers = barbers;
      if (excludeUserId) {
        filteredBarbers = barbers.filter(barber => barber.id !== excludeUserId);
        console.log('smartSearch: Filtered barbers (excluding self):', filteredBarbers.length);
      }

      return { type: 'barbers', searchText: trimmedText, posts: [], users: filteredBarbers };
    }
  } catch (error) {
    console.error('Errore ricerca intelligente:', error);
    return { type: 'error', posts: [], users: [] };
  }
};

// ============================================================================
// SISTEMA LIKE PER SINGOLI POST
// ============================================================================

// Crea o aggiorna un documento post in Firestore
export const createOrUpdatePost = async (postData) => {
  try {
    const postId = `${postData.barberId}_${postData.photoId}`;
    const postRef = doc(db, 'posts', postId);

    const postDoc = {
      barberId: postData.barberId,
      photoId: postData.photoId,
      imageUrl: postData.imageUrl,
      caption: postData.caption || '',
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
export const getPost = async (postId, currentUserId = null) => {
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
export const togglePostLike = async (postId, userId) => {
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
          caption: '',
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
export const getAllPostsWithLikeStatus = async (currentUserId = null) => {
  try {
    console.log('getAllPostsWithLikeStatus: Starting for user:', currentUserId);

    // Prima ottieni tutti i post dei barbieri (come attualmente)
    const barberPosts = await withRetry(async () => {
      return await getAllBarberPosts();
    }, 2, 500); // Retry più veloce per questa operazione

    console.log('getAllPostsWithLikeStatus: Got barber posts:', barberPosts.length);

    if (!currentUserId) {
      return barberPosts.map(post => ({
        ...post,
        isLiked: false,
        likesCount: 0
      }));
    }

    // Per ogni post, controlla se esiste in Firestore e ottieni lo stato like
    const postsWithLikeStatus = await Promise.all(
      barberPosts.map(async (post) => {
        try {
          // Usa lo stesso sistema di ID del BarberPost
          const postId = `${post.barberId}_img_${post.id.split('_').pop()}`;

          try {
            return await withRetry(async () => {
              const postRef = doc(db, 'posts', postId);
              const postDoc = await getDoc(postRef);

              if (postDoc.exists()) {
                const postData = postDoc.data();
                const likes = postData.likes || [];
                return {
                  ...post,
                  postId: postId, // ID del documento Firestore
                  isLiked: likes.includes(currentUserId),
                  likesCount: likes.length,
                  likes: likes.length // Per compatibilità
                };
              } else {
                // Il post non esiste in Firestore, non crearlo automaticamente
                // Lo creeremo solo quando l'utente fa like
                return {
                  ...post,
                  postId: postId,
                  isLiked: false,
                  likesCount: 0,
                  likes: 0
                };
              }
            }, 1, 500); // Retry più veloce e meno tentativi per i singoli post
          } catch (firestoreError) {
            console.warn('getAllPostsWithLikeStatus: Errore Firestore per post:', postId, firestoreError.message);
            // Se c'è un errore di connessione, usa valori di default
            return {
              ...post,
              postId: postId,
              isLiked: false,
              likesCount: 0,
              likes: 0
            };
          }
        } catch (error) {
          console.error('getAllPostsWithLikeStatus: Errore nel controllo like status per post:', post.id, error);
          return {
            ...post,
            postId: `${post.barberId}_img_${post.id.split('_').pop()}`,
            isLiked: false,
            likesCount: 0,
            likes: 0
          };
        }
      })
    );

    console.log('getAllPostsWithLikeStatus: Posts con stato like aggiornato:', postsWithLikeStatus.length);
    return postsWithLikeStatus;
  } catch (error) {
    console.error('getAllPostsWithLikeStatus: Errore nel recupero posts con like status:', error);

    const errorInfo = handleFirebaseConnectionError(error);
    if (errorInfo.isConnectionError) {
      console.warn('getAllPostsWithLikeStatus: Modalità offline attivata, restituendo post base');
    }

    // In caso di errore, restituisci comunque i post base
    try {
      const barberPosts = await getAllBarberPosts();
      return barberPosts.map(post => ({
        ...post,
        postId: `${post.barberId}_img_${post.id.split('_').pop()}`,
        isLiked: false,
        likesCount: 0,
        likes: 0
      }));
    } catch (fallbackError) {
      console.error('getAllPostsWithLikeStatus: Errore anche nel fallback:', fallbackError);
      return [];
    }
  }
};

// ============================================================================
// SISTEMA XP E SLOT MACHINE
// ============================================================================

// Ottieni XP dell'utente
export const getUserXP = async (userId) => {
  try {
    console.log('getUserXP: Getting XP for userId:', userId);

    // Prima prova a trovare l'utente nei clients usando l'ID del documento
    const clientDocRef = doc(db, 'clients', userId);
    const clientDoc = await getDoc(clientDocRef);

    if (clientDoc.exists()) {
      const clientData = clientDoc.data();
      const xp = clientData.xp || 0;
      console.log('getUserXP: Found client with XP:', xp);
      return xp;
    }

    // Se non trovato nei clients, prova nei barbers
    const barberDocRef = doc(db, 'barbers', userId);
    const barberDoc = await getDoc(barberDocRef);

    if (barberDoc.exists()) {
      const barberData = barberDoc.data();
      const xp = barberData.xp || 0;
      console.log('getUserXP: Found barber with XP:', xp);
      return xp;
    }

    // Se non trovato in nessuna collezione, restituisci 0
    console.warn('getUserXP: User not found:', userId);
    return 0;
  } catch (error) {
    console.error('Errore recupero XP:', error);
    return 0; // Restituisci 0 invece di throwing per non bloccare l'app
  }
};

// Aggiorna XP dell'utente
export const updateUserXP = async (userId, xpAmount) => {
  try {
    console.log('updateUserXP: Updating XP for userId:', userId, 'amount:', xpAmount);

    let userDocRef = null;
    let currentXP = 0;

    // Prima prova a trovare l'utente nei clients usando l'ID del documento
    const clientDocRef = doc(db, 'clients', userId);
    const clientDoc = await getDoc(clientDocRef);

    if (clientDoc.exists()) {
      userDocRef = clientDocRef;
      const clientData = clientDoc.data();
      currentXP = clientData.xp || 0;
      console.log('updateUserXP: Found client with current XP:', currentXP);
    } else {
      // Se non trovato nei clients, prova nei barbers
      const barberDocRef = doc(db, 'barbers', userId);
      const barberDoc = await getDoc(barberDocRef);

      if (barberDoc.exists()) {
        userDocRef = barberDocRef;
        const barberData = barberDoc.data();
        currentXP = barberData.xp || 0;
        console.log('updateUserXP: Found barber with current XP:', currentXP);
      }
    }

    if (!userDocRef) {
      console.error('updateUserXP: User not found in clients or barbers collections');
      throw new Error('Utente non trovato per aggiornamento XP');
    }

    const newXP = Math.max(0, currentXP + xpAmount);

    await updateDoc(userDocRef, {
      xp: newXP,
      lastXPUpdate: new Date().toISOString()
    });

    console.log(`XP aggiornato per ${userId}: ${currentXP} + ${xpAmount} = ${newXP}`);
    return newXP;
  } catch (error) {
    console.error('Errore aggiornamento XP:', error);
    throw error;
  }
};

// Controlla slot giornalieri
export const checkDailySlot = async (userId) => {
  try {
    console.log('checkDailySlot: Checking slots for userId:', userId);

    let userDocRef = null;
    let userData = null;

    // Prima prova a trovare l'utente nei clients usando l'ID del documento
    const clientDocRef = doc(db, 'clients', userId);
    const clientDoc = await getDoc(clientDocRef);

    if (clientDoc.exists()) {
      userDocRef = clientDocRef;
      userData = clientDoc.data();
      console.log('checkDailySlot: Found client');
    } else {
      // Se non trovato nei clients, prova nei barbers
      const barberDocRef = doc(db, 'barbers', userId);
      const barberDoc = await getDoc(barberDocRef);

      if (barberDoc.exists()) {
        userDocRef = barberDocRef;
        userData = barberDoc.data();
        console.log('checkDailySlot: Found barber');
      }
    }

    if (!userDocRef) {
      console.error('checkDailySlot: User not found in clients or barbers collections');
      throw new Error('Utente non trovato per controllo slot giornalieri');
    }

    const today = new Date().toDateString();
    const dailySlots = userData.dailySlots || { date: '', count: 0 };

    if (dailySlots.date === today) {
      console.log('checkDailySlot: Same day, current count:', dailySlots.count);
      return { date: today, count: dailySlots.count };
    } else {
      // Nuovo giorno, reset del contatore
      const resetData = { date: today, count: 0 };
      await updateDoc(userDocRef, { dailySlots: resetData });
      console.log('checkDailySlot: New day, reset count to 0');
      return resetData;
    }
  } catch (error) {
    console.error('Errore controllo slot giornalieri:', error);
    throw error;
  }
};

// Aggiorna contatore slot giornalieri
export const updateDailySlot = async (userId) => {
  try {
    console.log('updateDailySlot: Updating slots for userId:', userId);

    let userDocRef = null;

    // Prima prova a trovare l'utente nei clients usando l'ID del documento
    const clientDocRef = doc(db, 'clients', userId);
    const clientDoc = await getDoc(clientDocRef);

    if (clientDoc.exists()) {
      userDocRef = clientDocRef;
      console.log('updateDailySlot: Found client');
    } else {
      // Se non trovato nei clients, prova nei barbers
      const barberDocRef = doc(db, 'barbers', userId);
      const barberDoc = await getDoc(barberDocRef);

      if (barberDoc.exists()) {
        userDocRef = barberDocRef;
        console.log('updateDailySlot: Found barber');
      }
    }

    if (!userDocRef) {
      console.error('updateDailySlot: User not found in clients or barbers collections');
      throw new Error('Utente non trovato per aggiornamento slot giornalieri');
    }

    const currentData = await checkDailySlot(userId);
    const newCount = currentData.count + 1;

    await updateDoc(userDocRef, {
      dailySlots: {
        date: currentData.date,
        count: newCount
      }
    });

    console.log(`Slot giornalieri aggiornati per ${userId}: ${newCount}`);
    return newCount;
  } catch (error) {
    console.error('Errore aggiornamento slot giornalieri:', error);
    throw error;
  }
};

// Ottieni leaderboard XP
export const getXPLeaderboard = async (limit = 10) => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('xp', 'desc'),
      limit(limit)
    );

    const querySnapshot = await getDocs(usersQuery);
    const leaderboard = [];

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.xp > 0) {
        leaderboard.push({
          userId: doc.id,
          xp: userData.xp,
          username: userData.username || 'Utente Anonimo',
          ...userData
        });
      }
    });

    return leaderboard;
  } catch (error) {
    console.error('Errore recupero leaderboard:', error);
    throw error;
  }
};

// =================== GESTIONE PROFILO UTENTE ===================

// Aggiorna i dati del profilo utente
export const updateUserProfile = async (userId, updates) => {
  try {
    console.log('Aggiornamento profilo per utente:', userId, updates);

    const user = auth.currentUser;
    if (!user || user.uid !== userId) {
      throw new Error('Non autorizzato ad aggiornare questo profilo');
    }

    // Determina la collezione basata sul tipo di utente
    let collectionName = 'clients';
    if (updates.userType === 1 || updates.role === 1) {
      collectionName = 'barbers';
    }

    // Rimuovi campi che non devono essere aggiornati direttamente
    const { userType, role, password, ...safeUpdates } = updates;

    // Aggiorna Firestore
    const userDoc = doc(db, collectionName, userId);
    await updateDoc(userDoc, {
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    });

    console.log('Profilo aggiornato con successo');
    return { success: true };
  } catch (error) {
    console.error('Errore aggiornamento profilo:', error);
    throw error;
  }
};

// Aggiorna email dell'utente (richiede riautenticazione)
export const updateUserEmail = async (currentPassword, newEmail) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    // Riautentica l'utente prima di cambiare email
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Aggiorna email
    await updateEmail(user, newEmail);

    // Aggiorna anche nei documenti Firestore
    const collections = ['clients', 'barbers'];
    for (const collectionName of collections) {
      try {
        const userDoc = doc(db, collectionName, user.uid);
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists()) {
          await updateDoc(userDoc, {
            email: newEmail,
            updatedAt: new Date().toISOString()
          });
          break;
        }
      } catch (error) {
        console.warn(`Documento non trovato in ${collectionName}:`, error);
      }
    }

    console.log('Email aggiornata con successo');
    return { success: true };
  } catch (error) {
    console.error('Errore aggiornamento email:', error);

    // Gestisci errori specifici
    if (error.code === 'auth/wrong-password') {
      throw new Error('Password attuale non corretta');
    } else if (error.code === 'auth/email-already-in-use') {
      throw new Error('Questa email è già utilizzata da un altro account');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Formato email non valido');
    }

    throw error;
  }
};

// Cambia password dell'utente (richiede riautenticazione)
export const updateUserPassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    // Riautentica l'utente prima di cambiare password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Aggiorna password
    await updatePassword(user, newPassword);

    console.log('Password aggiornata con successo');
    return { success: true };
  } catch (error) {
    console.error('Errore aggiornamento password:', error);

    // Gestisci errori specifici
    if (error.code === 'auth/wrong-password') {
      throw new Error('Password attuale non corretta');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('La nuova password è troppo debole');
    }

    throw error;
  }
};

// Invia email per reset password
export const sendPasswordResetEmailToUser = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: 'https://yourapp.com/login', // Cambia con il tuo URL
      handleCodeInApp: false,
    });

    console.log('Email di reset password inviata');
    return {
      success: true,
      message: 'Email di reset password inviata. Controlla la tua casella di posta.'
    };
  } catch (error) {
    console.error('Errore invio email reset:', error);

    if (error.code === 'auth/user-not-found') {
      throw new Error('Nessun account trovato con questa email');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Formato email non valido');
    }

    throw error;
  }
};

// Ottieni i dati del profilo utente completo
export const getUserProfileData = async (userId) => {
  try {
    console.log('Recupero dati profilo per utente:', userId);

    // Cerca prima nei clienti
    const clientDoc = doc(db, 'clients', userId);
    const clientSnap = await getDoc(clientDoc);

    if (clientSnap.exists()) {
      return {
        ...clientSnap.data(),
        userType: 0,
        id: userId
      };
    }

    // Se non trovato nei clienti, cerca nei parrucchieri
    const barberDoc = doc(db, 'barbers', userId);
    const barberSnap = await getDoc(barberDoc);

    if (barberSnap.exists()) {
      return {
        ...barberSnap.data(),
        userType: 1,
        id: userId
      };
    }

    throw new Error('Profilo utente non trovato');
  } catch (error) {
    console.error('Errore recupero profilo:', error);
    throw error;
  }
};

// =================== GESTIONE PREZZI PARRUCCHIERE ===================

// Ottieni i prezzi di un parrucchiere
export const getBarberPrices = async (barberId) => {
  try {
    console.log('getBarberPrices: Recupero prezzi per barbiere:', barberId);

    const barberDoc = doc(db, 'barbers', barberId);
    const barberSnap = await getDoc(barberDoc);

    if (barberSnap.exists()) {
      const data = barberSnap.data();
      return data.prezziServizi || [];
    }

    return [];
  } catch (error) {
    console.error('Errore recupero prezzi parrucchiere:', error);
    return [];
  }
};

// Aggiorna i prezzi di un parrucchiere
export const updateBarberPrices = async (barberId, prezziServizi) => {
  try {
    console.log('updateBarberPrices: Aggiornamento prezzi per barbiere:', barberId, prezziServizi);

    const barberDoc = doc(db, 'barbers', barberId);
    await updateDoc(barberDoc, {
      prezziServizi: prezziServizi,
      updatedAt: new Date().toISOString()
    });

    console.log('updateBarberPrices: Prezzi aggiornati con successo');
    return { success: true };
  } catch (error) {
    console.error('Errore aggiornamento prezzi parrucchiere:', error);
    throw error;
  }
};

// Ottieni dati completi parrucchiere per profilo
export const getBarberProfileData = async (barberName) => {
  try {
    console.log('getBarberProfileData: Recupero dati profilo per:', barberName);

    // Cerca il parrucchiere per nome salone
    const barbersQuery = query(
      collection(db, 'barbers'),
      where('nomeSalone', '==', barberName)
    );

    const barbersSnapshot = await getDocs(barbersQuery);

    if (barbersSnapshot.empty) {
      console.log('getBarberProfileData: Parrucchiere non trovato');
      return null;
    }

    const barberDoc = barbersSnapshot.docs[0];
    const barberData = {
      id: barberDoc.id,
      ...barberDoc.data()
    };

    console.log('getBarberProfileData: Dati recuperati:', barberData);
    return barberData;
  } catch (error) {
    console.error('Errore recupero dati profilo parrucchiere:', error);
    return null;
  }
};


