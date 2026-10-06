import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Cabeçalhos de segurança servidos pela Cloudflare (public/_headers) e o que o CSP exige do site.
const raiz = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const headers = readFileSync(raiz('public/_headers'), 'utf8');
const csp = (headers.match(/Content-Security-Policy:\s*(.+)/) || [])[1] || '';
const diretiva = (nome) => (csp.split(';').map(s => s.trim()).find(s => s.startsWith(`${nome} `)) || '').split(/\s+/).slice(1);

describe('Content-Security-Policy', () => {
  it('existe e vale para todas as páginas', () => {
    expect(headers.startsWith('/*')).toBe(true);
    expect(csp).not.toBe('');
  });
  it('só roda scripts do próprio site (nada inline, nada de fora)', () => {
    expect(diretiva('script-src')).toEqual(["'self'"]);
    expect(diretiva('object-src')).toEqual(["'none'"]);
  });
  it('só o próprio site pode abrir a vitrine dentro de um quadro (prévia do painel); outros sites não', () => {
    expect(diretiva('frame-ancestors')).toEqual(["'self'"]);
    expect(headers).toMatch(/X-Frame-Options: SAMEORIGIN/);
  });
  it('imagens só do site, embutidas ou do Supabase (bloqueia imagem de servidor de terceiros)', () => {
    expect(diretiva('img-src')).toEqual(["'self'", 'data:', 'blob:', 'https://*.supabase.co']);
  });
  it('deixa o site falar com o Supabase (API e tempo real)', () => {
    expect(diretiva('connect-src')).toEqual(expect.arrayContaining(['https://*.supabase.co', 'wss://*.supabase.co']));
  });
  it('index.html não tem script inline', () => {
    const html = readFileSync(raiz('index.html'), 'utf8');
    for (const tag of html.match(/<script\b[^>]*>/gi) || []) expect(tag).toMatch(/\bsrc=/);
  });
});
