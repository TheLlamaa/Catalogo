import { supabase } from './client';
import { BUCKET } from '../lib/images';

// ---------------------------------------------------------------------------
// Supabase Storage (fotos dos produtos)
// ---------------------------------------------------------------------------

const loadImage = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Não foi possível ler a imagem.')); };
  img.src = objectUrl;
});

const resizeToBlob = (img, max, quality) => new Promise((resolve, reject) => {
  let { width, height } = img;
  if (width > height && width > max) { height = Math.round(height * max / width); width = max; }
  else if (height > max) { width = Math.round(width * max / height); height = max; }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao comprimir a imagem.'))), 'image/jpeg', quality);
});

// Envia a foto (1200 px) e uma miniatura (400 px, mesmo nome + "_t").
// Devolve a URL pública da foto grande; a miniatura é derivada por convenção (thumbUrl).
export const uploadProductImage = async (file) => {
  const img = await loadImage(file);
  const [full, small] = await Promise.all([resizeToBlob(img, 1200, 0.85), resizeToBlob(img, 400, 0.8)]);
  const id = crypto.randomUUID();
  const send = (path, blob) => supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });

  const big = await send(`${id}.jpg`, full);
  if (big.error) throw big.error;
  const thumb = await send(`${id}_t.jpg`, small);
  if (thumb.error) console.warn('Miniatura não enviada (a foto grande será usada):', thumb.error.message);

  return supabase.storage.from(BUCKET).getPublicUrl(`${id}.jpg`).data.publicUrl;
};

// Imagem do site (logo, faixa, página Sobre): um único arquivo, sem miniatura.
// PNG/WebP/GIF viram PNG (mantém transparência) e as demais JPEG; SVG vai como está.
export const uploadSiteImage = async (file, max = 1200) => {
  const id = crypto.randomUUID();
  let blob = file; let ext = 'svg'; let type = 'image/svg+xml';
  if (file.type !== 'image/svg+xml') {
    const img = await loadImage(file);
    const png = /^image\/(png|webp|gif)$/.test(file.type);
    type = png ? 'image/png' : 'image/jpeg'; ext = png ? 'png' : 'jpg';
    let { width, height } = img;
    if (width > height && width > max) { height = Math.round(height * max / width); width = max; }
    else if (height > max) { width = Math.round(width * max / height); height = max; }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    blob = await new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao comprimir a imagem.'))), type, 0.88));
  } else if (file.size > 300 * 1024) {
    throw new Error('SVG muito grande (máximo 300 KB).');
  }
  const path = `site-${id}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
};
