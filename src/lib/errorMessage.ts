// Transforma um erro do banco ou da rede em uma frase em português: o que houve e o que fazer.
// Quem usa o painel não precisa ler "Failed to fetch" ou "violates row-level security policy".

const textOf = (err: unknown): string => {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') return (err as { message: string }).message;
  return '';
};

export function friendlyError(err: unknown): string {
  const raw = textOf(err).trim();
  const m = raw.toLowerCase();
  if (!raw) return 'Tente de novo em instantes.';
  if (/failed to fetch|networkerror|load failed|network request failed|fetch failed|err_internet/.test(m)) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  if (/jwt|token.*(expired|invalid)|not authenticated|invalid claim/.test(m)) return 'Sua sessão expirou. Saia e entre de novo no painel.';
  if (/row-level security|permission denied|not authorized|42501/.test(m)) return 'Sem permissão para isso. Confira se o seu e-mail está na Equipe e entre de novo.';
  if (/duplicate key|already exists|23505/.test(m)) return 'Já existe um item com esse nome. Use outro nome.';
  if (/too large|413|exceeded the maximum/.test(m)) return 'Arquivo grande demais. Use uma imagem menor.';
  if (/timeout|timed out|57014/.test(m)) return 'O servidor demorou para responder. Tente de novo.';
  // Mensagens dos nossos gatilhos no banco já vêm em português e explicam o que fazer
  if (/[áéíóúâêôãõç]/i.test(raw) || /^(informe|whatsapp|pedido|estoque|muitos|um dos|total|imagem|quantidade|a descrição)/i.test(raw)) return raw;
  return `Tente de novo em instantes. Se continuar, avise o suporte com este detalhe: ${raw.slice(0, 140)}`;
}
