export const normalizeEmail = (v) => String(v ?? '').trim().toLowerCase();

// Mesma regra do banco (constraint admins_email_valido)
export const validateAdminEmail = (v, existing = []) => {
  const e = normalizeEmail(v);
  if (!e) return 'Informe o e-mail.';
  if (e.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return 'Informe um e-mail válido. Ex: nome@exemplo.com';
  if (existing.map(normalizeEmail).includes(e)) return 'Este e-mail já é administrador.';
  return null;
};
