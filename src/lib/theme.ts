import { dayKey } from './orders';
// Aparência editável pelo admin: cor principal, fonte, logo/favicon e faixa de aviso.
// A cor principal troca toda a paleta "blue" do Tailwind (ver tailwind.config.js) por variáveis CSS.

export interface FontChoice { id: string; name: string; stack: string }

export const FONT_CHOICES: FontChoice[] = [
  { id: 'padrao', name: 'Padrão (do aparelho)', stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: 'moderna', name: 'Moderna', stack: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  { id: 'arredondada', name: 'Arredondada', stack: "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Quicksand, Nunito, system-ui, sans-serif" },
  { id: 'serifa', name: 'Clássica (com serifa)', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'tecnica', name: 'Técnica (monoespaçada)', stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }
];

// Tom de fundo da loja (sempre claro, para o texto continuar legível)
export const BG_TONES = [
  { id: 'padrao', name: 'Cinza claro (padrão)', hex: '#f8fafc' },
  { id: 'branco', name: 'Branco', hex: '#ffffff' },
  { id: 'creme', name: 'Creme', hex: '#fdf8ee' },
  { id: 'azulado', name: 'Azulado', hex: '#f0f6ff' },
  { id: 'rosado', name: 'Rosado', hex: '#fff5f7' }
];

// Cantos dos cards, caixas e janelas
export const CARD_STYLES = [
  { id: 'arredondado', name: 'Arredondado (padrão)', radius: '0.75rem' },
  { id: 'reto', name: 'Quase reto', radius: '0.25rem' },
  { id: 'redondo', name: 'Bem arredondado', radius: '1.25rem' },
  { id: 'quadrado', name: 'Quadrado', radius: '0' },
  { id: 'suave', name: 'Levemente arredondado', radius: '0.5rem' },
  { id: 'muito', name: 'Muito arredondado', radius: '1.75rem' }
];

export const GRID_COLUMNS = ['2', '3', '4'];

// Fontes extras (de marca) entram por siteFont.ts, que registra aqui como achar a fonte pelo id
let extraFont: ((id: string) => string | null) | null = null;
export const setFontResolver = (fn: (id: string) => string | null): void => { extraFont = fn; };

// Temas prontos: preenchem cor, fonte, fundo e cantos de uma vez (o admin ainda pode ajustar e depois publica)
export interface ThemePreset { id: string; name: string; values: Record<string, string> }
export const THEME_PRESETS: ThemePreset[] = [
  { id: 'padrao', name: 'Padrão', values: { primaryColor: '', fontChoice: 'padrao', bgTone: 'padrao', cardStyle: 'arredondado' } },
  { id: 'oceano', name: 'Oceano', values: { primaryColor: '#0e7490', fontChoice: 'moderna', bgTone: 'azulado', cardStyle: 'arredondado' } },
  { id: 'floresta', name: 'Floresta', values: { primaryColor: '#15803d', fontChoice: 'arredondada', bgTone: 'creme', cardStyle: 'redondo' } },
  { id: 'por-do-sol', name: 'Pôr do sol', values: { primaryColor: '#c2410c', fontChoice: 'arredondada', bgTone: 'creme', cardStyle: 'redondo' } },
  { id: 'classico', name: 'Clássico', values: { primaryColor: '#1e293b', fontChoice: 'serifa', bgTone: 'branco', cardStyle: 'reto' } },
  { id: 'rosa', name: 'Rosa', values: { primaryColor: '#be185d', fontChoice: 'arredondada', bgTone: 'rosado', cardStyle: 'redondo' } }
];

export const DEFAULT_PRIMARY = '#2563eb'; // = blue-600 do Tailwind
export const isHex = (v: unknown): v is string => /^#[0-9a-fA-F]{6}$/.test(String(v || '').trim());
// Código digitado à mão: aceita sem "#" e o formato curto (#f0a → #ff00aa). Devolve o texto como veio se não der.
export const normalizeHex = (v: string): string => {
  const t = v.trim().replace(/^#?/, '#').toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(t)) return `#${[...t.slice(1)].map(c => c + c).join('')}`;
  return /^#[0-9a-f]{6}$/.test(t) ? t : v;
};

// Cor em canais [r, g, b] (0 a 255)
type Rgb = number[];

const hexToRgb = (h: string): Rgb => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

// Dado o tom 600 (cor do botão), gera os outros tons da paleta
export const paletteFrom = (hex: string): Record<number, Rgb> => {
  const base = hexToRgb(hex);
  return {
    50: mix(base, WHITE, 0.92), 100: mix(base, WHITE, 0.84), 200: mix(base, WHITE, 0.68),
    300: mix(base, WHITE, 0.48), 400: mix(base, WHITE, 0.24), 500: mix(base, WHITE, 0.1),
    600: base,
    700: mix(base, BLACK, 0.15), 800: mix(base, BLACK, 0.3), 900: mix(base, BLACK, 0.45)
  };
};

// Luminância (0 = preto, 1 = branco): cor muito clara deixa o texto branco dos botões ilegível
export const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const isTooLight = (hex: unknown): boolean => isHex(hex) && luminance(hex) > 0.4;

const toHex = (c: Rgb): string => `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;

// Superfície dos cards no modo escuro (= --white escuro em tailwind.config.js)
export const DARK_SURFACE = '#151c27';

// No modo escuro, uma cor principal muito escura (ex.: o tema Clássico, #1e293b) some sobre o fundo escuro:
// botões e destaques ficam quase invisíveis. Clareia aos poucos até ter contraste com a superfície,
// sem perder a leitura do texto branco dos botões. Devolve a mesma cor se ela já funciona.
export const darkModeBase = (hex: string): string => {
  const base = hexToRgb(hex);
  let best = hex;
  for (let t = 0; t <= 0.7; t += 0.05) {
    const c = toHex(mix(base, WHITE, t));
    best = c;
    if (contrastRatio(c, DARK_SURFACE) >= 2.4) break;
    if (contrastRatio(c, '#ffffff') < 4.5) { best = toHex(mix(base, WHITE, Math.max(0, t - 0.05))); break; }
  }
  return best;
};

// Escreve a aparência no documento. Sem argumentos úteis, volta ao padrão do site.
// Campos de aparência lidos das configurações do site
export interface ThemeInput { primaryColor?: string; fontChoice?: string; logoUrl?: string; faviconUrl?: string; bgTone?: string; cardStyle?: string }

export const applyTheme = ({ primaryColor, fontChoice, logoUrl, faviconUrl, bgTone, cardStyle }: ThemeInput = {}): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  const custom = isHex(primaryColor) && primaryColor.toLowerCase() !== DEFAULT_PRIMARY;
  if (custom) {
    const pal = paletteFrom(primaryColor);
    Object.entries(pal).forEach(([step, rgb]) => root.style.setProperty(`--c-blue-${step}`, rgb.join(' ')));
  } else {
    steps.forEach(s => root.style.removeProperty(`--c-blue-${s}`));
  }
  // Paleta do modo escuro (--d-blue-*, lida em tailwind.config.js): só existe quando a cor precisa clarear
  const darkBase = custom ? darkModeBase(primaryColor) : DEFAULT_PRIMARY;
  if (custom && darkBase !== primaryColor.toLowerCase()) {
    const dpal = paletteFrom(darkBase);
    Object.entries(dpal).forEach(([step, rgb]) => root.style.setProperty(`--d-blue-${step}`, rgb.join(' ')));
  } else {
    steps.forEach(s => root.style.removeProperty(`--d-blue-${s}`));
  }
  // Destaque sobre fundo sempre escuro (ícone do cabeçalho do painel)
  root.style.setProperty('--accent-on-dark', paletteFrom(darkBase)[400].join(' '));
  const font = FONT_CHOICES.find(f => f.id === fontChoice);
  const extraStack = !font && fontChoice && extraFont ? extraFont(fontChoice) : null;
  if (font && font.id !== 'padrao') root.style.setProperty('--font-body', font.stack);
  else if (extraStack) root.style.setProperty('--font-body', extraStack);
  else root.style.removeProperty('--font-body');

  const tone = BG_TONES.find(t => t.id === bgTone);
  if (tone && tone.id !== 'padrao') root.style.setProperty('--page-bg', tone.hex); else root.style.removeProperty('--page-bg');
  const card = CARD_STYLES.find(c => c.id === cardStyle);
  if (card && card.id !== 'arredondado') root.style.setProperty('--radius-xl', card.radius); else root.style.removeProperty('--radius-xl');

  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute('content', isHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY);

  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icon) {
    if (!icon.dataset.original) icon.dataset.original = icon.getAttribute('href') || '';
    const iconUrl = /^https?:\/\//i.test(faviconUrl || '') ? faviconUrl : logoUrl;
    if (/^https?:\/\//i.test(iconUrl || '')) { icon.setAttribute('href', String(iconUrl)); icon.removeAttribute('type'); }
    else { icon.setAttribute('href', icon.dataset.original); icon.setAttribute('type', 'image/svg+xml'); }
  }
};

// Aparência publicada × rascunho do painel.
// Enquanto o lojista mexe em Site > Aparência, o painel mostra o rascunho (cor, fonte...). O site recarrega os dados
// sozinho (a cada 30 s, ao voltar para a aba, ao fechar o seletor de cor do sistema...) e reaplicava a aparência
// publicada por cima do rascunho: a cor "voltava" logo depois de escolher um tema pronto.
// Agora o rascunho, quando existe, tem prioridade; a publicada só volta quando o rascunho é encerrado.
let published: ThemeInput = {};
let draft: ThemeInput | null = null;
export const applyPublishedTheme = (input: ThemeInput): void => {
  published = input;
  if (!draft) applyTheme(input);
};
export const setThemeDraft = (input: ThemeInput | null): void => {
  draft = input;
  applyTheme(input || published);
};

// Última aparência publicada, guardada no navegador: aplicada já na abertura (main.tsx), antes dos dados
// chegarem, para o site não aparecer azul e depois mudar de cor.
const THEME_CACHE = 'catalogo-aparencia';
const THEME_KEYS: (keyof ThemeInput)[] = ['primaryColor', 'fontChoice', 'logoUrl', 'faviconUrl', 'bgTone', 'cardStyle'];
export const cacheTheme = (input: ThemeInput): void => {
  try { localStorage.setItem(THEME_CACHE, JSON.stringify(Object.fromEntries(THEME_KEYS.map(k => [k, String(input[k] ?? '')])))); } catch { /* só não guarda */ }
};
export const applyCachedTheme = (): void => {
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_CACHE) || 'null');
    if (saved && typeof saved === 'object') applyTheme(Object.fromEntries(THEME_KEYS.map(k => [k, typeof saved[k] === 'string' ? saved[k] : ''])));
  } catch { /* sem cache: fica o padrão até os dados chegarem */ }
};

// Cor dos selos dos produtos (vazio = laranja padrão da classe)
// Contraste entre duas cores (WCAG): 1 a 21. Texto pequeno precisa de pelo menos 4,5.
export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Texto branco ou quase preto, o que ficar mais legível sobre o fundo
export const readableTextOn = (bg: string): string => (contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#111827') ? '#ffffff' : '#111827');

// Selo do card: cor escolhida no painel (ou o laranja padrão) com texto que dá para ler
export const DEFAULT_BADGE_BG = '#f59e0b';
export const badgeStyle = (color: unknown): Record<string, string> => (
  isHex(color) ? { backgroundColor: color, color: readableTextOn(color) } : { backgroundColor: DEFAULT_BADGE_BG, color: readableTextOn(DEFAULT_BADGE_BG) }
);

// Faixa de aviso: aparece se está ligada, tem texto e a data final (se houver) não passou.
// "bannerUntil" é um dia (AAAA-MM-DD) e vale até o fim desse dia, no horário do visitante.
export const localDay = dayKey;
// Campos da faixa de aviso lidos das configurações do site
export interface BannerSettings { bannerEnabled?: boolean; bannerText?: string; bannerUntil?: string; bannerColor?: string; bannerImage?: string }

export const isBannerActive = (s: BannerSettings, now = new Date()): boolean =>
  !!(s.bannerEnabled && String(s.bannerText || '').trim() && !(s.bannerUntil && /^\d{4}-\d{2}-\d{2}$/.test(s.bannerUntil) && localDay(now) > s.bannerUntil));

// Redes sociais: aceita @usuario ou link completo
const SOCIAL = [
  { key: 'socialInstagram', label: 'Instagram', base: 'https://instagram.com/' },
  { key: 'socialTiktok', label: 'TikTok', base: 'https://tiktok.com/@' },
  { key: 'socialFacebook', label: 'Facebook', base: 'https://facebook.com/' },
  { key: 'socialYoutube', label: 'YouTube', base: 'https://youtube.com/@' },
  { key: 'socialPinterest', label: 'Pinterest', base: 'https://pinterest.com/' },
  { key: 'socialX', label: 'X', base: 'https://x.com/' },
  { key: 'socialLinkedin', label: 'LinkedIn', base: 'https://linkedin.com/in/' }
];
export const normalizeSocial = (key: string, value: unknown): string => {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) { try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } }
  // Só @usuario (letras, números, ponto, hífen e sublinhado). Qualquer outra coisa não vira link.
  if (!/^@?[\w.-]{1,100}$/.test(v)) return '';
  const net = SOCIAL.find(s => s.key === key);
  return net ? net.base + v.replace(/^@/, '') : '';
};
export const socialLinks = (s: Record<string, unknown>) => SOCIAL.map(n => ({ label: n.label, href: normalizeSocial(n.key, s[n.key]) })).filter(l => l.href);

// Perguntas frequentes: lista de { q, a } guardada como JSON
export interface FaqItem { q: string; a: string }
export const MAX_FAQ = 20;
export const parseFaq = (value: string): FaqItem[] => {
  try {
    const arr = JSON.parse(value);
    if (!Array.isArray(arr)) return [];
    return arr.filter(i => i && typeof i.q === 'string' && typeof i.a === 'string' && i.q.trim() && i.a.trim())
      .slice(0, MAX_FAQ).map(i => ({ q: i.q.trim().slice(0, 200), a: i.a.trim().slice(0, 1000) }));
  } catch { return []; }
};

// Estilo da faixa: cor própria e/ou imagem de fundo (escurecida pela cor para o texto continuar legível)
export const bannerStyle = (s: BannerSettings): Record<string, string> => {
  const color = isHex(s.bannerColor) ? s.bannerColor : null;
  if (s.bannerImage) {
    const overlay = color ? `${color}b3` : 'rgb(var(--c-blue-600) / 0.7)';
    const url = String(s.bannerImage).replace(/["'\\()\s]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
    return { backgroundImage: `linear-gradient(${overlay}, ${overlay}), url("${url}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  return color ? { backgroundColor: color } : {};
};
