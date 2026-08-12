/* ============================================================================
   harness-stub.mjs — STUB DE DOM/CANVAS/THREE para subir o Game real em node puro.
   ----------------------------------------------------------------------------
   Extraído do botsim.mjs para ser reusado por bot-record / bot-train / bot-brain-check.
   Mesma fronteira: o jogo roda em NODE, sem Chrome e sem render — o _updateBot real, os
   mapas reais. initHarness() planta os globais, resolve o `three` vendorizado e devolve
   os módulos do jogo já importados.
   ============================================================================ */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.resolve(HERE, '../../public/js');

const ctx2d = new Proxy({}, {
  get: (t, k) => {
    if (k === 'canvas') return { width: 8, height: 8 };
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop() {} });
    if (k === 'getImageData' || k === 'createImageData') return (a, b, w, h) => {
      const W = (h === undefined ? a : w) | 0, H = (h === undefined ? b : h) | 0;
      return { data: new Uint8ClampedArray(Math.max(4, W * H * 4)), width: W, height: H };
    };
    if (k === 'measureText') return () => ({ width: 10 });
    return () => {};
  },
});

export function mkEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    style: new Proxy({ setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; }, getPropertyValue(k) { return this[k] ?? ''; } },
      { get: (t, k) => t[k] ?? '', set: (t, k, v) => { t[k] = v; return true; } }),
    className: '', textContent: '', innerHTML: '', children: [], dataset: {}, offsetWidth: 100, offsetHeight: 20, width: 8, height: 8,
    classList: {
      _s: new Set(), add(...a) { a.forEach(x => this._s.add(x)); }, remove(...a) { a.forEach(x => this._s.delete(x)); },
      toggle(x, v) { if (v === undefined) v = !this._s.has(x); v ? this._s.add(x) : this._s.delete(x); }, contains(x) { return this._s.has(x); },
    },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    prepend(c) { this.children.unshift(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, getContext: () => ctx2d,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 20 }),
    toDataURL: () => 'data:,', focus() {}, blur() {}, insertBefore(c) { this.children.push(c); return c; },
  };
  Object.defineProperty(el, 'firstChild', { get() { return this.children[0] || null; } });
  Object.defineProperty(el, 'lastChild', { get() { return this.children[this.children.length - 1] || null; } });
  return el;
}

function plantGlobals() {
  globalThis.__els = {};
  globalThis.document = {
    createElement: (t) => mkEl(t), createElementNS: (ns, t) => mkEl(t),
    getElementById: (id) => globalThis.__els[id] || (globalThis.__els[id] = mkEl('div')),
    body: mkEl('body'), documentElement: mkEl('html'),
    addEventListener() {}, removeEventListener() {},
    querySelector: (sel) => (globalThis.__els['sel:' + sel] || (globalThis.__els['sel:' + sel] = mkEl('div'))), querySelectorAll: () => [],
    exitPointerLock() {}, pointerLockElement: null,
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.location = { search: process.env.SIM_QS || '', href: 'http://sim/' };
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true });
  globalThis.innerWidth = 1008; globalThis.innerHeight = 655; globalThis.devicePixelRatio = 1;
  globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 0);
  globalThis.cancelAnimationFrame = () => {};
  globalThis.ImageData = class { constructor(d, w, h) { this.data = d; this.width = w; this.height = h; } };
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return ctx2d; } };
  globalThis.fetch = async () => { throw new Error('harness sem rede'); };
  globalThis.Audio = class { play() {} pause() {} };
}

function plantThreeShim() {
  const root = path.resolve(HERE, '../../..');
  const shim = path.join(root, 'node_modules', 'three');
  if (!fs.existsSync(path.join(shim, 'index.js'))) {
    fs.mkdirSync(shim, { recursive: true });
    fs.writeFileSync(path.join(shim, 'package.json'), JSON.stringify({
      name: 'three', version: '0.160.0', type: 'module', main: 'index.js',
      exports: { '.': './index.js', './addons/*': './addons/*' },
    }));
    try { fs.symlinkSync(path.resolve(HERE, '../../public/vendor/three.module.js'), path.join(shim, 'index.js')); } catch {}
    try { fs.symlinkSync(path.resolve(HERE, '../../public/vendor/addons'), path.join(shim, 'addons'), 'dir'); } catch {}
  }
}

export function makeRenderer() {
  const base = {
    capabilities: { getMaxAnisotropy: () => 4, isWebGL2: true }, shadowMap: { enabled: true, type: 0 },
    domElement: mkEl('canvas'), info: { render: {}, memory: {} }, outputColorSpace: '', toneMapping: 0, toneMappingExposure: 1,
    getPixelRatio: () => 1, getContext: () => ({}), getSize: (v) => (v ? v.set(1008, 655) : { width: 1008, height: 655 }),
    getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0, getClearColor: (c) => c,
    getClearAlpha: () => 1, xr: { enabled: false },
  };
  return new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => {}) });
}

export const sfx = new Proxy({}, { get: () => () => {} });

// RNG determinístico (mesma semente = mesma partida). Robustez = média de N sementes.
export function seedRandom(seed) {
  let s = seed >>> 0;
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// Sobe os globais + shim e importa os módulos do jogo. Chamar UMA vez por processo.
export async function initHarness() {
  plantGlobals();
  plantThreeShim();
  const THREE = await import('three');
  const { MAPS } = await import(`${JS}/maps.js`);
  const { initTextures } = await import(`${JS}/textures.js`);
  const { Game } = await import(`${JS}/game.js`);
  const { CHARACTERS } = await import(`${JS}/characters.js`);
  const PCHAR = (CHARACTERS.find((c) => c.team === 'E') || CHARACTERS[0]).id;
  return { THREE, MAPS, initTextures, Game, CHARACTERS, PCHAR, makeRenderer, sfx, seedRandom, mkEl };
}
