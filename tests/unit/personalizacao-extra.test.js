import { describe, it, expect } from 'vitest';
import { buildPages, pageToStored, slugify, nextPageKey, PAGE_KEYS } from '../../src/lib/pages';
import { parseBlocks } from '../../src/lib/richtext';
import { parseMenu, menuToStored, menuProblem, resolveMenu, MAX_TOP, MAX_FOOT } from '../../src/lib/menus';
import { mergeSettings, DEFAULT_SETTINGS } from '../../src/lib/settings';
import { fillName, buildOrderMessage } from '../../src/lib/format';
import { THEME_PRESETS, BG_TONES, CARD_STYLES, FONT_CHOICES } from '../../src/lib/theme';

describe('páginas', () => {
  it('slugify tira acentos e símbolos', () => {
    expect(slugify('Trocas e Devoluções!')).toBe('trocas-e-devolucoes');
  });
  it('página vazia não vai para o banco; incompleta é ignorada na loja', () => {
    expect(pageToStored(JSON.stringify({ t: '', x: '' }))).toBe('');
    expect(buildPages({ pageA: JSON.stringify({ t: 'Só título', x: '' }) })).toEqual([]);
  });
  it('monta lista com endereço único e estado de publicação', () => {
    const a = JSON.stringify({ t: 'Trocas', x: 'Texto', p: true });
    const b = JSON.stringify({ t: 'Trocas', x: 'Outro', p: false });
    const pages = buildPages({ pageA: a, pageC: b });
    expect(pages.map(p => p.slug)).toEqual(['trocas', 'trocas-c']);
    expect(pages[0].published).toBe(true);
    expect(pages[1].published).toBe(false);
  });
  it('nextPageKey acha a primeira chave livre e para em 20', () => {
    expect(nextPageKey([])).toBe('pageA');
    expect(nextPageKey(['pageA', 'pageB'])).toBe('pageC');
    expect(nextPageKey(PAGE_KEYS)).toBeNull();
    expect(PAGE_KEYS).toHaveLength(20);
  });
  it('mergeSettings lê pageA..pageT e ignora lixo', () => {
    const s = mergeSettings([
      { key: 'pageA', value: JSON.stringify({ t: 'Cuidados', x: 'Lave com água', s: 'cuidados', p: true }) },
      { key: 'pageB', value: 'isto não é json' },
    ]);
    expect(s.pages).toHaveLength(1);
    expect(s.pages[0]).toMatchObject({ key: 'pageA', title: 'Cuidados', slug: 'cuidados', published: true });
  });
  it('sem nada salvo não há páginas', () => {
    expect(mergeSettings([]).pages).toEqual([]);
  });
});

describe('texto formatado', () => {
  it('títulos, listas, negrito e links; HTML vira texto', () => {
    const b = parseBlocks('# Título\n\nUm **forte** e [site](https://a.com)\n\n- um\n- dois\n\n<script>x</script>');
    expect(b.map(x => x.t)).toEqual(['h2', 'p', 'ul', 'p']);
    expect(b[1].inline.map(i => i.t)).toEqual(['text', 'bold', 'text', 'link']);
    expect(b[2].items).toHaveLength(2);
    expect(b[3].inline).toEqual([{ t: 'text', v: '<script>x</script>' }]);
  });
  it('link com javascript: não é link', () => {
    const [p] = parseBlocks('[x](javascript:alert(1))');
    expect(p.inline.every(i => i.t === 'text')).toBe(true);
  });
});

describe('menus', () => {
  const ctx = {
    pages: [{ key: 'pageA', slug: 'trocas', title: 'Trocas', text: 'x', published: true }, { key: 'pageB', slug: 'rascunho', title: 'Rascunho', text: 'x', published: false }],
    categories: [{ id: '7', name: 'Vasos', slug: 'vasos' }],
    labels: { home: 'Vitrine', about: 'Sobre', custom: 'Personalizado' }, aboutEnabled: true, customEnabled: false
  };
  it('menu padrão (nada salvo) tem os três botões da loja e não grava nada', () => {
    expect(parseMenu('', MAX_TOP, true).map(i => i.kind)).toEqual(['home', 'about', 'custom']);
    expect(menuToStored('', MAX_TOP, true)).toBe('');
  });
  it('botões fixos nunca somem e voltam ao fim se faltarem', () => {
    const m = parseMenu(JSON.stringify([{ k: 'about' }]), MAX_TOP, true);
    expect(m.map(i => i.kind)).toEqual(['about', 'home', 'custom']);
  });
  it('rodapé não aceita botões fixos; link precisa de nome e https', () => {
    const raw = JSON.stringify([{ k: 'home' }, { k: 'link', r: 'javascript:alert(1)', l: 'Ruim' }, { k: 'link', r: 'https://ml.com', l: 'ML' }, { k: 'link', r: 'https://a.com', l: '' }]);
    expect(parseMenu(raw, MAX_FOOT, false)).toEqual([{ kind: 'link', ref: 'https://ml.com/', label: 'ML' }]);
  });
  it('respeita o limite de itens', () => {
    const raw = JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ k: 'link', r: `https://a.com/${i}`, l: `L${i}` })));
    expect(parseMenu(raw, MAX_FOOT, false)).toHaveLength(MAX_FOOT);
  });
  it('resolveMenu esconde página apagada/rascunho, categoria removida e botões desligados', () => {
    const items = parseMenu(JSON.stringify([
      { k: 'page', r: 'pageA' }, { k: 'page', r: 'pageB' }, { k: 'page', r: 'pageZ' },
      { k: 'cat', r: '7', l: 'Todos os vasos' }, { k: 'cat', r: '99' }, { k: 'link', r: 'https://ml.com', l: 'ML' }
    ]), MAX_TOP, true);
    const out = resolveMenu(items, ctx);
    expect(out.map(i => i.label)).toEqual(['Trocas', 'Todos os vasos', 'ML', 'Vitrine', 'Sobre']);
    expect(out[0].to).toBe('/p/trocas');
    expect(out[1].to).toBe('/?categoria=vasos');
    expect(out[2].href).toBe('https://ml.com/');
  });
  it('menuProblem avisa de item incompleto', () => {
    expect(menuProblem(JSON.stringify([{ k: 'link', r: '', l: 'X' }]), MAX_FOOT, false, 'Rodapé')).toContain('https://');
    expect(menuProblem(JSON.stringify([{ k: 'page', r: '' }]), MAX_FOOT, false, 'Rodapé')).toContain('página');
    expect(menuProblem('', MAX_TOP, true, 'Topo')).toBe('');
  });
  it('mergeSettings monta menus; sem nada salvo usa o padrão', () => {
    expect(mergeSettings([]).menus.top.map(i => i.kind)).toEqual(['home', 'about', 'custom']);
    expect(mergeSettings([]).menus.foot).toEqual([]);
    const s = mergeSettings([{ key: 'menuFoot', value: JSON.stringify([{ k: 'link', r: 'https://ml.com', l: 'ML' }]) }]);
    expect(s.menus.foot).toHaveLength(1);
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
  it('modelo da página inicial: clássico por padrão, aceita vitrine e bancada, valor inválido volta ao clássico', () => {
    expect(DEFAULT_SETTINGS.homeLayout).toBe('classico');
    expect(mergeSettings([{ key: 'homeLayout', value: 'vitrine' }]).homeLayout).toBe('vitrine');
    expect(mergeSettings([{ key: 'homeLayout', value: 'bancada' }]).homeLayout).toBe('bancada');
    expect(mergeSettings([{ key: 'homeLayout', value: 'prateleiras' }]).homeLayout).toBe('classico');
  });
});

import { minOrderValue, isValidMinOrder } from '../../src/lib/settings';
import { badgeFor } from '../../src/lib/catalog';
import { badgeStyle } from '../../src/lib/theme';

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
    expect(badgeStyle('#ff0000').backgroundColor).toBe('#ff0000');
    expect(badgeStyle('red').backgroundColor).toBe('#f59e0b'); // inválida: laranja padrão
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
    expect(s.menus.foot).toEqual([]);
  });
});

import { IMAGE_GUIDES } from '../../src/lib/imageGuides';
import { SETTING_FIELDS } from '../../src/lib/settings';

describe('orientação de tamanho das imagens', () => {
  it('todo campo de imagem do painel tem orientação', () => {
    const imgs = SETTING_FIELDS.filter(f => f.type === 'image');
    expect(imgs.length).toBeGreaterThanOrEqual(6);
    for (const f of imgs) expect(IMAGE_GUIDES[f.guide], f.key).toBeTruthy();
  });
  it('textos seguem o padrão e dizem o formato e o peso', () => {
    for (const [k, g] of Object.entries(IMAGE_GUIDES)) {
      expect(g.text.startsWith('Tamanho ideal: '), k).toBe(true);
      expect(g.text, k).toMatch(/JPG|PNG/);
      expect(g.text, k).toMatch(/até \d+ (KB|MB)/);
    }
    expect(IMAGE_GUIDES.logo.text).toContain('transparente');
    expect(IMAGE_GUIDES.favicon.text).toContain('SVG');
  });
});
