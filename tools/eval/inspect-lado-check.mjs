#!/usr/bin/env node
/* inspect-lado-check.mjs — A ARMA VIRA DE LADO NA INSPEÇÃO (tecla I), EM 1ª PESSOA.
   POR QUE EXISTE: feedback do dono em 21/10/2026 ("não temos a animação da arma de lado
   ainda em 1p"), com prints do CS2. Os packs golden/fábrica NÃO trazem clipe `inspect`
   (a AK golden expõe só Equip, Idle, Reload, Shoot — ver ak-viewmodel-contract), então
   `authoredvm.inspect()` devolve false e a volta tem de ser procedural no game.js.

   MEDIDO: o caminho autorado girava 0,18 rad (10°) e ainda empurrava a arma 0,55 m pra
   esquerda — na captura a arma saía pela borda. Em 22/10 a calibração desceu de 1,05 para
   0,70 rad: com 1,05 o giro trazia para o centro do quadro a BOCA OCA da manga do pacote
   golden (`coro_solto_hires_project_sleeves` tem 2 laços de borda abertos, de 32 e 24
   vértices — defeito de ASSET, fora do alcance deste runtime). Com 0,70 a arma aparece
   inteira de lado e o punho direito sai do centro.
   Evidência: tools/eval/asset-evidence/inspect-lado-20261022/

   O QUE MEDE (números lidos do fonte vivo de public/js/game.js):
   IL1  o giro de inspeção autorado fica entre 0,6 e 0,9 rad (34°–52°): abaixo não lê como
        inspeção, acima enquadra a manga oca.
   IL2  a inspeção autorada não empurra mais a arma para fora do quadro (dx ≥ 0).
   IL3  existe kill-switch `?inspectlado=0`, que devolve o comportamento antigo.
   IL4  a tecla I continua entrando por `_inspectWeapon` e o mix tem rampa (não é degrau).
   IL5  a calibração é A/B-ável por `?inspecttune=dx,dy,dz,yaw,roll,encolhe`.

   REPRODUZ: node tools/eval/inspect-lado-check.mjs [--mutante=<id>]
   MUTANTES: giro-fraco  -> volta aos 0,18 rad          -> IL1 vermelha
             giro-exagerado -> 1,05 rad (manga oca no quadro) -> IL1 vermelha */
import { readFileSync } from 'node:fs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUTANTE && !['giro-fraco', 'giro-exagerado'].includes(MUTANTE)) {
  console.error(`mutante desconhecido: ${MUTANTE}`);
  process.exit(2);
}
const src = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');

const num = (re, label) => {
  const m = src.match(re);
  if (!m) { console.log(`FALHA leitura — não achei ${label} em game.js`); process.exit(1); }
  return Number(m[1]);
};
let giro = num(/const yaw = lado \? T\(3, shortGun \? [\d.]+ : ([\d.]+)\)/, 'giro de inspeção autorada');
const dx = num(/const dx = lado \? T\(0, (-?[\d.]+)\)/, 'deslocamento lateral da inspeção');
if (MUTANTE === 'giro-fraco') giro = 0.18;
if (MUTANTE === 'giro-exagerado') giro = 1.05;

let falhas = 0;
const chk = (id, ok, ev) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${ev}`); if (!ok) falhas++; };

chk('IL1', giro >= 0.6 && giro <= 0.9,
  `giro ${giro} rad (${(giro * 180 / Math.PI).toFixed(0)}°), janela 0,6–0,9 rad`);
chk('IL2', dx >= 0, `deslocamento lateral ${dx} m (negativo joga a arma pra fora do quadro)`);
chk('IL3', /QS\.get\('inspectlado'\) !== '0'/.test(src), 'kill-switch ?inspectlado=0 presente');
chk('IL4', /e\.code === 'KeyI' && !e\.repeat\) this\._inspectWeapon\(\)/.test(src)
  && /age < 0\.28 \? age \/ 0\.28/.test(src), 'tecla I entra pelo _inspectWeapon e o mix tem rampa de entrada');
chk('IL5', /QS\.get\('inspecttune'\)/.test(src), 'calibração A/B por ?inspecttune presente');

process.exit(falhas ? 1 : 0);
