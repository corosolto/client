// Avalia o runtime com GLBs locais; exporta a pele calculada pelo Three para render offline.
// Não avalia shaders WebGL, CSS ou desempenho. Uso: node tools/eval/miticos-runtime-review.mjs [pasta]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const out = path.resolve(process.argv[2] || 'artifacts/miticos-review/current');
fs.mkdirSync(out, { recursive: true });
const shared = process.argv.includes('--shared');
const localFetch = async url => {
  const file = path.resolve('public', String(url).split('?')[0]);
  if (!fs.existsSync(file)) return new Response('', { status: 404 });
  if (shared && file.endsWith('anims/index.json')) {
    const index = JSON.parse(fs.readFileSync(file)); delete index.clipes.lobisomem;
    return new Response(JSON.stringify(index));
  }
  return new Response(fs.readFileSync(file));
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
const { THREE, Game, CHARACTERS, renderer, sfx, initTextures } = await import('./harness.mjs');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const loaded = [], failed = [];
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  const file = path.resolve('public', url.split('?')[0]);
  const loader = new GLTFLoader();
  loader.register(parser => ({
    name: 'EXT_texture_webp',
    async loadTexture(index) {
      const tex = parser.json.textures[index];
      const source = tex.extensions?.EXT_texture_webp?.source ?? tex.source;
      const img = parser.json.images[source];
      const bytes = Buffer.from(await parser.getDependency('bufferView', img.bufferView));
      const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const texture = new THREE.DataTexture(decoded.data, decoded.info.width, decoded.info.height);
      texture.flipY = false;
      const target = path.join(out, `${path.basename(file)}-${source}.png`);
      await sharp(bytes).png().toFile(target);
      texture.userData.reviewPath = target;
      texture.needsUpdate = true;
      return texture;
    },
  }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(file);
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    loaded.push(path.relative(process.cwd(), file));
    done(gltf);
  }).catch(error => { failed.push({ file, error: error.message }); fail?.(error); });
};
const G = await import('../../public/js/glbchars.js');
const F = await import('../../public/js/fparms.js');
const { pickMatchRoster } = await import('../../public/js/game.js');
await G.preloadCharacterAssets(['lobisomem', 'mandrake'], { weapons: ['shotgun', 'ak'] });
await F.preloadFPArms();
assert(G.hasModel('lobisomem') && G.hasModel('mandrake'));
const def = CHARACTERS.find(c => c.id === 'lobisomem');
const checks = [], poses = [];
const { resolveInspectionScreen } = await import('../../public/js/screenquery.js');
const check = (name, ok, detail) => checks.push({ name, ok, detail });
for (const screen of ['personagem', 'hud', 'vitoria', 'derrota']) {
  const target = resolveInspectionScreen(new URLSearchParams({ tela: screen, time: 'M', char: 'lobisomem' }));
  check(`inspection-${screen}`, target.faction === 'M' && target.character === 'lobisomem', target);
}
for (const dedicated of [false, true]) {
  const roster = pickMatchRoster('M', 'B', 5, 'lobisomem', dedicated);
  check(`roster-${dedicated ? 'dedicated' : 'offline'}`, roster.allyDefs.length === (dedicated ? 5 : 4) && roster.allyDefs.every(c => c.team === 'M'), roster.allyDefs.map(c => `${c.team}/${c.id}`));
}
function exportPose(group, name, camera = null) {
  group.updateMatrixWorld(true);
  const meshes = [];
  group.traverseVisible(mesh => {
    if (!mesh.isMesh || !mesh.geometry.attributes.position) return;
    if (mesh.material?.transparent || mesh.material?.visible === false) return;
    const geometry = mesh.geometry, pos = geometry.attributes.position, points = [], v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, v);
      v.applyMatrix4(mesh.matrixWorld); points.push(...v.toArray());
    }
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    meshes.push({ name: mesh.name, positions: points, indices: geometry.index ? Array.from(geometry.index.array) : Array.from({ length: pos.count }, (_, i) => i), uv: geometry.attributes.uv ? Array.from({ length: pos.count }, (_, i) => [geometry.attributes.uv.getX(i), geometry.attributes.uv.getY(i)]).flat() : null, color: mat?.color?.toArray() || [1, 1, 1], texture: mat?.map?.userData.reviewPath || null });
  });
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify({ name, meshes, camera }));
}
for (const id of (process.argv.includes('--fp-only') ? [] : ['lobisomem', 'mandrake'])) {
  for (const state of ['selection', 'idle', 'walk', 'run', 'crouch', 'shoot', 'death', 'revive']) {
    const char = G.buildCharacterModel(CHARACTERS.find(c => c.id === id), { weaponId: 'shotgun', preview: state === 'selection' });
    if (state === 'selection') char.group.rotation.y = -0.4;
    if (state === 'crouch') char.ctrl.setCrouch(true);
    if (state === 'shoot') char.ctrl.shoot();
    if (state === 'death' || state === 'revive') char.ctrl.die();
    if (state === 'revive') { for (let k = 0; k < 60; k++) char.ctrl.update(1 / 30, 0, false, 0); char.ctrl.revive(); }
    const samples = [];
    for (let frame = 0; frame < 420; frame++) {
      const speed = state === 'walk' ? 0.84 : state === 'run' ? 2.08 : 0;
      char.ctrl.update(1 / 60, speed ? 1 : 0, false, speed);
      char.group.updateMatrixWorld(true);
      const box = new THREE.Box3(); let footMin = Infinity;
      char.group.traverse(o => {
        if (!o.isSkinnedMesh) return;
        for (let i = 0; i < o.geometry.attributes.position.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(o.geometry.attributes.position, i);
          o.applyBoneTransform(i, v); box.expandByPoint(v.applyMatrix4(o.matrixWorld));
          const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
          const methods = ['getX', 'getY', 'getZ', 'getW'];
          let dominant = 0;
          for (let k = 1; k < 4; k++) if (sw[methods[k]](i) > sw[methods[dominant]](i)) dominant = k;
          if (/foot|toe|ankle|heel|shin|calf|knee|(?<!up)leg/i.test(o.skeleton.bones[si[methods[dominant]](i)].name)) footMin = Math.min(footMin, v.y);
        }
      });
      const mount = char.ctrl.tpMount;
      samples.push({ frame, footMin, min: box.min.toArray(), max: box.max.toArray(), state: char.ctrl.curName, grip: mount?.mount.getWorldPosition(new THREE.Vector3()).toArray() });
      if ([7, 15, 29, 119].includes(frame)) exportPose(char.group, `${id}-${state}-${frame}`);
    }
    check(`${id}-${state}-finite`, samples.every(s => [...s.min, ...s.max].every(Number.isFinite)), samples.at(-1).state);
    if (id === 'lobisomem' && ['selection', 'idle', 'walk', 'run', 'crouch', 'shoot'].includes(state)) {
      const settled = samples.slice(30);
      check(`${state}-feet`, settled.every(s => Math.abs(s.footMin) <= 0.01), { min: Math.min(...settled.map(s => s.footMin)), max: Math.max(...settled.map(s => s.footMin)), tolerance: 'CHR3: 1 cm' });
    }
    poses.push({ id, state, samples });
  }
}
const arms = F.buildFPArms(def);
const neutral = F.buildFPArms({ ...def, team: '?' });
let color, neutralColor;
arms.group.traverse(o => { if (o.isMesh && !color) color = o.material.color.toArray(); });
neutral.group.traverse(o => { if (o.isMesh && !neutralColor) neutralColor = o.material.color.toArray(); });
check('glove-M-distinct-from-fallback', color.some((v, i) => v !== neutralColor[i]), { color, neutralColor });
const game = new Game({ renderer, textures: initTextures(renderer), sfx, settings: { bots: 0, quality: 'low', sens: 1 }, playerCharId: 'lobisomem', playerTeam: 'E', playerFaction: 'M', enemyFaction: 'B', nickname: 'REVIEW', mapId: 'piscina_treta', testMode: true, onQuit() {}, onMatchEnd() {} });
check('hud-team', game._teamName('E') === 'MÍTICO' && game._teamTag('E') === 'MIT', [game._teamName('E'), game._teamTag('E')]);
for (const aspect of [1.5, 16 / 9]) {
  globalThis.innerWidth = aspect === 1.5 ? 1200 : 1280; globalThis.innerHeight = aspect === 1.5 ? 800 : 720; game.onResize(); game._vmFrame(true);
  for (const [id, model] of Object.entries(game.vm.models)) model.visible = id === 'shotgun';
  if (game.vm.arms) F.poseToWeapon(game.vm.arms, game.vm.models.shotgun, 'shotgun');
  exportPose(game.vm.root, `fp-${aspect === 1.5 ? '32' : '169'}`, { fov: game.vmCamera.fov, aspect });
}
const report = { sampleHz: 60, samplesPerState: 420, instrument: 'Three.js runtime with local GLTFLoader; no browser, no WebGL/CSS', loaded: [...new Set(loaded)], failed, checks, poses, weaponOnly: game._weaponOnly };
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ out, loaded: report.loaded.length, failed, checks, weaponOnly: report.weaponOnly }, null, 2));
game.dispose();
process.exitCode = checks.some(c => !c.ok) ? 1 : 0;
