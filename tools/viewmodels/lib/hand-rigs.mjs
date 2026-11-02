// Rigs de braço 1P e a pintura dos atlas de time (vmhands.js). Um atlas por rig e papel,
// todos pintados no mesmo referencial da mão (pulso→médio = 1): mesma escala em qualquer UV.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

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
    // escalaX: a mão A é mais larga por comprimento (0,96 × 0,77 no pulso; 1,13 × 0,99 na palma) e na
    // tela a sonda deu 66 × 83 px por mão em x contra a AK K (y 66 × 69): x × 0,82 iguala a contagem.
    escalaX: 0.82,
    papeis: [
      { material: /CoroSolto_FP_Gloves$/, papel: 'glove', pintura: 'combined' },
      { material: /CoroSolto_Mandrake_Sleeves$/, papel: 'cloth', pintura: 'cloth' },
    ],
  },
});

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
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
    c[0] *= def.escalaX || 1;
    const ponta = v.pesos.filter(([b]) => def.ponta.test(b)).reduce((s, [, w]) => s + w, 0);
    return [...c, ponta, def.lado(forte) === 'r' ? 1 : 0];
  });
  const fields = new Float32Array(size * size * 4), covered = new Uint8Array(size * size), lados = new Uint8Array(size * size);
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
      lados[ix] = attr[face[0]][4];
      for (let j = 0; j < 4; j++) fields[ix * 4 + j] = attr[face[0]][j] * a + attr[face[1]][j] * b + attr[face[2]][j] * c;
    }
  }
  for (let pass = 0; pass < 8; pass++) {
    const next = covered.slice();
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
      const ix = y * size + x; if (covered[ix]) continue;
      const from = [ix - 1, ix + 1, ix - size, ix + size].find((n) => covered[n]); if (from === undefined) continue;
      next[ix] = 1; lados[ix] = lados[from]; for (let j = 0; j < 4; j++) fields[ix * 4 + j] = fields[from * 4 + j];
    }
    covered.set(next);
  }
  return { fields, covered, lados, size };
}

// Atlas de sonda (não servidos): `lado` pinta sinal de z por mão; `escala` pinta faixas de 0,2 mão
// em y (vermelho) e em x (azul), para medir na tela quantos pixels valem uma mão.
export function sondar({ fields, lados, size }, tipo) {
  const px = Buffer.alloc(size * size * 3);
  for (let ix = 0; ix < size * size; ix++) {
    const [x, y, z] = fields.subarray(ix * 4, ix * 4 + 3);
    let c;
    if (tipo === 'lado') c = lados[ix] ? (z > 0 ? [255, 0, 0] : [0, 0, 255]) : (z > 0 ? [255, 255, 0] : [0, 255, 255]);
    else c = [Math.floor(y * 5) % 2 === 0 ? 255 : 0, 64, Math.floor(x * 5 + 100) % 2 === 0 ? 255 : 0];
    px.set(c, ix * 3);
  }
  return px;
}

const parse = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
export const SKIN = [183, 137, 104];
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (v, w) => Math.exp(-(v * v) / (w * w));
const star = Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 0.085 : 0.2; return [Math.cos(a) * r, Math.sin(a) * r]; });
const inStar = (x, y) => { let hit = false; for (let i = 0, j = 9; i < 10; j = i++) {
  const [a, b] = star[i], [c, d] = star[j]; if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) hit = !hit;
} return hit; };

// Chamadores sem layout preservam a pintura legada dos atlas aprovados.
export function pintar({ fields, size }, pintura, style, layout = '') {
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
    if (!exposed && !isSleeve && style.motif === 'tropical') {
      const leafA = Math.sin((x + z) * 19 + y * 11);
      const leafB = Math.cos((x - z) * 17 - y * 13);
      const vein = Math.abs(Math.sin((Math.atan2(z, x) + y) * 24));
      if (leafA > 0.55 || leafB > 0.68) color = accent;
      else if (vein < 0.12) color = [16, 151, 135];
    }
    if (!exposed && !isSleeve && style.motif === 'sunset') {
      const horizon = 0.5 + 0.5 * Math.sin(y * 16 + Math.atan2(z, x) * 3);
      color = horizon > 0.66 ? accent : horizon < 0.32 ? sleeve : glove;
    }
    if (!exposed && (cuff || handPanel) && style.motif === 'checker') color = (Math.floor(x * 9) + Math.floor(y * 10)) % 2 === 0 ? accent : glove;
    if (!exposed && style.motif === 'star') {
      if (cuff) { color = sleeve; if (inStar(x, (y + 0.15) * 1.4)) color = accent; }
      if (handPanel && inStar(x, (y - 0.49) * 1.1)) color = accent;
    }
    if (!exposed && !isSleeve && style.motif === 'emo') {
      const check = (Math.floor((x + 0.8) * 10) + Math.floor(y * 12)) & 1;
      color = check ? glove : accent.map((c) => c * 0.72);
      if (handPanel && (Math.abs(x) < 0.025 || Math.abs(y - 0.52) < 0.025)) color = accent;
    }
    if (!exposed && !isSleeve && style.motif === 'team') {
      color = glove;
      if (handPanel) {
        const shield = Math.abs(x) < 0.25 - Math.max(0, y - 0.58) * 0.30 && y > 0.25 && y < 0.80;
        const inner = Math.abs(x) < 0.20 - Math.max(0, y - 0.58) * 0.27 && y > 0.30 && y < 0.74;
        if (shield) color = accent;
        if (inner) color = sleeve;
        if (inStar(x * 0.78, (y - 0.52) * 0.78)) color = accent;
      }
    }
    if (!exposed && !isSleeve && style.motif === 'brasil') {
      color = glove;
      if (handPanel) {
        const dy = y - 0.52;
        if (Math.abs(x) / 0.31 + Math.abs(dy) / 0.28 < 1) color = accent;
        if (x * x + dy * dy < 0.014) color = [0, 49, 118];
        if (Math.abs(dy + x * 0.16) < 0.018 && x * x + dy * dy < 0.012) color = [245, 247, 239];
      }
    }
    if (!exposed && !isSleeve && style.motif === 'usa') {
      color = Math.floor(y * 14) & 1 ? accent : glove;
      if (handPanel && x < 0.04 && y > 0.47) {
        color = [10, 49, 97];
        const sx = (x + 0.32) * 14, sy = (y - 0.48) * 16;
        if (Math.hypot(sx - Math.round(sx), sy - Math.round(sy)) < 0.13) color = accent;
      }
    }
    if (!exposed && !isSleeve && style.motif === 'maga') {
      color = glove;
      if (handPanel) {
        const four = (x < -0.02 && Math.abs(y - 0.52) < 0.035)
          || (Math.abs(x + 0.14) < 0.035 && y > 0.48 && y < 0.72)
          || (Math.abs(x + 0.03) < 0.035 && y > 0.36 && y < 0.72)
          || (Math.abs(y - x - 0.58) < 0.035 && x < -0.03);
        const seven = (x > 0.05 && Math.abs(y - 0.69) < 0.035)
          || (x > 0.07 && Math.abs(y + x * 0.85 - 0.68) < 0.035);
        if (four || seven) color = accent;
      }
    }
    if (!exposed && !isSleeve && style.motif === 'maga-flag') {
      color = glove;
      if (handPanel) {
        const stripe = Math.floor((y - 0.18) * 18) & 1;
        color = stripe ? accent : glove;
        if (x < 0.045 && y > 0.48) {
          color = [10, 49, 97];
          const sx = (x + 0.30) * 17, sy = (y - 0.49) * 19;
          if (Math.hypot(sx - Math.round(sx), sy - Math.round(sy)) < 0.16) color = accent;
        }
      }
    }
    if (!exposed && !isSleeve && style.motif === 'emo-skull') {
      const check = (Math.floor((x + 0.8) * 9) + Math.floor(y * 11)) & 1;
      color = check ? glove : [106, 9, 85];
      if (handPanel) {
        const dy = y - 0.55;
        const crown = x * x / 0.052 + dy * dy / 0.066 < 1;
        const cheek = Math.abs(x) < 0.17 - Math.max(0, 0.48 - y) * 0.52 && y > 0.31 && y < 0.52;
        if (crown || cheek) color = accent;
        const leftEye = y < 0.63 + (x + 0.09) * 0.55 && y > 0.48 - (x + 0.09) * 0.30 && x > -0.19 && x < -0.025;
        const rightEye = y < 0.63 - (x - 0.09) * 0.55 && y > 0.48 + (x - 0.09) * 0.30 && x > 0.025 && x < 0.19;
        const nose = Math.abs(x) < 0.038 && y > 0.43 && y < 0.53;
        const teeth = cheek && (Math.abs(Math.sin((x + 0.19) * 52)) < 0.28 || Math.abs(y - 0.38) < 0.013);
        if (leftEye || rightEye || nose || teeth) color = glove;
      }
    }
    if (!exposed && !isSleeve && style.motif === 'skull') {
      color = glove;
      if (handPanel) {
        const dy = y - 0.56;
        const boneA = Math.abs((y - 0.50) - x * 0.55) < 0.018 && Math.abs(x) < 0.29 && y > 0.34 && y < 0.68;
        const boneB = Math.abs((y - 0.50) + x * 0.55) < 0.018 && Math.abs(x) < 0.29 && y > 0.34 && y < 0.68;
        if (boneA || boneB) color = accent;
        const head = x * x / 0.050 + dy * dy / 0.058 < 1;
        const jaw = Math.abs(x) < 0.14 && y > 0.33 && y < 0.49;
        if (head || jaw) color = accent;
        const eye = ((x - 0.095) ** 2 + (dy - 0.035) ** 2 < 0.004)
          || ((x + 0.095) ** 2 + (dy - 0.035) ** 2 < 0.004);
        const nose = Math.abs(x) < 0.035 && y > 0.47 && y < 0.55;
        const teeth = jaw && (Math.abs(Math.sin((x + 0.18) * 45)) < 0.22 || Math.abs(y - 0.40) < 0.012);
        if (eye || nose || teeth) color = glove;
      }
    }
    if (!exposed && !isSleeve && style.motif === 'selo-acido') {
      color = glove;
      // Selo circular original: anel branco grosso e cunha angular vazada no miolo preto.
      if (handPanel) {
        const dx = x, dy = y - 0.42, r = Math.hypot(dx, dy);
        if (r > 0.150 && r < 0.225) color = accent;
        if (r <= 0.150) {
          const cunha = dy > -0.085 && Math.abs(dx) < (0.105 - dy) * 0.58;
          const furo = dy > -0.038 && Math.abs(dx) < (0.058 - dy) * 0.58;
          if (cunha && !furo) color = accent;
        }
      }
      // Filetes no punho: o selo some quando só a manga aparece (pistola).
      if (cuff && (Math.abs(y + 0.095) < 0.020 || Math.abs(y - 0.015) < 0.020)) color = accent;
    }
    // Motivos novos em volta do eixo do braço (ângulo × comprimento): no punho visto de lado o
    // plano x·y degenera e o padrão vira mancha (crítico cego, rodada 1).
    const volta = Math.atan2(z, x) * 0.3, noEixo = Math.hypot(x, z) < 0.12;
    if (!exposed && !isSleeve && !noEixo && (cuff || handPanel) && style.motif === 'trama') {
      const a = Math.sin((volta + y) * 28), b = Math.sin((volta - y) * 28);
      if (Math.max(a, b) > 0.8) color = accent;
    }
    // Identidade na luva inteira, dedos inclusive: é o que aparece em toda arma (a pistola quase
    // não mostra punho nem manga; crítico cego, rodada 2).
    if (!exposed && !isSleeve && !noEixo && !cuff && !handPanel && style.motif === 'star'
      && !(layout === 'pistol' && pintura === 'glove' && style.id === 'E')) {
      const u = volta / 0.3 + (Math.floor(y / 0.3) % 2) * 0.5, v = y / 0.3;
      const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5;
      if (inStar(fu * 0.62, fv * 0.62)) color = accent;
    }
    if (!exposed && !isSleeve && !noEixo && style.motif === 'grife') {
      const a = Math.abs(Math.sin((volta + y) * 16)), b = Math.abs(Math.sin((volta - y) * 16));
      const centro = Math.abs(Math.cos((volta + y) * 16)) > 0.93 && Math.abs(Math.cos((volta - y) * 16)) > 0.93;
      if (Math.min(a, b) < 0.13 || centro) color = accent;
    }
    if (!exposed && !isSleeve && !noEixo && style.motif === 'corrente') {
      // Cordão de ouro no pulso e nos nós dos dedos: elos alternados em volta do braço.
      const elo = (yc, w) => Math.abs(y - yc) < w && Math.cos(volta * 60) * (Math.abs(y - yc) / w < 0.55 ? 1 : -1) > -0.2;
      if (elo(-0.06, 0.05) || (elo(0.9, 0.035) && Math.abs(x) < 0.34)) color = accent;
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
