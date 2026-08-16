# Procedural Model Recipes

These recipes are for scratch-built Three.js models when external art assets are unavailable. The goal is not photorealism; it is authored, layered, readable, premium browser-game art.

## Modeling Principles

- Start with silhouette. A model should be recognizable as a dark shape before materials or glow.
- Combine primitive bases with authored geometry: extrusions, bevels, curves, tubes, lathes, custom buffers, decals, trim, and instanced micro-detail.
- Use asymmetry and functional parts: hinges, fins, vents, handles, rails, brackets, sensors, cables, panels, bolts.
- Put detail where the camera sees it. Spend triangles on player-facing surfaces, not hidden undersides.
- Create state variants through material swaps, animated child parts, emissive strips, and VFX sockets.
- Keep a simple collision proxy separate from the detailed visual group.
- Use shared geometries/materials and instancing for repeated bolts, panels, lights, windows, spikes, rocks, or rail segments.
- Name important child meshes: `cockpitGlass`, `leftEngine`, `hazardTeeth`, `pickupCore`, `collisionProxy`.

## Minimum Premium Asset Pass

For a game that asks for premium/AAA/showcase quality, build at least:

- One hero/player model with readable front/up/side and three state cues.
- Three obstacle/enemy variants with unique silhouettes and telegraphs.
- Two reward/interactable variants with idle and collect states.
- One world prop kit with at least eight reusable parts.
- One material kit with trim, decals, panel lines, and emissive masks.
- Collision proxies and renderer diagnostics for the above.

## Hero Vehicle Recipe

Use for runners, racers, hovercraft, spaceships, drones, or arcade vehicles.

- Core hull: `ExtrudeGeometry` or custom tapered `BufferGeometry`, not just a box.
- Nose/front: wedge, intake, sensor strip, bumper, or blade shape.
- Cockpit/core: glass dome from sphere/lathe segments, beveled capsule, or faceted canopy.
- Engines: cylinders/cones/tubes with nozzle rings, inner emissive discs, heat fins, and trail sockets.
- Wings/fins: extruded triangular or curved plates with bevel/trim lines.
- Undercarriage: skids, landing pads, rail clamps, suspension arms, or thruster pods.
- Decals: panel lines, numeric marks, faction glyph, hazard ticks, small bolts.
- State cues: boost flares, shield shell, damage scorch, pickup glow, overheat red.
- Collision proxy: one capsule/box/sphere group matching gameplay footprint.

Reject if the hero is mostly a box with two cylinders and a glow.

## Hero Character Recipe

Use for arena fighters, brawlers, platformers, or stylized third-person games.

- Body mass: torso, pelvis, head/helmet, limbs with tapered capsule/cylinder custom scales.
- Rig illusion: separate shoulders, elbows, knees, wrists, ankles, belt, backpack, armor plates.
- Face/identity: visor, mask, hair/helmet crest, color-blocked silhouette, weapon/tool.
- Animation-ready pivots: group limbs under named joints even if animation is procedural.
- Material zones: skin/fabric/armor/metal/glass/emissive accents.
- State cues: hit flash material, shield ring, attack trail socket, stamina/charge glow.
- Collision proxy: capsule or cylinder independent of mesh detail.

Reject if the character reads as stacked spheres/cylinders with no costume, joints, or silhouette.

## Obstacle And Enemy Families

Build distinct gameplay reads:

- Low barrier: ground-hugging slab, spikes, rails, caution panels, animated warning light.
- Gate/arch: overhead frame, side posts, pulsing pass/avoid lane, moving shutters.
- Moving hazard: rotating arm, sweeper beam, drone, crusher, sliding block, orbiting mines.
- Trap/zone: laser grid, electric puddle, collapsing tile, gravity well, proximity mine.
- Enemy: body core, sensor/head, weapon, shield, locomotion/hover base, attack telegraph.

Each variant needs:

- Unique silhouette.
- Material cue for danger.
- Telegraph from distance.
- Animation or state change.
- Collision proxy.
- Low-cost repeated detail.

Reject if all hazards are recolored cubes/cones.

## Reward And Interactable Recipes

Rewards should be readable and desirable during motion.

- Token: outer ring, inner core, value icon, shimmer cards, collect burst socket.
- Shard: faceted crystal, metal bracket, orbiting chips, emissive seam.
- Capsule: glass shell, suspended item, end caps, rotating label strip.
- Power-up: icon silhouette matched to effect, color and shape differ from score pickups.
- Objective item: larger scale, unique motion, UI echo, stronger lighting/VFX.

States:

- Idle: slow rotation, pulse, bob, or orbit.
- Attract: line/trail toward player.
- Collect: vanish, burst, score trail, HUD meter update.

Reject if rewards are plain spheres or torus rings without state feedback.

## World Prop Kit

Build modular props that can be instanced and recombined:

- Track/road: lane plates, seams, arrows, side rails, guard segments, repair panels.
- Arena: boundary rings, floor tiles, spawn pads, cover blocks, goal markers.
- City/sci-fi: window strips, antennas, rooftop units, bridge trusses, pylons, billboards.
- Nature: rocks from custom faceted buffers, cliffs, roots, crystals, grasses as cards.
- Industrial: pipes, vents, cables, tanks, crates, gantries, lights, warning signs.
- Space/air: debris panels, satellites, buoys, asteroid chunks, parallax dust.

Layer the kit:

- Near props create speed and scale.
- Mid props define the playable corridor.
- Far props create depth without stealing draw calls.

Reject if the world is mostly stretched boxes or a flat plane.

## Procedural Geometry Techniques

- `ExtrudeGeometry`: panels, fins, wings, badges, UI/world glyphs, signs.
- `LatheGeometry`: capsules, domes, engines, pipes, bottles, turret bases.
- `TubeGeometry`: cables, rails, trails, conduits, curved weapons.
- Custom `BufferGeometry`: tapered hulls, rocks, shards, wedges, low-poly terrain.
- `ShapeGeometry`: decals, flat icons, trim strips, hazard markers.
- `InstancedMesh`: windows, bolts, lane markers, debris, grass, lights, small props.
- `LOD`: hero/background variants and dense prop reductions.

Use bevel-like layering when real bevel geometry is too expensive: duplicate thin trim meshes, edge strips, or slightly offset darker panels.

## Material And Detail Rules

- Use roughness/metalness contrast, not only hue contrast.
- Use emissive for authored signals, not entire objects.
- Use glass/clearcoat sparingly on hero details.
- Add darker contact material under important objects.
- Use decals to imply scale and function.
- Reuse UI icon shapes as world decals for cohesion.

## Diagnostics Checklist

After a model pass, report:

- Mesh count.
- Instanced mesh count.
- Unique geometries/materials/textures.
- Approximate triangle count if available.
- Collision proxies included.
- LOD or culling strategy for repeated/background props.
- Active-play screenshots, not only showroom renders.
