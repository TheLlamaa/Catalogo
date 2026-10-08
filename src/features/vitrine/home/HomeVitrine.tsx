// Versão A, "Vitrine": as fotos abrem a página. Capa com mosaico dos destaques, categorias em abas e grade de fotos grandes.
import type { Product } from '../../../types';
import ProductImage from '../ProductImage';
import Price from '../Price';
import { ITEMS, withCustomBand, useCatalogFilters, SearchField, SortSelect, CategoryDot, LoadMore, EmptyResult, ProductTile, gridColsClass, type HomeProps } from './shared';

export default function HomeVitrine({ products, categories, onAddToCart, onOpenProduct, onOpenCustomRequest }: HomeProps) {
  const f = useCatalogFilters(products, categories);
  const { settings } = f;
  const showHero = f.isClean;

  // Mosaico: destaques primeiro, completa com mais pedidos e depois com os mais recentes
  const mosaic: Product[] = [];
  for (const p of [...f.featured, ...f.popular, ...f.active]) if (p.imageUrls?.length && !mosaic.includes(p) && mosaic.length < 3) mosaic.push(p);

  const hasVisual = !!settings.heroImage || (settings.showHeroMosaic && mosaic.length > 0);
  const tab = (selected: boolean) => `relative whitespace-nowrap py-3 text-sm transition-colors ${selected ? 'font-semibold text-gray-900 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-blue-600' : 'text-gray-600 hover:text-gray-900'}`;

  return (
    <div>
      {showHero && (
        <section className="grid items-center gap-6 md:grid-cols-12 md:gap-10 pb-8 md:pb-14" aria-labelledby="titulo-loja">
          <div className={hasVisual ? 'md:col-span-5' : 'md:col-span-12 max-w-3xl'}>
            <h1 id="titulo-loja" className="text-[2rem] leading-[1.08] sm:text-5xl font-bold tracking-[-0.025em] text-gray-900 text-balance">{settings.catalogTitle}</h1>
            <p className="mt-4 max-w-md text-base sm:text-lg leading-relaxed text-gray-600">{settings.catalogSubtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#pecas" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">{ITEMS.see}</a>
              {settings.customEnabled && (
                <button onClick={onOpenCustomRequest} className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:border-gray-400">{settings.cardButton}</button>
              )}
            </div>
          </div>
          {settings.heroImage ? (
            // Imagem de capa do painel tem prioridade sobre o mosaico
            <div className="md:col-span-7 relative overflow-hidden rounded-xl bg-gray-100 aspect-[4/3] md:aspect-auto md:min-h-[26rem]">
              <img src={settings.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          ) : settings.showHeroMosaic && mosaic.length > 0 && (
            <div className={`md:col-span-7 grid gap-3 sm:gap-4 ${mosaic.length > 1 ? 'grid-cols-[1.6fr_1fr] grid-rows-2' : ''}`}>
              {mosaic.map((p, i) => (
                <button
                  key={p.id} onClick={() => onOpenProduct(p)}
                  className={`group relative overflow-hidden rounded-xl bg-gray-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${i === 0 ? 'row-span-2 aspect-[4/5] sm:aspect-auto sm:min-h-[26rem]' : 'aspect-square sm:aspect-auto'}`}
                >
                  <ProductImage src={p.imageUrls[0]} alt="" fetchPriority={i === 0 ? 'high' : undefined} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span className={`absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto flex flex-col rounded-lg bg-white/95 px-3 py-2 shadow-sm ${i === 0 ? '' : 'max-sm:hidden'}`}>
                    <span className="text-sm font-medium text-gray-900 truncate">{p.title}</span>
                    {!settings.hidePrices && <Price product={p} showBadge={false} className="text-sm font-semibold text-gray-900" />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div id="pecas" className="scroll-mt-20">
        {!showHero && (
          <div className="mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              {f.activeCategory ? f.activeCategory.name : f.searchQuery ? `Resultados para “${f.searchQuery}”` : settings.catalogTitle}
              <CategoryDot category={f.activeCategory} size={12} />
            </h1>
            {f.activeCategory?.description && <p className="mt-1 text-sm text-gray-600 max-w-2xl">{f.activeCategory.description}</p>}
          </div>
        )}

        <div className="mb-6 border-b border-gray-200">
          <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
            {settings.showCategoryTabs ? <nav aria-label="Categorias" className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => f.selectCategory(null)} className={tab(f.activeCategoryId === 'all')} aria-current={f.activeCategoryId === 'all' ? 'page' : undefined}>Tudo</button>
              {f.activeCategories.map(c => (
                <button key={c.id} onClick={() => f.selectCategory(c)} className={`${tab(f.activeCategoryId === c.id)} flex items-center gap-1.5`} aria-current={f.activeCategoryId === c.id ? 'page' : undefined}>
                  {c.name}<CategoryDot category={c} />
                </button>
              ))}
            </nav> : <span />}
            <div className="flex items-center gap-2 pt-3 pb-2 md:pt-0 md:pb-2">
              <SearchField f={f} className="flex-1 md:w-56" />
              <SortSelect f={f} />
            </div>
          </div>
        </div>

        <div className={`grid ${gridColsClass(settings.gridCols)} gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10`}>
          {withCustomBand(f.visible, p => <ProductTile product={p} categories={categories} onAdd={() => onAddToCart(p)} onOpen={() => onOpenProduct(p)} />, p => p.id,
            { settings, hasItems: f.filtered.length > 0, onOpen: onOpenCustomRequest })}
        </div>
        <EmptyResult f={f} />
        <LoadMore f={f} />
      </div>
    </div>
  );
}
