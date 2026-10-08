// Backup das configurações do site em um arquivo (Personalizar loja > Avançado). Só configurações do site:
// produtos, pedidos e auras ficam de fora. Ao carregar, o arquivo vira RASCUNHO: nada vai ao ar até publicar.
import { SETTING_FIELDS } from './settings';
import type { SettingRow } from '../types';

export const BACKUP_APP = 'catalogo-configuracoes';
export const BACKUP_VERSION = 1;
export const BACKUP_MAX_BYTES = 300 * 1024;

export interface BackupFile { app: typeof BACKUP_APP; v: number; t: string; rows: SettingRow[] }

const KNOWN = new Set(SETTING_FIELDS.map(f => f.key));

export const buildBackup = (rows: SettingRow[], now = new Date()): BackupFile => ({
  app: BACKUP_APP, v: BACKUP_VERSION, t: now.toISOString(), rows: rows.filter(r => KNOWN.has(r.key)),
});

export const backupFileName = (now = new Date()): string => `configuracoes-${now.toISOString().slice(0, 10)}.json`;

/** Lê o texto de um arquivo de backup. Devolve as linhas conhecidas ou o motivo de não servir. */
export function parseBackupFile(text: string): { rows: SettingRow[]; ignored: number } | { error: string } {
  if (text.length > BACKUP_MAX_BYTES) return { error: 'Arquivo grande demais para ser um backup de configurações.' };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { error: 'O arquivo não é um backup válido (não consegui ler).' }; }
  const file = data as Partial<BackupFile> | null;
  if (!file || typeof file !== 'object' || file.app !== BACKUP_APP || !Array.isArray(file.rows)) return { error: 'Este arquivo não é um backup de configurações desta loja.' };
  if (typeof file.v !== 'number' || file.v > BACKUP_VERSION) return { error: 'Este backup é de uma versão mais nova do painel.' };
  const rows: SettingRow[] = [];
  let ignored = 0;
  for (const r of file.rows.slice(0, 500)) {
    if (r && typeof r.key === 'string' && typeof r.value === 'string' && KNOWN.has(r.key)) rows.push({ key: r.key, value: r.value });
    else ignored++;
  }
  return { rows, ignored };
}
