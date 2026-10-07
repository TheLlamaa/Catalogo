// Lado de escrita das configurações do site, simétrico a mergeSettings (que lê): do formulário para os valores
// guardados, validação, diferença entre o rascunho e o publicado, e o protocolo de gravação com backup para "Desfazer".
import { DEFAULT_SETTINGS, SETTING_FIELDS, isValidMinOrder, isValidWhatsapp, normalizeWhatsapp } from './settings';
import type { Settings, SettingsBackup } from './settings';
import { PAGE_KEYS, parsePageDraft, pageToStored, isCompletePage, slugify, isValidSlug } from './pages';
import { MAX_TOP, MAX_FOOT, menuToStored, menuProblem } from './menus';
import { isHex, normalizeSocial, parseFaq } from './theme';
import { formatPhoneBR } from './format';
import type { SettingRow } from '../types';

/** Tamanho máximo de um valor guardado (limite da coluna). */
export const DB_VALUE_MAX = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valores do formulário: texto ou interruptor, indexados pela chave da configuração
export type FormValues = Record<string, string | boolean>;
// Mudanças a gravar: chave -> novo valor (null volta ao padrão)
export type SettingChanges = Record<string, string | null>;
// Item de pergunta frequente como digitado (campos podem estar vazios)
export interface FaqDraft { q?: string; a?: string }

const str = (v: string | boolean | undefined): string => (typeof v === 'string' ? v : '');

// WhatsApp aparece com máscara no formulário e é guardado só com dígitos
export const toForm = (key: string, value: unknown): string | boolean => (key === 'whatsapp' ? formatPhoneBR(value) : value as string | boolean); // valores já validados por mergeSettings
export const formFrom = (settings: Settings): FormValues => Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(k => [k, toForm(k, settings[k])]));
export const defaultForm = (): FormValues => Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(k => [k, toForm(k, DEFAULT_SETTINGS[k])]));

/** Valor que iria para o banco (null = volta ao padrão, nada guardado). */
export const toStored = (key: string, value: unknown): string | null => {
  const def = DEFAULT_SETTINGS[key];
  if (typeof def === 'boolean') return value === def ? null : String(value);
  let v = String(value ?? '').trim();
  if (key === 'whatsapp') v = v ? normalizeWhatsapp(v) : '';
  else if (key.startsWith('social')) v = normalizeSocial(key, v) || v;
  else if (key === 'primaryColor' || key === 'bannerColor' || key === 'badgeColor') v = v.toLowerCase();
  else if (/^page[A-T]$/.test(key)) v = pageToStored(v);
  else if (key === 'menuTop') v = menuToStored(v, MAX_TOP, true);
  else if (key === 'menuFoot') v = menuToStored(v, MAX_FOOT, false);
  else if (key === 'faqItems') { const items = parseFaq(v); v = items.length ? JSON.stringify(items) : ''; }
  return !v || v === def ? null : v;
};

/** Rascunho no formato da tabela site_settings (só o que difere do padrão), para a prévia ao vivo. */
export const draftRows = (form: FormValues): SettingRow[] => Object.keys(DEFAULT_SETTINGS)
  .map(key => ({ key, value: toStored(key, form[key]) }))
  .filter((r): r is SettingRow => r.value !== null);

/** Só o que mudou entre o publicado (base) e o rascunho; o que voltou ao padrão vai como null. */
export function diffSettings(form: FormValues, base: FormValues): SettingChanges {
  const changes: SettingChanges = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const next = toStored(key, form[key]);
    if (next !== toStored(key, base[key])) changes[key] = next;
  }
  return changes;
}

/** Primeira mensagem de erro do formulário, ou null se pode publicar. */
export function validateSettingsForm(form: FormValues): string | null {
  if (str(form.whatsapp).trim() && !isValidWhatsapp(form.whatsapp)) return 'WhatsApp inválido. Use DDD + número, ex: (48) 99999-9999';
  if (str(form.email).trim() && !EMAIL_RE.test(str(form.email).trim())) return 'E-mail inválido.';
  if (!str(form.storeName).trim()) return 'O nome da loja não pode ficar vazio.';
  for (const k of ['primaryColor', 'bannerColor', 'badgeColor']) {
    if (str(form[k]).trim() && !isHex(str(form[k]).trim())) return 'Cor inválida. Use o seletor de cor ou o formato #1a2b3c.';
  }
  for (const f of SETTING_FIELDS.filter(x => x.type === 'social')) {
    if (str(form[f.key]).trim() && !normalizeSocial(f.key, form[f.key])) return `${f.label}: use @usuario ou um link começando com https://`;
  }
  if (!isValidMinOrder(form.minOrder)) return 'Pedido mínimo: use um número maior que zero, ex: 30 ou 30,50.';
  const slugs = new Set<string>();
  for (const k of PAGE_KEYS) {
    const raw = str(form[k]);
    const stored = pageToStored(raw);
    if (!stored) continue;
    const d = parsePageDraft(raw);
    const name = (d.t || '').trim() || 'Página sem título';
    if (!isCompletePage(raw)) return `Página “${name}”: preencha o título e o texto (ou apague a página).`;
    if (stored.length > DB_VALUE_MAX) return `Página “${name}”: o texto ficou grande demais. Encurte um pouco.`;
    const slug = slugify(d.s || '') || slugify(d.t || '');
    if (!isValidSlug(slug)) return `Página “${name}”: o endereço precisa ter letras ou números.`;
    if (slugs.has(slug)) return `Página “${name}”: o endereço /p/${slug} já é usado por outra página.`;
    slugs.add(slug);
  }
  const menuError = menuProblem(form.menuTop, MAX_TOP, true, 'Menu do topo') || menuProblem(form.menuFoot, MAX_FOOT, false, 'Links do rodapé');
  if (menuError) return menuError;
  try {
    const raw: FaqDraft[] = JSON.parse(str(form.faqItems) || '[]');
    if (raw.some(i => (i.q || '').trim() !== '' && (i.a || '').trim() === '')) return 'Toda pergunta precisa de uma resposta.';
    if (raw.some(i => (i.a || '').trim() !== '' && (i.q || '').trim() === '')) return 'Toda resposta precisa de uma pergunta.';
  } catch { /* texto vazio */ }
  const privacy = toStored('privacyText', form.privacyText) || '';
  if (privacy.length > DB_VALUE_MAX) return 'O texto da política ficou grande demais.';
  if ((toStored('faqItems', form.faqItems) || '').length > DB_VALUE_MAX) return 'As perguntas frequentes ficaram grandes demais. Encurte algumas respostas.';
  return null;
}

/**
 * O que gravar para aplicar `changes`: valores novos, chaves a apagar e, a menos que `noBackup`, o backup
 * (settingsBackup) com o valor antigo das chaves mudadas, para o botão "Desfazer".
 */
export function buildSettingsWrite(
  changes: SettingChanges,
  currentRows: SettingRow[],
  now: string,
  { noBackup = false } = {},
): { upsert: SettingRow[]; remove: string[] } {
  const upsert: SettingRow[] = Object.entries(changes).filter((entry): entry is [string, string] => entry[1] !== null).map(([key, value]) => ({ key, value }));
  const remove = Object.entries(changes).filter(([, v]) => v === null).map(([key]) => key);

  if (noBackup) {
    remove.push('settingsBackup');
  } else {
    const old = Object.fromEntries(Object.keys(changes).map(k => [k, currentRows.find(r => r.key === k)?.value ?? null]));
    const backup = JSON.stringify({ t: now, v: old });
    if (backup.length <= DB_VALUE_MAX) upsert.push({ key: 'settingsBackup', value: backup });
    else remove.push('settingsBackup'); // grande demais para desfazer: melhor não oferecer um "desfazer" velho
  }
  return { upsert, remove };
}

/** Mudanças que devolvem as chaves da última publicação ao valor de antes (só chaves conhecidas e valores válidos). */
export function undoChanges(backup: SettingsBackup): SettingChanges {
  const allowed = new Set([...SETTING_FIELDS.map(f => f.key), 'customAuras', 'auraOverrides']);
  const changes: SettingChanges = {};
  for (const [key, value] of Object.entries(backup.v)) {
    if (allowed.has(key) && (value === null || typeof value === 'string')) changes[key] = value;
  }
  return changes;
}
