// Pose e raster offline de um produto K (GLB) sem navegador: amostra um clipe,
// resolve FK + skinning e desenha a malha na câmera do runtime (frame da arma).
// Serve para iterar pegada em segundos; a figura que decide continua sendo o jogo.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { NodeIO } from '../../../node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../../../node_modules/@gltf-transform/extensions/dist/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const THREE = await import(path.join(ROOT, 'public/vendor/three.module.js'));
const { Matrix4, Vector3, Quaternion, Euler } = THREE;

export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

export async function carregar(file) {
  const doc = await io.read(file);
  return new Pose(doc);
}

export class Pose {
  constructor(doc) {
    this.doc = doc;
    this.root = doc.getRoot();
    this.nodes = this.root.listNodes();
    this.index = new Map(this.nodes.map((n, i) => [n, i]));
    this.parent = new Array(this.nodes.length).fill(-1);
    this.nodes.forEach((n, i) => n.listChildren().forEach((c) => { this.parent[this.index.get(c)] = i; }));
    this.byName = new Map(this.nodes.map((n, i) => [n.getName(), i]));
    this.anims = new Map(this.root.listAnimations().map((a) => [a.getName(), a]));
  }

  node(name) { const i = this.byName.get(name); return i == null ? null : this.nodes[i]; }

  duracao(clip) {
    const a = this.anims.get(clip);
    if (!a) return 0;
    return Math.max(...a.listSamplers().map((s) => { const x = s.getInput().getArray(); return x[x.length - 1]; }));
  }

  // TRS local de cada nó no instante t do clipe (canais ausentes ficam no valor base).
  local(clip, t, extra = null) {
    const trs = this.nodes.map((n) => ({ t: n.getTranslation().slice(), r: n.getRotation().slice(), s: n.getScale().slice() }));
    const a = clip ? this.anims.get(clip) : null;
    if (clip && !a) throw new Error(`clipe ${clip} ausente`);
    for (const ch of a ? a.listChannels() : []) {
      const i = this.index.get(ch.getTargetNode());
      const path = ch.getTargetPath();
      if (!['translation', 'rotation', 'scale'].includes(path)) continue;
      const v = amostra(ch.getSampler(), t, path === 'rotation');
      trs[i][path === 'translation' ? 't' : path === 'rotation' ? 'r' : 's'] = v;
    }
    if (extra) extra(trs);
    return trs;
  }

  mundo(trs) {
    const local = trs.map(({ t, r, s }) => new Matrix4().compose(new Vector3(...t), new Quaternion(...r), new Vector3(...s)));
    const out = new Array(this.nodes.length);
    const f = (i) => {
      if (out[i]) return out[i];
      const p = this.parent[i];
      out[i] = p < 0 ? local[i].clone() : f(p).clone().multiply(local[i]);
      return out[i];
    };
    this.nodes.forEach((_, i) => f(i));
    return out;
  }

  // Triângulos (posição de mundo) de todas as malhas visíveis, com o material.
  triangulos(world) {
    const tris = [];
    for (const [i, n] of this.nodes.entries()) {
      const mesh = n.getMesh();
      if (!mesh) continue;
      const skin = n.getSkin();
      let jointMats = null;
      if (skin) {
        const ibm = skin.getInverseBindMatrices()?.getArray();
        jointMats = skin.listJoints().map((j, k) => world[this.index.get(j)].clone()
          .multiply(new Matrix4().fromArray(ibm, k * 16)));
      }
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION').getArray();
        const J = prim.getAttribute('JOINTS_0')?.getArray();
        const W = prim.getAttribute('WEIGHTS_0')?.getArray();
        const idx = prim.getIndices()?.getArray();
        const mat = prim.getMaterial();
        const nome = mat?.getName() || '';
        const cor = mat ? mat.getBaseColorFactor() : [0.8, 0.8, 0.8, 1];
        const vcount = pos.length / 3;
        const out = new Float32Array(pos.length);
        const v = new Vector3();
        const acc = new Vector3();
        const tmp = new Vector3();
        for (let k = 0; k < vcount; k++) {
          v.set(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
          if (jointMats && J) {
            acc.set(0, 0, 0);
            for (let q = 0; q < 4; q++) {
              const w = W[k * 4 + q];
              if (w > 0) acc.addScaledVector(tmp.copy(v).applyMatrix4(jointMats[J[k * 4 + q]]), w);
            }
            v.copy(acc);
          } else {
            v.applyMatrix4(world[i]);
          }
          out[k * 3] = v.x; out[k * 3 + 1] = v.y; out[k * 3 + 2] = v.z;
        }
        const n3 = idx ? idx.length : vcount;
        for (let k = 0; k < n3; k += 3) {
          const a = idx ? idx[k] : k, b = idx ? idx[k + 1] : k + 1, c = idx ? idx[k + 2] : k + 2;
          tris.push({ p: [out[a * 3], out[a * 3 + 1], out[a * 3 + 2], out[b * 3], out[b * 3 + 1], out[b * 3 + 2], out[c * 3], out[c * 3 + 1], out[c * 3 + 2]], mat: nome, cor, no: n.getName() });
        }
      }
    }
    return tris;
  }

  // FOV vertical que o runtime usa no aspecto da tela (AuthoredViewModels.fov: meia-tangente
  // horizontal constante a partir do aspecto gravado na câmera do GLB).
  fovTela(fov, aspecto = 1.5) {
    const ref = this.root.listCameras()[0]?.getAspectRatio() || 16 / 9;
    return (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * ref / aspecto) * 180) / Math.PI;
  }

  // Matriz mundo→câmera do runtime: inversa da câmera embutida, depois o mount do frame.
  camera(world, frame) {
    const ci = this.byName.get('VIEWMODEL_CAMERA');
    const inv = world[ci].clone().invert();
    const r = frame.rotDeg || [0, 0, 0];
    const mount = new Matrix4().compose(new Vector3(frame.x, frame.y, frame.z),
      new Quaternion().setFromEuler(new Euler(r[0] * Math.PI / 180, r[1] * Math.PI / 180, r[2] * Math.PI / 180)),
      new Vector3(1, 1, 1));
    return mount.multiply(inv);
  }
}

function amostra(sampler, t, quat) {
  const x = sampler.getInput().getArray();
  const y = sampler.getOutput().getArray();
  const interp = sampler.getInterpolation();
  const n = x.length;
  const cubic = interp === 'CUBICSPLINE';
  const dim = y.length / n / (cubic ? 3 : 1);
  const get = (k) => {
    const o = cubic ? (k * 3 + 1) * dim : k * dim;
    return Array.from(y.slice(o, o + dim));
  };
  if (t <= x[0]) return get(0);
  if (t >= x[n - 1]) return get(n - 1);
  let k = 0;
  while (k < n - 2 && x[k + 1] < t) k++;
  const u = (t - x[k]) / (x[k + 1] - x[k]);
  const a = get(k), b = get(k + 1);
  if (interp === 'STEP') return a;
  if (quat) {
    const q = new Quaternion(...a).slerp(new Quaternion(...b), u);
    return [q.x, q.y, q.z, q.w];
  }
  return a.map((v, i) => v + (b[i] - v) * u);
}

const PALETA = [
  [/Cloth/i, [0.62, 0.2, 0.26]],
  [/Glove/i, [0.28, 0.32, 0.4]],
  [/FP_Hand/i, [0.82, 0.6, 0.47]],
];

// Raster com z-buffer, luz frontal e cor por material (pele/luva/manga fixas).
export async function desenhar(tris, view, { fov = 84, w = 720, h = 480, arquivo, destaque = null, marcas = [] }) {
  const z = new Float32Array(w * h).fill(Infinity);
  const dono = new Uint8Array(w * h);
  const img = Buffer.alloc(w * h * 3, 235);
  const f = 1 / Math.tan(fov * Math.PI / 360);
  const asp = w / h;
  const pr = (x, y, zz) => [(x * f / asp / -zz + 1) * w / 2, (1 - y * f / -zz) * h / 2, -zz];
  const va = new Vector3(), vb = new Vector3(), vc = new Vector3();
  for (const t of tris) {
    va.set(t.p[0], t.p[1], t.p[2]).applyMatrix4(view);
    vb.set(t.p[3], t.p[4], t.p[5]).applyMatrix4(view);
    vc.set(t.p[6], t.p[7], t.p[8]).applyMatrix4(view);
    if (va.z > -0.01 || vb.z > -0.01 || vc.z > -0.01) continue;
    const nrm = new Vector3().subVectors(vb, va).cross(new Vector3().subVectors(vc, va)).normalize();
    const luz = 0.35 + 0.65 * Math.abs(nrm.z * 0.8 + nrm.y * 0.4);
    let base = PALETA.find(([re]) => re.test(t.mat))?.[1] || t.cor.slice(0, 3).map((c) => 0.25 + c * 0.55);
    if (destaque && destaque.test(t.mat + ' ' + t.no)) base = [0.1, 0.75, 0.2];
    const P = [pr(va.x, va.y, va.z), pr(vb.x, vb.y, vb.z), pr(vc.x, vc.y, vc.z)];
    const minx = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0])));
    const maxx = Math.min(w - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
    const miny = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1])));
    const maxy = Math.min(h - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
    const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    if (Math.abs(area) < 1e-9) continue;
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area;
        const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const d = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2];
        const o = y * w + x;
        if (d >= z[o]) continue;
        z[o] = d;
        dono[o] = PALETA.some(([re]) => re.test(t.mat)) ? 2 : 1;
        img[o * 3] = Math.min(255, base[0] * luz * 255);
        img[o * 3 + 1] = Math.min(255, base[1] * luz * 255);
        img[o * 3 + 2] = Math.min(255, base[2] * luz * 255);
      }
    }
  }
  for (const [x0, y0, zz, cor = [255, 0, 255]] of marcas) {
    const v = new Vector3(x0, y0, zz).applyMatrix4(view);
    if (v.z > -0.01) continue;
    const [sx, sy] = pr(v.x, v.y, v.z);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = Math.round(sx + dx), y = Math.round(sy + dy);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const o = y * w + x; img[o * 3] = cor[0]; img[o * 3 + 1] = cor[1]; img[o * 3 + 2] = cor[2];
    }
  }
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let d = -6; d <= 6; d++) {
    for (const [x, y] of [[cx + d, cy], [cx, cy + d]]) { const o = y * w + x; img[o * 3] = 0; img[o * 3 + 1] = 160; img[o * 3 + 2] = 160; }
  }
  if (arquivo) await sharp(img, { raw: { width: w, height: h, channels: 3 } }).png().toFile(arquivo);
  let arma = 0, braco = 0;
  for (const v of dono) { if (v === 1) arma++; else if (v === 2) braco++; }
  return { arma: arma / (w * h), braco: braco / (w * h) };
}
