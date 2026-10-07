// Regras da vitrine: selos, estoque exibido, aura, "Novidades" e produtos relacionados.

import type { Category, Product } from '../types';

const DAY = 24 * 60 * 60 * 1000;
export const NEW_DAYS = 30;
export const NEW_MAX = 8;
export const LOW_STOCK_MAX = 3;

export type StockLevel = 'out' | 'low' | 'ok';

// Nível do número guardado no estoque (é o que o admin edita): 0 = esgotado, até 3 = acabando
export const stockLevel = (stock: number): StockLevel => (stock <= 0 ? 'out' : stock <= LOW_STOCK_MAX ? 'low' : 'ok');

// Como o produto aparece para o cliente: esgotado vem de `available` (infinito sem controle de estoque);
// "acabando" só existe com o controle de estoque ligado
export const availability = (product: Pick<Product, 'available' | 'stock'>, stockControl: boolean): StockLevel => {
  if (product.available <= 0) return 'out';
  return stockControl && stockLevel(product.stock) === 'low' ? 'low' : 'ok';
};

// Aura que vem da categoria (a primeira do produto que tem uma); null se nenhuma tem
export const inheritedAura = (product: Pick<Product, 'categoryIds'>, categories: Pick<Category, 'id' | 'auraColor'>[]): string | null =>
  categories.find(c => (product.categoryIds || []).includes(c.id) && c.auraColor && c.auraColor !== 'none')?.auraColor ?? null;

// Chave da aura escolhida no próprio produto, ou null se ele herda da categoria ('inherit' ou vazio)
const ownAura = (product: Pick<Product, 'auraColor'>): string | null => (product.auraColor && product.auraColor !== 'inherit' ? product.auraColor : null);

// Aura que o produto mostra: a dele, senão a da categoria, senão nenhuma. Auras desligadas = nenhuma.
export const effectiveAura = (product: Pick<Product, 'auraColor' | 'categoryIds'>, categories: Pick<Category, 'id' | 'auraColor'>[], aurasEnabled = true): string =>
  aurasEnabled ? (ownAura(product) ?? inheritedAura(product, categories) ?? 'none') : 'none';

// Para o seletor do painel: a aura que está valendo, ou 'inherit' quando herda e a categoria não tem
export const shownAura = (product: Pick<Product, 'auraColor' | 'categoryIds'>, categories: Pick<Category, 'id' | 'auraColor'>[]): string =>
  ownAura(product) ?? inheritedAura(product, categories) ?? 'inherit';

// Selo do card: o que o admin escreveu; se não houver e a opção estiver ligada, "Últimas unidades"
export const badgeFor = (
  product: Pick<Product, 'badge' | 'stock'>,
  settings: { stockControl?: boolean; lowStockBadge?: boolean; lowStockText?: string },
): string => {
  const manual = (product.badge || '').trim();
  if (manual) return manual;
  if (settings.stockControl && settings.lowStockBadge && product.stock > 0 && product.stock <= LOW_STOCK_MAX) return (settings.lowStockText || '').trim() || 'Últimas unidades';
  return '';
};

// Produtos cadastrados nos últimos 30 dias. Se TODOS são novos a seção não diz nada, então some.
export const newProducts = (activeProducts: Product[], now = Date.now()): Product[] => {
  const fresh = activeProducts.filter(p => p.created_at && now - new Date(p.created_at).getTime() <= NEW_DAYS * DAY);
  return fresh.length > 0 && fresh.length < activeProducts.length ? fresh.slice(0, NEW_MAX) : [];
};

// Outros produtos ativos que dividem categoria com este (mais categorias em comum primeiro, com estoque antes)
export const relatedProducts = (product: Pick<Product, 'id' | 'categoryIds'>, products: Product[], limit = 4): Product[] => {
  const mine = new Set(product.categoryIds || []);
  return products
    .filter(p => p.id !== product.id && p.active !== false)
    .map(p => ({ p, shared: (p.categoryIds || []).filter(id => mine.has(id)).length }))
    .filter(x => x.shared > 0)
    .sort((a, b) => (b.shared - a.shared) || (Number(b.p.available > 0) - Number(a.p.available > 0)))
    .slice(0, limit)
    .map(x => x.p);
};
