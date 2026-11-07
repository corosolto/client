import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const out = `${root}/artifacts/operacao-flavio`;
const free = (port) => new Promise((resolve) => {
  const probe = net.createServer();
  probe.once('error', () => resolve(false));
  probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
});
let port = 0;
for (let candidate = 9326; candidate <= 9900 && !port; candidate++) if (await free(candidate)) port = candidate;
if (!port) throw new Error('nenhuma porta livre em 9100-9900');
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: root, stdio: 'ignore' });
server.on('error', (error) => { console.error(error); process.exit(2); });
const deadline = Date.now() + 60000;
while (Date.now() < deadline) {
  try { if ((await fetch(`${base}/`)).ok) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const browser = spawn(process.execPath, ['tools/eval/operacao-flavio-browser.mjs', `--base=${base}`, `--out=${out}`], { cwd: root, stdio: 'inherit' });
const exit = await new Promise(resolve => browser.once('exit', resolve));
server.kill('SIGTERM');
process.exit(exit);
