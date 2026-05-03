import {
  createJobMatchQueueRecord,
  getFieldEventById,
  updateFieldEventMatchResult,
} from '../../../../data/fieldEvents';
import { getSourceOfTruthJobs } from '../../../../data/jobs';
import { findNearestJobs } from '../../../../lib/jobMatcher';
import { FieldEvent } from '../../../../types';

type MatchRequestBody = {
  fieldEventId?: string;
  fieldEvent?: Pick<
    FieldEvent,
    'id' | 'orgId' | 'capturedBy' | 'gpsLatitude' | 'gpsLongitude' | 'gpsAccuracyMeters' | 'capturedAt'
  >;
};

const HIGH_CONFIDENCE_THRESHOLD = 0.85;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });

export async function POST(request: Request): Promise<Response> {
  let body: MatchRequestBody;
  try {
    body = (await request.json()) as MatchRequestBody;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const loadedFieldEvent = body.fieldEventId ? await getFieldEventById(body.fieldEventId) : null;
  const fieldEvent = loadedFieldEvent ?? body.fieldEvent;

  if (!fieldEvent?.id) {
    return json({ error: 'fieldEventId or fieldEvent.id is required.' }, 400);
  }

  if (fieldEvent.gpsLatitude === undefined || fieldEvent.gpsLongitude === undefined) {
    if (loadedFieldEvent) {
      await updateFieldEventMatchResult(fieldEvent.id, {
        jobId: loadedFieldEvent.jobId ?? null,
        suggestedJobId: null,
        jobMatchConfidence: null,
        distanceToJobMeters: null,
        jobMatchStatus: 'needs_assignment',
        status: 'needs_assignment',
        assignedToUser: loadedFieldEvent.capturedBy ?? 'unassigned',
      });
    }

    return json({
      fieldEventId: fieldEvent.id,
      suggestedJobId: null,
      jobMatchConfidence: null,
      distanceToJobMeters: null,
      jobMatchStatus: 'needs_assignment',
      matches: [],
      reason: 'GPS coordinates are required for proximity matching.',
    });
  }

  const jobs = await getSourceOfTruthJobs(fieldEvent.orgId);
  const matches = findNearestJobs(fieldEvent, jobs);
  const topMatch = matches[0];
  const isHighConfidence = Boolean(topMatch && topMatch.confidence >= HIGH_CONFIDENCE_THRESHOLD);

  let jobMatchQueueId: string | null = null;
  if (loadedFieldEvent) {
    if (isHighConfidence && topMatch) {
      await updateFieldEventMatchResult(fieldEvent.id, {
        jobId: topMatch.jobId,
        suggestedJobId: topMatch.jobId,
        jobMatchConfidence: topMatch.confidence,
        distanceToJobMeters: topMatch.distanceMeters ?? null,
        jobMatchStatus: 'resolved',
        status: 'matched',
        assignedToUser: null,
      });
    } else {
      jobMatchQueueId = await createJobMatchQueueRecord({
        fieldEventId: fieldEvent.id,
        orgId: fieldEvent.orgId,
        requestedUser: fieldEvent.capturedBy,
        suggestedJobId: topMatch?.jobId,
        jobMatchConfidence: topMatch?.confidence,
        distanceToJobMeters: topMatch?.distanceMeters,
        message: topMatch
          ? 'Low-confidence GPS match. Confirm or assign job before downstream use.'
          : 'No GPS match found. Assign job before downstream use.',
      });

      await updateFieldEventMatchResult(fieldEvent.id, {
        jobId: null,
        suggestedJobId: topMatch?.jobId ?? null,
        jobMatchConfidence: topMatch?.confidence ?? null,
        distanceToJobMeters: topMatch?.distanceMeters ?? null,
        jobMatchStatus: 'needs_assignment',
        status: 'needs_assignment',
        assignedToUser: fieldEvent.capturedBy ?? 'unassigned',
        latestConfirmationRequestId: jobMatchQueueId,
      });
    }
  }

  return json({
    fieldEventId: fieldEvent.id,
    suggestedJobId: isHighConfidence ? topMatch?.jobId ?? null : null,
    jobMatchConfidence: topMatch?.confidence ?? null,
    distanceToJobMeters: topMatch?.distanceMeters ?? null,
    jobMatchStatus: isHighConfidence ? 'resolved' : 'needs_assignment',
    jobMatchQueueId,
    matches,
  });
}

