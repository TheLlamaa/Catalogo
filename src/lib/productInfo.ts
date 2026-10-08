// Detalhes do produto: características (Material, Altura, Peso…) e blocos de informação (Prazo de produção,
// Cuidados com a peça…). No banco (SQL 18) ficam em products.specs e products.details com chaves curtas;
// nas telas, name/value e title/text.
import type { ProductDetail, ProductSpec } from '../types';

export const MAX_SPECS = 12;
export const MAX_DETAILS = 6;
export const SPEC_NAME_MAX = 40;
export const SPEC_VALUE_MAX = 120;
export const DETAIL_TITLE_MAX = 60;
export const DETAIL_TEXT_MAX = 1200;

// Sugestões para o dono não começar do zero
export const SPEC_SUGGESTIONS = ['Material', 'Altura', 'Largura', 'Comprimento', 'Peso', 'Acabamento', 'Cor', 'Capacidade'];
export const DETAIL_SUGGESTIONS = ['Prazo de produção', 'Cuidados com a peça', 'Como usar', 'Garantia', 'Entrega'];

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

/** Lê products.specs do banco (qualquer lixo vira lista vazia). */
export const parseSpecs = (value: unknown): ProductSpec[] => (Array.isArray(value)
  ? value.filter((r): r is { n?: unknown; v?: unknown } => !!r && typeof r === 'object')
      .map(r => ({ name: str(r.n, SPEC_NAME_MAX).trim(), value: str(r.v, SPEC_VALUE_MAX).trim() }))
      .filter(s => s.name && s.value).slice(0, MAX_SPECS)
  : []);

/** Lê products.details do banco. */
export const parseDetails = (value: unknown): ProductDetail[] => (Array.isArray(value)
  ? value.filter((r): r is { t?: unknown; x?: unknown } => !!r && typeof r === 'object')
      .map(r => ({ title: str(r.t, DETAIL_TITLE_MAX).trim(), text: str(r.x, DETAIL_TEXT_MAX).trim() }))
      .filter(d => d.text).slice(0, MAX_DETAILS)
  : []);

/** Linhas do formulário -> o que vai para o banco (descarta linhas vazias e corta no limite). */
export const specsToStored = (specs: ProductSpec[] | undefined): { n: string; v: string }[] =>
  parseSpecs((specs || []).map(s => ({ n: s.name, v: s.value }))).map(s => ({ n: s.name, v: s.value }));
export const detailsToStored = (details: ProductDetail[] | undefined): { t: string; x: string }[] =>
  parseDetails((details || []).map(d => ({ t: d.title, x: d.text }))).map(d => ({ t: d.title, x: d.text }));

/** O produto tem alguma característica ou bloco para mostrar? */
export const hasProductInfo = (p: { specs?: ProductSpec[]; details?: ProductDetail[] }): boolean => (p.specs?.length ?? 0) > 0 || (p.details?.length ?? 0) > 0;
