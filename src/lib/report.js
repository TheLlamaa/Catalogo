import { brl, formatOptions, statusInfo } from './format';
import { orderCode, summarize, topProducts, dailyTotals, deliveryLabel } from './orders';

// Tudo que vem do cliente (nome, endereço, observações…) passa por aqui antes de entrar no HTML
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtDay = (k) => { const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; };
const fmtDateTime = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Página de relatório pronta para imprimir ou salvar como PDF (abre em uma aba nova)
export function buildReportHtml({ storeName, periodText, filterText = '', orders, generatedAt = new Date(), detailed = true }) {
  const s = summarize(orders);
  const top = topProducts(orders, 10);
  const days = dailyTotals(orders);
  const maxDay = Math.max(1, ...days.map(d => d.total));

  const kpi = (label, value, sub = '') => `<div class="kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;

  const statusRows = s.byStatus.filter(x => x.count > 0).map(x =>
    `<tr><td>${esc(x.label)}</td><td class="n">${x.count}</td><td class="n">${x.id === 'cancelado' ? `<span class="muted">(${esc(brl(x.lostTotal))} não contados)</span>` : esc(brl(x.total))}</td></tr>`).join('');

  const topRows = top.map((p, i) =>
    `<tr><td>${i + 1}</td><td>${esc(p.title)}</td><td class="n">${p.quantity}</td><td class="n">${esc(brl(p.revenue))}</td></tr>`).join('');

  const dayRows = days.map(d =>
    `<tr><td>${esc(fmtDay(d.day))}</td><td class="n">${d.count}</td><td class="n">${esc(brl(d.total))}</td><td class="bar"><i style="width:${Math.round((d.total / maxDay) * 100)}%"></i></td></tr>`).join('');

  const orderRows = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(o => {
    const items = (o.items || []).map(i => { const opt = formatOptions(i.options); return `${esc(i.quantity)}x ${esc(i.title)}${opt ? ` <span class="muted">(${esc(opt)})</span>` : ''}`; }).join('<br>');
    const where = o.delivery_method === 'entrega' ? `Entrega${o.delivery_address ? `: ${esc(o.delivery_address)}` : ''}` : esc(deliveryLabel(o));
    return `<tr>
      <td>${esc(orderCode(o))}<br><span class="muted">${esc(fmtDateTime(o.created_at))}</span></td>
      <td>${esc(o.client_name)}<br><span class="muted">${esc(o.client_phone)}</span></td>
      ${detailed ? `<td>${items}${o.notes ? `<br><em class="muted">Obs.: ${esc(o.notes)}</em>` : ''}</td>` : ''}
      <td>${where}</td>
      <td>${esc(statusInfo(o.status).label)}</td>
      <td class="n">${esc(brl(o.total))}</td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de pedidos — ${esc(storeName)}</title>
<style>
  *{box-sizing:border-box} body{font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111827;margin:0;background:#f3f4f6}
  main{max-width:1000px;margin:0 auto;padding:24px;background:#fff;min-height:100vh}
  h1{font-size:22px;margin:0 0 2px} h2{font-size:15px;margin:28px 0 8px;padding-bottom:4px;border-bottom:2px solid #e5e7eb}
  .sub{color:#6b7280;margin:0 0 4px} .muted{color:#6b7280;font-size:12px}
  .bar-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
  button{font:inherit;padding:8px 14px;border:0;border-radius:6px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:16px}
  .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#f9fafb} .kpi span{display:block;font-size:12px;color:#6b7280}
  .kpi strong{display:block;font-size:20px;margin-top:2px} .kpi small{color:#6b7280}
  table{width:100%;border-collapse:collapse;font-size:13px} th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;border-bottom:1px solid #d1d5db;padding:6px 8px}
  td{padding:6px 8px;border-bottom:1px solid #eef0f3;vertical-align:top} .n{text-align:right;white-space:nowrap}
  td.bar{width:30%} td.bar i{display:block;height:10px;background:#93c5fd;border-radius:3px}
  tr{break-inside:avoid} .empty{color:#6b7280;padding:12px 0}
  .foot{margin-top:28px;color:#9ca3af;font-size:11px}
  @media print{body{background:#fff} main{padding:0;max-width:none} .noprint{display:none} h2{break-after:avoid} @page{margin:14mm}}
</style></head><body><main>
  <div class="bar-top">
    <div>
      <h1>Relatório de pedidos</h1>
      <p class="sub">${esc(storeName)} · ${esc(periodText)}</p>
      ${filterText ? `<p class="sub">Filtros: ${esc(filterText)}</p>` : ''}
    </div>
    <button class="noprint" onclick="window.print()">Imprimir / Salvar PDF</button>
  </div>
  <div class="kpis">
    ${kpi('Pedidos', String(s.count), s.cancelled ? `${s.cancelled} cancelado(s)` : '')}
    ${kpi('Faturamento', brl(s.revenue), 'sem cancelados')}
    ${kpi('Ticket médio', brl(s.ticket))}
    ${kpi('Unidades', String(s.units))}
    ${kpi('Concluídos', brl(s.received))}
  </div>
  <h2>Por status</h2>
  ${statusRows ? `<table><tr><th>Status</th><th class="n">Pedidos</th><th class="n">Valor</th></tr>${statusRows}</table>` : '<p class="empty">Nenhum pedido neste período.</p>'}
  <h2>Produtos mais pedidos</h2>
  ${topRows ? `<table><tr><th>#</th><th>Produto</th><th class="n">Unidades</th><th class="n">Valor</th></tr>${topRows}</table>` : '<p class="empty">Sem itens.</p>'}
  <h2>Valor por dia</h2>
  ${dayRows ? `<table><tr><th>Dia</th><th class="n">Pedidos</th><th class="n">Valor</th><th></th></tr>${dayRows}</table>` : '<p class="empty">Sem pedidos.</p>'}
  <h2>Pedidos (${orders.length})</h2>
  ${orderRows ? `<table><tr><th>Pedido</th><th>Cliente</th>${detailed ? '<th>Itens</th>' : ''}<th>Recebimento</th><th>Status</th><th class="n">Total</th></tr>${orderRows}</table>` : '<p class="empty">Nenhum pedido.</p>'}
  <p class="foot">Gerado em ${esc(generatedAt.toLocaleString('pt-BR'))}. Pedidos cancelados aparecem na lista, mas não entram no faturamento, no ticket médio nem no ranking.</p>
</main></body></html>`;
}

// Abre o relatório em uma aba nova. Devolve false se o navegador bloqueou a janela.
export function openReport(html) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const w = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return !!w;
}
