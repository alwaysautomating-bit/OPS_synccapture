import { supabase } from '../lib/supabase';
import { ComparableVendorQuote, PartsUsage } from '../types';

const mapPartsUsage = (row: any): PartsUsage => ({
  id: row.id,
  jobId: row.job_id,
  itemId: row.item_id,
  vendorId: row.vendor_id,
  quantity: Number(row.quantity ?? 1),
  unitPrice: Number(row.unit_price ?? 0),
  totalCost: Number(row.total_cost ?? 0),
  sourceQuoteId: row.source_quote_id ?? undefined,
  confirmed: Boolean(row.confirmed),
  createdAt: row.created_at,
});

export const createOrUpdatePartsUsage = async (
  quote: ComparableVendorQuote,
  confirmed = true
): Promise<PartsUsage | null> => {
  if (!supabase) return null;

  const payload = {
    job_id: quote.jobId,
    item_id: quote.itemId,
    vendor_id: quote.vendorId,
    quantity: quote.quantity,
    unit_price: quote.unitPrice,
    total_cost: quote.totalCost,
    source_quote_id: quote.id,
    confirmed,
  };

  const { data: existingRows, error: findError } = await supabase
    .from('parts_usage')
    .select('id')
    .eq('job_id', quote.jobId)
    .eq('item_id', quote.itemId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (findError) throw findError;

  const existingId = existingRows?.[0]?.id;
  const request = existingId
    ? supabase.from('parts_usage').update(payload).eq('id', existingId).select('*').single()
    : supabase.from('parts_usage').insert(payload).select('*').single();

  const { data, error } = await request;
  if (error) throw error;

  return mapPartsUsage(data);
};

export const createPartsUsageFromQuote = createOrUpdatePartsUsage;

