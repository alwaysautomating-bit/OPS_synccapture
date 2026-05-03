import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { FIRESTORE_COLLECTIONS } from '../lib/firebaseCollections';
import { firestoreDb, firebaseStorage } from '../lib/firebase';
import {
  ConfirmationRequestRecord,
  CreateAttachmentInput,
  CreateFieldEventInput,
  FieldAttachmentRecord,
  FieldEvent,
  JobMatchSuggestionRecord,
} from '../types';

const toIsoString = (value: unknown) => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
};

const mapFieldEvent = (id: string, row: Record<string, unknown>): FieldEvent => ({
  id,
  orgId: typeof row.orgId === 'string' ? row.orgId : undefined,
  jobId: typeof row.jobId === 'string' ? row.jobId : undefined,
  suggestedJobId: typeof row.suggestedJobId === 'string' ? row.suggestedJobId : undefined,
  jobMatchConfidence: typeof row.jobMatchConfidence === 'number' ? row.jobMatchConfidence : undefined,
  distanceToJobMeters: typeof row.distanceToJobMeters === 'number' ? row.distanceToJobMeters : undefined,
  suggested_job_id: typeof row.suggestedJobId === 'string' ? row.suggestedJobId : undefined,
  job_match_confidence: typeof row.jobMatchConfidence === 'number' ? row.jobMatchConfidence : undefined,
  distance_to_job_meters: typeof row.distanceToJobMeters === 'number' ? row.distanceToJobMeters : undefined,
  eventType: row.eventType as FieldEvent['eventType'],
  sourceType: row.sourceType as FieldEvent['sourceType'],
  status: row.status as FieldEvent['status'],
  jobMatchStatus: (row.jobMatchStatus as FieldEvent['jobMatchStatus']) ?? 'pending',
  job_match_status: (row.jobMatchStatus as FieldEvent['jobMatchStatus']) ?? 'pending',
  captureText: typeof row.captureText === 'string' ? row.captureText : undefined,
  transcriptionText: typeof row.transcriptionText === 'string' ? row.transcriptionText : undefined,
  structuredPayload: {
    ...((row.structuredPayload as Record<string, unknown>) ?? {}),
    ...(Array.isArray(row.attachmentMetadata) ? { attachmentMetadata: row.attachmentMetadata } : {}),
  },
  storagePaths: Array.isArray(row.storagePaths) ? row.storagePaths.filter((value): value is string => typeof value === 'string') : [],
  fileUrls: Array.isArray(row.fileUrls) ? row.fileUrls.filter((value): value is string => typeof value === 'string') : [],
  gpsLatitude: typeof row.gpsLatitude === 'number' ? row.gpsLatitude : undefined,
  gpsLongitude: typeof row.gpsLongitude === 'number' ? row.gpsLongitude : undefined,
  gpsAccuracyMeters: typeof row.gpsAccuracyMeters === 'number' ? row.gpsAccuracyMeters : undefined,
  captureAddressText: typeof row.captureAddressText === 'string' ? row.captureAddressText : undefined,
  capturedAt: toIsoString(row.capturedAt),
  capturedBy: typeof row.capturedBy === 'string' ? row.capturedBy : undefined,
  assignedToUser: typeof row.assignedToUser === 'string' ? row.assignedToUser : undefined,
  signatureName: typeof row.signatureName === 'string' ? row.signatureName : undefined,
  latestJobMatchSuggestionId: typeof row.latestJobMatchSuggestionId === 'string' ? row.latestJobMatchSuggestionId : undefined,
  latestConfirmationRequestId: typeof row.latestConfirmationRequestId === 'string' ? row.latestConfirmationRequestId : undefined,
  createdAt: toIsoString(row.createdAt),
  updatedAt: toIsoString(row.updatedAt),
});

const mapQueueRecord = (id: string, row: Record<string, unknown>): ConfirmationRequestRecord => ({
  id,
  fieldEventId: typeof row.fieldEventId === 'string' ? row.fieldEventId : '',
  requestType: 'assign_job',
  status: (typeof row.status === 'string' ? row.status : 'open') as ConfirmationRequestRecord['status'],
  requestedUser: typeof row.requestedUser === 'string' ? row.requestedUser : 'unassigned',
  suggestedJobId: typeof row.suggestedJobId === 'string' ? row.suggestedJobId : undefined,
  message: typeof row.message === 'string' ? row.message : undefined,
  respondedAt: typeof row.respondedAt === 'string' ? row.respondedAt : undefined,
  responseNotes: typeof row.responseNotes === 'string' ? row.responseNotes : undefined,
  createdAt: toIsoString(row.createdAt),
  updatedAt: toIsoString(row.updatedAt),
});

const writeAuditLog = async (action: string, entityType: string, entityId: string, details: Record<string, unknown>, actor?: string) => {
  if (!firestoreDb) return;

  await addDoc(collection(firestoreDb, FIRESTORE_COLLECTIONS.auditLog), {
    action,
    entityType,
    entityId,
    actor: actor ?? null,
    details,
    createdAt: serverTimestamp(),
  });
};

export const createFieldEvent = async (input: CreateFieldEventInput): Promise<FieldEvent | null> => {
  if (!firestoreDb) return null;

  const payload = {
    orgId: input.orgId ?? null,
    jobId: input.jobId ?? null,
    suggestedJobId: null,
    jobMatchConfidence: null,
    distanceToJobMeters: null,
    eventType: input.eventType,
    sourceType: input.sourceType,
    status: 'captured',
    jobMatchStatus: input.jobId ? 'resolved' : 'pending',
    captureText: input.captureText ?? null,
    transcriptionText: input.transcriptionText ?? null,
    structuredPayload: input.structuredPayload ?? {},
    storagePaths: [],
    fileUrls: [],
    gpsLatitude: input.gpsLatitude ?? null,
    gpsLongitude: input.gpsLongitude ?? null,
    gpsAccuracyMeters: input.gpsAccuracyMeters ?? null,
    captureAddressText: input.captureAddressText ?? null,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    capturedBy: input.capturedBy ?? null,
    assignedToUser: input.jobId ? null : input.capturedBy ?? null,
    signatureName: input.signatureName ?? null,
    latestJobMatchSuggestionId: null,
    latestConfirmationRequestId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(firestoreDb, FIRESTORE_COLLECTIONS.fieldEvents), payload);
  await writeAuditLog('field_event_created', 'fieldEvent', docRef.id, payload, input.capturedBy);
  return mapFieldEvent(docRef.id, payload);
};

export const getFieldEventById = async (fieldEventId: string): Promise<FieldEvent | null> => {
  if (!firestoreDb || !fieldEventId) return null;

  const snapshot = await getDoc(doc(firestoreDb, FIRESTORE_COLLECTIONS.fieldEvents, fieldEventId));
  if (!snapshot.exists()) return null;
  return mapFieldEvent(snapshot.id, snapshot.data() as Record<string, unknown>);
};

export const getFieldEventsForJob = async (jobId: string): Promise<FieldEvent[]> => {
  if (!firestoreDb || !jobId) return [];

  const eventsQuery = query(
    collection(firestoreDb, FIRESTORE_COLLECTIONS.fieldEvents),
    where('jobId', '==', jobId),
    orderBy('capturedAt', 'desc')
  );
  const snapshot = await getDocs(eventsQuery);
  return snapshot.docs.map(eventDoc => mapFieldEvent(eventDoc.id, eventDoc.data() as Record<string, unknown>));
};

export const getUnassignedFieldEventsForUser = async (userKey: string): Promise<FieldEvent[]> => {
  if (!firestoreDb || !userKey) return [];

  const eventsQuery = query(
    collection(firestoreDb, FIRESTORE_COLLECTIONS.fieldEvents),
    where('assignedToUser', '==', userKey),
    where('jobMatchStatus', 'in', ['pending', 'needs_assignment']),
    orderBy('capturedAt', 'desc')
  );
  const snapshot = await getDocs(eventsQuery);
  return snapshot.docs.map(eventDoc => mapFieldEvent(eventDoc.id, eventDoc.data() as Record<string, unknown>));
};

export const createAttachmentRecord = async (input: CreateAttachmentInput): Promise<FieldAttachmentRecord | null> => {
  if (!firestoreDb) return null;

  const metadata: FieldAttachmentRecord = {
    id: `attachment_${Date.now()}`,
    fieldEventId: input.fieldEventId,
    jobId: input.jobId,
    attachmentType: input.attachmentType,
    documentType: input.documentType,
    storageBucket: input.storageBucket,
    storagePath: input.storagePath,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    checksumSha256: input.checksumSha256,
    metadata: input.metadata ?? {},
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };

  const fieldEventRef = doc(firestoreDb, FIRESTORE_COLLECTIONS.fieldEvents, input.fieldEventId);
  const updatePayload: Record<string, unknown> = {
    attachmentMetadata: arrayUnion(metadata),
    updatedAt: serverTimestamp(),
  };

  if (input.storagePath) {
    updatePayload.storagePaths = arrayUnion(input.storagePath);
  }

  if (input.metadata?.fileUrl) {
    updatePayload.fileUrls = arrayUnion(String(input.metadata.fileUrl));
  }

  await updateDoc(fieldEventRef, updatePayload);
  await writeAuditLog('field_event_attachment_added', 'fieldEvent', input.fieldEventId, metadata as unknown as Record<string, unknown>, input.createdBy);
  return metadata;
};

export const uploadFieldEventFile = async (
  fieldEventId: string,
  file: Blob,
  pathPrefix = 'field-events'
): Promise<{ storagePath: string; fileUrl: string } | null> => {
  if (!firebaseStorage) return null;

  const storagePath = `${pathPrefix}/${fieldEventId}/${Date.now()}`;
  const storageRef = ref(firebaseStorage, storagePath);
  await uploadBytes(storageRef, file);
  const fileUrl = await getDownloadURL(storageRef);
  return { storagePath, fileUrl };
};

export const getAttachmentsForFieldEvent = async (fieldEventId: string): Promise<FieldAttachmentRecord[]> => {
  const fieldEvent = await getFieldEventById(fieldEventId);
  const metadata = fieldEvent?.structuredPayload?.attachmentMetadata;
  return Array.isArray(metadata) ? metadata as FieldAttachmentRecord[] : [];
};

export const getJobMatchSuggestionsForFieldEvent = async (fieldEventId: string): Promise<JobMatchSuggestionRecord[]> => {
  if (!firestoreDb || !fieldEventId) return [];

  const queueQuery = query(
    collection(firestoreDb, FIRESTORE_COLLECTIONS.jobMatchQueue),
    where('fieldEventId', '==', fieldEventId),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  const snapshot = await getDocs(queueQuery);
  return snapshot.docs.map(queueDoc => {
    const row = queueDoc.data() as Record<string, unknown>;
    return {
      id: queueDoc.id,
      fieldEventId,
      suggestedJobId: typeof row.suggestedJobId === 'string' ? row.suggestedJobId : undefined,
      strategy: 'gps_proximity',
      confidence: typeof row.jobMatchConfidence === 'number' ? row.jobMatchConfidence : 0,
      distanceMeters: typeof row.distanceToJobMeters === 'number' ? row.distanceToJobMeters : undefined,
      addressMatch: false,
      gpsMatch: true,
      rationale: typeof row.message === 'string' ? row.message : undefined,
      resolved: row.status === 'confirmed',
      resolution: row.status === 'confirmed' ? 'accepted' : 'pending',
      createdAt: toIsoString(row.createdAt),
    };
  });
};

export const getConfirmationRequestsForUser = async (userKey: string): Promise<ConfirmationRequestRecord[]> => {
  if (!firestoreDb || !userKey) return [];

  const queueQuery = query(
    collection(firestoreDb, FIRESTORE_COLLECTIONS.jobMatchQueue),
    where('requestedUser', '==', userKey),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(queueQuery);
  return snapshot.docs.map(queueDoc => mapQueueRecord(queueDoc.id, queueDoc.data() as Record<string, unknown>));
};

export const confirmFieldEventAssignment = async (
  confirmationRequestId: string,
  actor: string,
  jobId?: string,
  responseNotes?: string
): Promise<string | null> => {
  if (!firestoreDb) return null;

  const queueRef = doc(firestoreDb, FIRESTORE_COLLECTIONS.jobMatchQueue, confirmationRequestId);
  const queueSnapshot = await getDoc(queueRef);
  if (!queueSnapshot.exists()) return null;

  const queueData = queueSnapshot.data() as Record<string, unknown>;
  const fieldEventId = String(queueData.fieldEventId ?? '');
  const resolvedJobId = jobId ?? (typeof queueData.suggestedJobId === 'string' ? queueData.suggestedJobId : null);
  if (!fieldEventId || !resolvedJobId) return null;

  await updateDoc(doc(firestoreDb, FIRESTORE_COLLECTIONS.fieldEvents, fieldEventId), {
    jobId: resolvedJobId,
    suggestedJobId: resolvedJobId,
    jobMatchStatus: 'resolved',
    status: 'confirmed',
    assignedToUser: null,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(queueRef, {
    status: 'confirmed',
    respondedAt: new Date().toISOString(),
    responseNotes: responseNotes ?? null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog('field_event_assignment_confirmed', 'fieldEvent', fieldEventId, {
    confirmationRequestId,
    jobId: resolvedJobId,
    responseNotes: responseNotes ?? null,
  }, actor);

  return resolvedJobId;
};

export const rejectFieldEventAssignment = async (
  confirmationRequestId: string,
  actor: string,
  responseNotes?: string
): Promise<string | null> => {
  if (!firestoreDb) return null;

  const queueRef = doc(firestoreDb, FIRESTORE_COLLECTIONS.jobMatchQueue, confirmationRequestId);
  const queueSnapshot = await getDoc(queueRef);
  if (!queueSnapshot.exists()) return null;

  const queueData = queueSnapshot.data() as Record<string, unknown>;
  const fieldEventId = String(queueData.fieldEventId ?? '');
  if (!fieldEventId) return null;

  await updateDoc(doc(firestoreDb, FIRESTORE_COLLECTIONS.fieldEvents, fieldEventId), {
    jobMatchStatus: 'reassigned',
    status: 'needs_assignment',
    assignedToUser: queueData.requestedUser ?? actor,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(queueRef, {
    status: 'rejected',
    respondedAt: new Date().toISOString(),
    responseNotes: responseNotes ?? null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog('field_event_assignment_rejected', 'fieldEvent', fieldEventId, {
    confirmationRequestId,
    responseNotes: responseNotes ?? null,
  }, actor);

  return null;
};

export const createJobMatchQueueRecord = async (input: {
  fieldEventId: string;
  orgId?: string;
  requestedUser?: string;
  suggestedJobId?: string;
  jobMatchConfidence?: number;
  distanceToJobMeters?: number;
  message: string;
}): Promise<string | null> => {
  if (!firestoreDb) return null;

  const docRef = await addDoc(collection(firestoreDb, FIRESTORE_COLLECTIONS.jobMatchQueue), {
    fieldEventId: input.fieldEventId,
    orgId: input.orgId ?? null,
    requestedUser: input.requestedUser ?? 'unassigned',
    suggestedJobId: input.suggestedJobId ?? null,
    jobMatchConfidence: input.jobMatchConfidence ?? null,
    distanceToJobMeters: input.distanceToJobMeters ?? null,
    message: input.message,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog('job_match_queue_created', 'jobMatchQueue', docRef.id, input);
  return docRef.id;
};

export const updateFieldEventMatchResult = async (fieldEventId: string, updates: {
  jobId?: string | null;
  suggestedJobId?: string | null;
  jobMatchConfidence?: number | null;
  distanceToJobMeters?: number | null;
  jobMatchStatus: FieldEvent['jobMatchStatus'];
  status: FieldEvent['status'];
  assignedToUser?: string | null;
  latestConfirmationRequestId?: string | null;
}): Promise<void> => {
  if (!firestoreDb) return;

  await updateDoc(doc(firestoreDb, FIRESTORE_COLLECTIONS.fieldEvents, fieldEventId), {
    jobId: updates.jobId ?? null,
    suggestedJobId: updates.suggestedJobId ?? null,
    jobMatchConfidence: updates.jobMatchConfidence ?? null,
    distanceToJobMeters: updates.distanceToJobMeters ?? null,
    jobMatchStatus: updates.jobMatchStatus,
    status: updates.status,
    assignedToUser: updates.assignedToUser ?? null,
    latestConfirmationRequestId: updates.latestConfirmationRequestId ?? null,
    updatedAt: serverTimestamp(),
  });
};
