// Fonte do site: as 5 do aparelho (theme.ts) mais as fontes de marca servidas pelo próprio site (brand.ts).
// As de marca têm id "b-<nome>" e são carregadas sob demanda, só a que a loja usa.
import { FONT_CHOICES, setFontResolver, type FontChoice } from './theme';
import { BRAND_FONTS, brandFont } from './brand';
import { loadBrandFont } from './brandFontLoader';

const PREFIX = 'b-';
const BODY_WEIGHTS = [400, 500, 600, 700];

export const SITE_FONT_CHOICES: FontChoice[] = [
  ...FONT_CHOICES,
  ...BRAND_FONTS.filter(f => f.id !== 'site').map(f => ({ id: PREFIX + f.id, name: f.name, stack: f.stack })),
];

/** Fonte de marca escolhida para o site (id "b-…")? */
export const isBrandSiteFont = (id: unknown): id is string => typeof id === 'string' && id.startsWith(PREFIX) && BRAND_FONTS.some(f => f.id === id.slice(PREFIX.length));

/** Letras da fonte escolhida (qualquer uma das opções) ou null. */
export const siteFontStack = (id: unknown): string | null => {
  if (isBrandSiteFont(id)) return brandFont(id.slice(PREFIX.length)).stack;
  return FONT_CHOICES.find(f => f.id === id)?.stack ?? null;
};

/** Carrega os arquivos da fonte de marca (pesos usados no texto do site). */
export const loadSiteFont = (id: unknown): void => {
  if (!isBrandSiteFont(id)) return;
  BODY_WEIGHTS.forEach(w => loadBrandFont(id.slice(PREFIX.length), w));
};

// theme.ts não conhece as fontes de marca (evita importação circular): elas entram por aqui
setFontResolver(id => {
  if (!isBrandSiteFont(id)) return null;
  loadSiteFont(id);
  return siteFontStack(id);
});
