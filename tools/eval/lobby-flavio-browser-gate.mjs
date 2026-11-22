// Portão do card/modal da Operação Flávio no lobby: sobe o serve.mjs numa porta livre
// (9100–9900) e roda a régua de navegador com e sem mutantes, como o browser gate da escolta.
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ego = Object.hasOwn(process.env, 'EGO_TASK_SPACE');
if (ego) {
  const space = Number(process.env.EGO_TASK_SPACE);
  const page = process.env.EGO_PAGE || 'p2';
  if (!Number.isSafeInteger(space) || space <= 0) throw new Error('EGO_TASK_SPACE inválido: inteiro positivo esperado');
  if (!/^p\d+$/.test(page)) throw new Error(`EGO_PAGE inválido (${page}): use página existente pN`);
}
const root = fileURLToPath(new URL('../..', import.meta.url));
const free = (port) => new Promise((resolve) => {
  const probe = net.createServer().once('error', () => resolve(false));
  probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
});
let port = 0;
for (let candidate = 9428; candidate <= 9900 && !port; candidate++) if (await free(candidate)) port = candidate;
if (!port) throw new Error('nenhuma porta livre em 9428-9900');
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
let failure = null;
let diagnostic = '';
server.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-6000); });
server.once('error', error => { failure = error.message; });
server.once('exit', (code, signal) => { failure = `serve.mjs terminou (${code ?? signal})`; });
let status = 2;
try {
  let ready = false;
  for (let i = 0; i < 120 && !failure; i++) {
    try { if ((await fetch(base, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready || failure) throw Error(`${failure || `servidor não respondeu em ${base}`}\n${diagnostic}`);
  const runner = ego ? 'tools/eval/lobby-flavio-ego.mjs' : 'tools/eval/lobby-flavio-browser.mjs';
  const runnerEnv = { ...process.env, BASE: base };
  delete runnerEnv.LFB;
  delete runnerEnv.GRUPO;
  for (const args of [[], ['--mutantes']]) {
    const run = spawn(process.execPath, [runner, ...args], { cwd: root, stdio: 'inherit', env: runnerEnv });
    status = await new Promise((resolve, reject) => {
      run.once('error', reject);
      run.once('exit', code => resolve(code ?? 2));
    });
    if (status !== 0) break;
  }
} finally {
  server.kill('SIGTERM');
}
process.exitCode = status;
