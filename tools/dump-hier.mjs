// Dump hierarchy + rest transforms + first/last hips keyframe of a clip GLB.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  console.log('\n=== ' + file);
  const hips = root.listNodes().find(n => n.getName() === 'Hips');
  if (hips) {
    console.log('Hips rest T=', hips.getTranslation().map(v => v.toFixed(2)), 'parent=', hips.getParentNode ? hips.getParentNode()?.getName?.() : '(n/a)');
    let p = hips.getParentNode();
    const chain = [];
    while (p) { chain.push(p.getName()); p = p.getParentNode(); }
    console.log('Hips ancestry:', chain.join(' <- ') || '(root)');
  }
  for (const anim of root.listAnimations()) {
    for (const ch of anim.listChannels()) {
      const t = ch.getTargetNode();
      if (!t || ch.getTargetPath() !== 'translation' || t.getName() !== 'Hips') continue;
      const out = ch.getSampler().getOutput().getArray();
      const n = out.length / 3;
      const f = [out[0], out[1], out[2]].map(v => v.toFixed(2));
      const l = [out[(n-1)*3], out[(n-1)*3+1], out[(n-1)*3+2]].map(v => v.toFixed(2));
      console.log(`Hips.translation keys=${n} first=[${f}] last=[${l}]`);
    }
  }
}
