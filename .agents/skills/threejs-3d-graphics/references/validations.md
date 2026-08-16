# Threejs 3D Graphics - Validations

## Resource Disposal Required

### **Id**
check-disposal
### **Description**
Three.js resources must be disposed to prevent memory leaks
### **Pattern**
new THREE\.(Mesh|Geometry|Material|Texture)
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
\.dispose\(\)
### **Message**
Ensure geometries, materials, and textures are disposed when removed
### **Severity**
warning
### **Autofix**


## Pixel Ratio Handling

### **Id**
check-pixel-ratio
### **Description**
Renderer should set pixel ratio for proper display
### **Pattern**
new THREE\.WebGLRenderer
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
setPixelRatio|devicePixelRatio
### **Message**
Set pixel ratio with renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
### **Severity**
warning
### **Autofix**


## Resize Handler Required

### **Id**
check-resize-handler
### **Description**
Scene should handle window resize
### **Pattern**
new THREE\.WebGLRenderer
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
resize|onResize|ResizeObserver
### **Message**
Add resize handler to update camera aspect and renderer size
### **Severity**
warning
### **Autofix**


## WebGL Context Loss Handling

### **Id**
check-context-lost
### **Description**
Handle WebGL context loss for robustness
### **Pattern**
new THREE\.WebGLRenderer
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
webglcontextlost|contextlost
### **Message**
Consider handling WebGL context loss events
### **Severity**
info
### **Autofix**


## Proper Animation Loop

### **Id**
check-animation-loop
### **Description**
Use setAnimationLoop instead of manual RAF for visibility handling
### **Pattern**
requestAnimationFrame.*render
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
setAnimationLoop|visibilitychange
### **Message**
Consider using renderer.setAnimationLoop() for automatic visibility handling
### **Severity**
info
### **Autofix**


## Shader Precision Fallback

### **Id**
check-shader-precision
### **Description**
GLSL shaders should handle mediump fallback for mobile
### **Pattern**
precision highp float
### **File Glob**
**/*.{js,ts,jsx,tsx,glsl,frag,vert}
### **Match**
present
### **Context Pattern**
GL_FRAGMENT_PRECISION_HIGH|mediump
### **Message**
Add precision fallback for mobile: #ifdef GL_FRAGMENT_PRECISION_HIGH
### **Severity**
warning
### **Autofix**


## Async Texture Loading

### **Id**
check-texture-async
### **Description**
Textures should be loaded asynchronously
### **Pattern**
textureLoader\.load\(
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
loadAsync|callback|then|await
### **Message**
Use loadAsync or callbacks to handle texture loading
### **Severity**
info
### **Autofix**


## Environment Map for PBR

### **Id**
check-environment-map
### **Description**
PBR materials need environment maps to look correct
### **Pattern**
MeshStandardMaterial|MeshPhysicalMaterial
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
envMap|scene\.environment
### **Message**
PBR materials need environment maps for proper lighting
### **Severity**
info
### **Autofix**


## Camera Frustum Optimization

### **Id**
check-camera-frustum
### **Description**
Near/far values should be optimized to prevent z-fighting
### **Pattern**
PerspectiveCamera\([^)]+0\.00?1
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Message**
Very small near value (0.001) can cause z-fighting. Use largest near value possible.
### **Severity**
warning
### **Autofix**


## Instancing for Repeated Objects

### **Id**
check-instancing
### **Description**
Use InstancedMesh for many similar objects
### **Pattern**
for.*new THREE\.Mesh
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
InstancedMesh
### **Message**
Consider using InstancedMesh for better performance with repeated objects
### **Severity**
info
### **Autofix**


## Controls Disposal

### **Id**
check-controls-dispose
### **Description**
OrbitControls and other controls must be disposed
### **Pattern**
new.*Controls\(
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
controls\.dispose|dispose.*controls
### **Message**
Dispose controls when cleaning up to prevent event listener leaks
### **Severity**
warning
### **Autofix**


## Color Space Configuration

### **Id**
check-color-space
### **Description**
Proper color space for correct color output
### **Pattern**
new THREE\.WebGLRenderer
### **File Glob**
**/*.{js,ts,jsx,tsx}
### **Match**
present
### **Context Pattern**
outputColorSpace|outputEncoding
### **Message**
Set renderer.outputColorSpace = THREE.SRGBColorSpace for correct colors
### **Severity**
info
### **Autofix**
