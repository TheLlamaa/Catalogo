import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useUI } from '../components/UIContext';
import { auraProps, customKey, MAX_CUSTOM_AURAS } from '../lib/auras';

const MAX_COLORS = 6;
const START_COLORS = ['#f97316', '#ec4899'];

// Caixinha com o efeito aplicado (usada na lista e na prévia)
function AuraSample({ colors, strong, className = '', autoHeight = false, children }) {
  const { className: cls, style } = auraProps('custom-x', [{ id: 'x', name: '', colors, strong }]);
  return <div className={`aura ${cls} ${className}`} style={autoHeight ? { ...style, height: 'auto' } : style}>{children}</div>;
}

function AuraForm({ initial, onSave, onCancel }) {
  const { toast } = useUI();
  const [name, setName] = useState(initial?.name || '');
  const [colors, setColors] = useState(initial?.colors || START_COLORS);
  const [strong, setStrong] = useState(!!initial?.strong);

  const setColor = (i, v) => setColors(cs => cs.map((c, j) => (j === i ? v : c)));

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Dê um nome para a aura.');
    onSave({ id: initial?.id || Math.random().toString(36).slice(2, 8), name: name.trim(), colors, strong });
  };

  return (
    <form onSubmit={submit} className="border border-gray-200 rounded-lg p-6 bg-gray-50/50 mb-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-medium text-gray-900">{initial ? 'Editar aura' : 'Nova aura'}</h3>
        <button type="button" onClick={onCancel} aria-label="Fechar" className="text-gray-400 hover:text-gray-600 p-1 rounded-md"><X className="w-5 h-5" /></button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="space-y-5">
          <div>
            <label htmlFor="a-nome" className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input id="a-nome" required maxLength={30} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pôr do sol" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Cores ({colors.length} de {MAX_COLORS})</span>
            <p className="text-xs text-gray-500 mb-3">A luz gira passando por todas as cores, na ordem. Use de 2 a {MAX_COLORS}.</p>
            <div className="flex flex-wrap gap-3">
              {colors.map((c, i) => (
                <div key={i} className="relative">
                  <input type="color" aria-label={`Cor ${i + 1}`} value={c} onChange={e => setColor(i, e.target.value)} className="w-12 h-12 p-0.5 border border-gray-300 rounded-md bg-white cursor-pointer" />
                  {colors.length > 2 && (
                    <button type="button" aria-label={`Remover cor ${i + 1}`} onClick={() => setColors(cs => cs.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-red-600 flex items-center justify-center"><X className="w-3 h-3" /></button>
                  )}
                </div>
              ))}
              {colors.length < MAX_COLORS && (
                <button type="button" onClick={() => setColors(cs => [...cs, '#3b82f6'])} aria-label="Adicionar cor" className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:bg-white flex items-center justify-center"><Plus className="w-5 h-5" /></button>
              )}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={strong} onChange={e => setStrong(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
            <span className="text-sm font-medium text-gray-700">Brilho forte (mais luz ao redor)</span>
          </label>
        </div>

        <div className="flex items-center justify-center py-4" aria-label="Prévia da aura">
          <AuraSample colors={colors} strong={strong} autoHeight className="w-40">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="h-16 rounded-md bg-gray-100 mb-3" />
              <p className="text-sm font-semibold text-gray-900 truncate">{name || 'Prévia'}</p>
              <p className="text-xs text-gray-500">R$ 50,00</p>
            </div>
          </AuraSample>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-white">Cancelar</button>
        <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Salvar aura</button>
      </div>
    </form>
  );
}

export default function AuraManager({ auras, products, categories, onSave }) {
  const { confirm } = useUI();
  const [editing, setEditing] = useState(null); // null = fechado, {} = nova, aura = editar
  const [saving, setSaving] = useState(false);

  const usage = (a) => {
    const key = customKey(a.id);
    return products.filter(p => p.auraColor === key).length + categories.filter(c => c.auraColor === key).length;
  };

  const persist = async (next) => {
    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);
    return ok;
  };

  const handleSave = async (aura) => {
    const exists = auras.some(a => a.id === aura.id);
    const ok = await persist(exists ? auras.map(a => (a.id === aura.id ? aura : a)) : [...auras, aura]);
    if (ok) setEditing(null);
  };

  const handleDelete = async (a) => {
    const n = usage(a);
    const ok = await confirm({
      title: 'Excluir aura',
      message: n > 0 ? `“${a.name}” está em ${n} produto(s)/categoria(s), que ficarão sem brilho. Excluir mesmo assim?` : `Excluir a aura “${a.name}”?`
    });
    if (ok) persist(auras.filter(x => x.id !== a.id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Auras personalizadas ({auras.length})</h2>
        {!editing && auras.length < MAX_CUSTOM_AURAS && (
          <button onClick={() => setEditing({})} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
            <Plus className="w-4 h-4" /> Nova aura
          </button>
        )}
      </div>

      {editing && <AuraForm key={editing.id || 'nova'} initial={editing.id ? editing : null} onSave={handleSave} onCancel={() => setEditing(null)} />}

      {auras.length === 0 && !editing ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-10 text-center">
          Nenhuma aura personalizada ainda. Crie uma e ela aparece junto das outras ao escolher a aura de um produto ou categoria.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auras.map(a => (
            <AuraSample key={a.id} colors={a.colors} strong={a.strong}>
              <div className="bg-white rounded-xl p-4 h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Em uso: {usage(a)}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(a)} disabled={saving} title="Editar" aria-label={`Editar ${a.name}`} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(a)} disabled={saving} title="Excluir" aria-label={`Excluir ${a.name}`} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {a.colors.map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-gray-200" style={{ background: c }} />)}
                </div>
              </div>
            </AuraSample>
          ))}
        </div>
      )}
    </div>
  );
}
