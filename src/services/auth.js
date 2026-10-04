import { supabase } from './client';

export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();
export const getSession = () => supabase.auth.getSession().then(({ data: { session } }) => session);

// Chama callback(session) a cada login/logout. Devolve a função que cancela a inscrição.
export function onSessionChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
