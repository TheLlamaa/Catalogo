import { describe, it, expect } from 'vitest';
import {
  isHex, paletteFrom, luminance, isTooLight, isBannerActive, localDay,
  normalizeSocial, socialLinks, parseFaq, bannerStyle, MAX_FAQ
} from '../../src/lib/theme';

describe('cores', () => {
  it('isHex só aceita #rrggbb', () => {
    expect(isHex('#16a34a')).toBe(true);
    expect(isHex('#FFF')).toBe(false);
    expect(isHex('16a34a')).toBe(false);
    expect(isHex('javascript:alert(1)')).toBe(false);
    expect(isHex('')).toBe(false);
    expect(isHex(null)).toBe(false);
  });

  it('paletteFrom mantém o tom 600 e clareia/escurece os outros', () => {
    const p = paletteFrom('#2563eb');
    expect(p[600]).toEqual([37, 99, 235]);
    expect(p[50].every(v => v >= 235)).toBe(true);
    expect(p[900].every((v, i) => v < p[600][i])).toBe(true);
    expect(Object.keys(p)).toHaveLength(10);
  });

  it('cor muito clara é avisada', () => {
    expect(isTooLight('#fde047')).toBe(true);
    expect(isTooLight('#2563eb')).toBe(false);
    expect(isTooLight('lixo')).toBe(false);
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('faixa de aviso', () => {
  const base = { bannerEnabled: true, bannerText: 'Aviso', bannerUntil: '' };
  const dia = (iso) => new Date(`${iso}T15:00:00`);

  it('aparece com texto e ligada', () => expect(isBannerActive(base)).toBe(true));
  it('some se desligada', () => expect(isBannerActive({ ...base, bannerEnabled: false })).toBe(false));
  it('some sem texto (ou só espaços)', () => {
    expect(isBannerActive({ ...base, bannerText: '' })).toBe(false);
    expect(isBannerActive({ ...base, bannerText: '   ' })).toBe(false);
  });
  it('vale até o fim do dia final', () => {
    const s = { ...base, bannerUntil: '2026-12-10' };
    expect(isBannerActive(s, dia('2026-12-09'))).toBe(true);
    expect(isBannerActive(s, dia('2026-12-10'))).toBe(true);
    expect(isBannerActive(s, dia('2026-12-11'))).toBe(false);
  });
  it('data final inválida é ignorada', () => expect(isBannerActive({ ...base, bannerUntil: 'amanhã' })).toBe(true));
  it('localDay formata AAAA-MM-DD', () => expect(localDay(new Date(2026, 0, 5))).toBe('2026-01-05'));

  it('bannerStyle: sem cor nem imagem não define nada', () => expect(bannerStyle({})).toEqual({}));
  it('bannerStyle: cor própria', () => expect(bannerStyle({ bannerColor: '#7c3aed' })).toEqual({ backgroundColor: '#7c3aed' }));
  it('bannerStyle: imagem não deixa aspas escaparem da url()', () => {
    const s = bannerStyle({ bannerImage: 'https://x.test/a"b).png' });
    expect(s.backgroundImage).not.toContain('"b)');
    expect(s.backgroundImage).toContain('url("https://x.test/a%22b%29.png")');
  });
});

describe('redes sociais', () => {
  it('@usuario vira link', () => {
    expect(normalizeSocial('socialInstagram', '@loja')).toBe('https://instagram.com/loja');
    expect(normalizeSocial('socialTiktok', 'loja')).toBe('https://tiktok.com/@loja');
    expect(normalizeSocial('socialYoutube', '@canal')).toBe('https://youtube.com/@canal');
  });
  it('link completo é mantido; protocolos perigosos não', () => {
    expect(normalizeSocial('socialFacebook', 'https://facebook.com/loja')).toBe('https://facebook.com/loja');
    expect(normalizeSocial('socialFacebook', 'javascript:alert(1)')).toBe('');
    expect(normalizeSocial('socialFacebook', 'ftp://x.test')).toBe('');
  });
  it('vazio e rede desconhecida dão vazio', () => {
    expect(normalizeSocial('socialInstagram', '  ')).toBe('');
    expect(normalizeSocial('socialOutra', '@x')).toBe('');
  });
  it('socialLinks lista só as redes preenchidas', () => {
    const links = socialLinks({ socialInstagram: '@a', socialTiktok: '', socialFacebook: 'x', socialYoutube: '' });
    expect(links.map(l => l.label)).toEqual(['Instagram', 'Facebook']);
  });
});

describe('perguntas frequentes', () => {
  it('lê só itens válidos', () => {
    const raw = JSON.stringify([{ q: ' Entregam? ', a: ' Sim ' }, { q: '', a: 'x' }, { q: 'x', a: '' }, null, { q: 1, a: 2 }]);
    expect(parseFaq(raw)).toEqual([{ q: 'Entregam?', a: 'Sim' }]);
  });
  it('JSON ruim ou não-lista dá lista vazia', () => {
    expect(parseFaq('{')).toEqual([]);
    expect(parseFaq('{"q":"a"}')).toEqual([]);
    expect(parseFaq('')).toEqual([]);
  });
  it(`limita a ${MAX_FAQ} itens`, () => {
    const many = JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ q: `q${i}`, a: 'a' })));
    expect(parseFaq(many)).toHaveLength(MAX_FAQ);
  });
});

import { contrastRatio, readableTextOn, badgeStyle as selo } from '../../src/lib/theme';
describe('contraste dos selos (WCAG 4,5:1 para texto pequeno)', () => {
  it('calcula o contraste como a WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });
  it('selo padrão (laranja) usa texto escuro legível', () => {
    const s = selo('');
    expect(contrastRatio(s.backgroundColor, s.color)).toBeGreaterThanOrEqual(4.5);
  });
  it('cor escolhida no painel ganha o texto mais legível', () => {
    expect(readableTextOn('#1e293b')).toBe('#ffffff');
    expect(readableTextOn('#fde047')).toBe('#111827');
    for (const c of ['#be185d', '#0e7490', '#15803d', '#2563eb', '#f59e0b', '#fde047']) {
      const s = selo(c);
      expect(contrastRatio(s.backgroundColor, s.color)).toBeGreaterThan(4);
    }
  });
});
