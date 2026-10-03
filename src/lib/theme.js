// Aparência editável pelo admin: cor principal, fonte, logo/favicon e faixa de aviso.
// A cor principal troca toda a paleta "blue" do Tailwind (ver tailwind.config.js) por variáveis CSS.

export const FONT_CHOICES = [
  { id: 'padrao', name: 'Padrão (do aparelho)', stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: 'moderna', name: 'Moderna', stack: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  { id: 'arredondada', name: 'Arredondada', stack: "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Quicksand, Nunito, system-ui, sans-serif" },
  { id: 'serifa', name: 'Clássica (com serifa)', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'tecnica', name: 'Técnica (monoespaçada)', stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }
];

export const DEFAULT_PRIMARY = '#2563eb'; // = blue-600 do Tailwind
export const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || '').trim());

const hexToRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

// Dado o tom 600 (cor do botão), gera os outros tons da paleta
export const paletteFrom = (hex) => {
  const base = hexToRgb(hex);
  return {
    50: mix(base, WHITE, 0.92), 100: mix(base, WHITE, 0.84), 200: mix(base, WHITE, 0.68),
    300: mix(base, WHITE, 0.48), 400: mix(base, WHITE, 0.24), 500: mix(base, WHITE, 0.1),
    600: base,
    700: mix(base, BLACK, 0.15), 800: mix(base, BLACK, 0.3), 900: mix(base, BLACK, 0.45)
  };
};

// Luminância (0 = preto, 1 = branco): cor muito clara deixa o texto branco dos botões ilegível
export const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const isTooLight = (hex) => isHex(hex) && luminance(hex) > 0.4;

// Escreve a aparência no documento. Sem argumentos úteis, volta ao padrão do site.
export const applyTheme = ({ primaryColor, fontChoice, logoUrl } = {}) => {
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

  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute('content', isHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY);

  const icon = document.querySelector('link[rel="icon"]');
  if (icon) {
    if (!icon.dataset.original) icon.dataset.original = icon.getAttribute('href') || '';
    if (/^https?:\/\//i.test(logoUrl || '')) { icon.setAttribute('href', logoUrl); icon.removeAttribute('type'); }
    else { icon.setAttribute('href', icon.dataset.original); icon.setAttribute('type', 'image/svg+xml'); }
  }
};

// Faixa de aviso: aparece se está ligada, tem texto e a data final (se houver) não passou.
// "bannerUntil" é um dia (AAAA-MM-DD) e vale até o fim desse dia, no horário do visitante.
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const isBannerActive = (s, now = new Date()) =>
  !!(s.bannerEnabled && String(s.bannerText || '').trim() && !(s.bannerUntil && /^\d{4}-\d{2}-\d{2}$/.test(s.bannerUntil) && localDay(now) > s.bannerUntil));

// Redes sociais: aceita @usuario ou link completo
const SOCIAL = [
  { key: 'socialInstagram', label: 'Instagram', base: 'https://instagram.com/' },
  { key: 'socialTiktok', label: 'TikTok', base: 'https://tiktok.com/@' },
  { key: 'socialFacebook', label: 'Facebook', base: 'https://facebook.com/' },
  { key: 'socialYoutube', label: 'YouTube', base: 'https://youtube.com/@' }
];
export const normalizeSocial = (key, value) => {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) { try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } }
  // Só @usuario (letras, números, ponto, hífen e sublinhado). Qualquer outra coisa não vira link.
  if (!/^@?[\w.-]{1,100}$/.test(v)) return '';
  const net = SOCIAL.find(s => s.key === key);
  return net ? net.base + v.replace(/^@/, '') : '';
};
export const socialLinks = (s) => SOCIAL.map(n => ({ label: n.label, href: normalizeSocial(n.key, s[n.key]) })).filter(l => l.href);

// Perguntas frequentes: lista de { q, a } guardada como JSON
export const MAX_FAQ = 20;
export const parseFaq = (value) => {
  try {
    const arr = JSON.parse(value);
    if (!Array.isArray(arr)) return [];
    return arr.filter(i => i && typeof i.q === 'string' && typeof i.a === 'string' && i.q.trim() && i.a.trim())
      .slice(0, MAX_FAQ).map(i => ({ q: i.q.trim().slice(0, 200), a: i.a.trim().slice(0, 1000) }));
  } catch { return []; }
};

// Estilo da faixa: cor própria e/ou imagem de fundo (escurecida pela cor para o texto continuar legível)
export const bannerStyle = (s) => {
  const color = isHex(s.bannerColor) ? s.bannerColor : null;
  if (s.bannerImage) {
    const overlay = color ? `${color}b3` : 'rgb(var(--c-blue-600) / 0.7)';
    const url = String(s.bannerImage).replace(/["'\\()\s]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
    return { backgroundImage: `linear-gradient(${overlay}, ${overlay}), url("${url}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  return color ? { backgroundColor: color } : {};
};
