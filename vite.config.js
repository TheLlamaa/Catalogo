import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Arquivos em assets/v2/: quem ficou com um arquivo antigo guardado no navegador (o fallback do site respondeu
        // index.html no lugar de um script durante um deploy) passa a buscar endereços novos, nunca guardados.
        entryFileNames: 'assets/v2/[name]-[hash].js',
        chunkFileNames: 'assets/v2/[name]-[hash].js',
        assetFileNames: 'assets/v2/[name]-[hash][extname]',
        // Bibliotecas de terceiros em arquivos próprios: mudam pouco e ficam em cache entre deploys.
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
