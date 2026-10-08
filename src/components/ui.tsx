// Peças de interface reaproveitadas pelo painel e pela vitrine: botão, interruptor, cabeçalho de tela e estado vazio.
// Um único lugar para o visual dessas peças, para as telas não terem três versões do mesmo botão.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// Campo de texto padrão (input, select, textarea): mesma borda, tamanho e foco em todo o site
export const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

// Botão "Enviar pelo WhatsApp": verde da marca escurecido para o texto branco passar 4,5:1 (o #25D366 dá 2:1)
export const whatsappButtonClass = 'inline-flex items-center justify-center gap-2 bg-[#0F7A6E] hover:bg-[#075E54] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F7A6E]';
// Ícone do WhatsApp sobre fundo branco (3:1 para ícones)
export const whatsappIconClass = 'text-[#128C7E]';

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  soft: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg'; // lg: ações principais da vitrine (carrinho, pedido)
}

export function Button({ variant = 'secondary', icon: Icon, size = 'md', className = '', children, type = 'button', ...rest }: ButtonProps) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs rounded-md' : size === 'lg' ? 'px-6 py-3 text-sm rounded-lg' : 'px-4 py-2.5 text-sm rounded-md';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${pad} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} aria-hidden="true" />}
      {children}
    </button>
  );
}

// Interruptor liga/desliga. É um checkbox de verdade (role="switch"), com o estado escrito ao lado:
// quem olha entende o que está ligado sem depender só da cor.
interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  onText?: string;
  offText?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ id, checked, onChange, label, hint, onText = 'Ligado', offText = 'Desligado', disabled, className = '' }: SwitchProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={`flex items-start gap-3 select-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <span className="relative inline-flex flex-shrink-0 mt-0.5">
          <input
            id={id} type="checkbox" role="switch" checked={checked} aria-checked={checked} disabled={disabled}
            onChange={e => onChange(e.target.checked)}
            className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span aria-hidden="true" className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1" />
          <span aria-hidden="true" className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </span>
        <span className="min-w-0">
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <span className={`ml-2 text-[11px] font-semibold uppercase tracking-wide ${checked ? 'text-blue-700' : 'text-gray-500'}`} aria-hidden="true">{checked ? onText : offText}</span>
          {hint && <span className="block text-xs text-gray-500 mt-0.5 font-normal">{hint}</span>}
        </span>
      </label>
    </div>
  );
}

// Interruptor de uma linha de lista (ex.: "Na vitrine" / "Oculto"): ação imediata, estado escrito ao lado.
// "label" é o que o leitor de tela anuncia e precisa conter o texto visível (ex.: "Mostrar Vaso na vitrine").
interface InlineSwitchProps { on: boolean; onToggle: () => unknown; label: string; onText: string; offText: string; title?: string }
export function InlineSwitch({ on, onToggle, label, onText, offText, title }: InlineSwitchProps) {
  return (
    <button
      type="button" role="switch" aria-checked={on} onClick={onToggle} aria-label={label} title={title}
      className="inline-flex items-center gap-2 rounded-full py-2 -my-2 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-green-600' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </span>
      <span className={`text-xs font-semibold whitespace-nowrap ${on ? 'text-green-800' : 'text-gray-500'}`}>{on ? onText : offText}</span>
    </button>
  );
}

// Cabeçalho de cada tela do painel: título, explicação curta e a ação principal à direita
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start justify-between gap-3 mb-5">
      <div className="min-w-0 sm:min-w-[14rem] sm:flex-1">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">{actions}</div>}
    </div>
  );
}

// Estado vazio: o que está vazio, por que importa e o que fazer
export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="py-12 px-6 text-center border border-dashed border-gray-300 rounded-lg bg-white">
      <Icon className="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-gray-900">{title}</h2>
      {text && <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
