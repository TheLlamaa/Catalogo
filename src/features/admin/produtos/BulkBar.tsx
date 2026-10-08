import { useState } from 'react';
import { Button } from '../../../components/ui';
import { parsePercent, type BulkAction } from '../../../lib/bulk';
import type { Category } from '../../../types';

type Choice =
  | 'show' | 'hide' | 'price' | 'discount' | 'no-discount'
  | 'destaque' | 'popular' | 'no-section' | 'cat-add' | 'cat-remove';

const CHOICES: { value: Choice; label: string }[] = [
  { value: 'show', label: 'Mostrar na vitrine' },
  { value: 'hide', label: 'Ocultar da vitrine' },
  { value: 'price', label: 'Reajustar o preço em %' },
  { value: 'discount', label: 'Aplicar desconto em %' },
  { value: 'no-discount', label: 'Tirar o desconto' },
  { value: 'destaque', label: 'Colocar em Destaques' },
  { value: 'popular', label: 'Colocar em Mais pedidos' },
  { value: 'no-section', label: 'Tirar de Destaques / Mais pedidos' },
  { value: 'cat-add', label: 'Adicionar a uma categoria' },
  { value: 'cat-remove', label: 'Remover de uma categoria' },
];

interface BulkBarProps {
  count: number;
  categories: Category[];
  fallbackCategoryId: string | null; // categoria "Geral": recebe quem ficar sem nenhuma
  busy: boolean;
  onApply: (action: BulkAction) => void;
  onClear: () => void;
}

// Barra que aparece quando há produtos marcados na lista: uma ação para todos de uma vez.
export default function BulkBar({ count, categories, fallbackCategoryId, busy, onApply, onClear }: BulkBarProps) {
  const [choice, setChoice] = useState<Choice | ''>('');
  const [percent, setPercent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const needsPercent = choice === 'price' || choice === 'discount';
  const needsCategory = choice === 'cat-add' || choice === 'cat-remove';

  const build = (): BulkAction | null => {
    switch (choice) {
      case 'show': return { type: 'visibility', active: true };
      case 'hide': return { type: 'visibility', active: false };
      case 'price': return { type: 'price', percent: parsePercent(percent) ?? NaN };
      case 'discount': return { type: 'discount', percent: parsePercent(percent) ?? NaN };
      case 'no-discount': return { type: 'discount', percent: 0 };
      case 'destaque': return { type: 'section', section: 'destaque' };
      case 'popular': return { type: 'section', section: 'popular' };
      case 'no-section': return { type: 'section', section: '' };
      case 'cat-add': return { type: 'category', mode: 'add', categoryId, fallbackCategoryId };
      case 'cat-remove': return { type: 'category', mode: 'remove', categoryId, fallbackCategoryId };
      default: return null;
    }
  };

  const apply = () => { const action = build(); if (action) onApply(action); };

  return (
    <div role="region" aria-label="Edição em massa" className="sticky top-16 z-20 mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        <p className="text-sm font-semibold text-blue-900 lg:mr-2" aria-live="polite">{count} {count === 1 ? 'produto marcado' : 'produtos marcados'}</p>
        <label className="sr-only" htmlFor="bulk-acao">Ação para os produtos marcados</label>
        <select id="bulk-acao" value={choice} onChange={e => setChoice(e.target.value as Choice | '')} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white lg:w-64">
          <option value="">Escolha uma ação…</option>
          {CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {needsPercent && (
          <>
            <label className="sr-only" htmlFor="bulk-percent">Porcentagem</label>
            <input
              id="bulk-percent" type="text" inputMode="decimal" value={percent} onChange={e => setPercent(e.target.value)}
              placeholder={choice === 'price' ? 'Ex.: 10 ou -5' : 'Ex.: 15'} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white w-full lg:w-32"
            />
          </>
        )}
        {needsCategory && (
          <>
            <label className="sr-only" htmlFor="bulk-categoria">Categoria</label>
            <select id="bulk-categoria" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white lg:w-56">
              <option value="">Escolha a categoria…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}
        <div className="flex gap-2 lg:ml-auto">
          <Button variant="primary" onClick={apply} disabled={!choice || busy}>{busy ? 'Aplicando…' : 'Aplicar'}</Button>
          <Button onClick={onClear} disabled={busy}>Limpar seleção</Button>
        </div>
      </div>
    </div>
  );
}
