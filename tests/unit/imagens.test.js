import { describe, it, expect } from 'vitest';
import { BUCKET, IMAGE_PRESETS, fitWithin, thumbPath, thumbUrl } from '../../src/lib/images';
import { orderInbox } from '../../src/lib/orders';

describe('imagens', () => {
  it('reduz mantendo a proporção, sem aumentar', () => {
    expect(fitWithin(2400, 1200, 1200)).toEqual({ width: 1200, height: 600 });
    expect(fitWithin(1200, 2400, 1200)).toEqual({ width: 600, height: 1200 });
    expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1000, 3, 400)).toEqual({ width: 400, height: 1 + 0 });
  });
  it('miniatura: quem cria e quem lê usam a mesma convenção', () => {
    expect(thumbPath('abc.jpg')).toBe('abc_t.jpg');
    const url = `https://x.supabase.co/storage/v1/object/public/${BUCKET}/abc.jpg`;
    expect(thumbUrl(url)).toBe(thumbPath(url));
    expect(thumbUrl(thumbPath(url))).toBe(thumbPath(url));
    expect(thumbUrl('https://outro.site/foto.jpg')).toBe('https://outro.site/foto.jpg');
  });
  it('presets nomeados', () => {
    expect(Object.keys(IMAGE_PRESETS)).toEqual(['product', 'thumb', 'site', 'reference']);
    expect(IMAGE_PRESETS.thumb.max).toBeLessThan(IMAGE_PRESETS.product.max);
  });
});

describe('caixa de entrada de pedidos', () => {
  const o = (id, status, total, name) => ({ id, status, total, client_name: name, client_phone: '48999990000', items: [], created_at: new Date().toISOString() });
  const orders = [o('1', 'novo', 10, 'Ana'), o('2', 'enviado', 20, 'Bia'), o('3', 'novo', 30, 'Caio')];
  const filters = { query: '', period: 'all', from: '', to: '', delivery: 'all', sort: 'total_desc' };

  it('sem status: tudo visível e chips contam por status', () => {
    const inbox = orderInbox(orders, filters, 'all');
    expect(inbox.visible.map(x => x.id)).toEqual(['3', '2', '1']);
    expect(inbox.counts).toMatchObject({ novo: 2, enviado: 1 });
  });
  it('status escolhido filtra a lista mas não os números dos chips', () => {
    const inbox = orderInbox(orders, filters, 'novo');
    expect(inbox.visible.map(x => x.id)).toEqual(['3', '1']);
    expect(inbox.scoped).toHaveLength(3);
    expect(inbox.counts.enviado).toBe(1);
    expect(inbox.summary.count).toBe(2);
  });
  it('a busca vale para os dois', () => {
    const inbox = orderInbox(orders, { ...filters, query: 'bia' }, 'all');
    expect(inbox.visible.map(x => x.id)).toEqual(['2']);
    expect(inbox.counts.novo ?? 0).toBe(0);
  });
});
