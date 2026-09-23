#!/usr/bin/env node
/**
 * Régua da RECARGA DE FITA NA TELA (crítico cego r2, 23/09: "recarga não mostra tampa, caixa
 * nem fita em nenhum dos 8 quadros"). O `lmg-final-verify` mede a tampa por rotação LOCAL no
 * rig e passa; esta régua mede o que a câmera vê. Passa o produto pelo `cameraSpacePackage`
 * REAL, pousa idle e as duas recargas com o mount do runtime e projeta os vértices de cada peça
 * (peso dominante no osso da peça) em 1440×960:
 *   - TAMPA: na recarga, ≥ PECA_MIN dos vértices no quadro e a caixa da tampa na tela muda
 *     ≥ TAMPA_PX px em relação ao idle (abrir tem de se ver);
 *   - CAIXA/FITA: ≥ PECA_MIN dos vértices no quadro em algum instante da recarga;
 *   - no idle, o centro da tampa fica a ≤ ENCAIXE_M da caixa envolvente do corpo da arma.
 * Procedência dos limiares: produto do catálogo (lmg-candidate1) tem 0% da tampa no quadro e a
 * tampa a 0,41 m do corpo; `--mutante=produto-velho` mede esse arquivo e tem de ficar vermelho.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

globalThis.self ??= globalThis;
globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(v) { queueMicrotask(() => this.onload?.()); } };
const quiet = (fn) => (...args) => !/Couldn't load texture|THREE\.GLTFLoader/.test(String(args[0] || '')) && fn(...args);
console.warn = quiet(console.warn);
console.error = quiet(console.error);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const mutante = arg('mutante') || '';
if (mutante && mutante !== 'produto-velho') throw new Error(`mutante desconhecido ${mutante}`);
const CATALOGO = '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-staging/lmg-candidate1/viewmodels';
const ASSETS = mutante ? CATALOGO : path.join(ROOT, 'public/private-assets/viewmodels');
const FILE = path.join(ASSETS, 'lmg/lmg-baked-runtime.glb');
const W = 1440, H = 960, NEAR = 0.01;
const PECA_MIN = 0.3, TAMPA_PX = 40, ENCAIXE_M = 0.12;
const PARTS = { tampa: /^(MINT_MECH_LMG_COVER|Top_Catch)$/, caixa: /^MINT_AMMO_LMG_BOX$/, fita: /^(MINT_AMMO_LMG_BELT|bullet_\d+)$/, corpo: /^neutral_bone$/ };

const base = pathToFileURL(path.join(ROOT, 'public/js/authoredvm.js'));
let source = fs.readFileSync(base, 'utf8').replace(/from (['"])([^'"]+)\1/g, (_, q, s) => `from ${q}${s.startsWith('.') ? new URL(s, base).href : import.meta.resolve(s)}${q}`);
const { cameraSpacePackage } = await import(`data:text/javascript;base64,${Buffer.from(`${source}\nexport { cameraSpacePackage };`).toString('base64')}`);
if (!fs.existsSync(FILE)) { console.log(JSON.stringify({ regua: 'vm-lmg-tampa-tela', ok: false, erro: `ausente ${FILE}` })); process.exit(1); }
const bytes = fs.readFileSync(FILE);
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const parent = new THREE.Group();
const entry = cameraSpacePackage(gltf, { id: 'regua', faction: 'E' }, parent, 'lmg', 'lmg#lmg');
const GET = ['getX', 'getY', 'getZ', 'getW'];
const groups = Object.fromEntries(Object.keys(PARTS).map((k) => [k, []]));
for (const mesh of entry.weaponMeshes) {
  if (!mesh.isSkinnedMesh) continue;
  const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
  for (let i = 0; i < si.count; i += 3) {
    let best = 0, bw = -1;
    for (let c = 0; c < 4; c += 1) { const w = sw[GET[c]](i); if (w > bw) { bw = w; best = si[GET[c]](i); } }
    const name = mesh.skeleton.bones[best]?.name || '';
    for (const [k, re] of Object.entries(PARTS)) if (re.test(name)) groups[k].push([mesh, i]);
  }
}
const rot = entry.frame.rotDeg || [0, 0, 0];
const fov = (() => { const v0 = entry.cameraFov * Math.PI / 180; const h = Math.atan(Math.tan(v0 / 2) * (entry.cameraAspect || 16 / 9)); return 2 * Math.atan(Math.tan(h) / (W / H)); })();
const half = Math.tan(fov / 2);
const v = new THREE.Vector3();
function sample(k) {
  entry.mount.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
  entry.mount.position.set(entry.frame.x, entry.frame.y, entry.frame.z);
  parent.updateMatrixWorld(true);
  let inside = 0;
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  const centre = new THREE.Vector3();
  const bounds = new THREE.Box3();
  for (const [mesh, i] of groups[k]) {
    v.fromBufferAttribute(mesh.geometry.attributes.position, i);
    mesh.applyBoneTransform(i, v);
    v.applyMatrix4(mesh.matrixWorld);
    centre.add(v);
    bounds.expandByPoint(v);
    const depth = -v.z;
    if (depth <= NEAR) continue;
    const px = (v.x / (depth * half * (W / H)) * 0.5 + 0.5) * W, py = (0.5 - v.y / (depth * half) * 0.5) * H;
    if (px < 0 || px > W || py < 0 || py > H) continue;
    inside += 1;
    box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], py); box[2] = Math.max(box[2], px); box[3] = Math.max(box[3], py);
  }
  return { dentro: groups[k].length ? inside / groups[k].length : 0, caixa: inside ? box.map((x) => Math.round(x)) : null, centro: centre.divideScalar(Math.max(1, groups[k].length)), bounds };
}
const mixer = new THREE.AnimationMixer(entry.scene);
const pose = (clip, t) => { mixer.stopAllAction(); mixer.clipAction(clip).reset().play(); mixer.setTime(clip.duration * t); };
const idleClip = gltf.animations.find((c) => c.name === 'idle');
pose(idleClip, 0);
const idle = Object.fromEntries(Object.keys(PARTS).map((k) => [k, sample(k)]));
const encaixe = idle.corpo.bounds.distanceToPoint(idle.tampa.centro);
const checks = [{ nome: `idle: tampa assenta no corpo (${encaixe.toFixed(3)} m ≤ ${ENCAIXE_M})`, ok: encaixe <= ENCAIXE_M }];
for (const name of ['reload_tactical', 'reload_empty']) {
  const clip = gltf.animations.find((c) => c.name === name);
  if (!clip) { checks.push({ nome: `${name}: clipe ausente`, ok: false }); continue; }
  let tampa = 0, mov = 0, caixa = 0, fita = 0;
  for (let s = 0; s <= 24; s += 1) {
    pose(clip, s / 24);
    const t = sample('tampa'), c = sample('caixa'), f = sample('fita');
    tampa = Math.max(tampa, t.dentro); caixa = Math.max(caixa, c.dentro); fita = Math.max(fita, f.dentro);
    if (t.caixa && idle.tampa.caixa && t.dentro >= PECA_MIN) mov = Math.max(mov, ...t.caixa.map((x, i) => Math.abs(x - idle.tampa.caixa[i])));
  }
  checks.push({ nome: `${name}: tampa no quadro (${(tampa * 100).toFixed(0)}% ≥ ${PECA_MIN * 100}%)`, ok: tampa >= PECA_MIN });
  checks.push({ nome: `${name}: tampa se move na tela (${mov} px ≥ ${TAMPA_PX})`, ok: mov >= TAMPA_PX });
  checks.push({ nome: `${name}: caixa no quadro (${(caixa * 100).toFixed(0)}%)`, ok: caixa >= PECA_MIN });
  checks.push({ nome: `${name}: fita no quadro (${(fita * 100).toFixed(0)}%)`, ok: fita >= PECA_MIN });
}
const ok = checks.every((c) => c.ok);
for (const c of checks) console.log(`${c.ok ? 'OK   ' : 'FALHA'} ${c.nome}`);
console.log(JSON.stringify({ regua: 'vm-lmg-tampa-tela', mutante: mutante || null, arquivo: FILE, ok }));
process.exitCode = ok ? 0 : 1;
