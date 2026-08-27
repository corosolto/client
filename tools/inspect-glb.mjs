/* inspect-glb — dimensão, orientação e custo de um GLB antes de posicionar no mapa.
   Registra ALL_EXTENSIONS: sem isso qualquer prop com textura webp (EXT_texture_webp,
   a maioria do acervo) explodia com "Missing required extension" em vez de medir. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  try {
    const doc = await io.read(f);
    const b = getBounds(doc.getRoot().listScenes()[0]);
    const d = [0, 1, 2].map((i) => b.max[i] - b.min[i]);
    let tris = 0;
    for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
      const idx = p.getIndices();
      tris += idx ? idx.getCount() / 3 : (p.getAttribute('POSITION')?.getCount() || 0) / 3;
    }
    const nodes = doc.getRoot().listNodes().map((n) => n.getName()).filter(Boolean);
    console.log(`${f}
  tamanho XYZ: ${d.map((v) => v.toFixed(3)).join(' x ')} m   (maior eixo horizontal: ${d[0] >= d[2] ? 'X' : 'Z'})
  bounds: [${b.min.map((v) => v.toFixed(3))}] -> [${b.max.map((v) => v.toFixed(3))}]
  tris: ${Math.round(tris)}   nodes: ${JSON.stringify(nodes.slice(0, 6))}`);
  } catch (e) {
    console.error(`${f}\n  ERRO: ${e.message}`);
    process.exitCode = 1;
  }
}
