import { supabase } from './supabase';

export const normalizeEmail = (v) => String(v ?? '').trim().toLowerCase();

// Mesma regra do banco (constraint admins_email_valido)
export const validateAdminEmail = (v, existing = []) => {
  const e = normalizeEmail(v);
  if (!e) return 'Informe o e-mail.';
  if (e.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return 'Informe um e-mail válido. Ex: nome@exemplo.com';
  if (existing.map(normalizeEmail).includes(e)) return 'Este e-mail já é administrador.';
  return null;
};

export const listAdmins = () => supabase.from('admins').select('email, added_by, created_at').order('created_at', { ascending: true });
export const addAdmin = (email, addedBy) => supabase.from('admins').insert({ email: normalizeEmail(email), added_by: addedBy ? normalizeEmail(addedBy) : null });
export const removeAdmin = (email) => supabase.from('admins').delete().eq('email', normalizeEmail(email));
export const fetchSchemaVersion = () => supabase.from('app_meta').select('key, value').eq('key', 'schema_version');
