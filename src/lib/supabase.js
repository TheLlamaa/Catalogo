import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// Configurações opcionais da loja (variáveis de ambiente, definidas no build)
// ---------------------------------------------------------------------------
export const STORE_NAME = import.meta.env.VITE_STORE_NAME || 'Catálogo 3D';
export const STORE_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

// WhatsApp da loja: aceita com ou sem 55. Ex: 5548999999999 ou (48) 99999-9999
const rawWhats = String(import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');
export const STORE_WHATSAPP = rawWhats.length === 10 || rawWhats.length === 11 ? `55${rawWhats}` : rawWhats;

// ---------------------------------------------------------------------------
// Supabase Storage (fotos dos produtos)
// ---------------------------------------------------------------------------
export const BUCKET = 'fotos_produtos';

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

// URL da miniatura, quando a foto está no nosso bucket. Fotos antigas não têm miniatura:
// o componente ProductImage volta para a foto grande se a miniatura não existir.
export const thumbUrl = (url) => (
  typeof url === 'string' && url.includes(`/${BUCKET}/`) && /\.jpg$/.test(url) && !/_t\.jpg$/.test(url)
    ? url.replace(/\.jpg$/, '_t.jpg')
    : url
);

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
