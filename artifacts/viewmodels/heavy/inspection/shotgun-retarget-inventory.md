# Shotgun retarget inventory — inspection only

Status: **no candidate generated, no runtime integration**.

## Sources and hard boundary

- Motion/pivot donor, read-only: `/Users/ruben/Downloads/shotgun_animated.glb`
- Project weapon: `public/models/weapons/shotgun.glb`
- Approved hands: `tools/blender/viewmodels/heavy/sources/approved-project-hands.glb`
- Allowed from the donor: hierarchy, timing, mechanical pivots and socket reference transforms.
- Forbidden from the donor: weapon/hand geometry, materials, textures and skin.

## Inventory

The donor has one 6.0 s `allanims` clip with 69 channels and a 49-joint skin. It is a concatenated take, not a set of named production clips. Mechanically identifiable ranges are:

| Range (s) | Inferred role | Evidence |
|---|---|---|
| 0.000–0.433 | trigger/fire | trigger rotates about 7.6° and returns |
| 0.467–1.133 | pump cycle | pump moves -10.5744 donor units on local Z and returns |
| 1.167–2.933 | single-shell reload | slug moves 1.600–1.933; lid opens 1.700–2.167 |
| 3.000–4.233 | large weapon motion + second pump | second pump travel at 3.633–4.000 |
| 4.300–5.300 | probable idle | low-amplitude whole-weapon sway |
| 5.367–6.000 | probable equip/inspect | large whole-weapon arc |

The project shotgun is a single mesh/node with no skin, clips or separate pump/port parts. Its glTF primitive long axis is Z, with bounds `[-0.024414, -0.100586, -0.499023]` to `[0.024414, 0.100586, 0.499023]`.

The approved hand asset contains the project mesh/material (`coro_solto_heavy_hands`, `CoroSolto_FP_Gloves`) and four clips: Equip 0.375 s, Idle 3.333 s, Reload 1.583 s and Shoot 0.250 s.

## Mechanical pivots in donor glTF world space

| Part | Pivot XYZ | Motion |
|---|---:|---|
| base | `[0, 5.889426, 0.362912]` | static |
| trigger | `[0, 10.640971, 4.835823]` | fire, local-X rotation |
| lid/loading window | `[0, 9.981452, 18.270217]` | opens 1.700–2.167 |
| slug/shell | `[0, 11.152108, 24.066756]` | carry/insert reference 1.600–1.933 |
| pump | `[0, 11.306182, 43.997897]` | local-Z travel |

Along the donor base-to-pump reference axis, the initial normalized search positions are trigger 0.1025, lid 0.4104, shell insert end 0.5432 and pump 1.0. These are **not final project coordinates**; the project mesh must be visually registered because proportions differ.

## Bone compatibility

Forty-three deform names map exactly. The six required renames are:

| Donor | Approved project rig |
|---|---|
| `L_elbow_02` | `L_elbow_00` |
| `L_wrist_03` | `L_wrist_02` |
| `L_thumb1_04` | `L_thumb1_03` |
| `L_thumb2_05` | `L_thumb2_04` |
| `L_thumb3_06` | `L_thumb3_05` |
| `Joint_3_00` | `Joint_3_06` |

The complete mapping is recorded in the adjacent JSON. Donor pole controls and mechanical nodes are references only and must not be exported.

## Retarget plan

1. Import the donor into an isolated temporary collection, extract the two useful time ranges, then remove all donor renderable data from the export selection.
2. Retarget only transforms to the approved rig. Keep the approved project hand mesh/material unchanged.
3. Register `ShotgunGrip`, `ShotgunPump`, `ShotgunPort` and `ShotgunTube` non-rendering sockets directly against the intact project shotgun.
4. Lock the dominant chain (`R_arm_024`, `R_elbow_025`, `R_wrist_026`) to `ShotgunGrip` throughout Reload.
5. Use a closed project-authored shell with its own origin. Parent its control rigidly to the support wrist from pickup through carry.
6. Blend the shell pivot continuously from the support-hand offset to `ShotgunPort`; finish just inside `ShotgunTube` and hide only after crossing the port plane.
7. Reject the result if donor renderable data survives, the shell separates from the support hand before contact, or it fails to contact the port during insertion.

## Current decision

The sources are suitable for a controlled retarget experiment, but **not yet for a candidate**. The donor clip still needs explicit cutting, and the monolithic project mesh needs project-specific socket registration.
