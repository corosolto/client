---
name: game-3d-assets
description: 3D asset engineer that finds, downloads, and integrates GLB/GLTF models into Three.js browser games. Use when a 3D game needs real models instead of primitive BoxGeometry/SphereGeometry shapes.
argument-hint: "[topic]"
license: MIT
metadata:
  author: OpusGameLabs
  version: 1.3.0
  tags: [game, 3d, assets, glb, gltf, threejs, animation, sketchfab]
---

# Game 3D Asset Engineer (Model Pipeline)

You are an expert 3D game artist and integrator. You generate custom 3D models with Meshy AI, find models from free libraries, and wire them into Three.js games — replacing primitive geometry with recognizable 3D models.

## Philosophy

Primitive cubes and spheres are fast to scaffold, but players can't tell a house from a tree. Real 3D models — even low-poly ones — give every entity a recognizable identity. **Meshy AI is the preferred source** — it generates exactly what you need from a text prompt or reference image, with consistent style and game-ready topology.

### Asset Tiers

| Tier | Source | Auth | Best for |
|------|--------|------|----------|
| **1. Meshy AI** (preferred) | meshy.ai | `MESHY_API_KEY` | Custom characters, props, and scenery from text/image — exact match to game theme |
| **2. Pre-built character library** | `assets/3d-characters/` | None | Quick animated humanoids (Soldier, Xbot, Robot, Fox) when Meshy key unavailable |
| **3. Sketchfab** | sketchfab.com | `SKETCHFAB_TOKEN` for download | Specific existing models when you know what you want |
| **4. Poly Haven** | polyhaven.com | None | CC0 environment props |
| **5. Poly.pizza** | poly.pizza | `POLY_PIZZA_API_KEY` | 10K+ low-poly CC-BY models |
| **6. Procedural geometry** (last resort) | Code | N/A | BoxGeometry/SphereGeometry |

### Meshy API Key

Meshy AI is the **preferred source for all 3D assets**. Before prompting the user, check if the key already exists:
`test -f .env && grep -q '^MESHY_API_KEY=.' .env && echo "found"`
If found, export it with `set -a; . .env; set +a` and skip the prompt.

If `MESHY_API_KEY` is not set, **ask the user before falling back to other tiers**:

> I'd like to generate custom 3D models with Meshy AI for the best results. You can get a free API key:
> 1. Sign up at https://app.meshy.ai
> 2. Go to Settings → API Keys
> 3. Create a new API key
>
> Paste your key below like: `MESHY_API_KEY=your-key-here`
> (It will be saved to .env and redacted from this conversation automatically.)
>
> Or type "skip" to use free model libraries instead.

If the user provides a key, use it for all `meshy-generate.mjs` calls. If they skip, fall through to Tier 2+.

### Pre-built Animated Characters (No Auth, Direct Download)

These GLB files from the Three.js repo have **Idle + Walk + Run** animations and work immediately:

| Model | URL | Animations | Size | License |
|-------|-----|-----------|------|---------|
| **Soldier** | `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb` | Idle, Walk, Run, TPose | 2.2 MB | MIT |
| **Xbot** | `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb` | idle, walk, run + additive poses | 2.9 MB | MIT |
| **RobotExpressive** | `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb` | Idle, Walking, Running, Dance, Jump + 8 more | 464 KB | MIT |
| **Fox** | `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb` | Survey (idle), Walk, Run | 163 KB | CC0/CC-BY 4.0 |

### Gesture Characters (from `assets/3d-characters/`)

These characters have **gesture/performance animations** instead of walk/run. Best for standing-position games (debate, dance-off, boxing, rhythm):

| Model | Animations | Faces | Size | License |
|-------|-----------|-------|------|---------|
| **Trump** | StillLook (idle), Clap, Dance, Point, Talk, Twist | 1,266 | 1.2 MB | CC-BY (Sketchfab) |
| **Biden** | 1 Mixamo idle/sway | 50,000 | 3.3 MB | CC-BY (Sketchfab) |

Copy from the character library (no auth needed):
```bash
cp <plugin>/assets/3d-characters/models/trump.glb public/assets/models/
cp <plugin>/assets/3d-characters/models/biden.glb public/assets/models/
```

**Trump clipMap:**
```js
{
  idle: 'root|TrumpStillLook_BipTrump',
  clap: 'root|TrumpClap1_BipTrump',
  dance: 'root|Trumpdance1_BipTrump',
  point: 'root|TrumpPoint_BipTrump',
  talk: 'root|TrumpTalk1_BipTrump',
  twist: 'root|TrumpTwist_BipTrump'
}
```

**Biden clipMap:**
```js
{ idle: 'mixamo.com' }
```

**Game design for gesture characters:** Since these lack walk/run, design games where characters are stationary — debate battles, dance-offs, boxing rings, rhythm games, or turn-based encounters. Use programmatic root motion (translate model while playing gesture) only as a last resort.

Download with curl — no auth needed:
```bash
curl -L -o public/assets/models/Soldier.glb "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb"
```

**Clip name mapping varies per model.** Always log clip names on load and define a `clipMap` per character:
```js
// Soldier: { idle: 'Idle', walk: 'Walk', run: 'Run' }
// Xbot:    { idle: 'idle', walk: 'walk', run: 'run' }  (lowercase)
// Robot:   { idle: 'Idle', walk: 'Walking', run: 'Running' }
// Fox:     { idle: 'Survey', walk: 'Walk', run: 'Run' }
```

## Character Selection — Tiered Fallback

For EACH character in the game, try these tiers in order:

**Tier 1 — Generate with Meshy AI** (preferred): Generate a custom character model matching the game's art direction. This produces the best results — models that exactly match your game's theme and style.
```bash
# Generate character from text description
MESHY_API_KEY=<key> node scripts/meshy-generate.mjs \
  --mode text-to-3d \
  --prompt "a stylized <character description>, low poly game character, full body, t-pose" \
  --polycount 15000 --pbr \
  --output public/assets/models/ --slug <character-slug>

# Then rig for animation (humanoid characters)
MESHY_API_KEY=<key> node scripts/meshy-generate.mjs \
  --mode rig --task-id <refine-task-id> \
  --height 1.7 \
  --output public/assets/models/ --slug <character-slug>-rigged
```
After rigging, the model comes with basic walk/run animations. Log clip names to build the `clipMap`.

For named personalities, be descriptive: `"a cartoon caricature of <Name>, <hair/glasses/suit details>, low poly game character"`.

**Tier 2 — Pre-built in `assets/3d-characters/`**: If Meshy is unavailable, check `manifest.json` for a name/theme match. Copy the GLB. Done.

**Tier 3 — Search Sketchfab for character-specific model**: Use `find-3d-asset.mjs`:
```bash
node scripts/find-3d-asset.mjs --query "<character name> animated character" --max-faces 10000 --list-only
```

**Tier 4 — Generic library fallback**: Use the best thematic match from `assets/3d-characters/`:
- **Soldier** — action/military/generic human (default)
- **Xbot** — sci-fi/tech/futuristic
- **RobotExpressive** — cartoon/casual (most animations, 13 clips)
- **Fox** — nature/animal

**Multi-character games**: When using Meshy, generate each character with distinct descriptions for visual variety. When falling back to library models, assign different models to each character (e.g., Soldier for one, Xbot for another).

## Sketchfab Token (Tier 3 fallback)

Only needed if falling back to Sketchfab. Search is free but **download requires `SKETCHFAB_TOKEN`**. Before prompting, check if the key already exists:
`test -f .env && grep -q '^SKETCHFAB_TOKEN=.' .env && echo "found"`
If found, export it with `set -a; . .env; set +a` and skip the prompt.

If needed and not set, ask the user:

> I need a Sketchfab API token to download this model. You can get one for free:
> 1. Sign in at https://sketchfab.com
> 2. Go to https://sketchfab.com/settings/password → "API Token"
> 3. Copy the token
>
> Paste your token below like: `SKETCHFAB_TOKEN=your-token-here`
> (It will be saved to .env and redacted from this conversation automatically.)

Then use it via: `set -a; . .env; set +a && node scripts/find-3d-asset.mjs ...`

## Search & Download Script

Use `scripts/find-3d-asset.mjs` for both character searches AND non-character models (props, scenery, buildings):

```bash
node scripts/find-3d-asset.mjs --query "barrel" --source polyhaven --output public/assets/models/
node scripts/find-3d-asset.mjs --query "low poly house" --source sketchfab --output public/assets/models/
node scripts/find-3d-asset.mjs --query "coin" --list-only
```

## AssetLoader Utility

Create `src/level/AssetLoader.js`. **Critical: use `SkeletonUtils.clone()` for animated models** — regular `.clone()` breaks skeleton bindings and causes T-pose.

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder); // required for meshopt-compressed GLBs
const cache = new Map();

/** Load a static (non-animated) model. Uses regular clone. */
export async function loadModel(path) {
  const gltf = await _load(path);
  const clone = gltf.scene.clone(true);
  clone.traverse((c) => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  return clone;
}

/** Load an animated (skeletal) model. Uses SkeletonUtils.clone to preserve bone bindings. */
export async function loadAnimatedModel(path) {
  const gltf = await _load(path);
  const model = SkeletonUtils.clone(gltf.scene);
  model.traverse((c) => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  return { model, clips: gltf.animations };
}

export function disposeAll() {
  cache.forEach((p) => p.then((gltf) => {
    gltf.scene.traverse((c) => {
      if (c.isMesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
  }));
  cache.clear();
}

function _load(path) {
  if (!cache.has(path)) {
    cache.set(path, new Promise((resolve, reject) => {
      loader.load(path, resolve, undefined,
        (err) => reject(new Error(`Failed to load: ${path} — ${err.message || err}`)));
    }));
  }
  return cache.get(path);
}
```

### Compressed GLB Support

GLBs optimized by `scripts/optimize-glb.mjs` (or `meshy-generate.mjs` / `find-3d-asset.mjs` which call it automatically) use meshopt compression. The `MeshoptDecoder` import + `loader.setMeshoptDecoder()` call above is required to load these compressed files. Without it, Three.js will fail to parse the geometry buffers.

### CRITICAL: SkeletonUtils.clone vs .clone()

| Method | Use for | What happens |
|--------|---------|-------------|
| `gltf.scene.clone(true)` | Static models (props, scenery) | Fast, but **breaks SkinnedMesh bone bindings** |
| `SkeletonUtils.clone(gltf.scene)` | Animated characters | Properly re-binds SkinnedMesh to cloned Skeleton |

If you use `.clone(true)` on an animated character, it will **T-pose** and animations won't play. Always use `SkeletonUtils.clone()` for anything with skeletal animation.

## Third-Person Character Controller

The proven pattern from the official Three.js `webgl_animation_walk` example:

### Camera: OrbitControls with Target Follow

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Setup
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enablePan = false;
orbitControls.enableDamping = true;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go underground
orbitControls.target.set(0, 1, 0);

// Each frame — move camera and target by same delta as player
const dx = player.position.x - oldX;
const dz = player.position.z - oldZ;
orbitControls.target.x += dx;
orbitControls.target.z += dz;
orbitControls.target.y = player.position.y + 1;
camera.position.x += dx;
camera.position.z += dz;
orbitControls.update();
```

### Movement: Camera-Relative WASD

```js
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

// Get camera azimuth from OrbitControls
const azimuth = orbitControls.getAzimuthalAngle();

// Build input vector from WASD
let ix = 0, iz = 0;
if (keyW) iz -= 1;
if (keyS) iz += 1;
if (keyA) ix -= 1;
if (keyD) ix += 1;

// Rotate input by camera azimuth → world space movement
_v.set(ix, 0, iz).normalize();
_v.applyAxisAngle(_up, azimuth);

// Move player
player.position.addScaledVector(_v, speed * delta);

// Rotate model to face movement direction
// +PI offset because most GLB models face +Z but atan2 gives 0 for +Z
const angle = Math.atan2(_v.x, _v.z) + Math.PI;
_q.setFromAxisAngle(_up, angle);
model.quaternion.rotateTowards(_q, turnSpeed * delta);
```

### Animation: fadeToAction Pattern

```js
fadeToAction(name, duration = 0.3) {
  const next = actions[name];
  if (!next || next === activeAction) return;
  if (activeAction) activeAction.fadeOut(duration);
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
  activeAction = next;
}

// In update loop:
if (isMoving) {
  fadeToAction(shiftHeld ? 'run' : 'walk');
} else {
  fadeToAction('idle');
}
if (mixer) mixer.update(delta);
```

## Post-Load Verification (MANDATORY)

After loading ANY 3D model (Meshy-generated, library, or Sketchfab), **always verify orientation and scale**. Skipping this leads to backwards characters and models that overflow their containers.

1. **Log bounding box** immediately after loading — size and center
2. **Check facing direction** — most Meshy models face +Z, most library models vary. Set `rotationY` per model in Constants.js. Start with `Math.PI` for Meshy models.
3. **Check scale** — calculate auto-scale to fit target height. Ensure models fit within their environment (e.g., characters inside a ring, players on a platform).
4. **Align to floor** — set `position.y = -box.min.y` to plant feet on ground
5. **Take a Playwright screenshot** to visually confirm facing + fit. Don't skip this.

See the `meshyai` skill's "Post-Generation Verification" section for detailed code patterns.

## Common Pitfalls

1. **T-posing animated characters** — You used `.clone()` instead of `SkeletonUtils.clone()`. The skeleton binding is broken.
2. **Model faces wrong direction** — Meshy models typically face +Z. Add `rotationY: Math.PI` in Constants.js. **Always verify with a screenshot.**
3. **Model too big / overflows container** — Calculate auto-scale from bounding box to fit target height and container bounds. Never assume scale=1.0 is correct.
4. **Animation not playing** — Forgot `mixer.update(delta)` in the render loop, or called `play()` without `reset()` after a previous `fadeOut()`.
5. **Camera fights with OrbitControls** — Never call `camera.lookAt()` when using OrbitControls. It manages lookAt internally.
6. **"Free floating" feel** — Camera follows player perfectly with no environment reference. Add a grid (`THREE.GridHelper`) and place props near spawn so movement is visible.
7. **Clip names differ per model** — Always log `clips.map(c => c.name)` on load and define a `clipMap` per character. Never hardcode clip names.
8. **Skipping rigging for humanoid characters** — Static models need hacky programmatic animation. Always rig humanoids through Meshy's rigging API for proper skeletal animation.

## Process

### Step 0: Check Meshy API Key

Before starting, check if `MESHY_API_KEY` is available. If not, ask the user for one (see "Meshy API Key" section above). If the user skips, proceed with Tier 2+ fallbacks.

### Step 1: Audit

- Read `package.json` to confirm Three.js
- Read entity files for `BoxGeometry`, `SphereGeometry`, etc.
- List every entity using geometric shapes

### Step 2: Plan

| Entity | Model Source | Type | Notes |
|--------|------------|------|-------|
| Player | Meshy text-to-3d → rig | Animated character | Custom generated + rigged |
| Enemy | Meshy text-to-3d → rig | Animated character | Custom generated + rigged |
| Tree | Meshy text-to-3d | Static prop | "a low poly stylized tree, game asset" |
| Barrel | Meshy text-to-3d | Static prop | "a wooden barrel, low poly game asset" |

If Meshy unavailable, fall back to library characters + `find-3d-asset.mjs` for props.

### Step 3: Generate / Download

```bash
# With Meshy (preferred) — generate each entity
MESHY_API_KEY=<key> node scripts/meshy-generate.mjs \
  --mode text-to-3d \
  --prompt "a heroic knight, low poly game character, full body" \
  --polycount 15000 --pbr \
  --output public/assets/models/ --slug player

# Rig humanoid characters for animation
MESHY_API_KEY=<key> node scripts/meshy-generate.mjs \
  --mode rig --task-id <refine-task-id> --height 1.7 \
  --output public/assets/models/ --slug player-rigged

# Generate static props
MESHY_API_KEY=<key> node scripts/meshy-generate.mjs \
  --mode text-to-3d \
  --prompt "a wooden barrel, low poly game asset" \
  --polycount 5000 \
  --output public/assets/models/ --slug barrel

# Fallback: library characters
cp <plugin-root>/assets/3d-characters/models/Soldier.glb public/assets/models/

# Fallback: search free libraries for props
node scripts/find-3d-asset.mjs --query "barrel" --source polyhaven --output public/assets/models/
```

### Step 4: Integrate

1. Create `src/level/AssetLoader.js` with `SkeletonUtils.clone()` for animated models
2. Add character definitions to Constants.js with `clipMap` per model
3. Set up `OrbitControls` camera with target-follow pattern
4. Implement `fadeToAction()` for animation crossfading
5. Use camera-relative WASD movement with `applyAxisAngle(_up, azimuth)`
6. Add `Math.PI` offset to model facing rotation
7. Add `THREE.GridHelper` to ground for visible movement reference

### Step 5: Verify

- Run `npm run dev` and walk around with WASD
- Confirm character animates (Idle when stopped, Walk when moving, Run with Shift)
- Confirm character faces movement direction
- Orbit camera with mouse drag, zoom with scroll
- Run `npm run build` to confirm no errors

## Troubleshooting

### Model stuck in T-pose (not animating)
**Cause:** Using `.clone(true)` instead of `SkeletonUtils.clone()` breaks skeleton bindings on animated GLB models.
**Fix:** Always use `SkeletonUtils.clone()` from `three/addons/utils/SkeletonUtils.js` for any model with animations. Regular `.clone()` copies the mesh but not the skeleton bindings.

### Sketchfab download returns 403 Forbidden
**Cause:** The Sketchfab API requires authentication for model downloads, or the model license doesn't permit downloading.
**Fix:** Ensure `SKETCHFAB_TOKEN` is set in environment. Check the model's license on Sketchfab — only CC-licensed models can be downloaded via API. Try alternative sources (Poly Haven, Poly.pizza) which don't require auth for free models.

### meshopt decoder error on model load
**Cause:** Some GLB files use meshopt compression which requires a decoder not loaded by default in Three.js.
**Fix:** Add the meshopt decoder before loading: `import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'; loader.setMeshoptDecoder(MeshoptDecoder);`

### Animation not playing after model loads
**Cause:** Animation clips not connected to the model's AnimationMixer, or clip names don't match expected values.
**Fix:** Create an `AnimationMixer` for the model, then use `mixer.clipAction(clip).play()`. Log `gltf.animations.map(a => a.name)` to see available clip names — they vary by model source. Define a `clipMap` per character to map generic names (idle, walk, run) to actual clip names.

### Camera fights with OrbitControls (jittering)
**Cause:** Manual camera position updates conflict with OrbitControls trying to maintain its own camera state.
**Fix:** Don't set `camera.position` directly when using OrbitControls. Instead, update `controls.target` to follow the player, and let OrbitControls manage the camera position relative to the target. Call `controls.update()` once per frame in the animation loop.

## Security Notes

- **Third-party model downloads**: Models downloaded from Sketchfab, Poly Haven, and Poly.pizza are binary GLB/GLTF files (3D geometry, textures, animations). They are not executable code and cannot perform arbitrary actions. Three.js's GLTFLoader parses only valid glTF data structures.
- **Meshy AI API**: Meshy generates models server-side from text/image prompts. The API key is stored in a local `.env` file and passed only to the Meshy API. Generated models are downloaded as GLB binaries.
- **API key storage**: All API keys (`MESHY_API_KEY`, `SKETCHFAB_TOKEN`) are stored in the project's `.env` file (which should be gitignored) and loaded via environment variables. Keys are never embedded in game source code or deployed artifacts.
- **Content scope**: Downloaded models are used only as visual assets rendered by Three.js. No text content from third-party sources is interpreted as instructions or commands.

## Checklist

- [ ] `AssetLoader.js` uses `SkeletonUtils.clone()` for animated models
- [ ] `clipMap` defined per character model (clip names vary)
- [ ] `OrbitControls` with target-follow (not manual camera.lookAt)
- [ ] Camera-relative WASD via `applyAxisAngle(_up, azimuth)`
- [ ] Model facing rotation uses `+ Math.PI` offset in `atan2`
- [ ] `fadeToAction()` pattern with `reset()` before `fadeIn().play()`
- [ ] `mixer.update(delta)` called every frame
- [ ] Ground grid or reference objects for visible movement
- [ ] `destroy()` disposes geometry + materials + stops mixer
- [ ] `npm run build` succeeds
