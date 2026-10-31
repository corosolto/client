#!/usr/bin/env node
// Pegada calibrada após a pose funcional; GLBs/rigs/clipes reais, sem medir pixels.
// Contratos, limites e contraprovas: docs/visual-consistency/PREVIEW-GRIP-PHASE.md.
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { amplitude } from './gate-accept.mjs';

const argv = process.argv.slice(2);
const MUT = (argv.find((a) => a.startsWith('--mutante=')) || '').slice(10);
const ESPERADO = {
  'sem-settle': { 'canarinho/deagle': ['FASE'] },
  'fase-inclinada': { 'canarinho/deagle': ['FASE'] },
  'arma-solta': { 'canarinho/deagle': ['LA2', 'LA3'] },
  'arma-oscilante': { 'mst/ak': ['DERIVA-M'] },
};
const uso = (m) => { console.error(`uso: node tools/eval/preview-grip-phase-check.mjs [--mutante=${Object.keys(ESPERADO).join('|')}] [--json] — ${m}`); process.exit(2); };
if (argv.filter((a) => a.startsWith('--mutante=')).length > 1) uso('--mutante= duplicado');
if (argv.some((a) => a.startsWith('--mutante=') && !a.slice(10)) || (MUT && !Object.hasOwn(ESPERADO, MUT))) uso('mutante vazio/desconhecido');
if (argv.some((a) => a !== '--json' && !a.startsWith('--mutante='))) uso('opção desconhecida');
if (argv.filter((a) => a === '--json').length > 1) uso('--json duplicado');
const JSON_OUT = argv.includes('--json');

const CASOS = [
  ['mst', 'ak'], ['coach', 'scar'], ['doutora', 'm4'], ['esquerdomacho', 'pistol'],
  ['sertanejo', 'revolver38'], ['gotinha', 'mp5'], ['dollynho', 'p90'], ['canarinho', 'deagle'],
];
const infra = (m) => { console.error(`infra: ${m}`); process.exit(3); };
if (MUT) {
  const nominal = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--json'],
    { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  if (nominal.error || nominal.signal || ![0, 1].includes(nominal.status)) infra('nominal não medido: ' + (nominal.error?.message || nominal.stderr.slice(-500)));
  let data;
  try { data = JSON.parse(nominal.stdout); } catch { infra('nominal sem JSON íntegro'); }
  const ids = CASOS.map(([c, w]) => `${c}/${w}`).sort();
  if (data?.mutante !== null || !Array.isArray(data?.casos) || data.casos.length !== ids.length
    || data.casos.some((r) => !r || !Array.isArray(r.falhas) || !r.falhas.every((x) => typeof x === 'string'))
    || JSON.stringify(data.casos.map((r) => r.caso).sort()) !== JSON.stringify(ids)) infra('nominal com inventário inválido');
  const red = data.casos.some((r) => r.falhas.length);
  if (nominal.status !== (red ? 1 : 0)) infra('nominal com status contraditório');
  if (red) { console.error('RED: nominal não verde, mutação não aplicada'); process.exit(1); }
}

const WT = fs.existsSync(path.resolve('public/js/glbchars.js')) ? path.resolve('.')
  : path.resolve('..', '..');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');


/* ── fonte real + mutante físico por patch de string (nada de mock de função) ── */
let src = fs.readFileSync(path.join(WT, 'public/js/glbchars.js'), 'utf8');
const srcHash = sha(Buffer.from(src));
if (MUT === 'sem-settle') {
  const alvo = "if (def.id === 'canarinho') for (let i = 0; i < 10; i++) ctrl.update(1 / 30, 0, false, 0);";
  if (src.split(alvo).length !== 2) infra('mutante sem-settle: settle do preview não encontrado exatamente uma vez');
  src = src.replace(alvo, '');
}
if (MUT === 'fase-inclinada') {
  const target = 'ctrl.tpMount.pegada = pegada;';
  if (src.split(target).length !== 2) infra('mutação fase não aplica exatamente uma vez');
  src = src.replace(target, "if (ctrl.bodyId === 'canarinho' && opts.weaponId === 'deagle') pegada.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 18));\n" + target);
} else if (MUT === 'arma-solta') {
  /* Contraprova física de contato: desloca a arma REAL 0,12 m no gunObj (construção),
     só Canarinho/Deagle/preview. A palma skinnada não segue: LA2/LA3 têm que reprovar. */
  const target = 'gun.position.set(0, 0, 0);   // o grip já é a origem do weaponModel; quem posiciona é o mount';
  if (src.split(target).length !== 2) infra('mutação arma-solta não aplica exatamente uma vez');
  src = src.replace(target, target + "\n      if (opts.preview && def.id === 'canarinho' && opts.weaponId === 'deagle') gun.position.x += 0.12;");
}
const rewriteFrom = (dir) => (s) => s.replace(/from '([^']+)'/g, (all, p) =>
  p === 'three' ? `from '${pathToFileURL(path.join(WT, 'public/vendor/three.module.js'))}'`
    : p.startsWith('three/') ? `from '${pathToFileURL(path.join(WT, 'public/vendor/' + p.slice(6)))}'`
      : p.startsWith('.') ? `from '${depURL(p, dir)}'` : all);
/* Dependências locais importam 'three' bare: copia cada uma p/ tmp re-escrita (como o probe). */
const workDir = fs.mkdtempSync(path.join(tmpdir(), 'preview-grip-phase-'));
const depDir = path.join(workDir, 'deps');
fs.mkdirSync(depDir);
process.on('exit', () => fs.rmSync(workDir, { recursive: true, force: true }));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(3));
const depCache = new Map();
function depURL(rel, fromDir) {
  const abs = path.resolve(fromDir, rel);
  if (!abs.startsWith(path.join(WT, 'public/'))) infra(`dependência fora de public/: ${rel}`);
  const key = path.relative(path.join(WT, 'public'), abs);
  if (!depCache.has(key)) {
    let depSrc;
    try { depSrc = fs.readFileSync(abs, 'utf8'); } catch (e) { infra(`dependência ${rel}: ${e.message}`); }
    const dst = path.join(depDir, key.replace(/[/.]/g, '_') + '.mjs');
    fs.writeFileSync(dst, rewriteFrom(path.dirname(abs))(depSrc));
    depCache.set(key, pathToFileURL(dst).href);
  }
  return depCache.get(key);
}
const rewrite = rewriteFrom(path.dirname(path.join(WT, 'public/js/glbchars.js')));
const modPath = path.join(workDir, 'model.mjs');
fs.writeFileSync(modPath, rewrite(src)
  + '\nexport function __seed(id, scene, clips){_base.set(id,scene);_clips=clips;_clipsByChar[id]=clips;}\n'
  + `export { setWeaponModel } from '${depURL('./weapons.js', path.dirname(path.join(WT, 'public/js/glbchars.js')))}';\n`);

/* ── GLBs reais, sem imagens/texturas (parsing Node; nada de material medido) ── */
function stripped(bytes) {
  let j, b;
  for (let p = 12; p < bytes.length;) {
    const n = bytes.readUInt32LE(p), t = bytes.readUInt32LE(p + 4);
    if (t === 0x4e4f534a) j = JSON.parse(bytes.subarray(p + 8, p + 8 + n));
    if (t === 0x004e4942) b = bytes.subarray(p + 8, p + 8 + n);
    p += 8 + n;
  }
  delete j.images; delete j.textures; delete j.samplers;
  j.materials = j.materials?.map((m) => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }));
  const pad = (x, f = 0) => Buffer.concat([x, Buffer.alloc((4 - x.length % 4) % 4, f)]);
  const jb = pad(Buffer.from(JSON.stringify(j)), 32), bb = pad(b || Buffer.alloc(0));
  const out = Buffer.alloc(28 + jb.length + bb.length);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jb.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jb.copy(out, 20);
  out.writeUInt32LE(bb.length, 20 + jb.length); out.writeUInt32LE(0x004e4942, 24 + jb.length); bb.copy(out, 28 + jb.length);
  return out;
}
let THREE, CHARACTERS, GLTFLoader, W, G;
try {
  ({ THREE, CHARACTERS } = await import(pathToFileURL(path.join(WT, 'tools/eval/harness.mjs'))));
  ({ GLTFLoader } = await import(pathToFileURL(path.join(WT, 'public/vendor/addons/loaders/GLTFLoader.js'))));
  W = await import(pathToFileURL(path.join(WT, 'public/js/weapons.js')));
  G = await import(pathToFileURL(modPath));
} catch (e) { infra(`módulo real não subiu: ${e.message}`); }
const load = async (p) => {
  try {
    const buf = stripped(fs.readFileSync(path.join(WT, 'public', p)));
    return await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  } catch (e) { infra(`GLB ${p}: ${e.message}`); }
};

// Oito casos sem skin; os três com preload seguem no gate browser herdado.
// Lista, limites e divisão de aceite em PREVIEW-GRIP-PHASE.md.

/* Tetos LA1..LA5 do lobby-arma-mao-check.mjs (fonte única de lá); FASE é a invariante
   nova deste gate: pegada capturada = referência funcional assentada (medido 0,33°). */
const TETO_PEGADA = { canarinho: 20 };
const TETO = { pegadaGraus: 10, faseGraus: 2, palmaM: 0.10, caixaM: 0.02, canoZmin: 0.594, derivaGraus: 2, derivaM: 0.01 };

const find = (m) => {
  let gun = null, hand = null;
  m.group.traverse((o) => {
    if (!gun && /^arma-(glb|caixa)$/.test(o.name)) gun = o;
    if (!hand && o.isBone && /right.?hand|hand.?r\b|rhand|r_hand/i.test(o.name)) hand = o;
  });
  return { gun, hand };
};
const gripQ = (gun, hand) => hand.getWorldQuaternion(new THREE.Quaternion()).invert()
  .multiply(gun.getWorldQuaternion(new THREE.Quaternion()));
const deg = (a, b) => a.angleTo(b) * 180 / Math.PI;
/* palma média (vértices com peso ≥0,9 na mão direita) — igual ao gate do lobby */
const palmaMedia = (m, hand) => {
  const palma = new THREE.Vector3(), v = new THREE.Vector3(); let n = 0;
  m.group.traverse((o) => {
    if (!o.isSkinnedMesh || o.name === 'luvas-3p') return;
    const hi = o.skeleton.bones.indexOf(hand); if (hi < 0) return;
    const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++)
      if (si[['getX', 'getY', 'getZ', 'getW'][k]](i) === hi && sw[['getX', 'getY', 'getZ', 'getW'][k]](i) >= 0.9) {
        o.getVertexPosition(i, v); palma.add(v.applyMatrix4(o.matrixWorld)); n++;
      }
  });
  return n ? palma.divideScalar(n) : null;
};
const caixaLocal = (gun, ponto) => {
  gun.updateWorldMatrix(true, true);
  const inv = gun.matrixWorld.clone().invert();
  const bb = new THREE.Box3(), tmp = new THREE.Box3();
  gun.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    tmp.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    bb.union(tmp);
  });
  const p = ponto.clone().applyMatrix4(inv);
  const s = new THREE.Vector3(); gun.getWorldScale(s);
  return bb.distanceToPoint(p) * s.x;
};

const out = [];
for (const [cid, wid] of CASOS) {
  const def = CHARACTERS.find((c) => c.id === cid);
  if (!def) infra(`personagem ${cid} sem definição`);
  try {
    const body = await load(`models/characters/${cid}.glb`);
    const gunGlb = await load(`models/weapons/${wid}.glb`);
    const clips = {};
    for (const s of ['mixamo', cid]) {
      try { const a = await load(`models/anims/${s}.glb`); for (const c of a.animations) clips[c.name] = c; } catch { /* shared cobre */ }
    }
    G.setWeaponModel(wid, gunGlb.scene);
    G.__seed(cid, body.scene, clips);

    /* referência: porte de JOGO assentado — igual ao lobby-arma-mao-check */
    const ref = G.buildCharacterModel(def, { weaponId: wid });
    for (let i = 0; i < 60; i++) ref.ctrl.update(1 / 60, 0, false, 0);
    ref.group.updateMatrixWorld(true);
    const rr = find(ref);
    if (!rr.gun || !rr.hand) infra(`${cid}/${wid}: sem arma ou sem mão na referência`);
    const qRef = gripQ(rr.gun, rr.hand);
    const palmaRef = palmaMedia(ref, rr.hand);
    const caixaJogo = palmaRef ? caixaLocal(rr.gun, palmaRef) : null;

    /* preview: como o pvSetChar monta e o loop do menu anima (giro 0,9 rad/s) */
    const m = G.buildCharacterModel(def, { weaponId: wid, preview: true });
    m.group.rotation.y = -0.4;
    const { gun, hand } = find(m);
    if (!gun || !hand) infra(`${cid}/${wid}: sem arma ou sem mão no preview`);
    const faseBuild = m.ctrl.tpMount?.pegada ? deg(m.ctrl.tpMount.pegada, qRef) : Infinity;   // invariante FASE
    /* arma-oscilante: reproduz o ensaio externo PREVIEW-DRIFT-COORD-FEASIBILITY-R1-z —
       gunObj REAL em Z (só MST/AK), relógio simulado 1/60, 1ª amostra em zero, período 2 s. */
    const osc = MUT === 'arma-oscilante';
    const oscBase = osc ? gun.position.clone() : null;
    let oscTempo = 0;
    const amostras = [];
    for (let s = 0; s < 8; s++) {
      for (let i = 0; i < 30; i++) {
        m.ctrl.update(1 / 60, 0, false, 0);
        if (osc) {
          oscTempo += 1 / 60;
          if (cid === 'mst' && wid === 'ak') gun.position.z = oscBase.z + .008 * Math.sin(Math.PI * (oscTempo - .5));
        }
        m.group.rotation.y += 0.9 / 60;
      }
      m.group.updateMatrixWorld(true);
      const palma = palmaMedia(m, hand);
      const model = m.ctrl.tpMount?.model || m.group;
      const qM = model.getWorldQuaternion(new THREE.Quaternion()).invert();
      const cano = new THREE.Vector3(0, 0, 1).applyQuaternion(gun.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(qM);
      const palmaModelo = palma ? model.worldToLocal(palma.clone()) : null;
      // Extensão é diagnóstico, sem limite antropométrico; PREVIEW-GRIP-PHASE.md.
      const escalaM = model.getWorldScale(new THREE.Vector3()).toArray();
      const origem = model.getWorldPosition(new THREE.Vector3());
      const frente = new THREE.Vector3(0, 0, 1).transformDirection(model.matrixWorld);
      amostras.push({
        pegada: deg(gripQ(gun, hand), qRef),
        palma: palma ? palma.distanceTo(gun.getWorldPosition(new THREE.Vector3())) : Infinity,
        caixa: palma ? caixaLocal(gun, palma) : Infinity,
        canoZ: cano.z,
        frenteZLocal: palmaModelo ? palmaModelo.z : NaN,
        frenteZMundoM: palma ? palma.clone().sub(origem).dot(frente) : NaN,
        escalaModeloM: escalaM,
      });
    }
    if (osc && cid === 'mst' && wid === 'ak' && gun.position.z === oscBase.z) infra('mutante arma-oscilante: gunObj não moveu em Z');
    out.push({ caso: `${cid}/${wid}`, arma: gun.name, faseBuild, caixaJogo, amostras });
  } catch (e) { infra(`${cid}/${wid}: ${e.message}`); }
}

/* ── veredito ── */
const linhas = []; let erros = 0; const vermelhas = new Set();
for (const r of out) {
  const [cid] = r.caso.split('/');
  const a = r.amostras, max = (k) => Math.max(...a.map((x) => x[k]));
  const min = (k) => Math.min(...a.map((x) => x[k]));
  const f = [];
  if (r.caso === 'canarinho/deagle' && r.faseBuild > TETO.faseGraus) f.push('FASE');
  if (!Number.isFinite(r.faseBuild)) f.push('INVALIDA');
  if (r.arma !== 'arma-glb') f.push('ARMA-CAIXA');
  const tetoPeg = TETO_PEGADA[cid] ?? TETO.pegadaGraus;
  if (max('pegada') > tetoPeg) f.push('LA1');
  if (max('caixa') > Math.max(TETO.caixaM, (Number.isFinite(r.caixaJogo) ? r.caixaJogo : 0) + 0.005)) f.push('LA3');
  if (max('palma') > TETO.palmaM) f.push('LA2');
  if (min('canoZ') < TETO.canoZmin) f.push('LA4');
  /* DERIVA-*: amplitude max−min compartilhada com o LA5 do browser (gate-accept);
     o max|−1ª amostra| anterior era cego a vaivém periódico que cruza o zero na 1ª amostra. */
  const derivaG = amplitude(a, 'pegada');
  const derivaM = amplitude(a, 'palma');
  if (derivaG > TETO.derivaGraus) f.push('DERIVA-GRAUS');
  if (derivaM > TETO.derivaM) f.push('DERIVA-M');
  if (!a.every((x) => [x.pegada, x.palma, x.caixa, x.canoZ, x.frenteZLocal, x.frenteZMundoM].every(Number.isFinite))) f.push('INVALIDA');
  f.forEach((x) => vermelhas.add(x));
  r.falhas = f;
  if (f.length) erros++;
  linhas.push(`${f.length ? '✗' : ' '} ${r.caso.padEnd(22)} fase ${r.faseBuild.toFixed(2)}°  pegada ${max('pegada').toFixed(2)}°  palma ${max('palma').toFixed(3)}  caixa ${max('caixa').toFixed(3)}  canoZ ${min('canoZ').toFixed(3)}  deriva ${derivaG.toFixed(2)}°/${derivaM.toFixed(3)}m  ${f.join(',') || 'ok'}`);
}
if (JSON_OUT) console.log(JSON.stringify({ mutante: MUT || null, teto: TETO, casos: out }, null, 1));
if (!JSON_OUT) {
console.log(`\n=== PEGADA DO PREVIEW NA FASE CERTA ${MUT ? `(mutante=${MUT})` : ''} ===`);
console.log('teto:', JSON.stringify(TETO), 'tetoPegada:', JSON.stringify(TETO_PEGADA));
for (const l of linhas) console.log(l);
console.log(`REPROVADOS: ${erros}/${out.length}`);
}

if (MUT) {
  const obtained = Object.fromEntries(out.filter((r) => r.falhas.length).map((r) => [r.caso, [...new Set(r.falhas)].sort()]));
  const expected = Object.fromEntries(Object.entries(ESPERADO[MUT]).map(([k, v]) => [k, [...v].sort()]));
  if (JSON.stringify(obtained) !== JSON.stringify(expected)) {
    console.error(`RED: mutante ${MUT}, cláusulas ${JSON.stringify(obtained)}, esperadas ${JSON.stringify(expected)}`);
    process.exitCode = 1;
  } else {
    if (!JSON_OUT) console.log(`mutante ${MUT}: conjunto exato confirmado`);
    process.exitCode = 0;
  }
} else process.exitCode = erros ? 1 : 0;
