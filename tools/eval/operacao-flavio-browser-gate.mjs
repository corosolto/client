import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { subirServe } from './lib/serve-eval.mjs';

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
let server;
try { server = await subirServe(port, { url: `${base}/`, cwd: root }); } catch (error) { console.error(error.message); process.exit(2); }
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const browser = spawn(process.execPath, ['tools/eval/operacao-flavio-browser.mjs', `--base=${base}`, `--out=${out}`], { cwd: root, stdio: 'inherit' });
const exit = await new Promise(resolve => browser.once('exit', resolve));
server.kill();
process.exit(exit);
