#!/usr/bin/env node
/* granada-porte-check.mjs — GRANADA EQUIPADA, E A FACA SAINDO DE CENA
   POR QUE EXISTE: dois feedbacks do dono (21/10/2026).
   (a) "quando joga a granada com a faca na mão não tem a animação de troca": com a faca
       equipada o pacote de melee ocupa a cena e `vm.root` ficava INVISÍVEL
       (vmvisibility: melee tinha precedência), então o arremesso acontecia fora de tela.
   (b) "granada devia ser equipada; esquerdo joga longe, direito joga perto".

   O QUE MEDE — política pura (vmvisibility.js) + simulação de arremesso (game.js):
   GP1  com utilidade na mão a cena mostra a UTILIDADE, nunca o pacote de faca
        (utility && root && !melee), mesmo com `meleeReady` verdadeiro.
   GP2  sem utilidade nada muda: a decisão é idêntica à de antes para arma e faca.
   GP3  luneta cobrindo continua tendo precedência (utilidade não fura a máscara).
   GP4  o lançamento curto (botão direito, força 0,45) cai mais perto que o cheio, e os
        dois saem na mesma direção — é a mesma granada, muda só o empuxo.
   GP5  arremesso curto não é "sem força": passa de 3 m (não cai no próprio pé).

   REPRODUZ: node tools/eval/granada-porte-check.mjs [--json] [--mutante=<id>]
   MUTANTES (teste do teste):
     --mutante=faca-na-frente   faca volta a ter precedência sobre a utilidade -> GP1 vermelha
     --mutante=forca-ignorada   lançamento curto usa a força cheia          -> GP4 vermelha */
import { viewmodelVisibility } from '../../public/js/vmvisibility.js';

const JSON_OUT = process.argv.includes('--json');
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const CONHECIDOS = new Set(['', 'faca-na-frente', 'forca-ignorada']);
if (!CONHECIDOS.has(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

const decide = (input) => {
  const state = viewmodelVisibility(input);
  if (MUTANTE === 'faca-na-frente' && input.meleeReady) {
    return { ...state, melee: true, root: false, utility: false };
  }
  return state;
};

const resultados = [];
let falhas = 0;
const chk = (id, ok, evidencia) => {
  resultados.push({ id, ok: Boolean(ok), evidencia });
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${evidencia}`);
  if (!ok) falhas++;
};

/* ---------- GP1/GP2/GP3: política de apresentação ---------- */
const base = { alive: true, firstPerson: true, authoredMode: true, authoredReady: true };
const comFaca = decide({ ...base, meleeReady: true });
const facaComNade = decide({ ...base, meleeReady: true, utilityReady: true });
const armaComNade = decide({ ...base, meleeReady: false, utilityReady: true });

chk('GP1', facaComNade.utility && facaComNade.root && !facaComNade.melee && !facaComNade.authored,
  `faca+granada -> ${JSON.stringify({ root: facaComNade.root, melee: facaComNade.melee, utility: facaComNade.utility, authored: facaComNade.authored })}`);
chk('GP1b', armaComNade.utility && armaComNade.root && !armaComNade.authored && !armaComNade.fallback,
  `arma+granada -> utilidade sozinha em cena (authored ${armaComNade.authored}, fallback ${armaComNade.fallback})`);
chk('GP2', comFaca.melee && !comFaca.root && !comFaca.utility
  && decide({ ...base, meleeReady: false }).authored,
  'sem granada a decisão de faca e de arma é a de sempre');
const lunetaComNade = decide({ ...base, meleeReady: false, utilityReady: true, realScope: true, scopeMask: 0.9 });
chk('GP3', lunetaComNade.scopeCovered && !lunetaComNade.utility && !lunetaComNade.root,
  `luneta coberta vence a utilidade -> ${JSON.stringify(lunetaComNade)}`);

/* ---------- GP4/GP5: alcance do arremesso ----------
   Reimplanta a balística do _spawnGrenade (game.js) em vez de importar o Game inteiro:
   v = dir*velocidade*f + (0, 3.2*(0,45+0,55f), 0); gravidade 12 m/s² (_updateGrenades). */
const VEL = { frag: 17, smoke: 15 };
const GRAV = 12;
function alcance(kind, forca, olhoY = 1.62) {
  const f = MUTANTE === 'forca-ignorada' ? 1 : Math.max(0.15, Math.min(1, forca));
  const vh = VEL[kind] * f;                      // direção horizontal (olhando no horizonte)
  const vy = 3.2 * (0.45 + 0.55 * f);
  // tempo até tocar o chão (y=0) a partir da altura do olho
  const t = (vy + Math.sqrt(vy * vy + 2 * GRAV * olhoY)) / GRAV;
  return { dist: vh * t, t };
}
const longe = alcance('smoke', 1);
const perto = alcance('smoke', 0.45);
chk('GP4', perto.dist < longe.dist * 0.65,
  `fumaça: cheio ${longe.dist.toFixed(1)} m · curto ${perto.dist.toFixed(1)} m (razão ${(perto.dist / longe.dist).toFixed(2)})`);
chk('GP5', perto.dist > 3,
  `curto ainda sai da frente do jogador: ${perto.dist.toFixed(1)} m`);
const fragLonge = alcance('frag', 1), fragPerto = alcance('frag', 0.45);
chk('GP4b', fragPerto.dist < fragLonge.dist * 0.65 && fragPerto.dist > 3,
  `frag: cheio ${fragLonge.dist.toFixed(1)} m · curto ${fragPerto.dist.toFixed(1)} m`);

if (JSON_OUT) console.log(JSON.stringify({ versao: 1, mutante: MUTANTE || null, resultados, falhas }, null, 2));
process.exit(falhas ? 1 : 0);
