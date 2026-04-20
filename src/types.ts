export type QuoteStatus = 'draft' | 'reviewed' | 'formalized' | 'invoiced';
export type InputType = 'typed' | 'voice';
export type VendorCategory = 'HVAC' | 'Plumbing' | 'Electrical' | 'General Supply' | 'Subcontractor' | 'Rental' | 'Other';
export type PriceMemorySourceType = 'capture' | 'work_order' | 'invoice' | 'manual';
export type MaterialVarianceHandling = 'kept_entered' | 'used_last_known' | 'intentional';
export type PrimaryAction = 'generate_proposal' | 'log_to_job' | 'notify_office' | 'escalate_emergency';
export type CaptureUrgency = 'default' | 'urgent';
export type OpsQueueName = 'proposals' | 'work_orders' | 'office_updates' | 'emergencies';
export type JobMatchType = 'explicit_work_order' | 'customer_address' | 'gps_proximity' | 'recent_open_job' | 'none';

export interface PresenceMetadata {
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  photoCount?: number;
  capturedBy?: string;
}

export interface CaptureInput {
  text: string;
  inputType: InputType;
  presence: PresenceMetadata;
  customer?: Customer;
  selectedJobId?: string;
  currentWorkOrderId?: string;
  quote?: Partial<QuickQuote>;
}

export interface JobMatchingCandidate {
  id: string;
  workOrderId?: string;
  customerId?: string;
  customerName?: string;
  address?: string;
  status?: string;
  createdAt?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface NormalizedCapture {
  rawText: string;
  lowerText: string;
  sourceInputType: InputType;
  presence: PresenceMetadata;
  explicitWorkOrderId?: string;
  customerName?: string;
  address?: string;
  urgency: CaptureUrgency;
  isEmergency: boolean;
  confidence: number;
  intentHints: string[];
  extractedItems: string[];
}

export interface SuggestedAction {
  action: PrimaryAction;
  label: string;
  queue: OpsQueueName;
  confidence: number;
  reason: string;
  primary?: boolean;
}

export interface JobMatch {
  jobId?: string;
  workOrderId?: string;
  customerId?: string;
  customerName?: string;
  address?: string;
  matchType: JobMatchType;
  confidence: number;
  distanceMeters?: number;
  source?: string;
}

export interface RoutingDecision {
  id: string;
  normalizedCapture: NormalizedCapture;
  suggestedActions: SuggestedAction[];
  primaryAction: PrimaryAction;
  urgency: CaptureUrgency;
  isEmergency: boolean;
  priority: 'normal' | 'urgent' | 'emergency';
  targetQueue: OpsQueueName;
  jobMatch?: JobMatch;
  reasons: string[];
  createdAt: string;
}

export interface OpsQueueItem {
  id: string;
  queue: OpsQueueName;
  action: PrimaryAction;
  title: string;
  summary: string;
  status: 'new' | 'reviewing' | 'done';
  priority: 'normal' | 'urgent' | 'emergency';
  urgency: CaptureUrgency;
  isEmergency: boolean;
  quoteId?: string;
  sourceInputText: string;
  suggestedJobType?: string;
  confidenceScore?: number;
  jobMatch?: JobMatch;
  proof: PresenceMetadata;
  createdAt: string;
  reasons: string[];
}

export interface VendorAlias {
  id: string;
  vendorId: string;
  name: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: VendorCategory;
  paymentTerms: string;
  leadTimeDays: number;
  preferred: boolean;
  reliabilityScore: number | null;
  notes: string;
  aliases?: VendorAlias[];
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  canonicalName: string;
  category: VendorCategory | 'Material';
  unit: string;
  aliases?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MaterialLine {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
  varianceHandling?: MaterialVarianceHandling;
  varianceHandledAt?: string;
}

export interface VendorItemPriceHistory {
  id: string;
  vendorId: string;
  itemId: string;
  price: number;
  quantity: number;
  currency: 'USD';
  date: string;
  sourceType: PriceMemorySourceType;
  sourceId: string;
  notes?: string;
}

export interface SupplierOutreachDraft {
  id: string;
  vendorId: string;
  itemId: string;
  sourceMaterialLineId: string;
  quantity: number;
  currentVendorId?: string;
  currentPrice?: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupabaseJob {
  id: string;
  jobId: string;
  customerName: string;
  status: string;
  createdAt: string;
}

export interface ComparableVendorQuote {
  id: string;
  jobId: string;
  itemId: string;
  vendorId: string;
  vendorName: string;
  vendorPreferred: boolean;
  quantity: number;
  unitPrice: number;
  shippingCost: number;
  totalCost: number;
  leadTimeDays: number | null;
  notes: string;
  createdAt: string;
  isCheapest?: boolean;
}

export interface PartsUsage {
  id: string;
  jobId: string;
  itemId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  sourceQuoteId?: string;
  confirmed: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  quote_id: string;
  customer_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
  due_date: string;
}

export interface WorkOrder {
  id: string;
  title?: string;
  customer_name?: string;
  address?: string;
  created_at?: string;
  quote_id: string;
  customer_id: string;
  job_type: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  assigned_tech?: string;
  scheduled_date?: string;
  vendorId?: string;
  materials?: MaterialLine[];
  tags?: string[];
}

export interface WorkOrderDetailDraft {
  id: string;
  workOrderId: string;
  jobNotes: string;
  todaysWork: string;
  todaysPart?: string;
  parts: {
    name: string;
    quantity: string;
  }[];
  photoNote?: string;
  timeNote?: string;
  updatedAt: string;
}

export interface QuickQuote {
  id: string;
  job_id?: string;
  customer_id: string;
  source_input_text: string;
  source_input_type: InputType;
  suggested_job_type: string;
  estimated_material_cost: number;
  estimated_labor_cost: number;
  estimated_subcontractor_cost: number;
  estimated_total: number;
  flat_rate_low?: number;
  flat_rate_high?: number;
  confidence_score: number;
  reasoning: string;
  status: QuoteStatus;
  created_by: string;
  created_at: string;
  missing_items?: string[];
  is_urgent?: boolean;
  is_emergency?: boolean;
  photos?: string[];
  vendorId?: string;
  materials?: MaterialLine[];
  tags?: string[];
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  audit_trail?: {
    timestamp: string;
    action: string;
    details: string;
  }[];
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface JobTemplate {
  jobType: string;
  flatRateLow: number;
  flatRateHigh: number;
  typicalMaterials: string[];
  typicalLaborHours: number;
}
