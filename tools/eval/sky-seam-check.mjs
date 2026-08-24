/* A costura de wrap de todo `public/img/textures/sky_*.webp` fecha em cor.

   Caso real: o dono viu uma emenda vertical partindo a tela ao meio no
   `quebrada` — coluna x=812 de um frame 1500×1000, metade esquerda
   quente/creme e metade direita cinza-azulada (ΔL* 7,70 · Δb* 10,26 no frame).
   O palpite óbvio era compressão ou `map_sky.js`. Os dois foram REFUTADOS:
   `sky_rj.webp` passa pelo MESMO caminho (map_sky.js:14 mapping equirretangular,
   :17 scene.background) e mede wrap ΔL* 0,13 / Δb* 0,21. O defeito estava no
   ASSET — `sky_quebrada.webp` media ΔL* 17,38 / Δb* 18,96 entre a coluna 1023
   e a coluna 0, que num equirretangular são VIZINHAS.

   O portão conjuga duas regras porque cada uma sozinha dá falso positivo, por
   motivos opostos: só o absoluto marca `sky_pool` (2,32 L* num céu que varia
   7,19 entre colunas internas); só a razão marca `sky_brasilia` (1,15× com uma
   costura de 0,65 L*, invisível). Ver o cabeçalho de `sky_seam.py`.

   `--mutante=rj-meio-girado` gira o matiz de metade do `sky_rj` — o céu com a
   melhor costura da árvore — e tem de reprovar. Verde sem esse vermelho não
   vale nada.
*/
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(HERE, 'sky_seam.py');
const MUT = process.argv.some((a) => a.startsWith('--mutante='));
const JSON_OUT = process.argv.includes('--json');

function py(args) {
  const r = spawnSync('python3', [ENGINE, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error(`✗ motor de medida falhou: ${r.stderr || r.stdout}`);
    process.exit(2);
  }
  return JSON.parse(r.stdout);
}

let tmp = null;
let alvos = [];
if (MUT) {
  tmp = mkdtempSync(join(tmpdir(), 'sky-seam-'));
  const out = join(tmp, 'sky_mutante.webp');
  if (process.argv.includes('--mutante=rampa-estreita')) {
    // Fecha a costura do `sky_joa` ORIGINAL com uma rampa de 4 colunas: o ΔL*
    // fica ótimo (-1,22) e a emenda vira BANDA (4,39x o gradiente do miolo).
    // É o mutante que prova que o portão não se contenta com a costura fechada.
    py(['fix', '--file', 'tools/eval/asset-evidence/skies/sky_joa.webp', '--out', out, '--cols', '4']);
  } else {
    // Gira 40° o matiz de metade do `sky_rj` — o céu com a melhor costura da
    // árvore (ΔL* 0,13 / Δb* 0,21).
    py(['mutate', '--src', 'sky_rj', '--out', out, '--hue', '40']);
  }
  alvos = [out];
}

const { thresholds, skies } = py(['measure', ...alvos]);
const falhas = [];

const col = (s, n) => String(s).padStart(n);
const linhas = [
  `${'textura'.padEnd(22)} ${col('dim', 10)} ${col('KB', 7)} ${col('ΔL*', 7)} ${col('Δb*', 7)} ${col('int.L', 6)} ${col('raz.L', 6)} ${col('raz.b', 6)} ${col('hzΔL*', 7)}  veredito`,
];

for (const s of skies) {
  const dim = `${s.w}×${s.h}`;
  linhas.push(
    `${s.file.padEnd(22)} ${col(dim, 10)} ${col((s.bytes / 1024).toFixed(0), 7)} ` +
    `${col(s.wrap_dL.toFixed(2), 7)} ${col(s.wrap_db.toFixed(2), 7)} ${col(s.inner_max_L.toFixed(2), 6)} ` +
    `${col(s.ratio_L.toFixed(2), 6)} ${col(s.ratio_b.toFixed(2), 6)} ${col(s.horizon_dL.toFixed(2), 7)}  ` +
    `${s.pass ? 'ok' : 'QUEBRADO'}`,
  );
  if (!s.pass) falhas.push(`${s.file}: ${s.fails.join(' ; ')}`);
  if (!s.aspect_ok) falhas.push(`${s.file}: ${s.w}×${s.h} não é 2:1 — equirretangular exige 2:1`);
}

if (JSON_OUT) {
  console.log(JSON.stringify({ thresholds, skies, falhas }, null, 2));
} else {
  console.log(linhas.join('\n'));
  console.log(
    `\nportão: reprova se (|ΔL*| > ${thresholds.ABS_L} E razão.L > ${thresholds.REL}) ` +
    `ou (|Δb*| > ${thresholds.ABS_B} E razão.b > ${thresholds.REL}) ` +
    `ou |ΔL*| > ${thresholds.HARD_L} ou |Δb*| > ${thresholds.HARD_B}\n` +
    `razão = costura ÷ maior aresta de coluna INTERNA da mesma imagem.\n` +
    `hzΔL* (faixa do horizonte) é diagnóstico, NÃO portão: acusa 6 dos 8.`,
  );
}

if (tmp) rmSync(tmp, { recursive: true, force: true });

if (MUT) {
  const rotulo = process.argv.includes('--mutante=rampa-estreita')
    ? 'sky_joa original fechado com rampa de 4 colunas (costura some, vira BANDA)'
    : 'sky_rj com metade do matiz girada 40°';
  if (falhas.length) {
    console.log(`\nMUTANTE ✓ régua ficou vermelha em ${rotulo}:`);
    falhas.forEach((f) => console.log(`  ${f}`));
    process.exit(0);
  }
  console.error('\n✗ MUTANTE PASSOU — a régua não morde. Verde dela não vale nada.');
  process.exit(1);
}

if (falhas.length) {
  console.error('');
  falhas.forEach((f) => console.error(`✗ ${f}`));
  process.exit(1);
}
console.log(`\nSKY-SEAM ✓ ${skies.length}/${skies.length} céus fecham o wrap`);
