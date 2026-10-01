import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { UIContext } from './UIContext';
import Dialog from './Dialog';

const TOAST_STYLE = {
  success: { icon: CheckCircle2, cls: 'bg-green-50 border-green-200 text-green-900', iconCls: 'text-green-600' },
  error: { icon: AlertCircle, cls: 'bg-red-50 border-red-200 text-red-900', iconCls: 'text-red-600' },
  info: { icon: Info, cls: 'bg-blue-50 border-blue-200 text-blue-900', iconCls: 'text-blue-600' }
};

export default function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts(list => list.filter(t => t.id !== id)), []);

  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts(list => [...list.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4500);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m)
  }), [push]);

  const confirm = useCallback((options) => new Promise(resolve => setConfirmState({ ...options, resolve })), []);

  const answer = (value) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <UIContext.Provider value={value}>
      {children}

      <div
        role="status" aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none"
      >
        {toasts.map(t => {
          const { icon: Icon, cls, iconCls } = TOAST_STYLE[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-3 border rounded-lg shadow-lg px-4 py-3 text-sm ${cls}`}>
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconCls}`} />
              <span className="flex-1 break-words">{t.message}</span>
              <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <Dialog onClose={() => answer(false)} label={confirmState.title || 'Confirmação'} zClass="z-[70]" panelClassName="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{confirmState.title || 'Tem certeza?'}</h2>
          {confirmState.message && <p className="text-sm text-gray-600 mb-6">{confirmState.message}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={() => answer(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button
              onClick={() => answer(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${confirmState.danger === false ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {confirmState.confirmLabel || 'Excluir'}
            </button>
          </div>
        </Dialog>
      )}
    </UIContext.Provider>
  );
}
