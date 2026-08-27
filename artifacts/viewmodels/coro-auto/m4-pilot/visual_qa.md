# M4 automatic-family pilot — visual QA

Decision: **reworked pilot submitted for review; family propagation remains blocked**.

The current GLB, the fire/reload contact sheets, and the four paused browser
states below were inspected after the hand-contact and recoil rework. Passing
the numeric contract does not approve the pilot by itself.

## Idle and strong-hand contract

- The right/dominant palm is seated on the pistol grip and the index finger
  remains aligned with the trigger region.
- The dominant hand stays registered to `Rifle_metarig`: maximum exported
  drift is 0 m in Idle, 0.0000197 m in Shoot, and 0.0015986 m / 0.24708 degrees
  in Reload.
- The support hand returns to the handguard in the final reload pose.

## Fire

- The retained contact sheet shows rest, peak, and return at frames 0/5/10.
- Exported rifle recoil reaches 0.058732 m and 3.41463 degrees, then returns to
  0 m / 0 degrees at frame 10. This is short but visually distinguishable.
- Both hands remain registered to the weapon during recoil. Support-hand drift
  relative to the rifle is at most 0.001805 m / 0.20174 degrees.
- The contact-sheet analyzer reports no warnings; mean RGB differences are
  4.5227 from rest to peak and 4.5156 from peak to return.

## Reload browser evidence

Viewer URL:
`http://127.0.0.1:8877/artifacts/viewmodels/coro-auto/m4-pilot/browser-qa/index.html`

The viewer uses the exported GLB and its embedded camera. A camera-relative
headlight and increased exposure are QA-only, so the dark magazine remains
legible without changing the distributable asset.

1. `reload-release.png` — 0.833 s / frame 20 / normalized time 0.25. The
   magazine has released and the support hand visibly encloses it; the strong
   hand remains on the grip/trigger.
2. `reload-carry.png` — 1.333 s / frame 32 / normalized time 0.40. The support
   hand visibly carries the separated magazine; the strong hand remains fixed.
3. `reload-insert.png` — 2.167 s / frame 52 / normalized time 0.65. The support
   hand and magazine move together on the insertion path toward the well.
4. `reload-final.png` — 3.333 s / frame 80 / normalized time 1.00. The magazine
   is seated, the support hand has returned to the handguard, and the dominant
   hand remains on the pistol grip.

The exported support-hand/magazine relative transform drifts no more than
0.0000012 m / 0 degrees over the sampled removal and insertion intervals.
Nearest-surface distances remain 0.001730–0.002472 m during removal and
0.002469–0.004933 m during insertion. These measurements support, but do not
replace, the four visual states.

## Export truth and remaining limitation

- The GLB contains `Idle`, `Shoot`, and `Reload`, one armature, one camera, the
  project hands, and only project M4 weapon objects.
- No donor weapon object, donor weapon material, or donor weapon skin is
  exported.
- The original `public/models/weapons/m4.glb` welds its magazine triangles into
  the receiver topology. The moving magazine is therefore a simplified,
  project-authored bent prism measured from that M4 envelope. Its motion and
  contact are readable, but its silhouette lacks the source model's detailed
  curved magazine geometry.
- Browser insertion becomes partly edge-on after frame 56; frame 52 is retained
  because it most clearly shows both the carried magazine and the insertion
  direction.

No other rifle, SMG, or LMG was generated from this registration. Approval and
family propagation remain pending external visual review.
