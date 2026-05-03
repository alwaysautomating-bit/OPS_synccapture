import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../lib/firebaseCollections';
import { firestoreDb } from '../lib/firebase';
import { SourceOfTruthJob, SupabaseJob } from '../types';

const toIsoString = (value: unknown) => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
};

const mapJob = (id: string, data: Record<string, unknown>): SourceOfTruthJob => ({
  id,
  orgId: typeof data.orgId === 'string' ? data.orgId : undefined,
  jobId: typeof data.jobId === 'string' ? data.jobId : id,
  customerName: typeof data.customerName === 'string' ? data.customerName : '',
  status: typeof data.status === 'string' ? data.status : '',
  addressText: typeof data.addressText === 'string' ? data.addressText : undefined,
  latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
  longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
  geofenceRadiusMeters: typeof data.geofenceRadiusMeters === 'number' ? data.geofenceRadiusMeters : undefined,
  active: data.active !== false,
  createdAt: toIsoString(data.createdAt),
  updatedAt: toIsoString(data.updatedAt),
});

export const getJobs = async (): Promise<SupabaseJob[]> => {
  const jobs = await getSourceOfTruthJobs();
  return jobs.map(job => ({
    id: job.id,
    jobId: job.jobId,
    customerName: job.customerName,
    status: job.status,
    createdAt: job.createdAt,
  }));
};

export const getSourceOfTruthJobs = async (orgId?: string): Promise<SourceOfTruthJob[]> => {
  if (!firestoreDb) return [];

  const jobsCollection = collection(firestoreDb, FIRESTORE_COLLECTIONS.jobs);
  const constraints = [where('active', '==', true), orderBy('updatedAt', 'desc')] as const;
  const jobsQuery = orgId
    ? query(jobsCollection, where('orgId', '==', orgId), ...constraints)
    : query(jobsCollection, ...constraints);

  const snapshot = await getDocs(jobsQuery);
  return snapshot.docs.map(jobDoc => mapJob(jobDoc.id, jobDoc.data()));
};

export const upsertSourceOfTruthJob = async (
  job: Omit<SourceOfTruthJob, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }
): Promise<SourceOfTruthJob | null> => {
  if (!firestoreDb) return null;

  const jobRef = doc(firestoreDb, FIRESTORE_COLLECTIONS.jobs, job.id);
  await setDoc(jobRef, {
    orgId: job.orgId ?? null,
    jobId: job.jobId,
    customerName: job.customerName,
    status: job.status,
    addressText: job.addressText ?? null,
    latitude: job.latitude ?? null,
    longitude: job.longitude ?? null,
    geofenceRadiusMeters: job.geofenceRadiusMeters ?? 250,
    active: job.active,
    createdAt: job.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return {
    ...job,
    geofenceRadiusMeters: job.geofenceRadiusMeters ?? 250,
    createdAt: job.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

