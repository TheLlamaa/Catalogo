import { STORE_NAME, STORE_EMAIL, STORE_WHATSAPP } from './config';
import { normalizeWhatsapp } from './whatsapp';
import { parseCustomAuras, parseAuraOverrides, type AuraLib } from './auras';
import { SITE_FONT_CHOICES } from './siteFont';
import { BG_TONES, CARD_STYLES, GRID_COLUMNS, isHex, parseFaq, normalizeSocial, type FaqItem } from './theme';
import { NICHE } from './niche';
import { BRAND_FONTS, NAME_WEIGHTS, NAME_CASES, NAME_SPACINGS, NAME_COLORS, LOGO_SHAPES, BRAND_LAYOUTS } from './brand';
import { PAGE_KEYS, buildPages, isCompletePage, type ExtraPage } from './pages';
import type { ImageGuideKey } from './imageGuides';
import { MAX_TOP, MAX_FOOT, parseMenu, type MenuItem } from './menus';
import { HINTS } from './settingsHints';
import { TEXTS, TEXT_SECTIONS } from './texts';
import { BLOCK_KEYS, buildBlocks, parseBlockDraft, type HomeBlock } from './blocks';
import { parseOrder } from './homeSections';
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
  type: 'text' | 'phone' | 'email' | 'social' | 'image' | 'url';
  default: string;
  max?: number;
  guide?: ImageGuideKey; // campos de imagem: orientação de tamanho mostrada abaixo do envio
}

export interface TextareaField extends SettingFieldBase { type: 'textarea'; default: string; max?: number; rows?: number }
export interface ColorField extends SettingFieldBase { type: 'color'; default: string }
export interface DateField extends SettingFieldBase { type: 'date'; default: string }
export interface FaqField extends SettingFieldBase { type: 'faq'; default: string }
export interface MenuField extends SettingFieldBase { type: 'menu'; default: string }
export interface PageField extends SettingFieldBase { type: 'page'; default: string }
export interface SectionsField extends SettingFieldBase { type: 'sections'; default: string }
export interface BlockField extends SettingFieldBase { type: 'block'; default: string }
export interface SelectField extends SettingFieldBase {
  type: 'select';
  default: string;
  options: { value: string; label: string }[];
  display?: 'columns' | 'corners' | 'font' | 'tone' | 'sort' | 'layout' | 'shape' | 'brandfont'; // mostra exemplos visuais em vez de lista
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
export type SettingField = TextLikeField | TextareaField | ColorField | DateField | FaqField | PageField | SectionsField | BlockField | MenuField | SelectField | RangeField | ToggleField;

export interface SettingsGroup { id: string; label: string; description: string; sections: string[] }

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
  primaryColor: string; fontChoice: string; bgTone: string; darkMode: string; cardStyle: string; gridCols: string; heroImage: string; homeLayout: string; showCategoryTiles: boolean;
  showCustomBand: boolean; customBandRows: string; showCardBadge: boolean; showHeroCategories: boolean; showHeroMosaic: boolean; showCategoryTabs: boolean;
  showHowItWorks: boolean; showHowCustom: boolean; howTitle: string; howCustomText: string;
  stepOneTitle: string; stepOneText: string; stepTwoTitle: string; stepTwoText: string; stepThreeTitle: string; stepThreeText: string;
  faviconUrl: string; seoTitle: string; seoDescription: string; seoImage: string;
  logoUrl: string; logoSize: string; logoShowName: boolean; logoSizeMobile: string; logoShape: string; brandLayout: string;
  nameImage: string; nameImageSize: string; nameFont: string; nameSize: string; nameSizeMobile: string; nameWeight: string;
  nameItalic: boolean; nameCase: string; nameSpacing: string; nameColorMode: string; nameColor: string; storeTagline: string;
  bannerEnabled: boolean; bannerText: string; bannerUntil: string; bannerColor: string; bannerImage: string;
  storeName: string; whatsapp: string; email: string;
  menuHome: string; menuCustom: string;
  catalogTitle: string; catalogSubtitle: string;
  cardBadge: string; cardTitle: string; cardText: string; cardButton: string;
  customTitle: string; customIntro: string; customSuccess: string;
  cartTitle: string; cartEmpty: string; cartIntro: string; addToCartLabel: string;
  orderDoneTitle: string; orderDoneText: string; whatsappButton: string; orderMessageIntro: string; customMessage: string;
  aboutEnabled: boolean; menuAbout: string; aboutTitle: string; aboutText: string; aboutImage: string;
  faqItems: string; privacyText: string;
  showFeatured: boolean; featuredTitle: string; showPopular: boolean; popularTitle: string; showNew: boolean; newTitle: string;
  stockControl: boolean; customEnabled: boolean; leadTimeEnabled: boolean; aurasEnabled: boolean; modelLinkEnabled: boolean;
  lowStockBadge: boolean; relatedEnabled: boolean; relatedTitle: string;
  defaultSort: string; showSearch: boolean; hidePrices: boolean; badgeColor: string; lowStockText: string;
  ordersPaused: boolean; pausedMessage: string; minOrder: string; deliveryEnabled: boolean; notesEnabled: boolean; deliveryNote: string;
  socialInstagram: string; socialTiktok: string; socialFacebook: string; socialYoutube: string; socialPinterest: string; socialX: string; socialLinkedin: string;
  footerText: string; address: string; openingHours: string; mapLink: string; showEmailFooter: boolean; showAdminLink: boolean;
  pageSize: string; showSort: boolean; showCardDescription: boolean; showCardLeadTime: boolean; showCopyLink: boolean; showStockCount: boolean;
  relatedCount: string; lowStockMax: string; newDays: string; newMax: string;
  auraLib: AuraLib;
  faq: FaqItem[];
  pages: ExtraPage[];
  homeSections: string; blockA: string; blockB: string; blockC: string; blockD: string; blockE: string; blockF: string;
  blocks: HomeBlock[]; // blocos extras da página inicial, prontos para mostrar
  homeOrder: string[]; // ordem das seções da página inicial
  menus: { top: MenuItem[]; foot: MenuItem[] };
  backup: SettingsBackup | null;
}

// Tudo que o admin pode editar na aba "Site". O padrão é o texto original do site:
// campo vazio/igual ao padrão = nada fica salvo no banco.
// O grupo de cada seção vem de GROUPS (lista "sections"), que também define a ordem na tela.
export const GROUPS: SettingsGroup[] = [
  { id: 'aparencia', label: 'Aparência', description: 'Logo, nome da loja no topo, cores, fonte e o formato dos cards. Vale para o site inteiro.',
    sections: ['Cores e fonte', 'Logo', 'Nome da loja no topo', 'Estilo dos cards'] },
  { id: 'inicio', label: 'Página inicial', description: 'O que o cliente vê ao abrir o site: modelo, capa, faixa de aviso, passo a passo e as seções Destaques, Mais pedidos e Novidades.',
    sections: ['Modelo da página inicial', 'Seções e blocos', 'Blocos da página inicial', 'Seções no topo da vitrine', 'Capa da vitrine', 'Página inicial (vitrine)', 'Faixa de aviso no topo', 'Passo a passo do pedido'] },
  { id: 'produtos', label: 'Loja e produtos', description: 'Como os produtos aparecem: ordem, busca, preços, a janela do produto, selos e relacionados.',
    sections: ['Exibição da vitrine', 'Janela do produto', 'Selos e estoque baixo'] },
  { id: 'pedidos', label: 'Pedidos e carrinho', description: 'Pausar pedidos, pedido mínimo, entrega, textos do carrinho e a página de peça personalizada.',
    sections: ['Pedidos', 'Carrinho e pedido', 'Faixa de destaque (peça personalizada)', 'Página de peça personalizada'] },
  { id: 'textos', label: 'Textos e mensagens', description: 'Todos os textos de botões, avisos, formulários e estados vazios da vitrine. O que você não mudar continua como está.',
    sections: TEXT_SECTIONS },
  { id: 'menus', label: 'Menus e páginas', description: 'Menu do topo, rodapé, página Sobre, perguntas frequentes, páginas extras e política de privacidade.',
    sections: ['Menu do topo', 'Nomes dos botões do menu', 'Links do rodapé', 'Páginas', 'Página "Sobre / Como funciona"', 'Perguntas frequentes', 'Política de privacidade'] },
  { id: 'contato', label: 'Contato e redes', description: 'Nome da loja, WhatsApp, e-mail, redes sociais e a linha extra do rodapé.',
    sections: ['Identidade e contato', 'Redes sociais', 'Rodapé'] },
  { id: 'seo', label: 'Google e compartilhamento', description: 'Como o site aparece no Google e quando o link é compartilhado no WhatsApp e nas redes.',
    sections: ['Google e compartilhamento'] },
  { id: 'avancado', label: 'Avançado', description: 'Liga e desliga funções da loja: estoque, pedidos personalizados, prazo de produção, auras e link do modelo 3D.',
    sections: ['Recursos da loja'] }
];

// Modelos da página inicial (features/vitrine/home)
export const HOME_LAYOUTS = [
  { id: 'classico', name: 'Clássico' },
  { id: 'vitrine', name: 'Vitrine' },
  { id: 'bancada', name: 'Bancada' },
  { id: 'mista', name: 'Vitrine + Bancada' },
];

const RAW_SCHEMA: SettingsSection[] = [
  {
    group: 'aparencia', title: 'Cores e fonte',
    fields: [
      { key: 'primaryColor', label: 'Cor principal', type: 'color', default: '', hint: 'Vazio = azul padrão. Prefira cores escuras ou médias: com cor clara o texto dos botões fica ruim de ler.' },
      { key: 'fontChoice', label: 'Fonte', type: 'select', display: 'font', default: 'padrao', options: SITE_FONT_CHOICES.map(f => ({ value: f.id, label: f.name })) },
      { key: 'bgTone', label: 'Fundo da loja', type: 'select', display: 'tone', default: 'padrao', options: BG_TONES.map(t => ({ value: t.id, label: t.name })) },
      { key: 'darkMode', label: 'Modo escuro na vitrine', type: 'select', default: 'auto', options: [{ value: 'auto', label: 'Cliente escolhe (segue o aparelho, com botão sol/lua)' }, { value: 'dark', label: 'Escuro por padrão (o cliente pode trocar para o claro)' }, { value: 'off', label: 'Sempre claro' }], hint: 'No modo escuro o fundo escolhido acima não é usado; a cor principal continua.' },
    ]
  },
  {
    group: 'aparencia', title: 'Estilo dos cards',
    fields: [
      { key: 'cardStyle', label: 'Cantos', type: 'select', display: 'corners', default: 'arredondado', options: CARD_STYLES.map(c => ({ value: c.id, label: c.name })), hint: 'Vale para cards, caixas e janelas.' },
      { key: 'gridCols', label: 'Produtos por linha (computador)', type: 'select', display: 'columns', default: '3', options: GRID_COLUMNS.map(n => ({ value: n, label: `${n} colunas` })) },
    ]
  },
  {
    group: 'inicio', title: 'Modelo da página inicial',
    fields: [
      { key: 'homeLayout', label: 'Modelo', type: 'select', display: 'layout', default: 'classico', options: HOME_LAYOUTS.map(l => ({ value: l.id, label: l.name })),
        hint: 'Clássico: categorias na lateral e as seções Destaques, Mais pedidos e Novidades. Vitrine: as fotos dos Destaques abrem a página e as categorias viram abas. Bancada: busca grande, atalhos de categoria e o passo a passo do pedido. Vitrine + Bancada: a capa e o passo a passo da Bancada com a grade de fotos e as abas da Vitrine.' },
    ]
  },
  {
    group: 'inicio', title: 'Seções e blocos',
    fields: [
      { key: 'homeSections', label: 'Ordem das seções', type: 'sections', default: '', hint: 'Arraste para cima ou para baixo (setas) e ligue ou desligue cada seção. Cada modelo mostra só as seções que ele tem.' },
      ...BLOCK_KEYS.map((key, i): SettingField => ({ key, label: `Bloco extra ${i + 1}`, type: 'block', default: '' })),
    ]
  },
  {
    group: 'inicio', title: 'Blocos da página inicial',
    fields: [
      { key: 'showCustomBand', label: 'Faixa "Peça personalizada"', type: 'toggle', default: true, hint: 'Todos os modelos. Fica no meio da lista de produtos; os textos estão em Peça personalizada. Só aparece com pedidos personalizados ligados em Recursos.' },
      { key: 'customBandRows', label: 'Posição da faixa', type: 'select', default: '2', options: [{ value: '1', label: 'Depois da 1ª linha de produtos' }, { value: '2', label: 'Depois da 2ª linha' }, { value: '3', label: 'Depois da 3ª linha' }, { value: 'inicio', label: 'Antes dos produtos' }, { value: 'fim', label: 'Depois de todos os produtos' }] },
      { key: 'showHeroMosaic', label: 'Fotos dos Destaques na capa', type: 'toggle', default: true, hint: 'Modelo Vitrine. Desligado, a capa fica só com o texto (ou com a imagem de capa, se houver).' },
      { key: 'showHeroCategories', label: 'Atalhos de categoria na capa', type: 'toggle', default: true, hint: 'Modelos Bancada e Vitrine + Bancada.' },
      { key: 'showCategoryTiles', label: '"Por categoria" com fotos', type: 'toggle', default: false, hint: 'Modelos Bancada e Vitrine + Bancada: uma linha com a foto de cada categoria, abaixo da capa.' },
      { key: 'showHowItWorks', label: 'Passo a passo do pedido', type: 'toggle', default: true, hint: 'Modelos Bancada e Vitrine + Bancada. Os textos estão logo abaixo, em Passo a passo do pedido.' },
      { key: 'showHowCustom', label: 'Pedido personalizado ao lado do passo a passo', type: 'toggle', default: true },
      { key: 'showCategoryTabs', label: 'Abas de categoria acima dos produtos', type: 'toggle', default: true, hint: 'Modelos Vitrine e Vitrine + Bancada.' },
    ]
  },
  {
    group: 'inicio', title: 'Passo a passo do pedido',
    fields: [
      { key: 'howTitle', label: 'Título', type: 'text', max: 60, default: 'Como funciona o pedido' },
      { key: 'stepOneTitle', label: 'Passo 1: título', type: 'text', max: 40, default: 'Escolha os produtos' },
      { key: 'stepOneText', label: 'Passo 1: texto', type: 'textarea', max: 160, default: 'Adicione ao orçamento o que gostou e escolha as opções, como cor ou tamanho.' },
      { key: 'stepTwoTitle', label: 'Passo 2: título', type: 'text', max: 40, default: 'Envie o pedido' },
      { key: 'stepTwoText', label: 'Passo 2: texto', type: 'textarea', max: 160, default: 'Ele chega pra gente com tudo anotado, sem pagamento na hora.' },
      { key: 'stepThreeTitle', label: 'Passo 3: título', type: 'text', max: 40, default: 'Combine pelo WhatsApp' },
      { key: 'stepThreeText', label: 'Passo 3: texto', type: 'textarea', max: 160, default: 'Confirmamos valor, prazo e forma de entrega com você.' },
      { key: 'howCustomText', label: 'Texto ao lado (pedido personalizado)', type: 'text', max: 120, default: 'Mande uma foto ou a ideia e a gente faz para você.' },
    ]
  },
  {
    group: 'inicio', title: 'Capa da vitrine',
    fields: [
      { key: 'heroImage', label: 'Imagem de capa (opcional)', type: 'image', guide: 'hero', default: '', max: 700, hint: 'Aparece no topo da página inicial, com o título e o texto por cima.' },
    ]
  },
  {
    group: 'aparencia', title: 'Logo',
    fields: [
      { key: 'logoUrl', label: 'Logo da loja', type: 'image', guide: 'logo', default: '', max: 700, hint: 'Aparece no topo e na aba do navegador.' },
      { key: 'logoShape', label: 'Formato da logo', type: 'select', display: 'shape', default: 'original', options: LOGO_SHAPES },
      { key: 'logoSize', label: 'Tamanho da logo (computador)', type: 'range', min: 24, max: 128, step: 4, unit: 'px', default: '36', hint: 'Altura no topo.' },
      { key: 'logoSizeMobile', label: 'Tamanho da logo (celular)', type: 'range', min: 24, max: 80, step: 4, unit: 'px', default: '48', hint: 'Não passa do tamanho do computador.' },
      { key: 'faviconUrl', label: 'Ícone da aba (opcional)', type: 'image', guide: 'favicon', default: '', max: 700, hint: 'Vazio = usa a logo.' },
    ]
  },
  {
    group: 'aparencia', title: 'Nome da loja no topo',
    fields: [
      { key: 'logoShowName', label: 'Mostrar o nome da loja', type: 'toggle', default: true, hint: 'Sem logo, o nome sempre aparece.' },
      { key: 'brandLayout', label: 'Posição do nome', type: 'select', default: 'lado', options: BRAND_LAYOUTS },
      { key: 'nameImage', label: 'Imagem no lugar do nome (opcional)', type: 'image', guide: 'wordmark', default: '', max: 700, hint: 'Use se o nome da loja já é um desenho (letreiro). Com imagem, as opções de fonte abaixo não são usadas.' },
      { key: 'nameImageSize', label: 'Altura da imagem do nome', type: 'range', min: 16, max: 96, step: 2, unit: 'px', default: '32', hint: 'No celular, no máximo 40 px.' },
      { key: 'nameFont', label: 'Fonte do nome', type: 'select', display: 'brandfont', default: 'site', options: BRAND_FONTS.map(f => ({ value: f.id, label: f.name })) },
      { key: 'nameSize', label: 'Tamanho do nome (computador)', type: 'range', min: 12, max: 56, step: 1, unit: 'px', default: '18' },
      { key: 'nameSizeMobile', label: 'Tamanho do nome (celular)', type: 'range', min: 12, max: 40, step: 1, unit: 'px', default: '18', hint: 'Não passa do tamanho do computador.' },
      { key: 'nameWeight', label: 'Espessura da letra', type: 'select', default: '700', options: NAME_WEIGHTS, hint: 'Algumas fontes têm uma espessura só; aí vale a mais próxima.' },
      { key: 'nameItalic', label: 'Itálico', type: 'toggle', default: false },
      { key: 'nameCase', label: 'Maiúsculas e minúsculas', type: 'select', default: 'normal', options: NAME_CASES },
      { key: 'nameSpacing', label: 'Espaço entre as letras', type: 'select', default: 'apertado', options: NAME_SPACINGS.map(({ value, label }) => ({ value, label })) },
      { key: 'nameColorMode', label: 'Cor do nome', type: 'select', default: 'texto', options: NAME_COLORS },
      { key: 'nameColor', label: 'Cor escolhida', type: 'color', default: '', hint: 'Usada quando "Cor do nome" é "Escolher uma cor". No modo escuro, cor muito escura volta à cor do texto.' },
      { key: 'storeTagline', label: 'Frase abaixo do nome (opcional)', type: 'text', max: 60, default: '', hint: 'Ex.: Impressão 3D sob medida' },
    ]
  },
  {
    group: 'inicio', title: 'Faixa de aviso no topo',
    fields: [
      { key: 'bannerEnabled', label: 'Faixa ligada', type: 'toggle', default: true },
      { key: 'bannerText', label: 'Texto da faixa', type: 'text', max: 160, default: '', hint: 'Ex: Pedidos de Natal até 10/12. Vazio = sem faixa.' },
      { key: 'bannerUntil', label: 'Mostrar até (opcional)', type: 'date', default: '', hint: 'Depois desse dia a faixa some sozinha.' },
      { key: 'bannerColor', label: 'Cor da faixa', type: 'color', default: '' },
      { key: 'bannerImage', label: 'Imagem de fundo da faixa (opcional)', type: 'image', guide: 'banner', default: '', max: 700, hint: 'O texto da faixa fica por cima.' },
    ]
  },
  {
    group: 'contato', title: 'Identidade e contato',
    fields: [
      { key: 'storeName', label: 'Nome da loja', type: 'text', max: 60, default: STORE_NAME },
      { key: 'whatsapp', label: 'WhatsApp da loja', type: 'phone', default: STORE_WHATSAPP, hint: 'Recebe os pedidos. Ex: (48) 99999-9999' },
      { key: 'email', label: 'E-mail de contato', type: 'email', max: 120, default: STORE_EMAIL, hint: 'Aparece na política de privacidade. Opcional.' },
      { key: 'address', label: 'Endereço da loja', type: 'text', max: 160, default: '', hint: 'Ex: Rua das Flores, 10, Centro, Florianópolis. Aparece no rodapé. Vazio = não mostra.' },
      { key: 'openingHours', label: 'Horário de atendimento', type: 'text', max: 120, default: '', hint: 'Ex: Segunda a sexta, das 9h às 18h. Aparece no rodapé. Vazio = não mostra.' },
      { key: 'mapLink', label: 'Link do mapa', type: 'url', max: 300, default: '', hint: 'Link do Google Maps (começa com https://). Cria o link "Como chegar" no rodapé.' },
      { key: 'showEmailFooter', label: 'Mostrar o e-mail no rodapé', type: 'toggle', default: false, hint: 'O e-mail de contato aparece como link no rodapé.' },
    ]
  },
  {
    group: 'inicio', title: 'Página inicial (vitrine)',
    fields: [
      { key: 'catalogTitle', label: 'Título', type: 'text', max: 80, default: 'Catálogo Completo' },
      { key: 'catalogSubtitle', label: 'Texto de apresentação', type: 'textarea', max: 300, default: NICHE.catalogSubtitle },
    ]
  },
  {
    group: 'pedidos', title: 'Faixa de destaque (peça personalizada)',
    fields: [
      { key: 'showCardBadge', label: 'Mostrar a etiqueta na faixa', type: 'toggle', default: false },
      { key: 'cardBadge', label: 'Etiqueta', type: 'text', max: 40, default: 'Destaque Especial' },
      { key: 'cardTitle', label: 'Título', type: 'text', max: 60, default: NICHE.customTitle },
      { key: 'cardText', label: 'Texto', type: 'textarea', max: 220, default: 'Precisa de um projeto exclusivo ou tem uma foto de referência? Envie sua ideia e criaremos um orçamento sob medida.' },
      { key: 'cardButton', label: 'Texto do botão', type: 'text', max: 40, default: 'Solicitar Orçamento' },
    ]
  },
  {
    group: 'pedidos', title: 'Página de peça personalizada',
    fields: [
      { key: 'customTitle', label: 'Título', type: 'text', max: 80, default: 'Solicitar Peça Personalizada' },
      { key: 'customIntro', label: 'Texto de apresentação', type: 'textarea', max: 300, default: 'Tem um modelo em mente ou uma foto de referência? Preencha os campos abaixo e entraremos em contato com um orçamento sob medida.' },
      { key: 'customSuccess', label: 'Mensagem depois de enviar', type: 'textarea', max: 300, default: 'Sua proposta e fotos foram recebidas com sucesso. Nossa equipe analisará os detalhes e entrará em contato com você pelo WhatsApp em breve!' },
    ]
  },
  {
    group: 'menus', title: 'Páginas',
    fields: PAGE_KEYS.map((key, i): SettingField => ({ key, label: `Página ${i + 1}`, type: 'page', default: '' }))
  },
  {
    group: 'menus', title: 'Menu do topo',
    fields: [{ key: 'menuTop', label: 'Menu do topo', type: 'menu', default: '', hint: 'Ordem e itens do menu no alto da loja. Vitrine, Sobre e Personalizado podem mudar de lugar, mas não saem.' }]
  },
  {
    group: 'menus', title: 'Nomes dos botões do menu',
    fields: [
      { key: 'menuHome', label: 'Nome do botão da vitrine', type: 'text', max: 24, default: 'Vitrine' },
      { key: 'menuAbout', label: 'Nome do botão “Sobre”', type: 'text', max: 24, default: 'Sobre' },
      { key: 'menuCustom', label: 'Nome do botão de peças personalizadas', type: 'text', max: 24, default: 'Personalizado' },
    ]
  },
  {
    group: 'menus', title: 'Links do rodapé',
    fields: [{ key: 'menuFoot', label: 'Links extras do rodapé', type: 'menu', default: '', hint: 'Páginas, categorias e links externos que aparecem no rodapé, além de Sobre, redes sociais, WhatsApp e privacidade.' }]
  },
  {
    group: 'menus', title: 'Política de privacidade',
    fields: [
      { key: 'privacyText', label: 'Texto próprio da política', type: 'textarea', rows: 10, max: 4000, default: '', hint: 'Vazio = usa o texto padrão do site. Linha em branco = novo parágrafo.' },
    ]
  },
  {
    group: 'pedidos', title: 'Pedidos',
    fields: [
      { key: 'ordersPaused', label: 'Pausar pedidos', type: 'toggle', default: false, hint: 'Ótimo para férias ou fila cheia: o site continua no ar, mas não aceita novos pedidos.' },
      { key: 'pausedMessage', label: 'Aviso enquanto pausado', type: 'textarea', rows: 2, max: 200, default: 'Estamos sem receber pedidos no momento. Volte em breve!' },
      { key: 'minOrder', label: 'Pedido mínimo (R$)', type: 'text', max: 8, default: '', hint: 'Ex: 30. Vazio = sem mínimo. O carrinho avisa o cliente.' },
      { key: 'deliveryEnabled', label: 'Oferecer entrega', type: 'toggle', default: true, hint: 'Desligado: só retirada, sem pedir endereço.' },
      { key: 'deliveryNote', label: 'Aviso sobre frete e prazo', type: 'text', max: 160, default: 'O frete é combinado com você pelo WhatsApp.', hint: 'Aparece abaixo do endereço de entrega.' },
      { key: 'notesEnabled', label: 'Pedir observações', type: 'toggle', default: true },
    ]
  },
  {
    group: 'pedidos', title: 'Carrinho e pedido',
    fields: [
      { key: 'addToCartLabel', label: 'Botão de adicionar ao carrinho', type: 'text', max: 40, default: 'Adicionar ao Orçamento' },
      { key: 'cartTitle', label: 'Título do carrinho', type: 'text', max: 40, default: 'Seu Orçamento' },
      { key: 'cartEmpty', label: 'Mensagem do carrinho vazio', type: 'text', max: 80, default: 'Seu orçamento está vazio.' },
      { key: 'cartIntro', label: 'Texto acima dos dados de contato', type: 'text', max: 160, default: 'Preencha seus dados para registrarmos seu pedido de orçamento.' },
      { key: 'orderDoneTitle', label: 'Título depois de enviar o pedido', type: 'text', max: 60, default: 'Pedido Registrado!' },
      { key: 'orderDoneText', label: 'Mensagem depois de enviar o pedido', type: 'textarea', max: 300, default: 'Recebemos sua solicitação de orçamento. Entraremos em contato com você via WhatsApp para confirmar os detalhes.' },
      { key: 'whatsappButton', label: 'Botão do WhatsApp', type: 'text', max: 40, default: 'Continuar no WhatsApp' },
      { key: 'orderMessageIntro', label: 'Abertura da mensagem do pedido no WhatsApp', type: 'text', max: 200, default: 'Olá! Acabei de enviar um pedido pelo site. Meu nome é {nome}.', hint: 'Use {nome} para o nome do cliente. Os itens, o total e a entrega vêm logo abaixo.' },
      { key: 'customMessage', label: 'Mensagem do WhatsApp (peça personalizada)', type: 'text', max: 200, default: 'Olá! Meu nome é {nome}. Acabei de enviar uma solicitação de peça personalizada pelo site.', hint: 'Use {nome} para o nome do cliente.' },
    ]
  },
  {
    group: 'menus', title: 'Página "Sobre / Como funciona"',
    fields: [
      { key: 'aboutEnabled', label: 'Mostrar a página Sobre', type: 'toggle', default: false, hint: 'Cria o botão no menu, o link no rodapé e a página /sobre.' },
      { key: 'aboutTitle', label: 'Título', type: 'text', max: 80, default: 'Como funciona' },
      { key: 'aboutText', label: 'Texto', type: 'textarea', rows: 10, max: 3500, default: '', hint: 'Quem você é, materiais, prazos e entrega. Linha em branco = novo parágrafo.' },
      { key: 'aboutImage', label: 'Foto (opcional)', type: 'image', guide: 'about', default: '', max: 700 },
    ]
  },
  {
    group: 'menus', title: 'Perguntas frequentes',
    fields: [
      { key: 'faqItems', label: 'Perguntas e respostas', type: 'faq', default: '', hint: 'Até 20 perguntas, na página Sobre.' },
    ]
  },
  {
    group: 'inicio', title: 'Seções no topo da vitrine',
    fields: [
      { key: 'showFeatured', label: 'Mostrar "Destaques"', type: 'toggle', default: true },
      { key: 'featuredTitle', label: 'Título de Destaques', type: 'text', max: 40, default: 'Destaques' },
      { key: 'showPopular', label: 'Mostrar "Mais pedidos"', type: 'toggle', default: true },
      { key: 'popularTitle', label: 'Título de Mais pedidos', type: 'text', max: 40, default: 'Mais pedidos' },
      { key: 'showNew', label: 'Mostrar "Novidades"', type: 'toggle', default: true, hint: 'Produtos dos últimos 30 dias.' },
      { key: 'newTitle', label: 'Título de Novidades', type: 'text', max: 40, default: 'Novidades' },
      { key: 'newDays', label: 'Até quantos dias um produto é "novidade"', type: 'select', default: '30', options: ['7', '15', '30', '60', '90'].map(n => ({ value: n, label: `${n} dias` })) },
      { key: 'newMax', label: 'Máximo de produtos em Novidades', type: 'select', default: '8', options: ['4', '6', '8', '12'].map(n => ({ value: n, label: `${n} produtos` })) },
    ]
  },
  {
    group: 'avancado', title: 'Recursos da loja',
    fields: [
      { key: 'stockControl', label: 'Controlar estoque', type: 'toggle', default: true, hint: 'Desligado: tudo fica sempre disponível e o estoque some do site e do cadastro.' },
      { key: 'customEnabled', label: 'Aceitar pedidos personalizados', type: 'toggle', default: true, hint: 'Desligado: some o botão do menu, a faixa de destaque e a página /custom.' },
      { key: 'leadTimeEnabled', label: 'Prazo de produção nos produtos', type: 'toggle', default: NICHE.features.leadTimeEnabled, hint: 'Mostra o campo “Prazo de produção” no cadastro e no site. Desligado, o que foi escrito fica guardado.' },
      { key: 'aurasEnabled', label: 'Efeito de aura (brilho) nos cards', type: 'toggle', default: NICHE.features.aurasEnabled, hint: 'Ativa a aba Auras e o brilho nos cards e categorias. Desligado, as escolhas ficam guardadas.' },
      { key: 'modelLinkEnabled', label: 'Link do modelo 3D no cadastro', type: 'toggle', default: NICHE.features.modelLinkEnabled, hint: 'Campo só seu para guardar o link do arquivo 3D. O cliente não vê.' },
    ]
  },
  {
    group: 'produtos', title: 'Exibição da vitrine',
    fields: [
      { key: 'defaultSort', label: 'Ordem padrão dos produtos', type: 'select', display: 'sort', default: 'recent', options: [{ value: 'recent', label: 'Mais recentes' }, { value: 'price_asc', label: 'Menor preço' }, { value: 'price_desc', label: 'Maior preço' }] },
      { key: 'showSearch', label: 'Mostrar a busca', type: 'toggle', default: true },
      { key: 'hidePrices', label: 'Esconder os preços', type: 'toggle', default: false, hint: 'Some dos cards, do produto e do carrinho. Use se combina o valor pelo WhatsApp.' },
      { key: 'showSort', label: 'Mostrar a escolha de ordem (menor preço etc.)', type: 'toggle', default: true },
      { key: 'pageSize', label: 'Produtos por vez', type: 'select', default: '12', options: ['8', '12', '16', '24', '36', '48'].map(n => ({ value: n, label: `${n} produtos` })), hint: 'Quantos aparecem antes do botão "Ver mais".' },
      { key: 'showCardDescription', label: 'Mostrar a descrição nos cards', type: 'toggle', default: true, hint: 'No celular a descrição já fica escondida para o card caber melhor.' },
      { key: 'showCardLeadTime', label: 'Mostrar o prazo de produção nos cards', type: 'toggle', default: true, hint: 'Só vale se o recurso "Prazo de produção" estiver ligado em Avançado.' },
    ]
  },
  {
    group: 'produtos', title: 'Janela do produto',
    fields: [
      { key: 'relatedEnabled', label: 'Mostrar “Você também pode gostar” (produtos relacionados)', type: 'toggle', default: true, hint: 'Na janela do produto, sugere outros da mesma categoria.' },
      { key: 'relatedTitle', label: 'Título dos relacionados', type: 'text', max: 60, default: 'Você também pode gostar' },
      { key: 'relatedCount', label: 'Quantos relacionados mostrar', type: 'select', default: '4', options: ['2', '3', '4', '6'].map(n => ({ value: n, label: n })) },
      { key: 'showCopyLink', label: 'Mostrar o botão “Copiar link”', type: 'toggle', default: true, hint: 'Permite ao cliente copiar o endereço do produto para compartilhar.' },
      { key: 'showStockCount', label: 'Mostrar quantas unidades há em estoque', type: 'toggle', default: true, hint: 'Só vale com “Controlar estoque” ligado. Desligado, o cliente só vê “Esgotado” quando acaba.' },
    ]
  },
  {
    group: 'produtos', title: 'Selos e estoque baixo',
    fields: [
      { key: 'lowStockBadge', label: 'Selo "Últimas unidades" automático', type: 'toggle', default: false, hint: 'Para produtos com poucas unidades e sem outro selo.' },
      { key: 'lowStockMax', label: 'Quantas unidades contam como “poucas”', type: 'select', default: '3', options: ['1', '2', '3', '5', '10'].map(n => ({ value: n, label: n === '1' ? '1 unidade' : `até ${n} unidades` })), hint: 'Vale para o selo automático e para o aviso “Restam N unidades”.' },
      { key: 'lowStockText', label: 'Texto do selo automático', type: 'text', max: 20, default: 'Últimas unidades' },
      { key: 'badgeColor', label: 'Cor dos selos', type: 'color', default: '', hint: 'Vazio = laranja padrão (#f59e0b).' },
    ]
  },
  {
    group: 'seo', title: 'Google e compartilhamento',
    fields: [
      { key: 'seoTitle', label: 'Título do site', type: 'text', max: 70, default: '', hint: 'Aparece na aba do navegador e nos resultados do Google. Vazio = título padrão.' },
      { key: 'seoDescription', label: 'Descrição', type: 'textarea', rows: 3, max: 160, default: '', hint: 'Resumo da loja para o Google (até 160 caracteres).' },
      { key: 'seoImage', label: 'Imagem de compartilhamento', type: 'image', guide: 'share', default: '', max: 700, hint: 'Usada ao compartilhar o link (WhatsApp, redes sociais).' },
    ]
  },
  {
    group: 'contato', title: 'Redes sociais',
    fields: [
      { key: 'socialInstagram', label: 'Instagram', type: 'social', max: 200, default: '' },
      { key: 'socialTiktok', label: 'TikTok', type: 'social', max: 200, default: '' },
      { key: 'socialFacebook', label: 'Facebook', type: 'social', max: 200, default: '' },
      { key: 'socialYoutube', label: 'YouTube', type: 'social', max: 200, default: '' },
      { key: 'socialPinterest', label: 'Pinterest', type: 'social', max: 200, default: '' },
      { key: 'socialX', label: 'X (Twitter)', type: 'social', max: 200, default: '' },
      { key: 'socialLinkedin', label: 'LinkedIn', type: 'social', max: 200, default: '', hint: 'Cole o link completo da sua página (começa com https://).' },
    ]
  },
  {
    group: 'contato', title: 'Rodapé',
    fields: [
      { key: 'footerText', label: 'Linha extra no rodapé', type: 'text', max: 160, default: '', hint: 'Ex: Atendimento de segunda a sexta, das 9h às 18h. Vazio = sem linha.' },
      { key: 'showAdminLink', label: 'Mostrar o link "Área do lojista"', type: 'toggle', default: true, hint: 'Desligado, o link some do rodapé (você ainda entra pelo endereço /login). A política de privacidade fica sempre visível.' },
    ]
  }
];

// Seções de "Textos e mensagens", geradas de texts.ts
const TEXT_HINT = 'Aparece no site exatamente como você escrever. Apagando tudo, volta ao texto original.';
const TEXT_SCHEMA: SettingsSection[] = TEXT_SECTIONS.map(title => ({
  group: 'textos', title,
  fields: TEXTS.filter(t => t.section === title).map((t): SettingField => (t.long
    ? { key: t.key, label: t.label, type: 'textarea', default: t.default, max: t.max ?? 300, rows: 2, hint: t.hint ?? TEXT_HINT }
    : { key: t.key, label: t.label, type: 'text', default: t.default, max: t.max ?? 120, hint: t.hint ?? TEXT_HINT })),
}));

// Campos sem explicação própria ganham a de settingsHints.ts
export const SETTINGS_SCHEMA: SettingsSection[] = [...RAW_SCHEMA, ...TEXT_SCHEMA].map(s => ({ ...s, fields: s.fields.map(f => (f.hint || !HINTS[f.key] ? f : { ...f, hint: HINTS[f.key] })) }));

export const SETTING_FIELDS: SettingField[] = SETTINGS_SCHEMA.flatMap(s => s.fields);
export const DEFAULT_SETTINGS: Record<string, string | boolean> = Object.fromEntries(SETTING_FIELDS.map(f => [f.key, f.default]));

export { normalizeWhatsapp };
// Pedido mínimo em reais ("30" ou "30,50"); 0 = sem mínimo ou valor inválido
export const minOrderValue = (value: unknown): number => {
  const n = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 100000 ? Math.round(n * 100) / 100 : 0;
};
export const isValidMinOrder = (value: unknown): boolean => !String(value ?? '').trim() || minOrderValue(value) > 0;

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
    case 'url': return isUrl(value);
    case 'page': return isCompletePage(value);
    case 'block': return parseBlockDraft(value) !== null;
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
  const out = { ...DEFAULT_SETTINGS, auraLib: { custom: [], overrides: {} }, faq: [], pages: [], menus: { top: [], foot: [] }, blocks: [], homeOrder: [], backup: null } as unknown as Settings;
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
  out.blocks = buildBlocks(Object.fromEntries(BLOCK_KEYS.map(k => [k, typeof out[k] === 'string' ? out[k] as string : ''])));
  out.homeOrder = parseOrder(out.homeSections);
  out.pages = buildPages(Object.fromEntries(PAGE_KEYS.map(k => [k, typeof out[k] === 'string' ? out[k] as string : ''])));
  out.menus = { top: parseMenu(out.menuTop, MAX_TOP, true), foot: parseMenu(out.menuFoot, MAX_FOOT, false) };
  return out;
};
