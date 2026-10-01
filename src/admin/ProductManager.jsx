import { useState } from 'react';
import { Plus, Edit2, Trash2, Copy, Eye, EyeOff, Layers, Box, Image as ImageIcon } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import { useUI } from '../components/UIContext';
import ProductForm from './ProductForm';
import { optionsFor, auraProps } from '../lib/auras';
import { useSettings } from '../components/SettingsContext';
import { brl, isHttpUrl } from '../lib/format';

export default function ProductManager({ products, categories, onSave, onDelete }) {
  const { confirm } = useUI();
  const { auraLib } = useSettings();
  const [editingProduct, setEditingProduct] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddNew = () => { setEditingProduct(null); setIsFormOpen(true); };

  const handleDelete = async (product) => {
    const ok = await confirm({ title: 'Excluir produto', message: `Excluir “${product.title}”? Isso não pode ser desfeito.` });
    if (ok) onDelete(product.id);
  };

  // Cópia inativa (rascunho): o admin ajusta e ativa quando estiver pronta
  const handleDuplicate = (product) => onSave({ ...product, id: null, title: `${product.title} (cópia)`, active: false });

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

                    // Cor da aura atual, para mostrar o brilho do seletor
                    let displayAura = product.auraColor || 'inherit';
                    if (displayAura === 'inherit' && product.categoryIds?.length > 0) {
                      const matchedCategory = categories.find(c => product.categoryIds.includes(c.id) && c.auraColor && c.auraColor !== 'none');
                      if (matchedCategory) displayAura = matchedCategory.auraColor;
                    }

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 flex items-center gap-4">
                          <div className="h-10 w-10 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {displayImage ? <ProductImage thumb src={displayImage} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900 block">{product.title}</span>
                            <span className="text-xs text-gray-500 font-medium">{brl(product.price)}</span>
                            {isHttpUrl(product.modelUrl) && (
                              <a href={product.modelUrl} target="_blank" rel="noreferrer noopener" className="mt-0.5 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                                <Box className="w-3 h-3" /> Abrir modelo
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${product.stock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                            <Layers className="w-3 h-3" /> {product.stock} un.
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className={`inline-block ${displayAura !== 'none' && displayAura !== 'inherit' ? `aura ${auraProps(displayAura, auraLib).className}` : ''}`} style={displayAura !== 'none' && displayAura !== 'inherit' ? auraProps(displayAura, auraLib).style : undefined}>
                            <select
                              aria-label={`Aura de ${product.title}`}
                              value={product.auraColor || 'inherit'}
                              onChange={(e) => onSave({ ...product, auraColor: e.target.value })}
                              className="relative z-10 bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1.5 rounded outline-none border border-gray-200 focus:border-blue-500 cursor-pointer text-gray-700 shadow-sm hover:bg-gray-50 transition-colors w-32"
                            >
                              {optionsFor(auraLib, product.auraColor || "inherit").map(aura => (
                                <option key={aura.id} value={aura.id}>{aura.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>

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
