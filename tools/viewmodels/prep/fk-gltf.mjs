// Cinemática direta sobre um documento gltf-transform: amostra canais de clipe e
// devolve matrizes de mundo com a matemática do three vendorizado (sem navegador).
import * as THREE from '../../../public/vendor/three.module.js';

export { THREE };

export function sample(sampler, t) {
  const input = sampler.getInput().getArray();
  const output = sampler.getOutput().getArray();
  const cubic = sampler.getInterpolation() === 'CUBICSPLINE';
  const width = output.length / input.length / (cubic ? 3 : 1);
  const at = (i) => Array.from(output.slice((cubic ? i * 3 + 1 : i) * width, (cubic ? i * 3 + 2 : i + 1) * width));
  const last = input.length - 1;
  if (t <= input[0]) return at(0);
  if (t >= input[last]) return at(last);
  let i = 0;
  while (i < last - 1 && input[i + 1] < t) i += 1;
  if (sampler.getInterpolation() === 'STEP') return at(i);
  const u = (t - input[i]) / (input[i + 1] - input[i]);
  const a = at(i);
  const b = at(i + 1);
  if (width === 4) {
    const q = new THREE.Quaternion(...a).slerp(new THREE.Quaternion(...b), u);
    return [q.x, q.y, q.z, q.w];
  }
  return a.map((value, k) => value + (b[k] - value) * u);
}

export const duration = (clip) => Math.max(...clip.listSamplers().map((s) => { const a = s.getInput().getArray(); return a[a.length - 1]; }));

// Pose de um documento: `set(clip, t)` lê os canais; `override(no, {translation,rotation,scale})`
// substitui o local de um nó; `world(no)` compõe do topo. Cache invalida a cada mudança.
export class Pose {
  constructor(document) {
    this.root = document.getRoot();
    this.parent = new Map();
    for (const node of this.root.listNodes()) for (const child of node.listChildren()) this.parent.set(child, node);
    this.byName = new Map(this.root.listNodes().map((node) => [node.getName(), node]));
    this.over = new Map();
    this.cache = new Map();
  }
  node(name) { const n = typeof name === 'string' ? this.byName.get(name) : name; if (!n) throw new Error(`nó ${name} ausente`); return n; }
  clip(name) { const c = this.root.listAnimations().find((a) => a.getName() === name); if (!c) throw new Error(`clipe ${name} ausente`); return c; }
  set(clipName, t, skip = null) {
    this.over = new Map(); this.cache = new Map();
    if (!clipName) return this;
    for (const channel of this.clip(clipName).listChannels()) {
      const node = channel.getTargetNode(); const target = channel.getTargetPath();
      if (target === 'weights' || node === skip) continue;
      if (!this.over.has(node)) this.over.set(node, {});
      this.over.get(node)[target] = sample(channel.getSampler(), t);
    }
    return this;
  }
  trs(name) {
    const node = this.node(name); const o = this.over.get(node) || {};
    return { translation: o.translation || node.getTranslation(), rotation: o.rotation || node.getRotation(), scale: o.scale || node.getScale() };
  }
  override(name, trs) {
    const node = this.node(name);
    this.over.set(node, { ...(this.over.get(node) || {}), ...trs });
    this.cache = new Map();
  }
  local(name) {
    const { translation, rotation, scale } = this.trs(name);
    return new THREE.Matrix4().compose(new THREE.Vector3(...translation), new THREE.Quaternion(...rotation), new THREE.Vector3(...scale));
  }
  world(name) {
    const node = this.node(name);
    if (!this.cache.has(node)) {
      const parent = this.parent.get(node);
      this.cache.set(node, parent ? this.world(parent).multiply(this.local(node)) : this.local(node));
    }
    return this.cache.get(node).clone();
  }
  pos(name) { return new THREE.Vector3().setFromMatrixPosition(this.world(name)); }
  quat(name) { const q = new THREE.Quaternion(); this.world(name).decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; }
  // Local que faz o nó ter a matriz de mundo pedida, dado o pai atual.
  localFor(name, worldMatrix) {
    const parent = this.parent.get(this.node(name));
    const local = parent ? this.world(parent).invert().multiply(worldMatrix) : worldMatrix.clone();
    const t = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
    local.decompose(t, q, s);
    return { translation: t.toArray(), rotation: [q.x, q.y, q.z, q.w], scale: s.toArray() };
  }
}

export const blend = (a, b, u) => {
  const pa = new THREE.Vector3(); const qa = new THREE.Quaternion(); const sa = new THREE.Vector3();
  const pb = new THREE.Vector3(); const qb = new THREE.Quaternion(); const sb = new THREE.Vector3();
  a.decompose(pa, qa, sa); b.decompose(pb, qb, sb);
  return new THREE.Matrix4().compose(pa.lerp(pb, u), qa.slerp(qb, u), sa.lerp(sb, u));
};
export const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };

// Reescreve (ou cria) o clipe `nome` com canais TRS amostrados: `faixas` = Map(nó → [{translation,rotation,scale}]).
export function gravarClipe(document, nome, tempos, faixas) {
  const root = document.getRoot();
  const buffer = root.listBuffers()[0];
  const antigo = root.listAnimations().find((a) => a.getName() === nome);
  const clip = antigo || document.createAnimation(nome);
  const alvos = new Set(faixas.keys());
  for (const channel of clip.listChannels()) {
    if (!alvos.has(channel.getTargetNode())) continue;
    const sampler = channel.getSampler(); channel.dispose();
    if (!clip.listChannels().some((ch) => ch.getSampler() === sampler)) sampler.dispose();
  }
  const input = document.createAccessor(`${nome}_t_${faixas.size}`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
  for (const [node, quadros] of faixas) {
    for (const [caminho, tipo] of [['translation', 'VEC3'], ['rotation', 'VEC4'], ['scale', 'VEC3']]) {
      const valores = new Float32Array(quadros.flatMap((q) => q[caminho]));
      const out = document.createAccessor(`${nome}_${node.getName()}_${caminho}`).setType(tipo).setArray(valores).setBuffer(buffer);
      const sampler = document.createAnimationSampler().setInput(input).setOutput(out).setInterpolation('LINEAR');
      clip.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(node).setTargetPath(caminho).setSampler(sampler));
    }
  }
  return clip;
}
