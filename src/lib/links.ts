// Links extras no menu e no rodapé (Instagram da loja, Mercado Livre, Shopee…): até 4, cada um numa chave
// própria (linkA a linkD). Só endereços http(s) são aceitos.

export const MAX_LINKS = 4;
export const LINK_KEYS = Array.from({ length: MAX_LINKS }, (_, i) => `link${'ABCD'[i]}`); // as chaves só aceitam letras
export const LINK_LABEL_MAX = 30;

export interface ExtraLink { label: string; url: string; menu: boolean; footer: boolean }
export interface LinkDraft { l?: string; u?: string; m?: boolean; f?: boolean }

const httpUrl = (v: string): string => {
  try { const u = new URL(v.trim()); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
};

export const parseLinkDraft = (value: string): LinkDraft => {
  try {
    const o = JSON.parse(value);
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      return { l: typeof o.l === 'string' ? o.l : '', u: typeof o.u === 'string' ? o.u : '', m: o.m === true, f: o.f === true };
    }
  } catch { /* vazio */ }
  return {};
};

export const linkToStored = (value: string): string => {
  const d = parseLinkDraft(value);
  const l = (d.l || '').trim().slice(0, LINK_LABEL_MAX);
  const u = (d.u || '').trim().slice(0, 500);
  if (!l && !u) return '';
  return JSON.stringify({ l, u, m: !!d.m, f: !!d.f });
};

export const isCompleteLink = (value: string): boolean => {
  const d = parseLinkDraft(value);
  return !!((d.l || '').trim() && httpUrl(d.u || ''));
};

export const buildLinks = (values: (string | undefined)[]): ExtraLink[] => values
  .filter((v): v is string => !!v && isCompleteLink(v))
  .map(v => { const d = parseLinkDraft(v); return { label: (d.l || '').trim(), url: httpUrl(d.u || ''), menu: !!d.m, footer: !!d.f }; });
