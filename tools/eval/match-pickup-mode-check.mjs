/* MATCH_PICKUP_MODE — #1179: pickups estáticos só saem com TRETA$ ligada.
 * Contratos, baseline e mutante: docs/visual-consistency/PICKUPS-FLASH.md */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JS = path.join(ROOT, 'public/js');
const SHA = 'f4bcffdf2';
const ARSENAL = 12;   // medido: MAPS.quebrada.build -> 12 pickups (campinho-integration ARM/arsenal)
const ALVO_VARIANTE = ['PM2', 'PM3', 'PM4', 'PM5'];   // cláusulas que o antecedente/mutante têm que acender

const CENARIOS = [
  { id: 'PM1', nome: 'economia ligada esvazia arsenal', opts: { economia: true }, espera: 0 },
  { id: 'PM2', nome: 'sem economia mantém arsenal', opts: {}, espera: ARSENAL },
  { id: 'PM3', nome: '?economia=0 mantém arsenal', opts: { economia: true }, qs: '?economia=0', espera: ARSENAL },
  { id: 'PM4', nome: 'dedicado mantém arsenal', opts: { economia: true, dedicated: true }, espera: ARSENAL },
  { id: 'PM5', nome: 'wpnMode awp mantém arsenal', opts: { economia: true, settings: { wpnMode: 'awp' } }, espera: ARSENAL },
];

function parseCLI(argv) {
  if (argv.length === 0) return 'nominal';
  if (argv.length === 1 && argv[0] === '--baseline') return 'baseline';
  if (argv.length === 1 && argv[0] === '--mutante=reintroduz') return 'mutante';
  console.error(`uso: node tools/eval/match-pickup-mode-check.mjs [--baseline|--mutante=reintroduz] — recebido: ${JSON.stringify(argv)}`);
  process.exit(2);
}
const GUARDA = `if (this._ecoLigada) {\n      for (const pk of this.world.pickups || []) pk.mesh?.removeFromParent?.();\n      this.world.pickups = [];\n    }`;
const GUARDA_INCONDICIONAL = GUARDA.replace('if (this._ecoLigada) {', '{ /* mutante: clear incondicional */');

export function fonteMutante(src) {
  if (src.split(GUARDA).length !== 2) throw new Error('mutante: guarda do constructor não é âncora única');
  return src.replace(GUARDA, GUARDA_INCONDICIONAL);
}

/* Módulo-variante em memória: fonte reescrita com imports absolutos, dentro de
   node_modules/.gate-tmp para o shim 'three' do harness resolver. */
export async function gameClasseDe(source, tag) {
  const { initTextures, renderer, sfx, seedRandom, CHARACTERS } =
    await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
  console.info = () => {};
  const textures = initTextures();
  const PERSONAGEM = CHARACTERS.find((c) => c.team === 'E');
  const url = pathToFileURL(JS + '/').href;
  const dir = path.join(ROOT, 'node_modules', '.gate-tmp');
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `game-${tag}.mjs`);
  try {
    fs.writeFileSync(tmp, source.replace(/from '\.\//g, `from '${url}`));
    return (await import(pathToFileURL(tmp).href)).Game;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function boot(GameClass, h, { economia, dedicated = false, settings = {} } = {}) {
  h.seedRandom(12345);
  return new GameClass({
    renderer: h.renderer, textures: h.textures, sfx: h.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1, ...settings },
    playerCharId: h.PERSONAGEM.id, playerTeam: 'E', playerFaction: h.PERSONAGEM.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'quebrada', ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
    economia, dedicated,
  });
}

/* A MESMA medição (boot real nos cenários + drop de abate) serve nominal,
   baseline e mutante — não existe aceitação que não passe por aqui. */
export function medir(GameClass, h) {
  const falhas = [];
  const linhas = [];
  for (const c of CENARIOS) {
    globalThis.location.search = c.qs || '';
    const g = boot(GameClass, h, c.opts);
    g._ensureDolly = () => {};
    g.killsToWin = Infinity;
    g.start ? g.start() : g._startRound();
    try {
      const n = g.world.pickups.length;
      const pass = n === c.espera;
      if (!pass) falhas.push(c.id);
      linhas.push(`${pass ? 'ok ' : 'XX '} ${c.id} ${c.nome}: ${n} (esperado ${c.espera})`);
    } finally {
      g.dispose?.();
    }
  }
  // PM6: drop de abate (fluxo legado) continua nascendo com economia OFF.
  globalThis.location.search = '';
  const g = boot(GameClass, h, {});
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  try {
    const antes = g.drops.length;
    const vit = g.bots.find((b) => b.team !== g.playerTeam && b.alive);
    const att = g.bots.find((b) => b.team === g.playerTeam) || g.player;
    g.time += 0.05; g._kill(vit, att, 'AK', false);
    const pass = g.drops.length > antes;
    if (!pass) falhas.push('PM6');
    linhas.push(`${pass ? 'ok ' : 'XX '} PM6 drop de abate nasce com economia off (${antes}->${g.drops.length})`);
  } finally {
    g.dispose?.();
  }
  return { falhas, linhas };
}

export function clausulasExatamente(falhas, alvo) {
  const f = new Set(falhas), a = new Set(alvo);
  return f.size === a.size && [...a].every((c) => f.has(c));
}

async function main() {
  const modo = parseCLI(process.argv.slice(2));
  const h = await (async () => {
    const mod = await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
    console.info = () => {};
    return {
      renderer: mod.renderer, sfx: mod.sfx, seedRandom: mod.seedRandom,
      textures: mod.initTextures(), PERSONAGEM: mod.CHARACTERS.find((c) => c.team === 'E'),
    };
  })();

  // Nominal primeiro em TODO modo: régua com instrumento quebrado não detecta nada.
  const GameAtual = (await import(pathToFileURL(path.join(JS, 'game.js')).href)).Game;
  const nominal = medir(GameAtual, h);
  console.log(nominal.linhas.join('\n'));
  if (nominal.falhas.length) {
    console.error(`x NOMINAL vermelho (${nominal.falhas.join(',')}) — instrumento quebrado, variante não é detecção`);
    process.exit(1);
  }

  if (modo === 'baseline') {
    const src = execSync(`git show ${SHA}:public/js/game.js`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    const res = medir(await gameClasseDe(src, `baseline-${SHA}`), h);
    console.log(res.linhas.join('\n'));
    console.log(`baseline ${SHA}: falhas=${res.falhas.join(',') || '-'}`);
    if (!clausulasExatamente(res.falhas, ALVO_VARIANTE)) {
      console.error(`x BASELINE tem que acender exatamente ${ALVO_VARIANTE.join(',')} — régua cega ou cláusula extra`);
      process.exit(1);
    }
    console.log(`ok BASELINE ${SHA}: defeito do antecedente detectado em ${ALVO_VARIANTE.length}/${ALVO_VARIANTE.length} cláusulas`);
    return;
  }
  if (modo === 'mutante') {
    const mut = fonteMutante(fs.readFileSync(path.join(JS, 'game.js'), 'utf8'));
    const res = medir(await gameClasseDe(mut, 'mutante-reintroduz'), h);
    console.log(res.linhas.join('\n'));
    console.log(`mutante reintroduz: falhas=${res.falhas.join(',') || '-'}`);
    if (!clausulasExatamente(res.falhas, ALVO_VARIANTE)) {
      console.error(`x MUTANTE tem que acender exatamente ${ALVO_VARIANTE.join(',')} — PM2-PM5 cega ou cláusula extra`);
      process.exit(1);
    }
    console.log(`ok MUTANTE reintroduz detectado (exatamente ${ALVO_VARIANTE.join(',')}; PM1+PM6 verdes)`);
    return;
  }
  console.log(`MATCH_PICKUP_MODE ok · quebrada arsenal=${ARSENAL} · TRETA$ substitui, resto preserva`);
}

const chamadoDireto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (chamadoDireto) await main();
