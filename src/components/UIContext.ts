import { createContext, useContext } from 'react';
import type { UIApi } from '../types';

export const UIContext = createContext<UIApi | null>(null);

// toast.success / toast.error / toast.info e confirm({ title, message, confirmLabel, danger }) -> Promise<boolean>
export const useUI = (): UIApi => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI precisa estar dentro do UIProvider');
  return ctx;
};
