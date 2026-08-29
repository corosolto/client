import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const semLock = process.env.DEV_PORT_MUTANT === 'semlock';
const args = ['dev', ...(semLock ? [] : ['--ignore-lock']), ...process.argv.slice(2)];
const env = { ...process.env };

// O Astro 7 daemoniza quando detecta um agente e consulta o lock antes de o Vite
// procurar outra porta. Foreground + ignore-lock deixa o Vite escolher a próxima livre.
if (semLock) delete env.ASTRO_DEV_BACKGROUND;
else env.ASTRO_DEV_BACKGROUND = '0';

const child = spawn(process.execPath, [path.join(ROOT, 'node_modules/astro/bin/astro.mjs'), ...args], {
  cwd: ROOT,
  env,
  stdio: 'inherit',
});

child.once('error', (err) => {
  console.error(`[dev] não foi possível iniciar o Astro: ${err.message}`);
  process.exitCode = 1;
});
child.once('exit', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1);
});
