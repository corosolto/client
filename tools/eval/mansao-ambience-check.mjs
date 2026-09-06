// Mesmos POSITION/NORMAL dos GLBs servidos; as faixas centrais preservam corpo, cabeça e cauda.
// --mutante=asas-travadas restaura os vértices após o update real: MA1 precisa reprovar.
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
import { createMansaoAmbience, MANSAO_SKY_ASSETS } from '../../public/js/mansao_ambience.js';
import { registerFaunaTemplate } from '../../public/js/ambientlife.js';

const mutant = process.argv.includes('--mutante=asas-travadas');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const templates = new Map();
for (const type of ['macaw', 'songbird']) {
  const doc = await io.read(`public/${MANSAO_SKY_ASSETS[type]}`);
  const build = (node) => {
    const group = new THREE.Group();
    group.matrix.fromArray(node.getMatrix()); group.matrix.decompose(group.position, group.quaternion, group.scale);
    for (const primitive of node.getMesh()?.listPrimitives() || []) {
      const geometry = new THREE.BufferGeometry();
      for (const [semantic, name] of [['POSITION', 'position'], ['NORMAL', 'normal']]) {
        const accessor = primitive.getAttribute(semantic);
        if (accessor) geometry.setAttribute(name, new THREE.BufferAttribute(accessor.getArray().slice(), accessor.getElementSize()));
      }
      if (primitive.getIndices()) geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray().slice(), 1));
      group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
    }
    for (const child of node.listChildren()) group.add(build(child));
    return group;
  };
  const template = new THREE.Group();
  for (const node of doc.getRoot().listScenes()[0].listChildren()) template.add(build(node));
  templates.set(type, template);
  registerFaunaTemplate(type, template);
}
const scene = new THREE.Group();
const options = { macaws: [{ phase: 0 }], songbirds: [{ phase: 0 }] };
const a = createMansaoAmbience(scene, options), sibling = createMansaoAmbience(scene, options);
const meshes = (object) => { const out = []; object.traverse((o) => { if (o.isMesh) out.push(o); }); return out; };
const buffers = (object) => meshes(object).map((m) => m.geometry.attributes.position.array.slice());
const beforeTemplates = new Map([...templates].map(([k, v]) => [k, buffers(v)]));
const beforeSibling = buffers(sibling.group);
let mutations = 0;
if (mutant) {
  const update = a._updateCircuito;
  a._updateCircuito = function (animal) {
    const previous = buffers(animal.root);
    update.call(this, animal);
    meshes(animal.root).forEach((mesh, i) => { mesh.geometry.attributes.position.array.set(previous[i]); });
    mutations++;
  };
}
let failures = 0;
const check = (name, ok, evidence) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${evidence}`); if (!ok) failures++; };
const initial = buffers(a.group);
for (let i = 0; i < 5; i++) a.update(.05);
let offset = 0;
for (const animal of a.extraAnimals) {
  const lateral = animal.type === 'macaw' ? 2 : 0;
  const cut = animal.type === 'macaw' ? .10 : .18;
  const sourceMeshes = meshes(templates.get(animal.type));
  const collar = [];
  for (const mesh of sourceMeshes) {
    const p = mesh.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3)
      if (Math.abs(p[i + lateral]) > cut && Math.abs(p[i + lateral]) < cut + .03 && (lateral === 2 || p[i + 2] < 0)) collar.push(p[i + 1]);
  }
  collar.sort((a, b) => a - b);
  console.log(`SOURCE ${animal.type}: ${MANSAO_SKY_ASSETS[animal.type]}, eixo=${'XYZ'[lateral]}, raiz=${cut}, colar=${collar.length}, medianaY=${collar[Math.floor(collar.length / 2)]}`);
  let body = 0, movedBody = 0, left = 0, right = 0, leftY = 0, rightY = 0, maxDelta = 0, owned = true;
  for (const [mi, mesh] of meshes(animal.root).entries()) {
    const now = mesh.geometry.attributes.position.array, before = initial[offset++];
    const source = sourceMeshes[mi].geometry.attributes.position.array;
    owned &&= mesh.geometry !== sourceMeshes[mi].geometry;
    for (let i = 0; i < source.length; i += 3) {
      const isBody = Math.abs(source[i + lateral]) <= cut || (animal.type === 'songbird' && source[i + 2] >= 0);
      const delta = Math.hypot(now[i] - before[i], now[i + 1] - before[i + 1], now[i + 2] - before[i + 2]);
      maxDelta = Math.max(maxDelta, delta);
      if (isBody) { body++; if (delta !== 0) movedBody++; }
      else if (delta > 1e-6) {
        if (source[i + lateral] < 0) { left++; leftY += now[i + 1] - before[i + 1]; }
        else { right++; rightY += now[i + 1] - before[i + 1]; }
      }
    }
  }
  check(`MA1 ${animal.type} vértices de ambas asas`, left > 0 && right > 0 && leftY * rightY > 0, `esquerda=${left}, direita=${right}, deslocamento máximo=${maxDelta.toFixed(6)}`);
  check(`MA2 ${animal.type} corpo estável / geometria própria`, body > 0 && movedBody === 0 && owned, `corpo=${body}, alterados=${movedBody}, clone=${owned}`);
}
const macaw = a.extraAnimals.find((animal) => animal.type === 'macaw');
const nose = new THREE.Vector3(-1, 0, 0).applyQuaternion(macaw.model.quaternion);
check('MA8 nariz da arara acompanha tangente', nose.dot(new THREE.Vector3(0, 0, -1)) > 1 - 1e-10, `nariz local=${nose.toArray().map((n) => n.toFixed(3))}`);
check('MA3 template e segunda instância preservados', [...templates].every(([type, template]) => JSON.stringify(buffers(template)) === JSON.stringify(beforeTemplates.get(type))) && JSON.stringify(buffers(sibling.group)) === JSON.stringify(beforeSibling), 'comparação integral dos buffers');
const paused = buffers(a.group); a.setPaused(true); a.update(.05);
check('MA4 pausa', JSON.stringify(buffers(a.group)) === JSON.stringify(paused), 'buffers não mudam');
a.setPaused(false); a.reset();
check('MA5 reset', JSON.stringify(buffers(a.group)) === JSON.stringify(initial), 'restaura pose determinística');
let disposedTemplate = 0, disposedOwn = 0;
for (const template of templates.values()) for (const mesh of meshes(template)) mesh.geometry.addEventListener('dispose', () => disposedTemplate++);
for (const mesh of meshes(a.group)) mesh.geometry.addEventListener('dispose', () => disposedOwn++);
a.dispose(); a.dispose();
check('MA6 descarte isolado', disposedTemplate === 0 && disposedOwn === 2, `templates=${disposedTemplate}, geometrias próprias=${disposedOwn}`);
sibling.update(.05); sibling.dispose();
check('MA7 lifecycle', scene.children.length === 0, `grupos restantes=${scene.children.length}`);
if (mutant) assert.ok(mutations > 0, 'mutação não aplicada');
process.exitCode = failures ? 1 : 0;
