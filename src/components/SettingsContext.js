import { createContext, useContext } from 'react';
import { DEFAULT_SETTINGS } from '../lib/settings';

export const SettingsContext = createContext(DEFAULT_SETTINGS);

// Textos e menus do site, já com o que o admin personalizou
export const useSettings = () => useContext(SettingsContext);
