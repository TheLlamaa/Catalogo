// Monta o registro no formato (e limites) da tabela error_log. Devolve null se for ruído que não vale anotar.
export interface ErrorEntry {
  source: string;
  message: string;
  stack: string | null;
  page: string | null;
  user_agent: string | null;
}

export function buildErrorEntry(
  err: unknown,
  source = 'window',
  ctx: { page?: string; userAgent?: string } = {},
): ErrorEntry | null {
  const e = err as { message?: unknown; stack?: unknown } | null | undefined;
  const raw = err instanceof Error ? err.message : (typeof err === 'string' ? err : e?.message);
  const message = String(raw ?? '').trim().slice(0, 500);
  if (!message) return null;
  // ruídos comuns que não são bugs do site
  if (/ResizeObserver loop|^Script error\.?$|Load failed$|Failed to fetch$|NetworkError/i.test(message)) return null;
  return {
    source,
    message,
    stack: e?.stack ? String(e.stack).slice(0, 4000) : null,
    page: String(ctx.page ?? '').slice(0, 300) || null,
    user_agent: String(ctx.userAgent ?? '').slice(0, 300) || null,
  };
}
