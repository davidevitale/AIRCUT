import { collection, doc, getDoc, getDocs, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

// Sorgente UNICA della foto profilo barbiere (Task 1 — sincronizzazione feed/like).
// Preferisce sempre la versione leggera thumbnail.webp; fallback graduale verso
// gli altri campi disponibili. Ritorna null se nessuna immagine è presente
// (i componenti mostreranno il placeholder con l'iniziale).
export const resolveBarberAvatar = (source = {}) => {
  if (!source || typeof source !== "object") return null;
  const candidate =
    source.profileImageThumbnail ||
    source.barberProfileImage ||
    source.avatar ||
    source.profileImage ||
    null;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
};

// Ottieni dati completi parrucchiere per profilo
const getBarberProfileData = async (barberName) => {
  try {
    console.log('getBarberProfileData: Recupero dati profilo per:', barberName);
    const normalizedInput = String(barberName || '').trim().toLowerCase();

    if (!normalizedInput) {
      console.log('getBarberProfileData: Nome barbiere vuoto');
      return null;
    }

    // Recupera e confronta su più campi nominativi usati nel progetto
    const barbersSnapshot = await getDocs(collection(db, 'barbers'));

    if (barbersSnapshot.empty) {
      console.log('getBarberProfileData: Parrucchiere non trovato');
      return null;
    }

    const barberDoc = barbersSnapshot.docs.find((docSnap) => {
      const data = docSnap.data() || {};
      const candidates = [
        data.salonName,
        data.salonName,
        data.barberName,
        data.nickName,
        data.firstName,
      ]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());

      return candidates.includes(normalizedInput);
    });

    if (!barberDoc) {
      console.log('getBarberProfileData: Parrucchiere non trovato');
      return null;
    }

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

// Ottieni il documento barbiere per uid (= doc id). Identità canonica M4 §2.2.
const getBarberProfileByUid = async (uid) => {
  try {
    if (!uid) return null;
    const barberRef = doc(db, 'barbers', uid);
    const snap = await getDoc(barberRef);
    if (!snap.exists()) {
      console.log('getBarberProfileByUid: barbiere non trovato per uid:', uid);
      return null;
    }
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('Errore recupero barbiere per uid:', error);
    return null;
  }
};

// =================== GESTIONE PREZZI PARRUCCHIERE ===================

// Ottieni i prezzi di un parrucchiere
const getBarberPrices = async (barberId) => {
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
const updateBarberPrices = async (barberId, prezziServizi) => {
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
// Aggiorna portfolio parrucchiere
const updateBarberPortfolio = async (userId, portfolioData) => {
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

// Debug function - get all barbers raw data
const getAllBarbersRawData = async () => {
  try {
    console.log('getAllBarbersRawData: Starting to fetch all barber data...');
    const barbersRef = collection(db, 'barbers');
    const snapshot = await getDocs(barbersRef);

    console.log('getAllBarbersRawData: Found barbers count:', snapshot.size);

    const barbersData = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`getAllBarbersRawData: Barber ${doc.id}:`, {
        salonName: data.salonName,
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
export { getBarberProfileData, getBarberProfileByUid, getBarberPrices, updateBarberPrices, updateBarberPortfolio, getAllBarbersRawData, getBarberProfilesMap };

// Ritorna una mappa { barberId: { ...barberData } } per arricchire i post
// (es. con l'avatar) senza N query separate. Usato dalla LikeScreen (Task 1).
// (flush)
async function getBarberProfilesMap() {
  try {
    const snapshot = await getDocs(collection(db, "barbers"));
    const map = {};
    snapshot.docs.forEach((d) => {
      map[d.id] = d.data();
    });
    return map;
  } catch (error) {
    console.error("getBarberProfilesMap: errore:", error);
    return {};
  }
}


