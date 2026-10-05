import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useSettings } from '../../components/SettingsContext';
import { NICHE } from '../../lib/niche';

export default function PrivacyView() {
  const settings = useSettings();
  const custom = settings.privacyText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return (
    <article className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-8">
      <Link to="/" className="mb-6 text-sm font-medium text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar para Loja
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Política de privacidade</h1>

      {custom.length > 0 ? (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          {custom.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
        </div>
      ) : (
      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Quem somos</h2>
          <p>{settings.storeName} é {NICHE.about}. Este site é o nosso catálogo e o canal para receber pedidos e orçamentos.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Quais dados coletamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nome e número de WhatsApp, informados ao enviar um pedido ou uma solicitação personalizada.</li>
            <li>Observações do pedido e, se você escolher entrega, o endereço ou a região de entrega.</li>
            <li>A foto de referência, se você enviar uma na solicitação de peça personalizada.</li>
            <li>O carrinho fica salvo apenas no seu próprio navegador, para você não perdê-lo ao recarregar a página.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Para que usamos</h2>
          <p>Usamos esses dados apenas para responder ao seu pedido, combinar valores, prazo e entrega e atender você pelo WhatsApp. Não vendemos nem usamos seus dados para outras finalidades.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Com quem os dados ficam</h2>
          <p>Os dados ficam armazenados em serviços de infraestrutura que usamos para manter o site no ar: Supabase (banco de dados e arquivos) e Cloudflare (hospedagem). Eles não usam seus dados para fins próprios.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Seus direitos</h2>
          <p>Você pode pedir a qualquer momento para ver, corrigir ou apagar os dados que nos enviou. Basta entrar em contato:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {settings.whatsapp && <li>WhatsApp: <a className="text-blue-600 hover:underline" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer">clique para conversar</a></li>}
            {settings.email && <li>E-mail: <a className="text-blue-600 hover:underline" href={`mailto:${settings.email}`}>{settings.email}</a></li>}
            {!settings.whatsapp && !settings.email && <li>Pelo mesmo WhatsApp em que combinamos o seu pedido.</li>}
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Por quanto tempo guardamos</h2>
          <p>Guardamos os pedidos pelo tempo necessário para atender você e cumprir obrigações legais. Depois disso, os dados são apagados.</p>
        </section>
      </div>
      )}
    </article>
  );
}
