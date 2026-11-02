/* Pouso com peso pelo fluxo real: a física entrega intensidade, _updatePlayer despacha
   partículas na superfície visível, a qualidade troca sem cache contaminado e o áudio
   cresce com a força. O loader mutante corta o dispatch em game.js. A lâmina é medida
   contra a MALHA real de água (raycast vertical), não contra constante copiada da API. */
import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { Sfx } from '../../public/js/audio.js';

/* Erro estruturado em linha JSON: o driver de mutação distingue asserção do contrato
   (exit 1) de erro de preparação/infra (exit 2) sem advinhar pelo texto do stack. */
const estruturar = (err) => ({
  assert: err instanceof assert.AssertionError ? 'assertion' : 'infra',
  name: err instanceof assert.AssertionError ? 'AssertionError' : (err?.name || 'Error'),
  clause: String(err?.message ?? err ?? '').split('\n')[0],
});
for (const ev of ['uncaughtException', 'unhandledRejection']) {
  process.on(ev, (err) => {
    console.error('ERRO-ESTRUTURADO ' + JSON.stringify(estruturar(err)));
    process.exit(err instanceof assert.AssertionError ? 1 : 2);
  });
}

const game = bootGame('fy_corrego', {
  textures: initTextures(), ctf: true, seed: 12345, settings: { quality: 'high' },
});
const p = game.player;
game._acceptInput = () => true;
game.online = false;
game.keys = {};
const y = game.world.groundHeightAt(-4.1, -27.8, 10);
p.pos.set(-4.1, y + 1.2, -27.8);
p.vel.set(0, -8, 0);
p.grounded = false;
p.crouchF = 0;

let audio = null, dispatched = null;
game.sfx = new Proxy({}, { get: (_target, key) => key === 'land' ? (strength) => { audio = strength; } : () => {} });
const particles = [];
const coloredFx = { points: { visible: true }, spawn(pos, options) { particles.push({ pos: pos.clone(), options }); } };
game._tintFx = () => coloredFx;
const landingReal = game._landingFx.bind(game);
game._landingFx = (pos, strength) => {
  dispatched = { pos: pos.clone(), strength };
  return landingReal(pos, strength);
};

for (let frame = 0; frame < 30 && !p.grounded; frame++) game._updatePlayer(1 / 60);
assert.equal(p.grounded, true, 'fixture não pousou pelo fluxo real de _updatePlayer');
assert(dispatched?.strength >= 0.45 && dispatched.strength <= 1,
  `dispatch deve expor força normalizada do pouso; recebeu ${dispatched?.strength}`);
assert(Math.abs(audio - dispatched.strength) < 1e-9,
  `áudio deve receber a mesma força do pouso; áudio=${audio}, dispatch=${dispatched.strength}`);
assert(particles.length >= 3 && particles.length <= 6,
  `pouso forte deve soltar 3 a 6 partículas; soltou ${particles.length}`);
assert(particles.every(({ options }) => options.vel?.y > 0 && options.life >= 0.32 && options.size >= 0.14),
  'poeira precisa sair do chão, durar pelo menos 320 ms e ter leitura mínima de 14 cm');

let fallback = 0;
const puffSpawn = game.puffFx.spawn.bind(game.puffFx);
game.puffFx.spawn = (...args) => { fallback++; return puffSpawn(...args); };
const coloridasAntes = particles.length;
game.settings.quality = 'low'; game._applyQuality();
assert.equal(coloredFx.points.visible, false, 'quality low manteve draw call colorido visível');
game._footstepSurface = () => 'water';
game.world.waterSurfaceAt = () => 2.5;
game._landingFx(new THREE.Vector3(0, -1.5, 0), 0.8);
assert(fallback >= 3 && particles.length === coloridasAntes,
  'quality low reutilizou ou contaminou o cache colorido em vez do puff compartilhado');
game.settings.quality = 'high'; game._applyQuality();
assert.equal(coloredFx.points.visible, true, 'quality high não reativou o sistema colorido já criado');
game._landingFx(new THREE.Vector3(0, -1.5, 0), 0.8);
const novas = particles.length - coloridasAntes;
assert(novas >= 3 && novas <= 6,
  `segundo pouso na água deve soltar 3 a 6 novas partículas antes de medir a lâmina; soltou ${novas}`);
assert(particles.slice(coloridasAntes).every(({ pos }) => Math.abs(pos.y - 2.55) < 1e-9),
  'splash nasceu no fundo físico em vez da lâmina de água visível');

const calls = [];
const synth = Object.create(Sfx.prototype);
synth.ensure = () => {};
synth._burst = (...args) => calls.push(args);
synth.land(0.2); const weak = calls.pop();
synth.land(0.9); const strong = calls.pop();
assert(strong[0] > weak[0] && strong[1] > weak[1] && strong[2] > weak[2],
  `curva sonora não cresce com o impacto: fraco=${weak.slice(0, 3)} forte=${strong.slice(0, 3)}`);

/* LÂMINA REAL: grid de 2 m acha um ponto molhado que TAMBÉM tem interseção vertical
   com a malha de água viva (scene.userData.waters[].mesh, matrixWorld do bootGame).
   O lower bound antigo contra groundHeightAt não media a lâmina; e o every antigo
   passava de graça com array vazio quando nenhuma partícula era emitida. */
const findWetOnWater = (g, wet) => {
  const w = g.world;
  const meshes = (g.scene.userData.waters || []).map((a) => a?.mesh).filter(Boolean);
  assert(meshes.length, 'cena sem malha de água viva em scene.userData.waters');
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const b = w.bounds || { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };
  for (let x = b.minX; x <= b.maxX; x += 2) for (let z = b.minZ; z <= b.maxZ; z += 2) {
    if (!wet(w, x, z)) continue;
    raycaster.set(new THREE.Vector3(x, 60, z), down);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (hit) return { x, z, y: hit.point.y };
  }
  return null;
};
for (const [mapId, wet] of [
  ['piscina_treta', (w, x, z) => w.slowAt?.(x, z)],
  ['amazonia', (w, x, z) => w.footstepSurfaceAt?.(x, z) === 'water'],
  ['fy_corrego', (w, x, z) => w.slowAt?.(x, z)],
]) {
  const g = bootGame(mapId, { textures: initTextures(), seed: 12345 });
  const w = g.world;
  const at = findWetOnWater(g, wet);
  assert(at, `${mapId}: nenhum ponto molhado do grid tem interseção real com a malha de água`);
  const api = w.waterSurfaceAt?.(at.x, at.z);
  assert(Number.isFinite(api), `${mapId} não publicou a altura visual da água onde a malha real tem água`);
  assert(Math.abs(api - at.y) <= 1e-6,
    `${mapId} divergiu da malha real de água: API ${api} vs malha ${at.y}`);
}

/* CÓRREGO explícito: (0,35) está na lâmina real; fora do canal (BBox.max.x + 0.2) a API
   deve ser null. O slowAt é MAIS LARGO que a malha — isso não amplia a API. */
{
  const g = bootGame('fy_corrego', { textures: initTextures(), seed: 12345 });
  const mesh = g.scene.userData.waters?.[0]?.mesh;
  assert(mesh, 'fy_corrego não registrou malha de água em scene.userData.waters');
  mesh.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  raycaster.set(new THREE.Vector3(0, 60, 35), new THREE.Vector3(0, -1, 0));
  const hit = raycaster.intersectObject(mesh, false)[0];
  assert(hit, 'fy_corrego: (0, 35) não tem interseção vertical com a malha de água real');
  const api = g.world.waterSurfaceAt(0, 35);
  assert(Number.isFinite(api) && Math.abs(api - hit.point.y) <= 1e-6,
    `fy_corrego divergiu da malha real de água em (0, 35): API ${api} vs malha ${hit.point.y}`);
  const bbox = new THREE.Box3().setFromObject(mesh);
  const fora = g.world.waterSurfaceAt(bbox.max.x + 0.2, 35);
  assert(fora == null, `fy_corrego publicou água fora do canal em x=${bbox.max.x + 0.2}`);
}

/* CLEANUP REAL do 139: Game novo, SEM _tintFx fake — material e CanvasTexture de verdade,
   contados por addEventListener('dispose'). O puff é compartilhado e não pode cair. */
{
  const life = bootGame('fy_corrego', { textures: initTextures(), seed: 12345, settings: { quality: 'high' } });
  const spawn = (surface) => {
    life._footstepSurface = () => surface;
    return life._landingFx(new THREE.Vector3(0, -1.6, 35), 0.8);
  };
  assert(spawn('concrete') >= 3 && spawn('water') >= 3,
    'dois estilos de pouso não emitiram 3 ou mais partículas cada');
  const owned = (life._landingFxSystems || []).filter((fx) => fx !== life.puffFx);
  assert(owned.length >= 2, `dois estilos criaram apenas ${owned.length} sistema(s) próprio(s)`);
  const disposed = new Map();
  for (const fx of owned) {
    const mat = fx.points?.material, tex = fx.uniforms?.uTex?.value;
    assert(mat && tex?.isTexture, 'sistema de pouso sem material/textura próprios reais');
    for (const res of [mat, tex]) {
      assert(!disposed.has(res), 'recurso de pouso compartilhado entre sistemas próprios');
      disposed.set(res, 0);
      res.addEventListener('dispose', () => disposed.set(res, disposed.get(res) + 1));
    }
  }
  const shared = [];
  for (const res of [life.puffFx?.points?.material, life.puffFx?.uniforms?.uTex?.value]) {
    res?.addEventListener?.('dispose', () => shared.push(res));
  }
  life.dispose();
  for (const count of disposed.values()) assert.equal(count, 1,
    'dispose real: cada material próprio descartado exatamente 1 vez');
  assert(shared.length === 0, 'dispose descartou material/textura compartilhados do puff');
  life.dispose();
  for (const count of disposed.values()) assert.equal(count, 1,
    'dispose repetido descartou recurso duas vezes');
  assert((life._landingFxSystems || []).length === 0
    && !Object.keys(life).some((k) => k.startsWith('_fx_land_')),
    'dispose não esvaziou as refs e o cache próprios de pouso');
}

console.log(`VERDE landing-impact: força ${dispatched.strength.toFixed(2)}, ${novas} partículas coloridas novas, fallback ${fallback}`);
