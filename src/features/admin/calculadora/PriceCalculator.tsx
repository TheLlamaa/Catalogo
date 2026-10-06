import { useEffect, useMemo, useState } from 'react';
import { Copy, RotateCcw, Tag } from 'lucide-react';
import { Button, PageHeader, inputClass } from '../../../components/ui';
import { useUI } from '../../../components/UIContext';
import { PRICING_DEFAULTS, calculatePrice, quoteText } from '../../../lib/pricing';
import type { PricingInput } from '../../../lib/pricing';
import type { Product } from '../../../types';

// Calculadora de preço de impressão 3D. Os valores ficam guardados neste navegador (não vão para o banco),
// para a próxima peça já abrir com a sua impressora, filamento e hora de trabalho.
const STORAGE_KEY = 'catalogo-calculadora-v1';
type Form = Record<keyof PricingInput, string>;

const toForm = (v: PricingInput): Form => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])) as Form;
const DEFAULT_FORM = toForm(PRICING_DEFAULTS);

function loadForm(): Form {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return DEFAULT_FORM;
    const out = { ...DEFAULT_FORM };
    for (const k of Object.keys(DEFAULT_FORM) as (keyof PricingInput)[]) if (typeof saved[k] === 'string') out[k] = saved[k].slice(0, 12);
    return out;
  } catch {
    return DEFAULT_FORM;
  }
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface FieldDef { key: keyof PricingInput; label: string; prefix?: string; suffix?: string; step?: number; max?: number; hint?: string }
interface SectionDef { title: string; hint?: string; fields: FieldDef[] }

const SECTIONS: SectionDef[] = [
  {
    title: 'Impressora e desgaste',
    hint: 'O valor da impressora é dividido pelas horas de vida útil. A manutenção cobre trocas de bico, correias etc.',
    fields: [
      { key: 'printerValue', label: 'Valor da impressora', prefix: 'R$', step: 50 },
      { key: 'printerLife', label: 'Vida útil estimada', suffix: 'h', step: 100 },
      { key: 'wearRate', label: 'Manutenção', prefix: 'R$', suffix: '/h', step: 0.1 },
      { key: 'printerPower', label: 'Consumo médio', suffix: 'W', step: 10, hint: 'A maioria fica entre 100 e 150 W em média.' },
    ],
  },
  {
    title: 'Filamento',
    fields: [
      { key: 'materialPrice', label: 'Preço do rolo', prefix: 'R$', suffix: '/kg', step: 1 },
      { key: 'weightGrams', label: 'Peso por peça', suffix: 'g', step: 1, hint: 'O que o fatiador mostra para uma peça.' },
      { key: 'wastePercent', label: 'Perdas', suffix: '%', step: 1, hint: 'Purga, suportes e bordas.' },
    ],
  },
  {
    title: 'Impressão',
    hint: 'Tempo da mesa inteira. Com várias peças na mesa, energia, máquina e mão de obra são divididas entre elas.',
    fields: [
      { key: 'printHours', label: 'Horas', suffix: 'h', step: 1 },
      { key: 'printMinutes', label: 'Minutos', suffix: 'min', step: 5, max: 59 },
      { key: 'quantity', label: 'Peças na mesa', suffix: 'un.', step: 1 },
      { key: 'energyPrice', label: 'Tarifa de energia', prefix: 'R$', suffix: '/kWh', step: 0.01 },
    ],
  },
  {
    title: 'Mão de obra e embalagem',
    fields: [
      { key: 'laborHours', label: 'Tempo manual', suffix: 'h', step: 0.25, hint: 'Da mesa toda: preparar, tirar suportes, acabamento.' },
      { key: 'laborRate', label: 'Valor da sua hora', prefix: 'R$', step: 5 },
      { key: 'packaging', label: 'Embalagem por peça', prefix: 'R$', step: 0.5 },
    ],
  },
  {
    title: 'Lucro e taxas',
    fields: [
      { key: 'failureRate', label: 'Margem de falha', suffix: '%', step: 1, hint: 'Reserva para impressões que dão errado.' },
      { key: 'profitMargin', label: 'Lucro sobre o custo', suffix: '%', step: 5 },
      { key: 'platformFee', label: 'Taxa da plataforma', suffix: '%', step: 1, max: 90, hint: 'Marketplace ou maquininha. Deixe 0 se vender direto.' },
    ],
  },
];

interface PriceCalculatorProps {
  products: Product[];
  onSaveProduct: (product: Product, successMessage?: string) => unknown;
}

export default function PriceCalculator({ products, onSaveProduct }: PriceCalculatorProps) {
  const { toast, confirm } = useUI();
  const [form, setForm] = useState<Form>(loadForm);
  const [target, setTarget] = useState('');
  const result = useMemo(() => calculatePrice(form), [form]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* aba privada: só não guarda */ }
  }, [form]);

  const set = (key: keyof PricingInput, value: string) => setForm(f => ({ ...f, [key]: value }));

  const reset = async () => {
    const ok = await confirm({ title: 'Voltar aos valores de exemplo?', message: 'Os números que você preencheu nesta calculadora serão substituídos pelos valores de exemplo.', confirmLabel: 'Restaurar' });
    if (ok) setForm(DEFAULT_FORM);
  };

  const copy = async () => {
    const text = quoteText({ printHours: Number(form.printHours), printMinutes: Number(form.printMinutes) }, result);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Orçamento copiado. É só colar na conversa com o cliente.');
    } catch {
      window.prompt('Copie o orçamento:', text);
    }
  };

  const unitPrice = Math.round(result.unitPrice * 100) / 100;
  const applyToProduct = async () => {
    const product = products.find(p => p.id === target);
    if (!product) return;
    const ok = await confirm({
      title: 'Atualizar o preço na vitrine?',
      message: `“${product.title}” passa de ${brl(product.price)} para ${brl(unitPrice)}. Os clientes veem o preço novo na hora.`,
      confirmLabel: 'Atualizar preço',
    });
    if (ok) onSaveProduct({ ...product, price: unitPrice }, `Preço de “${product.title}” atualizado para ${brl(unitPrice)}.`);
  };

  return (
    <div>
      <PageHeader
        title="Calculadora de preço"
        description="Quanto cobrar por uma peça impressa: soma filamento, energia, desgaste da impressora, seu tempo e embalagem, e aplica a margem de falha, o lucro e a taxa da plataforma."
        actions={<Button icon={RotateCcw} onClick={reset}>Valores de exemplo</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-5 order-2 lg:order-1">
          {SECTIONS.map(section => (
            <fieldset key={section.title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <legend className="sr-only">{section.title}</legend>
              <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
              {section.hint && <p className="mt-1 text-xs text-gray-500">{section.hint}</p>}
              <div className={`mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2 ${section.fields.length === 3 ? 'xl:grid-cols-3' : ''}`}>
                {section.fields.map(f => <NumberField key={f.key} def={f} value={form[f.key]} onChange={v => set(f.key, v)} />)}
              </div>
            </fieldset>
          ))}
          <p className="text-xs text-gray-500">Os valores ficam guardados só neste navegador.</p>
        </div>

        <aside aria-label="Resultado" className="order-1 lg:order-2 lg:sticky lg:top-4 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{result.quantity > 1 ? 'Preço sugerido por peça' : 'Preço sugerido'}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900" aria-live="polite">{brl(result.unitPrice)}</p>
            <div className="mt-2 space-y-0.5 text-sm text-gray-600">
              {result.quantity > 1 && <p>Mesa com {result.quantity} peças: <strong className="text-gray-900">{brl(result.batchPrice)}</strong></p>}
              <p>Custo por peça: <strong className="text-gray-900">{brl(result.unitCost)}</strong></p>
              {result.unitNet !== result.unitPrice && <p>Você recebe, depois da taxa: <strong className="text-gray-900">{brl(result.unitNet)}</strong></p>}
            </div>
          </div>

          <dl className="divide-y divide-dashed divide-gray-200 px-5 py-3 text-sm">
            {result.lines.map(l => (
              <div key={l.name} className="flex items-center justify-between gap-3 py-1.5">
                <dt className={l.kind === 'profit' ? 'font-semibold text-green-700' : 'text-gray-600'}>{l.name}</dt>
                <dd className={`tabular-nums ${l.kind === 'profit' ? 'font-semibold text-green-700' : 'font-medium text-gray-900'}`}>{brl(l.value)}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-3 border-t border-gray-200 p-5">
            <Button variant="primary" icon={Copy} className="w-full" onClick={copy}>Copiar orçamento para o cliente</Button>
            {products.length > 0 && (
              <div>
                <label htmlFor="calc-produto" className="block text-xs font-medium text-gray-700 mb-1">Usar como preço de um produto</label>
                <div className="flex gap-2">
                  <select id="calc-produto" value={target} onChange={e => setTarget(e.target.value)} className={`${inputClass} min-w-0`}>
                    <option value="">Escolha o produto…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.title} ({brl(p.price)})</option>)}
                  </select>
                  <Button icon={Tag} onClick={applyToProduct} disabled={!target || unitPrice <= 0}>Aplicar</Button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function NumberField({ def, value, onChange }: { def: FieldDef; value: string; onChange: (v: string) => void }) {
  const id = `calc-${def.key}`;
  return (
    // Subgrid: rótulo, campo e dica de cada coluna ficam em linhas compartilhadas,
    // então um rótulo que quebra em duas linhas não desalinha os campos ao lado
    <div className="grid grid-rows-subgrid row-span-3 gap-y-1">
      <label htmlFor={id} className="self-end text-sm font-medium text-gray-700">
        {def.label}{(def.prefix || def.suffix) && <span className="sr-only"> (em {[def.prefix, def.suffix].filter(Boolean).join(' ')})</span>}
      </label>
      <div className="flex items-center rounded-md border border-gray-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
        {def.prefix && <span className="mr-2 text-sm text-gray-500" aria-hidden="true">{def.prefix}</span>}
        <input
          id={id} type="number" inputMode="decimal" min={0} max={def.max} step={def.step ?? 1} value={value}
          onChange={e => onChange(e.target.value)} aria-describedby={def.hint ? `${id}-dica` : undefined}
          className="w-full min-w-0 bg-transparent py-2 text-right text-sm font-medium tabular-nums text-gray-900 outline-none"
        />
        {def.suffix && <span className="ml-2 whitespace-nowrap text-sm text-gray-500" aria-hidden="true">{def.suffix}</span>}
      </div>
      {def.hint ? <p id={`${id}-dica`} className="text-xs text-gray-500">{def.hint}</p> : <span aria-hidden="true" />}
    </div>
  );
}
