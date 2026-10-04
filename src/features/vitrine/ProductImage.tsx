import { useState, type ImgHTMLAttributes } from 'react';
import { thumbUrl } from '../../lib/images';

// Mostra a miniatura (quando pedida e existente); se ela não existir (fotos antigas),
// volta sozinha para a foto grande.
interface ProductImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  /** Pede a miniatura em vez da foto grande. */
  thumb?: boolean;
}

export default function ProductImage({ src, alt = '', thumb = false, className = '', ...rest }: ProductImageProps) {
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const url = thumb && failedFor !== src ? thumbUrl(src) : src;

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => { if (thumb && url !== src) setFailedFor(src); }}
      {...rest}
    />
  );
}
