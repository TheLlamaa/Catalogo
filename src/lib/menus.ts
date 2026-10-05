// Menu do topo e rodapé montados no painel. Cada item é um atalho: botão fixo da loja (Vitrine, Sobre,
// Personalizado), página criada no painel, categoria ou link externo.

import type { ExtraPage } from './pages';

export type MenuKind = 'home' | 'about' | 'custom' | 'page' | 'link' | 'cat';
export interface MenuItem { kind: MenuKind; ref: string; label: string }

export const BUILTIN_KINDS: MenuKind[] = ['home', 'about', 'custom'];
export const MAX_TOP = 10;
export const MAX_FOOT = 8;
export const MENU_LABEL_MAX = 30;

const KINDS: MenuKind[] = ['home', 'about', 'custom', 'page', 'link', 'cat'];
export const isBuiltin = (k: MenuKind): boolean => BUILTIN_KINDS.includes(k);

export const httpUrl = (v: string): string => {
  try { const u = new URL(v.trim()); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
};

export const DEFAULT_TOP: MenuItem[] = BUILTIN_KINDS.map(kind => ({ kind, ref: '', label: '' }));

// Lê o que está guardado; item inválido some. Os botões fixos sempre existem (os que faltam voltam ao fim).
export const parseMenu = (value: unknown, max: number, withBuiltins: boolean): MenuItem[] => {
  let raw: unknown = [];
  try { raw = JSON.parse(String(value ?? '[]')); } catch { raw = []; }
  const items: MenuItem[] = [];
  if (Array.isArray(raw)) {
    for (const r of raw) {
      if (!r || typeof r !== 'object') continue;
      const kind = (r as { k?: unknown }).k;
      if (typeof kind !== 'string' || !KINDS.includes(kind as MenuKind)) continue;
      const k = kind as MenuKind;
      const ref = typeof (r as { r?: unknown }).r === 'string' ? (r as { r: string }).r.trim() : '';
      const label = typeof (r as { l?: unknown }).l === 'string' ? (r as { l: string }).l.trim().slice(0, MENU_LABEL_MAX) : '';
      if (isBuiltin(k)) {
        if (!withBuiltins || items.some(i => i.kind === k)) continue;
        items.push({ kind: k, ref: '', label: '' });
      } else if (k === 'link') {
        const href = httpUrl(ref);
        if (href && label) items.push({ kind: k, ref: href, label });
      } else if (ref) {
        items.push({ kind: k, ref, label });
      }
    }
  }
  if (withBuiltins) for (const k of BUILTIN_KINDS) if (!items.some(i => i.kind === k)) items.push({ kind: k, ref: '', label: '' });
  return items.slice(0, max);
};

// Valor para o banco ('' = menu padrão, nada guardado)
export const menuToStored = (value: unknown, max: number, withBuiltins: boolean): string => {
  const items = parseMenu(value, max, withBuiltins);
  const def = withBuiltins ? DEFAULT_TOP : [];
  if (JSON.stringify(items) === JSON.stringify(def)) return '';
  return JSON.stringify(items.map(i => ({ k: i.kind, r: i.ref, l: i.label })));
};

export interface MenuContext {
  pages: ExtraPage[];
  categories: { id: string; name: string; slug?: string }[];
  labels: { home: string; about: string; custom: string };
  aboutEnabled: boolean;
  customEnabled: boolean;
}

export interface ResolvedItem { id: string; kind: MenuKind; label: string; to?: string; href?: string }

// Itens prontos para mostrar: some o que aponta para algo que não existe mais (página apagada ou despublicada, categoria removida)
export const resolveMenu = (items: MenuItem[], ctx: MenuContext): ResolvedItem[] => {
  const out: ResolvedItem[] = [];
  items.forEach((it, i) => {
    const id = `${it.kind}-${i}`;
    if (it.kind === 'home') out.push({ id, kind: it.kind, label: ctx.labels.home, to: '/' });
    else if (it.kind === 'about') { if (ctx.aboutEnabled) out.push({ id, kind: it.kind, label: ctx.labels.about, to: '/sobre' }); }
    else if (it.kind === 'custom') { if (ctx.customEnabled) out.push({ id, kind: it.kind, label: ctx.labels.custom, to: '/custom' }); }
    else if (it.kind === 'page') {
      const p = ctx.pages.find(x => x.key === it.ref);
      if (p && p.published) out.push({ id, kind: it.kind, label: it.label || p.title, to: `/p/${p.slug}` });
    } else if (it.kind === 'cat') {
      const c = ctx.categories.find(x => String(x.id) === it.ref);
      if (c) out.push({ id, kind: it.kind, label: it.label || c.name, to: `/?categoria=${encodeURIComponent(c.slug || String(c.id))}` });
    } else if (httpUrl(it.ref)) out.push({ id, kind: it.kind, label: it.label, href: httpUrl(it.ref) });
  });
  return out;
};

// Versão para edição no painel: mantém itens ainda incompletos (link sem endereço, página não escolhida)
export const editMenu = (value: unknown, withBuiltins: boolean): MenuItem[] => {
  let raw: unknown = [];
  try { raw = JSON.parse(String(value ?? '[]')); } catch { raw = []; }
  const items: MenuItem[] = [];
  if (Array.isArray(raw)) {
    for (const r of raw) {
      if (!r || typeof r !== 'object') continue;
      const kind = (r as { k?: unknown }).k;
      if (typeof kind !== 'string' || !KINDS.includes(kind as MenuKind)) continue;
      const k = kind as MenuKind;
      if (isBuiltin(k)) {
        if (withBuiltins && !items.some(i => i.kind === k)) items.push({ kind: k, ref: '', label: '' });
        continue;
      }
      const ref = typeof (r as { r?: unknown }).r === 'string' ? (r as { r: string }).r : '';
      const label = typeof (r as { l?: unknown }).l === 'string' ? (r as { l: string }).l.slice(0, MENU_LABEL_MAX) : '';
      items.push({ kind: k, ref, label });
    }
  }
  if (withBuiltins) for (const k of BUILTIN_KINDS) if (!items.some(i => i.kind === k)) items.push({ kind: k, ref: '', label: '' });
  return items;
};

export const serializeMenu = (items: MenuItem[]): string => JSON.stringify(items.map(i => ({ k: i.kind, r: i.ref, l: i.label })));

// Mensagem de erro em português se algum item estiver incompleto ('' = tudo certo)
export const menuProblem = (value: unknown, max: number, withBuiltins: boolean, where: string): string => {
  const items = editMenu(value, withBuiltins);
  if (items.length > max) return `${where}: no máximo ${max} itens.`;
  for (const it of items) {
    if (it.kind === 'link') {
      if (!it.label.trim()) return `${where}: dê um nome a cada link externo.`;
      if (!httpUrl(it.ref)) return `${where}: o endereço de “${it.label.trim()}” precisa começar com https://`;
    } else if (!isBuiltin(it.kind) && !it.ref) return `${where}: escolha ${it.kind === 'page' ? 'a página' : 'a categoria'} de cada item.`;
  }
  return '';
};
