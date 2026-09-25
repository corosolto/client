/* ============================================================================
   dev-port-check.mjs — `npm run dev` não pode parar num servidor já existente.

   Caso real (09/08/2026): com o Astro deste projeto vivo em :4321, `npm run dev`
   saía 0 dizendo apenas "Dev server already running". Nenhuma segunda instância
   era servida. O teste planta, num projeto temporário, um lock Astro com PID vivo
   e ocupa a mesma porta; então executa EXATAMENTE `scripts.dev` do package.json e
   exige que apareça outra URL.

   Mutação: --mutante=semlock remove ASTRO_DEV_BACKGROUND=0 e --ignore-lock do
   comando declarado. O Astro volta a obedecer ao lock e a régua precisa reprovar.
   ============================================================================ */
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUTANTE = process.argv.includes('--mutante=semlock');
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const comando = pkg.scripts?.dev || '';

if (MUTANTE) {
  const launcher = readFileSync(path.join(ROOT, 'scripts/dev.mjs'), 'utf8');
  if (!launcher.includes("process.env.DEV_PORT_MUTANT === 'semlock'"))
    throw new Error('MUTANTE NAO APLICOU: gancho semlock não existe no lançador');
}

const quote = (s) => `'${String(s).replaceAll("'", "'\\''")}'`;
const blocker = createServer();
const temp = mkdtempSync(path.join(tmpdir(), 'csbrasil-dev-port-'));
let child = null;

const stopChild = () => {
  if (!child?.pid) return;
  try {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
  } catch {}
};

try {
  mkdirSync(path.join(temp, 'src/pages'), { recursive: true });
  mkdirSync(path.join(temp, '.astro'), { recursive: true });
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(temp, 'node_modules'), 'dir');
  writeFileSync(path.join(temp, 'src/pages/index.astro'), '<h1>dev-port-check</h1>\n');

  await new Promise((resolve, reject) => {
    blocker.once('error', reject);
    blocker.listen(0, resolve);
  });
  const port = blocker.address().port;
  writeFileSync(path.join(temp, '.astro/dev.json'), JSON.stringify({
    pid: process.pid,
    port,
    url: `http://127.0.0.1:${port}`,
    urls: { local: [`http://127.0.0.1:${port}/`], network: [] },
    background: true,
    startedAt: new Date().toISOString(),
  }));

  let output = '';
  const outraPorta = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout: nenhuma segunda URL foi servida')), 20000);
    child = spawn(`${comando} --root ${quote(temp)} --port ${port}`, {
      cwd: ROOT,
      shell: true,
      detached: process.platform !== 'win32',
      env: { ...process.env, NO_COLOR: '1', ...(MUTANTE ? { DEV_PORT_MUTANT: 'semlock' } : {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const read = (chunk) => {
      output += chunk.toString();
      for (const m of output.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)/g)) {
        const found = Number(m[1]);
        if (found !== port) {
          clearTimeout(timeout);
          resolve(found);
          return;
        }
      }
    };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
    child.once('error', (err) => { clearTimeout(timeout); reject(err); });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`comando encerrou (${code}) sem servir outra porta\n${output.trim()}`));
    });
  });

  stopChild();
  console.log(`DEVPORT porta ocupada ${port} -> servidor em ${outraPorta}`);
  console.log('✓ DEVPORT 1/1 contrato verde');
} catch (err) {
  stopChild();
  console.error(`✗ DEVPORT ${err.message}`);
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => blocker.close(resolve));
  rmSync(temp, { recursive: true, force: true });
}
