import { IMAGE_GUIDES, type ImageGuideKey } from '../lib/imageGuides';

// Texto auxiliar com o tamanho ideal da imagem, logo abaixo do campo de envio
export default function ImageGuideText({ guide, className = '' }: { guide: ImageGuideKey; className?: string }) {
  const g = IMAGE_GUIDES[guide];
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      <span className="font-medium text-gray-600">{g.text}</span>
      {g.note && <> · {g.note}</>}
    </p>
  );
}
