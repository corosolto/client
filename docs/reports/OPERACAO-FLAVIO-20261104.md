# Operação Flávio — Gameplay, Map and Bot Improvements

Date: 2026-11-04, updated 2026-11-06
Branch: `feat/operacao-flavio-improvements-20261104`
Status: PR #1232 open; verified candidate; no merge or deployment

## Scope

Integrated PR #1158 into the current mainline, corrected escort authority, online lifecycle, bot behavior, map geometry, combat readability and mobile cost, then ran a second owner-feedback gauntlet for enemy respawn isolation, real cover/hiding, stable bot movement, 6×6 roles/loadouts, conflict routes and the public golden pistol viewmodel. A third localhost replay on 2026-11-05 fixed local factory viewmodel serving, right-click ADS before pointer lock, fixed enemy respawn bases, lateral flank routes and apron density. Javaporcos and the other existing modes were used as regression controls.

A fourth owner playtest on 2026-11-06 drove ten fixes:

- **PT-38 viewmodel.** The public golden pilot was both giant (1.99×, from its own 34° camera) and wrong: it showed the back of the slide with blob hands. Since the second playtest, the unpainted PT-38 is the factory X18 again (0.99×, green magazine, same composition as the rest of the arsenal). The golden stays for the gold paint route, reframed with `goldFrame` to 1.05×. The pistol is back in the scoreboard hash, guarded by the `quadro-pistola` mutant.
- **HUD.** The escort HUD shows only progress and time. Escort count and contested/cover state no longer leak the defence's tactics.
- **Player as VIP.** Picking Zero Um on side B makes the player the VIP, offline only, with no duplicate senador bot. The online roster stays server-owned.
- **Routes and aggression.** There are three deterministic VIP route variants per round (middle/west/east, derived from `roundNum`). The VIP pushes under visible threat with two or more guards and boards while escorted even when contested. Flankers act as decoys across three or more lanes.
- **Prop scale.** Vehicles, ground equipment, counters, barriers and planters render at real scale with colliders equal to the render; the boarding stairs are real scale and walkable. Standing concealment comes from genuinely tall props (container stacks, 1.8 m planters, the 1.95 m service car).
- **Crash fix.** A guard formation hold no longer crashes `_updateBot` after the VIP dies.
- **Boarding.** The stairs stood on the plane's west side with the platform facing away, and the final checkpoint was on the other side of the fuselage, so Flávio "could not board". The stairs now sit on the east (+x) side of the fuselage at the cinematic door (`z 52`). The platform touches the door and the steps descend outward. The aircraft GLB is mirrored in x so its painted door faces the stairs. An "EMBARQUE DO FLÁVIO ▼" billboard over the door replaces the amber checkpoint floor rings, which read as unexplained circles in the lounge. A B boarding win now reads "FLÁVIO FUGIU PROS EUA". The blue ring under allies is the pre-existing global team halo (`_makeTeamMark`, all modes, `?teammark=0`); it grows from 1.45 m to 1.9 m during the 2 s spawn protection. New mutants cover the inverted stairs, the stairs on the wrong side, the unmirrored aircraft, the label (no arrow anchor, occluding), a ring back in the lounge and the old title/HUD text.
- **Climbing the stairs.** The next playtest still found the stairs blocked: they were a solid box and boarding counted at the foot. Now they are walkable. `groundHeightAt` follows the GLB treads up to a platform at the door sill (1.57 m; stairs height 2.22 m), and each step stays below the 0.55 m `STEP_H`. Every route ends on the platform, `(2.3, 52)`, and boarding only counts within 0.45 m of it, for both the bot VIP and the player VIP. The nav graph climbs on three axis nodes without side shortcuts, attackers can climb too (normal line of sight), and flankers hold their vanguard at the foot. In real Chrome the player (keyboard W) and the bot VIP climbed to 1.57 m and won all three routes; at the foot nothing counted. New mutants cover a solid stairs box, a flat floor, a step above `STEP_H`, graph edges cutting the stair side, boarding at the foot (bot and player) and a vanguard on the platform.
- **Automatic boarding.** The owner then saw a blue guard crouched on the platform and boarding never finished ("tinha que ser automático"). B now wins on the frame Flávio enters the stairs zone (`escortBoardingZone`, a 1 m capsule along foot → platform), with or without escort and even when contested. This applies to the bot VIP and the player VIP, offline and on the authoritative server. The 3 s `BOARDING_TIME` hold, the 0.45 m platform radius and `boardedFor` (also in the snapshot) are gone. Guard and flanker destinations never land on the stairs footprint; attackers may still climb. In real Chrome, with a guard re-parked on the platform every frame, the player (keyboard W) and the bot VIP won all three routes 17–21 ms after entering the zone, still on the ground at the foot (y 0). New mutants cover a top-only zone (bot and player), guards routed onto the stairs, the player check disabled, and boarding that requires a clear apron or an escort.
- **Around the aircraft.** The back of the plane was out of bounds (north limit `z 57`), and the 16 × 3.2 m wing and 3.4 × 12 m fuselage boxes were invisible walls. The limit is now `z 64`, and the plane colliders follow the GLB mesh at body height and never exceed the render. The service car and barrier-kit scenery moved out of the way, and a 12-point `aircraftRing` joins the nav graph. The west route now passes south of the ULD stack, because the real nose sits flush against it. In real Chrome the player walked the full ring with W in 13.8 s (including five photo stops), reaching x −6.22…6.64 and z 42.5…61.4, always on the ground. New mutants cover the old wing box, a fuselage wider than the render, the old north limit, the car against the wingtip and the ring missing from the graph.

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
- The unpainted pistol launches with the factory X18 (`fab#pistol`); the public golden PT-38 (`gold#pistol`, functional ADS sockets) serves the gold paint route. Local DEV proxies `/private-assets/`, so normal play does not fall back to the legacy viewmodel.
- VIP always respawns with armor 100, helmet enabled and a visible PT-38 with working fire/reload behavior.

## Map and presentation

- Airport chairs use human-scale dimensions and aligned colliders.
- Five connected service routes reach boarding, with additional solid cover and lateral cover points.
- Prop yaw is reflected in collision boxes. Aircraft collision separates fuselage and wings without blocking boarding.
- Door routes are explicit in the graph, and graph construction uses local candidates rather than all-pairs checks.
- Render-only ground operation surrounds boarding: ten cones, four wheel chocks, tire marks, oil stains and asphalt patches, service valves/cables, two baggage carts with 14 bags, a translucent perimeter fence with north run, distant maintenance hangars, windsock and an off-play-area fuel truck. None registers collision or occlusion.
- The map now exposes 43 role/zone cover slots and at least two cover choices within 8 m of every checkpoint before boarding.
- Boarding lounge and apron conflicts use real airport objects: counters, planters, seat rows, GPUs, containers, baggage tugs and service vehicles. Both attacker approach lanes have balanced tall cover.
- Distant ridge volumes improve horizon readability without adding collision. The amber checkpoint floor rings were removed after the 06/11 playtest. A render-only "EMBARQUE DO FLÁVIO ▼" billboard above the aircraft door now marks the boarding point for both teams.
- The boarding stairs meet the aircraft door on the east side and are walkable. The real GLB platform touches the door at sill height and the steps descend outward. Every route reaches the foot, where boarding triggers automatically. The aircraft can be walked all the way around, with colliders that match the mesh.
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
- Golden PT-38 (paint route only): the magazine ruler measures the pilot rig and reports `pente some na tela` at about 45% of the reload; the pilot hand rig remains declared debt `RIG:pistol@pintura`. The unpainted X18 is green.
- Player-as-VIP works offline only. Online rosters come from the backend, which must also make a senador pick the VIP.
- This is a local candidate, not a claim of release readiness or an 8/9 visual rating.
