---
id: criar-mapa-com-ia
title: Creating a map with AI
sidebar_label: Creating a map with AI
sidebar_position: 7
description: Practical flow to request, implement, integrate and validate a map created with AI assistance in CORO SOLTO.
---

{/* translated from docs/docs/criar-mapa-com-ia.md in 03/11/2026 — numbers reflect that date; automatic sync: issue #54 */}

# Creating a map with AI

AI speeds up procedural modeling, texturing, integration and testing, but it does not
decide on its own whether a map is playable. In this project, a map is only ready when the
real game opens, both teams can navigate, obstacles have collision, weapons are reachable
and a human has looked at a capture.

This guide complements the **How to contribute** page. The contribution page documents
the current format and rulers; here the focus is **how to drive an AI agent without
leaving contract, gameplay or documentation behind**.

## Before asking for code

Start with a short sheet. The more concrete it is, the less the agent will fill gaps with
generic decisions.

| Decision | What to provide |
|---|---|
| Identity | `snake_case` id, display name, theme and menu category |
| Mode | opens in rounds or CTF; `ctfMode` only sets the default |
| Space | approximate bounds, indoor/outdoor and height levels |
| Routes | main route, two flanks and rally points |
| Cover | low objects, walls, buildings and sight lines that must be broken |
| Spawns | team sides, initial protection and facing direction |
| Objectives | flag positions and names when there is CTF |
| Arsenal | quantity and distribution; never remove existing weapons to "clean up" the scene |
| Art | materials, mood, visual references and forbidden elements |

Do not just ask for "a pretty map". Say which decision the player makes in the first
seconds, where close combat happens and where a long-range weapon may dominate. The AI
needs a gameplay intent, not just a list of objects.

## Reusable prompt

Copy, fill the brackets and send to the agent from the repository root:

```text
Create the branch map/[id]. Read AGENTS.md, docs/LICOES.md and tools/eval/ARCH.md before editing.

Create the map [name], id [id], with the [theme] theme. It must open in [rounds/CTF], have
approximate bounds of [x × z], three playable routes ([describe]) and these visual
landmarks: [list]. Spawns: [description]. Covers and obstacles: [list]. Arsenal:
[distribution].

Visual direction: [materials, mood, palette and references]. Do not use real people, gore,
protected brand/work, CDN or runtime dependency. Prefer procedural textures or assets with
a compatible license and registered provenance.

Before implementing, write a map-specific ruler that fails without the map and declare the
mutation that proves it bites. Then implement without duplicating existing systems.

Integrate the map into public/js/maps.js, public/js/main.js, src/data/jogo.ts and generate
public/img/map-previews/[id].jpg with no HUD, characters or weapons visible.

Validate contract, collisions, spawns, waypoints, pickups, bots, preview, console,
check:fast and build. Generate a capture, look at the image and describe what was actually
verified. Do not commit until I ask.
```

Adapt the prompt instead of appending contradictory corrections at the end. If the concept
changed, rewrite the sheet and state explicitly what replaces the previous decision.

## Recommended flow

### 1. Read the rules and protect the current work

Before switching branches, run `git status -sb`. Do not carry another map's changes into
the new branch. Read `AGENTS.md`, lessons 1–5 of `docs/LICOES.md` and the
**MAPS / WORLD** front in `tools/eval/ARCH.md`.

Maps live in `public/`, which uses ES modules served directly. Do not add a bundler, CDN
or runtime dependency.

### 2. Make the ruler born red

Create `tools/eval/<id>-check.mjs` with the map's own invariants. Examples:

- required landmarks exist and have stable names;
- every visible obstacle has a coherent collider;
- both teams reach the center and the objectives;
- ramps, stairs or passages are traversable by real movement;
- visible materials have valid texture and UV;
- the preview hides HUD, characters and weapons.

Run the ruler before implementation and record the failure. For each clause, create a
`--mutante=<name>` that removes or corrupts exactly the measured property. A ruler that
stays green with the mutant does not protect the map.

### 3. Implement the map contract

Create `public/js/map_<id>.js` exporting a `build*` function. Use a registered map of
similar size as reference; do not copy a whole file and rename it afterwards.

The object returned by the builder must respect the contract consumed by the game:

```text
root · colliders · occluders · spawns · bounds
waypoints { nodes, adj } · nearestWaypoint · findPath
```

Fields like `groundHeightAt`, `slowAt`, `pickups`, `ctfPoints`, `sun` and `hemi` come in as
the map needs. Before registering it, check the contract:

```bash
node tools/eval/map-contrato-check.mjs --extra=public/js/map_<id>.js
```

Use simple colliders separated from the visual mesh. In this project they are AABBs; a
rotated wall may look correct and still let the player slide through the corner. Test
traversal by real movement, not just counting objects in the `colliders` array.

### 4. Integrate all public surfaces

A file in `public/js/` does not appear in the game by itself. Update in the same PR:

| File | Responsibility |
|---|---|
| `public/js/maps.js` | import, display name, builder and `ctfMode` when applicable |
| `public/js/main.js` | description (`MAP_DESC`) and category (`MAP_CAT`) of the selector |
| `src/data/jogo.ts` | `MAPAS` entry used by public pages and metadata |
| `public/img/map-previews/<id>.jpg` | square poster, named exactly like the id |

Do not edit generated counts in README or documentation. Run `npm run docs` after
registration so `tools/gen-docs.mjs` refreshes the blocks derived from code.

### 5. Generate and inspect the preview

With the server running, capture several angles:

```bash
npm run dev
node tools/eval/g2ui-map-previews.mjs <id> -1.2,-0.6,0,0.6,1.2
```

The calibration images land in `/tmp/gauntlet/g2ui-maps/`. Pick one that explains the
layout and save the versioned JPG:

```bash
node tools/eval/g2ui-map-previews.mjs --write <id>=/tmp/gauntlet/g2ui-maps/<file>.png
```

Look at the final JPG. Confirm texture, framing, readability of the routes and absence of
HUD, characters, viewmodel and weapons. The script detecting zero console errors does not
prove the image is good.

### 6. Validate gameplay and integration

After registering the map, run:

```bash
npm run eval:mapcontrato
node tools/eval/map-check.mjs <id>
node tools/eval/pickup-check.mjs
node tools/eval/botsim.mjs 60 <id>
npm run eval:mapid
npm run docs
npm run arch
npm run check:fast
npm run build
```

Also open `http://localhost:4321/?debug=1&auto=P,mst&map=<id>` and exercise at least:

1. birth of both teams;
2. main route and the two flanks;
3. obstacle collision and access to elevation changes;
4. weapon pickups;
5. one fight with bots;
6. CTF objectives, when they exist;
7. console without `pageerror` or map resource errors.

If the wall geometry changed in a map that uses baked graffiti, also run `npm run grafite`;
`eval:grafitelayout` fails when the layout gets stale.

## How to review the AI's answer

Do a second read as an adversary, without reusing the agent's justification:

- remove a collider and confirm the ruler fails;
- break a graph edge and confirm the bots lose the route;
- remove the preview and confirm `eval:mapid` detects the missing poster;
- rearrange waypoints and confirm paths use indices, not accidental coordinates;
- walk against every important obstacle;
- look for open areas that are too wide, dead-end bottlenecks and sniper lines between spawns;
- check the capture at 3:2, the ratio used in the project's visual review.

Ask for a fix when the game contradicts the report, even with the gate green. The house
rule is simple: if a person finds the defect and the ruler does not, an invariant is
missing — not a better explanation.

## Definition of done

The AI-created map is ready for PR when:

- it has its own visual identity with no protected material or real person;
- it appears in the selector, in the correct category and on public pages;
- it has a visually reviewed preview;
- spawns, routes, colliders, pickups and objectives work in the real game;
- bots navigate without getting stuck;
- the map-specific ruler passes and its mutants fail;
- `check:fast` and `build` pass;
- the PR flags high risk and requests human gameplay review.

AI can produce the first draft in minutes. What turns that draft into a map of the game is
the combination of explicit contract, mutation, a capture that was looked at and playable
testing.
