#!/usr/bin/env node
// Mede os grupos e o fingerprint NORMAL completo do output revisado.
// Contrato e procedência: docs/visual-consistency/NORMAIS-PERSONAGENS.md
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const DEFAULT_DIR = path.join(ROOT, 'public/models/characters');
const REF = path.join(ROOT, 'tools/eval/refs/character-normal-smooth-groups.json');
const names = ['zumbi', 'caipora', 'lampiao', 'esquerdomacho'];
const USAGE = `uso:
  gate: node tools/eval/character-normal-quality-check.mjs [--models-dir DIR]
  ref:  node tools/eval/character-normal-quality-check.mjs --from-dir ORIGINAIS --approved-dir OUTPUTS --write-ref`;
const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  if (i < 0) return null;
  const v = args[i + 1];
  if (v == null || v.startsWith('-')) { console.error(`ERRO: ${flag} exige um valor (não pode ser opção).\n${USAGE}`); process.exit(2); }
  args.splice(i, 2);
  return v;
};
const modelsDir = path.resolve(value('--models-dir') ?? DEFAULT_DIR);
const fromDirRaw = value('--from-dir'), approvedDirRaw = value('--approved-dir');
const fromDir = fromDirRaw ? path.resolve(fromDirRaw) : null;
const approvedDir = approvedDirRaw ? path.resolve(approvedDirRaw) : null;
const writeRef = args.includes('--write-ref');
if (args.includes('--write-ref')) args.splice(args.indexOf('--write-ref'), 1);
if (args.length) { console.error(`ERRO: opção desconhecida ou sem valor: ${args[0]}\n${USAGE}`); process.exit(2); }

const fail = (m) => { throw new Error(m); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const f32 = (x) => new DataView(new Float32Array([x]).buffer).getUint32(0, true);
const COMPSIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

function readJoint(buf, off, type) {
  if (type === 5121) return buf.readUInt8(off);
  if (type === 5123) return buf.readUInt16LE(off);
  if (type === 5125) return buf.readUInt32LE(off);
  fail(`JOINTS_0 componentType ${type} não suportado (5121/5123/5125)`);
}

function parse(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) fail('não é GLB');
  const jl = buf.readUInt32LE(12), json = JSON.parse(buf.subarray(20, 20 + jl));
  const binBase = 20 + jl + 8, prim = json.meshes?.[0]?.primitives?.[0];
  if (!prim || json.meshes.length !== 1 || json.meshes[0].primitives.length !== 1) fail('layout GLB inesperado');
  const acc = json.accessors, bv = json.bufferViews;
  const attr = (name) => { const a = acc[prim.attributes[name]], v = bv[a.bufferView]; return { a, v, base: binBase + (v.byteOffset ?? 0) + (a.byteOffset ?? 0) }; };
  const p = attr('POSITION'), n = attr('NORMAL');
  const stride = n.v.byteStride ?? 12, P = [], N = [], ranges = [];
  for (let i = 0; i < p.a.count; i++) { const po = p.base + i * (p.v.byteStride ?? 12), no = n.base + i * stride; P.push([buf.readFloatLE(po), buf.readFloatLE(po + 4), buf.readFloatLE(po + 8)]); N.push([buf.readFloatLE(no), buf.readFloatLE(no + 4), buf.readFloatLE(no + 8)]); ranges.push([no, no + 12]); }

  // Skin por vértice lida UMA vez com stride/tamanho tipados (tightly packed U8/U16/U32).
  let skinKeys = null;
  if (prim.attributes.JOINTS_0 != null) {
    const j = attr('JOINTS_0'), w = attr('WEIGHTS_0');
    if (COMPSIZE[j.a.componentType] == null) fail(`JOINTS_0 componentType ${j.a.componentType} desconhecido`);
    if (w.a.componentType !== 5126) fail(`WEIGHTS_0 componentType ${w.a.componentType}: só FLOAT (5126) dá chave de skin canônica`);
    const jStride = j.v.byteStride ?? 4 * COMPSIZE[j.a.componentType];
    const wStride = w.v.byteStride ?? 16;
    skinKeys = P.map((_, i) => {
      const parts = [];
      for (let c = 0; c < 4; c++) {
        const weight = buf.readFloatLE(w.base + i * wStride + c * 4);
        if (weight > 0) parts.push([readJoint(buf, j.base + i * jStride + c * COMPSIZE[j.a.componentType], j.a.componentType), f32(weight)]);
      }
      parts.sort((a, b) => a[0] - b[0]);
      return parts.map(([joint, weight]) => `${joint}:${weight}`).join(',');
    });
  }
  const groups = new Map();
  for (let i = 0; i < P.length; i++) {
    const k = `${f32(P[i][0])}:${f32(P[i][1])}:${f32(P[i][2])}|${skinKeys ? skinKeys[i] : ''}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  }
  const protectedBytes = Buffer.from(buf);
  for (const [a, b] of ranges) protectedBytes.fill(0, a, b);
  const nb = Buffer.alloc(P.length * 12);
  for (let i = 0; i < P.length; i++) buf.copy(nb, i * 12, ranges[i][0], ranges[i][1]);
  return { buf, P, N, ranges, groups, protectedSha: sha(protectedBytes), normalSha: sha(nb), sha: sha(buf), stride, count: P.length };
}

function unit(n) { const l = Math.hypot(...n); if (!n.every(Number.isFinite) || !Number.isFinite(l) || l <= 0) return null; return n.map((x) => x / l); }

function groupsFromModel(m) {
  const groups = [];
  for (const list of m.groups.values()) {
    if (list.length < 2) continue;
    const us = list.map((i) => unit(m.N[i]));
    if (us.some((u) => !u)) continue;
    let min = 1;
    for (let a = 0; a < us.length; a++) for (let b = a + 1; b < us.length; b++) min = Math.min(min, us[a][0] * us[b][0] + us[a][1] * us[b][1] + us[a][2] * us[b][2]);
    if (min >= Math.cos(Math.PI / 3)) groups.push(list);
  }
  return groups;
}

// Referência v2: grupos e proveniência vêm dos ORIGINAIS; normalSha congela o NORMAL
// completo do OUTPUT aprovado (revisado), não do produto corrente sem revisão.
function makeReference(origDir, apprDir) {
  const out = {};
  for (const name of names) {
    const orig = parse(fs.readFileSync(path.join(origDir, `${name}.glb`)));
    const appr = parse(fs.readFileSync(path.join(apprDir, `${name}.glb`)));
    if (appr.protectedSha !== orig.protectedSha) fail(`${name}: output aprovado diverge fora de NORMAL (protectedSha) — fonte inesperada`);
    if (appr.count !== orig.count) fail(`${name}: output aprovado tem ${appr.count} vértices, original ${orig.count}`);
    if (appr.sha === orig.sha) fail(`${name}: output aprovado é byte-idêntico ao original — solda não aplicada?`);
    out[name] = { sha: orig.sha, protectedSha: orig.protectedSha, count: orig.count, groups: groupsFromModel(orig), normalSha: appr.normalSha };
  }
  return { version: 2, angle: 60, models: out };
}

// Controle permanente do leitor de JOINTS: tightly packed U8/U16/U32 tem que agrupar
// por skin corretamente (mesmo caminho dos arquivos reais, sempre que o gate roda).
function buildMiniGLB(jointsType) {
  const verts = [
    { p: [0, 0, 0], n: [0, 1, 0], j: [1, 0, 0, 0], w: [1, 0, 0, 0] },
    { p: [0, 0, 0], n: [0, 1, 0], j: [1, 0, 0, 0], w: [1, 0, 0, 0] },
    { p: [0, 0, 0], n: [0, 1, 0], j: [2, 0, 0, 0], w: [1, 0, 0, 0] },
  ];
  const views = [], accessors = {}, binParts = [];
  let offset = 0;
  const addView = (key, pack, itemSize, type, comp) => {
    const data = Buffer.concat(verts.map((v) => pack(v)));
    binParts.push(data);
    views.push({ buffer: 0, byteOffset: offset, byteLength: data.length });
    offset += data.length + ((4 - (data.length % 4)) % 4);
    accessors[key] = { bufferView: views.length - 1, componentType: type, count: verts.length, type: itemSize };
  };
  const f32buf = (arr) => Buffer.from(Buffer.concat(arr.map((x) => Buffer.from(new Float32Array(x).buffer))));
  addView('POSITION', (v) => f32buf([v.p]), 'VEC3', 5126);
  addView('NORMAL', (v) => f32buf([v.n]), 'VEC3', 5126);
  addView('JOINTS_0', (v) => {
    const cs = COMPSIZE[jointsType];
    const b = Buffer.alloc(4 * cs);
    for (let c = 0; c < 4; c++) { if (cs === 1) b.writeUInt8(v.j[c], c); else if (cs === 2) b.writeUInt16LE(v.j[c], c * 2); else b.writeUInt32LE(v.j[c], c * 4); }
    return b;
  }, 'VEC4', jointsType);
  addView('WEIGHTS_0', (v) => f32buf([v.w]), 'VEC4', 5126);
  const bin = Buffer.concat(binParts);
  const json = { asset: { version: '2.0' }, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, JOINTS_0: 2, WEIGHTS_0: 3 } }] }], accessors: [accessors.POSITION, accessors.NORMAL, accessors.JOINTS_0, accessors.WEIGHTS_0], bufferViews: views, buffers: [{ byteLength: bin.length }] };
  const jb = Buffer.from(JSON.stringify(json));
  const pad = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, 0x20)]);
  const jp = pad(jb), bp = pad(bin);
  const total = 12 + 8 + jp.length + 8 + bp.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jp.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jp.copy(out, 20);
  const bo = 20 + jp.length;
  out.writeUInt32LE(bp.length, bo); out.writeUInt32LE(0x004e4942, bo + 4); bp.copy(out, bo + 8);
  return out;
}

function selfTestJoints() {
  for (const type of [5121, 5123, 5125]) {
    const m = parse(buildMiniGLB(type));
    const sizes = [...m.groups.values()].map((l) => l.length).sort((a, b) => a - b).join(',');
    if (sizes !== '1,2') fail(`selfTest JOINTS ${type}: grupos ${sizes} (esperado 1,2) — leitura de skin errada`);
  }
  console.log('selfTest JOINTS tightly packed U8/U16/U32: agrupamento por skin correto');
}

selfTestJoints();

if (writeRef || fromDir || approvedDir) {
  if (!writeRef || !fromDir || !approvedDir) { console.error(`ERRO: geração de referência exige --from-dir ORIGINAIS --approved-dir OUTPUTS --write-ref juntos.\n${USAGE}`); process.exit(2); }
  fs.mkdirSync(path.dirname(REF), { recursive: true });
  fs.writeFileSync(REF, JSON.stringify(makeReference(fromDir, approvedDir), null, 2) + '\n');
  console.log(`referência v2 gravada: ${REF} (grupos dos originais + normalSha do output aprovado)`);
  process.exit(0);
}

const ref = JSON.parse(fs.readFileSync(REF, 'utf8'));
if (ref.version !== 2) fail(`referência versão ${ref.version} não suportada — gere com --from-dir + --approved-dir + --write-ref`);
for (const name of names) {
  const expected = ref.models[name];
  const m = parse(fs.readFileSync(path.join(modelsDir, `${name}.glb`)));
  if (!expected) fail(`${name}: referência ausente`);
  if (m.protectedSha !== expected.protectedSha) fail(`${name}: fingerprint protegido divergiu (geometria/UV/skin/anim/material/imagens alterados)`);
  if (m.count !== expected.count) fail(`${name}: quantidade de vértices divergiu`);
  if (m.normalSha !== expected.normalSha) fail(`${name}: fingerprint NORMAL completo divergiu (direção/conteúdo de TODAS as normais — flip conjunto, zero/NaN ou edição fora dos grupos)`);
  for (const group of expected.groups) {
    const ns = group.map((i) => unit(m.N[i]));
    if (ns.some((n) => !n)) fail(`${name}: grupo NORMAL inválida, índice ${group[ns.findIndex((n) => !n)]}`);
    for (let a = 0; a < ns.length; a++) for (let b = a + 1; b < ns.length; b++) {
      const d = Math.min(1, Math.max(-1, ns[a][0] * ns[b][0] + ns[a][1] * ns[b][1] + ns[a][2] * ns[b][2]));
      if (Math.acos(d) > Math.PI / 180) fail(`${name}: grupo ${group.join(',')} diverge >1°`);
    }
  }
  console.log(`ok ${name}: ${expected.groups.length} grupos, protectedSha ${m.protectedSha.slice(0, 12)}, normalSha ${m.normalSha.slice(0, 12)}`);
}
console.log(`character-normal-quality-check: ${names.length}/${names.length} VERDE`);
