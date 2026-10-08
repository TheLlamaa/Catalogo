// Textos da vitrine que o dono pode trocar em "Textos e mensagens". O padrão de cada um é exatamente o texto
// que o site já tinha: nada muda até o dono editar. Chaves só com letras (limite do banco), começando com "t".
// Onde aparece "{n}", "{min}" etc., o site troca pelo valor; o painel avisa isso na explicação do campo.
import { NICHE } from './niche';

export interface TextDef { key: string; label: string; default: string; section: string; hint?: string; long?: boolean; max?: number }

const VITRINE = 'Vitrine e produtos';
const JANELA = 'Janela do produto (textos)';
const CARRINHO = 'Carrinho e formulários';
const PERSONALIZADO = 'Pedido personalizado (formulário)';
const ESTADOS = 'Estados vazios e erros';
const RODAPE = 'Rodapé e links';
const WHATS = 'Mensagem do WhatsApp (rótulos)';

export const TEXT_SECTIONS = [VITRINE, JANELA, CARRINHO, PERSONALIZADO, ESTADOS, RODAPE, WHATS];

const defs = [
  // Vitrine e produtos
  { key: 'tSearchPlaceholder', label: 'Campo de busca (modelo Clássico)', default: 'Buscar modelos...', section: VITRINE, hint: 'Texto de ajuda dentro da busca da página inicial Clássica.' },
  { key: 'tSearchPlaceholderHome', label: 'Campo de busca (modelos Vitrine e Vitrine + Bancada)', default: `Buscar ${NICHE.item.many}`, section: VITRINE },
  { key: 'tSearchPlaceholderBancada', label: 'Campo de busca da capa (modelo Bancada)', default: 'O que você procura?', section: VITRINE },
  { key: 'tAllProducts', label: 'Botão e título "todos os produtos"', default: 'Todos os modelos', section: VITRINE, hint: 'Aparece na lista lateral de categorias e acima da grade de produtos.' },
  { key: 'tAllTab', label: 'Aba "tudo" nas categorias', default: 'Tudo', section: VITRINE },
  { key: 'tCategoriesTitle', label: 'Título da lista de categorias', default: 'Categorias', section: VITRINE },
  { key: 'tByCategory', label: 'Título "Por categoria"', default: 'Por categoria', section: VITRINE },
  { key: 'tSortRecent', label: 'Ordem: mais recentes', default: 'Mais recentes', section: VITRINE },
  { key: 'tSortPriceAsc', label: 'Ordem: menor preço', default: 'Menor preço', section: VITRINE },
  { key: 'tSortPriceDesc', label: 'Ordem: maior preço', default: 'Maior preço', section: VITRINE },
  { key: 'tSoldOut', label: 'Selo de produto esgotado', default: 'Esgotado', section: VITRINE },
  { key: 'tUnavailable', label: 'Botão de produto indisponível', default: 'Indisponível', section: VITRINE },
  { key: 'tPhotoSoon', label: 'Produto sem foto', default: 'Foto em breve', section: VITRINE },
  { key: 'tChooseOptions', label: 'Botão para produto com opções', default: 'Escolher opções', section: VITRINE, hint: 'Aparece em produtos que têm cor, tamanho ou outras opções.' },
  { key: 'tAdd', label: 'Botão curto de adicionar', default: 'Adicionar', section: VITRINE },
  { key: 'tAddToBudget', label: 'Botão de adicionar (descrição longa)', default: 'Adicionar ao orçamento', section: VITRINE },
  { key: 'tAddedToBudget', label: 'Confirmação depois de adicionar', default: 'No orçamento', section: VITRINE },
  { key: 'tLeftOne', label: 'Aviso: resta 1 unidade', default: 'Resta 1 unidade', section: VITRINE },
  { key: 'tLeftMany', label: 'Aviso: restam poucas unidades', default: 'Restam {n} unidades', section: VITRINE, hint: 'Use {n} para o número de unidades.' },
  { key: 'tLoadMore', label: 'Botão "ver mais"', default: 'Ver mais', section: VITRINE, hint: 'O número de produtos que faltam aparece depois do texto.' },
  { key: 'tNoResults', label: 'Nenhum produto encontrado', default: 'Nenhum produto encontrado', section: VITRINE },
  { key: 'tNothingFound', label: 'Nada encontrado (modelos novos)', default: 'Nada encontrado', section: VITRINE },
  { key: 'tNoResultsHint', label: 'Dica quando não há resultados', default: 'Tente outra busca ou categoria.', section: VITRINE },
  { key: 'tNoResultsHintHome', label: 'Dica quando não há resultados (modelos novos)', default: 'Tente outra palavra ou veja todas as categorias.', section: VITRINE },
  { key: 'tClearSearch', label: 'Botão "limpar busca"', default: 'Limpar busca', section: VITRINE },
  // Janela do produto
  { key: 'tDescription', label: 'Título da descrição', default: 'Descrição', section: JANELA },
  { key: 'tCopyLink', label: 'Botão copiar link', default: 'Copiar link deste produto', section: JANELA },
  { key: 'tLinkCopied', label: 'Aviso: link copiado', default: 'Link do produto copiado!', section: JANELA },
  { key: 'tInStock', label: 'Quantidade em estoque', default: '{n} em estoque', section: JANELA, hint: 'Use {n} para a quantidade.' },
  { key: 'tChooseFirst', label: 'Aviso: escolher as opções', default: 'Escolha: {lista}.', section: JANELA, hint: 'Use {lista} para os nomes das opções que faltam (ex.: Cor, Tamanho).' },
  // Carrinho e formulários
  { key: 'tCartNext', label: 'Botão para ir aos dados de contato', default: 'Avançar para Identificação', section: CARRINHO },
  { key: 'tCartTotal', label: 'Rótulo do total', default: 'Total', section: CARRINHO },
  { key: 'tCartRemove', label: 'Botão remover item', default: 'Remover', section: CARRINHO },
  { key: 'tMinOrder', label: 'Aviso de pedido mínimo', default: 'Pedido mínimo: {min}. Faltam {falta}.', section: CARRINHO, hint: 'Use {min} para o valor mínimo e {falta} para quanto falta.' },
  { key: 'tContactTitle', label: 'Título dos dados de contato', default: 'Informações para contato', section: CARRINHO },
  { key: 'tYourName', label: 'Campo nome', default: 'Seu nome', section: CARRINHO },
  { key: 'tNamePlaceholder', label: 'Exemplo no campo nome (carrinho)', default: 'Ex: João Souza', section: CARRINHO },
  { key: 'tYourWhatsapp', label: 'Campo WhatsApp', default: 'Seu WhatsApp', section: CARRINHO },
  { key: 'tReceiveHow', label: 'Pergunta de retirada ou entrega', default: 'Como prefere receber?', section: CARRINHO },
  { key: 'tPickup', label: 'Opção retirada', default: 'Retirada', section: CARRINHO },
  { key: 'tDeliveryOpt', label: 'Opção entrega', default: 'Entrega', section: CARRINHO },
  { key: 'tAddressLabel', label: 'Campo endereço', default: 'Endereço (ou bairro e cidade)', section: CARRINHO },
  { key: 'tAddressPlaceholder', label: 'Exemplo no campo endereço', default: 'Rua, número, bairro e cidade', section: CARRINHO },
  { key: 'tNotesLabel', label: 'Campo observações', default: 'Observações', section: CARRINHO },
  { key: 'tNotesOptional', label: 'Marca de campo opcional', default: '(opcional)', section: CARRINHO },
  { key: 'tNotesPlaceholder', label: 'Exemplo no campo observações', default: 'Ex: cor preferida, prazo desejado...', section: CARRINHO },
  { key: 'tItemsLabel', label: 'Rótulo da quantidade de itens', default: 'Itens:', section: CARRINHO },
  { key: 'tPrivacyNote', label: 'Aviso de uso dos dados (carrinho)', default: 'Usamos seus dados apenas para atender este pedido.', section: CARRINHO, long: true },
  { key: 'tBack', label: 'Botão voltar', default: 'Voltar', section: CARRINHO },
  { key: 'tFinishOrder', label: 'Botão finalizar pedido', default: 'Finalizar pedido', section: CARRINHO },
  { key: 'tSendingOrder', label: 'Texto enquanto envia o pedido', default: 'Enviando pedido…', section: CARRINHO },
  { key: 'tDone', label: 'Botão concluir', default: 'Concluir', section: CARRINHO },
  // Pedido personalizado
  { key: 'tCustomSent', label: 'Título depois de enviar', default: 'Solicitação enviada!', section: PERSONALIZADO },
  { key: 'tCustomAnother', label: 'Botão enviar outra solicitação', default: 'Enviar outra solicitação', section: PERSONALIZADO },
  { key: 'tBackToStore', label: 'Botão voltar para a loja', default: 'Voltar para a loja', section: PERSONALIZADO },
  { key: 'tCustomNamePlaceholder', label: 'Exemplo no campo nome', default: 'Ex: Maria Silva', section: PERSONALIZADO },
  { key: 'tCustomPhotoLabel', label: 'Título do envio de foto', default: 'Foto ou Referência do Modelo', section: PERSONALIZADO },
  { key: 'tCustomPhotoCta', label: 'Convite para enviar foto', default: 'Clique para enviar uma foto ou desenho', section: PERSONALIZADO },
  { key: 'tCustomPhotoFormats', label: 'Formatos aceitos', default: 'PNG, JPG ou JPEG', section: PERSONALIZADO },
  { key: 'tCustomDescLabel', label: 'Campo de detalhes', default: 'Observações e detalhes da peça', section: PERSONALIZADO },
  { key: 'tCustomDescPlaceholder', label: 'Exemplo no campo de detalhes', default: 'Descreva o tamanho desejado, cor, utilização da peça ou qualquer detalhe importante...', section: PERSONALIZADO, long: true },
  { key: 'tCustomPrivacyNote', label: 'Aviso de uso dos dados (personalizado)', default: 'Usamos seu nome, WhatsApp e a foto apenas para responder a este pedido.', section: PERSONALIZADO, long: true },
  { key: 'tCustomSending', label: 'Texto enquanto envia', default: 'Enviando solicitação…', section: PERSONALIZADO },
  { key: 'tCustomSubmit', label: 'Botão enviar solicitação', default: 'Enviar solicitação de orçamento', section: PERSONALIZADO },
  // Estados vazios e erros
  { key: 'tLoadErrorTitle', label: 'Erro ao carregar: título', default: 'Não conseguimos carregar o catálogo', section: ESTADOS },
  { key: 'tLoadErrorText', label: 'Erro ao carregar: explicação', default: 'Pode ser uma falha de conexão ou uma manutenção rápida. Tente de novo em instantes.', section: ESTADOS, long: true },
  { key: 'tRetry', label: 'Botão tentar novamente', default: 'Tentar novamente', section: ESTADOS },
  { key: 'tLoading', label: 'Texto de carregamento', default: 'Carregando informações...', section: ESTADOS },
  { key: 'tSlowLoading', label: 'Aviso de carregamento demorado', default: 'Está demorando mais que o normal. Só mais um instante…', section: ESTADOS },
  { key: 'tProductGone', label: 'Produto que saiu do ar', default: 'Esse produto não está mais disponível.', section: ESTADOS },
  { key: 'tAboutEmpty', label: 'Página Sobre vazia', default: 'Em breve, mais informações por aqui.', section: ESTADOS },
  { key: 'tFaqTitle', label: 'Título das perguntas frequentes', default: 'Perguntas frequentes', section: ESTADOS },
  { key: 'tAboutDoubt', label: 'Botão de dúvida na página Sobre', default: 'Ainda tem dúvida? Fale no WhatsApp', section: ESTADOS },
  // Rodapé e links
  { key: 'tFooterWhatsapp', label: 'Link do WhatsApp no rodapé', default: 'WhatsApp', section: RODAPE },
  { key: 'tFooterPrivacy', label: 'Link da política de privacidade', default: 'Política de privacidade', section: RODAPE, hint: 'A política de privacidade é uma exigência legal: o link fica sempre visível; aqui você só muda o texto.' },
  { key: 'tFooterAdmin', label: 'Link da área do lojista', default: 'Área do lojista', section: RODAPE },
  { key: 'tFooterMap', label: 'Link do mapa', default: 'Como chegar', section: RODAPE },
  { key: 'tSkipLink', label: 'Atalho para pular ao conteúdo', default: 'Pular para o conteúdo', section: RODAPE, hint: 'Aparece só para quem navega pelo teclado ou leitor de tela.' },
  // Mensagem do WhatsApp
  { key: 'tMsgTotal', label: 'Rótulo do total', default: 'Total:', section: WHATS, hint: 'Linhas fixas da mensagem de pedido enviada ao WhatsApp, depois da abertura e dos itens.' },
  { key: 'tMsgPickup', label: 'Retirada', default: 'Retirada', section: WHATS },
  { key: 'tMsgDelivery', label: 'Rótulo da entrega', default: 'Entrega:', section: WHATS },
  { key: 'tMsgNotes', label: 'Rótulo das observações', default: 'Observações:', section: WHATS },
] as const satisfies readonly TextDef[];

export type TextKey = (typeof defs)[number]['key'];
export const TEXTS: readonly TextDef[] = defs;
export const TEXT_DEFAULTS = Object.fromEntries(defs.map(d => [d.key, d.default])) as Record<TextKey, string>;

/** Devolve a função t(chave, valores): o texto do dono (ou o padrão), com {n}, {min}… trocados. */
export const makeT = (settings: Record<string, unknown>) => (key: TextKey, vars?: Record<string, string | number>): string => {
  const raw = settings[key];
  const text = typeof raw === 'string' && raw.trim() ? raw : TEXT_DEFAULTS[key];
  return vars ? text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)) : text;
};
