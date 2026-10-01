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
// Auras personalizadas (criadas no painel admin, aba "Auras")
// Ficam no banco como JSON; o produto/categoria guarda a chave "custom-<id>".
// ---------------------------------------------------------------------------
const HEX = /^#[0-9a-f]{6}$/i;
export const MAX_CUSTOM_AURAS = 20;
export const customKey = (id) => `custom-${id}`;

// Lê o JSON salvo com segurança: ignora qualquer item mal formado
export const parseCustomAuras = (raw) => {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(a => a && /^[a-z0-9]{3,12}$/.test(a.id) && typeof a.name === 'string' && a.name.trim()
        && Array.isArray(a.colors) && a.colors.length >= 2 && a.colors.length <= 6 && a.colors.every(c => HEX.test(c)))
      .slice(0, MAX_CUSTOM_AURAS)
      .map(a => ({ id: a.id, name: a.name.trim().slice(0, 30), colors: a.colors.map(c => c.toLowerCase()), strong: !!a.strong }));
  } catch {
    return [];
  }
};

export const auraOptions = (custom = []) => [
  ...AURA_OPTIONS,
  ...custom.map(a => ({ id: customKey(a.id), name: `${a.name} (personalizada)` }))
];

// Classe CSS (e estilo, no caso das personalizadas) de uma chave de aura
export const auraProps = (key, custom = []) => {
  if (typeof key === 'string' && key.startsWith('custom-')) {
    const a = custom.find(x => customKey(x.id) === key);
    if (!a) return { className: 'aura-none' }; // aura apagada: o produto fica sem brilho
    return { className: `aura-custom${a.strong ? ' aura-glow' : ''}`, style: { '--aura-stops': [...a.colors, a.colors[0]].join(', ') } };
  }
  return { className: AURA_CLASS_MAP[key] || 'aura-none' };
};

export const auraLabel = (key, custom = []) => {
  const found = auraOptions(custom).find(o => o.id === key);
  return found ? found.name : 'Nenhuma';
};
