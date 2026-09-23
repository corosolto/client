#!/usr/bin/env node
/**
 * Palco offline do viewmodel K: passa o GLB pelo `cameraSpacePackage` REAL do runtime (manga
 * estendida do `vmsleeve.js` incluída), pousa um clipe, aplica o mount do frame (e o arco de
 * saque) e rasteriza em software na câmera do jogo. O `vmpose-preview.mjs` desenha o GLB cru e
 * não vê a extensão da manga — que é o "braço que cobre a tela" da rem700 (fila P9).
 *
 * Mede, por quadro, a fração da tela coberta por manga, luva, pele e arma, e a maior mancha de
 * manga na metade central (o que o crítico chama de "braço na frente").
 *
 * Uso:
 *   node tools/viewmodels/prep/vm-palco-offline.mjs --arma=rem700 [--glb=<arquivo>] \
 *     [--clipes=idle,reload_empty,...] [--passos=8] [--aspecto=3x2] [--png=<dir>] [--json]
 * Sem --glb, lê o produto servido (public/private-assets ou CSBRASIL_VM_ASSET_ROOT).
 * A figura que decide continua sendo o jogo (vm-arsenal-frames / capture-l1).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

globalThis.self ??= globalThis;
globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(v) { queueMicrotask(() => this.onload?.()); } };
globalThis.ImageData ??= class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
const quiet = (fn) => (...args) => !/Couldn't load texture|THREE\.GLTFLoader/.test(String(args[0] || '')) && fn(...args);
console.warn = quiet(console.warn);
console.error = quiet(console.error);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const href = (p) => new URL(`file://${p}`).href;
const opt = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const ASSETS = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  ? path.join(process.env.CSBRASIL_VM_ASSET_ROOT, 'viewmodels') : path.join(ROOT, 'public/private-assets/viewmodels'));
export const ASPECTOS = { '3x2': [720, 480], '16x9': [720, 405] };

async function runtimeModule(file, extra) {
  const base = href(path.join(ROOT, file));
  let source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  // --sem-extensao: diagnóstico (o que é manga do produto e o que é o tubo do runtime).
  if (process.argv.includes('--sem-extensao')) source = source.replace('extendSleeveOpenings(object, { space: mount, pose: { root: scene, clip: idleClip } });', ';');
  source = source.replace(/from (['"])([^'"]+)\1/g, (_, q, spec) => `from ${q}${spec.startsWith('.') ? new URL(spec, base).href : import.meta.resolve(spec)}${q}`);
  return import(`data:text/javascript;base64,${Buffer.from(source + extra).toString('base64')}`);
}
const { cameraSpacePackage } = await runtimeModule('public/js/authoredvm.js', '\nexport { cameraSpacePackage };');
export const { VM_WEAPON } = await import(href(path.join(ROOT, 'public/js/data/vmconfig.js')));

const loader = new GLTFLoader();
const parse = (file) => { const b = fs.readFileSync(file); return loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ''); };
const materialsOf = (o) => (Array.isArray(o.material) ? o.material : [o.material]);

export function arquivoDa(arma) {
  const c = VM_WEAPON[arma];
  return path.join(ASSETS, c.family, c.runtime === 'family' ? `${c.family}-runtime.glb` : `${arma}-baked-runtime.glb`);
}

export async function montar(arma, glb = arquivoDa(arma)) {
  const config = VM_WEAPON[arma];
  const gltf = await parse(glb);
  gltf.scene.traverse((o) => { if (o.isMesh) o.userData.__mats = materialsOf(o).map((m) => m?.name || ''); });
  const parent = new THREE.Group();
  const entry = cameraSpacePackage(gltf, { id: 'palco', faction: 'E' }, parent, config.family, `${config.family}#${arma}`);
  entry.mount.visible = true;
  const clipes = new Map(gltf.animations.map((c) => [c.name, c]));
  if (!clipes.has('equip_rifle')) {
    const g = path.join(ASSETS, 'shared/general-runtime.glb');
    if (fs.existsSync(g)) { const eq = (await parse(g)).animations.find((c) => c.name === 'equip_rifle'); if (eq) clipes.set('equip_rifle', eq); }
  }
  const mixer = new THREE.AnimationMixer(entry.scene);
  return { arma, entry, parent, clipes, mixer };
}

// Pousa o clipe na fração f (0..1); `saque` aplica o arco procedural do runtime no mesmo f.
export function pousar(palco, clipe, f, { saque = false } = {}) {
  const { entry, mixer, clipes, parent } = palco;
  const clip = clipes.get(clipe);
  if (!clip) throw new Error(`${palco.arma}: clipe ${clipe} ausente`);
  mixer.stopAllAction();
  const action = mixer.clipAction(clip);
  action.reset().play();
  mixer.setTime(clip.duration * f);
  const rot = entry.frame.rotDeg || [0, 0, 0];
  let drawY = 0, drawRx = 0;
  if (saque && entry.frame.drawDrop) {
    const eased = 1 - Math.pow(1 - f, 3);
    drawY = -(entry.frame.drawDrop) * (1 - eased); drawRx = 0.24 * (1 - eased);
  }
  entry.mount.rotation.set(rot[0] * Math.PI / 180 + drawRx, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
  entry.mount.position.set(entry.frame.x, entry.frame.y + drawY, entry.frame.z);
  parent.updateMatrixWorld(true);
}

const fovFor = (entry, aspect) => {
  const v0 = entry.cameraFov * Math.PI / 180;
  const halfH = Math.atan(Math.tan(v0 / 2) * (entry.cameraAspect || 16 / 9));
  return 2 * Math.atan(Math.tan(halfH) / aspect);
};
const CLASSE = (nome) => (/Cloth|Sleeve/i.test(nome) ? 1 : /Glove/i.test(nome) ? 2 : /FP_Hand/i.test(nome) ? 3 : 4);
const COR = { 1: [0.62, 0.2, 0.26], 2: [0.28, 0.32, 0.4], 3: [0.82, 0.6, 0.47], 4: [0.6, 0.6, 0.6], 5: [0.95, 0.55, 0.1], 6: [0.5, 0.2, 0.7] };
const LADOS = process.argv.includes('--lados');

// Raster com z-buffer; devolve frações por classe e a figura (opcional).
export async function rasterizar(palco, { aspecto = '3x2', arquivo = '' } = {}) {
  const { entry } = palco;
  const [w, h] = ASPECTOS[aspecto];
  const asp = w / h;
  const half = Math.tan(fovFor(entry, asp) / 2);
  const z = new Float32Array(w * h).fill(Infinity);
  const dono = new Uint8Array(w * h);
  const img = arquivo ? Buffer.alloc(w * h * 3, 235) : null;
  const v = new THREE.Vector3();
  const NEAR = 0.02;
  const triangulo = ([ax, ay, za], [bx, by, zb], [cx, cy, zc], classe, base) => {
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (Math.abs(area) < 1e-9) return;
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    if (minx > maxx || miny > maxy) return;
    const luz = img ? 0.55 + 0.45 * Math.abs(area) / (Math.abs(area) + 50) : 1;
    for (let y = miny; y <= maxy; y += 1) {
      for (let x = minx; x <= maxx; x += 1) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area;
        const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const d = w0 * za + w1 * zb + w2 * zc;
        const o = y * w + x;
        if (d >= z[o]) continue;
        z[o] = d; dono[o] = classe;
        if (img) { img[o * 3] = base[0] * luz * 255; img[o * 3 + 1] = base[1] * luz * 255; img[o * 3 + 2] = base[2] * luz * 255; }
      }
    }
  };
  const meshes = [...entry.handMeshes, ...entry.weaponMeshes].filter((m) => m.visible && m.geometry?.attributes?.position);
  for (const mesh of meshes) {
    let vis = true; mesh.traverseAncestors((a) => { if (!a.visible) vis = false; });
    if (!vis) continue;
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const P = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = -v.z;
    }
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    const grupos = g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
    const mats = materialsOf(mesh.material);
    for (const gr of grupos) {
      const mat = mats[gr.materialIndex ?? 0] || mats[0];
      const nomes = mesh.userData.__mats || [];
      const classe = CLASSE(nomes[gr.materialIndex ?? 0] ?? nomes[0] ?? mat?.name ?? '');
      const base = classe === 4 && mat?.color ? [mat.color.r, mat.color.g, mat.color.b].map((c) => 0.25 + c * 0.55) : COR[classe];
      for (let k = gr.start; k < gr.start + gr.count; k += 3) {
        const a = idx ? idx.getX(k) : k, b = idx ? idx.getX(k + 1) : k + 1, c = idx ? idx.getX(k + 2) : k + 2;
        // Recorte no plano próximo (o tubo da manga atravessa a câmera: sem recorte ele some).
        let poli = [a, b, c].map((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
        const rec = [];
        for (let q = 0; q < 3; q += 1) {
          const u = poli[q], t = poli[(q + 1) % 3];
          const ud = u[2] >= NEAR, td = t[2] >= NEAR;
          if (ud) rec.push(u);
          if (ud !== td) { const f = (NEAR - u[2]) / (t[2] - u[2]); rec.push([u[0] + (t[0] - u[0]) * f, u[1] + (t[1] - u[1]) * f, NEAR]); }
        }
        if (rec.length < 3) continue;
        let cor = base;
        // --lados (diagnóstico): manga do braço esquerdo vermelha, direito laranja, tubo no tronco roxo.
        if (LADOS && classe === 1 && mesh.isSkinnedMesh) {
          const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
          let bi = 0, bw = -1; for (let q = 0; q < 4; q += 1) if (sw.getComponent(a, q) > bw) { bw = sw.getComponent(a, q); bi = si.getComponent(a, q); }
          const nome = mesh.skeleton.bones[bi]?.name || '';
          cor = /_r$/.test(nome) ? COR[5] : /_l$/.test(nome) ? COR[1] : COR[6];
        }
        poli = rec.map(([x, y, d]) => [(x / (d * half * asp) + 1) * w / 2, (1 - y / (d * half)) * h / 2, d]);
        for (let q = 1; q + 1 < poli.length; q += 1) triangulo(poli[0], poli[q], poli[q + 1], classe, cor);
      }
    }
  }
  const conta = [0, 0, 0, 0, 0];
  let mangaCentro = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const c = dono[y * w + x]; conta[c] += 1;
    if (c === 1 && x > w * 0.25 && x < w * 0.75) mangaCentro += 1;
  }
  if (img) {
    const cx = w >> 1, cy = h >> 1;
    for (let d = -6; d <= 6; d += 1) for (const [x, y] of [[cx + d, cy], [cx, cy + d]]) { const o = y * w + x; img[o * 3] = 0; img[o * 3 + 1] = 160; img[o * 3 + 2] = 160; }
    await sharp(img, { raw: { width: w, height: h, channels: 3 } }).png().toFile(arquivo);
  }
  const t = w * h;
  return { manga: conta[1] / t, luva: conta[2] / t, pele: conta[3] / t, arma: conta[4] / t, mangaCentro: mangaCentro / (t / 2) };
}

if (process.argv[1] && import.meta.url === href(path.resolve(process.argv[1]))) {
  const arma = opt('arma');
  const palco = await montar(arma, opt('glb') ? path.resolve(opt('glb')) : arquivoDa(arma));
  const clipes = opt('clipes') ? opt('clipes').split(',') : [...palco.clipes.keys()];
  const passos = +opt('passos', '8');
  const png = opt('png');
  if (png) fs.mkdirSync(png, { recursive: true });
  const linhas = [];
  for (const clipe of clipes) {
    for (let s = 0; s <= passos; s += 1) {
      const f = s / passos;
      pousar(palco, clipe, f, { saque: clipe === 'equip_rifle' });
      const r = await rasterizar(palco, { aspecto: opt('aspecto', '3x2'), arquivo: png ? path.join(png, `${arma}-${clipe}-${String(Math.round(f * 100)).padStart(3, '0')}.png`) : '' });
      linhas.push({ clipe, f, ...Object.fromEntries(Object.entries(r).map(([k, x]) => [k, +x.toFixed(4)])) });
    }
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(linhas));
  else for (const l of linhas) console.log(`${l.clipe.padEnd(14)} ${String(Math.round(l.f * 100)).padStart(3)}%  manga ${(l.manga * 100).toFixed(1).padStart(5)}%  centro ${(l.mangaCentro * 100).toFixed(1).padStart(5)}%  luva ${(l.luva * 100).toFixed(1).padStart(4)}%  pele ${(l.pele * 100).toFixed(1).padStart(4)}%  arma ${(l.arma * 100).toFixed(1).padStart(5)}%`);
}
