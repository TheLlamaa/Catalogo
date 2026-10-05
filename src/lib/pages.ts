// Páginas criadas no painel (Trocas, Cuidados com a peça, Prazos…): até 20, cada uma numa chave própria
// (pageA a pageT), porque cada valor do banco aceita no máximo 5000 caracteres e as chaves só aceitam letras.

export const PAGE_LETTERS = 'ABCDEFGHIJKLMNOPQRST';
export const MAX_PAGES = PAGE_LETTERS.length;
export const PAGE_KEYS = PAGE_LETTERS.split('').map(l => `page${l}`);
export const PAGE_TITLE_MAX = 60;
export const PAGE_TEXT_MAX = 3000;

export interface ExtraPage { key: string; slug: string; title: string; text: string; published: boolean }

// Como a página é digitada no painel (campos podem estar vazios)
export interface PageDraft { t?: string; x?: string; s?: string; p?: boolean }

export const slugify = (title: string): string => title
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export const isValidSlug = (slug: string): boolean => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 40;

export const parsePageDraft = (value: string): PageDraft => {
  try {
    const o = JSON.parse(value);
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      return {
        t: typeof o.t === 'string' ? o.t : '', x: typeof o.x === 'string' ? o.x : '',
        s: typeof o.s === 'string' ? o.s : '', p: o.p !== false
      };
    }
  } catch { /* vazio */ }
  return {};
};

// Valor para o banco: '' quando a página está vazia
export const pageToStored = (value: string): string => {
  const d = parsePageDraft(value);
  const t = (d.t || '').trim().slice(0, PAGE_TITLE_MAX);
  const x = (d.x || '').trim().slice(0, PAGE_TEXT_MAX);
  if (!t && !x) return '';
  const s = slugify(d.s || '') || slugify(t);
  return JSON.stringify({ t, x, s, p: d.p !== false });
};

export const isCompletePage = (value: string): boolean => {
  const d = parsePageDraft(value);
  return !!((d.t || '').trim() && (d.x || '').trim() && isValidSlug(slugify(d.s || '') || slugify(d.t || '')));
};

// Primeira chave livre para uma página nova (null se já há 20)
export const nextPageKey = (used: string[]): string | null => PAGE_KEYS.find(k => !used.includes(k)) ?? null;

// Páginas completas, na ordem das chaves, com endereço (slug) único
export const buildPages = (byKey: Record<string, string | undefined>): ExtraPage[] => {
  const seen = new Set<string>();
  const out: ExtraPage[] = [];
  for (const key of PAGE_KEYS) {
    const v = byKey[key];
    if (!v || !isCompletePage(v)) continue;
    const d = parsePageDraft(v);
    const title = (d.t || '').trim();
    let slug = slugify(d.s || '') || slugify(title);
    if (seen.has(slug)) slug = `${slug}-${key.slice(-1).toLowerCase()}`.slice(0, 40);
    seen.add(slug);
    out.push({ key, slug, title, text: (d.x || '').trim(), published: d.p !== false });
  }
  return out;
};
