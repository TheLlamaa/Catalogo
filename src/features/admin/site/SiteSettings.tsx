import { useState, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  RotateCcw, Clock, Upload, Trash2, ArrowUp, ArrowDown, Plus, Undo2, Image as ImageIcon,
  Palette, Eye, Search, Megaphone, Link2, Store, Menu, LayoutGrid, LayoutTemplate, Sparkles, FileText, CircleHelp, ToggleRight, Package, Share2, Info, Type, PanelBottom
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUI } from '../../../components/UIContext';
import { Switch, PageHeader, Button, inputClass } from '../../../components/ui';
import { GROUPS, SETTINGS_SCHEMA, DEFAULT_SETTINGS } from '../../../lib/settings';
import type { ColorField as ColorFieldDef, Settings, SettingField, SettingsSection } from '../../../lib/settings';
import { MAX_TOP, MAX_FOOT } from '../../../lib/menus';
import ImageGuideText from '../../../components/ImageGuideText';
import { IMAGE_GUIDES, type ImageGuideKey } from '../../../lib/imageGuides';
import { PagesEditor, MenuEditor } from './MenusAndPages';
import type { Category, Product } from '../../../types';
import { THEME_PRESETS, FONT_CHOICES, BG_TONES, CARD_STYLES, setThemeDraft, isBannerActive, isHex, normalizeHex, isTooLight, DEFAULT_PRIMARY, DEFAULT_BADGE_BG, MAX_FAQ } from '../../../lib/theme';
import { uploadSiteImage } from '../../../services/storage';
import { formatPhoneBR } from '../../../lib/format';
import { friendlyError } from '../../../lib/errorMessage';
import { defaultForm, diffSettings, draftRows, formFrom, toForm, toStored, validateSettingsForm } from '../../../lib/settingsWrite';
import type { FaqDraft, FormValues, SettingChanges } from '../../../lib/settingsWrite';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import VitrinePreview from './VitrinePreview';

// Ícone de cada seção do painel (só visual, ajuda a achar o bloco certo)
const SECTION_ICONS: Record<string, LucideIcon> = {
  'Cores e fonte': Palette, 'Estilo dos cards': LayoutGrid, 'Modelo da página inicial': LayoutTemplate, 'Capa da vitrine': ImageIcon, 'Páginas': FileText, 'Menu do topo': Menu, 'Links do rodapé': Link2, 'Política de privacidade': FileText, 'Carrinho e pedido': FileText, 'Google e compartilhamento': Search, 'Pedidos': ToggleRight, 'Exibição da vitrine': LayoutGrid, 'Logo': ImageIcon, 'Faixa de aviso no topo': Megaphone,
  'Identidade e contato': Store, 'Nomes dos botões do menu': Type, 'Página inicial (vitrine)': LayoutGrid,
  'Card de destaque (peça personalizada)': Sparkles, 'Página de peça personalizada': FileText,
  'Página "Sobre / Como funciona"': Info, 'Perguntas frequentes': CircleHelp,
  'Seções no topo da vitrine': LayoutGrid, 'Janela do produto': Package, 'Recursos da loja': ToggleRight, 'Redes sociais': Share2, 'Rodapé': PanelBottom
};

// Sem acento e em minúsculas, para a busca achar "voce" em "Você"
const normalizeText = (v: string): string => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const fieldMatches = (f: SettingField, q: string): boolean => {
  const optionText = f.type === 'select' ? f.options.map(o => o.label).join(' ') : '';
  return normalizeText(`${f.label} ${f.hint || ''} ${optionText}`).includes(q);
};

const inputCls = inputClass;

// Texto de um valor do formulário (interruptores não têm texto)
const str = (v: string | boolean | undefined): string => (typeof v === 'string' ? v : '');

interface SiteSettingsProps {
  settings: Settings;
  onSave: (changes: SettingChanges, successMessage?: string) => Promise<boolean>;
  onUndo: () => unknown;
  categories: Category[];
  products: Product[];
  group: string; // grupo escolhido no menu do painel
  onGroupChange: (group: string) => void;
  onDirtyChange?: (dirty: boolean) => void; // o painel avisa antes de sair com alterações não publicadas
  onShowProducts?: (filter: string) => void; // atalho para a lista de produtos já filtrada
}

export default function SiteSettings({ settings, categories, products, group, onGroupChange, onDirtyChange, onShowProducts, onSave, onUndo }: SiteSettingsProps) {
  const { toast, confirm } = useUI();
  const [form, setForm] = useState<FormValues>(() => formFrom(settings));
  const [base, setBase] = useState(form);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const docked = useMediaQuery('(min-width: 1280px)');

  const dirty = Object.keys(DEFAULT_SETTINGS).some(k => toStored(k, form[k]) !== toStored(k, base[k]));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // Depois de salvar ou desfazer, o painel acompanha o que está publicado (se não há edição pendente)
  useEffect(() => {
    if (dirtyRef.current) return;
    const fresh = formFrom(settings);
    setForm(fresh); setBase(fresh);
  }, [settings]);

  // Prévia ao vivo de cor, fonte e logo no próprio painel (rascunho tem prioridade sobre o publicado,
  // mesmo quando os dados recarregam sozinhos); ao sair, volta ao que está publicado
  useEffect(() => {
    setThemeDraft({ primaryColor: str(form.primaryColor), fontChoice: str(form.fontChoice), logoUrl: str(form.logoUrl), faviconUrl: str(form.faviconUrl), bgTone: str(form.bgTone), cardStyle: str(form.cardStyle) });
  }, [form.primaryColor, form.fontChoice, form.logoUrl, form.faviconUrl, form.bgTone, form.cardStyle]);
  useEffect(() => () => setThemeDraft(null), []);

  // Avisa ao fechar a aba com alterações não publicadas
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key: string, value: string | boolean) => setForm(p => ({ ...p, [key]: value }));

  // Rascunho no formato da tabela site_settings, para a prévia ao vivo da vitrine
  const draft = useMemo(() => draftRows(form), [form]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const problem = validateSettingsForm(form);
    if (problem) return toast.error(problem);

    // Só vai para o banco o que mudou; o que voltou ao padrão é apagado
    const changes = diffSettings(form, base);
    if (!Object.keys(changes).length) return toast.info('Nenhuma alteração para publicar.');
    setSaving(true);
    const ok = await onSave(changes, 'Alterações publicadas.');
    setSaving(false);
    if (ok) setBase(form);
  };

  const discard = async () => {
    if (!(await confirm({ title: 'Descartar alterações?', message: 'O que você mudou aqui e ainda não publicou volta a como está no site.', confirmLabel: 'Descartar' }))) return;
    setForm(base);
  };

  const resetField = (key: string) => set(key, toForm(key, DEFAULT_SETTINGS[key]));
  const resetSection = (section: SettingsSection) => setForm(p => ({ ...p, ...Object.fromEntries(section.fields.map(f => [f.key, toForm(f.key, DEFAULT_SETTINGS[f.key])])) }));
  const resetAll = async () => {
    if (!(await confirm({ title: 'Voltar tudo ao padrão?', message: 'Todos os textos, cores e opções do site voltam ao original. Nada muda para os clientes até você clicar em Publicar alterações.', confirmLabel: 'Voltar ao padrão' }))) return;
    setForm(defaultForm());
  };

  const handleUndo = async () => {
    if (dirty && !(await confirm({ title: 'Desfazer a última publicação?', message: 'O site volta a como estava antes da última publicação, e o que você mudou aqui sem publicar será descartado.', confirmLabel: 'Desfazer publicação' }))) return;
    setBase(form); dirtyRef.current = false;
    await onUndo();
  };

  const q = normalizeText(query);
  const searching = q.length > 0;
  const groupLabel = (id: string) => GROUPS.find(g => g.id === id)?.label || '';
  const sections: SettingsSection[] = searching
    ? SETTINGS_SCHEMA.map(s => {
        const sectionHit = normalizeText(`${s.title} ${groupLabel(s.group)}`).includes(q);
        return { ...s, fields: sectionHit ? s.fields : s.fields.filter(f => fieldMatches(f, q)) };
      }).filter(s => s.fields.length > 0)
    : (GROUPS.find(g => g.id === group)?.sections || []).map(t => SETTINGS_SCHEMA.find(s => s.title === t)).filter((s): s is SettingsSection => !!s);
  const current = GROUPS.find(g => g.id === group) || GROUPS[0];
  const count = (section: string) => products.filter(p => p.section === section).length;
  const resultCount = sections.reduce((n, s) => n + (s.group === 'menus' ? 1 : s.fields.length), 0);

  const showDocked = previewOpen && docked;
  return (
    <div className={showDocked ? 'grid grid-cols-[minmax(0,1fr)_400px] gap-6 items-start' : ''}>
    <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
      <PageHeader
        title={searching ? 'Buscar configuração' : current.label}
        description={searching ? 'Resultados de todas as áreas do site.' : current.description}
        actions={<Button icon={Eye} onClick={() => setPreviewOpen(o => !o)} aria-pressed={previewOpen}>{previewOpen ? 'Fechar prévia' : 'Prévia ao vivo'}</Button>}
      />
      <p className="text-xs text-gray-500 -mt-3">Os clientes só veem as mudanças depois de <strong>Publicar alterações</strong>. Use a <strong>Prévia ao vivo</strong> para ver a vitrine com o que você está mudando.</p>

      {settings.backup && (
        <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
          <span className="text-gray-600">Última publicação: {new Date(settings.backup.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
          <button type="button" onClick={handleUndo} className="flex items-center gap-1.5 text-blue-700 font-medium hover:underline"><Undo2 className="w-4 h-4" /> Desfazer</button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" aria-hidden="true" />
        <input
          type="search" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setQuery(''); } }}
          placeholder="Buscar configuração… ex: cor, WhatsApp, frete, selo" aria-label="Buscar configurações"
          className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {searching && (
        <div className="flex items-center justify-between gap-3 text-sm text-gray-600" role="status">
          <span>{resultCount === 0 ? `Nenhuma configuração encontrada para “${query.trim()}”.` : `${resultCount} ${resultCount === 1 ? 'configuração encontrada' : 'configurações encontradas'} em todas as abas.`}</span>
          <button type="button" onClick={() => setQuery('')} className="text-blue-700 font-medium hover:underline whitespace-nowrap">Limpar busca</button>
        </div>
      )}


      {!searching && group === 'aparencia' && (
        <fieldset className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
          <legend className="sr-only">Temas prontos</legend>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Temas prontos</h2>
          <p className="text-xs text-gray-500 mb-3">Preenche cor, fonte, fundo e cantos de uma vez. Dá para ajustar depois; nada vai ao ar até publicar.</p>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map(t => (
              <button
                key={t.id} type="button" onClick={() => setForm(p => ({ ...p, ...t.values }))}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ backgroundColor: t.values.primaryColor || DEFAULT_PRIMARY }} aria-hidden="true" />
                {t.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {sections.map(section => {
        const Icon = SECTION_ICONS[section.title] || Type;
        return (
          <fieldset key={section.title} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <legend className="sr-only">{section.title}</legend>
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
              <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600" aria-hidden="true"><Icon className="w-4 h-4" /></span>
                {section.title}
                {searching && (
                  <button type="button" onClick={() => { onGroupChange(section.group); setQuery(''); }} className="text-xs font-normal text-blue-700 underline py-1">
                    em {groupLabel(section.group)}
                  </button>
                )}
              </h2>
              {!searching && <button type="button" onClick={() => resetSection(section)} className="text-xs font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 whitespace-nowrap py-2 -my-2"><RotateCcw className="w-3 h-3" /> Restaurar seção</button>}
            </div>
            <div className="p-5 space-y-5">
              {section.title === 'Páginas' && <PagesEditor form={form} set={set} />}
              {section.title === 'Menu do topo' && <MenuEditor value={str(form.menuTop)} onChange={v => set('menuTop', v)} withBuiltins max={MAX_TOP} form={form} categories={categories} setFlag={set} />}
              {section.title === 'Links do rodapé' && <MenuEditor value={str(form.menuFoot)} onChange={v => set('menuFoot', v)} withBuiltins={false} max={MAX_FOOT} form={form} categories={categories} setFlag={set} />}
              {section.fields.filter(f => f.type !== 'page' && f.type !== 'menu').map(f => (
                <Field key={f.key} f={f} form={form} set={set} resetField={resetField} />
              ))}
              {section.title === 'Faixa de aviso no topo' && <BannerPreview form={form} />}
              {section.title === 'Seções no topo da vitrine' && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900 space-y-2">
                  <p><strong>Quais produtos aparecem?</strong> Você escolhe na lista de Produtos (estrela ★ Destaque) ou no cadastro do produto, em “Onde aparece na vitrine”. Novidades entram sozinhas: produtos dos últimos 30 dias.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => onShowProducts?.('destaque')}>Ver Destaques ({count('destaque')})</Button>
                    <Button size="sm" onClick={() => onShowProducts?.('popular')}>Ver Mais pedidos ({count('popular')})</Button>
                  </div>
                </div>
              )}
            </div>
          </fieldset>
        );
      })}

      <div className="sticky bottom-0 -mx-1 px-1 py-4 bg-white/95 backdrop-blur border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button type="button" onClick={resetAll} className="text-sm text-gray-500 hover:text-red-600 py-2">Voltar tudo ao padrão</button>
          {dirty && <button type="button" onClick={discard} className="text-sm text-gray-500 hover:text-gray-800 py-2">Descartar alterações</button>}
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">Alterações não publicadas</span>}
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Ver site</a>
          <Button type="submit" variant="primary" disabled={saving || !dirty}>{saving ? 'Publicando…' : 'Publicar alterações'}</Button>
        </div>
      </div>
    </form>
    {previewOpen && <VitrinePreview rows={draft} docked={docked} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

interface FieldProps {
  f: SettingField;
  form: FormValues;
  set: (key: string, value: string | boolean) => void;
  resetField: (key: string) => void;
}

function Field({ f, form, set, resetField }: FieldProps) {
  const id = `s-${f.key}`;
  const isDefault = toStored(f.key, form[f.key]) === null;
  const resetBtn = !isDefault && (
    <button type="button" onClick={() => resetField(f.key)} className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 py-1.5 -my-1.5"><RotateCcw className="w-3 h-3" /> Padrão</button>
  );

  if (f.type === 'toggle') {
    return <Switch id={id} checked={!!form[f.key]} onChange={v => set(f.key, v)} label={f.label} hint={f.hint} />;
  }

  let control: ReactNode;
  switch (f.type) {
    case 'textarea':
      control = <textarea id={id} rows={f.rows || 3} maxLength={f.max} value={str(form[f.key])} onChange={e => set(f.key, e.target.value)} className={inputCls} />;
      break;
    case 'select':
      if (f.display) {
        control = <ChoiceGroup f={f} display={f.display} value={str(form[f.key])} onChange={v => set(f.key, v)} />;
        break;
      }
      control = (
        <select id={id} value={str(form[f.key])} onChange={e => set(f.key, e.target.value)} className={`${inputCls} bg-white`}>
          {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case 'range':
      control = (
        <div>
          <div className="flex items-center gap-4">
            <input id={id} type="range" min={f.min} max={f.max} step={f.step} value={str(form[f.key])} onChange={e => set(f.key, e.target.value)} className="flex-1 accent-blue-600" />
            <span className="w-16 text-right text-sm font-mono text-gray-700">{str(form[f.key])} {f.unit}</span>
          </div>
          {f.key === 'logoSize' && (
            <div className="mt-3 flex items-center h-[7rem] px-4 rounded-md border border-dashed border-gray-300 bg-gray-50 overflow-hidden">
              {form.logoUrl
                ? <img src={str(form.logoUrl)} alt="Prévia da logo" style={{ height: `${form.logoSize}px`, maxWidth: '100%' }} className="object-contain" />
                : <span className="text-xs text-gray-500">Envie uma logo acima para ver a prévia do tamanho.</span>}
            </div>
          )}
        </div>
      );
      break;
    case 'date':
      control = <input id={id} type="date" value={str(form[f.key])} onChange={e => set(f.key, e.target.value)} className={`${inputCls} sm:w-56`} />;
      break;
    case 'color':
      control = <ColorField id={id} f={f} value={str(form[f.key])} onChange={v => set(f.key, v)} primary={str(form.primaryColor)} />;
      break;
    case 'image':
      control = <ImageField id={id} label={f.label} guide={f.type === 'image' ? f.guide : undefined} value={str(form[f.key])} onChange={v => set(f.key, v)} />;
      break;
    case 'page':
    case 'menu':
      return null; // editados em "Menus e páginas"
    case 'faq':
      control = <FaqField value={str(form[f.key])} onChange={v => set(f.key, v)} />;
      break;
    default:
      control = (
        <input
          id={id} type={f.type === 'email' ? 'email' : 'text'} inputMode={f.type === 'phone' ? 'tel' : undefined}
          placeholder={f.type === 'social' ? '@usuario' : undefined}
          maxLength={f.type === 'phone' ? 15 : f.max} value={str(form[f.key])}
          onChange={e => set(f.key, f.type === 'phone' ? formatPhoneBR(e.target.value) : e.target.value)} className={inputCls}
        />
      );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{f.label}</label>
        {resetBtn}
      </div>
      {control}
      {f.key === 'primaryColor' && isTooLight(str(form.primaryColor).trim()) && (
        <p className="text-xs text-amber-700 mt-1">Essa cor é bem clara: o texto branco dos botões pode ficar difícil de ler.</p>
      )}
      {f.hint && <p className="text-xs text-gray-500 mt-1">{f.hint}</p>}
    </div>
  );
}

function ColorField({ id, f, value, onChange, primary }: { id: string; f: ColorFieldDef; value: string; onChange: (v: string) => void; primary: string }) {
  const fallback = f.key === 'badgeColor' ? DEFAULT_BADGE_BG : f.key === 'bannerColor' && isHex(primary) ? primary : DEFAULT_PRIMARY;
  const shown = isHex(value.trim()) ? value.trim() : fallback;
  return (
    <div className="flex items-center gap-3">
      <input id={id} type="color" value={shown} onChange={e => onChange(e.target.value)} aria-label={f.label} className="h-10 w-14 rounded border border-gray-300 bg-white p-1 cursor-pointer" />
      <input type="text" value={value} placeholder={`Padrão (${fallback})`} maxLength={7} onChange={e => onChange(e.target.value)} onBlur={e => { const n = normalizeHex(e.target.value); if (n !== e.target.value) onChange(n); }} aria-label={`${f.label} (código)`} className={`${inputCls} sm:w-48 font-mono`} />
    </div>
  );
}

function ImageField({ id, label, guide, value, onChange }: { id: string; label: string; guide?: ImageGuideKey; value: string; onChange: (v: string) => void }) {
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

// Escolha com exemplo visual: cada opção mostra como ela fica (colunas, cantos, fonte, fundo ou ordem)
function ChoicePreview({ display, value }: { display: NonNullable<Extract<SettingField, { type: 'select' }>['display']>; value: string }) {
  if (display === 'columns') return <ColumnsIcon n={Number(value)} />;
  if (display === 'layout') return <LayoutIcon id={value} />;
  if (display === 'corners') {
    const radius = CARD_STYLES.find(c => c.id === value)?.radius || '0.75rem';
    return (
      <div className="w-14 h-12 border border-gray-300 bg-white p-1.5 flex flex-col gap-1" style={{ borderRadius: radius }} aria-hidden="true">
        <div className="flex-1 bg-gray-200" style={{ borderRadius: `calc(${radius} / 2)` }} />
        <div className="h-1.5 w-8 bg-gray-300 rounded-sm" />
      </div>
    );
  }
  if (display === 'font') {
    const stack = FONT_CHOICES.find(f => f.id === value)?.stack;
    return <span style={{ fontFamily: stack }} className="text-3xl leading-none text-gray-800" aria-hidden="true">Aa</span>;
  }
  if (display === 'tone') {
    const hex = BG_TONES.find(t => t.id === value)?.hex || '#ffffff';
    return <div className="w-14 h-10 rounded-md border border-gray-300" style={{ backgroundColor: hex }} aria-hidden="true" />;
  }
  const SortIcon = value === 'price_asc' ? ArrowUp : value === 'price_desc' ? ArrowDown : Clock;
  return <SortIcon className="w-7 h-7" aria-hidden="true" />;
}

function ChoiceGroup({ f, display, value, onChange }: { f: Extract<SettingField, { type: 'select' }>; display: NonNullable<Extract<SettingField, { type: 'select' }>['display']>; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={f.label} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {f.options.map(o => {
        const on = value === o.value;
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} aria-label={o.label} title={o.label}
            onClick={() => onChange(o.value)}
            className={`flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-lg border text-xs font-medium text-center transition-colors min-h-[5.5rem] ${on ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <ChoicePreview display={display} value={o.value} />
            <span>{display === 'columns' ? o.value : o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Miniatura de cada modelo da página inicial
function LayoutIcon({ id }: { id: string }) {
  const block = 'fill-gray-300', accent = 'fill-blue-500', soft = 'fill-blue-100';
  return (
    <svg width="64" height="44" viewBox="0 0 64 44" aria-hidden="true" className="rounded border border-gray-300 bg-white">
      {id === 'vitrine' ? (
        <>
          <rect x="5" y="7" width="20" height="3" rx="1" className="fill-gray-500" /><rect x="5" y="12" width="16" height="3" rx="1" className="fill-gray-500" />
          <rect x="5" y="18" width="10" height="3" rx="1.5" className={accent} />
          <rect x="29" y="4" width="17" height="21" rx="1.5" className={block} /><rect x="48" y="4" width="11" height="10" rx="1.5" className={block} /><rect x="48" y="15" width="11" height="10" rx="1.5" className={block} />
          {[5, 19, 33, 47].map(x => <rect key={x} x={x} y="30" width="12" height="10" rx="1.5" className={block} />)}
        </>
      ) : id === 'mista' ? (
        <>
          <rect x="4" y="4" width="56" height="15" rx="1.5" className={soft} />
          {[11, 18, 25, 32, 39, 46, 53].map(x => <line key={x} x1={x} y1="4" x2={x} y2="19" className="stroke-blue-200" strokeWidth="0.6" />)}
          <rect x="22" y="7" width="20" height="2.5" rx="1" className="fill-gray-500" /><rect x="20" y="12" width="24" height="3.5" rx="1.75" className="fill-white stroke-gray-300" strokeWidth="0.6" />
          <rect x="4" y="22" width="56" height="5" rx="1" className="fill-white stroke-gray-300" strokeWidth="0.6" />
          {[8, 24, 40].map(x => <circle key={x} cx={x} cy="24.5" r="1.2" className={accent} />)}
          <rect x="4" y="29.5" width="6" height="1.2" rx="0.6" className="fill-gray-500" /><rect x="12" y="29.5" width="6" height="1.2" rx="0.6" className={block} />
          {[4, 18.5, 33, 47.5].map(x => <rect key={x} x={x} y="32" width="12.5" height="9" rx="1.5" className={block} />)}
        </>
      ) : id === 'bancada' ? (
        <>
          <rect x="4" y="4" width="56" height="20" rx="1.5" className={soft} />
          {[11, 18, 25, 32, 39, 46, 53].map(x => <line key={x} x1={x} y1="4" x2={x} y2="24" className="stroke-blue-200" strokeWidth="0.6" />)}
          <rect x="20" y="9" width="24" height="3" rx="1" className="fill-gray-500" /><rect x="18" y="15" width="28" height="4" rx="2" className="fill-white stroke-gray-300" strokeWidth="0.6" />
          {[4, 18.5, 33, 47.5].map(x => <rect key={x} x={x} y="28" width="12.5" height="12" rx="1.5" className={block} />)}
        </>
      ) : (
        <>
          <rect x="4" y="4" width="12" height="2.5" rx="1" className={accent} />
          {[9, 13, 17, 21].map(y => <rect key={y} x="4" y={y} width="10" height="2" rx="1" className={block} />)}
          {[20, 34, 48].map(x => <rect key={x} x={x} y="4" width="12" height="17" rx="1.5" className={block} />)}
          {[20, 34, 48].map(x => <rect key={x} x={x} y="23" width="12" height="17" rx="1.5" className={block} />)}
        </>
      )}
    </svg>
  );
}

// Miniatura com n colunas de cards, para escolher quantos produtos por linha
function ColumnsIcon({ n }: { n: number }) {
  const gap = 2, w = 40, h = 24;
  const cw = (w - gap * (n - 1)) / n;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" fill="currentColor">
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={i * (cw + gap)} y={0} width={cw} height={11} rx={1.5} opacity={0.85} />
          <rect x={i * (cw + gap)} y={13} width={cw} height={11} rx={1.5} opacity={0.45} />
        </g>
      ))}
    </svg>
  );
}

function FaqField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let items: FaqDraft[] = [];
  try { const raw = JSON.parse(value || '[]'); if (Array.isArray(raw)) items = raw; } catch { items = []; }
  const save = (next: FaqDraft[]) => onChange(next.length ? JSON.stringify(next) : '');
  const update = (i: number, patch: FaqDraft) => save(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= items.length) return; const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; save(next); };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50">
          <input type="text" maxLength={200} value={it.q || ''} onChange={e => update(i, { q: e.target.value })} placeholder="Pergunta" aria-label={`Pergunta ${i + 1}`} className={inputCls} />
          <textarea rows={3} maxLength={1000} value={it.a || ''} onChange={e => update(i, { a: e.target.value })} placeholder="Resposta" aria-label={`Resposta ${i + 1}`} className={inputCls} />
          <div className="flex justify-end gap-1">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Descer" className="p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
            <button type="button" onClick={() => save(items.filter((_, idx) => idx !== i))} aria-label={`Remover pergunta ${i + 1}`} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
      {items.length < MAX_FAQ && (
        <button type="button" onClick={() => save([...items, { q: '', a: '' }])} className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"><Plus className="w-4 h-4" /> Adicionar pergunta</button>
      )}
    </div>
  );
}

function BannerPreview({ form }: { form: FormValues }) {
  if (!str(form.bannerText).trim()) {
    // Ligada mas sem texto: a faixa não aparece, e isso confundia ("liguei e não apareceu")
    return form.bannerEnabled
      ? <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">A faixa está ligada, mas sem texto ela não aparece no site. Escreva o aviso acima.</p>
      : null;
  }
  const expired = !isBannerActive({ bannerEnabled: true, bannerText: str(form.bannerText), bannerUntil: str(form.bannerUntil) });
  const bannerColor = str(form.bannerColor).trim();
  const primaryColor = str(form.primaryColor).trim();
  const bg = isHex(bannerColor) ? bannerColor : (isHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY);
  return (
    <div>
      <span className="block text-xs font-medium text-gray-500 mb-1">Prévia{!form.bannerEnabled ? ' (faixa desligada: não aparece no site)' : expired ? ' (a data “Mostrar até” já passou: não aparece no site)' : ''}</span>
      <div
        className={`text-white text-sm text-center px-4 py-2 rounded-md ${form.bannerEnabled && !expired ? '' : 'opacity-40'}`}
        style={str(form.bannerImage) ? { backgroundColor: bg, backgroundImage: `linear-gradient(${bg}b3, ${bg}b3), url(${str(form.bannerImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: bg }}
      >{form.bannerText}</div>
    </div>
  );
}
