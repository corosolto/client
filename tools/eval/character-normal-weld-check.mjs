#!/usr/bin/env node
// Régua da solda de normais (tools/characters/smooth-normals.mjs): fixtures, RED real,
// rejeições, mutantes e integridade. Defeito e procedência: docs/visual-consistency/NORMAIS-PERSONAGENS.md
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.resolve(HERE, '../characters/smooth-normals.mjs');
const NODE = process.execPath;
const REAL = ['zumbi', 'caipora', 'lampiao', 'esquerdomacho'];
const USAGE = `uso: node tools/eval/character-normal-weld-check.mjs [--baseline-dir DIR]
--baseline-dir DIR: diretório com os 4 GLB ORIGINAIS (sha conferido contra a referência).
Sem a flag: usa public/models/characters — que só vale enquanto contiver os originais (pré-swap).
Originais duráveis: git show ad696fb87:public/models/characters/<nome>.glb > DIR/<nome>.glb`;
const ARGV = process.argv.slice(2);
const BASELINE_FLAG = '--baseline-dir';
const baselineValue = (() => {
  const i = ARGV.indexOf(BASELINE_FLAG);
  if (i < 0) return null;
  const v = ARGV[i + 1];
  if (v == null || v.startsWith('-')) { console.error(`ERRO: ${BASELINE_FLAG} exige um valor (não pode ser opção).\n${USAGE}`); process.exit(2); }
  return v;
})();
for (const a of ARGV) if (a !== BASELINE_FLAG && a !== baselineValue) { console.error(`ERRO: opção desconhecida: ${a}\n${USAGE}`); process.exit(2); }
const shaTop = (b) => crypto.createHash('sha256').update(b).digest('hex');
const REF = JSON.parse(fs.readFileSync(path.resolve(HERE, 'refs/character-normal-smooth-groups.json'), 'utf8'));
const CHARS = path.resolve(baselineValue ?? path.join(HERE, '../../public/models/characters'));
// O piso RED de 500 exige os ORIGINAIS; depois do swap public/models/characters deixa de
// ser baseline e a régua tem que falhar alto, nunca baixar o piso.
for (const name of REAL) {
  const file = path.join(CHARS, `${name}.glb`);
  if (!fs.existsSync(file)) { console.error(`ERRO: baseline sem ${file}. ${USAGE}`); process.exit(1); }
  const h = shaTop(fs.readFileSync(file));
  if (h !== REF.models[name].sha) {
    console.error(`ERRO: ${file} não é o original (sha ${h.slice(0, 12)} != ${REF.models[name].sha.slice(0, 12)}).\n` +
      `Esse diretório provavelmente já contém os produtos soldados (pós-swap). Extraia os originais e repasse a flag:\n` +
      `  mkdir -p DIR && for n in zumbi caipora lampiao esquerdomacho; do git show ad696fb87:public/models/characters/$n.glb > DIR/$n.glb; done\n` +
      `  node tools/eval/character-normal-weld-check.mjs --baseline-dir DIR`);
    process.exit(1);
  }
}
const MAX_ANGLE = 60;
const COS_MAX = Math.cos((MAX_ANGLE * Math.PI) / 180);
const COS_1DEG = Math.cos(1 * Math.PI / 180);

// ---------- construtor de GLB interleaved (independente da ferramenta) ----------
function buildGLB(verts, indices, layout) {
  const { stride, skin, jointsType = 5121, indexType = 5123 } = layout;
  const off = { POSITION: 0, NORMAL: 12, TEXCOORD_0: 24 };
  if (skin) { off.JOINTS_0 = 32; off.WEIGHTS_0 = jointsType === 5121 ? 36 : 40; }
  const attrs = ['POSITION', 'NORMAL', 'TEXCOORD_0', ...(skin ? ['JOINTS_0', 'WEIGHTS_0'] : [])];
  const bin = Buffer.alloc(stride * verts.length + ((indices.length * (indexType === 5125 ? 4 : indexType === 5123 ? 2 : 1)) + 3 & ~3));
  verts.forEach((v, i) => {
    const b = i * stride;
    bin.writeFloatLE(v.p[0], b + off.POSITION); bin.writeFloatLE(v.p[1], b + off.POSITION + 4); bin.writeFloatLE(v.p[2], b + off.POSITION + 8);
    bin.writeFloatLE(v.n[0], b + off.NORMAL); bin.writeFloatLE(v.n[1], b + off.NORMAL + 4); bin.writeFloatLE(v.n[2], b + off.NORMAL + 8);
    bin.writeFloatLE(v.uv[0], b + off.TEXCOORD_0); bin.writeFloatLE(v.uv[1], b + off.TEXCOORD_0 + 4);
    if (skin) for (let c = 0; c < 4; c++) {
      if (jointsType === 5121) bin.writeUInt8(v.j[c], b + off.JOINTS_0 + c);
      else bin.writeUInt16LE(v.j[c], b + off.JOINTS_0 + c * 2);
      bin.writeFloatLE(v.w[c], b + off.WEIGHTS_0 + c * 4);
    }
  });
  const idxOff = stride * verts.length;
  indices.forEach((ix, i) => { const o = idxOff + i * (indexType === 5125 ? 4 : indexType === 5123 ? 2 : 1); if (indexType === 5125) bin.writeUInt32LE(ix, o); else if (indexType === 5123) bin.writeUInt16LE(ix, o); else bin.writeUInt8(ix, o); });
  const accessors = [];
  attrs.forEach((name) => {
    if (name === 'POSITION') accessors.push({ type: 'VEC3', componentType: 5126, count: verts.length, bufferView: 0, byteOffset: 0 });
    if (name === 'NORMAL') accessors.push({ type: 'VEC3', componentType: 5126, count: verts.length, bufferView: 0, byteOffset: 12 });
    if (name === 'TEXCOORD_0') accessors.push({ type: 'VEC2', componentType: 5126, count: verts.length, bufferView: 0, byteOffset: 24 });
    if (name === 'JOINTS_0') accessors.push({ type: 'VEC4', componentType: jointsType, count: verts.length, bufferView: 0, byteOffset: off.JOINTS_0 });
    if (name === 'WEIGHTS_0') accessors.push({ type: 'VEC4', componentType: 5126, count: verts.length, bufferView: 0, byteOffset: off.WEIGHTS_0 });
  });
  const idxBv = 1;
  const idxAcc = { type: 'SCALAR', componentType: indexType, count: indices.length, bufferView: idxBv, byteOffset: 0 };
  const json = {
    asset: { version: '2.0', generator: 'character-normal-weld-check fixture' },
    scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: Object.fromEntries(attrs.map((a, i) => [a, i])), indices: attrs.length }] }],
    accessors: [...accessors, idxAcc],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: stride * verts.length, byteStride: stride, target: 34962 },
      { buffer: 0, byteOffset: idxOff, byteLength: indices.length * (indexType === 5125 ? 4 : indexType === 5123 ? 2 : 1), target: 34963 },
    ],
    buffers: [{ byteLength: bin.length }],
  };
  const jsonRaw = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (jsonRaw.length % 4)) % 4;
  const jsonBuf = Buffer.concat([jsonRaw, Buffer.alloc(pad, 0x20)]);
  const total = 12 + 8 + jsonBuf.length + 8 + bin.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonBuf.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jsonBuf.copy(out, 20);
  bin.copy(out, 20 + jsonBuf.length + 8);
  out.writeUInt32LE(bin.length, 20 + jsonBuf.length); out.writeUInt32LE(0x004e4942, 20 + jsonBuf.length + 4);
  return out;
}

// ---------- variantes de JSON para exercitar as rejeições "unsupported" ----------
const readGlbJson = (buf) => JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
const glbFrom = (json, bin) => {
  const jsonRaw = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonBuf = Buffer.concat([jsonRaw, Buffer.alloc((4 - (jsonRaw.length % 4)) % 4, 0x20)]);
  const total = 12 + 8 + jsonBuf.length + (bin ? 8 + bin.length : 0);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonBuf.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jsonBuf.copy(out, 20);
  if (bin) {
    out.writeUInt32LE(bin.length, 20 + jsonBuf.length); out.writeUInt32LE(0x004e4942, 20 + jsonBuf.length + 4);
    bin.copy(out, 20 + jsonBuf.length + 8);
  }
  return out;
};
const withJson = (buf, fn) => { const json = readGlbJson(buf); fn(json); return glbFrom(json, buf.subarray(20 + buf.readUInt32LE(12) + 8)); };

const LAYOUT_SKIN = { stride: 52, skin: true, jointsType: 5121, indexType: 5123 }; // como zumbi/caipora/esquerdomacho
const LAYOUT_NOSKIN = { stride: 32, skin: false, indexType: 5123 };
const LAYOUT_LAMPIAO = { stride: 56, skin: true, jointsType: 5123, indexType: 5123 }; // como lampiao

// ---------- geometrias das fixtures ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const areaVec = (A, B, C) => cross(sub(B, A), sub(C, A)); // módulo = 2x área => média ponderada por área

// F1: dois triângulos ~35° compartilhando canto A e B, cada canto duplicado (costura UV)
const P_A = [0, 0, 0], P_B = [1, 0, 0], P_C1 = [0.5, 0.4, 0.1], P_C2 = [0.5, 0.4, 0.45];
const F1_FACES = [areaVec(P_A, P_B, P_C1), areaVec(P_A, P_B, P_C2)];
const F1_EXPECT_AB = norm(add(F1_FACES[0], F1_FACES[1]));
const f1Verts = [
  { p: P_A, n: norm(F1_FACES[0]), uv: [0, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: P_B, n: norm(F1_FACES[0]), uv: [1, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: P_C1, n: norm(F1_FACES[0]), uv: [0.5, 1], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: P_A, n: norm(F1_FACES[1]), uv: [0.1, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: P_B, n: norm(F1_FACES[1]), uv: [0.9, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: P_C2, n: norm(F1_FACES[1]), uv: [0.5, 0.9], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
];
const f1Idx = [0, 1, 2, 3, 4, 5];

// F2: vinco de 90° e par oposto (180°) — nada pode soldar
const Q_A = [0, 0, 0], Q_B = [1, 0, 0], Q_C = [0, 1, 0], Q_D = [0, 0, 1]; // 90° entre faces ABC e ABD
const qFace1 = areaVec(Q_A, Q_B, Q_C), qFace2 = areaVec(Q_A, Q_B, Q_D);
const f2Verts = [
  { p: Q_A, n: norm(qFace1), uv: [0, 0] }, { p: Q_B, n: norm(qFace1), uv: [1, 0] }, { p: Q_C, n: norm(qFace1), uv: [0, 1] },
  { p: Q_A, n: norm(qFace2), uv: [0, 0] }, { p: Q_B, n: norm(qFace2), uv: [1, 0] }, { p: Q_D, n: norm(qFace2), uv: [0, 1] },
  // par oposto: mesmas 3 posições, normais opostas
  { p: [2, 0, 0], n: [0, 0, 1], uv: [0, 0] }, { p: [3, 0, 0], n: [0, 0, 1], uv: [1, 0] }, { p: [2.5, 1, 0], n: [0, 0, 1], uv: [0, 1] },
  { p: [2, 0, 0], n: [0, 0, -1], uv: [0, 0] }, { p: [3, 0, 0], n: [0, 0, -1], uv: [1, 0] }, { p: [2.5, 1, 0], n: [0, 0, -1], uv: [0, 1] },
];
const f2Idx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 9, 11, 8, 6, 8, 11];

// F3: posições coincidentes, skins diferentes -> grupos separados
const f3Verts = [
  { p: [0, 0, 0], n: [0, 1, 0], uv: [0, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [1, 0, 0], n: [0, 1, 0], uv: [1, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [0.5, 1, 0.2], n: [0, 1, 0], uv: [0, 1], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [0, 0, 0], n: [0, 1, 0], uv: [0, 0], j: [1, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [1, 0, 0], n: [0, 1, 0], uv: [1, 0], j: [1, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [0.5, 1, 0.2], n: [0, 1, 0], uv: [0, 1], j: [1, 0, 0, 0], w: [1, 0, 0, 0] },
];
const f3Idx = [0, 1, 2, 3, 4, 5];

// F4: singleton — triângulo único, sem cópia: normal original TEM que sobreviver
const f4Verts = [
  { p: [0, 0, 0], n: [0.3, 0.8, 0.52], uv: [0, 0] },
  { p: [1, 0, 0], n: [-0.2, 0.9, 0.1], uv: [1, 0] },
  { p: [0.5, 1, 0], n: [0.1, 0.7, -0.6], uv: [0, 1] },
];
const f4Idx = [0, 1, 2];

// F5: cancelamento — faces opostas somam zero; original preservado
const f5Verts = [
  { p: [0, 0, 0], n: [0, 1, 0], uv: [0, 0] }, { p: [1, 0, 0], n: [0, 1, 0], uv: [1, 0] }, { p: [0.5, 0, 1], n: [0, 1, 0], uv: [0, 1] },
  { p: [0, 0, 0], n: [0, 1, 0], uv: [0, 0] }, { p: [1, 0, 0], n: [0, 1, 0], uv: [1, 0] }, { p: [0.5, 0, 1], n: [0, 1, 0], uv: [0, 1] },
];
const f5Idx = [0, 1, 2, 5, 4, 3];

// F7: 7 vértices sem índices (7%3=1) — cauda não pode ser descartada em silêncio
const f7Verts = [0, 1, 2, 3, 4, 5, 6].map((k) => ({ p: [k, 0, 0], n: [0, 1, 0], uv: [0, 0] }));

// F8: alias NORMAL×POSITION na MESMA primitiva com solda efetiva — normais iguais em
// v0/v1 agrupam, faces vêm de triângulos não degenerados e a escrita pisa em POSITION.
const nrm = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const aliasPosVerts = [
  { p: [0, 0, 0], n: [0, 1, 0], uv: [0, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [1, 0, 0], n: [0, 1, 0], uv: [0, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [2, 0, 0], n: [1, 0, 0], uv: [0, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [3, 0, 0], n: [0, 0, 1], uv: [0, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [4, 0, 0], n: nrm(1, 1, 0), uv: [0, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
  { p: [5, 0, 0], n: nrm(0, 1, 1), uv: [0, 0], j: [0, 0, 0, 0], w: [1, 0, 0, 0] },
];
const aliasPosIdx = [0, 2, 3, 1, 4, 5, 0, 1, 2];

// ---------- leitor independente (real files + integridade) ----------
function readReal(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('não é GLB');
  const jl = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jl).toString('utf8'));
  const binStart = 20 + jl + 8;
  const prim = json.meshes[0].primitives[0];
  if (json.meshes.length !== 1 || json.meshes[0].primitives.length !== 1)
    throw new Error(`readReal: esperava 1 malha/1 primitiva, veio ${json.meshes.length}/${json.meshes[0].primitives.length}`);
  const dv = new DataView(buf.buffer, buf.byteOffset);
  const view = (idx) => {
    const a = json.accessors[idx], bv = json.bufferViews[a.bufferView];
    const stride = bv.byteStride ?? ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type] * { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType]);
    return { a, stride, base: binStart + (bv.byteOffset || 0) + (a.byteOffset || 0) };
  };
  const v3 = (idx, name) => {
    const { a, stride, base } = view(idx);
    const out = [];
    for (let i = 0; i < a.count; i++) out.push([dv.getFloat32(base + i * stride, true), dv.getFloat32(base + i * stride + 4, true), dv.getFloat32(base + i * stride + 8, true)]);
    return out;
  };
  const P = v3(prim.attributes.POSITION), N = v3(prim.attributes.NORMAL);
  const Nv = view(prim.attributes.NORMAL);
  const count = json.accessors[prim.attributes.POSITION].count;
  const joints = [], weights = [];
  if (prim.attributes.JOINTS_0 != null) {
    const jv = view(prim.attributes.JOINTS_0), wa = view(prim.attributes.WEIGHTS_0);
    const jread = jv.a.componentType === 5121 ? (o) => dv.getUint8(o) : jv.a.componentType === 5123 ? (o) => dv.getUint16(o, true) : (o) => dv.getUint32(o, true);
    const jsize = { 5121: 1, 5123: 2, 5125: 4 }[jv.a.componentType];
    for (let i = 0; i < count; i++) {
      const j = [], w = [];
      for (let c = 0; c < 4; c++) { j.push(jread(jv.base + i * jv.stride + c * jsize)); w.push(dv.getFloat32(wa.base + i * wa.stride + c * 4, true)); }
      joints.push(j); weights.push(w);
    }
  }
  const iv = view(prim.indices);
  const iread = iv.a.componentType === 5121 ? (o) => dv.getUint8(o) : iv.a.componentType === 5123 ? (o) => dv.getUint16(o, true) : (o) => dv.getUint32(o, true);
  const isize = { 5121: 1, 5123: 2, 5125: 4 }[iv.a.componentType];
  const index = [];
  for (let i = 0; i < iv.a.count; i++) index.push(iread(iv.base + i * iv.stride));
  return { json, binStart, P, N, Nv, joints, weights, index, normalByteOffset: (i) => Nv.base + i * Nv.stride };
}

const f32dv = new DataView(new ArrayBuffer(4));
const f32 = (x) => { f32dv.setFloat32(0, x, true); return f32dv.getUint32(0, true); };
// métrica RED: pares elegíveis (posição exata + mesma skin, >=2 cópias) com descontinuidade suavizável
function eligibleDiscontinuity(mesh, cosCompat) {
  const groups = new Map();
  for (let i = 0; i < mesh.P.length; i++) {
    const sk = mesh.joints.length
      ? mesh.joints[i].map((j, c) => [j, mesh.weights[i][c]]).filter(([, w]) => w > 0).sort((a, b) => a[0] - b[0]).map(([j, w]) => `${j}:${f32(w)}`).join(',')
      : '';
    const k = `${f32(mesh.P[i][0])}:${f32(mesh.P[i][1])}:${f32(mesh.P[i][2])}|${sk}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  }
  let smoothable = 0, incompatible = 0;
  const incompatibleGroups = [], isolatedVertices = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    let minDot = 1;
    const units = list.map((i) => norm(mesh.N[i]));
    for (let a = 0; a < list.length; a++) {
      let hasCompat = false;
      for (let b = 0; b < list.length; b++) {
        if (a === b) continue;
        const d = units[a][0] * units[b][0] + units[a][1] * units[b][1] + units[a][2] * units[b][2];
        if (d < minDot) minDot = d;
        if (d >= cosCompat) hasCompat = true;
      }
      if (!hasCompat) isolatedVertices.push(list[a]);
    }
    if (minDot < COS_1DEG && minDot >= cosCompat) smoothable++;
    if (minDot < cosCompat) { incompatible++; incompatibleGroups.push(list); }
  }
  return { groups: groups.size, eligibleSmoothableDiscontinuous: smoothable, incompatibleGroups, incompatible, isolatedVertices };
}

// Invariante pós-solda: grupos totalmente compatíveis exigem NORMAL finita e norma >0
// antes da normalização; grupos originais degenerados continuam fora do contrato.
function fullyCompatibleResidue(before, after, cosCompat) {
  const groups = new Map();
  for (let i = 0; i < before.P.length; i++) {
    const sk = before.joints.length
      ? before.joints[i].map((j, c) => [j, before.weights[i][c]]).filter(([, w]) => w > 0).sort((a, b) => a[0] - b[0]).map(([j, w]) => `${j}:${f32(w)}`).join(',')
      : '';
    const k = `${f32(before.P[i][0])}:${f32(before.P[i][1])}:${f32(before.P[i][2])}|${sk}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  }
  let residue = 0, total = 0;
  const unit = (mesh, i) => {
    const n = mesh.N[i];
    const length = Math.hypot(...n);
    if (!n.every(Number.isFinite) || !Number.isFinite(length) || length <= 0) {
      throw new Error(`normal inválida no grupo totalmente compatível: índice ${i} não é finita ou tem norma <= 0`);
    }
    return n.map((x) => x / length);
  };
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    let minDot = 1;
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const u = unit(before, list[a]), v = unit(before, list[b]);
      minDot = Math.min(minDot, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]);
    }
    if (!(minDot >= cosCompat)) continue; // NaN (normal zero/NaN original) ou grupo não-total: fora do contrato
    total++;
    let maxDiv = 0;
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const u = unit(after, list[a]), v = unit(after, list[b]);
      maxDiv = Math.max(maxDiv, Math.acos(Math.min(1, Math.max(-1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))));
    }
    if (maxDiv > Math.PI / 180) residue++;
  }
  return { residue, total };
}
function firstCompatiblePair(mesh, cosCompat) {
  const groups = new Map();
  for (let i = 0; i < mesh.P.length; i++) {
    const sk = mesh.joints.length
      ? mesh.joints[i].map((j, c) => [j, mesh.weights[i][c]]).filter(([, w]) => w > 0).sort((a, b) => a[0] - b[0]).map(([j, w]) => `${j}:${f32(w)}`).join(',')
      : '';
    const key = `${f32(mesh.P[i][0])}:${f32(mesh.P[i][1])}:${f32(mesh.P[i][2])}|${sk}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  for (const list of groups.values()) {
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const u = norm(mesh.N[list[a]]), v = norm(mesh.N[list[b]]);
      const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      if (dot >= cosCompat) return [list[a], list[b]];
    }
  }
  throw new Error('não encontrei grupo real totalmente compatível para mutação');
}


// ---------- execução ----------
const runTool = (args) => spawnSync(NODE, [TOOL, ...args], { encoding: 'utf8' });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const RED_FLOOR = 500; // detecção: medido 703-1081 grupos suavizáveis descontínuos por arquivo (2026-10-31, esta régua); piso de existência do defeito, não teto de qualidade
const results = [];
const queue = [];
const clause = (name, fn) => queue.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'normal-weld-'));
const fixtures = {
  f1: { buf: buildGLB(f1Verts, f1Idx, LAYOUT_SKIN), file: path.join(tmp, 'f1-smooth-seam.glb') },
  f1lampiao: { buf: buildGLB(f1Verts, f1Idx, LAYOUT_LAMPIAO), file: path.join(tmp, 'f1-lampiao-stride56.glb') },
  f2: { buf: buildGLB(f2Verts, f2Idx, LAYOUT_NOSKIN), file: path.join(tmp, 'f2-crease90.glb') },
  f3: { buf: buildGLB(f3Verts, f3Idx, LAYOUT_SKIN), file: path.join(tmp, 'f3-skin-split.glb') },
  f4: { buf: buildGLB(f4Verts, f4Idx, LAYOUT_NOSKIN), file: path.join(tmp, 'f4-singleton.glb') },
  f5: { buf: buildGLB(f5Verts, f5Idx, LAYOUT_NOSKIN), file: path.join(tmp, 'f5-zero-cancel.glb') },
};
for (const f of Object.values(fixtures)) await fsp.writeFile(f.file, f.buf);
const junk = Array.from({ length: 65536 }, (_, i) => ({ p: [i * 1e-6, 5 + (i % 7), 5], n: [0, 1, 0], uv: [0, 0], j: [2, 0, 0, 0], w: [1, 0, 0, 0] }));
const bigVerts = [...junk, ...f1Verts];
const bigIdx = [65536, 65537, 65538, 65539, 65540, 65541];
fixtures.f6 = { buf: buildGLB(bigVerts, bigIdx, { ...LAYOUT_SKIN, indexType: 5125 }), file: path.join(tmp, 'f6-u32-indices.glb') };
await fsp.writeFile(fixtures.f6.file, fixtures.f6.buf);

// fixtures de rejeição: cada guarda documentada precisa virar cláusula (Lei 3)
const unsupportedFx = [];
{
  const base = fixtures.f1.buf;
  unsupportedFx.push({ name: 'TANGENT sem alias de bytes (VEC4 próprio)', buf: withJson(base, (j) => { j.accessors.push({ ...j.accessors[j.meshes[0].primitives[0].attributes.WEIGHTS_0] }); j.meshes[0].primitives[0].attributes.TANGENT = j.accessors.length - 1; }), want: /TANGENT/ });
  unsupportedFx.push({ name: 'extensionsRequired (draco/meshopt)', buf: withJson(base, (j) => { j.extensionsRequired = ['KHR_draco_meshopt_compression']; }), want: /extensionsRequired/ });
  unsupportedFx.push({ name: 'TANGENT alias para accessor NORMAL', buf: withJson(base, (j) => { j.meshes[0].primitives[0].attributes.TANGENT = j.meshes[0].primitives[0].attributes.NORMAL; }), want: /TANGENT/ });
  unsupportedFx.push({ name: 'accessor POSITION com sparse', buf: withJson(base, (j) => { j.accessors[j.meshes[0].primitives[0].attributes.POSITION].sparse = { count: 1 }; }), want: /sparse/ });
  unsupportedFx.push({ name: 'morph targets', buf: withJson(base, (j) => { j.meshes[0].primitives[0].targets = [{ POSITION: 0 }]; }), want: /morph/ });
  unsupportedFx.push({ name: 'mode 5 (não-triângulos)', buf: withJson(base, (j) => { j.meshes[0].primitives[0].mode = 5; }), want: /mode/ });
  unsupportedFx.push({ name: 'WEIGHTS_0 U8 normalizado', buf: withJson(base, (j) => { const w = j.accessors[j.meshes[0].primitives[0].attributes.WEIGHTS_0]; w.componentType = 5121; w.normalized = true; }), want: /WEIGHTS_0/ });
  unsupportedFx.push({ name: 'GLB sem chunk BIN', buf: glbFrom(readGlbJson(base), null), want: /sem chunk BIN/ });
  unsupportedFx.push({ name: 'accessor POSITION sem bufferView', buf: withJson(base, (j) => { delete j.accessors[j.meshes[0].primitives[0].attributes.POSITION].bufferView; }), want: /sem bufferView/ });
  unsupportedFx.push({ name: 'NORMAL/POSITION compartilhados entre primitivas (split de material)', buf: withJson(base, (j) => { const p0 = j.meshes[0].primitives[0]; j.meshes[0].primitives = [p0, { ...p0, material: 1 }]; }), want: /compartilha faixa de bytes/ });
  unsupportedFx.push({ name: 'alias de faixa de bytes sob accessor ID diferente', buf: withJson(base, (j) => {
    const p0 = j.meshes[0].primitives[0];
    j.accessors.push({ ...j.accessors[p0.attributes.NORMAL] });
    j.meshes[0].primitives = [p0, { ...p0, material: 1, attributes: { ...p0.attributes, NORMAL: j.accessors.length - 1 } }];
  }), want: /compartilha faixa de bytes/ });
  unsupportedFx.push({ name: 'indices componentType 5122 (inválido por spec)', buf: withJson(base, (j) => { j.accessors[j.meshes[0].primitives[0].indices].componentType = 5122; }), want: /indices componentType/ });
  unsupportedFx.push({ name: 'JOINTS_0 componentType 5122 (inválido por spec)', buf: withJson(base, (j) => { j.accessors[j.meshes[0].primitives[0].attributes.JOINTS_0].componentType = 5122; }), want: /JOINTS_0 componentType/ });
  unsupportedFx.push({ name: 'JOINTS_0 count != POSITION count', buf: withJson(base, (j) => { j.accessors[j.meshes[0].primitives[0].attributes.JOINTS_0].count = 4; }), want: /count 4\/6 != POSITION count 6/ });
  unsupportedFx.push({ name: 'alias NORMAL×TEXCOORD_0 na mesma primitiva (UV corrompível)', buf: withJson(base, (j) => { j.accessors[j.meshes[0].primitives[0].attributes.TEXCOORD_0].byteOffset = 12; }), want: /alias de NORMAL/ });
  unsupportedFx.push({ name: 'alias NORMAL×POSITION de primitiva skipped (sem NORMAL)', buf: withJson(base, (j) => {
    j.accessors.push({ ...j.accessors[j.meshes[0].primitives[0].attributes.POSITION], byteOffset: 12 });
    j.meshes[0].primitives.push({ attributes: { POSITION: j.accessors.length - 1 } });
  }), want: /alias de NORMAL/ });
  unsupportedFx.push({ name: 'alias NORMAL×POSITION na mesma primitiva (solda pisa em POSITION)', buf: withJson(buildGLB(aliasPosVerts, aliasPosIdx, LAYOUT_SKIN), (j) => { j.accessors[j.meshes[0].primitives[0].attributes.POSITION].byteOffset = 12; }), want: /alias de NORMAL/ });
  unsupportedFx.push({ name: 'bufferView com buffer 1 (externo)', buf: withJson(base, (j) => {
    j.buffers.push({ byteLength: 96 });
    j.bufferViews.push({ buffer: 1, byteOffset: 0, byteLength: 96 });
    j.accessors[j.meshes[0].primitives[0].attributes.NORMAL].bufferView = j.bufferViews.length - 1;
  }), want: /usa buffer 1 != 0/ });
  unsupportedFx.push({ name: 'buffer 0 com URI (data-URI)', buf: withJson(base, (j) => { j.buffers[0].uri = 'data:application/octet-stream;base64,AAAA'; }), want: /com URI/ });
  unsupportedFx.push({ name: 'JOINTS_1/WEIGHTS_1 presentes (conjunto extra ignorado antes)', buf: withJson(base, (j) => {
    const p = j.meshes[0].primitives[0];
    j.accessors.push({ ...j.accessors[p.attributes.JOINTS_0] }, { ...j.accessors[p.attributes.WEIGHTS_0] });
    p.attributes.JOINTS_1 = j.accessors.length - 2; p.attributes.WEIGHTS_1 = j.accessors.length - 1;
  }), want: /JOINTS_1.*não é suportado/ });
  unsupportedFx.push({ name: 'índice 99 fora do domínio [0,6)', buf: buildGLB(f1Verts, [0, 1, 99, 3, 4, 5], LAYOUT_SKIN), want: /fora do domínio \[0,6\)/ });
  unsupportedFx.push({ name: 'indices count 7 (triângulo incompleto descartado antes)', buf: buildGLB(f1Verts, [0, 1, 2, 3, 4, 5, 0], LAYOUT_SKIN), want: /não é múltiplo de 3/ });
  unsupportedFx.push({ name: 'sem índices com POSITION count 7 (7%3=1)', buf: withJson(buildGLB(f7Verts, [], LAYOUT_NOSKIN), (j) => { delete j.meshes[0].primitives[0].indices; }), want: /não é múltiplo de 3/ });
  unsupportedFx.push({ name: 'WEIGHTS_0 count != POSITION count', buf: withJson(base, (j) => { j.accessors[j.meshes[0].primitives[0].attributes.WEIGHTS_0].count = 4; }), want: /count 6\/4 != POSITION count 6/ });
  for (const [i, fx] of unsupportedFx.entries()) { fx.file = path.join(tmp, `fx-${i}-unsupported.glb`); await fsp.writeFile(fx.file, fx.buf); }
}

const applyTool = async (file, out) => {
  const r = runTool([file, '--json', '-o', out]);
  return { code: r.status, report: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr };
};

// varre diferenças byte a byte e devolve ranges de NORMAL esperados (independente)
const diffOutsideNormal = (before, after, vertsCount, stride, normOff = 12, binStart = null) => {
  const jl = before.readUInt32LE(12);
  const bs = binStart ?? 20 + jl + 8;
  let outside = 0, inside = 0, changedVerts = new Set();
  for (let o = 0; o < before.length; o++) {
    if (before[o] === after[o]) continue;
    const rel = o - bs;
    const inNorm = rel >= 0 && rel < vertsCount * stride && (rel % stride) >= normOff && (rel % stride) < normOff + 12;
    if (inNorm) { inside++; changedVerts.add(Math.floor(rel / stride)); } else outside++;
  }
  return { outside, inside, changedVerts: changedVerts.size };
};
const readNormalAt = (buf, i, vertsCount, stride, normOff = 12) => {
  const jl = buf.readUInt32LE(12);
  const bs = 20 + jl + 8;
  const o = bs + i * stride + normOff;
  return [buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)];
};
const closeTo = (a, b, eps = 2e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);

// F1: solda esperada + preservação de singleton + bytes fora de NORMAL intocados
clause('F1 suaviza par de costura UV (média ponderada por área)', () => {
  const out = path.join(tmp, 'f1-out.glb');
  const r = runTool([fixtures.f1.file, '--json', '-o', out]);
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  const after = fs.readFileSync(out);
  assert(after.length === fixtures.f1.buf.length, 'comprimento mudou');
  const d = diffOutsideNormal(fixtures.f1.buf, after, 6, 52);
  assert(d.outside === 0, `${d.outside} bytes fora de NORMAL mudaram`);
  for (const i of [0, 1, 3, 4]) assert(closeTo(readNormalAt(after, i, 6, 52), F1_EXPECT_AB), `v${i} não recebeu a média esperada`);
  for (const i of [2, 5]) assert(closeTo(readNormalAt(after, i, 6, 52), f1Verts[i].n), `singleton v${i} recalculado`);
  assert(rep.changedVertices === d.changedVerts, `changedVertices ${rep.changedVertices} != medido ${d.changedVerts}`);
  assert(rep.changedBytes === d.inside, `changedBytes ${rep.changedBytes} != medido ${d.inside}`);
  return `soldou 4 cantos, preservou 2; ${d.inside} B normais, 0 fora`;
});

clause('F1 stride 56/joints U16 (layout lampiao) idem', () => {
  const out = path.join(tmp, 'f1l-out.glb');
  const r = runTool([fixtures.f1lampiao.file, '--json', '-o', out]);
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  const after = fs.readFileSync(out);
  const d = diffOutsideNormal(fixtures.f1lampiao.buf, after, 6, 56);
  assert(d.outside === 0, `${d.outside} bytes fora de NORMAL`);
  for (const i of [0, 1, 3, 4]) assert(closeTo(readNormalAt(after, i, 6, 56), F1_EXPECT_AB), `v${i} errado`);
  return 'ok stride 56';
});

clause('F2 vinco 90° e par oposto preservados (0 bytes)', () => {
  const out = path.join(tmp, 'f2-out.glb');
  const r = runTool([fixtures.f2.file, '--json', '-o', out]);
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  const after = fs.readFileSync(out);
  const u = norm(qFace1), v = norm(qFace2);
  assert(Math.abs(u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) < 1e-7, 'fixture F2 não é geometricamente ortogonal');
  assert(rep.changedBytes === 0, `mudou ${rep.changedBytes} B em vinco/oposto`);
  assert(after.equals(fixtures.f2.buf), 'arquivo deveria ser byte-idêntico');
  return `incompatíveis=${rep.keptIncompatible}`;
});

clause('F3 posições coincidentes com skin diferente não soldam', () => {
  const out = path.join(tmp, 'f3-out.glb');
  const r = runTool([fixtures.f3.file, '--json', '-o', out]);
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  assert(rep.changedBytes === 0, `soldou através de skin: ${rep.changedBytes} B`);
  assert(fs.readFileSync(out).equals(fixtures.f3.buf), 'arquivo não é byte-idêntico');
  return 'grupos separados por (joint,peso)';
});

clause('F4 singleton mantém normal original (sem recálculo)', () => {
  const out = path.join(tmp, 'f4-out.glb');
  const r = runTool([fixtures.f4.file, '--json', '-o', out]);
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  assert(rep.changedBytes === 0, `recalculou singleton: ${rep.changedBytes} B`);
  assert(fs.readFileSync(out).equals(fixtures.f4.buf), 'singleton alterado');
  return 'original preservado';
});

clause('F5 soma de faces que cancela é rejeitada', () => {
  const out = path.join(tmp, 'f5-out.glb');
  const r = runTool([fixtures.f5.file, '--json', '-o', out]);
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  assert(rep.rejectedDegenerate === 6, `degenerados=${rep.rejectedDegenerate}, esperado 6 (6 cópias em 3 grupos)`);
  assert(rep.changedBytes === 0, 'mudou bytes em candidato zero');
  assert(fs.readFileSync(out).equals(fixtures.f5.buf), 'arquivo alterado');
  return 'zero/NaN rejeitado, original mantido';
});

clause('F6 índices U32 > 65535 soldam e singletons ficam', () => {
  const out = path.join(tmp, 'f6-out.glb');
  const r = runTool([fixtures.f6.file, '--json', '-o', out]);
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  const after = fs.readFileSync(out);
  const d = diffOutsideNormal(fixtures.f6.buf, after, bigVerts.length, 52);
  assert(d.outside === 0, `${d.outside} bytes fora de NORMAL`);
  for (const [slot, vi] of [[0, 65536], [1, 65537], [3, 65539], [4, 65540]])
    assert(closeTo(readNormalAt(after, vi, bigVerts.length, 52), F1_EXPECT_AB), `v${vi} não soldou`);
  return `${d.changedVerts} vértices soldados via índices 5125`;
});

clause('CLI: dry-run não escreve; -o na própria fonte/hardlink/symlink recusa', async () => {
  const f = fixtures.f1.file;
  const h0 = sha(fs.readFileSync(f));
  const dry = runTool([f]);
  assert(dry.status === 0 && !dry.stdout.includes('OK '), 'dry-run falhou');
  assert(sha(fs.readFileSync(f)) === h0, 'dry-run escreveu no arquivo');
  const same = runTool([f, '-o', f]);
  assert(same.status !== 0 && /mesmo arquivo/.test(same.stderr), `aceitou -o igual à entrada: ${same.stderr}`);
  assert(sha(fs.readFileSync(f)) === h0, 'fonte tocada com -o igual');
  const hl = path.join(tmp, 'f1-hardlink.glb');
  fs.linkSync(f, hl);
  const viaHl = runTool([f, '-o', hl]);
  assert(viaHl.status !== 0 && /mesmo arquivo/.test(viaHl.stderr), 'aceitou hardlink como saída');
  const sl = path.join(tmp, 'f1-symlink.glb');
  fs.symlinkSync(f, sl);
  const viaSl = runTool([f, '-o', sl]);
  assert(viaSl.status !== 0 && /mesmo arquivo/.test(viaSl.stderr), 'aceitou symlink como saída');
  assert(sha(fs.readFileSync(f)) === h0, 'fonte tocada por hardlink/symlink');
  return 'todas as recusas explícitas';
});

const sentinelIntact = (file, sentinel) => {
  assert(fs.existsSync(file), 'output antigo sumiu');
  assert(fs.readFileSync(file).equals(sentinel), 'output antigo foi sobrescrito (bytes divergem do sentinel)');
};
clause('CLI: -o/--out/--max-angle sem valor, seguido de opção ou opção desconhecida => exit 2; sentinel lido a cada controle', () => {
  const stale = path.join(tmp, 'stale-output.glb');
  const sentinel = Buffer.from('CONTEUDO-ANTIGO-NAO-TOCAR');
  fs.writeFileSync(stale, sentinel);
  const badArgvs = [
    [fixtures.f1.file, '--json', '-o'],
    [fixtures.f1.file, '--json', '-o', '--max-angle'],
    [fixtures.f1.file, '-o', '--json', stale],
    [fixtures.f1.file, '--out', '--json', stale],
    [fixtures.f1.file, '--max-angle'],
    [fixtures.f1.file, '--max-angle', '--json'],
    [fixtures.f1.file, '--max-angle', '-o', stale],
    [fixtures.f1.file, '--json', '-o', '--jsonx'],
    [fixtures.f1.file, '--out', '--opcao-inexistente'],
    [fixtures.f1.file, '--opcao-inexistente'],
  ];
  const misses = [];
  for (const argv of badArgvs) {
    const r = runTool(argv);
    if (r.status !== 2) misses.push(`[${argv.slice(1).join(' ')}] exit=${r.status}`);
    else if (!(/exige um valor/.test(r.stderr) || /opção desconhecida/.test(r.stderr))) misses.push(`[${argv.slice(1).join(' ')}] stderr sem causa: ${r.stderr.trim().slice(0, 60)}`);
    else try { sentinelIntact(stale, sentinel); } catch (e) { misses.push(`[${argv.slice(1).join(' ')}] ${e.message}`); }
  }
  assert(misses.length === 0, misses.join(' | '));
  assert(fs.readdirSync(tmp).every((f) => !f.startsWith('stale-output.glb.tmp-')), 'tmp órfão');
  return `${badArgvs.length} malformações exit 2 com causa; sentinel intacto byte a byte após cada controle`;
});

clause('JSON/chunk intocados e hash muda', () => {
  const out = path.join(tmp, 'f1-hash.glb');
  const r = runTool([fixtures.f1.file, '--json', '-o', out]);
  assert(r.status === 0, r.stderr);
  const rep = JSON.parse(r.stdout);
  const after = fs.readFileSync(out);
  const jl = fixtures.f1.buf.readUInt32LE(12);
  assert(after.subarray(12, 12 + 8 + jl).equals(fixtures.f1.buf.subarray(12, 12 + 8 + jl)), 'cabeçalho+JSON divergiram');
  assert(rep.hashBefore === sha(fixtures.f1.buf) && rep.hashAfter === sha(after) && rep.hashBefore !== rep.hashAfter, 'hashes inconsistentes');
  return `sha256 ${rep.hashBefore.slice(0, 8)}→${rep.hashAfter.slice(0, 8)}`;
});


clause('JSON: primitiva sem NORMAL/POSITION vira skippedPrims explícito', () => {
  const buf = withJson(fixtures.f1.buf, (j) => { delete j.meshes[0].primitives[0].attributes.NORMAL; });
  const file = path.join(tmp, 'skipped-prim.glb');
  fs.writeFileSync(file, buf);
  const r = runTool([file, '--json']);
  assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  assert(rep.skippedPrims === 1, `skippedPrims=${rep.skippedPrims}, esperado 1`);
  assert(rep.changedBytes === 0 && rep.vertices === undefined, 'pulou mas reportou vértices/bytes');
  return 'skippedPrims=1 visível no --json';
});
clause('REJEIÇÕES unsupported: causa explícita no stderr, exit != 0, nenhum arquivo criado', () => {
  const misses = [];
  for (const fx of unsupportedFx) {
    const out = path.join(tmp, `fx-out-${unsupportedFx.indexOf(fx)}.glb`);
    const r = runTool([fx.file, '--json', '-o', out]);
    if (r.status === 0) misses.push(`${fx.name}: ACEITOU (exit 0)`);
    else if (!fx.want.test(r.stderr)) misses.push(`${fx.name}: stderr sem a causa: ${r.stderr.trim()}`);
    else if (fs.existsSync(out)) misses.push(`${fx.name}: criou arquivo de saída`);
  }
  assert(misses.length === 0, misses.join(' | '));
  return `${unsupportedFx.length} variantes rejeitadas com causa explícita e sem output`;
});

// ---------- RED real + depois ----------
const realOut = {};
for (const name of REAL) {
  clause(`RED ${name}: pares elegíveis descontínuos (suavizáveis <=${MAX_ANGLE}°)`, () => {
    const buf = fs.readFileSync(path.join(CHARS, `${name}.glb`));
    const m = readReal(buf);
    const met = eligibleDiscontinuity(m, COS_MAX);
    realOut[name] = { before: met, buf, mesh: m };
    assert(met.eligibleSmoothableDiscontinuous >= RED_FLOOR, `apenas ${met.eligibleSmoothableDiscontinuous} pares suavizáveis (piso de detecção ${RED_FLOOR})`);
    return `${met.eligibleSmoothableDiscontinuous} grupos suavizáveis descontínuos de ${met.groups}; ${met.incompatible} grupos >${MAX_ANGLE}° preserváveis`;
  });
}


// Aceite APÓS centralizado: o MESMO predicado serve aos 4 arquivos reais e à prova de
// mutante (Lei 3) — resíduo 0 é exigido, não impresso.
const weldAcceptance = (name, outPath, report) => {
  const before = realOut[name].buf;
  const after = fs.readFileSync(outPath);
  assert(after.length === before.length, 'comprimento mudou');
  const mBefore = realOut[name].mesh;
  const res = fullyCompatibleResidue(mBefore, readReal(after), COS_MAX);
  assert(res.total > 0, `${name}: cobertura vazia — 0 grupos totalmente compatíveis, invariante APÓS sem dente`);
  assert(res.residue === 0, `${name}: resíduo pós ${res.residue}/${res.total} grupos totalmente compatíveis — solda incompleta`);
  let isolatedChanged = 0;
  for (const i of realOut[name].before.isolatedVertices) {
    const a = mBefore.normalByteOffset(i);
    if (!after.subarray(a, a + 12).equals(before.subarray(a, a + 12))) isolatedChanged++;
  }
  assert(isolatedChanged === 0, `${isolatedChanged} vértices sem par compatível (>${MAX_ANGLE}°) foram alterados`);
  const d = diffOutsideNormal(before, after, mBefore.P.length, mBefore.Nv.stride, 12, mBefore.Nv.base - 12);
  assert(d.outside === 0, `${d.outside} bytes fora de NORMAL mudaram`);
  assert(report.changedBytes === d.inside, `changedBytes ${report.changedBytes} != medido ${d.inside}`);
  return { metAfter: eligibleDiscontinuity(readReal(after), COS_MAX), res };
};

for (const name of REAL) {
  clause(`APÓS ${name}: resíduo 0 EXIGIDO nos grupos totalmente compatíveis; incompatíveis e integridade preservados`, async () => {
    const file = path.join(CHARS, `${name}.glb`);
    const out = path.join(tmp, `${name}-welded.glb`);
    const r = await applyTool(file, out);
    assert(r.code === 0, `exit ${r.code}: ${r.err}`);
    const { metAfter, res } = weldAcceptance(name, out, r.report);
    return `soldou ${r.report.changedVertices} vértices/${r.report.changedBytes} B; ${metAfter.incompatible} grupos >${MAX_ANGLE}° intactos; resíduo pós ${res.residue}/${res.total} EXIGIDO 0; hash ${r.report.hashAfter.slice(0, 8)}`;
  });
}

// ---------- mutantes de causalidade ----------
async function mutatedTool(mutName, from, to) {
  const src = await fsp.readFile(TOOL, 'utf8');
  const mutated = src.replace(from, to);
  assert(mutated !== src, `mutação ${mutName} NÃO APLICOU (texto não casou)`);
  const file = path.join(tmp, `mutante-${mutName}.mjs`);
  await fsp.writeFile(file, mutated);
  return file;
}

await clause('MUTANTE sem-skin: régua pega solda através de influências', async () => {
  const m = await mutatedTool('sem-skin',
    "const gkey = pv.u32(i, 0) + ':' + pv.u32(i, 1) + ':' + pv.u32(i, 2) + '|' + skinKey;",
    "const gkey = pv.u32(i, 0) + ':' + pv.u32(i, 1) + ':' + pv.u32(i, 2);");
  const out = path.join(tmp, 'f3-mut-skin.glb');
  const r = spawnSync(NODE, [m, fixtures.f3.file, '--json', '-o', out], { encoding: 'utf8' });
  assert(r.status === 0, `mutante falhou inesperadamente: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  assert(rep.changedBytes > 0, 'mutante sem guarda de skin NÃO soldou a fixture F3 — cláusula F3 não teria o que morder');
  return `mutante soldou ${rep.changedVertices} vértices; F3 (skin-split) reprova`;
});

await clause('MUTANTE sem-angulo: régua pega colapso de vinco 90°', async () => {
  const m = await mutatedTool('sem-angulo', '>= cosMax) compat.push(list[b]);', '>= -2) compat.push(list[b]);');
  const out = path.join(tmp, 'f2-mut-angulo.glb');
  const r = spawnSync(NODE, [m, fixtures.f2.file, '--json', '-o', out], { encoding: 'utf8' });
  assert(r.status === 0, `mutante falhou inesperadamente: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  assert(rep.changedBytes > 0, 'mutante sem guarda de ângulo NÃO soldou o vinco — cláusula F2 não teria o que morder');
  return `mutante colapsou ${rep.changedVertices} vértices do vinco; F2 (crease90) reprova`;
});

await clause('MUTANTE offset-errado: verificação de integridade aborta antes de escrever', async () => {
  const m = await mutatedTool('offset-errado',
    'const o = normBase(i); dv.setFloat32(o, x, true); dv.setFloat32(o + 4, y, true); dv.setFloat32(o + 8, z, true);',
    'const o = normBase(i) + 4; dv.setFloat32(o, x, true); dv.setFloat32(o + 4, y, true); dv.setFloat32(o + 8, z, true);');
  const out = path.join(tmp, 'f1-mut-offset.glb');
  const r = spawnSync(NODE, [m, fixtures.f1.file, '--json', '-o', out], { encoding: 'utf8' });
  assert(r.status !== 0, 'mutante escreveu normal fora do slot sem ser pego');
  assert(/INTEGRIDADE/.test(r.stderr), `abortou por motivo errado: ${r.stderr}`);
  assert(!fs.existsSync(out), 'arquivo de saída foi criado apesar do escape');
  return 'escape detectado, saída não criada';
});

await clause('MUTANTE sem-guarda-TANGENT: régua pega aceitação silenciosa', async () => {
  const m = await mutatedTool('sem-tangent',
    'if (prim.attributes.TANGENT != null) unsupported(',
    'if (false && prim.attributes.TANGENT != null) unsupported(');
  const fx = unsupportedFx.find((f) => f.name.startsWith('TANGENT sem alias'));
  const out = path.join(tmp, 'fx-mut-tangent.glb');
  const r = spawnSync(NODE, [m, fx.file, '--json', '-o', out], { encoding: 'utf8' });
  assert(r.status === 0, `mutante rejeitou inesperadamente: ${r.stderr}`);
  assert(fs.existsSync(out), 'mutante não produziu saída — a cláusula de rejeição não teria o que morder');
  return 'mutante aceita TANGENT em silêncio; cláusula REJEIÇÕES reprova';
});
await clause('MUTANTE solda-3-de-cada-4-grupos: MESMO aceite da cláusula APÓS reprova (resíduo 0 é exigido)', async () => {
  const m = await mutatedTool('solda-3-de-4',
    'for (const list of groups.values()) {',
    'for (const list of [...groups.values()].filter((_, gi) => gi % 4 !== 3)) {');
  const out = path.join(tmp, 'zumbi-mut-3de4.glb');
  const r = spawnSync(NODE, [m, path.join(CHARS, 'zumbi.glb'), '--json', '-o', out], { encoding: 'utf8' });
  assert(r.status === 0, `mutante falhou: ${r.stderr}`);
  const rep = JSON.parse(r.stdout);
  assert(rep.changedVertices > 0, 'mutante não soldou nada — invariante não teria o que morder');
  let rejeitouPor = null;
  try { weldAcceptance('zumbi', out, rep); } catch (e) { rejeitouPor = e.message; }
  assert(rejeitouPor != null, 'mutante 3-de-4 passaria pelo MESMO aceite da cláusula APÓS — invariante cega');
  const metAfterOld = eligibleDiscontinuity(readReal(fs.readFileSync(out)), COS_MAX).eligibleSmoothableDiscontinuous;
  const metBeforeOld = realOut['zumbi'].before.eligibleSmoothableDiscontinuous;
  assert(metAfterOld * 2 <= metBeforeOld, `piso antigo "à metade" teria REPROVADO este mutante (${metAfterOld}×2>${metBeforeOld})`);
  return `rejeitado pelo aceite APÓS: "${rejeitouPor.slice(0, 80)}"; piso antigo via (${metAfterOld}×2<=${metBeforeOld})`;
});
for (const [label, value] of [['zero', 0], ['NaN', NaN]]) {
  await clause(`MUTANTE output real ${label}: MESMO aceite rejeita NORMAL degenerada`, async () => {
    const name = 'zumbi';
    const out = path.join(tmp, `zumbi-mut-${label}.glb`);
    const r = await applyTool(path.join(CHARS, `${name}.glb`), out);
    assert(r.code === 0, `geração do output válido falhou: ${r.err}`);
    const after = fs.readFileSync(out);
    for (let i = 0; i < realOut[name].mesh.P.length; i++) {
      const off = realOut[name].mesh.normalByteOffset(i);
      for (let c = 0; c < 3; c++) after.writeFloatLE(value, off + c * 4);
    }
    const d = diffOutsideNormal(realOut[name].buf, after, realOut[name].mesh.P.length, realOut[name].mesh.Nv.stride, 12, realOut[name].mesh.Nv.base - 12);
    assert(d.outside === 0 && d.inside > 0, `mutação ${label} tocou bytes fora de NORMAL ou não mudou bytes`);
    fs.writeFileSync(out, after);
    const report = { ...r.report, changedBytes: d.inside };
    let rejected = null;
    try { weldAcceptance(name, out, report); } catch (e) { rejected = e.message; }
    assert(rejected && /normal inválida/.test(rejected), `mutação ${label} aceita ou falhou por outra causa: ${rejected ?? 'aceita'}`);
    return `rejeitado pela guarda de NORMAL inválida; changedBytes=${d.inside}`;
  });
}

await clause('MUTANTE sobrescreve-output-antes-do-exit2: assert de sentinel morde (bytes lidos)', async () => {
  const m = await mutatedTool('overwrite-exit2',
    '{ console.error(`ERRO: ${flag} exige um valor (não pode ser opção).\\n${USAGE}`); process.exit(2); }',
    '{ try { fs.writeFileSync(process.env.WELD_OVERWRITE_PROBE ?? \'/dev/null\', \'X\'); } catch {} console.error(`ERRO: ${flag} exige um valor (não pode ser opção).\\n${USAGE}`); process.exit(2); }');
  const stale = path.join(tmp, 'stale-mut-overwrite.glb');
  const sentinel = Buffer.from('SENTINEL-MUTANTE');
  fs.writeFileSync(stale, sentinel);
  const r = spawnSync(NODE, [m, fixtures.f1.file, '-o'], { encoding: 'utf8', env: { ...process.env, WELD_OVERWRITE_PROBE: stale } });
  assert(r.status === 2, `mutante não chegou ao exit 2 (status ${r.status})`);
  assert(fs.readFileSync(stale).equals(Buffer.from('X')), 'mutante não sobrescreveu o sentinel — mutação sem efeito');
  let mordeu = false;
  try { sentinelIntact(stale, sentinel); } catch { mordeu = true; }
  assert(mordeu, 'predicado de sentinel aceitaria overwrite — assert de bytes é cego');
  return 'overwrite simulado antes do exit 2 foi pego pelo assert de bytes exato';
});
for (const { name, fn } of queue) {
  try { const detail = await fn(); results.push({ name, pass: true, detail: detail || '' }); console.log(`ok   ${name}${detail ? ` — ${detail}` : ''}`); }
  catch (e) { results.push({ name, pass: false, detail: e.message }); console.log(`FAIL ${name} — ${e.message}`); }
}
const failed = results.filter((r) => !r.pass);
console.log(`\ncharacter-normal-weld-check: ${results.length - failed.length}/${results.length}${failed.length ? ' — FALHOU: ' + failed.map((f) => f.name).join('; ') : ' VERDE'}`);
process.exit(failed.length ? 1 : 0);
