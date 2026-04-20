import assert from 'node:assert/strict';
import {
  buildRoutingDecision,
  createOpsQueueItem,
  detectSuggestedActions,
  matchJob,
  normalizeCapture,
} from './routing';
import { CaptureInput, JobMatchingCandidate } from './types';

const presence = {
  timestamp: '2026-04-18T14:00:00.000Z',
  location: { latitude: 39.7817, longitude: -89.6501, accuracy: 12 },
};

const jobs: JobMatchingCandidate[] = [
  {
    id: 'job_explicit',
    workOrderId: 'WO-8821',
    customerId: 'cust_1',
    customerName: 'Sarah Johnson',
    address: '123 Maple Ave, Springfield, IL 62704',
    status: 'scheduled',
    createdAt: '2026-04-18T13:30:00.000Z',
    location: { latitude: 39.7818, longitude: -89.6502 },
  },
  {
    id: 'job_gps',
    workOrderId: 'WO-9999',
    customerId: 'cust_2',
    customerName: 'Michael Chen',
    address: '456 Oak St, Springfield, IL 62704',
    status: 'scheduled',
    createdAt: '2026-04-18T13:45:00.000Z',
    location: { latitude: 39.7817, longitude: -89.6501 },
  },
];

const buildInput = (text: string): CaptureInput => ({
  text,
  inputType: 'typed',
  presence,
});

const route = (text: string, candidates = jobs) => {
  const normalized = normalizeCapture(buildInput(text));
  const suggestions = detectSuggestedActions(normalized);
  const jobMatch = matchJob({ normalizedCapture: normalized, candidates });
  return buildRoutingDecision(normalized, suggestions, jobMatch);
};

{
  const decision = route('Replaced capacitor and tested unit.');
  assert.equal(decision.primaryAction, 'generate_proposal');
  assert.equal(decision.targetQueue, 'proposals');
}

{
  const decision = route('WO-8821 left note with findings and customer approved filter change.');
  assert.equal(decision.primaryAction, 'log_to_job');
  assert.equal(decision.targetQueue, 'work_orders');
  assert.equal(decision.jobMatch?.matchType, 'explicit_work_order');
}

{
  const decision = route('Unit sparking, call office now.');
  assert.equal(decision.primaryAction, 'escalate_emergency');
  assert.equal(decision.targetQueue, 'emergencies');
  assert.equal(decision.priority, 'emergency');
}

{
  const decision = route('Need office to review this before I proceed, urgent.');
  assert.equal(decision.primaryAction, 'notify_office');
  assert.equal(decision.priority, 'urgent');
  assert.equal(createOpsQueueItem(decision).queue, 'office_updates');
}

{
  const decision = route('WO-8821 replaced capacitor near Michael Chen address.');
  assert.equal(decision.jobMatch?.workOrderId, 'WO-8821');
  assert.equal(decision.jobMatch?.matchType, 'explicit_work_order');
}

{
  const decision = route('Customer said it is weird again.');
  assert.equal(decision.primaryAction, 'notify_office');
  assert.equal(decision.targetQueue, 'office_updates');
}

console.log('routing tests passed');
