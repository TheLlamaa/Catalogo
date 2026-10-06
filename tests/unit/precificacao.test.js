import { describe, it, expect } from 'vitest';
import { calculatePrice, quoteText, PRICING_DEFAULTS } from '../../src/lib/pricing';

// Mesma conta da calculadora original (planilha em HTML), com consumo de 150 W
describe('calculadora de preço', () => {
  it('valores de exemplo dão o mesmo preço da calculadora original', () => {
    const r = calculatePrice(PRICING_DEFAULTS);
    expect(r.unitPrice).toBeCloseTo(47.67, 2);
    expect(r.unitCost).toBeCloseTo(34.05, 2);
    expect(r.lines.find(l => l.name === 'Filamento').value).toBeCloseTo(4.369, 3);
    expect(r.lines.reduce((s, l) => s + l.value, 0)).toBeCloseTo(r.unitPrice, 6); // a composição fecha com o preço
  });
  it('com várias peças na mesa, só filamento e embalagem multiplicam', () => {
    const um = calculatePrice({ ...PRICING_DEFAULTS, quantity: 1 });
    const quatro = calculatePrice({ ...PRICING_DEFAULTS, quantity: 4 });
    expect(quatro.quantity).toBe(4);
    expect(quatro.unitPrice).toBeLessThan(um.unitPrice);
    expect(quatro.batchPrice).toBeCloseTo(quatro.unitPrice * 4, 6);
    expect(quatro.lines.find(l => l.name === 'Filamento').value).toBeCloseTo(um.lines.find(l => l.name === 'Filamento').value, 6);
  });
  it('taxa da plataforma: preço sobe para sobrar o mesmo líquido', () => {
    const sem = calculatePrice(PRICING_DEFAULTS);
    const com = calculatePrice({ ...PRICING_DEFAULTS, platformFee: 20 });
    expect(com.unitNet).toBeCloseTo(sem.unitPrice, 6);
    expect(com.unitPrice).toBeCloseTo(sem.unitPrice / 0.8, 6);
    expect(com.lines.some(l => l.kind === 'fee')).toBe(true);
    expect(calculatePrice({ ...PRICING_DEFAULTS, platformFee: 500 }).unitPrice).toBeCloseTo(sem.unitPrice / 0.1, 6); // trava em 90%
  });
  it('aceita texto do formulário (vírgula, vazio, negativo)', () => {
    const r = calculatePrice({ ...PRICING_DEFAULTS, materialPrice: '89,9', quantity: '', wearRate: '-5', printerLife: '0' });
    expect(r.quantity).toBe(1);
    expect(Number.isFinite(r.unitPrice)).toBe(true);
    expect(r.lines.find(l => l.name === 'Filamento').value).toBeCloseTo(4.369, 3);
  });
  it('texto do orçamento para o cliente', () => {
    const r = calculatePrice({ ...PRICING_DEFAULTS, quantity: 3 });
    const t = quoteText({ printHours: 3, printMinutes: 30 }, r);
    expect(t).toContain('3h 30min');
    expect(t).toContain('Quantidade: 3 unidades');
    expect(t).not.toContain('Lucro');
  });
});

import { resolveDark } from '../../src/lib/colorMode';
describe('modo escuro', () => {
  it('sem escolha segue o aparelho; escolha manual vale mais', () => {
    expect(resolveDark('auto', true)).toBe(true);
    expect(resolveDark('auto', false)).toBe(false);
    expect(resolveDark('light', true)).toBe(false);
    expect(resolveDark('dark', false)).toBe(true);
  });
});

import { clampDiscount, discountedPrice } from '../../src/lib/discount';
describe('desconto em % do produto', () => {
  it('mesma conta do banco (arredonda centavos, metade para cima)', () => {
    expect(discountedPrice(60, 15)).toBe(51);
    expect(discountedPrice(39.9, 15)).toBe(33.92); // 33,915 → 33,92
    expect(discountedPrice(10, 33)).toBe(6.7);
    expect(discountedPrice(25, 0)).toBe(25);
  });
  it('limita entre 0 e 90 e aceita texto', () => {
    expect(clampDiscount('15')).toBe(15);
    expect(clampDiscount('')).toBe(0);
    expect(clampDiscount(-3)).toBe(0);
    expect(clampDiscount(150)).toBe(90);
    expect(clampDiscount(undefined)).toBe(0);
  });
});
