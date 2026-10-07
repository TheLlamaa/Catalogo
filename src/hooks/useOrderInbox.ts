import { useMemo, useState } from 'react';
import { usePagination } from './usePagination';
import { useViewMode } from './useViewMode';
import { DEFAULT_FILTERS } from '../features/admin/pedidos/OrderFilters';
import type { OrderFiltersValue } from '../features/admin/pedidos/OrderFilters';
import { orderInbox } from '../lib/orders';
import type { OrderLike } from '../types';

// Lista de pedidos do painel: filtros, status escolhido, números dos chips, resumo, paginação e modo de exibição.
// Os dois gerenciadores (pedidos do carrinho e personalizados) usam o mesmo.
export function useOrderInbox<T extends OrderLike>(orders: T[]) {
  const [filters, setFilters] = useState<OrderFiltersValue>(DEFAULT_FILTERS);
  const [status, setStatus] = useState('all');
  const inbox = useMemo(() => orderInbox(orders, filters, status), [orders, filters, status]);
  const pager = usePagination(inbox.visible, JSON.stringify([filters, status]));
  const [view, setView] = useViewMode();
  return { filters, setFilters, status, setStatus, ...inbox, pager, view, setView };
}
