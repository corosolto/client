// Turn Meshy rifle-hold clips into the game's shared bot clips.
//
// Meshy delivers each clip as a full-mesh GLB (~5MB) whose animation carries big
// ROOT MOTION (the Hips node translates metres across the clip). Our bots are moved
// in code, so we must:
//   1. strip mesh/skin/material/texture (keep bones + animation),
//   2. force in-place: freeze the Hips X/Z translation (keep Y bob),
//   3. optionally FREEZE the whole clip to one static pose (for idle / crouch stances).
// All Meshy humanoid rigs share bone names, so one processed clip binds to every char.
//
// usage: rifle-anims.mjs <in.glb> <out.glb> inplace
//        rifle-anims.mjs <in.glb> <out.glb> freeze <t_seconds>
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';

const [, , inPath, outPath, mode, tArg] = process.argv;
if (!inPath || !outPath || !mode) { console.error('usage: rifle-anims.mjs <in> <out> inplace|freeze [t]'); process.exit(1); }

const io = new NodeIO();
const doc = await io.read(inPath);
const root = doc.getRoot();
const buf = root.listBuffers()[0];

// --- strip geometry (same as strip-anim.mjs) ---
root.listMeshes().forEach((m) => { m.listPrimitives().forEach((p) => p.dispose()); m.dispose(); });
root.listNodes().forEach((n) => n.setMesh(null));
root.listSkins().forEach((s) => s.dispose());
root.listMaterials().forEach((m) => m.dispose());
root.listTextures().forEach((t) => t.dispose());

const anim = root.listAnimations()[0];
const isHipsTranslation = (ch) => /hips/i.test(ch.getTargetNode()?.getName() || '') && ch.getTargetPath() === 'translation';

if (mode === 'freeze') {
  const t = parseFloat(tArg || '0');
  for (const ch of anim.listChannels()) {
    const s = ch.getSampler();
    const times = s.getInput().getArray();
    const out = s.getOutput();
    const vals = out.getArray();
    const sz = out.getElementSize();
    // nearest frame to t
    let idx = 0, best = Infinity;
    for (let i = 0; i < times.length; i++) { const d = Math.abs(times[i] - t); if (d < best) { best = d; idx = i; } }
    const el = Array.from(vals.slice(idx * sz, (idx + 1) * sz));
    // keep Hips X/Z at frame 0 so the frozen pose stays centred over the group origin
    if (isHipsTranslation(ch)) { el[0] = vals[0]; el[2] = vals[2]; }
    const nIn = doc.createAccessor().setType('SCALAR').setBuffer(buf).setArray(new Float32Array([0]));
    const nOut = doc.createAccessor().setType(out.getType()).setBuffer(buf).setArray(new Float32Array(el));
    s.setInput(nIn).setOutput(nOut).setInterpolation('STEP');
  }
} else { // inplace
  for (const ch of anim.listChannels()) {
    if (!isHipsTranslation(ch)) continue;
    const out = ch.getSampler().getOutput();
    const arr = Float32Array.from(out.getArray());
    const x0 = arr[0], z0 = arr[2];
    for (let i = 0; i < arr.length; i += 3) { arr[i] = x0; arr[i + 2] = z0; } // freeze X/Z, keep Y
    out.setArray(arr);
  }
}

await doc.transform(prune({ keepLeaves: true }));
await io.write(outPath, doc);
console.log(`ok: ${outPath} (${mode}${mode === 'freeze' ? ' @' + tArg + 's' : ''})`);
