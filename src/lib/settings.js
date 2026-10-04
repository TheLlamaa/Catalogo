import { STORE_NAME, STORE_EMAIL, STORE_WHATSAPP } from './supabase';
import { parseCustomAuras, parseAuraOverrides } from './auras';
import { FONT_CHOICES, isHex, parseFaq, normalizeSocial } from './theme';
import { NICHE } from './niche';

// Tudo que o admin pode editar na aba "Site". O padrão é o texto original do site:
// campo vazio/igual ao padrão = nada fica salvo no banco.
// "group" decide em qual aba do painel a seção aparece.
export const GROUPS = [
  { id: 'aparencia', label: 'Aparência' },
  { id: 'textos', label: 'Textos e menus' },
  { id: 'conteudo', label: 'Sobre e perguntas' },
  { id: 'vitrine', label: 'Vitrine' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'contato', label: 'Redes e rodapé' }
];

export const SETTINGS_SCHEMA = [
  {
    group: 'aparencia', title: 'Cores e fonte',
    fields: [
      { key: 'primaryColor', label: 'Cor principal', type: 'color', default: '', hint: 'Muda botões, links e destaques do site inteiro. Vazio = azul padrão. Prefira cores escuras ou médias: com cor muito clara o texto branco dos botões fica ruim de ler.' },
      { key: 'fontChoice', label: 'Fonte', type: 'select', default: 'padrao', options: FONT_CHOICES.map(f => ({ value: f.id, label: f.name })), hint: 'Usa fontes que já existem no aparelho do cliente, então o site não fica mais lento.' },
    ]
  },
  {
    group: 'aparencia', title: 'Logo',
    fields: [
      { key: 'logoUrl', label: 'Logo da loja', type: 'image', default: '', max: 700, hint: 'Aparece no topo no lugar do ícone e vira o ícone da aba do navegador. PNG com fundo transparente fica melhor.' },
      { key: 'logoSize', label: 'Tamanho da logo', type: 'range', min: 24, max: 96, step: 4, unit: 'px', default: '36', hint: 'Altura da logo no topo. No celular ela é limitada a 48 px para não ocupar a tela.' },
      { key: 'logoShowName', label: 'Mostrar o nome da loja ao lado da logo', type: 'toggle', default: true },
    ]
  },
  {
    group: 'aparencia', title: 'Faixa de aviso no topo',
    fields: [
      { key: 'bannerEnabled', label: 'Faixa ligada', type: 'toggle', default: true, hint: 'Desligue para esconder a faixa sem apagar o texto.' },
      { key: 'bannerText', label: 'Texto da faixa', type: 'text', max: 160, default: '', hint: 'Ex: Pedidos de Natal até 10/12. Vazio = não mostra.' },
      { key: 'bannerUntil', label: 'Mostrar até (opcional)', type: 'date', default: '', hint: 'A faixa some sozinha depois desse dia. Vazio = fica até você tirar.' },
      { key: 'bannerColor', label: 'Cor da faixa', type: 'color', default: '', hint: 'Vazio = usa a cor principal.' },
      { key: 'bannerImage', label: 'Imagem de fundo da faixa (opcional)', type: 'image', default: '', max: 700, hint: 'Uma imagem larga e baixa. O texto fica por cima, com a cor da faixa escurecida para ler bem.' },
    ]
  },
  {
    group: 'textos', title: 'Identidade e contato',
    fields: [
      { key: 'storeName', label: 'Nome da loja', type: 'text', max: 60, default: STORE_NAME },
      { key: 'whatsapp', label: 'WhatsApp da loja', type: 'phone', default: STORE_WHATSAPP, hint: 'Recebe os pedidos. Ex: (48) 99999-9999' },
      { key: 'email', label: 'E-mail de contato', type: 'email', max: 120, default: STORE_EMAIL, hint: 'Aparece na política de privacidade. Pode ficar vazio.' },
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
      { key: 'aboutEnabled', label: 'Mostrar a página Sobre', type: 'toggle', default: false, hint: 'Ligado: aparece um botão no menu e um link no rodapé, e a página /sobre passa a existir.' },
      { key: 'menuAbout', label: 'Nome do botão no menu', type: 'text', max: 24, default: 'Sobre' },
      { key: 'aboutTitle', label: 'Título da página', type: 'text', max: 80, default: 'Como funciona' },
      { key: 'aboutText', label: 'Texto', type: 'textarea', rows: 10, max: 3500, default: '', hint: 'Conte quem você é, os materiais, prazos e formas de entrega. Linhas em branco viram parágrafos.' },
      { key: 'aboutImage', label: 'Foto (opcional)', type: 'image', default: '', max: 700 },
    ]
  },
  {
    group: 'conteudo', title: 'Perguntas frequentes',
    fields: [
      { key: 'faqItems', label: 'Perguntas e respostas', type: 'faq', default: '', hint: 'Aparecem na página Sobre. Até 20 perguntas.' },
    ]
  },
  {
    group: 'vitrine', title: 'Seções no topo da vitrine',
    fields: [
      { key: 'showFeatured', label: 'Mostrar "Destaques"', type: 'toggle', default: true, hint: 'Produtos marcados como Destaque no cadastro. Só aparece se houver algum.' },
      { key: 'featuredTitle', label: 'Título de Destaques', type: 'text', max: 40, default: 'Destaques' },
      { key: 'showPopular', label: 'Mostrar "Mais pedidos"', type: 'toggle', default: true, hint: 'Produtos que você marcar como Mais pedido no cadastro.' },
      { key: 'popularTitle', label: 'Título de Mais pedidos', type: 'text', max: 40, default: 'Mais pedidos' },
      { key: 'showNew', label: 'Mostrar "Novidades"', type: 'toggle', default: true, hint: 'Automático: produtos cadastrados nos últimos 30 dias.' },
      { key: 'newTitle', label: 'Título de Novidades', type: 'text', max: 40, default: 'Novidades' },
    ]
  },
  {
    group: 'recursos', title: 'Recursos da loja',
    fields: [
      { key: 'stockControl', label: 'Controlar estoque', type: 'toggle', default: true, hint: 'Desligado: todos os produtos ficam sempre disponíveis, sem limite de quantidade, e o estoque some do site e do cadastro.' },
      { key: 'customEnabled', label: 'Aceitar pedidos personalizados', type: 'toggle', default: true, hint: 'Desligado: some o botão do menu, o card de destaque e a página /custom.' },
      { key: 'leadTimeEnabled', label: 'Prazo de produção nos produtos', type: 'toggle', default: NICHE.features.leadTimeEnabled, hint: 'Ligado: o cadastro ganha o campo "Prazo de produção" e ele aparece no site. Desligado: some dos dois (o que já foi escrito fica guardado).' },
      { key: 'aurasEnabled', label: 'Efeito de aura (brilho) nos cards', type: 'toggle', default: NICHE.features.aurasEnabled, hint: 'Ligado: aba Auras no painel, e brilho colorido nos cards e categorias. Desligado: tudo isso some (as escolhas feitas ficam guardadas).' },
      { key: 'modelLinkEnabled', label: 'Link do modelo 3D no cadastro', type: 'toggle', default: NICHE.features.modelLinkEnabled, hint: 'Campo só seu, para guardar o link do arquivo 3D de cada produto. O cliente nunca vê.' },
    ]
  },
  {
    group: 'vitrine', title: 'Produtos',
    fields: [
      { key: 'lowStockBadge', label: 'Selo "Últimas unidades" automático', type: 'toggle', default: false, hint: 'Aparece nos produtos com 3 unidades ou menos que não tenham outro selo.' },
      { key: 'relatedEnabled', label: 'Mostrar produtos relacionados', type: 'toggle', default: true, hint: 'Na página do produto, sugere outros da mesma categoria.' },
      { key: 'relatedTitle', label: 'Título dos relacionados', type: 'text', max: 60, default: 'Você também pode gostar' },
    ]
  },
  {
    group: 'contato', title: 'Redes sociais',
    fields: [
      { key: 'socialInstagram', label: 'Instagram', type: 'social', max: 200, default: '', hint: '@usuario ou o link do perfil.' },
      { key: 'socialTiktok', label: 'TikTok', type: 'social', max: 200, default: '' },
      { key: 'socialFacebook', label: 'Facebook', type: 'social', max: 200, default: '' },
      { key: 'socialYoutube', label: 'YouTube', type: 'social', max: 200, default: '' },
    ]
  },
  {
    group: 'contato', title: 'Rodapé',
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

const isUrl = (v) => { try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };

// Um valor guardado só vale se tiver o formato do campo (protege contra lixo no banco)
const validFor = (field, value) => {
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
export const parseBackup = (value) => {
  try {
    const o = JSON.parse(value);
    if (o && typeof o.t === 'string' && o.v && typeof o.v === 'object' && !Array.isArray(o.v)) return o;
  } catch { /* ignora */ }
  return null;
};

// Linhas do banco ({key, value}) por cima dos padrões
export const mergeSettings = (rows) => {
  const out = { ...DEFAULT_SETTINGS, auraLib: { custom: [], overrides: {} }, faq: [], backup: null };
  const byKey = new Map(SETTING_FIELDS.map(f => [f.key, f]));
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
