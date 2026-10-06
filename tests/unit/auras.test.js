import { describe, it, expect } from 'vitest';
import {
  parseCustomAuras, parseAuraOverrides, auraProps, auraOptions, auraLabel, optionsFor, auraDot,
  MAX_CUSTOM_AURAS, MAX_AURA_COLORS, EMPTY_LIB
} from '../../src/lib/auras';

const neon = { id: 'abc123', name: 'Neon', colors: ['#00FF88', '#0088ff'], strong: true };

describe('auras personalizadas', () => {
  it('lê auras válidas e normaliza as cores', () => {
    const [a] = parseCustomAuras(JSON.stringify([neon]));
    expect(a).toEqual({ id: 'abc123', name: 'Neon', colors: ['#00ff88', '#0088ff'], strong: true });
  });
  it('descarta itens malformados', () => {
    const raw = JSON.stringify([
      neon,
      { ...neon, id: 'X' },                       // id inválido
      { ...neon, id: 'okid1', name: '  ' },       // sem nome
      { ...neon, id: 'okid2', colors: ['#fff'] }, // cor curta e só uma
      { ...neon, id: 'okid3', colors: ['#00ff88'] },
      { ...neon, id: 'okid4', colors: Array(MAX_AURA_COLORS + 1).fill('#00ff88') },
    ]);
    expect(parseCustomAuras(raw).map(a => a.id)).toEqual(['abc123']);
  });
  it(`limita a ${MAX_CUSTOM_AURAS} auras`, () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...neon, id: `id${String(i).padStart(3, '0')}` }));
    expect(parseCustomAuras(JSON.stringify(many))).toHaveLength(MAX_CUSTOM_AURAS);
  });
  it('JSON ruim dá lista vazia', () => {
    expect(parseCustomAuras('{')).toEqual([]);
    expect(parseCustomAuras('{"a":1}')).toEqual([]);
  });
});

describe('ajustes das auras do sistema', () => {
  it('só aceita ids do sistema e campos válidos', () => {
    const raw = JSON.stringify({ gold: { name: 'Ouro', hidden: true }, naoExiste: { name: 'x' }, cyberpunk: { colors: ['#fff'] } });
    expect(parseAuraOverrides(raw)).toEqual({ gold: { name: 'Ouro', hidden: true } });
  });
  it('JSON ruim dá objeto vazio', () => {
    expect(parseAuraOverrides('lixo')).toEqual({});
    expect(parseAuraOverrides('[]')).toEqual({});
  });
});

describe('uso das auras', () => {
  const lib = { custom: [neon].map(a => ({ ...a, colors: a.colors.map(c => c.toLowerCase()) })), overrides: { gold: { hidden: true } } };

  it('aura apagada ou ocultada fica sem brilho', () => {
    expect(auraProps('custom-naoexiste', lib).className).toBe('aura-none');
    expect(auraProps('gold', lib).className).toBe('aura-none');
    expect(auraProps('qualquer', EMPTY_LIB).className).toBe('aura-none');
  });
  it('aura personalizada usa as cores e fecha o ciclo', () => {
    const p = auraProps('custom-abc123', lib);
    expect(p.className).toContain('aura-custom');
    expect(p.className).toContain('aura-glow');
    expect(p.style['--aura-stops']).toBe('#00ff88, #0088ff, #00ff88');
  });
  it('seletor lista as do sistema (sem as ocultas) e as personalizadas', () => {
    const ids = auraOptions(lib).map(o => o.id);
    expect(ids).not.toContain('gold');
    expect(ids).toContain('custom-abc123');
  });
  it('rótulo de aura desconhecida é "Nenhuma"', () => expect(auraLabel('nada', lib)).toBe('Nenhuma'));
  it('o valor atual aparece no seletor mesmo se a aura sumiu', () => {
    expect(optionsFor(lib, 'gold').some(o => o.id === 'gold' && /oculta/.test(o.name))).toBe(true);
    expect(optionsFor(lib, 'custom-sumiu').some(o => o.id === 'custom-sumiu' && o.name === 'Aura removida')).toBe(true);
  });
  it('a bolinha leva o tamanho inline', () => {
    const d = auraDot('custom-abc123', lib, 14);
    expect(d.style.width).toBe(14);
    expect(d.style.height).toBe(14);
    expect(d.className).toContain('aura');
    expect(d.style.borderRadius).toBe('9999px'); // redonda mesmo com cantos "Reto" (a classe .aura segue o arredondamento dos cards)
  });
});
