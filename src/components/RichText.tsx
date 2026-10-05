import type { ReactNode } from 'react';
import { parseBlocks, type Inline } from '../lib/richtext';

const renderInline = (parts: Inline[]): ReactNode[] => parts.map((p, i) => {
  if (p.t === 'bold') return <strong key={i}>{p.v}</strong>;
  if (p.t === 'italic') return <em key={i}>{p.v}</em>;
  if (p.t === 'link') return <a key={i} href={p.href} target="_blank" rel="noreferrer noopener" className="text-blue-600 underline">{p.v}</a>;
  return <span key={i}>{p.v}</span>;
});

// Texto de página com formatação simples (títulos, listas, negrito, links); nunca insere HTML
export default function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
      {parseBlocks(text).map((b, i) => {
        if (b.t === 'h2') return <h2 key={i} className="text-xl font-bold text-gray-900 pt-2">{renderInline(b.inline)}</h2>;
        if (b.t === 'h3') return <h3 key={i} className="text-base font-semibold text-gray-900 pt-1">{renderInline(b.inline)}</h3>;
        if (b.t === 'ul') return <ul key={i} className="list-disc pl-5 space-y-1">{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>;
        return <p key={i} className="whitespace-pre-line">{renderInline(b.inline)}</p>;
      })}
    </div>
  );
}
