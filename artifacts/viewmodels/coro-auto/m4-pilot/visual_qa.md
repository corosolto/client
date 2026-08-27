# M4 automatic-family pilot — visual QA

Decision: **pilot generated; propagation rejected**.

The three contact sheets were inspected at 3:2 after the second build. The
first build was rejected because the M4's muzzle axis was reversed relative to
the rifle rig; the corrected build is the evidence retained here.

## Idle

- Subject dominance and framing: pass. The weapon stays in the lower-right
  play area and does not cover the center.
- Silhouette stability: pass across frames 0, 40 and 80.
- Two-hand contact: partial. The support hand wraps the handguard. The firing
  fingertips reach the trigger/grip region, but the palm heel is not fully
  seated around the M4 pistol grip.

## Fire

- Motion coherence: pass. Recoil is restrained and returns to the idle pose.
- Framing and silhouette: pass in frames 0, 5 and 10.
- Contact: partial for the same firing-palm gap seen in idle.

## Reload

- Motion is present and the action returns to the idle pose.
- Frames 48–60 show the support hand approaching the replacement magazine and
  receiver, but the intermediate magazine travel is not continuously held.
- Frame 60 is tightly cropped and loses clear separation between hand,
  magazine and receiver.
- Result: fail for propagation. Retarget the support-hand/magazine interval and
  seat the firing palm before using this registration on another rifle or SMG.

## Export truth

- GLB contains `Idle`, `Shoot` and `Reload` actions.
- Export selection contains only the project M4 body/two project-M4 magazine
  copies, project anatomy, the rig and the viewmodel camera.
- No source weapon object, weapon material or weapon skin is selected.
- Build-time nearest-surface readings at idle are informational only: left
  0.000819 m, right 0.003976 m. The first rejected build proved why these
  numbers cannot replace visual inspection.

No family propagation was performed.
