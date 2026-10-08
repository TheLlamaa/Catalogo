import { useEffect, type CSSProperties } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, Settings, Sparkles, ShoppingCart, LogOut, ExternalLink, ShieldCheck, Info, Moon, Sun } from 'lucide-react';
import { socialLinks } from '../lib/theme';
import { brandLook } from '../lib/brand';
import { loadBrandFont } from '../lib/brandFontLoader';
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

// Logo + nome da loja com tudo que o painel permite escolher (Site > Aparência > Logo / Nome da loja no topo).
// Também é a prévia do painel. Tamanhos de celular e computador separados por variáveis CSS.
export function BrandMark({ settings, dark = false, mode = 'auto' }: { settings: SiteSettings; dark?: boolean; mode?: 'auto' | 'desktop' | 'mobile' }) {
  const look = brandLook(settings, dark);
  // "auto": celular até 640 px, computador acima. A prévia do painel força um dos dois.
  // As três versões vêm escritas por extenso porque o Tailwind só gera as classes que aparecem no código
  const pick = (m: string, d: string, auto: string) => (mode === 'mobile' ? m : mode === 'desktop' ? d : auto);
  const { name } = look;
  useEffect(() => { if (look.showName && !look.nameImage) loadBrandFont(look.font.id, name.fontWeight); }, [look.showName, look.nameImage, look.font.id, name.fontWeight]);
  const shape = look.logo.shape === 'redondo' ? 'rounded-full object-cover aspect-square' : look.logo.shape === 'arredondado' ? 'rounded-[22%] object-cover' : 'object-contain';
  const vars = {
    '--logo-h': `${look.logo.h}px`, '--logo-hm': `${look.logo.hMobile}px`, '--logo-w': `${look.logo.h * 4}px`,
    '--name-d': `${name.sizeD}px`, '--name-m': `${name.sizeM}px`,
    '--nimg-h': `${look.nameImage?.h || 0}px`, '--nimg-hm': `${look.nameImage?.hMobile || 0}px`,
  } as CSSProperties; // variáveis CSS não existem em CSSProperties

  return (
    <span style={vars} className={`flex min-w-0 ${look.stacked ? 'flex-col items-center gap-1 text-center' : 'items-center gap-3'}`}>
      {settings.logoUrl ? (
        <img
          src={settings.logoUrl} alt=""
          className={`flex-shrink-0 ${pick('h-[var(--logo-hm)]', 'h-[var(--logo-h)]', 'h-[var(--logo-hm)] sm:h-[var(--logo-h)]')} max-w-[min(var(--logo-w),60vw)] ${look.logo.shape === 'redondo' ? pick('w-[var(--logo-hm)]', 'w-[var(--logo-h)]', 'w-[var(--logo-hm)] sm:w-[var(--logo-h)]') : ''} ${shape}`}
        />
      ) : !look.showName ? null : look.nameImage ? null : (
        <Package className="w-6 h-6 flex-shrink-0 text-blue-600" strokeWidth={2.5} aria-hidden="true" />
      )}
      {look.showName && (
        <span className={`flex min-w-0 flex-col ${look.stacked ? 'items-center' : ''}`}>
          {look.nameImage ? (
            <img src={settings.nameImage} alt="" className={`${pick('h-[var(--nimg-hm)]', 'h-[var(--nimg-h)]', 'h-[var(--nimg-hm)] sm:h-[var(--nimg-h)]')} w-auto max-w-[60vw] object-contain`} />
          ) : (
            <span
              className={`block truncate leading-tight ${pick('text-[length:var(--name-m)]', 'text-[length:var(--name-d)]', 'text-[length:var(--name-m)] sm:text-[length:var(--name-d)]')} ${name.primary ? 'text-blue-600' : ''}`}
              style={{ fontFamily: name.fontFamily, fontWeight: name.fontWeight, fontStyle: name.fontStyle, textTransform: name.textTransform as CSSProperties['textTransform'], letterSpacing: name.letterSpacing, color: name.color || undefined }}
            >{settings.storeName}</span>
          )}
          {look.tagline && <span className="block truncate text-xs text-gray-600">{look.tagline}</span>}
        </span>
      )}
    </span>
  );
}

// Botão sol/lua do modo escuro (vitrine e painel)
export interface ColorModeControl { dark: boolean; toggle: () => void }
export function ColorModeButton({ mode, className = '' }: { mode: ColorModeControl; className?: string }) {
  const Icon = mode.dark ? Sun : Moon;
  const label = mode.dark ? 'Usar modo claro' : 'Usar modo escuro';
  return (
    <button type="button" onClick={mode.toggle} title={label} className={`p-2.5 rounded-md transition-colors ${className}`}>
      <Icon className="w-5 h-5" aria-hidden="true" /><span className="sr-only">{label}</span>
    </button>
  );
}

// Cabeçalho da vitrine: logo, menus, acesso ao painel e carrinho
interface StoreHeaderProps { settings: SiteSettings; categories: Category[]; user: AuthUser | null; cartCount: number; onOpenCart: () => void; colorMode?: ColorModeControl }

export function StoreHeader({ settings, categories, user, cartCount, onOpenCart, colorMode }: StoreHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[4rem] py-2 flex items-center justify-between">
        <Link to="/" className="flex min-w-0 items-center" aria-label={`${settings.storeName}, página inicial`}>
          <BrandMark settings={settings} dark={!!colorMode?.dark} />
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

          {/* Painel: atalho só para quem já está logado. Visitantes não veem o ícone de login
              (era ruído no topo); o acesso fica no rodapé, em "Área do lojista". */}
          {user && (
            <button
              onClick={() => window.open('/admin', '_blank')}
              className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 text-gray-600 hover:bg-gray-100 transition-colors ml-1"
              aria-label="Acessar painel (abre em nova aba)"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span className="hidden sm:inline">Painel</span>
            </button>
          )}

          <div className="w-px h-6 bg-gray-300 mx-1 sm:mx-2"></div>

          {colorMode && <ColorModeButton mode={colorMode} className="text-gray-600 hover:bg-gray-100" />}

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
export function AdminHeader({ onLogout, storeName, colorMode }: { onLogout: () => void; storeName?: string; colorMode?: ColorModeControl }) {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/admin" className="flex items-center gap-3 min-w-0">
          <Settings className="w-6 h-6 text-[rgb(var(--accent-on-dark))] flex-shrink-0" strokeWidth={2.5} />
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
          {colorMode && <ColorModeButton mode={colorMode} className="-m-2 p-2 text-slate-300 hover:text-white" />}
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
          <Link to="/login" className="hover:text-blue-600 py-2">Área do lojista</Link>
        </div>
      </div>
    </footer>
  );
}
