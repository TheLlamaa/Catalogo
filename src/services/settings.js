import { supabase } from './client';

// rows = [{ key, value, updated_at }]
export const upsertSettings = (rows) => supabase.from('site_settings').upsert(rows);
export const deleteSettings = (keys) => supabase.from('site_settings').delete().in('key', keys);
