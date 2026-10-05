import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Plus, Edit2, Trash2, X, RotateCcw, Eye } from 'lucide-react';
import { useUI } from '../../../components/UIContext';
import { auraProps, customKey, builtinName, BUILTIN_COLORS, BUILTIN_STRONG, BUILTIN_IDS, MAX_CUSTOM_AURAS, MAX_AURA_COLORS } from '../../../lib/auras';
import type { AuraLib, AuraOverride, CustomAura } from '../../../lib/auras';
import type { Category, Product } from '../../../types';

const START_COLORS = ['#f97316', '#ec4899'];

// Dados de uma aura no formulário (sem o id)
interface AuraData { name: string; colors: string[]; strong: boolean }

// O que está sendo editado: aura personalizada (nova ou existente) ou aura do sistema
type Editing = { kind: 'custom'; aura?: CustomAura } | { kind: 'builtin'; id: string };

interface AuraSampleProps {
  auraKey?: string;
  lib?: AuraLib;
  colors?: string[];
  strong?: boolean;
  className?: string;
  autoHeight?: boolean;
  children?: ReactNode;
}

interface AuraFormProps {
  initial?: AuraData;
  title: string;
  onSave: (data: AuraData) => unknown;
  onCancel: () => void;
}

interface AuraManagerProps {
  lib: AuraLib;
  products: Product[];
  categories: Category[];
  onSave: (lib: AuraLib) => Promise<boolean>;
}

// Caixinha com o efeito aplicado. Com `auraKey` usa a aura (do sistema ou personalizada); senão usa as cores dadas.
function AuraSample({ auraKey, lib, colors, strong, className = '', autoHeight = false, children }: AuraSampleProps) {
  const { className: cls, style } = auraKey
    ? auraProps(auraKey, lib)
    : auraProps('custom-x', { custom: [{ id: 'x', name: '', colors: colors ?? [], strong: !!strong }], overrides: {} });
  return <div className={`aura ${cls} ${className}`} style={autoHeight ? { ...style, height: 'auto' } : style}>{children}</div>;
}

function AuraForm({ initial, title, onSave, onCancel }: AuraFormProps) {
  const { toast } = useUI();
  const [name, setName] = useState(initial?.name || '');
  const [colors, setColors] = useState(initial?.colors || START_COLORS);
  const [strong, setStrong] = useState(!!initial?.strong);

  const setColor = (i: number, v: string) => setColors(cs => cs.map((c, j) => (j === i ? v : c)));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Dê um nome para a aura.');
    onSave({ name: name.trim(), colors, strong });
  };

  return (
    <form onSubmit={submit} className="border border-gray-200 rounded-lg p-6 bg-gray-50/50 mb-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
        <button type="button" onClick={onCancel} aria-label="Fechar" className="text-gray-400 hover:text-gray-600 p-1 rounded-md"><X className="w-5 h-5" /></button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="space-y-5">
          <div>
            <label htmlFor="a-nome" className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input id="a-nome" required maxLength={30} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pôr do sol" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Cores ({colors.length} de {MAX_AURA_COLORS})</span>
            <p className="text-xs text-gray-500 mb-3">A luz passa por todas as cores, na ordem. Use de 2 a {MAX_AURA_COLORS}.</p>
            <div className="flex flex-wrap gap-3">
              {colors.map((c, i) => (
                <div key={i} className="relative">
                  <input type="color" aria-label={`Cor ${i + 1}`} value={c} onChange={e => setColor(i, e.target.value)} className="w-12 h-12 p-0.5 border border-gray-300 rounded-md bg-white cursor-pointer" />
                  {colors.length > 2 && (
                    <button type="button" aria-label={`Remover cor ${i + 1}`} onClick={() => setColors(cs => cs.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-red-600 flex items-center justify-center"><X className="w-3 h-3" /></button>
                  )}
                </div>
              ))}
              {colors.length < MAX_AURA_COLORS && (
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

function ColorDots({ colors }: { colors: string[] }) {
  return (
    <div className="flex gap-1.5 mt-3">
      {colors.map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-gray-200" style={{ background: c }} />)}
    </div>
  );
}

export default function AuraManager({ lib, products, categories, onSave }: AuraManagerProps) {
  const { confirm } = useUI();
  // editing: null | { kind: 'custom', aura? } | { kind: 'builtin', id }
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const { custom, overrides } = lib;

  const usage = (key: string) => products.filter(p => p.auraColor === key).length + categories.filter(c => c.auraColor === key).length;

  const persist = async (nextCustom: CustomAura[], nextOverrides: Record<string, AuraOverride>) => {
    setSaving(true);
    const ok = await onSave({ custom: nextCustom, overrides: nextOverrides });
    setSaving(false);
    return ok;
  };
  const setOverride = (id: string, value: AuraOverride | null) => {
    const next = { ...overrides };
    if (value && Object.keys(value).length) next[id] = value; else delete next[id];
    return next;
  };

  // --- personalizadas ---
  const saveCustom = async (data: AuraData) => {
    const current = editing?.kind === 'custom' ? editing.aura : undefined;
    const aura: CustomAura = { id: current?.id || Math.random().toString(36).slice(2, 8), ...data };
    const next = current ? custom.map(a => (a.id === aura.id ? aura : a)) : [...custom, aura];
    if (await persist(next, overrides)) setEditing(null);
  };
  const deleteCustom = async (a: CustomAura) => {
    const n = usage(customKey(a.id));
    const ok = await confirm({ title: 'Excluir aura', message: n > 0 ? `“${a.name}” está em ${n} produto(s)/categoria(s), que ficarão sem brilho. Excluir mesmo assim?` : `Excluir a aura “${a.name}”?` });
    if (ok) persist(custom.filter(x => x.id !== a.id), overrides);
  };

  // --- do sistema ---
  const saveBuiltin = async (data: AuraData) => {
    if (editing?.kind !== 'builtin') return;
    const id = editing.id;
    const rest: AuraOverride = overrides[id]?.hidden ? { hidden: true } : {};
    if (await persist(custom, setOverride(id, { ...rest, name: data.name, colors: data.colors, strong: data.strong }))) setEditing(null);
  };
  const hideBuiltin = async (id: string) => {
    const n = usage(id);
    const ok = await confirm({
      title: 'Excluir aura do sistema',
      message: `${n > 0 ? `“${overrides[id]?.name || builtinName(id)}” está em ${n} produto(s)/categoria(s), que ficarão sem brilho. ` : ''}Ela some dos seletores e pode ser restaurada aqui depois. Continuar?`
    });
    if (ok) persist(custom, setOverride(id, { ...overrides[id], hidden: true }));
  };
  const restoreVisible = (id: string) => { const rest = { ...overrides[id] }; delete rest.hidden; return persist(custom, setOverride(id, rest)); };
  const resetBuiltin = (id: string) => persist(custom, setOverride(id, null));

  const builtinInitial = (id: string): AuraData => {
    const ov = overrides[id];
    return { name: ov?.name || builtinName(id), colors: ov?.colors || BUILTIN_COLORS[id], strong: ov?.strong ?? !!BUILTIN_STRONG[id] };
  };

  const visibleBuiltins = BUILTIN_IDS.filter(id => !overrides[id]?.hidden);
  const hiddenBuiltins = BUILTIN_IDS.filter(id => overrides[id]?.hidden);

  return (
    <div className="space-y-10">
      {editing && (
        <AuraForm
          key={editing.kind + (editing.kind === 'builtin' ? editing.id : (editing.aura?.id || 'nova'))}
          title={editing.kind === 'builtin' ? `Editar aura “${builtinName(editing.id)}”` : (editing.aura ? 'Editar aura' : 'Nova aura')}
          initial={editing.kind === 'builtin' ? builtinInitial(editing.id) : editing.aura}
          onSave={editing.kind === 'builtin' ? saveBuiltin : saveCustom}
          onCancel={() => setEditing(null)}
        />
      )}

      <section aria-label="Minhas auras">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Minhas auras ({custom.length})</h2>
          {custom.length < MAX_CUSTOM_AURAS && (
            <button onClick={() => setEditing({ kind: 'custom' })} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" /> Nova aura
            </button>
          )}
        </div>
        {custom.length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-8 text-center">Nenhuma aura criada. Crie uma ou edite as do sistema abaixo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {custom.map(a => (
              <AuraSample key={a.id} auraKey={customKey(a.id)} lib={lib}>
                <div className="bg-white rounded-xl p-4 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Em uso: {usage(customKey(a.id))}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditing({ kind: 'custom', aura: a })} disabled={saving} title="Editar" aria-label={`Editar ${a.name}`} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteCustom(a)} disabled={saving} title="Excluir" aria-label={`Excluir ${a.name}`} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <ColorDots colors={a.colors} />
                </div>
              </AuraSample>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Auras do sistema">
        <h2 className="text-lg font-medium text-gray-900 mb-1">Auras do sistema ({visibleBuiltins.length})</h2>
        <p className="text-sm text-gray-500 mb-6">Auras que já vêm no site. Dá para editar, voltar ao original ou excluir (e restaurar).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleBuiltins.map(id => {
            const ov = overrides[id];
            const name = ov?.name || builtinName(id);
            return (
              <AuraSample key={id} auraKey={id} lib={lib}>
                <div className="bg-white rounded-xl p-4 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}{ov?.colors && <span className="ml-2 text-[10px] font-semibold text-blue-700 bg-blue-50 rounded px-1.5 py-0.5 align-middle">EDITADA</span>}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Em uso: {usage(id)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {(ov?.colors || ov?.name) && <button onClick={() => resetBuiltin(id)} disabled={saving} title="Voltar ao original" aria-label={`Voltar ${name} ao original`} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"><RotateCcw className="w-4 h-4" /></button>}
                      <button onClick={() => setEditing({ kind: 'builtin', id })} disabled={saving} title="Editar" aria-label={`Editar ${name}`} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => hideBuiltin(id)} disabled={saving} title="Excluir" aria-label={`Excluir ${name}`} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <ColorDots colors={ov?.colors || BUILTIN_COLORS[id]} />
                </div>
              </AuraSample>
            );
          })}
        </div>

        {hiddenBuiltins.length > 0 && (
          <div className="mt-8 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
            <p className="text-sm font-medium text-gray-700 mb-3">Excluídas ({hiddenBuiltins.length})</p>
            <ul className="flex flex-wrap gap-2">
              {hiddenBuiltins.map(id => (
                <li key={id}>
                  <button onClick={() => restoreVisible(id)} disabled={saving} aria-label={`Restaurar ${overrides[id]?.name || builtinName(id)}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50">
                    <Eye className="w-3.5 h-3.5" /> Restaurar {overrides[id]?.name || builtinName(id)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
