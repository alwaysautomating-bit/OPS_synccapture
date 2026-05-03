import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../lib/firebaseCollections';
import { firestoreDb } from '../lib/firebase';

export const createDrawPrepPacketDraft = async (input: {
  orgId?: string;
  jobId: string;
  fieldEventIds: string[];
  createdBy?: string;
  notes?: string;
}) => {
  if (!firestoreDb) return null;

  const docRef = await addDoc(collection(firestoreDb, FIRESTORE_COLLECTIONS.drawPrepPackets), {
    orgId: input.orgId ?? null,
    jobId: input.jobId,
    fieldEventIds: input.fieldEventIds,
    status: 'draft',
    notes: input.notes ?? null,
    createdBy: input.createdBy ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

