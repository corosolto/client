// Régua F2 knife: 1P via _accept real (knife-fp) e 3P via weaponModel real (knife-tp).
// Exit: 0 GREEN · 1 RED (mutante) · 2 USO incorreto · 3 infra/import.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// CLI estrito: sem args (suite inteira) ou --mutante=<nome conhecido>; recusa antes de executar.
const usageExit = (msg) => {
  console.error(`USO knife-skin-markings: ${msg} — invocação: [--mutante=<nome>]`);
  process.exit(2);
};
const NOMES_MUTANTES=new Set(['remove-branch-knife','parent-root-1p','remove-maga-slogan','footprint-fora','profile-units-wrong','footprint-guard-off','nan-bind','nan-hand','inverse-shift','slogan-uv-off','slogan-transversal']);
const onlyArgs = [];
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--mutante=')) usageExit(`argumento desconhecido \`${arg}\``);
  const value = arg.slice('--mutante='.length);
  if (!value) usageExit('valor vazio em --mutante');
  if (!NOMES_MUTANTES.has(value)) usageExit(`mutante desconhecido: ${value}`);
  if (onlyArgs.includes(value)) usageExit(`--mutante=${value} duplicado`);
  onlyArgs.push(value);
}

// Fronteira de execução guardada: import de arquivo do repo falha como INFRA 3, não exit 1.
let THREE; let GLTFLoader; let WEAPON_SKINS; let GOLDEN_VER; let footprintFullyCovered;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
const CLIPS = ['Idle', 'Draw', 'Slash', 'Stab', 'QuickThrust', 'HeavyStab'];
const TIMES = [0, 0.1, 0.2, 0.3, 0.5];
const CASES = [
  { id: 'pack-caveira-urbana-knife', roles: ['symbol'], aspects: { symbol: 620 / 420 } },
  { id: 'pack-maga-47-knife', roles: ['symbol', 'slogan'], aspects: { symbol: 1, slogan: 4 } },
];

// sloganTexture exige document.createElement('canvas'): stub sem pixels (nada é lido).
globalThis.document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({
      font: '', textAlign: '', textBaseline: '', lineJoin: '', lineWidth: 0,
      strokeStyle: '', fillStyle: '',
      measureText: () => ({ width: 0 }), strokeText: () => {}, fillText: () => {},
    }),
  }),
};

// Cobertura INDEPENDENTE do produto: o gate não chama footprintFullyCovered para decidir —
// integra a área da união dos triângulos por fatias verticais exatas (sem amostragem).
function pointInTriangle(x, y, tri, tol) {
  const [[ax, ay], [bx, by], [cx, cy]] = tri;
  const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(d) < 1e-15) return false;
  const w1 = ((x - ax) * (cy - ay) - (y - ay) * (cx - ax)) / d;
  const w2 = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / d;
  return w1 >= -tol && w2 >= -tol && w1 + w2 <= 1 + tol;
}

function crossInterval(tri, u) {
  let lo = Infinity; let hi = -Infinity;
  for (let i = 0; i < 3; i++) {
    const [ux, uy] = tri[i]; const [vx, vy] = tri[(i + 1) % 3];
    if (ux === vx) { if (ux === u) { lo = Math.min(lo, uy); hi = Math.max(hi, vy); } continue; }
    const s = (u - ux) / (vx - ux);
    if (s < 0 || s > 1) continue;
    const t = uy + s * (vy - uy);
    lo = Math.min(lo, t); hi = Math.max(hi, t);
  }
  return lo <= hi ? [lo, hi] : null;
}

function coveredArea(centerU, centerT, halfH, halfW, triangles) {
  const u0 = centerU - halfH; const u1 = centerU + halfH;
  const t0 = centerT - halfW; const t1 = centerT + halfW;
  const near = triangles.filter((tri) => tri.reduce((lo, q) => Math.min(lo, q[0]), Infinity) <= u1
    && tri.reduce((hi, q) => Math.max(hi, q[0]), -Infinity) >= u0);
  if (!near.length) return 0;
  let rest = [[[u0, t0], [u1, t0], [u1, t1], [u0, t1]]];
  for (const tri of near) {
    const next = [];
    for (const poly of rest) next.push(...minusTriangle(poly, tri));
    rest = next;
    if (!rest.length) break;
  }
  return 4 * halfH * halfW - rest.reduce((sum, poly) => sum + polyAreaAbs(poly), 0);
}

// Subtração convexa própria, fragmento por aresta: a peça externa de cada aresta do cortador
// sai como fragmento e o resto interno segue para a próxima aresta (clip inclusivo, sem palha).
const DEBRIS = 1e-9;

function polyAreaAbs(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]; const [x2, y2] = poly[(i + 1) % poly.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function clipKeep(poly, f) {
  const out = [];
  let a = poly[poly.length - 1]; let fa = f(a);
  for (const b of poly) {
    const fb = f(b);
    if (fb <= 0) {
      if (fa > 0) out.push(crossPoint(a, fa, b, fb));
      out.push(b);
    } else if (fa <= 0) out.push(crossPoint(a, fa, b, fb));
    a = b; fa = fb;
  }
  const dedup = [];
  for (const p of out) {
    const last = dedup[dedup.length - 1];
    if (!last || Math.abs(last[0] - p[0]) > 1e-12 || Math.abs(last[1] - p[1]) > 1e-12) dedup.push(p);
  }
  if (dedup.length > 1) {
    const first = dedup[0]; const last = dedup[dedup.length - 1];
    if (Math.abs(first[0] - last[0]) <= 1e-12 && Math.abs(first[1] - last[1]) <= 1e-12) dedup.pop();
  }
  return dedup;
}

function crossPoint(a, fa, b, fb) {
  const s = fa / (fa - fb);
  return [a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1])];
}

function minusTriangle(poly, tri) {
  const [[ax, ay], [bx, by], [cx, cy]] = tri;
  const orient = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) >= 0 ? 1 : -1;
  const fragments = [];
  let pending = poly;
  for (let i = 0; i < 3 && pending.length; i++) {
    const [px, py] = tri[i]; const [qx, qy] = tri[(i + 1) % 3];
    const f = (p) => orient * ((qx - px) * (p[1] - py) - (qy - py) * (p[0] - px));
    fragments.push(clipKeep(pending, f));
    pending = clipKeep(pending, (p) => -f(p));
  }
  return fragments.filter((frag) => polyAreaAbs(frag) > DEBRIS);
}

function coverageIndependent(centerU, centerT, halfH, halfW, triangles, tolerance) {
  const { cornerTol, areaTolFrac } = tolerance;
  if (!(halfH > 0) || !(halfW > 0) || !triangles?.length) return false;
  const corners = [
    [centerU - halfH, centerT - halfW], [centerU + halfH, centerT - halfW],
    [centerU + halfH, centerT + halfW], [centerU - halfH, centerT + halfW],
  ];
  for (const [cu, ct] of corners) {
    if (!triangles.some((tri) => pointInTriangle(cu, ct, tri, cornerTol))) return false;
  }
  const rectArea = 4 * halfH * halfW;
  const missing = rectArea - coveredArea(centerU, centerT, halfH, halfW, triangles);
  return missing <= areaTolFrac * rectArea + 1e-12;
}

// Falsos predicados true têm que cair aqui: buraco interno com cantos dentro, união sobreposta
// sem somar área duas vezes, borda exata e retângulo inteiro; negativos fora do suporte.
function coverageSelfTests() {
  const sq = (x0, x1, y0, y1) => [[[x0, y0], [x1, y0], [x0, y1]], [[x1, y0], [x1, y1], [x0, y1]]];
  const tol = { cornerTol: 1e-7, areaTolFrac: 1e-6 };
  const union = coveredArea(1.5, 1, 2.5, 2, [
    [[0, 0], [2, 0], [0, 2]],
    [[1, 0], [3, 0], [1, 2]],
  ]);
  return {
    'selftest:hole-corners-in': !coverageIndependent(2, 1, 2, 1, [...sq(0, 2, 0, 2), ...sq(3, 4, 0, 2)], tol),
    'selftest:overlap-union-area': Math.abs(union - 3.5) < 1e-9,
    'selftest:overlap-covered': coverageIndependent(1.5, 0.5, 1.5, 0.5, [...sq(0, 3, 0, 1), [[2, 0], [4, 0], [2, 2]]], tol),
    'selftest:edge-exact': coverageIndependent(1, 1, 1, 1, sq(0, 2, 0, 2), tol),
    'selftest:whole-inside': coverageIndependent(3, 3, 1, 1, sq(0, 6, 0, 6), tol),
    'selftest:partial-out': !coverageIndependent(1.5, 1, 1.5, 1, sq(0, 2, 0, 2), tol),
  };
}

function readGlb(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('not GLB2');
  let json; let bin;
  for (let p = 12; p < bytes.length;) {
    const length = bytes.readUInt32LE(p); const type = bytes.readUInt32LE(p + 4);
    if (type === 0x4e4f534a) json = JSON.parse(bytes.subarray(p + 8, p + 8 + length));
    if (type === 0x004e4942) bin = bytes.subarray(p + 8, p + 8 + length);
    p += 8 + length;
  }
  return { json, bin };
}
function stripped(g) {
  const j = structuredClone(g.json);
  delete j.images; delete j.textures; delete j.samplers;
  j.materials = j.materials?.map((m) => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }));
  const pad = (b, fill = 0) => Buffer.concat([b, Buffer.alloc((4 - b.length % 4) % 4, fill)]);
  const jb = pad(Buffer.from(JSON.stringify(j)), 32); const bb = pad(g.bin);
  const out = Buffer.alloc(28 + jb.length + bb.length);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jb.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jb.copy(out, 20);
  out.writeUInt32LE(bb.length, 20 + jb.length); out.writeUInt32LE(0x004e4942, 24 + jb.length); bb.copy(out, 28 + jb.length);
  return out;
}
async function load(file) {
  const g = readGlb(file); const bytes = stripped(g);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  return { gltf, animations: gltf.animations };
}

// O predicado compartilhado é injetado SÓ no produto sob teste; o gate verifica sozinho.
function makeSkin(mutate = (s) => s) {
  const body = mutate(read('public/js/weapon-skins.js'))
    .replace(/^import .*;\n/gm, '').replace(/^export \{ WEAPON_SKINS \};\n/gm, '').replace(/^export /gm, '');
  return new Function('THREE', 'WEAPON_SKINS', 'footprintFullyCovered', 'FOOTPRINT_TOLERANCE', `${body}\nreturn {applyWeaponSkinCandidate, markTextures, knifeBladeFrame, KNIFE_MARK_PROFILES};`)(
    THREE, WEAPON_SKINS, footprintFullyCovered, { cornerTol: 1e-7, areaTolFrac: 1e-6 });
}

// Consumidor 1P REAL: KnifeMeleeViewModel de meleevm.js e seu _accept; mãos preservadas pelo
// clone de material (HAND_MATERIAL continua casando pelos nomes).
function makeMeleeVM(skin) {
  const body = read('public/js/meleevm.js')
    .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const { KnifeMeleeViewModel } = new Function('THREE', 'applyWeaponSkinCandidate', 'applyTeamHandMaterial', 'refreshTeamHands', 'GLTFLoader', 'GOLDEN_VER', `${body}\nreturn {KnifeMeleeViewModel};`)(
    THREE, skin.applyWeaponSkinCandidate, (m) => m, () => {}, class {}, GOLDEN_VER);
  return (knifeSkinId, gltf) => {
    const vm = Object.create(KnifeMeleeViewModel.prototype);
    vm.parent = new THREE.Group();
    vm.profile = {};
    vm.knifeSkinId = knifeSkinId;
    vm.onReady = () => {};
    vm.weapon = 'knife';
    vm.basePosition = new THREE.Vector3();
    vm.actions = new Map();
    vm.current = null;
    vm.suspended = false;
    vm._accept(gltf);
    return vm;
  };
}

// Consumidor 3P REAL: corpo de weaponModel com CFG e template reais de weapons.js.
function makeWeaponModelFactory(skin, tpTemplate) {
  const source = read('public/js/weapons.js');
  const cfgStart = source.indexOf('const CFG =');
  const CFG = new Function(`${source.slice(cfgStart, source.indexOf('\n};', cfgStart) + 3)}\nreturn CFG;`)();
  const fn = source.slice(source.indexOf('export function weaponModel(')).replace(/^export /, '');
  return new Function('THREE', 'MODEL_ALIAS', '_cache', 'CFG', 'buildMag', 'applyWeaponSkinCandidate', 'reviewWeaponSkinId', 'measureGun', `${fn}\nreturn weaponModel;`)(
    THREE, {}, new Map([['knife', tpTemplate]]), CFG, () => null, skin.applyWeaponSkinCandidate, () => null, () => null);
}

const hand = (m) => (Array.isArray(m.material) ? m.material : [m.material]).some((x) => /Glove|Hand|Sleeve|Cloth/i.test(x.name || ''));
const markingsOf = (root, skinId) => {
  const found = [];
  root.traverse((o) => { if (o.isMesh && /^skin-(?:symbol|slogan)-/.test(o.name) && o.userData.weaponSkin === skinId) found.push(o); });
  return found;
};

function preparedTexture(skin, skinId, w, h) {
  const t = new THREE.Texture();
  t.image = { width: w, height: h };
  skin.markTextures.set(skinId, t);
}

// Retângulo real da marca (u,t) contra a união dos triângulos da região, via verificador próprio.
function footprintClause(skin, model, context, marks) {
  const profile = skin.KNIFE_MARK_PROFILES[context];
  model.updateMatrixWorld(true);
  const frame = skin.knifeBladeFrame(model, profile);
  if (frame.error || !marks.length) return false;
  const spaceInverse = frame.bone
    ? frame.bone.matrixWorld.clone().invert()
    : model.matrixWorld.clone().invert();
  for (const mark of marks) {
    const { width, height } = mark.geometry.parameters;
    if (!(width > 0) || !(height > 0)) return false;
    let minU = Infinity; let maxU = -Infinity; let minT = Infinity; let maxT = -Infinity;
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const corner = new THREE.Vector3((x * width) / 2, (y * height) / 2, 0);
      corner.applyMatrix4(mark.matrixWorld).applyMatrix4(spaceInverse);
      const u = corner.dot(frame.long);
      const t = corner.dot(frame.trans);
      if (!Number.isFinite(u) || !Number.isFinite(t)) return false;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
      minT = Math.min(minT, t); maxT = Math.max(maxT, t);
    }
    const centerU = (minU + maxU) / 2;
    const centerT = (minT + maxT) / 2;
    const halfH = (maxU - minU) / 2;
    const halfW = (maxT - minT) / 2;
    if (Math.abs((maxU - minU) - height) > 1e-6 * height || Math.abs((maxT - minT) - width) > 1e-6 * width) return false;
    if (!coverageIndependent(centerU, centerT, halfH, halfW, frame.triangles, profile.coverage)) return false;
  }
  return true;
}

// Follow 1P: 6 clips × 5 tempos, marca no espaço do osso, movimento real não vazio.
function poseClauses(scene, animations, marks, tag) {
  scene.updateMatrixWorld(true);
  const bone = scene.getObjectByName('CoroWeapon');
  const bindLocal = marks.map((m) => m.matrixWorld.clone().premultiply(bone.matrixWorld.clone().invert()));
  const mixer = new THREE.AnimationMixer(scene);
  let maxDrift = 0;
  let boneTravel = 0;
  const bindPos = bone.matrixWorld.elements.slice(12, 15).join(',');
  for (const clipName of CLIPS) {
    const clip = animations.find((a) => a.name === clipName);
    if (!clip) continue;
    const action = mixer.clipAction(clip);
    action.play();
    for (const t of TIMES) {
      mixer.setTime(t);
      scene.updateMatrixWorld(true);
      marks.forEach((m, i) => {
        const now = m.matrixWorld.clone().premultiply(bone.matrixWorld.clone().invert());
        maxDrift = Math.max(maxDrift, now.elements.reduce((acc, v, j) => Math.max(acc, Math.abs(v - bindLocal[i].elements[j])), 0));
      });
      if (bone.matrixWorld.elements.slice(12, 15).join(',') !== bindPos) boneTravel++;
    }
    action.stop();
  }
  return { [`${tag}:follow-drift`]: maxDrift < 1e-9, [`${tag}:bone-moves`]: boneTravel > 0 };
}

// Snapshot do objeto que vai receber a skin: geometria, rig, bind e tracks — antes/depois.
function rigSnapshot(scene, animations) {
  const meshes = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position || o.name.startsWith('skin-')) return;
    const g = o.geometry;
    meshes.push({
      name: o.name,
      hand: hand(o),
      skinned: !!o.isSkinnedMesh,
      position: g.attributes.position.array.slice(),
      index: g.index ? g.index.array.slice() : null,
      skinIndex: g.attributes.skinIndex ? g.attributes.skinIndex.array.slice() : null,
      skinWeight: g.attributes.skinWeight ? g.attributes.skinWeight.array.slice() : null,
      bind: o.bindMatrix ? o.bindMatrix.elements.slice() : null,
      bindInv: o.bindMatrixInverse ? o.bindMatrixInverse.elements.slice() : null,
      inverses: o.skeleton ? o.skeleton.boneInverses.map((m) => m.elements.slice()) : null,
    });
  });
  const clips = animations.map((a) => ({
    name: a.name,
    duration: a.duration,
    tracks: a.tracks.map((t) => ({ name: t.name, times: Array.from(t.times), values: Array.from(t.values) })),
  }));
  return { meshes, clips };
}

const sameArray = (a, b) => !!a === !!b && (!a || (a.length === b.length && a.every((v, i) => v === b[i])));

function rigIntact(before, after) {
  if (before.meshes.length !== after.meshes.length) return false;
  for (let i = 0; i < before.meshes.length; i++) {
    const A = before.meshes[i]; const B = after.meshes[i];
    if (A.name !== B.name || A.skinned !== B.skinned) return false;
    if (!sameArray(A.position, B.position) || !sameArray(A.index, B.index)) return false;
    if (!sameArray(A.skinIndex, B.skinIndex) || !sameArray(A.skinWeight, B.skinWeight)) return false;
    if (!sameArray(A.bind, B.bind)) return false;
    if (!!A.inverses!==!!B.inverses || (A.inverses && (A.inverses.length!==B.inverses.length || A.inverses.some((m,j)=>!sameArray(m,B.inverses[j]))))) return false;
  }
  if (before.clips.length !== after.clips.length) return false;
  for (let i = 0; i < before.clips.length; i++) {
    const A = before.clips[i]; const B = after.clips[i];
    if (A.name !== B.name || A.duration !== B.duration || A.tracks.length !== B.tracks.length) return false;
    for (let j = 0; j < A.tracks.length; j++) {
      if (A.tracks[j].name !== B.tracks[j].name) return false;
      if (!sameArray(A.tracks[j].times, B.tracks[j].times) || !sameArray(A.tracks[j].values, B.tracks[j].values)) return false;
    }
  }
  return true;
}

// Vértices finitos do OBJETO APLICADO nas 30 poses reais: deformados por osso, sem reloader.
function deformedFinite(scene, animations) {
  const knives = []; const hands = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    (hand(o) ? hands : knives).push(o);
  });
  const rawBad = { knife: 0, hand: 0 };
  for (const [list, key] of [[knives, 'knife'], [hands, 'hand']]) {
    for (const m of list) {
      const arr = m.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) rawBad[key]++;
    }
  }
  const deformedBad = { knife: 0, hand: 0 };
  const mixer = new THREE.AnimationMixer(scene);
  const v = new THREE.Vector3();
  for (const clipName of CLIPS) {
    const clip = animations.find((a) => a.name === clipName);
    if (!clip) continue;
    const action = mixer.clipAction(clip);
    action.play();
    for (const t of TIMES) {
      mixer.setTime(t);
      scene.updateMatrixWorld(true);
      for (const [list, key] of [[knives, 'knife'], [hands, 'hand']]) {
        for (const m of list) {
          if (!m.isSkinnedMesh || !m.skeleton) continue;
          m.skeleton.update();
          const p = m.geometry.attributes.position;
          for (let i = 0; i < p.count; i++) {
            m.getVertexPosition(i, v);
            if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) deformedBad[key]++;
          }
        }
      }
    }
    action.stop();
  }
  return { knife: rawBad.knife + deformedBad.knife === 0, hands: rawBad.hand + deformedBad.hand === 0 };
}

// Contrato visual independente: texto horizontal no bitmap percorre o comprimento da lâmina.
function aspectAndUv(marks, role, aspect) {
  const sides = marks.filter(m => m.userData.markingRole === role);
  if (sides.length !== 2) return false;
  const longitudinal = role === 'slogan';
  const expected = longitudinal ? 1 / aspect : aspect;
  const coords = longitudinal ? [[0,0],[0,1],[1,0],[1,1]] : [[0,1],[1,1],[0,0],[1,0]];
  return sides.every(m => {
    const {width,height} = m.geometry.parameters, uv = m.geometry.attributes.uv;
    return Number.isFinite(width/height) && Math.abs(width/height-expected)/expected < .01
      && uv?.count === 4 && coords.every(([u,v],i) => Math.abs(uv.getX(i)-u)<1e-7 && Math.abs(uv.getY(i)-v)<1e-7);
  });
}

// A MESMA função valida nominal e mutantes: retorna mapa cláusula→bool por caso.
async function evaluate(skin, { fpGltfFactory, tpFactory }) {
  const clauses = {};
  for (const c of CASES) {
    const tag = `${c.id}`;
    // 1P: GLB fresco + _accept real por caso; snapshot ANTES, comparação no objeto aplicado.
    const fp = await fpGltfFactory();
    const before = rigSnapshot(fp.gltf.scene, fp.animations);
    preparedTexture(skin, c.id, c.id.startsWith('pack-caveira') ? 620 : 512, c.id.startsWith('pack-caveira') ? 420 : 512);
    const makeVM = makeMeleeVM(skin);
    const vm = makeVM(c.id, fp.gltf);
    const scene = vm.scene;
    const report = scene.userData.knifeMarkings;
    const marks = markingsOf(scene, c.id);
    const bone = scene.getObjectByName('CoroWeapon');
    clauses[`${tag}#fp:attached`] = vm.packageRoot !== null && report?.status === 'attached';
    clauses[`${tag}#fp:roles-exact`] = JSON.stringify(report?.roles) === JSON.stringify(c.roles);
    clauses[`${tag}#fp:count`] = marks.length === c.roles.length * 2;
    clauses[`${tag}#fp:aspect`] = c.roles.every(role => aspectAndUv(marks,role,c.aspects[role]));
    clauses[`${tag}#fp:parent`] = marks.length > 0 && bone !== null && marks.every((m) => m.parent === bone && bone.parent !== null && scene.getObjectById(bone.id) === bone);
    clauses[`${tag}#fp:footprint`] = footprintClause(skin, scene, 'knife-fp', marks);
    clauses[`${tag}#fp:rig-intact`] = rigIntact(before, rigSnapshot(scene, fp.animations));
    const finite = deformedFinite(scene, fp.animations);
    clauses[`${tag}#fp:knife-finite`] = finite.knife;
    clauses[`${tag}#fp:hands-finite`] = finite.hands;
    Object.assign(clauses, poseClauses(scene, fp.animations, marks, `${tag}#fp`));

    // 3P: weaponModel real com template fresco por caso (rígido, sem skins).
    const tp = tpFactory(c.id);
    const wrap = tp.wrap;
    wrap.updateMatrixWorld(true);
    const tpReport = wrap.userData.knifeMarkings;
    const tpMarks = markingsOf(wrap, c.id);
    let tpSkins = 0; wrap.traverse((o) => { if (o.isSkinnedMesh) tpSkins++; });
    clauses[`${tag}#tp:attached`] = wrap.userData.weaponSkin === c.id && tpReport?.status === 'attached';
    clauses[`${tag}#tp:roles-exact`] = JSON.stringify(tpReport?.roles) === JSON.stringify(c.roles);
    clauses[`${tag}#tp:count`] = tpMarks.length === c.roles.length * 2;
    clauses[`${tag}#tp:aspect`] = c.roles.every(role => aspectAndUv(tpMarks,role,c.aspects[role]));
    clauses[`${tag}#tp:parent`] = tpMarks.length > 0 && tpMarks.every((m) => m.parent === wrap);
    clauses[`${tag}#tp:rigid`] = tpSkins === 0;
    clauses[`${tag}#tp:footprint`] = footprintClause(skin, wrap, 'knife-tp', tpMarks);
    clauses[`${tag}#tp:rig-intact`] = rigIntact(tp.before, rigSnapshot(wrap, []));
  }
  return clauses;
}

// Contrato P2-2: representação trocada é recusada sem marcas, pintura base mantida.
function crossContextClauses(wrap) {
  const report = wrap.userData.knifeMarkings;
  return {
    'cross:tp-as-fp-rejected': report?.status === 'representation-mismatch'
      && markingsOf(wrap, 'pack-caveira-urbana-knife').length === 0
      && wrap.userData.weaponSkin === 'pack-caveira-urbana-knife',
  };
}

// Integridade do asset 1P (não é cláusula de mutante): vértices, clips e mãos intactos.
async function integrityClauses(fpGltfFactory) {
  const clauses = {};
  const fp = await fpGltfFactory();
  const scene = fp.gltf.scene;
  let verts = 0; let hands = 0; let skinnedKnife = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (hand(o)) hands++;
    else { verts += o.geometry.attributes.position.count; if (o.isSkinnedMesh) skinnedKnife++; }
  });
  clauses['integrity:knife-verts'] = verts === 5262;
  clauses['integrity:skinned-knife'] = skinnedKnife === 1;
  clauses['integrity:clips'] = CLIPS.every((n) => fp.animations.some((a) => a.name === n));
  clauses['integrity:hands'] = hands > 0;
  return clauses;
}

const exitRed = (label, failures) => {
  console.error(`RED knife-skin-markings [${label}]: ${failures.length} cláusula(s) falsa(s)`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
};

process.on('uncaughtException', (error) => {
  console.error('INFRA knife-skin-markings: exceção não tratada', error);
  process.exit(3);
});

try {
  THREE = await import('../../public/vendor/three.module.js');
  ({ GLTFLoader } = await import('../../public/vendor/addons/loaders/GLTFLoader.js'));
  ({ WEAPON_SKINS } = await import('../../public/js/data/weapon-skin-definitions.js'));
  ({ GOLDEN_VER } = await import('../../public/js/data/goldenver.js'));
  ({ footprintFullyCovered } = await import('../../public/js/knife-mark-support.js'));

  const selfTests = coverageSelfTests();
  const selfFailures = Object.entries(selfTests).filter(([, ok]) => !ok).map(([id]) => id);
  if (selfFailures.length) {
    console.error(`RED knife-skin-markings [selftest]: ${selfFailures.length} cláusula(s) falsa(s) — mutantes não rodaram`);
    for (const f of selfFailures) console.error(` - ${f}`);
    process.exit(1);
  }

  const fpFile = path.join(ROOT, 'public/models/viewmodels/coro/melee/knife-hires.glb');
  const tpFile = path.join(ROOT, 'public/models/weapons/knife.glb');
  const nominalSkin = makeSkin();
  const fpGltfFactory = () => load(fpFile);
  const tpTemplate = (await load(tpFile)).gltf.scene;
  const tpFactory = (skinId, skin = nominalSkin) => {
    preparedTexture(skin, skinId, skinId.startsWith('pack-caveira') ? 620 : 512, skinId.startsWith('pack-caveira') ? 420 : 512);
    const template = tpTemplate.clone(true);
    const before = rigSnapshot(template, []);
    const wrap = makeWeaponModelFactory(skin, template)('knife', skinId);
    return { wrap, before };
  };
  const tpAsFp = () => {
    const skinId = 'pack-caveira-urbana-knife';
    preparedTexture(nominalSkin, skinId, 620, 420);
    const wrap = new THREE.Group();
    wrap.add(tpTemplate.clone(true));
    wrap.rotation.set(0, Math.PI, 0);
    wrap.scale.setScalar(0.3);
    wrap.updateMatrixWorld(true);
    nominalSkin.applyWeaponSkinCandidate(wrap, 'knife', skinId, { knifeContext: 'knife-fp' });
    return wrap;
  };

  const nominal = {
    ...(await evaluate(nominalSkin, { fpGltfFactory, tpFactory })),
    ...crossContextClauses(tpAsFp()),
    ...(await integrityClauses(fpGltfFactory)),
  };

  const fpAsTpScene = (await fpGltfFactory()).gltf.scene;
  {
    let cam = null; fpAsTpScene.traverse((o) => { if (!cam && o.isCamera) cam = o; });
    if (cam) { fpAsTpScene.applyMatrix4(cam.matrixWorld.clone().invert()); cam.removeFromParent(); }
    fpAsTpScene.updateMatrixWorld(true);
    nominalSkin.applyWeaponSkinCandidate(fpAsTpScene, 'knife', 'pack-caveira-urbana-knife', { knifeContext: 'knife-tp' });
  }
  nominal['cross:fp-as-tp-rejected'] = fpAsTpScene.userData.knifeMarkings?.status === 'representation-mismatch'
    && markingsOf(fpAsTpScene, 'pack-caveira-urbana-knife').length === 0;
  const nominalFailures = Object.entries(nominal).filter(([, ok]) => !ok).map(([id]) => id);
  if (nominalFailures.length) {
    console.error(`RED knife-skin-markings [baseline]: ${nominalFailures.length} cláusula(s) falsa(s) — mutantes não rodaram`);
    for (const f of nominalFailures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log('baseline nominal GREEN: 4 casos attached, footprint independente, rig intacto, 30 poses finitas, cross-context recusado');

  // Mutantes: conjunto EXATO de cláusulas RED (sem sobra, sem falta); exceção = infra 3.
  const CASE_CLAUSE_IDS = (tag) => ['attached', 'roles-exact', 'count', 'aspect', 'parent', 'footprint'].map((c) => `${tag}:${c}`);
  const FULL = CASES.flatMap((c) => [...CASE_CLAUSE_IDS(`${c.id}#fp`), ...CASE_CLAUSE_IDS(`${c.id}#tp`)]);
  const APPLY_ANCHOR = '  placements.forEach(({ item, placement }) => addKnifePair(model, skinId, item.role, item.texture, frame, placement, context));';
  const NAN_HAND = '  model.traverse((o) => { if (o.isMesh && /Glove|Hand|Sleeve|Cloth/i.test(((Array.isArray(o.material) ? o.material[0] : o.material) || {}).name || \'\')) o.geometry.attributes.position.setX(0, NaN); });';
  const NAN_BIND = '  model.traverse((o) => { if (o.isSkinnedMesh && !/Glove|Hand|Sleeve|Cloth/i.test(((Array.isArray(o.material) ? o.material[0] : o.material) || {}).name || \'\')) o.bindMatrix.elements[12] = NaN; });';
  const MUTANTS = {
    'remove-branch-knife': {
      mutate: (s) => s.replace("if (weaponId === 'knife') return attachKnifeMarkings(model, skinId, knifeContext);", ''),
      expect: FULL,
    },
    'parent-root-1p': {
      mutate: (s) => s.replace('(frame.bone || model).add(marking);', 'model.add(marking);'),
      expect: CASES.flatMap((c) => [`${c.id}#fp:parent`, `${c.id}#fp:footprint`, `${c.id}#fp:follow-drift`]),
    },
    'remove-maga-slogan': {
      mutate: (s) => s.replace('if (definition.slogan) {', 'if (false && definition.slogan) {'),
      expect: ['pack-maga-47-knife#fp:roles-exact', 'pack-maga-47-knife#fp:count', 'pack-maga-47-knife#fp:aspect',
        'pack-maga-47-knife#tp:roles-exact', 'pack-maga-47-knife#tp:count', 'pack-maga-47-knife#tp:aspect'],
    },
    'footprint-fora': {
      mutate: (s) => s.replaceAll('along: 0.40', 'along: 9.4'),
      expect: FULL,
    },
    'profile-units-wrong': {
      mutate: (s) => s.replaceAll('sizeFrac: 0.62', 'sizeFrac: 62'),
      expect: FULL,
    },
    'footprint-guard-off': {
      mutate: (s) => s.replace('  if (!footprintFullyCovered(centerU, centerT, halfH, halfW, overlapping, profile.coverage)) return null;\n', ''),
      expect: ['pack-caveira-urbana-knife#fp:footprint', 'pack-maga-47-knife#tp:footprint'],
    },
    'slogan-uv-off': {
      mutate: s => s.replace('if (KNIFE_MARK_PROFILES[context].roles[role].longitudinal)', 'if (false)'),
      expect: ['pack-maga-47-knife#fp:aspect','pack-maga-47-knife#tp:aspect'],
    },
    'slogan-transversal': {
      mutate: s => s.replaceAll('longitudinal: true','longitudinal: false'),
      expect: ['pack-maga-47-knife#fp:aspect','pack-maga-47-knife#tp:aspect'],
    },
    'nan-bind': {
      mutate: (s) => s.replace(APPLY_ANCHOR, `${APPLY_ANCHOR}\n${NAN_BIND}`),
      expect: ['pack-caveira-urbana-knife#fp:knife-finite', 'pack-caveira-urbana-knife#fp:rig-intact',
        'pack-maga-47-knife#fp:knife-finite', 'pack-maga-47-knife#fp:rig-intact'],
    },
    'inverse-shift': {
      mutate: (s) => s.replace(APPLY_ANCHOR, `${APPLY_ANCHOR}\n  model.traverse(o=>{if(o.isSkinnedMesh&&!/Glove|Hand|Sleeve|Cloth/i.test(o.material?.name||'')){const i=o.skeleton.bones.findIndex(b=>b.name==='CoroWeapon');if(i>=0)o.skeleton.boneInverses[i].elements[12]+=.5;}});`),
      expect: ['pack-caveira-urbana-knife#fp:rig-intact','pack-maga-47-knife#fp:rig-intact'],
    },
    'nan-hand': {
      mutate: (s) => s.replace(APPLY_ANCHOR, `${APPLY_ANCHOR}\n${NAN_HAND}`),
      expect: ['pack-caveira-urbana-knife#fp:hands-finite', 'pack-caveira-urbana-knife#fp:rig-intact',
        'pack-maga-47-knife#fp:hands-finite', 'pack-maga-47-knife#fp:rig-intact'],
    },
  };
  for (const name of onlyArgs) if (!Object.hasOwn(MUTANTS,name)) usageExit(`mutante desconhecido \`${name}\``);
  const baseline = read('public/js/weapon-skins.js');
  const failures = [];
  for (const [name, { mutate, expect }] of Object.entries(MUTANTS)) {
    if (onlyArgs.length && !onlyArgs.includes(name)) continue;
    const mutated = mutate(baseline);
    if (mutated === baseline) { failures.push(`mutante ${name}: patch não aplicou`); continue; }
    const skin = makeSkin(() => mutated);
    const observed = Object.entries(await evaluate(skin, {
      fpGltfFactory,
      tpFactory: (id) => tpFactory(id, skin),
    })).filter(([, ok]) => !ok).map(([id]) => id).sort();
    const want = [...expect].sort();
    if (observed.length === 0) failures.push(`mutante ${name}: SOBREVIVEU (nenhuma cláusula RED)`);
    else if (observed.join('|') !== want.join('|')) {
      const missing = want.filter((id) => !observed.includes(id));
      const extra = observed.filter((id) => !want.includes(id));
      failures.push(`mutante ${name}: conjunto RED divergente (faltam [${missing}], sobram [${extra}])`);
    } else console.log(`mutante ${name} capturado pelo conjunto exato: ${observed.length} cláusulas`);
  }
  if (failures.length) exitRed('mutantes', failures);
  console.log('GREEN knife-skin-markings: baseline nominal + mutantes com cláusulas RED causais');
  process.exit(0);
} catch (error) {
  console.error('INFRA knife-skin-markings:', error);
  process.exit(3);
}
