import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../lib/firebaseCollections';
import { firestoreDb } from '../lib/firebase';

export const writeAuditLogEntry = async (input: {
  action: string;
  entityType: string;
  entityId: string;
  actor?: string;
  details?: Record<string, unknown>;
}) => {
  if (!firestoreDb) return null;

  const docRef = await addDoc(collection(firestoreDb, FIRESTORE_COLLECTIONS.auditLog), {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actor: input.actor ?? null,
    details: input.details ?? {},
    createdAt: serverTimestamp(),
  });

  return docRef.id;
};

