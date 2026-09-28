/* launchd-runner.mjs — ponte launchd↔bots para o código no volume externo.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: o launchd desta máquina (macOS 26/Tahoe) NÃO abre arquivos em
   /Volumes/Zenith (StandardOutPath lá → spawn falha com exit 78, o que matou
   a frota em 04/09) e o /bin/sh que ele spawna não consegue abrir append no
   volume (EPERM). Node consegue — o canarinho escreve estado/ no Zenith há
   semanas. Este runner é o invólucro canarinho-padão para o resto da frota:

     node launchd-runner.mjs <dir-do-bot> <script.mjs> [args…]

   - spawna o bot com bun, stdio capturado;
   - espelha stdout em <bot>/estado/launchd.log e stderr em launchd.err.log
     (append; um cabeçalho com data por rodada);
   - replica tudo no stdout/stderr do runner (o launchd grava em disco interno,
     em ~/Library/Logs/CorosoltoBots/, para falha pré-bot nunca ficar cega);
   - repassa o código de saída do bot. */
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUN = '/Users/ruben/.bun/bin/bun';
const [botDirArg, scriptArg, ...args] = process.argv.slice(2);
if (!botDirArg || !scriptArg) {
  console.error('uso: launchd-runner.mjs <dir-do-bot> <script.mjs> [args…]');
  process.exit(2);
}
const RAIZ = dirname(fileURLToPath(import.meta.url));
const botDir = isAbsolute(botDirArg) ? botDirArg : resolve(RAIZ, '..', botDirArg);
const script = isAbsolute(scriptArg) ? scriptArg : join(botDir, scriptArg);

const estadoDir = join(botDir, 'estado');
mkdirSync(estadoDir, { recursive: true });
const fdOut = openSync(join(estadoDir, 'launchd.log'), 'a');
const fdErr = openSync(join(estadoDir, 'launchd.err.log'), 'a');
const escreve = (fd, chunk) => { try { writeSync(fd, chunk); } catch { /* disco cheio/etc: segue no espelho */ } };

const cabe = `\n[launchd ${new Date().toISOString()}] ${script} ${args.join(' ')}\n`;
escreve(fdOut, cabe);

const child = spawn(BUN, [script, ...args], { cwd: botDir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', (d) => { escreve(fdOut, d); process.stdout.write(d); });
child.stderr.on('data', (d) => { escreve(fdErr, d); process.stderr.write(d); });
child.on('error', (e) => { const m = `runner: spawn falhou — ${e.message}\n`; escreve(fdErr, m); process.stderr.write(m); process.exit(78); });
child.on('close', (code, signal) => {
  if (signal) { const m = `runner: bot morto por ${signal}\n`; escreve(fdErr, m); process.stderr.write(m); process.exit(1); }
  process.exit(code ?? 0);
});
