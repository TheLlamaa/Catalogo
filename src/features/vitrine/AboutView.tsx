import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronDown, MessageCircle } from 'lucide-react';
import { useSettings } from '../../components/SettingsContext';

// Página "Sobre / Como funciona": texto, foto e perguntas frequentes editados no painel (Site > Sobre e perguntas)
export default function AboutView() {
  const settings = useSettings();
  const paragraphs = settings.aboutText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  useEffect(() => {
    const previous = document.title;
    document.title = `${settings.aboutTitle} | ${settings.storeName}`;
    return () => { document.title = previous; };
  }, [settings.aboutTitle, settings.storeName]);

  return (
    <article className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8">
      <Link to="/" className="mb-6 text-sm font-medium text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar para Loja
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{settings.aboutTitle}</h1>

      {settings.aboutImage && (
        <img src={settings.aboutImage} alt="" loading="lazy" className="w-full max-h-80 object-cover rounded-lg border border-gray-200 mb-6" />
      )}

      {paragraphs.length > 0 && (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
        </div>
      )}

      {settings.faq.length > 0 && (
        <section className="mt-10" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-lg font-semibold text-gray-900 mb-3">Perguntas frequentes</h2>
          <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {settings.faq.map((item, i) => (
              <details key={i} className="group bg-white">
                <summary className="flex items-center justify-between gap-3 cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 list-none [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {paragraphs.length === 0 && settings.faq.length === 0 && !settings.aboutImage && (
        <p className="text-sm text-gray-500">Em breve, mais informações por aqui.</p>
      )}

      {settings.whatsapp && (
        <a
          href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer"
          className="mt-10 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <MessageCircle className="w-4 h-4" /> Ainda tem dúvida? Fale no WhatsApp
        </a>
      )}
    </article>
  );
}
