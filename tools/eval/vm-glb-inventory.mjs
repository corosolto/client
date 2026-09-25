#!/usr/bin/env node
/* ============================================================================
   vm-glb-inventory.mjs — INVENTÁRIO ESTRUTURAL de um GLB de viewmodel.

   Por que existe: a evidência visual da pistola mostrava "uma peça retangular
   escura" e "mão de apoio escondida" sem que ninguém soubesse QUAL nó, skin,
   joint ou material era. Esconder sem nomear é cosmético; este script nomeia.

   O que produz (JSON + resumo):
     · árvore de nós (nome, pai, TRS local, mesh/skin/camera);
     · skins (joints, raiz) e ossos semânticos (mãos, ik, arma, pente);
     · materiais (fatores, texturas e tamanho de imagem);
     · animações (nome, duração, canais, alvos);
     · câmera exportada (posição/forward/up em world);
     · por primitiva: material, vértices, AABB em WORLD com o skinning
       avaliado numa pose (--pose=clip:fração, repetível), centro e joints
       dominantes (por soma de peso) — é o que liga pixel a osso.

   Uso: node tools/eval/vm-glb-inventory.mjs [arquivo.glb]
          [--pose=idle:0] [--pose=shoot:0.04] [--saida=...json]
   ============================================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Matrix4, Quaternion, Vector3 } from 'three';

const arg = (name) => process.argv.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3));
const file = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('--'))
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels/pistol/pistol-runtime.glb');
const poses = (arg('pose').length ? arg('pose') : ['rest']).map((p) => {
  const [clip, frac] = p.split(':');
  return { clip, frac: Number(frac ?? 0) };
});
const saida = arg('saida')[0] || '';
const SEMANTIC = /^(hand_[lr]|ik_hand_(gun|[lr]|root)|lowerarm_[lr]|upperarm_[lr]|clavicle_[lr]|Mag|Slide|Trigger|Hammer|SOCKET_.*|RIG_.*|root|weapon.*|Weapon.*|GEO_.*)$/i;

const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file);
const root = document.getRoot();
const nodes = root.listNodes();
const parentOf = new Map();
for (const node of nodes) for (const child of node.listChildren()) parentOf.set(child, node);
const nameOf = (n) => n?.getName() || '(sem nome)';

// --- animação: amostra linear (slerp em rotação) num tempo t --------------
function sampleChannel(channel, t) {
  const sampler = channel.getSampler();
  const times = sampler.getInput().getArray();
  const values = sampler.getOutput().getArray();
  const size = channel.getTargetPath() === 'rotation' ? 4 : 3;
  if (times.length === 1) return Array.from(values.slice(0, size));
  let i = 0;
  while (i < times.length - 2 && times[i + 1] < t) i += 1;
  const t0 = times[i]; const t1 = times[i + 1];
  const a = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  const v0 = Array.from(values.slice(i * size, i * size + size));
  const v1 = Array.from(values.slice((i + 1) * size, (i + 1) * size + size));
  if (size === 4) {
    const q = new Quaternion().fromArray(v0).slerp(new Quaternion().fromArray(v1), a);
    return q.toArray();
  }
  return v0.map((v, k) => v + (v1[k] - v) * a);
}

function clipDuration(animation) {
  let d = 0;
  for (const ch of animation.listChannels()) {
    const times = ch.getSampler().getInput().getArray();
    d = Math.max(d, times[times.length - 1]);
  }
  return d;
}

function poseOverrides(pose) {
  const over = new Map();
  if (pose.clip === 'rest') return { over, duration: 0, t: 0 };
  const animation = root.listAnimations().find((a) => a.getName() === pose.clip);
  if (!animation) throw new Error(`clip ${pose.clip} não existe; há: ${root.listAnimations().map((a) => a.getName()).join(', ')}`);
  const duration = clipDuration(animation);
  const t = duration * pose.frac;
  for (const ch of animation.listChannels()) {
    const node = ch.getTargetNode();
    if (!node) continue;
    if (!over.has(node)) over.set(node, {});
    over.get(node)[ch.getTargetPath()] = sampleChannel(ch, t);
  }
  return { over, duration, t };
}

function worldMatrices(over) {
  const cache = new Map();
  const local = (node) => {
    const o = over.get(node) || {};
    return new Matrix4().compose(
      new Vector3().fromArray(o.translation || node.getTranslation()),
      new Quaternion().fromArray(o.rotation || node.getRotation()),
      new Vector3().fromArray(o.scale || node.getScale()),
    );
  };
  const world = (node) => {
    if (cache.has(node)) return cache.get(node);
    const parent = parentOf.get(node);
    const m = parent ? world(parent).clone().multiply(local(node)) : local(node);
    cache.set(node, m);
    return m;
  };
  for (const node of nodes) world(node);
  return cache;
}

// --- estático -------------------------------------------------------------
const round = (v, d = 4) => (Array.isArray(v) ? v.map((x) => round(x, d)) : +Number(v).toFixed(d));
const inventory = {
  file, bytes: (await fs.stat(file)).size,
  scenes: root.listScenes().map((s) => ({ name: nameOf(s), roots: s.listChildren().map(nameOf) })),
  nodes: nodes.map((n) => ({
    name: nameOf(n), parent: parentOf.has(n) ? nameOf(parentOf.get(n)) : null,
    t: round(n.getTranslation()), r: round(n.getRotation()), s: round(n.getScale()),
    mesh: n.getMesh() ? nameOf(n.getMesh()) : null, skin: n.getSkin() ? nameOf(n.getSkin()) : null,
    camera: n.getCamera() ? nameOf(n.getCamera()) : null, children: n.listChildren().length,
  })),
  skins: root.listSkins().map((s) => ({
    name: nameOf(s), joints: s.listJoints().length, skeleton: s.getSkeleton() ? nameOf(s.getSkeleton()) : null,
    jointNames: s.listJoints().map(nameOf),
  })),
  materials: root.listMaterials().map((m) => ({
    name: nameOf(m), baseColor: round(m.getBaseColorFactor(), 3), metallic: round(m.getMetallicFactor(), 3),
    roughness: round(m.getRoughnessFactor(), 3), alphaMode: m.getAlphaMode(), doubleSided: m.getDoubleSided(),
    textures: Object.fromEntries([['base', m.getBaseColorTexture()], ['normal', m.getNormalTexture()],
      ['mr', m.getMetallicRoughnessTexture()], ['emissive', m.getEmissiveTexture()]]
      .filter(([, t]) => t).map(([k, t]) => [k, { name: nameOf(t), mime: t.getMimeType(), bytes: t.getImage()?.byteLength || 0 }])),
  })),
  animations: root.listAnimations().map((a) => ({
    name: nameOf(a), duration: round(clipDuration(a), 4), channels: a.listChannels().length,
    targets: [...new Set(a.listChannels().map((c) => nameOf(c.getTargetNode())))].length,
    targetSample: [...new Set(a.listChannels().map((c) => nameOf(c.getTargetNode())))].filter((n) => SEMANTIC.test(n)),
  })),
  cameras: root.listCameras().map((c) => ({ name: nameOf(c), yfovDeg: round((c.getYFov() * 180) / Math.PI, 3), aspect: round(c.getAspectRatio() || 0, 4), znear: c.getZNear(), zfar: c.getZFar() })),
  poses: [],
};

// --- por pose: ossos semânticos, câmera e AABB world das primitivas --------
for (const pose of poses) {
  const { over, duration, t } = poseOverrides(pose);
  const W = worldMatrices(over);
  const semantic = {};
  for (const node of nodes) {
    const name = nameOf(node);
    if (!SEMANTIC.test(name) && !node.getCamera()) continue;
    const m = W.get(node);
    const p = new Vector3(); const q = new Quaternion(); const s = new Vector3();
    m.decompose(p, q, s);
    const axis = (v) => round(v.applyQuaternion(q).toArray(), 3);
    semantic[name] = {
      world: round(p.toArray()), scale: round(s.toArray(), 3),
      x: axis(new Vector3(1, 0, 0)), y: axis(new Vector3(0, 1, 0)), z: axis(new Vector3(0, 0, 1)),
      children: node.listChildren().map((c) => ({ name: nameOf(c), world: round(new Vector3().setFromMatrixPosition(W.get(c)).toArray()) })),
    };
  }
  const primitives = [];
  for (const node of nodes) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const skin = node.getSkin();
    const nodeWorld = W.get(node);
    const jointMatrices = skin ? (() => {
      const joints = skin.listJoints();
      const ibm = skin.getInverseBindMatrices()?.getArray();
      return joints.map((j, i) => {
        const inv = new Matrix4().fromArray(ibm ? ibm.slice(i * 16, i * 16 + 16) : new Matrix4().identity().elements);
        return W.get(j).clone().multiply(inv);
      });
    })() : null;
    const jointNames = skin ? skin.listJoints().map(nameOf) : [];
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')?.getArray();
      if (!pos) continue;
      const jo = prim.getAttribute('JOINTS_0')?.getArray();
      const we = prim.getAttribute('WEIGHTS_0')?.getArray();
      const n = pos.length / 3;
      const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
      const sum = [0, 0, 0];
      const weightByJoint = new Map();
      const v = new Vector3(); const acc = new Vector3(); const tmp = new Vector3();
      const sideWeight = { l: 0, r: 0, outro: 0 };
      for (let i = 0; i < n; i += 1) {
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        if (jointMatrices && jo && we) {
          acc.set(0, 0, 0);
          for (let k = 0; k < 4; k += 1) {
            const w = we[i * 4 + k]; if (!w) continue;
            const j = jo[i * 4 + k];
            tmp.copy(v).applyMatrix4(jointMatrices[j]).multiplyScalar(w);
            acc.add(tmp);
            weightByJoint.set(j, (weightByJoint.get(j) || 0) + w);
            const jn = jointNames[j] || '';
            sideWeight[/_l$/i.test(jn) ? 'l' : /_r$/i.test(jn) ? 'r' : 'outro'] += w;
          }
          v.copy(acc);
        } else v.applyMatrix4(nodeWorld);
        for (let a = 0; a < 3; a += 1) {
          const c = v.getComponent(a);
          if (c < min[a]) min[a] = c; if (c > max[a]) max[a] = c; sum[a] += c;
        }
      }
      const top = [...weightByJoint.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([j, w]) => ({ joint: jointNames[j], share: round(w / n, 3) }));
      primitives.push({
        node: nameOf(node), mesh: nameOf(mesh), skin: skin ? nameOf(skin) : null,
        material: nameOf(prim.getMaterial()), vertices: n, indices: prim.getIndices()?.getCount() || 0,
        aabbWorld: { min: round(min), max: round(max), size: round(max.map((x, i) => x - min[i])) },
        centerWorld: round(sum.map((x) => x / n)),
        dominantJoints: top,
        sideShare: skin ? { l: round(sideWeight.l / n, 3), r: round(sideWeight.r / n, 3), outro: round(sideWeight.outro / n, 3) } : null,
      });
    }
  }
  inventory.poses.push({ clip: pose.clip, frac: pose.frac, t: round(t, 4), duration: round(duration, 4), semantic, primitives });
}

// --- resumo humano ----------------------------------------------------------
const log = (s = '') => console.log(s);
log(`GLB ${file} · ${(inventory.bytes / 1048576).toFixed(2)} MiB`);
log(`nós ${inventory.nodes.length} · skins ${inventory.skins.length} · materiais ${inventory.materials.length} · animações ${inventory.animations.length} · câmeras ${inventory.cameras.length}`);
for (const s of inventory.skins) log(`  skin ${s.name}: ${s.joints} joints · raiz ${s.skeleton}`);
for (const c of inventory.cameras) log(`  câmera ${c.name}: yfov ${c.yfovDeg}° · aspecto ${c.aspect}`);
for (const a of inventory.animations) log(`  clip ${a.name}: ${a.duration}s · ${a.channels} canais · ${a.targets} alvos`);
for (const m of inventory.materials) log(`  material ${m.name}: base ${JSON.stringify(m.baseColor)} metal ${m.metallic} rough ${m.roughness} tex ${Object.keys(m.textures).join('/') || '-'}`);
for (const p of inventory.poses) {
  log(`\n== pose ${p.clip}@${p.frac} (t=${p.t}s de ${p.duration}s) ==`);
  for (const [name, s] of Object.entries(p.semantic)) {
    log(`  ${name.padEnd(22)} world ${JSON.stringify(s.world)} · +Y ${JSON.stringify(s.y)} · escala ${JSON.stringify(s.scale)}`);
  }
  for (const pr of p.primitives) {
    log(`  prim ${pr.node} [${pr.material}] v=${pr.vertices} skin=${pr.skin || '-'} centro ${JSON.stringify(pr.centerWorld)} tamanho ${JSON.stringify(pr.aabbWorld.size)}`);
    log(`       joints ${pr.dominantJoints.map((d) => `${d.joint}:${d.share}`).join(' ')}${pr.sideShare ? ` · lado L ${pr.sideShare.l} R ${pr.sideShare.r}` : ''}`);
  }
}
if (saida) {
  await fs.mkdir(path.dirname(path.resolve(saida)), { recursive: true });
  await fs.writeFile(path.resolve(saida), `${JSON.stringify(inventory, null, 2)}\n`);
  log(`\ninventário em ${saida}`);
}
