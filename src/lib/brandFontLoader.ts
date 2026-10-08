// Carrega sob demanda os arquivos da fonte escolhida para o nome da loja (só o alfabeto latino e só o peso usado).
// Cada fonte vira um arquivo separado no build: quem não usa, não baixa.
import { BRAND_FONTS, nearestWeight } from './brand';

// O Vite só separa arquivos de import() escritos por extenso, por isso a lista completa
const FILES: Record<string, () => Promise<unknown>> = {
  'poppins-400': () => import('@fontsource/poppins/latin-400.css'),
  'poppins-500': () => import('@fontsource/poppins/latin-500.css'),
  'poppins-600': () => import('@fontsource/poppins/latin-600.css'),
  'poppins-700': () => import('@fontsource/poppins/latin-700.css'),
  'poppins-800': () => import('@fontsource/poppins/latin-800.css'),
  'poppins-900': () => import('@fontsource/poppins/latin-900.css'),
  'montserrat-400': () => import('@fontsource/montserrat/latin-400.css'),
  'montserrat-500': () => import('@fontsource/montserrat/latin-500.css'),
  'montserrat-600': () => import('@fontsource/montserrat/latin-600.css'),
  'montserrat-700': () => import('@fontsource/montserrat/latin-700.css'),
  'montserrat-800': () => import('@fontsource/montserrat/latin-800.css'),
  'montserrat-900': () => import('@fontsource/montserrat/latin-900.css'),
  'space-grotesk-400': () => import('@fontsource/space-grotesk/latin-400.css'),
  'space-grotesk-500': () => import('@fontsource/space-grotesk/latin-500.css'),
  'space-grotesk-600': () => import('@fontsource/space-grotesk/latin-600.css'),
  'space-grotesk-700': () => import('@fontsource/space-grotesk/latin-700.css'),
  'fredoka-400': () => import('@fontsource/fredoka/latin-400.css'),
  'fredoka-500': () => import('@fontsource/fredoka/latin-500.css'),
  'fredoka-600': () => import('@fontsource/fredoka/latin-600.css'),
  'fredoka-700': () => import('@fontsource/fredoka/latin-700.css'),
  'playfair-display-400': () => import('@fontsource/playfair-display/latin-400.css'),
  'playfair-display-500': () => import('@fontsource/playfair-display/latin-500.css'),
  'playfair-display-600': () => import('@fontsource/playfair-display/latin-600.css'),
  'playfair-display-700': () => import('@fontsource/playfair-display/latin-700.css'),
  'playfair-display-800': () => import('@fontsource/playfair-display/latin-800.css'),
  'playfair-display-900': () => import('@fontsource/playfair-display/latin-900.css'),
  'abril-fatface-400': () => import('@fontsource/abril-fatface/latin-400.css'),
  'bebas-neue-400': () => import('@fontsource/bebas-neue/latin-400.css'),
  'righteous-400': () => import('@fontsource/righteous/latin-400.css'),
  'orbitron-400': () => import('@fontsource/orbitron/latin-400.css'),
  'orbitron-500': () => import('@fontsource/orbitron/latin-500.css'),
  'orbitron-600': () => import('@fontsource/orbitron/latin-600.css'),
  'orbitron-700': () => import('@fontsource/orbitron/latin-700.css'),
  'orbitron-800': () => import('@fontsource/orbitron/latin-800.css'),
  'orbitron-900': () => import('@fontsource/orbitron/latin-900.css'),
  'press-start-2p-400': () => import('@fontsource/press-start-2p/latin-400.css'),
  'pacifico-400': () => import('@fontsource/pacifico/latin-400.css'),
  'lobster-400': () => import('@fontsource/lobster/latin-400.css'),
  'caveat-400': () => import('@fontsource/caveat/latin-400.css'),
  'caveat-500': () => import('@fontsource/caveat/latin-500.css'),
  'caveat-600': () => import('@fontsource/caveat/latin-600.css'),
  'caveat-700': () => import('@fontsource/caveat/latin-700.css'),
};

const loaded = new Set<string>();
export const loadBrandFont = (id: string, weight = 700): void => {
  const font = BRAND_FONTS.find(f => f.id === id);
  if (!font || font.id === 'site') return;
  const key = `${font.id}-${nearestWeight(font, weight)}`;
  if (loaded.has(key) || !FILES[key]) return;
  loaded.add(key);
  FILES[key]().catch(() => loaded.delete(key)); // sem a fonte, o nome aparece na fonte reserva
};

// Painel: mostra o "Aa" de todas as opções na fonte de verdade
export const loadAllBrandFonts = (): void => BRAND_FONTS.forEach(f => loadBrandFont(f.id, 700));
