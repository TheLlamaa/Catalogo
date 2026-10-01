import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Pilha de diálogos abertos: só o de cima reage ao Esc e ao Tab
const stack = [];

// Janela (modal) ou gaveta lateral: fecha com Esc ou clique fora, prende o foco
// dentro dela e devolve o foco ao elemento que a abriu.
export default function Dialog({ onClose, label, variant = 'modal', zClass = 'z-50', panelClassName = '', children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const token = Symbol('dialog');
    stack.push(token);
    const panel = panelRef.current;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () => [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    (focusables()[0] || panel).focus();

    const onKeyDown = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); panel.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (active === first || active === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      document.body.style.overflow = previousOverflow;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
  }, []);

  const overlay = variant === 'drawer'
    ? `fixed inset-0 ${zClass} flex justify-end bg-black/40 backdrop-blur-sm`
    : `fixed inset-0 ${zClass} flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm`;

  return (
    <div className={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={`outline-none ${panelClassName}`}>
        {children}
      </div>
    </div>
  );
}
