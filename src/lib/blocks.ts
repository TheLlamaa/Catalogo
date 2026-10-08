// Blocos extras da página inicial criados no painel: texto livre, banner com imagem e link, e depoimentos.
// Até 6, cada um numa chave própria (blockA a blockF): o banco aceita no máximo 5000 caracteres por valor e
// as chaves só aceitam letras. Vazio = bloco não existe.

export const BLOCK_LETTERS = 'ABCDEF';
export const MAX_BLOCKS = BLOCK_LETTERS.length;
export const BLOCK_KEYS = BLOCK_LETTERS.split('').map(l => `block${l}`);
export const BLOCK_TITLE_MAX = 80;
export const BLOCK_TEXT_MAX = 600;
export const BLOCK_BUTTON_MAX = 30;
export const MAX_QUOTES = 4;
export const QUOTE_NAME_MAX = 40;
export const QUOTE_TEXT_MAX = 240;

export type BlockKind = 'texto' | 'banner' | 'depoimentos';
export const BLOCK_KINDS: { id: BlockKind; label: string; hint: string }[] = [
  { id: 'texto', label: 'Texto', hint: 'Título e um parágrafo: avisos, sobre a loja, como cuidar da peça.' },
  { id: 'banner', label: 'Banner com imagem', hint: 'Imagem grande com título, texto e um botão que leva a um link ou página.' },
  { id: 'depoimentos', label: 'Depoimentos', hint: 'Até 4 frases de clientes, com o nome de quem falou.' },
];

export interface Quote { n: string; q: string }

// Como o bloco é digitado no painel (campos podem estar vazios)
export interface BlockDraft { k: BlockKind; on: boolean; t: string; x: string; i: string; l: string; b: string; d: Quote[] }

// Bloco pronto para mostrar na vitrine
export interface HomeBlock { id: string; key: string; kind: BlockKind; title: string; text: string; image: string; link: string; button: string; quotes: Quote[] }

const isKind = (v: unknown): v is BlockKind => v === 'texto' || v === 'banner' || v === 'depoimentos';
const isHttp = (v: string): boolean => { try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };
/** Link do botão: endereço completo (https://…) ou página do próprio site (/sobre, /p/trocas). */
export const isValidBlockLink = (v: string): boolean => !v || isHttp(v) || /^\/[A-Za-z0-9/_?=&#.-]*$/.test(v);

export const parseBlockDraft = (value: string): BlockDraft | null => {
  try {
    const o = JSON.parse(value);
    if (!o || typeof o !== 'object' || Array.isArray(o) || !isKind(o.k)) return null;
    const s = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
    return {
      k: o.k, on: o.on !== false, t: s(o.t, BLOCK_TITLE_MAX), x: s(o.x, BLOCK_TEXT_MAX), i: s(o.i, 700), l: s(o.l, 300), b: s(o.b, BLOCK_BUTTON_MAX),
      d: Array.isArray(o.d) ? o.d.filter((q: unknown): q is Quote => !!q && typeof q === 'object').slice(0, MAX_QUOTES).map((q: Partial<Quote>) => ({ n: s(q.n, QUOTE_NAME_MAX), q: s(q.q, QUOTE_TEXT_MAX) })) : [],
    };
  } catch { return null; }
};

/** Bloco com conteúdo suficiente para aparecer? */
export const isCompleteBlock = (d: BlockDraft | null): boolean => {
  if (!d) return false;
  if (d.k === 'texto') return !!(d.t.trim() || d.x.trim());
  if (d.k === 'banner') return !!d.i.trim() && !!(d.t.trim() || d.x.trim()) && isValidBlockLink(d.l.trim());
  return d.d.some(q => q.q.trim());
};

/** Valor para o banco: '' quando o bloco está vazio. */
export const blockToStored = (value: string): string => {
  const d = parseBlockDraft(value);
  if (!d) return '';
  const quotes = d.d.map(q => ({ n: q.n.trim(), q: q.q.trim() })).filter(q => q.q);
  const empty = !d.t.trim() && !d.x.trim() && !d.i.trim() && quotes.length === 0;
  if (empty) return '';
  return JSON.stringify({ k: d.k, on: d.on, t: d.t.trim(), x: d.x.trim(), i: d.i.trim(), l: d.l.trim(), b: d.b.trim(), d: quotes });
};

export const nextBlockKey = (used: string[]): string | null => BLOCK_KEYS.find(k => !used.includes(k)) ?? null;
/** Id do bloco na ordem da página inicial (blockA -> extraA). */
export const blockSectionId = (key: string): string => `extra${key.slice(-1)}`;

/** Blocos prontos para a vitrine: só os ligados e completos, na ordem das chaves. */
export const buildBlocks = (byKey: Record<string, string | undefined>): HomeBlock[] => {
  const out: HomeBlock[] = [];
  for (const key of BLOCK_KEYS) {
    const v = byKey[key];
    if (!v) continue;
    const d = parseBlockDraft(v);
    if (!d || !isCompleteBlock(d) || !d.on) continue;
    out.push({ id: blockSectionId(key), key, kind: d.k, title: d.t.trim(), text: d.x.trim(), image: d.i.trim(), link: d.l.trim(), button: d.b.trim(), quotes: d.d.filter(q => q.q.trim()) });
  }
  return out;
};
