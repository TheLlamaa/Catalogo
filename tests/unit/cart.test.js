import { describe, it, expect, beforeEach } from 'vitest';
import { lineKey, loadCart, saveCart } from '../../src/lib/cart';

// Navegador de mentira só com o que o carrinho usa
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};
beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe('carrinho', () => {
  it('a chave da linha não depende da ordem das opções', () => {
    expect(lineKey('p1', { Cor: 'Azul', Tam: 'M' })).toBe(lineKey('p1', { Tam: 'M', Cor: 'Azul' }));
    expect(lineKey('p1', { Cor: 'Azul' })).not.toBe(lineKey('p1', { Cor: 'Preto' }));
    expect(lineKey('p1')).toBe('p1|');
  });
  it('salva só id, quantidade e opções (nunca preço)', () => {
    saveCart([{ key: 'k', id: 'p1', quantity: 2, options: { Cor: 'Azul' }, product: { price: 99 }, price: 99 }]);
    const saved = JSON.parse(store['catalogo-cart-v1']);
    expect(saved).toEqual([{ id: 'p1', quantity: 2, options: { Cor: 'Azul' } }]);
  });
  it('lê de volta e recria a chave', () => {
    saveCart([{ id: 'p1', quantity: 2, options: { Cor: 'Azul' } }]);
    expect(loadCart()).toEqual([{ key: 'p1|Cor=Azul', id: 'p1', quantity: 2, options: { Cor: 'Azul' } }]);
  });
  it('ignora lixo guardado no navegador', () => {
    store['catalogo-cart-v1'] = JSON.stringify([
      { id: 'ok', quantity: 1 }, { id: 'neg', quantity: -1 }, { id: 'frac', quantity: 1.5 },
      { quantity: 3 }, null, { id: 'opt', quantity: 1, options: ['x'] }
    ]);
    const ids = loadCart().map(l => l.id);
    expect(ids).toEqual(['ok', 'opt']);
    expect(loadCart()[1].options).toEqual({});
  });
  it('JSON quebrado ou não-lista dá carrinho vazio', () => {
    store['catalogo-cart-v1'] = '{';
    expect(loadCart()).toEqual([]);
    store['catalogo-cart-v1'] = '{"a":1}';
    expect(loadCart()).toEqual([]);
  });
  it('limita a 50 linhas', () => {
    store['catalogo-cart-v1'] = JSON.stringify(Array.from({ length: 80 }, (_, i) => ({ id: `p${i}`, quantity: 1 })));
    expect(loadCart()).toHaveLength(50);
  });
});
