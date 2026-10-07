import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) => readdirSync(dir).flatMap(n => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
}).filter(f => /\.(js|jsx|ts|tsx)$/.test(f));

describe('arquitetura', () => {
  const files = walk('src');
  it('só src/services conhece o Supabase', () => {
    const offenders = files.filter(f => !f.includes(join('src', 'services')))
      .filter(f => /@supabase\/supabase-js|services\/client/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('só src/services conhece tabelas e colunas do banco (nada de .from() fora)', () => {
    const offenders = files.filter(f => !f.includes(join('src', 'services')))
      .filter(f => /\.from\(['"`]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('catálogo, configurações e pedidos passam pelo gateway (hooks e telas não importam os adapters)', () => {
    const offenders = files.filter(f => !f.includes(join('src', 'services')))
      .filter(f => /services\/(supabaseGateway|memoryGateway|mapping)/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('lib/ não depende de services/ nem de telas', () => {
    const offenders = files.filter(f => f.includes(join('src', 'lib')))
      .filter(f => /from '\.\.\/(services|admin|views|components|hooks)/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
