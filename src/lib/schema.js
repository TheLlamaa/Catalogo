// Versão do banco que este site espera. Sobe junto com cada arquivo novo em supabase/ (o arquivo grava a versão em app_meta).
export const EXPECTED_SCHEMA_VERSION = 9;

// Interpreta a resposta de "select value from app_meta where key = 'schema_version'"
export function schemaStatus(rows, error, expected = EXPECTED_SCHEMA_VERSION) {
  if (error) {
    // tabela ainda não existe (banco anterior ao SQL 08) ou sem permissão
    return { ok: false, current: null, expected, reason: 'sem-versao' };
  }
  const raw = Array.isArray(rows) ? rows.find(r => r.key === 'schema_version')?.value : undefined;
  const current = /^\d+$/.test(String(raw ?? '')) ? Number(raw) : null;
  if (current === null) return { ok: false, current: null, expected, reason: 'sem-versao' };
  return { ok: current >= expected, current, expected, reason: current >= expected ? null : 'desatualizado' };
}

export function schemaMessage(status) {
  if (status.ok) return '';
  if (status.reason === 'sem-versao') return `O banco ainda não tem o controle de versão. Rode os arquivos 08-administradores.sql e 09-log-de-erros.sql (pasta supabase/) no SQL Editor do Supabase.`;
  return `O banco está na versão ${status.current} e este site espera a ${status.expected}. Rode no SQL Editor do Supabase os arquivos da pasta supabase/ numerados acima de ${String(status.current).padStart(2, '0')}.`;
}
