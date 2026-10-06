// Calculadora de preço de peças impressas em 3D (painel → Sistema → Calculadora de preço).
// Custos da mesa de impressão (energia, máquina, mão de obra) são do lote inteiro; filamento e embalagem são por unidade.

export interface PricingInput {
  printerValue: number;   // R$ do equipamento
  printerLife: number;    // horas de vida útil
  wearRate: number;       // R$ de manutenção por hora
  printerPower: number;   // W médios da impressora
  materialPrice: number;  // R$ por kg
  weightGrams: number;    // g por peça
  wastePercent: number;   // % de perdas (purge, suportes)
  printHours: number;
  printMinutes: number;
  energyPrice: number;    // R$ por kWh
  quantity: number;       // unidades na mesa
  laborHours: number;     // tempo manual do lote
  laborRate: number;      // R$ por hora
  packaging: number;      // R$ por unidade
  failureRate: number;    // % de margem de falha
  profitMargin: number;   // % de lucro sobre o custo
  platformFee: number;    // % de taxa da plataforma (até 90)
}

export const PRICING_DEFAULTS: PricingInput = {
  printerValue: 2500, printerLife: 3000, wearRate: 1.5, printerPower: 150,
  materialPrice: 89.9, weightGrams: 45, wastePercent: 8,
  printHours: 3, printMinutes: 30, energyPrice: 0.8, quantity: 1,
  laborHours: 0.5, laborRate: 30, packaging: 3,
  failureRate: 10, profitMargin: 40, platformFee: 0,
};

export interface PricingLine { name: string; value: number; kind?: 'profit' | 'fee' }

export interface PricingResult {
  quantity: number;
  totalHours: number;
  unitPrice: number;      // preço sugerido por unidade (já com a taxa)
  batchPrice: number;     // preço do lote inteiro
  unitNet: number;        // por unidade, depois da taxa da plataforma
  unitCost: number;       // custo por unidade (com perdas, sem lucro)
  lines: PricingLine[];   // composição por unidade
}

const n = (v: unknown): number => {
  const x = typeof v === 'number' ? v : Number.parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(x) && x > 0 ? x : 0; // negativos não fazem sentido em nenhum campo
};

export function calculatePrice(raw: Partial<Record<keyof PricingInput, unknown>>): PricingResult {
  const v = Object.fromEntries(Object.keys(PRICING_DEFAULTS).map(k => [k, n(raw[k as keyof PricingInput])])) as unknown as PricingInput;
  const quantity = Math.max(1, Math.round(v.quantity) || 1);
  const platformFee = Math.min(v.platformFee, 90);

  const totalHours = v.printHours + v.printMinutes / 60;
  const effectiveWeight = v.weightGrams * (1 + v.wastePercent / 100);

  const material = (effectiveWeight / 1000) * v.materialPrice * quantity;
  const energy = (v.printerPower / 1000) * totalHours * v.energyPrice;
  const depreciation = v.printerLife > 0 ? (v.printerValue / v.printerLife) * totalHours : 0;
  const machine = depreciation + v.wearRate * totalHours;
  const labor = v.laborHours * v.laborRate;
  const packaging = v.packaging * quantity;

  const subtotal = material + energy + machine + labor + packaging;
  const failure = subtotal * (v.failureRate / 100);
  const cost = subtotal + failure;
  const profit = cost * (v.profitMargin / 100);
  const beforeFee = cost + profit;
  const batchPrice = platformFee > 0 ? beforeFee / (1 - platformFee / 100) : beforeFee;
  const fee = batchPrice - beforeFee;

  const per = (x: number) => x / quantity;
  const lines: PricingLine[] = [
    { name: 'Filamento', value: per(material) },
    { name: 'Energia', value: per(energy) },
    { name: 'Máquina (desgaste e manutenção)', value: per(machine) },
    { name: 'Mão de obra', value: per(labor) },
    { name: 'Embalagem', value: per(packaging) },
    { name: 'Margem de falha', value: per(failure) },
    { name: 'Lucro', value: per(profit), kind: 'profit' },
  ];
  if (platformFee > 0) lines.push({ name: 'Taxa da plataforma', value: per(fee), kind: 'fee' });

  return { quantity, totalHours, unitPrice: per(batchPrice), batchPrice, unitNet: per(beforeFee), unitCost: per(cost), lines };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Texto para mandar ao cliente (sem a composição de custos)
export function quoteText(input: Pick<PricingInput, 'printHours' | 'printMinutes'>, r: PricingResult): string {
  const h = Math.floor(n(input.printHours));
  const m = Math.round(n(input.printMinutes));
  const time = [h ? `${h}h` : '', m ? `${m}min` : ''].filter(Boolean).join(' ') || '—';
  const lines = ['Orçamento de impressão 3D', `Tempo estimado de impressão: ${time}`, ''];
  if (r.quantity > 1) lines.push(`Quantidade: ${r.quantity} unidades`, `Valor por unidade: ${brl(r.unitPrice)}`, `Total: ${brl(r.batchPrice)}`);
  else lines.push(`Valor: ${brl(r.unitPrice)}`);
  return lines.join('\n');
}
