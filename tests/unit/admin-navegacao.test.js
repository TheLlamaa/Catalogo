import { describe, it, expect } from 'vitest';
import { GROUPS, SETTINGS_SCHEMA } from '../../src/lib/settings';
import { buildNav } from '../../src/features/admin/AdminNav';

const base = { products: 10, categories: 4, orders: 3, newOrders: 1, newCustom: 0, customOrders: 0, customEnabled: true, aurasEnabled: true };
const ids = (nav) => nav.flatMap(s => s.items.map(i => i.id));

describe('organização das configurações do site', () => {
  it('toda seção pertence a exatamente um grupo (nada some nem aparece duas vezes)', () => {
    const listed = GROUPS.flatMap(g => g.sections);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(SETTINGS_SCHEMA.map(s => s.title).sort());
  });
  it('o grupo de cada seção bate com a lista do grupo', () => {
    for (const s of SETTINGS_SCHEMA) expect(GROUPS.find(g => g.id === s.group)?.sections).toContain(s.title);
  });
  it('dados da loja (nome, WhatsApp) ficam em "Dados da loja", não em textos soltos', () => {
    const loja = SETTINGS_SCHEMA.filter(s => s.group === 'loja').flatMap(s => s.fields.map(f => f.key));
    expect(loja).toEqual(expect.arrayContaining(['storeName', 'whatsapp', 'email']));
  });
  it('pausar pedidos fica junto do carrinho, em "Pedidos e carrinho"', () => {
    const pedidos = SETTINGS_SCHEMA.filter(s => s.group === 'pedidos').flatMap(s => s.fields.map(f => f.key));
    expect(pedidos).toEqual(expect.arrayContaining(['ordersPaused', 'minOrder', 'deliveryEnabled']));
  });
  it('todo grupo tem explicação para quem nunca usou o painel', () => {
    for (const g of GROUPS) expect(g.description.length).toBeGreaterThan(20);
  });
});

describe('menu do painel', () => {
  it('agrupa em Vendas, Catálogo, Site e Sistema', () => {
    expect(buildNav(base).map(s => s.title)).toEqual(['Vendas', 'Catálogo', 'Site', 'Sistema']);
  });
  it('cada área do site vira um item do menu', () => {
    expect(ids(buildNav(base)).filter(i => i.startsWith('site:'))).toEqual(GROUPS.map(g => `site:${g.id}`));
  });
  it('Auras só aparece com o recurso ligado', () => {
    expect(ids(buildNav(base))).toContain('auras');
    expect(ids(buildNav({ ...base, aurasEnabled: false }))).not.toContain('auras');
  });
  it('Personalizados some com o recurso desligado, mas volta se ainda houver pedidos antigos', () => {
    expect(ids(buildNav({ ...base, customEnabled: false }))).not.toContain('custom_orders');
    expect(ids(buildNav({ ...base, customEnabled: false, customOrders: 2 }))).toContain('custom_orders');
  });
  it('pedidos novos aparecem como alerta no item Pedidos', () => {
    const pedidos = buildNav(base)[0].items.find(i => i.id === 'orders');
    expect(pedidos).toMatchObject({ count: 3, alert: 1 });
  });
});
