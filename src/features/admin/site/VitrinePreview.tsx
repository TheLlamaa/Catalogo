import { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, RotateCw, Smartphone, X } from 'lucide-react';
import Dialog from '../../../components/Dialog';
import { PREVIEW_MSG, PREVIEW_READY } from '../../../lib/preview';
import type { SettingRow } from '../../../types';

// Prévia ao vivo: a vitrine de verdade num iframe (/?preview=1), recebendo o rascunho a cada mudança.
// No computador largo fica fixa ao lado do formulário; em telas menores abre numa janela.
interface VitrinePreviewProps {
  rows: SettingRow[];
  docked: boolean;
  onClose: () => void;
}

const PHONE_W = 390;
const DESKTOP_W = 1280;

export default function VitrinePreview({ rows, docked, onClose }: VitrinePreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; });
  const [device, setDevice] = useState<'celular' | 'computador'>('celular');
  const [boxW, setBoxW] = useState(PHONE_W);
  const [reloadKey, setReloadKey] = useState(0);

  const send = useCallback(() => frameRef.current?.contentWindow?.postMessage({ type: PREVIEW_MSG, rows: rowsRef.current }, window.location.origin), []);

  // A vitrine avisa quando carregou; aí recebe o rascunho atual
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.type === PREVIEW_READY) send();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [send]);

  // A cada mudança no formulário (com uma pequena espera para não piscar enquanto digita)
  useEffect(() => {
    if (!rows) return;
    const t = setTimeout(send, 150);
    return () => clearTimeout(t);
  }, [rows, send]);

  // Largura disponível, para encolher a vitrine de computador até caber
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBoxW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frameW = device === 'celular' ? PHONE_W : DESKTOP_W;
  const scale = Math.min(1, boxW / frameW);

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-gray-900">Prévia da vitrine</h2>
        <div className="flex items-center gap-1">
          <div role="group" aria-label="Tamanho da prévia" className="flex rounded-md border border-gray-300 p-0.5">
            {([['celular', Smartphone, 'Celular'], ['computador', Monitor, 'Computador']] as const).map(([id, Icon, label]) => (
              <button
                key={id} type="button" onClick={() => setDevice(id)} aria-pressed={device === id} title={label}
                className={`rounded px-2 py-1 ${device === id ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setReloadKey(k => k + 1)} title="Recarregar a prévia" className="rounded p-1.5 text-gray-500 hover:text-gray-800">
            <RotateCw className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Recarregar a prévia</span>
          </button>
          <button type="button" onClick={onClose} title="Fechar a prévia" className="rounded p-1.5 text-gray-500 hover:text-gray-800">
            <X className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Fechar a prévia</span>
          </button>
        </div>
      </div>
      <p className="px-3 py-1.5 text-xs text-gray-500">Mostra o que ainda não foi publicado. Dá para navegar; pedidos não são enviados daqui.</p>
      <div ref={boxRef} className="relative flex-1 overflow-hidden bg-gray-100">
        {/* É a nossa própria vitrine (mesma origem): o sandbox serve só para ela não navegar o painel nem abrir janelas sem querer */}
        <iframe
          key={reloadKey} ref={frameRef} src="/?preview=1"
          // eslint-disable-next-line react/iframe-missing-sandbox -- precisa da mesma origem para trocar mensagens com o painel
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          title="Prévia da vitrine com as alterações não publicadas"
          className="absolute left-1/2 top-0 origin-top border-0 bg-white"
          style={{ width: frameW, height: `${100 / scale}%`, transform: `translateX(-50%) scale(${scale})` }}
        />
      </div>
    </div>
  );

  if (docked) {
    return (
      <aside aria-label="Prévia da vitrine" className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {body}
      </aside>
    );
  }
  return (
    <Dialog label="Prévia da vitrine" onClose={onClose} panelClassName="h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
      {body}
    </Dialog>
  );
}
