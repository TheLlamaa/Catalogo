import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useUI } from '../../../components/UIContext';
import { BACKUP_MAX_BYTES, backupFileName, buildBackup, parseBackupFile } from '../../../lib/settingsBackup';
import type { SettingRow } from '../../../types';

interface BackupPanelProps {
  publishedRows: SettingRow[]; // o que está publicado agora
  dirty: boolean;
  onLoad: (rows: SettingRow[]) => void; // vira rascunho no formulário
}

// Guardar e levar as configurações do site em um arquivo (útil antes de mudanças grandes ou para copiar para outra loja)
export default function BackupPanel({ publishedRows, dirty, onLoad }: BackupPanelProps) {
  const { toast, confirm } = useUI();
  const input = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([JSON.stringify(buildBackup(publishedRows), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = backupFileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Backup baixado.');
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > BACKUP_MAX_BYTES) return toast.error('Arquivo grande demais para ser um backup de configurações.');
    const result = parseBackupFile(await file.text());
    if ('error' in result) return toast.error(result.error);
    const ok = await confirm({
      title: 'Carregar este backup?',
      message: `${result.rows.length} configurações do arquivo substituem o que está no formulário${dirty ? ' (inclusive o que você ainda não publicou)' : ''}. Nada vai ao ar até você clicar em Publicar alterações.`,
      confirmLabel: 'Carregar no rascunho',
    });
    if (!ok) return;
    onLoad(result.rows);
    toast.success(`Backup carregado no rascunho${result.ignored ? ` (${result.ignored} itens desconhecidos foram ignorados)` : ''}. Revise e publique.`);
  };

  return (
    <fieldset className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
      <legend className="sr-only">Backup das configurações</legend>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Backup das configurações</h2>
      <p className="text-xs text-gray-500 mb-3">Baixe um arquivo com tudo o que está publicado em Personalizar loja (textos, cores, menus, páginas, blocos). Produtos, pedidos e auras não entram. Para voltar a um backup, carregue o arquivo e publique.</p>
      <div className="flex flex-wrap gap-2">
        <Button icon={Download} onClick={download}>Baixar backup</Button>
        <Button icon={Upload} onClick={() => input.current?.click()}>Carregar de um arquivo</Button>
        <input ref={input} type="file" accept="application/json,.json" onChange={pick} className="sr-only" aria-label="Arquivo de backup das configurações" />
      </div>
    </fieldset>
  );
}
