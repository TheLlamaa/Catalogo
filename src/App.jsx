import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Package, 
  Settings, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Search,
  Edit2,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  LogOut,
  LogIn,
  Minus,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Upload,
  MessageSquare,
  Sparkles,
  Send,
  FileText,
  CheckCircle2,
  ExternalLink,
  Phone,
  User,
  Calendar,
  ShoppingBag,
  Layers,
  ArrowRight,
  Palette,
  ShieldCheck
} from 'lucide-react';

// ============================================================================
// CONEXÃO COM O BANCO DE DADOS
// ============================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AURA_OPTIONS = [
  { id: 'inherit', name: 'Padrão da Categoria' },
  { id: 'none', name: 'Nenhuma' },
  { id: 'rainbow', name: 'Rainbow' },
  { id: 'holo', name: 'Holo' },
  { id: 'dual', name: 'Dual' },
  { id: 'gold', name: 'Gold' },
  { id: 'silver', name: 'Silver' },
  { id: 'glow', name: 'Glow' },
  { id: 'blue', name: 'Blue' },
  { id: 'purple', name: 'Purple' },
  { id: 'red', name: 'Red' },
  { id: 'green', name: 'Green' },
  { id: 'valentines', name: 'Valentines' },
  { id: 'religious', name: 'Religious' },
  { id: 'christmas', name: 'Christmas' },
  { id: 'halloween', name: 'Halloween' },
  { id: 'newyear', name: 'New Year' },
  { id: 'easter', name: 'Easter' },
  { id: 'cyberpunk', name: 'Cyberpunk' }
];

const AURA_CLASS_MAP = {
  none: 'aura-none',
  rainbow: 'aura-rainbow',
  holo: 'aura-holo',
  dual: 'aura-dual',
  gold: 'aura-gold',
  silver: 'aura-silver',
  glow: 'aura-glow',
  blue: 'aura-blue',
  purple: 'aura-purple',
  red: 'aura-red',
  green: 'aura-green',
  valentines: 'aura-valentines',
  religious: 'aura-religious',
  christmas: 'aura-christmas',
  halloween: 'aura-halloween',
  newyear: 'aura-newyear',
  easter: 'aura-easter',
  cyberpunk: 'aura-cyberpunk'
};

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [catalogOrders, setCatalogOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modais de Detalhes
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCustomOrder, setSelectedCustomOrder] = useState(null);
  const [selectedCatalogOrder, setSelectedCatalogOrder] = useState(null);

  // Estados do Carrinho
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, customOrdersRes, catalogOrdersRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('custom_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      ]);

      if (productsRes.data) {
        const mappedProducts = productsRes.data.map(p => ({
          ...p,
          categoryIds: p.category_ids || [],
          imageUrls: p.image_urls || [],
          active: p.active ?? true,
          stock: p.stock ?? 0,
          auraColor: p.aura_color || 'inherit'
        }));
        setProducts(mappedProducts);
      }

      if (categoriesRes.data) {
        const mappedCategories = categoriesRes.data.map(c => ({
          ...c,
          auraColor: c.aura_color || 'none'
        }));
        setCategories(mappedCategories);
      }

      if (customOrdersRes.data) setCustomOrders(customOrdersRes.data);
      if (catalogOrdersRes.data) setCatalogOrders(catalogOrdersRes.data);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const saveProduct = async (product) => {
    const payload = {
      title: product.title,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category_ids: product.categoryIds || [],
      image_urls: product.imageUrls || [],
      active: product.active,
      aura_color: product.auraColor || 'inherit'
    };

    if (product.id) payload.id = product.id;

    const { error } = await supabase.from('products').upsert(payload);
    if (error) {
      alert(`Erro ao salvar produto: ${error.message}`);
    } else {
      await fetchData(); // Atualiza a lista após salvar
    }
  };

  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert(`Erro ao remover produto: ${error.message}`);
    } else {
      await fetchData();
    }
  };

  const saveCategory = async (category) => {
    const slug = category.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    const payload = { 
      name: category.name, 
      slug, 
      description: category.description,
      aura_color: category.auraColor || 'none'
    };
    if (category.id) payload.id = category.id;

    const { error } = await supabase.from('categories').upsert(payload);
    if (error) {
      alert(`Erro ao salvar categoria: ${error.message}`);
    } else {
      await fetchData();
    }
  };

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert(`Erro ao remover categoria: ${error.message}`);
    } else {
      await fetchData();
    }
  };

  const saveCustomOrder = async (orderData) => {
    const { error } = await supabase.from('custom_orders').insert(orderData);
    if (error) {
      console.error("Erro ao salvar pedido customizado:", error);
      alert(`Erro ao enviar solicitação: ${error.message}`);
      return false;
    } else {
      await fetchData();
      return true;
    }
  };

  const deleteCustomOrder = async (id) => {
    const { error } = await supabase.from('custom_orders').delete().eq('id', id);
    if (error) {
      alert(`Erro ao excluir solicitação: ${error.message}`);
    } else {
      if (selectedCustomOrder?.id === id) setSelectedCustomOrder(null);
      await fetchData();
    }
  };

  const saveCatalogOrder = async (orderData) => {
    const { error } = await supabase.from('orders').insert(orderData);
    if (error) {
      console.error("Erro ao realizar pedido:", error);
      alert(`Erro ao processar pedido: ${error.message}`);
      return false;
    } else {
      await fetchData();
      setCart([]);
      return true;
    }
  };

  const deleteCatalogOrder = async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      alert(`Erro ao excluir pedido: ${error.message}`);
    } else {
      if (selectedCatalogOrder?.id === id) setSelectedCatalogOrder(null);
      await fetchData();
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return alert("Produto esgotado no momento.");

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Desculpe, temos apenas ${product.stock} unidade(s) disponível(is) em estoque.`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const newQ = item.quantity + delta;
        if (product && newQ > product.stock) {
          alert(`Quantidade máxima em estoque atingida (${product.stock} unidades).`);
          return item;
        }
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-gray-500">Carregando informações...</p>
      </div>
    );
  }

  const isActive = (path) => location.pathname === path;
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname.startsWith('/login');
  const isStoreRoute = !isAdminRoute && !isLoginRoute;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      
      {/* ========================================================= */}
      {/* HEADER 1: VITRINE (Aparece apenas na Loja e Pedidos)      */}
      {/* ========================================================= */}
      {isStoreRoute && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <Package className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
              <span className="text-lg font-bold tracking-tight">Catálogo 3D</span>
            </div>
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
                  title="Acesso Administrativo"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}

              <div className="w-px h-6 bg-gray-300 mx-2"></div>

              <button
                onClick={() => setIsCartOpen(true)}
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

      {/* ========================================================= */}
      {/* HEADER 2: ADMIN BACKOFFICE (Totalmente isolado)           */}
      {/* ========================================================= */}
      {isAdminRoute && (
        <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-10 shadow-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin')}>
              <Settings className="w-6 h-6 text-blue-500" strokeWidth={2.5} />
              <span className="text-lg font-bold tracking-tight">Sistema Admin</span>
            </div>
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

      {/* ========================================================= */}
      {/* CONTEÚDO DINÂMICO (ROTAS)                                 */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <Routes>
          <Route path="/" element={
            <CatalogView 
              products={products} 
              categories={categories} 
              onAddToCart={addToCart} 
              onSelectProduct={setSelectedProduct} 
              onOpenCustomRequest={() => navigate('/custom')}
            />
          } />

          <Route path="/custom" element={
            <CustomRequestView onSaveOrder={saveCustomOrder} />
          } />

          <Route path="/login" element={
            !user ? <LoginView onLoginSuccess={() => navigate('/admin')} /> : <Navigate to="/admin" replace />
          } />

          <Route path="/admin" element={
            user ? (
              <AdminView 
                products={products} categories={categories} customOrders={customOrders} catalogOrders={catalogOrders}
                onSaveProduct={saveProduct} onDeleteProduct={deleteProduct}
                onSaveCategory={saveCategory} onDeleteCategory={deleteCategory}
                onDeleteCustomOrder={deleteCustomOrder} onDeleteCatalogOrder={deleteCatalogOrder}
                onSelectCustomOrder={setSelectedCustomOrder} onSelectCatalogOrder={setSelectedCatalogOrder}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* ========================================================= */}
      {/* MODAIS E GAVETAS FLUTUANTES                               */}
      {/* ========================================================= */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          categories={categories} 
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={addToCart} 
        />
      )}

      {selectedCustomOrder && (
        <CustomOrderDetailModal 
          order={selectedCustomOrder}
          onClose={() => setSelectedCustomOrder(null)}
          onDelete={deleteCustomOrder}
        />
      )}

      {selectedCatalogOrder && (
        <CatalogOrderDetailModal 
          order={selectedCatalogOrder}
          onClose={() => setSelectedCatalogOrder(null)}
          onDelete={deleteCatalogOrder}
        />
      )}

      {/* Gaveta do Carrinho só existe no contexto da loja */}
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

// ============================================================================
// COMPONENTES DE VIEWS E REUTILIZÁVEIS
// ============================================================================

function CatalogView({ products, categories, onAddToCart, onSelectProduct, onOpenCustomRequest }) {
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('recent'); 

  const activeCategories = categories.filter(category => 
    products.some(product => product.categoryIds?.includes(category.id) && product.active !== false)
  );

  let filteredProducts = products.filter(product => {
    const isVisible = product.active !== false;
    const matchesCategory = activeCategoryId === 'all' || (product.categoryIds && product.categoryIds.includes(activeCategoryId));
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return isVisible && matchesCategory && matchesSearch;
  });

  filteredProducts.sort((a, b) => {
    if (sortOrder === 'price_asc') return a.price - b.price;
    if (sortOrder === 'price_desc') return b.price - a.price;
    return -1;
  });

  const activeCategory = categories.find(c => c.id === activeCategoryId);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="mb-8">
          <label className="sr-only">Buscar produtos</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar modelos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Categorias</h2>
          <button
            onClick={() => setActiveCategoryId('all')}
            className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${activeCategoryId === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Todos os modelos
          </button>
          {activeCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategoryId(category.id)}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${activeCategoryId === category.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <span>{category.name}</span>
              {category.auraColor && category.auraColor !== 'none' && (
                <span className={`w-2.5 h-2.5 rounded-full aura ${AURA_CLASS_MAP[category.auraColor] || 'aura-none'}`} title={`Aura: ${category.auraColor}`} />
              )}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <div className="mb-6 pb-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span>{activeCategory ? activeCategory.name : 'Catálogo Completo'}</span>
              {activeCategory?.auraColor && activeCategory.auraColor !== 'none' && (
                <span className={`inline-block w-3 h-3 rounded-full aura ${AURA_CLASS_MAP[activeCategory.auraColor] || 'aura-none'}`} />
              )}
            </h1>
            <p className="text-gray-600 mt-2 text-sm max-w-2xl">
              {activeCategory ? activeCategory.description : 'Explore nossa coleção de peças impressas em 3D. Clique em um produto para ver mais fotos e detalhes.'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-gray-500 hidden sm:block" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-1.5 pl-3 pr-8 text-sm bg-white cursor-pointer"
            >
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CARD PRODUTO CUSTOMIZADO FIXO (Sem Aura para evitar bugs de hover na capa) */}
          <div 
            onClick={onOpenCustomRequest}
            className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-6 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-all cursor-pointer border border-blue-500 group relative overflow-hidden"
          >
            <div className="absolute -right-6 -bottom-6 opacity-10 text-white pointer-events-none">
              <Sparkles className="w-40 h-40" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-blue-100 mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Destaque Especial
              </div>
              <h3 className="text-xl font-bold leading-tight mb-2 group-hover:text-blue-200 transition-colors">
                Peça Personalizada
              </h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                Precisa de um projeto exclusivo ou tem uma foto de referência? Envie sua ideia e criaremos um orçamento sob medida.
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-white/20 flex items-center justify-between font-semibold text-sm">
              <span>Solicitar Orçamento</span>
              <div className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* LISTA DE PRODUTOS */}
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              categories={categories}
              onAddToCart={() => onAddToCart(product)} 
              onClick={() => onSelectProduct(product)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, categories, onAddToCart, onClick }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.imageUrls?.length > 0 ? product.imageUrls : [];
  const isOutOfStock = product.stock <= 0;

  // Lógica de herança de Aura (Se o produto for 'inherit', pega a da categoria)
  let effectiveAuraKey = product.auraColor && product.auraColor !== 'inherit' ? product.auraColor : 'none';

  if ((!product.auraColor || product.auraColor === 'inherit') && product.categoryIds?.length > 0) {
    const matchedCategory = categories.find(c => product.categoryIds.includes(c.id) && c.auraColor && c.auraColor !== 'none');
    if (matchedCategory) {
      effectiveAuraKey = matchedCategory.auraColor;
    }
  }

  const auraClassName = AURA_CLASS_MAP[effectiveAuraKey] || 'aura-none';

  const nextImage = (e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % images.length); };
  const prevImage = (e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)); };

  const CardContent = (
    <article 
      onClick={onClick}
      className="bg-white rounded-xl overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer group relative z-10 w-full"
    >
      <div className="aspect-square bg-gray-50 relative border-b border-gray-100 overflow-hidden">
        {images.length > 0 ? (
          <>
            <img src={images[currentImageIndex]} alt={product.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            {images.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"><ChevronRight className="w-5 h-5" /></button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, idx) => <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />)}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="h-10 w-10 opacity-50" /></div>
        )}

        {isOutOfStock && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">
            Esgotado
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-gray-900 leading-tight mb-1">{product.title}</h3>
        <span className="text-xs text-gray-500 mb-2 font-medium">
          {isOutOfStock ? 'Sem estoque disponível' : `${product.stock} unidade(s) disponível(is)`}
        </span>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{product.description}</p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <span className="text-lg font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</span>
          <button 
            disabled={isOutOfStock}
            onClick={(e) => { e.stopPropagation(); onAddToCart(); }} 
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            <ShoppingCart className="w-4 h-4" /> {isOutOfStock ? 'Indisponível' : 'Adicionar'}
          </button>
        </div>
      </div>
    </article>
  );

  if (effectiveAuraKey !== 'none') {
    return (
      <div className={`aura ${auraClassName} h-full`}>
        {CardContent}
      </div>
    );
  }

  return CardContent;
}

function ProductDetailModal({ product, categories, onClose, onAddToCart }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = product.imageUrls?.length > 0 ? product.imageUrls : [];
  const productCategories = categories.filter(c => product.categoryIds?.includes(c.id));
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col md:flex-row relative max-h-[90vh]">
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 z-10 bg-white/80 hover:bg-white text-gray-600 p-1.5 rounded-full shadow transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-full md:w-1/2 bg-gray-50 p-4 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200">
          <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-200 bg-white">
            {images.length > 0 ? (
              <img src={images[activeImageIndex]} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="w-12 h-12" /></div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all ${idx === activeImageIndex ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {productCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {productCategories.map(cat => (
                  <span key={cat.id} className="text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
            <h2 className="text-2xl font-bold text-gray-900 leading-snug mb-2">{product.title}</h2>
            
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-extrabold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isOutOfStock ? 'Esgotado' : `${product.stock} em estoque`}
              </span>
            </div>
            
            <div className="border-t border-gray-100 pt-4 mb-6">
              <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">Descrição</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{product.description}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex gap-3">
            <button 
              disabled={isOutOfStock}
              onClick={() => { onAddToCart(product); onClose(); }} 
              className={`flex-1 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              <ShoppingCart className="w-5 h-5" /> {isOutOfStock ? 'Indisponível' : 'Adicionar ao Orçamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomOrderDetailModal({ order, onClose, onDelete }) {
  const cleanPhone = order.client_phone.replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col relative max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Detalhes do Pedido Personalizado</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {order.image_url ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex justify-center max-h-80">
              <img src={order.image_url} alt="Referência enviada" className="object-contain max-h-80 w-auto" />
            </div>
          ) : (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 text-gray-400">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhuma imagem enviada para este pedido</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-md"><User className="w-4 h-4" /></div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">Cliente</span>
                <span className="text-sm font-bold text-gray-900">{order.client_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-md"><Phone className="w-4 h-4" /></div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">WhatsApp</span>
                <span className="text-sm font-bold text-gray-900">{order.client_phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-md"><Calendar className="w-4 h-4" /></div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">Data da Solicitação</span>
                <span className="text-sm font-semibold text-gray-800">
                  {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Observações e Especificações do Pedido</h3>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 whitespace-pre-line leading-relaxed">
              {order.description}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <button 
            onClick={() => { if (window.confirm('Excluir esta solicitação?')) onDelete(order.id); }}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Excluir Pedido
          </button>

          <a 
            href={`https://wa.me/55${cleanPhone}`}
            target="_blank"
            rel="noreferrer"
            className="bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <MessageSquare className="w-4 h-4" /> Responder no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function CatalogOrderDetailModal({ order, onClose, onDelete }) {
  const cleanPhone = order.client_phone.replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col relative max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Detalhes da Compra</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-md"><User className="w-4 h-4" /></div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">Cliente</span>
                <span className="text-sm font-bold text-gray-900">{order.client_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-md"><Phone className="w-4 h-4" /></div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">WhatsApp</span>
                <span className="text-sm font-bold text-gray-900">{order.client_phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-md"><Calendar className="w-4 h-4" /></div>
              <div>
                <span className="text-xs text-gray-500 font-medium block">Data do Pedido</span>
                <span className="text-sm font-semibold text-gray-800">
                  {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Itens do Pedido ({order.items?.length || 0})</h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
              {order.items?.map((item, idx) => {
                const imgUrl = item.imageUrls?.length > 0 ? item.imageUrls[0] : null;
                return (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                        <span className="text-xs text-gray-500">{item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)} cada</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Total do Pedido</span>
            <span className="text-xl font-extrabold text-blue-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <button 
            onClick={() => { if (window.confirm('Excluir este pedido?')) onDelete(order.id); }}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Excluir Pedido
          </button>

          <a 
            href={`https://wa.me/55${cleanPhone}`}
            target="_blank"
            rel="noreferrer"
            className="bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <MessageSquare className="w-4 h-4" /> Entrar em Contato no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function CustomRequestView({ onSaveOrder }) {
  const [formData, setFormData] = useState({ clientName: '', clientPhone: '', description: '', imageUrl: '' });
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const navigate = useNavigate();

  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let { width, height } = img;
        if (width > height && width > MAX) { height *= MAX / width; width = MAX; } 
        else if (height > MAX) { width *= MAX / height; height = MAX; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject; img.src = reader.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, imageUrl: compressed }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientName || !formData.clientPhone || !formData.description) {
      return alert("Por favor, preencha nome, WhatsApp e a descrição do pedido.");
    }

    setIsSubmitting(true);

    const success = await onSaveOrder({
      client_name: formData.clientName,
      client_phone: formData.clientPhone,
      description: formData.description,
      image_url: formData.imageUrl
    });

    setIsSubmitting(false);

    if (success) {
      setSentSuccess(true);
    }
  };

  if (sentSuccess) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6 bg-white border border-gray-200 rounded-xl text-center shadow-sm">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitação Enviada!</h2>
        <p className="text-gray-600 text-sm mb-6">Sua proposta e fotos foram recebidas com sucesso. Nossa equipe analisará os detalhes e entrará em contato com você pelo WhatsApp em breve!</p>
        
        <div className="flex items-center justify-center gap-3 mt-8">
          <button 
            onClick={() => { setSentSuccess(false); setFormData({ clientName: '', clientPhone: '', description: '', imageUrl: '' }); }}
            className="px-6 py-2.5 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors"
          >
            Enviar Outra Solicitação
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para Loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-yellow-300" />
          <h1 className="text-2xl font-bold">Solicitar Peça Personalizada</h1>
        </div>
        <p className="text-blue-100 text-sm">Tem um modelo em mente ou uma foto de referência? Preencha os campos abaixo e entraremos em contato com um orçamento sob medida.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome *</label>
            <input 
              required type="text" placeholder="Ex: Maria Silva"
              value={formData.clientName} onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu WhatsApp *</label>
            <input 
              required type="text" placeholder="(11) 99999-9999"
              value={formData.clientPhone} onChange={e => setFormData(p => ({ ...p, clientPhone: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Foto ou Referência do Modelo</label>
          {formData.imageUrl ? (
            <div className="relative w-32 h-32 border border-gray-200 rounded-lg overflow-hidden group">
              <img src={formData.imageUrl} alt="" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))}
                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${isCompressing ? 'opacity-50 pointer-events-none' : ''}`}>
              {isCompressing ? (
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Clique para enviar uma foto ou desenho</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG ou JPEG</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isCompressing} className="sr-only" />
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações e Detalhes da Peça *</label>
          <textarea 
            required rows={4} 
            placeholder="Descreva o tamanho desejado, cor, utilização da peça ou qualquer detalhe importante..."
            value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" 
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Send className="w-5 h-5" /> Enviar Solicitação de Orçamento
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function AdminView({ 
  products, categories, customOrders, catalogOrders, 
  onSaveProduct, onDeleteProduct, onSaveCategory, onDeleteCategory, 
  onDeleteCustomOrder, onDeleteCatalogOrder,
  onSelectCustomOrder, onSelectCatalogOrder 
}) {
  const [activeTab, setActiveTab] = useState('orders'); // orders, custom_orders, products, categories

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-200 px-6 bg-gray-50/50 overflow-x-auto">
        <button onClick={() => setActiveTab('orders')} className={`py-4 px-4 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <span>Pedidos</span>
          <span className="text-xs">({catalogOrders.length})</span>
        </button>

        <button onClick={() => setActiveTab('custom_orders')} className={`py-4 px-4 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'custom_orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <span>Pedidos Custom</span>
          <span className="text-xs">({customOrders.length})</span>
        </button>

        <button onClick={() => setActiveTab('products')} className={`py-4 px-4 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <span>Produtos</span>
          <span className="text-xs">({products.length})</span>
        </button>

        <button onClick={() => setActiveTab('categories')} className={`py-4 px-4 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <span>Categorias</span>
          <span className="text-xs">({categories.length})</span>
        </button>
      </div>
      <div className="p-6">
        {activeTab === 'orders' && (
          <CatalogOrdersManager 
            orders={catalogOrders} 
            onDelete={onDeleteCatalogOrder} 
            onSelectOrder={onSelectCatalogOrder}
          />
        )}
        {activeTab === 'custom_orders' && (
          <CustomOrdersManager 
            customOrders={customOrders} 
            onDelete={onDeleteCustomOrder} 
            onSelectOrder={onSelectCustomOrder}
          />
        )}
        {activeTab === 'products' && <ProductManager products={products} categories={categories} onSave={onSaveProduct} onDelete={onDeleteProduct} />}
        {activeTab === 'categories' && <CategoryManager categories={categories} onSave={onSaveCategory} onDelete={onDeleteCategory} />}
      </div>
    </div>
  );
}

function CatalogOrdersManager({ orders, onDelete, onSelectOrder }) {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-6">Vendas do Catálogo ({orders.length})</h2>
      
      {orders.length === 0 ? (
        <div className="py-12 text-center border border-gray-200 rounded-lg border-dashed">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-medium text-gray-900">Nenhum pedido realizado</h3>
          <p className="mt-1 text-sm text-gray-500">Quando os clientes realizarem compras no carrinho da vitrine, os pedidos aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map(order => (
            <div 
              key={order.id} 
              onClick={() => onSelectOrder(order)}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex justify-between items-start relative group"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-base truncate">{order.client_name}</h3>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <p className="text-xs text-blue-600 font-medium mb-3">{order.client_phone}</p>
                <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100 flex items-center justify-between">
                  <span>{order.items?.length || 0} item(ns)</span>
                  <span className="font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 items-end">
                <button 
                  onClick={(e) => { e.stopPropagation(); if (window.confirm('Excluir este pedido?')) onDelete(order.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-blue-600 hover:underline mt-auto flex items-center gap-1">
                  Ver <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductManager({ products, categories, onSave, onDelete }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddNew = () => {
    setEditingProduct(null); setIsFormOpen(true);
  };

  return (
    <div>
      {isFormOpen ? (
        <ProductForm initialData={editingProduct} categories={categories} onSave={(data) => { onSave(data); setIsFormOpen(false); }} onCancel={() => setIsFormOpen(false)} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Produtos Cadastrados ({products.length})</h2>
            <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4">Estoque</th>
                  <th className="px-6 py-4">Aura (Edição Rápida)</th>
                  <th className="px-6 py-4">Visibilidade</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {products.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500">Nenhum produto cadastrado até o momento.</td></tr>
                ) : (
                  products.map(product => {
                    const displayImage = product.imageUrls?.length > 0 ? product.imageUrls[0] : null;
                    const isActive = product.active !== false;

                    // Calcula a cor da Aura atual para mostrar o brilho do seletor
                    let displayAura = product.auraColor || 'inherit';
                    if (displayAura === 'inherit' && product.categoryIds?.length > 0) {
                      const matchedCategory = categories.find(c => product.categoryIds.includes(c.id) && c.auraColor && c.auraColor !== 'none');
                      if (matchedCategory) displayAura = matchedCategory.auraColor;
                    }

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 flex items-center gap-4">
                          <div className="h-10 w-10 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {displayImage ? <img src={displayImage} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900 block">{product.title}</span>
                            <span className="text-xs text-gray-500 font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${product.stock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                            <Layers className="w-3 h-3" /> {product.stock} un.
                          </span>
                        </td>

                        {/* Coluna de Edição Rápida de Aura */}
                        <td className="px-6 py-4">
                          <div className={`inline-block ${displayAura !== 'none' && displayAura !== 'inherit' ? `aura ${AURA_CLASS_MAP[displayAura]}` : ''}`}>
                            <select 
                              value={product.auraColor || 'inherit'} 
                              onChange={(e) => onSave({ ...product, auraColor: e.target.value })}
                              className="relative z-10 bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1.5 rounded outline-none border border-gray-200 focus:border-blue-500 cursor-pointer text-gray-700 shadow-sm hover:bg-gray-50 transition-colors w-32"
                            >
                              {AURA_OPTIONS.map(aura => (
                                <option key={aura.id} value={aura.id}>{aura.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Coluna de Edição Rápida de Visibilidade */}
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => onSave({ ...product, active: !isActive })}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors shadow-sm ${isActive ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'}`}
                          >
                            {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            {isActive ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditingProduct(product); setIsFormOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Editar"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { if (window.confirm('Tem certeza que deseja excluir este produto?')) onDelete(product.id); }} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ProductForm({ initialData, categories, onSave, onCancel }) {
  // Identifica e cria uma base para a categoria Geral
  const geralCat = categories.find(c => c.name.toLowerCase() === 'geral');
  const geralId = geralCat ? geralCat.id : null;

  // Se for um novo produto e não tiver categorias, já inicia com "Geral"
  const defaultCategoryIds = initialData?.categoryIds?.length > 0 
    ? initialData.categoryIds 
    : (geralId ? [geralId] : []);

  const [formData, setFormData] = useState({
    id: initialData?.id || null,
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price || '',
    stock: initialData?.stock ?? 1,
    categoryIds: defaultCategoryIds,
    imageUrls: initialData?.imageUrls?.length > 0 ? initialData.imageUrls : [],
    active: initialData?.active ?? true,
    auraColor: initialData?.auraColor || 'inherit'
  });
  
  const [isCompressing, setIsCompressing] = useState(false);

  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let { width, height } = img;
        if (width > height && width > MAX) { height *= MAX / width; width = MAX; } 
        else if (height > MAX) { width *= MAX / height; height = MAX; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject; img.src = reader.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setIsCompressing(true);
    const newImages = [];
    for (const file of files) {
      try { newImages.push(await compressImage(file)); } catch (err) { console.error(err); }
    }
    setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newImages] }));
    setIsCompressing(false);
  };

  // Inteligência da Categoria
  const handleCategoryToggle = (catId) => {
    setFormData(prev => {
      let newCats = [...prev.categoryIds];

      if (newCats.includes(catId)) {
        // Desmarcando uma categoria
        newCats = newCats.filter(id => id !== catId);
        
        // Se todas as categorias forem desmarcadas, ativa "Geral" automaticamente
        if (newCats.length === 0 && geralId) {
          newCats = [geralId];
        }
      } else {
        // Marcando uma categoria
        if (catId === geralId) {
          // Se marcar "Geral" explicitamente, remove todas as outras
          newCats = [geralId];
        } else {
          // Se marcar qualquer outra, garante que a "Geral" saia da seleção
          newCats = newCats.filter(id => id !== geralId);
          newCats.push(catId);
        }
      }

      return { ...prev, categoryIds: newCats };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      ...formData, 
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock, 10) || 0
    });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between bg-gray-50/50 rounded-t-lg">
        <h2 className="text-lg font-medium text-gray-900">{initialData ? 'Editar Produto' : 'Novo Produto'}</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-md"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        <div>
          <span className="block text-sm font-semibold text-gray-900 mb-3">Fotos ({formData.imageUrls.length})</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {formData.imageUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {idx === 0 && <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">CAPA</span>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <button type="button" onClick={() => setFormData(p => ({...p, imageUrls: p.imageUrls.filter((_, i) => i !== idx)}))} className="p-2 bg-white text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <label className={`flex flex-col items-center justify-center aspect-square border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${isCompressing ? 'opacity-50 pointer-events-none' : ''}`}>
              {isCompressing ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <><Plus className="w-6 h-6 text-gray-400 mb-2" /><span className="text-xs font-medium">Adicionar foto</span></>}
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={isCompressing} className="sr-only" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input required type="text" value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
              <input required type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData(p => ({...p, price: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade em Estoque *</label>
              <input required type="number" min="0" step="1" value={formData.stock} onChange={e => setFormData(p => ({...p, stock: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Efeito Aura Próprio (Sobrescreve a aura da categoria)</label>
              <select 
                value={formData.auraColor} 
                onChange={e => setFormData(p => ({...p, auraColor: e.target.value}))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {AURA_OPTIONS.map(aura => (
                  <option key={aura.id} value={aura.id}>{aura.name}</option>
                ))}
              </select>
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Categorias * (selecione uma ou mais)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-gray-200 rounded-md p-3 bg-gray-50/50 max-h-40 overflow-y-auto">
                {categories.map(c => {
                  const isChecked = formData.categoryIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900 select-none">
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => handleCategoryToggle(c.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span>{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <textarea required rows={4} value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="active" 
                checked={formData.active} 
                onChange={e => setFormData(p => ({...p, active: e.target.checked}))}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" 
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                Produto ativo (exibir na vitrine para os clientes)
              </label>
            </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Salvar Alterações</button>
        </div>
      </form>
    </div>
  );
}

function CategoryManager({ categories, onSave, onDelete }) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div>
      {isFormOpen ? (
        <CategoryForm initialData={editingCategory} onSave={(data) => { onSave(data); setIsFormOpen(false); }} onCancel={() => setIsFormOpen(false)} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Categorias ({categories.length})</h2>
            <button onClick={() => { setEditingCategory(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-sm font-medium">
              <Plus className="w-4 h-4" /> Nova Categoria
            </button>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Aura Padrão</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {categories.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-sm text-gray-500">Nenhuma categoria cadastrada até o momento.</td></tr>
                ) : (
                  categories.map(category => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                      <td className="px-6 py-4">
                        {category.auraColor && category.auraColor !== 'none' ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold aura ${AURA_CLASS_MAP[category.auraColor]}`}>
                            <Palette className="w-3 h-3" /> {category.auraColor}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Nenhuma</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[300px]">{category.description}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setEditingCategory(category); setIsFormOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => { if (window.confirm('Tem certeza que deseja excluir esta categoria?')) onDelete(category.id); }} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({ 
    id: initialData?.id || null, 
    name: initialData?.name || '', 
    description: initialData?.description || '',
    auraColor: initialData?.auraColor || 'none'
  });

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between bg-gray-50/50 rounded-t-lg">
        <h2 className="text-lg font-medium text-gray-900">{initialData ? 'Editar Categoria' : 'Nova Categoria'}</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-md"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input required type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Efeito de Aura para os Produtos desta Categoria</label>
          <select 
            value={formData.auraColor} 
            onChange={e => setFormData(p => ({...p, auraColor: e.target.value}))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {/* Remove 'inherit' pois Categorias não herdam de nada */}
            {AURA_OPTIONS.filter(a => a.id !== 'inherit').map(aura => (
              <option key={aura.id} value={aura.id}>{aura.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Todos os produtos desta categoria ganharão o brilho selecionado na vitrine.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
          <textarea required rows={3} value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Salvar Alterações</button>
        </div>
      </form>
    </div>
  );
}

function CustomOrdersManager({ customOrders, onDelete, onSelectOrder }) {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-6">Solicitações de Peças Personalizadas ({customOrders.length})</h2>
      
      {customOrders.length === 0 ? (
        <div className="py-12 text-center border border-gray-200 rounded-lg border-dashed">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-medium text-gray-900">Nenhuma solicitação recebida</h3>
          <p className="mt-1 text-sm text-gray-500">Quando os clientes enviarem pedidos personalizados pelo site, eles aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customOrders.map(order => (
            <div 
              key={order.id} 
              onClick={() => onSelectOrder(order)}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex gap-4 items-start relative group"
            >
              {order.image_url ? (
                <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={order.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                  <ImageIcon className="w-8 h-8 opacity-50" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-base truncate">{order.client_name}</h3>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <p className="text-xs text-blue-600 font-medium mb-2">{order.client_phone}</p>
                <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded border border-gray-100">{order.description}</p>
              </div>

              <div className="flex flex-col gap-1 items-end">
                <button 
                  onClick={(e) => { e.stopPropagation(); if (window.confirm('Excluir esta solicitação?')) onDelete(order.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-blue-600 hover:underline mt-auto flex items-center gap-1">
                  Ver <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginView({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); setLoading(false); } 
    else onLoginSuccess();
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-8">
        <button 
          onClick={() => navigate('/')} 
          className="mb-6 text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar para Loja
        </button>

        <div className="flex justify-center mb-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-full"><Settings className="w-8 h-8" /></div></div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Acesso Restrito</h2>
        <p className="text-sm text-center text-gray-500 mb-8">Digite suas credenciais de acesso para entrar no painel.</p>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100 flex items-start gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{error}</span></div>}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 mt-2">
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CartDrawer({ isOpen, onClose, cart, updateQuantity, removeItem, total, onCheckout }) {
  const [step, setStep] = useState('cart'); // cart, checkout, success
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFinishOrder = async (e) => {
    e.preventDefault();
    if (!clientName || !clientPhone) return alert("Por favor, preencha nome e WhatsApp.");

    setIsSubmitting(true);

    const success = await onCheckout({
      client_name: clientName,
      client_phone: clientPhone,
      items: cart,
      total: total
    });

    setIsSubmitting(false);

    if (success) {
      setStep('success');
    }
  };

  const handleClose = () => {
    setStep('cart');
    setClientName('');
    setClientPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose}></div>
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-600" /> Seu Orçamento</h2>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                  <Package className="w-12 h-12 text-gray-300" />
                  <p className="text-sm font-medium">Seu orçamento está vazio.</p>
                </div>
              ) : (
                <ul className="space-y-6">
                  {cart.map(item => {
                    const imgUrl = item.imageUrls?.length > 0 ? item.imageUrls[0] : null;
                    return (
                      <li key={item.id} className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-gray-400" />}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</h3>
                          <span className="text-sm font-bold mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</span>
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center border border-gray-200 rounded-md">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-gray-500 hover:bg-gray-50"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="px-3 text-sm font-medium">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-gray-500 hover:bg-gray-50"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                            <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 font-medium">Remover</button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-6 bg-gray-50 mt-auto">
                <div className="flex justify-between mb-5"><span className="text-sm font-medium">Total</span><span className="text-xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span></div>
                <button 
                  onClick={() => setStep('checkout')} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  Avançar para Identificação
                </button>
              </div>
            )}
          </>
        )}

        {step === 'checkout' && (
          <form onSubmit={handleFinishOrder} className="flex-1 flex flex-col p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Informações para Contato</h3>
              <p className="text-xs text-gray-500 mb-6">Preencha seus dados para registrarmos seu pedido de orçamento.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome *</label>
                  <input 
                    required type="text" placeholder="Ex: João Souza"
                    value={clientName} onChange={e => setClientName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seu WhatsApp *</label>
                  <input 
                    required type="text" placeholder="(11) 99999-9999"
                    value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-2">
              <div className="flex justify-between text-gray-600"><span>Itens:</span><span>{cart.length} produto(s)</span></div>
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 flex gap-3">
              <button 
                type="button" 
                onClick={() => setStep('cart')}
                className="px-4 py-3 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Voltar
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Finalizar Pedido'}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Pedido Registrado!</h3>
            <p className="text-sm text-gray-600 mb-8">Recebemos sua solicitação de orçamento. Entraremos em contato com você via WhatsApp para confirmar os detalhes do envio.</p>
            <button 
              onClick={handleClose}
              className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}