export const BUCKET = 'fotos_produtos';

// URL da miniatura, quando a foto está no nosso bucket. Fotos antigas não têm miniatura:
// o componente ProductImage volta para a foto grande se a miniatura não existir.
export const thumbUrl = <T>(url: T): T | string => (
  typeof url === 'string' && url.includes(`/${BUCKET}/`) && /\.jpg$/.test(url) && !/_t\.jpg$/.test(url)
    ? url.replace(/\.jpg$/, '_t.jpg')
    : url
);
