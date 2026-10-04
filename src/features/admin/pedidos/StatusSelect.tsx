import { ORDER_STATUS, statusInfo } from '../../../lib/format';
import type { OrderStatusId } from '../../../types';

export function StatusBadge({ status }: { status: unknown }) {
  const info = statusInfo(status);
  return <span className={`inline-block text-[11px] font-semibold rounded-full border px-2 py-0.5 ${info.cls}`}>{info.label}</span>;
}

interface StatusSelectProps {
  value: unknown;
  onChange: (status: OrderStatusId) => void;
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const info = statusInfo(value);
  return (
    <select
      aria-label="Status do pedido"
      value={info.id}
      onChange={(e) => onChange(e.target.value as OrderStatusId)}
      onClick={(e) => e.stopPropagation()}
      className={`text-xs font-semibold rounded-full border px-2.5 py-1 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 ${info.cls}`}
    >
      {ORDER_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}
