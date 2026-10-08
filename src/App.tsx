import { useState, useEffect, useLayoutEffect, useMemo, Suspense } from 'react';
import { makeT } from './lib/texts';
import { lazyWithReload } from './lib/staleChunk';
import { useColorMode } from './lib/colorMode';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useMatch, Navigate } from 'react-router-dom';

import { signOut } from './services/auth';
import { ENV_LABEL } from './lib/config';
import { applySeo } from './lib/seo';
import { applyPublishedTheme, cacheTheme, isBannerActive, bannerStyle } from './lib/theme';
import { mergeSettings } from './lib/settings';
import { IS_PREVIEW, usePreviewRows } from './lib/preview';
import { useCart } from './hooks/useCart';
import { useCatalogStore } from './hooks/useCatalogStore';

import UIProvider from './components/UIProvider';
import { useUI } from './components/UIContext';
import ErrorBoundary from './components/ErrorBoundary';
import type { OrderTable, Product } from './types';
import { SettingsContext } from './components/SettingsContext';
import ProductDetailModal from './features/vitrine/ProductDetailModal';
import CartDrawer from './features/vitrine/CartDrawer';
import { StoreHeader, AdminHeader, StoreFooter } from './components/Layout';

import CatalogView from './features/vitrine/CatalogView';
const CustomRequestView = lazyWithReload(() => import('./features/vitrine/CustomRequestView'));
const LoginView = lazyWithReload(() => import('./features/auth/LoginView'));
const PrivacyView = lazyWithReload(() => import('./features/vitrine/PrivacyView'));
const AboutView = lazyWithReload(() => import('./features/vitrine/AboutView'));
const PageView = lazyWithReload(() => import('./features/vitrine/PageView'));

const AdminView = lazyWithReload(() => import('./features/admin/AdminView'));
const AdminGate = lazyWithReload(() => import('./features/admin/AdminGate'));
const CustomOrderDetailModal = lazyWithReload(() => import('./features/admin/pedidos/OrderModals').then(m => ({ default: m.CustomOrderDetailModal })));
const CatalogOrderDetailModal = lazyWithReload(() => import('./features/admin/pedidos/OrderModals').then(m => ({ default: m.CatalogOrderDetailModal })));


// Aparece se o carregamento demorar (por exemplo, conexão ruim ou servidor reiniciando)
function SlowHint({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return show ? <p className="text-xs text-gray-500 mt-2">{text}</p> : null;
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

  const {
    products, categories, customOrders, catalogOrders, user, settings: publishedSettings, loading, loadError, retryLoad,
    saveCustomOrder, saveCatalogOrder, admin,
  } = useCatalogStore();
  // Na prévia do painel, a vitrine mostra o rascunho das configurações (ainda não publicado)
  const previewRows = usePreviewRows();
  const settings = useMemo(() => (previewRows ? mergeSettings(previewRows) : publishedSettings), [previewRows, publishedSettings]);
  const t = makeT(settings);
  const goneMessage = t('tProductGone');
  const {
    cart, cartTotal, cartCount, addToCart, updateCartQuantity, removeFromCart, clearCart,
    isCartOpen, openCart, closeCart,
  } = useCart({ products, loading, loadError });
  // Detalhes (admin): guardamos só o id, para o modal acompanhar mudanças de status
  const [selectedCustomOrderId, setSelectedCustomOrderId] = useState<string | null>(null);
  const [selectedCatalogOrderId, setSelectedCatalogOrderId] = useState<string | null>(null);

  // Produto aberto pelo endereço /produto/:id
  const productMatch = useMatch('/produto/:id');
  const routeProductId = productMatch?.params.id ?? null;

  // Na prévia nada é enviado de verdade
  const previewBlock = async () => { toast.info('Isto é só a prévia: pedidos não são enviados daqui.'); return false; };
  const checkoutCatalog = async (order: Record<string, unknown>) => {
    const ok = await saveCatalogOrder(order);
    if (ok) clearCart();
    return ok;
  };
  const onCatalogCheckout = IS_PREVIEW ? previewBlock : checkoutCatalog;
  const onCustomOrder = IS_PREVIEW ? previewBlock : saveCustomOrder;

  // -------------------------------------------------------------------------
  // Produto aberto por endereço (/produto/:id)
  // -------------------------------------------------------------------------
  const selectedProduct = routeProductId ? products.find(p => String(p.id) === routeProductId) : null;

  useEffect(() => {
    if (loading || loadError || !routeProductId) return;
    if (!products.some(p => String(p.id) === routeProductId)) {
      toast.info(goneMessage);
      navigate('/', { replace: true });
    }
  }, [loading, loadError, routeProductId, products, navigate, toast, goneMessage]);

  const productTitle = selectedProduct?.title;
  useEffect(() => {
    if (!productTitle) return;
    const previous = document.title;
    document.title = `${productTitle} | ${settings.storeName}`;
    return () => { document.title = previous; };
  }, [productTitle, settings.storeName]);

  const openProduct = (product: Product) => navigate({ pathname: `/produto/${product.id}`, search: location.search });
  const closeProduct = () => navigate({ pathname: '/', search: location.search });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Cor, fonte, logo/ícone da aba: acompanham o que o admin publicou
  // useLayoutEffect: aplica antes de a tela ser desenhada (sem piscar a cor padrão antes da cor da loja)
  // Enquanto carrega, fica a aparência guardada da última visita (main.tsx), não a padrão
  useLayoutEffect(() => {
    if (loading) return;
    applyPublishedTheme(settings); // não passa por cima do rascunho de Site > Aparência
    if (!IS_PREVIEW) cacheTheme(settings);
  }, [settings, loading]);
  const ownTitle = /^\/(produto|sobre|p)\//.test(location.pathname) || location.pathname === '/sobre';
  useEffect(() => { applySeo(settings, !ownTitle); }, [settings, ownTitle]);

  // Modo escuro: painel e login sempre podem; a vitrine só se o lojista não travou no claro
  const onPanel = location.pathname.startsWith('/admin') || location.pathname.startsWith('/login');
  const colorMode = useColorMode(onPanel || settings.darkMode !== 'off');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-gray-500">{t('tLoading')}</p>
        <SlowHint text={t('tSlowLoading')} />
      </div>
    );
  }

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname.startsWith('/login');
  if (IS_PREVIEW && (isAdminRoute || isLoginRoute)) return <Navigate to="/?preview=1" replace />; // a prévia fica só na vitrine
  const isStoreRoute = !isAdminRoute && !isLoginRoute;

  const selectOrder = (table: OrderTable, id: string) => (table === 'orders' ? setSelectedCatalogOrderId(id) : setSelectedCustomOrderId(id));
  const removeOrder = async (table: OrderTable, id: string) => {
    const ok = await admin.deleteOrder(table, id);
    if (ok) (table === 'orders' ? setSelectedCatalogOrderId : setSelectedCustomOrderId)(current => (current === id ? null : current));
    return ok;
  };

  const selectedCustomOrder = customOrders.find(o => o.id === selectedCustomOrderId) || null;
  const selectedCatalogOrder = catalogOrders.find(o => o.id === selectedCatalogOrderId) || null;

  // Vitrine: categorias ocultas não aparecem no menu, nos links nem na janela do produto (o painel vê todas)
  const publicCategories = categories.filter(c => c.visible !== false);

  const catalogElement = (
    <CatalogView
      products={products}
      categories={publicCategories}
      loadError={loadError}
      onRetry={retryLoad}
      onAddToCart={addToCart}
      onOpenProduct={openProduct}
      onOpenCustomRequest={() => navigate('/custom')}
    />
  );

  return (
    <SettingsContext.Provider value={settings}>
    <div className="min-h-screen bg-[var(--page)] text-gray-900 font-sans flex flex-col">

      {/* Atalho de teclado: aparece no primeiro Tab e pula cabeçalho e menus */}
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:text-blue-700 focus:font-medium focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-blue-500">{t('tSkipLink')}</a>

      {ENV_LABEL && !IS_PREVIEW && (
        <div role="note" data-testid="faixa-ambiente" className="bg-amber-400 text-amber-950 text-xs font-semibold text-center px-4 py-1.5">
          {ENV_LABEL} — os dados aqui não são os da loja real
        </div>
      )}

      {isStoreRoute && isBannerActive(settings) && (
        <div role="status" className="bg-blue-600 text-white text-sm text-center px-4 py-2" style={bannerStyle(settings)}>{settings.bannerText}</div>
      )}

      {/* HEADER 1: VITRINE */}
      {isStoreRoute && (
        <StoreHeader settings={settings} categories={publicCategories} user={user} cartCount={cartCount} onOpenCart={openCart} colorMode={settings.darkMode !== 'off' ? colorMode : undefined} />
      )}

      {/* HEADER 2: ADMIN */}
      {isAdminRoute && (
        <AdminHeader onLogout={handleLogout} storeName={settings.storeName} colorMode={colorMode} />
      )}

      <main id="conteudo" tabIndex={-1} className={`outline-none flex-1 mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full ${isAdminRoute ? 'max-w-7xl' : 'max-w-6xl'}`}>
        <Suspense fallback={<p role="status" className="py-16 text-center text-sm text-gray-500">Carregando...</p>}>
        <Routes>
          <Route path="/" element={catalogElement} />
          <Route path="/produto/:id" element={catalogElement} />
          <Route path="/custom" element={settings.customEnabled ? <CustomRequestView onSaveOrder={onCustomOrder} /> : <Navigate to="/" replace />} />
          <Route path="/sobre" element={settings.aboutEnabled ? <AboutView /> : <Navigate to="/" replace />} />
          <Route path="/p/:slug" element={<PageView />} />
          <Route path="/privacidade" element={<PrivacyView />} />
          <Route path="/login" element={!user ? <LoginView onLoginSuccess={() => navigate('/admin')} /> : <Navigate to="/admin" replace />} />
          <Route path="/admin" element={
            user ? (
              <AdminGate userId={user.id} onLogout={handleLogout}>
                <AdminView admin={admin} onSelectOrder={selectOrder} onDeleteOrder={removeOrder} />
              </AdminGate>
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      {isStoreRoute && (
        <StoreFooter settings={settings} categories={publicCategories} />
      )}

      {selectedProduct && isStoreRoute && (
        <ProductDetailModal
          key={selectedProduct.id}
          product={selectedProduct}
          products={products}
          categories={publicCategories}
          onClose={closeProduct}
          onAddToCart={addToCart}
          onOpenProduct={openProduct}
        />
      )}

      <Suspense fallback={null}>
      {selectedCustomOrder && (
        <CustomOrderDetailModal
          order={selectedCustomOrder}
          onClose={() => setSelectedCustomOrderId(null)}
          onDelete={(id) => removeOrder('custom_orders', id)}
          onUpdateStatus={(id, status) => admin.updateOrderStatus('custom_orders', id, status)}
        />
      )}

      {selectedCatalogOrder && (
        <CatalogOrderDetailModal
          order={selectedCatalogOrder}
          products={products}
          onClose={() => setSelectedCatalogOrderId(null)}
          onDelete={(id) => removeOrder('orders', id)}
          onUpdateStatus={(id, status) => admin.updateOrderStatus('orders', id, status)}
        />
      )}
      </Suspense>

      {isStoreRoute && (
        <CartDrawer
          isOpen={isCartOpen} onClose={closeCart}
          cart={cart} updateQuantity={updateCartQuantity} removeItem={removeFromCart} total={cartTotal}
          onCheckout={onCatalogCheckout}
        />
      )}
    </div>
    </SettingsContext.Provider>
  );
}
