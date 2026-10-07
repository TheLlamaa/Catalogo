// Ordem manual (produtos e categorias): recebe os ids na nova ordem e devolve só o que mudou de posição (1, 2, 3…).
export function reorderUpdates(current: { id: string; sortOrder: number }[], orderedIds: string[]): { id: string; sortOrder: number }[] {
  const was = new Map(current.map(i => [i.id, i.sortOrder]));
  return orderedIds.map((id, idx) => ({ id, sortOrder: idx + 1 })).filter(u => was.get(u.id) !== u.sortOrder);
}
