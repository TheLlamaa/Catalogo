import { Link } from 'react-router-dom';
import { Quote } from 'lucide-react';
import type { HomeBlock } from '../../../lib/blocks';
import { bannerStyle } from '../../../lib/theme';

// Botão de um bloco: endereço completo abre em outra aba; caminho do próprio site navega sem recarregar
function BlockButton({ block, className }: { block: HomeBlock; className: string }) {
  if (!block.link || !block.button) return null;
  if (block.link.startsWith('/')) return <Link to={block.link} className={className}>{block.button}</Link>;
  return <a href={block.link} target="_blank" rel="noreferrer noopener" className={className}>{block.button}</a>;
}

// Bloco extra da página inicial criado no painel (Personalizar loja > Página inicial > Seções e blocos)
export default function ExtraBlock({ block }: { block: HomeBlock }) {
  const headingId = `bloco-${block.id}`;

  if (block.kind === 'banner') {
    return (
      <section className="relative mt-12 mb-2 overflow-hidden rounded-xl text-white" style={bannerStyle({ bannerImage: block.image, bannerColor: '#111827' })} aria-labelledby={block.title ? headingId : undefined}>
        <div className="px-6 py-12 sm:px-12 sm:py-16 max-w-2xl">
          {block.title && <h2 id={headingId} className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">{block.title}</h2>}
          {block.text && <p className="mt-3 text-base sm:text-lg leading-relaxed text-white/90 whitespace-pre-line">{block.text}</p>}
          <BlockButton block={block} className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" />
        </div>
      </section>
    );
  }

  if (block.kind === 'depoimentos') {
    return (
      <section className="mt-12 mb-2" aria-labelledby={block.title ? headingId : undefined}>
        {block.title && <h2 id={headingId} className="text-xl font-bold tracking-tight text-gray-900">{block.title}</h2>}
        <ul className={`${block.title ? 'mt-4 ' : ''}grid gap-4 sm:grid-cols-2 ${block.quotes.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
          {block.quotes.map((q, i) => (
            <li key={i} className="rounded-xl border border-gray-200 bg-white p-5">
              <Quote className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-line">{q.q}</p>
              {q.n && <p className="mt-3 text-sm font-semibold text-gray-900">{q.n}</p>}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="mt-12 mb-2 max-w-3xl" aria-labelledby={block.title ? headingId : undefined}>
      {block.title && <h2 id={headingId} className="text-xl font-bold tracking-tight text-gray-900">{block.title}</h2>}
      {block.text && <p className={`${block.title ? 'mt-2' : ''} text-sm sm:text-base leading-relaxed text-gray-700 whitespace-pre-line`}>{block.text}</p>}
    </section>
  );
}
