# Operação Flávio — Gameplay, Map and Bot Improvements

Date: 2026-11-04, updated 2026-11-05
Branch: `feat/operacao-flavio-improvements-20261104`
Status: PR #1232 open; verified candidate; no merge or deployment

## Scope

Integrated PR #1158 into the current mainline, corrected escort authority, online lifecycle, bot behavior, map geometry, combat readability and mobile cost, then ran a second owner-feedback gauntlet for enemy respawn isolation, real cover/hiding, stable bot movement, 6×6 roles/loadouts, conflict routes and the public golden pistol viewmodel. A third localhost replay on 2026-11-05 fixed local factory viewmodel serving, right-click ADS before pointer lock, fixed enemy respawn bases, lateral flank routes and apron density. Javaporcos and the other existing modes were used as regression controls.

## Gameplay and online behavior

- Dedicated online servers simulate the escort and can award a B victory; remote clients mirror authoritative snapshots.
- The eight-second respawn wave is authoritative online. Remote clients no longer recalculate objective state between snapshots.
- Match end respects configured rounds and no longer reads nonexistent horde rules or territory fields.
- VIP obstruction triggers physical path replanning. Unseen threats expire instead of freezing the escort indefinitely.
- Safe spawn candidates validate collision, route and distance.
- Online objective reset and round-end audio work for both escort and horde.
- Enemy respawn is base-only at the four fixed E apron positions near the aircraft, each with yaw 0 facing the convoy; no forward mobile spawn or boarding-lounge candidate can shorten the approach.
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
- West/east roamers follow exported lateral service routes through the hangar and then keep lateral offset on the central checkpoint; vanguard progress remains monotonic when the convoy checkpoint retreats.
- Right-click on an unlocked canvas requests pointer lock and queues ADS, so the first aim click engages as soon as the browser grants lock; releasing the button before lock cancels the pending state, as does `_releaseInput`.
- Escort destinations, animation bands, formation holds and physical depenetration are smoothed/hysteretic. Measured browser flicker fell from repeated body flashing to one normal death transition in twelve seconds.
- Stable formation guards reroute every 0.37 s, pocketed guards keep the 0.28 s escape cadence and the direct-escape hold is 0.75 s; swap/orbit/march/pocket flicker scenarios and their mutants stay green with the fixed E base and denser apron.
- The pistol now launches with the public golden PT-38 (`gold#pistol`), including functional ADS sockets; legacy procedural fallback is no longer silently selected in normal play.
- VIP always respawns with armor 100, helmet enabled and a visible PT-38 with working fire/reload behavior.

## Map and presentation

- Airport chairs use human-scale dimensions and aligned colliders.
- Five connected service routes reach boarding, with additional solid cover and lateral cover points.
- Prop yaw is reflected in collision boxes. Aircraft collision separates fuselage and wings without blocking boarding.
- Door routes are explicit in the graph, and graph construction uses local candidates rather than all-pairs checks.
- Render-only ground operation surrounds boarding: ten cones, four wheel chocks, tire marks, oil stains and asphalt patches, service valves/cables, two baggage carts with 14 bags, a translucent perimeter fence with north run, distant maintenance hangars, windsock and an off-play-area fuel truck. None registers collision or occlusion.
- The map now exposes 43 role/zone cover slots and at least two cover choices within 8 m of every checkpoint before boarding.
- Boarding lounge and apron conflicts use real airport objects: counters, planters, seat rows, GPUs, containers, baggage tugs and service vehicles. Both attacker approach lanes have balanced tall cover.
- Thirteen render-only amber checkpoint rings and distant ridge volumes improve route and horizon readability without adding collision.
- Boarding stairs are geometrically tucked against the fuselage, with a service vehicle as hard cover at their base.
- Spawn orientation shows the escort route instead of the terminal wall.
- Low profile avoids transmission and reduces decorative shadows while preserving solid-cover shadows and geometry.

## Verification exercised

- `npm run eval:operacao-flavio`: complete escort suite and expected mutants after the third replay.
- `npm run eval:operacao-reset`: round reset plus fixed-base respawn ruler and all five respawn mutants.
- `npm run eval:ads1p-public`: public ADS alignment plus the pointer-lock/right-click ADS ruler and `sem-ads-lock`/`cancela-mouseup` mutants.
- `npm run eval:vm-placar`: 26-weapon image scoreboard in 3:2 and 16:9, including the retuned factory M92, with all five scoreboard mutants.
- `npm run eval:melee-vm`, `npm run eval:javaporcos-client-room` and `npm run eval:javaporcos`: viewmodel and horde regression controls.
- `npm run eval:operacao-flavio:browser-gate`: self-hosted Chromium with real private viewmodel products, autonomous escort progress, real cover/crouch, VIP death, boarding cinematic and four map views.
- `npm run syntax`, `npm run eval:comentario`, `npm run docs:check` and `npm run arch:check`.

Evidence captures:

- `artifacts/operacao-flavio/01-terminal.png`
- `artifacts/operacao-flavio/02-seguranca.png`
- `artifacts/operacao-flavio/03-hangar.png`
- `artifacts/operacao-flavio/04-apron.png`
- `artifacts/flavio-final-chairs-routes.png`
- `artifacts/flavio-final-vip-armed.png`

## Remaining limits
- Vision review of the final apron still rates composition as partial: the right side and stand are populated, while the left horizon and distant silhouettes remain simple/low-poly. The ground operation closes the playable apron visually, but broader art direction (richer asphalt material, more detailed distant buildings and a second parked aircraft) remains follow-up.

- No physical Android/iOS device test or long human playtest was performed.
- No real dedicated backend/client pair was launched; backend PR #196 still requires its own update and compatibility evidence.
- Browser checks used the local development server, not production or a store shell.
- This is a local candidate, not a claim of release readiness or an 8/9 visual rating.
