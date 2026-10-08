// Logo e nome da loja no topo: fontes, tamanhos, cor, formato da logo e disposição.
// Tudo editável em Site > Aparência > "Logo" e "Nome da loja no topo". Aqui só as regras puras (testadas);
// o carregamento dos arquivos de fonte fica em lib/brandFontLoader.ts.
import { contrastRatio, DARK_SURFACE, isHex } from './theme';

export interface BrandFont { id: string; name: string; stack: string; weights: number[] }

// Fontes servidas pelo próprio site (pacotes @fontsource): nada de serviço externo, respeita a política de segurança.
export const BRAND_FONTS: BrandFont[] = [
  { id: 'site', name: 'Igual ao site', stack: 'inherit', weights: [400, 500, 600, 700, 800, 900] },
  { id: 'poppins', name: 'Poppins', stack: "'Poppins', sans-serif", weights: [400, 500, 600, 700, 800, 900] },
  { id: 'montserrat', name: 'Montserrat', stack: "'Montserrat', sans-serif", weights: [400, 500, 600, 700, 800, 900] },
  { id: 'space-grotesk', name: 'Space Grotesk', stack: "'Space Grotesk', sans-serif", weights: [400, 500, 600, 700] },
  { id: 'fredoka', name: 'Fredoka (arredondada)', stack: "'Fredoka', sans-serif", weights: [400, 500, 600, 700] },
  { id: 'playfair-display', name: 'Playfair (serifa elegante)', stack: "'Playfair Display', serif", weights: [400, 500, 600, 700, 800, 900] },
  { id: 'abril-fatface', name: 'Abril Fatface (serifa forte)', stack: "'Abril Fatface', serif", weights: [400] },
  { id: 'bebas-neue', name: 'Bebas Neue (alta e estreita)', stack: "'Bebas Neue', sans-serif", weights: [400] },
  { id: 'righteous', name: 'Righteous (retrô)', stack: "'Righteous', sans-serif", weights: [400] },
  { id: 'orbitron', name: 'Orbitron (futurista)', stack: "'Orbitron', sans-serif", weights: [400, 500, 600, 700, 800, 900] },
  { id: 'press-start-2p', name: 'Press Start (pixel)', stack: "'Press Start 2P', monospace", weights: [400] },
  { id: 'pacifico', name: 'Pacifico (pincel)', stack: "'Pacifico', cursive", weights: [400] },
  { id: 'lobster', name: 'Lobster (letreiro)', stack: "'Lobster', cursive", weights: [400] },
  { id: 'caveat', name: 'Caveat (escrita à mão)', stack: "'Caveat', cursive", weights: [400, 500, 600, 700] },
];
export const brandFont = (id: string): BrandFont => BRAND_FONTS.find(f => f.id === id) || BRAND_FONTS[0];

// Peso pedido × pesos que a fonte tem: usa o mais próximo, para o navegador não "engordar" a letra artificialmente
export const nearestWeight = (font: BrandFont, wanted: number): number =>
  font.weights.reduce((best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best), font.weights[0]);

export const NAME_WEIGHTS = [
  { value: '400', label: 'Normal' }, { value: '500', label: 'Média' }, { value: '600', label: 'Seminegrito' },
  { value: '700', label: 'Negrito' }, { value: '800', label: 'Extranegrito' }, { value: '900', label: 'Black' },
];
export const NAME_CASES = [
  { value: 'normal', label: 'Como foi escrito' }, { value: 'maiusculas', label: 'TUDO MAIÚSCULO' }, { value: 'minusculas', label: 'tudo minúsculo' },
];
export const NAME_SPACINGS = [
  { value: 'apertado', label: 'Levemente junto (padrão)', em: '-0.025em' }, { value: 'normal', label: 'Normal', em: '0' },
  { value: 'espacado', label: 'Espaçado', em: '0.08em' }, { value: 'bem', label: 'Bem espaçado', em: '0.2em' },
];
export const NAME_COLORS = [
  { value: 'texto', label: 'Cor do texto' }, { value: 'principal', label: 'Cor principal da loja' }, { value: 'personalizada', label: 'Escolher uma cor' },
];
export const LOGO_SHAPES = [
  { value: 'original', label: 'Original' }, { value: 'arredondado', label: 'Cantos arredondados' }, { value: 'redondo', label: 'Redonda' },
];
export const BRAND_LAYOUTS = [
  { value: 'lado', label: 'Nome ao lado da logo' }, { value: 'abaixo', label: 'Nome embaixo da logo' },
];

// Campos lidos das configurações (strings vindas do banco, já validadas por mergeSettings)
export interface BrandSettings {
  storeName: string; logoUrl: string; logoShowName: boolean; logoSize: string; logoSizeMobile: string; logoShape: string; brandLayout: string;
  nameImage: string; nameImageSize: string; nameFont: string; nameSize: string; nameSizeMobile: string; nameWeight: string;
  nameItalic: boolean; nameCase: string; nameSpacing: string; nameColorMode: string; nameColor: string; storeTagline: string;
}

const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);

// Tudo que o topo precisa para desenhar a marca. "dark": o site está no modo escuro.
export const brandLook = (s: BrandSettings, dark = false) => {
  const font = brandFont(s.nameFont);
  const logoH = num(s.logoSize, 36);
  const logoHm = Math.min(logoH, num(s.logoSizeMobile, 48));
  const nameD = num(s.nameSize, 18);
  const nameM = Math.min(nameD, num(s.nameSizeMobile, 18));
  const imgH = num(s.nameImageSize, 32);
  // Cor escolhida que some no fundo escuro (ex.: preto) volta à cor do texto no modo escuro
  const custom = s.nameColorMode === 'personalizada' && isHex(s.nameColor) && !(dark && contrastRatio(s.nameColor, DARK_SURFACE) < 3) ? s.nameColor : '';
  return {
    font,
    showName: !s.logoUrl || s.logoShowName,
    stacked: s.brandLayout === 'abaixo',
    logo: { h: logoH, hMobile: logoHm, shape: s.logoShape === 'redondo' || s.logoShape === 'arredondado' ? s.logoShape : 'original' },
    nameImage: s.nameImage ? { h: imgH, hMobile: Math.min(imgH, 40) } : null,
    name: {
      sizeD: nameD, sizeM: nameM,
      fontFamily: font.stack,
      fontWeight: nearestWeight(font, num(s.nameWeight, 700)),
      fontStyle: s.nameItalic ? 'italic' : 'normal',
      textTransform: s.nameCase === 'maiusculas' ? 'uppercase' : s.nameCase === 'minusculas' ? 'lowercase' : 'none',
      letterSpacing: (NAME_SPACINGS.find(x => x.value === s.nameSpacing) || NAME_SPACINGS[0]).em,
      color: custom,
      primary: s.nameColorMode === 'principal',
    },
    tagline: s.storeTagline.trim(),
  };
};
export type BrandLook = ReturnType<typeof brandLook>;
