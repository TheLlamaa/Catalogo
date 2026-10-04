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
