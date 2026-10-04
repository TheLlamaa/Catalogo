import type { ComponentType, ReactNode } from 'react';
import { X, Trash2, Sparkles, ShoppingBag, User, Phone, Calendar, Truck, Image as ImageIcon, MessageSquare, Box } from 'lucide-react';
import Dialog from '../../../components/Dialog';
import ProductImage from '../../vitrine/ProductImage';
import { useUI } from '../../../components/UIContext';
import { useSettings } from '../../../components/SettingsContext';
import { StatusSelect } from './StatusSelect';
import { brl, formatOptions, toWhatsappDigits, whatsappLink } from '../../../lib/format';
import { ageInfo, itemModelUrl, orderCode } from '../../../lib/orders';
import type { CatalogOrder, CustomOrder, OrderStatusId, Product } from '../../../types';

type IconType = ComponentType<{ className?: string }>;

const formatDateTime = (iso: string) =>
  `${new Date(iso).toLocaleDateString('pt-BR')} às ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

function InfoRow({ icon: Icon, label, children, wide }: { icon: IconType; label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="p-2 bg-blue-100 text-blue-700 rounded-md"><Icon className="w-4 h-4" /></div>
      <div>
        <span className="text-xs text-gray-500 font-medium block">{label}</span>
        <span className="text-sm font-bold text-gray-900">{children}</span>
      </div>
    </div>
  );
}

interface ModalShellProps {
  title: string;
  icon: IconType;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

function ModalShell({ title, icon: Icon, onClose, children, footer }: ModalShellProps) {
  return (
    <Dialog onClose={onClose} label={title} panelClassName="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col relative max-h-[90vh]">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <button onClick={onClose} aria-label="Fechar" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto space-y-6">{children}</div>
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">{footer}</div>
    </Dialog>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors flex items-center gap-1.5">
      <Trash2 className="w-4 h-4" /> Excluir Pedido
    </button>
  );
}

function WhatsappButton({ order, label, message }: { order: Pick<CatalogOrder, 'client_phone'>; label: string; message: string }) {
  return (
    <a
      href={whatsappLink(`55${toWhatsappDigits(order.client_phone)}`, message)}
      target="_blank" rel="noreferrer"
      className="bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
    >
      <MessageSquare className="w-4 h-4" /> {label}
    </a>
  );
}

interface OrderDetailModalProps<T> {
  order: T;
  onClose: () => void;
  onDelete: (id: string) => unknown;
  onUpdateStatus: (id: string, status: OrderStatusId) => unknown;
}

export function CustomOrderDetailModal({ order, onClose, onDelete, onUpdateStatus }: OrderDetailModalProps<CustomOrder>) {
  const { confirm } = useUI();

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Excluir solicitação', message: `Excluir a solicitação de ${order.client_name}? Isso não pode ser desfeito.` });
    if (ok) onDelete(order.id);
  };

  return (
    <ModalShell
      title={`Pedido Personalizado ${orderCode(order)}`} icon={Sparkles} onClose={onClose}
      footer={<>
        <DeleteButton onClick={handleDelete} />
        <WhatsappButton order={order} label="Responder no WhatsApp" message={`Olá ${order.client_name}! Recebi sua solicitação de peça personalizada pelo site.`} />
      </>}
    >
      {order.image_url ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex justify-center max-h-80">
          <img src={order.image_url} alt="Referência enviada" className="object-contain max-h-80 w-auto" />
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 text-gray-400">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Nenhuma imagem enviada para este pedido</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
        <InfoRow icon={User} label="Cliente">{order.client_name}</InfoRow>
        <InfoRow icon={Phone} label="WhatsApp">{order.client_phone}</InfoRow>
        <InfoRow icon={Calendar} label="Data da Solicitação" wide>{formatDateTime(order.created_at)} <span className="text-xs font-normal text-gray-500">({ageInfo(order).label})</span></InfoRow>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</span>
        <StatusSelect value={order.status} onChange={(s) => onUpdateStatus(order.id, s)} />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Observações e Especificações do Pedido</h3>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 whitespace-pre-line leading-relaxed">{order.description}</div>
      </div>
    </ModalShell>
  );
}

export function CatalogOrderDetailModal({ order, products = [], onClose, onDelete, onUpdateStatus }: OrderDetailModalProps<CatalogOrder> & { products?: Product[] }) {
  const { confirm } = useUI();
  const { modelLinkEnabled } = useSettings();

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Excluir pedido', message: `Excluir o pedido de ${order.client_name}? Isso não pode ser desfeito.` });
    if (ok) onDelete(order.id);
  };

  return (
    <ModalShell
      title={`Detalhes da Compra ${orderCode(order)}`} icon={ShoppingBag} onClose={onClose}
      footer={<>
        <DeleteButton onClick={handleDelete} />
        <WhatsappButton order={order} label="Entrar em Contato no WhatsApp" message={`Olá ${order.client_name}! Recebi seu pedido pelo site.`} />
      </>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
        <InfoRow icon={User} label="Cliente">{order.client_name}</InfoRow>
        <InfoRow icon={Phone} label="WhatsApp">{order.client_phone}</InfoRow>
        <InfoRow icon={Calendar} label="Data do Pedido">{formatDateTime(order.created_at)} <span className="text-xs font-normal text-gray-500">({ageInfo(order).label})</span></InfoRow>
        {order.delivery_method && (
          <InfoRow icon={Truck} label={order.delivery_method === 'entrega' ? 'Entrega' : 'Recebimento'}>
            {order.delivery_method === 'entrega' ? (order.delivery_address || 'Endereço não informado') : 'Retirada'}
          </InfoRow>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</span>
        <StatusSelect value={order.status} onChange={(s) => onUpdateStatus(order.id, s)} />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Itens do Pedido ({order.items?.length || 0})</h3>
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {order.items?.map((item, idx) => {
            const imgUrl = item.imageUrls?.[0] ?? null;
            const opt = formatOptions(item.options);
            const modelUrl = modelLinkEnabled ? itemModelUrl(item, products) : null;
            return (
              <div key={idx} className="p-3 bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {imgUrl ? <ProductImage thumb src={imgUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                    {opt && <span className="text-xs text-blue-700 block">{opt}</span>}
                    <span className="text-xs text-gray-500">{item.quantity}x {brl(item.price)} cada</span>
                    {modelUrl && (
                      <a href={modelUrl} target="_blank" rel="noreferrer noopener" className="mt-1 flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800">
                        <Box className="w-3 h-3" aria-hidden="true" /> Abrir modelo
                      </a>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">{brl(item.price * item.quantity)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {order.notes && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Observações do cliente</h3>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-800 whitespace-pre-line leading-relaxed">{order.notes}</div>
        </div>
      )}

      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
        <span className="text-sm font-semibold text-gray-700">Total do Pedido</span>
        <span className="text-xl font-extrabold text-blue-600">{brl(order.total)}</span>
      </div>
    </ModalShell>
  );
}
