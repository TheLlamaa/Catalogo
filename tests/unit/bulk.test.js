import { describe, it, expect } from 'vitest';
import { adjustedPrice, describeBulk, parsePercent, planBulk, validateBulk } from '../../src/lib/bulk';
import { createMemoryGateway } from '../../src/services/memoryGateway';
import { patchPayload } from '../../src/services/mapping';

const P = (id, over = {}) => ({ id, title: `Produto ${id}`, price: 30, active: true, section: '', categoryIds: ['geral'], discountPercent: 0, imageUrls: [], options: [], stock: 5, ...over });
const ids = (u) => u.map(x => x.id);

describe('edição em massa: regras', () => {
  it('lê porcentagem com vírgula e sinal; recusa texto', () => {
    expect(parsePercent('10')).toBe(10);
    expect(parsePercent(' -7,5 ')).toBe(-7.5);
    expect(parsePercent('+3')).toBe(3);
    expect(parsePercent('abc')).toBeNull();
    expect(parsePercent('')).toBeNull();
  });
  it('reajusta o preço em centavos, sem passar de R$ 0,01 para baixo nem mexer em preço zerado', () => {
    expect(adjustedPrice(30, 10)).toBe(33);
    expect(adjustedPrice(19.9, 7)).toBe(21.29);
    expect(adjustedPrice(0.02, -90)).toBe(0.01);
    expect(adjustedPrice(0, 50)).toBe(0);
  });
  it('valida reajuste e desconto', () => {
    expect(validateBulk({ type: 'price', percent: NaN })).toMatch(/porcentagem/);
    expect(validateBulk({ type: 'price', percent: 0 })).toMatch(/porcentagem/);
    expect(validateBulk({ type: 'price', percent: -95 })).toMatch(/entre/);
    expect(validateBulk({ type: 'price', percent: 10 })).toBeNull();
    expect(validateBulk({ type: 'discount', percent: 95 })).toMatch(/0 e 90/);
    expect(validateBulk({ type: 'discount', percent: 0 })).toBeNull();
    expect(validateBulk({ type: 'category', mode: 'add', categoryId: '' })).toMatch(/categoria/i);
  });
  it('só inclui o que muda e só os marcados', () => {
    const products = [P('a'), P('b', { active: false }), P('c')];
    expect(ids(planBulk(products, ['a', 'b'], { type: 'visibility', active: false }))).toEqual(['a']);
    expect(ids(planBulk(products, ['a', 'b', 'c'], { type: 'visibility', active: true }))).toEqual(['b']);
    expect(planBulk(products, ['a'], { type: 'price', percent: 10 })[0].patch).toEqual({ price: 33 });
    expect(ids(planBulk(products, ['a', 'b'], { type: 'discount', percent: 0 }))).toEqual([]);
    expect(planBulk(products, ['a'], { type: 'discount', percent: 20 })[0].patch).toEqual({ discountPercent: 20 });
    expect(planBulk(products, ['a'], { type: 'section', section: 'destaque' })[0].patch).toEqual({ section: 'destaque' });
  });
  it('categoria: adicionar tira "Geral"; remover a última volta para "Geral"', () => {
    const products = [P('a'), P('b', { categoryIds: ['geral', 'x'] }), P('c', { categoryIds: ['vasos'] })];
    const add = planBulk(products, ['a', 'b', 'c'], { type: 'category', mode: 'add', categoryId: 'vasos', fallbackCategoryId: 'geral' });
    expect(add.map(u => [u.id, u.patch.categoryIds])).toEqual([['a', ['vasos']], ['b', ['x', 'vasos']]]);
    const remove = planBulk(products, ['a', 'c'], { type: 'category', mode: 'remove', categoryId: 'vasos', fallbackCategoryId: 'geral' });
    expect(remove.map(u => [u.id, u.patch.categoryIds])).toEqual([['c', ['geral']]]);
    const semGeral = planBulk(products, ['c'], { type: 'category', mode: 'remove', categoryId: 'vasos', fallbackCategoryId: null });
    expect(semGeral[0].patch.categoryIds).toEqual([]);
  });
  it('a confirmação mostra o exemplo do reajuste', () => {
    const products = [P('a')];
    const updates = planBulk(products, ['a'], { type: 'price', percent: 10 });
    const msg = describeBulk({ type: 'price', percent: 10 }, updates, products);
    expect(msg).toContain('+10%');
    expect(msg).toContain('Produto a');
    expect(msg).toMatch(/30,00/);
    expect(msg).toMatch(/33,00/);
  });
});

describe('edição em massa: gravação', () => {
  const ALL = { ordering: true, discount: true, categoryVisibility: true };
  it('o mapeamento leva categorias e desconto (desconto só se o banco tem a coluna)', () => {
    expect(patchPayload({ categoryIds: ['x'], discountPercent: 15 }, ALL)).toEqual({ category_ids: ['x'], discount_percent: 15 });
    expect(patchPayload({ discountPercent: 15 }, { ...ALL, discount: false })).toEqual({});
  });
  it('patchProducts grava todos e informa quais falharam', async () => {
    const { gateway, state } = createMemoryGateway({ products: [P('a'), P('b')] });
    const ok = await gateway.patchProducts([{ id: 'a', patch: { price: 33 } }, { id: 'b', patch: { active: false } }], { capabilities: ALL });
    expect(ok).toEqual({ error: null, failedIds: [] });
    expect(state.products.map(p => [p.price, p.active])).toEqual([[33, true], [30, false]]);
  });
});
