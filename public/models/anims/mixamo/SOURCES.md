# SOURCES — models/anims/mixamo (rifle locomotion pack)

Production-grade rifle-hold clips retargeted onto the shared Meshy rig
(`tools/retarget-mixamo.mjs`). Delivered as an ALTERNATIVE pack: the game keeps
using `models/anims` unless `?animdir=models/anims/mixamo` is passed.

## Provenance

All 8 clips are **Adobe Mixamo** mocap animations (rifle set), mirrored as Unity
FBX re-exports in the public repo:

- Mirror: https://github.com/S-N-D-R/UnityMixamoLibrary (`Assets/MixamoAnimations/Weapons/`, branch `master`, LFS)
- Mixamo: https://www.mixamo.com (Adobe)

| state      | source file (Mixamo name)        | duration |
|------------|----------------------------------|----------|
| idle       | rifle_aim_idle.fbx               | 3.10s    |
| walk       | rifle_aim_walk_1.fbx             | 1.00s    |
| run        | rifle_aim_run.fbx                | 0.73s    |
| shoot      | rifle_fire_single.fbx            | 1.17s    |
| death      | rifle_death_back.fbx             | 1.77s    |
| crouch     | rifle_crouch_aim_idle.fbx        | 6.70s    |
| crouchwalk | rifle_crouch_aim_walk.fbx        | 1.70s    |
| jump       | rifle_jump.fbx                   | 1.93s    |

## License

Mixamo animations are **free to use in games and media** (royalty-free, including
commercial) per Adobe's Mixamo FAQ/EULA:
https://helpx.adobe.com/mixamo/faq/mixamo-faq.html
Raw redistribution of the unmodified animation assets is NOT allowed — do not
re-publish the source FBX themselves; the retargeted derivative clips baked into
a game are the permitted use. The mirror repo carries no additional license of
its own; the Mixamo terms govern.

## Retarget method (`tools/retarget-mixamo.mjs`)

- Source rig: Mixamo skeleton (T-pose rest), loaded with three's FBXLoader and
  sampled through an AnimationMixer at 30 fps (LoopOnce+clamp so the last frame
  is the true end pose — LoopRepeat wraps `setTime(dur)` to frame 0).
- Target rig: `models/characters/mst.glb` rest hierarchy (26 mapped bones,
  `neck` lowercase), re-bound by bone name onto every character at runtime.
- Rotations: WORLD-frame delta per bone/frame:
  `tgtWorld = srcWorld ⊗ srcRestWorld⁻¹ ⊗ tgtRestWorld`, then
  `tgtLocal = tgtParentWorld⁻¹ ⊗ tgtWorld`.
  (The older ue2 script used `tgtRest ⊗ srcRest⁻¹ ⊗ srcWorld`, which bakes the
  per-bone axis-convention difference into the pose — arms came out mirrored.)
- Hips translation: X/Z pinned to the target rest (IN PLACE — bots move in code),
  Y bob scaled by `srcHipsY / srcBindHipsY` against the BIND (standing) height so
  crouch/jump/death keep their true depth.
- Measured natural speeds (iktest `HARNESS.measureStanceSpeed`, mst):
  walk 1.43 m/s, run 2.08 m/s, crouchwalk 0.75 m/s — use with
  `?wref=1.43&rref=2.08&cref=0.75` (or as new WALK_REF/RUN_REF/CROUCH_REF if the
  pack becomes default). Note the aim-stance clips are ~40° hip-bladed by design
  (rifle shouldered, muzzle forward).

Regenerate:
`node tools/retarget-mixamo.mjs /tmp/mixamo-src public/models/characters/mst.glb public/models/anims/mixamo`
(source FBX + `npm i three@0.160.0` live in `/tmp/mixamo-src`; re-download from
the mirror above if wiped.)
