/* MATCH_PICKUP_MODE — loja substitui; OFF conserva somente os pickups permitidos.
 * Contratos, medições anteriores e mutantes: docs/visual-consistency/PICKUPS-FLASH.md */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JS = path.join(ROOT, 'public/js');
const SHA = 'f4bcffdf2';
const ARSENAL = 12;
const AWP = 1, PISTOLS = 2; // Game8ee antes do fix: REVIEW-R71-FIXES-20261101.md.
const ALVO_VARIANTE = ['PM2', 'PM3', 'PM4', 'PM5', 'PM7', 'PM9', 'PM10', 'PM11'];
const ALVO_SEM_FILTRO = ['PM5', 'PM7', 'PM8', 'PM9', 'PM10', 'PM11', 'PM12'];
const FIXTURE_IDS = ['awp', 'pistol', 'deagle', 'ak', '__unknown_pickup__', 'toString', '__proto__', 'constructor'];
const PERMITIDOS = { all: ['awp', 'pistol', 'deagle', 'ak'], awp: ['awp'], pistols: ['pistol', 'deagle'], knife: [] };

const CENARIOS = [
  { id: 'PM1', nome: 'economia ligada esvazia arsenal', opts: { economia: true }, espera: 0 },
  { id: 'PM2', nome: 'sem economia mantém arsenal', opts: {}, espera: ARSENAL },
  { id: 'PM3', nome: '?economia=0 mantém arsenal', opts: { economia: true }, qs: '?economia=0', espera: ARSENAL },
  { id: 'PM4', nome: 'dedicado mantém arsenal', opts: { economia: true, dedicated: true }, espera: ARSENAL },
  { id: 'PM5', nome: 'awp mantém apenas a AWP medida', opts: { economia: true, settings: { wpnMode: 'awp' } }, espera: AWP, permitidos: ['awp'] },
  { id: 'PM7', nome: 'pistols mantém apenas pistolas medidas', opts: { settings: { wpnMode: 'pistols' } }, espera: PISTOLS, permitidos: ['pistol', 'deagle'] },
  { id: 'PM8', nome: 'knife não mantém pickups', opts: { settings: { wpnMode: 'knife' } }, espera: 0, permitidos: [] },
];

function parseCLI(argv) {
  if (argv.length === 0) return 'nominal';
  if (argv.length === 1 && argv[0] === '--baseline') return 'baseline';
  if (argv.length === 1 && argv[0] === '--mutante=reintroduz') return 'mutante';
  if (argv.length === 1 && argv[0] === '--mutante=sem-filtro-off') return 'sem-filtro';
  console.error(`uso: node tools/eval/match-pickup-mode-check.mjs [--baseline|--mutante=reintroduz|--mutante=sem-filtro-off] — recebido: ${JSON.stringify(argv)}`);
  process.exit(2);
}
const GUARDA = `if (this._ecoLigada) {\n      for (const pk of this.world.pickups || []) pk.mesh?.removeFromParent?.();\n      this.world.pickups = [];\n    }`;
const GUARDA_INCONDICIONAL = GUARDA.replace('if (this._ecoLigada) {', '{ /* mutante: clear incondicional */');

export function fonteMutante(src) {
  if (src.split(GUARDA).length !== 2) throw new Error('mutante: guarda do constructor não é âncora única');
  return src.replace(GUARDA, GUARDA_INCONDICIONAL);
}

const FILTRO_OFF = `    if (!this._ecoLigada) {
      this.world.pickups = (this.world.pickups || []).filter((pk) => {
        if (Object.prototype.hasOwnProperty.call(WEAPONS, pk.weapon) && this._pickupAllowed(pk.weapon)) return true;
        pk.mesh?.removeFromParent?.();
        return false;
      });
    }`;

function fonteSemFiltro(src) {
  if (src.split(FILTRO_OFF).length !== 2) throw new Error('mutante: filtro OFF não é âncora única');
  return src.replace(FILTRO_OFF, '');
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

// Baseline e mutantes atravessam os mesmos boots e fixtures de produção.
export function medir(GameClass, h, { refreshObrigatorio = true } = {}) {
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
      const ids = g.world.pickups.map((pk) => pk.weapon);
      const pass = n === c.espera && (!c.permitidos || ids.every((id) => c.permitidos.includes(id)));
      if (!pass) falhas.push(c.id);
      linhas.push(`${pass ? 'ok ' : 'XX '} ${c.id} ${c.nome}: ${n} (esperado ${c.espera}); ids=${ids.join(',') || '-'}`);
    } finally {
      g.dispose?.();
    }
  }
  for (const [i, mode] of ['all', 'awp', 'pistols', 'knife'].entries()) {
    const id = `PM${i + 9}`;
    const result = medirFixture(GameClass, h, mode, refreshObrigatorio);
    if (!result.pass) falhas.push(id);
    linhas.push(`${result.pass ? 'ok ' : 'XX '} ${id} fixture ${mode}: ${JSON.stringify(result)}`);
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

function medirFixture(GameClass, h, mode, refreshObrigatorio) {
  const build = h.MAPS.quebrada.build;
  const refresh = GameClass.prototype.refreshPickupModels;
  const temRefresh = typeof refresh === 'function';
  let fixtures = [], validos = [], snapshots = [], builds = 0, game;
  h.MAPS.quebrada.build = function (scene, textures) {
    const world = build.call(this, scene, textures);
    builds++;
    validos = world.pickups.filter((pk) => mode === 'all' || (mode === 'awp' && pk.weapon === 'awp') || (mode === 'pistols' && ['pistol', 'deagle'].includes(pk.weapon)));
    fixtures = FIXTURE_IDS.map((weapon) => {
      const mesh = new h.THREE.Mesh(new h.THREE.BoxGeometry(.1, .1, .1), new h.THREE.MeshBasicMaterial());
      scene.add(mesh);
      return { ...world.pickups[0], weapon, mesh };
    });
    world.pickups.push(...fixtures);
    return world;
  };
  if (temRefresh) {
    GameClass.prototype.refreshPickupModels = function (...args) {
      snapshots.push(fixtures.map((pk) => ({ weapon: pk.weapon, retained: this.world.pickups.includes(pk), attached: pk.mesh.parent !== null })));
      return refresh.apply(this, args);
    };
  }
  globalThis.location.search = '';
  try {
    game = boot(GameClass, h, { settings: { wpnMode: mode } });
    const esperados = PERMITIDOS[mode];
    const fixtureOK = (snapshot) => snapshot.every((pk) => pk.retained === esperados.includes(pk.weapon) && pk.attached === esperados.includes(pk.weapon));
    const final = fixtures.map((pk) => ({ weapon: pk.weapon, retained: game.world.pickups.includes(pk), attached: pk.mesh.parent !== null }));
    const refsOK = validos.every((pk) => game.world.pickups.includes(pk));
    const quantidade = game.world.pickups.length === validos.length + esperados.length;
    const tempoOK = !refreshObrigatorio || snapshots.length > 0;
    return { pass: builds === 1 && tempoOK && snapshots.every(fixtureOK) && fixtureOK(final) && refsOK && quantidade, builds, temRefresh, refreshObrigatorio, beforeRealRefresh: snapshots, final, refsOK, retained: game.world.pickups.length, expected: validos.length + esperados.length };
  } finally {
    h.MAPS.quebrada.build = build;
    if (temRefresh) GameClass.prototype.refreshPickupModels = refresh;
    game?.dispose?.();
  }
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
      textures: mod.initTextures(), PERSONAGEM: mod.CHARACTERS.find((c) => c.team === 'E'), MAPS: mod.MAPS, THREE: mod.THREE,
    };
  })();

  // Nominal primeiro em TODO modo: régua com instrumento quebrado não detecta nada.
  const GameAtual = (await import(pathToFileURL(path.join(JS, 'game.js')).href)).Game;
  const nominal = medir(GameAtual, h);
  console.log(nominal.linhas.join('\n'));
  if (nominal.falhas.length) {
    console.error(`x NOMINAL vermelho (${nominal.falhas.join(',')}) — contrato violado; variante não avaliada`);
    process.exit(1);
  }

  if (modo === 'baseline') {
    const src = execSync(`git show ${SHA}:public/js/game.js`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    const res = medir(await gameClasseDe(src, `baseline-${SHA}`), h, { refreshObrigatorio: false });
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
      console.error(`x MUTANTE tem que acender exatamente ${ALVO_VARIANTE.join(',')} — régua cega ou cláusula extra`);
      process.exit(1);
    }
    console.log(`ok MUTANTE reintroduz detectado (exatamente ${ALVO_VARIANTE.join(',')}; PM1+PM6 verdes)`);
    return;
  }
  if (modo === 'sem-filtro') {
    const mut = fonteSemFiltro(fs.readFileSync(path.join(JS, 'game.js'), 'utf8'));
    const res = medir(await gameClasseDe(mut, 'mutante-sem-filtro-off'), h);
    console.log(res.linhas.join('\n'));
    console.log(`mutante sem-filtro-off: falhas=${res.falhas.join(',') || '-'}`);
    if (!clausulasExatamente(res.falhas, ALVO_SEM_FILTRO)) {
      console.error(`x MUTANTE OFF tem que acender exatamente ${ALVO_SEM_FILTRO.join(',')}`);
      process.exit(1);
    }
    console.log('ok MUTANTE sem-filtro-off detectado; nominal preservado no disco');
    return;
  }
  console.log(`MATCH_PICKUP_MODE ok · all=${ARSENAL} awp=${AWP} pistols=${PISTOLS} knife=0 · inválidos removidos antes do refresh real`);
}

const chamadoDireto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (chamadoDireto) await main();
