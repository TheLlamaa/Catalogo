import { supabase } from './client';

const WATCHED = ['products', 'categories', 'custom_orders', 'orders'];

// Avisa (onChange) quando produtos, categorias ou pedidos mudam. Devolve a função que desliga.
export function watchAdminChanges(onChange: (payload: unknown) => void) {
  const channel = WATCHED.reduce(
    (ch, table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, onChange),
    supabase.channel('admin-changes'),
  ).subscribe();
  return () => supabase.removeChannel(channel);
}
