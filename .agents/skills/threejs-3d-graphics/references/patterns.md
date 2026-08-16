# Three.js 3D Graphics

## Patterns


---
  #### **Name**
Scene Setup Foundation
  #### **Context**
Every Three.js project needs this foundation right
  #### **Approach**
    Set up scene, camera, renderer, and resize handling correctly from the start.
    Handle device pixel ratio, proper cleanup, and animation loop.
    
  #### **Example**
    // scene-setup.js - The right way
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    
    class ThreeScene {
      constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
    
        // Camera with good defaults
        this.camera = new THREE.PerspectiveCamera(
          75,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        );
        this.camera.position.set(0, 5, 10);
    
        // Renderer with proper settings
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        container.appendChild(this.renderer.domElement);
    
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    
        // Handle resize
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    
        // Animation loop
        this.animate = this.animate.bind(this);
        this.animationId = null;
      }
    
      handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
    
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
    
      animate() {
        this.animationId = requestAnimationFrame(this.animate);
    
        const delta = this.clock.getDelta();
        this.controls.update();
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
      }
    
      update(delta) {
        // Override in subclass
      }
    
      start() {
        this.animate();
      }
    
      dispose() {
        // Critical: Clean up everything
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);
    
        this.controls.dispose();
        this.renderer.dispose();
    
        // Dispose all scene objects
        this.scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => this.disposeMaterial(m));
            } else {
              this.disposeMaterial(object.material);
            }
          }
        });
    
        this.container.removeChild(this.renderer.domElement);
      }
    
      disposeMaterial(material) {
        Object.keys(material).forEach(key => {
          if (material[key] && material[key].isTexture) {
            material[key].dispose();
          }
        });
        material.dispose();
      }
    }
    

---
  #### **Name**
Asset Loading Pipeline
  #### **Context**
Loading GLTF/GLB models, textures, and handling loading states
  #### **Approach**
    Use LoadingManager for coordinated loading, handle errors gracefully,
    and optimize assets for web (Draco compression, texture optimization).
    
  #### **Example**
    // asset-loader.js - Production-ready loading
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
    import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
    
    class AssetLoader {
      constructor(renderer) {
        // Loading manager for progress tracking
        this.manager = new THREE.LoadingManager();
        this.manager.onProgress = (url, loaded, total) => {
          console.log(`Loading: ${Math.round(loaded / total * 100)}%`);
        };
    
        // GLTF loader with Draco support
        this.gltfLoader = new GLTFLoader(this.manager);
    
        // Draco decoder for compressed meshes
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        this.gltfLoader.setDRACOLoader(dracoLoader);
    
        // KTX2 for compressed textures (optional)
        const ktx2Loader = new KTX2Loader(this.manager);
        ktx2Loader.setTranscoderPath('/basis/');
        ktx2Loader.detectSupport(renderer);
        this.gltfLoader.setKTX2Loader(ktx2Loader);
    
        // Texture loader
        this.textureLoader = new THREE.TextureLoader(this.manager);
    
        // Cache
        this.cache = new Map();
      }
    
      async loadModel(url, options = {}) {
        // Check cache first
        if (this.cache.has(url)) {
          return this.cache.get(url).clone();
        }
    
        try {
          const gltf = await this.gltfLoader.loadAsync(url);
    
          // Process the model
          gltf.scene.traverse((node) => {
            if (node.isMesh) {
              // Enable shadows by default
              node.castShadow = options.castShadow ?? true;
              node.receiveShadow = options.receiveShadow ?? true;
    
              // Fix common material issues
              if (node.material) {
                node.material.side = options.side ?? THREE.FrontSide;
              }
            }
          });
    
          // Cache the original
          this.cache.set(url, gltf.scene);
    
          return gltf.scene.clone();
        } catch (error) {
          console.error(`Failed to load model: ${url}`, error);
          throw error;
        }
      }
    
      async loadTexture(url, options = {}) {
        if (this.cache.has(url)) {
          return this.cache.get(url);
        }
    
        const texture = await this.textureLoader.loadAsync(url);
    
        // Apply common settings
        texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
        texture.wrapS = options.wrapS ?? THREE.RepeatWrapping;
        texture.wrapT = options.wrapT ?? THREE.RepeatWrapping;
        texture.generateMipmaps = options.generateMipmaps ?? true;
    
        // Anisotropic filtering for better quality at angles
        texture.anisotropy = options.anisotropy ?? 16;
    
        this.cache.set(url, texture);
        return texture;
      }
    
      // Load multiple assets in parallel
      async loadBatch(assets) {
        const promises = assets.map(asset => {
          if (asset.type === 'model') {
            return this.loadModel(asset.url, asset.options);
          } else if (asset.type === 'texture') {
            return this.loadTexture(asset.url, asset.options);
          }
        });
    
        return Promise.all(promises);
      }
    }
    

---
  #### **Name**
Custom Shader Development
  #### **Context**
Writing custom GLSL shaders for visual effects
  #### **Approach**
    Start with ShaderMaterial, use uniforms for dynamic values,
    handle precision issues across devices, and debug with visual output.
    
  #### **Example**
    // custom-shader.js - Gradient shader with animation
    import * as THREE from 'three';
    
    const GradientShader = {
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#ff6b6b') },
        uColor2: { value: new THREE.Color('#4ecdc4') },
        uNoiseScale: { value: 3.0 },
        uNoiseSpeed: { value: 0.5 }
      },
    
      vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vPosition;
    
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
    
      fragmentShader: /* glsl */`
        // Use mediump for mobile compatibility
        precision mediump float;
    
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uNoiseScale;
        uniform float uNoiseSpeed;
    
        varying vec2 vUv;
        varying vec3 vPosition;
    
        // Simple noise function
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
    
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
    
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
    
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
    
        void main() {
          // Animated noise
          float n = noise(vUv * uNoiseScale + uTime * uNoiseSpeed);
    
          // Gradient based on noise and UV
          float gradient = vUv.y + n * 0.3;
    
          // Mix colors
          vec3 color = mix(uColor1, uColor2, gradient);
    
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };
    
    // Usage
    function createGradientMesh() {
      const geometry = new THREE.PlaneGeometry(10, 10, 32, 32);
      const material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(GradientShader.uniforms),
        vertexShader: GradientShader.vertexShader,
        fragmentShader: GradientShader.fragmentShader,
        side: THREE.DoubleSide
      });
    
      const mesh = new THREE.Mesh(geometry, material);
    
      // Update in animation loop
      mesh.userData.update = (time) => {
        material.uniforms.uTime.value = time;
      };
    
      return mesh;
    }
    

---
  #### **Name**
Performance Optimization
  #### **Context**
Making 3D scenes run at 60fps on all devices
  #### **Approach**
    Profile with Spector.js, reduce draw calls with instancing and merging,
    optimize geometries, use LOD, and implement frustum culling.
    
  #### **Example**
    // performance-optimization.js
    import * as THREE from 'three';
    
    // 1. Instanced Mesh for many similar objects
    function createInstancedForest(treeGeometry, treeMaterial, count = 1000) {
      const instancedMesh = new THREE.InstancedMesh(
        treeGeometry,
        treeMaterial,
        count
      );
    
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
    
      for (let i = 0; i < count; i++) {
        // Random position
        dummy.position.set(
          (Math.random() - 0.5) * 100,
          0,
          (Math.random() - 0.5) * 100
        );
    
        // Random rotation
        dummy.rotation.y = Math.random() * Math.PI * 2;
    
        // Random scale variation
        const scale = 0.8 + Math.random() * 0.4;
        dummy.scale.setScalar(scale);
    
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    
        // Optional: per-instance colors
        color.setHSL(0.3 + Math.random() * 0.1, 0.5, 0.4);
        instancedMesh.setColorAt(i, color);
      }
    
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
    
      return instancedMesh;
    }
    
    // 2. Geometry Merging for static objects
    function mergeStaticGeometry(meshes) {
      const geometries = meshes.map(mesh => {
        // Apply world transform to geometry
        mesh.updateMatrixWorld();
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);
        return geometry;
      });
    
      const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
      return new THREE.Mesh(mergedGeometry, meshes[0].material);
    }
    
    // 3. Level of Detail (LOD)
    function createLODObject() {
      const lod = new THREE.LOD();
    
      // High detail - close up
      const highDetail = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      lod.addLevel(highDetail, 0);
    
      // Medium detail
      const mediumDetail = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      lod.addLevel(mediumDetail, 20);
    
      // Low detail - far away
      const lowDetail = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      lod.addLevel(lowDetail, 50);
    
      return lod;
    }
    
    // 4. Frustum Culling Helper
    class FrustumCuller {
      constructor(camera) {
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
        this.camera = camera;
      }
    
      update() {
        this.projScreenMatrix.multiplyMatrices(
          this.camera.projectionMatrix,
          this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
      }
    
      isVisible(object) {
        if (object.geometry?.boundingSphere === null) {
          object.geometry.computeBoundingSphere();
        }
    
        const sphere = object.geometry?.boundingSphere;
        if (!sphere) return true;
    
        const center = sphere.center.clone()
          .applyMatrix4(object.matrixWorld);
        const radius = sphere.radius * object.scale.x;
    
        return this.frustum.intersectsSphere(
          new THREE.Sphere(center, radius)
        );
      }
    }
    
    // 5. Texture Optimization
    function optimizeTexture(texture, renderer) {
      // Get max anisotropy supported
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.anisotropy = Math.min(16, maxAnisotropy);
    
      // Use power-of-two textures for mipmaps
      if (!THREE.MathUtils.isPowerOfTwo(texture.image.width) ||
          !THREE.MathUtils.isPowerOfTwo(texture.image.height)) {
        console.warn('Non-POT texture, mipmaps disabled');
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
      }
    
      return texture;
    }
    

---
  #### **Name**
Animation System
  #### **Context**
Skeletal animation, morph targets, and procedural animation
  #### **Approach**
    Use AnimationMixer for GLTF animations, blend between clips,
    and combine with procedural animation for dynamic behavior.
    
  #### **Example**
    // animation-system.js
    import * as THREE from 'three';
    
    class CharacterAnimator {
      constructor(model) {
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
        this.actions = new Map();
        this.currentAction = null;
        this.previousAction = null;
      }
    
      // Add animations from GLTF
      addAnimations(animations) {
        animations.forEach(clip => {
          const action = this.mixer.clipAction(clip);
          this.actions.set(clip.name.toLowerCase(), action);
        });
      }
    
      // Play animation with crossfade
      play(name, options = {}) {
        const {
          fadeIn = 0.3,
          fadeOut = 0.3,
          loop = THREE.LoopRepeat,
          clampWhenFinished = false,
          timeScale = 1
        } = options;
    
        const action = this.actions.get(name.toLowerCase());
        if (!action) {
          console.warn(`Animation '${name}' not found`);
          return;
        }
    
        // Store previous action for crossfade
        this.previousAction = this.currentAction;
        this.currentAction = action;
    
        // Configure the action
        action.loop = loop;
        action.clampWhenFinished = clampWhenFinished;
        action.timeScale = timeScale;
    
        // Reset and play
        action.reset();
        action.fadeIn(fadeIn);
        action.play();
    
        // Fade out previous
        if (this.previousAction && this.previousAction !== action) {
          this.previousAction.fadeOut(fadeOut);
        }
    
        return action;
      }
    
      // Blend between animations
      blend(name1, name2, weight) {
        const action1 = this.actions.get(name1.toLowerCase());
        const action2 = this.actions.get(name2.toLowerCase());
    
        if (!action1 || !action2) return;
    
        // Both need to be playing
        action1.play();
        action2.play();
    
        // Set weights
        action1.setEffectiveWeight(1 - weight);
        action2.setEffectiveWeight(weight);
      }
    
      update(delta) {
        this.mixer.update(delta);
      }
    
      // Procedural animation helpers
      addProcedural(name, updateFn) {
        this.model.userData.procedural = this.model.userData.procedural || {};
        this.model.userData.procedural[name] = updateFn;
      }
    
      updateProcedural(delta) {
        const procedural = this.model.userData.procedural || {};
        Object.values(procedural).forEach(fn => fn(delta));
      }
    }
    
    // Procedural animation example - breathing
    function addBreathingAnimation(model) {
      const chest = model.getObjectByName('Chest');
      if (!chest) return;
    
      const originalScale = chest.scale.clone();
      let time = 0;
    
      return (delta) => {
        time += delta;
        const breathe = Math.sin(time * 2) * 0.02 + 1;
        chest.scale.set(
          originalScale.x * breathe,
          originalScale.y * breathe,
          originalScale.z * breathe
        );
      };
    }
    

## Anti-Patterns


---
  #### **Name**
Not Disposing Resources
  #### **Description**
Memory leaks from undisposed geometries, materials, and textures
  #### **Wrong**
    // Just removing from scene - MEMORY LEAK!
    scene.remove(mesh);
    mesh = null; // Geometry and material still in GPU memory
    
  #### **Right**
    // Proper disposal
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    if (mesh.material.map) mesh.material.map.dispose();
    mesh = null;
    

---
  #### **Name**
Creating Objects in Animation Loop
  #### **Description**
Creating new objects every frame causes GC stutters
  #### **Wrong**
    function animate() {
      // Creating new Vector3 every frame - GC nightmare
      const direction = new THREE.Vector3(1, 0, 0);
      mesh.position.add(direction.multiplyScalar(0.1));
    }
    
  #### **Right**
    // Reuse objects
    const direction = new THREE.Vector3(1, 0, 0);
    const tempVector = new THREE.Vector3();
    
    function animate() {
      tempVector.copy(direction).multiplyScalar(0.1);
      mesh.position.add(tempVector);
    }
    

---
  #### **Name**
Ignoring Device Pixel Ratio
  #### **Description**
Blurry renders on high-DPI screens or performance issues
  #### **Wrong**
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Blurry on Retina displays!
    
  #### **Right**
    // Limit DPR to 2 for performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    

---
  #### **Name**
Synchronous Asset Loading
  #### **Description**
Blocking the main thread while loading assets
  #### **Wrong**
    const texture = textureLoader.load('huge-texture.jpg');
    // Using texture immediately - might not be loaded!
    mesh.material.map = texture;
    
  #### **Right**
    // Async loading with handling
    textureLoader.loadAsync('huge-texture.jpg')
      .then(texture => {
        mesh.material.map = texture;
        mesh.material.needsUpdate = true;
      })
      .catch(error => {
        console.error('Texture load failed:', error);
        // Use fallback texture
      });
    

---
  #### **Name**
Not Using Instancing for Repeated Objects
  #### **Description**
Thousands of draw calls for similar objects
  #### **Wrong**
    // 1000 separate meshes = 1000 draw calls
    for (let i = 0; i < 1000; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(Math.random() * 100, 0, Math.random() * 100);
      scene.add(mesh);
    }
    
  #### **Right**
    // InstancedMesh = 1 draw call
    const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < 1000; i++) {
      dummy.position.set(Math.random() * 100, 0, Math.random() * 100);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedMesh);
    