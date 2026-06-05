import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { withRetry } from './authService';

// M5 §5.1.c — Sistema di blocco utente.
// Scelta storage: array `blockedUsers: [uid]` sul documento utente
// (clients/{uid} o barbers/{uid}). Motivazione (vedi brief M5):
//   - filtraggio lato client immediato senza query extra;
//   - dimensione attesa (qualche decina) ben sotto il limite di 1MB del doc;
//   - più semplice da leggere/idratare in una singola read del doc utente.
// Le regole Firestore sui doc utente già limitano write all'owner.

const cache = {
  uid: null,
  set: new Set(),
  loaded: false,
  unsubscribe: null,
};

const getUserCollectionForUid = async (uid) => {
  if (!uid) return null;
  // Sceglie 'clients' o 'barbers' in base a dove esiste il documento utente.
  // Una single read se non sappiamo il ruolo (caso edge: chiamata fuori da AuthContext).
  const clientRef = doc(db, 'clients', uid);
  const barberRef = doc(db, 'barbers', uid);
  const [clientSnap, barberSnap] = await Promise.all([
    getDoc(clientRef),
    getDoc(barberRef),
  ]);
  if (barberSnap.exists()) return { ref: barberRef, role: 'barber' };
  if (clientSnap.exists()) return { ref: clientRef, role: 'client' };
  return null;
};

// Inserisce uid nella blocklist del current user.
export const blockUser = async (targetUid) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Utente non autenticato');
  if (!targetUid) throw new Error('targetUid mancante');
  if (targetUid === user.uid) throw new Error('Non puoi bloccare te stesso');

  const userRef = await getUserCollectionForUid(user.uid);
  if (!userRef) throw new Error('Documento utente non trovato');

  await withRetry(() =>
    updateDoc(userRef.ref, { blockedUsers: arrayUnion(targetUid) })
  );

  // Aggiorna cache locale per filtraggio immediato.
  cache.set.add(targetUid);
  return { success: true };
};

// Rimuove uid dalla blocklist.
export const unblockUser = async (targetUid) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Utente non autenticato');
  if (!targetUid) throw new Error('targetUid mancante');

  const userRef = await getUserCollectionForUid(user.uid);
  if (!userRef) throw new Error('Documento utente non trovato');

  await withRetry(() =>
    updateDoc(userRef.ref, { blockedUsers: arrayRemove(targetUid) })
  );

  cache.set.delete(targetUid);
  return { success: true };
};

// Ritorna Set<string> degli uid bloccati. Usa cache se già idratata
// (per evitare round-trip su ogni filtraggio del feed).
export const getBlockedUids = async ({ force = false } = {}) => {
  const user = auth.currentUser;
  if (!user) return new Set();

  if (!force && cache.loaded && cache.uid === user.uid) {
    return new Set(cache.set);
  }

  const userRef = await getUserCollectionForUid(user.uid);
  if (!userRef) {
    cache.uid = user.uid;
    cache.set = new Set();
    cache.loaded = true;
    return new Set();
  }

  const snap = await getDoc(userRef.ref);
  const data = snap.data() || {};
  const list = Array.isArray(data.blockedUsers) ? data.blockedUsers : [];

  cache.uid = user.uid;
  cache.set = new Set(list);
  cache.loaded = true;
  return new Set(cache.set);
};

// Listener realtime sulla blocklist. Restituisce una funzione di cleanup.
export const subscribeBlockedUids = (callback) => {
  const user = auth.currentUser;
  if (!user) {
    callback(new Set());
    return () => {};
  }

  let cancelled = false;
  let unsub = () => {};

  (async () => {
    const userRef = await getUserCollectionForUid(user.uid);
    if (!userRef || cancelled) return;

    unsub = onSnapshot(userRef.ref, (snap) => {
      const data = snap.data() || {};
      const list = Array.isArray(data.blockedUsers) ? data.blockedUsers : [];
      cache.uid = user.uid;
      cache.set = new Set(list);
      cache.loaded = true;
      callback(new Set(cache.set));
    });
  })();

  return () => {
    cancelled = true;
    try { unsub(); } catch {}
  };
};

// Sincronizzazione locale: chiamata dopo un blockUser per aggiornare la cache
// senza attendere il listener (alcuni screen non lo usano).
export const markBlockedLocally = (targetUid) => {
  cache.set.add(targetUid);
};

export const markUnblockedLocally = (targetUid) => {
  cache.set.delete(targetUid);
};

// Resetta la cache (es. al logout / cambio account).
export const resetBlockCache = () => {
  cache.uid = null;
  cache.set = new Set();
  cache.loaded = false;
};

// Helper di filtraggio: rimuove i post degli autori bloccati.
export const filterPostsByBlocked = (posts, blockedSet) => {
  if (!blockedSet || blockedSet.size === 0) return posts;
  return posts.filter((p) => {
    const authorUid = p?.barberId || p?.authorUid || p?.uid;
    return !blockedSet.has(authorUid);
  });
};
