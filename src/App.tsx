import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useMatch, Navigate } from 'react-router-dom';

import { signOut } from './services/auth';
import { ENV_LABEL } from './lib/config';
import { applyTheme, isBannerActive, bannerStyle } from './lib/theme';
import { useCart } from './hooks/useCart';
import { useCatalogData } from './hooks/useCatalogData';
import { useAdminActions } from './hooks/useAdminActions';

import UIProvider from './components/UIProvider';
import { useUI } from './components/UIContext';
import ErrorBoundary from './components/ErrorBoundary';
import type { Product } from './types';
import { SettingsContext } from './components/SettingsContext';
import ProductDetailModal from './features/vitrine/ProductDetailModal';
import CartDrawer from './features/vitrine/CartDrawer';
import { StoreHeader, AdminHeader, StoreFooter } from './components/Layout';

import CatalogView from './features/vitrine/CatalogView';
const CustomRequestView = lazy(() => import('./features/vitrine/CustomRequestView'));
const LoginView = lazy(() => import('./features/auth/LoginView'));
const PrivacyView = lazy(() => import('./features/vitrine/PrivacyView'));
const AboutView = lazy(() => import('./features/vitrine/AboutView'));

const AdminView = lazy(() => import('./features/admin/AdminView'));
const CustomOrderDetailModal = lazy(() => import('./features/admin/pedidos/OrderModals').then(m => ({ default: m.CustomOrderDetailModal })));
const CatalogOrderDetailModal = lazy(() => import('./features/admin/pedidos/OrderModals').then(m => ({ default: m.CatalogOrderDetailModal })));


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

  const {
    products, setProducts, categories, setCategories,
    customOrders, setCustomOrders, catalogOrders, setCatalogOrders,
    user, userRef, rawSettings, settings, loading, loadError, schemaRef, fetchData, retryLoad,
  } = useCatalogData();
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

  const {
    saveProduct, deleteProduct, saveCategory, deleteCategory, reorderProducts, reorderCategories,
    saveSettings, undoSettings, saveCustomOrder, saveCatalogOrder, deleteOrder, updateOrderStatus,
  } = useAdminActions({
    toast, fetchData, schemaRef, userRef, products, setProducts, categories, setCategories,
    rawSettings, settings, setCustomOrders, setCatalogOrders, clearCart,
  });

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

  const openProduct = (product: Product) => navigate({ pathname: `/produto/${product.id}`, search: location.search });
  const closeProduct = () => navigate({ pathname: '/', search: location.search });

  const handleLogout = async () => {
    await signOut();
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

      {ENV_LABEL && (
        <div role="note" data-testid="faixa-ambiente" className="bg-amber-400 text-amber-950 text-xs font-semibold text-center px-4 py-1.5">
          {ENV_LABEL} — os dados aqui não são os da loja real
        </div>
      )}

      {isStoreRoute && isBannerActive(settings) && (
        <div role="status" className="bg-blue-600 text-white text-sm text-center px-4 py-2" style={bannerStyle(settings)}>{settings.bannerText}</div>
      )}

      {/* HEADER 1: VITRINE */}
      {isStoreRoute && (
        <StoreHeader settings={settings} user={user} cartCount={cartCount} onOpenCart={openCart} />
      )}

      {/* HEADER 2: ADMIN */}
      {isAdminRoute && (
        <AdminHeader onLogout={handleLogout} />
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <Suspense fallback={<p role="status" className="py-16 text-center text-sm text-gray-500">Carregando...</p>}>
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
                settings={settings} onSaveSettings={saveSettings} onUndoSettings={undoSettings} user={user}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      {isStoreRoute && (
        <StoreFooter settings={settings} />
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

      <Suspense fallback={null}>
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
          products={products}
          onClose={() => setSelectedCatalogOrderId(null)}
          onDelete={deleteOrder('orders', setCatalogOrders, selectedCatalogOrderId, () => setSelectedCatalogOrderId(null))}
          onUpdateStatus={(id, status) => updateOrderStatus('orders', id, status)}
        />
      )}
      </Suspense>

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
