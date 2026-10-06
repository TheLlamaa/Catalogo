import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../../components/ui';
import { useUI } from '../../../components/UIContext';
import { normalizeEmail, validateAdminEmail } from '../../../lib/admins';
import { addAdmin, listAdmins, removeAdmin } from '../../../services/team';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500';

// Linha da tabela admins (colunas pedidas em listAdmins)
interface AdminRow {
  email: string;
  added_by: string | null;
  created_at: string;
}

interface TeamManagerProps {
  currentEmail?: string | null;
}

// Quem tem acesso ao painel. O acesso é pelo e-mail com o qual a pessoa entra (login do Supabase).
export default function TeamManager({ currentEmail }: TeamManagerProps) {
  const { confirm, toast } = useUI();
  const me = normalizeEmail(currentEmail);
  const [admins, setAdmins] = useState<AdminRow[] | null>(null); // null = carregando
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: e } = await listAdmins();
    if (e) { setLoadError(e.message || 'Erro ao carregar a equipe.'); setAdmins([]); return; }
    setLoadError(''); setAdmins((data || []) as AdminRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const msg = validateAdminEmail(email, (admins || []).map(a => a.email));
    if (msg) { setError(msg); return; }
    setError(''); setBusy(true);
    const { error: e } = await addAdmin(email, me);
    setBusy(false);
    if (e) { setError(`Não foi possível adicionar: ${e.message}`); return; }
    toast.success('Administrador adicionado.');
    setEmail('');
    load();
  };

  const remove = async (a: AdminRow) => {
    const ok = await confirm({ title: 'Remover acesso', message: `Remover o acesso de ${a.email}? A pessoa deixa de entrar no painel na hora.`, confirmLabel: 'Remover' });
    if (!ok) return;
    const { error: e } = await removeAdmin(a.email);
    if (e) { toast.error(`Não foi possível remover: ${e.message}`); return; }
    toast.success('Acesso removido.');
    load();
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Equipe" description="Quem pode entrar neste painel. Crie antes o usuário com o mesmo e-mail no Supabase (Authentication → Users)." />

      {loadError && (
        <div role="alert" className="mb-6 p-4 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900">
          Não foi possível carregar a equipe ({loadError}). Se o banco é anterior à versão 8, rode o arquivo <code>08-administradores.sql</code> no SQL Editor.
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mb-2" noValidate>
        <label className="sr-only" htmlFor="novo-admin">E-mail do novo administrador</label>
        <input
          id="novo-admin" type="email" inputMode="email" autoComplete="off" placeholder="email@exemplo.com"
          value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className={inputCls}
        />
        <button type="submit" disabled={busy || !!loadError} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap">
          <UserPlus className="w-4 h-4" /> Adicionar
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}

      <ul className="mt-4 border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white" aria-label="Administradores">
        {admins === null && <li className="p-4 text-sm text-gray-500">Carregando…</li>}
        {admins && admins.length === 0 && !loadError && <li className="p-4 text-sm text-gray-500">Nenhum administrador cadastrado.</li>}
        {(admins || []).map(a => {
          const isMe = normalizeEmail(a.email) === me;
          return (
            <li key={a.email} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">{a.email}</span>
                  {isMe && <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">você</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">
                  Desde {new Date(a.created_at).toLocaleDateString('pt-BR')}{a.added_by ? ` · adicionado por ${a.added_by}` : ''}
                </p>
              </div>
              <button
                onClick={() => remove(a)} disabled={isMe}
                title={isMe ? 'Você não pode remover o seu próprio acesso' : 'Remover acesso'} aria-label={`Remover acesso de ${a.email}`}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
