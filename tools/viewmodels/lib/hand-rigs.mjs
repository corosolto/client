// Rigs de braço 1P e a pintura dos atlas de time (vmhands.js). Um atlas por rig e papel,
// todos pintados no mesmo referencial da mão (pulso→médio = 1): mesma escala em qualquer UV.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

export const root = path.resolve(import.meta.dirname, '../../..');
const privado = (p) => path.join(root, 'public/private-assets/viewmodels', p);

// layout = pasta em /models/viewmodels/coro/hands/; `pintura` escolhe a regra de manga.
export const HAND_RIGS = Object.freeze({
  pistol: {
    rig: 'K (SK_Arms_Mono, KINEMATION)',
    fontes: [privado('pistol/pistol-runtime.glb'), privado('fabrica/m4-fabrica.glb')],
    ossos: (s) => [`hand_${s}`, `middle_01_${s}`, `index_01_${s}`],
    lado: (osso) => (/_l$/.test(osso) ? 'l' : 'r'),
    ponta: /(?:index|middle|ring|pinky|thumb)_0[23]_/,
    papeis: [
      { material: /CoroSolto_FP_Cloth$/, papel: 'cloth', pintura: 'cloth' },
      { material: /CoroSolto_FP_Glove$/, papel: 'glove', pintura: 'glove' },
      { material: /CoroSolto_FP_Hand$/, papel: 'skin', pintura: 'skin' },
    ],
  },
  knife: {
    rig: 'L (faca aprovada, coro/melee/knife-hires.glb)',
    fontes: [path.join(root, 'public/models/viewmodels/coro/melee/knife-hires.glb')],
    ossos: (s) => (s === 'l' ? ['L_wrist_02', 'L_middle1_011', 'L_point1_07'] : ['R_wrist_026', 'R_middle1_035', 'R_point1_031']),
    lado: (osso) => (/^L_/.test(osso) ? 'l' : 'r'),
    ponta: /(?:point|middle|ring|pink|thumb)[23]_/,
    papeis: [{ material: /CoroSolto_FP_Gloves$/, papel: 'combined', pintura: 'combined' }],
  },
  ak: {
    rig: 'A (metarig Requests_Studio_Hands, coro/ak-hires.glb)',
    fontes: [path.join(root, 'public/models/viewmodels/coro/ak-hires.glb')],
    ossos: (s) => [`hand.${s.toUpperCase()}_metarig`, `f_middle.01.${s.toUpperCase()}_metarig`, `f_index.01.${s.toUpperCase()}_metarig`],
    lado: (osso) => (/\.L[._]/.test(osso) ? 'l' : 'r'),
    ponta: /(?:f_index|f_middle|f_ring|f_pinky|thumb)\.0[23]\./,
    // A luva do rig A desce 0,36 mão abaixo do pulso; o trecho abaixo de −0,15 é o punho da manga no K.
    papeis: [
      { material: /CoroSolto_FP_Gloves$/, papel: 'glove', pintura: 'combined' },
      { material: /CoroSolto_Mandrake_Sleeves$/, papel: 'cloth', pintura: 'cloth' },
    ],
  },
});

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
// Cabeça do osso no espaço de bind da malha = translação da inversa da inverseBindMatrix.
function cabeca(m) {
  const [a, b, c, , d, e, f, , g, h, i, , x, y, z] = m;
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e);
  const inv = [[(e * i - f * h) / det, (g * f - d * i) / det, (d * h - g * e) / det],
    [(h * c - b * i) / det, (a * i - g * c) / det, (g * b - a * h) / det],
    [(b * f - e * c) / det, (d * c - a * f) / det, (a * e - d * b) / det]];
  return inv.map((r) => -(r[0] * x + r[1] * y + r[2] * z));
}

export async function lerRig(layout) {
  const def = HAND_RIGS[layout];
  const fonte = def.fontes.find((f) => fs.existsSync(f));
  if (!fonte) throw new Error(`${layout}: nenhuma fonte do rig (${def.fontes.join(', ')})`);
  const doc = await io.read(fonte);
  const primitivas = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(), skin = node.getSkin();
    if (!mesh || !skin) continue;
    const juntas = skin.listJoints().map((j) => j.getName());
    const ibm = skin.getInverseBindMatrices();
    const cabecas = Object.fromEntries(juntas.map((n, k) => [n, cabeca(ibm.getElement(k, []))]));
    for (const prim of mesh.listPrimitives()) {
      const material = prim.getMaterial()?.getName() || '';
      const papel = def.papeis.find((p) => p.material.test(material));
      if (!papel) continue;
      const P = prim.getAttribute('POSITION'), UV = prim.getAttribute('TEXCOORD_0');
      const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), I = prim.getIndices();
      const vertices = [];
      for (let v = 0; v < P.getCount(); v++) {
        const j = J.getElement(v, []), w = W.getElement(v, []);
        vertices.push({ p: P.getElement(v, []), uv: UV.getElement(v, []), pesos: j.map((k, q) => [juntas[k], w[q]]).filter((x) => x[1] > 0) });
      }
      const faces = [];
      for (let f = 0; f < I.getCount(); f += 3) faces.push([I.getScalar(f), I.getScalar(f + 1), I.getScalar(f + 2)]);
      primitivas.push({ mesh: mesh.getName(), material, ...papel, vertices, faces, cabecas });
    }
  }
  for (const p of def.papeis) if (!primitivas.some((x) => x.papel === p.papel)) throw new Error(`${layout}: material ${p.material} ausente em ${fonte}`);
  return { layout, fonte, primitivas };
}

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const normalize = (a) => a.map((v) => v / Math.hypot(...a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Campos no UV real (posição no referencial da mão + peso dos dedos distais), com dilatação
// para as bordas das ilhas não costurarem no mipmap.
export function campos(layout, prim, size = 512) {
  const def = HAND_RIGS[layout];
  const coord = {};
  for (const lado of ['l', 'r']) {
    const nomes = def.ossos(lado);
    const [w, m, i] = nomes.map((n) => prim.cabecas[n]);
    if (!w || !m || !i) throw new Error(`referencial ausente ${layout} ${lado}: ${nomes.join(',')}`);
    const len = Math.hypot(...sub(m, w)), y = normalize(sub(m, w));
    const z = normalize(cross(y, sub(i, m))), x = normalize(cross(y, z));
    coord[lado] = (p) => [dot(sub(p, w), x) / len, dot(sub(p, w), y) / len, dot(sub(p, w), z) / len];
  }
  const attr = prim.vertices.map((v) => {
    const forte = v.pesos.reduce((a, b) => (b[1] > (a?.[1] || 0) ? b : a), null)?.[0] || '';
    const c = coord[def.lado(forte)](v.p);
    const ponta = v.pesos.filter(([b]) => def.ponta.test(b)).reduce((s, [, w]) => s + w, 0);
    return [...c, ponta];
  });
  const fields = new Float32Array(size * size * 4), covered = new Uint8Array(size * size);
  for (const face of prim.faces) {
    const p = face.map((k) => [prim.vertices[k].uv[0] * size, prim.vertices[k].uv[1] * size]);
    const den = (p[1][1] - p[2][1]) * (p[0][0] - p[2][0]) + (p[2][0] - p[1][0]) * (p[0][1] - p[2][1]);
    if (Math.abs(den) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(...p.map((v) => v[0])))), x1 = Math.min(size - 1, Math.ceil(Math.max(...p.map((v) => v[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...p.map((v) => v[1])))), y1 = Math.min(size - 1, Math.ceil(Math.max(...p.map((v) => v[1]))));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const a = ((p[1][1] - p[2][1]) * (x + 0.5 - p[2][0]) + (p[2][0] - p[1][0]) * (y + 0.5 - p[2][1])) / den;
      const b = ((p[2][1] - p[0][1]) * (x + 0.5 - p[2][0]) + (p[0][0] - p[2][0]) * (y + 0.5 - p[2][1])) / den, c = 1 - a - b;
      if (Math.min(a, b, c) < -1e-6) continue;
      const ix = y * size + x; covered[ix] = 1;
      for (let j = 0; j < 4; j++) fields[ix * 4 + j] = attr[face[0]][j] * a + attr[face[1]][j] * b + attr[face[2]][j] * c;
    }
  }
  for (let pass = 0; pass < 8; pass++) {
    const next = covered.slice();
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
      const ix = y * size + x; if (covered[ix]) continue;
      const from = [ix - 1, ix + 1, ix - size, ix + size].find((n) => covered[n]); if (from === undefined) continue;
      next[ix] = 1; for (let j = 0; j < 4; j++) fields[ix * 4 + j] = fields[from * 4 + j];
    }
    covered.set(next);
  }
  return { fields, covered, size };
}

const parse = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
export const SKIN = [183, 137, 104];
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (v, w) => Math.exp(-(v * v) / (w * w));
const star = Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 0.085 : 0.2; return [Math.cos(a) * r, Math.sin(a) * r]; });
const inStar = (x, y) => { let hit = false; for (let i = 0, j = 9; i < 10; j = i++) {
  const [a, b] = star[i], [c, d] = star[j]; if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) hit = !hit;
} return hit; };

// Pintura idêntica à dos atlas de 05–06/09; `pintura` é o papel antigo (glove/cloth/skin/combined).
export function pintar({ fields, size }, pintura, style) {
  const glove = parse(style.glove), sleeve = parse(style.sleeve), accent = parse(style.accent);
  const pixels = Buffer.alloc(size * size * 3), heights = Buffer.alloc(size * size);
  const skin = SKIN;
  for (let ix = 0; ix < size * size; ix++) {
    const [x, y, z, tip] = fields.subarray(ix * 4, ix * 4 + 4);
    const isSleeve = pintura === 'cloth' || ((pintura === 'combined' || pintura === 'skin') && y < -0.15);
    const exposed = style.fingerless && tip > 0.48;
    const edge = style.fingerless && pintura !== 'skin' ? gauss(tip - 0.445, 0.035) : 0;
    const cuffSeam = gauss(y + 0.15, 0.015);
    const panel = (gauss(x - 0.33, 0.016) + gauss(x + 0.33, 0.016)) * smooth(0.05, 0.2, y) * (1 - smooth(0.72, 0.9, y))
      + (gauss(y - 0.17, 0.016) + gauss(y - 0.88, 0.016)) * (1 - smooth(0.29, 0.36, Math.abs(x)));
    const fold = gauss(y - 0.08, 0.16) * (Math.sin(y * 65 + x * 5 + z * 8) + Math.sin(y * 98 - x * 4)) * 0.5;
    let color = exposed ? skin : isSleeve ? sleeve : glove;
    const cuff = y > -0.38 && y < 0.06;
    const handPanel = y > 0.18 && y < 0.85 && Math.abs(x) < 0.31;
    if (!exposed && style.motif === 'camo') {
      const n = Math.sin(x * 14 + y * 9) + Math.cos(y * 18 - z * 13) + Math.sin(z * 24 + x * 11);
      color = n > 0.8 ? accent : n < -0.9 ? [43, 47, 33] : n < -0.15 ? [90, 82, 56] : glove;
    }
    if (!exposed && (cuff || handPanel) && style.motif === 'checker') color = (Math.floor(x * 9) + Math.floor(y * 10)) % 2 === 0 ? accent : glove;
    if (!exposed && style.motif === 'star') {
      if (cuff) { color = sleeve; if (inStar(x, (y + 0.15) * 1.4)) color = accent; }
      if (handPanel && inStar(x, (y - 0.49) * 1.1)) color = accent;
    }
    if (!exposed && (cuff || handPanel) && style.motif === 'trama') {
      // Trançado de palha/fibra (Míticos): diagonais cruzadas, no passo do xadrez da U.
      const a = Math.sin((x + y) * 28), b = Math.sin((x - y) * 28);
      if (Math.max(a, b) > 0.8) color = accent;
    }
    if (style.fingerless && pintura !== 'skin' && tip > 0.38) {
      const t = smooth(0.465, 0.505, tip);
      const hem = glove.map((c) => c * 0.58);
      color = hem.map((c, i) => c * (1 - t) + skin[i] * t);
    }
    const seam = Math.max(cuffSeam, panel, edge);
    const stitch = seam * Math.pow(Math.max(0, Math.sin(x * 120 + y * 85 + z * 50)), 8);
    const diamond = handPanel && !exposed && style.motif === 'plain'
      ? Math.max(gauss(Math.sin((x + y) * 39), 0.14), gauss(Math.sin((x - y) * 39), 0.14)) : 0;
    const noise = Math.sin(ix * 12.9898) * 43758.5453 % 1;
    const weave = (ix % size) % 3 === 0 ? 0.99 : 1;
    const value = exposed && edge < 0.1 ? 1 : (0.97 + noise * 0.04 - 0.22 * seam - 0.12 * diamond + fold * 0.06) * weave;
    const thread = style.id === 'C' ? [220, 216, 206] : [156, 153, 143];
    for (let c = 0; c < 3; c++) pixels[ix * 3 + c] = Math.round(Math.max(0, Math.min(255, color[c] * value * (1 - stitch * 0.55) + thread[c] * stitch * 0.55)));
    const grain = Math.sin(x * 180 + z * 90) * Math.cos(y * 190 - z * 45);
    heights[ix] = Math.round(Math.max(0, Math.min(255, 128 + (exposed ? 0 : grain * 5 + fold * 16) - diamond * 12 + seam * 60 + stitch * 18)));
  }
  return { pixels, heights };
}
