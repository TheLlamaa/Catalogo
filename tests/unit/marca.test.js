import { describe, it, expect } from 'vitest';
import { brandLook, brandFont, nearestWeight, BRAND_FONTS } from '../../src/lib/brand';
import { mergeSettings, DEFAULT_SETTINGS } from '../../src/lib/settings';

describe('logo e nome da loja no topo', () => {
  it('padrões reproduzem o topo antigo (nome 18 px, negrito, levemente junto, logo 36 px)', () => {
    const look = brandLook(DEFAULT_SETTINGS);
    expect(look.name.sizeD).toBe(18);
    expect(look.name.fontWeight).toBe(700);
    expect(look.name.letterSpacing).toBe('-0.025em');
    expect(look.name.fontFamily).toBe('inherit');
    expect(look.logo.h).toBe(36);
    expect(look.logo.hMobile).toBe(36); // celular nunca maior que o computador
    expect(look.stacked).toBe(false);
  });
  it('tamanho do celular não passa do computador', () => {
    const s = mergeSettings([{ key: 'logoSize', value: '96' }, { key: 'logoSizeMobile', value: '64' }, { key: 'nameSize', value: '20' }, { key: 'nameSizeMobile', value: '30' }]);
    const look = brandLook(s);
    expect(look.logo.hMobile).toBe(64);
    expect(look.name.sizeM).toBe(20);
  });
  it('fonte de uma espessura só usa a que existe', () => {
    expect(nearestWeight(brandFont('pacifico'), 900)).toBe(400);
    expect(nearestWeight(brandFont('caveat'), 900)).toBe(700);
    expect(brandFont('nao-existe').id).toBe('site');
    expect(new Set(BRAND_FONTS.map(f => f.id)).size).toBe(BRAND_FONTS.length);
  });
  it('cor escolhida: aplicada no claro; se some no escuro, volta à cor do texto', () => {
    const s = mergeSettings([{ key: 'nameColorMode', value: 'personalizada' }, { key: 'nameColor', value: '#111111' }]);
    expect(brandLook(s).name.color).toBe('#111111');
    expect(brandLook(s, true).name.color).toBe('');
    const ok = mergeSettings([{ key: 'nameColorMode', value: 'personalizada' }, { key: 'nameColor', value: '#f59e0b' }]);
    expect(brandLook(ok, true).name.color).toBe('#f59e0b');
  });
  it('maiúsculas, itálico, espaçamento, formato e posição', () => {
    const s = mergeSettings([{ key: 'nameCase', value: 'maiusculas' }, { key: 'nameItalic', value: 'true' }, { key: 'nameSpacing', value: 'bem' },
      { key: 'logoShape', value: 'redondo' }, { key: 'brandLayout', value: 'abaixo' }, { key: 'storeTagline', value: '  Feito em camadas ' }]);
    const look = brandLook(s);
    expect(look.name.textTransform).toBe('uppercase');
    expect(look.name.fontStyle).toBe('italic');
    expect(look.name.letterSpacing).toBe('0.2em');
    expect(look.logo.shape).toBe('redondo');
    expect(look.stacked).toBe(true);
    expect(look.tagline).toBe('Feito em camadas');
  });
  it('sem logo o nome aparece mesmo com "mostrar nome" desligado; valores inválidos voltam ao padrão', () => {
    expect(brandLook(mergeSettings([{ key: 'logoShowName', value: 'false' }])).showName).toBe(true);
    const s = mergeSettings([{ key: 'nameFont', value: 'comic' }, { key: 'nameSize', value: '500' }, { key: 'logoShape', value: 'estrela' }]);
    expect([s.nameFont, s.nameSize, s.logoShape]).toEqual(['site', '18', 'original']);
  });
});
