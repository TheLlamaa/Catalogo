import ImageGuideText from '../../components/ImageGuideText';
import { makeT } from '../../lib/texts';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Trash2, Upload, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button, inputClass, whatsappButtonClass } from '../../components/ui';
import { useUI } from '../../components/UIContext';
import { useSettings } from '../../components/SettingsContext';
import { formatPhoneBR, whatsappLink, fillName } from '../../lib/format';
import { validateCustomRequest } from '../../lib/checkout';
import { IMAGE_PRESETS } from '../../lib/images';
import { resizeToDataUrl } from '../../lib/imageResize';

interface CustomFormData { clientName: string; clientPhone: string; description: string; imageUrl: string; website: string }

interface CustomRequestViewProps {
  onSaveOrder: (order: Record<string, unknown>) => Promise<boolean>;
}

const EMPTY_FORM: CustomFormData = { clientName: '', clientPhone: '', description: '', imageUrl: '', website: '' };

export default function CustomRequestView({ onSaveOrder }: CustomRequestViewProps) {
  const settings = useSettings();
  const t = makeT(settings);
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
      const compressed = await resizeToDataUrl(file, IMAGE_PRESETS.reference);
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
    const check = validateCustomRequest({ name: formData.clientName, phone: formData.clientPhone, description: formData.description, trap: formData.website }, settings);
    if (!check.ok) {
      if ('bot' in check) { setSentSuccess(true); return; } // campo-isca preenchido: é robô
      return toast.error(check.error);
    }

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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('tCustomSent')}</h2>
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
          <Button variant="soft" size="lg" onClick={() => { setSentSuccess(false); setFormData(EMPTY_FORM); }}>{t('tCustomAnother')}</Button>
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>{t('tBackToStore')}</Button>
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
            <label htmlFor="c-nome" className="block text-sm font-medium text-gray-700 mb-1">{t('tYourName')} *</label>
            <input
              id="c-nome" required type="text" placeholder={t('tCustomNamePlaceholder')} maxLength={100}
              value={formData.clientName} onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="c-whats" className="block text-sm font-medium text-gray-700 mb-1">{t('tYourWhatsapp')} *</label>
            <input
              id="c-whats" required type="text" placeholder="(11) 99999-9999" inputMode="tel" maxLength={15}
              value={formData.clientPhone} onChange={e => setFormData(p => ({ ...p, clientPhone: formatPhoneBR(e.target.value) }))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">{t('tCustomPhotoLabel')}</span>
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
                  <span className="text-sm font-medium text-gray-700">{t('tCustomPhotoCta')}</span>
                  <span className="text-xs text-gray-500 mt-1">{t('tCustomPhotoFormats')}</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isCompressing} className="sr-only" />
            </label>
          )}
          <ImageGuideText guide="reference" className="mt-2" />
        </div>

        <div>
          <label htmlFor="c-desc" className="block text-sm font-medium text-gray-700 mb-1">{t('tCustomDescLabel')} *</label>
          <textarea
            id="c-desc" required rows={4} maxLength={2000}
            placeholder={t('tCustomDescPlaceholder')}
            value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            className={inputClass}
          />
        </div>

        <p className="text-xs text-gray-500">
          {t('tCustomPrivacyNote')}{' '}
          <Link to="/privacidade" className="text-blue-700 underline">{t('tFooterPrivacy')}</Link>
        </p>

        <Button type="submit" variant="primary" size="lg" className="w-full font-semibold" disabled={isSubmitting || settings.ordersPaused} aria-busy={isSubmitting}>
          {isSubmitting ? (
            <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" /><span className="sr-only">{t('tCustomSending')}</span></>
          ) : (
            <><Send className="w-5 h-5" aria-hidden="true" /> {t('tCustomSubmit')}</>
          )}
        </Button>
      </form>
    </div>
  );
}
