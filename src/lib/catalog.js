// Regras da vitrine: selos, "Novidades" e produtos relacionados.

const DAY = 24 * 60 * 60 * 1000;
export const NEW_DAYS = 30;
export const NEW_MAX = 8;
export const LOW_STOCK_MAX = 3;

// Selo do card: o que o admin escreveu; se não houver e a opção estiver ligada, "Últimas unidades"
export const badgeFor = (product, settings) => {
  const manual = (product.badge || '').trim();
  if (manual) return manual;
  if (settings.stockControl && settings.lowStockBadge && product.stock > 0 && product.stock <= LOW_STOCK_MAX) return 'Últimas unidades';
  return '';
};

// Produtos cadastrados nos últimos 30 dias. Se TODOS são novos a seção não diz nada, então some.
export const newProducts = (activeProducts, now = Date.now()) => {
  const fresh = activeProducts.filter(p => p.created_at && now - new Date(p.created_at).getTime() <= NEW_DAYS * DAY);
  return fresh.length > 0 && fresh.length < activeProducts.length ? fresh.slice(0, NEW_MAX) : [];
};

// Outros produtos ativos que dividem categoria com este (mais categorias em comum primeiro, com estoque antes)
export const relatedProducts = (product, products, limit = 4) => {
  const mine = new Set(product.categoryIds || []);
  return products
    .filter(p => p.id !== product.id && p.active !== false)
    .map(p => ({ p, shared: (p.categoryIds || []).filter(id => mine.has(id)).length }))
    .filter(x => x.shared > 0)
    .sort((a, b) => (b.shared - a.shared) || (((b.p.available ?? b.p.stock) > 0) - ((a.p.available ?? a.p.stock) > 0)))
    .slice(0, limit)
    .map(x => x.p);
};
