import { describe, it, expect } from 'vitest';
import {
  addCheck, buildOrderPayload, canProceed, cartSummary, fitToStock, increaseCheck, minOrderStatus, unitsInCart,
  validateCustomRequest, validateOrder,
} from '../../src/lib/checkout';

const product = (id, over = {}) => ({ id, title: `P${id}`, price: 10, salePrice: 10, stock: 5, available: 5, active: true, imageUrls: ['a.jpg', 'b.jpg'], ...over });
const line = (id, quantity, options = {}) => ({ key: `${id}|${JSON.stringify(options)}`, id, quantity, options });
const settings = (over = {}) => ({ ordersPaused: false, pausedMessage: 'Pausado.', minOrder: '', deliveryEnabled: true, ...over });
const form = (over = {}) => ({ name: 'Maria', phone: '(48) 99999-1111', deliveryMethod: 'retirada', deliveryAddress: '', notes: '', trap: '', ...over });

describe('estoque do carrinho', () => {
  it('soma as linhas do mesmo produto', () => {
    expect(unitsInCart([line('a', 2, { c: 1 }), line('a', 3, { c: 2 }), line('b', 1)], 'a')).toBe(5);
  });
  it('limita pelo estoque do produto, não por linha (3+3 com estoque 5 vira 3+2)', () => {
    const items = fitToStock([line('a', 3, { c: 1 }), line('a', 3, { c: 2 })], [product('a')]);
    expect(items.map(i => i.quantity)).toEqual([3, 2]);
  });
  it('tira a linha que não cabe mais e o que saiu de linha ou esgotou', () => {
    const lines = [line('a', 5, { c: 1 }), line('a', 2, { c: 2 }), line('inativo', 1), line('zero', 1), line('sumiu', 1)];
    const products = [product('a'), product('inativo', { active: false }), product('zero', { available: 0, stock: 0 })];
    expect(fitToStock(lines, products).map(i => [i.id, i.quantity])).toEqual([['a', 5]]);
  });
  it('sem controle de estoque (available infinito) não limita', () => {
    expect(fitToStock([line('a', 99)], [product('a', { available: Infinity })])[0].quantity).toBe(99);
  });
  it('não deixa adicionar além do estoque somando as opções', () => {
    const lines = [line('a', 3, { c: 1 }), line('a', 2, { c: 2 })];
    expect(addCheck(lines, product('a'))).toContain('apenas 5');
    expect(addCheck([line('a', 1)], product('a'))).toBeNull();
    expect(addCheck([], product('a', { available: 0 }))).toBe('Produto esgotado no momento.');
  });
  it('aumentar a quantidade respeita o estoque; diminuir nunca é bloqueado', () => {
    const lines = [line('a', 3, { c: 1 }), line('a', 2, { c: 2 })];
    expect(increaseCheck(lines, product('a'), 1)).toContain('5 unidades');
    expect(increaseCheck([line('a', 3)], product('a'), 1)).toBeNull();
    expect(increaseCheck(lines, product('a'), -1)).toBeNull();
  });
});

describe('totais e pedido mínimo', () => {
  it('total usa o preço com desconto', () => {
    const items = [{ ...line('a', 2), product: product('a', { salePrice: 7.5 }) }, { ...line('b', 1), product: product('b') }];
    expect(cartSummary(items)).toEqual({ total: 25, count: 3 });
  });
  it('mínimo: diz quanto falta', () => {
    expect(minOrderStatus({ minOrder: '30' }, 20)).toEqual({ minOrder: 30, belowMin: true, shortfall: 10 });
    expect(minOrderStatus({ minOrder: '30,50' }, 30.5).belowMin).toBe(false);
    expect(minOrderStatus({ minOrder: '' }, 0).belowMin).toBe(false);
  });
  it('pausado ou abaixo do mínimo não segue', () => {
    expect(canProceed(settings(), 10)).toBe(true);
    expect(canProceed(settings({ ordersPaused: true }), 10)).toBe(false);
    expect(canProceed(settings({ minOrder: '30' }), 10)).toBe(false);
  });
});

describe('validação do formulário do pedido', () => {
  it('pausado vence tudo', () => expect(validateOrder(form({ name: '' }), settings({ ordersPaused: true }))).toEqual({ ok: false, error: 'Pausado.' }));
  it('nome e WhatsApp obrigatórios', () => expect(validateOrder(form({ phone: '' }), settings())).toMatchObject({ ok: false, error: 'Preencha nome e WhatsApp.' }));
  it('WhatsApp inválido', () => expect(validateOrder(form({ phone: '123456789' }), settings()).error).toContain('WhatsApp válido'));
  it('entrega exige endereço, retirada não', () => {
    expect(validateOrder(form({ deliveryMethod: 'entrega', deliveryAddress: 'Rua' }), settings()).error).toContain('endereço');
    expect(validateOrder(form({ deliveryMethod: 'entrega', deliveryAddress: 'Rua A, 10' }), settings())).toEqual({ ok: true });
    expect(validateOrder(form({ deliveryMethod: 'entrega' }), settings({ deliveryEnabled: false }))).toEqual({ ok: true });
    expect(validateOrder(form(), settings())).toEqual({ ok: true });
  });
  it('campo-isca preenchido é robô, só depois de validar o resto', () => {
    expect(validateOrder(form({ trap: 'x' }), settings())).toEqual({ ok: false, bot: true });
    expect(validateOrder(form({ trap: 'x', name: '' }), settings()).bot).toBeUndefined();
  });
});

describe('solicitação personalizada', () => {
  const req = (over = {}) => ({ name: 'Maria', phone: '(48) 99999-1111', description: 'Um chaveiro', trap: '', ...over });
  it('mesmas regras de pausa, contato e isca', () => {
    expect(validateCustomRequest(req(), settings())).toEqual({ ok: true });
    expect(validateCustomRequest(req(), settings({ ordersPaused: true }))).toEqual({ ok: false, error: 'Pausado.' });
    expect(validateCustomRequest(req({ description: '' }), settings()).error).toContain('descrição');
    expect(validateCustomRequest(req({ description: 'x'.repeat(2001) }), settings()).error).toContain('2000');
    expect(validateCustomRequest(req({ trap: 'x' }), settings())).toEqual({ ok: false, bot: true });
  });
});

describe('corpo do pedido', () => {
  const items = [{ ...line('a', 2, { Cor: 'Azul' }), product: product('a', { salePrice: 8 }) }];
  it('monta os itens (1 foto) e o pedido', () => {
    const { items: lines, order } = buildOrderPayload(items, 16, form({ name: ' Maria ', notes: '  ' }));
    expect(lines).toEqual([{ id: 'a', title: 'Pa', price: 8, quantity: 2, options: { Cor: 'Azul' }, imageUrls: ['a.jpg'] }]);
    expect(order).toMatchObject({ client_name: 'Maria', notes: null, delivery_method: 'retirada', delivery_address: null, total: 16 });
    expect(order.items).toBe(lines);
  });
  it('endereço só vai na entrega', () => {
    expect(buildOrderPayload(items, 16, form({ deliveryMethod: 'entrega', deliveryAddress: ' Rua A ' })).order.delivery_address).toBe('Rua A');
    expect(buildOrderPayload(items, 16, form({ deliveryAddress: 'Rua A' })).order.delivery_address).toBeNull();
  });
});
