import { NICHE } from './niche';
import { normalizeWhatsapp } from './whatsapp';
// ---------------------------------------------------------------------------
// Configurações opcionais da loja (variáveis de ambiente, definidas no build)
// ---------------------------------------------------------------------------
export const STORE_NAME = import.meta.env.VITE_STORE_NAME || NICHE.storeName;
export const STORE_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

// WhatsApp da loja: aceita com ou sem 55. Ex: 5548999999999 ou (48) 99999-9999
export const STORE_WHATSAPP = normalizeWhatsapp(import.meta.env.VITE_WHATSAPP_NUMBER);

// Ambiente de teste: quando definido (ex.: "Ambiente de teste"), o site mostra uma faixa de aviso para ninguém confundir com o site real.
export const ENV_LABEL = String(import.meta.env.VITE_AMBIENTE_LABEL || '').trim().slice(0, 60);
