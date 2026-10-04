// Evidência visual do #680 SEM WebGL: rasteriza por software a geometria REAL que o
// mapa constrói (mesma build do jogo, via harness.mjs) numa câmera fixa 3:2 (1536×1024),
// antes e depois. É um renderizador próprio — NÃO é screenshot de WebGL e não finge ser;
// serve para mostrar a prancha e a rampa novas ao pé da escada.
// Uso: node tools/eval/amazonia-agua-acesso-render.mjs <outdir> [--antes]
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { bootGame, initTextures, THREE } from './harness.mjs';

const outDir = process.argv[2] || 'artifacts/amazonia-agua-acesso';
const antes = process.argv.includes('--antes');
const rotulo = antes ? 'antes' : 'depois';
mkdirSync(outDir, { recursive: true });

if (antes) {
  // Fonte pré-fix: o map_amazonia.js do base da branch, sem a lista de acessos.
  const fonte = process.env.MAP_ANTES;
  if (!fonte) throw Error('defina MAP_ANTES=<caminho do map_amazonia.js pré-fix>');
  const alvo = new URL(`../../public/js/.amz-render-${process.pid}.mjs`, import.meta.url);
  const { writeFileSync: wf, unlinkSync: uf } = await import('node:fs');
  wf(alvo, readFileSync(fonte, 'utf8'));
  const { MAPS } = await import('../../public/js/maps.js');
  try { MAPS.amazonia.build = (await import(alvo.href)).buildAmazonia; } finally { uf(alvo); }
}

const W = 1536, H = 1024;
const g = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: 13007, bots: 0 });
const scene = g.scene;
scene.updateMatrixWorld(true);

// Câmeras: perto e baixo, do lado do rio, para a rampa + tabuleiro + pé da escada
// ocuparem o quadro (1536×1024, 3:2).
const VIEWS = [
  { nome: 'A-14-27', eye: [3.6, 2.3, -35.6], alvo: [9.2, 0.35, -32.4] },
  { nome: 'D-14-6', eye: [3.6, 2.3, 9.0], alvo: [9.2, 0.35, 12.0] },
  { nome: 'F--14-6', eye: [-3.6, 2.3, 9.0], alvo: [-9.2, 0.35, 12.0] },
];

// --- coleta de triângulos em espaço de mundo ------------------------------------
const tris = [];
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
scene.traverse(o => {
  const geo = o.geometry;
  if (!geo?.attributes?.position) return;
  const pos = geo.attributes.position, idx = geo.index;
  const cor = o.material?.color ? o.material.color.clone() : new THREE.Color(0x8a8a8a);
  const total = idx ? idx.count : pos.count;
  for (let i = 0; i + 2 < total; i += 3) {
    a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
    b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(o.matrixWorld);
    c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(o.matrixWorld);
    const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    if (Math.abs(area) < 1e-9) continue;
    const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    nrm.normalize();
    tris.push({ a: a.clone(), b: b.clone(), c: c.clone(), cor, nrm });
  }
});

// --- fundo (céu degradê) -------------------------------------------------------
const fundo = new Uint8Array(W * H * 3);
for (let y = 0; y < H; y++) {
  const s = Math.min(1, y / H);
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    fundo[i] = 118 + 40 * s; fundo[i + 1] = 150 + 45 * s; fundo[i + 2] = 185 + 40 * s;
  }
}

const luz = new THREE.Vector3(-0.42, 0.86, 0.30).normalize();
const f = 1 / Math.tan((62 * Math.PI / 180) / 2);

for (const view of VIEWS) {
  const eye = new THREE.Vector3(...view.eye), alvo = new THREE.Vector3(...view.alvo);
  const fwd = alvo.clone().sub(eye).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd);
  const cam = new Uint8Array(W * H * 3); cam.set(fundo);
  const prof = new Float32Array(W * H).fill(Infinity);
  const P = (p) => {
    const d = p.clone().sub(eye), z = d.dot(fwd);
    if (z <= 0.05) return null;
    return { x: (d.dot(right) * f / z * .5 + .5) * W, y: (.5 - d.dot(up) * f / z * .5) * H, z };
  };
  for (const t of tris) {
    const A = P(t.a), B = P(t.b), C = P(t.c);
    if (!A || !B || !C) continue;
    const area = (B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y);
    if (Math.abs(area) < 1e-9) continue;
    const lam = Math.max(.14, Math.abs(t.nrm.dot(luz)) * .82 + .18);
    const r = Math.min(255, t.cor.r * 255 * lam), gg = Math.min(255, t.cor.g * 255 * lam), bb = Math.min(255, t.cor.b * 255 * lam);
    const x0 = Math.max(0, Math.floor(Math.min(A.x, B.x, C.x))), x1 = Math.min(W - 1, Math.ceil(Math.max(A.x, B.x, C.x)));
    const y0 = Math.max(0, Math.floor(Math.min(A.y, B.y, C.y))), y1 = Math.min(H - 1, Math.ceil(Math.max(A.y, B.y, C.y)));
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const sx = px + .5, sy = py + .5;
      const w0 = ((B.x - sx) * (C.y - sy) - (C.x - sx) * (B.y - sy)) / area;
      const w1 = ((C.x - sx) * (A.y - sy) - (A.x - sx) * (C.y - sy)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = A.z * w0 + B.z * w1 + C.z * w2;
      const idx = py * W + px;
      if (z >= prof[idx]) continue;
      prof[idx] = z;
      const o = idx * 3; cam[o] = r; cam[o + 1] = gg; cam[o + 2] = bb;
    }
  }
  const arquivo = `${outDir}/${rotulo}-${view.nome}.png`;
  writeFileSync(arquivo, encodePNG(cam, W, H));
  console.log(`${rotulo} ${view.nome} -> ${arquivo}`);
}
console.log(JSON.stringify({ rotulo, triangulos: tris.length, viewport: `${W}x${H} (3:2)` }));
g.dispose();

function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(tipo, dados) {
  const len = Buffer.alloc(4); len.writeUInt32BE(dados.length);
  const td = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(rgb, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}