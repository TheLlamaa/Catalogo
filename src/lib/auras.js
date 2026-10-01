export const AURA_OPTIONS = [
  { id: 'inherit', name: 'Padrão da Categoria' },
  { id: 'none', name: 'Nenhuma' },
  { id: 'rainbow', name: 'Rainbow' },
  { id: 'holo', name: 'Holo' },
  { id: 'dual', name: 'Dual' },
  { id: 'gold', name: 'Gold' },
  { id: 'silver', name: 'Silver' },
  { id: 'glow', name: 'Glow' },
  { id: 'blue', name: 'Blue' },
  { id: 'purple', name: 'Purple' },
  { id: 'red', name: 'Red' },
  { id: 'green', name: 'Green' },
  { id: 'valentines', name: 'Valentines' },
  { id: 'religious', name: 'Religious' },
  { id: 'christmas', name: 'Christmas' },
  { id: 'halloween', name: 'Halloween' },
  { id: 'newyear', name: 'New Year' },
  { id: 'easter', name: 'Easter' },
  { id: 'cyberpunk', name: 'Cyberpunk' }
];

export const AURA_CLASS_MAP = {
  none: 'aura-none',
  rainbow: 'aura-rainbow',
  holo: 'aura-holo',
  dual: 'aura-dual',
  gold: 'aura-gold',
  silver: 'aura-silver',
  glow: 'aura-glow',
  blue: 'aura-blue',
  purple: 'aura-purple',
  red: 'aura-red',
  green: 'aura-green',
  valentines: 'aura-valentines',
  religious: 'aura-religious',
  christmas: 'aura-christmas',
  halloween: 'aura-halloween',
  newyear: 'aura-newyear',
  easter: 'aura-easter',
  cyberpunk: 'aura-cyberpunk'
};

// ---------------------------------------------------------------------------
// Auras personalizadas e edição das auras do sistema (aba "Auras" do admin)
// Tudo fica no banco como JSON. O produto/categoria guarda a chave da aura:
//   "gold" (do sistema) ou "custom-<id>" (criada no painel).
// A biblioteca ("lib") é { custom: [...], overrides: { gold: {...} } }.
// ---------------------------------------------------------------------------
const HEX = /^#[0-9a-f]{6}$/i;
export const MAX_CUSTOM_AURAS = 20;
export const MAX_AURA_COLORS = 8;
export const EMPTY_LIB = { custom: [], overrides: {} };
export const customKey = (id) => `custom-${id}`;

// Cores originais das auras do sistema (espelham o index.css), para poder editá-las
export const BUILTIN_COLORS = {
  rainbow: ['#ff0000', '#ff7300', '#fffb00', '#48ff00', '#00ffd5', '#002bfd', '#7a00ff', '#ff00c8'],
  holo: ['#00ffff', '#ff00ff', '#ffff00'],
  dual: ['#3b82f6', '#ec4899'],
  gold: ['#eab308', '#fef08a', '#ca8a04', '#fef08a'],
  silver: ['#94a3b8', '#f8fafc', '#475569', '#f8fafc'],
  glow: ['#ffffff', '#93c5fd'],
  blue: ['#3b82f6', '#93c5fd', '#1d4ed8'],
  purple: ['#a855f7', '#c084fc', '#7e22ce'],
  red: ['#ef4444', '#fca5a5', '#b91c1c'],
  green: ['#22c55e', '#86efac', '#15803d'],
  valentines: ['#e11d48', '#f472b6', '#ffffff', '#fb7185'],
  religious: ['#eab308', '#ffffff', '#38bdf8', '#ffffff'],
  christmas: ['#dc2626', '#ffffff', '#22c55e', '#ffffff'],
  halloween: ['#f97316', '#000000', '#a855f7', '#000000'],
  newyear: ['#facc15', '#ffffff', '#38bdf8', '#ffffff'],
  easter: ['#f472b6', '#fef08a', '#c084fc', '#fef08a'],
  cyberpunk: ['#06b6d4', '#f43f5e', '#3b82f6']
};
export const BUILTIN_STRONG = { glow: true };
export const BUILTIN_IDS = Object.keys(BUILTIN_COLORS);
export const builtinName = (id) => AURA_OPTIONS.find(o => o.id === id)?.name || id;

const validColors = (c) => Array.isArray(c) && c.length >= 2 && c.length <= MAX_AURA_COLORS && c.every(x => typeof x === 'string' && HEX.test(x));

// Lê os JSONs salvos com segurança: ignora qualquer item mal formado
export const parseCustomAuras = (raw) => {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(a => a && /^[a-z0-9]{3,12}$/.test(a.id) && typeof a.name === 'string' && a.name.trim() && validColors(a.colors))
      .slice(0, MAX_CUSTOM_AURAS)
      .map(a => ({ id: a.id, name: a.name.trim().slice(0, 30), colors: a.colors.map(c => c.toLowerCase()), strong: !!a.strong }));
  } catch {
    return [];
  }
};

// { gold: { name?, colors?, strong?, hidden? } } — só para ids das auras do sistema
export const parseAuraOverrides = (raw) => {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const out = {};
    for (const id of BUILTIN_IDS) {
      const o = obj[id];
      if (!o || typeof o !== 'object') continue;
      const clean = {};
      if (typeof o.name === 'string' && o.name.trim()) clean.name = o.name.trim().slice(0, 30);
      if (validColors(o.colors)) { clean.colors = o.colors.map(c => c.toLowerCase()); clean.strong = !!o.strong; }
      if (o.hidden === true) clean.hidden = true;
      if (Object.keys(clean).length) out[id] = clean;
    }
    return out;
  } catch {
    return {};
  }
};

// Opções para os seletores de aura (sem as ocultadas)
export const auraOptions = (lib = EMPTY_LIB) => [
  ...AURA_OPTIONS
    .filter(o => !lib.overrides[o.id]?.hidden)
    .map(o => (lib.overrides[o.id]?.name ? { ...o, name: lib.overrides[o.id].name } : o)),
  ...lib.custom.map(a => ({ id: customKey(a.id), name: `${a.name} (personalizada)` }))
];

const customStyle = (colors, strong) => ({
  className: `aura-custom${strong ? ' aura-glow' : ''}`,
  style: { '--aura-stops': [...colors, colors[0]].join(', ') }
});

// Classe CSS (e estilo, quando tem cores próprias) de uma chave de aura
export const auraProps = (key, lib = EMPTY_LIB) => {
  if (typeof key === 'string' && key.startsWith('custom-')) {
    const a = lib.custom.find(x => customKey(x.id) === key);
    return a ? customStyle(a.colors, a.strong) : { className: 'aura-none' }; // apagada: fica sem brilho
  }
  const ov = lib.overrides[key];
  if (ov?.hidden) return { className: 'aura-none' };
  if (ov?.colors) return customStyle(ov.colors, ov.strong);
  return { className: AURA_CLASS_MAP[key] || 'aura-none' };
};

export const auraLabel = (key, lib = EMPTY_LIB) => {
  const found = auraOptions(lib).find(o => o.id === key);
  return found ? found.name : 'Nenhuma';
};

// Opções do seletor, garantindo que o valor atual apareça mesmo se a aura foi ocultada/apagada
export const optionsFor = (lib, current) => {
  const opts = auraOptions(lib);
  if (!current || opts.some(o => o.id === current)) return opts;
  const known = BUILTIN_IDS.includes(current) ? `${builtinName(current)} (oculta)` : 'Aura removida';
  return [...opts, { id: current, name: known }];
};
