#!/usr/bin/env node
/* ============================================================================
   authored-serving-check.mjs — O SERVIDOR REAL ENTREGA O QUE O ready PROMETE
   ----------------------------------------------------------------------------
   POR QUE EXISTE (achado do DONO, 29/08): public/private-assets/viewmodels é
   symlink para fora da raiz; o dev server (Astro/Vite) pode devolver 403 após
   um restart, o loadFamilyGltf cai no legado EM SILÊNCIO e todo mundo julga o
   viewmodel errado sem saber. O check:vm rodava réguas via serve.mjs (outro
   servidor) e por isso ficava verde enquanto o navegador do dono tomava 403 —
   esta régua sobe o ASTRO DE VERDADE e cobra a resposta.
   SV1 toda família com portão aberto (ready:true) responde 200 e > 100 KB;
   SV2 shared/ (9 texturas + general-runtime) e recoil.json respondem 200;
   SV3 famílias fechadas também respondem (o ?vmready= de calibração depende).
   Mutante: --mutante=familia-fantasma pede um GLB inexistente e TEM que acusar.
   Uso: node tools/eval/authored-serving-check.mjs [--porta=8163]
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';

import { VM_FAMILY } from '../../public/js/data/vmconfig.js';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
if (MUT && MUT !== 'familia-fantasma') throw new Error(`mutante desconhecido: ${MUT}`);
const PORTA = arg('porta') || '8163';

// O astro deste repo é instância ÚNICA: se o servidor do dono está de pé, é ELE
// que a régua sonda (mais fiel — é o servidor onde o defeito morde); sem nenhum
// vivo, sobe o próprio na porta reserva.
let BASE = '';
let srv = null;
try {
  const status = execSync('npx astro dev status', { encoding: 'utf8', timeout: 20000 });
  const running = /running at (http:\/\/[\d.]+:\d+)/.exec(status);
  if (running) BASE = running[1];
} catch { /* nenhum servidor vivo */ }
if (!BASE) {
  BASE = `http://127.0.0.1:${PORTA}`;
  srv = spawn('npx', ['astro', 'dev', '--port', PORTA, '--host', '127.0.0.1'], {
    stdio: 'ignore',
    env: { ...process.env, PORT: PORTA },
  });
  process.on('exit', () => srv?.kill());
}
let up = false;
for (let i = 0; i < 120; i++) {
  try { if ((await fetch(`${BASE}/`)).ok) { up = true; break; } } catch { /* subindo */ }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!up) { console.error(`FALHA SV0: nenhum servidor respondeu em ${BASE}`); process.exit(1); }
console.log(`sondando ${BASE}${srv ? ' (subido pela régua)' : ' (servidor do dono, vivo)'}`);

let failures = 0;
function check(ok, label, evidence = '') {
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${label}${evidence ? ` — ${evidence}` : ''}`);
  if (!ok) failures += 1;
}

async function head(path, minBytes = 1) {
  try {
    const response = await fetch(`${BASE}${path}`, { method: 'HEAD' });
    const bytes = Number(response.headers.get('content-length') || 0);
    return { ok: response.status === 200 && bytes >= minBytes, status: response.status, bytes };
  } catch (error) {
    return { ok: false, status: String(error), bytes: 0 };
  }
}

const familias = Object.keys(VM_FAMILY);
for (const familia of familias) {
  const alvo = MUT === 'familia-fantasma' && familia === 'ak' ? 'fantasma' : familia;
  const resultado = await head(`/private-assets/viewmodels/${alvo}/${alvo}-runtime.glb`, 100 * 1024);
  const aberta = VM_FAMILY[familia].ready === true;
  check(resultado.ok, `${aberta ? 'SV1' : 'SV3'} ${familia}${aberta ? ' (ready)' : ''}: GLB responde 200`,
    `status ${resultado.status}, ${(resultado.bytes / 1048576).toFixed(1)} MiB`);
}

const compartilhados = [
  ['/private-assets/viewmodels/shared/general-runtime.glb', 500 * 1024],
  ['/private-assets/viewmodels/recoil.json', 10 * 1024],
  ...['T_Arm01_B', 'T_Arm01_N', 'T_Arm01_ORM', 'T_Cloth01_B', 'T_Cloth01_N', 'T_Cloth01_ORM',
    'T_Glove01_B', 'T_Glove01_N', 'T_Glove01_ORM']
    .map((name) => [`/private-assets/viewmodels/shared/${name}.webp`, 1024]),
];
for (const [path, minBytes] of compartilhados) {
  const resultado = await head(path, minBytes);
  check(resultado.ok, `SV2 ${path.split('/').pop()}: responde 200`, `status ${resultado.status}`);
}

srv?.kill();
console.log(JSON.stringify({ mutante: MUT || null, familias: familias.length, failures }, null, 2));
process.exit(failures ? 1 : 0);
