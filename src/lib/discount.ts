// Desconto em % no produto (coluna products.discount_percent, SQL 13).
// A conta é a mesma do banco (aplicar_desconto_pedido): arredonda para centavos, metade para cima.
export const MAX_DISCOUNT = 90;

export const clampDiscount = (v: unknown): number => {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')));
  return Number.isFinite(n) ? Math.min(MAX_DISCOUNT, Math.max(0, n)) : 0;
};

export const discountedPrice = (price: number, percent: number): number => {
  const d = clampDiscount(percent);
  if (!d) return price;
  return Math.round(Number((price * (100 - d)).toFixed(6))) / 100;
};
