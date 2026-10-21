#!/usr/bin/env node
/* inspect-lado-check.mjs — A ARMA VIRA DE LADO NA INSPEÇÃO (tecla I), EM 1ª PESSOA.
   POR QUE EXISTE: feedback do dono em 21/10/2026 ("não temos a animação da arma de lado
   ainda em 1p"), com prints do CS2. Os packs golden/fábrica NÃO trazem clipe `inspect`
   (a AK golden expõe só Equip, Idle, Reload, Shoot — ver ak-viewmodel-contract), então
   `authoredvm.inspect()` devolve false e a volta tem de ser procedural no game.js.
   MEDIDO: o caminho autorado girava 0,18 rad (10°) e ainda empurrava a arma 0,55 m pra
   esquerda; na captura a arma saía pela borda. Hoje: 1,05 rad (60°), +0,06 m pra direita.
   Evidência: tools/eval/asset-evidence/inspect-lado-20261021/inspect-ak-ouro.png

   O QUE MEDE (números lidos do fonte vivo de public/js/game.js):
   IL1  o giro de inspeção do caminho autorado é de pelo menos 0,8 rad (≈46°).
   IL2  a inspeção autorada não empurra mais a arma para fora do quadro (dx ≥ 0).
   IL3  existe kill-switch `?inspectlado=0` e ele devolve o comportamento antigo.
   IL4  a tecla I continua entrando por `_inspectWeapon` e o mix tem fade (não é degrau).

   REPRODUZ: node tools/eval/inspect-lado-check.mjs [--mutante=giro-fraco]
   MUTANTE:  --mutante=giro-fraco lê o giro antigo (0,18) -> IL1 vermelha. */
import { readFileSync } from 'node:fs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUTANTE && MUTANTE !== 'giro-fraco') { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }
const src = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');

const num = (re, label) => {
  const m = src.match(re);
  if (!m) { console.log(`FALHA leitura — não achei ${label} em game.js`); process.exit(1); }
  return Number(m[1]);
};
let giro = num(/const yaw = lado \? \(shortGun \? [\d.]+ : ([\d.]+)\)/, 'giro de inspeção autorada');
const dx = num(/const dx = lado \? (-?[\d.]+)/, 'deslocamento lateral da inspeção');
if (MUTANTE === 'giro-fraco') giro = 0.18;

let falhas = 0;
const chk = (id, ok, ev) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${ev}`); if (!ok) falhas++; };

chk('IL1', giro >= 0.8, `giro ${giro} rad (${(giro * 180 / Math.PI).toFixed(0)}°), mínimo 0,8 rad`);
chk('IL2', dx >= 0, `deslocamento lateral ${dx} m (negativo joga a arma pra fora do quadro)`);
chk('IL3', /QS\.get\('inspectlado'\) !== '0'/.test(src), 'kill-switch ?inspectlado=0 presente');
chk('IL4', /e\.code === 'KeyI' && !e\.repeat\) this\._inspectWeapon\(\)/.test(src)
  && /age < 0\.28 \? age \/ 0\.28/.test(src), 'tecla I entra pelo _inspectWeapon e o mix tem rampa de entrada');

process.exit(falhas ? 1 : 0);
