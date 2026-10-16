// CONTRATO: a câmera de 3ª pessoa/ombro não entra DENTRO de prop alto atrás do jogador
// (relato de out/2026, ferro velho/favela: "passando pelo carro ou pelo varal a mira é
// suprimida e perde o foco"). O boom só conhecia o chão; a tela virava o prop e a cruz
// de mira (paralaxe do raio do olho) sumia/pulava. Dois freios medidos aqui:
//   (1) occluders (prop que também segura bala — muro de carros): câmera para ANTES do hit;
//   (2) world.camBlockers (Box3 de PANO que não segura bala — varal da favela): a câmera
//       para, o tiro passa.
// Boot headless igual ao bootGame do harness (cópia mínima para aceitar --game-module).
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const option = (n) => process.argv.find((a) => a.startsWith(n + '='))?.slice(n.length + 1);
const gameFile = path.resolve(option('--game-module') || path.join(ROOT, 'public/js/game.js'));

const { THREE, MAPS, initTextures, renderer, sfx, seedRandom, CHARACTERS } =
  await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
const { Game } = await import(pathToFileURL(gameFile));

function boot({ mapId = 'ferro_velho', settings = {} } = {}) {
  seedRandom(12345);
  const playerDef = CHARACTERS.find((c) => c.team === 'E') || CHARACTERS[0];
  const g = new Game({
    renderer, textures: initTextures(), sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1, ...settings },
    playerCharId: playerDef.id, playerTeam: 'E', playerFaction: playerDef.team, enemyFaction: 'B',
    nickname: 'SIM', mapId, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
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
const dt = 1 / 60;
const eyePos = (g, eye = 1.62) => new THREE.Vector3(g.player.pos.x, g.player.pos.y + eye, g.player.pos.z);
const passo = (g, n = 1, eye = 1.62) => { for (let i = 0; i < n; i++) Game.prototype._updatePlayerTP.call(g, dt, 0, eye); };

/* ---- (1) parede atrás: occluder entre olho e boom puxa a câmera pra antes do hit ---- */
{
  const g = boot({});
  g.camView = 'third';
  passo(g, 5);
  const eye = eyePos(g);
  const boom0 = g.camera.position.clone().sub(eye);       // boom sem nada na frente
  const boomLen = boom0.length();
  check('setup boom de 3ª pessoa ~1,7 m', boomLen > 1.2 && boomLen < 2.2, { boomLen: +boomLen.toFixed(3) });

  const parede = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 0.15), new THREE.MeshBasicMaterial());
  const dir = boom0.clone().normalize();
  const paredeDist = boomLen * 0.55;
  parede.position.copy(eye).addScaledVector(dir, paredeDist);
  parede.lookAt(eye);                                      // face perpendicular ao boom
  parede.updateMatrixWorld(true);
  g.scene.add(parede);
  g.world.occluders.push(parede);
  (g._tpBoomClear = undefined), passo(g, 1);
  const d = g.camera.position.distanceTo(eye);
  check('câmera para ANTES do prop (pull-in)', d < paredeDist - 0.05,
    { d: +d.toFixed(3), paredeDist: +paredeDist.toFixed(3) });
  check('câmera não cola no olho (piso do pull-in)', d >= 0.3, { d: +d.toFixed(3) });

  // saiu do cover: o boom completo volta SEM elástico (recuperação finita)
  g.world.occluders.splice(g.world.occluders.indexOf(parede), 1);
  g.scene.remove(parede);
  passo(g, 120);
  const dFim = g.camera.position.distanceTo(eye);
  check('boom completo volta depois do cover', dFim > boomLen * 0.97,
    { dFim: +dFim.toFixed(3), boomLen: +boomLen.toFixed(3) });
}

/* ---- (1b) ombro: prop colado não joga a câmera pra dentro do olho ---- */
{
  const g = boot({});
  g.camView = 'shoulder';
  passo(g, 3);
  const eye = eyePos(g);
  const parede = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 0.15), new THREE.MeshBasicMaterial());
  const dir = g.camera.position.clone().sub(eye).normalize();
  parede.position.copy(eye).addScaledVector(dir, 0.30);
  parede.lookAt(eye);
  parede.updateMatrixWorld(true);
  g.scene.add(parede);
  g.world.occluders.push(parede);
  g._tpBoomClear = undefined;
  passo(g, 1);
  const d = g.camera.position.distanceTo(eye);
  check('ombro: piso de 0,35 m com prop colado', d >= 0.3 && d <= 0.6, { d: +d.toFixed(3) });
}

/* ---- (2) varal da favela: pano para a CÂMERA, não para a BALA ---- */
{
  const g = boot({ mapId: 'campomorro' });
  const blocos = g.world.camBlockers || [];
  check('mapa expõe world.camBlockers do varal',
    Array.isArray(blocos) && blocos.length >= 5 && blocos.every((b) => b && b.isBox3 && b.min.y < b.max.y),
    { qtd: blocos?.length });

  if (!blocos.length) { check('varal: bloco para o teste', false, { camBlockers: 'ausente' }); }
  else {
  const box = blocos[0];
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const meiaProf = (box.max.z - box.min.z) / 2;
  g.camView = 'third';
  g.player.pos.set(cx, g.world.groundHeightAt(cx, cz - meiaProf - 0.8), cz - meiaProf - 0.8);
  g.player.yaw = 0;                                        // fwd -z: o boom (+z) entra no varal
  g.player.pitch = 0;
  g._tpBoomClear = undefined;
  passo(g, 1);
  const czCam = g.camera.position.z;
  check('câmera não entra no varal', czCam <= box.min.z + 0.02 && czCam > g.player.pos.z,
    { czCam: +czCam.toFixed(3), minZVaral: +box.min.z.toFixed(3), playerZ: +g.player.pos.z.toFixed(3) });

  // a BALA atravessa o pano: nenhum occluder dentro do volume do varal
  const origem = new THREE.Vector3(cx, g.player.pos.y + 1.62, cz - meiaProf - 0.8);
  g.ray.set(origem, new THREE.Vector3(0, 0, 1));
  g.ray.far = (box.max.z - box.min.z) + 1.2;
  const hits = g.ray.intersectObjects(g.world.occluders, false);
  check('tiro atravessa o varal (pano não é occluder)', hits.length === 0,
    { hits: hits.map((h) => +h.distance.toFixed(2)) });
  }
}

const result = {
  passed: rows.filter((r) => r.pass).length, total: rows.length,
  failed: rows.filter((r) => !r.pass).map((r) => r.name), rows,
  scope: 'contrato de câmera 3ª/ombro contra props; sem aceite visual/art',
};
console.log(JSON.stringify({ passed: result.passed, total: result.total, failed: result.failed }, null, 1));
if (result.failed.length) process.exitCode = 1;
