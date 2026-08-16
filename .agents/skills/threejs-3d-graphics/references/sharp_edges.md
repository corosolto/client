# Threejs 3D Graphics - Sharp Edges

## WebGL Context Can Be Lost Without Warning

### **Id**
webgl-context-lost
### **Severity**
CRITICAL
### **Description**
Browser can destroy your WebGL context anytime - handle it or your app dies
### **Symptoms**
  - Black screen after tab switch
  - "WebGL context lost" in console
  - All textures gone, scene empty
  - Mobile browser tab reload kills everything
### **Detection Pattern**
WebGLRenderer|createRenderer|new THREE
### **Solution**
  WebGL Context Loss Is Normal, Not An Error:
  
  The browser WILL lose your WebGL context when:
  - User switches tabs (mobile especially)
  - GPU driver crashes/updates
  - Too many WebGL contexts (browser limit: ~8-16)
  - System goes to sleep
  
  You MUST handle this:
  ```javascript
  // Handle context loss
  const canvas = renderer.domElement;
  
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); // Important!
    console.log('WebGL context lost');
  
    // Stop animation loop
    cancelAnimationFrame(animationId);
  
    // Notify user
    showMessage('Graphics lost, restoring...');
  });
  
  canvas.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored');
  
    // Reinitialize everything
    initScene();
    reloadTextures();
  
    // Restart animation
    animate();
  });
  
  // Test context loss (for debugging)
  // renderer.forceContextLoss();
  
  // Restore after simulated loss
  // renderer.forceContextRestore();
  ```
  
  Prevention strategies:
  - Don't create multiple renderers
  - Dispose unused resources
  - Use powerPreference: 'high-performance'
  
### **References**
  - WebGL context loss handling

## Three.js Objects Must Be Manually Disposed

### **Id**
memory-leaks-disposal
### **Severity**
CRITICAL
### **Description**
GPU memory leaks will crash browsers - dispose everything
### **Symptoms**
  - Memory usage grows over time
  - Browser becomes slow/unresponsive
  - "Out of memory" crashes
  - Performance degrades the longer app runs
### **Detection Pattern**
new THREE\.|Geometry|Material|Texture
### **Solution**
  Three.js Does NOT Have Garbage Collection for GPU Resources:
  
  JavaScript GC only handles JS objects. GPU resources
  (geometries, materials, textures) stay in VRAM forever
  unless you explicitly dispose them.
  
  ```javascript
  // WRONG - memory leak
  function updateMesh() {
    scene.remove(mesh);
    mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    scene.add(mesh);
    // Old geometry is STILL in GPU memory!
  }
  
  // RIGHT - proper disposal
  function updateMesh() {
    const oldGeometry = mesh.geometry;
    mesh.geometry = new THREE.BoxGeometry();
    oldGeometry.dispose(); // Free GPU memory
  }
  
  // Complete disposal helper
  function disposeObject(obj) {
    if (obj.geometry) {
      obj.geometry.dispose();
    }
  
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(disposeMaterial);
      } else {
        disposeMaterial(obj.material);
      }
    }
  
    if (obj.children) {
      obj.children.forEach(disposeObject);
    }
  }
  
  function disposeMaterial(material) {
    // Dispose all textures
    for (const key in material) {
      const value = material[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    }
    material.dispose();
  }
  
  // Scene cleanup
  function disposeScene() {
    scene.traverse(disposeObject);
    renderer.dispose();
    controls?.dispose();
  }
  ```
  
  Track your resources:
  - Use console.log(renderer.info.memory) to monitor
  - Check textures, geometries, programs counts
  
### **References**
  - Three.js dispose patterns

## Mobile GPUs Don't Support highp In Fragment Shaders

### **Id**
mobile-shader-precision
### **Severity**
HIGH
### **Description**
Shaders that work on desktop fail silently on mobile
### **Symptoms**
  - Black or corrupted output on mobile only
  - "precision" errors in shader compilation
  - Works on desktop, breaks on phones
  - iOS Safari shader failures
### **Detection Pattern**
ShaderMaterial|RawShaderMaterial|fragmentShader
### **Solution**
  Mobile GPU Precision Is Limited:
  
  Desktop: highp, mediump, lowp all work
  Mobile: highp often unavailable in fragment shaders
  
  ```glsl
  // WRONG - fails on many mobile devices
  precision highp float;
  
  void main() {
    // Complex calculations needing high precision
    float value = someComplexCalculation();
    gl_FragColor = vec4(value);
  }
  
  // RIGHT - check support and fallback
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  
  void main() {
    float value = someComplexCalculation();
    gl_FragColor = vec4(value);
  }
  ```
  
  JavaScript detection:
  ```javascript
  const gl = renderer.getContext();
  const highp = gl.getShaderPrecisionFormat(
    gl.FRAGMENT_SHADER,
    gl.HIGH_FLOAT
  );
  
  const hasHighPrecision = highp.precision > 0;
  console.log('Fragment highp support:', hasHighPrecision);
  
  // Adjust quality based on capabilities
  if (!hasHighPrecision) {
    // Use simpler shaders
    // Reduce precision-dependent effects
  }
  ```
  
  Safe practices:
  - Always use mediump unless you NEED highp
  - Test on real mobile devices
  - Provide fallback shaders
  
### **References**
  - WebGL shader precision

## Maximum Texture Size Varies Wildly

### **Id**
texture-size-limits
### **Severity**
HIGH
### **Description**
Your 8K textures won't load on many devices
### **Symptoms**
  - Textures not appearing on some devices
  - Black textures on mobile
  - Console warnings about texture size
  - Works on dev machine, fails in production
### **Detection Pattern**
TextureLoader|loadTexture|new.*Texture
### **Solution**
  Max Texture Size By Device:
  
  Desktop: Usually 16384x16384
  Modern mobile: 4096x4096
  Old mobile: 2048x2048
  Very old: 1024x1024
  
  ```javascript
  // Check max texture size
  const gl = renderer.getContext();
  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  console.log('Max texture size:', maxSize);
  
  // Load appropriate texture
  async function loadOptimalTexture(basePath) {
    const gl = renderer.getContext();
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  
    let size;
    if (maxSize >= 4096) {
      size = '4k';
    } else if (maxSize >= 2048) {
      size = '2k';
    } else {
      size = '1k';
    }
  
    return textureLoader.loadAsync(`${basePath}_${size}.jpg`);
  }
  
  // Resize texture if needed
  function ensureTextureSize(texture, maxDimension) {
    const image = texture.image;
  
    if (image.width <= maxDimension &&
        image.height <= maxDimension) {
      return texture;
    }
  
    // Resize using canvas
    const canvas = document.createElement('canvas');
    const scale = maxDimension / Math.max(image.width, image.height);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
  
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
    texture.image = canvas;
    texture.needsUpdate = true;
  
    return texture;
  }
  ```
  
  Best practices:
  - Provide multiple texture sizes
  - Use texture atlases to reduce count
  - Compress with KTX2/Basis Universal
  
### **References**
  - WebGL texture limits

## Z-Fighting Creates Flickering Artifacts

### **Id**
z-fighting
### **Severity**
MEDIUM
### **Description**
Overlapping surfaces at similar depths fight for visibility
### **Symptoms**
  - Flickering/shimmering surfaces
  - Textures seem to "fight" each other
  - Artifacts on coplanar surfaces
  - Gets worse at distance from camera
### **Detection Pattern**
near:|far:|PerspectiveCamera|OrthographicCamera
### **Solution**
  Z-Fighting Is A Precision Problem:
  
  Depth buffer has limited precision (24-bit typically).
  Far/near ratio affects precision distribution.
  
  ```javascript
  // WRONG - huge near/far range wastes precision
  const camera = new THREE.PerspectiveCamera(
    75,
    aspect,
    0.001,    // Too small!
    100000    // Too large!
  );
  // Ratio: 100,000,000:1 - terrible precision!
  
  // RIGHT - minimize the range
  const camera = new THREE.PerspectiveCamera(
    75,
    aspect,
    0.1,      // As large as possible
    1000      // As small as possible
  );
  // Ratio: 10,000:1 - much better!
  
  // Dynamic near/far based on scene
  function updateCameraNearFar(camera, scene) {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
  
    camera.near = maxDim * 0.001;
    camera.far = maxDim * 10;
    camera.updateProjectionMatrix();
  }
  ```
  
  Fix coplanar surfaces:
  ```javascript
  // Use polygonOffset for decals/labels
  const decalMaterial = new THREE.MeshBasicMaterial({
    map: decalTexture,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnit: -1
  });
  
  // Or offset position slightly
  decalMesh.position.z += 0.01; // Move slightly forward
  ```
  
  Use logarithmic depth for huge scenes:
  ```javascript
  const renderer = new THREE.WebGLRenderer({
    logarithmicDepthBuffer: true // Better precision at distance
  });
  ```
  
### **References**
  - Depth buffer precision

## OrbitControls Adds Event Listeners That Leak

### **Id**
orbit-controls-events
### **Severity**
MEDIUM
### **Description**
Controls keep listening even after you think they're gone
### **Symptoms**
  - Multiple OrbitControls instances fighting
  - Events firing after scene change
  - Cannot create new controls properly
  - Touch events broken on mobile
### **Detection Pattern**
OrbitControls|TrackballControls|FlyControls
### **Solution**
  Controls Attach To DOM - You Must Dispose:
  
  ```javascript
  // WRONG - leaks event listeners
  function createScene() {
    const controls = new OrbitControls(camera, renderer.domElement);
    // When this function is called again,
    // old controls still listening!
  }
  
  // RIGHT - dispose before creating new
  let controls = null;
  
  function createScene() {
    if (controls) {
      controls.dispose();
    }
    controls = new OrbitControls(camera, renderer.domElement);
  }
  
  // Complete cleanup
  function cleanup() {
    if (controls) {
      controls.dispose();
      controls = null;
    }
  }
  ```
  
  Common issues:
  - React/Vue hot reload creates multiple controls
  - Scene transitions don't clean up
  - Multiple canvases on same page
  
  Debug listeners:
  ```javascript
  // Check for leaked listeners
  const listeners = getEventListeners(renderer.domElement);
  console.log('Canvas listeners:', listeners);
  ```
  
### **References**
  - Three.js controls cleanup

## GLTF Models Often Have Material Problems

### **Id**
gltf-material-issues
### **Severity**
MEDIUM
### **Description**
Models look different in Three.js than in Blender/modeling software
### **Symptoms**
  - Colors look wrong/washed out
  - Metallic/roughness not matching
  - Black materials after loading
  - Emissive not working
### **Detection Pattern**
GLTFLoader|loadGLTF|\.gltf|\.glb
### **Solution**
  GLTF Material Gotchas:
  
  1. Color space issues:
  ```javascript
  // Ensure correct color output
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  // GLTF loader should handle textures, but check:
  gltf.scene.traverse((node) => {
    if (node.material?.map) {
      node.material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
  ```
  
  2. Environment maps for PBR:
  ```javascript
  // PBR materials NEED environment lighting
  import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
  
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load('environment.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture; // Optional
  });
  ```
  
  3. Tone mapping for HDR:
  ```javascript
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  ```
  
  4. Fix black materials:
  ```javascript
  gltf.scene.traverse((node) => {
    if (node.isMesh) {
      // Ensure materials are usable
      if (!node.material.envMap && scene.environment) {
        node.material.envMap = scene.environment;
        node.material.needsUpdate = true;
      }
    }
  });
  ```
  
  Export settings in Blender:
  - Use glTF 2.0 format
  - Enable "Lighting: Standard" or "Unitless"
  - Include all textures
  - Apply modifiers
  
### **References**
  - GLTF material troubleshooting

## requestAnimationFrame Continues When Tab Is Hidden

### **Id**
animation-performance
### **Severity**
MEDIUM
### **Description**
Animation keeps running, wasting resources in background
### **Symptoms**
  - CPU usage when tab not visible
  - Battery drain on mobile
  - Catching up on animations when returning
  - State getting out of sync
### **Detection Pattern**
requestAnimationFrame|animate|render.*loop
### **Solution**
  Handle Tab Visibility:
  
  ```javascript
  let isVisible = true;
  let lastTime = 0;
  
  document.addEventListener('visibilitychange', () => {
    isVisible = document.visibilityState === 'visible';
  
    if (isVisible) {
      // Reset delta time to avoid huge jumps
      lastTime = performance.now();
      animate();
    }
  });
  
  function animate(currentTime = 0) {
    if (!isVisible) return;
  
    requestAnimationFrame(animate);
  
    // Cap delta to prevent huge jumps
    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
  
    update(delta);
    renderer.render(scene, camera);
  }
  ```
  
  Or use Three.js built-in:
  ```javascript
  // setAnimationLoop handles visibility automatically
  renderer.setAnimationLoop((time) => {
    controls.update();
    renderer.render(scene, camera);
  });
  
  // Stop when needed
  renderer.setAnimationLoop(null);
  ```
  
### **References**
  - Page Visibility API

## Too Many Draw Calls Kills Performance

### **Id**
draw-call-explosion
### **Severity**
HIGH
### **Description**
Each mesh with unique material = separate draw call
### **Symptoms**
  - Low FPS despite simple geometry
  - GPU not fully utilized
  - "programs" count in renderer.info is high
  - Performance drops with more objects
### **Detection Pattern**
new THREE.Mesh|scene.add|for.*Mesh
### **Solution**
  Check Your Draw Calls:
  
  ```javascript
  // Monitor in dev
  console.log(renderer.info.render.calls); // Draw calls
  console.log(renderer.info.memory.geometries);
  console.log(renderer.info.programs.length); // Shaders
  ```
  
  Reduction strategies:
  
  1. Merge geometries:
  ```javascript
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  
  const geometries = meshes.map(m => m.geometry);
  const merged = mergeGeometries(geometries);
  const singleMesh = new THREE.Mesh(merged, sharedMaterial);
  ```
  
  2. Use InstancedMesh:
  ```javascript
  const instancedMesh = new THREE.InstancedMesh(
    geometry,
    material,
    count
  );
  // 1 draw call for thousands of objects
  ```
  
  3. Share materials:
  ```javascript
  // WRONG - 100 materials = 100 draw calls
  meshes.forEach(m => {
    m.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  });
  
  // RIGHT - 1 shared material
  const sharedMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  meshes.forEach(m => {
    m.material = sharedMaterial;
  });
  ```
  
  4. Texture atlases:
  ```javascript
  // Instead of 10 textures, use 1 atlas
  // Adjust UVs to point to correct region
  ```
  
  Target: < 100 draw calls for 60fps on mobile
  
### **References**
  - Three.js performance tips