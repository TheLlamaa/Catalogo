// Ponto de partida de cada tipo de loja. Escolhido na hora de publicar o site (variável VITE_NICHE):
// "3d" (padrão, o que o site sempre foi) ou "generico" (loja comum, sem os recursos de impressão 3D ligados).
// O dono da loja muda tudo isso depois pelo painel (aba Site); isto só define os valores iniciais.
const PRESETS = {
  '3d': {
    storeName: 'Catálogo 3D',
    about: 'uma loja de peças impressas em 3D',
    catalogSubtitle: 'Explore nossa coleção de peças impressas em 3D. Clique em um produto para ver mais fotos e detalhes.',
    customTitle: 'Peça Personalizada',
    features: { aurasEnabled: true, leadTimeEnabled: true, modelLinkEnabled: true },
  },
  generico: {
    storeName: 'Minha Loja',
    about: 'uma loja online',
    catalogSubtitle: 'Explore nossos produtos. Clique em um item para ver mais fotos e detalhes.',
    customTitle: 'Pedido Personalizado',
    features: { aurasEnabled: false, leadTimeEnabled: false, modelLinkEnabled: false },
  },
};

export const NICHE_ID = Object.hasOwn(PRESETS, import.meta.env.VITE_NICHE) ? import.meta.env.VITE_NICHE : '3d';
export const NICHE = PRESETS[NICHE_ID];
