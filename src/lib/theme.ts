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
  { id: 'redondo', name: 'Bem arredondado', radius: '1.25rem' }
];

export const GRID_COLUMNS = ['2', '3', '4'];

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

// Escreve a aparência no documento. Sem argumentos úteis, volta ao padrão do site.
// Campos de aparência lidos das configurações do site
export interface ThemeInput { primaryColor?: string; fontChoice?: string; logoUrl?: string; faviconUrl?: string; bgTone?: string; cardStyle?: string }

export const applyTheme = ({ primaryColor, fontChoice, logoUrl, faviconUrl, bgTone, cardStyle }: ThemeInput = {}): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isHex(primaryColor) && primaryColor.toLowerCase() !== DEFAULT_PRIMARY) {
    const pal = paletteFrom(primaryColor);
    Object.entries(pal).forEach(([step, rgb]) => root.style.setProperty(`--c-blue-${step}`, rgb.join(' ')));
  } else {
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].forEach(s => root.style.removeProperty(`--c-blue-${s}`));
  }
  const font = FONT_CHOICES.find(f => f.id === fontChoice);
  if (font && font.id !== 'padrao') root.style.setProperty('--font-body', font.stack);
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

// Faixa de aviso: aparece se está ligada, tem texto e a data final (se houver) não passou.
// "bannerUntil" é um dia (AAAA-MM-DD) e vale até o fim desse dia, no horário do visitante.
export const localDay = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Campos da faixa de aviso lidos das configurações do site
export interface BannerSettings { bannerEnabled?: boolean; bannerText?: string; bannerUntil?: string; bannerColor?: string; bannerImage?: string }

export const isBannerActive = (s: BannerSettings, now = new Date()): boolean =>
  !!(s.bannerEnabled && String(s.bannerText || '').trim() && !(s.bannerUntil && /^\d{4}-\d{2}-\d{2}$/.test(s.bannerUntil) && localDay(now) > s.bannerUntil));

// Redes sociais: aceita @usuario ou link completo
const SOCIAL = [
  { key: 'socialInstagram', label: 'Instagram', base: 'https://instagram.com/' },
  { key: 'socialTiktok', label: 'TikTok', base: 'https://tiktok.com/@' },
  { key: 'socialFacebook', label: 'Facebook', base: 'https://facebook.com/' },
  { key: 'socialYoutube', label: 'YouTube', base: 'https://youtube.com/@' }
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
