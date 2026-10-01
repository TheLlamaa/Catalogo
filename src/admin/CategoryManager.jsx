import { useState } from 'react';
import { Plus, Edit2, Trash2, Palette, X } from 'lucide-react';
import { useUI } from '../components/UIContext';
import { AURA_OPTIONS, AURA_CLASS_MAP } from '../lib/auras';

export default function CategoryManager({ categories, onSave, onDelete }) {
  const { confirm } = useUI();
  const [editingCategory, setEditingCategory] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDelete = async (category) => {
    const ok = await confirm({ title: 'Excluir categoria', message: `Excluir “${category.name}”? Os produtos continuam existindo.` });
    if (ok) onDelete(category.id);
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
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Aura Padrão</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {categories.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-sm text-gray-500">Nenhuma categoria cadastrada até o momento.</td></tr>
                ) : (
                  categories.map(category => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                      <td className="px-6 py-4">
                        {category.auraColor && category.auraColor !== 'none' ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold aura ${AURA_CLASS_MAP[category.auraColor]}`}>
                            <Palette className="w-3 h-3" /> {category.auraColor}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Nenhuma</span>
                        )}
                      </td>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input required type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Efeito de Aura para os Produtos desta Categoria</label>
          <select 
            value={formData.auraColor} 
            onChange={e => setFormData(p => ({...p, auraColor: e.target.value}))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {/* Remove 'inherit' pois Categorias não herdam de nada */}
            {AURA_OPTIONS.filter(a => a.id !== 'inherit').map(aura => (
              <option key={aura.id} value={aura.id}>{aura.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Todos os produtos desta categoria ganharão o brilho selecionado na vitrine.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
          <textarea required rows={3} value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Salvar Alterações</button>
        </div>
      </form>
    </div>
  );
}
