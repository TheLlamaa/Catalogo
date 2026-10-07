export const BUCKET = 'fotos_produtos';

// Foto grande e miniatura: a miniatura tem o mesmo nome com "_t" antes do ".jpg". Quem cria (upload) e quem lê
// (thumbUrl) usam as funções daqui, para a convenção ficar num lugar só.
const THUMB_SUFFIX = '_t';
export const thumbPath = (path: string): string => path.replace(/\.jpg$/, `${THUMB_SUFFIX}.jpg`);

// URL da miniatura, quando a foto está no nosso bucket. Fotos antigas não têm miniatura:
// o componente ProductImage volta para a foto grande se a miniatura não existir.
export const thumbUrl = <T>(url: T): T | string => (
  typeof url === 'string' && url.includes(`/${BUCKET}/`) && /\.jpg$/.test(url) && !/_t\.jpg$/.test(url)
    ? thumbPath(url)
    : url
);

// Tamanhos por uso: lado maior em px e qualidade (0 a 1)
export const IMAGE_PRESETS = {
  product: { max: 1200, quality: 0.85 }, // foto do produto
  thumb: { max: 400, quality: 0.8 }, // miniatura do produto
  site: { max: 1200, quality: 0.88 }, // logo, faixa, página Sobre
  reference: { max: 800, quality: 0.8 }, // foto de referência do pedido personalizado (o banco aceita até ~700 mil caracteres)
} as const;
export type ImagePreset = { max: number; quality: number };

// Cabe a imagem em um quadrado de `max` px, mantendo a proporção; nunca aumenta.
export const fitWithin = (width: number, height: number, max: number): { width: number; height: number } => {
  if (width > height && width > max) return { width: max, height: Math.round(height * max / width) };
  if (height > max) return { width: Math.round(width * max / height), height: max };
  return { width, height };
};
