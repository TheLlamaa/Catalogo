import { useEffect, useMemo, useState } from 'react';
import { lineKey, loadCart, saveCart } from '../lib/cart';
import { useUI } from '../components/UIContext';
import type { CartItem, CartLine, Product, Toast } from '../types';

// Carrinho (orçamento): no navegador ficam só id, quantidade e opções; título, preço e estoque vêm dos produtos.
export function useCart({ products, loading, loadError }: { products: Product[]; loading: boolean; loadError: string | null }) {
  const { toast } = useUI() as { toast: Toast };
  const [cartLines, setCartLines] = useState<CartLine[]>(loadCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cart = useMemo(() => cartLines.map((line): CartItem | null => {
    const product = products.find(p => String(p.id) === String(line.id));
    if (!product || product.active === false || product.available <= 0) return null;
    return { ...line, quantity: Math.min(line.quantity, product.available), product };
  }).filter((l): l is CartItem => l !== null), [cartLines, products]);

  // Depois do primeiro carregamento, tira do carrinho o que saiu de linha ou ficou sem estoque
  useEffect(() => {
    if (loading || loadError) return;
    const valid = cart.map(({ key, id, quantity, options }) => ({ key, id, quantity, options }));
    const changed = valid.length !== cartLines.length || valid.some((l, i) => l.key !== cartLines[i].key || l.quantity !== cartLines[i].quantity);
    if (changed) setCartLines(valid);
  }, [loading, loadError, cart, cartLines]);

  useEffect(() => { saveCart(cartLines); }, [cartLines]);

  const unitsInCart = (productId: string) =>
    cartLines.filter(l => String(l.id) === String(productId)).reduce((sum, l) => sum + l.quantity, 0);

  const addToCart = (product: Product, options: Record<string, string> = {}) => {
    if (product.available <= 0) { toast.error('Produto esgotado no momento.'); return false; }
    if (unitsInCart(product.id) >= product.available) {
      toast.error(`Temos apenas ${product.stock} unidade(s) em estoque.`);
      return false;
    }
    const key = lineKey(product.id, options);
    setCartLines(prev => (prev.some(l => l.key === key)
      ? prev.map(l => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
      : [...prev, { key, id: product.id, quantity: 1, options }]));
    setIsCartOpen(true);
    return true;
  };

  const updateCartQuantity = (key: string, delta: number) => {
    const line = cartLines.find(l => l.key === key);
    const product = line && products.find(p => String(p.id) === String(line.id));
    if (!line || !product) return;
    if (delta > 0 && unitsInCart(product.id) + delta > product.available) {
      return toast.error(`Quantidade máxima em estoque atingida (${product.stock} unidades).`);
    }
    if (line.quantity + delta < 1) return;
    setCartLines(prev => prev.map(l => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)));
  };

  const removeFromCart = (key: string) => setCartLines(prev => prev.filter(l => l.key !== key));
  const clearCart = () => setCartLines([]);
  const cartTotal = cart.reduce((acc, l) => acc + l.product.price * l.quantity, 0);
  const cartCount = cart.reduce((acc, l) => acc + l.quantity, 0);

  return {
    cart, cartTotal, cartCount,
    addToCart, updateCartQuantity, removeFromCart, clearCart,
    isCartOpen, openCart: () => setIsCartOpen(true), closeCart: () => setIsCartOpen(false),
  };
}
