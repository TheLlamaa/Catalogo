import { useState } from 'react';
import { thumbUrl } from '../../lib/images';

// Mostra a miniatura (quando pedida e existente); se ela não existir (fotos antigas),
// volta sozinha para a foto grande.
export default function ProductImage({ src, alt = '', thumb = false, className = '', ...rest }) {
  const [failedFor, setFailedFor] = useState(null);
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
