import { supabase } from './client';

const none = () => Promise.resolve({ data: null, error: null });

// Tudo que a tela precisa de uma vez. Pedidos e links de modelo contêm dados sensíveis: só com admin logado.
export function fetchCatalog({ isAdmin }) {
  return Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('name', { ascending: true }),
    isAdmin ? supabase.from('custom_orders').select('*').order('created_at', { ascending: false }) : none(),
    isAdmin ? supabase.from('orders').select('*').order('created_at', { ascending: false }) : none(),
    isAdmin ? supabase.from('product_private').select('product_id, model_url') : none(),
    // Textos e menus personalizados (públicos). Se a tabela ainda não existir, usa os padrões.
    supabase.from('site_settings').select('key, value'),
  ]).then(([products, categories, customOrders, orders, modelUrls, settings]) => ({ products, categories, customOrders, orders, modelUrls, settings }));
}

// Produtos
export const upsertProduct = (payload) => supabase.from('products').upsert(payload).select('id').single();
export const deleteProductRow = (id) => supabase.from('products').delete().eq('id', id);
export const setModelUrl = (productId, url) => (url
  ? supabase.from('product_private').upsert({ product_id: productId, model_url: url, updated_at: new Date().toISOString() })
  : supabase.from('product_private').delete().eq('product_id', productId));

// Categorias
export const upsertCategory = (payload) => supabase.from('categories').upsert(payload);
export const deleteCategoryRow = (id) => supabase.from('categories').delete().eq('id', id);

// Ordem manual (table: 'products' | 'categories'); updates = [{ id, sort_order }]
export const updateSortOrders = (table, updates) =>
  Promise.all(updates.map(u => supabase.from(table).update({ sort_order: u.sort_order }).eq('id', u.id)));
