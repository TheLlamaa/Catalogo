// Avisa no Telegram quando chega um pedido novo (tabelas orders e custom_orders).
// Chamada por um Database Webhook do Supabase (evento INSERT). Passo a passo: ../../LEIA-ME.md
//
// Segredos necessários (supabase secrets set NOME=valor):
//   TELEGRAM_BOT_TOKEN  token do bot criado no @BotFather
//   TELEGRAM_CHAT_ID    id da conversa que recebe os avisos
//   WEBHOOK_SECRET      senha inventada por você; o webhook manda no cabeçalho x-webhook-secret

const brl = (v: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const formatOptions = (options: Record<string, string> | undefined) =>
  options && Object.keys(options).length
    ? ' (' + Object.entries(options).map(([k, v]) => `${k}: ${v}`).join(', ') + ')'
    : '';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const secret = Deno.env.get('WEBHOOK_SECRET') ?? '';
  const sent = req.headers.get('x-webhook-secret') ?? '';
  if (!secret || !safeEqual(sent, secret)) return new Response('unauthorized', { status: 401 });

  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return new Response('telegram not configured', { status: 500 });

  const payload = await req.json().catch(() => null);
  if (!payload || payload.type !== 'INSERT') return new Response('ignored');

  const r = payload.record ?? {};
  let text: string;

  if (payload.table === 'orders') {
    const items = (Array.isArray(r.items) ? r.items : [])
      .map((i: { quantity: number; title: string; options?: Record<string, string> }) =>
        `• ${i.quantity}x ${i.title}${formatOptions(i.options)}`)
      .join('\n');
    text = [
      '🛒 Novo pedido',
      `Cliente: ${r.client_name}`,
      `WhatsApp: ${r.client_phone}`,
      '',
      items,
      '',
      `Total: ${brl(r.total)}`,
      r.delivery_method === 'entrega' ? `Entrega: ${r.delivery_address}` : 'Retirada',
      r.notes ? `\nObservações: ${r.notes}` : ''
    ].join('\n');
  } else if (payload.table === 'custom_orders') {
    text = [
      '✨ Nova solicitação de peça personalizada',
      `Cliente: ${r.client_name}`,
      `WhatsApp: ${r.client_phone}`,
      r.image_url ? 'Com foto de referência (veja no painel).' : '',
      '',
      String(r.description ?? '')
    ].join('\n');
  } else {
    return new Response('ignored');
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3500), disable_web_page_preview: true })
  });

  if (!res.ok) {
    console.error('Telegram respondeu', res.status, await res.text());
    return new Response('telegram error', { status: 502 });
  }
  return new Response('ok');
});
