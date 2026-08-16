// Variantes de textura p/ viewmodels fpvm (resposta ao crítico R6):
// classifica TRIÂNGULOS como MÃOS (pele, ou oliva ADJACENTE à pele em 3D via grid espacial) vs ARMA,
// rasteriza a máscara em UV (512², dilatada 3px na zona das mãos) e gera texturas por
// variante onde SÓ a zona da arma é alterada — mãos/luvas ficam pixel-idênticas.
// Uso: node tools/vm-variant-tex.mjs <cls> <glb> <yHandsMax> <outPrefix> [variant...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function isSkin(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  return R > 0.42 && R - B > 0.10 && R - G > 0.03;
}
function isOlive(r, g, b) {   // oliva/cinza-esverdeado escuro (luva E corpo da arma)
  const R = r / 255, G = g / 255, B = b / 255;
  return G >= R - 0.02 && R >= B - 0.02 && G < 0.55 && (R - B) < 0.12;
}

async function buildMask(glbPath, yHandsMax, outBase) {
  const doc = await io.read(glbPath);
  const mesh = doc.getRoot().listMeshes()[0];
  const prim = mesh.listPrimitives()[0];
  const pos = prim.getAttribute('POSITION').getArray();
  const uv = prim.getAttribute('TEXCOORD_0').getArray();
  const idx = prim.getIndices().getArray();
  const tex = doc.getRoot().listTextures().find(t => t.getName().startsWith('Color'));
  const png = await sharp(Buffer.from(tex.getImage())).png().toBuffer();
  const { data: img, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const nVerts = pos.length / 3;
  const vHands = new Uint8Array(nVerts);
  const sample = (u, v) => {
    const x = Math.min(W - 1, Math.max(0, Math.round(u * (W - 1)))), y = Math.min(H - 1, Math.max(0, Math.round(v * (H - 1))));
    const i = (y * W + x) * 3; return [img[i], img[i + 1], img[i + 2]];
  };
  for (let vi = 0; vi < nVerts; vi++) {
    const [r, g, b] = sample(uv[vi * 2], uv[vi * 2 + 1]);
    const y = pos[vi * 3 + 1];
    vHands[vi] = isSkin(r, g, b) || (isOlive(r, g, b) && y < yHandsMax) ? 1 : 0;
  }
  // LUVAS = oliva ADJACENTE à pele em 3D (grid espacial). Luva e corpo da arma são
  // olivas indistinguíveis por cor; a luva está sempre colada na pele (punho/dedos) —
  // a arma não. Raio 0.09m: trigger guard pode entrar — área pequena, aceitável.
  {
    const skinIdx = [];
    for (let vi = 0; vi < nVerts; vi++) if (vHands[vi]) skinIdx.push(vi);
    const CELL = 0.05, grid = new Map();
    const key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
    for (const vi of skinIdx) {
      const x = pos[vi * 3], y = pos[vi * 3 + 1], z = pos[vi * 3 + 2];
      const k = key(x, y, z);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(vi);
    }
    const R2 = 0.09 * 0.09, R2B = 0.055 * 0.055;
    const nearSkin = (vi, r2) => {
      const x = pos[vi * 3], y = pos[vi * 3 + 1], z = pos[vi * 3 + 2];
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL);
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
        const cell = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
        if (!cell) continue;
        for (const sv of cell) {
          const ddx = pos[sv * 3] - x, ddy = pos[sv * 3 + 1] - y, ddz = pos[sv * 3 + 2] - z;
          if (ddx * ddx + ddy * ddy + ddz * ddz < r2) return true;
        }
      }
      return false;
    };
    for (let vi = 0; vi < nVerts; vi++) {
      if (vHands[vi]) continue;
      const [r, g, b] = sample(uv[vi * 2], uv[vi * 2 + 1]);
      // luva: oliva perto da pele (0.09) OU qualquer cor colada na pele (0.055 — dedos/punho)
      if (isOlive(r, g, b) && nearSkin(vi, R2)) { vHands[vi] = 1; continue; }
      if (nearSkin(vi, R2B)) vHands[vi] = 1;
    }
  }
  // rasteriza triângulos na máscara UV (0 = mãos, 255 = arma); mãos vencem
  const mask = rasterZone(idx, uv, W, H, (a, b, c) => vHands[a] + vHands[b] + vHands[c] >= 2, 3);
  // debug: máscara + GLB magenta (arma) p/ validar no vm-inspect
  const dbg = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    if (mask[i] === 0) { dbg[i * 3] = img[i * 3]; dbg[i * 3 + 1] = img[i * 3 + 1]; dbg[i * 3 + 2] = img[i * 3 + 2]; }
    else { dbg[i * 3] = 255; dbg[i * 3 + 1] = 0; dbg[i * 3 + 2] = 255; }
  }
  await sharp(Buffer.from(mask), { raw: { width: W, height: H, channels: 1 } }).png().toFile(`${outBase}-mask.png`);
  tex.setImage(await sharp(dbg, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer());
  tex.setMimeType('image/png');
  await io.write(`${outBase}-debug.glb`, doc);
  return { doc, tex, img, W, H, mask, pos, uv, idx };
}

// Preenche (com 0) os pixels UV dos triângulos que satisfazem pred(a,b,c). dil = dilatação px.
function rasterZone(idx, uv, W, H, pred, dil) {
  const mask = new Uint8Array(W * H).fill(255);
  const tri = idx.length / 3;
  for (let t = 0; t < tri; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    if (!pred(a, b, c)) continue;
    const us = [uv[a * 2] * (W - 1), uv[b * 2] * (W - 1), uv[c * 2] * (W - 1)];
    const vs = [uv[a * 2 + 1] * (H - 1), uv[b * 2 + 1] * (H - 1), uv[c * 2 + 1] * (H - 1)];
    const x0 = Math.max(0, Math.floor(Math.min(...us)) - dil), x1 = Math.min(W - 1, Math.ceil(Math.max(...us)) + dil);
    const y0 = Math.max(0, Math.floor(Math.min(...vs)) - dil), y1 = Math.min(H - 1, Math.ceil(Math.max(...vs)) + dil);
    const d = (us[1] - us[0]) * (vs[2] - vs[0]) - (us[2] - us[0]) * (vs[1] - vs[0]);
    if (Math.abs(d) < 1e-9) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const w0 = ((us[1] - x) * (vs[2] - y) - (us[2] - x) * (vs[1] - y)) / d;
      const w1 = ((us[2] - x) * (vs[0] - y) - (us[0] - x) * (vs[2] - y)) / d;
      const w2 = 1 - w0 - w1;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) mask[y * W + x] = 0;
    }
  }
  return mask;
}

// aplica transformação SÓ na zona da arma (mask>0); mãos preservadas.
// fn(r,g,b,weapon,i) — i = índice do pixel (pra ruído determinístico por pixel).
async function applyVariant(ctx, outPng, fn) {
  const { img, W, H, mask } = ctx;
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const r = img[i * 3], g = img[i * 3 + 1], b = img[i * 3 + 2];
    const [nr, ng, nb] = fn(r, g, b, mask[i] > 0, i);
    out[i * 3] = nr; out[i * 3 + 1] = ng; out[i * 3 + 2] = nb;
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(outPng);
  console.log('  ->', outPng);
}

const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
// madeira: marrom avermelhado escuro (pele é mais clara, R>0.62; luva é esverdeada)
function isWood(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  return R > 0.2 && R < 0.62 && R - G > 0.06 && R - G < 0.28 && R - B > 0.1 && G - B > 0.02;
}
// pele nua por texel (mesma regra do classificador de vértice), sem colidir com madeira
function isBareSkin(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  return R > 0.42 && R - B > 0.10 && R - G > 0.03 && !isWood(r, g, b);
}
// LUVA EM TODOS OS VMs (crítico R6.5: "dedos cerosos cor-de-salmão" — as luvas oliva já
// leem bem). Tom oliva modulado pela luminância da pele + variação por pixel (±8%,
// hash determinístico) — não é cor chapada.
function gloveTone(r, g, b, i) {
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const h = ((i * 2654435761) >>> 0) / 4294967296 - 0.5;   // ±0.5 determinístico
  const s = Math.max(0.55, Math.min(1.25, l * 1.55)) * (1 + h * 0.16);
  return [clamp(84 * s), clamp(94 * s), clamp(56 * s)];   // oliva tático
}
// atalho: se for pele nua → luva; senão fn da variante
const gloved = (fn) => (r, g, b, w, i) => isBareSkin(r, g, b) ? gloveTone(r, g, b, i) : fn(r, g, b, w, i);

// LENTE DA LUNETA (crítico R6.8: "ocular = disco preto chapado"). Localiza por GEOMETRIA:
// triângulos da face traseira da ocular (normal +Z, topo da arma). Aplica gradiente
// radial falso de céu (centro-topo claro frio → borda escura) + anel de reflexo.
async function applyLens(ctx, filePath) {
  const { pos, uv, idx, W, H } = ctx;
  const nrm = (a, b, c) => {
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const e1 = [pos[b * 3] - ax, pos[b * 3 + 1] - ay, pos[b * 3 + 2] - az];
    const e2 = [pos[c * 3] - ax, pos[c * 3 + 1] - ay, pos[c * 3 + 2] - az];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const l = Math.hypot(...n) || 1;
    return n[2] / l;
  };
  const lmask = rasterZone(idx, uv, W, H, (a, b, c) => {
    const cy = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3;
    const cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
    return nrm(a, b, c) > 0.65 && cy > 0.08 && cz > 0.0;
  }, 0);
  // ilhas 4-conectadas da máscara; a lente = MAIOR ilha (a ocular é um disco compacto;
  // o critério geométrico também pega topo do receiver/luneta — descarta o resto)
  const label = new Int32Array(W * H).fill(-1);
  let best = null, bestSize = 0, nIsl = 0;
  for (let s = 0; s < W * H; s++) {
    if (lmask[s] !== 0 || label[s] >= 0) continue;
    const stack = [s], isl = [];
    label[s] = nIsl;
    while (stack.length) {
      const p = stack.pop(); isl.push(p);
      const x = p % W, y = (p / W) | 0;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= W * H || label[q] >= 0 || lmask[q] !== 0) continue;
        if (Math.abs((q % W) - x) > 1) continue;
        label[q] = nIsl; stack.push(q);
      }
    }
    nIsl++;
    if (isl.length > bestSize) { bestSize = isl.length; best = isl; }
  }
  if (!best || bestSize < 200) { console.log('  !! lente não achada (ilhas=' + nIsl + ', maior=' + bestSize + ') em', filePath); return; }
  let cx = 0, cy = 0, mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const p of best) {
    const x = p % W, y = (p / W) | 0; cx += x; cy += y;
    mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
  }
  cx /= bestSize; cy /= bestSize;
  const R = Math.max(mxx - mnx, mxy - mny) / 2;
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  for (const p of best) {
    const x = p % W, y = (p / W) | 0;
    const d = Math.min(1.15, Math.hypot(x - cx, y - cy) / R);
    // céu falso: centro = azul claro, caindo pra borda escura; topo mais claro (céu)
    const sky = 1 - d;
    const top = 1 - (y - (cy - R)) / (2 * R);   // 1 topo, 0 base
    let r = 18 + sky * (60 + 60 * top), g = 22 + sky * (75 + 70 * top), b = 30 + sky * (95 + 85 * top);
    if (d > 0.78 && d < 0.97) { const ring = 1 - Math.abs(d - 0.875) / 0.095; r += 150 * ring; g += 160 * ring; b += 165 * ring; }   // anel de reflexo
    data[p * 3] = clamp(r); data[p * 3 + 1] = clamp(g); data[p * 3 + 2] = clamp(b);
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 92 }).toFile(filePath);
  console.log(`  -> lente (${bestSize}px, R=${R.toFixed(0)}px, ilhas ${nIsl}) em`, filePath);
}

// Rasteriza triângulos interpolando 2 atributos 3D por vértice (a1,a2) pros pixels cobertos.
function rasterZoneAttr(idx, uv, W, H, pred, dil, attr) {
  const mask = new Uint8Array(W * H).fill(255);
  const A1 = new Float32Array(W * H), A2 = new Float32Array(W * H);
  const tri = idx.length / 3;
  for (let t = 0; t < tri; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    if (!pred(a, b, c)) continue;
    const us = [uv[a * 2] * (W - 1), uv[b * 2] * (W - 1), uv[c * 2] * (W - 1)];
    const vs = [uv[a * 2 + 1] * (H - 1), uv[b * 2 + 1] * (H - 1), uv[c * 2 + 1] * (H - 1)];
    const x0 = Math.max(0, Math.floor(Math.min(...us)) - dil), x1 = Math.min(W - 1, Math.ceil(Math.max(...us)) + dil);
    const y0 = Math.max(0, Math.floor(Math.min(...vs)) - dil), y1 = Math.min(H - 1, Math.ceil(Math.max(...vs)) + dil);
    const d = (us[1] - us[0]) * (vs[2] - vs[0]) - (us[2] - us[0]) * (vs[1] - vs[0]);
    if (Math.abs(d) < 1e-9) continue;
    const [a1a, a1b, a1c] = [attr(a)[0], attr(b)[0], attr(c)[0]];
    const [a2a, a2b, a2c] = [attr(a)[1], attr(b)[1], attr(c)[1]];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const w0 = ((us[1] - x) * (vs[2] - y) - (us[2] - x) * (vs[1] - y)) / d;
      const w1 = ((us[2] - x) * (vs[0] - y) - (us[0] - x) * (vs[2] - y)) / d;
      const w2 = 1 - w0 - w1;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) {
        mask[y * W + x] = 0;
        A1[y * W + x] = w0 * a1a + w1 * a1b + w2 * a1c;
        A2[y * W + x] = w0 * a2a + w1 * a2b + w2 * a2c;
      }
    }
  }
  return { mask, A1, A2 };
}

// VEIO DE MADEIRA procedural (crítico R6.5: coronha laranja uniforme). Classifica madeira
// na textura BASE (isWood), rotula ilhas por flood-fill, calcula o eixo principal de cada
// ilha (PCA) e aplica listras finas ao longo do eixo + ruído — variação de albedo ±13%.
async function applyWoodGrain(ctx, filePath) {
  const { img, W, H } = ctx;
  const wood = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) wood[i] = isWood(img[i * 3], img[i * 3 + 1], img[i * 3 + 2]) ? 1 : 0;
  // ilhas (4-conectadas, ≥150px)
  const label = new Int32Array(W * H).fill(-1);
  let nIslands = 0;
  for (let s = 0; s < W * H; s++) {
    if (!wood[s] || label[s] >= 0) continue;
    const stack = [s]; label[s] = nIslands;
    const isl = [];
    while (stack.length) {
      const p = stack.pop(); isl.push(p);
      const x = p % W, y = (p / W) | 0;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= W * H || label[q] >= 0 || !wood[q]) continue;
        if (Math.abs((q % W) - x) > 1) continue;   // wrap de borda
        label[q] = nIslands; stack.push(q);
      }
    }
    if (isl.length < 150) { for (const p of isl) label[p] = -1; continue; }
    // PCA da ilha
    let mx = 0, my = 0;
    for (const p of isl) { mx += p % W; my += (p / W) | 0; }
    mx /= isl.length; my /= isl.length;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of isl) { const dx = p % W - mx, dy = ((p / W) | 0) - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    // listras variam ao longo do eixo MENOR (veio corre ao longo do maior)
    const dirX = -Math.sin(ang), dirY = Math.cos(ang);
    const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
    for (const p of isl) {
      const x = p % W, y = (p / W) | 0;
      const t = (x - mx) * dirX + (y - my) * dirY;
      const h = ((p * 2654435761) >>> 0) / 4294967296 - 0.5;
      const g = Math.sin(t * 0.55 + h * 2.2) * 0.09 + Math.sin(t * 0.13 + 1.7) * 0.05 + h * 0.06;   // ±~0.13
      for (let c = 0; c < 3; c++) data[p * 3 + c] = clamp(data[p * 3 + c] * (1 + g));
    }
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 90 }).toFile(filePath);
    nIslands++;
  }
  console.log('  -> veio em', nIslands, 'ilha(s) de madeira em', filePath);
}

// GUN-SPACE por classe (GAUNTLET 2.0): eixo cano = centroide stock→muzzle (o cano é baked
// em DIAGONAL nos GLBs Tripo — medido em tools/g2-gunspace.mjs), up = +Y ⊥ eixo. As
// variantes de ACABAMENTO POR ARMA (AK madeira, SCAR tan, G3 oliva...) pintam REGIÕES
// (coronha/grip/handguard) localizadas por (t = param no eixo, h = altura ⊥ eixo).
function gunSpaceFromPos(pos) {
  const n = pos.length / 3;
  let mnz = 1e9, mxz = -1e9;
  for (let i = 0; i < n; i++) { const z = pos[i * 3 + 2]; if (z < mnz) mnz = z; if (z > mxz) mxz = z; }
  const ctr = (pred) => {
    let sx = 0, sy = 0, sz = 0, c = 0;
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (!pred(x, y, z)) continue; sx += x; sy += y; sz += z; c++;
    }
    return [sx / Math.max(1, c), sy / Math.max(1, c), sz / Math.max(1, c)];
  };
  const mz = ctr((x, y, z) => z > mxz - 0.06), st = ctr((x, y, z) => z < mnz + 0.12);
  const axis = [mz[0] - st[0], mz[1] - st[1], mz[2] - st[2]];
  const L = Math.hypot(...axis); for (let i = 0; i < 3; i++) axis[i] /= L;
  let up = [0, 1, 0]; const d = up[0] * axis[0] + up[1] * axis[1] + up[2] * axis[2];
  up = [up[0] - d * axis[0], up[1] - d * axis[1], up[2] - d * axis[2]];
  const ul = Math.hypot(...up); up = up.map(v => v / ul);
  return { st, axis, up, L };
}
// Zona da arma POR TEXEL (GAUNTLET 2.0): a máscara por-adjacência protegia demais —
// o corpo da arma (oliva escuro, colado nas mãos) caía na zona "mãos" e não aceitava
// acabamento. Classificador em 3 camadas: (1) pele → luva; (2) oliva CLARO (luma>0.20,
// hue verde) = luva; (3) vértice a ≤GLOVE_R da pele em 3D = luva (casca escura da luva,
// que o classificador de cor não pega). O resto é arma — inclui coronha cinza-claro
// (luma 0.47 mas neutra) e o metal escuro colado nas mãos.
const GLOVE_R = parseFloat(process.env.GLOVE_R || '0.02');
const isGloveHue = (r, g, b) => {
  const R = r / 255, G = g / 255, B = b / 255;
  const l = 0.299 * R + 0.587 * G + 0.114 * B;
  return l > 0.20 && l < 0.62 && G >= R - 0.03 && G > B + 0.02;
};
const isWeaponTexel = (r, g, b) => !isSkin(r, g, b) && !isGloveHue(r, g, b);
// máscara por vértice: 1 = perto da pele (luva), rasterizada como atributo (0/1 por pixel)
function gloveProximity(ctx) {
  const { pos, uv, idx, W, H } = ctx;
  const n = pos.length / 3;
  const vHand = new Uint8Array(n);
  const sample = (u, v) => {
    const x = Math.min(W - 1, Math.max(0, Math.round(u * (W - 1)))), y = Math.min(H - 1, Math.max(0, Math.round(v * (H - 1))));
    const i = (y * W + x) * 3; return [ctx.img[i], ctx.img[i + 1], ctx.img[i + 2]];
  };
  const skinIdx = [];
  for (let vi = 0; vi < n; vi++) { const [r, g, b] = sample(uv[vi * 2], uv[vi * 2 + 1]); if (isSkin(r, g, b)) skinIdx.push(vi); }
  const CELL = 0.05, grid = new Map();
  const key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  for (const vi of skinIdx) {
    const k = key(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]);
    if (!grid.has(k)) grid.set(k, []); grid.get(k).push(vi);
  }
  const R2 = GLOVE_R * GLOVE_R;
  for (let vi = 0; vi < n; vi++) {
    const x = pos[vi * 3], y = pos[vi * 3 + 1], z = pos[vi * 3 + 2];
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL);
    for (let dx = -1; dx <= 1 && !vHand[vi]; dx++) for (let dy = -1; dy <= 1 && !vHand[vi]; dy++) for (let dz = -1; dz <= 1 && !vHand[vi]; dz++) {
      const cell = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
      if (!cell) continue;
      for (const sv of cell) {
        const ddx = pos[sv * 3] - x, ddy = pos[sv * 3 + 1] - y, ddz = pos[sv * 3 + 2] - z;
        if (ddx * ddx + ddy * ddy + ddz * ddz < R2) { vHand[vi] = 1; break; }
      }
    }
  }
  return rasterZoneAttr(idx, uv, W, H, () => true, 0, (vi) => [vHand[vi], 0]).A1;
}
// Variante com (t,h) por pixel: fn(r,g,b,weapon,i,t,h). opts.prox=false desliga a
// proteção por proximidade 3D (md97: a madeira da base está ONDE as mãos estão — com
// prox ligada ela nunca morre; a luva sobrevive pelo classificador de cor).
async function applyGunVariant(ctx, outPng, fn, opts = {}) {
  const { img, W, H, pos, uv, idx } = ctx;
  const gs = gunSpaceFromPos(pos);
  const attr = (vi) => {
    const x = pos[vi * 3] - gs.st[0], y = pos[vi * 3 + 1] - gs.st[1], z = pos[vi * 3 + 2] - gs.st[2];
    return [(x * gs.axis[0] + y * gs.axis[1] + z * gs.axis[2]) / gs.L, x * gs.up[0] + y * gs.up[1] + z * gs.up[2]];
  };
  const { A1: T, A2: HH } = rasterZoneAttr(idx, uv, W, H, () => true, 0, attr);
  const PROX = opts.prox === false ? null : gloveProximity(ctx);
  const wTest = opts.weaponTest || ((r, g, b, t, h) => isWeaponTexel(r, g, b));
  generated.push(outPng);
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const r = img[i * 3], g = img[i * 3 + 1], b = img[i * 3 + 2];
    const w = wTest(r, g, b, T[i], HH[i]) && (!PROX || PROX[i] < 0.5);
    const [nr, ng, nb] = isBareSkin(r, g, b) ? gloveTone(r, g, b, i) : fn(r, g, b, w, i, T[i], HH[i]);
    out[i * 3] = nr; out[i * 3 + 1] = ng; out[i * 3 + 2] = nb;
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(outPng);
  console.log('  ->', outPng);
}
// Luminância com o MESMO gamma-lift do rifle_lift (albedo Tripo ~0.005 — sem lift vira preto)
const liftC = c => clamp(255 * Math.pow(c / 255, 1 / 1.4) * 1.12);
const luma = (r, g, b) => (0.299 * liftC(r) + 0.587 * liftC(g) + 0.114 * liftC(b)) / 255;
const hsh = i => ((i * 2654435761) >>> 0) / 4294967296 - 0.5;   // ±0.5 determinístico
const tint = (l, R, G, B) => [clamp(l * R[0] + R[1]), clamp(l * G[0] + G[1]), clamp(l * B[0] + B[1])];
// madeira com veio: listras ao longo do eixo (variam em h) + ruído por pixel
const woodT = (l, h, t, i, R, G, B) => {
  const grain = 1 + Math.sin(h * 260 + t * 22) * 0.09 + Math.sin(h * 61 + 1.3) * 0.05 + hsh(i) * 0.10;
  return [clamp((l * R[0] + R[1]) * grain), clamp((l * G[0] + G[1]) * grain), clamp((l * B[0] + B[1]) * grain)];
};
// madeira LISA (G2-R10 — o crítico leu carbine/m92 como "camo mármore trincado"): a luma
// da base (camuflada) vazava nas regiões de madeira. Comprime a luma pra uma banda
// estreita (mata o camo, mantém o sombreamento) + veio direcional suave + pouco ruído.
const flatWoodT = (l, h, t, i, R, G, B) => {
  const lf = 0.45 + l * 0.15;   // banda estreita — sem compressão forte o camo da base vaza
  const grain = 1 + Math.sin(h * 300 + t * 18) * 0.05 + hsh(i) * 0.02;
  return [clamp((lf * R[0] + R[1]) * grain), clamp((lf * G[0] + G[1]) * grain), clamp((lf * B[0] + B[1]) * grain)];
};
// regiões do rifle (calibradas na textura debug 'regions': stock t<0.22; grip 0.24-0.40
// baixo; mag 0.38-0.58 pendurado; handguard 0.52-0.80 em volta do cano; cano t≥0.82)
const rStock = (t, h) => t < 0.22 && h > -0.18;
const rGrip = (t, h) => t >= 0.24 && t < 0.40 && h <= -0.03 && h > -0.20;
const rGuard = (t, h) => t >= 0.52 && t < 0.80 && h > -0.14 && h < 0.12;
const rMag = (t, h) => t >= 0.38 && t < 0.58 && h < -0.08 && h > -0.28;
const rBarrel = (t, h) => t >= 0.82;
const RIFLE_FINISH = {
  ak: (l, t, h, i) => {
    if (rStock(t, h) || rGrip(t, h) || rGuard(t, h)) return woodT(l, h, t, i, [120, 58], [80, 30], [44, 14]);   // madeira avermelhada
    if (rMag(t, h)) return tint(l, [70, 22], [72, 22], [78, 26]);                                              // mag aço
    return tint(l, [85, 18], [88, 18], [100, 24]);                                                             // aço azulado
  },
  akm: (l, t, h, i) => {
    if (rMag(t, h)) return tint(l, [80, 105], [36, 40], [18, 14]);                                              // bakelite laranja (SÓ o mag — G2-R9)
    if (rStock(t, h) || rGrip(t, h) || rGuard(t, h)) return tint(l, [32, 8], [34, 9], [40, 12]);              // mobília PRETA (G2-R9 — era laminado laranja, virava sósia da m92/carbine)
    return tint(l, [40, 10], [44, 12], [52, 14]);                                                             // receiver preto
  },
  g3: (l, t, h, i) => {
    if (rStock(t, h) || rGrip(t, h) || rGuard(t, h)) return tint(l, [48, 36], [56, 42], [36, 24]);             // mobília oliva
    return tint(l, [82, 16], [86, 16], [92, 18]);
  },
  scar: (l, t, h, i) => {
    if (rBarrel(t, h) || rMag(t, h)) return tint(l, [58, 14], [60, 14], [66, 16]);                             // cano/mag escuros
    return tint(l, [105, 92], [92, 70], [66, 42]);                                                             // FDE tan
  },
  mp5: (l, t, h, i) => {
    if (rStock(t, h) || rGrip(t, h) || rGuard(t, h)) return tint(l, [42, 11], [44, 12], [50, 14]);             // polímero
    return tint(l, [58, 15], [61, 16], [68, 19]);                                                              // receiver carvão
  },
  famas: (l) => tint(l, [56, 20], [76, 28], [58, 17]),                                                         // cinza-VERDE (G2-R9 — era preto esverdeado, sósia da uzi/tavor)
  p90: (l, t, h) => rBarrel(t, h) ? tint(l, [22, 6], [24, 7], [28, 8]) : tint(l, [30, 8], [32, 9], [37, 11]), // polímero PRETO (G2-R9 — era olive drab, sósia da g3)
  // G2-R8 (GAP3 — pares idênticos): m92 = carabina de ALAVANCA (Winchester): madeira
  // nogal + aço AZULADO escuro (era rifle_ak — lia como AK). carbine = M1: corpo de
  // madeira clara + metal parkerizado cinza (era rifle_lift — lia como M4/uzi).
  // G2-R9: paleta DIVERGENTE de verdade nas regiões grandes (o crítico viu as 3 como
  // "mesma dominante laranja/marrom"): m92 = nogal ESCURO fosco + azul aço forte;
  // carbine = mel claro; tavor = polímero preto (separa da famas cinza-verde).
  m92: (l, t, h, i) => {
    if (rStock(t, h) || rGrip(t, h) || rGuard(t, h)) return flatWoodT(l, h, t, i, [82, 34], [56, 22], [34, 13]);   // nogal CLARO (G2-R13: luma ~0.35 — separa da g3)
    return tint(l, [40, 11], [46, 13], [62, 18]);                                                            // aço azulado ESCURO (o azul forte lia "brinquedo")
  },
  carbine: (l, t, h, i) => {
    // M1 (G2-R10): corpo de madeira mel ATÉ ~55%, mas receiver topo (0.24-0.48, h≥0) e
    // cano/mag são metal — madeira lisa (flatWoodT, sem o camo da base via wTest bypass).
    // G2-R13: DESSATURADA (noz marrom, menos croma — lia "laranja-plástico")
    const metal = tint(l, [76, 18], [79, 18], [72, 16]);                                                   // parkerizado cinza
    if (t >= 0.55) return metal;                                                                           // cano frontal
    if (rMag(t, h)) return metal;                                                                          // mag destacável = metal
    if (t >= 0.24 && t < 0.50 && h >= 0.0) return metal;                                                   // receiver (topo)
    if (h > -0.20) return flatWoodT(l, h, t, i, [130, 64], [94, 40], [70, 30]);                            // coronha/corpo noz DESSATURADA
    return metal;
  },
  tavor: (l) => tint(l, [30, 8], [33, 10], [38, 12]),                                                          // polímero preto (G2-R9 — separa da famas cinza-verde)
};
// oliva ESCURO (casca sombreada da luva longe de vértices de pele — o PROX 3D não pega
// porque o dorso da luva da pistol é almofadado/distante). Só usado nas pistols: lá a
// arma é neutra/azulada (B>=G), então hue verde escuro é sempre luva. No rifle o corpo
// da arma É oliva escuro — essa regra destruiria o acabamento.
const isDarkOlive = (r, g, b) => {
  const R = r / 255, G = g / 255, B = b / 255;
  const l = 0.299 * R + 0.587 * G + 0.114 * B;
  return l > 0.08 && l < 0.30 && G >= R - 0.03 && G > B + 0.015;
};
// Pistols: a luva é MULTICOLOR (oliva+cinza+preto) e cobre a mão quase sem pele — cor e
// proximidade não separam. Mas GEOMETRIA separa: slide/frame ficam ACIMA do eixo (h>0.05)
// ou À FRENTE (t>0.5); a mão inteira fica em h≤0.05 atrás. Grip fica com a cor original
// (deagle: polímero preto — correto; revolver: o tambor 3D + aço azulado carregam a leitura).
const pistolWeapon = (r, g, b, t, h) => isWeaponTexel(r, g, b) && !isDarkOlive(r, g, b) && (h > 0.05 || t > 0.5);
const PISTOL_FINISH = {
  deagle: (l) => tint(l, [150, 78], [156, 82], [168, 94]),        // cromado
  revolver38: (l) => tint(l, [68, 15], [74, 17], [92, 26]),       // aço azulado
  polymer: (l) => tint(l, [30, 8], [32, 9], [38, 11]),            // G2-R8: polímero preto (separa a pistol base da deagle cromada)
};

const [cls, glb, yHandsMaxS, outBase, ...variants] = process.argv.slice(2);
const ctx = await buildMask(glb, parseFloat(yHandsMaxS), outBase);
console.log('máscara pronta:', outBase);
mkdirSync('public/models/fpvm/tex', { recursive: true });
const generated = [];
const _applyVariant = applyVariant;
applyVariant = async (c, out, fn) => { generated.push(out); return _applyVariant(c, out, fn); };
for (const v of variants) {
  // acabamentos POR ARMA com regiões gun-space (GAUNTLET 2.0 — identidade da classe rifle
  // e das pistols/shotguns; mãos/luvas preservadas pela máscara + pele→luva)
  if (v === 'regions') await applyGunVariant(ctx, `public/models/fpvm/tex/${cls}_regions.webp`, (r, g, b, w, i, t, h) => {
    if (!w) return [r, g, b];
    if (rStock(t, h)) return [255, 0, 0];
    if (rGrip(t, h)) return [0, 220, 0];
    if (rGuard(t, h)) return [0, 80, 255];
    if (rMag(t, h)) return [255, 255, 0];
    if (rBarrel(t, h)) return [255, 0, 255];
    return [40, 40, 40];
  });
  if (RIFLE_FINISH[v]) await applyGunVariant(ctx, `public/models/fpvm/tex/rifle_${v}.webp`, (r, g, b, w, i, t, h) => w ? RIFLE_FINISH[v](luma(r, g, b), t, h, i) : [r, g, b],
    // G2-R10: a textura base do rifle é CAMO VERDE — os patches escuros caem no
    // classificador de luva (isGloveHue) e escapam do acabamento ("mármore trincado").
    // Na carbine (acabamento CLARO) o bypass é obrigatório; as luvas seguem protegidas
    // pela proximidade 3D da pele (PROX) + pele→luva.
    v === 'carbine' ? { weaponTest: (r, g, b) => !isSkin(r, g, b) } : {});
  if (PISTOL_FINISH[v]) await applyGunVariant(ctx, `public/models/fpvm/tex/pistol_${v}.webp`, (r, g, b, w, i, t, h) => w ? PISTOL_FINISH[v](luma(r, g, b), t, h, i) : [r, g, b], { weaponTest: pistolWeapon });
  if (v === 'md97') await applyGunVariant(ctx, `public/models/fpvm/tex/shotgun_md97.webp`, (r, g, b, w, i, t, h) => {   // tática full-black (mata a madeira da base)
    if (!w) return [r, g, b];
    const l = luma(r, g, b);
    return rStock(t, h) || rGuard(t, h) ? tint(l, [34, 9], [36, 10], [40, 12]) : tint(l, [44, 11], [46, 12], [52, 14]);
  }, { prox: false });
  if (v === 'svd') await applyVariant(ctx, `public/models/fpvm/tex/awp_svd.webp`, gloved((r, g, b, w) => { if (!w) return [r, g, b]; const l = (r + g + b) / 3 * 0.38; return [clamp(l), clamp(l), clamp(l * 1.06)]; }));   // preto fosco
  if (v === 'mosin') await applyVariant(ctx, `public/models/fpvm/tex/awp_mosin.webp`, gloved((r, g, b, w) => {
    if (isWood(r, g, b)) { const l = (r + g + b) / 3; return [clamp(l * 1.5 + 34), clamp(l * 1.12 + 14), clamp(l * 0.66)]; }   // madeira clara
    if (w) { const l = (r + g + b) / 3; return [clamp(l * 0.62), clamp(l * 0.66), clamp(l * 0.78)]; }                          // aço azulado
    return [r, g, b];
  }));
  if (v === 'm400') await applyVariant(ctx, `public/models/fpvm/tex/awp_m400.webp`, gloved((r, g, b, w) => { if (!w) return [r, g, b]; const l = (r + g + b) / 3; return [clamp(l * 1.5 + 28), clamp(l * 1.32 + 18), clamp(l * 1.0)]; }));      // desert tan
  if (v === 'rem700') await applyVariant(ctx, `public/models/fpvm/tex/awp_rem700.webp`, gloved((r, g, b, w) => w ? [clamp(r * 0.7), clamp(g * 0.85), clamp(b * 0.6)] : [r, g, b]));                                                // oliva escuro
  if (v === 'g3sg1') await applyVariant(ctx, `public/models/fpvm/tex/awp_g3sg1.webp`, gloved((r, g, b, w) => { if (!w) return [r, g, b]; const l = (r + g + b) / 3; return [clamp(l * 0.75), clamp(l * 0.8), clamp(l * 0.72)]; }));            // cinza-verde
  if (v === 'sks') await applyVariant(ctx, `public/models/fpvm/tex/awp_sks.webp`, gloved((r, g, b, w) => {
    if (isWood(r, g, b)) { const l = (r + g + b) / 3; return [clamp(l * 1.3 + 20), clamp(l * 0.95 + 8), clamp(l * 0.6)]; }     // madeira média
    if (w) { const l = (r + g + b) / 3; return [clamp(l * 0.6), clamp(l * 0.6), clamp(l * 0.66)]; }
    return [r, g, b];
  }));
  // G2-R10 (GAP2 — trio sniper preto idêntico): SKS com madeira por REGIÃO gun-space
  // (a versão por texel só repintava a madeira já existente — área pequena, lia preta).
  // SKS real: coronha+corpo de madeira até ~60% do comprimento; cano frontal = aço.
  if (v === 'skswood') await applyGunVariant(ctx, `public/models/fpvm/tex/awp_sks.webp`, (r, g, b, w, i, t, h) => {
    if (!w) return [r, g, b];
    const l = luma(r, g, b);
    if (t < 0.58 && h > -0.22) return woodT(l, h, t, i, [128, 58], [86, 28], [48, 12]);   // corpo de madeira
    return tint(l, [52, 13], [55, 14], [64, 18]);                                          // aço escuro
  });
  // base da classe SÓ com luva (classes sem variante de acabamento: pistol/shotgun/awp base)
  if (v === 'glovebase') await applyVariant(ctx, `public/models/fpvm/tex/${cls}_glove.webp`, gloved((r, g, b) => [r, g, b]));
  // shotgun: albedo da arma × 0.72 — o metal claro gessificava sob o rig novo (fills R6.8)
  if (v === 'shotgundark') await applyVariant(ctx, `public/models/fpvm/tex/shotgun_glove.webp`, gloved((r, g, b, w) => w ? [clamp(r * 0.72), clamp(g * 0.72), clamp(b * 0.72)] : [r, g, b]));
  if (v === 'gloveorm') {
    // SÓ o patch de luva do crítico R6.8 (mãos/luvas foscas, rough ≥ 0.7, sem metal),
    // arma com o ORM original intocado — pra classes onde o wear ORM gessificava o metal
    // (shotgun: receiver claro + rough baixa + env 1.8 = giz).
    const doc2 = await io.read(glb);
    const ormTex = doc2.getRoot().listTextures().find(t => t.getName().startsWith('ORM'));
    const { data: orm, info: oi } = await sharp(Buffer.from(ormTex.getImage())).raw().toBuffer({ resolveWithObject: true });
    const { mask, W: W2, H: H2 } = ctx;
    const out = Buffer.from(orm);
    for (let i = 0; i < W2 * H2; i++) {
      if (mask[i] === 0) { out[i * 3 + 1] = Math.max(out[i * 3 + 1], 179); out[i * 3 + 2] = 0; }
    }
    await sharp(out, { raw: { width: oi.width, height: oi.height, channels: 3 } }).webp({ quality: 92 }).toFile(`public/models/fpvm/tex/${cls}_orm_wear.webp`);
    console.log(`  -> public/models/fpvm/tex/${cls}_orm_wear.webp (glove-only)`);
  }
  if (v === 'emissivefloor') {
    // PISO EMISSIVO só na zona da arma (crítico R6.8: albedo ~0.005 — nenhuma luz física
    // resgata sem estourar as mãos). emissiveMap = cinza 0.1 na arma, preto nas mãos;
    // a intensidade fica no material (game.js, knob fino).
    const { img, W, H, mask } = ctx;
    const out = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      const on = mask[i] > 0;
      out[i * 3] = on ? 26 : 0; out[i * 3 + 1] = on ? 26 : 0; out[i * 3 + 2] = on ? 26 : 0;
    }
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(`public/models/fpvm/tex/${cls}_emissive.webp`);
    console.log(`  -> public/models/fpvm/tex/${cls}_emissive.webp`);
  }
  if (v === 'lift16') {
    // GAP do crítico R6.5: lift linear atacava sombra mas o albedo-base seguia ~preto.
    // Curva GAMMA nos mid-tones (só zona da arma): mid +20-30%, sombra sobe junto,
    // highlight não estoura. (mantido o nome do arquivo rifle_lift.webp)
    const gamma = c => clamp(255 * Math.pow(c / 255, 1 / 1.4) * 1.12);
    await applyVariant(ctx, `public/models/fpvm/tex/${cls}_lift.webp`, gloved((r, g, b, w) => w ? [gamma(r), gamma(g), gamma(b)] : [r, g, b]));
  }
  if (v === 'wearorm') {
    // GAP "metais chapados": ORM com roughness modulado por value-noise (desgaste/grunge)
    // + leve boost de metalness. 1 arquivo por CLASSE (as variantes de acabamento são
    // baseColor; o desgaste é neutro e compartilhado).
    const doc2 = await io.read(glb);
    const ormTex = doc2.getRoot().listTextures().find(t => t.getName().startsWith('ORM'));
    const { data: orm, info: oi } = await sharp(Buffer.from(ormTex.getImage())).raw().toBuffer({ resolveWithObject: true });
    const { W: W2, H: H2 } = ctx;
    // value noise 2 oitavas (grade aleatória bilinear, seed fixo p/ reprodutibilidade)
    let seed = 1337;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const oct = (cells) => {
      const g = new Float32Array((cells + 1) * (cells + 1));
      for (let i = 0; i < g.length; i++) g[i] = rnd();
      return (x, y) => {
        const fx = x / W2 * cells, fy = y / H2 * cells;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        const s = (a, b) => a + (b - a) * (tx * tx * (3 - 2 * tx));
        const v00 = g[y0 * (cells + 1) + x0], v10 = g[y0 * (cells + 1) + x0 + 1];
        const v01 = g[(y0 + 1) * (cells + 1) + x0], v11 = g[(y0 + 1) * (cells + 1) + x0 + 1];
        const r1 = s(v00, v10), r2 = s(v01, v11);
        return r1 + (r2 - r1) * (ty * ty * (3 - 2 * ty));
      };
    };
    const n1 = oct(6), n2 = oct(24);
    const out = Buffer.from(orm);
    const { mask } = ctx;
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const i = y * W2 + x;
      const n = n1(x, y) * 0.65 + n2(x, y) * 0.35;             // 0..1
      const rough = orm[i * 3 + 1] / 255, metal = orm[i * 3 + 2] / 255;
      out[i * 3 + 1] = clamp(255 * Math.min(1, rough * (0.62 + 0.75 * n)));          // desgaste irregular
      out[i * 3 + 2] = clamp(255 * Math.min(0.85, metal * 1.08 + 0.05 * (n - 0.5))); // metal reforçado mas TETO 0.85 (senão gessifica sob env 1.8)
      // GAP "luvas facetadas com specular de plástico" (crítico R6.8): mãos/luvas ficam
      // foscas (roughness ≥ 0.7) e SEM metal — a aresta da cápsula para de brilhar.
      if (mask[i] === 0) { out[i * 3 + 1] = Math.max(out[i * 3 + 1], 179); out[i * 3 + 2] = 0; }
    }
    await sharp(out, { raw: { width: oi.width, height: oi.height, channels: 3 } }).webp({ quality: 92 }).toFile(`public/models/fpvm/tex/${cls}_orm_wear.webp`);
    console.log(`  -> public/models/fpvm/tex/${cls}_orm_wear.webp`);
  }
  if (v === 'wearpergun') {
    // G2-R12 (GAP2): ORM de desgaste POR ARMA — o rifle_orm_wear compartilhado dava o
    // MESMO crackle em 6+ rifles (liam recolors em sequência). Mesma value-noise do
    // wearorm, seed derivado do nome da variante (determinístico).
    const doc2 = await io.read(glb);
    const ormTex = doc2.getRoot().listTextures().find(t => t.getName().startsWith('ORM'));
    const { data: ormSrc, info: oi } = await sharp(Buffer.from(ormTex.getImage())).raw().toBuffer({ resolveWithObject: true });
    const { mask, W: W2, H: H2 } = ctx;
    const nameHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    for (const name of [...Object.keys(RIFLE_FINISH), 'lmg']) {   // lmg usa rifle_lift mas tem ORM próprio (G2-R12)
      let seed = 1337 + nameHash(name);
      const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
      const oct = (cells) => {
        const g = new Float32Array((cells + 1) * (cells + 1));
        for (let i = 0; i < g.length; i++) g[i] = rnd();
        return (x, y) => {
          const fx = x / W2 * cells, fy = y / H2 * cells;
          const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
          const s = (a, b) => a + (b - a) * (tx * tx * (3 - 2 * tx));
          const v00 = g[y0 * (cells + 1) + x0], v10 = g[y0 * (cells + 1) + x0 + 1];
          const v01 = g[(y0 + 1) * (cells + 1) + x0], v11 = g[(y0 + 1) * (cells + 1) + x0 + 1];
          const r1 = s(v00, v10), r2 = s(v01, v11);
          return r1 + (r2 - r1) * (ty * ty * (3 - 2 * ty));
        };
      };
      const n1 = oct(6), n2 = oct(24);
      const out = Buffer.from(ormSrc);
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
        const i = y * W2 + x;
        const n = n1(x, y) * 0.65 + n2(x, y) * 0.35;
        const rough = ormSrc[i * 3 + 1] / 255, metal = ormSrc[i * 3 + 2] / 255;
        out[i * 3 + 1] = clamp(255 * Math.min(1, rough * (0.62 + 0.75 * n)));
        out[i * 3 + 2] = clamp(255 * Math.min(0.85, metal * 1.08 + 0.05 * (n - 0.5)));
        if (mask[i] === 0) { out[i * 3 + 1] = Math.max(out[i * 3 + 1], 179); out[i * 3 + 2] = 0; }
      }
      await sharp(out, { raw: { width: oi.width, height: oi.height, channels: 3 } }).webp({ quality: 92 }).toFile(`public/models/fpvm/tex/rifle_orm_${name}.webp`);
      console.log(`  -> public/models/fpvm/tex/rifle_orm_${name}.webp`);
    }
  }
  if (v === 'steel') {
    // faca: a lâmina está na zona "mãos" da máscara principal (o punho segura a base da
    // lâmina — proximidade da pele). Máscara PRÓPRIA por GEOMETRIA: triângulos com
    // centroide y > 0.08 (a lâmina aponta +Y a partir do punho). Aço escovado +
    // GRADIENTE (crítico R6.5): roughness menor no fio, maior no dorso, escurecer junto
    // à guarda — interpolado em 3D por pixel (rasterZoneAttr).
    const { pos, uv, idx, W: W2, H: H2, img: base } = ctx;
    // eixo fio↔dorso = eixo horizontal de MAIOR extensão entre os verts da lâmina
    let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    for (let vi = 0; vi < pos.length / 3; vi++) {
      if (pos[vi * 3 + 1] <= 0.08) continue;
      mnx = Math.min(mnx, pos[vi * 3]); mxx = Math.max(mxx, pos[vi * 3]);
      mnz = Math.min(mnz, pos[vi * 3 + 2]); mxz = Math.max(mxz, pos[vi * 3 + 2]);
    }
    const useX = (mxx - mnx) >= (mxz - mnz);
    const wMin = useX ? mnx : mnz, wMax = useX ? mxx : mxz;
    const { mask: bmask, A1: pY, A2: pW } = rasterZoneAttr(idx, uv, W2, H2,
      (a, b2, c) => (pos[a * 3 + 1] + pos[b2 * 3 + 1] + pos[c * 3 + 1]) / 3 > 0.08, 1,
      (vi) => [pos[vi * 3 + 1], useX ? pos[vi * 3] : pos[vi * 3 + 2]]);
    const isBlade = (i) => bmask[i] === 0;
    const guardF = (y) => 0.84 + 0.16 * Math.max(0, Math.min(1, (y - 0.08) / 0.16));   // escurece junto à guarda
    {
      const out = Buffer.alloc(W2 * H2 * 3);
      for (let i = 0; i < W2 * H2; i++) {
        const r = base[i * 3], g = base[i * 3 + 1], b = base[i * 3 + 2];
        if (isBlade(i)) {
          const l = (r + g + b) / 3 * guardF(pY[i]);
          out[i * 3] = clamp(l * 1.2); out[i * 3 + 1] = clamp(l * 1.25); out[i * 3 + 2] = clamp(l * 1.35);
        } else { out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b; }
      }
      await sharp(out, { raw: { width: W2, height: H2, channels: 3 } }).webp({ quality: 90 }).toFile('public/models/fpvm/tex/knife_steel.webp');
      console.log('  -> public/models/fpvm/tex/knife_steel.webp');
    }
    // ORM: G=roughness, B=metalness — fio 0.30 → dorso 0.55, metal levemente menor no dorso
    const doc2 = await io.read(glb);
    const ormTex = doc2.getRoot().listTextures().find(t => t.getName().startsWith('ORM'));
    const { data: orm, info: oi } = await sharp(Buffer.from(ormTex.getImage())).raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.from(orm);
    for (let i = 0; i < W2 * H2; i++) {
      if (isBlade(i)) {
        const t = Math.max(0, Math.min(1, (pW[i] - wMin) / Math.max(1e-6, wMax - wMin)));
        out[i * 3 + 1] = clamp(255 * (0.30 + 0.25 * t));        // gradiente fio→dorso
        out[i * 3 + 2] = clamp(255 * (0.85 - 0.15 * t));
      }
      else { out[i * 3 + 1] = Math.max(out[i * 3 + 1], 204); out[i * 3 + 2] = 0; }   // resto: fosco não-metal
    }
    await sharp(out, { raw: { width: oi.width, height: oi.height, channels: 3 } }).webp({ quality: 92 }).toFile('public/models/fpvm/tex/knife_orm.webp');
    console.log('  -> public/models/fpvm/tex/knife_orm.webp');
  }
  // veio de madeira (pós-processo na textura final da variante)
  if (v === 'mosin') await applyWoodGrain(ctx, 'public/models/fpvm/tex/awp_mosin.webp');
  if (v === 'sks') await applyWoodGrain(ctx, 'public/models/fpvm/tex/awp_sks.webp');
  if (v === 'glovebase' && cls === 'awp') await applyWoodGrain(ctx, 'public/models/fpvm/tex/awp_glove.webp');
}
// lente da luneta: pós-processo em TODAS as texturas geradas da classe awp
if (cls === 'awp') for (const f of generated) await applyLens(ctx, f);
