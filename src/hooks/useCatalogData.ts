import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { gateway, NO_CAPABILITIES } from '../services/gateway';
import type { Capabilities } from '../services/gateway';
import { getSession, onSessionChange } from '../services/auth';
import type { AuthUser, Session } from '../services/auth';
import { watchAdminChanges } from '../services/realtime';
import { mergeSettings } from '../lib/settings';
import { discountedPrice } from '../lib/discount';
import { useUI } from '../components/UIContext';
import type { Category, CatalogOrder, CustomOrder, SettingRow, StoredProduct, Toast } from '../types';

type OrderKey = 'orders' | 'custom';

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
  const capabilitiesRef = useRef<Capabilities>(NO_CAPABILITIES); // o que o banco já suporta (SQLs 06, 12 e 13)
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
      const snapshot = await gateway().load({ isAdmin });
      capabilitiesRef.current = snapshot.capabilities;
      setProducts(snapshot.products);
      setCategories(snapshot.categories);
      if (snapshot.settings) setRawSettings(snapshot.settings);
      if (snapshot.customOrders) {
        announceNew('custom', snapshot.customOrders, 'Nova solicitação personalizada de', 'novas solicitações personalizadas');
        setCustomOrders(snapshot.customOrders);
      }
      if (snapshot.catalogOrders) {
        announceNew('orders', snapshot.catalogOrders, 'Novo pedido de', 'novos pedidos');
        setCatalogOrders(snapshot.catalogOrders);
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
    user, userRef, rawSettings, settings, loading, loadError, capabilitiesRef, fetchData, retryLoad,
  };
}
