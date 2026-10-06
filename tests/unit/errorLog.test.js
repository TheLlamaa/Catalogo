import { describe, it, expect } from 'vitest';
import { buildErrorEntry } from '../../src/lib/errorLog';

describe('registro de erros', () => {
  it('monta o registro com contexto', () => {
    const e = new Error('Quebrou'); 
    const r = buildErrorEntry(e, 'react', { page: '/admin', userAgent: 'UA' });
    expect(r).toMatchObject({ source: 'react', message: 'Quebrou', page: '/admin', user_agent: 'UA' });
    expect(r.stack).toContain('Quebrou');
  });
  it('aceita texto puro e objeto com message', () => {
    expect(buildErrorEntry('falhou').message).toBe('falhou');
    expect(buildErrorEntry({ message: 'x' }).message).toBe('x');
  });
  it('respeita os limites do banco', () => {
    const r = buildErrorEntry(new Error('a'.repeat(900)), 'window', { page: 'p'.repeat(900), userAgent: 'u'.repeat(900) });
    expect(r.message).toHaveLength(500);
    expect(r.page).toHaveLength(300);
    expect(r.user_agent).toHaveLength(300);
    expect(r.stack.length).toBeLessThanOrEqual(4000);
  });
  it('ignora vazio e ruídos que não são bugs do site', () => {
    expect(buildErrorEntry('')).toBeNull();
    expect(buildErrorEntry(undefined)).toBeNull();
    expect(buildErrorEntry('ResizeObserver loop completed with undelivered notifications.')).toBeNull();
    expect(buildErrorEntry('Script error.')).toBeNull();
    expect(buildErrorEntry(new TypeError('Failed to fetch'))).toBeNull();
  });
});

import { isStaleChunkError, reloadForNewVersion } from '../../src/lib/staleChunk';

describe('versão nova publicada com o site aberto', () => {
  const msg = 'Failed to fetch dynamically imported module: https://catalogo-teste.brndamian.workers.dev/assets/AdminView-BqB2b7Gr.js';
  it('reconhece o erro de arquivo de tela que sumiu (Chrome, Safari, Firefox)', () => {
    expect(isStaleChunkError(new TypeError(msg))).toBe(true);
    expect(isStaleChunkError('Importing a module script failed.')).toBe(true);
    expect(isStaleChunkError({ message: 'error loading dynamically imported module: /assets/x.js' })).toBe(true);
    expect(isStaleChunkError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
  it('não vai para a lista de erros do site', () => {
    expect(buildErrorEntry(new TypeError(msg), 'react')).toBeNull();
  });
  it('recarrega uma vez só (sem laço se o arquivo faltar de verdade)', () => {
    const store = {};
    let reloads = 0;
    globalThis.sessionStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
    globalThis.window = { location: { reload: () => { reloads++; } } };
    expect(reloadForNewVersion(1_000_000)).toBe(true);
    expect(reloadForNewVersion(1_005_000)).toBe(true); // já está recarregando: não recarrega de novo
    expect(reloads).toBe(1);
    delete globalThis.sessionStorage; delete globalThis.window;
  });
});
