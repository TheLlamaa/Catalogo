import { useState } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import {
  Plus, Edit2, Trash2, Copy, Star, Flame, Layers, Box, Image as ImageIcon, ArrowUp, ArrowDown, Search, PackageOpen, SearchX, Info,
} from 'lucide-react';
import ProductImage from '../../vitrine/ProductImage';
import { useUI } from '../../../components/UIContext';
import { Button, EmptyState, PageHeader } from '../../../components/ui';
import ProductForm from './ProductForm';
import Pagination from '../pedidos/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import { optionsFor, auraDot, auraLabel } from '../../../lib/auras';
import { useSettings } from '../../../components/SettingsContext';
import { brl, isHttpUrl } from '../../../lib/format';
import type { Category, Product, StoredProduct } from '../../../types';

interface ProductManagerProps {
  products: Product[];
  categories: Category[];
  onSave: (product: Partial<StoredProduct>, successMessage?: string) => Promise<boolean>;
  onDelete: (id: string) => unknown;
  onReorder: (orderedIds: string[]) => unknown;
  initialFilter?: string; // 'destaque', 'popular' ou 'cat:<id>' (atalho vindo de outras telas)
  onOpenSettings?: (group: string) => void;
}

type StatusFilter = '' | 'visible' | 'hidden' | 'destaque' | 'popular' | 'nostock' | 'nophoto';

const normalize = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SECTION_LABEL: Record<string, string> = { destaque: 'Destaque', popular: 'Mais pedido' };

export default function ProductManager({ products, categories, onSave, onDelete, onReorder, initialFilter = '', onOpenSettings }: ProductManagerProps) {
  const { confirm } = useUI();
  const settings = useSettings();
  const { stockControl, aurasEnabled } = settings;
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>(initialFilter === 'destaque' || initialFilter === 'popular' ? initialFilter : '');
  const [categoryId, setCategoryId] = useState(initialFilter.startsWith('cat:') ? initialFilter.slice(4) : '');

  const isVisible = (p: Product) => p.active !== false;
  const tests: Record<Exclude<StatusFilter, ''>, (p: Product) => boolean> = {
    visible: isVisible,
    hidden: p => !isVisible(p),
    destaque: p => p.section === 'destaque',
    popular: p => p.section === 'popular',
    nostock: p => (Number(p.stock) || 0) <= 0,
    nophoto: p => !(p.imageUrls?.length > 0),
  };
  const chips: { id: StatusFilter; label: string; hide?: boolean }[] = [
    { id: '', label: 'Todos' },
    { id: 'visible', label: 'Na vitrine' },
    { id: 'hidden', label: 'Ocultos' },
    { id: 'destaque', label: 'Destaques' },
    { id: 'popular', label: 'Mais pedidos' },
    { id: 'nostock', label: 'Sem estoque', hide: !stockControl },
    { id: 'nophoto', label: 'Sem foto' },
  ];

  const q = normalize(query.trim());
  const byCategory = categoryId ? products.filter(p => p.categoryIds?.includes(categoryId)) : products;
  const bySearch = q ? byCategory.filter(p => normalize(`${p.title} ${p.badge || ''}`).includes(q)) : byCategory;
  const visible = status ? bySearch.filter(tests[status]) : bySearch;
  const filtering = !!(q || status || categoryId);
  const pager = usePagination(visible, 'produtos');
  const counts: Record<string, number> = Object.fromEntries(chips.map(c => [c.id, c.id ? bySearch.filter(tests[c.id as Exclude<StatusFilter, ''>]).length : bySearch.length]));
  const wide = useMediaQuery('(min-width: 1024px)');

  const clearFilters = () => { setQuery(''); setStatus(''); setCategoryId(''); };
  const handleAddNew = () => { setEditingProduct(null); setIsFormOpen(true); };
  const handleEdit = (product: Product) => { setEditingProduct(product); setIsFormOpen(true); };

  const handleDelete = async (product: Product) => {
    const ok = await confirm({ title: 'Excluir produto?', message: `“${product.title}” será excluído com fotos e opções. Isso não pode ser desfeito. Para só tirar da vitrine, desligue “Na vitrine”.`, confirmLabel: 'Excluir produto' });
    if (ok) onDelete(product.id);
  };

  // Sobe ou desce um produto: a ordem desta lista é a ordem da vitrine
  const move = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= products.length) return;
    const ids = products.map(p => p.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onReorder(ids);
  };

  // Ações rápidas, sem abrir o cadastro (cada uma confirma o que aconteceu)
  const toggleVisible = (p: Product) => onSave({ ...p, active: !isVisible(p) }, isVisible(p) ? `“${p.title}” saiu da vitrine (oculto).` : `“${p.title}” voltou para a vitrine.`);
  const toggleFeatured = (p: Product) => {
    const on = p.section === 'destaque';
    const msg = on ? `“${p.title}” saiu dos Destaques.` : `“${p.title}” agora está nos Destaques.${settings.showFeatured ? '' : ' A seção Destaques está desligada na Página inicial.'}`;
    return onSave({ ...p, section: on ? '' : 'destaque' }, msg);
  };
  // Cópia oculta (rascunho): o admin ajusta e mostra na vitrine quando estiver pronta
  const handleDuplicate = (product: Product) => onSave({ ...product, id: undefined, title: `${product.title} (cópia)`, active: false }, `Cópia criada como oculta: “${product.title} (cópia)”.`);

  if (isFormOpen) {
    return (
      <ProductForm
        initialData={editingProduct}
        categories={categories}
        onSave={async (data) => { const ok = await onSave(data, data.id ? 'Produto salvo.' : 'Produto criado.'); if (ok) setIsFormOpen(false); }}
        onCancel={() => setIsFormOpen(false)}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  const featuredOff = (status === 'destaque' && !settings.showFeatured) || (status === 'popular' && !settings.showPopular);

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="A ordem desta lista é a ordem da vitrine. Produto novo entra no topo."
        actions={<Button variant="primary" icon={Plus} onClick={handleAddNew}>Novo produto</Button>}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={PackageOpen} title="Nenhum produto cadastrado"
          text="Os produtos aparecem na vitrine para os clientes montarem o orçamento. Comece pelo primeiro: foto, nome e preço já bastam."
          action={<Button variant="primary" icon={Plus} onClick={handleAddNew}>Cadastrar primeiro produto</Button>}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" aria-hidden="true" />
              <input
                type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produto pelo nome ou selo" aria-label="Buscar produtos"
                className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select aria-label="Filtrar por categoria" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white sm:w-56">
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtrar produtos">
            {chips.filter(c => !c.hide).map(c => (
              <button
                key={c.id || 'todos'} type="button" onClick={() => setStatus(c.id)} aria-pressed={status === c.id}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${status === c.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >{c.label} <span className={status === c.id ? 'text-gray-300' : 'text-gray-500'}>({counts[c.id]})</span></button>
            ))}
          </div>

          {featuredOff && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span className="flex-1">A seção “{status === 'destaque' ? settings.featuredTitle : settings.popularTitle}” está desligada: estes produtos não aparecem em destaque na vitrine.</span>
              {onOpenSettings && <Button size="sm" onClick={() => onOpenSettings('inicio')}>Ligar na Página inicial</Button>}
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={SearchX} title="Nenhum produto com estes filtros"
              text={status === 'destaque' ? 'Nenhum produto está nos Destaques. Clique na estrela ☆ de um produto para destacá-lo na vitrine.' : 'Tente outra busca ou limpe os filtros.'}
              action={<Button onClick={clearFilters}>Limpar filtros</Button>}
            />
          ) : (
            <>
              <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} noun="produtos" position="top" />
              {filtering && <p className="text-xs text-gray-500 mb-2">Com filtros ligados não dá para reordenar. <button type="button" onClick={clearFilters} className="text-blue-700 underline py-1">Limpar filtros</button></p>}

              {/* Computador: tabela */}
              {wide ? (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                      {!filtering && <th className="pl-3 pr-0 py-3 w-10"><span className="sr-only">Ordem</span></th>}
                      <th className="px-3 py-3">Produto</th>
                      {stockControl && <th className="px-3 py-3">Estoque</th>}
                      {aurasEnabled && <th className="px-3 py-3">Aura (edição rápida)</th>}
                      <th className="px-3 py-3">Vitrine</th>
                      <th className="px-3 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {pager.items.map(product => {
                      const index = products.findIndex(p => p.id === product.id); // posição na lista inteira (a ordem vale para toda a vitrine)
                      return (
                        <tr key={product.id} className={`hover:bg-gray-50 ${isVisible(product) ? '' : 'bg-gray-50/60'}`}>
                          {!filtering && (
                            <td className="pl-3 pr-0 py-2">
                              <div className="flex flex-col">
                                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${product.title}`} title="Subir na vitrine" className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-gray-500"><ArrowUp className="w-4 h-4" /></button>
                                <button type="button" onClick={() => move(index, 1)} disabled={index === products.length - 1} aria-label={`Descer ${product.title}`} title="Descer na vitrine" className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-gray-500"><ArrowDown className="w-4 h-4" /></button>
                              </div>
                            </td>
                          )}
                          <td className="px-3 py-3"><ProductSummary product={product} onEdit={handleEdit} /></td>
                          {stockControl && <td className="px-3 py-3"><StockTag stock={product.stock} /></td>}
                          {aurasEnabled && <td className="px-3 py-3"><AuraQuickEdit product={product} categories={categories} onSave={onSave} /></td>}
                          <td className="px-3 py-3"><VisibilityToggle product={product} onToggle={toggleVisible} /></td>
                          <td className="px-3 py-3">
                            <RowActions product={product} onFeatured={toggleFeatured} onDuplicate={handleDuplicate} onEdit={handleEdit} onDelete={handleDelete} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              ) : (
              /* Celular: cards, com as ações sempre à vista */
              <ul className="space-y-3">
                {pager.items.map(product => {
                  const index = products.findIndex(p => p.id === product.id);
                  return (
                    <li key={product.id} className={`border border-gray-200 rounded-lg p-3 ${isVisible(product) ? 'bg-white' : 'bg-gray-50'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0"><ProductSummary product={product} onEdit={handleEdit} /></div>
                        {!filtering && (
                          <div className="flex flex-col -mr-1">
                            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${product.title}`} className="p-2 text-gray-500 disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => move(index, 1)} disabled={index === products.length - 1} aria-label={`Descer ${product.title}`} className="p-2 text-gray-500 disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <VisibilityToggle product={product} onToggle={toggleVisible} />
                          {stockControl && <StockTag stock={product.stock} />}
                        </div>
                        <RowActions product={product} onFeatured={toggleFeatured} onDuplicate={handleDuplicate} onEdit={handleEdit} onDelete={handleDelete} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              )}
              <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} noun="produtos" />
            </>
          )}
        </>
      )}
    </div>
  );
}

function ProductSummary({ product, onEdit }: { product: Product; onEdit: (p: Product) => void }) {
  const cover = product.imageUrls?.length > 0 ? product.imageUrls[0] : null;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="h-12 w-12 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
        {cover ? <ProductImage thumb src={cover} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="w-4 h-4 text-gray-500" aria-label="Sem foto" />}
      </div>
      <div className="min-w-0">
        <button type="button" onClick={() => onEdit(product)} className="text-sm font-medium text-gray-900 hover:text-blue-700 hover:underline text-left block truncate max-w-full py-0.5">{product.title}</button>
        <span className="text-xs text-gray-500 font-medium">{brl(product.price)}</span>
        {(product.badge || product.section) && (
          <span className="mt-1 flex flex-wrap gap-1">
            {product.section === 'destaque' && <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded"><Star className="w-3 h-3 fill-current" aria-hidden="true" />{SECTION_LABEL.destaque}</span>}
            {product.section === 'popular' && <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"><Flame className="w-3 h-3" aria-hidden="true" />{SECTION_LABEL.popular}</span>}
            {product.badge && <span className="text-[11px] font-medium bg-white text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded" title="Selo no card">Selo: {product.badge}</span>}
          </span>
        )}
        {isHttpUrl(product.modelUrl) && (
          <a href={product.modelUrl} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
            <Box className="w-3 h-3" /> Abrir modelo
          </a>
        )}
      </div>
    </div>
  );
}

function StockTag({ stock }: { stock: number }) {
  const n = Number(stock) || 0;
  const tone = n <= 0 ? 'bg-red-50 text-red-700' : n <= 3 ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${tone}`}>
      <Layers className="w-3 h-3" aria-hidden="true" /> {n <= 0 ? 'Esgotado' : `${n} un.`}
    </span>
  );
}

// Mostrar/ocultar na vitrine: interruptor com o estado escrito ("Na vitrine" / "Oculto")
function VisibilityToggle({ product, onToggle }: { product: Product; onToggle: (p: Product) => unknown }) {
  const on = product.active !== false;
  return (
    <button
      type="button" role="switch" aria-checked={on} onClick={() => onToggle(product)}
      aria-label={`Mostrar ${product.title} na vitrine`} title={on ? 'Clique para ocultar da vitrine' : 'Clique para mostrar na vitrine'}
      className="inline-flex items-center gap-2 rounded-full py-2 -my-2 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-green-600' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </span>
      <span className={`text-xs font-semibold whitespace-nowrap ${on ? 'text-green-800' : 'text-gray-500'}`}>{on ? 'Na vitrine' : 'Oculto'}</span>
    </button>
  );
}

interface RowActionsProps {
  product: Product;
  onFeatured: (p: Product) => unknown;
  onDuplicate: (p: Product) => unknown;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => unknown;
}

function RowActions({ product, onFeatured, onDuplicate, onEdit, onDelete }: RowActionsProps) {
  const featured = product.section === 'destaque';
  const icon = 'p-2.5 md:p-2 rounded-md text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
  return (
    <div className="flex justify-end items-center gap-0.5">
      <button
        type="button" onClick={() => onFeatured(product)} aria-pressed={featured}
        aria-label={featured ? `Tirar ${product.title} dos Destaques` : `Destacar ${product.title}`}
        title={featured ? 'Nos Destaques — clique para tirar' : 'Colocar nos Destaques da vitrine'}
        className={`${icon} ${featured ? 'text-amber-500 hover:text-amber-600' : 'hover:text-amber-500'}`}
      ><Star className={`w-4 h-4 ${featured ? 'fill-current' : ''}`} /></button>
      <button type="button" onClick={() => onDuplicate(product)} className={`${icon} hover:text-blue-600`} title="Duplicar (a cópia fica oculta)" aria-label={`Duplicar ${product.title}`}><Copy className="w-4 h-4" /></button>
      <button type="button" onClick={() => onEdit(product)} className={`${icon} hover:text-blue-600`} title="Editar" aria-label={`Editar ${product.title}`}><Edit2 className="w-4 h-4" /></button>
      <button type="button" onClick={() => onDelete(product)} className={`${icon} hover:text-red-600 hover:bg-red-50`} title="Excluir" aria-label={`Excluir ${product.title}`}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

function AuraQuickEdit({ product, categories, onSave }: { product: Product; categories: Category[]; onSave: ProductManagerProps['onSave'] }) {
  const { auraLib } = useSettings();
  // Cor da aura atual, para mostrar o brilho do seletor
  let displayAura = product.auraColor || 'inherit';
  if (displayAura === 'inherit' && product.categoryIds?.length > 0) {
    const matchedCategory = categories.find(c => product.categoryIds.includes(c.id) && c.auraColor && c.auraColor !== 'none');
    if (matchedCategory?.auraColor) displayAura = matchedCategory.auraColor;
  }
  return (
    <div className="flex items-center gap-2">
      {displayAura !== 'none' && displayAura !== 'inherit' ? (
        <span role="img" title={auraLabel(displayAura, auraLib)} aria-label={`Aura atual: ${auraLabel(displayAura, auraLib)}`} {...auraDot(displayAura, auraLib, 18)} />
      ) : (
        <span className="inline-block rounded-full border border-dashed border-gray-300" style={{ width: 18, height: 18 }} title="Sem aura" aria-label="Sem aura" role="img" />
      )}
      <select
        aria-label={`Aura de ${product.title}`}
        value={product.auraColor || 'inherit'}
        onChange={(e) => onSave({ ...product, auraColor: e.target.value }, `Aura de “${product.title}” atualizada.`)}
        className="bg-white text-xs font-medium px-2 py-1.5 rounded outline-none border border-gray-200 focus:border-blue-500 cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors w-28 xl:w-36"
      >
        {optionsFor(auraLib, product.auraColor || 'inherit').map(aura => (
          <option key={aura.id} value={aura.id}>{aura.name}</option>
        ))}
      </select>
    </div>
  );
}
