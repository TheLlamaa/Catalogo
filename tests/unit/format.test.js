import { describe, it, expect } from 'vitest';
import {
  brl, formatPhoneBR, validateContact, toWhatsappDigits, whatsappLink, statusInfo,
  formatOptions, buildOrderMessage, isHttpUrl, ORDER_STATUS
} from '../../src/lib/format';

describe('dinheiro e telefone', () => {
  it('brl formata em reais', () => {
    expect(brl(12.5).replace(/\s/g, ' ')).toBe('R$ 12,50');
    expect(brl('x').replace(/\s/g, ' ')).toBe('R$ 0,00');
  });
  it('máscara de telefone enquanto digita', () => {
    expect(formatPhoneBR('4')).toBe('(4');
    expect(formatPhoneBR('48999')).toBe('(48) 999');
    expect(formatPhoneBR('48999998888')).toBe('(48) 99999-8888');
    expect(formatPhoneBR('+55 48 99999-8888')).toBe('(48) 99999-8888');
    expect(formatPhoneBR('')).toBe('');
  });
  it('valida nome e WhatsApp', () => {
    expect(validateContact('Maria', '(48) 99999-8888')).toBeNull();
    expect(validateContact('M', '(48) 99999-8888')).toMatch(/nome/);
    expect(validateContact('Maria', '(48) 8888-7777')).toMatch(/WhatsApp/);
    expect(validateContact('Maria', '(00) 99999-8888')).toMatch(/WhatsApp/); // DDD inexistente
    expect(validateContact('Maria', '+55 (48) 99999-8888')).toBeNull();
  });
  it('links do WhatsApp', () => {
    expect(toWhatsappDigits('5548999998888')).toBe('48999998888');
    expect(whatsappLink('5548999998888', 'olá & tchau')).toBe('https://wa.me/5548999998888?text=ol%C3%A1%20%26%20tchau');
    expect(whatsappLink('5548999998888')).toBe('https://wa.me/5548999998888');
  });
});

describe('pedidos', () => {
  it('status desconhecido cai em "Novo"', () => {
    expect(statusInfo('xyz').id).toBe('novo');
    expect(statusInfo('concluido').label).toBe('Concluído');
    expect(ORDER_STATUS.map(s => s.id)).toContain('cancelado');
  });
  it('formata opções', () => {
    expect(formatOptions({ Cor: 'Preto', Tamanho: 'M' })).toBe('Cor: Preto · Tamanho: M');
    expect(formatOptions({})).toBe('');
    expect(formatOptions(null)).toBe('');
  });
  it('mensagem do pedido tem itens, total e entrega', () => {
    const msg = buildOrderMessage({
      name: 'Maria', total: 30, notes: 'Azul', deliveryMethod: 'entrega', deliveryAddress: 'Rua A, 10',
      items: [{ quantity: 2, title: 'Chaveiro', price: 15, options: { Cor: 'Azul' } }]
    });
    expect(msg).toContain('Meu nome é Maria');
    expect(msg).toContain('2x Chaveiro (Cor: Azul)');
    expect(msg).toContain('Entrega: Rua A, 10');
    expect(msg).toContain('Observações: Azul');
  });
  it('retirada não cita endereço', () => {
    const msg = buildOrderMessage({ name: 'J', total: 1, items: [], deliveryMethod: 'retirada' });
    expect(msg).toContain('Retirada');
    expect(msg).not.toContain('Entrega:');
  });
});

describe('links', () => {
  it('só http(s), sem espaços', () => {
    expect(isHttpUrl('https://makerworld.com/x')).toBe(true);
    expect(isHttpUrl('http://x.test')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('https://x.test/a b')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
    expect(isHttpUrl('https://x.test/' + 'a'.repeat(500))).toBe(false);
  });
});
