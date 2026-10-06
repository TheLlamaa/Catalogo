import { describe, it, expect } from 'vitest';
import { buildReportHtml, esc } from '../../src/lib/report';

const order = (over = {}) => ({
  id: 'abc123de-0000-0000-0000-000000000000', client_name: 'Maria', client_phone: '(48) 99999-1111', created_at: new Date(2026, 9, 3, 10).toISOString(),
  status: 'concluido', total: 70, delivery_method: 'entrega', delivery_address: 'Rua A, 10', notes: 'Pintar de azul',
  items: [{ id: 'p1', title: 'Vaso', price: 35, quantity: 2, options: { Cor: 'Azul' } }], ...over,
});
const base = { storeName: 'Oficina', periodText: 'Este mês', generatedAt: new Date(2026, 9, 4) };

describe('esc', () => {
  it('escapa os caracteres do HTML', () => expect(esc(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'));
  it('null vira vazio', () => expect(esc(null)).toBe(''));
});

describe('buildReportHtml', () => {
  it('traz resumo, produtos, dia e pedidos', () => {
    const html = buildReportHtml({ ...base, orders: [order()] });
    expect(html).toContain('Relatório de pedidos');
    expect(html).toContain('Este mês');
    expect(html).toContain('R$\u00a070,00');
    expect(html).toContain('#ABC123');
    expect(html).toContain('2x Vaso');
    expect(html).toContain('Cor: Azul');
    expect(html).toContain('Rua A, 10');
    expect(html).toContain('Pintar de azul');
    expect(html).toContain('03/10/2026');
    expect(html).toContain('Imprimir / Salvar PDF');
  });
  it('não tem script nem onclick dentro do HTML (o CSP do site bloquearia)', () => {
    const html = buildReportHtml({ ...base, orders: [order()] });
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('id="imprimir"');
  });
  it('tabela "Valor por dia" sem a barrinha de gráfico', () => {
    const html = buildReportHtml({ ...base, orders: [order()] });
    expect(html).not.toContain('class="bar"');
    expect(html).not.toMatch(/style="width:/);
  });
  it('NÃO deixa texto do cliente virar HTML (nome, endereço, observação, produto)', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const html = buildReportHtml({ ...base, orders: [order({ client_name: evil, delivery_address: evil, notes: evil, items: [{ id: 'p', title: evil, price: 1, quantity: 1, options: { [evil]: evil } }] })] });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
  it('nome da loja e filtros também são escapados', () => {
    const html = buildReportHtml({ ...base, storeName: '<b>X</b>', filterText: '"busca"', orders: [] });
    expect(html).not.toContain('<b>X</b>');
    expect(html).toContain('&quot;busca&quot;');
  });
  it('sem pedidos mostra aviso em vez de tabela vazia', () => {
    const html = buildReportHtml({ ...base, orders: [] });
    expect(html).toContain('Nenhum pedido neste período.');
    expect(html).toContain('Pedidos (0)');
  });
  it('cancelado aparece na lista mas fica fora do faturamento', () => {
    const html = buildReportHtml({ ...base, orders: [order(), order({ id: 'ffffff00-0', status: 'cancelado', total: 500 })] });
    expect(html).toContain('R$\u00a0500,00'); // só como "não contados" e na linha do pedido
    expect(html).toContain('não contados');
    expect(html).toMatch(/Faturamento<\/span><strong>R\$\u00a070,00</);
  });
  it('versão resumida não traz a coluna de itens', () => {
    const html = buildReportHtml({ ...base, orders: [order()], detailed: false });
    expect(html).not.toContain('<th>Itens</th>');
  });
});
