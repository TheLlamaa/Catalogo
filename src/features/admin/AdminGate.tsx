import { useEffect, useState, type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { checkIsAdmin } from '../../services/auth';
import { Button } from '../../components/ui';

// Só mostra o painel a quem é administrador. Uma conta que entrou mas não está na Equipe vê este aviso
// em vez de um painel vazio e cheio de erros de permissão.
export default function AdminGate({ userId, onLogout, children }: { userId: string; onLogout: () => void; children: ReactNode }) {
  const [result, setResult] = useState<{ userId: string; isAdmin: boolean | null } | null>(null);

  useEffect(() => {
    let alive = true;
    checkIsAdmin().then(isAdmin => { if (alive) setResult({ userId, isAdmin }); }).catch(() => { if (alive) setResult({ userId, isAdmin: null }); });
    return () => { alive = false; };
  }, [userId]);

  if (result?.userId !== userId) return <p role="status" className="py-16 text-center text-sm text-gray-500">Verificando o acesso…</p>;
  if (result.isAdmin === false) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Esta conta não tem acesso ao painel</h1>
        <p className="text-sm text-gray-600 mb-6">Entre com o e-mail de um administrador, ou peça para alguém da Equipe adicionar o seu.</p>
        <Button variant="primary" onClick={onLogout}>Sair e trocar de conta</Button>
      </div>
    );
  }
  return <>{children}</>;
}
