import { supabase } from '../lib/supabase';
import { Vendor } from '../types';

export const mapVendor = (row: any): Vendor => ({
  id: row.id,
  name: row.name,
  contactName: '',
  email: '',
  phone: '',
  category: 'General Supply',
  paymentTerms: '',
  leadTimeDays: 0,
  preferred: Boolean(row.preferred),
  reliabilityScore: null,
  notes: '',
  aliases: [],
  createdAt: row.created_at,
  updatedAt: row.created_at,
});

export const getVendors = async (): Promise<Vendor[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, preferred, created_at')
    .order('preferred', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapVendor);
};

