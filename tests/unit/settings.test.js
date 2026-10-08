import { describe, it, expect } from 'vitest';
import {
  mergeSettings, DEFAULT_SETTINGS, SETTING_FIELDS, SETTINGS_SCHEMA, GROUPS,
  normalizeWhatsapp, isValidWhatsapp, parseBackup
} from '../../src/lib/settings';

const rows = (obj) => Object.entries(obj).map(([key, value]) => ({ key, value }));

describe('estrutura do painel', () => {
  it('toda chave segue a regra do banco (só letras, até 40)', () => {
    for (const f of SETTING_FIELDS) expect(f.key, f.key).toMatch(/^[A-Za-z]{1,40}$/);
  });
  it('não há chaves repetidas', () => {
    const keys = SETTING_FIELDS.map(f => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('toda seção pertence a uma aba que existe', () => {
    const ids = new Set(GROUPS.map(g => g.id));
    for (const s of SETTINGS_SCHEMA) expect(ids.has(s.group), s.title).toBe(true);
  });
  it('todo campo tem padrão definido', () => {
    for (const f of SETTING_FIELDS) expect(f.key in DEFAULT_SETTINGS, f.key).toBe(true);
  });
});

describe('mergeSettings', () => {
  it('controle de estoque: ligado por padrão, desliga com "false"', () => {
    expect(mergeSettings([]).stockControl).toBe(true);
    expect(mergeSettings([{ key: 'stockControl', value: 'false' }]).stockControl).toBe(false);
    expect(mergeSettings([{ key: 'stockControl', value: 'lixo' }]).stockControl).toBe(true);
  });
  it('sem linhas, devolve os padrões', () => {
    const s = mergeSettings([]);
    expect(s.primaryColor).toBe('');
    expect(s.bannerEnabled).toBe(true);
    expect(s.aboutEnabled).toBe(false);
    expect(s.logoSize).toBe('36');
    expect(s.faq).toEqual([]);
    expect(s.backup).toBeNull();
  });

  it('textos do banco ganham do padrão; vazio não', () => {
    const s = mergeSettings(rows({ catalogTitle: 'Minha vitrine', menuHome: '   ' }));
    expect(s.catalogTitle).toBe('Minha vitrine');
    expect(s.menuHome).toBe(DEFAULT_SETTINGS.menuHome);
  });

  it('interruptores: "false" desliga, "true" liga', () => {
    const s = mergeSettings(rows({ bannerEnabled: 'false', aboutEnabled: 'true', customEnabled: 'false' }));
    expect(s.bannerEnabled).toBe(false);
    expect(s.aboutEnabled).toBe(true);
    expect(s.customEnabled).toBe(false);
  });

  it('chaves desconhecidas são ignoradas', () => {
    const s = mergeSettings(rows({ naoExiste: 'x' }));
    expect(s.naoExiste).toBeUndefined();
  });

  it('valores com formato errado voltam ao padrão', () => {
    const s = mergeSettings(rows({
      primaryColor: 'javascript:alert(1)', bannerColor: 'vermelho', fontChoice: 'comic',
      bannerUntil: 'amanhã', logoUrl: 'javascript:alert(1)', bannerImage: 'data:image/png;base64,xx',
      socialInstagram: 'ftp://x', logoSize: '9999'
    }));
    expect(s.primaryColor).toBe('');
    expect(s.bannerColor).toBe('');
    expect(s.fontChoice).toBe('padrao');
    expect(s.bannerUntil).toBe('');
    expect(s.logoUrl).toBe('');
    expect(s.bannerImage).toBe('');
    expect(s.socialInstagram).toBe('');
    expect(s.logoSize).toBe('36');
  });

  it('valores válidos passam', () => {
    const s = mergeSettings(rows({
      primaryColor: '#16a34a', fontChoice: 'serifa', bannerUntil: '2026-12-10',
      logoUrl: 'https://x.test/logo.png', socialInstagram: '@loja', logoSize: '64'
    }));
    expect(s.primaryColor).toBe('#16a34a');
    expect(s.fontChoice).toBe('serifa');
    expect(s.bannerUntil).toBe('2026-12-10');
    expect(s.logoUrl).toBe('https://x.test/logo.png');
    expect(s.socialInstagram).toBe('@loja');
    expect(s.logoSize).toBe('64');
  });

  it('logoSize aceita só inteiros dentro da faixa', () => {
    for (const bad of ['23', '129', '40.5', 'abc', '-30']) expect(mergeSettings(rows({ logoSize: bad })).logoSize, bad).toBe('36');
    for (const ok of ['24', '96', '128', '48']) expect(mergeSettings(rows({ logoSize: ok })).logoSize, ok).toBe(ok);
  });

  it('perguntas frequentes viram lista', () => {
    const faq = JSON.stringify([{ q: 'Pergunta?', a: 'Resposta.' }]);
    expect(mergeSettings(rows({ faqItems: faq })).faq).toEqual([{ q: 'Pergunta?', a: 'Resposta.' }]);
  });

  it('auras personalizadas e ajustes das do sistema são lidos', () => {
    const custom = JSON.stringify([{ id: 'abc123', name: 'Neon', colors: ['#00ff88', '#0088ff'], strong: true }]);
    const overrides = JSON.stringify({ gold: { name: 'Ouro' } });
    const s = mergeSettings(rows({ customAuras: custom, auraOverrides: overrides }));
    expect(s.auraLib.custom[0].name).toBe('Neon');
    expect(s.auraLib.overrides.gold.name).toBe('Ouro');
  });

  it('backup de "desfazer" é lido só se tiver o formato certo', () => {
    const ok = JSON.stringify({ t: '2026-10-02T10:00:00Z', v: { primaryColor: '#16a34a', logoUrl: null } });
    expect(mergeSettings(rows({ settingsBackup: ok })).backup.v.primaryColor).toBe('#16a34a');
    expect(mergeSettings(rows({ settingsBackup: '{"t":1}' })).backup).toBeNull();
    expect(mergeSettings(rows({ settingsBackup: 'lixo' })).backup).toBeNull();
    expect(parseBackup('{"t":"x","v":[]}')).toBeNull();
  });
});

describe('WhatsApp da loja', () => {
  it('normaliza com ou sem 55', () => {
    expect(normalizeWhatsapp('(48) 99999-9999')).toBe('5548999999999');
    expect(normalizeWhatsapp('5548999999999')).toBe('5548999999999');
    expect(normalizeWhatsapp('')).toBe('');
  });
  it('valida tamanho', () => {
    expect(isValidWhatsapp('(48) 99999-9999')).toBe(true);
    expect(isValidWhatsapp('(48) 9999-9999')).toBe(true);
    expect(isValidWhatsapp('123')).toBe(false);
  });
});
