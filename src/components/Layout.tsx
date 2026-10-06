import type { CSSProperties } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, Settings, Sparkles, ShoppingCart, LogIn, LogOut, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import { socialLinks } from '../lib/theme';
import { resolveMenu, type MenuContext } from '../lib/menus';
import type { Category } from '../types';
import type { Settings as SiteSettings } from '../lib/settings';
import type { AuthUser } from '../services/auth';

const CURRENT_YEAR = new Date().getFullYear();

const menuContext = (settings: SiteSettings, categories: Category[]): MenuContext => ({
  pages: settings.pages, categories,
  labels: { home: settings.menuHome, about: settings.menuAbout, custom: settings.menuCustom },
  aboutEnabled: settings.aboutEnabled, customEnabled: settings.customEnabled
});

// Cabeçalho da vitrine: logo, menus, acesso ao painel e carrinho
interface StoreHeaderProps { settings: SiteSettings; categories: Category[]; user: AuthUser | null; cartCount: number; onOpenCart: () => void }

export function StoreHeader({ settings, categories, user, cartCount, onOpenCart }: StoreHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[4rem] py-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl} alt={settings.logoShowName ? '' : settings.storeName}
              style={{ '--logo-h': `${Number(settings.logoSize) || 36}px`, '--logo-w': `${(Number(settings.logoSize) || 36) * 4}px` } as CSSProperties} // variáveis CSS não existem em CSSProperties
              className="object-contain h-[var(--logo-h)] max-sm:h-[min(var(--logo-h),48px)] max-w-[min(var(--logo-w),60vw)]"
            />
          ) : (
            <Package className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
          )}
          {(!settings.logoUrl || settings.logoShowName) && <span className="text-lg font-bold tracking-tight">{settings.storeName}</span>}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {resolveMenu(settings.menus.top, menuContext(settings, categories)).map(item => {
            const builtin = item.kind === 'home' || item.kind === 'about' || item.kind === 'custom';
            const active = item.to ? (item.to.includes('?') ? false : isActive(item.to)) : false;
            const base = 'px-3 py-2 rounded-md text-sm font-medium transition-colors';
            const tone = active ? (item.kind === 'custom' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-900') : 'text-gray-600 hover:bg-gray-50';
            const visibility = builtin ? '' : ' hidden sm:block';
            if (item.href) return <a key={item.id} href={item.href} target="_blank" rel="noreferrer noopener" className={`${base} ${tone}${visibility}`}>{item.label}</a>;
            if (item.kind === 'about') return (
              <button key={item.id} onClick={() => navigate(item.to!)} className={`${base} ${tone} flex items-center gap-1.5`}>
                <Info className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sr-only sm:hidden">{item.label}</span>
              </button>
            );
            if (item.kind === 'custom') return (
              <button key={item.id} onClick={() => navigate(item.to!)} className={`${base} ${tone} flex items-center gap-1.5`}>
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sr-only sm:hidden">{item.label}</span>
              </button>
            );
            return <button key={item.id} onClick={() => navigate(item.to!)} className={`${base} ${tone}${visibility}`}>{item.label}</button>;
          })}

          {user ? (
            <button
              onClick={() => window.open('/admin', '_blank')}
              className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 text-gray-600 hover:bg-gray-100 transition-colors ml-1"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Acessar Painel</span>
            </button>
          ) : (
            <button
              onClick={() => window.open('/login', '_blank')}
              className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 text-gray-500 hover:bg-gray-50 transition-colors"
              title="Acesso Administrativo" aria-label="Acesso administrativo"
            >
              <LogIn className="w-4 h-4" />
            </button>
          )}

          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          {/* O nome lido em voz alta inclui o número que aparece no selo: "Abrir orçamento (2 item(ns))" */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
          >
            <ShoppingCart className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">{`Abrir orçamento (${cartCount} item(ns))`}</span>
            {cartCount > 0 && (
              <span aria-hidden="true" className="absolute top-0 right-0 -mt-0.5 -mr-0.5 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

// Cabeçalho do painel administrativo
export function AdminHeader({ onLogout, storeName }: { onLogout: () => void; storeName?: string }) {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/admin" className="flex items-center gap-3 min-w-0">
          <Settings className="w-6 h-6 text-blue-500 flex-shrink-0" strokeWidth={2.5} />
          <span className="min-w-0">
            <span className="block text-base font-bold tracking-tight truncate">{storeName || 'Minha loja'}</span>
            <span className="block text-[11px] uppercase tracking-wider text-slate-400 -mt-0.5">Painel de gestão</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <button
            onClick={() => window.open('/', '_blank')}
            className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-colors p-2 -m-2"
            aria-label="Ver loja (abre em nova aba)"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Ver loja</span>
          </button>
          <div className="w-px h-5 bg-slate-700"></div>
          <button
            onClick={onLogout}
            className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-colors p-2 -m-2"
            aria-label="Sair do painel"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

// Rodapé da vitrine
export function StoreFooter({ settings, categories }: { settings: SiteSettings; categories: Category[] }) {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <div className="text-center sm:text-left">
          <span>© {CURRENT_YEAR} {settings.storeName}</span>
          {settings.footerText && <p className="mt-1">{settings.footerText}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {settings.aboutEnabled && <Link to="/sobre" className="hover:text-blue-600 py-2">{settings.menuAbout}</Link>}
          {resolveMenu(settings.menus.foot, menuContext(settings, categories)).map(item => (
            item.href
              ? <a key={item.id} href={item.href} target="_blank" rel="noreferrer noopener" className="hover:text-blue-600 py-2">{item.label}</a>
              : <Link key={item.id} to={item.to!} className="hover:text-blue-600 py-2">{item.label}</Link>
          ))}
          {socialLinks(settings).map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer noopener" className="hover:text-blue-600 py-2">{l.label}</a>
          ))}
          {settings.whatsapp && (
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 py-2">WhatsApp</a>
          )}
          <Link to="/privacidade" className="hover:text-blue-600 py-2">Política de privacidade</Link>
        </div>
      </div>
    </footer>
  );
}
