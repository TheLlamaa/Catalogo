// Menu do painel, agrupado pelo que cada área controla:
//   Vendas (pedidos) · Catálogo (produtos) · Site (o que o cliente vê) · Sistema (calculadora, equipe e erros).
// No computador fica na lateral; no celular vira um botão que abre a lista inteira (nada escondido em rolagem).
import { useState } from 'react';
import Dialog from '../../components/Dialog';
import {
  ShoppingBag, Sparkles, Package, Tags, Wand2, Home, Palette, Store, ShoppingCart, FileText, ToggleRight, Users, Bug, Calculator, ChevronDown, Menu as MenuIcon, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GROUPS } from '../../lib/settings';

export type NavId = 'orders' | 'custom_orders' | 'products' | 'categories' | 'auras' | 'calculator' | 'team' | 'errors' | `site:${string}`;

export interface NavItem { id: NavId; label: string; icon: LucideIcon; count?: number; alert?: number; alertLabel?: string }
export interface NavSection { title: string; items: NavItem[] }

const SITE_ICONS: Record<string, LucideIcon> = {
  inicio: Home, aparencia: Palette, loja: Store, pedidos: ShoppingCart, personalizados: Sparkles, paginas: FileText, recursos: ToggleRight,
};

interface BuildInput { products: number; categories: number; orders: number; newOrders: number; newCustom: number; customOrders: number; customEnabled: boolean; aurasEnabled: boolean }

export function buildNav({ products, categories, orders, newOrders, newCustom, customOrders, customEnabled, aurasEnabled }: BuildInput): NavSection[] {
  const sales: NavItem[] = [{ id: 'orders', label: 'Pedidos', icon: ShoppingBag, count: orders, alert: newOrders, alertLabel: 'novo(s)' }];
  if (customEnabled || customOrders > 0) sales.push({ id: 'custom_orders', label: 'Personalizados', icon: Sparkles, count: customOrders, alert: newCustom, alertLabel: 'novo(s)' });
  const catalog: NavItem[] = [
    { id: 'products', label: 'Produtos', icon: Package, count: products },
    { id: 'categories', label: 'Categorias', icon: Tags, count: categories },
  ];
  if (aurasEnabled) catalog.push({ id: 'auras', label: 'Auras', icon: Wand2 });
  return [
    { title: 'Vendas', items: sales },
    { title: 'Catálogo', items: catalog },
    { title: 'Site', items: GROUPS.map(g => ({ id: `site:${g.id}` as NavId, label: g.label, icon: SITE_ICONS[g.id] || FileText })) },
    { title: 'Sistema', items: [{ id: 'calculator', label: 'Calculadora de preço', icon: Calculator }, { id: 'team', label: 'Equipe', icon: Users }, { id: 'errors', label: 'Erros do site', icon: Bug }] },
  ];
}

function ItemButton({ item, active, onSelect }: { item: NavItem; active: boolean; onSelect: (id: NavId) => void }) {
  const Icon = item.icon;
  // Leitor de tela ouve uma frase só ("Pedidos (12), 2 novo(s)"); o visual mostra "Pedidos 12 ②".
  const name = `${item.label}${typeof item.count === 'number' ? ` (${item.count})` : ''}${item.alert ? `, ${item.alert} ${item.alertLabel}` : ''}`;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 xl:py-2 rounded-md text-sm transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-500'}`} aria-hidden="true" />
      <span className="sr-only">{name}</span>
      <span className="flex-1 truncate" aria-hidden="true">{item.label}</span>
      {typeof item.count === 'number' && (
        <span aria-hidden="true" className={`text-xs tabular-nums ${active ? 'text-blue-700' : 'text-gray-500'}`}>{item.count}</span>
      )}
      {!!item.alert && (
        <span aria-hidden="true" className="min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold">{item.alert}</span>
      )}
    </button>
  );
}

function NavList({ sections, active, onSelect }: { sections: NavSection[]; active: NavId; onSelect: (id: NavId) => void }) {
  return (
    <div className="space-y-5">
      {sections.map(sec => (
        <div key={sec.title} data-nav-section={sec.title}>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{sec.title}</p>
          <ul className="space-y-0.5">
            {sec.items.map(item => <li key={item.id}><ItemButton item={item} active={active === item.id} onSelect={onSelect} /></li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function AdminNav({ sections, active, onSelect }: { sections: NavSection[]; active: NavId; onSelect: (id: NavId) => void }) {
  const [open, setOpen] = useState(false);
  const all = sections.flatMap(s => s.items.map(i => ({ ...i, section: s.title })));
  const current = all.find(i => i.id === active) || all[0];
  const alerts = all.reduce((n, i) => n + (i.alert || 0), 0);

  const select = (id: NavId) => { setOpen(false); onSelect(id); };
  const CurrentIcon = current.icon;

  return (
    <>
      {/* Computador: menu lateral fixo */}
      <nav aria-label="Seções do painel" className="hidden xl:block w-56 flex-shrink-0">
        <div className="sticky top-24">
          <NavList sections={sections} active={active} onSelect={select} />
        </div>
      </nav>

      {/* Celular e tablet: botão com a seção atual, abre a lista completa */}
      <div className="xl:hidden mb-4">
        <button
          type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
          className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm text-left"
        >
          <MenuIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500">{current.section}</span>
            <span className="flex items-center gap-2 text-base font-semibold text-gray-900"><CurrentIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />{current.label}</span>
          </span>
          {alerts > 0 && <span className="text-xs font-bold text-white bg-red-600 rounded-full px-2 py-0.5">{alerts} novo(s)</span>}
          <ChevronDown className="w-5 h-5 text-gray-500" aria-hidden="true" />
          <span className="sr-only">Abrir menu do painel</span>
        </button>
      </div>

      {open && (
        // Dialog padrão do site: prende o foco, fecha com Esc ou clique fora e devolve o foco ao botão
        <Dialog label="Menu do painel" variant="drawer" onClose={() => setOpen(false)} panelClassName="xl:hidden h-full w-[min(20rem,88vw)] bg-white shadow-xl overflow-y-auto p-4 animate-[slideIn_.15s_ease-out]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-semibold text-gray-900">Menu do painel</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="p-2.5 -mr-2 text-gray-500 hover:bg-gray-100 rounded-md"><X className="w-5 h-5" /></button>
          </div>
          <nav aria-label="Seções do painel (celular)"><NavList sections={sections} active={active} onSelect={select} /></nav>
        </Dialog>
      )}
    </>
  );
}
