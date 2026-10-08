import { supabase } from './client';
import { schemaStatus } from '../lib/schema';
import { statusInfo } from '../lib/format';
import type { CatalogOrder, CustomOrder, SettingRow } from '../types';
import type { CatalogGateway, GatewayResult } from './gateway';
import { categoryPayload, detectCapabilities, patchPayload, productPayload, toCategories, toProducts } from './mapping';
import type { CategoryRow, ProductRow } from './mapping';

// Adapter do Supabase: o único lugar que conhece tabelas, colunas e o formato de resposta do supabase-js.

const ok = (r: { error: { message: string } | null }): GatewayResult => ({ error: r.error });
const firstError = (rs: { error: { message: string } | null }[]): GatewayResult => ({ error: rs.find(r => r.error)?.error ?? null });

const withStatus = <T extends { status: unknown }>(rows: T[]) => rows.map(o => ({ ...o, status: statusInfo(o.status).id }));

const CUSTOM_LIST_COLUMNS = 'id, client_name, client_phone, description, status, created_at, has_image';

export const supabaseGateway: CatalogGateway = {
  async load({ isAdmin }) {
    // Pedidos e links de modelo contêm dados sensíveis: só com admin logado.
    const none = Promise.resolve({ data: null, error: null });
    let [products, categories, customOrders, orders, modelUrls, settings] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true }),
      // Sem a foto de referência (pesada, embutida): vem só has_image. Banco sem o SQL 17 cai na consulta antiga abaixo.
      isAdmin ? supabase.from('custom_orders').select(CUSTOM_LIST_COLUMNS).order('created_at', { ascending: false }) : none,
      isAdmin ? supabase.from('orders').select('*').order('created_at', { ascending: false }) : none,
      isAdmin ? supabase.from('product_private').select('product_id, model_url') : none,
      // Textos personalizados (públicos). Se a tabela ainda não existir, usa os padrões.
      supabase.from('site_settings').select('key, value'),
    ]);

    if (products.error || categories.error) throw (products.error || categories.error);
    if (isAdmin && customOrders.error) customOrders = await supabase.from('custom_orders').select('*').order('created_at', { ascending: false });
    const productRows = (products.data ?? []) as ProductRow[];
    const categoryRows = (categories.data ?? []) as CategoryRow[];

    if (settings.error) console.error('Erro ao carregar configurações do site:', settings.error);
    if (modelUrls.error) console.error('Erro ao carregar links dos modelos:', modelUrls.error);
    const modelUrlById: Record<string, string> = {};
    ((modelUrls.data ?? []) as { product_id: string; model_url: string | null }[]).forEach(r => { if (r.model_url) modelUrlById[r.product_id] = r.model_url; });

    if (customOrders.error) console.error('Erro ao carregar pedidos personalizados:', customOrders.error);
    if (orders.error) console.error('Erro ao carregar pedidos:', orders.error);

    return {
      products: toProducts(productRows, modelUrlById),
      categories: toCategories(categoryRows),
      capabilities: detectCapabilities(productRows, categoryRows),
      settings: settings.error ? null : ((settings.data ?? []) as SettingRow[]),
      customOrders: customOrders.data && !customOrders.error ? withStatus(customOrders.data as CustomOrder[]) : null,
      catalogOrders: orders.data && !orders.error ? withStatus(orders.data as CatalogOrder[]) : null,
    };
  },

  async loadReferenceImage(id) {
    const { data, error } = await supabase.from('custom_orders').select('image_url').eq('id', id).maybeSingle();
    return error ? null : (data?.image_url || null);
  },

  async loadSchemaStatus() {
    const { data, error } = await supabase.from('app_meta').select('key, value').eq('key', 'schema_version');
    return schemaStatus(data, error);
  },

  async saveProduct(product, { capabilities, previousModelUrl }) {
    const { data: saved, error } = await supabase.from('products').upsert(productPayload(product, capabilities)).select('id').single();
    if (error) return { error, modelUrlError: null };

    // Link do modelo 3D (admin): tabela separada. Só mexe se mudou (ou se é cópia de outro produto).
    const url = (product.modelUrl || '').trim();
    if (url === previousModelUrl && (product.id || !url)) return { error: null, modelUrlError: null };
    const { error: modelUrlError } = url
      ? await supabase.from('product_private').upsert({ product_id: saved.id, model_url: url, updated_at: new Date().toISOString() })
      : await supabase.from('product_private').delete().eq('product_id', saved.id);
    return { error: null, modelUrlError };
  },

  async patchProduct(id, patch, { capabilities }) {
    const payload = patchPayload(patch, capabilities);
    if (!Object.keys(payload).length) return { error: null };
    return ok(await supabase.from('products').update(payload).eq('id', id));
  },

  async patchProducts(updates, { capabilities }) {
    // Em lotes de 15 pedidos ao mesmo tempo: rápido sem abrir centenas de conexões
    const failedIds: string[] = [];
    let anyError: GatewayResult['error'] = null;
    for (let i = 0; i < updates.length; i += 15) {
      await Promise.all(updates.slice(i, i + 15).map(async u => {
        const payload = patchPayload(u.patch, capabilities);
        if (!Object.keys(payload).length) return;
        const { error } = await supabase.from('products').update(payload).eq('id', u.id);
        if (error) { failedIds.push(u.id); anyError ??= error; }
      }));
    }
    return { error: anyError, failedIds };
  },

  async deleteProduct(id) { return ok(await supabase.from('products').delete().eq('id', id)); },

  async saveCategory(category, { capabilities, sortOrderIfNew }) {
    return ok(await supabase.from('categories').upsert(categoryPayload(category, capabilities, sortOrderIfNew)));
  },

  async deleteCategory(id) { return ok(await supabase.from('categories').delete().eq('id', id)); },

  async reorder(table, updates) {
    return firstError(await Promise.all(updates.map(u => supabase.from(table).update({ sort_order: u.sortOrder }).eq('id', u.id))));
  },

  async writeSettings({ upsert, remove }) {
    if (upsert.length) {
      const now = new Date().toISOString();
      const { error } = await supabase.from('site_settings').upsert(upsert.map(r => ({ ...r, updated_at: now })));
      if (error) return { error };
    }
    if (remove.length) return ok(await supabase.from('site_settings').delete().in('key', remove));
    return { error: null };
  },

  async insertOrder(table, order) { return ok(await supabase.from(table).insert(order)); },
  async deleteOrder(table, id) { return ok(await supabase.from(table).delete().eq('id', id)); },
  async setOrderStatus(table, id, status) { return ok(await supabase.from(table).update({ status }).eq('id', id)); },
};
