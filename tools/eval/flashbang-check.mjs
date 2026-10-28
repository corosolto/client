// CONTRATO DA FLASHBANG (pedido do dono, 28/10): cegueira estilo CS medida no jogo de
// verdade (harness em Node, raycast real contra parede de verdade).
//   (1) matriz cegueira × frente/lado/costas × perto/longe × com/sem parede
//   (2) fumaça opaca tapa a luz como parede
//   (3) teto 4,8 s
//   (4) arremesso real: equipar 6, lançar, pavio, estouro chama a cegueira
//   (5) bot cego não pega alvo e a mira não desce do erro de cego; sem flash, pega
//   (6) online sem `meta.flash` recusa a flash; com, libera
//   (7) ?flash=0 tira a granada; ?flashes=N só vale com ?debug=1 (processos filhos)
// Mutantes: tools/eval/flashbang-mutate.mjs (`npm run mut:flashbang`).
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SELF = fileURLToPath(import.meta.url);
const option = (n) => process.argv.find((a) => a.startsWith(n + '='))?.slice(n.length + 1);
const gameArg = option('--game-module');
const gameFile = path.resolve(gameArg || path.join(ROOT, 'public/js/game.js'));
const modo = option('--modo') || 'principal';

const { THREE, initTextures, renderer, sfx, seedRandom, CHARACTERS } =
  await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
const { Game } = await import(pathToFileURL(gameFile));

function boot() {
  seedRandom(12345);
  const playerDef = CHARACTERS.find((c) => c.team === 'E') || CHARACTERS[0];
  const g = new Game({
    renderer, textures: initTextures(), sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: playerDef.id, playerTeam: 'E', playerFaction: playerDef.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'ferro_velho', ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  return g;
}

const rows = [];
const check = (name, pass, observed = {}) => rows.push({ name, pass: !!pass, observed });
const r2 = (v) => Math.round(v * 100) / 100;

function fim(scope) {
  const failed = rows.filter((r) => !r.pass).map((r) => r.name);
  console.log(JSON.stringify({ passed: rows.length - failed.length, total: rows.length, failed, scope,
    rows: rows.map((r) => ({ name: r.name, pass: r.pass, observed: r.observed })) }, null, 1));
  process.exit(failed.length ? 1 : 0);   // boot real deixa handle pendurado
}

/* ---------- processos filhos: as flags de URL são lidas no import do game.js ---------- */
if (modo === 'killswitch') {
  const g = boot();
  g.state = 'live';
  g.player.flashes = 5;
  check('?flash=0: tecla 6 não equipa', g._equipNade('flash') === false, { nade: g.player.nade });
  const r = g._popFlash(new THREE.Vector3(0, 1, 0), null);
  check('?flash=0: estouro não cega ninguém', r === undefined && !g._cegoJ, { r: r ?? null });
  g._resetPositions?.();
  check('?flash=0: rodada não dá flash', (g.player.flashes | 0) === 0 || !g._flashLiberada(), { flashes: g.player.flashes });
  fim('kill-switch');
}
if (modo === 'debug') {
  const g = boot();
  console.error('flashes', g.player.flashes);
  check(`${process.env.SIM_QS}: estoque da rodada`, (g.player.flashes | 0) === Number(option('--espera')),
    { flashes: g.player.flashes, espera: option('--espera') });
  fim('debug');
}

/* ---------- (1)-(3) matriz no ar, a 60 m de altura: nada do mapa no caminho ---------- */
const g = boot();
const Y = 60;
const olho = new THREE.Vector3(0, Y, 0);
const DIRS = { frente: new THREE.Vector3(0, 0, 1), lado: new THREE.Vector3(1, 0, 0), costas: new THREE.Vector3(0, 0, -1) };
const DIST = { perto: 3, longe: 18 };
const parede = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 0.4), new THREE.MeshBasicMaterial());
parede.position.set(0, Y, 1.5);
parede.updateMatrixWorld(true);
const medir = (dir, d, comParede) => {
  // estouro sempre em +z; o olhar gira. y−0,15 compensa o +15 cm do _cegueiraDe.
  const estouro = new THREE.Vector3(0, Y - 0.15, d);
  if (comParede) g.world.occluders.push(parede);
  try { return g._cegueiraDe(olho.clone(), DIRS[dir].clone(), estouro); }
  finally { if (comParede) g.world.occluders.splice(g.world.occluders.indexOf(parede), 1); }
};
const M = {};
for (const dir of Object.keys(DIRS)) for (const dk of Object.keys(DIST)) for (const p of [false, true])
  M[`${dir}-${dk}-${p ? 'parede' : 'livre'}`] = r2(medir(dir, DIST[dk], p).dur);

check('frente perto livre cega quase o teto (≥ 4,0 s)', M['frente-perto-livre'] >= 4.0 && M['frente-perto-livre'] <= 4.8, M);
check('frente longe livre cega pouco (0,4-2,5 s)', M['frente-longe-livre'] >= 0.4 && M['frente-longe-livre'] <= 2.5, M);
check('lado perto livre: menos da metade da frente, mais que nada', M['lado-perto-livre'] > 0.6 && M['lado-perto-livre'] < M['frente-perto-livre'] * 0.5, M);
check('lado longe livre < frente longe', M['lado-longe-livre'] < M['frente-longe-livre'], M);
check('costas perto livre: quase nada (≤ 0,5 s)', M['costas-perto-livre'] <= 0.5, M);
check('costas longe livre: nada', M['costas-longe-livre'] === 0, M);
check('perto > longe em toda direção', ['frente', 'lado'].every((d) => M[`${d}-perto-livre`] > M[`${d}-longe-livre`]), M);
check('parede zera tudo', Object.keys(M).filter((k) => k.endsWith('parede')).every((k) => M[k] === 0), M);
{
  // parede ATRÁS do estouro não tapa nada (a oclusão é do segmento olho→estouro)
  const atras = parede.clone(); atras.position.set(0, Y, 6); atras.updateMatrixWorld(true);
  g.world.occluders.push(atras);
  const d = r2(g._cegueiraDe(olho.clone(), DIRS.frente.clone(), new THREE.Vector3(0, Y - 0.15, 3)).dur);
  g.world.occluders.splice(g.world.occluders.indexOf(atras), 1);
  check('parede atrás do estouro não tapa', d === M['frente-perto-livre'], { d });
}
{
  // (2) fumaça opaca no meio do caminho
  g._smokes.push({ center: new THREE.Vector3(0, Y, 4), radius: 2, _opaque: true, sprites: [], group: new THREE.Group(), born: g.time, dur: 99 });
  const d = r2(g._cegueiraDe(olho.clone(), DIRS.frente.clone(), new THREE.Vector3(0, Y - 0.15, 9)).dur);
  g._smokes.pop();
  const sem = r2(g._cegueiraDe(olho.clone(), DIRS.frente.clone(), new THREE.Vector3(0, Y - 0.15, 9)).dur);
  check('fumaça opaca tapa a luz', d === 0 && sem > 0, { comFumaca: d, semFumaca: sem });
}
{
  // (3) teto
  let max = 0;
  for (let d = 0; d <= 40; d += 0.5) for (let a = 0; a < 360; a += 15) {
    const f = new THREE.Vector3(Math.sin(a * Math.PI / 180), 0, Math.cos(a * Math.PI / 180));
    max = Math.max(max, g._cegueiraDe(olho.clone(), f, new THREE.Vector3(0, Y - 0.15, d)).dur);
  }
  check('teto 4,8 s', max <= 4.8 + 1e-9 && max >= 4.7, { max: r2(max) });
}

/* ---------- (4) arremesso real ---------- */
{
  const h = boot();
  h.state = 'live';
  h.player.flashes = 1;
  const eq = h._equipNade('flash');
  check('6 equipa a flash com estoque', eq === true && h.player.nade === 'flash', { eq, nade: h.player.nade });
  h._throwNade('flash', 'flashes', 1);
  const gr = h._grenades.find((x) => x.kind === 'flash');
  check('arremesso gasta 1 e solta uma flash no mundo', h.player.flashes === 0 && !!gr, { flashes: h.player.flashes, voando: !!gr });
  let estourou = null, t = 0;
  const orig = h._popFlash.bind(h);
  h._popFlash = (pos, owner) => { estourou = { t, owner: owner === h.player }; return orig(pos, owner); };
  for (; t < 3 && !estourou; t += 1 / 60) { h.time += 1 / 60; h._updateGrenades(1 / 60); }
  check('estoura no pavio de 1,5 s, com dono', estourou && Math.abs(estourou.t - 1.5) < 0.05 && estourou.owner, { estourou });
  check('estouro passa por todo bot vivo + jogador', Array.isArray(h._ultimoFlash) && h._ultimoFlash.length === h.bots.filter((b) => b.alive).length + 1,
    { medidos: h._ultimoFlash?.length });
}

/* ---------- (4b) jogador: frente cega com branco cheio, costas quase nada ---------- */
{
  const olharEPiscar = (costas) => {
    const h = boot();
    h.state = 'live';
    const cam = h.camera, eye = h.player.pos.clone(); eye.y += 1.6;
    cam.position.copy(eye);
    const estouro = eye.clone().add(new THREE.Vector3(0, -0.15, 2));
    cam.lookAt(eye.clone().add(new THREE.Vector3(0, 0, costas ? -1 : 1)));
    cam.updateMatrixWorld(true);
    h._popFlash(estouro, null);
    return h._cegoJ ? { dur: r2(h._cegoJ.dur), pico: r2(h._cegoJ.pico) } : { dur: 0, pico: 0 };
  };
  const f = olharEPiscar(false), c = olharEPiscar(true);
  check('jogador de frente a 2 m: ≥ 4 s com branco cheio', f.dur >= 4.0 && f.pico === 1, f);
  check('jogador de costas a 2 m: ≤ 0,5 s', c.dur <= 0.5, c);
}

/* ---------- (5) bot cego ---------- */
// O bot JÁ engatou o jogador (1 s de duelo) quando a flash estoura 2 m à frente dele.
function duelo(comFlash) {
  const h = boot();
  h.state = 'live';
  const b = h.bots.find((x) => x.team !== h.playerTeam);
  const p = h.player;
  const base = b.pos.clone();
  p.pos.set(base.x, base.y, base.z + 6); p.vel.set(0, 0, 0);   // 6 m à frente, mesmo chão
  h.camera.position.set(p.pos.x, p.pos.y + 1.6, p.pos.z);
  b.yaw = 0; b.target = null; b.think = 0; b.protUntil = 0; p.protUntil = 0;
  for (const o of h.bots) if (o !== b) { o.alive = false; o.respawnAt = 1e9; }
  const passo = () => { h.time += 1 / 60; p.hp = 100; h._updateBot(b, 1 / 60); b.pos.copy(base); };   // mede mira, não morte
  for (let i = 0; i < 60; i++) passo();
  const engatado = b.target === p;
  if (comFlash) {
    const eye = h._botEye(b);
    h._popFlash(new THREE.Vector3(eye.x, eye.y - 0.15, eye.z + 2), null);
  }
  const cegoAte = b.cegoAte || 0, cegoTotalAte = b.cegoTotalAte || 0;
  let vendoNoBranco = 0, vendoDepois = 0, errMin = 9;
  for (let i = 0; i < 300; i++) {   // 5 s
    passo();
    const vendo = b.target === p && !b._losLost;
    if (h.time < cegoTotalAte && vendo) vendoNoBranco++;
    if (vendo && cegoAte - h.time > 1) errMin = Math.min(errMin, b.aimErr);
    if (vendo && h.time > cegoAte) vendoDepois++;
  }
  return { engatado, cego: { ate: r2(cegoAte - (h.time - 5)), branco: r2(cegoTotalAte - (h.time - 5)) },
    vendoNoBranco, errMinCego: r2(errMin), vendoDepois };
}
{
  const sem = duelo(false), com = duelo(true);
  check('controle: sem flash o bot segue engatado e vendo', sem.engatado && sem.vendoDepois > 200, sem);
  check('flash de frente a 2 m cega o bot ≥ 4 s', com.engatado && com.cego.ate >= 4.0, com);
  check('bot no branco perde o jogador de vista', com.vendoNoBranco === 0, com);
  check('bot cego que re-engata mira com erro ≥ 0,5 rad', com.errMinCego >= 0.5 && com.errMinCego < 9, com);
  check('bot volta a enxergar quando a cegueira acaba', com.vendoDepois > 0, com);
}

/* ---------- (6) online ---------- */
{
  const h = boot();
  h.state = 'live';
  h.player.flashes = 2;
  h.online = true;
  h._mp = { flashOn: false, pedirNade: () => true };
  const recusa = h._equipNade('flash');
  h._mp.flashOn = true;
  const libera = h._equipNade('flash');
  check('online sem meta.flash recusa; com, libera', recusa === false && libera === true, { recusa, libera });
}

/* ---------- (7) flags de URL: processos filhos ---------- */
const filho = (qs, args) => {
  const r = spawnSync(process.execPath, [SELF, ...args, ...(gameArg ? [`--game-module=${gameArg}`] : [])],
    { encoding: 'utf8', env: { ...process.env, SIM_QS: qs } });
  try { return JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))); } catch { return { failed: ['<sem json>'], erro: r.stderr.slice(-400) }; }
};
{
  const k = filho('?flash=0', ['--modo=killswitch']);
  check('?flash=0 remove a flash', k.failed?.length === 0 && k.total > 0, { failed: k.failed });
  const d = filho('?debug=1&flashes=2', ['--modo=debug', '--espera=2']);
  check('?debug=1&flashes=2 dá 2 por rodada', d.failed?.length === 0, { failed: d.failed });
  const n = filho('?flashes=2', ['--modo=debug', '--espera=0']);
  check('?flashes=2 sem debug não dá nada', n.failed?.length === 0, { failed: n.failed });
}

fim('cegueira da flash medida em Node; sem aceite de feel, de áudio nem de MP real');
