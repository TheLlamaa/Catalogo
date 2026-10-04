import { ORDER_STATUS, statusInfo } from '../../../lib/format';

export function StatusBadge({ status }) {
  const info = statusInfo(status);
  return <span className={`inline-block text-[11px] font-semibold rounded-full border px-2 py-0.5 ${info.cls}`}>{info.label}</span>;
}

export function StatusSelect({ value, onChange }) {
  const info = statusInfo(value);
  return (
    <select
      aria-label="Status do pedido"
      value={info.id}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={`text-xs font-semibold rounded-full border px-2.5 py-1 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 ${info.cls}`}
    >
      {ORDER_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}
