import { describe, it, expect } from 'vitest';
import { MAX_DETAILS, MAX_SPECS, detailsToStored, hasProductInfo, parseDetails, parseSpecs, specsToStored } from '../../src/lib/productInfo';
import { detectCapabilities, productPayload, toProduct } from '../../src/services/mapping';
import { createMemoryGateway } from '../../src/services/memoryGateway';

const ALL = { ordering: true, discount: true, categoryVisibility: true, productInfo: true };
const NONE = { ordering: false, discount: false, categoryVisibility: false, productInfo: false };

describe('características e blocos do produto', () => {
  it('lê do banco e ignora lixo', () => {
    expect(parseSpecs(null)).toEqual([]);
    expect(parseSpecs('x')).toEqual([]);
    expect(parseSpecs([{ n: ' Altura ', v: ' 20cm ' }, { n: 'Sem valor', v: '' }, null, 5, { n: 'Peso', v: '860g' }]))
      .toEqual([{ name: 'Altura', value: '20cm' }, { name: 'Peso', value: '860g' }]);
    expect(parseDetails([{ t: 'Prazo', x: 'Texto' }, { t: 'Sem texto', x: '  ' }, { x: 'Só texto' }]))
      .toEqual([{ title: 'Prazo', text: 'Texto' }, { title: '', text: 'Só texto' }]);
  });
  it('respeita os limites (12 características, 6 blocos, tamanho dos textos)', () => {
    const muitas = Array.from({ length: 20 }, (_, i) => ({ n: `N${i}`, v: 'v' }));
    expect(parseSpecs(muitas)).toHaveLength(MAX_SPECS);
    expect(parseDetails(Array.from({ length: 9 }, () => ({ t: 't', x: 'x' })))).toHaveLength(MAX_DETAILS);
    expect(parseSpecs([{ n: 'a'.repeat(100), v: 'b'.repeat(500) }])[0].name).toHaveLength(40);
    expect(parseDetails([{ t: 't', x: 'x'.repeat(5000) }])[0].text).toHaveLength(1200);
  });
  it('o formulário vira o formato curto do banco e descarta linhas vazias', () => {
    expect(specsToStored([{ name: 'Material', value: 'Cimento' }, { name: '', value: '' }, { name: 'Peso', value: '' }])).toEqual([{ n: 'Material', v: 'Cimento' }]);
    expect(detailsToStored([{ title: 'Cuidados', text: 'Evite água' }, { title: 'Vazio', text: '' }])).toEqual([{ t: 'Cuidados', x: 'Evite água' }]);
    expect(specsToStored(undefined)).toEqual([]);
  });
  it('hasProductInfo', () => {
    expect(hasProductInfo({})).toBe(false);
    expect(hasProductInfo({ specs: [{ name: 'a', value: 'b' }] })).toBe(true);
    expect(hasProductInfo({ details: [{ title: '', text: 'x' }] })).toBe(true);
  });
});

describe('gravação e leitura no banco', () => {
  const row = { id: 'p1', title: 'Bandeja', description: 'd', price: 10, specs: [{ n: 'Altura', v: '20cm' }], details: [{ t: 'Prazo', x: '2-7 dias' }] };
  it('lê as colunas novas e funciona em banco antigo (sem elas)', () => {
    expect(toProduct(row)).toMatchObject({ specs: [{ name: 'Altura', value: '20cm' }], details: [{ title: 'Prazo', text: '2-7 dias' }] });
    expect(toProduct({ id: 'p2', title: 'x', description: '', price: 1 })).toMatchObject({ specs: [], details: [] });
  });
  it('detecta o SQL 18 pela coluna', () => {
    expect(detectCapabilities([row], []).productInfo).toBe(true);
    expect(detectCapabilities([{ id: 'x' }], []).productInfo).toBe(false);
  });
  it('só grava as colunas se o banco as tem', () => {
    const p = { id: 'p1', title: 'B', price: 1, specs: [{ name: 'Altura', value: '20cm' }, { name: '', value: '' }], details: [{ title: 'Prazo', text: 'x' }] };
    expect(productPayload(p, ALL)).toMatchObject({ specs: [{ n: 'Altura', v: '20cm' }], details: [{ t: 'Prazo', x: 'x' }] });
    expect(productPayload(p, NONE)).not.toHaveProperty('specs');
    expect(productPayload(p, NONE)).not.toHaveProperty('details');
  });
  it('o banco de teste em memória guarda e devolve', async () => {
    const { gateway, state } = createMemoryGateway();
    await gateway.saveProduct({ title: 'B', description: 'd', price: 5, specs: [{ name: 'Peso', value: '860g' }], details: [{ title: 'Cuidados', text: 'x' }] }, { capabilities: ALL, previousModelUrl: '' });
    expect(state.products[0]).toMatchObject({ specs: [{ name: 'Peso', value: '860g' }], details: [{ title: 'Cuidados', text: 'x' }] });
    await gateway.saveProduct({ ...state.products[0], specs: [], details: [] }, { capabilities: NONE, previousModelUrl: '' });
    expect(state.products[0].specs).toEqual([{ name: 'Peso', value: '860g' }]);
  });
});
