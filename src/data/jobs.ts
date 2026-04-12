import { supabase } from '../lib/supabase';
import { SupabaseJob } from '../types';

const mapJob = (row: any): SupabaseJob => ({
  id: row.id,
  jobId: row.job_id,
  customerName: row.customer_name ?? '',
  status: row.status ?? '',
  createdAt: row.created_at,
});

export const getJobs = async (): Promise<SupabaseJob[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('jobs')
    .select('id, job_id, customer_name, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapJob);
};

