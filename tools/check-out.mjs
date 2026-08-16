import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
for (const a of doc.getRoot().listAnimations()) {
  console.log('clip:', a.getName(), 'channels:', a.listChannels().length);
  for (const ch of a.listChannels()) {
    const n = ch.getTargetNode()?.getName();
    if (!ch.getSampler()) { console.log('  ', n, 'SEM SAMPLER'); continue; }
    const out = ch.getSampler().getOutput().getArray();
    let mn = 1e9, mx = -1e9;
    for (const v of out) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    console.log('  ', n, ch.getTargetPath(), 'range', (mx - mn).toFixed(3));
  }
}
