import { useState } from 'react';
import { Plus, Edit2, Trash2, Copy, Eye, EyeOff, Layers, Box, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import ProductImage from '../../vitrine/ProductImage';
import { useUI } from '../../../components/UIContext';
import ProductForm from './ProductForm';
import { optionsFor, auraDot, auraLabel } from '../../../lib/auras';
import { useSettings } from '../../../components/SettingsContext';
import { brl, isHttpUrl } from '../../../lib/format';
import type { Category, Product, StoredProduct } from '../../../types';

interface ProductManagerProps {
  products: Product[];
  categories: Category[];
  onSave: (product: Partial<StoredProduct>) => Promise<boolean>;
  onDelete: (id: string) => unknown;
  onReorder: (orderedIds: string[]) => unknown;
}

export default function ProductManager({ products, categories, onSave, onDelete, onReorder }: ProductManagerProps) {
  const { confirm } = useUI();
  const { auraLib, stockControl, aurasEnabled } = useSettings();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddNew = () => { setEditingProduct(null); setIsFormOpen(true); };

  const handleDelete = async (product: Product) => {
    const ok = await confirm({ title: 'Excluir produto', message: `Excluir “${product.title}”? Isso não pode ser desfeito.` });
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

  // Cópia inativa (rascunho): o admin ajusta e ativa quando estiver pronta
  const handleDuplicate = (product: Product) => onSave({ ...product, id: undefined, title: `${product.title} (cópia)`, active: false });

  return (
    <div>
      {isFormOpen ? (
        <ProductForm
          initialData={editingProduct}
          categories={categories}
          onSave={async (data) => { const ok = await onSave(data); if (ok) setIsFormOpen(false); }}
          onCancel={() => setIsFormOpen(false)}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Produtos Cadastrados ({products.length})</h2>
            <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>
          <p className="text-xs text-gray-500 -mt-3 mb-4">Esta é a ordem da vitrine. Use as setas para reordenar; produto novo entra no topo.</p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="pl-4 pr-0 py-4 w-12"><span className="sr-only">Ordem</span></th>
                  <th className="px-6 py-4">Produto</th>
                  {stockControl && <th className="px-6 py-4">Estoque</th>}
                  {aurasEnabled && <th className="px-6 py-4">Aura (Edição Rápida)</th>}
                  <th className="px-6 py-4">Visibilidade</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {products.length === 0 ? (
                  <tr><td colSpan={4 + (stockControl ? 1 : 0) + (aurasEnabled ? 1 : 0)} className="px-6 py-12 text-center text-sm text-gray-500">Nenhum produto cadastrado.</td></tr>
                ) : (
                  products.map((product, index) => {
                    const displayImage = product.imageUrls?.length > 0 ? product.imageUrls[0] : null;
                    const isActive = product.active !== false;

                    // Cor da aura atual, para mostrar o brilho do seletor
                    let displayAura = product.auraColor || 'inherit';
                    if (displayAura === 'inherit' && product.categoryIds?.length > 0) {
                      const matchedCategory = categories.find(c => product.categoryIds.includes(c.id) && c.auraColor && c.auraColor !== 'none');
                      if (matchedCategory?.auraColor) displayAura = matchedCategory.auraColor;
                    }

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="pl-4 pr-0 py-2">
                          <div className="flex flex-col">
                            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${product.title}`} title="Subir" className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-gray-400"><ArrowUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => move(index, 1)} disabled={index === products.length - 1} aria-label={`Descer ${product.title}`} title="Descer" className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-gray-400"><ArrowDown className="w-4 h-4" /></button>
                          </div>
                        </td>
                        <td className="px-6 py-4 flex items-center gap-4">
                          <div className="h-10 w-10 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {displayImage ? <ProductImage thumb src={displayImage} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900 block">{product.title}</span>
                            <span className="text-xs text-gray-500 font-medium">{brl(product.price)}</span>
                            {(product.badge || product.section) && (
                              <span className="mt-0.5 flex flex-wrap gap-1">
                                {product.badge && <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{product.badge}</span>}
                                {product.section && <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{product.section === 'destaque' ? 'Destaque' : 'Mais pedido'}</span>}
                              </span>
                            )}
                            {isHttpUrl(product.modelUrl) && (
                              <a href={product.modelUrl} target="_blank" rel="noreferrer noopener" className="mt-0.5 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                                <Box className="w-3 h-3" /> Abrir modelo
                              </a>
                            )}
                          </div>
                        </td>

                        {stockControl && <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${product.stock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                            <Layers className="w-3 h-3" /> {product.stock} un.
                          </span>
                        </td>}

                        {aurasEnabled && <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {displayAura !== 'none' && displayAura !== 'inherit' ? (
                              <span role="img" title={auraLabel(displayAura, auraLib)} aria-label={`Aura atual: ${auraLabel(displayAura, auraLib)}`} {...auraDot(displayAura, auraLib, 20)} />
                            ) : (
                              <span className="inline-block rounded-full border border-dashed border-gray-300" style={{ width: 20, height: 20 }} title="Sem aura" aria-label="Sem aura" role="img" />
                            )}
                            <select
                              aria-label={`Aura de ${product.title}`}
                              value={product.auraColor || 'inherit'}
                              onChange={(e) => onSave({ ...product, auraColor: e.target.value })}
                              className="bg-white text-xs font-medium px-2 py-1.5 rounded outline-none border border-gray-200 focus:border-blue-500 cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors w-32"
                            >
                              {optionsFor(auraLib, product.auraColor || 'inherit').map(aura => (
                                <option key={aura.id} value={aura.id}>{aura.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>}

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
                            <button onClick={() => handleDuplicate(product)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Duplicar (cria uma cópia inativa)" aria-label={`Duplicar ${product.title}`}><Copy className="w-4 h-4" /></button>
                            <button onClick={() => { setEditingProduct(product); setIsFormOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Editar" aria-label={`Editar ${product.title}`}><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(product)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="Excluir" aria-label={`Excluir ${product.title}`}><Trash2 className="w-4 h-4" /></button>
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
