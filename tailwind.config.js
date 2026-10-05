/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

// A paleta "blue" lê variáveis CSS (definidas em index.css). O admin escolhe a cor principal
// em Site > Aparência e o site inteiro acompanha, sem trocar nenhuma classe nos componentes.
const blue = Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(
  s => [s, `rgb(var(--c-blue-${s}) / <alpha-value>)`]
));

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { blue },
      borderRadius: { xl: 'var(--radius-xl)' },
      fontFamily: { sans: ['var(--font-body)', ...defaultTheme.fontFamily.sans] },
    },
  },
  plugins: [],
}
