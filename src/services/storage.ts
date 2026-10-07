import { supabase } from './client';
import { BUCKET, IMAGE_PRESETS, thumbPath } from '../lib/images';
import { loadImage, resizeToBlob } from '../lib/imageResize';

// ---------------------------------------------------------------------------
// Supabase Storage (fotos dos produtos)
// ---------------------------------------------------------------------------

// Envia a foto (1200 px) e uma miniatura (400 px, mesmo nome + "_t").
// Devolve a URL pública da foto grande; a miniatura é derivada por convenção (thumbUrl).
export const uploadProductImage = async (file: Blob) => {
  const img = await loadImage(file);
  const [full, small] = await Promise.all([resizeToBlob(img, IMAGE_PRESETS.product), resizeToBlob(img, IMAGE_PRESETS.thumb)]);
  const id = crypto.randomUUID();
  const send = (path: string, blob: Blob) => supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });

  const big = await send(`${id}.jpg`, full);
  if (big.error) throw big.error;
  const thumb = await send(thumbPath(`${id}.jpg`), small);
  if (thumb.error) console.warn('Miniatura não enviada (a foto grande será usada):', thumb.error.message);

  return supabase.storage.from(BUCKET).getPublicUrl(`${id}.jpg`).data.publicUrl;
};

// Imagem do site (logo, faixa, página Sobre): um único arquivo, sem miniatura.
// PNG/GIF viram PNG e WebP continua WebP (ambos mantêm transparência); as demais viram JPEG; SVG vai como está.
export const uploadSiteImage = async (file: File, max = 1200) => {
  const id = crypto.randomUUID();
  let blob: Blob = file; let ext = 'svg'; let type = 'image/svg+xml';
  if (file.type !== 'image/svg+xml') {
    const img = await loadImage(file);
    const png = /^image\/(png|gif)$/.test(file.type);
    const webp = file.type === 'image/webp';
    type = png ? 'image/png' : webp ? 'image/webp' : 'image/jpeg'; ext = png ? 'png' : webp ? 'webp' : 'jpg';
    blob = await resizeToBlob(img, { max, quality: IMAGE_PRESETS.site.quality }, type);
  } else if (file.size > 300 * 1024) {
    throw new Error('SVG muito grande (máximo 300 KB).');
  }
  const path = `site-${id}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
};
