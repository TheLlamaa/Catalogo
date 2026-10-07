// Leitura e redução de imagens no navegador (canvas). As medidas e qualidades vêm de IMAGE_PRESETS.
import { fitWithin } from './images';
import type { ImagePreset } from './images';

export const loadImage = (file: Blob) => new Promise<HTMLImageElement>((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Não foi possível ler a imagem.')); };
  img.src = objectUrl;
});

const draw = (img: HTMLImageElement, max: number): HTMLCanvasElement => {
  const { width, height } = fitWithin(img.width, img.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
  return canvas;
};

export const resizeToBlob = (img: HTMLImageElement, { max, quality }: ImagePreset, type = 'image/jpeg') => new Promise<Blob>((resolve, reject) => {
  draw(img, max).toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao comprimir a imagem.'))), type, quality);
});

// Imagem reduzida como data URL JPEG (vai embutida no pedido)
export const resizeToDataUrl = async (file: Blob, { max, quality }: ImagePreset): Promise<string> =>
  draw(await loadImage(file), max).toDataURL('image/jpeg', quality);
