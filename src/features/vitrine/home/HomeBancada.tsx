// Versão B, "Bancada": capa que lembra a mesa de impressão (grade milimetrada), busca grande, categorias com foto
// e um passo a passo do pedido, porque quem chega pela primeira vez não sabe que o orçamento vai pelo WhatsApp.
import type { CSSProperties } from 'react';
import { Search } from 'lucide-react';
import ProductImage from '../ProductImage';
import { bannerStyle } from '../../../lib/theme';
import { countLabel, ITEMS, useCatalogFilters, SearchField, SortSelect, CategoryDot, LoadMore, EmptyResult, ProductTile, gridColsClass, type HomeProps } from './shared';

// Grade fina a cada 24px e grossa a cada 120px, na cor principal da loja (acompanha o tema e o modo escuro)
const BED: CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgb(var(--p-600) / 0.13) 1px, transparent 1px)',
    'linear-gradient(90deg, rgb(var(--p-600) / 0.13) 1px, transparent 1px)',
    'linear-gradient(rgb(var(--p-600) / 0.06) 1px, transparent 1px)',
    'linear-gradient(90deg, rgb(var(--p-600) / 0.06) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
  backgroundPosition: 'center center',
};

// O último passo só fala em WhatsApp quando a loja tem um número cadastrado
const steps = (whatsapp: boolean) => [
  { title: 'Escolha os produtos', text: 'Adicione ao orçamento o que gostou e escolha as opções, como cor ou tamanho.' },
  { title: 'Envie o pedido', text: 'Ele chega pra gente com tudo anotado, sem pagamento na hora.' },
  whatsapp
    ? { title: 'Combine pelo WhatsApp', text: 'Confirmamos valor, prazo e forma de entrega com você.' }
    : { title: 'Combine os detalhes', text: 'Entramos em contato para confirmar valor, prazo e forma de entrega.' },
];

export default function HomeBancada({ products, categories, onAddToCart, onOpenProduct, onOpenCustomRequest }: HomeProps) {
  const f = useCatalogFilters(products, categories);
  const { settings } = f;
  // Foto de cada categoria: a primeira peça com foto que ainda não representa outra categoria
  const used = new Set<string>();
  const covers = new Map(f.activeCategories.map(c => {
    const items = f.inCategory(c).filter(p => p.imageUrls?.length);
    const pick = items.find(p => !used.has(p.id)) || items[0];
    if (pick) used.add(pick.id);
    return [c.id, pick?.imageUrls[0]];
  }));
  const cover = (id: string) => covers.get(id);
  const photo = !!settings.heroImage; // imagem de capa do painel substitui a grade da capa

  return (
    <div>
      {f.isClean ? (
        <section
          className={`relative overflow-hidden rounded-xl border px-5 py-10 sm:px-12 sm:py-16 ${photo ? 'border-transparent' : 'border-blue-200 bg-blue-50 dark:border-gray-200 dark:bg-white'}`}
          style={photo ? bannerStyle({ bannerImage: settings.heroImage, bannerColor: '#111827' }) : BED} aria-labelledby="titulo-loja"
        >
          <div className="relative mx-auto max-w-2xl text-center">
            <h1 id="titulo-loja" className={`text-[2rem] leading-[1.1] sm:text-[3.25rem] font-bold tracking-[-0.03em] text-balance ${photo ? 'text-white' : 'text-gray-900'}`}>{settings.catalogTitle}</h1>
            <p className={`mx-auto mt-4 max-w-xl text-base sm:text-lg leading-relaxed ${photo ? 'text-white/90' : 'text-gray-700'}`}>{settings.catalogSubtitle}</p>
            {settings.showSearch && (
              <SearchField f={f} placeholder="O que você procura?" className="mx-auto mt-8 max-w-lg" inputClassName="py-3.5 sm:py-4 text-base shadow-sm" />
            )}
            <nav aria-label="Categorias" className="mt-5 flex flex-wrap justify-center gap-2">
              {f.activeCategories.map(c => (
                <button key={c.id} onClick={() => f.selectCategory(c)} className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-sm text-gray-800 hover:border-blue-600 hover:text-blue-700">
                  {c.name}<span className="text-gray-500">{f.countIn(c)}</span><CategoryDot category={c} />
                </button>
              ))}
            </nav>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button onClick={f.clearFilters} className="text-sm text-gray-600 hover:text-blue-700">{ITEMS.all}</button>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              {f.activeCategory ? f.activeCategory.name : f.searchQuery ? `Resultados para “${f.searchQuery}”` : settings.catalogTitle}
              <CategoryDot category={f.activeCategory} size={12} />
            </h1>
            {f.activeCategory?.description && <p className="mt-1 text-sm text-gray-600 max-w-2xl">{f.activeCategory.description}</p>}
          </div>
          <SearchField f={f} className="sm:w-72" />
        </div>
      )}

      {f.isClean && f.activeCategories.length > 1 && (
        <section className="mt-12" aria-labelledby="por-categoria">
          <h2 id="por-categoria" className="text-xl font-bold tracking-tight text-gray-900">Por categoria</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
            {f.activeCategories.map(c => {
              const img = cover(c.id);
              return (
                <button key={c.id} onClick={() => f.selectCategory(c)} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-xl">
                  <span className="block aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                    {img ? <ProductImage thumb src={img} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Search className="m-auto h-6 w-6 text-gray-400" aria-hidden="true" />}
                  </span>
                  <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-gray-900">{c.name}<CategoryDot category={c} /></span>
                  <span className="block text-xs text-gray-600">{countLabel(f.countIn(c))}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {f.isClean && (
        <section className="mt-12 grid gap-6 rounded-xl bg-white p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center border border-gray-200" aria-labelledby="como-pedir">
          <div>
            <h2 id="como-pedir" className="text-xl font-bold tracking-tight text-gray-900">Como funciona o pedido</h2>
            <ol className="mt-5 grid gap-5 sm:grid-cols-3">
              {steps(!!settings.whatsapp).map((s, i) => (
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
          {settings.customEnabled && (
            <div className="border-t border-gray-200 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 lg:max-w-[16rem]">
              <p className="text-sm font-semibold text-gray-900">{settings.cardTitle}</p>
              <p className="mt-1 text-sm text-gray-600">Mande uma foto ou a ideia e a gente modela para você.</p>
              <button onClick={onOpenCustomRequest} className="mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{settings.cardButton}</button>
            </div>
          )}
        </section>
      )}

      <section className={f.isClean ? 'mt-12' : 'mt-6'} aria-labelledby="todas">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="todas" className={f.isClean ? 'text-xl font-bold tracking-tight text-gray-900' : 'text-sm text-gray-600'}>
            {f.isClean ? ITEMS.all : countLabel(f.filtered.length)}
          </h2>
          <SortSelect f={f} />
        </div>
        <div className={`grid ${gridColsClass(settings.gridCols)} gap-3 sm:gap-5`}>
          {f.visible.map(p => (
            <ProductTile key={p.id} variant="panel" product={p} categories={categories} onAdd={() => onAddToCart(p)} onOpen={() => onOpenProduct(p)} />
          ))}
        </div>
        <EmptyResult f={f} />
        <LoadMore f={f} />
      </section>
    </div>
  );
}
