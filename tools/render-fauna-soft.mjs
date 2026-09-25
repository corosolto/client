// Rasteriza GLB de fauna em software puro (node) no frame 3:2 1536×1024 —
// evidência de asset sem disputar o lock de browser do swarm (AGENTS.md: 1 por vez).
// Uso: node tools/render-fauna-soft.mjs <glb> <saida.png> [dist]
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [glb, out, distArg] = process.argv.slice(2);
if (!glb || !out) { console.error('uso: render-fauna-soft.mjs <glb> <saida.png> [dist]'); process.exit(1); }
const W = 1536, H = 1024, DIST = parseFloat(distArg || '3.2');
const BG = [0x8e, 0xa6, 0xb8];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(glb);
const root = doc.getRoot();

const texCache = new Map();
async function decodeTexture(tex) {
  if (!tex) return null;
  if (texCache.has(tex)) return texCache.get(tex);
  const image = tex.getImage();
  const { data, info } = await sharp(Buffer.from(image)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const entry = { data, width: info.width, height: info.height };
  texCache.set(tex, entry);
  return entry;
}

// câmera igual à do faunaview.html (mesmo enquadramento da evidência de browser)
const FOV = 45 * Math.PI / 180;
const ASPECT = W / H;
const camPos = [DIST * .35, .35 + DIST * .12, DIST];
const target = [0, .21, 0];
const fwd = (() => { const f = [target[0] - camPos[0], target[1] - camPos[1], target[2] - camPos[2]]; const l = Math.hypot(...f); return f.map(v => v / l); })();
const right = (() => { const up = [0, 1, 0]; const r = [fwd[2] * up[1] - fwd[1] * up[2], fwd[0] * up[2] - fwd[2] * up[0], fwd[1] * up[0] - fwd[0] * up[1]]; const l = Math.hypot(...r); return r.map(v => v / l); })();
const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
const focal = (H / 2) / Math.tan(FOV / 2);

const color = new Float64Array(W * H * 3).fill(0);
const zbuf = new Float64Array(W * H).fill(Infinity);
const stencil = new Uint8Array(W * H);
const lightDir = (() => { const l = [3, 6, 4]; const n = Math.hypot(...l); return l.map(v => v / n); })();

function project(p) {
  const x = p[0] - camPos[0], y = p[1] - camPos[1], z = p[2] - camPos[2];
  const cx = x * right[0] + y * right[1] + z * right[2];
  const cy = x * up[0] + y * up[1] + z * up[2];
  const cz = x * fwd[0] + y * fwd[1] + z * fwd[2];
  if (cz <= 0.01) return null;
  return [W / 2 + cx * focal / cz, H / 2 - cy * focal / cz, cz];
}

function sampleTex(tex, u, v) {
  if (!tex) return null;
  let uu = u - Math.floor(u), vv = v - Math.floor(v);
  const px = Math.min(tex.width - 1, (uu * tex.width) | 0);
  const py = Math.min(tex.height - 1, ((1 - vv) * tex.height) | 0);
  const i = (py * tex.width + px) * 4;
  return [tex.data[i], tex.data[i + 1], tex.data[i + 2]];
}

const meshMatrix = (node) => node.getWorldTransform ? node.getWorldTransform() : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function applyM(m, p) {
  return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
}

const jobs = [];
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const uv = prim.getAttribute('TEXCOORD_0');
    const idx = prim.getIndices();
    const material = prim.getMaterial();
    jobs.push({ node, prim, pos, uv, idx, material });
  }
}

let triCount = 0;
for (const job of jobs) {
  const tex = await decodeTexture(job.material?.getBaseColorTexture?.());
  const factor = job.material?.getBaseColorFactor?.() || [1, 1, 1, 1];
  const m = meshMatrix(job.node);
  const P = [], UV = [];
  for (let i = 0; i < job.pos.getCount(); i++) {
    P.push(project(applyM(m, Array.from(job.pos.getElement(i, [0, 0, 0])))));
    UV.push(job.uv ? Array.from(job.uv.getElement(i, [0, 0])) : null);
  }
  const tri = (a, b, c) => {
    const pa = P[a], pb = P[b], pc = P[c];
    if (!pa || !pb || !pc) return;
    triCount++;
    const minY = Math.max(0, Math.floor(Math.min(pa[1], pb[1], pc[1])));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(pa[1], pb[1], pc[1])));
    const minX = Math.max(0, Math.floor(Math.min(pa[0], pb[0], pc[0])));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(pa[0], pb[0], pc[0])));
    if (maxX < minX || maxY < minY) return;
    const e0 = [pb[0] - pa[0], pb[1] - pa[1]], e1 = [pc[0] - pa[0], pc[1] - pa[1]];
    const det = e0[0] * e1[1] - e0[1] * e1[0];
    if (Math.abs(det) < 1e-9) return;
    const worldA = applyM(m, Array.from(job.pos.getElement(a, [0, 0, 0])));
    const worldB = applyM(m, Array.from(job.pos.getElement(b, [0, 0, 0])));
    const worldC = applyM(m, Array.from(job.pos.getElement(c, [0, 0, 0])));
    const u = [worldB[0] - worldA[0], worldB[1] - worldA[1], worldB[2] - worldA[2]];
    const v = [worldC[0] - worldA[0], worldC[1] - worldA[1], worldC[2] - worldA[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const nl = Math.hypot(...n) || 1;
    const lambert = Math.max(0, (n[0] * lightDir[0] + n[1] * lightDir[1] + n[2] * lightDir[2]) / nl);
    const shade = .55 + .65 * lambert;   // aproxima HemisphereLight 1.1 + sol 1.7 do jogo
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + .5, py = y + .5;
      const w1 = ((px - pa[0]) * e1[1] - (py - pa[1]) * e1[0]) / det;
      const w2 = ((py - pa[1]) * e0[0] - (px - pa[0]) * e0[1]) / det;
      const w0 = 1 - w1 - w2;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
      const z = w0 * pa[2] + w1 * pb[2] + w2 * pc[2];
      const zi = y * W + x;
      if (z >= zbuf[zi]) continue;
      zbuf[zi] = z;
      let rgb = sampleTex(tex, UV[a] ? w0 * UV[a][0] + w1 * UV[b][0] + w2 * UV[c][0] : 0, UV[a] ? w0 * UV[a][1] + w1 * UV[b][1] + w2 * UV[c][1] : 0)
        || [factor[0] * 220, factor[1] * 220, factor[2] * 220];
      color[zi * 3] = rgb[0] * shade;
      color[zi * 3 + 1] = rgb[1] * shade;
      color[zi * 3 + 2] = rgb[2] * shade;
      stencil[zi] = 1;
    }
  };
  if (job.idx) { for (let i = 0; i < job.idx.getCount(); i += 3) tri(job.idx.getScalar(i), job.idx.getScalar(i + 1), job.idx.getScalar(i + 2)); }
  else { for (let i = 0; i + 2 < job.pos.getCount(); i += 3) tri(i, i + 1, i + 2); }
}

const rgba = Buffer.alloc(W * H * 4);
let minX = W, minY = H, maxX = 0, maxY = 0, pixels = 0;
const palette = new Map();
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  const on = stencil[i];
  const r = on ? color[i * 3] : BG[0], g = on ? color[i * 3 + 1] : BG[1], b = on ? color[i * 3 + 2] : BG[2];
  rgba[i * 4] = Math.max(0, Math.min(255, r));
  rgba[i * 4 + 1] = Math.max(0, Math.min(255, g));
  rgba[i * 4 + 2] = Math.max(0, Math.min(255, b));
  rgba[i * 4 + 3] = 255;
  if (on) {
    pixels++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    const key = `${rgba[i * 4] >> 5}_${rgba[i * 4 + 1] >> 5}_${rgba[i * 4 + 2] >> 5}`;
    palette.set(key, (palette.get(key) || 0) + 1);
  }
}
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);

const top = [...palette.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  .map(([k, n]) => { const [r, g, b] = k.split('_').map(v => (+v << 5) + 16); return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')} ${(100 * n / pixels).toFixed(1)}%`; });
const meta = {
  glb, out, frame: `${W}x${H}`, dist: DIST, trianglesRasterizados: triCount,
  silhueta: { minX, minY, maxX, maxY, px: pixels, cobertura: +(100 * pixels / (W * H)).toFixed(2),
    bbox_m: +((maxX - minX + 1) / focal).toFixed(3), proporcao_largura_altura: +((maxX - minX + 1) / (maxY - minY + 1)).toFixed(2) },
  paleta_top: top,
};
writeFileSync(out.replace(/\.png$/, '-meta.json'), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta, null, 2));
