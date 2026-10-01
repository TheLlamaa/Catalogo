import { STORE_NAME, STORE_EMAIL, STORE_WHATSAPP } from './supabase';
import { parseCustomAuras } from './auras';

// Tudo que o admin pode editar na aba "Site". O padrão é o texto original do site:
// campo vazio/igual ao padrão = nada fica salvo no banco.
export const SETTINGS_SCHEMA = [
  {
    title: 'Identidade e contato',
    fields: [
      { key: 'storeName', label: 'Nome da loja', type: 'text', max: 60, default: STORE_NAME },
      { key: 'whatsapp', label: 'WhatsApp da loja', type: 'phone', default: STORE_WHATSAPP, hint: 'Recebe os pedidos. Ex: (48) 99999-9999' },
      { key: 'email', label: 'E-mail de contato', type: 'email', max: 120, default: STORE_EMAIL, hint: 'Aparece na política de privacidade. Pode ficar vazio.' },
      { key: 'bannerText', label: 'Faixa de aviso no topo', type: 'text', max: 160, default: '', hint: 'Ex: Pedidos feitos até sexta saem na semana que vem. Vazio = não mostra.' },
    ]
  },
  {
    title: 'Menu',
    fields: [
      { key: 'menuHome', label: 'Nome do botão da vitrine', type: 'text', max: 24, default: 'Vitrine' },
      { key: 'customEnabled', label: 'Aceitar peças personalizadas', type: 'toggle', default: true, hint: 'Desligado: some o botão do menu, o card de destaque e a página /custom.' },
      { key: 'menuCustom', label: 'Nome do botão de peças personalizadas', type: 'text', max: 24, default: 'Personalizado' },
    ]
  },
  {
    title: 'Página inicial (vitrine)',
    fields: [
      { key: 'catalogTitle', label: 'Título', type: 'text', max: 80, default: 'Catálogo Completo' },
      { key: 'catalogSubtitle', label: 'Texto de apresentação', type: 'textarea', max: 300, default: 'Explore nossa coleção de peças impressas em 3D. Clique em um produto para ver mais fotos e detalhes.' },
    ]
  },
  {
    title: 'Card de destaque (peça personalizada)',
    fields: [
      { key: 'cardBadge', label: 'Etiqueta', type: 'text', max: 40, default: 'Destaque Especial' },
      { key: 'cardTitle', label: 'Título', type: 'text', max: 60, default: 'Peça Personalizada' },
      { key: 'cardText', label: 'Texto', type: 'textarea', max: 220, default: 'Precisa de um projeto exclusivo ou tem uma foto de referência? Envie sua ideia e criaremos um orçamento sob medida.' },
      { key: 'cardButton', label: 'Texto do botão', type: 'text', max: 40, default: 'Solicitar Orçamento' },
    ]
  },
  {
    title: 'Página de peça personalizada',
    fields: [
      { key: 'customTitle', label: 'Título', type: 'text', max: 80, default: 'Solicitar Peça Personalizada' },
      { key: 'customIntro', label: 'Texto de apresentação', type: 'textarea', max: 300, default: 'Tem um modelo em mente ou uma foto de referência? Preencha os campos abaixo e entraremos em contato com um orçamento sob medida.' },
      { key: 'customSuccess', label: 'Mensagem depois de enviar', type: 'textarea', max: 300, default: 'Sua proposta e fotos foram recebidas com sucesso. Nossa equipe analisará os detalhes e entrará em contato com você pelo WhatsApp em breve!' },
    ]
  },
  {
    title: 'Rodapé',
    fields: [
      { key: 'footerText', label: 'Linha extra no rodapé', type: 'text', max: 160, default: '', hint: 'Ex: Atendimento de segunda a sexta, das 9h às 18h. Vazio = não mostra.' },
    ]
  }
];

export const SETTING_FIELDS = SETTINGS_SCHEMA.flatMap(s => s.fields);
export const DEFAULT_SETTINGS = Object.fromEntries(SETTING_FIELDS.map(f => [f.key, f.default]));

// WhatsApp: aceita com ou sem 55; devolve só dígitos com 55 (ou '' se vazio)
export const normalizeWhatsapp = (value) => {
  const d = String(value || '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
};
export const isValidWhatsapp = (value) => /^55\d{10,11}$/.test(normalizeWhatsapp(value));

// Linhas do banco ({key, value}) por cima dos padrões
export const mergeSettings = (rows) => {
  const out = { ...DEFAULT_SETTINGS, customAuras: [] };
  const allowed = new Set(SETTING_FIELDS.map(f => f.key));
  (rows || []).forEach(({ key, value }) => {
    if (key === 'customAuras') { out.customAuras = parseCustomAuras(value); return; }
    if (!allowed.has(key) || typeof value !== 'string' || value.trim() === '') return;
    const field = SETTING_FIELDS.find(f => f.key === key);
    out[key] = field.type === 'toggle' ? value !== 'false' : value;
  });
  return out;
};
