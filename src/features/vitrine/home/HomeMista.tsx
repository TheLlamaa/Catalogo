// Modelo "Vitrine + Bancada": capa, categorias com foto (opcional) e passo a passo da Bancada,
// seguidos da grade da Vitrine (abas de categoria, busca, ordem e cards de foto grande).
import { withCustomBand, useCatalogFilters, SearchField, SortSelect, CategoryDot, LoadMore, EmptyResult, ProductTile, gridColsClass, type HomeProps } from './shared';
import { makeT } from '../../../lib/texts';
import { BancadaHero, HomeSections, FilteredHeading } from './HomeBancada';

export default function HomeMista({ products, categories, onAddToCart, onOpenProduct, onOpenCustomRequest }: HomeProps) {
  const f = useCatalogFilters(products, categories);
  const { settings } = f;
  const tab = (selected: boolean) => `relative whitespace-nowrap py-3 text-sm transition-colors ${selected ? 'font-semibold text-gray-900 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-blue-600' : 'text-gray-600 hover:text-gray-900'}`;

  return (
    <div>
      {f.isClean ? <BancadaHero f={f} /> : <FilteredHeading f={f} search={false} />}
      {f.isClean && <HomeSections f={f} natives={['categorias', 'passos']} onOpenCustom={onOpenCustomRequest} />}

      <div id="pecas" className={`scroll-mt-20 ${f.isClean ? 'mt-12' : 'mt-4'}`}>
        <div className="mb-6 flex flex-col-reverse gap-2 border-b border-gray-200 md:flex-row md:items-center md:justify-between md:gap-6">
          {settings.showCategoryTabs ? <nav aria-label="Categorias" className="-mb-px flex min-w-0 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => f.selectCategory(null)} className={tab(f.activeCategoryId === 'all')} aria-current={f.activeCategoryId === 'all' ? 'page' : undefined}>{makeT(f.settings)('tAllTab')}</button>
            {f.activeCategories.map(c => (
              <button key={c.id} onClick={() => f.selectCategory(c)} className={`${tab(f.activeCategoryId === c.id)} flex items-center gap-1.5`} aria-current={f.activeCategoryId === c.id ? 'page' : undefined}>
                {c.name}<CategoryDot category={c} />
              </button>
            ))}
          </nav> : <span />}
          <div className="flex flex-shrink-0 items-center gap-2 pt-1 pb-2 md:pt-0 md:pb-2">
            {/* A capa já tem a busca grande; aqui ela aparece quando a capa some (categoria ou busca ativa) */}
            {!f.isClean && <SearchField f={f} className="flex-1 md:w-56" />}
            <div className="ml-auto"><SortSelect f={f} /></div>
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
