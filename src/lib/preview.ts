import { useEffect, useRef, useState } from 'react';
import type { SettingRow } from '../types';

// Prévia ao vivo da vitrine dentro do painel (Site → "Ver prévia").
// O painel abre a vitrine num iframe em /?preview=1 e manda o rascunho das configurações por postMessage.
// Só vale dentro de um iframe da mesma origem; a prévia não grava nada (carrinho e pedidos ficam desligados).
export const PREVIEW_MSG = 'catalogo-preview';
export const PREVIEW_READY = 'catalogo-preview-ready';
export const PREVIEW_GOTO = 'catalogo-preview-goto';

// Onde a prévia deve estar para mostrar o campo que o dono está editando
export type PreviewTarget = 'home' | 'cart' | 'product' | 'footer' | 'custom';
const TARGETS: PreviewTarget[] = ['home', 'cart', 'product', 'footer', 'custom'];

export const IS_PREVIEW = typeof window !== 'undefined'
  && window.parent !== window
  && new URLSearchParams(window.location.search).get('preview') === '1';

// Linhas válidas: só pares texto→texto (o mesmo formato que vem da tabela site_settings)
export function cleanRows(data: unknown): SettingRow[] | null {
  if (!Array.isArray(data)) return null;
  return data.filter((r): r is SettingRow => !!r && typeof r.key === 'string' && typeof r.value === 'string').slice(0, 500);
}

// Dentro da prévia: o painel pede para abrir o carrinho, um produto, o rodapé… conforme o campo em edição
export function usePreviewGoto(handler: (target: PreviewTarget) => void): void {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => {
    if (!IS_PREVIEW) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type !== PREVIEW_GOTO || !TARGETS.includes(e.data.target)) return;
      ref.current(e.data.target);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}

// Dentro da prévia: recebe o rascunho do painel (mesma origem e só da janela-mãe)
export function usePreviewRows(): SettingRow[] | null {
  const [rows, setRows] = useState<SettingRow[] | null>(null);
  useEffect(() => {
    if (!IS_PREVIEW) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type !== PREVIEW_MSG) return;
      const next = cleanRows(e.data.rows);
      if (next) setRows(next);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return rows;
}
