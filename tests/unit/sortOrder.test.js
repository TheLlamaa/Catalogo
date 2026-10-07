import { describe, it, expect } from 'vitest';
import { reorderUpdates } from '../../src/lib/sortOrder';

const items = (...orders) => orders.map((sortOrder, i) => ({ id: String.fromCharCode(97 + i), sortOrder }));

describe('ordem manual', () => {
  it('sem mudança, nada para gravar', () => expect(reorderUpdates(items(1, 2, 3), ['a', 'b', 'c'])).toEqual([]));
  it('troca de dois: só os dois mudam', () => {
    expect(reorderUpdates(items(1, 2, 3), ['b', 'a', 'c'])).toEqual([{ id: 'b', sortOrder: 1 }, { id: 'a', sortOrder: 2 }]);
  });
  it('quem nunca teve ordem (0) recebe posição', () => {
    expect(reorderUpdates(items(0, 0), ['a', 'b'])).toEqual([{ id: 'a', sortOrder: 1 }, { id: 'b', sortOrder: 2 }]);
  });
  it('mover para o início desloca os demais', () => {
    expect(reorderUpdates(items(1, 2, 3), ['c', 'a', 'b']).map(u => u.id)).toEqual(['c', 'a', 'b']);
  });
});
