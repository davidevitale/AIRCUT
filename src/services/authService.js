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
export const handleFirebaseConnectionError = (error) => {
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
export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
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

export const toCreatedAtMillis = (createdAt) => {
  if (!createdAt) {
    return 0;
  }

  if (typeof createdAt.toMillis === 'function') {
    return createdAt.toMillis();
  }

  if (createdAt.seconds) {
    return createdAt.seconds * 1000;
  }

  const parsed = new Date(createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getLocalizedTagText = (tag) => {
  if (!tag) {
    return '';
  }

  if (typeof tag === 'string') {
    return tag;
  }

  return tag.it || tag.en || tag.id || '';
};

export const toSearchableText = (value) => {
  if (!value) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(toSearchableText).join(' ');
  }

  if (typeof value === 'object') {
    return [
      value.id,
      value.en,
      value.it,
      value.label?.en,
      value.label?.it,
    ].filter(Boolean).join(' ');
  }

  return String(value);
};

export const includesSearchQuery = (values, searchQuery) => (
  values
    .map(toSearchableText)
    .join(' ')
    .toLowerCase()
    .includes(searchQuery)
);

export const normalizeUploadedPost = (postId, postData, barberData = {}) => {
  const imageUrl = postData.imageUrl || postData.thumbnailUrl || postData.mediaUrl || '';

  if (!imageUrl) {
    return null;
  }

  const selectedTags = Array.isArray(postData.selectedTags) ? postData.selectedTags : [];
  const likes = Array.isArray(postData.likes) ? postData.likes : [];
  const likesCount = likes.length || postData.likeCount || postData.likesCount || 0;
  const salonName =
    postData.barberName ||
    barberData.salonName ||
    barberData.salonName ||
    barberData.firstName ||
    'Salone';
  const avatarUrl =
    postData.barberProfileImage ||
    barberData.profileImage ||
    null;

  return {
    id: postId,
    postId,
    barberId: postData.barberId,
    salonName,
    salonName: salonName,
    barberName: barberData.nomiDipendenti?.[0] || postData.barberName || salonName,
    nickName: barberData.nickName || postData.nickName || '',
    firstName: barberData.firstName || postData.firstName || '',
    lastName: barberData.lastName || postData.lastName || '',
    avatar: avatarUrl,
    barberProfileImage: avatarUrl,
    postImage: imageUrl,
    image: postData.thumbnailUrl || imageUrl,
    mainImage: imageUrl,
    thumbnailUrl: postData.thumbnailUrl || imageUrl,
    imageUrl,
    name: salonName,
    likes: likesCount,
    likesCount,
    likedBy: likes,
    isLiked: false,
    isFollowing: false,
    selectedTags,
    photoGender: postData.photoGender || barberData.workGender || '',
    location: barberData.via || '',
    specialties: barberData.typesCut || barberData.tipiTaglio || [],
    phone: barberData.telefono || '',
    website: barberData.sitoWeb || '',
    email: barberData.emailContatto || '',
    createdAt: postData.createdAt || null,
  };
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

      // Controlla nei parrucchieri (salonName)
      const barbersQuery = query(
        collection(db, 'barbers'),
        where('salonName', '==', username)
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

export const checkBarberNicknameUniqueness = async (nickname) => {
  try {
    const normalizedNickname = (nickname || '').trim().toLowerCase();
    if (!normalizedNickname) {
      return false;
    }

    return await withRetry(async () => {
      const barbersSnapshot = await getDocs(collection(db, 'barbers'));
      return barbersSnapshot.docs.every((docSnap) => {
        const existingNickname = String(docSnap.data()?.nickName || '').trim().toLowerCase();
        return existingNickname !== normalizedNickname;
      });
    });
  } catch (error) {
    console.error('Error checking barber nickname uniqueness:', error);
    throw error;
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
    const isNicknameUnique = await checkBarberNicknameUniqueness(userData.nickName);
    if (!isNicknameUnique) {
      throw new Error('nicknameExists');
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
      nickName: userData.nickName,
      salonName: userData.salonName,
      address: userData.salonAddress,
      workGender: userData.workGender,
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










// ===============================
// FUNZIONI DI RICERCA SMART
// ===============================



// ============================================================================
// SISTEMA LIKE PER SINGOLI POST
// ============================================================================


// ============================================================================
// SISTEMA XP E SLOT MACHINE
// ============================================================================











// =================== GESTIONE PROFILO UTENTE ===================











