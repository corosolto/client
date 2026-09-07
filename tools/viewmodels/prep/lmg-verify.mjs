#!/usr/bin/env node
/** Réguas da candidata LMG: reimport, durações, estruturas e mutantes que mordem.
 *
 * --selftest plota os mutantes (recarga lenta = contato falso; arma encolhida =
 * leitura perdida; braços removidos) e exige que TODOS fiquem vermelhos antes
 * de aceitar o arquivo real. Sem selftest, valida só a candidata.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const SOURCE = path.resolve(REPO_ROOT, '../vm-astra-pistol');
const NM = path.join(SOURCE, 'node_modules');
const { AnimationMixer, LoopOnce, Vector3 } = await import(`${NM}/three/index.js`);
const { GLTFLoader } = await import(`${NM}/three/addons/loaders/GLTFLoader.js`);

const OUTDIR = path.join(REPO_ROOT, 'artifacts/viewmodels/prep/lmg/lmg-candidate');
const RUNTIME = path.join(OUTDIR, 'lmg-runtime-candidate.glb');
// relógios do jogo: weapons.js (reload 5,0 / rate 0,085) + vmconfig cs16 (draw 1,0 / shoot 0,5)
const EXPECT = {
  reload_tactical: 5.0,
  reload_empty: 5.0,
  equip_rifle: 1.0,
  shoot: 0.5,
  inspect: 3.2,
};
const TOL = 0.02;

async function loadGltf(file) {
  const bytes = await fs.readFile(file);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, '', resolve, reject);
  });
}

async function measure(file) {
  const gltf = await loadGltf(file);
  const byName = new Map(gltf.animations.map((a) => [a.name, a]));
  const result = { clips: {}, muzzle: null, handDistance: null };
  for (const [name, expected] of Object.entries(EXPECT)) {
    const clip = byName.get(name);
    result.clips[name] = clip ? Number(clip.duration.toFixed(4)) : null;
    if (!clip || Math.abs(clip.duration - expected) > TOL) result.fail = `duração ${name}`;
  }
  // arma presente e na escala do envelope: ponto mais distante da origem do rig
  const weapon = gltf.scene.getObjectByName('GEO_LMG_MINT_BODY');
  if (!weapon) { result.fail = 'arma ausente'; return result; }
  const box = new THREE_Box(weapon);
  result.weaponSpan = Number(box.span.toFixed(4));
  if (box.span < 0.9 || box.span > 1.4) result.fail = `envelope arma ${box.span}`;
  const arms = gltf.scene.getObjectByName('GEO_FP_SK_Glove_01');
  if (!arms || !arms.geometry || arms.geometry.attributes.position.count < 100) {
    result.fail = 'braços ausentes';
    return result;
  }
  // contato COM SKIN aplicado (a matemática do renderer: v' = Σ w·J·IB·v):
  // a pega só existe na pose do idle; bind dos braços é T-pose
  const mixer = new AnimationMixer(gltf.scene);
  const idle = byName.get('idle');
  const clip = idle || byName.get('reload_tactical');
  const action = mixer.clipAction(clip);
  action.play();
  mixer.setTime(clip.duration / 2);
  gltf.scene.updateMatrixWorld(true);
  const glovePts = skinnedPoints(gltf, 'GEO_FP_SK_Glove_01', 250);
  const weaponPts = [];
  for (const name of ['GEO_LMG_MINT_BODY', 'GEO_LMG_MINT_COVER', 'GEO_LMG_MINT_BOX']) {
    weaponPts.push(...skinnedPoints(gltf, name, 250));
  }
  let best = Infinity;
  for (const g of glovePts) {
    for (const w of weaponPts) {
      const d = g.distanceTo(w);
      if (d < best) best = d;
    }
  }
  mixer.stopAllAction();
  // contato é diagnosticado aqui, mas o GATE mora no blend autoral
  // (lmg-contact.py): o espaço cru do arquivo não inclui os offsets de montagem
  // que o jogo aplica (VM_WEAPON/FAMILY_FRAME), medir aqui daria falso negativo
  result.handContactRaw = Number(best.toFixed(4));
  // span da luva SKINADA na pose: pega degenerada (mutante no-arms) é visível
  if (glovePts.length < 10) {
    result.fail = 'luva sem pontos';
    return result;
  }
  const gmin = new Vector3(Infinity, Infinity, Infinity);
  const gmax = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of glovePts) { gmin.min(p); gmax.max(p); }
  const gloveSpan = Math.max(gmax.x - gmin.x, gmax.y - gmin.y, gmax.z - gmin.z);
  result.gloveSpan = Number(gloveSpan.toFixed(4));
  if (gloveSpan < 0.25 || gloveSpan > 2.0) result.fail = `luva degenerada ${gloveSpan}`;
  return result;
}

/** Amostra vértices com o skinning NATIVO do three (applyBoneTransform). */
function skinnedPoints(gltf, objectName, maxPoints) {
  const object = gltf.scene.getObjectByName(objectName);
  const points = [];
  object.traverse((child) => {
    if (!child.isSkinnedMesh) return;
    const pos = child.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / maxPoints));
    const v = new Vector3();
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      child.applyBoneTransform(i, v);
      points.push(v.clone().applyMatrix4(child.matrixWorld));
    }
  });
  return points;
}

function spanOf(object) {
  const pts = samplePoints(object, 500);
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of pts) { min.min(p); max.max(p); }
  return Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
}

function samplePoints(object, maxPoints) {
  const points = [];
  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const pos = child.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / maxPoints))) {
        points.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld));
      }
    }
  });
  return points;
}

function THREE_Box(object) {
  const points = [];
  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const pos = child.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 400))) {
        points.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld));
      }
    }
  });
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of points) { min.min(p); max.max(p); }
  return {
    span: max.distanceTo(min) > 0 ? Math.max(max.x - min.x, max.y - min.y, max.z - min.z) : 0,
    distanceTo(p) {
      let best = Infinity;
      for (const q of points) best = Math.min(best, q.distanceTo(p));
      return best;
    },
  };
}

const binChunkOf = (chunks) => chunks.find((c) => c.type === 0x004e4942);

/** Reescala vértices do mesh apontado pelo NÓ de nome dado; devolve vértices tocados. */
function scaleMeshPositions(json, binChunk, nodeName, factor) {
  const node = json.nodes.find((n) => n.name === nodeName);
  if (!node || node.mesh === undefined) return 0;
  const meshIdx = node.mesh;
  let touched = 0;
  for (const prim of json.meshes[meshIdx].primitives) {
    const acc = json.accessors[prim.attributes.POSITION];
    const view = json.bufferViews[acc.bufferView];
    const base = view.byteOffset + (acc.byteOffset || 0);
    for (let i = 0; i < acc.count * 3; i += 1) {
      const at = base + i * 4;
      binChunk.data.writeFloatLE(binChunk.data.readFloatLE(at) * factor, at);
      touched += 1;
    }
  }
  return touched;
}

async function mutate(file, kind) {
  const data = await fs.readFile(file);
  const chunks = [];
  for (let offset = 12; offset < data.length;) {
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    chunks.push({ type, data: data.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  const jsonChunk = chunks.find((c) => c.type === 0x4e4f534a);
  const json = JSON.parse(jsonChunk.data.toString('utf8').replace(/\0+$/g, ''));
  if (kind === 'slow-reload') {
    for (const anim of json.animations) {
      if (anim.name === 'reload_tactical') {
        for (const s of anim.samplers) {
          const acc = json.accessors[s.input];
          const view = json.bufferViews[acc.bufferView];
          // dobra os tempos: recarga "pesada" por lentidão — o falso contato
          for (let i = 0; i < acc.count; i += 1) {
            const binChunk = chunks.find((c) => c.type === 0x004e4942);
            const at = view.byteOffset + (acc.byteOffset || 0) + i * 4;
            const t = binChunk.data.readFloatLE(at);
            binChunk.data.writeFloatLE(t * 2, at);
          }
        }
      }
    }
  } else if (kind === 'tiny-weapon') {
    // mutação na GEOMETRIA (a régua lê posição crua; skin só existe no render)
    const touched = scaleMeshPositions(json, binChunkOf(chunks), 'GEO_LMG_MINT_BODY', 0.3);
    if (!touched) throw new Error('mutante tiny-weapon não aplicou');
  } else if (kind === 'no-arms') {
    const touched = scaleMeshPositions(json, binChunkOf(chunks), 'GEO_FP_SK_Glove_01', 0.01);
    if (!touched) throw new Error('mutante no-arms não aplicou');
  } else throw new Error(`mutante desconhecido: ${kind}`);
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const padded = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 0x20);
  jsonBytes.copy(padded);
  jsonChunk.data = padded;
  const total = 12 + chunks.reduce((s, c) => s + 8 + c.data.length, 0);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  let offset = 12;
  for (const c of chunks) {
    out.writeUInt32LE(c.data.length, offset); out.writeUInt32LE(c.type, offset + 4);
    c.data.copy(out, offset + 8);
    offset += 8 + c.data.length;
  }
  const tmp = path.join(OUTDIR, `mutant-${kind}.glb`);
  await fs.writeFile(tmp, out);
  return tmp;
}

async function main() {
  const selftest = process.argv.includes('--selftest');
  const report = { target: RUNTIME };
  if (selftest) {
    report.mutants = [];
    for (const kind of ['slow-reload', 'tiny-weapon', 'no-arms']) {
      const tmp = await mutate(RUNTIME, kind);
      const m = await measure(tmp);
      report.mutants.push({ kind, failed: Boolean(m.fail), reason: m.fail || null });
      if (!m.fail) {
        console.error(`MUTANTE NÃO MORDEU: ${kind}`);
        process.exitCode = 1;
      }
    }
  }
  report.target_result = await measure(RUNTIME);
  await fs.writeFile(path.join(OUTDIR, 'verify-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`LMG_VERIFY=${JSON.stringify(report)}`);
  if (report.target_result.fail) {
    console.error(`CANDIDATA REPROVADA: ${report.target_result.fail}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
