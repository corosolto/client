import { NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
const doc = await io.read(process.argv[2]);
const anims = doc.getRoot().listAnimations().map(a => {
  const dur = Math.max(...a.listChannels().map(c => { const t = c.getSampler().getInput().getArray(); return t[t.length-1]; }));
  return `${a.getName()} (${dur.toFixed(2)}s, ${a.listChannels().length}ch)`;
});
const bones = doc.getRoot().listNodes().filter(n => n.getSkin() === undefined && /spine|hand|finger|thumb|index|middle|ring|pinky|arm|leg|foot|toe|head|neck|shoulder/i.test(n.getName())).map(n => n.getName());
const fingers = bones.filter(n => /thumb|index|middle|ring|pinky|finger/i.test(n));
console.log('ANIMS:', anims.length ? anims.join(' | ') : 'nenhuma');
console.log('OSSOS (' + bones.length + '):', bones.join(', ').slice(0, 600));
console.log('DEDOS (' + fingers.length + '):', fingers.join(', ') || 'NENHUM');
