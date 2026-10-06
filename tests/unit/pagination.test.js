import { describe, it, expect } from 'vitest';
import { paginate, pageButtons } from '../../src/lib/pagination';

const list = Array.from({ length: 32 }, (_, i) => i + 1);

describe('paginação', () => {
  it('divide em páginas e informa o intervalo', () => {
    const p = paginate(list, 1, 10);
    expect(p.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(p).toMatchObject({ page: 1, pages: 4, total: 32, from: 1, to: 10 });
  });
  it('última página tem o resto', () => {
    const p = paginate(list, 4, 10);
    expect(p.items).toEqual([31, 32]);
    expect(p).toMatchObject({ from: 31, to: 32 });
  });
  it('ajusta página fora do limite', () => {
    expect(paginate(list, 99, 10).page).toBe(4);
    expect(paginate(list, 0, 10).page).toBe(1);
    expect(paginate(list, -3, 10).page).toBe(1);
  });
  it('lista vazia: 1 página, sem intervalo', () => {
    expect(paginate([], 1, 10)).toMatchObject({ items: [], page: 1, pages: 1, total: 0, from: 0, to: 0 });
  });
  it('tamanho inválido cai no padrão', () => {
    expect(paginate(list, 1, 0).items).toHaveLength(10);
    expect(paginate(list, 1, NaN).items).toHaveLength(10);
  });
  it('botões: poucas páginas mostram todas', () => {
    expect(pageButtons(1, 4)).toEqual([1, 2, 3, 4]);
  });
  it('botões: muitas páginas usam reticências', () => {
    expect(pageButtons(1, 12)).toEqual([1, 2, 3, 4, null, 12]);
    expect(pageButtons(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
    expect(pageButtons(12, 12)).toEqual([1, null, 9, 10, 11, 12]);
  });
});

import { moveId } from '../../src/hooks/useDragReorder';
describe('arrastar para reordenar (moveId)', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('arrastar para baixo ocupa o lugar do alvo', () => expect(moveId(ids, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']));
  it('arrastar para cima ocupa o lugar do alvo', () => expect(moveId(ids, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']));
  it('soltar em si mesmo não muda nada', () => expect(moveId(ids, 'b', 'b')).toBe(ids));
  it('id desconhecido não muda nada', () => expect(moveId(ids, 'x', 'b')).toBe(ids));
});
