import { useState } from 'react';
import { X, ShoppingCart, Link2, Clock, Image as ImageIcon } from 'lucide-react';
import Dialog from './Dialog';
import ProductImage from './ProductImage';
import { useUI } from './UIContext';
import { brl } from '../lib/format';

export default function ProductDetailModal({ product, categories, onClose, onAddToCart }) {
  const { toast } = useUI();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const images = product.imageUrls?.length > 0 ? product.imageUrls : [];
  const productCategories = categories.filter(c => product.categoryIds?.includes(c.id));
  const isOutOfStock = product.stock <= 0;
  const options = product.options || [];
  const missing = options.filter(o => !selected[o.name]).map(o => o.name);

  const copyLink = async () => {
    const url = `${window.location.origin}/produto/${product.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link do produto copiado!');
    } catch {
      window.prompt('Copie o link do produto:', url);
    }
  };

  const handleAdd = () => {
    if (missing.length) return toast.info(`Escolha: ${missing.join(', ')}.`);
    if (onAddToCart(product, selected)) onClose();
  };

  return (
    <Dialog onClose={onClose} label={product.title} panelClassName="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col md:flex-row relative max-h-[90vh]">
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-3 right-3 z-10 bg-white/80 hover:bg-white text-gray-600 p-1.5 rounded-full shadow transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full md:w-1/2 bg-gray-50 p-4 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200">
        <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-200 bg-white">
          {images.length > 0 ? (
            <ProductImage src={images[activeImageIndex]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="w-12 h-12" /></div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                aria-label={`Ver foto ${idx + 1}`}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all ${idx === activeImageIndex ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
              >
                <ProductImage thumb src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {productCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 pr-10">
              {productCategories.map(cat => (
                <span key={cat.id} className="text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">{cat.name}</span>
              ))}
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-900 leading-snug mb-2">{product.title}</h2>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-2xl font-extrabold text-blue-600">{brl(product.price)}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {isOutOfStock ? 'Esgotado' : `${product.stock} em estoque`}
            </span>
          </div>

          {product.leadTime && (
            <p className="text-sm text-gray-600 mb-4 flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> {product.leadTime}</p>
          )}

          {options.map(opt => (
            <div key={opt.name} className="mb-4">
              <span className="block text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">{opt.name}</span>
              <div className="flex flex-wrap gap-2">
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

          <div className="border-t border-gray-100 pt-4 mb-6">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">Descrição</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={copyLink}
            title="Copiar link deste produto"
            aria-label="Copiar link deste produto"
            className="px-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Link2 className="w-5 h-5" />
          </button>
          <button
            disabled={isOutOfStock}
            onClick={handleAdd}
            className={`flex-1 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            <ShoppingCart className="w-5 h-5" /> {isOutOfStock ? 'Indisponível' : 'Adicionar ao Orçamento'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
