#!/usr/bin/env node
// LAM0-LAM4: faca do passe (steelBlade) com lâmina de aço original — pintura, acabamento e letreiro
// só no cabo/guarda; na lâmina no máximo a gravação escura. 1P via _accept real (knife-fp), 3P via
// weaponModel real (knife-tp). Verdade independente: a cor do atlas original no UV de cada vértice.
// Mutante `lamina-envelopada`: a máscara some e a skin embrulha a lâmina — precisa reprovar.
// Exit: 0 GREEN · 1 RED · 2 USO incorreto · 3 infra/import.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MUTANTS = Object.freeze({
  'lamina-envelopada': (s) => s.replace('steelBlade ? knifeHandleMask(object.geometry) : null', 'null'),
});
const args = process.argv.slice(2);
const mutantArg = args.find((arg) => arg.startsWith('--mutante='));
const mutant = mutantArg?.slice('--mutante='.length) || null;
const prove = args.includes('--provar-mutante');
if (args.some((arg) => arg !== mutantArg && arg !== '--provar-mutante') || (mutant && !MUTANTS[mutant]) || (prove && !mutant)) {
  console.error('USO knife-steel-blade: [--mutante=lamina-envelopada --provar-mutante]');
  process.exit(2);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const FP_FILE = 'public/models/viewmodels/coro/melee/knife-hires.glb';
const TP_FILE = 'public/models/weapons/knife.glb';
// Texel claro do atlas = aço; escuro = cabo. Medido em 10/11/2026: aço mantido 0,966-0,967 da área
// clara (o resto é a face da guarda), cabo pintado 1,000 da área escura, nos dois GLBs.
const BRIGHT = 0.35;
const MIN_STEEL_KEPT = 0.95;
const MIN_HANDLE_PAINTED = 0.99;
const MAX_ETCH_LUMA = 0.3;

let THREE; let GLTFLoader; let WEAPON_SKINS; let GOLDEN_VER; let footprintFullyCovered; let FOOTPRINT_TOLERANCE; let ownVmResource; let sharp;

function readGlb(file) {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  let json; let bin;
  for (let p = 12; p < bytes.length;) {
    const length = bytes.readUInt32LE(p); const type = bytes.readUInt32LE(p + 4);
    if (type === 0x4e4f534a) json = JSON.parse(bytes.subarray(p + 8, p + 8 + length));
    if (type === 0x004e4942) bin = bytes.subarray(p + 8, p + 8 + length);
    p += 8 + length;
  }
  return { json, bin };
}

// Atlas de cor da faca embutido no GLB, decodificado fora do Three (sharp): a verdade do gate.
async function knifeAtlas(file) {
  const { json, bin } = readGlb(file);
  const material = json.materials.find((m) => m.name === 'knife Material');
  const texture = json.textures[material.pbrMetallicRoughness.baseColorTexture.index];
  const image = json.images[texture.extensions?.EXT_texture_webp?.source ?? texture.source];
  const view = json.bufferViews[image.bufferView];
  const start = view.byteOffset || 0;
  const { data, info } = await sharp(bin.subarray(start, start + view.byteLength)).greyscale().raw().toBuffer({ resolveWithObject: true });
  return (u, v) => {
    const x = Math.min(info.width - 1, Math.max(0, Math.floor(u * info.width)));
    const y = Math.min(info.height - 1, Math.max(0, Math.floor(v * info.height)));
    return data[y * info.width + x] / 255;
  };
}

// GLB sem imagens (Node não decodifica webp no GLTFLoader); o mapa original vira sentinela.
async function loadStripped(file) {
  const g = readGlb(file);
  const j = structuredClone(g.json);
  delete j.images; delete j.textures; delete j.samplers;
  j.materials = j.materials.map((m) => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } }));
  const pad = (b, fill = 0) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, fill)]);
  const jb = pad(Buffer.from(JSON.stringify(j)), 32); const bb = pad(g.bin);
  const out = Buffer.alloc(28 + jb.length + bb.length);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jb.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jb.copy(out, 20);
  out.writeUInt32LE(bb.length, 20 + jb.length); out.writeUInt32LE(0x004e4942, 24 + jb.length); bb.copy(out, 28 + jb.length);
  const gltf = await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), '');
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.material?.name === 'knife Material') {
      o.material.map = new THREE.Texture();
      o.material.map.name = 'atlas-original';
      o.material.userData.originalFinish = [o.material.roughness, o.material.metalness, o.material.envMapIntensity];
    }
  });
  return gltf;
}

function makeSkin(mutate) {
  const body = mutate(read('public/js/weapon-skins.js'))
    .replace(/^import .*;\n/gm, '').replace(/^export \{ WEAPON_SKINS \};\n/gm, '').replace(/^export /gm, '');
  return new Function('THREE', 'WEAPON_SKINS', 'PATTERN_TEXTURE_BUDGET', 'footprintFullyCovered', 'FOOTPRINT_TOLERANCE', 'ownVmResource',
    `${body}\nreturn {applyWeaponSkinCandidate, markTextures, patternTextures};`)(
    THREE, WEAPON_SKINS, { maxTextures: 99, maxSize: 512, maxBytes: 1 << 20 }, footprintFullyCovered, FOOTPRINT_TOLERANCE, ownVmResource);
}

// Consumidores reais: KnifeMeleeViewModel._accept (1P) e weaponModel (3P), como knife-skin-markings.
function fpModel(skin, skinId, gltf) {
  const body = read('public/js/meleevm.js').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const { KnifeMeleeViewModel } = new Function('THREE', 'applyWeaponSkinCandidate', 'applyTeamHandMaterial', 'refreshTeamHands', 'GLTFLoader', 'GOLDEN_VER',
    `${body}\nreturn {KnifeMeleeViewModel};`)(THREE, skin.applyWeaponSkinCandidate, (m) => m, () => {}, class {}, GOLDEN_VER);
  const vm = Object.create(KnifeMeleeViewModel.prototype);
  Object.assign(vm, { parent: new THREE.Group(), profile: {}, knifeSkinId: skinId, onReady: () => {}, weapon: 'knife',
    basePosition: new THREE.Vector3(), actions: new Map(), current: null, suspended: false });
  vm._accept(gltf);
  return vm.scene;
}
function tpModel(skin, skinId, template) {
  const source = read('public/js/weapons.js');
  const cfgStart = source.indexOf('const CFG =');
  const CFG = new Function(`${source.slice(cfgStart, source.indexOf('\n};', cfgStart) + 3)}\nreturn CFG;`)();
  const fn = source.slice(source.indexOf('export function weaponModel(')).replace(/^export /, '');
  const weaponModel = new Function('THREE', 'MODEL_ALIAS', '_cache', 'CFG', 'buildMag', 'applyWeaponSkinCandidate', 'reviewWeaponSkinId', 'measureGun',
    `${fn}\nreturn weaponModel;`)(THREE, {}, new Map([['knife', template]]), CFG, () => null, skin.applyWeaponSkinCandidate, () => null, () => null);
  return weaponModel('knife', skinId);
}

function prepare(skin, skinId) {
  const definition = WEAPON_SKINS[skinId];
  const mark = new THREE.Texture(); mark.image = { width: 512, height: 512 };
  skin.markTextures.set(skinId, mark);
  skin.patternTextures.set(definition.patternAsset, new THREE.Texture());
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({
    measureText: () => ({ width: 0 }), strokeText: () => {}, fillText: () => {} }) }) };
}

// Shader do material como o Three montaria: só as âncoras que a skin substitui.
function compiled(material) {
  const shader = {
    uniforms: {},
    vertexShader: 'void main() {\n#include <begin_vertex>\n}',
    fragmentShader: 'void main() {\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n}',
  };
  material.onBeforeCompile(shader);
  return shader;
}

function evaluateKnife(root, skinId, context, atlas) {
  const checks = {};
  root.updateMatrixWorld(true);
  let knife = null;
  root.traverse((o) => { if (o.isMesh && /^knife Material__skin_/.test(o.material?.name || '')) knife = o; });
  if (!knife) return { checks: { [`${skinId}#${context}:LAM1`]: false }, detail: { knife: 'ausente' } };
  const material = knife.material;
  const [roughness, metalness, envMapIntensity] = material.userData.originalFinish || [];
  checks.LAM1 = material.map?.name === 'atlas-original' && material.roughness === roughness
    && material.metalness === metalness && material.envMapIntensity === envMapIntensity;
  const mask = material.userData.steelBladeMask;
  const shader = compiled(material);
  checks.LAM2 = Array.isArray(mask) && mask.length === 4
    && shader.uniforms.weaponSkinKnife?.value?.toArray().every((v, i) => v === mask[i])
    && /diffuseColor\.rgb = mix\(weaponSkinSteel, diffuseColor\.rgb, weaponSkinHandle\)/.test(shader.fragmentShader)
    && /roughnessFactor = mix\(roughnessFactor, weaponSkinHandleFinish\.x, weaponSkinHandle\)/.test(shader.fragmentShader)
    && /metalnessFactor = mix\(metalnessFactor, weaponSkinHandleFinish\.y, weaponSkinHandle\)/.test(shader.fragmentShader);
  const positions = knife.geometry.attributes.position;
  const uv = knife.geometry.attributes.uv;
  const index = knife.geometry.index;
  const onHandle = (p) => !Array.isArray(mask) || p.x * mask[0] + p.y * mask[1] + p.z * mask[2] + mask[3] <= 0;
  const handleSide = (i) => onHandle(new THREE.Vector3().fromBufferAttribute(positions, i));
  // Área de cada triângulo no centróide: aço = texel claro do atlas, cabo = escuro. Sem máscara
  // a skin pinta a faca inteira, então tudo conta como cabo.
  let bright = 0; let steelKept = 0; let dark = 0; let handlePainted = 0;
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const total = index ? index.count : positions.count;
  for (let t = 0; t < total; t += 3) {
    const ids = [0, 1, 2].map((k) => (index ? index.getX(t + k) : t + k));
    ids.forEach((id, k) => corners[k].fromBufferAttribute(positions, id));
    const area = new THREE.Triangle(...corners).getArea();
    const centroid = corners[0].clone().add(corners[1]).add(corners[2]).divideScalar(3);
    const u = ids.reduce((sum, id) => sum + uv.getX(id), 0) / 3;
    const w = ids.reduce((sum, id) => sum + uv.getY(id), 0) / 3;
    if (atlas(u, w) > BRIGHT) { bright += area; if (!onHandle(centroid)) steelKept += area; } else { dark += area; if (onHandle(centroid)) handlePainted += area; }
  }
  const steelRatio = steelKept / Math.max(bright, 1e-12);
  const handleRatio = handlePainted / Math.max(dark, 1e-12);
  checks.LAM3 = steelRatio >= MIN_STEEL_KEPT && handleRatio >= MIN_HANDLE_PAINTED;
  // Marcas: centro de cada plano contra o vértice da faca mais próximo, no mundo (pose de bind).
  const world = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    if (knife.isSkinnedMesh) knife.getVertexPosition(i, v); else v.fromBufferAttribute(positions, i);
    world.push(v.clone().applyMatrix4(knife.matrixWorld));
  }
  const marks = [];
  root.traverse((o) => { if (o.isMesh && /^skin-(?:symbol|slogan)-/.test(o.name) && o.userData.weaponSkin === skinId) marks.push(o); });
  const side = (mark) => {
    const center = new THREE.Vector3().setFromMatrixPosition(mark.matrixWorld);
    let best = 0; let bestD = Infinity;
    world.forEach((p, i) => { const d = p.distanceToSquared(center); if (d < bestD) { bestD = d; best = i; } });
    return handleSide(best) ? 'cabo' : 'lamina';
  };
  const placed = marks.map((mark) => ({ role: mark.userData.markingRole, side: side(mark), luma: mark.material.color.r * 0.299 + mark.material.color.g * 0.587 + mark.material.color.b * 0.114 }));
  checks.LAM4 = placed.length === 4
    && placed.every((m) => m.side === 'cabo' || (m.role === 'symbol' && m.luma <= MAX_ETCH_LUMA))
    && placed.filter((m) => m.side === 'lamina').length <= 2;
  const detail = { steelRatio: +steelRatio.toFixed(3), handleRatio: +handleRatio.toFixed(3), bright, dark, marks: placed.map((m) => `${m.role}:${m.side}:${m.luma.toFixed(2)}`) };
  return { checks: Object.fromEntries(Object.entries(checks).map(([id, ok]) => [`${skinId}#${context}:${id}`, ok])), detail };
}

process.on('uncaughtException', (error) => { console.error('INFRA knife-steel-blade:', error); process.exit(3); });
try {
  THREE = await import('../../public/vendor/three.module.js');
  ({ GLTFLoader } = await import('../../public/vendor/addons/loaders/GLTFLoader.js'));
  ({ WEAPON_SKINS } = await import('../../public/js/data/weapon-skin-definitions.js'));
  ({ GOLDEN_VER } = await import('../../public/js/data/goldenver.js'));
  ({ footprintFullyCovered, FOOTPRINT_TOLERANCE } = await import('../../public/js/knife-mark-support.js'));
  ({ ownVmResource } = await import('../../public/js/vmownership.js'));
  sharp = (await import('sharp')).default;
} catch (error) {
  console.error('INFRA knife-steel-blade: import', error);
  process.exit(3);
}

const knives = Object.values(WEAPON_SKINS).filter((s) => s.passe && s.targetWeapons.includes('knife')).map((s) => s.id);
const results = { LAM0: knives.length === 3 && knives.every((id) => WEAPON_SKINS[id].steelBlade === true) };
const details = {};
const skin = makeSkin(mutant ? MUTANTS[mutant] : (s) => s);
const atlases = { 'knife-fp': await knifeAtlas(FP_FILE), 'knife-tp': await knifeAtlas(TP_FILE) };
const tpTemplate = (await loadStripped(TP_FILE)).scene;
for (const skinId of knives) {
  prepare(skin, skinId);
  for (const [context, root] of [
    ['knife-fp', fpModel(skin, skinId, await loadStripped(FP_FILE))],
    ['knife-tp', tpModel(skin, skinId, tpTemplate.clone(true))],
  ]) {
    const { checks, detail } = evaluateKnife(root, skinId, context, atlases[context]);
    Object.assign(results, checks);
    details[`${skinId}#${context}`] = detail;
  }
}
// LAM5: o gate morde — sem a máscara a mesma faca reprovaria (prova embutida, sem mutar arquivo).
const failed = Object.entries(results).filter(([, ok]) => !ok).map(([id]) => id);
console.log(JSON.stringify({ pass: failed.length === 0, mutant, failed, details }, null, 2));
if (prove) {
  if (failed.length === 0) { console.error(`RED knife-steel-blade: mutante ${mutant} SOBREVIVEU`); process.exit(1); }
  console.log(`mutante ${mutant} capturado: ${failed.length} cláusula(s) RED`);
  process.exit(0);
}
if (failed.length) { console.error(`RED knife-steel-blade: ${failed.join(', ')}`); process.exit(1); }
console.log(`GREEN knife-steel-blade: ${knives.length} facas × 1P/3P com lâmina de aço e pintura só no cabo`);
