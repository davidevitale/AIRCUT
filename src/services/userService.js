import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updateEmail, updatePassword } from "firebase/auth";

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
export {
  getCurrentUserData, getUserByName, getUserProfileData, updateUserProfile,
  updateUserEmail,
  updateUserPassword,
  sendPasswordResetEmailToUser,
};



