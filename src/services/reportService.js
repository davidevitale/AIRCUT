import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { withRetry } from './authService';

// M5 §5.1.a/b — Reporting system.
// Crea un documento in collezione `reports` con status: 'pending'.
// Le regole Firestore consentono solo `create` da parte di utenti autenticati,
// con reporterUid == request.auth.uid (vedi firestore.rules).
//
// Schema documento `reports/{autoId}`:
//   reporterUid:      string         uid dell'utente che segnala
//   targetType:       'post' | 'profile'
//   targetId:         string         postId o uid del barbiere
//   targetOwnerUid:   string         uid proprietario del contenuto
//   reason:           string         enum: 'spam' | 'inappropriate' | 'harassment' | 'other'
//   status:           'pending'      review manuale (SLA 24h)
//   createdAt:        serverTimestamp()
//   reviewedAt:       null

export const REPORT_REASONS = ['spam', 'inappropriate', 'harassment', 'other'];

export const submitReport = async ({ targetType, targetId, targetOwnerUid, reason }) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utente non autenticato');
  }

  if (!targetType || !targetId || !targetOwnerUid) {
    throw new Error('Parametri report mancanti');
  }

  if (!REPORT_REASONS.includes(reason)) {
    throw new Error('Motivo report non valido');
  }

  // Anti-self-report: impedisce di segnalare i propri contenuti.
  if (targetOwnerUid === user.uid) {
    throw new Error('Non puoi segnalare i tuoi contenuti');
  }

  const payload = {
    reporterUid: user.uid,
    targetType,
    targetId,
    targetOwnerUid,
    reason,
    status: 'pending',
    createdAt: serverTimestamp(),
    reviewedAt: null,
  };

  await withRetry(() => addDoc(collection(db, 'reports'), payload));
  return { success: true };
};
