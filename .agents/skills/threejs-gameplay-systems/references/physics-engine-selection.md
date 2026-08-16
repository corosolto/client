# Physics Engine Selection

Use this reference before adding or changing physics, collision-heavy gameplay, vehicle movement, ball sports, pinball, mini-golf, rigid-body puzzles, destructible props, character controllers, sensors, or high-speed collision.

## Current Recommendation

Default to this ladder:

1. Custom collision: arcade triggers, pickups, lanes, bullets, simple overlap tests, deterministic rails, or games where authored feel matters more than simulation.
2. Rapier: default robust physics choice for serious Three.js browser games that need rigid bodies, colliders, sensors, many contacts, fast objects, balls, vehicles, ramps, slopes, moving platforms, or reliable browser/mobile behavior.
3. cannon-es: lightweight JavaScript fallback for small rigid-body scenes when avoiding WASM matters and collision complexity is low.
4. Jolt: consider for advanced rigid-body projects that need its engine-specific strengths, but expect more integration complexity.
5. Ammo.js/Bullet: use only when a project already depends on it or needs an existing Ammo-specific feature/wrapper. Avoid as the default new-project choice.
6. Matter.js: 2D only; use only for 2D gameplay rendered with Three.js.

For most new premium Three.js games with real physics, choose Rapier.

## Why Rapier Is The Default

Three.js is a renderer, not a physics engine. Physics uses a separate world updated at a fixed timestep, then visual meshes are synchronized from physics body transforms.

Rapier is a Rust/WASM physics engine with official JavaScript bindings. It supports 2D and 3D worlds, rigid bodies, colliders, sensors, collision events, forces/impulses, damping, locking axes/rotations, sleeping, and continuous collision detection for fast bodies. It is a good default because it is fast, modern, typed, and strong enough for browser games with meaningful simulation.

## Choose By Game Type

Use custom collision:

- Endless runners, lane dodgers, simple shooters, pickups, checkpoint gates, scripted hazards.
- Transform-driven racers where car feel is custom and barriers are simple.
- Starship dogfights with sphere/box/projectile overlap.

Use Rapier:

- Mini golf, pool/snooker, pinball, marble racers, physics puzzles, rolling balls.
- Platformers, moving platforms, ramps, slopes, character controllers.
- Dynamic debris, rigid-body stacks, crates, destructible props.
- High-speed bullets/balls that need CCD.
- Trigger/sensor-heavy games needing collision events.
- Vehicle-like games where wheel simulation is not required but collisions and ramps matter.

Use cannon-es:

- Small JS-only demos or prototypes with modest body counts.
- Simple arcade rigid bodies where package simplicity matters more than robustness.

Use Jolt:

- Advanced rigid-body experiments where Jolt's behavior is explicitly desired and the team can handle WASM integration details.

Avoid detailed visual mesh collision:

- Use primitive colliders, compound colliders, convex hulls, simplified triangle meshes only for fixed level geometry, and explicit sensor volumes.
- Imported generated GLB meshes should get separate collision proxies.

## Rapier Setup Pattern

Install:

```bash
npm install @dimforge/rapier3d-compat
```

Initialize once before gameplay starts:

```ts
import RAPIER from '@dimforge/rapier3d-compat';

await RAPIER.init();

const gravity = { x: 0, y: -9.81, z: 0 };
const world = new RAPIER.World(gravity);
```

Step at a fixed timestep:

```ts
const fixedDt = 1 / 60;
let accumulator = 0;

function update(deltaSeconds: number) {
  accumulator += Math.min(deltaSeconds, 0.1);
  while (accumulator >= fixedDt) {
    world.timestep = fixedDt;
    world.step();
    accumulator -= fixedDt;
  }
}
```

Create bodies and colliders:

```ts
const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, 2, 0)
  .setLinearDamping(0.25)
  .setAngularDamping(0.5);

const body = world.createRigidBody(bodyDesc);
const collider = RAPIER.ColliderDesc.ball(0.5)
  .setRestitution(0.6)
  .setFriction(0.4);
world.createCollider(collider, body);
```

Sync physics to Three.js in one system:

```ts
const t = body.translation();
const r = body.rotation();
mesh.position.set(t.x, t.y, t.z);
mesh.quaternion.set(r.x, r.y, r.z, r.w);
```

For high-speed objects:

```ts
const fastBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true)
);
```

For sensors/triggers:

```ts
const sensor = RAPIER.ColliderDesc.ball(1)
  .setSensor(true)
  .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
```

## Architecture Rules

- Put physics ownership in `systems/PhysicsWorld`, `systems/CollisionSystem`, or equivalent.
- Do not create physics bodies inside render code.
- Keep physics body handles in entities and dispose them on restart.
- Update order: input intents -> fixed physics -> game state/collisions -> VFX/camera/UI -> render.
- Keep a debug overlay or helper mode for colliders, body counts, contact pairs, and velocity.
- Use kinematic bodies for moving platforms and scripted obstacles.
- Use sensors for pickups, goals, holes, portals, checkpoints, triggers, and damage zones.
- Use CCD only for fast bodies because it costs extra.
- Use sleeping and body removal/disposal to avoid stale simulation state.

## Tuning Rules

- Tune in units that map cleanly to scene scale.
- Clamp frame delta before the accumulator.
- Tune friction, restitution, damping, mass/density, gravity scale, and collision groups explicitly.
- For balls, mini-golf, pool, and pinball: tune rolling friction/damping, restitution, cushion/boundary bounce, hole capture, and max velocity.
- For arcade vehicles: do not rely on raw rigid-body simulation alone; combine kinematic/control logic with collision response.
- For character controllers: prefer capsule colliders, locked rotations, and kinematic movement unless ragdoll behavior is required.

## Verification Requirements

For physics work, verify:

- Build/typecheck.
- Browser run with console/page error check.
- Real input changes body state.
- Collision/trigger path works.
- Restart removes or resets physics bodies.
- High-speed movement does not tunnel.
- Mobile/low-FPS frame spikes do not break simulation.
- Physics diagnostics: engine used, body count, collider count, timestep, CCD bodies, sensors, collision groups, and risky colliders.

## Common Failures

- Variable-delta physics causes nondeterministic feel.
- Visual mesh and physics body drift because transforms are synced in multiple places.
- Bodies persist after restart.
- Detailed imported meshes make collision slow or wrong.
- Fast balls/projectiles tunnel because CCD is missing.
- Sensors are missing active events.
- Kinematic platforms move visually but not physically.
- Debug code exposes physics internals or API keys in release.

## Source Basis

- Three.js manual: physics engines run a parallel physics world, often on fixed timesteps, then synchronize mesh transforms.
- Three.js manual: cannon-es is lightweight and easy to integrate, while WASM engines such as Rapier/Jolt/Ammo offer more performance/features with more setup.
- Rapier JavaScript docs: use `@dimforge/rapier3d-compat`, initialize with `RAPIER.init()`, create rigid bodies and colliders, use forces/impulses/damping/CCD, and enable collision events on colliders.
