import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Sparkles, ArrowRight, ShoppingCart,
  ChevronLeft, ChevronRight, Image as ImageIcon, Clock, AlertCircle
} from 'lucide-react';
import ProductImage from '../components/ProductImage';
import { AURA_CLASS_MAP } from '../lib/auras';
import { brl } from '../lib/format';

export default function CatalogView({ products, categories, loadError, onRetry, onAddToCart, onOpenProduct, onOpenCustomRequest }) {
  // Filtros ficam no endereço: ?categoria=chaveiros&q=vaso&ordem=price_asc
  const [params, setParams] = useSearchParams();
  const categoryParam = params.get('categoria') || 'all';
  const searchQuery = params.get('q') || '';
  const sortOrder = params.get('ordem') || 'recent';

  const updateParam = (key, value, defaultValue) => {
    const next = new URLSearchParams(params);
    if (!value || value === defaultValue) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const activeCategories = categories.filter(category =>
    products.some(product => product.categoryIds?.includes(category.id) && product.active !== false)
  );

  const activeCategory = categories.find(c => (c.slug && c.slug === categoryParam) || String(c.id) === categoryParam);
  const activeCategoryId = activeCategory ? activeCategory.id : 'all';
  const categoryKey = (c) => c.slug || String(c.id);

  const query = searchQuery.toLowerCase();
  const filteredProducts = products.filter(product => {
    const isVisible = product.active !== false;
    const matchesCategory = activeCategoryId === 'all' || (product.categoryIds && product.categoryIds.includes(activeCategoryId));
    const matchesSearch = product.title.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query));
    return isVisible && matchesCategory && matchesSearch;
  });

  filteredProducts.sort((a, b) => {
    if (sortOrder === 'price_asc') return a.price - b.price;
    if (sortOrder === 'price_desc') return b.price - a.price;
    return 0; // 'recent': mantém a ordem do banco (created_at desc)
  });

  if (loadError && products.length === 0 && categories.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Não conseguimos carregar o catálogo</h1>
        <p className="text-sm text-gray-600 mb-6">Pode ser uma falha de conexão ou uma manutenção rápida. Tente de novo em instantes.</p>
        <button onClick={onRetry} className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="mb-8">
          <label htmlFor="busca" className="sr-only">Buscar produtos</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="busca"
              type="text"
              placeholder="Buscar modelos..."
              value={searchQuery}
              onChange={(e) => updateParam('q', e.target.value, '')}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Categorias">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Categorias</h2>
          <button
            onClick={() => updateParam('categoria', 'all', 'all')}
            className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${activeCategoryId === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Todos os modelos
          </button>
          {activeCategories.map(category => (
            <button
              key={category.id}
              onClick={() => updateParam('categoria', categoryKey(category), 'all')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${activeCategoryId === category.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <span>{category.name}</span>
              {category.auraColor && category.auraColor !== 'none' && (
                <span className={`w-2.5 h-2.5 rounded-full aura ${AURA_CLASS_MAP[category.auraColor] || 'aura-none'}`} />
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
            <label htmlFor="ordem" className="sr-only">Ordenar por</label>
            <select
              id="ordem"
              value={sortOrder}
              onChange={(e) => updateParam('ordem', e.target.value, 'recent')}
              className="block w-full border border-gray-300 rounded-md py-1.5 pl-3 pr-8 text-sm bg-white cursor-pointer"
            >
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={onOpenCustomRequest}
            className="text-left bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-6 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-all border border-blue-500 group relative overflow-hidden"
          >
            <div className="absolute -right-6 -bottom-6 opacity-10 text-white pointer-events-none">
              <Sparkles className="w-40 h-40" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-blue-100 mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Destaque Especial
              </div>
              <h3 className="text-xl font-bold leading-tight mb-2 group-hover:text-blue-200 transition-colors">Peça Personalizada</h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                Precisa de um projeto exclusivo ou tem uma foto de referência? Envie sua ideia e criaremos um orçamento sob medida.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-white/20 flex items-center justify-between font-semibold text-sm w-full">
              <span>Solicitar Orçamento</span>
              <div className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>

          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              categories={categories}
              onAddToCart={() => onAddToCart(product)}
              onClick={() => onOpenProduct(product)}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-10">
            Nenhum produto encontrado{searchQuery ? ` para “${searchQuery}”` : ''}. Tente outra busca ou categoria.
          </p>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, categories, onAddToCart, onClick }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.imageUrls?.length > 0 ? product.imageUrls : [];
  const isOutOfStock = product.stock <= 0;
  const hasOptions = (product.options || []).length > 0;

  // Herança de Aura: se o produto for 'inherit', usa a da categoria
  let effectiveAuraKey = product.auraColor && product.auraColor !== 'inherit' ? product.auraColor : 'none';
  if ((!product.auraColor || product.auraColor === 'inherit') && product.categoryIds?.length > 0) {
    const matchedCategory = categories.find(c => product.categoryIds.includes(c.id) && c.auraColor && c.auraColor !== 'none');
    if (matchedCategory) effectiveAuraKey = matchedCategory.auraColor;
  }
  const auraClassName = AURA_CLASS_MAP[effectiveAuraKey] || 'aura-none';

  const nextImage = (e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % images.length); };
  const prevImage = (e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)); };

  const card = (
    <article
      onClick={onClick}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      aria-label={`Ver detalhes de ${product.title}`}
      className="bg-white rounded-xl overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer group relative isolate w-full focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
    >
      <div className="aspect-square bg-gray-50 relative border-b border-gray-100 overflow-hidden">
        {images.length > 0 ? (
          <>
            <ProductImage thumb src={images[currentImageIndex]} alt={product.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            {images.length > 1 && (
              <>
                <button onClick={prevImage} aria-label="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white z-10"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={nextImage} aria-label="Próxima foto" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white z-10"><ChevronRight className="w-5 h-5" /></button>
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
          <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">Esgotado</span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-gray-900 leading-tight mb-1">{product.title}</h3>
        <span className="text-xs text-gray-500 mb-1 font-medium">
          {isOutOfStock ? 'Sem estoque disponível' : `${product.stock} unidade(s) disponível(is)`}
        </span>
        {product.leadTime && (
          <span className="text-xs text-gray-500 mb-2 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {product.leadTime}</span>
        )}
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{product.description}</p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <span className="text-lg font-bold text-gray-900">{brl(product.price)}</span>
          <button
            disabled={isOutOfStock}
            onClick={(e) => { e.stopPropagation(); if (hasOptions) onClick(); else onAddToCart(); }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            <ShoppingCart className="w-4 h-4" /> {isOutOfStock ? 'Indisponível' : hasOptions ? 'Escolher opções' : 'Adicionar'}
          </button>
        </div>
      </div>
    </article>
  );

  if (effectiveAuraKey !== 'none') {
    return <div className={`aura ${auraClassName} h-full`}>{card}</div>;
  }
  return card;
}
