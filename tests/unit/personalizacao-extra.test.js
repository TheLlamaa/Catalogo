import { describe, it, expect } from 'vitest';
import { buildPages, pageToStored, slugify, PAGE_KEYS } from '../../src/lib/pages';
import { mergeSettings, DEFAULT_SETTINGS } from '../../src/lib/settings';
import { fillName, buildOrderMessage } from '../../src/lib/format';
import { THEME_PRESETS, BG_TONES, CARD_STYLES, FONT_CHOICES } from '../../src/lib/theme';

describe('páginas extras', () => {
  it('slugify tira acentos e símbolos', () => {
    expect(slugify('Trocas e Devoluções!')).toBe('trocas-e-devolucoes');
  });
  it('página vazia não vai para o banco; incompleta é ignorada na loja', () => {
    expect(pageToStored(JSON.stringify({ t: '', x: '' }))).toBe('');
    expect(buildPages([JSON.stringify({ t: 'Só título', x: '' })])).toEqual([]);
  });
  it('monta lista com endereço único e flags de menu/rodapé', () => {
    const a = JSON.stringify({ t: 'Trocas', x: 'Texto', m: true, f: false });
    const b = JSON.stringify({ t: 'Trocas', x: 'Outro', m: false, f: true });
    const pages = buildPages([a, undefined, b]);
    expect(pages.map(p => p.slug)).toEqual(['trocas', 'trocas-3']);
    expect(pages[0].menu).toBe(true);
    expect(pages[1].footer).toBe(true);
  });
  it('mergeSettings lê as chaves pageA..pageF e ignora lixo', () => {
    const s = mergeSettings([
      { key: PAGE_KEYS[0], value: JSON.stringify({ t: 'Cuidados', x: 'Lave com água', m: true, f: true }) },
      { key: PAGE_KEYS[1], value: 'isto não é json' },
    ]);
    expect(s.pages).toHaveLength(1);
    expect(s.pages[0].title).toBe('Cuidados');
  });
  it('sem nada salvo não há páginas', () => {
    expect(mergeSettings([]).pages).toEqual([]);
  });
});

describe('textos do pedido', () => {
  it('fillName troca {nome}', () => {
    expect(fillName('Oi, sou {nome}!', 'Ana')).toBe('Oi, sou Ana!');
  });
  it('mensagem usa a abertura personalizada e mantém itens e total', () => {
    const msg = buildOrderMessage({ name: 'Ana', intro: 'Pedido novo de {nome}', total: 10, deliveryMethod: 'retirada', items: [{ title: 'Vaso', price: 10, quantity: 1 }] });
    expect(msg.startsWith('Pedido novo de Ana')).toBe(true);
    expect(msg).toContain('1x Vaso');
    expect(msg).toContain('Retirada');
  });
  it('padrões dos textos do carrinho são os textos originais', () => {
    expect(DEFAULT_SETTINGS.cartTitle).toBe('Seu Orçamento');
    expect(DEFAULT_SETTINGS.addToCartLabel).toBe('Adicionar ao Orçamento');
    expect(DEFAULT_SETTINGS.whatsappButton).toBe('Continuar no WhatsApp');
  });
});

describe('temas prontos', () => {
  it('só usam fonte, fundo e cantos que existem', () => {
    for (const t of THEME_PRESETS) {
      expect(FONT_CHOICES.some(f => f.id === t.values.fontChoice), t.id).toBe(true);
      expect(BG_TONES.some(x => x.id === t.values.bgTone), t.id).toBe(true);
      expect(CARD_STYLES.some(x => x.id === t.values.cardStyle), t.id).toBe(true);
    }
  });
  it('opção inválida no banco volta ao padrão', () => {
    const s = mergeSettings([{ key: 'bgTone', value: 'preto' }, { key: 'gridCols', value: '9' }]);
    expect(s.bgTone).toBe('padrao');
    expect(s.gridCols).toBe('3');
  });
});

import { LINK_KEYS, buildLinks, linkToStored } from '../../src/lib/links';
import { minOrderValue, isValidMinOrder } from '../../src/lib/settings';
import { badgeFor } from '../../src/lib/catalog';
import { badgeStyle } from '../../src/lib/theme';

describe('links extras', () => {
  it('só aceita endereços http(s) completos', () => {
    const ok = JSON.stringify({ l: 'Loja', u: 'https://exemplo.com/x', m: true, f: false });
    const js = JSON.stringify({ l: 'Ruim', u: 'javascript:alert(1)', m: true, f: true });
    const semNome = JSON.stringify({ l: '', u: 'https://a.com', m: true, f: true });
    const links = buildLinks([ok, js, semNome, undefined]);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ label: 'Loja', menu: true, footer: false });
  });
  it('mergeSettings lê linkA..linkD', () => {
    const s = mergeSettings([{ key: LINK_KEYS[0], value: JSON.stringify({ l: 'ML', u: 'https://ml.com', m: false, f: true }) }]);
    expect(s.links).toEqual([{ label: 'ML', url: 'https://ml.com/', menu: false, footer: true }]);
    expect(linkToStored('{"l":"","u":""}')).toBe('');
  });
});

describe('pedido mínimo e selos', () => {
  it('minOrderValue entende vírgula e ignora lixo', () => {
    expect(minOrderValue('30,50')).toBe(30.5);
    expect(minOrderValue('abc')).toBe(0);
    expect(minOrderValue('-5')).toBe(0);
    expect(minOrderValue('')).toBe(0);
    expect(isValidMinOrder('')).toBe(true);
    expect(isValidMinOrder('abc')).toBe(false);
  });
  it('texto do selo automático é editável', () => {
    const p = { badge: null, stock: 2 };
    expect(badgeFor(p, { stockControl: true, lowStockBadge: true })).toBe('Últimas unidades');
    expect(badgeFor(p, { stockControl: true, lowStockBadge: true, lowStockText: 'Corre!' })).toBe('Corre!');
  });
  it('cor do selo só vale se for hexadecimal', () => {
    expect(badgeStyle('#ff0000')).toEqual({ backgroundColor: '#ff0000' });
    expect(badgeStyle('red')).toEqual({});
  });
  it('padrões novos não mudam o comportamento atual', () => {
    const s = mergeSettings([]);
    expect(s.defaultSort).toBe('recent');
    expect(s.showSearch).toBe(true);
    expect(s.hidePrices).toBe(false);
    expect(s.ordersPaused).toBe(false);
    expect(s.deliveryEnabled).toBe(true);
    expect(s.notesEnabled).toBe(true);
    expect(s.deliveryNote).toBe('O frete é combinado com você pelo WhatsApp.');
    expect(s.links).toEqual([]);
  });
});
