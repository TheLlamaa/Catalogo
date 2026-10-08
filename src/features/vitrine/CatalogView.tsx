import { useState } from 'react';
import { makeT } from '../../lib/texts';
import { useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, ShoppingCart,
  ChevronLeft, ChevronRight, Image as ImageIcon, Clock, AlertCircle
} from 'lucide-react';
import type { Category, Product } from '../../types';
import ProductImage from './ProductImage';
import { useSettings } from '../../components/SettingsContext';
import { auraProps, auraDot } from '../../lib/auras';
import { badgeStyle } from '../../lib/theme';
import { availability, badgeFor, effectiveAura, lowStockMaxOf, newProducts } from '../../lib/catalog';
import { Button } from '../../components/ui';
import Price from './Price';
import { matchesQuery } from '../../lib/text';
import HomeVitrine from './home/HomeVitrine';
import HomeBancada from './home/HomeBancada';
import HomeMista from './home/HomeMista';
import { withCustomBand } from './home/shared';

// Modelos da página inicial escolhidos em Site > Página inicial > Modelo ("classico" é o desta página)
const LAYOUTS = { vitrine: HomeVitrine, bancada: HomeBancada, mista: HomeMista } as const;

const PAGE_SIZE = 12; // quantos produtos aparecem por vez ("Ver mais" mostra +12)

interface CatalogViewProps {
  products: Product[];
  categories: Category[];
  loadError: string | null;
  onRetry: () => void;
  onAddToCart: (product: Product) => boolean;
  onOpenProduct: (product: Product) => void;
  onOpenCustomRequest: () => void;
}

// Classes completas (o Tailwind só gera o que aparece escrito no código)
const GRID_CLASS: Record<string, string> = { '2': 'lg:grid-cols-2', '3': 'lg:grid-cols-3', '4': 'lg:grid-cols-4' };

export default function CatalogView({ products, categories, loadError, onRetry, onAddToCart, onOpenProduct, onOpenCustomRequest }: CatalogViewProps) {
  const settings = useSettings();
  const t = makeT(settings);
  const pageSize = Number(settings.pageSize) || PAGE_SIZE;
  // Filtros ficam no endereço: ?categoria=chaveiros&q=vaso&ordem=price_asc
  const [params, setParams] = useSearchParams();
  const categoryParam = params.get('categoria') || 'all';
  const searchQuery = params.get('q') || '';
  const sortOrder = params.get('ordem') || settings.defaultSort;

  const updateParam = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === defaultValue) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const activeCategories = categories.filter(category =>
    products.some(product => product.categoryIds?.includes(category.id) && product.active !== false)
  );

  const activeCategory = categories.find(c => (c.slug && c.slug === categoryParam) || String(c.id) === categoryParam);
  const activeCategoryId = activeCategory ? activeCategory.id : 'all';
  const categoryKey = (c: Category) => c.slug || String(c.id);

  const filteredProducts = products.filter(product => {
    const isVisible = product.active !== false;
    const matchesCategory = activeCategoryId === 'all' || (product.categoryIds && product.categoryIds.includes(activeCategoryId));
    const matchesSearch = matchesQuery(searchQuery, product.title, product.description);
    return isVisible && matchesCategory && matchesSearch;
  });

  filteredProducts.sort((a, b) => {
    if (sortOrder === 'price_asc') return a.salePrice - b.salePrice;
    if (sortOrder === 'price_desc') return b.salePrice - a.salePrice;
    return 0; // 'recent': mantém a ordem do banco (created_at desc)
  });

  // "Ver mais": volta para a primeira página sempre que busca, categoria ou ordem mudam
  const filterKey = `${activeCategoryId}|${searchQuery}|${sortOrder}`;
  const [shown, setShown] = useState({ key: filterKey, n: pageSize });
  const visibleCount = shown.key === filterKey ? shown.n : pageSize;
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const remaining = filteredProducts.length - visibleProducts.length;

  // Seções no topo (Destaques, Mais pedidos, Novidades): só na vitrine "limpa", sem filtro nem busca
  const showShelves = activeCategoryId === 'all' && !searchQuery && sortOrder === settings.defaultSort;
  const activeProducts = products.filter(p => p.active !== false);
  const shelves: { id: string; title: string; items: Product[] }[] = showShelves ? [
    settings.showFeatured && { id: 'destaque', title: settings.featuredTitle, items: activeProducts.filter(p => p.section === 'destaque') },
    settings.showPopular && { id: 'popular', title: settings.popularTitle, items: activeProducts.filter(p => p.section === 'popular') },
    settings.showNew && { id: 'novidades', title: settings.newTitle, items: newProducts(activeProducts, undefined, Number(settings.newDays) || undefined, Number(settings.newMax) || undefined) }
  ].filter((s): s is { id: string; title: string; items: Product[] } => !!s && s.items.length > 0) : [];

  if (loadError && products.length === 0 && categories.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('tLoadErrorTitle')}</h1>
        <p className="text-sm text-gray-600 mb-6">{t('tLoadErrorText')}</p>
        <Button variant="primary" onClick={onRetry}>{t('tRetry')}</Button>
      </div>
    );
  }

  const Layout = LAYOUTS[settings.homeLayout as keyof typeof LAYOUTS];
  if (Layout) return <Layout products={products} categories={categories} onAddToCart={onAddToCart} onOpenProduct={onOpenProduct} onOpenCustomRequest={onOpenCustomRequest} />;

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
      <aside className="w-full md:w-64 flex-shrink-0">
        {settings.showSearch && <div className="mb-3 md:mb-8">
          <label htmlFor="busca" className="sr-only">Buscar produtos</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input
              id="busca"
              type="text"
              placeholder={t('tSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => updateParam('q', e.target.value, '')}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>}

        <nav className="flex flex-row md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:[mask-image:linear-gradient(to_right,black_85%,transparent)]" aria-label="Categorias">
          <h2 className="hidden md:block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">{t('tCategoriesTitle')}</h2>
          <button
            onClick={() => updateParam('categoria', 'all', 'all')}
            aria-current={activeCategoryId === 'all' ? 'true' : undefined}
            className={`text-left px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap flex-shrink-0 max-md:border max-md:rounded-full ${activeCategoryId === 'all' ? 'bg-blue-50 text-blue-700 font-medium max-md:border-blue-200' : 'text-gray-700 hover:bg-gray-100 max-md:border-gray-200 max-md:bg-white'}`}
          >
            {t('tAllProducts')}
          </button>
          {activeCategories.map(category => (
            <button
              key={category.id}
              onClick={() => updateParam('categoria', categoryKey(category), 'all')}
              aria-current={activeCategoryId === category.id ? 'true' : undefined}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2 whitespace-nowrap flex-shrink-0 max-md:border max-md:rounded-full ${activeCategoryId === category.id ? 'bg-blue-50 text-blue-700 font-medium max-md:border-blue-200' : 'text-gray-700 hover:bg-gray-100 max-md:border-gray-200 max-md:bg-white'}`}
            >
              <span>{category.name}</span>
              {settings.aurasEnabled && category.auraColor && category.auraColor !== 'none' && (
                <span {...auraDot(category.auraColor, settings.auraLib, 10)} />
              )}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        {settings.heroImage && !activeCategory && (
          <div className="relative rounded-xl overflow-hidden mb-4 md:mb-6 min-h-[9rem] sm:min-h-[13rem] flex items-end">
            <img src={settings.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="relative p-4 sm:p-6 text-white">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{settings.catalogTitle}</h2>
              <p className="mt-1 text-sm sm:text-base max-w-2xl text-white/90">{settings.catalogSubtitle}</p>
            </div>
          </div>
        )}
        <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className={settings.heroImage && !activeCategory ? 'sr-only' : ''}>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span>{activeCategory ? activeCategory.name : settings.catalogTitle}</span>
              {settings.aurasEnabled && activeCategory?.auraColor && activeCategory.auraColor !== 'none' && (
                <span {...auraDot(activeCategory.auraColor, settings.auraLib, 12)} />
              )}
            </h1>
            <p className="text-gray-600 mt-2 text-sm max-w-2xl">
              {activeCategory ? activeCategory.description : settings.catalogSubtitle}
            </p>
          </div>

          {settings.showSort && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-gray-500 hidden sm:block" />
              <label htmlFor="ordem" className="sr-only">Ordenar por</label>
              <select
                id="ordem"
                value={sortOrder}
                onChange={(e) => updateParam('ordem', e.target.value, settings.defaultSort)}
                className="block w-full border border-gray-300 rounded-md py-1.5 pl-3 pr-8 text-sm bg-white cursor-pointer"
              >
                <option value="recent">{t('tSortRecent')}</option>
                <option value="price_asc">{t('tSortPriceAsc')}</option>
                <option value="price_desc">{t('tSortPriceDesc')}</option>
              </select>
            </div>
          )}
        </div>

        {shelves.map(shelf => (
          <section key={shelf.id} className="mb-8" aria-labelledby={`shelf-${shelf.id}`}>
            <h2 id={`shelf-${shelf.id}`} className="text-lg font-bold text-gray-900 mb-3">{shelf.title}</h2>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory py-6 -my-3 px-4 -mx-4 [scrollbar-width:thin]">
              {shelf.items.map(product => (
                <div key={product.id} className="w-44 sm:w-56 flex-shrink-0 snap-start">
                  <ProductCard
                    product={product}
                    categories={categories}
                    onAddToCart={() => onAddToCart(product)}
                    onClick={() => onOpenProduct(product)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
        {shelves.length > 0 && <h2 className="text-lg font-bold text-gray-900 mb-3">{t('tAllProducts')}</h2>}

        <div className={`grid grid-cols-2 ${GRID_CLASS[settings.gridCols] || GRID_CLASS['3']} gap-3 sm:gap-6`}>

          {/* Faixa "Peça personalizada": a mesma dos outros modelos, depois de duas linhas de produtos */}
          {withCustomBand(visibleProducts, product => (
            <ProductCard
              product={product}
              categories={categories}
              onAddToCart={() => onAddToCart(product)}
              onClick={() => onOpenProduct(product)}
            />
          ), product => product.id, { settings, hasItems: filteredProducts.length > 0, onOpen: onOpenCustomRequest })}
        </div>

        {remaining > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShown({ key: filterKey, n: visibleCount + pageSize })}
              className="px-6 py-2.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              {t('tLoadMore')} ({remaining})
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-10">
            {t('tNoResults')}{searchQuery ? ` para “${searchQuery}”` : ''}. {t('tNoResultsHint')}
          </p>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  categories: Category[];
  onAddToCart: () => void;
  onClick: () => void;
}

function ProductCard({ product, categories, onAddToCart, onClick }: ProductCardProps) {
  const settings = useSettings();
  const t = makeT(settings);
  const { auraLib } = settings;
  const badge = badgeFor(product, settings);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.imageUrls?.length > 0 ? product.imageUrls : [];
  const stock = availability(product, settings.stockControl, lowStockMaxOf(settings));
  const isOutOfStock = stock === 'out';
  const hasOptions = (product.options || []).length > 0;

  const effectiveAuraKey = effectiveAura(product, categories, settings.aurasEnabled);
  const aura = auraProps(effectiveAuraKey, auraLib);

  const nextImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % images.length); };
  const prevImage = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)); };

  const card = (
    // Card clicável com botões internos: não pode ser <button>; teclado tratado em onKeyDown.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex
    <article
      onClick={onClick}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
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
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-500"><ImageIcon className="h-10 w-10 opacity-60" aria-hidden="true" /><span className="text-xs text-gray-600">{t('tPhotoSoon')}</span></div>
        )}

        {badge && (
          <span style={badgeStyle(settings.badgeColor)} className="absolute top-2 left-2 z-10 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider max-w-[70%] truncate">{badge}</span>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">{t('tSoldOut')}</span>
        )}
      </div>
      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">{product.title}</h3>
        {/* Estoque só aparece quando ajuda a decidir: poucas unidades (o "Esgotado" já está na foto) */}
        {stock === 'low' && (
          <span className="text-xs text-amber-700 mb-1 font-medium">
            {product.stock === 1 ? t('tLeftOne') : t('tLeftMany', { n: product.stock })}
          </span>
        )}
        {settings.leadTimeEnabled && settings.showCardLeadTime && product.leadTime && (
          <span className="hidden sm:flex text-xs text-gray-500 mb-2 font-medium items-center gap-1"><Clock className="w-3 h-3" /> {product.leadTime}</span>
        )}
        {settings.showCardDescription ? <p className="hidden sm:block text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{product.description}</p> : <div className="flex-1" />}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 mt-auto pt-2 sm:pt-4 border-t border-gray-100">
          {!settings.hidePrices && <Price product={product} className="text-base sm:text-lg font-bold text-gray-900" />}
          <button
            disabled={isOutOfStock}
            onClick={(e) => { e.stopPropagation(); if (hasOptions) onClick(); else onAddToCart(); }}
            className={`px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            <ShoppingCart className="w-4 h-4" /> {isOutOfStock ? t('tUnavailable') : hasOptions ? t('tChooseOptions') : t('tAdd')}
          </button>
        </div>
      </div>
    </article>
  );

  if (effectiveAuraKey !== 'none') {
    return <div className={`aura ${aura.className} h-full`} style={aura.style}>{card}</div>;
  }
  return card;
}
