# Operação Flávio — Gameplay, Map and Bot Improvements

Date: 2026-11-04
Branch: `feat/operacao-flavio-improvements-20261104`
Status: verified local candidate; no merge or deployment

## Scope

Integrated PR #1158 into the current mainline and corrected escort authority, online lifecycle, bot behavior, map geometry, combat readability and mobile cost. Javaporcos and the other existing modes were used as regression controls.

## Gameplay and online behavior

- Dedicated online servers simulate the escort and can award a B victory; remote clients mirror authoritative snapshots.
- The eight-second respawn wave is authoritative online. Remote clients no longer recalculate objective state between snapshots.
- Match end respects configured rounds and no longer reads nonexistent horde rules or territory fields.
- VIP obstruction triggers physical path replanning. Unseen threats expire instead of freezing the escort indefinitely.
- Safe spawn candidates validate collision, route and distance.
- Online objective reset and round-end audio work for both escort and horde.

## Bots and VIP

- Escort slots remain stable across deaths and distinct for nearby and distant defenders.
- Defenders intercept immediate threats without abandoning formation or chasing indefinitely.
- Recovery preserves physical movement, line of sight and firing rules, including low-skill bots.
- Attackers proactively approach and contest the escort instead of waiting for generic target acquisition.
- VIP always respawns with armor 100, helmet enabled and a visible PT-38 with working fire/reload behavior.

## Map and presentation

- Airport chairs use human-scale dimensions and aligned colliders.
- Five connected service routes reach boarding, with additional solid cover and lateral cover points.
- Prop yaw is reflected in collision boxes. Aircraft collision separates fuselage and wings without blocking boarding.
- Door routes are explicit in the graph, and graph construction uses local candidates rather than all-pairs checks.
- Spawn orientation shows the escort route instead of the terminal wall.
- Low profile avoids transmission and reduces decorative shadows while preserving solid-cover shadows and geometry.

## Verification exercised

- `npm run eval:operacao-flavio`: full escort suite and expected mutants.
- `npm run eval:javaporcos`: horde baseline and expected mutants.
- Game integration, server recovery, attacker pressure, regroup/obstacle, online reset and round-audio checks.
- `npm run docs:check` and `npm run arch:check`.
- Real Chromium gameplay: spawn, hangar, route presentation, VIP equipment and round transition without the previous `TypeError` overlay.
- Independent reviewer reported no remaining patch-introduced correctness blockers.

Evidence captures:

- `artifacts/flavio-final-spawn.png`
- `artifacts/flavio-final-chairs-routes.png`
- `artifacts/flavio-final-vip-armed.png`
- `artifacts/flavio-improved-round-transition.png`

## Remaining limits

- No physical Android/iOS device test or long human playtest was performed.
- No real dedicated backend/client pair was launched; backend PR #196 still requires its own update and compatibility evidence.
- Browser checks used the local development server, not production or a store shell.
- This is a local candidate, not a claim of release readiness or an 8/9 visual rating.
