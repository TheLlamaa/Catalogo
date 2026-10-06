import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft, ArrowUp, ArrowDown, Tags } from 'lucide-react';
import { Button, EmptyState, PageHeader, inputClass } from '../../../components/ui';
import { useUI } from '../../../components/UIContext';
import { optionsFor, auraDot, auraLabel } from '../../../lib/auras';
import { useSettings } from '../../../components/SettingsContext';
import type { Category, Product } from '../../../types';

// Dados enviados ao salvar uma categoria (nome é obrigatório)
type CategoryDraft = Partial<Category> & { name: string };

interface CategoryManagerProps {
  categories: Category[];
  products: Product[];
  onShowProducts?: (categoryId: string) => void;
  onSave: (category: CategoryDraft) => Promise<boolean>;
  onDelete: (id: string) => unknown;
  onReorder: (orderedIds: string[]) => unknown;
}

interface CategoryFormProps {
  initialData: Category | null;
  onSave: (category: CategoryDraft) => unknown;
  onCancel: () => void;
}

export default function CategoryManager({ categories, products, onShowProducts, onSave, onDelete, onReorder }: CategoryManagerProps) {
  const { confirm } = useUI();
  const { auraLib, aurasEnabled } = useSettings();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const productCount = (id: string) => products.filter(p => p.categoryIds?.includes(id)).length;
  const handleNew = () => { setEditingCategory(null); setIsFormOpen(true); };

  const handleDelete = async (category: Category) => {
    const n = productCount(category.id);
    const ok = await confirm({ title: 'Excluir categoria?', message: `“${category.name}” sai do menu da vitrine. ${n ? `Os ${n} produto(s) dela continuam existindo, só deixam de estar nesta categoria.` : 'Ela não tem produtos.'}`, confirmLabel: 'Excluir categoria' });
    if (ok) onDelete(category.id);
  };

  // A ordem desta lista é a ordem do menu de categorias na vitrine
  const move = (index: number, direction: number) => {
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
          <PageHeader
            title="Categorias"
            description="Organizam o menu da vitrine. A ordem desta lista é a ordem do menu; categoria nova entra no fim."
            actions={<Button variant="primary" icon={Plus} onClick={handleNew}>Nova categoria</Button>}
          />
          {categories.length === 0 ? (
            <EmptyState
              icon={Tags} title="Nenhuma categoria ainda"
              text="Categorias aparecem no menu lateral da vitrine e ajudam o cliente a achar o que procura (ex: Vasos, Chaveiros, Decoração)."
              action={<Button variant="primary" icon={Plus} onClick={handleNew}>Criar primeira categoria</Button>}
            />
          ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="pl-4 pr-0 py-4 w-12"><span className="sr-only">Ordem</span></th>
                  <th className="px-3 sm:px-6 py-4">Nome</th>
                  <th className="px-3 sm:px-4 py-4">Produtos</th>
                  {aurasEnabled && <th className="px-6 py-4 hidden sm:table-cell">Aura padrão</th>}
                  <th className="px-6 py-4 hidden lg:table-cell">Descrição</th>
                  <th className="px-3 sm:px-6 py-4 text-right"><span className="sr-only sm:not-sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {categories.map((category, index) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="pl-4 pr-0 py-2">
                        <div className="flex flex-col">
                          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${category.name}`} title="Subir" className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-gray-500"><ArrowUp className="w-4 h-4" /></button>
                          <button type="button" onClick={() => move(index, 1)} disabled={index === categories.length - 1} aria-label={`Descer ${category.name}`} title="Descer" className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-gray-500"><ArrowDown className="w-4 h-4" /></button>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                      <td className="px-3 sm:px-4 py-4 text-sm whitespace-nowrap">
                        {productCount(category.id) > 0 && onShowProducts
                          ? <button type="button" onClick={() => onShowProducts(category.id)} className="text-blue-700 underline font-medium py-2 -my-2">{productCount(category.id)} produto(s)<span className="sr-only"> de {category.name}</span></button>
                          : <span className="text-gray-500">Nenhum</span>}
                      </td>
                      {aurasEnabled && <td className="px-6 py-4 hidden sm:table-cell">
                        {category.auraColor && category.auraColor !== 'none' ? (
                          <span
                            role="img" title={auraLabel(category.auraColor, auraLib)} aria-label={`Aura: ${auraLabel(category.auraColor, auraLib)}`}
                            {...auraDot(category.auraColor, auraLib, 20)}
                          />
                        ) : (
                          <span className="text-gray-500 text-xs">Nenhuma</span>
                        )}
                      </td>}
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[300px] hidden lg:table-cell">{category.description || <span className="text-gray-300">—</span>}</td>
                      <td className="px-2 sm:px-6 py-4 text-right whitespace-nowrap">
                        <button onClick={() => { setEditingCategory(category); setIsFormOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Editar" aria-label={`Editar ${category.name}`}><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(category)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="Excluir" aria-label={`Excluir ${category.name}`}><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryForm({ initialData, onSave, onCancel }: CategoryFormProps) {
  const { auraLib, aurasEnabled } = useSettings();
  const [formData, setFormData] = useState<CategoryDraft>({ 
    id: initialData?.id || undefined, 
    name: initialData?.name || '', 
    description: initialData?.description || '',
    auraColor: initialData?.auraColor || 'none'
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSave(formData); };

  return (
    <div>
      <div className="mb-6">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 py-2 -my-1 mb-0">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar para a lista
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{initialData ? 'Editar categoria' : 'Nova categoria'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div>
          <label htmlFor="cat-nome" className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input id="cat-nome" required type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className={inputClass} />
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
          <p className="text-xs text-gray-500 mt-1">Todos os produtos da categoria ganham este brilho na vitrine.</p>
        </div>}

        <div>
          <label htmlFor="cat-desc" className="block text-sm font-medium text-gray-700 mb-1">Descrição <span className="text-gray-500 font-normal">(opcional)</span></label>
          <p className="text-xs text-gray-500 mb-2">Aparece embaixo do título quando o cliente abre esta categoria na vitrine.</p>
          <textarea id="cat-desc" rows={3} value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} className={inputClass} />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="primary">{initialData ? 'Salvar alterações' : 'Criar categoria'}</Button>
        </div>
      </form>
    </div>
  );
}
