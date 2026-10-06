import { brl } from '../../lib/format';
import type { Product } from '../../types';

// Preço do produto na vitrine. Com desconto: preço antigo riscado, preço novo e o selo "-15%".
// O leitor de tela ouve uma frase só: "De R$ 39,90 por R$ 33,92 (15% de desconto)".
interface PriceProps {
  product: Pick<Product, 'price' | 'salePrice' | 'discountPercent'>;
  className?: string;     // classes do preço atual (tamanho, peso, cor)
  showBadge?: boolean;
}

export default function Price({ product, className = '', showBadge = true }: PriceProps) {
  const d = product.discountPercent || 0;
  if (!d || product.salePrice >= product.price) return <span className={className}>{brl(product.price)}</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className="sr-only">{`De ${brl(product.price)} por ${brl(product.salePrice)} (${d}% de desconto)`}</span>
      <s aria-hidden="true" className="text-xs font-normal text-gray-500">{brl(product.price)}</s>
      <span aria-hidden="true" className={className}>{brl(product.salePrice)}</span>
      {showBadge && <span aria-hidden="true" className="self-center rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-800">-{d}%</span>}
    </span>
  );
}
