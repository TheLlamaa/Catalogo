import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useUI } from '../components/UIContext';
import { SETTINGS_SCHEMA, DEFAULT_SETTINGS, isValidWhatsapp, normalizeWhatsapp } from '../lib/settings';
import { formatPhoneBR } from '../lib/format';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// WhatsApp mostrado com máscara (guardado só com dígitos)
const toForm = (key, value) => (key === 'whatsapp' ? formatPhoneBR(value) : value);

export default function SiteSettings({ settings, onSave }) {
  const { toast } = useUI();
  const [form, setForm] = useState(() => Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(k => [k, toForm(k, settings[k])])));
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.whatsapp.trim() && !isValidWhatsapp(form.whatsapp)) return toast.error('WhatsApp inválido. Use DDD + número, ex: (48) 99999-9999');
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) return toast.error('E-mail inválido.');
    if (!form.storeName.trim()) return toast.error('O nome da loja não pode ficar vazio.');

    // Só vai para o banco o que difere do padrão; o resto é apagado (volta ao padrão)
    const changes = {};
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (typeof def === 'boolean') { changes[key] = form[key] === def ? null : String(form[key]); continue; }
      let v = String(form[key]).trim();
      if (key === 'whatsapp') v = v ? normalizeWhatsapp(v) : '';
      changes[key] = !v || v === def ? null : v;
    }
    setSaving(true);
    await onSave(changes);
    setSaving(false);
  };

  const resetField = (key) => set(key, toForm(key, DEFAULT_SETTINGS[key]));
  const resetAll = () => setForm(Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(k => [k, toForm(k, DEFAULT_SETTINGS[k])])));

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-10">
      <p className="text-sm text-gray-600">Mude os textos e menus do site sem mexer em código. A alteração aparece para os clientes assim que você salvar. “Padrão” devolve o texto original.</p>

      {SETTINGS_SCHEMA.map(section => (
        <fieldset key={section.title} className="space-y-5">
          <legend className="text-sm font-semibold text-gray-900 mb-1 pb-2 border-b border-gray-100 w-full">{section.title}</legend>
          {section.fields.map(f => {
            const id = `s-${f.key}`;
            const isDefault = form[f.key] === toForm(f.key, f.default);
            return (
              <div key={f.key}>
                {f.type === 'toggle' ? (
                  <label htmlFor={id} className="flex items-center gap-3 cursor-pointer select-none">
                    <input id={id} type="checkbox" checked={!!form[f.key]} onChange={e => set(f.key, e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-700">{f.label}</span>
                  </label>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{f.label}</label>
                      {!isDefault && (
                        <button type="button" onClick={() => resetField(f.key)} className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Padrão</button>
                      )}
                    </div>
                    {f.type === 'textarea' ? (
                      <textarea id={id} rows={3} maxLength={f.max} value={form[f.key]} onChange={e => set(f.key, e.target.value)} className={inputCls} />
                    ) : (
                      <input
                        id={id} type={f.type === 'email' ? 'email' : 'text'} inputMode={f.type === 'phone' ? 'tel' : undefined}
                        maxLength={f.type === 'phone' ? 15 : f.max} value={form[f.key]}
                        onChange={e => set(f.key, f.type === 'phone' ? formatPhoneBR(e.target.value) : e.target.value)} className={inputCls}
                      />
                    )}
                  </>
                )}
                {f.hint && <p className="text-xs text-gray-500 mt-1">{f.hint}</p>}
              </div>
            );
          })}
        </fieldset>
      ))}

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-100">
        <button type="button" onClick={resetAll} className="text-sm text-gray-500 hover:text-red-600">Voltar tudo ao padrão (depois clique em Salvar)</button>
        <div className="flex gap-3">
          <a href="/" target="_blank" rel="noreferrer" className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Ver site</a>
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar alterações'}</button>
        </div>
      </div>
    </form>
  );
}
