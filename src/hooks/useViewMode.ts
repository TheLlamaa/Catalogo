import { useState } from 'react';
import { loadViewMode, saveViewMode } from '../lib/pagination';
import type { ViewMode } from '../lib/pagination';

// Cards ou lista; a escolha vale para as duas abas de pedidos e fica lembrada no navegador.
export function useViewMode() {
  const [view, setViewState] = useState<ViewMode>(loadViewMode);
  const setView = (v: ViewMode) => { saveViewMode(v); setViewState(v); };
  return [view, setView] as const;
}
