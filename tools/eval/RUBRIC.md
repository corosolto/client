# Asset Quality Rubric — CS BRASIL

**Purpose.** Replace subjective "looks good" with **externally-anchored, measurable**
criteria. Every rule cites a production/game-dev source. The `eval` harness
renders each asset multi-angle *in-engine* (never the generator's beauty shot) and
reports PASS/FAIL + numbers. Only the genuinely aesthetic residue is escalated to a
human via a contact sheet. The model does **not** issue "está bom" verdicts.

Sources:
- Left-hand weapon IK (the industry pipeline): [Zag's Blog — The Right Way to Do Left-Hand Weapon IK](https://zaggoth.wordpress.com/2019/01/26/ue4-tutorial-the-right-way-to-do-left-hand-weapon-ik/), [Karl Lewis — Immersive FPS Part 2: Hand IK](https://karllewisdesign.com/unreal-immersive-fps-part2/)
- Stylized character art direction / proportions / silhouette: [Nasty Rodent — Stylized 3D Characters Playbook](https://nastyrodent.com/stylized-3d-characters-art-direction-principles/), [Polycount — How to make Stylized Characters for Games](https://polycount.com/discussion/173585/how-to-make-stylized-characters-3d-for-games)
- Web/Three.js budgets & delivery: [utsubo — 100 Three.js Performance Tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [Codrops — Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/), [Discover three.js — Tips & Tricks](https://discoverthreejs.com/tips-and-tricks/)

---

## A. Third-person weapon hold  (the thing that failed the IK video)

Industry pipeline (must implement ALL steps; skipping any = the exact defects seen
in the first test — gun at face / inverted / hand through weapon):

1. **Named grip socket on every weapon** at the foregrip/handguard (`IK_Hand`),
   consistent name across weapons. Support hand targets the *socket*, not a guessed
   offset. [Zag]
2. **Weapon attached to the dominant-hand socket**, inheriting hand motion. [Zag]
3. **Support-hand two-bone IK** (`upperarm_l → hand_l`), low iterations to avoid
   jitter, targeting the weapon socket **converted into the right-hand's bone space**
   (this is what stops the support hand drifting off during aim). [Zag]
4. **IK applied LAST**, after the additive **upper-body aim pose** (aim offset).
   Missing the aim pose = weapon dangles/points wrong (our bug #1). [Zag/Karl Lewis]
5. **Wrist/weapon orientation controlled** so the muzzle follows the aim vector
   (missing = "gun pointing at the face"). [Karl Lewis]
6. **IK alpha toggles off** during reload / weapon swap / melee. [Zag]

Measurable gates (per weapon, rendered in-engine):
- `barrel_vs_aim_deg` ≤ **12°** (angle between muzzle vector and character aim). FAIL if gun points at self/up.
- `support_hand_to_socket_cm` ≤ **3 cm** (only for two-handed weapons).
- `dominant_hand_to_grip_cm` ≤ **3 cm**.
- `hand_weapon_interpenetration` = **none** (no hand mesh passing through the weapon beyond 1 cm).
- Hold **survives locomotion**: gates still pass on walk/run frames.

> Note: with the **baked-pose Mint mesh** (hands sculpted around the weapon) the wrap
> is authored, so 3–4 are naturally satisfied; with **runtime IK on open hands** the
> wrap never closes → interpenetration gate is the honest discriminator between the two.

## B. Character proportions & silhouette

- **Silhouette shape sanity (GATE):** aspect (H/W) in **1.4 – 2.6** and fill **0.20 – 0.70**
  for a standing figure. Flags non-human body plans (e.g. round mascot) for review. [Nasty Rodent]
- **Head size / proportion — HUMAN-JUDGED, not auto-gated.** Empirically measured and
  rejected two proxies: bone-based head-units is ~constant across our shared Meshy rig
  (5.24 for everyone); silhouette head-width is confounded by hair/hats/tall heads (the
  big-headed alien scored *lowest*). So head size goes to the **contact sheet** for the
  human, not a false gate. (This is the discipline: a proxy that mis-ranks is worse than none.)
- `feet_on_ground` is an in-engine placement concern (the game drops feet to y=0), not an
  asset gate — reported as info only.
- Face detail / signature-motif-survives-distance: visual, escalated to contact sheet. [Polycount]

## C. Web / Three.js technical budget

- `triangles` per character ≤ **40k** (many bots on screen; hero band 50–100k is for
  single focal characters, not a firefight). Total scene < **500k**. [utsubo, Codrops]
- Textures **power-of-two**, ≤ **1024²**; prefer **KTX2/Basis** (currently webp — gap noted).
  Raw PNG/JPEG in VRAM is the top memory sink. [utsubo]
- Delivery: **GLB**, Draco mesh + KTX2 via **gltf-transform**; **never quantize skinned meshes**. [utsubo]
- `draw_calls` tracked via `renderer.info.render.calls` (single most important metric). [utsubo]

## D. Rig integrity

- Expected bones present (`Hips, Spine*, Left/RightArm, ForeArm, Hand, UpLeg, Leg, Foot, Head`).
- No NaN transforms; single skin; shared skeleton across cast (rebind clips by bone name).

---

## Escalation (where the human decides)

Objective gates A–D auto-pass/fail and auto-reject failures for regeneration. What
remains — "does the caricature read as *this character*", overall appeal, style match
to reference board — is presented as a **contact sheet** (grid of candidates +
numbers). The human judges finalists; their choices calibrate the reference board.
The model's role is produce + measure + present, never the taste verdict.
