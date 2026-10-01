export const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

// ---------------------------------------------------------------------------
// WhatsApp / contato
// ---------------------------------------------------------------------------
const DDDS_VALIDOS = new Set([
  '11','12','13','14','15','16','17','18','19','21','22','24','27','28',
  '31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49',
  '51','53','54','55','61','62','63','64','65','66','67','68','69',
  '71','73','74','75','77','79','81','82','83','84','85','86','87','88','89',
  '91','92','93','94','95','96','97','98','99'
]);

// Máscara enquanto digita: (48) 99999-9999 (aceita colar com +55)
export const formatPhoneBR = (value) => {
  let d = String(value || '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const validateContact = (name, phone) => {
  if (String(name || '').trim().length < 2 || String(name).length > 100) return 'Informe seu nome (entre 2 e 100 caracteres).';
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 11 || !DDDS_VALIDOS.has(d.slice(0, 2)) || d[2] !== '9') {
    return 'Informe um WhatsApp válido com DDD e 9 dígitos. Ex: (48) 99999-9999';
  }
  return null;
};

// Remove o 55 do início, se houver, para montar o link do WhatsApp
export const toWhatsappDigits = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
};

export const whatsappLink = (number, text) => `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
export const ORDER_STATUS = [
  { id: 'novo', label: 'Novo', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'em_producao', label: 'Em produção', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'enviado', label: 'Pronto / enviado', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'concluido', label: 'Concluído', cls: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'cancelado', label: 'Cancelado', cls: 'bg-gray-100 text-gray-600 border-gray-200' }
];
export const statusInfo = (id) => ORDER_STATUS.find(s => s.id === id) || ORDER_STATUS[0];

// {Cor: 'Preto', Tamanho: 'M'} -> "Cor: Preto · Tamanho: M"
export const formatOptions = (options) => (
  options && typeof options === 'object' && Object.keys(options).length
    ? Object.entries(options).map(([k, v]) => `${k}: ${v}`).join(' · ')
    : ''
);

export const buildOrderMessage = ({ name, items, total, notes, deliveryMethod, deliveryAddress }) => {
  const lines = [`Olá! Acabei de enviar um pedido pelo site. Meu nome é ${name}.`, ''];
  items.forEach(i => {
    const opt = formatOptions(i.options);
    lines.push(`• ${i.quantity}x ${i.title}${opt ? ` (${opt})` : ''} - ${brl(i.price * i.quantity)}`);
  });
  lines.push('', `Total: ${brl(total)}`);
  lines.push(deliveryMethod === 'entrega' ? `Entrega: ${deliveryAddress}` : 'Retirada');
  if (notes) lines.push('', `Observações: ${notes}`);
  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Exportação CSV (Excel em português usa ";" e precisa do BOM para acentos)
// ---------------------------------------------------------------------------
const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita que a planilha execute texto digitado por clientes
  return `"${s.replace(/"/g, '""')}"`;
};

export const downloadCsv = (filename, header, rows) => {
  const content = [header, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Link http(s) válido (usado no link do modelo 3D)
export const isHttpUrl = (v) => {
  if (typeof v !== 'string' || !v || v.length > 500 || /\s/.test(v)) return false;
  try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
};
