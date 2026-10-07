import type { Category, ProductOption, StoredProduct } from '../types';
import { clampDiscount } from '../lib/discount';
import type { Capabilities, CategoryInput, ProductPatch } from './gateway';

// Tradução pura entre linhas do banco (snake_case) e objetos de domínio. Só o adapter do Supabase usa.

export interface ProductRow {
  id: string; title: string; description: string; price: number; stock?: number | null; active?: boolean | null;
  badge?: string | null; section?: string | null; created_at?: string;
  discount_percent?: number | null; sort_order?: number | null; category_ids?: string[] | null; image_urls?: string[] | null;
  aura_color?: string | null; lead_time?: string | null; options?: ProductOption[] | unknown;
}
export interface CategoryRow {
  id: string; name: string; slug?: string; description?: string; created_at?: string;
  sort_order?: number | null; aura_color?: string | null; visible?: boolean | null;
}

export const detectCapabilities = (products: object[], categories: object[]): Capabilities => ({
  ordering: [...products, ...categories].some(row => 'sort_order' in row),
  discount: products.some(row => 'discount_percent' in row),
  categoryVisibility: categories.some(row => 'visible' in row),
});

const byManual = (a: StoredProduct, b: StoredProduct) =>
  (a.sortOrder - b.sortOrder) || (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

export const toProduct = (row: ProductRow, modelUrl = ''): StoredProduct => ({
  id: row.id,
  title: row.title,
  description: row.description,
  price: row.price,
  created_at: row.created_at,
  sortOrder: row.sort_order ?? 0,
  badge: row.badge || '',
  section: row.section || '',
  categoryIds: row.category_ids || [],
  imageUrls: row.image_urls || [],
  active: row.active ?? true,
  stock: row.stock ?? 0,
  auraColor: row.aura_color || 'inherit',
  options: Array.isArray(row.options) ? (row.options as ProductOption[]) : [],
  leadTime: row.lead_time || '',
  discountPercent: clampDiscount(row.discount_percent),
  modelUrl,
});

// Ordem da vitrine: a que o admin definiu; empatou (ou nunca definiu), o mais novo primeiro
export const toProducts = (rows: ProductRow[], modelUrls: Record<string, string>): StoredProduct[] =>
  rows.map(row => toProduct(row, modelUrls[row.id] || '')).sort(byManual);

export const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  created_at: row.created_at,
  sortOrder: row.sort_order ?? 0,
  auraColor: row.aura_color || 'none',
  ...(typeof row.visible === 'boolean' ? { visible: row.visible } : {}),
});

export const toCategories = (rows: CategoryRow[]): Category[] =>
  rows.map(toCategory).sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'pt-BR'));

export const categorySlug = (name: string) => name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

// Gravação completa (formulário do produto). Colunas de SQL mais novo só vão se o banco as tem.
export function productPayload(product: Partial<StoredProduct>, caps: Capabilities): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: product.title,
    description: product.description,
    price: product.price,
    stock: product.stock,
    category_ids: product.categoryIds || [],
    image_urls: product.imageUrls || [],
    active: product.active,
    aura_color: product.auraColor || 'inherit',
    options: product.options || [],
    lead_time: product.leadTime || null,
  };
  if (caps.ordering) {
    payload.badge = (product.badge || '').trim() || null;
    payload.section = product.section || null;
  }
  // Desconto: só manda a coluna se o banco já a tem ou se há desconto de fato
  const discount = clampDiscount(product.discountPercent);
  if (discount > 0 || caps.discount) payload.discount_percent = discount;
  if (product.id) payload.id = product.id;
  return payload;
}

// Gravação parcial (edições rápidas): só as colunas pedidas
export function patchPayload(patch: ProductPatch, caps: Capabilities): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (patch.stock !== undefined) payload.stock = patch.stock;
  if (patch.active !== undefined) payload.active = patch.active;
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.auraColor !== undefined) payload.aura_color = patch.auraColor || 'inherit';
  if (patch.section !== undefined && caps.ordering) payload.section = patch.section || null;
  return payload;
}

export function categoryPayload(category: CategoryInput, caps: Capabilities, sortOrderIfNew?: number): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: category.name,
    slug: categorySlug(category.name),
    description: category.description,
    aura_color: category.auraColor || 'none',
  };
  if (typeof category.visible === 'boolean') payload.visible = category.visible;
  if (category.id) payload.id = category.id;
  else if (caps.ordering && sortOrderIfNew !== undefined) payload.sort_order = sortOrderIfNew;
  return payload;
}
