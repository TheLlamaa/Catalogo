import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useMatch, Navigate, Link } from 'react-router-dom';
import { Package, Settings, Sparkles, ShoppingCart, LogIn, LogOut, ExternalLink, ShieldCheck } from 'lucide-react';

import { supabase, STORE_NAME, STORE_WHATSAPP } from './lib/supabase';
import { lineKey, loadCart, saveCart } from './lib/cart';
import { statusInfo } from './lib/format';

import UIProvider from './components/UIProvider';
import { useUI } from './components/UIContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';

import CatalogView from './views/CatalogView';
import CustomRequestView from './views/CustomRequestView';
import LoginView from './views/LoginView';
import PrivacyView from './views/PrivacyView';

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
  const userRef = useRef(null); // usuário atual acessível dentro do fetchData
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const lastFetchRef = useRef(0);
  const knownOrdersRef = useRef({ orders: null, custom: null }); // ids já vistos (null = ainda não carregou)

  // Detalhes (admin): guardamos só o id, para o modal acompanhar mudanças de status
  const [selectedCustomOrderId, setSelectedCustomOrderId] = useState(null);
  const [selectedCatalogOrderId, setSelectedCatalogOrderId] = useState(null);

  // Carrinho: só id, quantidade e opções ficam no navegador
  const [cartLines, setCartLines] = useState(loadCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
      const [productsRes, categoriesRes, customOrdersRes, catalogOrdersRes, privateRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        // Pedidos contêm dados de clientes: só são buscados com o admin logado
        isAdmin ? supabase.from('custom_orders').select('*').order('created_at', { ascending: false }) : empty,
        isAdmin ? supabase.from('orders').select('*').order('created_at', { ascending: false }) : empty,
        // Link do modelo 3D: tabela separada, só o admin consegue ler
        isAdmin ? supabase.from('product_private').select('product_id, model_url') : empty
      ]);

      if (productsRes.error || categoriesRes.error) throw (productsRes.error || categoriesRes.error);

      if (privateRes.error) console.error('Erro ao carregar links dos modelos:', privateRes.error);
      const modelUrls = {};
      (privateRes.data || []).forEach(r => { if (r.model_url) modelUrls[r.product_id] = r.model_url; });

      setProducts(productsRes.data.map(p => ({
        ...p,
        categoryIds: p.category_ids || [],
        imageUrls: p.image_urls || [],
        active: p.active ?? true,
        stock: p.stock ?? 0,
        auraColor: p.aura_color || 'inherit',
        options: Array.isArray(p.options) ? p.options : [],
        leadTime: p.lead_time || '',
        modelUrl: modelUrls[p.id] || ''
      })));
      setCategories(categoriesRes.data.map(c => ({ ...c, auraColor: c.aura_color || 'none' })));

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
    setCartLines([]);
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
  // Carrinho
  // -------------------------------------------------------------------------
  const cart = useMemo(() => cartLines.map(line => {
    const product = products.find(p => String(p.id) === String(line.id));
    if (!product || product.active === false || product.stock <= 0) return null;
    return { ...line, quantity: Math.min(line.quantity, product.stock), product };
  }).filter(Boolean), [cartLines, products]);

  // Depois do primeiro carregamento, tira do carrinho o que saiu de linha ou ficou sem estoque
  useEffect(() => {
    if (loading || loadError) return;
    const valid = cart.map(({ key, id, quantity, options }) => ({ key, id, quantity, options }));
    const changed = valid.length !== cartLines.length || valid.some((l, i) => l.key !== cartLines[i].key || l.quantity !== cartLines[i].quantity);
    if (changed) setCartLines(valid);
  }, [loading, loadError, cart, cartLines]);

  useEffect(() => { saveCart(cartLines); }, [cartLines]);

  const unitsInCart = (productId) =>
    cartLines.filter(l => String(l.id) === String(productId)).reduce((sum, l) => sum + l.quantity, 0);

  const addToCart = (product, options = {}) => {
    if (product.stock <= 0) { toast.error('Produto esgotado no momento.'); return false; }
    if (unitsInCart(product.id) >= product.stock) {
      toast.error(`Temos apenas ${product.stock} unidade(s) em estoque.`);
      return false;
    }
    const key = lineKey(product.id, options);
    setCartLines(prev => (prev.some(l => l.key === key)
      ? prev.map(l => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
      : [...prev, { key, id: product.id, quantity: 1, options }]));
    setIsCartOpen(true);
    return true;
  };

  const updateCartQuantity = (key, delta) => {
    const line = cartLines.find(l => l.key === key);
    const product = line && products.find(p => String(p.id) === String(line.id));
    if (!line || !product) return;
    if (delta > 0 && unitsInCart(product.id) + delta > product.stock) {
      return toast.error(`Quantidade máxima em estoque atingida (${product.stock} unidades).`);
    }
    if (line.quantity + delta < 1) return;
    setCartLines(prev => prev.map(l => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)));
  };

  const removeFromCart = (key) => setCartLines(prev => prev.filter(l => l.key !== key));
  const cartTotal = cart.reduce((acc, l) => acc + l.product.price * l.quantity, 0);
  const cartCount = cart.reduce((acc, l) => acc + l.quantity, 0);

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
    document.title = `${productTitle} | ${STORE_NAME}`;
    return () => { document.title = previous; };
  }, [productTitle]);

  const openProduct = (product) => navigate({ pathname: `/produto/${product.id}`, search: location.search });
  const closeProduct = () => navigate({ pathname: '/', search: location.search });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">

      {/* HEADER 1: VITRINE */}
      {isStoreRoute && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
              <span className="text-lg font-bold tracking-tight">{STORE_NAME}</span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => navigate('/')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Vitrine
              </button>

              <button
                onClick={() => navigate('/custom')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${isActive('/custom') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Personalizado</span>
              </button>

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
                onClick={() => setIsCartOpen(true)}
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
        <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-10 shadow-md">
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
          <Route path="/custom" element={<CustomRequestView onSaveOrder={saveCustomOrder} />} />
          <Route path="/privacidade" element={<PrivacyView />} />
          <Route path="/login" element={!user ? <LoginView onLoginSuccess={() => navigate('/admin')} /> : <Navigate to="/admin" replace />} />
          <Route path="/admin" element={
            user ? (
              <AdminView
                products={products} categories={categories} customOrders={customOrders} catalogOrders={catalogOrders}
                onSaveProduct={saveProduct} onDeleteProduct={deleteProduct}
                onSaveCategory={saveCategory} onDeleteCategory={deleteCategory}
                onDeleteCustomOrder={deleteOrder('custom_orders', setCustomOrders, selectedCustomOrderId, () => setSelectedCustomOrderId(null))}
                onDeleteCatalogOrder={deleteOrder('orders', setCatalogOrders, selectedCatalogOrderId, () => setSelectedCatalogOrderId(null))}
                onSelectCustomOrder={setSelectedCustomOrderId} onSelectCatalogOrder={setSelectedCatalogOrderId}
                onUpdateOrderStatus={updateOrderStatus}
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
            <span>© {CURRENT_YEAR} {STORE_NAME}</span>
            <div className="flex items-center gap-4">
              {STORE_WHATSAPP && (
                <a href={`https://wa.me/${STORE_WHATSAPP}`} target="_blank" rel="noreferrer" className="hover:text-blue-600">WhatsApp</a>
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
          categories={categories}
          onClose={closeProduct}
          onAddToCart={addToCart}
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
          isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}
          cart={cart} updateQuantity={updateCartQuantity} removeItem={removeFromCart} total={cartTotal}
          onCheckout={saveCatalogOrder}
        />
      )}
    </div>
  );
}
