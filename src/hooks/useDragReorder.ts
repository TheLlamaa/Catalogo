import { useRef, useState } from 'react';
import type { DragEvent } from 'react';

// Arrastar e soltar para reordenar uma lista (produtos, categorias). Recebe a ordem atual (ids) e
// devolve os eventos de cada linha. Ao soltar, chama onReorder com a nova ordem completa.
// As setas ↑↓ continuam existindo: são o caminho por teclado e no celular.
export function moveId(ids: string[], from: string, to: string): string[] {
  const a = ids.indexOf(from);
  const b = ids.indexOf(to);
  if (a < 0 || b < 0 || a === b) return ids;
  const next = ids.filter(id => id !== from);
  next.splice(b, 0, from); // ocupa o lugar do alvo (antes dele se veio de baixo, depois se veio de cima)
  return next;
}

export function useDragReorder(ids: string[], onReorder: (ids: string[]) => unknown, enabled = true) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null); // lido nos eventos (o estado pode ainda não ter renderizado)
  const start = (id: string | null) => { draggingRef.current = id; setDragging(id); };

  const rowProps = (id: string) => (!enabled ? {} : {
    draggable: true,
    onDragStart: (e: DragEvent) => { start(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); },
    onDragOver: (e: DragEvent) => { if (!draggingRef.current) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== id) setOver(id); },
    onDragLeave: () => { if (over === id) setOver(null); },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const from = draggingRef.current || e.dataTransfer.getData('text/plain');
      start(null); setOver(null);
      if (from && from !== id) onReorder(moveId(ids, from, id));
    },
    onDragEnd: () => { start(null); setOver(null); },
  });

  // Classe de destaque: linha sendo arrastada fica apagada; alvo ganha uma linha azul
  const rowClass = (id: string) => (dragging === id ? 'opacity-40' : over === id && dragging ? 'outline outline-2 -outline-offset-2 outline-blue-400 bg-blue-50/50' : '');

  return { rowProps, rowClass, dragging };
}
