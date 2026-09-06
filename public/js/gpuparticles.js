// GPU-batched point particles: every muzzle flash / impact puff of a kind lives in ONE
// THREE.Points with a ShaderMaterial, so N particles = 1 draw call and zero per-shot
// allocation (ring buffer over fixed attribute arrays). This replaces the old pattern of
// `new THREE.Sprite/Mesh` + `geometry.dispose()` per shot, which spiked draw calls and GC
// during firefights (the classic "30 draw calls per trigger pull" problem).
//
// The shader animates on the GPU: position = origin + vel*age, size grows with age, alpha
// fades out, dead particles collapse to gl_PointSize 0. The CPU only writes one slot per spawn.
import * as THREE from 'three';

const VERT = /* glsl */`
attribute vec3 aVel;
attribute float aBirth;
attribute float aLife;
attribute float aSize;
attribute float aGrow;
uniform float uTime;
uniform float uScale; // px per world-unit at 1m: height / (2*tan(fov/2))
varying float vAlpha;
void main() {
  float age = uTime - aBirth;
  float alive = step(0.0, age) * step(age, aLife);
  float frac = aLife > 0.0 ? clamp(age / aLife, 0.0, 1.0) : 1.0;
  vec3 p = position + aVel * age;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float sz = aSize + aGrow * age;
  gl_PointSize = alive * sz * (uScale / max(0.1, -mv.z));
  gl_Position = projectionMatrix * mv;
  vAlpha = alive * (1.0 - frac);
}
`;

const FRAG = /* glsl */`
uniform sampler2D uTex;
varying float vAlpha;
void main() {
  if (vAlpha <= 0.001) discard;
  vec4 tex = texture2D(uTex, gl_PointCoord);
  gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
}
`;

export class GPUParticles {
  // tex: sprite texture; additive: bright (flash) vs soft (smoke). max = ring-buffer slots.
  constructor(scene, camera, { tex, additive = false, max = 256 } = {}) {
    this.camera = camera;
    this.max = max;
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.birth = new Float32Array(max).fill(-1e3);
    this.life = new Float32Array(max).fill(1);
    this.size = new Float32Array(max);
    this.grow = new Float32Array(max);
    const dyn = (arr, n) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', dyn(this.pos, 3));
    geo.setAttribute('aVel', dyn(this.vel, 3));
    geo.setAttribute('aBirth', dyn(this.birth, 1));
    geo.setAttribute('aLife', dyn(this.life, 1));
    geo.setAttribute('aSize', dyn(this.size, 1));
    geo.setAttribute('aGrow', dyn(this.grow, 1));
    this.uniforms = {
      uTime: { value: 0 },
      uScale: { value: 600 },
      uTex: { value: tex },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false; // ring buffer spans the map; never cull
    this.points.renderOrder = 5;
    scene.add(this.points);
    this._geo = geo;
  }

  // One slot written; GPU does the rest. vel/grow default to a stationary, steady-size sprite.
  spawn(pos, { vel = null, life = 0.4, size = 0.5, grow = 0 } = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.pos[i * 3] = pos.x; this.pos[i * 3 + 1] = pos.y; this.pos[i * 3 + 2] = pos.z;
    if (vel) { this.vel[i * 3] = vel.x; this.vel[i * 3 + 1] = vel.y; this.vel[i * 3 + 2] = vel.z; }
    else { this.vel[i * 3] = this.vel[i * 3 + 1] = this.vel[i * 3 + 2] = 0; }
    this.birth[i] = this.uniforms.uTime.value;
    this.life[i] = life;
    this.size[i] = size;
    this.grow[i] = grow;
    const at = this._geo.attributes;
    at.position.needsUpdate = true; at.aVel.needsUpdate = true; at.aBirth.needsUpdate = true;
    at.aLife.needsUpdate = true; at.aSize.needsUpdate = true; at.aGrow.needsUpdate = true;
  }

  update(dt) {
    this.uniforms.uTime.value += dt;
    // keep point size proportional to viewport + fov so sprites stay world-sized
    const fov = (this.camera ? this.camera.fov : 70) * Math.PI / 180;
    this.uniforms.uScale.value = (typeof innerHeight !== 'undefined' ? innerHeight : 600) / (2 * Math.tan(fov / 2));
  }
}
