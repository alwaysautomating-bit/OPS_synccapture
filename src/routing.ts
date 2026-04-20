import {
  CaptureInput,
  JobMatch,
  JobMatchingCandidate,
  NormalizedCapture,
  OpsQueueItem,
  OpsQueueName,
  PrimaryAction,
  RoutingDecision,
  SuggestedAction,
} from './types';

const ACTION_TO_QUEUE: Record<PrimaryAction, OpsQueueName> = {
  generate_proposal: 'proposals',
  log_to_job: 'work_orders',
  notify_office: 'office_updates',
  escalate_emergency: 'emergencies',
};

const ACTION_LABELS: Record<PrimaryAction, string> = {
  generate_proposal: 'Generate Proposal',
  log_to_job: 'Log to Job',
  notify_office: 'Notify Office',
  escalate_emergency: 'Escalate Emergency',
};

const EMERGENCY_TERMS = [
  'sparking',
  'spark',
  'fire',
  'smoke',
  'gas smell',
  'carbon monoxide',
  'co alarm',
  'flooding',
  'electrical burning',
  'call office now',
  'call now',
];

const OFFICE_REVIEW_TERMS = [
  'office to review',
  'office review',
  'before i proceed',
  'need approval',
  'need office',
  'review this',
  'not sure',
  'unsure',
  'ambiguous',
  'customer wants office',
];

const NOTE_TERMS = [
  'left note',
  'note with findings',
  'documented',
  'logged',
  'customer notified',
  'findings',
  'follow up note',
];

const WORK_DONE_TERMS = [
  'replaced',
  'installed',
  'fixed',
  'completed',
  'cleaned',
  'tightened',
  'reset',
  'tested',
];

const PROPOSAL_TERMS = [
  'needs replacement',
  'need to replace',
  'recommend',
  'quote',
  'proposal',
  'estimate',
  'customer wants price',
  'return with',
];

const ITEM_TERMS = ['capacitor', 'contactor', 'water heater', 'drain', 'toilet', 'filter', 'coil', 'disposal'];

const normalizeWhitespace = (text: string) => text.trim().replace(/\s+/g, ' ');

const includesAny = (text: string, terms: string[]) => terms.some(term => text.includes(term));

const clampConfidence = (value: number) => Math.max(0.1, Math.min(0.99, Number(value.toFixed(2))));

const buildSuggestedAction = (
  action: PrimaryAction,
  confidence: number,
  reason: string,
  primary = false
): SuggestedAction => ({
  action,
  label: ACTION_LABELS[action],
  queue: ACTION_TO_QUEUE[action],
  confidence: clampConfidence(confidence),
  reason,
  primary,
});

export const normalizeCapture = (input: CaptureInput): NormalizedCapture => {
  const rawText = normalizeWhitespace(input.text);
  const lowerText = rawText.toLowerCase();
  const explicitWorkOrderMatch = lowerText.match(/\b(?:wo|w\/o|work\s*order|job)\s*[-#:]*\s*([a-z0-9-]{3,})\b/i);
  const isEmergency = includesAny(lowerText, EMERGENCY_TERMS);
  const urgency = lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('today')
    ? 'urgent'
    : 'default';

  const intentHints = [
    includesAny(lowerText, OFFICE_REVIEW_TERMS) ? 'office_review' : '',
    includesAny(lowerText, NOTE_TERMS) ? 'note' : '',
    includesAny(lowerText, WORK_DONE_TERMS) ? 'work_done' : '',
    includesAny(lowerText, PROPOSAL_TERMS) ? 'proposal' : '',
    isEmergency ? 'emergency' : '',
  ].filter(Boolean);

  const extractedItems = ITEM_TERMS.filter(term => lowerText.includes(term));
  const confidence = clampConfidence(
    0.35 +
    (intentHints.length * 0.14) +
    (extractedItems.length > 0 ? 0.12 : 0) +
    (explicitWorkOrderMatch ? 0.12 : 0)
  );

  return {
    rawText,
    lowerText,
    sourceInputType: input.inputType,
    presence: input.presence,
    explicitWorkOrderId: input.currentWorkOrderId ?? explicitWorkOrderMatch?.[1]?.toUpperCase(),
    customerName: input.customer?.name,
    address: input.customer?.address,
    urgency,
    isEmergency,
    confidence,
    intentHints,
    extractedItems,
  };
};

export const detectSuggestedActions = (normalizedCapture: NormalizedCapture): SuggestedAction[] => {
  const suggestions: SuggestedAction[] = [];
  const { lowerText, confidence, isEmergency, intentHints } = normalizedCapture;

  if (isEmergency) {
    suggestions.push(buildSuggestedAction('escalate_emergency', 0.99, 'Emergency language overrides normal routing.', true));
    suggestions.push(buildSuggestedAction('notify_office', 0.92, 'Office should be notified immediately as part of emergency handling.'));
    return suggestions;
  }

  if (intentHints.includes('office_review') || confidence < 0.5) {
    suggestions.push(buildSuggestedAction('notify_office', Math.max(confidence, 0.72), 'Capture asks for office review or has low routing confidence.', true));
  }

  if (intentHints.includes('note')) {
    suggestions.push(buildSuggestedAction('log_to_job', 0.88, 'Note/finding language should be appended to the matched job.', suggestions.length === 0));
  }

  if (intentHints.includes('work_done')) {
    const hasExistingJobContext = Boolean(normalizedCapture.explicitWorkOrderId || normalizedCapture.customerName || normalizedCapture.address);
    suggestions.push(buildSuggestedAction(
      hasExistingJobContext ? 'log_to_job' : 'generate_proposal',
      hasExistingJobContext ? 0.84 : 0.76,
      hasExistingJobContext
        ? 'Completed-work language with job context should log directly to the job.'
        : 'Completed-work language without a clear job still needs office pricing/review.',
      suggestions.length === 0
    ));
  }

  if (intentHints.includes('proposal') || lowerText.includes('capacitor')) {
    const alreadyHasPrimary = suggestions.some(suggestion => suggestion.primary);
    suggestions.push(buildSuggestedAction(
      'generate_proposal',
      lowerText.includes('capacitor') ? 0.82 : 0.78,
      lowerText.includes('capacitor')
        ? 'Capacitor captures commonly need office-side proposal/pricing unless clearly attached to a work order.'
        : 'Proposal or estimate language belongs in the proposal queue.',
      !alreadyHasPrimary
    ));
  }

  if (suggestions.length === 0) {
    suggestions.push(buildSuggestedAction('notify_office', 0.62, 'Ambiguous capture falls back to office triage.', true));
  }

  return suggestions.sort((a, b) => Number(b.primary) - Number(a.primary) || b.confidence - a.confidence);
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceInMeters = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const matchJob = (
  context: {
    normalizedCapture: NormalizedCapture;
    candidates: JobMatchingCandidate[];
  }
): JobMatch | undefined => {
  const { normalizedCapture, candidates } = context;

  if (normalizedCapture.explicitWorkOrderId) {
    const explicitId = normalizedCapture.explicitWorkOrderId.toLowerCase();
    const explicitMatch = candidates.find(candidate =>
      candidate.id.toLowerCase() === explicitId ||
      candidate.workOrderId?.toLowerCase() === explicitId ||
      candidate.workOrderId?.toLowerCase().endsWith(explicitId)
    );

    if (explicitMatch) {
      return {
        jobId: explicitMatch.id,
        workOrderId: explicitMatch.workOrderId,
        customerId: explicitMatch.customerId,
        customerName: explicitMatch.customerName,
        address: explicitMatch.address,
        matchType: 'explicit_work_order',
        confidence: 0.99,
        source: 'Detected work order ID in capture text.',
      };
    }
  }

  const normalizedCustomer = normalizedCapture.customerName?.toLowerCase();
  const normalizedAddress = normalizedCapture.address?.toLowerCase();
  const customerMatch = candidates.find(candidate => {
    const candidateName = candidate.customerName?.toLowerCase();
    const candidateAddress = candidate.address?.toLowerCase();
    return Boolean(
      (normalizedCustomer && candidateName && candidateName === normalizedCustomer) ||
      (normalizedAddress && candidateAddress && candidateAddress === normalizedAddress)
    );
  });

  if (customerMatch) {
    return {
      jobId: customerMatch.id,
      workOrderId: customerMatch.workOrderId,
      customerId: customerMatch.customerId,
      customerName: customerMatch.customerName,
      address: customerMatch.address,
      matchType: 'customer_address',
      confidence: 0.88,
      source: 'Matched current customer/address.',
    };
  }

  if (normalizedCapture.presence.location) {
    const locationMatches = candidates
      .filter(candidate => candidate.location)
      .map(candidate => ({
        candidate,
        distance: distanceInMeters(normalizedCapture.presence.location!, candidate.location!),
      }))
      .sort((a, b) => a.distance - b.distance);

    const nearest = locationMatches[0];
    if (nearest && nearest.distance <= 150) {
      return {
        jobId: nearest.candidate.id,
        workOrderId: nearest.candidate.workOrderId,
        customerId: nearest.candidate.customerId,
        customerName: nearest.candidate.customerName,
        address: nearest.candidate.address,
        matchType: 'gps_proximity',
        confidence: nearest.distance <= 50 ? 0.84 : 0.72,
        distanceMeters: Math.round(nearest.distance),
        source: 'Matched by GPS proximity.',
      };
    }
  }

  const recentOpenJob = candidates
    .filter(candidate => candidate.status !== 'completed')
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];

  if (recentOpenJob) {
    return {
      jobId: recentOpenJob.id,
      workOrderId: recentOpenJob.workOrderId,
      customerId: recentOpenJob.customerId,
      customerName: recentOpenJob.customerName,
      address: recentOpenJob.address,
      matchType: 'recent_open_job',
      confidence: 0.52,
      source: 'Fell back to most recent open job context.',
    };
  }

  return undefined;
};

export const buildRoutingDecision = (
  normalizedCapture: NormalizedCapture,
  suggestedActions: SuggestedAction[],
  jobMatch?: JobMatch
): RoutingDecision => {
  const primary = suggestedActions.find(action => action.primary) ?? suggestedActions[0];
  const isEmergency = normalizedCapture.isEmergency || primary.action === 'escalate_emergency';
  const urgency = normalizedCapture.urgency;
  const targetQueue = ACTION_TO_QUEUE[primary.action];
  const priority = isEmergency ? 'emergency' : urgency === 'urgent' ? 'urgent' : 'normal';

  return {
    id: `route_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    normalizedCapture,
    suggestedActions: suggestedActions.map(action => ({
      ...action,
      primary: action.action === primary.action,
    })),
    primaryAction: primary.action,
    urgency,
    isEmergency,
    priority,
    targetQueue,
    jobMatch,
    reasons: [
      primary.reason,
      jobMatch ? `${jobMatch.matchType.replace(/_/g, ' ')} match (${Math.round(jobMatch.confidence * 100)}%).` : 'No confident job match found.',
      urgency === 'urgent' ? 'Urgent flag raises queue priority.' : 'Default urgency.',
    ],
    createdAt: new Date().toISOString(),
  };
};

export const createOpsQueueItem = (
  decision: RoutingDecision,
  quote?: Partial<{ id: string; suggested_job_type: string; confidence_score: number }>
): OpsQueueItem => {
  const title = quote?.suggested_job_type ?? decision.normalizedCapture.extractedItems[0] ?? 'Field Capture';

  return {
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queue: decision.targetQueue,
    action: decision.primaryAction,
    title,
    summary: decision.normalizedCapture.rawText || 'No text provided.',
    status: 'new',
    priority: decision.priority,
    urgency: decision.urgency,
    isEmergency: decision.isEmergency,
    quoteId: quote?.id,
    sourceInputText: decision.normalizedCapture.rawText,
    suggestedJobType: quote?.suggested_job_type,
    confidenceScore: quote?.confidence_score ?? decision.normalizedCapture.confidence,
    jobMatch: decision.jobMatch,
    proof: decision.normalizedCapture.presence,
    createdAt: new Date().toISOString(),
    reasons: decision.reasons,
  };
};

