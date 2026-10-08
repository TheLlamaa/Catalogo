import { describe, it, expect } from 'vitest';
import { DEFAULT_ORDER, SECTION_IDS, orderToStored, orderedSections, parseOrder } from '../../src/lib/homeSections';
import { BLOCK_KEYS, blockToStored, buildBlocks, isCompleteBlock, isValidBlockLink, parseBlockDraft } from '../../src/lib/blocks';
import { mergeSettings } from '../../src/lib/settings';
import { defaultForm, diffSettings, findFormProblem, toStored } from '../../src/lib/settingsWrite';

const block = (over = {}) => JSON.stringify({ k: 'texto', on: true, t: 'Aviso', x: 'Texto', i: '', l: '', b: '', d: [], ...over });

describe('ordem das seções da página inicial', () => {
  it('sem nada guardado vale a ordem de sempre', () => {
    expect(parseOrder('')).toEqual(SECTION_IDS);
    expect(orderToStored('')).toBe('');
    expect(orderToStored(DEFAULT_ORDER)).toBe('');
    expect(orderedSections('', ['destaque', 'popular', 'novidades'])).toEqual(['destaque', 'popular', 'novidades']);
    expect(orderedSections('', ['categorias', 'passos'])).toEqual(['categorias', 'passos']);
  });
  it('a ordem do dono vale; ids inválidos somem e o que faltar entra no fim', () => {
    expect(parseOrder('novidades,xxx,destaque,novidades').slice(0, 2)).toEqual(['novidades', 'destaque']);
    expect(parseOrder('novidades,destaque')).toHaveLength(SECTION_IDS.length);
    expect(orderedSections('novidades,destaque', ['destaque', 'popular', 'novidades'])).toEqual(['novidades', 'destaque', 'popular']);
    expect(orderedSections('passos,categorias', ['categorias', 'passos'])).toEqual(['passos', 'categorias']);
  });
  it('cada modelo mostra só as seções que tem', () => {
    expect(orderedSections('', ['categorias', 'extraA'])).toEqual(['categorias', 'extraA']);
    expect(orderedSections('extraA,categorias', ['categorias', 'extraA'])).toEqual(['extraA', 'categorias']);
  });
  it('é gravada só quando difere do padrão', () => {
    expect(toStored('homeSections', 'passos,categorias')).toMatch(/^passos,categorias,/);
    expect(toStored('homeSections', DEFAULT_ORDER)).toBeNull();
    expect(mergeSettings([{ key: 'homeSections', value: 'popular' }]).homeOrder[0]).toBe('popular');
  });
});

describe('blocos extras', () => {
  it('lê, limita e limpa', () => {
    expect(parseBlockDraft('lixo')).toBeNull();
    expect(parseBlockDraft(JSON.stringify({ k: 'x' }))).toBeNull();
    expect(parseBlockDraft(block({ t: 'a'.repeat(500) })).t).toHaveLength(80);
    expect(blockToStored(block({ t: '  ', x: ' ' }))).toBe('');
    expect(JSON.parse(blockToStored(block({ t: '  Oi  ' }))).t).toBe('Oi');
  });
  it('só aparece o que está completo e ligado', () => {
    const rows = {
      blockA: block(),
      blockB: block({ on: false }),
      blockC: block({ k: 'banner', t: 'Promo', i: '' }),
      blockD: block({ k: 'banner', t: 'Promo', i: 'https://x/y.jpg', l: '/sobre', b: 'Ver' }),
      blockE: block({ k: 'depoimentos', t: '', d: [{ n: 'Ana', q: 'Amei' }, { n: 'Bia', q: '' }] }),
      blockF: block({ k: 'depoimentos', d: [] }),
    };
    const shown = buildBlocks(rows);
    expect(shown.map(b => b.id)).toEqual(['extraA', 'extraD', 'extraE']);
    expect(shown[2].quotes).toEqual([{ n: 'Ana', q: 'Amei' }]);
    expect(isCompleteBlock(parseBlockDraft(rows.blockC))).toBe(false);
  });
  it('link do botão: https ou página do site', () => {
    expect(isValidBlockLink('')).toBe(true);
    expect(isValidBlockLink('https://loja.com/x')).toBe(true);
    expect(isValidBlockLink('/p/trocas')).toBe(true);
    expect(isValidBlockLink('javascript:alert(1)')).toBe(false);
    expect(isValidBlockLink('loja.com')).toBe(false);
  });
  it('as seis chaves existem', () => {
    expect(BLOCK_KEYS).toEqual(['blockA', 'blockB', 'blockC', 'blockD', 'blockE', 'blockF']);
  });
  it('o formulário avisa de bloco incompleto e grava os completos', () => {
    const f = { ...defaultForm(), blockA: block({ k: 'banner', t: 'Promo' }) };
    expect(findFormProblem(f)).toMatchObject({ key: 'blockA' });
    const ok = { ...defaultForm(), blockA: block() };
    expect(findFormProblem(ok)).toBeNull();
    expect(diffSettings(ok, defaultForm()).blockA).toContain('"Aviso"');
  });
  it('mergeSettings monta os blocos prontos', () => {
    const s = mergeSettings([{ key: 'blockA', value: block() }]);
    expect(s.blocks).toHaveLength(1);
    expect(mergeSettings([]).blocks).toEqual([]);
  });
});
