/* MATCH_PICKUP_MODE — armas grátis no chão SÓ no Javaporcos (dono, 01/11); nele o filtro de
 * modo de armas continua valendo (SÓ AWP não acha fuzil no chão). Mapa comum nasce SEM
 * pickups estáticos, com ou sem loja — arma vem de compra ou de nascimento.
 * Contratos, medições anteriores e mutantes: docs/visual-consistency/PICKUPS-FLASH.md */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JS = path.join(ROOT, 'public/js');
const SHA = 'f0cbe56f6';   // origin/main antes desta mudança: sem loja, mapa comum tinha armas grátis
const ARSENAL = 12;
const AWP = 1, PISTOLS = 2; // Game8ee antes do fix: REVIEW-R71-FIXES-20261101.md.
const MAPA_PICKUP = 'invasao_javaporcos';   // o único mapa com armas grátis no chão
const ALVO_REINTRODUZ = ['PM13'];
const ALVO_LIMPA_TUDO = ['PM1', 'PM2', 'PM3', 'PM4', 'PM5', 'PM7', 'PM9', 'PM10', 'PM11'];   // PM8 espera 0 e passa no mutante
const ALVO_SEM_FILTRO = ['PM5', 'PM7', 'PM8', 'PM9', 'PM10', 'PM11', 'PM12'];
// O main anterior não conhecia o modo Javaporcos (por isso o baseline mede SÓ o recorte
// mapa-comum): lá, mapa sem loja continuava entregando arsenal. É a regra que o dono matou.
const ALVO_BASELINE = ['PM13'];
const FIXTURE_IDS = ['awp', 'pistol', 'deagle', 'ak', '__unknown_pickup__', 'toString', '__proto__', 'constructor'];
const PERMITIDOS = { all: ['awp', 'pistol', 'deagle', 'ak'], awp: ['awp'], pistols: ['pistol', 'deagle'], knife: [] };

const CENARIOS = [
  // No Javaporcos a loja NÃO liga (armas grátis no chão) — nem pedindo economia.
  { id: 'PM1', nome: 'javaporcos: loja não liga, arsenal grátis permanece', opts: { economia: true }, espera: ARSENAL, ecoLigada: false },
  { id: 'PM2', nome: 'javaporcos: sem economia mantém arsenal', opts: {}, espera: ARSENAL },
  { id: 'PM3', nome: 'javaporcos: ?economia=0 mantém arsenal', opts: { economia: true }, qs: '?economia=0', espera: ARSENAL },
  { id: 'PM4', nome: 'javaporcos: dedicado mantém arsenal', opts: { economia: true, dedicated: true }, espera: ARSENAL },
  { id: 'PM5', nome: 'javaporcos awp mantém apenas a AWP medida', opts: { settings: { wpnMode: 'awp' } }, espera: AWP, permitidos: ['awp'] },
  { id: 'PM7', nome: 'javaporcos pistols mantém apenas pistolas medidas', opts: { settings: { wpnMode: 'pistols' } }, espera: PISTOLS, permitidos: ['pistol', 'deagle'] },
  { id: 'PM8', nome: 'javaporcos knife não mantém pickups', opts: { settings: { wpnMode: 'knife' } }, espera: 0, permitidos: [] },
  // MAPA COMUM (dono, 01/11): sem armas grátis no chão, com ou sem loja — regra nova.
  { id: 'PM13', nome: 'mapa comum fica sem armas no chão', opts: {}, espera: 0, mapa: 'quebrada' },
];

function parseCLI(argv) {
  if (argv.length === 0) return 'nominal';
  if (argv.length === 1 && argv[0] === '--baseline') return 'baseline';
  if (argv.length === 1 && argv[0] === '--mutante=reintroduz') return 'reintroduz';
  if (argv.length === 1 && argv[0] === '--mutante=limpa-tudo') return 'limpa-tudo';
  if (argv.length === 1 && argv[0] === '--mutante=sem-filtro') return 'sem-filtro';
  console.error(`uso: node tools/eval/match-pickup-mode-check.mjs [--baseline|--mutante=reintroduz|--mutante=limpa-tudo|--mutante=sem-filtro] — recebido: ${JSON.stringify(argv)}`);
  process.exit(2);
}
/* Âncoras do game.js ATUAL (bloco de pickups do constructor). Cada mutante desliga UMA
   regra: nunca-strip (mapa comum volta a ter armas), limpa-tudo (javaporcos perde o
   arsenal) e sem-filtro (modo de armas para de filtrar). */
const NUNCA_STRIP = `const gratisNoChao = MAPAS_PICKUP_GRATIS.has(this._mapId);`;
const NUNCA_STRIP_MUTADO = `const gratisNoChao = true; /* mutante: todo mapa vira javaporcos */`;
const LIMPA_TUDO = `    if (!gratisNoChao) {`;
const LIMPA_TUDO_MUTADO = `    if (true) { /* mutante: strip sempre */`;
const FILTRO_OFF = `    } else if (!this._ecoLigada) {
      this.world.pickups = (this.world.pickups || []).filter((pk) => {
        if (Object.prototype.hasOwnProperty.call(WEAPONS, pk.weapon) && this._pickupAllowed(pk.weapon)) return true;
        pk.mesh?.removeFromParent?.();
        return false;
      });
    }`;

export function fonteMutante(src, variante) {
  if (variante === 'reintroduz') {
    if (src.split(NUNCA_STRIP).length !== 2) throw new Error('mutante: âncora whitelist não é única');
    return src.replace(NUNCA_STRIP, NUNCA_STRIP_MUTADO);
  }
  if (variante === 'limpa-tudo') {
    if (src.split(LIMPA_TUDO).length !== 2) throw new Error('mutante: âncora do strip não é única');
    return src.replace(LIMPA_TUDO, LIMPA_TUDO_MUTADO);
  }
  if (src.split(FILTRO_OFF).length !== 2) throw new Error('mutante: filtro OFF não é âncora única');
  return src.replace(FILTRO_OFF, '\n    }');
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

function boot(GameClass, h, { economia, dedicated = false, settings = {}, mapa = MAPA_PICKUP } = {}) {
  h.seedRandom(12345);
  return new GameClass({
    renderer: h.renderer, textures: h.textures, sfx: h.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1, ...settings },
    playerCharId: h.PERSONAGEM.id, playerTeam: 'E', playerFaction: h.PERSONAGEM.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: mapa, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
    economia, dedicated,
  });
}

/* O stub do Javaporcos usa o build da Quebrada: o contrato medido aqui é o FILTRO do
   constructor, não a geometria do mapa. Registrado sob o id real do modo horda. */
function comMapaJavaporcos(h, corpo) {
  const build = h.MAPS.quebrada.build;
  h.MAPS[MAPA_PICKUP] = { name: 'invasao_javaporcos (stub da régua)', build };
  try { return corpo(); } finally { delete h.MAPS[MAPA_PICKUP]; }
}

// Baseline e mutantes atravessam os mesmos boots e fixtures de produção.
export function medir(GameClass, h, { refreshObrigatorio = true, recorte = 'todas' } = {}) {
  // o stub do Javaporcos vale para TODOS os boots daqui (os cenários bootam nele)
  return comMapaJavaporcos(h, () => medirInterno(GameClass, h, { refreshObrigatorio, recorte }));
}

function medirInterno(GameClass, h, { refreshObrigatorio = true, recorte = 'todas' } = {}) {
  const falhas = [];
  const linhas = [];
  const cenarios = recorte === 'mapa-comum' ? CENARIOS.filter((c) => c.mapa) : CENARIOS;
  for (const c of cenarios) {
    globalThis.location.search = c.qs || '';
    const g = boot(GameClass, h, { ...c.opts, mapa: c.mapa });
    g._ensureDolly = () => {};
    g.killsToWin = Infinity;
    g.start ? g.start() : g._startRound();
    try {
      const n = g.world.pickups.length;
      const ids = g.world.pickups.map((pk) => pk.weapon);
      const ecoOk = c.ecoLigada === undefined || g._ecoLigada === c.ecoLigada;
      const pass = n === c.espera && ecoOk && (!c.permitidos || ids.every((id) => c.permitidos.includes(id)));
      if (!pass) falhas.push(c.id);
      linhas.push(`${pass ? 'ok ' : 'XX '} ${c.id} ${c.nome}: ${n} (esperado ${c.espera})${c.ecoLigada === undefined ? '' : ` ecoLigada=${g._ecoLigada}`}; ids=${ids.join(',') || '-'}`);
    } finally {
      g.dispose?.();
    }
  }
  if (recorte !== 'mapa-comum') for (const [i, mode] of ['all', 'awp', 'pistols', 'knife'].entries()) {
    const id = `PM${i + 9}`;
    const result = comMapaJavaporcos(h, () => medirFixture(GameClass, h, mode, refreshObrigatorio));
    if (!result.pass) falhas.push(id);
    linhas.push(`${result.pass ? 'ok ' : 'XX '} ${id} fixture ${mode}: ${JSON.stringify(result)}`);
  }
  // PM6: drop de abate (fluxo legado) continua nascendo com economia OFF.
  globalThis.location.search = '';
  const g = boot(GameClass, h, { mapa: 'quebrada' });
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
  const build = h.MAPS[MAPA_PICKUP].build;
  const refresh = GameClass.prototype.refreshPickupModels;
  const temRefresh = typeof refresh === 'function';
  let fixtures = [], validos = [], snapshots = [], builds = 0, game;
  h.MAPS[MAPA_PICKUP].build = function (scene, textures) {
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
    h.MAPS[MAPA_PICKUP].build = build;
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
    const res = medir(await gameClasseDe(src, `baseline-${SHA}`), h, { refreshObrigatorio: false, recorte: 'mapa-comum' });
    console.log(res.linhas.join('\n'));
    console.log(`baseline ${SHA}: falhas=${res.falhas.join(',') || '-'}`);
    if (!clausulasExatamente(res.falhas, ALVO_BASELINE)) {
      console.error(`x BASELINE tem que acender exatamente ${ALVO_BASELINE.join(',')} — régua cega ou cláusula extra`);
      process.exit(1);
    }
    console.log(`ok BASELINE ${SHA}: defeito do antecedente detectado em ${ALVO_BASELINE.length}/${ALVO_BASELINE.length} cláusulas`);
    return;
  }
  const ALVOS = { reintroduz: ALVO_REINTRODUZ, 'limpa-tudo': ALVO_LIMPA_TUDO, 'sem-filtro': ALVO_SEM_FILTRO };
  if (ALVOS[modo]) {
    const mut = fonteMutante(fs.readFileSync(path.join(JS, 'game.js'), 'utf8'), modo);
    const res = medir(await gameClasseDe(mut, `mutante-${modo}`), h);
    console.log(res.linhas.join('\n'));
    console.log(`mutante ${modo}: falhas=${res.falhas.join(',') || '-'}`);
    if (!clausulasExatamente(res.falhas, ALVOS[modo])) {
      console.error(`x MUTANTE ${modo} tem que acender exatamente ${ALVOS[modo].join(',')}`);
      process.exit(1);
    }
    console.log(`ok MUTANTE ${modo} detectado (exatamente ${ALVOS[modo].join(',')})`);
    return;
  }
  console.log(`MATCH_PICKUP_MODE ok · javaporcos all=${ARSENAL} awp=${AWP} pistols=${PISTOLS} knife=0 · mapa comum sem armas no chão · inválidos removidos antes do refresh real`);
}

const chamadoDireto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (chamadoDireto) await main();
