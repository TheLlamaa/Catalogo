import { lazy } from 'react';
import type { ComponentType } from 'react';

// Depois de publicar uma versão nova, quem estava com o site aberto ainda tem a página antiga, que
// aponta para arquivos (assets/AdminView-xxxx.js) que não existem mais. Ao abrir uma tela carregada
// sob demanda, o navegador falha com "Failed to fetch dynamically imported module".
// Solução: recarregar a página uma vez, que já busca a versão nova.

const STALE_RE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError/i;
const KEY = 'catalogo-recarregou-versao';

export const isStaleChunkError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String((err as { message?: unknown } | null)?.message ?? err ?? '');
  return STALE_RE.test(msg);
};

// Recarrega no máximo uma vez a cada 30 s (se o arquivo faltar mesmo, não fica em laço)
export function reloadForNewVersion(now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (now - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    return false; // sem sessionStorage não há como evitar laço: deixa a tela de erro oferecer o botão
  }
  window.location.reload();
  return true;
}

// lazy() que, se o arquivo da tela sumiu por causa de uma versão nova, recarrega a página em vez de quebrar
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesmo tipo que o lazy() do React aceita
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => factory().catch((err: unknown) => {
    if (isStaleChunkError(err) && reloadForNewVersion()) return new Promise<{ default: T }>(() => {}); // a página vai recarregar
    throw err;
  }));
}

export function installStaleChunkReload() {
  // Vite avisa quando falha ao pré-carregar um arquivo de outra tela
  window.addEventListener('vite:preloadError', (e) => { if (reloadForNewVersion()) e.preventDefault(); });
}
