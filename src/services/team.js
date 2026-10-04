import { supabase } from './client';
import { normalizeEmail } from '../lib/admins';

export const listAdmins = () => supabase.from('admins').select('email, added_by, created_at').order('created_at', { ascending: true });
export const addAdmin = (email, addedBy) => supabase.from('admins').insert({ email: normalizeEmail(email), added_by: addedBy ? normalizeEmail(addedBy) : null });
export const removeAdmin = (email) => supabase.from('admins').delete().eq('email', normalizeEmail(email));
export const fetchSchemaVersion = () => supabase.from('app_meta').select('key, value').eq('key', 'schema_version');
