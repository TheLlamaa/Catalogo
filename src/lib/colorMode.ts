import { useCallback, useEffect, useState } from 'react';

// Modo escuro: a pessoa escolhe no botão (sol/lua) e a escolha fica neste navegador.
// Sem escolha, segue o celular/computador (prefers-color-scheme). A classe .dark no <html>
// troca as cores (ver tailwind.config.js). A vitrine pode ser travada no claro pelo painel.
export type ColorPref = 'auto' | 'light' | 'dark';
const KEY = 'catalogo-tema';
const QUERY = '(prefers-color-scheme: dark)';

export function readPref(): ColorPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches;
export const resolveDark = (pref: ColorPref, sysDark: boolean): boolean => (pref === 'auto' ? sysDark : pref === 'dark');

export function applyDark(on: boolean) {
  document.documentElement.classList.toggle('dark', on);
}

// Aplica antes do primeiro desenho (chamado em main.tsx), para não piscar claro → escuro
export function applyInitialColorMode() {
  applyDark(resolveDark(readPref(), systemDark()));
}

// allowed=false: esta tela fica sempre clara (vitrine com o modo escuro desligado no painel)
export function useColorMode(allowed = true) {
  const [pref, setPref] = useState<ColorPref>(readPref);
  const [sys, setSys] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const onChange = () => setSys(mq.matches);
    mq.addEventListener?.('change', onChange);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setPref(readPref()); }; // outra aba trocou
    window.addEventListener('storage', onStorage);
    return () => { mq.removeEventListener?.('change', onChange); window.removeEventListener('storage', onStorage); };
  }, []);

  const dark = allowed && resolveDark(pref, sys);
  useEffect(() => { applyDark(dark); }, [dark]);

  // O botão alterna claro/escuro; se a escolha bate com o aparelho, volta a "seguir o aparelho"
  const toggle = useCallback(() => {
    const next: ColorPref = !dark === sys ? 'auto' : (!dark ? 'dark' : 'light');
    try { if (next === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, next); } catch { /* só não guarda */ }
    setPref(next);
  }, [dark, sys]);

  return { dark, toggle };
}
