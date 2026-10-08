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

// O usuário logado é administrador (e-mail na tabela admins)? Só `false` conta como "não é": se a
// pergunta falhar (rede, banco antigo), devolve null e o painel abre normalmente, pois o RLS barra os dados de qualquer jeito.
export async function checkIsAdmin(): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('is_admin');
  return error || typeof data !== 'boolean' ? null : data;
}
