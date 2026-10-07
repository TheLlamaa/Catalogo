import type { CatalogOrder, Category, CustomOrder, OrderTable, SettingRow, StoredProduct } from '../types';
import type { SchemaStatus } from '../lib/schema';
import { supabaseGateway } from './supabaseGateway';

// Interface única entre o site e o banco para catálogo, configurações e pedidos.
// Quem usa fala só em objetos de domínio (camelCase); linhas do banco, defaults e detecção de versão ficam atrás dela.
// Há dois adapters: supabaseGateway (produção) e memoryGateway (testes).

export interface GatewayError { message: string }
export interface GatewayResult { error: GatewayError | null }

// O que o banco já suporta (cada SQL novo liga um recurso). Detectado na leitura, dentro do adapter.
export interface Capabilities {
  ordering: boolean; // SQL 06: ordem manual, selo e vitrine
  discount: boolean; // SQL 13
  categoryVisibility: boolean; // SQL 12
}

export const NO_CAPABILITIES: Capabilities = { ordering: false, discount: false, categoryVisibility: false };

export interface CatalogSnapshot {
  products: StoredProduct[];
  categories: Category[];
  capabilities: Capabilities;
  // null = não veio (visitante, ou falha ao ler): quem chama mantém o que já tinha
  settings: SettingRow[] | null;
  customOrders: CustomOrder[] | null;
  catalogOrders: CatalogOrder[] | null;
}

// Campos que as edições rápidas da lista mudam sem regravar o produto inteiro
export type ProductPatch = Partial<Pick<StoredProduct, 'stock' | 'active' | 'section' | 'auraColor' | 'price'>>;

export type CategoryInput = Partial<Category> & { name: string };

export interface SettingsWrite { upsert: SettingRow[]; remove: string[] }

export interface SaveProductResult extends GatewayResult {
  // o produto foi salvo, mas o link do modelo 3D (tabela separada) não
  modelUrlError: GatewayError | null;
}

export interface CatalogGateway {
  /** Tudo que as telas precisam. Pedidos só com admin logado. Lança se produtos ou categorias não carregarem. */
  load(opts: { isAdmin: boolean }): Promise<CatalogSnapshot>;
  loadSchemaStatus(): Promise<SchemaStatus>;

  saveProduct(product: Partial<StoredProduct>, opts: { capabilities: Capabilities; previousModelUrl: string }): Promise<SaveProductResult>;
  patchProduct(id: string, patch: ProductPatch, opts: { capabilities: Capabilities }): Promise<GatewayResult>;
  deleteProduct(id: string): Promise<GatewayResult>;

  saveCategory(category: CategoryInput, opts: { capabilities: Capabilities; sortOrderIfNew?: number }): Promise<GatewayResult>;
  deleteCategory(id: string): Promise<GatewayResult>;

  reorder(table: 'products' | 'categories', updates: { id: string; sortOrder: number }[]): Promise<GatewayResult>;

  writeSettings(write: SettingsWrite): Promise<GatewayResult>;

  insertOrder(table: OrderTable, order: Record<string, unknown>): Promise<GatewayResult>;
  deleteOrder(table: OrderTable, id: string): Promise<GatewayResult>;
  setOrderStatus(table: OrderTable, id: string, status: string): Promise<GatewayResult>;
}

let current: CatalogGateway = supabaseGateway;

/** Gateway em uso. Os hooks chamam isto; testes trocam com setGateway. */
export const gateway = (): CatalogGateway => current;
export const setGateway = (next: CatalogGateway) => { current = next; };
