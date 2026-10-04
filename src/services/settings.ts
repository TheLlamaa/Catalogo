import { supabase } from './client';
import type { SettingRow } from '../types';

type SettingWrite = SettingRow & { updated_at?: string };

// rows = [{ key, value, updated_at }]
export const upsertSettings = (rows: SettingWrite[]) => supabase.from('site_settings').upsert(rows);
export const deleteSettings = (keys: string[]) => supabase.from('site_settings').delete().in('key', keys);
