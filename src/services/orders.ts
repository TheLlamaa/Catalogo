import { supabase } from './client';

type OrderTable = 'orders' | 'custom_orders';

// table: 'orders' (pedidos do catálogo) ou 'custom_orders' (pedidos personalizados)
export const insertOrder = (table: OrderTable, order: Record<string, unknown>) => supabase.from(table).insert(order);
export const deleteOrderRow = (table: OrderTable, id: string) => supabase.from(table).delete().eq('id', id);
export const setOrderStatus = (table: OrderTable, id: string, status: string) => supabase.from(table).update({ status }).eq('id', id);
