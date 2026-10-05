// Páginas extras (Termos, Trocas, Cuidados com a peça…): até 6, cada uma guardada numa chave própria
// (pageA a pageF) porque cada valor do banco aceita no máximo 5000 caracteres.

export const MAX_PAGES = 6;
export const PAGE_KEYS = Array.from({ length: MAX_PAGES }, (_, i) => `page${'ABCDEF'[i]}`); // as chaves só aceitam letras
export const PAGE_TITLE_MAX = 60;
export const PAGE_TEXT_MAX = 3000;

export interface ExtraPage { slug: string; title: string; text: string; menu: boolean; footer: boolean }

// Como a página é digitada no painel (campos podem estar vazios)
export interface PageDraft { t?: string; x?: string; m?: boolean; f?: boolean }

export const slugify = (title: string): string => title
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export const parsePageDraft = (value: string): PageDraft => {
  try {
    const o = JSON.parse(value);
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      return {
        t: typeof o.t === 'string' ? o.t : '', x: typeof o.x === 'string' ? o.x : '',
        m: o.m === true, f: o.f === true
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
  return JSON.stringify({ t, x, m: !!d.m, f: !!d.f });
};

export const isCompletePage = (value: string): boolean => {
  const d = parsePageDraft(value);
  return !!((d.t || '').trim() && (d.x || '').trim());
};

// Lista de páginas válidas, na ordem das chaves, com endereço (slug) único
export const buildPages = (values: (string | undefined)[]): ExtraPage[] => {
  const used = new Set<string>();
  const out: ExtraPage[] = [];
  values.forEach((v, i) => {
    if (!v || !isCompletePage(v)) return;
    const d = parsePageDraft(v);
    const title = (d.t || '').trim();
    let slug = slugify(title) || `pagina-${i + 1}`;
    if (used.has(slug)) slug = `${slug}-${i + 1}`;
    used.add(slug);
    out.push({ slug, title, text: (d.x || '').trim(), menu: !!d.m, footer: !!d.f });
  });
  return out;
};
