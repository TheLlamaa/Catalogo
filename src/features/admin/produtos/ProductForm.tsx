import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Switch, Button, inputClass } from '../../../components/ui';
import ProductImage from '../../vitrine/ProductImage';
import { useUI } from '../../../components/UIContext';
import { uploadProductImage } from '../../../services/storage';
import { optionsFor } from '../../../lib/auras';
import { useSettings } from '../../../components/SettingsContext';
import { isHttpUrl } from '../../../lib/format';
import type { Category, Product, ProductOption, StoredProduct } from '../../../types';
import { friendlyError } from '../../../lib/errorMessage';

const MAX_OPTION_GROUPS = 4;
const MAX_OPTION_VALUES = 12;
const BADGE_SUGGESTIONS = ['Novo', 'Sob encomenda', 'Últimas unidades', 'Promoção'];
const LEAD_TIME_SUGGESTIONS = ['Pronta entrega', 'Sob encomenda: 2 a 3 dias', 'Sob encomenda: 5 a 7 dias', 'Sob encomenda: 10 a 15 dias'];

interface ProductFormProps {
  initialData: Product | null;
  categories: Category[];
  onSave: (product: Partial<StoredProduct>) => Promise<unknown>;
  onCancel: () => void;
  onOpenSettings?: (group: string) => void;
}

// Bloco do formulário com título e explicação curta (agrupa campos que andam juntos)
function Group({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </fieldset>
  );
}

const SECTION_CHOICES = [
  { value: '', label: 'Só na lista geral', hint: 'Aparece em “Todos os modelos”.' },
  { value: 'destaque', label: 'Destaques', hint: 'Também no topo, na seção de destaques.' },
  { value: 'popular', label: 'Mais pedidos', hint: 'Também no topo, na seção de mais pedidos.' },
];

// Estado do formulário: preço e estoque ficam como texto (campos numéricos), opções com valores separados por vírgula
interface ProductFormState {
  id: string | undefined;
  title: string;
  description: string;
  price: string;
  stock: string;
  categoryIds: string[];
  imageUrls: string[];
  active: boolean;
  auraColor: string;
  leadTime: string;
  badge: string;
  section: string;
  modelUrl: string;
  options: { name: string; values: string }[];
}


export default function ProductForm({ initialData, categories, onSave, onCancel, onOpenSettings }: ProductFormProps) {
  const { toast } = useUI();
  const settings = useSettings();
  const { auraLib, stockControl, leadTimeEnabled, aurasEnabled, modelLinkEnabled } = settings;

  // Categoria "Geral": usada quando nenhuma outra é escolhida
  const geralCat = categories.find(c => c.name.toLowerCase() === 'geral');
  const geralId = geralCat ? geralCat.id : null;
  const initialCategoryIds = initialData?.categoryIds ?? [];
  const defaultCategoryIds = initialCategoryIds.length > 0 ? initialCategoryIds : (geralId ? [geralId] : []);

  const [formData, setFormData] = useState<ProductFormState>({
    id: initialData?.id || undefined,
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price ? String(initialData.price) : '',
    stock: String(initialData?.stock ?? 1),
    categoryIds: defaultCategoryIds,
    imageUrls: initialData?.imageUrls?.length ? initialData.imageUrls : [],
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

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    setIsUploading(true);
    const newImages: string[] = [];
    for (const file of files) {
      try {
        newImages.push(await uploadProductImage(file));
      } catch (err) {
        console.error(err);
        toast.error(`A foto não foi enviada. ${friendlyError(err)}`);
      }
    }
    setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newImages] }));
    setIsUploading(false);
  };

  const moveImage = (idx: number, direction: number) => {
    setFormData(prev => {
      const target = idx + direction;
      if (target < 0 || target >= prev.imageUrls.length) return prev;
      const next = [...prev.imageUrls];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, imageUrls: next };
    });
  };

  const handleCategoryToggle = (catId: string) => {
    setFormData(prev => {
      let newCats = [...prev.categoryIds];
      if (newCats.includes(catId)) {
        newCats = newCats.filter(id => id !== catId);
        if (newCats.length === 0 && geralId) newCats = [geralId]; // sem categoria: volta para "Geral"
      } else if (catId === geralId) {
        newCats = [catId]; // marcar "Geral" remove as outras
      } else {
        newCats = newCats.filter(id => id !== geralId);
        newCats.push(catId);
      }
      return { ...prev, categoryIds: newCats };
    });
  };

  const updateOption = (idx: number, patch: Partial<ProductFormState['options'][number]>) => setFormData(prev => ({
    ...prev, options: prev.options.map((o, i) => (i === idx ? { ...o, ...patch } : o))
  }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const options: ProductOption[] = [];
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

  const inputCls = inputClass;
  const sectionOff = (formData.section === 'destaque' && !settings.showFeatured) || (formData.section === 'popular' && !settings.showPopular);
  const isNew = !initialData;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 py-2 -my-1 mb-0">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar para a lista
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{isNew ? 'Novo produto' : 'Editar produto'}</h1>
        </div>
        <Switch
          id="active" checked={formData.active} onChange={v => setFormData(p => ({ ...p, active: v }))}
          label="Mostrar na vitrine" onText="Visível" offText="Oculto"
          className="sm:bg-gray-50 sm:border sm:border-gray-200 sm:rounded-lg sm:px-3 sm:py-2"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Group title="Informações principais">
          <div>
            <label htmlFor="p-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input id="p-titulo" required type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:w-1/2">
            <label htmlFor="p-preco" className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
            <input id="p-preco" required type="number" inputMode="decimal" step="0.01" min="0" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label htmlFor="p-desc" className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <textarea id="p-desc" required rows={4} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className={inputCls} />
          </div>
        </Group>

        <Group title={`Fotos (${formData.imageUrls.length})`} hint="A primeira foto é a capa do card. Passe o mouse (ou toque) na foto para mudar a ordem ou remover.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {formData.imageUrls.map((url, idx) => (
              <div key={url} className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden group">
                <ProductImage thumb src={url} alt="" className="w-full h-full object-cover" />
                {idx === 0 && <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">CAPA</span>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-black/20 flex items-end sm:items-center justify-center gap-1 p-2 transition-opacity">
                  <button type="button" disabled={idx === 0} onClick={() => moveImage(idx, -1)} aria-label="Mover para a esquerda" className="p-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button type="button" onClick={() => setFormData(p => ({ ...p, imageUrls: p.imageUrls.filter((_, i) => i !== idx) }))} aria-label="Remover foto" className="p-2 bg-white text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  <button type="button" disabled={idx === formData.imageUrls.length - 1} onClick={() => moveImage(idx, 1)} aria-label="Mover para a direita" className="p-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <label className={`flex flex-col items-center justify-center aspect-square border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {isUploading ? <><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div><span className="text-xs mt-2 text-gray-500">Enviando…</span></> : <><Plus className="w-6 h-6 text-gray-500 mb-2" /><span className="text-xs font-medium">Adicionar foto</span></>}
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="sr-only" />
            </label>
          </div>
        </Group>

        <Group title="Onde aparece na vitrine" hint="Categoria, destaque e o selo que aparece por cima da foto.">
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Categorias * <span className="text-gray-500 font-normal">(uma ou mais)</span></span>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => {
                const on = formData.categoryIds.includes(c.id);
                return (
                  <label key={c.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none transition-colors ${on ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={on} onChange={() => handleCategoryToggle(c.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    {c.name}
                  </label>
                );
              })}
              {categories.length === 0 && <p className="text-sm text-gray-500">Nenhuma categoria cadastrada ainda. Crie em Catálogo › Categorias.</p>}
            </div>
          </div>

          <div role="radiogroup" aria-labelledby="p-secao-label">
            <span id="p-secao-label" className="block text-sm font-medium text-gray-700 mb-2">Seção na vitrine</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SECTION_CHOICES.map(opt => {
                const on = formData.section === opt.value;
                return (
                  <label key={opt.value || 'nenhuma'} aria-label={opt.label} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${on ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="p-secao" value={opt.value} checked={on} onChange={() => setFormData(p => ({ ...p, section: opt.value }))} className="mt-0.5 text-blue-600 focus:ring-blue-500" />
                    <span><span className="block text-sm font-medium text-gray-900">{opt.label}</span><span className={`block text-xs ${on ? 'text-gray-700' : 'text-gray-500'}`}>{opt.hint}</span></span>
                  </label>
                );
              })}
            </div>
            {sectionOff && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-800">
                <Info className="w-3.5 h-3.5" aria-hidden="true" /> Essa seção está desligada na Página inicial: o produto fica só na lista geral até você ligá-la.
                {onOpenSettings && <button type="button" onClick={() => onOpenSettings('inicio')} className="font-semibold underline">Abrir Página inicial</button>}
              </p>
            )}
          </div>

          <div className="sm:w-1/2">
            <label htmlFor="p-selo" className="block text-sm font-medium text-gray-700 mb-1">Selo no card <span className="text-gray-500 font-normal">(opcional)</span></label>
            <input
              id="p-selo" type="text" list="selos" maxLength={20} placeholder="Ex: Novo, Promoção"
              value={formData.badge} onChange={e => setFormData(p => ({ ...p, badge: e.target.value }))} className={inputCls}
            />
            <datalist id="selos">{BADGE_SUGGESTIONS.map(s => <option key={s} value={s}>{s}</option>)}</datalist>
            <p className="text-xs text-gray-500 mt-1">Etiqueta curta sobre a foto. Não muda a posição do produto.</p>
          </div>
        </Group>

        <Group title="Opções para o cliente escolher" hint="Ex: Cor → Branco, Preto, Azul. O cliente escolhe antes de adicionar ao orçamento.">
          {formData.options.length > 0 && (
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
                  <button type="button" onClick={() => setFormData(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))} aria-label="Remover opção" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md self-start sm:self-auto"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          {formData.options.length < MAX_OPTION_GROUPS && (
            <button type="button" onClick={() => setFormData(p => ({ ...p, options: [...p.options, { name: '', values: '' }] }))} className="text-sm font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1 py-2 -my-2">
              <Plus className="w-4 h-4" /> Adicionar opção
            </button>
          )}
        </Group>

        {(stockControl || leadTimeEnabled) && (
          <Group title="Estoque e produção">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {stockControl && (
                <div>
                  <label htmlFor="p-estoque" className="block text-sm font-medium text-gray-700 mb-1">Quantidade em Estoque *</label>
                  <input id="p-estoque" required type="number" inputMode="numeric" min="0" step="1" value={formData.stock} onChange={e => setFormData(p => ({ ...p, stock: e.target.value }))} className={inputCls} />
                  <p className="text-xs text-gray-500 mt-1">Com 0, o card mostra “Esgotado” e não dá para pedir.</p>
                </div>
              )}
              {leadTimeEnabled && (
                <div className={stockControl ? '' : 'sm:col-span-2'}>
                  <label htmlFor="p-prazo" className="block text-sm font-medium text-gray-700 mb-1">Prazo de produção <span className="text-gray-500 font-normal">(opcional)</span></label>
                  <input
                    id="p-prazo" type="text" list="prazos" maxLength={80} placeholder="Ex: Pronta entrega, ou Sob encomenda: 3 a 5 dias"
                    value={formData.leadTime} onChange={e => setFormData(p => ({ ...p, leadTime: e.target.value }))} className={inputCls}
                  />
                  <datalist id="prazos">{LEAD_TIME_SUGGESTIONS.map(s => <option key={s} value={s}>{s}</option>)}</datalist>
                </div>
              )}
            </div>
          </Group>
        )}

        {(modelLinkEnabled || aurasEnabled) && (
          <Group title="Extras" hint={modelLinkEnabled ? 'O link do modelo é só seu: não aparece no site.' : undefined}>
            {modelLinkEnabled && (
              <div>
                <label htmlFor="p-modelo" className="block text-sm font-medium text-gray-700 mb-1">Link do modelo 3D <span className="text-gray-500 font-normal">(opcional · só você vê, não aparece no site)</span></label>
                <input
                  id="p-modelo" type="url" maxLength={500} placeholder="https://makerworld.com/… ou link do Drive/Thingiverse"
                  value={formData.modelUrl} onChange={e => setFormData(p => ({ ...p, modelUrl: e.target.value }))} className={inputCls}
                />
              </div>
            )}
            {aurasEnabled && (
              <div>
                <label htmlFor="p-aura" className="block text-sm font-medium text-gray-700 mb-1">Efeito aura próprio <span className="text-gray-500 font-normal">(sobrescreve a aura da categoria)</span></label>
                <select id="p-aura" value={formData.auraColor} onChange={e => setFormData(p => ({ ...p, auraColor: e.target.value }))} className={`${inputCls} bg-white`}>
                  {optionsFor(auraLib, formData.auraColor).map(aura => <option key={aura.id} value={aura.id}>{aura.name}</option>)}
                </select>
              </div>
            )}
          </Group>
        )}

        <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-white/95 backdrop-blur border-t border-gray-200 flex items-center justify-between gap-3">
          <span className={`text-xs font-medium ${formData.active ? 'text-green-700' : 'text-gray-500'}`}>{formData.active ? 'Vai aparecer na vitrine' : 'Fica oculto da vitrine'}</span>
          <div className="flex gap-3">
            <Button onClick={onCancel}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving || isUploading}>
              {saving ? 'Salvando…' : isNew ? 'Criar produto' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
