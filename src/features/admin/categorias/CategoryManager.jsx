import { useState } from 'react';
import { Plus, Edit2, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useUI } from '../../../components/UIContext';
import { optionsFor, auraDot, auraLabel } from '../../../lib/auras';
import { useSettings } from '../../../components/SettingsContext';

export default function CategoryManager({ categories, onSave, onDelete, onReorder }) {
  const { confirm } = useUI();
  const { auraLib, aurasEnabled } = useSettings();
  const [editingCategory, setEditingCategory] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDelete = async (category) => {
    const ok = await confirm({ title: 'Excluir categoria', message: `Excluir “${category.name}”? Os produtos continuam existindo.` });
    if (ok) onDelete(category.id);
  };

  // A ordem desta lista é a ordem do menu de categorias na vitrine
  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map(c => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onReorder(ids);
  };

  return (
    <div>
      {isFormOpen ? (
        <CategoryForm initialData={editingCategory} onSave={async (data) => { const ok = await onSave(data); if (ok) setIsFormOpen(false); }} onCancel={() => setIsFormOpen(false)} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Categorias ({categories.length})</h2>
            <button onClick={() => { setEditingCategory(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-sm font-medium">
              <Plus className="w-4 h-4" /> Nova Categoria
            </button>
          </div>
          <p className="text-xs text-gray-500 -mt-3 mb-4">A ordem desta lista é a ordem do menu de categorias na vitrine. Categoria nova entra no fim.</p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="pl-4 pr-0 py-4 w-12"><span className="sr-only">Ordem</span></th>
                  <th className="px-6 py-4">Nome</th>
                  {aurasEnabled && <th className="px-6 py-4">Aura Padrão</th>}
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {categories.length === 0 ? (
                  <tr><td colSpan={aurasEnabled ? 5 : 4} className="px-6 py-12 text-center text-sm text-gray-500">Nenhuma categoria cadastrada até o momento.</td></tr>
                ) : (
                  categories.map((category, index) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="pl-4 pr-0 py-2">
                        <div className="flex flex-col">
                          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${category.name}`} title="Subir" className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-gray-400"><ArrowUp className="w-4 h-4" /></button>
                          <button type="button" onClick={() => move(index, 1)} disabled={index === categories.length - 1} aria-label={`Descer ${category.name}`} title="Descer" className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-gray-400"><ArrowDown className="w-4 h-4" /></button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                      {aurasEnabled && <td className="px-6 py-4">
                        {category.auraColor && category.auraColor !== 'none' ? (
                          <span
                            role="img" title={auraLabel(category.auraColor, auraLib)} aria-label={`Aura: ${auraLabel(category.auraColor, auraLib)}`}
                            {...auraDot(category.auraColor, auraLib, 20)}
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">Nenhuma</span>
                        )}
                      </td>}
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[300px]">{category.description}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setEditingCategory(category); setIsFormOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Editar" aria-label={`Editar ${category.name}`}><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(category)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="Excluir" aria-label={`Excluir ${category.name}`}><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryForm({ initialData, onSave, onCancel }) {
  const { auraLib, aurasEnabled } = useSettings();
  const [formData, setFormData] = useState({ 
    id: initialData?.id || null, 
    name: initialData?.name || '', 
    description: initialData?.description || '',
    auraColor: initialData?.auraColor || 'none'
  });

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between bg-gray-50/50 rounded-t-lg">
        <h2 className="text-lg font-medium text-gray-900">{initialData ? 'Editar Categoria' : 'Nova Categoria'}</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-md"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="cat-nome" className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input id="cat-nome" required type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>

        {aurasEnabled && <div>
          <label htmlFor="cat-aura" className="block text-sm font-medium text-gray-700 mb-1">Efeito de Aura para os Produtos desta Categoria</label>
          <select id="cat-aura" 
            value={formData.auraColor} 
            onChange={e => setFormData(p => ({...p, auraColor: e.target.value}))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {/* Remove 'inherit' pois Categorias não herdam de nada */}
            {optionsFor(auraLib, formData.auraColor).filter(a => a.id !== 'inherit').map(aura => (
              <option key={aura.id} value={aura.id}>{aura.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Todos os produtos desta categoria ganharão o brilho selecionado na vitrine.</p>
        </div>}

        <div>
          <label htmlFor="cat-desc" className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
          <textarea id="cat-desc" required rows={3} value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Salvar Alterações</button>
        </div>
      </form>
    </div>
  );
}
