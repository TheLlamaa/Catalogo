// Regras do pedido do cliente (carrinho e solicitação personalizada) num lugar só: estoque, pedido mínimo,
// pausa, validação do formulário e o corpo enviado ao banco. O banco confere tudo de novo (supabase/02, 07, 13);
// aqui é a mesma regra, para o cliente ver o aviso antes de enviar.
import type { CartItem, CartLine, DeliveryMethod, Product } from '../types';
import type { Settings } from './settings';
import { minOrderValue } from './settings';
import { validateContact } from './format';

type CheckoutSettings = Pick<Settings, 'ordersPaused' | 'pausedMessage' | 'minOrder' | 'deliveryEnabled'>;

const sameProduct = (line: CartLine, productId: string) => String(line.id) === String(productId);

/** Unidades do produto no carrinho, somando todas as linhas (opções diferentes contam juntas, como no estoque). */
export const unitsInCart = (lines: CartLine[], productId: string): number =>
  lines.filter(l => sameProduct(l, productId)).reduce((sum, l) => sum + l.quantity, 0);

/**
 * Cruza as linhas do navegador com os produtos atuais. Some o que saiu de linha ou esgotou e limita as
 * quantidades ao estoque do produto como um todo (a primeira linha leva o que couber, as seguintes o resto).
 */
export function fitToStock(lines: CartLine[], products: Product[]): CartItem[] {
  const taken = new Map<string, number>();
  const items: CartItem[] = [];
  for (const line of lines) {
    const product = products.find(p => sameProduct(line, p.id));
    if (!product || product.active === false || product.available <= 0) continue;
    const already = taken.get(product.id) ?? 0;
    const quantity = Math.min(line.quantity, product.available - already);
    if (quantity < 1) continue;
    taken.set(product.id, already + quantity);
    items.push({ ...line, quantity, product });
  }
  return items;
}

/** null = pode adicionar mais uma unidade; senão, o aviso para o cliente. */
export function addCheck(lines: CartLine[], product: Product): string | null {
  if (product.available <= 0) return 'Produto esgotado no momento.';
  if (unitsInCart(lines, product.id) >= product.available) return `Temos apenas ${product.available} unidade(s) em estoque.`;
  return null;
}

/** null = pode aumentar a quantidade em `delta`; senão, o aviso. Diminuir nunca é bloqueado aqui. */
export function increaseCheck(lines: CartLine[], product: Product, delta: number): string | null {
  if (delta > 0 && unitsInCart(lines, product.id) + delta > product.available) {
    return `Quantidade máxima em estoque atingida (${product.available} unidades).`;
  }
  return null;
}

/** Total já com desconto (igual à conta do banco) e quantidade de itens. */
export const cartSummary = (items: CartItem[]) => ({
  total: items.reduce((acc, l) => acc + l.product.salePrice * l.quantity, 0),
  count: items.reduce((acc, l) => acc + l.quantity, 0),
});

/** Pedido mínimo da loja: `belowMin` e quanto falta. Só vale quando os pedidos não estão pausados. */
export function minOrderStatus(settings: Pick<Settings, 'minOrder'>, total: number) {
  const minOrder = minOrderValue(settings.minOrder);
  const belowMin = minOrder > 0 && total < minOrder;
  return { minOrder, belowMin, shortfall: belowMin ? minOrder - total : 0 };
}

/** Pode seguir para os dados do pedido? false se pausado ou abaixo do mínimo. */
export const canProceed = (settings: CheckoutSettings, total: number): boolean =>
  !settings.ordersPaused && !minOrderStatus(settings, total).belowMin;

export interface OrderForm {
  name: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  notes: string;
  trap: string; // campo-isca anti-robô: humano nunca preenche
}

export type Validation = { ok: true } | { ok: false; error: string } | { ok: false; bot: true };

/** Valida o formulário do carrinho. `bot: true` = campo-isca preenchido: finja sucesso, não envie. */
export function validateOrder(form: OrderForm, settings: CheckoutSettings): Validation {
  if (settings.ordersPaused) return { ok: false, error: settings.pausedMessage };
  if (!form.name || !form.phone) return { ok: false, error: 'Preencha nome e WhatsApp.' };
  const contactError = validateContact(form.name, form.phone);
  if (contactError) return { ok: false, error: contactError };
  if (settings.deliveryEnabled && form.deliveryMethod === 'entrega' && form.deliveryAddress.trim().length < 5) {
    return { ok: false, error: 'Informe o endereço, ou ao menos bairro e cidade, para combinarmos a entrega.' };
  }
  if (form.trap) return { ok: false, bot: true };
  return { ok: true };
}

export interface CustomRequestForm { name: string; phone: string; description: string; trap: string }

/** Valida a solicitação de peça personalizada. Mesmas regras de pausa, contato e campo-isca. */
export function validateCustomRequest(form: CustomRequestForm, settings: Pick<Settings, 'ordersPaused' | 'pausedMessage'>): Validation {
  if (settings.ordersPaused) return { ok: false, error: settings.pausedMessage };
  if (!form.name || !form.phone || !form.description) return { ok: false, error: 'Preencha nome, WhatsApp e a descrição do pedido.' };
  const contactError = validateContact(form.name, form.phone);
  if (contactError) return { ok: false, error: contactError };
  if (form.description.length > 2000) return { ok: false, error: 'A descrição pode ter no máximo 2000 caracteres.' };
  if (form.trap) return { ok: false, bot: true };
  return { ok: true };
}

/** Corpo do pedido enviado ao banco. O preço aqui é só informativo: o banco recalcula título, preço e total. */
export function buildOrderPayload(items: CartItem[], total: number, form: OrderForm) {
  const lines = items.map(l => ({
    id: l.id,
    title: l.product.title,
    price: l.product.salePrice,
    quantity: l.quantity,
    options: l.options,
    imageUrls: (l.product.imageUrls || []).slice(0, 1),
  }));
  return {
    items: lines,
    order: {
      client_name: form.name.trim(),
      client_phone: form.phone,
      notes: form.notes.trim() || null,
      delivery_method: form.deliveryMethod,
      delivery_address: form.deliveryMethod === 'entrega' ? form.deliveryAddress.trim() : null,
      items: lines,
      total,
    },
  };
}
