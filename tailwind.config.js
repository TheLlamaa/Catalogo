/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

// Cores por variáveis CSS, para o site ter tema (cor principal escolhida no painel) e modo escuro
// sem trocar classes nos componentes:
// - "blue" é a cor principal: lê --c-blue-* (definidas em index.css e trocadas pelo painel em Site > Aparência).
// - cinzas, branco e as cores de aviso (vermelho, verde, âmbar...) invertem no modo escuro (classe .dark no <html>).
//   Ex.: bg-white vira a superfície escura, text-gray-900 vira texto claro, bg-red-50 vira um vermelho bem escuro.
// - "slate" NÃO inverte: é usada de propósito em partes sempre escuras (cabeçalho do painel).
// - text-white continua branco (texto sobre botões coloridos).
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const HUES = ['gray', 'red', 'green', 'amber', 'emerald', 'yellow', 'purple'];
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `${n >> 16} ${(n >> 8) & 255} ${n & 255}`; };
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

// Modo escuro: espelha a escala (50↔950...), mas mantém 500/600 (fundos de botão com texto branco)
const DARK_STEP = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 500, 500: 500, 600: 600, 700: 300, 800: 200, 900: 100, 950: 50 };
// Cinzas escuros próprios (azulados, mais confortáveis que o cinza puro invertido)
const DARK_GRAY = { 50: '#1a2230', 100: '#222b3a', 200: '#2e3848', 300: '#3d4859', 400: '#6b7788', 500: '#9aa4b4', 600: '#b3bcc9', 700: '#ccd3dd', 800: '#e1e6ec', 900: '#f1f4f7', 950: '#f9fafb' };

const palette = (hue) => Object.fromEntries(STEPS.map(s => [s, v(`--${hue}-${s}`)]));
const primary = Object.fromEntries(STEPS.filter(s => s !== 950).map(s => [s, v(`--p-${s}`)]));

const lightVars = {}; const darkVars = {};
for (const hue of HUES) for (const s of STEPS) {
  lightVars[`--${hue}-${s}`] = rgb(colors[hue][s]);
  darkVars[`--${hue}-${s}`] = hue === 'gray' ? rgb(DARK_GRAY[s]) : rgb(colors[hue][DARK_STEP[s]]);
}
// Cor principal: claras viram tons escuros da própria cor; textos escuros viram claros
const P_DARK = { 50: 900, 100: 800, 200: 700, 300: 600, 400: 400, 500: 500, 600: 600, 700: 300, 800: 200, 900: 100 };
// --d-blue-*: versão clareada da cor principal para o modo escuro, quando ela é escura demais (lib/theme.ts → darkModeBase)
for (const s of STEPS.filter(x => x !== 950)) { lightVars[`--p-${s}`] = `var(--c-blue-${s})`; darkVars[`--p-${s}`] = `var(--d-blue-${P_DARK[s]}, var(--c-blue-${P_DARK[s]}))`; }
lightVars['--white'] = '255 255 255'; darkVars['--white'] = rgb('#151c27');

// Texto colorido médio (links, preços, "Excluir"): no escuro fica no tom 400, para ter contraste.
// Fundo bg-*-600 continua igual (botões com texto branco).
const darkText = {};
for (const hue of [...HUES.filter(h => h !== 'gray'), 'blue']) for (const s of [500, 600, 700]) {
  // cor principal: tom 300 (lê bem tanto na superfície escura quanto sobre o fundo bg-blue-50 escurecido)
  const to = hue === 'blue' ? 'var(--d-blue-300, var(--c-blue-300))' : rgb(colors[hue][s === 700 ? 300 : 400]);
  darkText[`:root.dark .text-${hue}-${s}, :root.dark .hover\\:text-${hue}-${s}:hover`] = { color: `rgb(${to})` };
}

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { blue: primary, white: v('--white'), ...Object.fromEntries(HUES.map(h => [h, palette(h)])) },
      textColor: { white: 'rgb(255 255 255 / <alpha-value>)' },
      borderRadius: { xl: 'var(--radius-xl)' },
      fontFamily: { sans: ['var(--font-body)', ...defaultTheme.fontFamily.sans] },
    },
  },
  plugins: [
    plugin(({ addBase }) => addBase({ ':root': lightVars, ':root.dark': { ...darkVars, colorScheme: 'dark' }, ...darkText })),
  ],
}
