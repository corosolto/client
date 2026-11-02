#!/usr/bin/env node
// Solda normais por posição exata + skin, reescrevendo só os bytes FLOAT32 de NORMAL do GLB.
// Por quê/limites: docs/visual-consistency/NORMAIS-PERSONAGENS.md
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { fileURLToPath } from 'node:url';

const COMPSIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NUMCOMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

class Unsupported extends Error {}
const unsupported = (msg) => { throw new Unsupported(msg); };

function parseGLB(buf) {
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) unsupported('não é GLB (magic)');
  if (buf.readUInt32LE(4) !== 2) unsupported('versão de glTF != 2');
  let off = 12;
  const jsonLen = buf.readUInt32LE(off); off += 4;
  const jsonType = buf.readUInt32LE(off); off += 4;
  if (jsonType !== 0x4e4f534a) unsupported('primeiro chunk não é JSON');
  const json = JSON.parse(buf.subarray(off, off + jsonLen).toString('utf8'));
  off += jsonLen;
  if (off + 8 > buf.length) unsupported('GLB sem chunk BIN (buffers externos/só-JSON não suportados)');
  const binLen = buf.readUInt32LE(off); off += 4;
  const binType = buf.readUInt32LE(off); off += 4;
  if (binType !== 0x004e4942) unsupported('segundo chunk não é BIN');
  const binStart = off, binEnd = off + binLen;
  if (binEnd > buf.length) unsupported('chunk BIN maior que o arquivo');
  return { json, binStart, binEnd };
}

// Decorar um accessor em leitor tipado; recusa tudo que a solda não domina.
function accessorView(json, buf, binStart, binEnd, idx) {
  const acc = json.accessors[idx];
  if (!acc) unsupported(`accessor ${idx} inexistente`);
  if (acc.sparse) unsupported(`accessor ${idx} com sparse (não suportado)`);
  if (acc.type !== 'VEC3' && acc.type !== 'VEC2' && acc.type !== 'VEC4' && acc.type !== 'SCALAR')
    unsupported(`accessor ${idx} tipo ${acc.type} não suportado`);
  const itemSize = NUMCOMPS[acc.type];
  const compSize = COMPSIZE[acc.componentType];
  if (!compSize) unsupported(`accessor ${idx} componentType ${acc.componentType} não suportado`);
  if (acc.bufferView == null) unsupported(`accessor ${idx} sem bufferView`);
  const bv = json.bufferViews[acc.bufferView];
  const stride = bv.byteStride ?? itemSize * compSize;
  const rel = acc.byteOffset || 0;
  const base = (bv.byteOffset || 0) + rel;
  const len = (acc.count - 1) * stride + itemSize * compSize;
  if (rel < 0 || rel + len > (bv.byteLength ?? Infinity) || binStart + base + len > binEnd)
    unsupported(`accessor ${idx} excede o bufferView/chunk BIN`);
  const view = new DataView(buf.buffer, buf.byteOffset + binStart + base);
  const isFloat = acc.componentType === 5126;
  return {
    idx, count: acc.count, itemSize, stride, base, bufferViewIndex: acc.bufferView,
    absoluteBase: binStart + (bv.byteOffset || 0) + (acc.byteOffset || 0),
    componentType: acc.componentType, normalized: !!acc.normalized,
    read(i, comp) {
      const o = i * stride + comp * compSize;
      if (isFloat) return view.getFloat32(o, true);
      if (acc.componentType === 5121) return view.getUint8(o);
      if (acc.componentType === 5123) return view.getUint16(o, true);
      if (acc.componentType === 5125) return view.getUint32(o, true);
      const v = view.getInt8(o);
      return acc.normalized ? Math.max(v / 127, -1) : v;
    },
    u32(i, comp) { // bits exatos de float (chave de posição/posição de peso)
      return view.getUint32(i * stride + comp * compSize, true);
    },
  };
}

function decodeVec(view, n = view.itemSize) {
  const out = new Float64Array(view.count * n);
  for (let i = 0; i < view.count; i++) for (let c = 0; c < n; c++) out[i * n + c] = view.read(i, c);
  return out;
}

function decodeSkin(json, buf, binStart, binEnd, attrs, posCount) {
  const jointsAcc = attrs.JOINTS_0, weightsAcc = attrs.WEIGHTS_0;
  if ((jointsAcc == null) !== (weightsAcc == null)) unsupported('JOINTS_0 sem WEIGHTS_0 (ou vice-versa)');
  if (jointsAcc == null) return null;
  const jv = accessorView(json, buf, binStart, binEnd, jointsAcc);
  const wv = accessorView(json, buf, binStart, binEnd, weightsAcc);
  if (jv.itemSize !== 4 || wv.itemSize !== 4) unsupported('JOINTS_0/WEIGHTS_0 devem ser VEC4');
  if (jv.componentType !== 5121 && jv.componentType !== 5123 && jv.componentType !== 5125)
    unsupported(`JOINTS_0 componentType ${jv.componentType} inválido (esperado 5121/5123/5125)`);
  if (wv.componentType !== 5126) unsupported('WEIGHTS_0 deve ser VEC4 FLOAT (5126); U8/U16 normalizado não é canônico por valor e não tem fixture');
  if (jv.count !== posCount || wv.count !== posCount)
    unsupported(`JOINTS_0/WEIGHTS_0 count ${jv.count}/${wv.count} != POSITION count ${posCount}`);
  const joints = new Uint32Array(jv.count * 4), weights = new Float64Array(wv.count * 4);
  for (let i = 0; i < jv.count; i++) for (let c = 0; c < 4; c++) { joints[i * 4 + c] = jv.read(i, c); weights[i * 4 + c] = wv.read(i, c); }
  return { joints, weights, jv, wv };
}

function skinKeyOf(skin, i) {
  if (!skin) return '';
  const pairs = [];
  for (let c = 0; c < 4; c++) {
    const w = skin.weights[i * 4 + c];
    if (w > 0) pairs.push([skin.joints[i * 4 + c], skin.wv.u32(i, c)]);
  }
  pairs.sort((a, b) => a[0] - b[0]);
  return pairs.map(([j, wb]) => `${j}:${wb >>> 0}`).join(',');
}

function processGLB(src, opts = {}) {
  const maxAngleDeg = opts.maxAngleDeg ?? 60;
  if (!(maxAngleDeg > 0 && maxAngleDeg < 180)) throw new Error(`--max-angle inválido: ${maxAngleDeg}`);
  const cosMax = Math.cos((maxAngleDeg * Math.PI) / 180);
  const { json, binStart, binEnd } = parseGLB(src);
  if ((json.extensionsRequired || []).length)
    unsupported(`extensionsRequired não vazio: ${json.extensionsRequired.join(',')}`);
  const badBv = (json.bufferViews || []).findIndex((bv) => bv.buffer !== 0);
  if (badBv >= 0) unsupported(`bufferView ${badBv} usa buffer ${json.bufferViews[badBv].buffer} != 0 — dado fora do chunk BIN não é lido/escrito aqui`);
  if ((json.buffers || []).length !== 1) unsupported(`GLB com ${(json.buffers || []).length} buffers — só o BIN embutido é suportado (buffer externo não)`);
  if (json.buffers[0].uri != null) unsupported('buffer 0 com URI (buffer externo/data-URI não suportado)');
  // Bytes protegidos: todo consumidor do BIN (atributos de TODAS as primitivas, inclusive
  // skipped, índices, animação, skins, imagens). A escrita de NORMAL não pode tocar nenhum.
  const MARKCOMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
  const binLen = binEnd - binStart;
  const protectedBytes = new Uint8Array(binLen);
  const markRange = (s, e, where) => {
    if (!(s >= 0) || !(e <= binLen) || e < s) unsupported(`faixa [${s},${e}) fora do chunk BIN (${where})`);
    protectedBytes.fill(1, s, e);
  };
  const markAccessor = (idx, where) => {
    const acc = (json.accessors || [])[idx];
    if (!acc) unsupported(`accessor ${idx} inexistente (${where})`);
    if (acc.sparse) unsupported(`accessor ${idx} com sparse (${where})`);
    if (acc.bufferView == null) unsupported(`accessor ${idx} sem bufferView (${where})`);
    const bv = json.bufferViews[acc.bufferView];
    const itemSize = MARKCOMPS[acc.type], compSize = COMPSIZE[acc.componentType];
    if (!itemSize || !compSize) unsupported(`accessor ${idx} tipo ${acc.type}/${acc.componentType} fora do formato suportado (${where})`);
    const stride = bv.byteStride ?? itemSize * compSize;
    const rel = acc.byteOffset || 0;
    const base = (bv.byteOffset || 0) + rel;
    const len = (acc.count - 1) * stride + itemSize * compSize;
    if (!(rel >= 0) || rel + len > (bv.byteLength ?? Infinity) || base + len > binLen)
      unsupported(`accessor ${idx} excede o bufferView/chunk BIN (${where})`);
    for (let i = 0; i < acc.count; i++) markRange(base + i * stride, base + i * stride + itemSize * compSize, where);
  };
  const willProcess = (prim) => prim.attributes?.NORMAL != null && prim.attributes?.POSITION != null;
  for (const [mi, mesh] of (json.meshes || []).entries()) for (const [pi, prim] of (mesh.primitives || []).entries()) {
    for (const [attr, idx] of Object.entries(prim.attributes || {}))
      if (!(willProcess(prim) && attr === 'NORMAL')) markAccessor(idx, `mesh${mi}.primitives[${pi}] ${attr}`);
    if (prim.indices != null) markAccessor(prim.indices, `mesh${mi}.primitives[${pi}] indices`);
  }
  for (const [ai, anim] of (json.animations || []).entries()) for (const [si, s] of (anim.samplers || []).entries()) {
    if (s.input != null) markAccessor(s.input, `animations[${ai}].samplers[${si}].input`);
    if (s.output != null) markAccessor(s.output, `animations[${ai}].samplers[${si}].output`);
  }
  for (const sk of json.skins || []) if (sk.inverseBindMatrices != null) markAccessor(sk.inverseBindMatrices, 'skins.inverseBindMatrices');
  for (const img of json.images || []) if (img.bufferView != null) {
    const bv = json.bufferViews[img.bufferView];
    markRange(bv.byteOffset || 0, (bv.byteOffset || 0) + (bv.byteLength || 0), `images bufferView ${img.bufferView}`);
  }
  const out = new Uint8Array(src); // cópia; só bytes de NORMAL podem divergir
  const dv = new DataView(out.buffer);
  const meshes = [];
  const writtenRanges = [];
  const consumedSpans = []; // faixas de NORMAL (escritas) e POSITION (lidas) já usadas por outra primitiva

  for (const [mi, mesh] of (json.meshes || []).entries()) {
    const prims = [];
    for (const [pi, prim] of (mesh.primitives || []).entries()) {
      if ((prim.targets || []).length) unsupported(`mesh${mi}.primitives[${pi}] com morph targets`);
      if ((prim.mode ?? 4) !== 4) unsupported(`mesh${mi}.primitives[${pi}] mode ${prim.mode} != 4`);
      if (prim.attributes.TANGENT != null) unsupported(`mesh${mi}.primitives[${pi}] com TANGENT (solda sem reortogonalizar arrisca integridade)`);
      if (prim.attributes.NORMAL == null || prim.attributes.POSITION == null) { prims.push({ skipped: 'sem NORMAL/POSITION' }); continue; }
      const attrs = prim.attributes;
      for (const k of Object.keys(attrs)) if (/^(JOINTS|WEIGHTS)_/.test(k) && k !== 'JOINTS_0' && k !== 'WEIGHTS_0')
        unsupported(`mesh${mi}.primitives[${pi}] com ${k} — conjunto de skin além do _0 não é suportado`);
      const pv = accessorView(json, src, binStart, binEnd, attrs.POSITION);
      const nv = accessorView(json, src, binStart, binEnd, attrs.NORMAL);
      if (pv.componentType !== 5126 || pv.itemSize !== 3) unsupported('POSITION deve ser VEC3 FLOAT');
      if (nv.componentType !== 5126 || nv.itemSize !== 3) unsupported('NORMAL deve ser VEC3 FLOAT');
      if (pv.count !== nv.count) unsupported('POSITION/NORMAL com counts diferentes');
      const primSpans = [['POSITION', pv], ['NORMAL', nv]].map(([attr, v]) => ({ attr, idx: v.idx, start: v.absoluteBase, end: v.absoluteBase + (v.count - 1) * v.stride + 12 }));
      for (const s of primSpans) for (const c of consumedSpans) if (s.start < c.end && s.end > c.start)
        unsupported(`mesh${mi}.primitives[${pi}] ${s.attr} (accessor ${s.idx}) compartilha faixa de bytes com ${c.where} — a segunda passada sobrescreveria a primeira`);
      consumedSpans.push(...primSpans.map((s) => ({ ...s, where: `mesh${mi}.primitives[${pi}] ${s.attr}` })));
      const n = pv.count;
      const pos = decodeVec(pv), nor = decodeVec(nv);
      const skin = decodeSkin(json, src, binStart, binEnd, attrs, n);

      // faces: acumulador por vértice do produto vetorial (módulo = 2x área => média ponderada por área)
      const faces = new Float64Array(n * 3);
      const tri = (a, b, c) => {
        const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2];
        const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2];
        const x = ay * bz - az * by, y = az * bx - ax * bz, z = ax * by - ay * bx;
        for (const v of [a, b, c]) { faces[v * 3] += x; faces[v * 3 + 1] += y; faces[v * 3 + 2] += z; }
      };
      if (prim.indices != null) {
        const iv = accessorView(json, src, binStart, binEnd, prim.indices);
        if (iv.itemSize !== 1) unsupported('indices não-SCALAR');
        if (iv.componentType !== 5121 && iv.componentType !== 5123 && iv.componentType !== 5125)
          unsupported(`indices componentType ${iv.componentType} inválido (esperado 5121/5123/5125)`);
        if (iv.count % 3 !== 0) unsupported(`indices count ${iv.count} não é múltiplo de 3 (triângulo incompleto)`);
        for (let t = 0; t < iv.count; t++) { const ix = iv.read(t, 0); if (!(ix >= 0) || !(ix < n)) unsupported(`índice ${ix} (posição ${t}) fora do domínio [0,${n})`); }
        for (let t = 0; t + 2 < iv.count; t += 3) tri(iv.read(t, 0), iv.read(t + 1, 0), iv.read(t + 2, 0));
      } else {
        if (n % 3 !== 0) unsupported(`POSITION count ${n} sem índices não é múltiplo de 3 (triângulo incompleto)`);
        for (let t = 0; t + 2 < n; t += 3) tri(t, t + 1, t + 2);
      }

      const unit = (i) => {
        const x = nor[i * 3], y = nor[i * 3 + 1], z = nor[i * 3 + 2];
        const l = Math.hypot(x, y, z);
        return l > 0 ? [x / l, y / l, z / l] : [0, 0, 0];
      };
      const groups = new Map();
      for (let i = 0; i < n; i++) {
        const skinKey = skinKeyOf(skin, i);
        const gkey = pv.u32(i, 0) + ':' + pv.u32(i, 1) + ':' + pv.u32(i, 2) + '|' + skinKey;
        let g = groups.get(gkey);
        if (!g) groups.set(gkey, (g = []));
        g.push(i);
      }

      const stats = { vertices: n, groups: groups.size, eligible: 0, welded: 0, keptSingleton: 0, keptIncompatible: 0, rejectedDegenerate: 0, originalDegenerate: 0, discontinuousBefore: 0, discontinuousAfter: 0 };
      const normBase = (i) => nv.absoluteBase + i * nv.stride;
      const allowed = [];
      const writes = [];
      for (const list of groups.values()) {
        const units = list.map(unit);
        let maxDiv = 0;
        for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
          const d = Math.acos(Math.min(1, Math.max(-1, units[a][0] * units[b][0] + units[a][1] * units[b][1] + units[a][2] * units[b][2])));
          if (d > maxDiv) maxDiv = d;
        }
        if (list.length < 2) { stats.keptSingleton += list.length; continue; }
        stats.eligible++;
        if (maxDiv > (1 * Math.PI) / 180) stats.discontinuousBefore++;
        for (let a = 0; a < list.length; a++) {
          const i = list[a];
          if (Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]) === 0 || !Number.isFinite(nor[i * 3] + nor[i * 3 + 1] + nor[i * 3 + 2])) { stats.originalDegenerate++; continue; }
          const compat = [];
          for (let b = 0; b < list.length; b++) {
            const u = units[b];
            if (units[a][0] * u[0] + units[a][1] * u[1] + units[a][2] * u[2] >= cosMax) compat.push(list[b]);
          }
          if (compat.length < 2) { stats.keptIncompatible++; continue; }
          let x = 0, y = 0, z = 0;
          for (const j of compat) { x += faces[j * 3]; y += faces[j * 3 + 1]; z += faces[j * 3 + 2]; }
          const len = Math.hypot(x, y, z);
          if (len < 1e-20 || !Number.isFinite(x + y + z)) { stats.rejectedDegenerate++; continue; }
          stats.welded++;
          writes.push([i, x / len, y / len, z / len]);
          allowed.push([normBase(i), normBase(i) + 12]);
        }
      }
      for (const [i, x, y, z] of writes) { const o = normBase(i); dv.setFloat32(o, x, true); dv.setFloat32(o + 4, y, true); dv.setFloat32(o + 8, z, true); }
      // divergência depois, sobre o que foi efetivamente gravado
      const after = new Map();
      for (const g of groups.values()) if (g.length >= 2) after.set(g, g);
      for (const list of after.values()) {
        let maxDiv = 0;
        for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
          const ua = unit2(nv, dv, list[a]), ub = unit2(nv, dv, list[b]);
          const d = Math.acos(Math.min(1, Math.max(-1, ua[0] * ub[0] + ua[1] * ub[1] + ua[2] * ub[2])));
          if (d > maxDiv) maxDiv = d;
        }
        if (maxDiv > (1 * Math.PI) / 180) stats.discontinuousAfter++;
      }
      writtenRanges.push(...allowed);
      prims.push({ attributes: attrs, stats, normalView: nv, allowed });
    }
    meshes.push({ prims });
  }
  for (const [a, b] of writtenRanges) for (let o = a - binStart; o < b - binStart; o++)
    if (protectedBytes[o]) unsupported(`alias de NORMAL: escrita [${a},${b}) intersecta bytes protegidos de outro consumidor do BIN (atributo/índice/animação/imagem) — layout compartilhado não suportado`);
  // Integridade: nenhum byte pode divergir fora dos ranges de NORMAL declarados acima.
  let changedBytes = 0, firstEscape = -1;
  for (let o = 0; o < src.length; o++) {
    if (out[o] === src[o]) continue;
    const inside = writtenRanges.some(([a, b]) => o >= a && o < b);
    if (!inside) { if (firstEscape < 0) firstEscape = o; continue; }
    changedBytes++;
  }
  if (firstEscape >= 0)
    throw new Error(`INTEGRIDADE: byte ${firstEscape} mudou fora dos offsets de NORMAL — abortando antes de escrever`);
  let changedVertices = 0;
  for (const m of meshes) for (const p of m.prims) {
    if (!p.allowed) continue;
    for (const [a, b] of p.allowed) {
      let diff = false;
      for (let o = a; o < b; o++) if (out[o] !== src[o]) { diff = true; break; }
      if (diff) changedVertices++;
    }
  }
  return { out, json, meshes, changedBytes, changedVertices, writtenRangeCount: writtenRanges.length };
}

function unit2(nv, dv, i) {
  const o = nv.absoluteBase + i * nv.stride;
  const x = dv.getFloat32(o, true), y = dv.getFloat32(o + 4, true), z = dv.getFloat32(o + 8, true);
  const l = Math.hypot(x, y, z);
  return l > 0 ? [x / l, y / l, z / l] : [0, 0, 0];
}

function summarize(result, hashBefore, hashAfter, file) {
  const prims = result.meshes.flatMap((m) => m.prims);
  const skippedPrims = prims.filter((p) => p.skipped).length;
  const sum = prims.filter((p) => p.stats).reduce((a, p) => {
    for (const k of Object.keys(p.stats)) a[k] = (a[k] || 0) + p.stats[k];
    return a;
  }, {});
  return { file, skippedPrims, ...sum, changedVertices: result.changedVertices, changedBytes: result.changedBytes, hashBefore, hashAfter, bytesChanged: hashBefore !== hashAfter };
}
async function main(argv) {
  const args = argv.slice(2);
  const opts = { maxAngleDeg: 60 };
  const positional = [];
  const valueOf = (i, flag) => {
    const v = args[i + 1];
    if (v == null || v.startsWith('-'))
      { console.error(`ERRO: ${flag} exige um valor (não pode ser opção).\n${USAGE}`); process.exit(2); }
    return v;
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-angle') opts.maxAngleDeg = Number(valueOf(i, args[i])), i++;
    else if (args[i] === '--json') opts.json = true;
    else if (args[i] === '-o' || args[i] === '--out') opts.out = valueOf(i, args[i]), i++;
    else if (args[i] === '--help' || args[i] === '-h') { console.log(USAGE); return 0; }
    else if (args[i].startsWith('-')) { console.error(`ERRO: opção desconhecida '${args[i]}'\n${USAGE}`); return 2; }
    else positional.push(args[i]);
  }
  if (positional.length !== 1) { console.error(USAGE); return 2; }
  const input = positional[0];
  const src = await fsp.readFile(input);
  const hashBefore = crypto.createHash('sha256').update(src).digest('hex');
  const result = processGLB(src, opts);
  const hashAfter = crypto.createHash('sha256').update(result.out).digest('hex');
  const report = summarize(result, hashBefore, hashAfter, path.basename(input));
  report.maxAngleDeg = opts.maxAngleDeg;

  const outFile = opts.out;
  if (!outFile) {
    if (opts.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`== ${input} (dry-run; nenhum arquivo escrito)`);
      console.log(`vértices=${report.vertices} grupos=${report.groups} elegíveis=${report.eligible} soldados=${report.welded} alterados=${report.changedVertices} (${report.changedBytes} B)`);
      console.log(`preservados: singleton=${report.keptSingleton} incompatíveis=${report.keptIncompatible} degenerados=${report.rejectedDegenerate}`);
      console.log(`descontínuos>1°: antes=${report.discontinuousBefore} depois=${report.discontinuousAfter}`);
      for (const m of result.meshes) for (const p of m.prims) if (p.skipped) console.log(`pulado: ${p.skipped}`);
    }
    return 0;
  }

  const inReal = await fsp.realpath(input);
  const outReal = await fsp.realpath(outFile).catch(() => null);
  const stIn = await fsp.stat(inReal), stOut = outReal ? await fsp.stat(outReal) : null;
  if (outReal === inReal || (stOut && stIn.dev === stOut.dev && stIn.ino === stOut.ino))
    { console.error(`ERRO: saída '${outFile}' é o mesmo arquivo (symlink/hardlink) da entrada — fonte intocada.`); return 1; }
  const tmp = `${outFile}.tmp-${process.pid}`;
  await fsp.writeFile(tmp, result.out);
  await fsp.rename(tmp, outFile);
  const written = await fsp.readFile(outFile);
  const okLen = written.length === src.length && crypto.createHash('sha256').update(written).digest('hex') === hashAfter;
  if (!okLen) { console.error('ERRO: pós-escrita divergiu — remova a saída e tente de novo.'); return 1; }
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else console.log(`OK ${outFile}: ${report.changedVertices} vértices, ${report.changedBytes} B alterados, resto byte-idêntico.`);
  return 0;
}

const USAGE = `uso: node tools/characters/smooth-normals.mjs <entrada.glb> [--max-angle 60] [--json] [-o saida.glb]
sem -o: dry-run (relatório, nada é escrito). com -o: exige arquivo diferente da entrada.`;
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)))
  main(process.argv).then((c) => process.exit(c), (e) => { console.error(`ERRO: ${e.message}`); process.exit(1); });
