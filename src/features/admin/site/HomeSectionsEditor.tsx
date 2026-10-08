import { useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { inputClass, Switch } from '../../../components/ui';
import { useUI } from '../../../components/UIContext';
import { ImageField } from './ImageField';
import {
  BLOCK_BUTTON_MAX, BLOCK_KEYS, BLOCK_KINDS, BLOCK_TEXT_MAX, BLOCK_TITLE_MAX, MAX_BLOCKS, MAX_QUOTES, QUOTE_NAME_MAX, QUOTE_TEXT_MAX,
  blockSectionId, isCompleteBlock, isValidBlockLink, nextBlockKey, parseBlockDraft, type BlockDraft, type BlockKind,
} from '../../../lib/blocks';
import { NATIVE_SECTIONS, parseOrder } from '../../../lib/homeSections';

type Form = Record<string, string | boolean>;
const str = (v: string | boolean | undefined): string => (typeof v === 'string' ? v : '');
const iconBtn = 'p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-30';

const emptyDraft = (k: BlockKind): BlockDraft => ({ k, on: true, t: '', x: '', i: '', l: '', b: '', d: [] });
const KIND_LABEL: Record<BlockKind, string> = { texto: 'Texto', banner: 'Banner', depoimentos: 'Depoimentos' };

// Ordem e visibilidade das seções da página inicial + criação dos blocos extras
export default function HomeSectionsEditor({ form, set }: { form: Form; set: (key: string, value: string | boolean) => void }) {
  const { confirm } = useUI();
  const [open, setOpen] = useState<string | null>(null);
  const usedKeys = BLOCK_KEYS.filter(k => str(form[k]) !== '');

  // Linhas da lista: seções do site e, no fim da ordem, os blocos que o dono criou
  const order = parseOrder(form.homeSections);
  const rows = order.flatMap(id => {
    const native = NATIVE_SECTIONS.find(s => s.id === id);
    if (native) return [{ id, label: native.label, hint: native.hint, on: !!form[native.flag], toggle: (v: boolean) => set(native.flag, v) }];
    const key = BLOCK_KEYS.find(k => blockSectionId(k) === id);
    const draft = key ? parseBlockDraft(str(form[key])) : null;
    if (!key || !draft) return [];
    return [{
      id, label: draft.t.trim() || `Bloco extra (${KIND_LABEL[draft.k]})`, hint: 'Bloco criado por você, abaixo.', on: draft.on,
      toggle: (v: boolean) => set(key, JSON.stringify({ ...draft, on: v })),
    }];
  });

  const move = (id: string, delta: number) => {
    const visible = rows.map(r => r.id);
    const target = visible[visible.indexOf(id) + delta];
    if (!target) return;
    const next = [...order];
    const a = next.indexOf(id); const b = next.indexOf(target);
    [next[a], next[b]] = [next[b], next[a]];
    set('homeSections', next.join(','));
  };

  const addBlock = (kind: BlockKind) => {
    const key = nextBlockKey(usedKeys);
    if (!key) return;
    set(key, JSON.stringify(emptyDraft(kind)));
    setOpen(key);
  };
  const removeBlock = async (key: string, title: string) => {
    if (!(await confirm({ title: 'Excluir bloco?', message: `“${title || 'Bloco sem título'}” sai da página inicial. Nada muda para os clientes até você publicar.`, confirmLabel: 'Excluir bloco' }))) return;
    set(key, '');
  };

  return (
    <div className="space-y-6" id="campo-homeSections">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Ordem das seções</h3>
        <p className="text-xs text-gray-500 mb-2">Use as setas para mudar a ordem e o interruptor para mostrar ou esconder. Cada modelo da página inicial mostra só as seções que ele tem.</p>
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(r.id, -1)} disabled={i === 0} aria-label={`Subir ${r.label}`} className={iconBtn}><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(r.id, 1)} disabled={i === rows.length - 1} aria-label={`Descer ${r.label}`} className={iconBtn}><ArrowDown className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <Switch id={`sec-${r.id}`} checked={r.on} onChange={r.toggle} label={r.label} hint={r.hint} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">Blocos extras</h3>
        <p className="text-xs text-gray-500 mb-3">Crie textos, banners e depoimentos para a página inicial. Eles entram na lista acima, onde você pode mudar a ordem.</p>
        <div className="space-y-3">
          {usedKeys.length === 0 && <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">Nenhum bloco criado ainda.</p>}
          {usedKeys.map(key => (
            <BlockCard
              key={key} blockKey={key} value={str(form[key])} expanded={open === key}
              onToggle={() => setOpen(open === key ? null : key)} onChange={v => set(key, v)}
              onRemove={t => removeBlock(key, t)}
            />
          ))}
        </div>
        {usedKeys.length < MAX_BLOCKS ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">Novo bloco:</span>
            {BLOCK_KINDS.map(k => (
              <button key={k.id} type="button" onClick={() => addBlock(k.id)} title={k.hint} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Plus className="w-3.5 h-3.5" aria-hidden="true" /> {k.label}
              </button>
            ))}
          </div>
        ) : <p className="mt-3 text-xs text-gray-500">Limite de {MAX_BLOCKS} blocos atingido.</p>}
      </div>
    </div>
  );
}

interface BlockCardProps { blockKey: string; value: string; expanded: boolean; onToggle: () => void; onChange: (v: string) => void; onRemove: (title: string) => void }

function BlockCard({ blockKey, value, expanded, onToggle, onChange, onRemove }: BlockCardProps) {
  const d = parseBlockDraft(value) ?? emptyDraft('texto');
  const patch = (p: Partial<BlockDraft>) => onChange(JSON.stringify({ ...d, ...p }));
  const complete = isCompleteBlock(d);
  const uid = `bloco-${blockKey}`; // liga cada rótulo ao seu campo; único por cartão
  const setQuote = (i: number, p: Partial<{ n: string; q: string }>) => patch({ d: d.d.map((q, j) => (j === i ? { ...q, ...p } : q)) });

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/50">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex-1 min-w-0 text-left">
          <span className="font-medium text-sm text-gray-900 truncate block">{d.t.trim() || 'Bloco sem título'}</span>
          <span className="text-xs text-gray-500">{KIND_LABEL[d.k]} · {d.on ? 'Ligado' : 'Desligado'}{!complete && ' · incompleto (não aparece)'}</span>
        </button>
        <button type="button" onClick={onToggle} className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap">{expanded ? 'Fechar' : 'Editar'}</button>
        <button type="button" onClick={() => onRemove(d.t)} aria-label={`Excluir bloco ${d.t}`} className={`${iconBtn} hover:text-red-600`}><Trash2 className="w-4 h-4" /></button>
      </div>
      {expanded && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          <Switch id={`${uid}-on`} checked={d.on} onChange={v => patch({ on: v })} label="Mostrar este bloco" />
          <div>
            <label htmlFor={`${uid}-t`} className="block text-xs font-medium text-gray-700 mb-1">Título {d.k === 'depoimentos' && '(opcional)'}</label>
            <input id={`${uid}-t`} type="text" maxLength={BLOCK_TITLE_MAX} value={d.t} onChange={e => patch({ t: e.target.value })} className={inputClass} />
          </div>
          {d.k !== 'depoimentos' && (
            <div>
              <label htmlFor={`${uid}-x`} className="block text-xs font-medium text-gray-700 mb-1">Texto</label>
              <textarea id={`${uid}-x`} rows={3} maxLength={BLOCK_TEXT_MAX} value={d.x} onChange={e => patch({ x: e.target.value })} className={inputClass} />
              <p className="text-xs text-gray-500 mt-1 text-right">{d.x.length}/{BLOCK_TEXT_MAX}</p>
            </div>
          )}
          {d.k === 'banner' && (
            <>
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Imagem do banner</span>
                <ImageField id={`${uid}-i`} label="Imagem do banner" guide="hero" value={d.i} onChange={v => patch({ i: v })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${uid}-b`} className="block text-xs font-medium text-gray-700 mb-1">Texto do botão (opcional)</label>
                  <input id={`${uid}-b`} type="text" maxLength={BLOCK_BUTTON_MAX} value={d.b} onChange={e => patch({ b: e.target.value })} placeholder="Ex: Ver mais" className={inputClass} />
                </div>
                <div>
                  <label htmlFor={`${uid}-l`} className="block text-xs font-medium text-gray-700 mb-1">Link do botão</label>
                  <input id={`${uid}-l`} type="text" maxLength={300} value={d.l} onChange={e => patch({ l: e.target.value })} placeholder="https://… ou /sobre" aria-invalid={!isValidBlockLink(d.l.trim())} className={inputClass} />
                  {!isValidBlockLink(d.l.trim()) && <p role="alert" className="text-xs text-red-700 mt-1">Use um endereço completo (https://…) ou uma página do site (como /sobre).</p>}
                </div>
              </div>
            </>
          )}
          {d.k === 'depoimentos' && (
            <div className="space-y-3">
              {d.d.map((q, i) => (
                <div key={i} className="rounded-md border border-gray-200 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="text" aria-label={`Nome de quem falou (depoimento ${i + 1})`} maxLength={QUOTE_NAME_MAX} value={q.n} onChange={e => setQuote(i, { n: e.target.value })} placeholder="Nome" className={`${inputClass} flex-1`} />
                    <button type="button" onClick={() => patch({ d: d.d.filter((_, j) => j !== i) })} aria-label={`Remover depoimento ${i + 1}`} className={`${iconBtn} hover:text-red-600`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <textarea aria-label={`Texto do depoimento ${i + 1}`} rows={2} maxLength={QUOTE_TEXT_MAX} value={q.q} onChange={e => setQuote(i, { q: e.target.value })} placeholder="O que o cliente disse" className={inputClass} />
                </div>
              ))}
              {d.d.length < MAX_QUOTES && (
                <button type="button" onClick={() => patch({ d: [...d.d, { n: '', q: '' }] })} className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"><Plus className="w-4 h-4" /> Adicionar depoimento</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
