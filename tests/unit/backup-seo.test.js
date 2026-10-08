import { describe, it, expect } from 'vitest';
import { BACKUP_APP, backupFileName, buildBackup, parseBackupFile } from '../../src/lib/settingsBackup';
import { buildPages, pageToStored, parsePageDraft } from '../../src/lib/pages';
import { pageSeo } from '../../src/lib/seo';
import { previewTargetFor } from '../../src/lib/settingsMeta';
import { mergeSettings } from '../../src/lib/settings';

describe('backup das configurações', () => {
  const rows = [{ key: 'storeName', value: 'Loja X' }, { key: 'settingsBackup', value: '{}' }, { key: 'chaveInventada', value: 'x' }];
  it('só entram configurações conhecidas do site', () => {
    const b = buildBackup(rows, new Date('2026-10-09T12:00:00Z'));
    expect(b.app).toBe(BACKUP_APP);
    expect(b.rows).toEqual([{ key: 'storeName', value: 'Loja X' }]);
    expect(backupFileName(new Date('2026-10-09T12:00:00Z'))).toBe('configuracoes-2026-10-09.json');
  });
  it('lê o que foi gravado e ignora o que não conhece', () => {
    const text = JSON.stringify({ app: BACKUP_APP, v: 1, t: 'x', rows: [{ key: 'storeName', value: 'Loja X' }, { key: 'xyz', value: 'a' }, { key: 'whatsapp', value: 1 }, null] });
    const r = parseBackupFile(text);
    expect(r.rows).toEqual([{ key: 'storeName', value: 'Loja X' }]);
    expect(r.ignored).toBe(3);
  });
  it('recusa arquivo que não é backup', () => {
    expect(parseBackupFile('lixo').error).toMatch(/não é um backup válido/);
    expect(parseBackupFile('{"app":"outro","rows":[]}').error).toMatch(/não é um backup de configurações/);
    expect(parseBackupFile(JSON.stringify({ app: BACKUP_APP, v: 99, rows: [] })).error).toMatch(/mais nova/);
    expect(parseBackupFile('x'.repeat(400 * 1024)).error).toMatch(/grande demais/);
  });
  it('um backup carregado passa pela mesma validação do banco', () => {
    const r = parseBackupFile(JSON.stringify({ app: BACKUP_APP, v: 1, rows: [{ key: 'primaryColor', value: 'azul' }, { key: 'storeName', value: 'Loja Y' }] }));
    const s = mergeSettings(r.rows);
    expect(s.storeName).toBe('Loja Y');
    expect(s.primaryColor).toBe('');
  });
});

describe('SEO por página', () => {
  it('descrição e imagem da página são guardadas e limitadas', () => {
    const raw = JSON.stringify({ t: 'Trocas', x: 'Texto', s: 'trocas', p: true, d: 'a'.repeat(300), m: 'https://x/y.jpg' });
    const d = JSON.parse(pageToStored(raw));
    expect(d.d).toHaveLength(160);
    expect(d.m).toBe('https://x/y.jpg');
    expect(JSON.parse(pageToStored(JSON.stringify({ t: 'T', x: 'x', m: 'javascript:1' }))).m).toBeUndefined();
    expect(parsePageDraft(raw).m).toBe('https://x/y.jpg');
  });
  it('páginas antigas (sem os campos novos) continuam iguais', () => {
    const [p] = buildPages({ pageA: JSON.stringify({ t: 'Trocas', x: 'Texto', s: 'trocas', p: true }) });
    expect(p).toMatchObject({ title: 'Trocas', description: '', image: '' });
  });
  it('o que faltar na página vem do site', () => {
    const site = { storeName: 'Loja', seoDescription: 'Do site', seoImage: 'https://s/img.jpg' };
    expect(pageSeo(site, { title: 'Sobre' })).toEqual({ seoTitle: 'Sobre | Loja', seoDescription: 'Do site', seoImage: 'https://s/img.jpg' });
    expect(pageSeo(site, { title: 'Sobre', description: ' Própria ', image: 'https://p/i.jpg' })).toMatchObject({ seoDescription: 'Própria', seoImage: 'https://p/i.jpg' });
  });
});

describe('prévia acompanha o campo', () => {
  it('cada seção leva a prévia para a tela certa', () => {
    expect(previewTargetFor('Carrinho e pedido')).toBe('cart');
    expect(previewTargetFor('Carrinho e formulários')).toBe('cart');
    expect(previewTargetFor('Janela do produto')).toBe('product');
    expect(previewTargetFor('Página de peça personalizada')).toBe('custom');
    expect(previewTargetFor('Rodapé')).toBe('footer');
    expect(previewTargetFor('Cores e fonte')).toBe('home');
  });
});
