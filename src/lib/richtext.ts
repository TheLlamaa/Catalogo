// Formatação simples para o texto das páginas (sem HTML, então nada de código vindo do painel entra no site):
//   # Título grande      ## Título menor      - item de lista
//   **negrito**   *itálico*   [texto do link](https://endereço)
// Linha em branco separa parágrafos.

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }
  | { t: 'link'; v: string; href: string };

export type Block =
  | { t: 'h2' | 'h3' | 'p'; inline: Inline[] }
  | { t: 'ul'; items: Inline[][] };

const INLINE_RE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export const parseInline = (s: string): Inline[] => {
  const out: Inline[] = [];
  let last = 0;
  for (const m of s.matchAll(INLINE_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: 'text', v: s.slice(last, i) });
    if (m[1] !== undefined) out.push({ t: 'bold', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'italic', v: m[2] });
    else out.push({ t: 'link', v: m[3], href: m[4] });
    last = i + m[0].length;
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
  return out;
};

export const parseBlocks = (text: string): Block[] => {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: Inline[][] = [];
  const flushPara = () => { if (para.length) { blocks.push({ t: 'p', inline: parseInline(para.join('\n')) }); para = []; } };
  const flushList = () => { if (list.length) { blocks.push({ t: 'ul', items: list }); list = []; } };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }
    const h2 = line.match(/^#\s+(.+)/);
    const h3 = line.match(/^##\s+(.+)/);
    const li = line.match(/^[-*]\s+(.+)/);
    if (h3) { flushPara(); flushList(); blocks.push({ t: 'h3', inline: parseInline(h3[1]) }); }
    else if (h2) { flushPara(); flushList(); blocks.push({ t: 'h2', inline: parseInline(h2[1]) }); }
    else if (li) { flushPara(); list.push(parseInline(li[1])); }
    else { flushList(); para.push(line); }
  }
  flushPara(); flushList();
  return blocks;
};
