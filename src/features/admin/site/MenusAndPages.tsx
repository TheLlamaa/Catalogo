import { useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Trash2, Eye, Pencil, Bold, Italic, Heading2, List, Link2 } from 'lucide-react';
import { inputClass } from '../../../components/ui';
import { useUI } from '../../../components/UIContext';
import RichText from '../../../components/RichText';
import {
  PAGE_KEYS, PAGE_TITLE_MAX, PAGE_TEXT_MAX, MAX_PAGES, parsePageDraft, isCompletePage, nextPageKey, slugify
} from '../../../lib/pages';
import { MENU_LABEL_MAX, editMenu, serializeMenu, isBuiltin, type MenuItem, type MenuKind } from '../../../lib/menus';
import type { Category } from '../../../types';

const inputCls = inputClass;
const iconBtn = 'p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-30';

type Form = Record<string, string | boolean>;
const str = (v: string | boolean | undefined): string => (typeof v === 'string' ? v : '');

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------

interface PagesEditorProps { form: Form; set: (key: string, value: string) => void }

export function PagesEditor({ form, set }: PagesEditorProps) {
  const { confirm } = useUI();
  const used = PAGE_KEYS.filter(k => str(form[k]) !== '');
  const [open, setOpen] = useState<string | null>(null);
  const addPage = () => {
    const key = nextPageKey(used);
    if (!key) return;
    set(key, JSON.stringify({ t: '', x: '', s: '', p: true }));
    setOpen(key);
  };
  const remove = async (key: string, title: string) => {
    if (!(await confirm({ title: 'Excluir página?', message: `“${title || 'Página sem título'}” sai também dos menus. Nada muda para os clientes até você publicar.`, confirmLabel: 'Excluir página' }))) return;
    set(key, '');
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Crie páginas como Trocas e devoluções, Cuidados com a peça ou Prazos. Depois coloque a página no menu do topo ou no rodapé, nas seções abaixo.</p>
      {used.length === 0 && <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">Nenhuma página criada ainda.</p>}
      {used.map(key => (
        <PageCard
          key={key} value={str(form[key])} expanded={open === key}
          onToggle={() => setOpen(open === key ? null : key)}
          onChange={v => set(key, v)} onRemove={t => remove(key, t)}
        />
      ))}
      {used.length < MAX_PAGES
        ? <button type="button" onClick={addPage} className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"><Plus className="w-4 h-4" /> Nova página</button>
        : <p className="text-xs text-gray-500">Limite de {MAX_PAGES} páginas atingido.</p>}
    </div>
  );
}

interface PageCardProps { value: string; expanded: boolean; onToggle: () => void; onChange: (v: string) => void; onRemove: (title: string) => void }

function PageCard({ value, expanded, onToggle, onChange, onRemove }: PageCardProps) {
  const d = parsePageDraft(value);
  const patch = (p: Partial<{ t: string; x: string; s: string; p: boolean }>) => onChange(JSON.stringify({ t: d.t || '', x: d.x || '', s: d.s || '', p: d.p !== false, ...p }));
  const [preview, setPreview] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const slug = slugify(d.s || '') || slugify(d.t || '');
  const complete = isCompletePage(value);

  // Insere marcação ao redor do texto selecionado
  const wrap = (before: string, after: string, placeholder: string) => {
    const el = area.current;
    const text = d.x || '';
    const a = el?.selectionStart ?? text.length;
    const b = el?.selectionEnd ?? text.length;
    const sel = text.slice(a, b) || placeholder;
    patch({ x: `${text.slice(0, a)}${before}${sel}${after}${text.slice(b)}`.slice(0, PAGE_TEXT_MAX) });
    el?.focus();
  };
  const linePrefix = (prefix: string, placeholder: string) => {
    const text = d.x || '';
    const el = area.current;
    const a = el?.selectionStart ?? text.length;
    const start = text.lastIndexOf('\n', a - 1) + 1;
    const line = text.slice(start, a);
    patch({ x: `${text.slice(0, start)}${prefix}${line || placeholder}${text.slice(a)}`.slice(0, PAGE_TEXT_MAX) });
    el?.focus();
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/50">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex-1 min-w-0 text-left">
          <span className="font-medium text-sm text-gray-900 truncate block">{d.t?.trim() || 'Página sem título'}</span>
          <span className="text-xs text-gray-500">/p/{slug || '…'} · {d.p === false ? 'Rascunho (oculta)' : 'Publicada'}{!complete && ' · incompleta'}</span>
        </button>
        <button type="button" onClick={onToggle} className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap">{expanded ? 'Fechar' : 'Editar'}</button>
        <button type="button" onClick={() => onRemove(d.t || '')} aria-label={`Excluir página ${d.t || ''}`} className={`${iconBtn} hover:text-red-600`}><Trash2 className="w-4 h-4" /></button>
      </div>
      {expanded && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          <div>
            <label htmlFor="page-title" className="block text-xs font-medium text-gray-700 mb-1">Título</label>
            <input id="page-title" type="text" maxLength={PAGE_TITLE_MAX} value={d.t || ''} onChange={e => patch({ t: e.target.value })} placeholder="Título da página" aria-label="Título da página" className={inputCls} />
          </div>
          <div>
            <label htmlFor="page-slug" className="block text-xs font-medium text-gray-700 mb-1">Endereço da página</label>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>/p/</span>
              <input id="page-slug" type="text" maxLength={40} value={d.s || ''} onChange={e => patch({ s: e.target.value })} placeholder={slugify(d.t || '') || 'trocas-e-devolucoes'} aria-label="Endereço da página" className={inputCls} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Só letras minúsculas, números e hífen. Vazio = criado a partir do título.</p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label htmlFor="page-text" className="block text-xs font-medium text-gray-700">Texto</label>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => linePrefix('# ', 'Título')} aria-label="Título grande" title="Título grande" className={iconBtn}><Heading2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => wrap('**', '**', 'negrito')} aria-label="Negrito" title="Negrito" className={iconBtn}><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => wrap('*', '*', 'itálico')} aria-label="Itálico" title="Itálico" className={iconBtn}><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => linePrefix('- ', 'item da lista')} aria-label="Lista" title="Lista" className={iconBtn}><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => wrap('[', '](https://)', 'texto do link')} aria-label="Link" title="Link" className={iconBtn}><Link2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => setPreview(p => !p)} className="ml-2 flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
                  {preview ? <><Pencil className="w-3.5 h-3.5" /> Editar</> : <><Eye className="w-3.5 h-3.5" /> Prévia</>}
                </button>
              </div>
            </div>
            {preview
              ? <div className="border border-gray-200 bg-white rounded-md p-4 min-h-[8rem]"><RichText text={d.x || ''} /></div>
              : <textarea id="page-text" ref={area} rows={9} maxLength={PAGE_TEXT_MAX} value={d.x || ''} onChange={e => patch({ x: e.target.value })} placeholder="Escreva o texto da página" aria-label="Texto da página" className={inputCls} />}
            <p className="text-xs text-gray-500 mt-1">Linha em branco separa parágrafos. Use os botões acima para título, negrito, lista e link. {(d.x || '').length}/{PAGE_TEXT_MAX}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={d.p !== false} onChange={e => patch({ p: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300" /> Publicada (visível para os clientes)
          </label>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

interface MenuEditorProps {
  value: string; onChange: (v: string) => void;
  withBuiltins: boolean; max: number;
  form: Form; categories: Category[];
  setFlag: (key: string, value: boolean) => void;
}

const BUILTIN_NAME: Record<string, { key: string; fallback: string }> = {
  home: { key: 'menuHome', fallback: 'Vitrine' }, about: { key: 'menuAbout', fallback: 'Sobre' }, custom: { key: 'menuCustom', fallback: 'Personalizado' }
};

// Sobre e Personalizado só aparecem na loja se estiverem ligados nas configurações
const builtinOff = (kind: string, form: Form): boolean => (kind === 'about' && form.aboutEnabled !== true) || (kind === 'custom' && form.customEnabled === false);

export function MenuEditor({ value, onChange, withBuiltins, max, form, categories, setFlag }: MenuEditorProps) {
  const items = editMenu(value, withBuiltins);
  const pages = PAGE_KEYS.filter(k => isCompletePage(str(form[k]))).map(k => ({ key: k, title: (parsePageDraft(str(form[k])).t || '').trim() }));
  const save = (next: MenuItem[]) => onChange(serializeMenu(next));
  const update = (i: number, p: Partial<MenuItem>) => save(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= items.length) return; const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; save(next); };
  const add = (kind: MenuKind) => {
    const ref = kind === 'page' ? (pages[0]?.key ?? '') : kind === 'cat' ? (categories[0]?.id ?? '') : '';
    save([...items, { kind, ref: String(ref), label: '' }]);
  };
  const full = items.length >= max;
  const addBtn = 'flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline disabled:opacity-40 disabled:no-underline';

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[12rem] space-y-2">
              {isBuiltin(it.kind) ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-sm font-medium text-gray-900">{str(form[BUILTIN_NAME[it.kind].key]) || BUILTIN_NAME[it.kind].fallback}</span>
                  <span className="text-xs text-gray-500">botão da loja</span>
                  {it.kind !== 'home' && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-700">
                      <input
                        type="checkbox" checked={!builtinOff(it.kind, form)}
                        onChange={e => setFlag(it.kind === 'about' ? 'aboutEnabled' : 'customEnabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      /> Mostrar na loja
                    </label>
                  )}
                </div>
              ) : it.kind === 'page' ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  <select aria-label="Página do item" value={it.ref} onChange={e => update(i, { ref: e.target.value })} className={inputCls}>
                    {!pages.some(p => p.key === it.ref) && <option value="">Escolha a página…</option>}
                    {pages.map(p => <option key={p.key} value={p.key}>{p.title}</option>)}
                  </select>
                  <input type="text" maxLength={MENU_LABEL_MAX} value={it.label} onChange={e => update(i, { label: e.target.value })} placeholder="Nome no menu (opcional)" aria-label="Nome no menu" className={inputCls} />
                </div>
              ) : it.kind === 'cat' ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  <select aria-label="Categoria do item" value={it.ref} onChange={e => update(i, { ref: e.target.value })} className={inputCls}>
                    {!categories.some(c => String(c.id) === it.ref) && <option value="">Escolha a categoria…</option>}
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input type="text" maxLength={MENU_LABEL_MAX} value={it.label} onChange={e => update(i, { label: e.target.value })} placeholder="Nome no menu (opcional)" aria-label="Nome no menu" className={inputCls} />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  <input type="text" maxLength={MENU_LABEL_MAX} value={it.label} onChange={e => update(i, { label: e.target.value })} placeholder="Nome do link" aria-label="Nome do link" className={inputCls} />
                  <input type="url" maxLength={500} value={it.ref} onChange={e => update(i, { ref: e.target.value })} placeholder="https://..." aria-label="Endereço do link" className={inputCls} />
                </div>
              )}
              {!isBuiltin(it.kind) && <p className="text-xs text-gray-500">{it.kind === 'page' ? 'Página' : it.kind === 'cat' ? 'Categoria' : 'Link externo (abre em outra aba)'}</p>}
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className={iconBtn}><ArrowUp className="w-4 h-4" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Descer" className={iconBtn}><ArrowDown className="w-4 h-4" /></button>
              {!isBuiltin(it.kind) && <button type="button" onClick={() => save(items.filter((_, idx) => idx !== i))} aria-label="Remover item" className={`${iconBtn} hover:text-red-600`}><Trash2 className="w-4 h-4" /></button>}
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="text-sm text-gray-500">Nenhum link extra no rodapé.</p>}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <button type="button" onClick={() => add('page')} disabled={full || pages.length === 0} className={addBtn}><Plus className="w-4 h-4" /> Página</button>
        <button type="button" onClick={() => add('cat')} disabled={full || categories.length === 0} className={addBtn}><Plus className="w-4 h-4" /> Categoria</button>
        <button type="button" onClick={() => add('link')} disabled={full} className={addBtn}><Plus className="w-4 h-4" /> Link externo</button>
      </div>
      {pages.length === 0 && <p className="text-xs text-gray-500">Para adicionar uma página aqui, crie e preencha uma na seção “Páginas”.</p>}
      {full && <p className="text-xs text-gray-500">Limite de {max} itens atingido.</p>}
    </div>
  );
}
