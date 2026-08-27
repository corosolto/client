# M4 final single-iteration QA

Decision: **rejected; no GLB integrated and no family propagation**.

This is the one final M4 iteration requested after the previous pilot was
rejected. The candidate was inspected in the retained Idle, Fire, four-state
Reload, and ADS sheets. The contact-sheet script reports no automated frame
warnings, but manual visual review fails the asset.

## Contract sources actually used

- Hands, hand material, skeleton, and animation source are imported literally
  from `/Users/ruben/csbrasil/client/public/models/viewmodels/coro/pistol-hires.glb`,
  the asset validated by `pistol-pilot-14`.
- The candidate contains one hand mesh with 7,438 vertices and material
  `CoroSolto_FP_Gloves`. No alternate AK hand mesh, sleeve mesh, watch mesh, or
  duplicate/third hand is present.
- Weapon geometry comes from `public/models/weapons/m4.glb`.
- The magazine candidate uses 367 original M4 vertices/faces, including the
  curved body and longitudinal ribs, with the original M4 material. No block
  approximation or donor magazine is used.

## Manual gate results

### Idle — fail

- The single support hand no longer duplicates, but the pistol wrist pose does
  not form a credible rifle handguard grip. Its palm dominates the silhouette
  and hides the finger wrap.
- The dominant pistol hand remains mechanically attached to `CoroWeapon`, but
  the M4 pistol grip/trigger alignment is not visually clear enough to read as
  a firm firing grip.

### Fire — fail

- Motion is visible and the single hand mesh remains coherent.
- Because the base grip is not credible, stable recoil cannot promote the
  candidate to approval.

### Reload — fail

- Frame 10 places the support thumb across the top/receiver sight line.
- Frames 16 and 28 do not show a professionally readable magazine carry and
  insertion. Only the separated top edge becomes visible near the bottom of
  frame; the full curved magazine does not remain legible in the hand.
- Frame 38 returns to the same ambiguous dominant grip seen in Idle.
- The exact magazine extraction proves the source contains a usable curved
  lower shell, but its upper feed-tower faces, closed boundary, independent
  origin, and animation pivot are fused into the receiver topology. Retargeting
  those partial faces does not produce a production-ready moving component.

### ADS — fail

- The ADS camera intersects the stock/receiver volume and the sight picture is
  occluded. There is no acceptable centered sight line.

## Required asset work

Further transform offsets would repeat approximation rather than repair the
source. A professional M4 needs:

1. a remodeled, closed, independently authored magazine with correct upper
   feed tower, original-compatible UV/material, origin, and insertion pivot;
2. a dedicated rifle hand rig/pose authored from the approved pistol hand mesh,
   with explicit strong-hand trigger/grip and support-hand handguard anchors;
3. a rifle-specific ADS camera clearance/alignment pass.

The generated candidate GLB was deleted from `public/models`. Only the builder,
source-topology evidence, and rejected QA sheets are retained. The previous
`m4-pilot.glb` remains rejected and unchanged by this iteration.
