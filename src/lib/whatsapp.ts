// WhatsApp: um lugar só para as conversões entre o que o usuário digita e o que o wa.me aceita.

// Aceita com ou sem 55; devolve só dígitos com 55 (ou o que veio, se não parece um número brasileiro)
export const normalizeWhatsapp = (value: unknown): string => {
  const d = String(value || '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
};

// Remove o 55 do início, se houver (telefone do cliente com DDD)
export const toWhatsappDigits = (phone: unknown): string => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
};

// Número do telefone de um cliente no formato do wa.me (com 55)
export const customerWhatsapp = (phone: unknown): string => `55${toWhatsappDigits(phone)}`;
