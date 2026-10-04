import { supabase } from './client';

export const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();
export const getSession = () => supabase.auth.getSession().then(({ data: { session } }) => session);

// Sessão atual (null = deslogado)
export type Session = Awaited<ReturnType<typeof getSession>>;

export type AuthUser = NonNullable<Session>['user'];

// Chama callback(session) a cada login/logout. Devolve a função que cancela a inscrição.
export function onSessionChange(callback: (session: Session) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
