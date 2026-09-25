/* Rigidifica somente vértices apontados pelo diagnóstico de select-inflate.

   Uso:
     node tools/rigidify-diagnostic-vertices.mjs input.glb output.glb id \
       tools/eval/select_inflate.json

   O diagnóstico usa os índices do BufferGeometry carregado pelo GLTFLoader; em um GLB
   com uma única primitive eles são os mesmos índices do accessor glTF. A ferramenta
   recusa múltiplas primitives para não fingir que sabe fazer esse mapeamento. Para cada
   endpoint de aresta vermelha, preserva o osso já dominante e zera apenas influências
   residuais. É variante A/B: a régua e a captura visual decidem se substitui o original.
*/
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [, , input, output, id, diagnostic = 'tools/eval/select_inflate.json', mode = 'dominant'] = process.argv;
if (!input || !output || !id) {
  console.error('uso: rigidify-diagnostic-vertices <input.glb> <output.glb> <id> [diagnostic.json]');
  process.exit(1);
}
const audit = JSON.parse(fs.readFileSync(diagnostic, 'utf8'));
const row = audit.personagens?.find((entry) => entry.id === id);
if (!row?.ruinsArestas?.length) throw new Error(`${id}: diagnóstico sem ruinsArestas; rode select-inflate --diagnose`);
if (row.ruinsArestas.some((edge) => edge.mesh !== 0)) throw new Error(`${id}: diagnóstico tem mais de uma malha`);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const primitives = doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives());
if (primitives.length !== 1) throw new Error(`${id}: esperado 1 primitive, achei ${primitives.length}`);
const primitive = primitives[0];
const joints = primitive.getAttribute('JOINTS_0');
const weights = primitive.getAttribute('WEIGHTS_0');
if (!joints || !weights || joints.getCount() !== weights.getCount()) throw new Error(`${id}: skin accessors ausentes ou divergentes`);

const vertices = new Set(row.ruinsArestas.flatMap((edge) => [edge.a, edge.b]));
const j = [], w = [];
if (!['dominant', 'average'].includes(mode)) throw new Error(`modo inválido: ${mode}`);

const applyWeights = (vertex, entries) => {
  const top = entries.filter((entry) => entry[1] > 1e-8).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const total = top.reduce((sum, entry) => sum + entry[1], 0) || 1;
  while (top.length < 4) top.push([0, 0]);
  joints.setElement(vertex, top.map((entry) => entry[0]));
  weights.setElement(vertex, top.map((entry) => entry[1] / total));
};

for (const vertex of vertices) {
  if (vertex < 0 || vertex >= weights.getCount()) throw new Error(`${id}: índice ${vertex} fora de ${weights.getCount()}`);
}

if (mode === 'dominant') for (const vertex of vertices) {
  joints.getElement(vertex, j);
  weights.getElement(vertex, w);
  let best = 0;
  for (let k = 1; k < 4; k++) if (w[k] > w[best]) best = k;
  joints.setElement(vertex, [j[best], j[best], j[best], j[best]]);
  weights.setElement(vertex, [1, 0, 0, 0]);
} else {
  const adjacency = new Map([...vertices].map((vertex) => [vertex, new Set()]));
  for (const edge of row.ruinsArestas) {
    adjacency.get(edge.a).add(edge.b);
    adjacency.get(edge.b).add(edge.a);
  }
  const unseen = new Set(vertices);
  while (unseen.size) {
    const seed = unseen.values().next().value;
    const stack = [seed], component = [];
    unseen.delete(seed);
    while (stack.length) {
      const vertex = stack.pop(); component.push(vertex);
      for (const neighbor of adjacency.get(vertex)) if (unseen.delete(neighbor)) stack.push(neighbor);
    }
    const sum = new Map();
    for (const vertex of component) {
      joints.getElement(vertex, j); weights.getElement(vertex, w);
      for (let k = 0; k < 4; k++) if (w[k] > 1e-8) sum.set(j[k], (sum.get(j[k]) || 0) + w[k]);
    }
    const average = [...sum].map(([joint, value]) => [joint, value / component.length]);
    for (const vertex of component) applyWeights(vertex, average);
  }
}
await io.write(output, doc);
console.log(`${id}: ${vertices.size} vértices ajustados (${mode}) a partir de ${row.ruinsArestas.length} arestas -> ${output}`);
