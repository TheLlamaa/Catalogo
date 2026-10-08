// Ordem das seções da página inicial (Personalizar loja > Página inicial > Seções e blocos).
// A lista guardada tem os ids na ordem escolhida; cada modelo da página inicial mostra só as seções que ele tem,
// nessa mesma ordem relativa. Sem nada guardado, vale a ordem de sempre.
import { BLOCK_KEYS, blockSectionId } from './blocks';

/** Seções que o dono pode reordenar. As "extra*" são os blocos criados por ele. */
export const NATIVE_SECTIONS = [
  { id: 'categorias', label: 'Categorias com foto', flag: 'showCategoryTiles', hint: 'Modelos Bancada e Vitrine + Bancada.' },
  { id: 'passos', label: 'Passo a passo do pedido', flag: 'showHowItWorks', hint: 'Modelos Bancada e Vitrine + Bancada.' },
  { id: 'destaque', label: 'Destaques', flag: 'showFeatured', hint: 'Modelo Clássico.' },
  { id: 'popular', label: 'Mais pedidos', flag: 'showPopular', hint: 'Modelo Clássico.' },
  { id: 'novidades', label: 'Novidades', flag: 'showNew', hint: 'Modelo Clássico.' },
] as const;

export const EXTRA_IDS = BLOCK_KEYS.map(blockSectionId);
export const SECTION_IDS: string[] = [...NATIVE_SECTIONS.map(s => s.id), ...EXTRA_IDS];
export const DEFAULT_ORDER = SECTION_IDS.join(',');

/** Ids válidos na ordem guardada, sem repetir; o que faltar entra no fim, na ordem de sempre. */
export const parseOrder = (value: unknown): string[] => {
  const given = typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(id => SECTION_IDS.includes(id)) : [];
  const seen = new Set<string>();
  const out = given.filter(id => (seen.has(id) ? false : (seen.add(id), true)));
  return [...out, ...SECTION_IDS.filter(id => !seen.has(id))];
};

/** Valor para o banco: '' quando é a ordem de sempre. */
export const orderToStored = (value: unknown): string => {
  const order = parseOrder(value).join(',');
  return order === DEFAULT_ORDER ? '' : order;
};

/** As seções que o modelo atual tem, na ordem escolhida. */
export const orderedSections = (order: unknown, supported: readonly string[]): string[] => parseOrder(order).filter(id => supported.includes(id));
