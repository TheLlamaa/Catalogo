import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, X, Package, Image as ImageIcon, Minus, Plus, CheckCircle2, MessageSquare } from 'lucide-react';
import Dialog from '../../components/Dialog';
import ProductImage from './ProductImage';
import { useUI } from '../../components/UIContext';
import { useSettings } from '../../components/SettingsContext';
import type { CartItem, DeliveryMethod } from '../../types';
import { minOrderValue } from '../../lib/settings';
import { brl, formatOptions, formatPhoneBR, validateContact, buildOrderMessage, whatsappLink } from '../../lib/format';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  updateQuantity: (key: string, delta: number) => void;
  removeItem: (key: string) => void;
  total: number;
  onCheckout: (order: Record<string, unknown>) => Promise<boolean>;
}

// Dados do último pedido enviado, usados na mensagem do WhatsApp.
interface LastOrder {
  name: string;
  items: { id: string; title: string; price: number; quantity: number; options: Record<string, string>; imageUrls: string[] }[];
  total: number;
  notes: string | null;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
}

export default function CartDrawer({ isOpen, onClose, cart, updateQuantity, removeItem, total, onCheckout }: CartDrawerProps) {
  const settings = useSettings();
  const { toast } = useUI();
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart'); // cart, checkout, success
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('retirada');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trap, setTrap] = useState(''); // campo-isca anti-robô
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);

  if (!isOpen) return null;
  const minOrder = minOrderValue(settings.minOrder);
  const belowMin = minOrder > 0 && total < minOrder;

  const handleFinishOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (settings.ordersPaused) return toast.error(settings.pausedMessage);
    if (!clientName || !clientPhone) return toast.error('Preencha nome e WhatsApp.');
    const contactError = validateContact(clientName, clientPhone);
    if (contactError) return toast.error(contactError);
    if (settings.deliveryEnabled && deliveryMethod === 'entrega' && deliveryAddress.trim().length < 5) {
      return toast.error('Informe o endereço, ou ao menos bairro e cidade, para combinarmos a entrega.');
    }
    if (trap) { setStep('success'); return; } // campo-isca preenchido: é robô

    const items = cart.map(l => ({
      id: l.id,
      title: l.product.title,
      price: l.product.price,
      quantity: l.quantity,
      options: l.options,
      imageUrls: (l.product.imageUrls || []).slice(0, 1)
    }));
    const order = {
      client_name: clientName.trim(),
      client_phone: clientPhone,
      notes: notes.trim() || null,
      delivery_method: deliveryMethod,
      delivery_address: deliveryMethod === 'entrega' ? deliveryAddress.trim() : null,
      items,
      total
    };

    setIsSubmitting(true);
    const success = await onCheckout(order);
    setIsSubmitting(false);

    if (success) {
      setLastOrder({
        name: order.client_name, items, total,
        notes: order.notes, deliveryMethod, deliveryAddress: order.delivery_address
      });
      setStep('success');
    }
  };

  const handleClose = () => {
    setStep('cart');
    setClientName('');
    setClientPhone('');
    setNotes('');
    setDeliveryMethod('retirada');
    setDeliveryAddress('');
    setLastOrder(null);
    onClose();
  };

  return (
    <Dialog variant="drawer" onClose={handleClose} label={settings.cartTitle} panelClassName="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-600" /> {settings.cartTitle}</h2>
        <button onClick={handleClose} aria-label="Fechar orçamento" className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
      </div>

      {step === 'cart' && (
        <>
          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                <Package className="w-12 h-12 text-gray-300" />
                <p className="text-sm font-medium">{settings.cartEmpty}</p>
              </div>
            ) : (
              <ul className="space-y-6">
                {cart.map(line => {
                  const imgUrl = line.product.imageUrls?.length > 0 ? line.product.imageUrls[0] : null;
                  const opt = formatOptions(line.options);
                  return (
                    <li key={line.key} className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {imgUrl ? <ProductImage thumb src={imgUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-gray-400" />}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{line.product.title}</h3>
                        {opt && <span className="text-xs text-gray-500">{opt}</span>}
                        {!settings.hidePrices && <span className="text-sm font-bold mt-1">{brl(line.product.price)}</span>}
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center border border-gray-200 rounded-md">
                            <button onClick={() => updateQuantity(line.key, -1)} aria-label="Diminuir quantidade" className="p-1.5 text-gray-500 hover:bg-gray-50"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="px-3 text-sm font-medium">{line.quantity}</span>
                            <button onClick={() => updateQuantity(line.key, 1)} aria-label="Aumentar quantidade" className="p-1.5 text-gray-500 hover:bg-gray-50"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                          <button onClick={() => removeItem(line.key)} className="text-xs text-red-500 font-medium">Remover</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-6 bg-gray-50 mt-auto">
              {!settings.hidePrices && <div className="flex justify-between mb-5"><span className="text-sm font-medium">Total</span><span className="text-xl font-bold">{brl(total)}</span></div>}
              {settings.ordersPaused && <p role="status" className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3">{settings.pausedMessage}</p>}
              {!settings.ordersPaused && belowMin && <p role="status" className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3">Pedido mínimo: {brl(minOrder)}. Faltam {brl(minOrder - total)}.</p>}
              <button
                onClick={() => setStep('checkout')}
                disabled={settings.ordersPaused || belowMin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Avançar para Identificação
              </button>
            </div>
          )}
        </>
      )}

      {step === 'checkout' && (
        <form onSubmit={handleFinishOrder} className="flex-1 flex flex-col p-6 space-y-5 overflow-y-auto relative">
          <input
            type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
            value={trap} onChange={e => setTrap(e.target.value)}
            className="absolute -left-[9999px] w-px h-px opacity-0"
          />
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Informações para Contato</h3>
            <p className="text-xs text-gray-500 mb-5">{settings.cartIntro}</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="k-nome" className="block text-sm font-medium text-gray-700 mb-1">Seu Nome *</label>
                <input
                  id="k-nome" required type="text" placeholder="Ex: João Souza" maxLength={100}
                  value={clientName} onChange={e => setClientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="k-whats" className="block text-sm font-medium text-gray-700 mb-1">Seu WhatsApp *</label>
                <input
                  id="k-whats" required type="text" placeholder="(11) 99999-9999" inputMode="tel" maxLength={15}
                  value={clientPhone} onChange={e => setClientPhone(formatPhoneBR(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {settings.deliveryEnabled && <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">Como prefere receber?</legend>
            <div className="grid grid-cols-2 gap-3">
              {([{ id: 'retirada', label: 'Retirada' }, { id: 'entrega', label: 'Entrega' }] as { id: DeliveryMethod; label: string }[]).map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-center gap-2 border rounded-md py-2 text-sm cursor-pointer transition-colors ${deliveryMethod === opt.id ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <input type="radio" name="entrega" value={opt.id} checked={deliveryMethod === opt.id} onChange={() => setDeliveryMethod(opt.id)} className="sr-only" />
                  {opt.label}
                </label>
              ))}
            </div>
            {deliveryMethod === 'entrega' && (
              <div className="mt-3">
                <label htmlFor="k-end" className="block text-sm font-medium text-gray-700 mb-1">Endereço (ou bairro e cidade) *</label>
                <input
                  id="k-end" type="text" maxLength={300} placeholder="Rua, número, bairro e cidade"
                  value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
                {settings.deliveryNote && <p className="text-xs text-gray-400 mt-1">{settings.deliveryNote}</p>}
              </div>
            )}
          </fieldset>}

          {settings.notesEnabled && <div>
            <label htmlFor="k-obs" className="block text-sm font-medium text-gray-700 mb-1">
              Observações <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="k-obs" rows={3} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ex: cor preferida, prazo desejado..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{notes.length}/500</p>
          </div>}

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-2">
            <div className="flex justify-between text-gray-600"><span>Itens:</span><span>{cart.length} produto(s)</span></div>
            {!settings.hidePrices && <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total:</span>
              <span>{brl(total)}</span>
            </div>}
          </div>

          <p className="text-xs text-gray-500">
            Usamos seus dados apenas para atender este pedido.{' '}
            <Link to="/privacidade" onClick={handleClose} className="text-blue-600 hover:underline">Política de privacidade</Link>
          </p>

          <div className="mt-auto pt-2 flex gap-3">
            <button type="button" onClick={() => setStep('cart')} className="px-4 py-3 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">
              Voltar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Finalizar Pedido'}
            </button>
          </div>
        </form>
      )}

      {step === 'success' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{settings.orderDoneTitle}</h3>
          <p className="text-sm text-gray-600 mb-6">{settings.orderDoneText}</p>
          {settings.whatsapp && lastOrder && (
            <a
              href={whatsappLink(settings.whatsapp, buildOrderMessage({ ...lastOrder, intro: settings.orderMessageIntro }))}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm mb-3"
            >
              <MessageSquare className="w-4 h-4" /> {settings.whatsappButton}
            </a>
          )}
          <button onClick={handleClose} className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
            Concluir
          </button>
        </div>
      )}
    </Dialog>
  );
}
