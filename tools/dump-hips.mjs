import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const src = await io.read(process.argv[2]);
const out = await io.read(process.argv[3]);
for (const a of src.getRoot().listAnimations()) {
  if (a.getName() !== 'Walk_Loop') continue;
  for (const ch of a.listChannels()) {
    if (ch.getTargetNode()?.getName() === 'pelvis' && ch.getTargetPath() === 'translation') {
      const t = ch.getSampler().getInput().getArray(), v = ch.getSampler().getOutput().getArray();
      console.log('SRC pelvis translation: n=', t.length, 'first:', [...v.slice(0,3)].map(x=>+x.toFixed(2)), 'mid:', [...v.slice(3*(Math.floor(t.length/2)),3*(Math.floor(t.length/2))+3)].map(x=>+x.toFixed(2)));
    }
  }
}
for (const a of out.getRoot().listAnimations()) {
  for (const ch of a.listChannels()) {
    if (ch.getTargetPath() === 'translation') {
      const v = ch.getSampler().getOutput().getArray();
      const ys = []; for (let i = 1; i < v.length; i += 3) ys.push(v[i]);
      console.log('OUT Hips translation Y: min', Math.min(...ys).toFixed(2), 'max', Math.max(...ys).toFixed(2), 'first', ys[0].toFixed(2));
    }
  }
}
