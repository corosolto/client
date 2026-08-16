import { NodeIO } from '@gltf-transform/core';
import { getBounds } from '@gltf-transform/functions';
const io = new NodeIO();
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const b = getBounds(doc.getRoot().listScenes()[0]);
  const mn = b.min.map(v=>v.toFixed(4)), mx = b.max.map(v=>v.toFixed(4));
  const nodes = doc.getRoot().listNodes().map(n=>({name:n.getName(), scale:n.getScale().map(s=>+s.toFixed(4))}));
  console.log(f, '\n  bounds:', mn, '->', mx, '\n  nodes:', JSON.stringify(nodes.slice(0,6)));
}
