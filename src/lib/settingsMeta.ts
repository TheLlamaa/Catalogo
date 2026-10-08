// Informações de apoio sobre cada configuração: como mostrar o valor padrão, como descrever uma mudança
// ("antes → depois") e como buscar. Só leitura sobre o schema; nada daqui grava no banco.
import { SETTING_FIELDS, SETTINGS_SCHEMA, GROUPS, DEFAULT_SETTINGS } from './settings';
import type { SettingField } from './settings';
import { KEYWORDS } from './settingsHints';
import { toStored } from './settingsWrite';
import type { FormValues } from './settingsWrite';

const clip = (text: string, max = 70): string => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Texto de um valor para mostrar ao dono (nunca devolve vazio). */
export function displayValue(field: SettingField, value: unknown): string {
  switch (field.type) {
    case 'toggle': return value ? 'Ligado' : 'Desligado';
    case 'select': return field.options.find(o => o.value === value)?.label ?? String(value ?? '');
    case 'range': return `${value ?? ''}${field.unit ? ` ${field.unit}` : ''}`;
    case 'image': return value ? 'Imagem enviada' : 'Sem imagem';
    case 'color': return value ? String(value) : 'Cor padrão';
    case 'menu': return value ? 'Menu personalizado' : 'Menu padrão';
    case 'faq': return value ? 'Perguntas cadastradas' : 'Sem perguntas';
    case 'page': return value ? 'Página cadastrada' : 'Sem página';
    case 'block': return value ? 'Bloco cadastrado' : 'Sem bloco';
    case 'sections': return value ? 'Ordem personalizada' : 'Ordem padrão';
    default: { const text = String(value ?? '').trim(); return text ? clip(text) : '(vazio)'; }
  }
}

/** "Padrão: …" mostrado abaixo do campo. */
export function describeDefault(field: SettingField): string {
  return displayValue(field, field.default);
}

export interface Change { key: string; label: string; section: string; before: string; after: string }

const labelOf = (key: string): string => SETTING_FIELDS.find(f => f.key === key)?.label ?? key;

/** O que mudou entre o publicado e o rascunho, em linguagem do dono (para "Revisar alterações"). */
export function changedFields(form: FormValues, base: FormValues): Change[] {
  const out: Change[] = [];
  for (const section of SETTINGS_SCHEMA) {
    for (const f of section.fields) {
      if (toStored(f.key, form[f.key]) === toStored(f.key, base[f.key])) continue;
      out.push({
        key: f.key,
        label: f.type === 'page' || f.type === 'menu' || f.type === 'block' ? section.title : f.label,
        section: section.title,
        before: displayValue(f, base[f.key]),
        after: displayValue(f, form[f.key]),
      });
    }
  }
  return out;
}

/** Campo mudou em relação ao publicado? */
export const isChanged = (key: string, form: FormValues, base: FormValues): boolean => toStored(key, form[key]) !== toStored(key, base[key]);

/** Campo está diferente do padrão? */
export const isNotDefault = (key: string, form: FormValues): boolean => toStored(key, form[key]) !== null && key in DEFAULT_SETTINGS;

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

/** Sem acento, minúsculas e espaços limpos: "Você" acha "voce". */
export const norm = (v: string): string => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const groupLabel = (id: string): string => GROUPS.find(g => g.id === id)?.label ?? '';

/** Texto onde a busca procura para um campo (rótulo, explicação, opções e sinônimos). */
export function searchText(field: SettingField, sectionTitle = '', groupId = ''): string {
  const options = field.type === 'select' ? field.options.map(o => o.label).join(' ') : '';
  return norm(`${field.label} ${field.hint ?? ''} ${options} ${KEYWORDS[field.key] ?? ''} ${sectionTitle} ${groupLabel(groupId)}`);
}

export interface SettingHit { key: string; label: string; hint: string; section: string; group: string; groupLabel: string }

/** Campos que combinam com todas as palavras da busca, os de rótulo mais parecido primeiro. */
export function searchSettings(query: string, limit = 12): SettingHit[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: (SettingHit & { score: number })[] = [];
  for (const section of SETTINGS_SCHEMA) {
    for (const f of section.fields) {
      if ((f.type === 'page' && f.key !== 'pageA') || (f.type === 'block' && f.key !== 'blockA')) continue; // páginas e blocos viram uma entrada só
      const text = searchText(f, section.title, section.group);
      if (!words.every(w => text.includes(w))) continue;
      const label = norm(f.label);
      const score = words.reduce((n, w) => n + (label.startsWith(w) ? 3 : label.includes(w) ? 2 : 0), 0);
      hits.push({ key: f.key, label: f.type === 'page' ? 'Páginas extras' : f.type === 'block' ? 'Blocos extras da página inicial' : f.label, hint: f.hint ?? '', section: section.title, group: section.group, groupLabel: groupLabel(section.group), score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit).map(({ score: _score, ...hit }) => hit);
}
