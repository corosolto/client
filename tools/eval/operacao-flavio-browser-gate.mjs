import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const ego = Object.hasOwn(process.env, 'EGO_TASK_SPACE');
const out = ego ? process.env.EGO_OPERACAO_OUT : `${root}/artifacts/operacao-flavio`;
if (ego && (!out || !isAbsolute(out) || existsSync(out))) {
  throw Error('EGO_OPERACAO_OUT deve apontar para um diretório absoluto novo');
}
const free = (port) => new Promise((resolve) => {
  const probe = net.createServer();
  probe.once('error', () => resolve(false));
  probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
});
let port = 0;
for (let candidate = 9326; candidate <= 9900 && !port; candidate++) if (await free(candidate)) port = candidate;
if (!port) throw new Error('nenhuma porta livre em 9100-9900');
const base = `http://127.0.0.1:${port}`;
const serverArgs = ['tools/eval/serve.mjs', String(port)];
if (ego) serverArgs.push('--operacao-dev-stub');
const server = spawn(process.execPath, serverArgs, { cwd: root, stdio: 'ignore' });
server.on('error', (error) => { console.error(error); process.exit(2); });
try {
  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${base}/`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw Error(`servidor de avaliação não respondeu: ${base}`);
  if (!ego) rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: !ego });
  const args = [`--base=${base}`, `--out=${out}`];
  const script = new URL('./operacao-flavio-browser.mjs', import.meta.url);
  const target = { id: Number(process.env.EGO_TASK_SPACE), label: process.env.EGO_PAGE ?? 'p1' };
  const run = `globalThis.operacaoEgo = { listTaskSpaces, taskSpace, target: ${JSON.stringify(target)} }; process.argv.push(...${JSON.stringify(args)}); await import(${JSON.stringify(script.href)});`;
  const browser = ego
    ? spawn('ego-browser', ['nodejs', '-e', run], { cwd: root, stdio: 'inherit' })
    : spawn(process.execPath, [fileURLToPath(script), ...args], { cwd: root, stdio: 'inherit' });
  process.exitCode = await new Promise((resolve, reject) => {
    browser.once('error', reject);
    browser.once('exit', code => resolve(code ?? 2));
  });
} finally {
  server.kill('SIGTERM');
}
