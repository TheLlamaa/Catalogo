import { useCallback, useEffect, useState } from 'react';
import { Bug, Trash2, RefreshCw } from 'lucide-react';
import { useUI } from '../../../components/UIContext';
import { clearErrors, listErrors } from '../../../services/errors';

// Linha da tabela error_log (colunas pedidas em listErrors)
interface ErrorRow {
  id: string;
  created_at: string;
  source: string;
  message: string;
  stack: string | null;
  page: string | null;
  user_agent: string | null;
}

const SOURCES: Record<string, string> = { window: 'Navegador', promise: 'Requisição', react: 'Tela' };
const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Erros que aconteceram no navegador dos visitantes (registrados automaticamente pelo site).
export default function ErrorsManager() {
  const { confirm, toast } = useUI();
  const [rows, setRows] = useState<ErrorRow[] | null>(null); // null = carregando
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await listErrors();
    if (error) { setLoadError(error.message || 'Erro ao carregar.'); setRows([]); return; }
    setLoadError(''); setRows((data || []) as ErrorRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const clear = async () => {
    const ok = await confirm({ title: 'Limpar log de erros', message: 'Apagar todos os erros registrados?', confirmLabel: 'Apagar tudo' });
    if (!ok) return;
    const { error } = await clearErrors();
    if (error) { toast.error(`Não foi possível limpar: ${error.message}`); return; }
    toast.success('Log limpo.');
    load();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Bug className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">Erros do site</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Erros ocorridos no navegador dos visitantes. Lista vazia = tudo certo.</p>

      {loadError && (
        <p role="alert" className="mb-4 p-3 text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
          {loadError} Se a tabela ainda não existe, rode o arquivo 09-log-de-erros.sql no SQL Editor do Supabase.
        </p>
      )}

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"><RefreshCw className="w-4 h-4" /> Atualizar</button>
        {rows && rows.length > 0 && <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /> Limpar tudo</button>}
      </div>

      {rows === null ? <p className="text-sm text-gray-500">Carregando...</p>
        : rows.length === 0 && !loadError ? <p className="py-10 text-center text-sm text-gray-500">Nenhum erro registrado.</p>
        : (
          <ul className="space-y-3">
            {rows.map(r => (
              <li key={r.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-900 break-words">{r.message}</p>
                <p className="text-xs text-gray-500 mt-1">{fmt(r.created_at)} · {SOURCES[r.source] || r.source}{r.page ? ` · ${r.page}` : ''}</p>
                {(r.stack || r.user_agent) && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer">Detalhes técnicos</summary>
                    {r.stack && <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">{r.stack}</pre>}
                    {r.user_agent && <p className="mt-2 text-xs text-gray-500 break-words">{r.user_agent}</p>}
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
