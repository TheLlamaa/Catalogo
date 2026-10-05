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
