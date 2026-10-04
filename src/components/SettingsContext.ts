import { createContext, useContext } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '../lib/settings';

// Os padrões cobrem todas as chaves de Settings; o cast só informa isso ao compilador
export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS as unknown as Settings);

// Textos e menus do site, já com o que o admin personalizou
export const useSettings = () => useContext(SettingsContext);
