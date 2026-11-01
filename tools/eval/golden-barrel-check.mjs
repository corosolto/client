// R106/R107 (13 tiros ADS reais): o fallback estava 0.004359 unidades atrás
// da face do cano; separação em tela ~4px. CI mede contrato/montagem, não arte.
// --asset=... repete a geometria no GLB privado real, sem render nem texturas.
import * as THREE from 'three';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { attachGoldenBarrel } from '../../public/js/golden-barrel.js';
import { AuthoredViewModels } from '../../public/js/authoredvm.js';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const sourceURL = new URL('../../public/js/golden-barrel.js', import.meta.url);
const caller = await readFile(new URL('../../public/js/authoredvm.js', import.meta.url), 'utf8');
const start = caller.indexOf('      this._applyWeaponSkin(entry, entry.mint?.weaponId || bakedWeapon);');
const end = caller.indexOf('      // AK golden: ADS', start);
if (start < 0 || end <= start) throw Error('Factory não localizada: não medi a ligação do socket');
const setup = caller.slice(start, end);
const assetPath = process.argv.find(a => a.startsWith('--asset='))?.slice(8);
// Bounds medidos independentemente nos vértices da face do GLB4094c0534f,
// no espaço Rifle (R100/R110). Não lemos o ponto de VM_WEAPON como referência.
const min = [-0.009436332139595095, 0.5414973541893007, 0.0008853566484062769];
const max = [-0.004615031112756451, 0.5414973544052288, 0.002492457263015682];
let asset = null;
if (assetPath) {
  const bytes = await readFile(assetPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== '4094c0534f081ac96f1d6401d651c942b2b8d39dc777be30b15875706be0c48d') throw Error('Revisão real desconhecida: recalibrar antes de aceitar');
  // Texturas não participam desta prova de coordenadas; o stub não é aceite visual.
  globalThis.self = globalThis;
  globalThis.Image = class { width = 1; height = 1; set src(_) { queueMicrotask(() => this.onload?.()); } };
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
  globalThis.ProgressEvent ??= class { constructor(type, data) { this.type = type; Object.assign(this, data); } };
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('../../public/vendor/meshopt_decoder.module.js');
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  asset = { gltf, sha256, bytes: bytes.length };
}

function fixture() {
  const scene = new THREE.Group(), mount = new THREE.Group();
  mount.add(scene); mount.visible = true;
  let body, bones;
  if (asset) {
    // Cada auditoria roda em série; o esqueleto real é reutilizado após limpar o socket.
    scene.add(asset.gltf.scene);
    body = scene.getObjectByName('coro_solto_project_ak_body');
    bones = body.skeleton.bones;
    for (const b of bones) for (const child of [...b.children]) if (child.name === 'SOCKET_GOLD_BARREL') b.remove(child);
  } else {
    bones = Array.from({ length: 70 }, (_, i) => { const b = new THREE.Bone(); b.name = i === 69 ? 'Rifle_metarig' : `joint${i}`; return b; });
    scene.add(...bones);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(4869 * 3), 3));
    const indices = new Uint16Array(4869 * 4), weights = new Float32Array(4869 * 4);
    for (let i = 0; i < 4869; i++) { indices[i * 4] = 69; weights[i * 4] = 1; }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    body = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    body.name = 'coro_solto_project_ak_body'; scene.add(body);
    scene.updateMatrixWorld(true); body.bind(new THREE.Skeleton(bones), new THREE.Matrix4());
  }
  const reference = new THREE.Vector3().fromArray(min).add(new THREE.Vector3().fromArray(max)).multiplyScalar(0.5);
  if (asset) {
    const positions = body.geometry.attributes.position;
    const joints = body.geometry.attributes.skinIndex, weights = body.geometry.attributes.skinWeight;
    const points = [];
    for (let i = 0; i < positions.count; i++) {
      const j = new THREE.Vector4().fromBufferAttribute(joints, i), w = new THREE.Vector4().fromBufferAttribute(weights, i);
      if ([0, 1, 2, 3].some(k => w.getComponent(k) !== 0 && (w.getComponent(k) !== 1 || j.getComponent(k) !== 69)) || w.x + w.y + w.z + w.w !== 1) throw Error('Corpo deixou de ser rígido no Rifle');
      points.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(body.skeleton.boneInverses[69]));
    }
    const top = Math.max(...points.map(p => p.y));
    // Banda numérica da face (R100): span2.16e-10, próxima camada0.001685.
    const cap = points.filter(p => top - p.y < 1e-5);
    if (positions.count !== 4869 || cap.length !== 14) throw Error('Face não reconhecida: não medi o asset aprovado');
    reference.copy(new THREE.Box3().setFromPoints(cap).getCenter(new THREE.Vector3()));
  }
  const entry = { key: 'gold#ak', golden: true, scene, mount, weaponMeshes: [body], sockets: { muzzle: null, sight: null } };
  return { entry, body, bone: bones[69], reference };
}

function audit(attach = attachGoldenBarrel, factory = setup) {
  const checks = [], add = (name, ok, detail = '') => checks.push({ name, ok: ok === true, detail });
  const { entry, body, bone, reference } = fixture();
  const factoryCall = new Function('entry', 'bakedWeapon', 'attachGoldenBarrel', factory);
  factoryCall.call({ _applyWeaponSkin() {} }, entry, 'ak', attach);
  const socket = entry.sockets.boca;
  add('factory instala boca física', !!socket && socket.parent === bone);
  const consumer = { entry: () => entry, _frontMuzzle: AuthoredViewModels.prototype._frontMuzzle };
  const mixer = asset ? new THREE.AnimationMixer(asset.gltf.scene) : null;
  let worst = 0;
  // Movimento de osso + pacote: o consumidor real acompanha a boca, sem ponto de tela.
  for (const t of [0, 0.1, 0.4, 0.9]) {
    if (mixer) {
      const name = ({ 0: 'Idle', 0.1: 'Shoot', 0.4: 'Reload', 0.9: 'Equip' })[t];
      const clip = asset.gltf.animations.find(c => c.name === name);
      if (!clip) throw Error(`Animação ausente: ${name}`);
      mixer.stopAllAction(); mixer.clipAction(clip).reset().play(); mixer.setTime(clip.duration * t);
    }
    entry.mount.position.set(t, -t / 2, -0.3);
    entry.mount.rotation.set(t / 5, -t, t / 3);
    if (!asset) { bone.position.set(t / 2, t, -t); bone.rotation.set(-t / 2, t / 3, t); }
    entry.scene.updateWorldMatrix(true, true);
    const expected = reference.clone().applyMatrix4(bone.matrixWorld);
    const got = AuthoredViewModels.prototype.muzzleVm.call(consumer, 'ak');
    const error = got ? got.distanceTo(expected) : Infinity;
    worst = Math.max(worst, error);
    // Erro de aritmética double, não limiar de percepção/pixels.
    const epsilon = 64 * Number.EPSILON * Math.max(1, expected.length());
    add(`boca acompanha rig/${t}`, error <= epsilon, `erro=${error}, epsilon=${epsilon}`);
  }
  const second = attach(entry);
  add('reequipar não duplica socket', !!socket && second === socket && bone.children.filter(c => c.name === 'SOCKET_GOLD_BARREL').length === 1);
  const before = entry.sockets;
  entry.key = 'gold#m4'; add('outra arma conserva sockets', attach(entry) === null && entry.sockets === before); entry.key = 'gold#ak';
  const old = body.bindMode; body.bindMode = 'detached'; add('bind desconhecido recusado', attach(entry) === null); body.bindMode = old;
  const name = bone.name; bone.name = 'outra_rifle'; add('rig desconhecido recusado', attach(entry) === null); bone.name = name;
  const revision = VM_WEAPON.ak.bocaGolden.revision;
  try { VM_WEAPON.ak.bocaGolden.revision = 'nova'; add('revisão desconhecida recusada', attach(entry) === null); }
  finally { VM_WEAPON.ak.bocaGolden.revision = revision; }
  mixer?.stopAllAction();
  return { ok: checks.every(c => c.ok), worstCoordinateError: worst, checks };
}

const result = audit();
result.scope = asset ? 'actual GLB geometry + production factory/consumer; no render/textures' : 'contract fixture + production factory/consumer; actual loaded geometry and visual acceptance require --asset and Ego';
if (asset) result.asset = { sha256: asset.sha256, bytes: asset.bytes };
if (process.argv.includes('--mutantes')) {
  const source = await readFile(sourceURL, 'utf8');
  const mutants = {
    'sem-boca': ['  const spec = VM_WEAPON.ak.bocaGolden;', '  return null;\n  const spec = VM_WEAPON.ak.bocaGolden;'],
    'slab-antigo': ['socket.position.fromArray(spec.point);', 'socket.position.set(-0.0062099671404572, 0.537138315246009, 0.0060134805692030);'],
    'escopo-solto': ["if (entry?.key !== 'gold#ak' || entry.golden !== true) return null;", 'if (false) return null;'],
  };
  result.mutations = [];
  for (const [name, [before, after]] of Object.entries(mutants)) {
    if (source.split(before).length !== 2) throw Error(`Mutante não aplicado uma única vez: ${name}`);
    const code = source.replace(before, after).replace(/from '([^']+)'/g, (_, s) => `from '${s.startsWith('.') ? new URL(s, sourceURL).href : import.meta.resolve(s)}'`);
    const m = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    const r = audit(m.attachGoldenBarrel);
    result.mutations.push({ name, detected: !r.ok, failed: r.checks.filter(c => !c.ok).map(c => c.name) });
  }
  if (setup.split('attachGoldenBarrel(entry);').length !== 2) throw Error('Mutante de consumidor ambíguo');
  const noCaller = audit(attachGoldenBarrel, setup.replace('attachGoldenBarrel(entry);', ''));
  result.mutations.push({ name: 'factory-sem-ligacao', detected: !noCaller.ok, failed: noCaller.checks.filter(c => !c.ok).map(c => c.name) });
  result.ok &&= result.mutations.every(m => m.detected);
}
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
