import { createContext, useContext } from 'react';

export const UIContext = createContext(null);

// toast.success / toast.error / toast.info e confirm({ title, message, confirmLabel, danger }) -> Promise<boolean>
export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI precisa estar dentro do UIProvider');
  return ctx;
};
