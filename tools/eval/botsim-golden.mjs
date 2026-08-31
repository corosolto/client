/* ============================================================================
   botsim-golden.mjs — GOLDEN DA NAVEGAÇÃO DOS BOTS (o irmão da movimento-golden).
   ----------------------------------------------------------------------------
   POR QUE existe (31/08): o dono reportou "os bots estao malucos andando em roda"
   na branch do multiplayer. A movimento-golden congela a trajetória do JOGADOR;
   os BOTS não tinham golden nenhum — uma regressão de steering da IA passaria o
   portão inteiro em verde. A medição daquele dia refutou a regressão (botsim
   byte a byte idêntico à main nos 3 mapas do relato), mas o buraco de cobertura
   é real e é este arquivo que o fecha.

   COMO mede: roda o botsim REAL (child process, semeado, determinístico) em 2
   mapas e compara as métricas de "bot maluco" com o baseline congelado:
     spinTurns/spinRoam  — girando parado (a "roda" do relato)
     latFlips            — ziguezague lateral
     stuckPct            — bot travado
     eff                 — deslocamento líquido / caminho (0 = milling)
   A banda é LARGA de propósito (ver LIMITES): o fluxo do Math.random semeado
   muda com qualquer textura/objeto novo no construtor (BUG do movimento-golden
   #405), então banda apertada viraria vermelho de prosa — e "vermelho que não
   corresponde a defeito ensina a ignorar vermelho". A banda só acusa a direção
   do DEFEITO (girar/travar mais, render menos), com folga medida.

   Uso:
     node tools/eval/botsim-golden.mjs               # compara com o baseline
     node tools/eval/botsim-golden.mjs --write       # congela o baseline
     node tools/eval/botsim-golden.mjs --mutante=pirueta
       # reintroduz o defeito (deriva de rumo 3 rad/s via SIM_MUT_YAW, o gancho
       # __mutBotYaw do _updateBot) e EXIGE vermelho — sai 1 se a régua não morder.
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.join(HERE, 'botsim-golden.json');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const MUTANTE = (args.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';

const SECS = 60;                              // 60 s × 9 sementes ≈ 7 s de parede por mapa
const MAPAS = ['velho_oeste', 'upa_24h'];     // os mapas dos screenshots do relato de 31/08

/* Direção do defeito + folga. `rel` multiplica o baseline, `abs` é o piso pra métrica
   quase-zero (spinRoam 0.03 não pode ter banda proporcional — 10% de 0.03 é ruído de
   arredondamento do próprio botsim, que imprime com 3 casas). */
const LIMITES = {
  spinTurns: { rel: 1.6, abs: 0.12, dir: 'max' },
  spinRoam:  { rel: 1.6, abs: 0.05, dir: 'max' },
  latFlips:  { rel: 1.6, abs: 2.5,  dir: 'max' },
  stuckPct:  { rel: 1.6, abs: 3.0,  dir: 'max' },
  eff:       { rel: 0.5, abs: 0.01, dir: 'min' },
};

function roda(mapId, mutYaw = 0) {
  const env = { ...process.env };
  if (mutYaw) env.SIM_MUT_YAW = String(mutYaw);
  const saida = execFileSync(process.execPath, [path.join(HERE, 'botsim.mjs'), String(SECS), mapId],
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 24 });
  // o botsim loga "[times] ..." antes do JSON — o payload começa na linha que é só "["
  const ini = saida.search(/^\[$/m), fim = saida.lastIndexOf(']');
  const arr = JSON.parse(saida.slice(ini, fim + 1));
  if (!arr[0] || arr[0].err) throw new Error(`botsim falhou em ${mapId}: ${arr[0] && arr[0].err}`);
  return arr[0];
}

function compara(base, atual) {
  const erros = [];
  for (const m of MAPAS) {
    const b = base[m], a = atual[m];
    if (!b || !a) { erros.push(`${m}: caso ausente (baseline ${!!b}, medição ${!!a}) — régua não pode passar por vacuidade`); continue; }
    for (const [k, L] of Object.entries(LIMITES)) {
      if (!(k in b) || !(k in a)) { erros.push(`${m}.${k}: métrica ausente`); continue; }
      if (L.dir === 'max') {
        const teto = b[k] * L.rel + L.abs;
        if (a[k] > teto) erros.push(`${m}.${k}: ${a[k]} > teto ${teto.toFixed(3)} (baseline ${b[k]}) — bot mais maluco que o congelado`);
      } else {
        const piso = b[k] * L.rel - L.abs;
        if (a[k] < piso) erros.push(`${m}.${k}: ${a[k]} < piso ${piso.toFixed(3)} (baseline ${b[k]}) — bot rende menos caminho que o congelado`);
      }
    }
  }
  return erros;
}

const mutYaw = MUTANTE === 'pirueta' ? 3 : MUTANTE ? (() => { throw new Error(`mutante desconhecido: ${MUTANTE}`); })() : 0;
const atual = {};
for (const m of MAPAS) atual[m] = roda(m, mutYaw);

if (WRITE) {
  fs.writeFileSync(BASELINE, JSON.stringify(atual, null, 1));
  console.log(`[botsim-golden] baseline congelado (${MAPAS.join(', ')}, ${SECS}s × sementes do botsim)`);
  process.exit(0);
}
if (!fs.existsSync(BASELINE)) { console.error('[botsim-golden] sem baseline — rode com --write'); process.exit(2); }
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const erros = compara(base, atual);

if (MUTANTE) {
  /* A mutação DESFAZ a régua? Então a régua é teatro — o script se denuncia (lei 2). */
  if (!erros.length) { console.error(`[botsim-golden] MUTANTE '${MUTANTE}' PASSOU — a régua não morde`); process.exit(1); }
  console.log(`[botsim-golden] mutante '${MUTANTE}' reprovado como devia (${erros.length} cláusula(s)):`);
  for (const e of erros) console.log(`  ${e}`);
  process.exit(0);
}
if (erros.length) {
  for (const e of erros) console.error(`[botsim-golden] ${e}`);
  console.error(`[botsim-golden] REPROVADO — ${erros.length} métrica(s) fora da banda`);
  process.exit(1);
}
console.log(`[botsim-golden] OK — bots dentro do golden em ${MAPAS.join(' e ')}`);
