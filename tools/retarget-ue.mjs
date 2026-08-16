// Retarget UE5-mannequin animations onto the Meshy bone names (rename tracks by bone
// map; drop finger/leaf tracks our rigs lack). Outputs one stripped GLB per clip, ready
// for glbchars' shared-clip pipeline (bind by bone name at runtime).
// usage: node tools/retarget-ue.mjs <in.glb> <outDir>
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { mkdirSync } from 'node:fs';

const MAP = {
  pelvis: 'Hips',
  spine_01: 'Spine', spine_02: 'Spine01', spine_03: 'Spine02',
  neck_01: 'Neck', head: 'Head',
  clavicle_l: 'LeftShoulder', upperarm_l: 'LeftArm', lowerarm_l: 'LeftForeArm', hand_l: 'LeftHand',
  clavicle_r: 'RightShoulder', upperarm_r: 'RightArm', lowerarm_r: 'RightForeArm', hand_r: 'RightHand',
  thigh_l: 'LeftUpLeg', calf_l: 'LeftLeg', foot_l: 'LeftFoot', ball_l: 'LeftToeBase',
  thigh_r: 'RightUpLeg', calf_r: 'RightLeg', foot_r: 'RightFoot', ball_r: 'RightToeBase',
};
// which source clips to export and under which game state name
const EXPORT = {
  idle: 'Pistol_Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop',
  shoot: 'Pistol_Shoot', death: 'Death01', crouch: 'Crouch_Idle_Loop',
  crouchwalk: 'Crouch_Fwd_Loop', jump: 'Jump_Start',
};

const [, , inPath, outDir] = process.argv;
if (!inPath || !outDir) { console.error('usage: retarget-ue <in.glb> <outDir>'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const io = new NodeIO();
const doc = await io.read(inPath);
const root = doc.getRoot();

// strip geometry (keep the skeleton + animations only)
root.listMeshes().forEach(m => { m.listPrimitives().forEach(p => p.dispose()); m.dispose(); });
root.listNodes().forEach(n => n.setMesh(null));
root.listSkins().forEach(s => s.dispose());
root.listMaterials().forEach(m => m.dispose());
root.listTextures().forEach(t => t.dispose());

// retarget: keep only mapped channels, renamed; also strip root XZ motion (bots are
// translated in code — keep Y bob like our other clips)
let exported = 0;
for (const [state, srcName] of Object.entries(EXPORT)) {
  const anim = root.listAnimations().find(a => a.getName() === srcName);
  if (!anim) { console.warn('clip não encontrado:', srcName); continue; }
  for (const ch of [...anim.listChannels()]) {
    const name = ch.getTargetNode()?.getName() || '';
    if (ch.getTargetNode()?.getName() === 'root') { anim.removeChannel(ch); continue; }
    const mapped = MAP[name];
    if (!mapped) { anim.removeChannel(ch); continue; }
    ch.getTargetNode().setName(mapped);
    if (mapped === 'Hips' && ch.getTargetPath() === 'translation') {
      const out = ch.getSampler().getOutput();
      const arr = Float32Array.from(out.getArray());
      const x0 = arr[0], z0 = arr[2];
      for (let i = 0; i < arr.length; i += 3) { arr[i] = x0; arr[i + 2] = z0; }
      out.setArray(arr);
    }
  }
  anim.setName(state);
  exported++;
}

// drop animations we don't export (delete so the file stays small)
for (const a of [...root.listAnimations()]) if (!Object.keys(EXPORT).includes(a.getName())) a.dispose();

// write one GLB per state (our loader reads models/anims/<state>.glb)
for (const state of Object.keys(EXPORT)) {
  const doc2 = await io.read(inPath);
  const root2 = doc2.getRoot();
  root2.listMeshes().forEach(m => { m.listPrimitives().forEach(p => p.dispose()); m.dispose(); });
  root2.listNodes().forEach(n => n.setMesh(null));
  root2.listSkins().forEach(s => s.dispose());
  root2.listMaterials().forEach(m => m.dispose());
  root2.listTextures().forEach(t => t.dispose());
  for (const a of [...root2.listAnimations()]) if (a.getName() !== EXPORT[state]) a.dispose();
  const anim = root2.listAnimations()[0];
  if (!anim) { console.warn('sem clip p/ estado', state); continue; }
  for (const ch of [...anim.listChannels()]) {
    const name = ch.getTargetNode()?.getName() || '';
    if (ch.getTargetNode()?.getName() === 'root') { anim.removeChannel(ch); continue; }
    const mapped = MAP[name];
    if (!mapped) { anim.removeChannel(ch); continue; }
    ch.getTargetNode().setName(mapped);
    if (mapped === 'Hips' && ch.getTargetPath() === 'translation') {
      const out = ch.getSampler().getOutput();
      const arr = Float32Array.from(out.getArray());
      const x0 = arr[0], z0 = arr[2];
      for (let i = 0; i < arr.length; i += 3) { arr[i] = x0; arr[i + 2] = z0; }
      out.setArray(arr);
    }
  }
  anim.setName(state);
  await doc2.transform(prune({ keepLeaves: true }));
  await io.write(`${outDir}/${state}.glb`, doc2);
  exported++;
}
console.log(`ok: ${exported} clipes por estado em ${outDir}/<state>.glb`);
