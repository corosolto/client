# M4 retarget pilot — donor compatibility

This report was generated before the candidate. Donor geometry, materials, skins and textures are inspection-only and are forbidden from candidate export.

## Sources inspected

- `m4a1_animated_low_poly.glb`: one 80-bone rig; discrete `Fire` (0–4), `Reload` (0–44), `Draw`, and `Hide` actions; explicit `Gun_052`, `Mag_054`, wrist and camera-controller bones; no camera object.
- `hk_416_a7_fps_animation.glb`: two rigs (44 and 12 bones); one monolithic `Scene` action from 0.8–608; weapon bones exist (`ARMA_043`, `CARGADOR_051`) but there is no discrete clip segmentation and no camera object.
- approved `pistol-hires.glb`: one 52-bone hand rig with the literal hand mesh/material contract and the project camera.
- project `m4.glb`: one welded project-owned mesh, 7,468 source vertices and one project material.

## Compatibility result

- Exact bone-name overlap between either donor and the approved hand rig is only `_rootJoint`. Direct action copying is incompatible.
- M4A1 is the primary motion donor because it exposes the required fire/reload clips and explicit weapon/magazine pivots.
- HK416 is secondary pose reference only. Slicing its 607-frame `Scene` clip without authored markers would reintroduce manual procedural timing.
- The M4A1 camera-controller bones may inform recoil direction, but neither donor provides an actual camera object. ADS must use the approved project camera aligned to the project M4 sights.

## Retarget contract

- Arms, wrists and trigger index use an explicit semantic map; no donor armature is exported.
- The project M4 receives explicit project-owned sockets: `GripSocket`, `TriggerSocket`, `SupportSocket`, `MagwellSocket`, and `M4MagazinePivot`.
- `Gun_052` drives `CoroWeapon`; `Mag_054` drives only the authored project magazine pivot.
- The right wrist and index are constrained to grip/trigger sockets after motion transfer. The left wrist follows the support socket except during reload, when it follows the magazine pivot sampled from the donor action.
- Candidate review frames are Idle, Fire 0/2/4, Reload 0/9/18/26/44, and ADS.

## Decision

Proceed with the M4A1 donor for motion only. Reject automatically if the dominant wrist-to-grip or index-to-trigger offset changes, if the support wrist loses the magazine during reload, if donor visual assets appear in the export, or if the project M4’s welded topology prevents a clean magazine silhouette.
