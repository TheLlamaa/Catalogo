import { NICHE } from './niche';
// ---------------------------------------------------------------------------
// Configurações opcionais da loja (variáveis de ambiente, definidas no build)
// ---------------------------------------------------------------------------
export const STORE_NAME = import.meta.env.VITE_STORE_NAME || NICHE.storeName;
export const STORE_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

// WhatsApp da loja: aceita com ou sem 55. Ex: 5548999999999 ou (48) 99999-9999
const rawWhats = String(import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');
export const STORE_WHATSAPP = rawWhats.length === 10 || rawWhats.length === 11 ? `55${rawWhats}` : rawWhats;

// Ambiente de teste: quando definido (ex.: "Ambiente de teste"), o site mostra uma faixa de aviso para ninguém confundir com o site real.
export const ENV_LABEL = String(import.meta.env.VITE_AMBIENTE_LABEL || '').trim().slice(0, 60);
