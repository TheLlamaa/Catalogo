import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '../../../lib/pagination';

// Alterna entre "Cards" e "Lista"
export default function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const opt = (id: ViewMode, label: string, Icon: typeof List) => (
    <button
      type="button" onClick={() => onChange(id)} aria-pressed={value === id} aria-label={label} title={label}
      className={`flex items-center justify-center w-9 h-9 transition-colors ${value === id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
  return (
    <div role="group" aria-label="Modo de exibição" className="inline-flex border border-gray-300 rounded-md overflow-hidden divide-x divide-gray-300">
      {opt('cards', 'Cards', LayoutGrid)}
      {opt('lista', 'Lista', List)}
    </div>
  );
}
