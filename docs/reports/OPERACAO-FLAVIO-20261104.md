# Operação Flávio — Gameplay, Map and Bot Improvements

Date: 2026-11-04
Branch: `feat/operacao-flavio-improvements-20261104`
Status: PR #1232 open; verified candidate; no merge or deployment

## Scope

Integrated PR #1158 into the current mainline, corrected escort authority, online lifecycle, bot behavior, map geometry, combat readability and mobile cost, then ran a second owner-feedback gauntlet for enemy respawn isolation, real cover/hiding, stable bot movement, 6×6 roles/loadouts, conflict routes and the public golden pistol viewmodel. Javaporcos and the other existing modes were used as regression controls.

## Gameplay and online behavior

- Dedicated online servers simulate the escort and can award a B victory; remote clients mirror authoritative snapshots.
- The eight-second respawn wave is authoritative online. Remote clients no longer recalculate objective state between snapshots.
- Match end respects configured rounds and no longer reads nonexistent horde rules or territory fields.
- VIP obstruction triggers physical path replanning. Unseen threats expire instead of freezing the escort indefinitely.
- Safe spawn candidates validate collision, route and distance.
- Online objective reset and round-end audio work for both escort and horde.
- Enemy respawns are forward/base-only, never in the boarding lounge, and escape to boarding remains pathable at every checkpoint.
- Dedicated servers apply guard armor and helmets; pure remote clients remain snapshot-driven.
- Shelter selection reacts only to threats currently visible to the VIP and uses a stable minimum dwell, preventing wall-hack-like information leaks and cover ping-pong.
- Escort spawn protection is telegraphed by a stable halo/shield indicator without flashing the body.
- Guard/flanker routing also reacts only to currently visible threats (or a four-second last-visible memory); enemies hidden behind walls no longer redirect formation or reserve cover.

## Bots and VIP

- Escort slots remain stable across deaths and distinct for nearby and distant defenders.
- Defenders intercept immediate threats without abandoning formation or chasing indefinitely.
- Recovery preserves physical movement, line of sight and firing rules, including low-skill bots.
- Attackers proactively approach and contest the escort instead of waiting for generic target acquisition.
- The escort supports 6×6: four direct guards carry one LMG, shotgun, rifle and sniper; two roamers pressure forward lanes. Guard kits are restored on every respawn and are more effective/durable than attackers on the authoritative server.
- Escort destinations, animation bands, formation holds and physical depenetration are smoothed/hysteretic. Measured browser flicker fell from repeated body flashing to one normal death transition in twelve seconds.
- The pistol now launches with the public golden PT-38 (`gold#pistol`), including functional ADS sockets; legacy procedural fallback is no longer silently selected in normal play.
- VIP always respawns with armor 100, helmet enabled and a visible PT-38 with working fire/reload behavior.

## Map and presentation

- Airport chairs use human-scale dimensions and aligned colliders.
- Five connected service routes reach boarding, with additional solid cover and lateral cover points.
- Prop yaw is reflected in collision boxes. Aircraft collision separates fuselage and wings without blocking boarding.
- Door routes are explicit in the graph, and graph construction uses local candidates rather than all-pairs checks.
- The map now exposes 43 role/zone cover slots and at least two cover choices within 8 m of every checkpoint before boarding.
- Boarding lounge and apron conflicts use real airport objects: counters, planters, seat rows, GPUs, containers, baggage tugs and service vehicles. Both attacker approach lanes have balanced tall cover.
- Thirteen render-only amber checkpoint rings and distant ridge volumes improve route and horizon readability without adding collision.
- Boarding stairs are geometrically tucked against the fuselage, with a service vehicle as hard cover at their base.
- Spawn orientation shows the escort route instead of the terminal wall.
- Low profile avoids transmission and reduces decorative shadows while preserving solid-cover shadows and geometry.

## Verification exercised

- `npm run eval:operacao-flavio`: complete escort suite and expected mutants after the second gauntlet.
- `npm run eval:javaporcos`: horde suite and expected mutants.
- `eval:vm-launch`, `eval:golden-skin-selection`, `eval:authored-vm`, public ADS checks and the pistol contract route.
- Cover behavior, roles/loadouts, respawn isolation, escort flicker, spawn shield, server recovery, pressure, defense, moving defense, regroup and formation proofs.
- `npm run docs:check` and `npm run arch:check`.
- Real Chromium 6×6 gameplay: 12 bots, four direct guard weapons plus two roamers, VIP equipment, route zones and flicker measurement.
- `eval:operacao-flavio:browser-gate` in `check:deploy`: self-hosted Chromium run covering autonomous escort progress, real cover/crouch, VIP death, boarding cinematic and four map views.

Evidence captures:

- `artifacts/flavio-final2-spawn.png`
- `artifacts/flavio-final2-access.png`
- `artifacts/flavio-final2-hangar.png`
- `artifacts/flavio-final2-apron.png`
- `artifacts/flavio-final-chairs-routes.png`
- `artifacts/flavio-final-vip-armed.png`

## Remaining limits
- Vision review still rates route/composition around 5–6/10: the initial patio and central access remain relatively open, exterior hangar exposure reduces contrast, and the aircraft dominates the final choke. These are explicit follow-up art-direction items, not claims of completion.

- No physical Android/iOS device test or long human playtest was performed.
- No real dedicated backend/client pair was launched; backend PR #196 still requires its own update and compatibility evidence.
- Browser checks used the local development server, not production or a store shell.
- This is a local candidate, not a claim of release readiness or an 8/9 visual rating.
