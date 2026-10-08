// Orientação de tamanho para cada campo de imagem do painel. Os números vêm de como a imagem aparece no site
// (largura máxima exibida × 2 para telas de alta densidade, arredondada).

export type ImageGuideKey = 'hero' | 'logo' | 'wordmark' | 'favicon' | 'banner' | 'about' | 'share' | 'product' | 'reference';

export interface ImageGuide {
  text: string;   // "Tamanho ideal: ..."
  note?: string;  // o que é cortado e onde manter o conteúdo importante
  maxPx: number;  // maior lado aceito no envio (acima disso o site reduz)
}

export const IMAGE_GUIDES: Record<ImageGuideKey, ImageGuide> = {
  hero: {
    text: 'Tamanho ideal: 1600 × 500 px (proporção 16:5) · JPG ou WebP · até 300 KB',
    note: 'No celular as laterais são cortadas: mantenha o assunto no centro. O título e o texto da loja aparecem sobre a parte de baixo.',
    maxPx: 1600
  },
  logo: {
    text: 'Tamanho ideal: 768 × 192 px (proporção 4:1) · PNG com fundo transparente ou SVG · até 100 KB',
    note: 'Logo quadrada também serve; ela é ajustada à altura escolhida abaixo (computador e celular separados).',
    maxPx: 800
  },
  wordmark: {
    text: 'Tamanho ideal: 800 × 160 px (proporção 5:1) · PNG com fundo transparente ou SVG · até 100 KB',
    note: 'Corte bem rente às letras: sobra de fundo deixa o nome menor do que parece. Ela é ajustada à altura escolhida abaixo.',
    maxPx: 800
  },
  favicon: {
    text: 'Tamanho ideal: 256 × 256 px (proporção 1:1) · PNG com fundo transparente ou SVG · até 50 KB',
    note: 'Aparece bem pequeno (16 a 32 px) na aba do navegador: use um desenho simples e centralizado.',
    maxPx: 256
  },
  banner: {
    text: 'Tamanho ideal: 1920 × 120 px (proporção 16:1) · JPG ou WebP · até 150 KB',
    note: 'A faixa é baixa (uns 40 px) e a imagem é cortada em cima e embaixo: só a parte do meio aparece. Use textura ou degradê, sem detalhes importantes. A cor da faixa é aplicada por cima para o texto ficar legível.',
    maxPx: 1920
  },
  about: {
    text: 'Tamanho ideal: 1200 × 640 px (proporção 15:8) · JPG ou WebP · até 300 KB',
    note: 'A altura máxima na página é 320 px: imagens mais altas são cortadas em cima e embaixo. Mantenha o assunto no centro.',
    maxPx: 1200
  },
  share: {
    text: 'Tamanho ideal: 1200 × 630 px (proporção 40:21) · JPG · até 300 KB',
    note: 'Algumas redes cortam as bordas: mantenha o conteúdo no centro. Acima de 300 KB o WhatsApp pode não mostrar a prévia.',
    maxPx: 1200
  },
  product: {
    text: 'Tamanho ideal: 800 × 800 px (proporção 1:1) · JPG ou WebP · até 300 KB',
    note: 'A foto é quadrada e cortada para preencher o card: mantenha o produto no centro, com folga nas bordas. Fotos maiores são reduzidas para 1200 px automaticamente.',
    maxPx: 1200
  },
  reference: {
    text: 'Tamanho ideal: até 800 px no lado maior (qualquer proporção) · JPG ou PNG · até 5 MB',
    note: 'A foto é reduzida automaticamente e só você a vê no painel de pedidos.',
    maxPx: 800
  }
};
