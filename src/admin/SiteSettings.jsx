import { useState, useEffect, useRef } from 'react';
import {
  RotateCcw, Upload, Trash2, ArrowUp, ArrowDown, Plus, Undo2, Image as ImageIcon,
  Palette, Megaphone, Store, Menu, LayoutGrid, Sparkles, FileText, CircleHelp, ToggleRight, Package, Share2, Info, Type, PanelBottom
} from 'lucide-react';
import { useUI } from '../components/UIContext';
import { GROUPS, SETTINGS_SCHEMA, SETTING_FIELDS, DEFAULT_SETTINGS, isValidWhatsapp, normalizeWhatsapp } from '../lib/settings';
import { applyTheme, isHex, isTooLight, DEFAULT_PRIMARY, normalizeSocial, parseFaq, MAX_FAQ } from '../lib/theme';
import { uploadSiteImage } from '../services/storage';
import { formatPhoneBR } from '../lib/format';

// Ícone de cada seção do painel (só visual, ajuda a achar o bloco certo)
const SECTION_ICONS = {
  'Cores e fonte': Palette, 'Logo': ImageIcon, 'Faixa de aviso no topo': Megaphone,
  'Identidade e contato': Store, 'Menu': Menu, 'Página inicial (vitrine)': LayoutGrid,
  'Card de destaque (peça personalizada)': Sparkles, 'Página de peça personalizada': FileText,
  'Página "Sobre / Como funciona"': Info, 'Perguntas frequentes': CircleHelp,
  'Seções no topo da vitrine': LayoutGrid, 'Produtos': Package, 'Recursos da loja': ToggleRight, 'Redes sociais': Share2, 'Rodapé': PanelBottom
};

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DB_VALUE_MAX = 5000;

// WhatsApp mostrado com máscara (guardado só com dígitos)
const toForm = (key, value) => (key === 'whatsapp' ? formatPhoneBR(value) : value);
const formFrom = (settings) => Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(k => [k, toForm(k, settings[k])]));

// Valor que iria para o banco (null = volta ao padrão, nada guardado)
const toStored = (key, value) => {
  const def = DEFAULT_SETTINGS[key];
  if (typeof def === 'boolean') return value === def ? null : String(value);
  let v = String(value ?? '').trim();
  if (key === 'whatsapp') v = v ? normalizeWhatsapp(v) : '';
  else if (key.startsWith('social')) v = normalizeSocial(key, v) || v;
  else if (key === 'primaryColor' || key === 'bannerColor') v = v.toLowerCase();
  else if (key === 'faqItems') { const items = parseFaq(v); v = items.length ? JSON.stringify(items) : ''; }
  return !v || v === def ? null : v;
};

export default function SiteSettings({ settings, onSave, onUndo }) {
  const { toast, confirm } = useUI();
  const [form, setForm] = useState(() => formFrom(settings));
  const [base, setBase] = useState(form);
  const [group, setGroup] = useState(GROUPS[0].id);
  const [saving, setSaving] = useState(false);

  const dirty = Object.keys(DEFAULT_SETTINGS).some(k => toStored(k, form[k]) !== toStored(k, base[k]));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Depois de salvar ou desfazer, o painel acompanha o que está publicado (se não há edição pendente)
  useEffect(() => {
    if (dirtyRef.current) return;
    const fresh = formFrom(settings);
    setForm(fresh); setBase(fresh);
  }, [settings]);

  // Prévia ao vivo de cor, fonte e logo; ao sair, volta ao que está publicado
  useEffect(() => {
    applyTheme({ primaryColor: form.primaryColor, fontChoice: form.fontChoice, logoUrl: form.logoUrl });
  }, [form.primaryColor, form.fontChoice, form.logoUrl]);
  const publishedRef = useRef(settings);
  publishedRef.current = settings;
  useEffect(() => () => applyTheme(publishedRef.current), []);

  // Avisa ao fechar a aba com alterações não publicadas
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const validate = () => {
    if (form.whatsapp.trim() && !isValidWhatsapp(form.whatsapp)) return 'WhatsApp inválido. Use DDD + número, ex: (48) 99999-9999';
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) return 'E-mail inválido.';
    if (!form.storeName.trim()) return 'O nome da loja não pode ficar vazio.';
    for (const k of ['primaryColor', 'bannerColor']) {
      if (form[k].trim() && !isHex(form[k].trim())) return 'Cor inválida. Use o seletor de cor ou o formato #1a2b3c.';
    }
    for (const f of SETTING_FIELDS.filter(x => x.type === 'social')) {
      if (form[f.key].trim() && !normalizeSocial(f.key, form[f.key])) return `${f.label}: use @usuario ou um link começando com https://`;
    }
    try {
      const raw = JSON.parse(form.faqItems || '[]');
      if (raw.some(i => (i.q || '').trim() !== '' && (i.a || '').trim() === '')) return 'Toda pergunta precisa de uma resposta.';
      if (raw.some(i => (i.a || '').trim() !== '' && (i.q || '').trim() === '')) return 'Toda resposta precisa de uma pergunta.';
    } catch { /* texto vazio */ }
    if ((toStored('faqItems', form.faqItems) || '').length > DB_VALUE_MAX) return 'As perguntas frequentes ficaram grandes demais. Encurte algumas respostas.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return toast.error(problem);

    // Só vai para o banco o que mudou; o que voltou ao padrão é apagado
    const changes = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const next = toStored(key, form[key]);
      if (next !== toStored(key, base[key])) changes[key] = next;
    }
    if (!Object.keys(changes).length) return toast.info('Nenhuma alteração para publicar.');
    setSaving(true);
    const ok = await onSave(changes, 'Alterações publicadas.');
    setSaving(false);
    if (ok) setBase(form);
  };

  const discard = async () => {
    if (!(await confirm({ title: 'Descartar alterações', message: 'Voltar ao que está publicado e perder o que você mudou aqui?', confirmLabel: 'Descartar' }))) return;
    setForm(base);
  };

  const resetField = (key) => set(key, toForm(key, DEFAULT_SETTINGS[key]));
  const resetSection = (section) => setForm(p => ({ ...p, ...Object.fromEntries(section.fields.map(f => [f.key, toForm(f.key, DEFAULT_SETTINGS[f.key])])) }));
  const resetAll = async () => {
    if (!(await confirm({ title: 'Voltar tudo ao padrão', message: 'Todos os textos, cores e opções do site voltam ao original. Nada muda para os clientes até você clicar em Publicar.', confirmLabel: 'Voltar ao padrão' }))) return;
    setForm(Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(k => [k, toForm(k, DEFAULT_SETTINGS[k])])));
  };

  const handleUndo = async () => {
    if (dirty && !(await confirm({ title: 'Desfazer', message: 'Você tem alterações não publicadas aqui. Desfazer a última publicação descarta elas. Continuar?', confirmLabel: 'Desfazer' }))) return;
    setBase(form); dirtyRef.current = false;
    await onUndo();
  };

  const sections = SETTINGS_SCHEMA.filter(s => s.group === group);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <p className="text-sm text-gray-600">Mude a aparência e os textos do site sem mexer em código. O que você edita aqui é um rascunho: os clientes só veem depois que você clicar em <strong>Publicar alterações</strong>. Cor, fonte e logo aparecem em prévia neste painel enquanto você escolhe.</p>

      {settings.backup && (
        <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
          <span className="text-gray-600">Última publicação: {new Date(settings.backup.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
          <button type="button" onClick={handleUndo} className="flex items-center gap-1.5 text-blue-700 font-medium hover:underline"><Undo2 className="w-4 h-4" /> Desfazer</button>
        </div>
      )}

      <div role="tablist" aria-label="Áreas do site" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUPS.map(g => (
          <button
            key={g.id} type="button" role="tab" aria-selected={group === g.id} onClick={() => setGroup(g.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${group === g.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >{g.label}</button>
        ))}
      </div>

      {sections.map(section => {
        const Icon = SECTION_ICONS[section.title] || Type;
        return (
          <fieldset key={section.title} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <legend className="sr-only">{section.title}</legend>
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600" aria-hidden="true"><Icon className="w-4 h-4" /></span>
                {section.title}
              </h3>
              <button type="button" onClick={() => resetSection(section)} className="text-xs font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 whitespace-nowrap"><RotateCcw className="w-3 h-3" /> Restaurar seção</button>
            </div>
            <div className="p-5 space-y-5">
              {section.fields.map(f => (
                <Field key={f.key} f={f} form={form} set={set} resetField={resetField} />
              ))}
              {section.title === 'Faixa de aviso no topo' && <BannerPreview form={form} />}
            </div>
          </fieldset>
        );
      })}

      <div className="sticky bottom-0 -mx-1 px-1 py-4 bg-white/95 backdrop-blur border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button type="button" onClick={resetAll} className="text-sm text-gray-500 hover:text-red-600">Voltar tudo ao padrão</button>
          {dirty && <button type="button" onClick={discard} className="text-sm text-gray-500 hover:text-gray-800">Descartar alterações</button>}
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">Alterações não publicadas</span>}
          <a href="/" target="_blank" rel="noreferrer" className="px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Ver site</a>
          <button type="submit" disabled={saving || !dirty} className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Publicando…' : 'Publicar alterações'}</button>
        </div>
      </div>
    </form>
  );
}

function Field({ f, form, set, resetField }) {
  const id = `s-${f.key}`;
  const isDefault = toStored(f.key, form[f.key]) === null;
  const resetBtn = !isDefault && (
    <button type="button" onClick={() => resetField(f.key)} className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Padrão</button>
  );

  if (f.type === 'toggle') {
    return (
      <div>
        <label htmlFor={id} className="flex items-center gap-3 cursor-pointer select-none">
          <input id={id} type="checkbox" checked={!!form[f.key]} onChange={e => set(f.key, e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
          <span className="text-sm font-medium text-gray-700">{f.label}</span>
        </label>
        {f.hint && <p className="text-xs text-gray-500 mt-1 ml-7">{f.hint}</p>}
      </div>
    );
  }

  let control;
  switch (f.type) {
    case 'textarea':
      control = <textarea id={id} rows={f.rows || 3} maxLength={f.max} value={form[f.key]} onChange={e => set(f.key, e.target.value)} className={inputCls} />;
      break;
    case 'select':
      control = (
        <select id={id} value={form[f.key]} onChange={e => set(f.key, e.target.value)} className={`${inputCls} bg-white`}>
          {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case 'range':
      control = (
        <div>
          <div className="flex items-center gap-4">
            <input id={id} type="range" min={f.min} max={f.max} step={f.step} value={form[f.key]} onChange={e => set(f.key, e.target.value)} className="flex-1 accent-blue-600" />
            <span className="w-16 text-right text-sm font-mono text-gray-700">{form[f.key]} {f.unit}</span>
          </div>
          {f.key === 'logoSize' && (
            <div className="mt-3 flex items-center h-[7rem] px-4 rounded-md border border-dashed border-gray-300 bg-gray-50 overflow-hidden">
              {form.logoUrl
                ? <img src={form.logoUrl} alt="Prévia da logo" style={{ height: `${form.logoSize}px`, maxWidth: '100%' }} className="object-contain" />
                : <span className="text-xs text-gray-500">Envie uma logo acima para ver a prévia do tamanho.</span>}
            </div>
          )}
        </div>
      );
      break;
    case 'date':
      control = <input id={id} type="date" value={form[f.key]} onChange={e => set(f.key, e.target.value)} className={`${inputCls} sm:w-56`} />;
      break;
    case 'color':
      control = <ColorField id={id} f={f} value={form[f.key]} onChange={v => set(f.key, v)} primary={form.primaryColor} />;
      break;
    case 'image':
      control = <ImageField id={id} label={f.label} value={form[f.key]} onChange={v => set(f.key, v)} />;
      break;
    case 'faq':
      control = <FaqField value={form[f.key]} onChange={v => set(f.key, v)} />;
      break;
    default:
      control = (
        <input
          id={id} type={f.type === 'email' ? 'email' : 'text'} inputMode={f.type === 'phone' ? 'tel' : undefined}
          placeholder={f.type === 'social' ? '@usuario' : undefined}
          maxLength={f.type === 'phone' ? 15 : f.max} value={form[f.key]}
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
      {f.key === 'primaryColor' && isTooLight(form.primaryColor.trim()) && (
        <p className="text-xs text-amber-700 mt-1">Essa cor é bem clara: o texto branco dos botões pode ficar difícil de ler.</p>
      )}
      {f.hint && <p className="text-xs text-gray-500 mt-1">{f.hint}</p>}
    </div>
  );
}

function ColorField({ id, f, value, onChange, primary }) {
  const fallback = f.key === 'bannerColor' && isHex(primary) ? primary : DEFAULT_PRIMARY;
  const shown = isHex(value.trim()) ? value.trim() : fallback;
  return (
    <div className="flex items-center gap-3">
      <input id={id} type="color" value={shown} onChange={e => onChange(e.target.value)} aria-label={f.label} className="h-10 w-14 rounded border border-gray-300 bg-white p-1 cursor-pointer" />
      <input type="text" value={value} placeholder={`Padrão (${fallback})`} maxLength={7} onChange={e => onChange(e.target.value)} aria-label={`${f.label} (código)`} className={`${inputCls} sm:w-48 font-mono`} />
    </div>
  );
}

function ImageField({ id, label, value, onChange }) {
  const { toast } = useUI();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Escolha um arquivo de imagem.');
    setBusy(true);
    try { onChange(await uploadSiteImage(file)); }
    catch (err) { console.error(err); toast.error(`Erro ao enviar imagem: ${err.message || err}`); }
    setBusy(false);
  };
  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-24 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
        {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="w-5 h-5 text-gray-400" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <label htmlFor={id} className={`px-3 py-2 border border-gray-300 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 flex items-center gap-1.5 ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="w-4 h-4" /> {busy ? 'Enviando…' : value ? 'Trocar' : 'Enviar imagem'}
        </label>
        <input id={id} type="file" accept="image/*" onChange={pick} className="sr-only" aria-label={label} />
        {value && <button type="button" onClick={() => onChange('')} className="px-3 py-2 text-sm text-gray-500 hover:text-red-600 flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Remover</button>}
      </div>
    </div>
  );
}

function FaqField({ value, onChange }) {
  let items = [];
  try { const raw = JSON.parse(value || '[]'); if (Array.isArray(raw)) items = raw; } catch { items = []; }
  const save = (next) => onChange(next.length ? JSON.stringify(next) : '');
  const update = (i, patch) => save(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; save(next); };
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

function BannerPreview({ form }) {
  if (!form.bannerText.trim()) return null;
  const bg = isHex(form.bannerColor.trim()) ? form.bannerColor.trim() : (isHex(form.primaryColor.trim()) ? form.primaryColor.trim() : DEFAULT_PRIMARY);
  return (
    <div>
      <span className="block text-xs font-medium text-gray-500 mb-1">Prévia{form.bannerEnabled ? '' : ' (faixa desligada: não aparece no site)'}</span>
      <div
        className={`text-white text-sm text-center px-4 py-2 rounded-md ${form.bannerEnabled ? '' : 'opacity-40'}`}
        style={form.bannerImage ? { backgroundColor: bg, backgroundImage: `linear-gradient(${bg}b3, ${bg}b3), url(${form.bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: bg }}
      >{form.bannerText}</div>
    </div>
  );
}
