// Desvira triângulos com enrolamento oposto à normal de vértice. Só troca a ordem de dois
// índices: posição, UV, pesos e textura ficam intactos. Mint 10/2026: Julia 66, Barbudo 65,
// Marina 33 por modelo; Doutora e Caminhoneiro 0.
//
// Uso: node tools/personagens/desvira-triangulos.mjs <in.glb> <out.glb> [--check]
//   --check  só conta e sai 1 se houver triângulo invertido
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [, , IN, OUT] = process.argv;
const CHECK = process.argv.includes('--check');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(IN);
let total = 0;
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const P = prim.getAttribute('POSITION').getArray(), N = prim.getAttribute('NORMAL').getArray();
  const acc = prim.getIndices(), I = acc.getArray().slice();
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [I[t] * 3, I[t + 1] * 3, I[t + 2] * 3];
    const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]];
    const v = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const dot = n[0] * (N[a] + N[b] + N[c]) + n[1] * (N[a + 1] + N[b + 1] + N[c + 1]) + n[2] * (N[a + 2] + N[b + 2] + N[c + 2]);
    if (dot < 0) { total++; [I[t + 1], I[t + 2]] = [I[t + 2], I[t + 1]]; }
  }
  if (!CHECK) acc.setArray(I);
}
console.log(`${IN.split('/').pop()}: ${total} triângulo(s) invertido(s)${CHECK ? '' : ' desvirado(s)'}`);
if (CHECK) process.exit(total ? 1 : 0);
await io.write(OUT, doc);
