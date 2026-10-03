import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useMatch, Navigate, Link } from 'react-router-dom';
import { Package, Settings, Sparkles, ShoppingCart, LogIn, LogOut, ExternalLink, ShieldCheck, Info } from 'lucide-react';

import { supabase } from './lib/supabase';
import { mergeSettings, SETTING_FIELDS } from './lib/settings';
import { applyTheme, isBannerActive, bannerStyle, socialLinks } from './lib/theme';
import { useCart } from './hooks/useCart';
import { statusInfo } from './lib/format';

import UIProvider from './components/UIProvider';
import { useUI } from './components/UIContext';
import ErrorBoundary from './components/ErrorBoundary';
import { SettingsContext } from './components/SettingsContext';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';

import CatalogView from './views/CatalogView';
import CustomRequestView from './views/CustomRequestView';
import LoginView from './views/LoginView';
import PrivacyView from './views/PrivacyView';
import AboutView from './views/AboutView';

import AdminView from './admin/AdminView';
import { CustomOrderDetailModal, CatalogOrderDetailModal } from './admin/OrderModals';

const CURRENT_YEAR = new Date().getFullYear();
const ADMIN_REFRESH_MS = 30000; // reserva caso o tempo real do Supabase não esteja ativo

// Aparece se o carregamento demorar (por exemplo, conexão ruim ou servidor reiniciando)
function SlowHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return show ? <p className="text-xs text-gray-400 mt-2">Está demorando mais que o normal. Só mais um instante…</p> : null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <UIProvider>
        <BrowserRouter>
          <MainLayout />
        </BrowserRouter>
      </UIProvider>
    </ErrorBoundary>
  );
}

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useUI();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [catalogOrders, setCatalogOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [rawSettings, setRawSettings] = useState([]);
  const settings = useMemo(() => mergeSettings(rawSettings), [rawSettings]);
  const userRef = useRef(null); // usuário atual acessível dentro do fetchData
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const {
    cart, cartTotal, cartCount, addToCart, updateCartQuantity, removeFromCart, clearCart,
    isCartOpen, openCart, closeCart,
  } = useCart({ products, loading, loadError });
  const lastFetchRef = useRef(0);
  const schemaRef = useRef(false); // true quando o banco já tem as colunas de selo, vitrine e ordem (SQL 06)
  const knownOrdersRef = useRef({ orders: null, custom: null }); // ids já vistos (null = ainda não carregou)

  // Detalhes (admin): guardamos só o id, para o modal acompanhar mudanças de status
  const [selectedCustomOrderId, setSelectedCustomOrderId] = useState(null);
  const [selectedCatalogOrderId, setSelectedCatalogOrderId] = useState(null);

  // Produto aberto pelo endereço /produto/:id
  const productMatch = useMatch('/produto/:id');
  const routeProductId = productMatch?.params.id ?? null;

  // -------------------------------------------------------------------------
  // Dados
  // -------------------------------------------------------------------------
  // Avisa quando chega pedido novo (não avisa na primeira carga)
  const announceNew = useCallback((key, rows, one, many) => {
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
      const empty = Promise.resolve({ data: null, error: null });
      const [productsRes, categoriesRes, customOrdersRes, catalogOrdersRes, privateRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        // Pedidos contêm dados de clientes: só são buscados com o admin logado
        isAdmin ? supabase.from('custom_orders').select('*').order('created_at', { ascending: false }) : empty,
        isAdmin ? supabase.from('orders').select('*').order('created_at', { ascending: false }) : empty,
        // Link do modelo 3D: tabela separada, só o admin consegue ler
        isAdmin ? supabase.from('product_private').select('product_id, model_url') : empty,
        // Textos e menus personalizados (públicos). Se a tabela ainda não existir, usa os padrões.
        supabase.from('site_settings').select('key, value')
      ]);

      if (productsRes.error || categoriesRes.error) throw (productsRes.error || categoriesRes.error);

      if (settingsRes.error) console.error('Erro ao carregar configurações do site:', settingsRes.error);
      else setRawSettings(settingsRes.data || []);

      if (privateRes.error) console.error('Erro ao carregar links dos modelos:', privateRes.error);
      const modelUrls = {};
      (privateRes.data || []).forEach(r => { if (r.model_url) modelUrls[r.product_id] = r.model_url; });

      schemaRef.current = [...productsRes.data, ...categoriesRes.data].some(row => 'sort_order' in row);

      // Ordem da vitrine: a que o admin definiu; empatou (ou nunca definiu), o mais novo primeiro
      const byManual = (a, b) => (a.sortOrder - b.sortOrder) || (new Date(b.created_at) - new Date(a.created_at));
      setProducts(productsRes.data.map(p => ({
        ...p,
        sortOrder: p.sort_order ?? 0,
        badge: p.badge || '',
        section: p.section || '',
        categoryIds: p.category_ids || [],
        imageUrls: p.image_urls || [],
        active: p.active ?? true,
        stock: p.stock ?? 0,
        auraColor: p.aura_color || 'inherit',
        options: Array.isArray(p.options) ? p.options : [],
        leadTime: p.lead_time || '',
        modelUrl: modelUrls[p.id] || ''
      })).sort(byManual));
      setCategories(categoriesRes.data.map(c => ({ ...c, sortOrder: c.sort_order ?? 0, auraColor: c.aura_color || 'none' }))
        .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'pt-BR')));

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
      setLoadError(error?.message || 'Falha de conexão');
    } finally {
      setLoading(false);
    }
  }, [announceNew]);

  const retryLoad = () => { setLoading(true); fetchData(); };

  // Sessão do admin
  useEffect(() => {
    const applySession = (session) => {
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
    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    return () => subscription.unsubscribe();
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
    const adminChannel = supabase.channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe();

    // Reserva: mesmo sem o tempo real ativo, atualiza a cada 30 s enquanto a aba está visível
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
    }, ADMIN_REFRESH_MS);

    return () => {
      supabase.removeChannel(adminChannel);
      clearInterval(timer);
    };
  }, [userId, fetchData]);

  // -------------------------------------------------------------------------
  // Produtos e categorias (admin)
  // -------------------------------------------------------------------------
  const saveProduct = async (product) => {
    const payload = {
      title: product.title,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category_ids: product.categoryIds || [],
      image_urls: product.imageUrls || [],
      active: product.active,
      aura_color: product.auraColor || 'inherit',
      options: product.options || [],
      lead_time: product.leadTime || null
    };
    if (schemaRef.current) {
      payload.badge = (product.badge || '').trim() || null;
      payload.section = product.section || null;
    } else if ((product.badge || '').trim() || product.section) {
      toast.info('Selo e vitrine ainda não foram salvos: falta rodar o SQL 06 no Supabase (supabase/06-personalizacao.sql).');
    }
    if (product.id) payload.id = product.id;

    const { data: saved, error } = await supabase.from('products').upsert(payload).select('id').single();
    if (error) {
      toast.error(`Erro ao salvar produto: ${error.message}`);
      return false;
    }

    // Link do modelo 3D (admin): tabela separada. Só mexe se mudou.
    const newUrl = (product.modelUrl || '').trim();
    const oldUrl = product.id ? (products.find(p => p.id === product.id)?.modelUrl || '') : '';
    const copiedFromOther = !product.id && newUrl; // duplicação: copia o link para o novo produto
    if (newUrl !== oldUrl || copiedFromOther) {
      const q = supabase.from('product_private');
      const { error: privError } = newUrl
        ? await q.upsert({ product_id: saved.id, model_url: newUrl, updated_at: new Date().toISOString() })
        : await q.delete().eq('product_id', saved.id);
      if (privError) {
        toast.error(`Produto salvo, mas o link do modelo não foi salvo: ${privError.message}`);
        await fetchData();
        return true;
      }
    }
    toast.success('Produto salvo.');
    await fetchData();
    return true;
  };

  // Textos e menus do site: changes = { chave: 'valor' | null }. null volta ao padrão.
  // Antes de gravar, guarda o valor antigo das chaves mudadas (settingsBackup) para o botão "Desfazer".
  const saveSettings = async (changes, successMessage = 'Site atualizado.', { noBackup = false } = {}) => {
    const now = new Date().toISOString();
    const toSave = Object.entries(changes).filter(([, v]) => v !== null).map(([key, value]) => ({ key, value, updated_at: now }));
    const toReset = Object.entries(changes).filter(([, v]) => v === null).map(([key]) => key);

    if (noBackup) {
      toReset.push('settingsBackup');
    } else {
      const old = Object.fromEntries(Object.keys(changes).map(k => [k, rawSettings.find(r => r.key === k)?.value ?? null]));
      const backup = JSON.stringify({ t: now, v: old });
      if (backup.length <= 5000) toSave.push({ key: 'settingsBackup', value: backup, updated_at: now });
      else toReset.push('settingsBackup'); // grande demais para desfazer: melhor não oferecer um "desfazer" velho
    }

    if (toSave.length) {
      const { error } = await supabase.from('site_settings').upsert(toSave);
      if (error) { toast.error(`Erro ao salvar: ${error.message}`); return false; }
    }
    if (toReset.length) {
      const { error } = await supabase.from('site_settings').delete().in('key', toReset);
      if (error) { toast.error(`Erro ao salvar: ${error.message}`); return false; }
    }
    toast.success(successMessage);
    await fetchData();
    return true;
  };

  // Volta as chaves da última publicação ao valor que tinham antes
  const undoSettings = async () => {
    const backup = settings.backup;
    if (!backup) return false;
    const allowed = new Set([...SETTING_FIELDS.map(f => f.key), 'customAuras', 'auraOverrides']);
    const changes = {};
    for (const [key, value] of Object.entries(backup.v)) {
      if (allowed.has(key) && (value === null || typeof value === 'string')) changes[key] = value;
    }
    return saveSettings(changes, 'Última publicação desfeita.', { noBackup: true });
  };

  // Reordena produtos ou categorias: recebe os ids na nova ordem e grava só o que mudou
  const reorder = (table, list, setList) => async (orderedIds) => {
    if (!schemaRef.current) { toast.error('Para reordenar, falta rodar o SQL 06 no Supabase (supabase/06-personalizacao.sql).'); return false; }
    const current = new Map(list.map(i => [i.id, i.sortOrder]));
    const updates = orderedIds.map((id, idx) => ({ id, sort_order: idx + 1 })).filter(u => current.get(u.id) !== u.sort_order);
    if (!updates.length) return true;
    const next = new Map(updates.map(u => [u.id, u.sort_order]));
    setList(prev => prev.map(i => (next.has(i.id) ? { ...i, sortOrder: next.get(i.id) } : i)));
    const results = await Promise.all(updates.map(u => supabase.from(table).update({ sort_order: u.sort_order }).eq('id', u.id)));
    const failed = results.find(r => r.error);
    if (failed) toast.error(`Erro ao reordenar: ${failed.error.message}`);
    await fetchData();
    return !failed;
  };
  const reorderProducts = reorder('products', products, setProducts);
  const reorderCategories = reorder('categories', categories, setCategories);

  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return toast.error(`Erro ao remover produto: ${error.message}`);
    toast.success('Produto excluído.');
    await fetchData();
  };

  const saveCategory = async (category) => {
    const slug = category.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    const payload = { name: category.name, slug, description: category.description, aura_color: category.auraColor || 'none' };
    if (category.id) payload.id = category.id;
    else if (schemaRef.current) payload.sort_order = categories.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1; // nova categoria vai para o fim

    const { error } = await supabase.from('categories').upsert(payload);
    if (error) {
      toast.error(`Erro ao salvar categoria: ${error.message}`);
      return false;
    }
    toast.success('Categoria salva.');
    await fetchData();
    return true;
  };

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return toast.error(`Erro ao remover categoria: ${error.message}`);
    toast.success('Categoria excluída.');
    await fetchData();
  };

  // -------------------------------------------------------------------------
  // Pedidos
  // -------------------------------------------------------------------------
  const saveCustomOrder = async (orderData) => {
    const { error } = await supabase.from('custom_orders').insert(orderData);
    if (error) {
      console.error('Erro ao salvar pedido customizado:', error);
      toast.error(`Não foi possível enviar a solicitação: ${error.message}`);
      return false;
    }
    if (userRef.current) await fetchData();
    return true;
  };

  const saveCatalogOrder = async (orderData) => {
    const { error } = await supabase.from('orders').insert(orderData);
    if (error) {
      console.error('Erro ao realizar pedido:', error);
      toast.error(`Não foi possível enviar o pedido: ${error.message}`);
      return false;
    }
    clearCart();
    if (userRef.current) await fetchData();
    return true;
  };

  const deleteOrder = (table, setList, selectedId, clearSelected) => async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return toast.error(`Erro ao excluir: ${error.message}`);
    if (selectedId === id) clearSelected();
    setList(list => list.filter(o => o.id !== id));
    toast.success('Pedido excluído.');
  };

  const updateOrderStatus = async (table, id, status) => {
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (error) return toast.error(`Erro ao atualizar o status: ${error.message}`);
    const patch = (list) => list.map(o => (o.id === id ? { ...o, status } : o));
    if (table === 'orders') setCatalogOrders(patch); else setCustomOrders(patch);
  };

  // -------------------------------------------------------------------------
  // Produto aberto por endereço (/produto/:id)
  // -------------------------------------------------------------------------
  const selectedProduct = routeProductId ? products.find(p => String(p.id) === routeProductId) : null;

  useEffect(() => {
    if (loading || loadError || !routeProductId) return;
    if (!products.some(p => String(p.id) === routeProductId)) {
      toast.info('Esse produto não está mais disponível.');
      navigate('/', { replace: true });
    }
  }, [loading, loadError, routeProductId, products, navigate, toast]);

  const productTitle = selectedProduct?.title;
  useEffect(() => {
    if (!productTitle) return;
    const previous = document.title;
    document.title = `${productTitle} | ${settings.storeName}`;
    return () => { document.title = previous; };
  }, [productTitle, settings.storeName]);

  const openProduct = (product) => navigate({ pathname: `/produto/${product.id}`, search: location.search });
  const closeProduct = () => navigate({ pathname: '/', search: location.search });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Cor, fonte, logo/ícone da aba: acompanham o que o admin publicou
  useEffect(() => { applyTheme(settings); }, [settings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-gray-500">Carregando informações...</p>
        <SlowHint />
      </div>
    );
  }

  const isActive = (path) => location.pathname === path;
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname.startsWith('/login');
  const isStoreRoute = !isAdminRoute && !isLoginRoute;

  const selectedCustomOrder = customOrders.find(o => o.id === selectedCustomOrderId) || null;
  const selectedCatalogOrder = catalogOrders.find(o => o.id === selectedCatalogOrderId) || null;

  const catalogElement = (
    <CatalogView
      products={products}
      categories={categories}
      loadError={loadError}
      onRetry={retryLoad}
      onAddToCart={addToCart}
      onOpenProduct={openProduct}
      onOpenCustomRequest={() => navigate('/custom')}
    />
  );

  return (
    <SettingsContext.Provider value={settings}>
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">

      {isStoreRoute && isBannerActive(settings) && (
        <div role="status" className="bg-blue-600 text-white text-sm text-center px-4 py-2" style={bannerStyle(settings)}>{settings.bannerText}</div>
      )}

      {/* HEADER 1: VITRINE */}
      {isStoreRoute && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[4rem] py-2 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl} alt={settings.logoShowName ? '' : settings.storeName}
                  style={{ '--logo-h': `${Number(settings.logoSize) || 36}px`, '--logo-w': `${(Number(settings.logoSize) || 36) * 4}px` }}
                  className="object-contain h-[var(--logo-h)] max-sm:h-[min(var(--logo-h),48px)] max-w-[min(var(--logo-w),60vw)]"
                />
              ) : (
                <Package className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
              )}
              {(!settings.logoUrl || settings.logoShowName) && <span className="text-lg font-bold tracking-tight">{settings.storeName}</span>}
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => navigate('/')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {settings.menuHome}
              </button>

              {settings.aboutEnabled && <button
                onClick={() => navigate('/sobre')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${isActive('/sobre') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Info className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">{settings.menuAbout}</span>
                <span className="sr-only sm:hidden">{settings.menuAbout}</span>
              </button>}

              {settings.customEnabled && <button
                onClick={() => navigate('/custom')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${isActive('/custom') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">{settings.menuCustom}</span>
              </button>}

              {user ? (
                <button
                  onClick={() => window.open('/admin', '_blank')}
                  className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 text-gray-600 hover:bg-gray-100 transition-colors ml-1"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Acessar Painel</span>
                </button>
              ) : (
                <button
                  onClick={() => window.open('/login', '_blank')}
                  className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 text-gray-400 hover:bg-gray-50 transition-colors"
                  title="Acesso Administrativo" aria-label="Acesso administrativo"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}

              <div className="w-px h-6 bg-gray-300 mx-2"></div>

              <button
                onClick={openCart}
                aria-label={`Abrir orçamento (${cartCount} item(ns))`}
                className="relative p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </header>
      )}

      {/* HEADER 2: ADMIN */}
      {isAdminRoute && (
        <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-30 shadow-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-500" strokeWidth={2.5} />
              <span className="text-lg font-bold tracking-tight">Sistema Admin</span>
            </Link>
            <nav className="flex items-center gap-4">
              <button
                onClick={() => window.open('/', '_blank')}
                className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Loja</span>
              </button>
              <div className="w-px h-5 bg-slate-700"></div>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair do Sistema</span>
              </button>
            </nav>
          </div>
        </header>
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <Routes>
          <Route path="/" element={catalogElement} />
          <Route path="/produto/:id" element={catalogElement} />
          <Route path="/custom" element={settings.customEnabled ? <CustomRequestView onSaveOrder={saveCustomOrder} /> : <Navigate to="/" replace />} />
          <Route path="/sobre" element={settings.aboutEnabled ? <AboutView /> : <Navigate to="/" replace />} />
          <Route path="/privacidade" element={<PrivacyView />} />
          <Route path="/login" element={!user ? <LoginView onLoginSuccess={() => navigate('/admin')} /> : <Navigate to="/admin" replace />} />
          <Route path="/admin" element={
            user ? (
              <AdminView
                products={products} categories={categories} customOrders={customOrders} catalogOrders={catalogOrders}
                onSaveProduct={saveProduct} onDeleteProduct={deleteProduct} onReorderProducts={reorderProducts}
                onSaveCategory={saveCategory} onDeleteCategory={deleteCategory} onReorderCategories={reorderCategories}
                onDeleteCustomOrder={deleteOrder('custom_orders', setCustomOrders, selectedCustomOrderId, () => setSelectedCustomOrderId(null))}
                onDeleteCatalogOrder={deleteOrder('orders', setCatalogOrders, selectedCatalogOrderId, () => setSelectedCatalogOrderId(null))}
                onSelectCustomOrder={setSelectedCustomOrderId} onSelectCatalogOrder={setSelectedCatalogOrderId}
                onUpdateOrderStatus={updateOrderStatus}
                settings={settings} onSaveSettings={saveSettings} onUndoSettings={undoSettings}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isStoreRoute && (
        <footer className="border-t border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <div className="text-center sm:text-left">
              <span>© {CURRENT_YEAR} {settings.storeName}</span>
              {settings.footerText && <p className="mt-1">{settings.footerText}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {settings.aboutEnabled && <Link to="/sobre" className="hover:text-blue-600">{settings.menuAbout}</Link>}
              {socialLinks(settings).map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer noopener" className="hover:text-blue-600">{l.label}</a>
              ))}
              {settings.whatsapp && (
                <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-blue-600">WhatsApp</a>
              )}
              <Link to="/privacidade" className="hover:text-blue-600">Política de privacidade</Link>
            </div>
          </div>
        </footer>
      )}

      {selectedProduct && isStoreRoute && (
        <ProductDetailModal
          key={selectedProduct.id}
          product={selectedProduct}
          products={products}
          categories={categories}
          onClose={closeProduct}
          onAddToCart={addToCart}
          onOpenProduct={openProduct}
        />
      )}

      {selectedCustomOrder && (
        <CustomOrderDetailModal
          order={selectedCustomOrder}
          onClose={() => setSelectedCustomOrderId(null)}
          onDelete={deleteOrder('custom_orders', setCustomOrders, selectedCustomOrderId, () => setSelectedCustomOrderId(null))}
          onUpdateStatus={(id, status) => updateOrderStatus('custom_orders', id, status)}
        />
      )}

      {selectedCatalogOrder && (
        <CatalogOrderDetailModal
          order={selectedCatalogOrder}
          onClose={() => setSelectedCatalogOrderId(null)}
          onDelete={deleteOrder('orders', setCatalogOrders, selectedCatalogOrderId, () => setSelectedCatalogOrderId(null))}
          onUpdateStatus={(id, status) => updateOrderStatus('orders', id, status)}
        />
      )}

      {isStoreRoute && (
        <CartDrawer
          isOpen={isCartOpen} onClose={closeCart}
          cart={cart} updateQuantity={updateCartQuantity} removeItem={removeFromCart} total={cartTotal}
          onCheckout={saveCatalogOrder}
        />
      )}
    </div>
    </SettingsContext.Provider>
  );
}
