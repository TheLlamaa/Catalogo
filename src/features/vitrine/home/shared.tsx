// Peças comuns às versões novas da página inicial: filtros (no endereço), busca, ordem, card de produto e "Ver mais".
import { Fragment, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Check, Clock, Sparkles, Image as ImageIcon } from 'lucide-react';
import type { Settings } from '../../../lib/settings';
import type { Category, Product } from '../../../types';
import ProductImage from '../ProductImage';
import Price from '../Price';
import { useSettings } from '../../../components/SettingsContext';
import { auraProps, auraDot } from '../../../lib/auras';
import { badgeStyle } from '../../../lib/theme';
import { NICHE } from '../../../lib/niche';
import { availability, badgeFor, effectiveAura, newProducts } from '../../../lib/catalog';

export const PAGE_SIZE = 12;

// "1 peça", "3 peças" (ou produto/produtos na loja genérica)
export const countLabel = (n: number) => `${n} ${n === 1 ? NICHE.item.one : NICHE.item.many}`;
export const ITEMS = NICHE.item;

export interface HomeProps {
  products: Product[];
  categories: Category[];
  onAddToCart: (product: Product) => boolean;
  onOpenProduct: (product: Product) => void;
  onOpenCustomRequest: () => void;
}

// Mesma regra da vitrine atual: ?categoria=&q=&ordem= no endereço, "Ver mais" volta ao início quando o filtro muda
export function useCatalogFilters(products: Product[], categories: Category[]) {
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const categoryParam = params.get('categoria') || 'all';
  const searchQuery = params.get('q') || '';
  const sortOrder = params.get('ordem') || settings.defaultSort;

  const updateParam = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === defaultValue) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const active = products.filter(p => p.active !== false);
  const activeCategories = categories.filter(c => active.some(p => p.categoryIds?.includes(c.id)));
  const activeCategory = categories.find(c => (c.slug && c.slug === categoryParam) || String(c.id) === categoryParam);
  const activeCategoryId = activeCategory ? activeCategory.id : 'all';
  const categoryKey = (c: Category) => c.slug || String(c.id);
  const countIn = (c: Category) => active.filter(p => p.categoryIds?.includes(c.id)).length;
  const inCategory = (c: Category) => active.filter(p => p.categoryIds?.includes(c.id));

  const query = searchQuery.toLowerCase();
  const filtered = active.filter(p => {
    const matchesCategory = activeCategoryId === 'all' || p.categoryIds?.includes(activeCategoryId);
    const matchesSearch = p.title.toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
  filtered.sort((a, b) => {
    if (sortOrder === 'price_asc') return a.salePrice - b.salePrice;
    if (sortOrder === 'price_desc') return b.salePrice - a.salePrice;
    return 0;
  });

  const filterKey = `${activeCategoryId}|${searchQuery}|${sortOrder}`;
  const [shown, setShown] = useState({ key: filterKey, n: PAGE_SIZE });
  const visibleCount = shown.key === filterKey ? shown.n : PAGE_SIZE;
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;
  const showMore = () => setShown({ key: filterKey, n: visibleCount + PAGE_SIZE });

  // Vitrine "limpa": sem categoria, busca nem ordem diferente da padrão
  const isClean = activeCategoryId === 'all' && !searchQuery && sortOrder === settings.defaultSort;
  const featured = settings.showFeatured ? active.filter(p => p.section === 'destaque') : [];
  const popular = settings.showPopular ? active.filter(p => p.section === 'popular') : [];
  const fresh = settings.showNew ? newProducts(active) : [];

  return {
    settings, active, activeCategories, activeCategory, activeCategoryId, categoryKey, countIn, inCategory,
    searchQuery, sortOrder, updateParam, filtered, visible, remaining, showMore, isClean, featured, popular, fresh,
    selectCategory: (c: Category | null) => updateParam('categoria', c ? categoryKey(c) : 'all', 'all'),
    // Tira categoria e busca de uma vez (duas chamadas seguidas a updateParam partiriam do mesmo endereço antigo)
    clearFilters: () => { const next = new URLSearchParams(params); next.delete('categoria'); next.delete('q'); setParams(next, { replace: true }); },
  };
}
export type CatalogFilters = ReturnType<typeof useCatalogFilters>;

export function SearchField({ f, placeholder = `Buscar ${NICHE.item.many}`, className = '', inputClassName = '' }: { f: CatalogFilters; placeholder?: string; className?: string; inputClassName?: string }) {
  if (!f.settings.showSearch) return null;
  return (
    <div className={`relative ${className}`}>
      <label htmlFor="busca" className="sr-only">Buscar produtos</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" aria-hidden="true" />
      <input
        id="busca" type="search" placeholder={placeholder} value={f.searchQuery}
        onChange={(e) => f.updateParam('q', e.target.value, '')}
        className={`block w-full pl-10 pr-3 rounded-full border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputClassName || 'py-2 text-sm'}`}
      />
    </div>
  );
}

export function SortSelect({ f, className = '' }: { f: CatalogFilters; className?: string }) {
  return (
    <>
      <label htmlFor="ordem" className="sr-only">Ordenar por</label>
      <select
        id="ordem" value={f.sortOrder}
        onChange={(e) => f.updateParam('ordem', e.target.value, f.settings.defaultSort)}
        className={`border border-gray-300 rounded-full py-1.5 pl-3 pr-8 text-sm bg-white text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      >
        <option value="recent">Mais recentes</option>
        <option value="price_asc">Menor preço</option>
        <option value="price_desc">Maior preço</option>
      </select>
    </>
  );
}

export function CategoryDot({ category, size = 8 }: { category?: Category | null; size?: number }) {
  const settings = useSettings();
  if (!settings.aurasEnabled || !category?.auraColor || category.auraColor === 'none') return null;
  return <span {...auraDot(category.auraColor, settings.auraLib, size)} />;
}

export function LoadMore({ f }: { f: CatalogFilters }) {
  if (f.remaining <= 0) return null;
  return (
    <div className="mt-8 text-center">
      <button onClick={f.showMore} className="px-6 py-2.5 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:border-gray-400">
        Ver mais {countLabel(f.remaining)}
      </button>
    </div>
  );
}

export function EmptyResult({ f }: { f: CatalogFilters }) {
  if (f.filtered.length > 0) return null;
  return (
    <div className="py-14 text-center">
      <p className="text-gray-800 font-medium">Nada encontrado{f.searchQuery ? ` para “${f.searchQuery}”` : ''}.</p>
      <p className="mt-1 text-sm text-gray-600">Tente outra palavra ou veja todas as categorias.</p>
      <button onClick={f.clearFilters} className="mt-4 text-sm font-medium text-blue-700 hover:underline">Limpar busca</button>
    </div>
  );
}

// Aura da categoria em volta do card (recurso que a loja liga ou desliga)
export function AuraWrap({ product, categories, children, fit = false }: { product: Product; categories: Category[]; children: ReactNode; fit?: boolean }) {
  const settings = useSettings();
  const key = effectiveAura(product, categories, settings.aurasEnabled);
  if (key === 'none') return <>{children}</>;
  const aura = auraProps(key, settings.auraLib);
  return <div className={`aura ${aura.className} ${fit ? '' : 'h-full'}`} style={fit ? { ...aura.style, height: 'auto' } : aura.style}>{children}</div>;
}

// Card de produto. "photo": foto em destaque com botão de adicionar sobre ela (versões A e C).
// "panel": card com moldura, prazo e botão de largura total (versão B).
interface TileProps { product: Product; categories: Category[]; onAdd: () => boolean; onOpen: () => void; variant?: 'photo' | 'panel'; size?: 'md' | 'lg' }

export function ProductTile({ product, categories, onAdd, onOpen, variant = 'photo', size = 'md' }: TileProps) {
  const settings = useSettings();
  const [added, setAdded] = useState(false);
  const badge = badgeFor(product, settings);
  const stock = availability(product, settings.stockControl);
  const out = stock === 'out';
  const hasOptions = (product.options || []).length > 0;
  const image = product.imageUrls?.[0];
  const actionLabel = out ? 'Indisponível' : hasOptions ? 'Escolher opções' : 'Adicionar ao orçamento';

  const act = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasOptions) { onOpen(); return; }
    if (onAdd()) { setAdded(true); setTimeout(() => setAdded(false), 1400); }
  };

  const photo = (
    <div className={`relative aspect-square overflow-hidden bg-gray-100 ${variant === 'photo' ? 'rounded-xl' : ''}`}>
      {image
        ? <ProductImage thumb src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        : <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-500"><ImageIcon className="h-8 w-8 opacity-60" aria-hidden="true" /><span className="text-xs">Foto em breve</span></div>}
      {badge && <span style={badgeStyle(settings.badgeColor)} className="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-full px-2.5 py-1 text-[11px] font-semibold">{badge}</span>}
      {out && <span className="absolute right-2.5 top-2.5 rounded-full bg-gray-900/80 px-2.5 py-1 text-[11px] font-semibold text-white">Esgotado</span>}
      {variant === 'photo' && !out && (
        <button
          onClick={act} aria-label={`${actionLabel}: ${product.title}`} title={actionLabel}
          className={`absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${added ? 'bg-green-600 text-white' : 'bg-white text-gray-900 hover:bg-blue-600 hover:text-white'}`}
        >
          {added ? <Check className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
        </button>
      )}
    </div>
  );

  const card = variant === 'photo' ? (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex
    <article
      onClick={onOpen} aria-label={`Ver detalhes de ${product.title}`}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); } }}
      className="group relative cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 h-full"
    >
      <AuraWrap fit product={product} categories={categories}>{photo}</AuraWrap>
      <div className="px-0.5 pt-3">
        <h3 className={`font-medium leading-snug text-gray-900 line-clamp-2 ${size === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-[15px]'}`}>{product.title}</h3>
        {!settings.hidePrices && <div className="mt-1"><Price product={product} className={`font-semibold text-gray-900 ${size === 'lg' ? 'text-base' : 'text-sm sm:text-base'}`} /></div>}
        {stock === 'low' && <p className="mt-1 text-xs font-medium text-amber-700">{product.stock === 1 ? 'Resta 1 unidade' : `Restam ${product.stock} unidades`}</p>}
      </div>
    </article>
  ) : (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex
    <article
      onClick={onOpen} aria-label={`Ver detalhes de ${product.title}`}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); } }}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white outline-none transition-colors hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {photo}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold leading-snug text-gray-900 line-clamp-2">{product.title}</h3>
        {settings.leadTimeEnabled && product.leadTime && (
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-600"><Clock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /><span className="truncate">{product.leadTime}</span></p>
        )}
        {stock === 'low' && <p className="mt-1 text-xs font-medium text-amber-700">{product.stock === 1 ? 'Resta 1 unidade' : `Restam ${product.stock} unidades`}</p>}
        <div className="mt-auto pt-3">
          {!settings.hidePrices && <Price product={product} className="text-base sm:text-lg font-bold text-gray-900" />}
          <button
            onClick={act} disabled={out}
            className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${out ? 'cursor-not-allowed bg-gray-100 text-gray-500' : added ? 'bg-green-600 text-white' : 'border border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white'}`}
          >
            {added ? <><Check className="h-4 w-4" aria-hidden="true" /> No orçamento</> : out ? 'Indisponível' : hasOptions ? 'Escolher opções' : <><Plus className="h-4 w-4" aria-hidden="true" /> Adicionar</>}
          </button>
        </div>
      </div>
    </article>
  );

  return variant === 'panel' ? <AuraWrap product={product} categories={categories}>{card}</AuraWrap> : card;
}

// Colunas da grade: 2 no celular e o número escolhido no painel (Produtos por linha) a partir do tablet largo.
// Classes escritas por inteiro porque o Tailwind só gera o que aparece no código.
export const gridColsClass = (cols: string) => ({
  '2': 'grid-cols-2',
  '3': 'grid-cols-2 sm:grid-cols-3',
  '4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
} as Record<string, string>)[cols] || 'grid-cols-2 sm:grid-cols-3';

// Faixa "Peça personalizada" na cor da loja, usada em todos os modelos da página inicial
export function CustomBand({ onOpen }: { onOpen: () => void }) {
  const { cardTitle, cardText, cardButton, cardBadge, showCardBadge } = useSettings();
  return (
    <div className="col-span-full flex flex-col gap-5 rounded-xl bg-blue-600 px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-9">
      <div className="max-w-xl">
        {showCardBadge && cardBadge.trim() && (
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{cardBadge}</span>
        )}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{cardTitle}</h2>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-white">{cardText}</p>
      </div>
      <button onClick={onOpen} className="flex-shrink-0 self-start sm:self-auto rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600">{cardButton}</button>
    </div>
  );
}

// Onde a faixa entra na grade (Site > Página inicial > Blocos > Posição da faixa): antes dos produtos,
// depois de 1, 2 ou 3 linhas completas (pelo número de colunas no computador) ou no fim.
// Com menos produtos que a posição pedida, ela vai para o fim da lista.
export const bandIndex = (rows: string, cols: string, total: number): number => {
  if (rows === 'inicio') return 0;
  if (rows === 'fim') return total;
  const perRow = Number(cols) || 3;
  return Math.min((Number(rows) || 2) * perRow, total);
};

// Grade com a faixa no lugar escolhido. "hasItems" evita a faixa sozinha numa busca sem resultado.
export function withCustomBand<T>(items: T[], render: (item: T) => ReactNode, key: (item: T) => string, opts: { settings: Settings; hasItems: boolean; onOpen: () => void }): ReactNode[] {
  const { settings } = opts;
  const nodes = items.map(item => <Fragment key={key(item)}>{render(item)}</Fragment>);
  if (!settings.customEnabled || !settings.showCustomBand || !opts.hasItems) return nodes;
  nodes.splice(bandIndex(settings.customBandRows, settings.gridCols, items.length), 0, <CustomBand key="faixa-personalizada" onOpen={opts.onOpen} />);
  return nodes;
}
