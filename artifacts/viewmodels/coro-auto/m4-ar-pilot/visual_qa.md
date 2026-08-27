# M4 AR family pilot — visual QA

Status: **REPROVADO — não integrar e não propagar**.

Browser evidence: `browser-qa/browser-contact-sheet.png`, captured from the exported GLB in Chrome at
`http://127.0.0.1:8877/artifacts/viewmodels/coro-auto/m4-ar-pilot/browser-qa/index.html`.

## What passed

- The candidate reuses exactly one literal pistol-pilot hand mesh and its approved glove material; no third hand or duplicate hand mesh is present.
- The M4 body is the project's own weapon asset. No donor weapon mesh, material, or skin was exported.
- Idle, Shoot, and Reload actions are present in the GLB.
- Fire has a short, readable recoil peak in both Blender and the browser, and both hands remain present.
- The magazine is a separate, closed, authored mesh with its own feed tower, floor plate, material, pivot, and animation bone.
- ADS is centered and does not clip the camera plane.

## Blocking failures observed

- The dominant hand does not read as a firm rifle grip and its index finger is not visually proven on the trigger.
- The support hand is oversized in silhouette and does not read cleanly as a handguard grip at idle or the final pose.
- In the detach and carry states, the authored magazine's visible silhouette is dominated by its feed tower and floor components; it reads as stacked gray boxes, not as a finished curved M4 magazine.
- In the insert state, the magazine is mostly obscured by the support hand and receiver. The browser sheet cannot prove continuous hand-to-magazine contact or an unambiguous insertion.
- The ADS rear-sight/carry-handle silhouette and hands obstruct the sight picture even though the camera itself does not intersect the weapon.

## Decision

The validator passes the isolated mesh/action checks but fails both the dominant-wrist attachment check and the browser visual gate. The AR family remains blocked. No asset was placed under `public/`, and no other automatic weapon was generated.

The next viable route is a dedicated rifle-hand topology/rig pass and a magazine remodel whose broad curved body is the dominant camera-facing silhouette. Continuing to rotate or offset the current welded hand topology would be another approximation and is not suitable for integration.
