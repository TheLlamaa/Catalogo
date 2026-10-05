import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useSettings } from '../../components/SettingsContext';
import RichText from '../../components/RichText';

// Página extra criada no painel (Site > Menus e páginas), em /p/:slug
export default function PageView() {
  const settings = useSettings();
  const { slug } = useParams();
  const page = settings.pages.find(p => p.slug === slug && p.published);
  const title = page?.title;

  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} | ${settings.storeName}`;
    return () => { document.title = previous; };
  }, [title, settings.storeName]);

  if (!page) return <Navigate to="/" replace />;
  return (
    <article className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8">
      <Link to="/" className="mb-6 text-sm font-medium text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar para Loja
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{page.title}</h1>
      <RichText text={page.text} />
    </article>
  );
}
