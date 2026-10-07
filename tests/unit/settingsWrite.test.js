import { describe, it, expect } from 'vitest';
import { mergeSettings, DEFAULT_SETTINGS } from '../../src/lib/settings';
import {
  buildSettingsWrite, defaultForm, diffSettings, draftRows, formFrom, toStored, undoChanges, validateSettingsForm, DB_VALUE_MAX,
} from '../../src/lib/settingsWrite';
import { customerWhatsapp, normalizeWhatsapp, toWhatsappDigits } from '../../src/lib/whatsapp';

const NOW = '2026-10-07T12:00:00.000Z';
const form = (over = {}) => ({ ...defaultForm(), storeName: 'Minha Loja', ...over });

describe('formulário -> valor guardado', () => {
  it('igual ao padrão não guarda nada', () => {
    expect(toStored('storeName', DEFAULT_SETTINGS.storeName)).toBeNull();
    expect(toStored('stockControl', DEFAULT_SETTINGS.stockControl)).toBeNull();
    expect(toStored('stockControl', !DEFAULT_SETTINGS.stockControl)).toBe(String(!DEFAULT_SETTINGS.stockControl));
  });
  it('WhatsApp com máscara vira só dígitos com 55', () => expect(toStored('whatsapp', '(48) 99999-1111')).toBe('5548999991111'));
  it('cor vai em minúsculas e redes sociais são normalizadas', () => {
    expect(toStored('primaryColor', '#ABCDEF')).toBe('#abcdef');
    expect(toStored('socialInstagram', '@loja')).toMatch(/instagram\.com\/loja/);
  });
  it('ler e escrever são simétricos: o que se lê volta igual', () => {
    const settings = mergeSettings([{ key: 'storeName', value: 'Casa X' }, { key: 'whatsapp', value: '5548999991111' }, { key: 'primaryColor', value: '#112233' }]);
    const f = formFrom(settings);
    expect(f.whatsapp).toBe('(48) 99999-1111');
    expect(Object.fromEntries(draftRows(f).map(r => [r.key, r.value]))).toMatchObject({ storeName: 'Casa X', whatsapp: '5548999991111', primaryColor: '#112233' });
  });
});

describe('diferença rascunho x publicado', () => {
  it('só o que mudou; o que volta ao padrão vai como null', () => {
    const base = form({ storeName: 'Casa X', footerText: 'Olá' });
    expect(diffSettings(form({ storeName: 'Casa Y', footerText: '' }), base)).toEqual({ storeName: 'Casa Y', footerText: null });
    expect(diffSettings(base, base)).toEqual({});
  });
  it('mudança que só difere em espaços não conta', () => {
    expect(diffSettings(form({ storeName: 'Casa X ' }), form({ storeName: 'Casa X' }))).toEqual({});
  });
});

describe('validação do formulário', () => {
  it('formulário padrão é válido', () => expect(validateSettingsForm(form())).toBeNull());
  it('nome da loja vazio', () => expect(validateSettingsForm(form({ storeName: ' ' }))).toBe('O nome da loja não pode ficar vazio.'));
  it('WhatsApp e e-mail', () => {
    expect(validateSettingsForm(form({ whatsapp: '123' }))).toContain('WhatsApp inválido');
    expect(validateSettingsForm(form({ whatsapp: '(48) 99999-1111' }))).toBeNull();
    expect(validateSettingsForm(form({ email: 'sem-arroba' }))).toBe('E-mail inválido.');
  });
  it('cor inválida e pedido mínimo inválido', () => {
    expect(validateSettingsForm(form({ primaryColor: 'azul' }))).toContain('Cor inválida');
    expect(validateSettingsForm(form({ minOrder: '-5' }))).toContain('Pedido mínimo');
    expect(validateSettingsForm(form({ minOrder: '30,50' }))).toBeNull();
  });
  it('pergunta sem resposta e resposta sem pergunta', () => {
    expect(validateSettingsForm(form({ faqItems: JSON.stringify([{ q: 'Pergunta?', a: '' }]) }))).toBe('Toda pergunta precisa de uma resposta.');
    expect(validateSettingsForm(form({ faqItems: JSON.stringify([{ q: '', a: 'Resposta' }]) }))).toBe('Toda resposta precisa de uma pergunta.');
  });
  it('política grande demais', () => {
    expect(validateSettingsForm(form({ privacyText: 'x'.repeat(DB_VALUE_MAX + 1) }))).toBe('O texto da política ficou grande demais.');
  });
});

describe('gravação com backup', () => {
  const rows = [{ key: 'storeName', value: 'Casa X' }];
  it('grava os novos, apaga os null e guarda o valor antigo para desfazer', () => {
    const { upsert, remove } = buildSettingsWrite({ storeName: 'Casa Y', footerText: null }, rows, NOW);
    expect(upsert.find(r => r.key === 'storeName')).toEqual({ key: 'storeName', value: 'Casa Y' });
    expect(remove).toEqual(['footerText']);
    const backup = JSON.parse(upsert.find(r => r.key === 'settingsBackup').value);
    expect(backup).toEqual({ t: NOW, v: { storeName: 'Casa X', footerText: null } });
  });
  it('sem backup (desfazer), apaga o backup antigo', () => {
    const { upsert, remove } = buildSettingsWrite({ storeName: 'Casa X' }, rows, NOW, { noBackup: true });
    expect(upsert.map(r => r.key)).toEqual(['storeName']);
    expect(remove).toEqual(['settingsBackup']);
  });
  it('backup grande demais não é oferecido', () => {
    const big = [{ key: 'privacyText', value: 'x'.repeat(DB_VALUE_MAX) }];
    const { upsert, remove } = buildSettingsWrite({ privacyText: 'novo' }, big, NOW);
    expect(upsert.map(r => r.key)).toEqual(['privacyText']);
    expect(remove).toEqual(['settingsBackup']);
  });
  it('desfazer usa só chaves conhecidas e valores de texto ou null', () => {
    expect(undoChanges({ t: NOW, v: { storeName: 'Casa X', footerText: null, hackeada: 'x', whatsapp: 5, customAuras: '[]' } }))
      .toEqual({ storeName: 'Casa X', footerText: null, customAuras: '[]' });
  });
  it('ciclo completo: publicar e desfazer devolve o que havia', () => {
    const { upsert } = buildSettingsWrite({ storeName: 'Casa Y' }, rows, NOW);
    const backup = mergeSettings(upsert).backup;
    expect(undoChanges(backup)).toEqual({ storeName: 'Casa X' });
  });
});

describe('WhatsApp em um lugar só', () => {
  it('normaliza, tira o 55 e monta o número do cliente', () => {
    expect(normalizeWhatsapp('(48) 99999-1111')).toBe('5548999991111');
    expect(normalizeWhatsapp('5548999991111')).toBe('5548999991111');
    expect(toWhatsappDigits('+55 (48) 99999-1111')).toBe('48999991111');
    expect(customerWhatsapp('(48) 99999-1111')).toBe('5548999991111');
    expect(customerWhatsapp('5548999991111')).toBe('5548999991111');
  });
});
