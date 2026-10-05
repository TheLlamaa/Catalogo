import type { CSSProperties } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, Settings, Sparkles, ShoppingCart, LogIn, LogOut, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import { socialLinks } from '../lib/theme';
import type { Settings as SiteSettings } from '../lib/settings';
import type { AuthUser } from '../services/auth';

const CURRENT_YEAR = new Date().getFullYear();

// Cabeçalho da vitrine: logo, menus, acesso ao painel e carrinho
interface StoreHeaderProps { settings: SiteSettings; user: AuthUser | null; cartCount: number; onOpenCart: () => void }

export function StoreHeader({ settings, user, cartCount, onOpenCart }: StoreHeaderProps) {
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
          <button
            onClick={() => navigate('/')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {settings.menuHome}
          </button>

          {settings.aboutEnabled && <button
            onClick={() => navigate('/sobre')}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${isActive('/sobre') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Info className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">{settings.menuAbout}</span>
            <span className="sr-only sm:hidden">{settings.menuAbout}</span>
          </button>}

          {settings.pages.filter(p => p.menu).map(p => (
            <button
              key={p.slug} onClick={() => navigate(`/p/${p.slug}`)}
              className={`hidden sm:block px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(`/p/${p.slug}`) ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >{p.title}</button>
          ))}

          {settings.customEnabled && <button
            onClick={() => navigate('/custom')}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${isActive('/custom') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">{settings.menuCustom}</span>
          </button>}

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
              className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 text-gray-400 hover:bg-gray-50 transition-colors"
              title="Acesso Administrativo" aria-label="Acesso administrativo"
            >
              <LogIn className="w-4 h-4" />
            </button>
          )}

          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          <button
            onClick={onOpenCart}
            aria-label={`Abrir orçamento (${cartCount} item(ns))`}
            className="relative p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm">
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
export function AdminHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-500" strokeWidth={2.5} />
          <span className="text-lg font-bold tracking-tight">Sistema Admin</span>
        </Link>
        <nav className="flex items-center gap-4">
          <button
            onClick={() => window.open('/', '_blank')}
            className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Ver Loja</span>
          </button>
          <div className="w-px h-5 bg-slate-700"></div>
          <button
            onClick={onLogout}
            className="text-sm font-medium text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair do Sistema</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

// Rodapé da vitrine
export function StoreFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <div className="text-center sm:text-left">
          <span>© {CURRENT_YEAR} {settings.storeName}</span>
          {settings.footerText && <p className="mt-1">{settings.footerText}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {settings.aboutEnabled && <Link to="/sobre" className="hover:text-blue-600">{settings.menuAbout}</Link>}
          {settings.pages.filter(p => p.footer).map(p => <Link key={p.slug} to={`/p/${p.slug}`} className="hover:text-blue-600">{p.title}</Link>)}
          {socialLinks(settings).map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer noopener" className="hover:text-blue-600">{l.label}</a>
          ))}
          {settings.whatsapp && (
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-blue-600">WhatsApp</a>
          )}
          <Link to="/privacidade" className="hover:text-blue-600">Política de privacidade</Link>
        </div>
      </div>
    </footer>
  );
}
