import { describe, it, expect } from 'vitest';
import { createMemoryGateway } from '../../src/services/memoryGateway';
import { categoryPayload, detectCapabilities, patchPayload, productPayload, toCategories, toProducts } from '../../src/services/mapping';

const ALL = { ordering: true, discount: true, categoryVisibility: true };
const NONE = { ordering: false, discount: false, categoryVisibility: false };
const product = (id, over = {}) => ({
  id, title: `P${id}`, description: '', price: 10, stock: 5, active: true, badge: 'Novo', section: 'destaque',
  sortOrder: 0, categoryIds: ['c1'], imageUrls: ['a.jpg'], auraColor: 'inherit', options: [], leadTime: '', modelUrl: '',
  discountPercent: 0, ...over,
});

describe('mapeamento linha do banco -> domínio', () => {
  it('aplica os defaults de colunas ausentes', () => {
    const [p] = toProducts([{ id: 'a', title: 'T', description: '', price: 5 }], {});
    expect(p).toMatchObject({ sortOrder: 0, badge: '', section: '', categoryIds: [], imageUrls: [], active: true, stock: 0, auraColor: 'inherit', options: [], leadTime: '', discountPercent: 0, modelUrl: '' });
  });
  it('não vaza colunas snake_case para o domínio', () => {
    const [p] = toProducts([{ id: 'a', title: 'T', description: '', price: 5, sort_order: 2, aura_color: 'x', category_ids: ['c'] }], {});
    expect(Object.keys(p).filter(k => k.includes('_') && k !== 'created_at')).toEqual([]);
    expect(p).toMatchObject({ sortOrder: 2, auraColor: 'x', categoryIds: ['c'] });
  });
  it('junta o link do modelo 3D e limita o desconto', () => {
    const [p] = toProducts([{ id: 'a', title: 'T', description: '', price: 5, discount_percent: 200 }], { a: 'https://m/x' });
    expect(p).toMatchObject({ modelUrl: 'https://m/x', discountPercent: 90 });
  });
  it('ordena pela ordem manual e, no empate, o mais novo primeiro', () => {
    const rows = [
      { id: 'velho', title: '', description: '', price: 1, created_at: '2026-01-01' },
      { id: 'novo', title: '', description: '', price: 1, created_at: '2026-06-01' },
      { id: 'primeiro', title: '', description: '', price: 1, sort_order: -1, created_at: '2020-01-01' },
    ];
    expect(toProducts(rows, {}).map(p => p.id)).toEqual(['primeiro', 'novo', 'velho']);
  });
  it('categoria só tem "visible" se o banco tem a coluna', () => {
    const [antiga] = toCategories([{ id: 'a', name: 'A' }]);
    const [nova] = toCategories([{ id: 'a', name: 'A', visible: false }]);
    expect('visible' in antiga).toBe(false);
    expect(nova.visible).toBe(false);
    expect(antiga.auraColor).toBe('none');
  });
});

describe('capacidades do banco', () => {
  it('vêm das colunas presentes nas linhas', () => {
    expect(detectCapabilities([{ sort_order: 1, discount_percent: 0 }], [{ visible: true }])).toEqual(ALL);
    expect(detectCapabilities([{ title: 'x' }], [{ name: 'y' }])).toEqual(NONE);
  });
});

describe('gravação', () => {
  it('colunas de SQL novo só vão se o banco as tem', () => {
    const p = product('a', { discountPercent: 0 });
    expect(Object.keys(productPayload(p, NONE))).not.toEqual(expect.arrayContaining(['badge']));
    expect(productPayload(p, NONE)).not.toHaveProperty('discount_percent');
    expect(productPayload(p, ALL)).toMatchObject({ badge: 'Novo', section: 'destaque', discount_percent: 0 });
  });
  it('desconto de fato vai mesmo sem o banco avisar', () => {
    expect(productPayload(product('a', { discountPercent: 15 }), NONE)).toMatchObject({ discount_percent: 15 });
  });
  it('edição parcial leva só os campos pedidos', () => {
    expect(patchPayload({ stock: 3 }, ALL)).toEqual({ stock: 3 });
    expect(patchPayload({ active: false, auraColor: '' }, ALL)).toEqual({ active: false, aura_color: 'inherit' });
  });
  it('"vitrine" na edição parcial exige o SQL 06', () => {
    expect(patchPayload({ section: 'destaque' }, NONE)).toEqual({});
    expect(patchPayload({ section: '' }, ALL)).toEqual({ section: null });
  });
  it('categoria nova recebe o fim da fila; existente mantém o id e não reordena', () => {
    expect(categoryPayload({ name: 'Casa & Jardim' }, ALL, 4)).toMatchObject({ slug: 'casa-jardim', sort_order: 4, aura_color: 'none' });
    const existente = categoryPayload({ id: 'c', name: 'X' }, ALL, 4);
    expect(existente.id).toBe('c');
    expect(existente).not.toHaveProperty('sort_order');
  });
});

// Contrato que o adapter do Supabase também cumpre; aqui contra o adapter em memória
describe('gateway em memória', () => {
  const setup = (over = {}) => createMemoryGateway({ products: [product('a', { stock: 5, auraColor: 'ouro', badge: 'Novo', section: 'destaque', discountPercent: 20, modelUrl: 'https://m/a' })], ...over });

  it('a edição rápida de estoque não mexe nos outros campos', async () => {
    const { gateway, state } = setup();
    const before = structuredClone(state.products[0]);
    await gateway.patchProduct('a', { stock: 2 }, { capabilities: ALL });
    expect(state.products[0]).toEqual({ ...before, stock: 2 });
  });
  it('edição rápida não apaga uma mudança que chegou de outro lugar (lost update)', async () => {
    const { gateway, state } = setup();
    const stale = structuredClone(state.products[0]); // tela com cópia velha
    await gateway.patchProduct('a', { auraColor: 'prata' }, { capabilities: ALL }); // outro admin muda a aura
    await gateway.patchProduct('a', { stock: 1 }, { capabilities: ALL }); // tela velha só mexe no estoque
    expect(state.products[0]).toMatchObject({ auraColor: 'prata', stock: 1 });
    expect(stale.auraColor).toBe('ouro');
  });
  it('salvar sem o SQL 06 preserva selo e vitrine que já estavam', async () => {
    const { gateway, state } = setup();
    await gateway.saveProduct({ ...state.products[0], title: 'Novo nome', badge: 'Outro', section: '' }, { capabilities: NONE, previousModelUrl: '' });
    expect(state.products[0]).toMatchObject({ title: 'Novo nome', badge: 'Novo', section: 'destaque' });
  });
  it('produto novo entra no começo e recebe id', async () => {
    const { gateway, state } = setup();
    await gateway.saveProduct({ title: 'Novo', price: 3, stock: 1 }, { capabilities: ALL, previousModelUrl: '' });
    expect(state.products).toHaveLength(2);
    expect(state.products[0].title).toBe('Novo');
    expect(state.products[0].id).toBeTruthy();
  });
  it('reordena e persiste a ordem', async () => {
    const { gateway, state } = setup({ products: [product('a'), product('b')] });
    await gateway.reorder('products', [{ id: 'b', sortOrder: 1 }, { id: 'a', sortOrder: 2 }]);
    expect(state.products.map(p => [p.id, p.sortOrder])).toEqual([['a', 2], ['b', 1]]);
  });
  it('visitante não recebe pedidos', async () => {
    const { gateway } = setup({ catalogOrders: [{ id: 'o1' }] });
    expect((await gateway.load({ isAdmin: false })).catalogOrders).toBeNull();
    expect((await gateway.load({ isAdmin: true })).catalogOrders).toHaveLength(1);
  });
  it('configurações: grava e remove chaves', async () => {
    const { gateway, state } = setup({ settings: [{ key: 'a', value: '1' }, { key: 'b', value: '2' }] });
    await gateway.writeSettings({ upsert: [{ key: 'a', value: '9' }, { key: 'c', value: '3' }], remove: ['b'] });
    expect(Object.fromEntries(state.settings.map(r => [r.key, r.value]))).toEqual({ a: '9', c: '3' });
  });
  it('status de pedido muda no lugar e falhas viram erro, não exceção', async () => {
    const { gateway, state, failWith } = setup({ catalogOrders: [{ id: 'o1', status: 'novo' }] });
    await gateway.setOrderStatus('orders', 'o1', 'enviado');
    expect(state.catalogOrders[0].status).toBe('enviado');
    failWith('deleteOrder', 'sem permissão');
    expect((await gateway.deleteOrder('orders', 'o1')).error).toEqual({ message: 'sem permissão' });
    expect(state.catalogOrders).toHaveLength(1);
  });
  it('lê o schema_version', async () => {
    expect((await setup({ schemaVersion: 13 }).gateway.loadSchemaStatus()).ok).toBe(true);
    expect((await setup({ schemaVersion: 9 }).gateway.loadSchemaStatus()).reason).toBe('desatualizado');
    expect((await setup().gateway.loadSchemaStatus()).reason).toBe('sem-versao');
  });
});
