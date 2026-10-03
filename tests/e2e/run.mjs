// Roda os testes de navegador: monta o site com um Supabase falso, sobe o preview e executa cada roteiro.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = mkdtempSync(join(tmpdir(), 'catalogo-e2e-'));
const PORT = process.env.E2E_PORT || '4173';
const env = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://mock.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'mock-anon-key',
  VITE_STORE_NAME: 'Oficina Teste',
  VITE_WHATSAPP_NUMBER: '5548999998888',
  E2E_BASE: `http://127.0.0.1:${PORT}`,
};

const build = spawnSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir'], { cwd: root, env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);

const preview = spawn('npx', ['vite', 'preview', '--outDir', out, '--host', '127.0.0.1', '--port', PORT, '--strictPort'], { cwd: root, env, stdio: 'ignore', detached: true });
const stop = () => { try { process.kill(-preview.pid); } catch {} rmSync(out, { recursive: true, force: true }); };
process.on('exit', stop);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(env.E2E_BASE)).ok; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

if (!up) { console.log('Preview não subiu em 30s'); process.exit(1); }
const here = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const files = readdirSync(here).filter(f => f.endsWith('.mjs') && !['run.mjs', 'env.mjs'].includes(f) && (!only || f.includes(only))).sort();
let failed = 0;
for (const f of files) {
  console.log(`\n=== ${f} ===`);
  const r = spawnSync('node', [join(here, f)], { env, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.status !== 0) {
    failed++; console.log(`>>> ${f} FALHOU`);
    // No GitHub Actions, destaca as linhas com problema (aparecem como anotações do check)
    const bad = `${r.stdout}\n${r.stderr}`.split('\n').filter(l => /^FAIL|Error|PAGEERROR/.test(l)).slice(0, 8);
    for (const l of bad) console.log(`::error title=${f}::${l.replace(/[\r\n%]/g, ' ').slice(0, 300)}`);
    if (!bad.length) console.log(`::error title=${f}::saiu com código ${r.status} ${r.signal || ''}`);
  }
}
console.log(failed ? `\n${failed} roteiro(s) com falha` : `\nTodos os ${files.length} roteiros passaram`);
process.exit(failed ? 1 : 0);
