// Versão B, "Bancada": capa que lembra a mesa de impressão (grade milimetrada), busca grande, categorias com foto
// e um passo a passo do pedido, porque quem chega pela primeira vez não sabe que o orçamento vai pelo WhatsApp.
// As peças (capa, categorias com foto, passo a passo) também são usadas pelo modelo "Vitrine + Bancada".
import type { CSSProperties } from 'react';
import { makeT } from '../../../lib/texts';
import { Search } from 'lucide-react';
import ProductImage from '../ProductImage';
import { bannerStyle } from '../../../lib/theme';
import { useSettings } from '../../../components/SettingsContext';
import type { Settings } from '../../../lib/settings';
import { countLabel, ITEMS, withCustomBand, useCatalogFilters, SearchField, SortSelect, CategoryDot, LoadMore, EmptyResult, ProductTile, gridColsClass, type HomeProps, type CatalogFilters } from './shared';

// Grade fina a cada 24px e grossa a cada 120px, na cor principal da loja (acompanha o tema e o modo escuro)
export const BED: CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgb(var(--p-600) / 0.13) 1px, transparent 1px)',
    'linear-gradient(90deg, rgb(var(--p-600) / 0.13) 1px, transparent 1px)',
    'linear-gradient(rgb(var(--p-600) / 0.06) 1px, transparent 1px)',
    'linear-gradient(90deg, rgb(var(--p-600) / 0.06) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
  backgroundPosition: 'center center',
};

// Passos do pedido, com os textos de Site > Página inicial > Passo a passo do pedido
export const steps = (s: Settings) => [
  { title: s.stepOneTitle, text: s.stepOneText },
  { title: s.stepTwoTitle, text: s.stepTwoText },
  { title: s.stepThreeTitle, text: s.stepThreeText },
];

// Capa: título, texto, busca grande e atalhos de categoria. Com imagem de capa no painel, ela vira o fundo.
export function BancadaHero({ f }: { f: CatalogFilters }) {
  const { settings } = f;
  const photo = !!settings.heroImage;
  return (
    <section
      className={`relative overflow-hidden rounded-xl border px-5 py-10 sm:px-12 sm:py-16 ${photo ? 'border-transparent' : 'border-blue-200 bg-blue-50 dark:border-gray-200 dark:bg-white'}`}
      style={photo ? bannerStyle({ bannerImage: settings.heroImage, bannerColor: '#111827' }) : BED} aria-labelledby="titulo-loja"
    >
      <div className="relative mx-auto max-w-2xl text-center">
        <h1 id="titulo-loja" className={`text-[2rem] leading-[1.1] sm:text-[3.25rem] font-bold tracking-[-0.03em] text-balance ${photo ? 'text-white' : 'text-gray-900'}`}>{settings.catalogTitle}</h1>
        <p className={`mx-auto mt-4 max-w-xl text-base sm:text-lg leading-relaxed ${photo ? 'text-white/90' : 'text-gray-700'}`}>{settings.catalogSubtitle}</p>
        <SearchField f={f} placeholder={makeT(f.settings)('tSearchPlaceholderBancada')} className="mx-auto mt-8 max-w-lg" inputClassName="py-3.5 sm:py-4 text-base shadow-sm" />
        {settings.showHeroCategories && f.activeCategories.length > 0 && (
          <nav aria-label="Atalhos de categoria" className="mt-5 flex flex-wrap justify-center gap-2">
            {f.activeCategories.map(c => (
              <button key={c.id} onClick={() => f.selectCategory(c)} className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-sm text-gray-800 hover:border-blue-600 hover:text-blue-700">
                {c.name}<CategoryDot category={c} />
              </button>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}

// Categorias com foto (liga e desliga em Site > Página inicial > Modelo)
export function CategoryTiles({ f }: { f: CatalogFilters }) {
  if (!f.settings.showCategoryTiles || f.activeCategories.length < 2) return null;
  // Foto de cada categoria: a primeira com foto que ainda não representa outra categoria
  const used = new Set<string>();
  const covers = new Map(f.activeCategories.map(c => {
    const items = f.inCategory(c).filter(p => p.imageUrls?.length);
    const pick = items.find(p => !used.has(p.id)) || items[0];
    if (pick) used.add(pick.id);
    return [c.id, pick?.imageUrls[0]];
  }));
  return (
    <section className="mt-12" aria-labelledby="por-categoria">
      <h2 id="por-categoria" className="text-xl font-bold tracking-tight text-gray-900">{makeT(f.settings)('tByCategory')}</h2>
      <div className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-6 sm:gap-4">
        {f.activeCategories.map(c => {
          const img = covers.get(c.id);
          return (
            <button key={c.id} onClick={() => f.selectCategory(c)} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-xl">
              <span className="block aspect-square sm:aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                {img ? <ProductImage thumb src={img} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Search className="m-auto h-6 w-6 text-gray-400" aria-hidden="true" />}
              </span>
              <span className="mt-2 flex items-center gap-1.5 text-sm font-medium leading-tight text-gray-900">{c.name}<CategoryDot category={c} /></span>
              <span className="block text-xs text-gray-600">{countLabel(f.countIn(c))}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// Passo a passo do pedido, com o atalho para pedido personalizado ao lado quando a loja aceita
export function HowItWorks({ onOpenCustom }: { onOpenCustom: () => void }) {
  const settings = useSettings();
  if (!settings.showHowItWorks) return null;
  return (
    <section className="mt-12 grid gap-6 rounded-xl border border-gray-200 bg-white p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center" aria-labelledby="como-pedir">
      <div>
        <h2 id="como-pedir" className="text-xl font-bold tracking-tight text-gray-900">{settings.howTitle}</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {steps(settings).map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white" aria-hidden="true">{i + 1}</span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{s.title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      {settings.customEnabled && settings.showHowCustom && (
        <div className="border-t border-gray-200 pt-5 lg:max-w-[16rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-sm font-semibold text-gray-900">{settings.cardTitle}</p>
          <p className="mt-1 text-sm text-gray-600">{settings.howCustomText}</p>
          <button onClick={onOpenCustom} className="mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{settings.cardButton}</button>
        </div>
      )}
    </section>
  );
}

// Título da página quando há categoria ou busca (a capa some)
export function FilteredHeading({ f, search = true }: { f: CatalogFilters; search?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <button onClick={f.clearFilters} className="text-sm text-gray-600 hover:text-blue-700">{ITEMS.all}</button>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          {f.activeCategory ? f.activeCategory.name : f.searchQuery ? `Resultados para “${f.searchQuery}”` : f.settings.catalogTitle}
          <CategoryDot category={f.activeCategory} size={12} />
        </h1>
        {f.activeCategory?.description && <p className="mt-1 text-sm text-gray-600 max-w-2xl">{f.activeCategory.description}</p>}
      </div>
      {search && <SearchField f={f} className="sm:w-72" />}
    </div>
  );
}

export default function HomeBancada({ products, categories, onAddToCart, onOpenProduct, onOpenCustomRequest }: HomeProps) {
  const f = useCatalogFilters(products, categories);
  const { settings } = f;

  return (
    <div>
      {f.isClean ? <BancadaHero f={f} /> : <FilteredHeading f={f} />}
      {f.isClean && <CategoryTiles f={f} />}
      {f.isClean && <HowItWorks onOpenCustom={onOpenCustomRequest} />}

      <section className={f.isClean ? 'mt-12' : 'mt-6'} aria-labelledby="todas">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="todas" className={f.isClean ? 'text-xl font-bold tracking-tight text-gray-900' : 'text-sm text-gray-600'}>
            {f.isClean ? ITEMS.all : countLabel(f.filtered.length)}
          </h2>
          <SortSelect f={f} />
        </div>
        <div className={`grid ${gridColsClass(settings.gridCols)} gap-3 sm:gap-5`}>
          {withCustomBand(f.visible, p => <ProductTile variant="panel" product={p} categories={categories} onAdd={() => onAddToCart(p)} onOpen={() => onOpenProduct(p)} />, p => p.id,
            { settings, hasItems: f.filtered.length > 0, onOpen: onOpenCustomRequest })}
        </div>
        <EmptyResult f={f} />
        <LoadMore f={f} />
      </section>
    </div>
  );
}
