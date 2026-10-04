// Carrinho guardado no navegador: só id, quantidade e opções (preço e estoque vêm sempre do banco).
import type { CartLine } from '../types';

const KEY = 'catalogo-cart-v1';

export const lineKey = (id: unknown, options: Record<string, unknown> = {}): string =>
  `${id}|${Object.keys(options).sort().map(k => `${k}=${options[k]}`).join('&')}`;

export const loadCart = (): CartLine[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(l => l && l.id != null && Number.isInteger(l.quantity) && l.quantity > 0)
      .slice(0, 50)
      .map(l => {
        const options = l.options && typeof l.options === 'object' && !Array.isArray(l.options) ? l.options : {};
        return { key: lineKey(l.id, options), id: l.id, quantity: l.quantity, options };
      });
  } catch {
    return [];
  }
};

export const saveCart = (lines: Pick<CartLine, 'id' | 'quantity' | 'options'>[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines.map(({ id, quantity, options }) => ({ id, quantity, options }))));
  } catch {
    /* armazenamento indisponível (aba privada etc.): o carrinho só não persiste */
  }
};
