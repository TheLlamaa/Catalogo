import { STORE_NAME, STORE_EMAIL, STORE_WHATSAPP } from './config';
import { parseCustomAuras, parseAuraOverrides, type AuraLib } from './auras';
import { FONT_CHOICES, isHex, parseFaq, normalizeSocial, type FaqItem } from './theme';
import { NICHE } from './niche';
import type { SettingRow } from '../types';

// ---------------------------------------------------------------------------
// Tipos do schema de configurações
// ---------------------------------------------------------------------------

// Campo comum a todos os tipos de campo
interface SettingFieldBase {
  key: string;
  label: string;
  hint?: string;
}

// Campos de texto livre (valor guardado como string)
interface TextLikeField extends SettingFieldBase {
  type: 'text' | 'phone' | 'email' | 'social' | 'image';
  default: string;
  max?: number;
}

export interface TextareaField extends SettingFieldBase { type: 'textarea'; default: string; max?: number; rows?: number }
export interface ColorField extends SettingFieldBase { type: 'color'; default: string }
export interface DateField extends SettingFieldBase { type: 'date'; default: string }
export interface FaqField extends SettingFieldBase { type: 'faq'; default: string }
export interface SelectField extends SettingFieldBase {
  type: 'select';
  default: string;
  options: { value: string; label: string }[];
}
export interface RangeField extends SettingFieldBase {
  type: 'range';
  default: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}
export interface ToggleField extends SettingFieldBase { type: 'toggle'; default: boolean }

// União discriminada por "type": cada tipo traz só os campos que usa
export type SettingField = TextLikeField | TextareaField | ColorField | DateField | FaqField | SelectField | RangeField | ToggleField;

export interface SettingsGroup { id: string; label: string }

export interface SettingsSection {
  group: string;
  title: string;
  fields: SettingField[];
}

// Valor de "desfazer": o que havia nas chaves antes da última gravação
export interface SettingsBackup { t: string; v: Record<string, unknown> }

// Objeto mesclado devolvido por mergeSettings: padrões + valores válidos do banco.
// A assinatura de índice cobre chaves dinâmicas (ex.: acesso por field.key).
export interface Settings {
  [key: string]: unknown;
  primaryColor: string; fontChoice: string;
  logoUrl: string; logoSize: string; logoShowName: boolean;
  bannerEnabled: boolean; bannerText: string; bannerUntil: string; bannerColor: string; bannerImage: string;
  storeName: string; whatsapp: string; email: string;
  menuHome: string; menuCustom: string;
  catalogTitle: string; catalogSubtitle: string;
  cardBadge: string; cardTitle: string; cardText: string; cardButton: string;
  customTitle: string; customIntro: string; customSuccess: string;
  aboutEnabled: boolean; menuAbout: string; aboutTitle: string; aboutText: string; aboutImage: string;
  faqItems: string;
  showFeatured: boolean; featuredTitle: string; showPopular: boolean; popularTitle: string; showNew: boolean; newTitle: string;
  stockControl: boolean; customEnabled: boolean; leadTimeEnabled: boolean; aurasEnabled: boolean; modelLinkEnabled: boolean;
  lowStockBadge: boolean; relatedEnabled: boolean; relatedTitle: string;
  socialInstagram: string; socialTiktok: string; socialFacebook: string; socialYoutube: string;
  footerText: string;
  auraLib: AuraLib;
  faq: FaqItem[];
  backup: SettingsBackup | null;
}

// Tudo que o admin pode editar na aba "Site". O padrão é o texto original do site:
// campo vazio/igual ao padrão = nada fica salvo no banco.
// "group" decide em qual aba do painel a seção aparece.
export const GROUPS: SettingsGroup[] = [
  { id: 'aparencia', label: 'Aparência' },
  { id: 'textos', label: 'Textos e menus' },
  { id: 'conteudo', label: 'Sobre e perguntas' },
  { id: 'vitrine', label: 'Vitrine' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'contato', label: 'Redes e rodapé' }
];

export const SETTINGS_SCHEMA: SettingsSection[] = [
  {
    group: 'aparencia', title: 'Cores e fonte',
    fields: [
      { key: 'primaryColor', label: 'Cor principal', type: 'color', default: '', hint: 'Vazio = azul padrão. Prefira cores escuras ou médias: com cor clara o texto dos botões fica ruim de ler.' },
      { key: 'fontChoice', label: 'Fonte', type: 'select', default: 'padrao', options: FONT_CHOICES.map(f => ({ value: f.id, label: f.name })) },
    ]
  },
  {
    group: 'aparencia', title: 'Logo',
    fields: [
      { key: 'logoUrl', label: 'Logo da loja', type: 'image', default: '', max: 700, hint: 'Aparece no topo e na aba do navegador. PNG com fundo transparente fica melhor.' },
      { key: 'logoSize', label: 'Tamanho da logo', type: 'range', min: 24, max: 96, step: 4, unit: 'px', default: '36', hint: 'Altura no topo. No celular é limitada a 48 px.' },
      { key: 'logoShowName', label: 'Mostrar o nome da loja ao lado da logo', type: 'toggle', default: true },
    ]
  },
  {
    group: 'aparencia', title: 'Faixa de aviso no topo',
    fields: [
      { key: 'bannerEnabled', label: 'Faixa ligada', type: 'toggle', default: true },
      { key: 'bannerText', label: 'Texto da faixa', type: 'text', max: 160, default: '', hint: 'Ex: Pedidos de Natal até 10/12. Vazio = sem faixa.' },
      { key: 'bannerUntil', label: 'Mostrar até (opcional)', type: 'date', default: '', hint: 'Depois desse dia a faixa some sozinha.' },
      { key: 'bannerColor', label: 'Cor da faixa', type: 'color', default: '' },
      { key: 'bannerImage', label: 'Imagem de fundo da faixa (opcional)', type: 'image', default: '', max: 700, hint: 'Imagem larga e baixa; o texto fica por cima.' },
    ]
  },
  {
    group: 'textos', title: 'Identidade e contato',
    fields: [
      { key: 'storeName', label: 'Nome da loja', type: 'text', max: 60, default: STORE_NAME },
      { key: 'whatsapp', label: 'WhatsApp da loja', type: 'phone', default: STORE_WHATSAPP, hint: 'Recebe os pedidos. Ex: (48) 99999-9999' },
      { key: 'email', label: 'E-mail de contato', type: 'email', max: 120, default: STORE_EMAIL, hint: 'Aparece na política de privacidade. Opcional.' },
    ]
  },
  {
    group: 'textos', title: 'Menu',
    fields: [
      { key: 'menuHome', label: 'Nome do botão da vitrine', type: 'text', max: 24, default: 'Vitrine' },
      { key: 'menuCustom', label: 'Nome do botão de peças personalizadas', type: 'text', max: 24, default: 'Personalizado' },
    ]
  },
  {
    group: 'textos', title: 'Página inicial (vitrine)',
    fields: [
      { key: 'catalogTitle', label: 'Título', type: 'text', max: 80, default: 'Catálogo Completo' },
      { key: 'catalogSubtitle', label: 'Texto de apresentação', type: 'textarea', max: 300, default: NICHE.catalogSubtitle },
    ]
  },
  {
    group: 'textos', title: 'Card de destaque (peça personalizada)',
    fields: [
      { key: 'cardBadge', label: 'Etiqueta', type: 'text', max: 40, default: 'Destaque Especial' },
      { key: 'cardTitle', label: 'Título', type: 'text', max: 60, default: NICHE.customTitle },
      { key: 'cardText', label: 'Texto', type: 'textarea', max: 220, default: 'Precisa de um projeto exclusivo ou tem uma foto de referência? Envie sua ideia e criaremos um orçamento sob medida.' },
      { key: 'cardButton', label: 'Texto do botão', type: 'text', max: 40, default: 'Solicitar Orçamento' },
    ]
  },
  {
    group: 'textos', title: 'Página de peça personalizada',
    fields: [
      { key: 'customTitle', label: 'Título', type: 'text', max: 80, default: 'Solicitar Peça Personalizada' },
      { key: 'customIntro', label: 'Texto de apresentação', type: 'textarea', max: 300, default: 'Tem um modelo em mente ou uma foto de referência? Preencha os campos abaixo e entraremos em contato com um orçamento sob medida.' },
      { key: 'customSuccess', label: 'Mensagem depois de enviar', type: 'textarea', max: 300, default: 'Sua proposta e fotos foram recebidas com sucesso. Nossa equipe analisará os detalhes e entrará em contato com você pelo WhatsApp em breve!' },
    ]
  },
  {
    group: 'conteudo', title: 'Página "Sobre / Como funciona"',
    fields: [
      { key: 'aboutEnabled', label: 'Mostrar a página Sobre', type: 'toggle', default: false, hint: 'Cria o botão no menu, o link no rodapé e a página /sobre.' },
      { key: 'menuAbout', label: 'Nome do botão no menu', type: 'text', max: 24, default: 'Sobre' },
      { key: 'aboutTitle', label: 'Título da página', type: 'text', max: 80, default: 'Como funciona' },
      { key: 'aboutText', label: 'Texto', type: 'textarea', rows: 10, max: 3500, default: '', hint: 'Quem você é, materiais, prazos e entrega. Linha em branco = novo parágrafo.' },
      { key: 'aboutImage', label: 'Foto (opcional)', type: 'image', default: '', max: 700 },
    ]
  },
  {
    group: 'conteudo', title: 'Perguntas frequentes',
    fields: [
      { key: 'faqItems', label: 'Perguntas e respostas', type: 'faq', default: '', hint: 'Até 20 perguntas, na página Sobre.' },
    ]
  },
  {
    group: 'vitrine', title: 'Seções no topo da vitrine',
    fields: [
      { key: 'showFeatured', label: 'Mostrar "Destaques"', type: 'toggle', default: true },
      { key: 'featuredTitle', label: 'Título de Destaques', type: 'text', max: 40, default: 'Destaques' },
      { key: 'showPopular', label: 'Mostrar "Mais pedidos"', type: 'toggle', default: true },
      { key: 'popularTitle', label: 'Título de Mais pedidos', type: 'text', max: 40, default: 'Mais pedidos' },
      { key: 'showNew', label: 'Mostrar "Novidades"', type: 'toggle', default: true, hint: 'Produtos dos últimos 30 dias.' },
      { key: 'newTitle', label: 'Título de Novidades', type: 'text', max: 40, default: 'Novidades' },
    ]
  },
  {
    group: 'recursos', title: 'Recursos da loja',
    fields: [
      { key: 'stockControl', label: 'Controlar estoque', type: 'toggle', default: true, hint: 'Desligado: tudo fica sempre disponível e o estoque some do site e do cadastro.' },
      { key: 'customEnabled', label: 'Aceitar pedidos personalizados', type: 'toggle', default: true, hint: 'Desligado: some o botão do menu, o card de destaque e a página /custom.' },
      { key: 'leadTimeEnabled', label: 'Prazo de produção nos produtos', type: 'toggle', default: NICHE.features.leadTimeEnabled, hint: 'Mostra o campo “Prazo de produção” no cadastro e no site. Desligado, o que foi escrito fica guardado.' },
      { key: 'aurasEnabled', label: 'Efeito de aura (brilho) nos cards', type: 'toggle', default: NICHE.features.aurasEnabled, hint: 'Ativa a aba Auras e o brilho nos cards e categorias. Desligado, as escolhas ficam guardadas.' },
      { key: 'modelLinkEnabled', label: 'Link do modelo 3D no cadastro', type: 'toggle', default: NICHE.features.modelLinkEnabled, hint: 'Campo só seu para guardar o link do arquivo 3D. O cliente não vê.' },
    ]
  },
  {
    group: 'vitrine', title: 'Produtos',
    fields: [
      { key: 'lowStockBadge', label: 'Selo "Últimas unidades" automático', type: 'toggle', default: false, hint: 'Para produtos com 3 unidades ou menos e sem outro selo.' },
      { key: 'relatedEnabled', label: 'Mostrar produtos relacionados', type: 'toggle', default: true },
      { key: 'relatedTitle', label: 'Título dos relacionados', type: 'text', max: 60, default: 'Você também pode gostar' },
    ]
  },
  {
    group: 'contato', title: 'Redes sociais',
    fields: [
      { key: 'socialInstagram', label: 'Instagram', type: 'social', max: 200, default: '' },
      { key: 'socialTiktok', label: 'TikTok', type: 'social', max: 200, default: '' },
      { key: 'socialFacebook', label: 'Facebook', type: 'social', max: 200, default: '' },
      { key: 'socialYoutube', label: 'YouTube', type: 'social', max: 200, default: '' },
    ]
  },
  {
    group: 'contato', title: 'Rodapé',
    fields: [
      { key: 'footerText', label: 'Linha extra no rodapé', type: 'text', max: 160, default: '', hint: 'Ex: Atendimento de segunda a sexta, das 9h às 18h. Vazio = sem linha.' },
    ]
  }
];

export const SETTING_FIELDS: SettingField[] = SETTINGS_SCHEMA.flatMap(s => s.fields);
export const DEFAULT_SETTINGS: Record<string, string | boolean> = Object.fromEntries(SETTING_FIELDS.map(f => [f.key, f.default]));

// WhatsApp: aceita com ou sem 55; devolve só dígitos com 55 (ou '' se vazio)
export const normalizeWhatsapp = (value: unknown): string => {
  const d = String(value || '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
};
export const isValidWhatsapp = (value: unknown): boolean => /^55\d{10,11}$/.test(normalizeWhatsapp(value));

const isUrl = (v: string): boolean => { try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };

// Um valor guardado só vale se tiver o formato do campo (protege contra lixo no banco)
const validFor = (field: SettingField, value: string): boolean => {
  switch (field.type) {
    case 'color': return isHex(value);
    case 'select': return field.options.some(o => o.value === value);
    case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(value);
    case 'range': { const n = Number(value); return Number.isInteger(n) && n >= field.min && n <= field.max; }
    case 'image': return isUrl(value);
    case 'social': return !!normalizeSocial(field.key, value);
    default: return true;
  }
};

// Desfazer: guarda o valor antigo das chaves da última gravação
export const parseBackup = (value: string): SettingsBackup | null => {
  try {
    const o = JSON.parse(value);
    if (o && typeof o.t === 'string' && o.v && typeof o.v === 'object' && !Array.isArray(o.v)) return o;
  } catch { /* ignora */ }
  return null;
};

// Linhas do banco ({key, value}) por cima dos padrões
export const mergeSettings = (rows?: SettingRow[] | null): Settings => {
  // Os padrões cobrem todas as chaves conhecidas de Settings; o cast só informa isso ao compilador
  const out = { ...DEFAULT_SETTINGS, auraLib: { custom: [], overrides: {} }, faq: [], backup: null } as unknown as Settings;
  const byKey = new Map<string, SettingField>(SETTING_FIELDS.map(f => [f.key, f]));
  (rows || []).forEach(({ key, value }) => {
    if (key === 'customAuras') { out.auraLib.custom = parseCustomAuras(value); return; }
    if (key === 'auraOverrides') { out.auraLib.overrides = parseAuraOverrides(value); return; }
    if (key === 'settingsBackup') { out.backup = parseBackup(value); return; }
    const field = byKey.get(key);
    if (!field || typeof value !== 'string' || value.trim() === '') return;
    if (field.type === 'toggle') { out[key] = value !== 'false'; return; }
    if (!validFor(field, value)) return;
    out[key] = value;
    if (key === 'faqItems') out.faq = parseFaq(value);
  });
  return out;
};
