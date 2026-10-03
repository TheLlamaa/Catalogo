import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useMatch, Navigate } from 'react-router-dom';

import { supabase } from './lib/supabase';
import { SETTING_FIELDS } from './lib/settings';
import { applyTheme, isBannerActive, bannerStyle } from './lib/theme';
import { useCart } from './hooks/useCart';
import { useCatalogData } from './hooks/useCatalogData';

import UIProvider from './components/UIProvider';
import { useUI } from './components/UIContext';
import ErrorBoundary from './components/ErrorBoundary';
import { SettingsContext } from './components/SettingsContext';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import { StoreHeader, AdminHeader, StoreFooter } from './components/Layout';

import CatalogView from './views/CatalogView';
import CustomRequestView from './views/CustomRequestView';
import LoginView from './views/LoginView';
import PrivacyView from './views/PrivacyView';
import AboutView from './views/AboutView';

import AdminView from './admin/AdminView';
import { CustomOrderDetailModal, CatalogOrderDetailModal } from './admin/OrderModals';


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
  const [selectedCustomOrderId, setSelectedCustomOrderId] = useState(null);
  const [selectedCatalogOrderId, setSelectedCatalogOrderId] = useState(null);

  // Produto aberto pelo endereço /produto/:id
  const productMatch = useMatch('/produto/:id');
  const routeProductId = productMatch?.params.id ?? null;

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
        <StoreHeader settings={settings} user={user} cartCount={cartCount} onOpenCart={openCart} />
      )}

      {/* HEADER 2: ADMIN */}
      {isAdminRoute && (
        <AdminHeader onLogout={handleLogout} />
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
