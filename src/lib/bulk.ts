// Edição em massa de produtos: monta, a partir dos produtos marcados, a lista do que realmente muda.
// Regras puras (sem banco): a tela confirma com o dono e o gateway grava.
import type { Product } from '../types';
// Mesmos campos de ProductPatch (services/gateway); lib/ não importa de services/
type ProductPatch = Partial<Pick<Product, 'active' | 'section' | 'price' | 'categoryIds' | 'discountPercent'>>;
import { MAX_DISCOUNT, clampDiscount } from './discount';
import { brl } from './format';

export type BulkAction =
  | { type: 'visibility'; active: boolean }
  | { type: 'price'; percent: number } // com sinal: +10 aumenta, -10 reduz
  | { type: 'discount'; percent: number } // 0 tira o desconto
  | { type: 'section'; section: '' | 'destaque' | 'popular' }
  | { type: 'category'; mode: 'add' | 'remove'; categoryId: string; fallbackCategoryId?: string | null };

export interface BulkUpdate { id: string; title: string; patch: ProductPatch }

export const MIN_PRICE_PERCENT = -90;
export const MAX_PRICE_PERCENT = 500;

const roundMoney = (n: number) => Math.round(n * 100) / 100;

/** "10", "-7,5", " +3 " -> número; vazio ou texto inválido -> null. */
export const parsePercent = (raw: string): number | null => {
  const text = raw.trim().replace(',', '.');
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
};

/** Preço depois do reajuste, em centavos; nunca abaixo de R$ 0,01 e nunca mexe em produto de preço zerado. */
export const adjustedPrice = (price: number, percent: number): number => {
  const current = Number(price) || 0;
  if (current <= 0) return current;
  return Math.max(0.01, roundMoney(current * (1 + percent / 100)));
};

/** null = ação válida; senão, o aviso para mostrar. */
export function validateBulk(action: BulkAction): string | null {
  if (action.type === 'price') {
    if (!Number.isFinite(action.percent) || action.percent === 0) return 'Informe a porcentagem do reajuste (ex.: 10 para +10%, -5 para -5%).';
    if (action.percent < MIN_PRICE_PERCENT || action.percent > MAX_PRICE_PERCENT) return `O reajuste deve ficar entre ${MIN_PRICE_PERCENT}% e +${MAX_PRICE_PERCENT}%.`;
  }
  if (action.type === 'discount' && (!Number.isFinite(action.percent) || action.percent < 0 || action.percent > MAX_DISCOUNT)) {
    return `O desconto deve ficar entre 0 e ${MAX_DISCOUNT}%.`;
  }
  if (action.type === 'category' && !action.categoryId) return 'Escolha a categoria.';
  return null;
}

/** O que muda em cada produto marcado. Produtos que já estão como se pede ficam de fora. */
export function planBulk(products: Product[], selectedIds: Iterable<string>, action: BulkAction): BulkUpdate[] {
  const wanted = new Set(selectedIds);
  const updates: BulkUpdate[] = [];
  for (const p of products) {
    if (!wanted.has(p.id)) continue;
    let patch: ProductPatch | null = null;
    switch (action.type) {
      case 'visibility':
        if ((p.active !== false) !== action.active) patch = { active: action.active };
        break;
      case 'price': {
        const next = adjustedPrice(p.price, action.percent);
        if (next !== Number(p.price)) patch = { price: next };
        break;
      }
      case 'discount': {
        const next = clampDiscount(action.percent);
        if (next !== clampDiscount(p.discountPercent)) patch = { discountPercent: next };
        break;
      }
      case 'section':
        if ((p.section || '') !== action.section) patch = { section: action.section };
        break;
      case 'category': {
        const current = p.categoryIds || [];
        const has = current.includes(action.categoryId);
        if (action.mode === 'add' && !has) {
          // "Geral" é a categoria de quem não tem nenhuma: ao receber uma categoria de verdade, ela sai
          patch = { categoryIds: [...current.filter(id => id !== action.fallbackCategoryId), action.categoryId] };
        } else if (action.mode === 'remove' && has) {
          const rest = current.filter(id => id !== action.categoryId);
          patch = { categoryIds: rest.length || !action.fallbackCategoryId ? rest : [action.fallbackCategoryId] };
        }
        break;
      }
    }
    if (patch) updates.push({ id: p.id, title: p.title, patch });
  }
  return updates;
}

/** Frase para a confirmação: o que será feito, em quantos produtos, e um exemplo real quando mexe em preço. */
export function describeBulk(action: BulkAction, updates: BulkUpdate[], products: Product[], categoryName = ''): string {
  const n = updates.length;
  const quantos = n === 1 ? '1 produto' : `${n} produtos`;
  switch (action.type) {
    case 'visibility': return `${quantos} ${action.active ? 'vão aparecer na vitrine' : 'vão sair da vitrine (ficam ocultos, sem apagar nada)'}.`;
    case 'price': {
      const first = updates[0]; const before = products.find(p => p.id === first.id)?.price ?? 0;
      const sinal = action.percent > 0 ? '+' : '';
      return `O preço de ${quantos} muda ${sinal}${action.percent}%. Exemplo: “${first.title}” vai de ${brl(before)} para ${brl(first.patch.price ?? before)}. Descontos já aplicados continuam valendo sobre o novo preço.`;
    }
    case 'discount': return action.percent === 0 ? `${quantos} ficam sem desconto.` : `${quantos} ficam com ${action.percent}% de desconto.`;
    case 'section': return action.section === '' ? `${quantos} saem de Destaques e Mais pedidos.` : `${quantos} vão para ${action.section === 'destaque' ? 'Destaques' : 'Mais pedidos'}.`;
    case 'category': return action.mode === 'add' ? `${quantos} vão para a categoria “${categoryName}”.` : `${quantos} saem da categoria “${categoryName}”.`;
  }
}
