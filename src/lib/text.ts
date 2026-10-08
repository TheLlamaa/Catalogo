// Texto para comparar buscas: sem acento e sem diferença de maiúsculas ("luminaria" acha "Luminária").
export const normalizeText = (value: unknown): string =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** true se todas as palavras da busca aparecem em algum dos campos (vazio = tudo combina). */
export const matchesQuery = (query: string, ...fields: unknown[]): boolean => {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeText(fields.join(' '));
  return words.every(w => haystack.includes(w));
};
