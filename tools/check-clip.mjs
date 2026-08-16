// Validate a clip GLB for the csbrasil shared-clip pipeline:
//  - bone/node names vs the shared rig
//  - sampler input time span (zero-duration bug check)
//  - facing (+Z?) and feet height via hips motion / root translation (root motion check)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const SHARED = ['Hips','Spine','Spine01','Spine02','neck','Head','head_end','headfront',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase'];

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  const nodes = root.listNodes().map(n => n.getName());
  console.log('\n=== ' + file);
  console.log('nodes (' + nodes.length + '):', nodes.slice(0, 60).join(', ') + (nodes.length > 60 ? ' ...' : ''));
  const missing = SHARED.filter(b => !nodes.includes(b));
  console.log('missing shared bones:', missing.length ? missing.join(', ') : '(none)');

  for (const anim of root.listAnimations()) {
    let tMin = Infinity, tMax = -Infinity;
    const targeted = new Set();
    for (const ch of anim.listChannels()) {
      const s = ch.getSampler(); if (!s) continue;
      const input = s.getInput(); if (!input) continue;
      const arr = input.getArray();
      if (arr.length) { tMin = Math.min(tMin, arr[0]); tMax = Math.max(tMax, arr[arr.length - 1]); }
      const t = ch.getTargetNode();
      if (t) targeted.add(t.getName() + ':' + ch.getTargetPath());
    }
    console.log(`anim "${anim.getName()}": timeSpan=[${tMin.toFixed(3)}, ${tMax.toFixed(3)}] dur=${(tMax - tMin).toFixed(3)}s channels=${anim.listChannels().length}`);
    // Root motion: hips translation channel range
    for (const ch of anim.listChannels()) {
      const t = ch.getTargetNode();
      if (!t || ch.getTargetPath() !== 'translation') continue;
      const tn = t.getName();
      if (!/hips|root|armature/i.test(tn)) continue;
      const out = ch.getSampler().getOutput().getArray();
      const n = out.length / 3;
      let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,minZ=1e9,maxZ=-1e9;
      for (let i=0;i<n;i++){const x=out[i*3],y=out[i*3+1],z=out[i*3+2];
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
      console.log(`  ${tn}.translation range: dx=${(maxX-minX).toFixed(3)} dy=${(maxY-minY).toFixed(3)} dz=${(maxZ-minZ).toFixed(3)} (y0=${minY.toFixed(3)}..${maxY.toFixed(3)})`);
    }
  }
  // Scene scale/orientation hints: root node transforms + mesh bbox-ish info
  for (const scene of root.listScenes()) {
    for (const child of scene.listChildren()) {
      console.log('scene root:', child.getName(), 'T=', child.getTranslation().map(v=>v.toFixed(3)), 'R=', child.getRotation().map(v=>v.toFixed(3)), 'S=', child.getScale().map(v=>v.toFixed(3)));
    }
  }
}
