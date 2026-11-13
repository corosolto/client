---
id: construtor-de-mapas
title: Map builder (no code)
sidebar_label: Map builder
sidebar_position: 8
description: The visual editor /construtor.html and the "map as data" format (map_json.js) — build a playable arena, validate with the same ruler as the game, and export a JSON ready to register.
---

{/* translated from docs/docs/construtor-de-mapas.md in 03/11/2026 — numbers reflect that date; automatic sync: issue #54 */}

# Map builder (no code)

Maps here have always been **code**: every `public/js/map_*.js` is geometry declared by
hand, and the biggest ones rival the system modules in size. The **map as data** format
replaces that with a **JSON descriptor** that the loader `public/js/map_json.js` turns
into the same world contract a `build*()` delivers — colliders, occluders, spawns, flags,
pickups, the waypoint graph, `groundHeightAt`, `slowAt` and lights. You describe the map;
the code is just one.

The **Construtor da Treta** is the visual editor for that format. It opens in a tab, runs
the **same ruler as the game** live, and exports the JSON. No Blender, no GLB, no writing
geometry.

## Open and use

```bash
npm run dev           # http://localhost:4321
# editor: http://localhost:4321/construtor.html
```

The editor is vanilla and zero-build, served from `public/construtor.html` — the same
vendored Three.js as the game. Flow:

1. **Pick a tool** (box, platform, ramp, water, prop, spawn, flag, weapon) and
   **click the map** to place it. The **Select** tool moves and edits.
2. The **Inspector** edits each object by number (position, size, height, color, direction).
3. **Validation** runs `validatePlan` on every change and shows green or red — it is the
   game's ruler, not an editor lint. The **waypoint graph** (what the bot walks) is
   drawn on top.
4. **3D preview** builds the real scene with `buildMapFromJSON`.
5. **Download .json** exports the map. **Copy registration snippet** gives you the lines
   to put it in the menu.

## The format

The source of truth is the header of `public/js/map_json.js`. In short, the descriptor has:

| Field | What it is |
|---|---|
| `bounds` | semi-axes `x`/`z`; the playable interior is `[-x,x] × [-z,z]` |
| `floor` / `walls` | floor color; perimeter wall height, thickness and color (generated, closed) |
| `boxes` | obstacle = collider + occluder. `walkable: true` makes the **top** player floor |
| `ramps` | walkable inclined surface: `x,z,w,d,rise,dir` (`dir` ∈ `+x -x +z -z`, the side that rises) |
| `slow` | water/mud rectangles — `slowAt` slows whoever steps in |
| `props` | decorative GLB by `id` (`placeProp`); `solid: true` adds a collider when the asset exists |
| `spawns` | `E` and `B`, each a list of `x,z,yaw` |
| `ctf` | flags `id,label,x,z` — **the count defines the round's target** |
| `pickups` | ground weapon `weapon,x,z` (the `weapon` must exist in `WEAPONS`) |
| `waypoints` | `step` and `inset` of the bot graph grid |

### Descriptor fields

The exported file uses this structure. Arrays may be empty; spawns on both sides are
required to pass the ruler.

```js
{
  id, name,
  bounds: { x, z },                 // map semi-axes
  floor: { color },
  walls: { height, thickness, color },
  boxes: [{ w, h, d, x, z, color, walkable }],
  ramps: [{ x, z, w, d, rise, dir, color }],
  slow: [{ x, z, w, d }],
  props: [{ id, x, z, yaw, h, solid, cw, cd }],
  spawns: { E: [{ x, z, yaw }], B: [{ x, z, yaw }] },
  ctf: [{ id, label, x, z }],
  pickups: [{ weapon, x, z }],
  waypoints: { step, inset }
}
```

`dir` accepts `+x`, `-x`, `+z` and `-z`, indicating the direction a ramp rises.
`slow` applies slowness inside the rectangle. Props with `solid: true` use `cw × h × cd`
as a collider when the GLB exists; a missing mesh also prevents creating the collider.
The plan includes that collider in spawn validation and navigation. The preview revalidates
the map after loading props and refuses a spawn that has ended up inside a solid.

## Terrain: one surface per column

`groundHeightAt(x,z)` returns **one** height per point — the maximum between the floor (0),
ramps and the tops of `walkable` boxes. It is on purpose that **there are no overlapping
floors** (mezzanine over floor at the same `x,z`): that requires hand-authored layered
navigation, as in `map_havan.js`, and is out of the data format's scope.

Two practical rules this creates:

- **A ramp gives real elevation** — bot and player climb it. A ramp that is too steep
  becomes a wall and the ruler fails it (R4): keep `rise / length` low (the ceiling is
  measured in `map_json.js`, `RAMPA_GRADE_MAX`).
- **The top of a `walkable` box is player-only floor** — the bot goes around it, as in any
  flat map today. For a bot to reach a level, connect the levels with a **ramp**, not a box.

## The ruler is born with the format

None of this is a promise: the editor's own `validatePlan` runs in node, with mutants
proving that it bites, and there is the proof **inside the engine**:

```bash
npm run eval:mapjson        # R1 connected · R2 bidirectional · R3 playable spawn · R4 climbable ramp
                            # (+ graph/edge/spawn/ramp/platform mutants)
node tools/eval/mapjson-check.mjs path/arena.json  # validates the exported JSON
npm run eval:mapjsonboot    # boots the arena in a REAL Game: terrain and bots navigating (+ terrain mutant)
npm run eval:construtor-input # invalid inputs fail without freezing; keyboard preserves text fields
```

`eval:mapjson` is in `check:fast`. `eval:mapjsonboot` is the in-engine proof — run it when
touching the loader or a map with terrain.

`bounds` and the waypoint step must be finite positive numbers; the `inset` must stay
within the map bounds. Validation refuses grids whose estimated cost exceeds the
navigation budget before allocating nodes. If that happens, shrink the arena or adjust
the spacing. The error appears in the editor and in the CLI, which exits with code 1.
Delete/Backspace only delete the selected object when focus is outside editable fields.

## Register in the menu

The editor exports a `.json`; the menu needs a **3-line shell module** and **3 registration
lines** (the **Copy registration snippet** button generates everything with the right
names):

1. `public/js/map_<id>.js` — imports `buildMapFromJSON`, stores the `SPEC` (the `.json`
   content) and exports `build<Name>` + `<ID>_PROPS` (via `propIdsFromSpec`).
2. In `public/js/maps.js`, three registrations: the `MAPS` entry (name, `ctfMode`,
   `props`), the `MODULOS` import and the export names in `EXPORTS`.

:::caution Registering turns on the full quality gate
A map in the menu is swept by **all** the map rulers (`map-check` MAP1-MAP6/CTF1-CTF2,
`botsim`, `spawn-settle`, `pickup-check`) and needs to mirror `src/data/jogo.ts` (`MAPAS`)
+ `npm run docs` + `npm run check:seo`. That is the right barrier: a minimal greybox arena
usually fails the cover density (MAP5) before failing anything else. Start with
`eval:mapjson`/`eval:mapjsonboot`, which are the format's contract, and treat the menu as
the last step — when the map deserves to be played by everyone.
:::

## Where this fits

- The **gameplay intent** (routes, cover, what the player decides in the first seconds)
  comes before the editor — the sheet of
  [Creating a map with AI](./criar-mapa-com-ia.md) applies here equally.
- The format, the ruler and the editing conflict table are in
  [How to contribute](./colaborar.md).
- Real layered terrain (mezzanine over floor) remains a **hand-authored** `map_*.js` map —
  the data format is for single-surface arenas, which is the majority.
