---
name: threejs-scene-setup
description: >
  Stand up a three.js scene: import maps and the three/addons path, the
  Scene/PerspectiveCamera/WebGLRenderer trio, the setAnimationLoop render loop,
  responsive resize, and OrbitControls. Use when starting or debugging a three.js
  app — when the user mentions three.js, THREE.Scene, WebGLRenderer,
  PerspectiveCamera, the render loop, resizing, or OrbitControls. For models use
  threejs-gltf-loading; for materials/lights use threejs-materials-lighting.
license: Apache-2.0
compatibility: three.js r165+ (verified against r184; ES modules + import maps)
metadata:
  engine: threejs
  category: web-engines
  difficulty: beginner
---

# three.js Scene Setup

Create the foundation of a three.js app: module loading, the
scene/camera/renderer trio, the render loop, responsive resizing, and camera
controls. Patterns target **r165+** and are verified against **r184**.

## When to use

- Use when bootstrapping a three.js scene, fixing a blank/black canvas, making the
  canvas responsive, setting up the animation loop, or adding `OrbitControls`.
- Use when `package.json` depends on `three` and code does `import * as THREE from
  'three'`.

**When *not* to use:** loading `.gltf`/`.glb` models or skinned animation →
`threejs-gltf-loading`. Materials, lights, shadows, environment maps →
`threejs-materials-lighting`. 2D rendering → `pixijs-rendering`.

## Core workflow

1. **Load three.js as an ES module with an import map.** Since r147 the bare
   specifier `'three'` and `'three/addons/'` must be mapped (in HTML or by a
   bundler). Addons (controls, loaders) live under `three/addons/...`.
2. **Create the trio.** A `Scene` (root of the graph), a `PerspectiveCamera(fov,
   aspect, near, far)` moved back from the origin, and a `WebGLRenderer` whose
   `domElement` is in the DOM. Set size and `pixelRatio`.
3. **Add a mesh.** `new Mesh(geometry, material)` and `scene.add(mesh)`. With a
   lit material you also need a light (see `threejs-materials-lighting`).
4. **Drive a render loop with `renderer.setAnimationLoop(fn)`.** It's the modern,
   WebXR-/WebGPU-safe replacement for hand-rolled `requestAnimationFrame`. Use a
   `Clock` for delta time.
5. **Handle resize** so the camera aspect and renderer match the canvas; update
   `camera.aspect`, call `updateProjectionMatrix()`, and `renderer.setSize(...)`.
6. **Add `OrbitControls`** for orbit/pan/zoom while developing. Confirm something
   actually renders (a lit cube, the controls responding) before assuming success.

## Patterns

### 1. HTML import map + module entry (no bundler)

```html
<canvas id="c"></canvas>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/"
  }
}
</script>
<script type="module" src="./main.js"></script>
```

With a bundler (Vite/webpack), skip the import map and just
`npm i three`; the same `import` statements resolve.

### 2. Scene + camera + renderer

```js
// main.js
import * as THREE from 'three';

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap for perf
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);

const camera = new THREE.PerspectiveCamera(
  60,                                   // vertical field of view (degrees)
  window.innerWidth / window.innerHeight, // aspect
  0.1,                                  // near
  100                                   // far
);
camera.position.set(3, 2, 5);
camera.lookAt(0, 0, 0);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial()        // unlit; shows orientation without a light
);
scene.add(cube);
```

### 3. The render loop (setAnimationLoop + Clock)

```js
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();          // seconds since last frame
  cube.rotation.x += dt;                // frame-rate independent
  cube.rotation.y += dt * 0.7;
  renderer.render(scene, camera);
});
// renderer.setAnimationLoop(null); // stop the loop
```

### 4. Responsive resize

```js
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();      // required after changing aspect
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
```

### 5. OrbitControls (orbit / pan / zoom)

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;          // inertial feel
controls.target.set(0, 0, 0);

renderer.setAnimationLoop(() => {
  controls.update();                    // needed every frame when damping is on
  renderer.render(scene, camera);
});
```

## Pitfalls

- **`Failed to resolve module specifier "three"`** → missing import map (or bundler
  config). Map both `"three"` and `"three/addons/"`; addon paths must end with `/`.
- **Black canvas, no errors** → camera is at the origin (inside/behind the object),
  or you used a lit material (`MeshStandardMaterial`) with no light. Move the camera
  back; use `MeshNormalMaterial`/`MeshBasicMaterial` to verify geometry first.
- **Nothing animates** → you never called `renderer.render` inside the loop, or you
  call `setAnimationLoop` but render outside it.
- **Stretched / squashed view on resize** → you resized the renderer but didn't
  update `camera.aspect` + `updateProjectionMatrix()`.
- **Blurry or jagged on HiDPI** → set `renderer.setPixelRatio(...)`; cap it (≈2) so
  4K/retina screens don't tank performance.
- **OrbitControls feel dead** → with `enableDamping = true` you must call
  `controls.update()` every frame.
- **Old tutorials use `<script src="three.min.js">`** → since r147 three.js ships
  ES modules only; use `type="module"` + import maps.

## References

- For coordinate conventions, the scene-graph (`Group`, parent/child transforms,
  `Object3D` add/remove), `OrthographicCamera` for 2.5D, and disposing of
  geometries/materials/textures to avoid leaks, read `references/scene-graph.md`.

## Related skills

- `threejs-materials-lighting` — give surfaces a lit look (lights, shadows, PBR).
- `threejs-gltf-loading` — load 3D models and play their animations.
- `pixijs-rendering` — 2D rendering in the browser.
- `fps-shooter` — a 3D genre template that composes three.js skills.
