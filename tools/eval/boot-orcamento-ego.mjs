import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CHECK = new URL('./boot-orcamento-check.mjs', import.meta.url).href;
const ALLOWED_ENV = ['PATH', 'HOME', 'TMPDIR'];

function integerEnv(name) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function runEgo({ BASE, API_BASE, MUTANTE = '', proofDir = process.env.BOOT_PROOF_DIR || null }) {
  const space = integerEnv('EGO_TASK_SPACE');
  const page = process.env.EGO_PAGE;
  if (!space || !/^p\d+$/.test(page || '')) {
    console.error('INFRA78 Ego exige EGO_TASK_SPACE numérico e EGO_PAGE=pN');
    return 78;
  }
  const config = {
    BASE,
    API_BASE,
    MUTANTE,
    space,
    page,
    BOOT_PROOF_DIR: proofDir,
  };
  const source = `globalThis.__BOOT_EGO_CONFIG__=${JSON.stringify(config)}; await import(${JSON.stringify(CHECK)});`;
  const child = spawn('ego-browser', ['nodejs', '-e', source], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: Object.fromEntries(ALLOWED_ENV.filter((name) => process.env[name] != null).map((name) => [name, process.env[name]])),
  });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (code) => { if (!settled) { settled = true; resolve([0, 1, 78].includes(code) ? code : 78); } };
    child.once('error', (error) => { console.error(`INFRA78 Ego indisponível: ${error.message}`); finish(78); });
    child.once('close', (code, signal) => {
      if (signal) console.error(`INFRA78 Ego encerrado por ${signal}`);
      finish(code ?? 78);
    });
    const timer = setTimeout(() => { console.error('INFRA78 Ego excedeu 30 minutos'); child.kill('SIGTERM'); finish(78); }, 1_800_000);
    child.once('close', () => clearTimeout(timer));
  });
}
