import { supabase } from '../lib/supabase';
import { Item } from '../types';

const mapItem = (row: any): Item => ({
  id: row.id,
  canonicalName: row.name,
  category: 'Material',
  unit: row.unit ?? 'each',
  aliases: [],
  createdAt: row.created_at,
  updatedAt: row.created_at,
});

export const getItems = async (): Promise<Item[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('items')
    .select('id, name, unit, created_at')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapItem);
};

