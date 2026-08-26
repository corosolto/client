/* ============================================================================
   sky-foreground-check.mjs — CÉU DE JOGO NÃO TEM PRIMEIRO PLANO ASSADO.
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA PREMIA NÃO EXISTIR
   O dono (r2 da mansão): "o horizonte está com um efeito muito estranho". O palpite
   óbvio era a COSTURA — e foi REFUTADO antes de qualquer conserto: o
   `tools/eval/sky-seam-check.mjs` media o `sky_joa.webp` da r1 em ΔL* -0,96 / Δb*
   -0,03, verde com folga, e o `eval:look` media fog == horizonte em ΔE76 0,0. As
   duas réguas que existiam estavam verdes sobre um céu errado.

   O erro estava em outro lugar, e a olho é óbvio: `sky_joa.webp` NÃO era panorama.
   Era uma foto RETILÍNEA de varanda de mansão — deck de pedra, piscina de borda
   infinita, espreguiçadeiras, jardineira e um coqueiro — esticada para 2:1 e servida
   como equirretangular em `map_sky.js`. Num equirretangular a linha y=H/2 é a
   elevação 0 e a metade de baixo é TUDO que está abaixo do horizonte: o jogador
   ficava cercado, no infinito, por um deck de pedra e por móveis do tamanho do mundo,
   com folha de coqueiro na altura do olho. Daí o "efeito estranho". A prova de que a
   r1 já sabia disso sem nomear está na cláusula H2 do `mansao-beach-check.mjs`, que
   proíbe relevo 3D "no setor em que o sky_joa.webp já tem terra assada" — trabalhar
   em volta do defeito em vez de medi-lo.

   O QUE MEDE (S1)
   O DESVIO-PADRÃO da luminância L* na BANDA DO EQUADOR — as linhas y = H/2 ± 1,5%H,
   que é exatamente o que a câmera na altura do olho amostra girando 360°. Um panorama
   de horizonte distante (mar, serra, skyline) varia pouco de coluna a coluna nessa
   banda. Objeto de PRIMEIRO PLANO na altura do olho — folha de coqueiro, poste,
   espreguiçadeira, jardineira — crava colunas escuras e claras e o desvio dispara.
   A medida não depende de frame renderizado nem de browser.

   O LIMIAR E SUA PROCEDÊNCIA (Lei 2) — é RATCHET, não JND
   Medido nos 8 céus da árvore no commit que introduz esta régua:
     sky_rj 2,00 · sky_brasilia 3,20 · sky_havan 3,34 · sky_sp 3,99 ·
     sky_quebrada 7,95 · sky_ferrovelho 8,42 · sky_pool 11,46 || sky_joa(r1) 16,43
   Os sete céus que nunca foram questionados cabem em [2,00; 11,46]; o único que o
   dono reprovou está 43% acima do pior deles. TETO = 12,0 ≈ 1,05× o pior aceito:
   passa a árvore inteira como ela está e reprova o defeito relatado. Não é um número
   de percepção — é o topo medido do que já foi aceito, e ele só desce.
   O `sky_joa` da r2 (panorama de mar aberto, sem primeiro plano) mede 3,21.

   MUTANTE (Lei 3)
   `--mutante=movel-no-olho` cola uma faixa escura de "mobília" em 6% das colunas na
   banda do equador do `sky_rj` — o céu de MENOR desvio da árvore (2,00). Se a régua
   não ficar vermelha nisso, o verde dela não vale nada.

   Uso:
     node tools/eval/sky-foreground-check.mjs
     node tools/eval/sky-foreground-check.mjs --mutante=movel-no-olho
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOTOR = join(HERE, 'sky_foreground.py');
const MUT = process.argv.includes('--mutante=movel-no-olho');
const TETO = 12.0;

function py(args) {
  const r = spawnSync('python3', [MOTOR, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.error(`✗ motor de medida falhou: ${r.stderr || r.stdout}`); process.exit(2); }
  return JSON.parse(r.stdout);
}

let tmp = null, alvos = [];
if (MUT) {
  tmp = mkdtempSync(join(tmpdir(), 'sky-fg-'));
  const out = join(tmp, 'sky_mutante.webp');
  py(['mutate', '--src', 'sky_rj', '--out', out]);
  alvos = [out];
}

const { skies } = py(['measure', ...alvos]);
const col = (s, n) => String(s).padStart(n);
console.log(`${'textura'.padEnd(22)} ${col('dim', 10)} ${col('eqSD', 7)}  veredito`);
const falhas = [];
for (const s of skies) {
  const ok = s.eq_sd <= TETO;
  console.log(`${s.file.padEnd(22)} ${col(`${s.w}×${s.h}`, 10)} ${col(s.eq_sd.toFixed(2), 7)}  ${ok ? 'ok' : 'QUEBRADO'}`);
  if (!ok) falhas.push(`${s.file}: desvio L* na banda do equador ${s.eq_sd.toFixed(2)} > ${TETO} — primeiro plano assado na altura do olho`);
}
console.log(`\nportão: reprova se o desvio-padrão de L* na banda do equador (y = H/2 ± 1,5%H) > ${TETO}.`);

if (tmp) rmSync(tmp, { recursive: true, force: true });

if (MUT) {
  if (falhas.length) {
    console.log('\nMUTANTE ✓ régua ficou vermelha em sky_rj com faixa de mobília na altura do olho:');
    falhas.forEach((f) => console.log(`  ${f}`));
    process.exit(0);
  }
  console.error('\n✗ MUTANTE PASSOU — a régua não morde. Verde dela não vale nada.');
  process.exit(1);
}
if (falhas.length) { console.error(''); falhas.forEach((f) => console.error(`✗ ${f}`)); process.exit(1); }
console.log(`\nSKY-FOREGROUND ✓ ${skies.length}/${skies.length} céus sem primeiro plano na altura do olho`);
