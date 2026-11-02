import assert from 'node:assert/strict';
import { test } from 'node:test';
import { THREE } from '../tools/eval/harness.mjs';
import { aplicarGrafite, grafitar, pintarParedes, pendurarMurais } from '../public/js/graffiti_pass.js';
import { artePermitidaNoMapa } from '../public/js/graffiti_ownership.js';
const OWN = 'or-mitico-mural.png', OTHER = 'tags-treino-02.png', RESERVE = 'alfabeto-a.png';
const texture = src => { const t = new THREE.Texture(); t.image = { src: 'http://grafite.local' + src }; return t; };
function scene() {
  const root = new THREE.Group();
  for (const x of [0, 10, 20]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 4, .2), new THREE.MeshLambertMaterial()); wall.position.set(x, 2, 0); root.add(wall); }
  root.updateMatrixWorld(true); return root;
}
const textures = () => ({ decalFiles: [OWN, OTHER, RESERVE], decalAspects: [1, 1, 1], decals: [OWN, OTHER, RESERVE].map(f => texture('/img/decals/' + f)), posterFiles: [], posterImgs: [], posterAspects: [] });
const baked = { arquivos: [OWN, OTHER, RESERVE], pecas: [0, 1, 2].map((a, i) => [a, i * 10, 2, .13, 0, 2, 2]), murais: [] };
const meta = root => root.userData.graffitiPecas || [];
const live = (root, T, extra = {}) => ({ root, T, id: 'campomorro', waypoints: [{ x: 0, z: 4 }, { x: 10, z: 4 }], seed: 7, passo: .8, alcance: 8, raios: 16, minLarg: .3, maxLarg: 2, exigeChao: false, bandas: [{ y0: .5, y1: 2.8, larg: 1, alturas: [.7], chance: 100, pool: [0, 1, 2], exigeChao: false }], ...extra });
test('baked scene keeps authored art and excludes foreign/reserve art and metadata', () => {
  const root = scene(), T = textures(); assert.equal(aplicarGrafite(root, T, baked, {}, 'campomorro').pecas, 1); assert.deepEqual(meta(root).map(p => p.f), [OWN]);
  const other = scene(); assert.equal(aplicarGrafite(other, T, baked, {}, 'praca_poderes').pecas, 1); assert.deepEqual(meta(other).map(p => p.f), [OTHER]);
  const direct = scene(); assert.equal(aplicarGrafite(direct, T, baked).pecas, 3, 'direct geometric API remains meaningful');
});
test('live painting exports only placed owned art', () => {
  const root = scene(); const r = pintarParedes(live(root, textures())); assert.equal(r.pecas, 1); assert.deepEqual(r.layout.arquivos, [OWN]); assert.deepEqual(meta(root).map(p => p.f), [OWN]);
});
test('foreign poster getters are never awakened', () => {
  const T = textures(); T.posterFiles = ['25c9112229edfcfbb1eae4137ecc151a.jpg']; T.posterAspects = [1];
  Object.defineProperty(T.posterImgs, 0, { get() { throw Error('foreign poster requested'); } });
  const r = pintarParedes(live(scene(), T, { bandas: [{ y0: .5, y1: 2.8, larg: 1, alturas: [.7], chance: 100, pool: [0], fonte: 'poster', exigeChao: false }] })); assert.equal(r.pecas, 0);
  const b = aplicarGrafite(scene(), T, { arquivos: ['poster:' + T.posterFiles[0]], pecas: [[0, 0, 2, .13, 0, 2, 2]] }, {}, 'campomorro'); assert.equal(b.pecas, 0);
});
test('manual street art survives on its map and is removed from another', () => {
  const root = scene();
  for (const [i, src] of ['/img/textures/campomorro_streetart_baile.webp', '/img/textures/corrego_streetart_pixo.webp'].entries()) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshLambertMaterial({ map: texture(src) })); mesh.name = 'mural:manual-' + i; mesh.position.set(i * 10, 2, .13); root.add(mesh);
  }
  root.updateMatrixWorld(true); grafitar({ id: 'campomorro', root, T: textures(), waypoints: [], bandas: [] });
  assert.ok(root.getObjectByName('mural:manual-0')); assert.ok(root.getObjectByName('mural:manual-1') === undefined, 'foreign manual art must be removed');
  assert.equal(artePermitidaNoMapa('corrego', 'https://example.invalid/img/textures/corrego_streetart_pixo.webp?v=2'), true);
});
test('live and baked murals reject foreign art before scene or layout insertion', () => {
  const root = scene(), T = textures(); const map = { [OTHER]: T.decals[1], [OWN]: T.decals[0] };
  const control = aplicarGrafite(scene(), T, { arquivos: [], pecas: [], murais: [[OWN, 0, 2, .13, 0, 2, 2]] }, map, 'campomorro'); assert.equal(control.murais, 1);
  const liveControl = pendurarMurais({ ...live(scene(), T), texturas: [T.decals[0]], nomes: [OWN], larg: 2, alt: 2, minLarg: 1 }); assert.equal(liveControl.murais, 1); assert.equal(liveControl.layout[0][0], OWN);
  const b = aplicarGrafite(root, T, { arquivos: [], pecas: [], murais: [[OTHER, 0, 2, .13, 0, 2, 2]] }, map, 'campomorro'); assert.equal(b.murais, 0);
  const h = pendurarMurais({ ...live(scene(), T), texturas: [T.decals[1]], nomes: [OTHER], larg: 2, alt: 2, minLarg: 1 }); assert.equal(h.murais, 0); assert.deepEqual(h.layout, []);
});

test('manual posters obey the same map ownership as painted art', () => {
  const root = scene();
  for (const [i, file] of ['25c9112229edfcfbb1eae4137ecc151a.jpg', 'New Project (1).png', 'or-baile.jpg'].entries()) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshLambertMaterial({ map: texture('/posters/' + file) }));
    mesh.name = 'poster:' + file; mesh.position.set(i * 10, 2, .13); root.add(mesh);
  }
  root.updateMatrixWorld(true); grafitar({ id: 'praca_poderes', root, T: textures(), waypoints: [], bandas: [] });
  assert.ok(root.getObjectByName('poster:25c9112229edfcfbb1eae4137ecc151a.jpg'));
  assert.ok(root.getObjectByName('poster:New Project (1).png') === undefined, 'Ferro artwork must not remain in Praca');
  assert.ok(root.getObjectByName('poster:or-baile.jpg') === undefined, 'reserve art must not remain in Praca');
});

test('declared local street art survives while its real texture is still loading', () => {
  for (const [id, file] of [['campomorro', '/img/textures/campomorro_streetart_baile.webp'], ['corrego', '/img/textures/corrego_streetart_pixo.webp']]) {
    const root = scene();
    const material = new THREE.MeshLambertMaterial({ map: texture('/img/textures/placeholder-wall.webp') });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material); mesh.name = 'mural:pending-local-art'; mesh.userData.graffitiArquivo = file; mesh.position.set(0, 2, .13); root.add(mesh); root.updateMatrixWorld(true);
    grafitar({ id, root, T: textures(), waypoints: [], bandas: [] });
    assert.ok(root.getObjectByName('mural:pending-local-art'), 'curation must preserve authored art before onLoad');
    material.map = texture(file); assert.equal(artePermitidaNoMapa(id, material.map.image.src), true);
  }
});

test('owned posters still need an opaque wall behind the entire piece', () => {
  for (const invalid of ['missing-wall', 'glass-in-front']) {
    const root = scene();
    if (invalid === 'missing-wall') root.remove(root.children[0]);
    else {
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshLambertMaterial({ transparent: true, opacity: .5 }));
      glass.name = 'glass'; glass.position.set(0, 2, .11); root.add(glass);
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshLambertMaterial({ map: texture('/posters/25c9112229edfcfbb1eae4137ecc151a.jpg') }));
    mesh.name = 'poster:owned-but-unsupported'; mesh.position.set(0, 2, .13); root.add(mesh); root.updateMatrixWorld(true);
    grafitar({ id: 'praca_poderes', root, T: textures(), waypoints: [], bandas: [] });
    assert.ok(root.getObjectByName(mesh.name) === undefined, invalid + ' must reject even owned art');
  }
});
