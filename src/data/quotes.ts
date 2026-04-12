import { supabase } from '../lib/supabase';
import { ComparableVendorQuote } from '../types';

const mapComparableQuote = (row: any): ComparableVendorQuote => ({
  id: row.id,
  jobId: row.job_id,
  itemId: row.item_id,
  vendorId: row.vendor_id,
  vendorName: row.vendors?.name ?? 'Unknown vendor',
  vendorPreferred: Boolean(row.vendors?.preferred),
  quantity: Number(row.quantity ?? 1),
  unitPrice: Number(row.unit_price ?? 0),
  shippingCost: Number(row.shipping_cost ?? 0),
  totalCost: Number(row.total_cost ?? 0),
  leadTimeDays: row.lead_time_days === null ? null : Number(row.lead_time_days),
  notes: row.notes ?? '',
  createdAt: row.created_at,
});

const sortComparableQuotes = (quotes: ComparableVendorQuote[]) =>
  [...quotes].sort((a, b) => a.totalCost - b.totalCost || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const getComparableQuotesForItem = async (
  jobId: string,
  itemId: string
): Promise<ComparableVendorQuote[]> => {
  if (!supabase || !jobId || !itemId) return [];

  const { data, error } = await supabase
    .from('quote_responses')
    .select(`
      id,
      job_id,
      item_id,
      vendor_id,
      quantity,
      unit_price,
      shipping_cost,
      total_cost,
      lead_time_days,
      notes,
      created_at,
      vendors (
        name,
        preferred
      )
    `)
    .eq('job_id', jobId)
    .eq('item_id', itemId);

  if (error) throw error;

  const sorted = sortComparableQuotes((data ?? []).map(mapComparableQuote));
  const cheapestId = sorted[0]?.id;
  return sorted.map(quote => ({
    ...quote,
    isCheapest: quote.id === cheapestId,
  }));
};

