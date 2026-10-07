import { describe, it, expect } from 'vitest';
import { availability, badgeFor, effectiveAura, newProducts, relatedProducts, shownAura, stockLevel, NEW_MAX } from '../../src/lib/catalog';

const DAY = 86400000;
const NOW = new Date('2026-10-02T12:00:00Z').getTime();
const ago = (d) => new Date(NOW - d * DAY).toISOString();
const prod = (id, over = {}) => ({ id, active: true, stock: 5, categoryIds: [], badge: '', created_at: ago(100), ...over });

describe('selos', () => {
  it('sem controle de estoque, nunca mostra "Últimas unidades"', () => expect(badgeFor(prod('a', { stock: 2 }), { lowStockBadge: true, stockControl: false })).toBe(''));
  it('o selo manual vence', () => expect(badgeFor(prod('a', { badge: ' Novo ' }), { lowStockBadge: true, stockControl: true })).toBe('Novo'));
  it('"Últimas unidades" automático só se ligado', () => {
    const p = prod('a', { stock: 2 });
    expect(badgeFor(p, { lowStockBadge: true, stockControl: true })).toBe('Últimas unidades');
    expect(badgeFor(p, { lowStockBadge: false })).toBe('');
  });
  it('não marca estoque zerado nem alto', () => {
    expect(badgeFor(prod('a', { stock: 0 }), { lowStockBadge: true, stockControl: true })).toBe('');
    expect(badgeFor(prod('a', { stock: 4 }), { lowStockBadge: true, stockControl: true })).toBe('');
    expect(badgeFor(prod('a', { stock: 3 }), { lowStockBadge: true, stockControl: true })).toBe('Últimas unidades');
  });
});

describe('novidades', () => {
  it('só produtos dos últimos 30 dias', () => {
    const list = [prod('novo', { created_at: ago(2) }), prod('velho1'), prod('velho2')];
    expect(newProducts(list, NOW).map(p => p.id)).toEqual(['novo']);
  });
  it('some se todos são novos (não diz nada)', () => {
    const list = [prod('a', { created_at: ago(1) }), prod('b', { created_at: ago(2) })];
    expect(newProducts(list, NOW)).toEqual([]);
  });
  it('some se nenhum é novo', () => expect(newProducts([prod('a'), prod('b')], NOW)).toEqual([]));
  it(`mostra no máximo ${NEW_MAX}, mesmo com muitos novos`, () => {
    const list = [...Array.from({ length: 20 }, (_, i) => prod(`n${i}`, { created_at: ago(1) })), ...Array.from({ length: 20 }, (_, i) => prod(`v${i}`))];
    expect(newProducts(list, NOW)).toHaveLength(NEW_MAX);
  });
});

describe('relacionados', () => {
  const todos = [
    prod('base', { categoryIds: ['c1', 'c2'] }),
    prod('duas', { categoryIds: ['c1', 'c2'] }),
    prod('uma', { categoryIds: ['c1'] }),
    prod('outra', { categoryIds: ['c3'] }),
    prod('inativo', { categoryIds: ['c1'], active: false }),
    prod('esgotado', { categoryIds: ['c1'], stock: 0 }),
  ];
  const base = todos[0];

  it('nunca inclui o próprio produto, inativos ou de outra categoria', () => {
    const ids = relatedProducts(base, todos).map(p => p.id);
    expect(ids).not.toContain('base');
    expect(ids).not.toContain('inativo');
    expect(ids).not.toContain('outra');
  });
  it('mais categorias em comum primeiro; esgotados por último', () => {
    expect(relatedProducts(base, todos).map(p => p.id)).toEqual(['duas', 'uma', 'esgotado']);
  });
  it('respeita o limite', () => expect(relatedProducts(base, todos, 1)).toHaveLength(1));
  it('sem categoria, sem relacionados', () => expect(relatedProducts(prod('x'), todos)).toEqual([]));
});

describe('estoque exibido', () => {
  const p = (stock, available = stock) => ({ stock, available });
  it('níveis do número guardado', () => {
    expect([0, 1, 3, 4].map(stockLevel)).toEqual(['out', 'low', 'low', 'ok']);
  });
  it('esgotado vem de available; "acabando" só com controle de estoque', () => {
    expect(availability(p(0), true)).toBe('out');
    expect(availability(p(2), true)).toBe('low');
    expect(availability(p(2, Infinity), false)).toBe('ok');
    expect(availability(p(0, Infinity), false)).toBe('ok');
    expect(availability(p(9), true)).toBe('ok');
  });
});

describe('aura do produto', () => {
  const cats = [{ id: 'c1', auraColor: 'none' }, { id: 'c2', auraColor: 'ouro' }, { id: 'c3', auraColor: 'prata' }];
  it('a do produto vence a da categoria', () => expect(effectiveAura({ auraColor: 'neon', categoryIds: ['c2'] }, cats)).toBe('neon'));
  it('herda a primeira categoria com aura', () => {
    expect(effectiveAura({ auraColor: 'inherit', categoryIds: ['c1', 'c3', 'c2'] }, cats)).toBe('ouro');
    expect(effectiveAura({ auraColor: '', categoryIds: ['c2'] }, cats)).toBe('ouro');
  });
  it('"nenhuma" escolhida no produto não herda', () => expect(effectiveAura({ auraColor: 'none', categoryIds: ['c2'] }, cats)).toBe('none'));
  it('sem aura em lugar nenhum, ou auras desligadas: none', () => {
    expect(effectiveAura({ auraColor: 'inherit', categoryIds: ['c1'] }, cats)).toBe('none');
    expect(effectiveAura({ auraColor: 'neon', categoryIds: [] }, cats, false)).toBe('none');
  });
  it('o seletor do painel mantém "inherit" quando nada é herdado', () => {
    expect(shownAura({ auraColor: 'inherit', categoryIds: ['c1'] }, cats)).toBe('inherit');
    expect(shownAura({ auraColor: 'inherit', categoryIds: ['c3'] }, cats)).toBe('prata');
    expect(shownAura({ auraColor: 'neon', categoryIds: ['c3'] }, cats)).toBe('neon');
  });
});
