import { useEffect, useMemo, useState } from 'react';
import { lineKey, loadCart, saveCart } from '../lib/cart';
import { addCheck, cartSummary, fitToStock, increaseCheck } from '../lib/checkout';
import { useUI } from '../components/UIContext';
import type { CartItem, CartLine, Product, Toast } from '../types';

// Carrinho (orçamento): no navegador ficam só id, quantidade e opções; título, preço e estoque vêm dos produtos.
export function useCart({ products, loading, loadError }: { products: Product[]; loading: boolean; loadError: string | null }) {
  const { toast } = useUI() as { toast: Toast };
  const [cartLines, setCartLines] = useState<CartLine[]>(loadCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cart = useMemo((): CartItem[] => fitToStock(cartLines, products), [cartLines, products]);

  // Depois do primeiro carregamento, tira do carrinho o que saiu de linha ou ficou sem estoque
  useEffect(() => {
    if (loading || loadError) return;
    const valid = cart.map(({ key, id, quantity, options }) => ({ key, id, quantity, options }));
    const changed = valid.length !== cartLines.length || valid.some((l, i) => l.key !== cartLines[i].key || l.quantity !== cartLines[i].quantity);
    if (changed) setCartLines(valid);
  }, [loading, loadError, cart, cartLines]);

  useEffect(() => { saveCart(cartLines); }, [cartLines]);

  const addToCart = (product: Product, options: Record<string, string> = {}) => {
    const blocked = addCheck(cartLines, product);
    if (blocked) { toast.error(blocked); return false; }
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
    const blocked = increaseCheck(cartLines, product, delta);
    if (blocked) return toast.error(blocked);
    if (line.quantity + delta < 1) return;
    setCartLines(prev => prev.map(l => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)));
  };

  const removeFromCart = (key: string) => setCartLines(prev => prev.filter(l => l.key !== key));
  const clearCart = () => setCartLines([]);
  const { total: cartTotal, count: cartCount } = cartSummary(cart);

  return {
    cart, cartTotal, cartCount,
    addToCart, updateCartQuantity, removeFromCart, clearCart,
    isCartOpen, openCart: () => setIsCartOpen(true), closeCart: () => setIsCartOpen(false),
  };
}
