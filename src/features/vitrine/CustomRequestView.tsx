import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Trash2, Upload, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { inputClass, whatsappButtonClass } from '../../components/ui';
import { useUI } from '../../components/UIContext';
import { useSettings } from '../../components/SettingsContext';
import { formatPhoneBR, validateContact, whatsappLink, fillName } from '../../lib/format';

interface CustomFormData { clientName: string; clientPhone: string; description: string; imageUrl: string; website: string }

interface CustomRequestViewProps {
  onSaveOrder: (order: Record<string, unknown>) => Promise<boolean>;
}

const EMPTY_FORM: CustomFormData = { clientName: '', clientPhone: '', description: '', imageUrl: '', website: '' };

const compressImage = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 800;
      let { width, height } = img;
      if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
      else if (height > MAX) { width *= MAX / height; height = MAX; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject; img.src = reader.result as string; // readAsDataURL sempre devolve string
  };
  reader.onerror = reject; reader.readAsDataURL(file);
});

export default function CustomRequestView({ onSaveOrder }: CustomRequestViewProps) {
  const settings = useSettings();
  const { toast } = useUI();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CustomFormData>(EMPTY_FORM);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sentName, setSentName] = useState('');

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, imageUrl: compressed }));
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível ler essa imagem. Tente outra foto.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (settings.ordersPaused) return toast.error(settings.pausedMessage);
    if (!formData.clientName || !formData.clientPhone || !formData.description) {
      return toast.error('Preencha nome, WhatsApp e a descrição do pedido.');
    }
    const contactError = validateContact(formData.clientName, formData.clientPhone);
    if (contactError) return toast.error(contactError);
    if (formData.description.length > 2000) return toast.error('A descrição pode ter no máximo 2000 caracteres.');
    if (formData.website) { setSentSuccess(true); return; } // campo-isca preenchido: é robô

    setIsSubmitting(true);
    const success = await onSaveOrder({
      client_name: formData.clientName.trim(),
      client_phone: formData.clientPhone,
      description: formData.description.trim(),
      image_url: formData.imageUrl
    });
    setIsSubmitting(false);

    if (success) {
      setSentName(formData.clientName.trim());
      setSentSuccess(true);
    }
  };

  if (sentSuccess) {
    const whatsappText = fillName(settings.customMessage, sentName);
    return (
      <div className="max-w-xl mx-auto py-12 px-6 bg-white border border-gray-200 rounded-xl text-center shadow-sm">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitação enviada!</h2>
        <p className="text-gray-600 text-sm mb-6">{settings.customSuccess}</p>

        {settings.whatsapp && (
          <a
            href={whatsappLink(settings.whatsapp, whatsappText)}
            target="_blank" rel="noreferrer"
            className={whatsappButtonClass}
          >
            <MessageSquare className="w-4 h-4" /> {settings.whatsappButton}
          </a>
        )}

        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => { setSentSuccess(false); setFormData(EMPTY_FORM); }}
            className="px-6 py-2.5 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors"
          >
            Enviar Outra Solicitação
          </button>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Voltar para a loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-yellow-300" />
          <h1 className="text-2xl font-bold">{settings.customTitle}</h1>
        </div>
        <p className="text-blue-100 text-sm">{settings.customIntro}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6 relative">
        {settings.ordersPaused && <p role="status" className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3">{settings.pausedMessage}</p>}
        {/* Campo-isca: invisível para pessoas, robôs costumam preenchê-lo */}
        <input
          type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
          value={formData.website} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))}
          className="absolute -left-[9999px] w-px h-px opacity-0"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="c-nome" className="block text-sm font-medium text-gray-700 mb-1">Seu nome *</label>
            <input
              id="c-nome" required type="text" placeholder="Ex: Maria Silva" maxLength={100}
              value={formData.clientName} onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="c-whats" className="block text-sm font-medium text-gray-700 mb-1">Seu WhatsApp *</label>
            <input
              id="c-whats" required type="text" placeholder="(11) 99999-9999" inputMode="tel" maxLength={15}
              value={formData.clientPhone} onChange={e => setFormData(p => ({ ...p, clientPhone: formatPhoneBR(e.target.value) }))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Foto ou Referência do Modelo</span>
          {formData.imageUrl ? (
            <div className="relative w-32 h-32 border border-gray-200 rounded-lg overflow-hidden group">
              <img src={formData.imageUrl} alt="Referência enviada" className="w-full h-full object-cover" />
              <button
                type="button"
                aria-label="Remover imagem"
                onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))}
                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${isCompressing ? 'opacity-50 pointer-events-none' : ''}`}>
              {isCompressing ? (
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-500 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Clique para enviar uma foto ou desenho</span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG ou JPEG</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isCompressing} className="sr-only" />
            </label>
          )}
        </div>

        <div>
          <label htmlFor="c-desc" className="block text-sm font-medium text-gray-700 mb-1">Observações e detalhes da peça *</label>
          <textarea
            id="c-desc" required rows={4} maxLength={2000}
            placeholder="Descreva o tamanho desejado, cor, utilização da peça ou qualquer detalhe importante..."
            value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            className={inputClass}
          />
        </div>

        <p className="text-xs text-gray-500">
          Usamos seu nome, WhatsApp e a foto apenas para responder a este pedido.{' '}
          <Link to="/privacidade" className="text-blue-700 underline">Política de privacidade</Link>
        </p>

        <button
          type="submit"
          disabled={isSubmitting || settings.ordersPaused}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <><Send className="w-5 h-5" /> Enviar solicitação de Orçamento</>
          )}
        </button>
      </form>
    </div>
  );
}
