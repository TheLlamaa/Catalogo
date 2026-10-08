import { useState } from 'react';
import { makeT } from '../../lib/texts';
import { X, ShoppingCart, Link2, Clock, Image as ImageIcon } from 'lucide-react';
import Dialog from '../../components/Dialog';
import ProductImage from './ProductImage';
import { useUI } from '../../components/UIContext';
import { useSettings } from '../../components/SettingsContext';
import type { Category, Product } from '../../types';
import { badgeStyle } from '../../lib/theme';
import { availability, badgeFor, lowStockMaxOf, relatedProducts } from '../../lib/catalog';
import { Button } from '../../components/ui';
import Price from './Price';
import RichText from '../../components/RichText';

interface ProductDetailModalProps {
  product: Product;
  products?: Product[];
  categories: Category[];
  onClose: () => void;
  onAddToCart: (product: Product, options?: Record<string, string>) => boolean;
  onOpenProduct?: (product: Product) => void;
}

export default function ProductDetailModal({ product, products = [], categories, onClose, onAddToCart, onOpenProduct }: ProductDetailModalProps) {
  const { toast } = useUI();
  const settings = useSettings();
  const t = makeT(settings);
  const badge = badgeFor(product, settings);
  const related = settings.relatedEnabled && onOpenProduct ? relatedProducts(product, products, Number(settings.relatedCount) || 4) : [];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const images = product.imageUrls?.length > 0 ? product.imageUrls : [];
  const productCategories = categories.filter(c => product.categoryIds?.includes(c.id));
  const isOutOfStock = availability(product, settings.stockControl, lowStockMaxOf(settings)) === 'out';
  const options = product.options || [];
  const missing = options.filter(o => !selected[o.name]).map(o => o.name);

  const copyLink = async () => {
    const url = `${window.location.origin}/produto/${product.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('tLinkCopied'));
    } catch {
      window.prompt(`${t('tCopyLink')}:`, url);
    }
  };

  const handleAdd = () => {
    if (missing.length) return toast.info(t('tChooseFirst', { lista: missing.join(', ') }));
    if (onAddToCart(product, selected)) onClose();
  };

  return (
    <Dialog onClose={onClose} label={product.title} panelClassName="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row relative max-h-[90vh]">
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-3 right-3 z-10 bg-white/80 hover:bg-white text-gray-600 p-1.5 rounded-full shadow transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full md:w-1/2 bg-gray-50 p-4 flex flex-col justify-start md:justify-center border-b md:border-b-0 md:border-r border-gray-200">
        <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-200 bg-white">
          {images.length > 0 ? (
            <ProductImage src={images[activeImageIndex]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500"><ImageIcon className="w-12 h-12" /></div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                aria-label={`Ver foto ${idx + 1} de ${images.length}`}
                aria-pressed={idx === activeImageIndex}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all ${idx === activeImageIndex ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
              >
                <ProductImage thumb src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full md:w-1/2 flex flex-col md:min-h-0">
        <div className="flex-1 md:overflow-y-auto p-6">
          {(productCategories.length > 0 || badge) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3 pr-10">
              {badge && <span style={badgeStyle(settings.badgeColor)} className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{badge}</span>}
              {productCategories.map(cat => (
                <span key={cat.id} className="text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">{cat.name}</span>
              ))}
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-900 leading-snug mb-2">{product.title}</h2>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            {!settings.hidePrices && <Price product={product} className="text-2xl font-extrabold text-blue-600" />}
            {settings.stockControl && (settings.showStockCount || isOutOfStock) && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isOutOfStock ? t('tSoldOut') : t('tInStock', { n: product.stock })}
              </span>
            )}
          </div>

          {settings.leadTimeEnabled && product.leadTime && (
            <p className="text-sm text-gray-600 mb-4 flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-500" /> {product.leadTime}</p>
          )}

          {options.map((opt, i) => (
            <div key={opt.name} className="mb-4">
              <span id={`opcao-${i}`} className="block text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">{opt.name}</span>
              <div role="group" aria-labelledby={`opcao-${i}`} className="flex flex-wrap gap-2">
                {opt.values.map(v => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={selected[opt.name] === v}
                    onClick={() => setSelected(prev => ({ ...prev, [opt.name]: v }))}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${selected[opt.name] === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-4 mb-4">
            <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">{t('tDescription')}</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>

          {(product.specs?.length ?? 0) > 0 && (
            <div className="border-t border-gray-100 pt-4 mb-4">
              <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">{t('tSpecsTitle')}</h3>
              <dl className="text-sm text-gray-700 space-y-1">
                {product.specs!.map((s, i) => (
                  <div key={i} className="flex flex-wrap gap-x-1.5"><dt className="text-gray-600">{s.name}:</dt><dd className="font-medium text-gray-900">{s.value}</dd></div>
                ))}
              </dl>
            </div>
          )}

          {product.details?.map((d, i) => (
            <div key={i} className="border-t border-gray-100 pt-4 mb-4">
              {d.title && <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">{d.title}</h3>}
              <RichText text={d.text} />
            </div>
          ))}

          {related.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-3">{settings.relatedTitle}</h3>
              <ul className="grid grid-cols-3 gap-2">
                {related.map(rp => (
                  <li key={rp.id}>
                    <button type="button" onClick={() => onOpenProduct?.(rp)} className="w-full text-left group">
                      <div className="aspect-square rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                        {rp.imageUrls?.[0] ? <ProductImage thumb src={rp.imageUrls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <ImageIcon className="w-6 h-6 text-gray-300" />}
                      </div>
                      <span className="block text-xs font-medium text-gray-800 mt-1.5 line-clamp-2 leading-tight">{rp.title}</span>
                      {!settings.hidePrices && <span className="block"><Price product={rp} showBadge={false} className="text-xs font-bold text-blue-600" /></span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
          {settings.showCopyLink && (
            <button
              onClick={copyLink}
              title={t('tCopyLink')}
              aria-label={t('tCopyLink')}
              className="px-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Link2 className="w-5 h-5" />
            </button>
          )}
          <Button variant="primary" size="lg" icon={ShoppingCart} className="flex-1" disabled={isOutOfStock} onClick={handleAdd}>
            {isOutOfStock ? t('tUnavailable') : settings.addToCartLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
