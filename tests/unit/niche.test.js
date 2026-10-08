import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const load = async (niche) => {
  vi.resetModules();
  if (niche === undefined) vi.unstubAllEnvs(); else vi.stubEnv('VITE_NICHE', niche);
  const n = await import('../../src/lib/niche');
  const s = await import('../../src/lib/settings');
  return { ...n, ...s };
};

describe('tipo de loja (niche)', () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('sem configurar, é a loja de impressão 3D de sempre (nada muda para quem já usa)', async () => {
    const m = await load(undefined);
    expect(m.NICHE_ID).toBe('3d');
    const s = m.mergeSettings([]);
    expect(s.aurasEnabled).toBe(true);
    expect(s.leadTimeEnabled).toBe(true);
    expect(s.modelLinkEnabled).toBe(true);
    expect(s.catalogSubtitle).toContain('impressas em 3D');
    expect(s.cardTitle).toBe('Peça Personalizada');
  });

  it('valor desconhecido cai no padrão', async () => {
    expect((await load('qualquer-coisa')).NICHE_ID).toBe('3d');
    expect((await load('constructor')).NICHE_ID).toBe('3d');
    expect((await load('toString')).NICHE_ID).toBe('3d');
  });

  it('loja genérica começa sem os recursos de 3D e com textos neutros', async () => {
    const m = await load('generico');
    expect(m.NICHE_ID).toBe('generico');
    const s = m.mergeSettings([]);
    expect(s.aurasEnabled).toBe(false);
    expect(s.leadTimeEnabled).toBe(false);
    expect(s.modelLinkEnabled).toBe(false);
    expect(s.stockControl).toBe(true);
    expect(s.customEnabled).toBe(true);
    expect(s.catalogSubtitle).not.toMatch(/3D|impress/i);
    expect(s.cardTitle).toBe('Pedido Personalizado');
    expect(m.NICHE.about).toBe('uma loja online');
  });

  it('na loja genérica o dono liga um recurso pelo painel e vale', async () => {
    const m = await load('generico');
    expect(m.mergeSettings([{ key: 'aurasEnabled', value: 'true' }]).aurasEnabled).toBe(true);
  });

  it('na loja 3D o dono desliga um recurso pelo painel e vale', async () => {
    const m = await load('3d');
    const s = m.mergeSettings([{ key: 'aurasEnabled', value: 'false' }, { key: 'leadTimeEnabled', value: 'false' }]);
    expect(s.aurasEnabled).toBe(false);
    expect(s.leadTimeEnabled).toBe(false);
    expect(s.modelLinkEnabled).toBe(true);
  });

  it('nome da loja padrão acompanha o tipo', async () => {
    expect((await load('generico')).mergeSettings([]).storeName).toBe('Minha Loja');
  });
});

describe('painel Recursos', () => {
  it('os 5 recursos estão juntos na aba Avançado', async () => {
    const m = await load(undefined);
    const sec = m.SETTINGS_SCHEMA.filter(x => x.group === 'avancado' && x.title === 'Recursos da loja').flatMap(x => x.fields.map(f => f.key));
    expect(sec).toEqual(['stockControl', 'customEnabled', 'leadTimeEnabled', 'aurasEnabled', 'modelLinkEnabled']);
    expect(m.GROUPS.map(g => g.id)).toContain('avancado');
  });
});
