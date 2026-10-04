import { supabase } from './supabase';

const MAX_PER_SESSION = 10;
const seen = new Set();
let sent = 0;

// Monta o registro no formato (e limites) da tabela error_log. Devolve null se for ruído que não vale anotar.
export function buildErrorEntry(err, source = 'window', ctx = {}) {
  const raw = err instanceof Error ? err.message : (typeof err === 'string' ? err : err?.message);
  const message = String(raw ?? '').trim().slice(0, 500);
  if (!message) return null;
  // ruídos comuns que não são bugs do site
  if (/ResizeObserver loop|^Script error\.?$|Load failed$|Failed to fetch$|NetworkError/i.test(message)) return null;
  return {
    source,
    message,
    stack: err?.stack ? String(err.stack).slice(0, 4000) : null,
    page: String(ctx.page ?? '').slice(0, 300) || null,
    user_agent: String(ctx.userAgent ?? '').slice(0, 300) || null,
  };
}

// Anota o erro no banco (no máximo 10 por visita, sem repetir a mesma mensagem). Nunca lança erro.
export async function reportError(err, source = 'window') {
  try {
    const entry = buildErrorEntry(err, source, {
      page: typeof location !== 'undefined' ? location.pathname : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });
    if (!entry || seen.has(entry.message) || sent >= MAX_PER_SESSION) return;
    seen.add(entry.message); sent++;
    await supabase.from('error_log').insert(entry);
  } catch { /* o log nunca pode derrubar o site */ }
}

export function installErrorLogging() {
  window.addEventListener('error', (e) => reportError(e.error || e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
}

export const listErrors = () => supabase.from('error_log').select('id, created_at, source, message, stack, page, user_agent').order('created_at', { ascending: false }).limit(200);
export const clearErrors = () => supabase.from('error_log').delete().not('id', 'is', null);
