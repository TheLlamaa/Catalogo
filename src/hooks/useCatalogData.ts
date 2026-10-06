import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { fetchCatalog } from '../services/catalog';
import { getSession, onSessionChange } from '../services/auth';
import type { AuthUser, Session } from '../services/auth';
import { watchAdminChanges } from '../services/realtime';
import { mergeSettings } from '../lib/settings';
import { clampDiscount, discountedPrice } from '../lib/discount';
import { statusInfo } from '../lib/format';
import { useUI } from '../components/UIContext';
import type { Category, CatalogOrder, CustomOrder, DbResult, ProductOption, SettingRow, StoredProduct, Toast } from '../types';

type OrderKey = 'orders' | 'custom';

// Linhas como vêm do banco (snake_case); o supabase-js sem tipos gerados devolve any, então descrevemos o que usamos.
type ProductRow = Omit<StoredProduct, 'sortOrder' | 'categoryIds' | 'imageUrls' | 'auraColor' | 'leadTime' | 'modelUrl' | 'discountPercent'> & {
  discount_percent?: number | null;
  sort_order?: number | null; category_ids?: string[] | null; image_urls?: string[] | null;
  aura_color?: string | null; lead_time?: string | null; options?: ProductOption[] | unknown;
};
type CategoryRow = Omit<Category, 'sortOrder' | 'auraColor'> & { sort_order?: number | null; aura_color?: string | null };
interface CatalogFetch {
  products: DbResult<ProductRow[]>; categories: DbResult<CategoryRow[]>;
  customOrders: DbResult<CustomOrder[]>; orders: DbResult<CatalogOrder[]>;
  modelUrls: DbResult<{ product_id: string; model_url: string | null }[]>; settings: DbResult<SettingRow[]>;
}

const ADMIN_REFRESH_MS = 30000; // reserva caso o tempo real do Supabase não esteja ativo

// Carrega e mantém atualizados produtos, categorias, configurações do site e (só para o admin) os pedidos.
export function useCatalogData() {
  const { toast } = useUI() as { toast: Toast };
  const [rawProducts, setProducts] = useState<StoredProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [catalogOrders, setCatalogOrders] = useState<CatalogOrder[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [rawSettings, setRawSettings] = useState<SettingRow[]>([]);
  const settings = useMemo(() => mergeSettings(rawSettings), [rawSettings]);
  // Sem controle de estoque, todo produto ativo está sempre disponível (available infinito); o número guardado fica intacto
  const trackStock = settings.stockControl;
  const products = useMemo(
    () => rawProducts.map(p => ({ ...p, available: trackStock ? p.stock : Infinity, salePrice: discountedPrice(p.price, p.discountPercent) })),
    [rawProducts, trackStock]
  );
  const userRef = useRef<AuthUser | null>(null); // usuário atual acessível dentro do fetchData
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastFetchRef = useRef(0);
  const schemaRef = useRef(false); // true quando o banco já tem as colunas de selo, vitrine e ordem (SQL 06)
  const knownOrdersRef = useRef<Record<OrderKey, Set<string> | null>>({ orders: null, custom: null }); // ids já vistos (null = ainda não carregou)

  // Avisa quando chega pedido novo (não avisa na primeira carga)
  const announceNew = useCallback((key: OrderKey, rows: { id: string; client_name: string }[], one: string, many: string) => {
    const known = knownOrdersRef.current[key];
    if (known) {
      const fresh = rows.filter(o => !known.has(o.id));
      if (fresh.length === 1) toast.info(`${one} ${fresh[0].client_name}`);
      else if (fresh.length > 1) toast.info(`${fresh.length} ${many}`);
    }
    knownOrdersRef.current[key] = new Set(rows.map(o => o.id));
  }, [toast]);

  const fetchData = useCallback(async () => {
    lastFetchRef.current = Date.now();
    try {
      const isAdmin = !!userRef.current;
      // Cast único: o retorno de fetchCatalog mistura resultados do supabase-js (any) com DbResult<unknown> do `none()`
      const { products: productsRes, categories: categoriesRes, customOrders: customOrdersRes, orders: catalogOrdersRes, modelUrls: privateRes, settings: settingsRes } = await fetchCatalog({ isAdmin }) as unknown as CatalogFetch;

      if (productsRes.error || categoriesRes.error) throw (productsRes.error || categoriesRes.error);
      const productRows = productsRes.data ?? [];
      const categoryRows = categoriesRes.data ?? [];

      if (settingsRes.error) console.error('Erro ao carregar configurações do site:', settingsRes.error);
      else setRawSettings(settingsRes.data || []);

      if (privateRes.error) console.error('Erro ao carregar links dos modelos:', privateRes.error);
      const modelUrls: Record<string, string> = {};
      (privateRes.data || []).forEach(r => { if (r.model_url) modelUrls[r.product_id] = r.model_url; });

      schemaRef.current = [...productRows, ...categoryRows].some(row => 'sort_order' in row);

      // Ordem da vitrine: a que o admin definiu; empatou (ou nunca definiu), o mais novo primeiro
      const byManual = (a: StoredProduct, b: StoredProduct) => (a.sortOrder - b.sortOrder) || (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
      setProducts(productRows.map((p): StoredProduct => ({
        ...p,
        sortOrder: p.sort_order ?? 0,
        badge: p.badge || '',
        section: p.section || '',
        categoryIds: p.category_ids || [],
        imageUrls: p.image_urls || [],
        active: p.active ?? true,
        stock: p.stock ?? 0,
        auraColor: p.aura_color || 'inherit',
        options: Array.isArray(p.options) ? (p.options as ProductOption[]) : [],
        leadTime: p.lead_time || '',
        discountPercent: clampDiscount(p.discount_percent),
        modelUrl: modelUrls[p.id] || ''
      })).sort(byManual));
      setCategories(categoryRows.map((c): Category => ({ ...c, sortOrder: c.sort_order ?? 0, auraColor: c.aura_color || 'none' }))
        .sort((a: Category, b: Category) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'pt-BR')));

      if (customOrdersRes.error) console.error('Erro ao carregar pedidos personalizados:', customOrdersRes.error);
      else if (customOrdersRes.data) {
        announceNew('custom', customOrdersRes.data, 'Nova solicitação personalizada de', 'novas solicitações personalizadas');
        setCustomOrders(customOrdersRes.data.map(o => ({ ...o, status: statusInfo(o.status).id })));
      }
      if (catalogOrdersRes.error) console.error('Erro ao carregar pedidos:', catalogOrdersRes.error);
      else if (catalogOrdersRes.data) {
        announceNew('orders', catalogOrdersRes.data, 'Novo pedido de', 'novos pedidos');
        setCatalogOrders(catalogOrdersRes.data.map(o => ({ ...o, status: statusInfo(o.status).id })));
      }

      setLoadError(null);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoadError((error as { message?: string } | null)?.message || 'Falha de conexão');
    } finally {
      setLoading(false);
    }
  }, [announceNew]);

  const retryLoad = () => { setLoading(true); fetchData(); };

  // Sessão do admin
  useEffect(() => {
    const applySession = (session: Session) => {
      const nextUser = session?.user ?? null;
      const changed = (userRef.current?.id ?? null) !== (nextUser?.id ?? null);
      userRef.current = nextUser;
      setUser(nextUser);
      if (!changed) return;
      if (nextUser) {
        fetchData(); // logou: agora pode carregar os pedidos
      } else {
        setCustomOrders([]);
        setCatalogOrders([]);
        knownOrdersRef.current = { orders: null, custom: null };
      }
    };
    getSession().then(applySession);
    return onSessionChange(applySession);
  }, [fetchData]);

  // Carga inicial. Visitantes não mantêm conexão ao vivo: atualizam ao voltar para a aba
  // (no máximo uma vez a cada 30 segundos).
  useEffect(() => {
    fetchData();
    const onFocus = () => { if (Date.now() - lastFetchRef.current > 30000) fetchData(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  // Tempo real (produtos, categorias e pedidos): apenas com o admin logado
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    const stopWatching = watchAdminChanges(fetchData);

    // Reserva: mesmo sem o tempo real ativo, atualiza a cada 30 s enquanto a aba está visível
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
    }, ADMIN_REFRESH_MS);

    return () => {
      stopWatching();
      clearInterval(timer);
    };
  }, [userId, fetchData]);

  return {
    products, setProducts, categories, setCategories,
    customOrders, setCustomOrders, catalogOrders, setCatalogOrders,
    user, userRef, rawSettings, settings, loading, loadError, schemaRef, fetchData, retryLoad,
  };
}
