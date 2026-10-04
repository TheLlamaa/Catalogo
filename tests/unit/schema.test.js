import { describe, it, expect } from 'vitest';
import { schemaStatus, schemaMessage, EXPECTED_SCHEMA_VERSION } from '../../src/lib/schema';
import { normalizeEmail, validateAdminEmail } from '../../src/lib/admins';

describe('versão do banco', () => {
  it('em dia', () => {
    const s = schemaStatus([{ key: 'schema_version', value: String(EXPECTED_SCHEMA_VERSION) }], null);
    expect(s.ok).toBe(true);
    expect(schemaMessage(s)).toBe('');
  });
  it('banco mais novo que o site também está ok', () => {
    expect(schemaStatus([{ key: 'schema_version', value: '99' }], null).ok).toBe(true);
  });
  it('desatualizado diz qual versão e o que fazer', () => {
    const s = schemaStatus([{ key: 'schema_version', value: '7' }], null, 9);
    expect(s).toMatchObject({ ok: false, current: 7, expected: 9, reason: 'desatualizado' });
    expect(schemaMessage(s)).toContain('versão 7');
    expect(schemaMessage(s)).toContain('a 9');
    expect(schemaMessage(s)).toContain('07');
  });
  it('sem a tabela (erro) ou sem a linha: manda rodar o 08', () => {
    expect(schemaStatus(null, { message: 'relation does not exist' })).toMatchObject({ ok: false, reason: 'sem-versao' });
    expect(schemaStatus([], null).reason).toBe('sem-versao');
    expect(schemaStatus([{ key: 'schema_version', value: 'abc' }], null).reason).toBe('sem-versao');
    expect(schemaMessage(schemaStatus(null, { message: 'x' }))).toContain('08-administradores.sql');
  });
});

describe('e-mail de administrador', () => {
  it('normaliza espaços e maiúsculas', () => expect(normalizeEmail('  Fulano@Loja.COM ')).toBe('fulano@loja.com'));
  it('aceita e-mails válidos', () => expect(validateAdminEmail('fulano@loja.com')).toBeNull());
  it('recusa vazio, sem arroba, sem domínio e com espaço', () => {
    for (const v of ['', '   ', 'fulano', 'fulano@', '@loja.com', 'fulano@loja', 'ful ano@loja.com']) expect(validateAdminEmail(v)).toBeTruthy();
  });
  it('recusa repetido, ignorando maiúsculas', () => expect(validateAdminEmail('A@b.com', ['a@B.com'])).toMatch(/já é administrador/));
  it('recusa e-mail enorme', () => expect(validateAdminEmail(`${'a'.repeat(200)}@b.com`)).toBeTruthy());
});
