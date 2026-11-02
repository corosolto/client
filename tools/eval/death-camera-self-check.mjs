/* Câmera de morte — contrato, cláusulas DC2-* e códigos de saída: docs/visual-consistency/DEATH-CAMERA.md.
   Nominal sempre primeiro; mutante REAL roda em módulo temporário pelo MESMO CLI (nada de tolerância a RED). */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SELF = fileURLToPath(import.meta.url);
const USAGE = 'uso: death-camera-self-check.mjs [--game-module=<caminho>] [--mutante=camera-mudo|cam-nan|cam-nan-primeiro|olho-vivo]';

const args = process.argv.slice(2);
const opt = new Map();
for (const a of args) {
  if (!a.startsWith('--') || !a.includes('=')) { console.error(USAGE); process.exit(2); }
  const eq = a.indexOf('=');
  const k = a.slice(0, eq), v = a.slice(eq + 1);
  if (k !== '--game-module' && k !== '--mutante') { console.error(USAGE); process.exit(2); }
  if (!v || opt.has(k)) { console.error(USAGE); process.exit(2); }
  opt.set(k, v);
}
const MUT = opt.get('--mutante') || '';

// Mutante real: desliga só a atualização de câmera do morto, preservando o cadáver.
// Mutantes reais: mutam SOMENTE o recorte de _tpDeath entre os mesmos marcadores.
const marcadorTpDeath = (src) => {
  const i = src.indexOf('  _tpDeath(dt) {');
  const j = src.indexOf('  /* Desarma o _tpDeath');
  if (i < 0 || j < 0 || j <= i) return null;
  const trecho = src.slice(i, j), alvo = 'this._updatePlayerTPCamera(dt, eye, anchor);';
  if (trecho.split(alvo).length !== 2) return null;
  return { i, j, trecho, alvo };
};
const MUTANTES = {
  'olho-vivo': {
    falhas: ['DC2-THIRD-CORPO-ENQUADRADO', 'DC2-SHOULDER-CORPO-ENQUADRADO'],
    aplicar(src) {
      const m = marcadorTpDeath(src); if (!m) return null;
      return src.slice(0, m.i) + m.trecho.replace(m.alvo, 'this._eyeWorld.set(p.pos.x, p.pos.y + eye, p.pos.z); this._updatePlayerTPCamera(dt, eye);') + src.slice(m.j);
    },
  },
  'camera-mudo': {
    falhas: ['DC2-THIRD-CORPO-ENQUADRADO', 'DC2-THIRD-CAM-FORA-CRANIO', 'DC2-THIRD-CAM-BOOM', 'DC2-SHOULDER-CORPO-ENQUADRADO', 'DC2-SHOULDER-CAM-FORA-CRANIO', 'DC2-SHOULDER-CAM-BOOM'],
    aplicar(src) {
      const m = marcadorTpDeath(src); if (!m) return null;
      return src.slice(0, m.i) + m.trecho.replace(m.alvo, '') + src.slice(m.j);
    },
  },
  'cam-nan': {
    falhas: ['DC2-THIRD-CAM-FINITA', 'DC2-THIRD-CORPO-ENQUADRADO', 'DC2-SHOULDER-CAM-FINITA', 'DC2-SHOULDER-CORPO-ENQUADRADO', 'DC2-CAM-FINITA-TODOS-FRAMES'],
    aplicar(src) {
      const m = marcadorTpDeath(src); if (!m) return null;
      return src.slice(0, m.i) + m.trecho.replace(m.alvo, m.alvo + ' this.camera.quaternion.x = NaN;') + src.slice(m.j);
    },
  },
  'cam-nan-primeiro': {
    falhas: ['DC2-THIRD-CAM-FINITA', 'DC2-SHOULDER-CAM-FINITA', 'DC2-CAM-FINITA-TODOS-FRAMES'],
    aplicar(src) {
      const m = marcadorTpDeath(src); if (!m) return null;
      return src.slice(0, m.i) + m.trecho.replace(m.alvo, m.alvo
        + ' if (!this.__dc2NaNPrimeiro) { this.__dc2NaNPrimeiro = true; this.camera.quaternion.x = NaN; }') + src.slice(m.j);
    },
  },
};
if (MUT && !Object.hasOwn(MUTANTES, MUT)) { console.error(`mutante desconhecido: ${MUT}\n${USAGE}`); process.exit(2); }
const gameFile = path.resolve(opt.get('--game-module') || path.join(ROOT, 'public/js/game.js'));
if (!existsSync(gameFile)) { console.error(`INFRA DC2 MODULO-AUSENTE ${gameFile}`); process.exit(3); }

const parseFalhas = (txt) => [...new Set([...txt.matchAll(/^FALHA DC2 (\S+)/gm)].map((m) => m[1]))];

if (MUT) {
  const nom = spawnSync(process.execPath, [SELF, `--game-module=${gameFile}`], { encoding: 'utf8' });
  if (nom.error || nom.signal || nom.status === null) { console.error(`INFRA DC2 NOMINAL-ERRO ${nom.error || nom.signal}`); process.exit(3); }
  if (nom.status !== 0) {
    console.error(`INFRA DC2 NOMINAL-NAO-VERDE exit=${nom.status} (o mutante só roda com o produto nominal GREEN)\n${nom.stdout}`);
    process.exit(3);
  }
  const mutSrc = MUTANTES[MUT].aplicar(readFileSync(gameFile, 'utf8'));
  if (mutSrc === null) { console.error('INFRA DC2 MUTANTE-NAO-CONSTRUIDO marcadores de _tpDeath ausentes'); process.exit(3); }
  const tmp = path.join(path.dirname(gameFile), `.dc2-mutante-${process.pid}.js`);
  let varRun;
  try {
    writeFileSync(tmp, mutSrc);
    varRun = spawnSync(process.execPath, [SELF, `--game-module=${tmp}`], { encoding: 'utf8' });
  } finally { rmSync(tmp, { force: true }); }
  if (varRun.status === 2 || varRun.status === 3) { console.error(`INFRA DC2 VARIANTE exit=${varRun.status}`); process.exit(3); }
  if (varRun.status === 0) { console.error(`MUTANTE ${MUT} SOBREVIVEU: nenhuma cláusula vermelha`); process.exit(1); }
  // RED semântico só existe com exit 1; qualquer outro status é infra, nunca detecção.
  if (varRun.status !== 1) { console.error(`INFRA DC2 VARIANTE-STATUS exit=${varRun.status}`); process.exit(3); }
  const obtidas = parseFalhas(varRun.stdout || '');
  const esperadas = MUTANTES[MUT].falhas;
  const mesmas = obtidas.length === esperadas.length && obtidas.every((id) => esperadas.includes(id));
  if (!mesmas) {
    console.error(`MUTANTE ${MUT} FALHAS-INESPERADAS obtidas=${JSON.stringify(obtidas)} esperadas=${JSON.stringify(esperadas)}`);
    process.exit(1);
  }
  console.log(`MUTANTE ${MUT} DETECTADO · falhas exatas: ${obtidas.join(', ')}`);
  process.exit(0);
}

const dt = 1 / 60;
const rows = [];
const check = (id, pass, observed = {}) => rows.push({ id, pass: !!pass, observed });

const games = [];
async function main() {
  const H = await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
  const { THREE, MAPS, initTextures, renderer, sfx, CHARACTERS, PCHAR, seedRandom } = H;
  const mod = await import(pathToFileURL(gameFile));
  const SelectedGame = mod.Game;
  if (typeof SelectedGame !== 'function') throw new Error(`--game-module não exporta classe Game: ${gameFile}`);

  const uso = { constructor: 0, _updatePlayer: 0, _tpDeath: 0, _tpRevive: 0, _updatePlayerTP: 0, _kill: 0, _updateBot: 0 };
  for (const nome of ['_updatePlayer', '_tpDeath', '_tpRevive', '_updatePlayerTP', '_kill', '_updateBot']) {
    const orig = SelectedGame.prototype[nome];
    if (typeof orig !== 'function') continue;
    SelectedGame.prototype[nome] = function (...a) { uso[nome]++; return orig.apply(this, a); };
  }

  // Carrega geometria/rig/clipes reais; usa materiais sem textura simplificados no Node.
  const { GLTFLoader } = await import(pathToFileURL(path.join(ROOT, 'public/vendor/addons/loaders/GLTFLoader.js')));
  const { preloadCharacterAssets, hasModel } = await import(pathToFileURL(path.join(ROOT, 'public/js/glbchars.js')));
  const originalLoad = GLTFLoader.prototype.load;
  GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    try {
      const file = path.join(ROOT, 'public', new URL(String(url), 'http://local/').pathname);
      const bytes = readFileSync(file); let doc, bin;
      for (let i = 12; i < bytes.length;) {
        const n = bytes.readUInt32LE(i), type = bytes.readUInt32LE(i + 4);
        if (type === 0x4e4f534a) doc = JSON.parse(bytes.subarray(i + 8, i + 8 + n));
        if (type === 0x004e4942) bin = bytes.subarray(i + 8, i + 8 + n);
        i += n + 8;
      }
      if (!doc || !bin) throw new Error('GLB sem JSON/BIN');
      delete doc.images; delete doc.textures; delete doc.samplers;
      doc.materials = doc.materials?.map((m) => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } }));
      const pad = (b, fill = 0) => Buffer.concat([b, Buffer.alloc((4 - b.length % 4) % 4, fill)]);
      const j = pad(Buffer.from(JSON.stringify(doc)), 32), b = pad(bin), out = Buffer.alloc(28 + j.length + b.length);
      out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
      out.writeUInt32LE(j.length, 12); out.writeUInt32LE(0x4e4f534a, 16); j.copy(out, 20);
      out.writeUInt32LE(b.length, 20 + j.length); out.writeUInt32LE(0x004e4942, 24 + j.length); b.copy(out, 28 + j.length);
      this.parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), '', onLoad, onError);
    } catch (e) { onError?.(e); }
  };
  try { await preloadCharacterAssets(['esquerdomacho'], { weapons: ['ak'] }); }
  finally { GLTFLoader.prototype.load = originalLoad; }
  if (!hasModel('esquerdomacho')) throw new Error('modelo real não carregado');

  const mapa = Object.keys(MAPS)[0];
  const textures = initTextures();
  const makeGame = () => {
    seedRandom(12345);
    const def = CHARACTERS.find((c) => c.id === 'esquerdomacho');
    const g = new SelectedGame({
      renderer, textures, sfx,
      settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
      playerCharId: def.id, playerTeam: 'E', playerFaction: def.team, enemyFaction: 'B',
      nickname: 'SIM', mapId: mapa, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
    });
    uso.constructor++;
    g._ensureDolly = () => {};
    g.killsToWin = Infinity;
    g.start ? g.start() : g._startRound();
    g.scene.updateMatrixWorld(true);
    g.world.root.updateMatrixWorld(true);
    games.push(g);
    return g;
  };

  const matDesenha = (m) => (Array.isArray(m) ? m : [m]).filter(Boolean).every((mm) =>
    mm.visible !== false && mm.colorWrite !== false && !(mm.transparent && mm.opacity <= 0));
  const malhaEfetiva = (g, mesh) => {
    for (let o = mesh; o; o = o.parent) {
      if (o.visible === false) return false;
      if (o.layers && g.camera.layers && !o.layers.test(g.camera.layers)) return false;
    }
    return matDesenha(mesh.material);
  };
  const visiveisEfetivos = (g) => (g.playerTP?.selfMeshes || []).filter((it) => malhaEfetiva(g, it.object));

  const finitudePorJogo = new Map();
  const mortoFrames = (g, n) => {
    for (let i = 0; i < n; i++) {
      g._updatePlayer(dt);
      g.scene.updateMatrixWorld(true);
      g.camera.updateMatrixWorld(true);
      finitudePorJogo.set(g, (finitudePorJogo.get(g) ?? true) && camFinita(g));
    }
  };
  // Distância válida não prova câmera renderizável: posição, quaternion, euler, matrixWorld e projeção finitos.
  const camFinita = (g) => {
    const c = g.camera;
    return [...c.position.toArray(), c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w,
      c.rotation.x, c.rotation.y, c.rotation.z, ...c.matrixWorld.elements, ...c.projectionMatrix.elements]
      .every(Number.isFinite);
  };
  const matar = (g, camView) => {
    g.setCamView(camView);
    g.scene.updateMatrixWorld(true);
    g.camera.position.set(g.player.pos.x, g.player.pos.y + 1.62, g.player.pos.z);
    g._kill(g.player, g.bots.find((b) => b.alive) || g.player, 'AWP');
    mortoFrames(g, 30);
  };
  // âncora do crânio: olho do corpo no instante da morte — posição REAL, independente do helper
  const ancoraCranio = (g) => {
    const p = g.player;
    return new THREE.Vector3(p.pos.x, p.pos.y + 1.62 - 0.52 * (p.crouchF || 0), p.pos.z);
  };

  /* ---- S1 morte em first: corpo próprio oculto, câmera sem crânio, VM oculto ---- */
  {
    const g = makeGame();
    g.time = 1;
    matar(g, 'first');
    const vis = visiveisEfetivos(g);
    check('DC2-FIRST-OCULTO', vis.length === 0,
      { efetivos: vis.length, group: g.playerTP?.group?.visible, total: g.playerTP?.selfMeshes?.length });
    check('DC2-FIRST-CAM-DESCE', g.camera.position.y < g.player.pos.y + 1.6,
      { camY: +g.camera.position.y.toFixed(3) });
    check('DC2-FIRST-CAM-FINITA', finitudePorJogo.get(g) === true && camFinita(g), { pos: g.camera.position.toArray().map((v) => +v.toFixed(2)) });
    g._applyVmVisibility();
    check('DC2-DEATH-VM-OCULTO', !g.vm?.root?.visible, { vm: g.vm?.root?.visible });
  }

  /* ---- S2 morte em third/shoulder: cadáver visível + câmera FORA do crânio, com boom ---- */
  for (const modo of ['third', 'shoulder']) {
    const g = makeGame();
    g.time = 1;
    matar(g, modo);
    check(`DC2-${modo.toUpperCase()}-CADAVER`, visiveisEfetivos(g).length > 0 && !g.playerTP.selfOccluded,
      { efetivos: visiveisEfetivos(g).length, selfOccluded: g.playerTP.selfOccluded, animado: !!g._tpDead });
    check(`DC2-${modo.toUpperCase()}-CAM-FINITA`, finitudePorJogo.get(g) === true && camFinita(g), {});
    // Projeta marcos animados reais nas duas proporções; não basta o grupo estar visível.
    const tp = g.playerTP, head = tp.ctrl?.headBone || tp.parts?.head;
    const torso = tp.ctrl?.headBone?.parent?.parent || tp.parts?.chest || tp.parts?.torso;
    const quadros = [];
    for (const aspect of [1.5, 844 / 390]) {
      g.camera.aspect = aspect; g.camera.updateProjectionMatrix();
      quadros.push({ aspect, pontos: [head, torso].map((o) => o?.getWorldPosition(new THREE.Vector3()).project(g.camera).toArray()) });
    }
    check(`DC2-${modo.toUpperCase()}-CORPO-ENQUADRADO`, quadros.every((q) => q.pontos.every((pt) =>
      pt && pt.every(Number.isFinite) && Math.abs(pt[0]) <= 0.95 && Math.abs(pt[1]) <= 0.95 && pt[2] >= -1 && pt[2] <= 1)), { quadros });
    const d = g.camera.position.distanceTo(ancoraCranio(g));
    check(`DC2-${modo.toUpperCase()}-CAM-FORA-CRANIO`, d > 0.5, { dist: +d.toFixed(3), cam: g.camera.position.toArray().map((v) => +v.toFixed(2)) });
    check(`DC2-${modo.toUpperCase()}-CAM-BOOM`, d > 0.75, { dist: +d.toFixed(3) });
  }

  /* ---- S3 morto em first → third/shoulder ANTES do respawn, e volta ao first ---- */
  {
    const g = makeGame();
    g.time = 1;
    matar(g, 'first');
    for (const modo of ['third', 'shoulder']) {
      g.setCamView(modo);
      mortoFrames(g, 10);
      const vis = visiveisEfetivos(g);
      check(`DC2-TRANS-FIRST-${modo.toUpperCase()}`, vis.length > 0,
        { efetivos: vis.length, group: g.playerTP.group.visible, selfOccluded: g.playerTP.selfOccluded });
    }
    g.setCamView('first');
    mortoFrames(g, 10);
    check('DC2-TRANS-VOLTA-FIRST', visiveisEfetivos(g).length === 0,
      { efetivos: visiveisEfetivos(g).length });
  }

  /* ---- S4 respawn restaura o original (inclusive malha que JÁ era invisível) ---- */
  {
    const g = makeGame();
    g.time = 1;
    g.setCamView('third');
    const tp = g.playerTP;
    if (tp.selfMeshes.length) { tp.selfMeshes[0].visible = false; tp.selfMeshes[0].object.visible = false; }
    matar(g, 'first');
    g.player.respawnAt = g.time - 0.01;
    g._updatePlayer(dt);   // _respawnPlayer → _tpRevive (caminho SP real)
    check('DC2-RESPAWN-REVIVE', !g._tpDead && g.player.alive, { tpDead: !!g._tpDead, alive: g.player.alive });
    g.setCamView('third');
    g._updatePlayerTP(dt, 0, 1.62);
    const agora = tp.selfMeshes.map((it) => it.object.visible);
    const original = tp.selfMeshes.map((it) => it.visible);
    check('DC2-RESPAWN-ORIGINAL', !tp.selfOccluded && agora.every((v, i) => v === original[i]) && original[0] === false,
      { original: original.join(','), agora: agora.join(','), selfOccluded: tp.selfOccluded });
    check('DC2-RESPAWN-CORPO-THIRD', visiveisEfetivos(g).length > 0, { efetivos: visiveisEfetivos(g).length });
  }

  /* ---- S7 online morto com timer vencido: sem respawn local, câmera first continua caindo ---- */
  {
    const g = makeGame();
    g.time = 1;
    matar(g, 'first');
    const camY0 = g.camera.position.y, roll0 = g.camera.rotation.z || 0;
    g.online = true;                       // _respawnPlayer vira no-op; revive vem do snapshot
    g.player.respawnAt = g.time - 0.01;    // timer vencido
    mortoFrames(g, 30);
    check('DC2-ONLINE-MORTE-SEM-RESPAWN', !g.player.alive && !!g._tpDead,
      { alive: g.player.alive, tpDead: !!g._tpDead });
    check('DC2-ONLINE-MORTE-CAM-DESCE', g.camera.position.y < camY0 && g.camera.rotation.z > roll0,
      { antes: +camY0.toFixed(3), agora: +g.camera.position.y.toFixed(3), roll: +(g.camera.rotation.z || 0).toFixed(3) });
  }

  /* ---- S5 cadáver remoto preservado: morte própria em first não toca corpo de bot ---- */
  {
    const g = makeGame();
    g.time = 1;
    const bot = g.bots.find((b) => b.mesh?.group && !b._remote);
    const malhasBot = [];
    bot.mesh.group.traverse((o) => { if (o.isMesh) malhasBot.push(o); });
    const antes = malhasBot.map((m) => m.visible);
    matar(g, 'first');
    g._kill(bot, g.player, 'AWP');
    for (let i = 0; i < 30; i++) g._updateBot(bot, dt);
    g.scene.updateMatrixWorld(true);
    const efetivos = malhasBot.filter((m) => malhaEfetiva(g, m)).length;
    check('DC2-BOT-CADAVER-INTACTO', !bot.alive && bot.mesh.group.visible !== false
      && malhasBot.every((m, i) => m.visible === antes[i]) && efetivos > 0,
      { botAlive: bot.alive, group: bot.mesh.group.visible, efetivos, inalteradas: malhasBot.every((m, i) => m.visible === antes[i]) });
  }

  /* ---- S6 causalidade: a classe de --game-module foi a efetivamente exercitada ---- */
  {
    const instancias = games.every((g) => g instanceof SelectedGame);
    check('DC2-CAUSAL-INSTANCIA', instancias && uso.constructor === games.length, { uso: uso.constructor, jogos: games.length });
    check('DC2-CAUSAL-METODOS', Object.entries(uso).every(([, n]) => n > 0), uso);
  }

  check('DC2-CAM-FINITA-TODOS-FRAMES', games.every((g) => {
    g.camera.updateMatrixWorld(true);
    return finitudePorJogo.get(g) === true && camFinita(g);
  }), { jogos: games.length, invalidos: [...finitudePorJogo.values()].filter((ok) => !ok).length });
  const ids = rows.map((r) => r.id);
  check('DC2-IDS-UNICOS', new Set(ids).size === ids.length, { total: ids.length, unicos: new Set(ids).size });
}

let infra = null;
try { await main(); }
catch (e) { infra = e; }
finally { for (const g of games) { try { g.dispose && g.dispose(); } catch { /* descarte best-effort */ } } }
if (infra) { console.error(`INFRA DC2 ${infra && infra.stack || infra}`); process.exit(3); }

for (const r of rows) console.log(`${r.pass ? 'PASSA' : 'FALHA'} DC2 ${r.id}${Object.keys(r.observed).length ? ' · ' + JSON.stringify(r.observed) : ''}`);
const falhas = rows.filter((r) => !r.pass);
if (falhas.length) process.exit(1);
