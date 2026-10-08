// Título, descrição e imagem de compartilhamento editáveis pelo admin.
// Roda no navegador: o Google lê, mas pré-visualizações de WhatsApp/Instagram usam só o HTML estático.

const setMeta = (selector: string, create: () => HTMLMetaElement, content: string): void => {
  const el = document.head.querySelector<HTMLMetaElement>(selector) || create();
  if (!el.isConnected) document.head.appendChild(el);
  if (el.dataset.original === undefined) el.dataset.original = el.getAttribute('content') || '';
  el.setAttribute('content', content || el.dataset.original);
};

const metaName = (name: string) => () => { const m = document.createElement('meta'); m.setAttribute('name', name); return m; };
const metaProp = (prop: string) => () => { const m = document.createElement('meta'); m.setAttribute('property', prop); return m; };

export interface SeoInput { seoTitle?: string; seoDescription?: string; seoImage?: string }

let originalTitle: string | null = null;

/** Título, descrição e imagem de uma página específica (Sobre, páginas extras); o que faltar vem das configurações do site. */
export const pageSeo = (site: SeoInput & { storeName?: string }, page: { title: string; description?: string; image?: string }): SeoInput => ({
  seoTitle: `${page.title} | ${site.storeName || ''}`.replace(/ \| $/, ''),
  seoDescription: (page.description || '').trim() || site.seoDescription,
  seoImage: (page.image || '').trim() || site.seoImage,
});

// setTitle = false nas telas que têm título próprio (produto, Sobre, páginas extras)
export const applySeo = ({ seoTitle, seoDescription, seoImage }: SeoInput, setTitle = true): void => {
  if (typeof document === 'undefined') return;
  if (originalTitle === null) originalTitle = document.title;
  const title = (seoTitle || '').trim();
  const desc = (seoDescription || '').trim();
  if (setTitle) document.title = title || originalTitle;
  setMeta('meta[name="description"]', metaName('description'), desc);
  setMeta('meta[property="og:title"]', metaProp('og:title'), title);
  setMeta('meta[property="og:description"]', metaProp('og:description'), desc);
  const image = /^https?:\/\//i.test(seoImage || '') ? String(seoImage) : '';
  if (image) setMeta('meta[property="og:image"]', metaProp('og:image'), image);
  else document.head.querySelector('meta[property="og:image"]')?.remove();
};
