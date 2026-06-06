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
  deleteUser,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, arrayUnion, arrayRemove, orderBy, limit, serverTimestamp } from 'firebase/firestore';
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
    // L2 per pinch-to-zoom (Task 7). Null se il post è legacy (solo thumbnail).
    zoomReadyUrl: postData.zoomReadyUrl || null,
    imageUrl,
    name: salonName,
    likes: likesCount,
    likesCount,
    likedBy: likes,
    isLiked: false,
    isFollowing: false,
    selectedTags,
    photoGender: postData.photoGender || barberData.workGender || '',
    location: barberData.address || barberData.via || '',
    specialties: barberData.typesCut || barberData.tipiTaglio || [],
    // Campi reali sul documento barbiere: `telephone` / `website` (con alias legacy).
    // Sorgente del bottone BOOK NOW (M4 §2.2 / D2).
    phone: barberData.telephone || barberData.telefono || '',
    website: barberData.website || barberData.sitoWeb || '',
    email: barberData.emailContact || barberData.emailContatto || '',
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



// ============================================================================
// RECUPERO PASSWORD (AUTHSERVICE_REDESIGN_v3 §3)
// ============================================================================

/**
 * Invia email di reset password all'indirizzo fornito.
 * Firebase non rivela se l'email esiste o meno (privacy by design):
 * il chiamante mostra sempre lo stesso messaggio di conferma.
 *
 * @param {string} email
 */
export const sendPasswordReset = async (email) => {
  const normalizedEmail = (email || '').trim();
  if (!normalizedEmail) {
    throw new Error('invalidEmail');
  }

  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
  } catch (error) {
    // Per privacy NON propaghiamo "auth/user-not-found": la UI mostra sempre il
    // messaggio statico di conferma. Propaghiamo solo gli errori che è giusto
    // mostrare (email malformata, troppi tentativi).
    if (error.code === 'auth/user-not-found') {
      return;
    }

    let errorKey = error.message || 'genericError';
    if (error.code === 'auth/invalid-email') {
      errorKey = 'invalidEmail';
    } else if (error.code === 'auth/too-many-requests') {
      errorKey = 'tooManyRequests';
    } else if (error.code === 'auth/missing-email') {
      errorKey = 'invalidEmail';
    }

    throw new Error(errorKey);
  }
};

// ============================================================================
// SOCIAL LOGIN (AUTHSERVICE_REDESIGN_v3 §4)
//
// NOTE IMPORTANTI:
// - I pacchetti nativi (@react-native-google-signin/google-signin,
//   react-native-fbsdk-next, expo-apple-authentication) NON sono importati in
//   cima al modulo: vengono caricati con require() lazy DENTRO ogni funzione.
//   Così authService continua a importarsi e funzionare (login email/password,
//   ecc.) anche se i pacchetti non sono ancora installati. Le funzioni social
//   lanciano un errore chiaro solo se invocate senza il pacchetto presente.
// - I documenti Firestore vengono creati con i NOMI CAMPO ESISTENTI dell'app
//   (nickName, salonName, address, workGender, telephone, emailContact,
//   roleCode, accountType) così tutte le altre schermate continuano a leggere
//   correttamente. In più aggiungiamo `authProviders` come da redesign.
// ============================================================================

const requireOptional = (moduleName) => {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(moduleName);
  } catch (error) {
    const wrapped = new Error('socialProviderNotInstalled');
    wrapped.cause = error;
    wrapped.moduleName = moduleName;
    throw wrapped;
  }
};

const mapProviderIds = (user) => {
  const ids = (user?.providerData || []).map((p) => p.providerId).filter(Boolean);
  return ids.length ? Array.from(new Set(ids)) : [];
};

/**
 * Verifica se l'utente Firebase Auth ha già un documento Firestore.
 * Restituisce il ruolo se trovato, null se nuovo utente.
 *
 * @param {import('firebase/auth').User} user
 * @returns {Promise<'barber' | 'client' | null>}
 */
export const getExistingUserRole = async (user) => {
  if (!user?.uid) {
    return null;
  }

  const [barberSnap, clientSnap] = await Promise.all([
    getDoc(doc(db, 'barbers', user.uid)),
    getDoc(doc(db, 'clients', user.uid)),
  ]);

  if (barberSnap.exists()) return 'barber';
  if (clientSnap.exists()) return 'client';
  return null;
};

/** Google Sign In — restituisce lo user Firebase. */
export const signInWithGoogle = async () => {
  const { GoogleSignin } = requireOptional('@react-native-google-signin/google-signin');

  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();
  const idToken = result?.idToken || result?.data?.idToken;
  if (!idToken) {
    throw new Error('googleNoIdToken');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);
  return user; // il chiamante poi chiama getExistingUserRole
};

/** Facebook Sign In — restituisce lo user Firebase. */
export const signInWithFacebook = async () => {
  const { LoginManager, AccessToken } = requireOptional('react-native-fbsdk-next');

  const loginResult = await LoginManager.logInWithPermissions(['public_profile', 'email']);
  if (loginResult.isCancelled) {
    throw new Error('cancelled');
  }

  const data = await AccessToken.getCurrentAccessToken();
  if (!data?.accessToken) {
    throw new Error('facebookNoAccessToken');
  }

  const credential = FacebookAuthProvider.credential(data.accessToken);
  const { user } = await signInWithCredential(auth, credential);
  return user;
};

/** Apple Sign In — restituisce lo user Firebase. */
export const signInWithApple = async () => {
  const AppleAuthentication = requireOptional('expo-apple-authentication');

  const { identityToken } = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
  });

  if (!identityToken) {
    throw new Error('appleNoIdentityToken');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken });
  const { user } = await signInWithCredential(auth, credential);
  return user;
};

/**
 * Crea il documento client dopo social signup.
 * Usa i nomi campo esistenti dell'app + authProviders.
 * avatarUrl precompilato dal provider se disponibile.
 *
 * @param {import('firebase/auth').User} user
 * @param {{ nickname: string }} data
 */
export const createClientDocFromSocial = async (user, { nickname }) => {
  const normalizedNickname = (nickname || '').trim();
  if (normalizedNickname.length < 3) {
    throw new Error('userNameValidation');
  }

  const isUnique = await checkUsernameUniqueness(normalizedNickname);
  if (!isUnique) {
    throw new Error('nicknameAlreadyExists');
  }

  await setDoc(doc(db, 'clients', user.uid), {
    userName:       normalizedNickname,
    nomeUtente:     normalizedNickname,
    email:          user.email ?? null,
    authProviders:  mapProviderIds(user),
    avatarUrl:      user.photoURL ?? null,
    sex:            null,
    preferenceCut:  [],
    role:           'client',
    accountType:    'client',
    roleCode:       0,
    createdAt:      new Date().toISOString(),
  });
};

/**
 * Crea il documento barber dopo social signup.
 * Riceve i campi del barber (esclusi email/password che vengono dal provider).
 * Usa i nomi campo esistenti dell'app + authProviders.
 *
 * @param {import('firebase/auth').User} user
 * @param {Object} barberData
 */
export const createBarberDocFromSocial = async (user, barberData) => {
  const {
    nickName,
    salonName,
    firstName,
    lastName,
    salonAddress,
    workGender,
    typesCut,
    website,
    phoneNumber,
    contactEmail,
  } = barberData;

  const isNicknameUnique = await checkBarberNicknameUniqueness(nickName);
  if (!isNicknameUnique) {
    throw new Error('nicknameExists');
  }

  await setDoc(doc(db, 'barbers', user.uid), {
    email:           user.email ?? null,
    firstName:       (firstName || '').trim(),
    lastName:        (lastName || '').trim(),
    nickName:        (nickName || '').trim(),
    salonName:       (salonName || '').trim(),
    address:         (salonAddress || '').trim(),
    workGender:      workGender,
    typesCut:        Array.isArray(typesCut) ? typesCut : [],
    telephone:       (phoneNumber || '').trim() || null,
    website:         (website || '').trim() || null,
    emailContact:    (contactEmail || '').trim() || user.email || null,
    authProviders:   mapProviderIds(user),
    avatarUrl:       user.photoURL ?? null,
    portfolioImages: [],
    portfolioVideos: [],
    tags:            [],
    role:            'barber',
    accountType:     'barber',
    roleCode:        1,
    createdAt:       new Date().toISOString(),
  });
};
