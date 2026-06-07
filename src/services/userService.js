import { arrayRemove, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updateEmail, updatePassword } from "firebase/auth";
import { deleteObject, getStorage, listAll, ref } from "firebase/storage";
import { withRetry } from "./authService";

// Recupera dati utente corrente
const getCurrentUserData = async () => {
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
// Ottieni dati utente tramite nome
const getUserByName = async (username) => {
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
      where('salonName', '==', username)
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

// Ottieni i dati del profilo utente completo
const getUserProfileData = async (userId) => {
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


// Aggiorna i dati del profilo utente
const updateUserProfile = async (userId, updates) => {
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

// Aggiorna il documento cliente (clients/{uid}) con i SOLI campi editabili dal
// profilo: userName, sex, preferenceCut. Campi di sistema/non editabili
// (email, role, accountType, roleCode, createdAt) non vengono mai toccati.
// Passa da withRetry per coerenza con il resto del service layer.
const EDITABLE_CLIENT_FIELDS = ['userName', 'sex', 'preferenceCut'];

const updateClient = async (uid, updates = {}) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utente non autenticato');
  }
  const targetUid = uid || user.uid;
  if (user.uid !== targetUid) {
    throw new Error('Non autorizzato ad aggiornare questo profilo');
  }

  // Whitelist: scrive solo i campi realmente editabili.
  const safeUpdates = {};
  for (const field of EDITABLE_CLIENT_FIELDS) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  return withRetry(async () => {
    await updateDoc(doc(db, 'clients', targetUid), {
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  });
};

// Aggiorna email dell'utente (richiede riautenticazione)
const updateUserEmail = async (currentPassword, newEmail) => {
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
const updateUserPassword = async (currentPassword, newPassword) => {
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
const sendPasswordResetEmailToUser = async (email) => {
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
// Best-effort recursive delete of a Storage folder. Failures are swallowed
// (logged) so account deletion proceeds even if some objects are missing —
// M5 §5.2.a allows client-side cleanup for the current low-volume scope.
const deleteStorageFolder = async (folderPath) => {
  try {
    const storage = getStorage();
    const folderRef = ref(storage, folderPath);
    const listResult = await listAll(folderRef);

    const removals = listResult.items.map((itemRef) =>
      deleteObject(itemRef).catch((err) => {
        console.warn(`deleteStorageFolder: failed to delete ${itemRef.fullPath}:`, err?.message || err);
      })
    );
    await Promise.all(removals);

    // Ricorsione sulle sottocartelle (es. posts/{postId} contiene più file).
    const subRemovals = listResult.prefixes.map((prefixRef) =>
      deleteStorageFolder(prefixRef.fullPath)
    );
    await Promise.all(subRemovals);
  } catch (error) {
    console.warn(`deleteStorageFolder: could not enumerate ${folderPath}:`, error?.message || error);
  }
};

// Best-effort recursive delete of a Firestore subcollection (es. `blocked`).
const deleteSubcollection = async (parentPath, subName) => {
  try {
    const snap = await getDocs(collection(db, `${parentPath}/${subName}`));
    const removals = snap.docs.map((d) =>
      deleteDoc(d.ref).catch((err) => {
        console.warn(`deleteSubcollection: failed to delete ${d.ref.path}:`, err?.message || err);
      })
    );
    await Promise.all(removals);
  } catch (error) {
    console.warn(`deleteSubcollection: could not enumerate ${parentPath}/${subName}:`, error?.message || error);
  }
};

// Best-effort: rimuove `uid` da un campo array (es. `likedBy`/`likes`) su tutti
// i documenti di una collection che lo contengono. Additivo e protetto:
// in caso di errore logga e NON propaga, cosi' non interrompe deleteAccount.
// Chunking a 450 op/batch per restare entro il limite Firestore di 500.
const removeUidFromArrayField = async (uid, collectionName, arrayField) => {
  try {
    const snap = await getDocs(
      query(collection(db, collectionName), where(arrayField, 'array-contains', uid))
    );
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      docs.slice(i, i + 450).forEach((d) => {
        batch.update(d.ref, { [arrayField]: arrayRemove(uid) });
      });
      await batch.commit();
    }
  } catch (error) {
    console.warn(`removeUidFromArrayField: ${collectionName}.${arrayField} cleanup non completato:`, error?.message || error);
  }
};

// Cancellazione account end-to-end (M5 §5.2.a, requisito Apple 5.1.1(v)).
// Ordine: Storage media → post del barbiere → subcollezioni utente → doc utente
// → utente Firebase Auth. Throwa 'requires-recent-login' se serve riautenticarsi.
const deleteAccount = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utente non autenticato');
  }

  const uid = user.uid;
  const clientRef = doc(db, 'clients', uid);
  const barberRef = doc(db, 'barbers', uid);
  const clientSnap = await getDoc(clientRef);
  const barberSnap = await getDoc(barberRef);
  const isBarber = barberSnap.exists();
  const isClient = clientSnap.exists();

  console.log('deleteAccount: starting cleanup for', { uid, isBarber, isClient });

  // 1) Media: avatar profilo + (se barbiere) post in Storage.
  await deleteStorageFolder(`profile/${uid}`);
  await deleteStorageFolder(`portfolio/images/${uid}`);
  await deleteStorageFolder(`portfolio/videos/${uid}`);

  // 2) Post del barbiere (collection top-level `posts` con campo barberId).
  if (isBarber) {
    try {
      const postsSnap = await getDocs(
        query(collection(db, 'posts'), where('barberId', '==', uid))
      );
      for (const postDoc of postsSnap.docs) {
        // Storage media del post.
        await deleteStorageFolder(`posts/${postDoc.id}`);
        // Documento post.
        await withRetry(() => deleteDoc(postDoc.ref));
      }
    } catch (error) {
      console.warn('deleteAccount: post cleanup partially failed:', error?.message || error);
    }
  }

  // 3) Subcollezioni dell'utente (es. blocked).
  if (isClient) {
    await deleteSubcollection(`clients/${uid}`, 'blocked');
  }
  if (isBarber) {
    await deleteSubcollection(`barbers/${uid}`, 'blocked');
  }

  // 3-bis) NUOVO (Step 5): rimozione dei like messi dall'utente su contenuti altrui.
  // Additivo e best-effort (gli errori vengono loggati ma non bloccano la cancellazione).
  // I like vivono come array sui documenti (caso A, eliminabile lato client):
  //   - posts/{postId}.likes         (toggle in postService.togglePostLike)
  //   - posts/{postId}.likedBy       (alcune letture in postService usano questo campo)
  //   - portfolioImages/{id}.likedBy (engagementService)
  // Eseguito PRIMA della cancellazione del doc utente e di deleteUser().
  await removeUidFromArrayField(uid, 'posts', 'likes');
  await removeUidFromArrayField(uid, 'posts', 'likedBy');
  await removeUidFromArrayField(uid, 'portfolioImages', 'likedBy');

  // 4) Documento utente.
  if (isClient) {
    await withRetry(() => deleteDoc(clientRef));
  }
  if (isBarber) {
    await withRetry(() => deleteDoc(barberRef));
  }

  // 5) Utente Firebase Auth (può richiedere riautenticazione recente).
  try {
    await deleteUser(user);
  } catch (error) {
    if (error?.code === 'auth/requires-recent-login') {
      // Lo screen gestirà il messaggio: chiediamo di rifare login e ritentare.
      const wrapped = new Error('requires-recent-login');
      wrapped.code = 'auth/requires-recent-login';
      throw wrapped;
    }
    throw error;
  }

  // ---------------------------------------------------------------------------
  // DATI ORFANI RESIDUI (Step 5) - non eliminabili in modo affidabile lato client:
  //   - `reports` con reporterUid == uid: conservati di proposito (moderazione/
  //     audit) e comunque non leggibili/cancellabili dal client (firestore.rules:
  //     reports -> read/update/delete: false).
  //   - Atomicita': questo cleanup non e' transazionale tra Storage/Auth/Firestore;
  //     se i permessi decadono a meta' (token scaduto) parte puo' non completarsi.
  //   - Eventuali commenti/follow/notifiche/cache feed, se introdotti in futuro.
  //
  // SOLUZIONE ROBUSTA (proposta, fuori scope se l'infra serverless non e' attiva):
  // Cloud Function `onUserDelete` con privilegi admin, idempotente, fuori dal
  // percorso critico del client:
  //   exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  //     const uid = user.uid; const db = admin.firestore();
  //     // 1) like residui (collection group, copre array e subcollection)
  //     // 2) reports con reporterUid == uid
  //     // 3) commenti / follow / notifiche
  //     // 4) media Storage residui: admin.storage().bucket().deleteFiles({ prefix })
  //   });
  // ---------------------------------------------------------------------------

  console.log('deleteAccount: completed for', uid);
  return { success: true };
};

export {
  getCurrentUserData, getUserByName, getUserProfileData, updateUserProfile,
  updateClient,
  updateUserEmail,
  updateUserPassword,
  sendPasswordResetEmailToUser,
  deleteAccount,
};



