// Tipos de domínio compartilhados. Os de linha do banco (snake_case) espelham supabase/01-tabelas.sql;
// os "normalizados" (camelCase) são o que o useCatalogData entrega às telas.

export type OrderStatusId = 'novo' | 'em_producao' | 'enviado' | 'concluido' | 'cancelado';
export type DeliveryMethod = 'retirada' | 'entrega';

export interface OrderItem {
  id?: string;
  title: string;
  price: number;
  quantity: number;
  options?: Record<string, string>;
  image?: string | null;
  /** Miniaturas gravadas junto do item no momento da compra (só a primeira é usada). */
  imageUrls?: string[];
}

export interface CatalogOrder {
  id: string;
  client_name: string;
  client_phone: string;
  items: OrderItem[];
  total: number;
  status: OrderStatusId | 'pending' | string | null;
  notes?: string | null;
  delivery_method?: DeliveryMethod | string | null;
  delivery_address?: string | null;
  created_at: string;
}

export interface CustomOrder {
  id: string;
  client_name: string;
  client_phone: string;
  description: string;
  image_url?: string | null;
  status: OrderStatusId | 'pending' | string | null;
  created_at: string;
}

export interface ProductOption { name: string; values: string[] }

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  /** Unidades disponíveis para venda; Infinity quando o controle de estoque está desligado. */
  available: number;
  active: boolean;
  badge: string;
  section: string;
  sortOrder: number;
  categoryIds: string[];
  imageUrls: string[];
  auraColor: string;
  options: ProductOption[];
  leadTime?: string | null;
  modelUrl?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  auraColor?: string;
  sortOrder: number;
  visible?: boolean; // false = escondida do menu da vitrine (undefined em bancos antes do SQL 12)
  created_at?: string;
}

export interface SettingRow { key: string; value: string }

/** Formato de resposta do supabase-js que os serviços devolvem às telas. */
export interface DbResult<T = unknown> { data: T | null; error: { message: string } | null }

/** Pedido como as funções puras o enxergam: todos os campos opcionais (aceita pedidos parciais e pedidos personalizados). */
export type OrderLike = Partial<Omit<CatalogOrder, 'items'>> & { items?: Partial<OrderItem>[] | null; description?: string | null };

/** Linha do carrinho guardada no navegador. */
export interface CartLine { key: string; id: string; quantity: number; options: Record<string, string> }

/** Produto sem o campo calculado `available` (é o que fica no estado do useCatalogData). */
export type StoredProduct = Omit<Product, 'available'>;

/** Item do carrinho já cruzado com o produto atual (preço e estoque vêm do produto). */
export interface CartItem extends CartLine { product: Product }

/** Métodos de aviso expostos por useUI() (UIProvider.jsx); `error` é usado em `return toast.error(...)`. */
export interface ConfirmOptions { title?: string; message?: string; confirmLabel?: string; danger?: boolean }
export interface UIApi { toast: Toast; confirm: (options: ConfirmOptions) => Promise<boolean> }
export interface Toast { success(m: string): void; error(m: string): void; info(m: string): void }

/** Tabelas de pedidos aceitas pelos serviços. */
export type OrderTable = 'orders' | 'custom_orders';
