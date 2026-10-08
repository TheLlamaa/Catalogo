import { describe, it, expect } from 'vitest';
import { TEXTS, TEXT_DEFAULTS, makeT } from '../../src/lib/texts';
import { SETTING_FIELDS, GROUPS, mergeSettings } from '../../src/lib/settings';
import { lowStockMaxOf, availability, badgeFor, newProducts, stockLevel } from '../../src/lib/catalog';
import { buildOrderMessage } from '../../src/lib/format';

describe('textos editáveis', () => {
  it('toda chave de configuração cabe no banco (só letras, até 40)', () => {
    for (const f of SETTING_FIELDS) expect(f.key, f.key).toMatch(/^[A-Za-z]{1,40}$/);
  });
  it('não há chave de texto repetida e todo texto tem padrão', () => {
    const keys = TEXTS.map(t => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const t of TEXTS) expect(t.default.length, t.key).toBeGreaterThan(0);
  });
  it('sem nada gravado, o site usa os textos de sempre', () => {
    const t = makeT(mergeSettings([]));
    expect(t('tSoldOut')).toBe('Esgotado');
    expect(t('tAllProducts')).toBe('Todos os modelos');
    expect(t('tCartNext')).toBe('Avançar para Identificação');
    expect(t('tFooterAdmin')).toBe('Área do lojista');
  });
  it('o texto do dono vale; vazio volta ao padrão', () => {
    expect(makeT(mergeSettings([{ key: 'tSoldOut', value: 'Acabou' }]))('tSoldOut')).toBe('Acabou');
    expect(makeT(mergeSettings([{ key: 'tSoldOut', value: '   ' }]))('tSoldOut')).toBe('Esgotado');
  });
  it('troca {n}, {lista}, {min} e {falta}; mantém o que não conhece', () => {
    const t = makeT({});
    expect(t('tLeftMany', { n: 2 })).toBe('Restam 2 unidades');
    expect(t('tInStock', { n: 7 })).toBe('7 em estoque');
    expect(t('tChooseFirst', { lista: 'Cor, Tamanho' })).toBe('Escolha: Cor, Tamanho.');
    expect(t('tMinOrder', { min: 'R$ 30,00', falta: 'R$ 5,00' })).toBe('Pedido mínimo: R$ 30,00. Faltam R$ 5,00.');
    expect(makeT({ tLeftMany: 'Só {n} e {x}' })('tLeftMany', { n: 1 })).toBe('Só 1 e {x}');
  });
  it('todo grupo e toda seção de texto existe no painel', () => {
    const grupo = GROUPS.find(g => g.id === 'textos');
    expect(grupo).toBeTruthy();
    expect(new Set(TEXTS.map(t => t.section))).toEqual(new Set(grupo.sections));
  });
  it('TEXT_DEFAULTS bate com TEXTS', () => {
    for (const t of TEXTS) expect(TEXT_DEFAULTS[t.key]).toBe(t.default);
  });
});

describe('regras da vitrine configuráveis', () => {
  it('padrões iguais ao comportamento antigo', () => {
    const s = mergeSettings([]);
    expect(s.pageSize).toBe('12'); expect(s.showSort).toBe(true); expect(s.showCardDescription).toBe(true);
    expect(s.showCopyLink).toBe(true); expect(s.showStockCount).toBe(true); expect(s.relatedCount).toBe('4');
    expect(s.newDays).toBe('30'); expect(s.newMax).toBe('8'); expect(s.showAdminLink).toBe(true);
    expect(lowStockMaxOf(s)).toBe(3);
  });
  it('limite de poucas unidades vale para estoque, selo e aviso', () => {
    expect(stockLevel(5)).toBe('ok');
    expect(availability({ available: 5, stock: 5 }, true, 5)).toBe('low');
    expect(availability({ available: 5, stock: 5 }, true)).toBe('ok');
    expect(badgeFor({ badge: '', stock: 4 }, { stockControl: true, lowStockBadge: true, lowStockText: '', lowStockMax: '5' })).toBe('Últimas unidades');
    expect(badgeFor({ badge: '', stock: 4 }, { stockControl: true, lowStockBadge: true, lowStockMax: '3' })).toBe('');
    expect(lowStockMaxOf({ lowStockMax: 'abc' })).toBe(3);
  });
  it('novidades respeitam dias e quantidade', () => {
    const now = new Date('2026-10-10T00:00:00Z').getTime();
    const mk = (id, dias) => ({ id, active: true, created_at: new Date(now - dias * 86400000).toISOString() });
    const list = [mk('a', 3), mk('b', 20), mk('c', 100), mk('d', 5)];
    expect(newProducts(list, now).map(p => p.id)).toEqual(['a', 'b', 'd']);
    expect(newProducts(list, now, 7).map(p => p.id)).toEqual(['a', 'd']);
    expect(newProducts(list, now, 30, 1).map(p => p.id)).toEqual(['a']);
  });
});

describe('mensagem do WhatsApp com rótulos próprios', () => {
  const base = { name: 'Ana', items: [{ title: 'Vaso', price: 10, quantity: 2 }], total: 20, deliveryMethod: 'entrega', deliveryAddress: 'Rua A', notes: 'Rápido' };
  it('sem rótulos: igual ao de sempre', () => {
    const msg = buildOrderMessage(base);
    expect(msg).toContain('Total: R$');
    expect(msg).toContain('Entrega: Rua A');
    expect(msg).toContain('Observações: Rápido');
    expect(buildOrderMessage({ ...base, deliveryMethod: 'retirada' })).toContain('Retirada');
  });
  it('com rótulos do dono', () => {
    const msg = buildOrderMessage({ ...base, labels: { total: 'Valor:', delivery: 'Enviar para:', notes: 'Recado:' } });
    expect(msg).toContain('Valor: R$');
    expect(msg).toContain('Enviar para: Rua A');
    expect(msg).toContain('Recado: Rápido');
  });
});
