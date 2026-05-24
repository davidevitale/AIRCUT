import { collection, doc, getDoc, getDocs, query, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

// Ottieni XP dell'utente
const getUserXP = async (userId) => {
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
const updateUserXP = async (userId, xpAmount) => {
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
const checkDailySlot = async (userId) => {
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
const updateDailySlot = async (userId) => {
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
const getXPLeaderboard = async (limit = 10) => {
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
export { getUserXP, updateUserXP, checkDailySlot, updateDailySlot, getXPLeaderboard } from "./authService";


