import { describe, it, expect } from 'vitest';
import { CARD_STYLES, FONT_CHOICES } from '../../src/lib/theme';
import { SITE_FONT_CHOICES, isBrandSiteFont, siteFontStack } from '../../src/lib/siteFont';
import { resolveDark } from '../../src/lib/colorMode';
import { SETTING_FIELDS, mergeSettings } from '../../src/lib/settings';

describe('cantos e fontes', () => {
  it('os cantos de sempre continuam e há mais opções', () => {
    expect(CARD_STYLES.map(c => c.id).slice(0, 3)).toEqual(['arredondado', 'reto', 'redondo']);
    expect(CARD_STYLES.map(c => c.id)).toEqual(expect.arrayContaining(['quadrado', 'suave', 'muito']));
    expect(CARD_STYLES.find(c => c.id === 'quadrado').radius).toBe('0');
  });
  it('as fontes do aparelho vêm primeiro e as de marca entram com prefixo', () => {
    expect(SITE_FONT_CHOICES.slice(0, FONT_CHOICES.length)).toEqual(FONT_CHOICES);
    expect(SITE_FONT_CHOICES.some(f => f.id === 'b-poppins')).toBe(true);
    expect(SITE_FONT_CHOICES.some(f => f.id === 'b-site')).toBe(false);
    expect(isBrandSiteFont('b-poppins')).toBe(true);
    expect(isBrandSiteFont('b-inexistente')).toBe(false);
    expect(isBrandSiteFont('serifa')).toBe(false);
    expect(siteFontStack('b-poppins')).toContain('Poppins');
    expect(siteFontStack('serifa')).toContain('Georgia');
    expect(siteFontStack('nada')).toBeNull();
  });
  it('o painel aceita as novas opções e ignora lixo', () => {
    const font = SETTING_FIELDS.find(f => f.key === 'fontChoice');
    expect(font.options.map(o => o.value)).toContain('b-orbitron');
    expect(mergeSettings([{ key: 'fontChoice', value: 'b-poppins' }]).fontChoice).toBe('b-poppins');
    expect(mergeSettings([{ key: 'fontChoice', value: 'b-xxx' }]).fontChoice).toBe('padrao');
    expect(mergeSettings([{ key: 'cardStyle', value: 'quadrado' }]).cardStyle).toBe('quadrado');
    expect(mergeSettings([{ key: 'darkMode', value: 'dark' }]).darkMode).toBe('dark');
    expect(mergeSettings([]).darkMode).toBe('auto');
  });
});

describe('modo escuro por padrão', () => {
  it('sem escolha do cliente, a loja abre como o dono definiu', () => {
    expect(resolveDark('auto', false, true)).toBe(true);
    expect(resolveDark('auto', true, false)).toBe(true);
    expect(resolveDark('auto', false, false)).toBe(false);
  });
  it('a escolha do cliente sempre vale', () => {
    expect(resolveDark('light', true, true)).toBe(false);
    expect(resolveDark('dark', false, false)).toBe(true);
  });
});
