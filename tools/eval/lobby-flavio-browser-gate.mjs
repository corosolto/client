// Portão do card/modal da Operação Flávio no lobby: sobe o serve.mjs numa porta livre
// (9100–9900) e roda a régua de navegador com e sem mutantes, como o browser gate da escolta.
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const free = (port) => new Promise((resolve) => {
  const probe = net.createServer().once('error', () => resolve(false));
  probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
});
let port = 0;
for (let candidate = 9428; candidate <= 9900 && !port; candidate++) if (await free(candidate)) port = candidate;
if (!port) throw new Error('nenhuma porta livre em 9428-9900');
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: root, stdio: 'ignore' });
let status = 2;
try {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(base)).ok) break; } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  for (const args of [[], ['--mutantes']]) {
    const run = spawnSync(process.execPath, ['tools/eval/lobby-flavio-browser.mjs', ...args], { cwd: root, stdio: 'inherit', env: { ...process.env, BASE: base } });
    status = run.status ?? 2;
    if (status !== 0) break;
  }
} finally {
  server.kill('SIGTERM');
}
process.exit(status);
