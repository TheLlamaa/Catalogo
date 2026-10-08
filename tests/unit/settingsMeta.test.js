import { describe, it, expect } from 'vitest';
import { SETTINGS_SCHEMA, SETTING_FIELDS, DEFAULT_SETTINGS } from '../../src/lib/settings';
import { changedFields, describeDefault, displayValue, searchSettings, norm } from '../../src/lib/settingsMeta';
import { defaultForm, findFormProblem, validateSettingsForm } from '../../src/lib/settingsWrite';

const field = (key) => SETTING_FIELDS.find(f => f.key === key);

describe('explicações dos campos', () => {
  it('todo campo comum tem uma explicação curta (as de página e menu ficam nos editores próprios)', () => {
    const sem = SETTING_FIELDS.filter(f => !['page', 'menu'].includes(f.type) && !(f.hint || '').trim()).map(f => f.key);
    expect(sem).toEqual([]);
  });
  it('as explicações novas não mudam o padrão nem o que é gravado', () => {
    expect(DEFAULT_SETTINGS.storeName).toBeTruthy();
    expect(field('stepOneTitle').default).toBe('Escolha os produtos');
  });
});

describe('valor padrão e mudanças em linguagem do dono', () => {
  it('mostra o padrão de cada tipo de campo', () => {
    expect(describeDefault(field('showSearch'))).toBe('Ligado');
    expect(describeDefault(field('hidePrices'))).toBe('Desligado');
    expect(describeDefault(field('defaultSort'))).toBe('Mais recentes');
    expect(describeDefault(field('logoSize'))).toBe('36 px');
    expect(describeDefault(field('primaryColor'))).toBe('Cor padrão');
    expect(describeDefault(field('heroImage'))).toBe('Sem imagem');
    expect(describeDefault(field('featuredTitle'))).toBe('Destaques');
  });
  it('texto longo é cortado e vazio vira "(vazio)"', () => {
    expect(displayValue(field('catalogSubtitle'), 'a'.repeat(200)).length).toBeLessThanOrEqual(70);
    expect(displayValue(field('footerText'), '')).toBe('(vazio)');
  });
  it('lista só o que mudou, com antes e depois', () => {
    const base = defaultForm();
    const form = { ...base, hidePrices: true, featuredTitle: 'Nossos queridinhos', defaultSort: 'price_asc' };
    const mudou = changedFields(form, base);
    expect(mudou.map(c => c.key).sort()).toEqual(['defaultSort', 'featuredTitle', 'hidePrices']);
    const preco = mudou.find(c => c.key === 'hidePrices');
    expect([preco.before, preco.after]).toEqual(['Desligado', 'Ligado']);
    expect(mudou.find(c => c.key === 'defaultSort').after).toBe('Menor preço');
    expect(changedFields(base, base)).toEqual([]);
  });
});

describe('busca de configurações', () => {
  it('ignora acento e acha por sinônimo', () => {
    expect(norm('Você')).toBe('voce');
    expect(searchSettings('zap').map(h => h.key)).toContain('whatsapp');
    expect(searchSettings('frete').map(h => h.key)).toContain('deliveryEnabled');
    expect(searchSettings('ferias').map(h => h.key)).toContain('ordersPaused');
  });
  it('todas as palavras precisam combinar e o resultado diz onde fica', () => {
    const [primeiro] = searchSettings('cor principal');
    expect(primeiro.key).toBe('primaryColor');
    expect(primeiro.groupLabel).toBe('Aparência');
    expect(searchSettings('xyzxyz')).toEqual([]);
    expect(searchSettings('   ')).toEqual([]);
  });
  it('as 20 páginas extras viram uma entrada só', () => {
    expect(searchSettings('pagina').filter(h => h.label === 'Páginas extras')).toHaveLength(1);
  });
});

describe('validação aponta o campo com problema', () => {
  it('devolve a chave do campo e a mesma mensagem de antes', () => {
    const f = { ...defaultForm(), whatsapp: '123' };
    expect(findFormProblem(f)).toMatchObject({ key: 'whatsapp' });
    expect(validateSettingsForm(f)).toMatch(/WhatsApp inválido/);
    expect(findFormProblem({ ...defaultForm(), email: 'x' })?.key).toBe('email');
    expect(findFormProblem({ ...defaultForm(), minOrder: 'abc' })?.key).toBe('minOrder');
    expect(findFormProblem(defaultForm())).toBeNull();
  });
});

describe('estrutura', () => {
  it('toda chave de campo é única', () => {
    const keys = SETTINGS_SCHEMA.flatMap(s => s.fields.map(f => f.key));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
