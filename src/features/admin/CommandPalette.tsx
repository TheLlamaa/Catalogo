import { useMemo, useState } from 'react';
import { Search, CornerDownLeft, Settings2, PanelLeft } from 'lucide-react';
import Dialog from '../../components/Dialog';
import { norm, searchSettings } from '../../lib/settingsMeta';
import type { NavId, NavSection } from './AdminNav';

export type PaletteChoice = { type: 'screen'; id: NavId } | { type: 'setting'; group: string; key: string };

interface Item { id: string; title: string; detail: string; choice: PaletteChoice; kind: 'screen' | 'setting' }

// Busca do painel inteiro (Ctrl+K): telas do menu e qualquer configuração do site, por nome ou sinônimo.
export default function CommandPalette({ sections, onChoose, onClose }: { sections: NavSection[]; onChoose: (c: PaletteChoice) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const items = useMemo<Item[]>(() => {
    const q = norm(query);
    const screens: Item[] = sections.flatMap(s => s.items.map(i => ({
      id: `screen:${i.id}`, title: i.label, detail: s.title, kind: 'screen' as const, choice: { type: 'screen' as const, id: i.id },
    }))).filter(i => !q || q.split(/\s+/).every(w => norm(`${i.title} ${i.detail}`).includes(w)));
    const settings: Item[] = q
      ? searchSettings(query, 10).map(h => ({
          id: `setting:${h.key}`, title: h.label, detail: `${h.groupLabel} › ${h.section}`, kind: 'setting' as const, choice: { type: 'setting' as const, group: h.group, key: h.key },
        }))
      : [];
    return [...screens, ...settings].slice(0, 14);
  }, [query, sections]);

  const move = (delta: number) => setActive(a => (items.length ? (a + delta + items.length) % items.length : 0));
  const choose = (item?: Item) => { if (item) onChoose(item.choice); };

  return (
    <Dialog label="Buscar no painel" onClose={onClose} zClass="z-[70]" panelClassName="bg-white rounded-xl shadow-2xl w-full max-w-xl mt-[10vh] self-start overflow-hidden">
      <div className="flex items-center gap-2 px-4 border-b border-gray-200">
        <Search className="w-4 h-4 text-gray-500" aria-hidden="true" />
        <input
          type="text" value={query} onChange={e => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); choose(items[active]); }
          }}
          role="combobox" aria-expanded="true" aria-controls="paleta-lista" aria-activedescendant={items[active] ? `paleta-${active}` : undefined} aria-label="Buscar no painel"
          placeholder="O que você quer mudar? ex: cor, WhatsApp, frete, pedidos"
          className="flex-1 py-3.5 text-sm bg-transparent outline-none"
        />
        <kbd className="hidden sm:inline text-[11px] text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
      </div>
      <ul id="paleta-lista" role="listbox" aria-label="Resultados" className="max-h-[55vh] overflow-y-auto py-1">
        {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500" role="status">Nada encontrado para “{query.trim()}”. Tente outra palavra.</li>}
        {items.map((item, i) => (
          <li key={item.id} id={`paleta-${i}`} role="option" aria-selected={i === active}>
            <button
              type="button" tabIndex={-1} onMouseEnter={() => setActive(i)} onClick={() => choose(item)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? 'bg-blue-50' : ''}`}
            >
              {item.kind === 'setting' ? <Settings2 className="w-4 h-4 text-blue-600 flex-shrink-0" aria-hidden="true" /> : <PanelLeft className="w-4 h-4 text-gray-500 flex-shrink-0" aria-hidden="true" />}
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-gray-900 truncate">{item.title}</span>
                <span className="block text-xs text-gray-500 truncate">{item.detail}</span>
              </span>
              {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      <p className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-500">↑ ↓ para escolher · Enter para abrir · também funciona com Ctrl + K</p>
    </Dialog>
  );
}
