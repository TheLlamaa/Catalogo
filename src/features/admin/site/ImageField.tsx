import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useUI } from '../../../components/UIContext';
import ImageGuideText from '../../../components/ImageGuideText';
import { IMAGE_GUIDES, type ImageGuideKey } from '../../../lib/imageGuides';
import { uploadSiteImage } from '../../../services/storage';
import { friendlyError } from '../../../lib/errorMessage';

// Envio de imagem do site (logo, capa, faixa, blocos): reduz, guarda no Storage e devolve o endereço
export function ImageField({ id, label, guide, value, onChange }: { id: string; label: string; guide?: ImageGuideKey; value: string; onChange: (v: string) => void }) {
  const { toast } = useUI();
  const [busy, setBusy] = useState(false);
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Escolha um arquivo de imagem.');
    setBusy(true);
    try { onChange(await uploadSiteImage(file, guide ? IMAGE_GUIDES[guide].maxPx : undefined)); }
    catch (err) { console.error(err); toast.error(`A imagem não foi enviada. ${friendlyError(err)}`); }
    setBusy(false);
  };
  return (
    <div>
    <div className="flex items-center gap-4">
      <div className="h-16 w-24 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
        {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="w-5 h-5 text-gray-500" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <label htmlFor={id} className={`px-3 py-2 border border-gray-300 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 flex items-center gap-1.5 ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="w-4 h-4" /> {busy ? 'Enviando…' : value ? 'Trocar' : 'Enviar imagem'}
        </label>
        <input id={id} type="file" accept="image/*" onChange={pick} className="sr-only" aria-label={label} />
        {value && <button type="button" onClick={() => onChange('')} className="px-3 py-2 text-sm text-gray-500 hover:text-red-600 flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Remover</button>}
      </div>
    </div>
    {guide && <ImageGuideText guide={guide} className="mt-2" />}
    </div>
  );
}
