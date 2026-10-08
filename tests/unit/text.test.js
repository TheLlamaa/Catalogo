import { describe, it, expect } from 'vitest';
import { normalizeText, matchesQuery } from '../../src/lib/text';

describe('busca sem acento', () => {
  it('ignora acento e maiúsculas', () => {
    expect(normalizeText('Luminária Ção')).toBe('luminaria cao');
    expect(matchesQuery('luminaria', 'Luminária de mesa')).toBe(true);
    expect(matchesQuery('CACTO', 'Vaso cacto')).toBe(true);
  });
  it('todas as palavras precisam aparecer, em qualquer ordem', () => {
    expect(matchesQuery('vaso azul', 'Azul', 'Vaso pequeno')).toBe(true);
    expect(matchesQuery('vaso verde', 'Vaso azul')).toBe(false);
  });
  it('busca vazia combina com tudo; campo vazio não quebra', () => {
    expect(matchesQuery('  ', 'qualquer')).toBe(true);
    expect(matchesQuery('x', undefined, null, '')).toBe(false);
  });
});
