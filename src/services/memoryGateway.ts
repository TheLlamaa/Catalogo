import type { CatalogOrder, Category, CustomOrder, OrderTable, SettingRow, StoredProduct } from '../types';
import { clampDiscount } from '../lib/discount';
import { schemaStatus } from '../lib/schema';
import type { CatalogGateway, Capabilities, GatewayResult } from './gateway';
import { categorySlug } from './mapping';

// Adapter em memória: mesmo contrato do supabaseGateway, sem rede. Serve a testes dos hooks e do checkout.

export interface MemoryState {
  products: StoredProduct[];
  categories: Category[];
  settings: SettingRow[];
  customOrders: CustomOrder[];
  catalogOrders: CatalogOrder[];
  capabilities: Capabilities;
  schemaVersion: number | null;
}

type Method = keyof CatalogGateway;

const OK: GatewayResult = { error: null };

export function createMemoryGateway(initial: Partial<MemoryState> = {}) {
  const state: MemoryState = {
    products: [], categories: [], settings: [], customOrders: [], catalogOrders: [],
    capabilities: { ordering: true, discount: true, categoryVisibility: true },
    schemaVersion: null,
    ...initial,
  };
  const failures = new Map<Method, string>();
  let nextId = 1;
  const newId = () => `mem-${nextId++}`;
  const fail = (method: Method): GatewayResult | null => (failures.has(method) ? { error: { message: failures.get(method)! } } : null);
  const orderList = (table: OrderTable) => (table === 'orders' ? state.catalogOrders : state.customOrders) as { id: string; status?: unknown }[];

  const gateway: CatalogGateway = {
    async load({ isAdmin }) {
      if (failures.has('load')) throw new Error(failures.get('load'));
      return {
        products: structuredClone(state.products),
        categories: structuredClone(state.categories),
        capabilities: { ...state.capabilities },
        settings: structuredClone(state.settings),
        customOrders: isAdmin ? structuredClone(state.customOrders).map(({ image_url, ...rest }) => ({ ...rest, has_image: !!image_url })) : null,
        catalogOrders: isAdmin ? structuredClone(state.catalogOrders) : null,
      };
    },

    async loadReferenceImage(id) {
      return state.customOrders.find(o => o.id === id)?.image_url || null;
    },

    async loadSchemaStatus() {
      return schemaStatus(state.schemaVersion === null ? [] : [{ key: 'schema_version', value: String(state.schemaVersion) }], null);
    },

    async saveProduct(product, { capabilities }) {
      const failed = fail('saveProduct');
      if (failed) return { ...failed, modelUrlError: null };
      const existing = product.id ? state.products.find(p => p.id === product.id) : undefined;
      const saved: StoredProduct = {
        id: product.id ?? newId(),
        title: product.title ?? '',
        description: product.description ?? '',
        price: product.price ?? 0,
        stock: product.stock ?? 0,
        active: product.active ?? true,
        categoryIds: product.categoryIds || [],
        imageUrls: product.imageUrls || [],
        auraColor: product.auraColor || 'inherit',
        options: product.options || [],
        leadTime: product.leadTime || '',
        modelUrl: (product.modelUrl || '').trim(),
        // colunas de SQL mais novo só gravam se o banco as tem; senão ficam como estavam
        badge: capabilities.ordering ? (product.badge || '').trim() : (existing?.badge ?? ''),
        section: capabilities.ordering ? (product.section || '') : (existing?.section ?? ''),
        discountPercent: clampDiscount(product.discountPercent),
        sortOrder: existing?.sortOrder ?? 0,
        created_at: existing?.created_at ?? new Date().toISOString(),
      };
      state.products = existing ? state.products.map(p => (p.id === saved.id ? saved : p)) : [saved, ...state.products];
      return { error: null, modelUrlError: null };
    },

    async patchProduct(id, patch, { capabilities }) {
      const failed = fail('patchProduct');
      if (failed) return failed;
      const { section, ...rest } = patch;
      state.products = state.products.map(p => (p.id !== id ? p : {
        ...p,
        ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
        ...(section !== undefined && capabilities.ordering ? { section } : {}),
        ...(rest.auraColor !== undefined ? { auraColor: rest.auraColor || 'inherit' } : {}),
      }));
      return OK;
    },

    async deleteProduct(id) {
      const failed = fail('deleteProduct');
      if (failed) return failed;
      state.products = state.products.filter(p => p.id !== id);
      return OK;
    },

    async saveCategory(category, { capabilities, sortOrderIfNew }) {
      const failed = fail('saveCategory');
      if (failed) return failed;
      const existing = category.id ? state.categories.find(c => c.id === category.id) : undefined;
      const saved: Category = {
        id: category.id ?? newId(),
        name: category.name,
        slug: categorySlug(category.name),
        description: category.description,
        auraColor: category.auraColor || 'none',
        sortOrder: existing?.sortOrder ?? (capabilities.ordering ? (sortOrderIfNew ?? 0) : 0),
        ...(typeof category.visible === 'boolean' ? { visible: category.visible } : existing && 'visible' in existing ? { visible: existing.visible } : {}),
        created_at: existing?.created_at ?? new Date().toISOString(),
      };
      state.categories = existing ? state.categories.map(c => (c.id === saved.id ? saved : c)) : [...state.categories, saved];
      return OK;
    },

    async deleteCategory(id) {
      const failed = fail('deleteCategory');
      if (failed) return failed;
      state.categories = state.categories.filter(c => c.id !== id);
      return OK;
    },

    async reorder(table, updates) {
      const failed = fail('reorder');
      if (failed) return failed;
      const next = new Map(updates.map(u => [u.id, u.sortOrder]));
      const apply = <T extends { id: string; sortOrder: number }>(list: T[]) => list.map(i => (next.has(i.id) ? { ...i, sortOrder: next.get(i.id)! } : i));
      if (table === 'products') state.products = apply(state.products); else state.categories = apply(state.categories);
      return OK;
    },

    async writeSettings({ upsert, remove }) {
      const failed = fail('writeSettings');
      if (failed) return failed;
      const keep = state.settings.filter(r => !remove.includes(r.key) && !upsert.some(u => u.key === r.key));
      state.settings = [...keep, ...upsert.map(({ key, value }) => ({ key, value }))];
      return OK;
    },

    async insertOrder(table, order) {
      const failed = fail('insertOrder');
      if (failed) return failed;
      const row = { id: newId(), status: 'novo', created_at: new Date().toISOString(), ...order };
      if (table === 'orders') state.catalogOrders = [row as unknown as CatalogOrder, ...state.catalogOrders];
      else state.customOrders = [row as unknown as CustomOrder, ...state.customOrders];
      return OK;
    },

    async deleteOrder(table, id) {
      const failed = fail('deleteOrder');
      if (failed) return failed;
      if (table === 'orders') state.catalogOrders = state.catalogOrders.filter(o => o.id !== id);
      else state.customOrders = state.customOrders.filter(o => o.id !== id);
      return OK;
    },

    async setOrderStatus(table, id, status) {
      const failed = fail('setOrderStatus');
      if (failed) return failed;
      orderList(table).forEach(o => { if (o.id === id) o.status = status; });
      return OK;
    },
  };

  return {
    gateway,
    state,
    /** Faz o método seguinte (e todos depois dele) falhar com esta mensagem, até clearFailure. */
    failWith: (method: Method, message: string) => { failures.set(method, message); },
    clearFailure: (method: Method) => { failures.delete(method); },
  };
}
