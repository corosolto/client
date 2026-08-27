# M4 retarget pilot — visual QA

Status: **REPROVADO — não integrar e não propagar**.

Browser evidence: `browser-qa/browser-contact-sheet.png`, captured from the exported candidate GLB at
`http://127.0.0.1:8877/artifacts/viewmodels/coro-auto/m4-retarget-pilot/browser-qa/index.html`.

## What the strategy improved

- The M4A1 donor supplied discrete fire/reload timing and weapon/support trajectories instead of a hand-authored procedural timeline.
- The exported GLB contains no donor mesh, material, texture, skin, or armature. Its only meshes are the project M4, the literal approved Coro Solto hands, and the authored project magazine.
- Five explicit project-owned sockets and the `Idle`, `Shoot`, and `Reload` actions survive export.
- The replacement magazine is one continuous closed curved body with the project’s dark metal treatment; it no longer reads as stacked boxes.
- Recoil is short and readable.

## Blocking failures

- The incompatible donor and target bone frames still prevent a professional hand result: dominant fingers cover the receiver and do not read as a firm grip with the index on the trigger.
- The support wrist follows the donor trajectory, but its palm remains visibly separated from the magazine at R9/R18/R26.
- R18 pushes the weapon to the right edge, so the five-state reload is not consistently framed.
- The insertion state is ambiguous and does not prove contact with the magwell.
- ADS is centered but visually obstructed by the rear sight/carry-handle assembly and hands.

## Decision

The retarget strategy is structurally cleaner than the procedural pilots, but this candidate fails both contact and framing. The M4 remains blocked and no other automatic weapon may inherit these actions. A viable continuation requires a dedicated rifle-hand rig/topology or a hand-authored correspondence layer that corrects donor-to-project bone frames before baking.
