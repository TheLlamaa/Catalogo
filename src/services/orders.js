import { supabase } from './client';

// table: 'orders' (pedidos do catálogo) ou 'custom_orders' (pedidos personalizados)
export const insertOrder = (table, order) => supabase.from(table).insert(order);
export const deleteOrderRow = (table, id) => supabase.from(table).delete().eq('id', id);
export const setOrderStatus = (table, id, status) => supabase.from(table).update({ status }).eq('id', id);
