import { useState } from 'react';
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import { useUI } from '../components/UIContext';
import { uploadProductImage } from '../lib/supabase';
import { optionsFor } from '../lib/auras';
import { useSettings } from '../components/SettingsContext';
import { isHttpUrl } from '../lib/format';

const MAX_OPTION_GROUPS = 4;
const MAX_OPTION_VALUES = 12;
const BADGE_SUGGESTIONS = ['Novo', 'Sob encomenda', 'Últimas unidades', 'Promoção'];
const LEAD_TIME_SUGGESTIONS = ['Pronta entrega', 'Sob encomenda: 2 a 3 dias', 'Sob encomenda: 5 a 7 dias', 'Sob encomenda: 10 a 15 dias'];

export default function ProductForm({ initialData, categories, onSave, onCancel }) {
  const { toast } = useUI();
  const { auraLib, stockControl, leadTimeEnabled, aurasEnabled, modelLinkEnabled } = useSettings();

  // Categoria "Geral": usada quando nenhuma outra é escolhida
  const geralCat = categories.find(c => c.name.toLowerCase() === 'geral');
  const geralId = geralCat ? geralCat.id : null;
  const defaultCategoryIds = initialData?.categoryIds?.length > 0 ? initialData.categoryIds : (geralId ? [geralId] : []);

  const [formData, setFormData] = useState({
    id: initialData?.id || null,
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price || '',
    stock: initialData?.stock ?? 1,
    categoryIds: defaultCategoryIds,
    imageUrls: initialData?.imageUrls?.length > 0 ? initialData.imageUrls : [],
    active: initialData?.active ?? true,
    auraColor: initialData?.auraColor || 'inherit',
    leadTime: initialData?.leadTime || '',
    badge: initialData?.badge || '',
    section: initialData?.section || '',
    modelUrl: initialData?.modelUrl || '',
    // Opções do produto: [{ name: 'Cor', values: 'Branco, Preto' }] (valores como texto separado por vírgula)
    options: (initialData?.options || []).map(o => ({ name: o.name, values: (o.values || []).join(', ') }))
  });

  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    setIsUploading(true);
    const newImages = [];
    for (const file of files) {
      try {
        newImages.push(await uploadProductImage(file));
      } catch (err) {
        console.error(err);
        toast.error(`Erro ao enviar imagem: ${err.message || err}`);
      }
    }
    setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newImages] }));
    setIsUploading(false);
  };

  const moveImage = (idx, direction) => {
    setFormData(prev => {
      const target = idx + direction;
      if (target < 0 || target >= prev.imageUrls.length) return prev;
      const next = [...prev.imageUrls];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, imageUrls: next };
    });
  };

  const handleCategoryToggle = (catId) => {
    setFormData(prev => {
      let newCats = [...prev.categoryIds];
      if (newCats.includes(catId)) {
        newCats = newCats.filter(id => id !== catId);
        if (newCats.length === 0 && geralId) newCats = [geralId]; // sem categoria: volta para "Geral"
      } else if (catId === geralId) {
        newCats = [geralId]; // marcar "Geral" remove as outras
      } else {
        newCats = newCats.filter(id => id !== geralId);
        newCats.push(catId);
      }
      return { ...prev, categoryIds: newCats };
    });
  };

  const updateOption = (idx, patch) => setFormData(prev => ({
    ...prev, options: prev.options.map((o, i) => (i === idx ? { ...o, ...patch } : o))
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const options = [];
    for (const o of formData.options) {
      const name = o.name.trim();
      const values = [...new Set(o.values.split(',').map(v => v.trim()).filter(Boolean))].slice(0, MAX_OPTION_VALUES);
      if (!name && values.length === 0) continue; // linha vazia: ignora
      if (!name || values.length === 0) return toast.error('Cada opção precisa de um nome e de ao menos um valor (ex: Cor → Branco, Preto).');
      options.push({ name, values });
    }

    const modelUrl = formData.modelUrl.trim();
    if (modelUrl && !isHttpUrl(modelUrl)) return toast.error('O link do modelo precisa começar com http:// ou https://');

    setSaving(true);
    await onSave({
      ...formData,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock, 10) || 0,
      leadTime: formData.leadTime.trim(),
      badge: formData.badge.trim(),
      modelUrl,
      options
    });
    setSaving(false);
  };

  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500';

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between bg-gray-50/50 rounded-t-lg">
        <h2 className="text-lg font-medium text-gray-900">{initialData ? 'Editar Produto' : 'Novo Produto'}</h2>
        <button onClick={onCancel} aria-label="Fechar formulário" className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-md"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        <div>
          <span className="block text-sm font-semibold text-gray-900 mb-1">Fotos ({formData.imageUrls.length})</span>
          <p className="text-xs text-gray-500 mb-3">A primeira foto é a capa. Use as setas para mudar a ordem.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {formData.imageUrls.map((url, idx) => (
              <div key={url} className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden group">
                <ProductImage thumb src={url} alt="" className="w-full h-full object-cover" />
                {idx === 0 && <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">CAPA</span>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                  <button type="button" disabled={idx === 0} onClick={() => moveImage(idx, -1)} aria-label="Mover para a esquerda" className="p-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button type="button" onClick={() => setFormData(p => ({ ...p, imageUrls: p.imageUrls.filter((_, i) => i !== idx) }))} aria-label="Remover foto" className="p-2 bg-white text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  <button type="button" disabled={idx === formData.imageUrls.length - 1} onClick={() => moveImage(idx, 1)} aria-label="Mover para a direita" className="p-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <label className={`flex flex-col items-center justify-center aspect-square border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {isUploading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <><Plus className="w-6 h-6 text-gray-400 mb-2" /><span className="text-xs font-medium">Adicionar foto</span></>}
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="sr-only" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="p-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input id="p-titulo" required type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label htmlFor="p-preco" className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
            <input id="p-preco" required type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} className={inputCls} />
          </div>
          {stockControl && (
            <div>
              <label htmlFor="p-estoque" className="block text-sm font-medium text-gray-700 mb-1">Quantidade em Estoque *</label>
              <input id="p-estoque" required type="number" min="0" step="1" value={formData.stock} onChange={e => setFormData(p => ({ ...p, stock: e.target.value }))} className={inputCls} />
            </div>
          )}

          {leadTimeEnabled && (
          <div className="sm:col-span-2">
            <label htmlFor="p-prazo" className="block text-sm font-medium text-gray-700 mb-1">Prazo de produção <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              id="p-prazo" type="text" list="prazos" maxLength={80} placeholder="Ex: Pronta entrega, ou Sob encomenda: 3 a 5 dias"
              value={formData.leadTime} onChange={e => setFormData(p => ({ ...p, leadTime: e.target.value }))} className={inputCls}
            />
            <datalist id="prazos">{LEAD_TIME_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          )}

          <div>
            <label htmlFor="p-selo" className="block text-sm font-medium text-gray-700 mb-1">Selo no card <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              id="p-selo" type="text" list="selos" maxLength={20} placeholder="Ex: Novo, Promoção"
              value={formData.badge} onChange={e => setFormData(p => ({ ...p, badge: e.target.value }))} className={inputCls}
            />
            <datalist id="selos">{BADGE_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label htmlFor="p-secao" className="block text-sm font-medium text-gray-700 mb-1">Seção na vitrine <span className="text-gray-400 font-normal">(opcional)</span></label>
            <select id="p-secao" value={formData.section} onChange={e => setFormData(p => ({ ...p, section: e.target.value }))} className={`${inputCls} bg-white`}>
              <option value="">Nenhuma (só na lista geral)</option>
              <option value="destaque">Destaques</option>
              <option value="popular">Mais pedidos</option>
            </select>
          </div>

          {modelLinkEnabled && (
          <div className="sm:col-span-2">
            <label htmlFor="p-modelo" className="block text-sm font-medium text-gray-700 mb-1">Link do modelo 3D <span className="text-gray-400 font-normal">(opcional · só você vê, não aparece no site)</span></label>
            <input
              id="p-modelo" type="url" maxLength={500} placeholder="https://makerworld.com/… ou link do Drive/Thingiverse"
              value={formData.modelUrl} onChange={e => setFormData(p => ({ ...p, modelUrl: e.target.value }))} className={inputCls}
            />
          </div>
          )}

          <div className="sm:col-span-2">
            <span className="block text-sm font-medium text-gray-700 mb-1">Opções para o cliente escolher <span className="text-gray-400 font-normal">(opcional)</span></span>
            <p className="text-xs text-gray-500 mb-3">Ex: nome “Cor” com valores “Branco, Preto, Azul”. O cliente escolhe antes de adicionar ao orçamento.</p>
            <div className="space-y-3">
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="text" aria-label="Nome da opção" placeholder="Nome (ex: Cor)" maxLength={30}
                    value={opt.name} onChange={e => updateOption(idx, { name: e.target.value })}
                    className="sm:w-40 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text" aria-label="Valores da opção" placeholder="Valores separados por vírgula (ex: Branco, Preto)"
                    value={opt.values} onChange={e => updateOption(idx, { values: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setFormData(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))} aria-label="Remover opção" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md self-start sm:self-auto"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            {formData.options.length < MAX_OPTION_GROUPS && (
              <button type="button" onClick={() => setFormData(p => ({ ...p, options: [...p.options, { name: '', values: '' }] }))} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Adicionar opção
              </button>
            )}
          </div>

          {aurasEnabled && (
          <div className="sm:col-span-2">
            <label htmlFor="p-aura" className="block text-sm font-medium text-gray-700 mb-1">Efeito Aura Próprio (Sobrescreve a aura da categoria)</label>
            <select id="p-aura" value={formData.auraColor} onChange={e => setFormData(p => ({ ...p, auraColor: e.target.value }))} className={`${inputCls} bg-white`}>
              {optionsFor(auraLib, formData.auraColor).map(aura => <option key={aura.id} value={aura.id}>{aura.name}</option>)}
            </select>
          </div>
          )}

          <div className="sm:col-span-2">
            <span className="block text-sm font-medium text-gray-700 mb-2">Categorias * (selecione uma ou mais)</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-gray-200 rounded-md p-3 bg-gray-50/50 max-h-40 overflow-y-auto">
              {categories.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900 select-none">
                  <input
                    type="checkbox"
                    checked={formData.categoryIds.includes(c.id)}
                    onChange={() => handleCategoryToggle(c.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="p-desc" className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <textarea id="p-desc" required rows={4} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className={inputCls} />
          </div>

          <div className="sm:col-span-2 flex items-center gap-3 pt-2">
            <input
              type="checkbox" id="active" checked={formData.active}
              onChange={e => setFormData(p => ({ ...p, active: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
              Produto ativo (exibir na vitrine para os clientes)
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving || isUploading} className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
