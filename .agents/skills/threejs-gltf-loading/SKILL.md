---
name: threejs-gltf-loading
description: >
  Load glTF/GLB models in three.js with GLTFLoader and play their skinned
  animations with AnimationMixer, including DRACO/Meshopt-compressed meshes and
  KTX2 textures. Use when importing 3D models into three.js — when the user
  mentions glTF, GLB, GLTFLoader, AnimationMixer, animation clips, DRACOLoader, or
  "load a 3D model". For scene/camera/renderer setup use threejs-scene-setup; for
  materials and lights use threejs-materials-lighting.
license: Apache-2.0
compatibility: three.js r165+ (verified against r184; GLTFLoader from three/addons)
metadata:
  engine: threejs
  category: web-engines
  difficulty: intermediate
---

# three.js glTF Loading

Load `.gltf`/`.glb` models and play their animations in three.js, including
compressed geometry (DRACO/Meshopt) and textures (KTX2). Patterns target
**r165+**, verified against **r184**.

## When to use

- Use to import a 3D model, add it to the scene, inspect its node hierarchy, and
  play baked/skinned animation clips with an `AnimationMixer`.
- Use when files are `.gltf`/`.glb`, or code imports `GLTFLoader` /
  `DRACOLoader` / `KTX2Loader` from `three/addons/loaders/...`.

**When *not* to use:** creating the renderer/camera/loop → `threejs-scene-setup`.
Tuning surface look, lights, or shadows on the loaded model →
`threejs-materials-lighting`. Authoring/exporting the model itself (Blender) is out
of scope; prefer glTF over OBJ/FBX for runtime.

## Core workflow

1. **Why glTF.** It's a transmission format: binary vertex data, PBR materials, and
   animations are ready to render with minimal parsing. Prefer it over OBJ (no scene
   graph, no animation) and FBX (heavy) for the web.
2. **Load with `GLTFLoader`.** `loader.load(url, onLoad, onProgress, onError)`. The
   result `gltf` has `gltf.scene` (the `Object3D` root), `gltf.animations`
   (`AnimationClip[]`), `gltf.cameras`, and `gltf.asset`.
3. **Add `gltf.scene` to your scene** and frame it. Inspect the hierarchy with
   `traverse` / `getObjectByName` to find the parts you'll control.
4. **Play animations with an `AnimationMixer`.** One mixer per animated root;
   `mixer.clipAction(clip).play()`; advance with `mixer.update(delta)` every frame.
5. **Decode compressed assets.** Attach a `DRACOLoader` (and/or `KTX2Loader` +
   Meshopt) so DRACO meshes and KTX2 textures load; point the decoders at their
   files.
6. **Verify what loaded** — log the scene graph and `gltf.animations`, and confirm
   the model is visible (right scale, lit) and the clip actually plays.

## Patterns

### 1. Load a model and frame it

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load(
  'assets/robot.glb',
  (gltf) => {
    const root = gltf.scene;
    scene.add(root);
    // Inspect: gltf.animations is an array of AnimationClip.
    console.log('clips:', gltf.animations.map((c) => c.name));
  },
  (event) => console.log(`${(event.loaded / event.total) * 100}% loaded`),
  (error) => console.error('glTF load failed:', error)
);
```

### 2. Play a skinned animation with AnimationMixer

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let mixer;                                  // declare outside so the loop can see it
const clock = new THREE.Clock();

new GLTFLoader().load('assets/character.glb', (gltf) => {
  scene.add(gltf.scene);
  mixer = new THREE.AnimationMixer(gltf.scene);          // one mixer per animated root
  const clip = THREE.AnimationClip.findByName(gltf.animations, 'Run')
            ?? gltf.animations[0];
  mixer.clipAction(clip).play();
});

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);              // advance the animation by real seconds
  renderer.render(scene, camera);
});
```

### 3. Cross-fade between two clips

```js
const actions = {};
mixer = new THREE.AnimationMixer(gltf.scene);
for (const clip of gltf.animations) {
  actions[clip.name] = mixer.clipAction(clip);
}
actions['Idle'].play();

function transitionTo(name, duration = 0.3) {
  const next = actions[name];
  next.reset().play();
  for (const [n, action] of Object.entries(actions)) {
    if (n !== name) action.crossFadeTo(next, duration, false);
  }
}
```

### 4. DRACO-compressed geometry

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const draco = new DRACOLoader();
// Point at the decoder files you ship (or a pinned CDN copy of the same version).
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/libs/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
loader.load('assets/city-draco.glb', (gltf) => scene.add(gltf.scene));
```

### 5. Find and animate a named part

```js
new GLTFLoader().load('assets/car.glb', (gltf) => {
  scene.add(gltf.scene);
  const wheels = [];
  gltf.scene.traverse((node) => {
    if (node.name.startsWith('Wheel')) wheels.push(node);
  });
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    for (const w of wheels) w.rotation.x += dt * 4;
    renderer.render(scene, camera);
  });
});
```

## Pitfalls

- **Model loads but is invisible** → it has lit (PBR) materials and the scene has no
  light or environment. Add a light or `scene.environment` (see
  `threejs-materials-lighting`), and check scale — glTF is in metres, so a 0.01-scaled
  asset is tiny.
- **`load` is async** → `gltf` only exists inside the callback; declare `mixer`/refs
  outside and assign them in the callback, or use `await loader.loadAsync(url)`.
- **Animation never moves** → you didn't call `mixer.update(delta)` each frame, or you
  passed milliseconds instead of seconds (use `clock.getDelta()`), or you forgot
  `action.play()`.
- **DRACO/KTX2 model fails** → the decoder/transcoder path is wrong or version-
  mismatched. `setDecoderPath`/`setTranscoderPath` must point at files matching your
  three.js version.
- **Multiple mixers fighting** → use **one** `AnimationMixer` per animated root and
  create all actions from it; don't make a new mixer per clip.
- **Baked-in transforms surprise you** → exporters sometimes bake scale/rotation onto
  child nodes. Dump the hierarchy (names + position/rotation/scale) before relying on
  a node's local transform; re-export from the source if the rig is unusable.
- **Origins are off** → re-parent a part under a fresh `Object3D` to give it a clean
  pivot rather than fighting baked offsets.

## References

- For the full decode/transcode setup (DRACO + Meshopt + KTX2 together), `loadAsync`
  + a `LoadingManager` progress bar, reusing models with `SkeletonUtils.clone`, and
  exporter guidance (apply transforms, one clean root), read
  `references/loaders-and-animation.md`.

## Related skills

- `threejs-scene-setup` — the renderer, camera, and loop this model renders into.
- `threejs-materials-lighting` — lighting/environment so PBR models look right.
- `fps-shooter` — a 3D genre that composes three.js skills.
