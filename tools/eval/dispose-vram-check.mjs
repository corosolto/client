/* RÉGUA DA VRAM POR PARTIDA: o Game.dispose descartava geometria e ignorava as TEXTURAS
   criadas pela própria partida (furo de bala, poça de sangue, fumaça, bandeira, zona,
   clarão, waypoint, IBL procedural). Cada remount — virada de mapa no MP, revanche —
   deixava os handles WebGL vivos e a memória de vídeo crescia partida após partida, até
   webglcontextlost (que o ops.js já contava). O fix é por POSSE: `_texLocal` registra o
   que este Game criou; o bundle compartilhado (initTextures) e as estáticas dos módulos
   de mapa ficam de fora — o próximo Game usa.

   Uso: node tools/eval/dispose-vram-check.mjs [--mutante=sem-registro] */
import { Game, initTextures, renderer, sfx, PCHAR, seedRandom } from './harness.mjs';
import * as THREE from 'three';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'sem-registro') { console.log(`mutante desconhecido: ${MUT}`); process.exit(1); }

const TEX = initTextures();
let ok = 0, falha = 0;
const cobra = (cond, msg) => { if (cond) { ok++; console.log(`  ok  `, msg); } else { falha++; console.log(`FALHA`, msg); } };

const montaJogo = () => {
  seedRandom(4242);
  const g = new Game({
    renderer, textures: TEX, sfx,
    settings: { bots: 3, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'F', enemyFaction: 'C',
    nickname: 'EU', mapId: 'praca_poderes', ctf: true, testMode: true,
    onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true); g.world.root.updateMatrixWorld(true);
  return g;
};

if (MUT === 'sem-registro') {
  // o comportamento antigo: textura criada sem registro, dispose não tem o que devolver
  Game.prototype._texLocal = function (t) { return t; };
}

const g = montaJogo();

cobra(g._texLocais instanceof Set && g._texLocais.size > 0,
  `o Game registra as texturas que cria (${g._texLocais ? g._texLocais.size : 0} em ${g.mapId} com CTF)`);

const compartilhadas = new Set(Object.values(TEX).filter((v) => v && v.isTexture));
const vazouCompartilhada = [...(g._texLocais || [])].some((t) => compartilhadas.has(t));
cobra(!vazouCompartilhada,
  'nenhuma textura do bundle COMPARTILHADO entra no registro (o próximo Game as usa)');

// o disparo de dispose é observável sem WebGL: THREE emite evento 'dispose' na textura
const amostra = [...(g._texLocais || [])];
const descartadas = new Set();
for (const t of amostra) t.addEventListener('dispose', () => descartadas.add(t));
g.dispose();
cobra(amostra.length > 0 && descartadas.size === amostra.length,
  `dispose devolve TODAS as texturas da partida (${descartadas.size}/${amostra.length} receberam dispose)`);

cobra(g._texLocais === null, 'e o registro morre junto com o Game (não segura referência)');

if (MUT) {
  const acendeu = falha > 0;
  console.log(acendeu ? `\nmutante "${MUT}" DETECTADO — a régua morde` : `\nmutante "${MUT}" NÃO detectado — a régua não morde`);
  process.exit(acendeu ? 0 : 1);
}
console.log(`\n${falha ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falha} falha(s)`);
process.exit(falha ? 1 : 0);
