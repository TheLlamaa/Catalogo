import { describe, it, expect } from 'vitest';
import { friendlyError } from '../../src/lib/errorMessage';

describe('mensagens de erro em português', () => {
  it('sem internet', () => expect(friendlyError(new TypeError('Failed to fetch'))).toMatch(/Sem conexão/));
  it('sessão expirada', () => expect(friendlyError({ message: 'JWT expired' })).toMatch(/sessão expirou/));
  it('sem permissão (RLS)', () => expect(friendlyError({ message: 'new row violates row-level security policy for table "products"' })).toMatch(/Sem permissão/));
  it('nome repetido', () => expect(friendlyError({ message: 'duplicate key value violates unique constraint "categories_name_key"' })).toMatch(/Já existe/));
  it('mensagem do nosso banco (já em português) passa como está', () => {
    expect(friendlyError({ message: 'Muitos pedidos em sequência. Tente novamente em instantes.' })).toBe('Muitos pedidos em sequência. Tente novamente em instantes.');
    expect(friendlyError({ message: 'WhatsApp inválido. Use DDD e 9 dígitos, ex: (48) 99999-9999.' })).toMatch(/^WhatsApp inválido/);
  });
  it('erro desconhecido: orienta e guarda o detalhe para o suporte', () => {
    const t = friendlyError({ message: 'some weird thing' });
    expect(t).toMatch(/^Tente de novo/);
    expect(t).toContain('some weird thing');
  });
  it('vazio ou estranho não quebra', () => {
    expect(friendlyError(null)).toBe('Tente de novo em instantes.');
    expect(friendlyError(42)).toBe('Tente de novo em instantes.');
  });
});
