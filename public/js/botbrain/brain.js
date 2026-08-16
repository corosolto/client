// Inferência sem o runtime TF.js. O formato e a arquitetura precisam casar com bot-train.mjs.
import { buildState, decodeDaim, STATE_DIM } from './features.js';
import { VERSION } from '../version.js';

function relu(v) { for (let i = 0; i < v.length; i++) if (v[i] < 0) v[i] = 0; return v; }
function tanh(v) { for (let i = 0; i < v.length; i++) v[i] = Math.tanh(v[i]); return v; }
function sigmoid(v) { for (let i = 0; i < v.length; i++) v[i] = 1 / (1 + Math.exp(-v[i])); return v; }

// out[j] = sum_i x[i]*W[i*cols+j] + b[j]   (W em row-major [rows,cols], como o tfjs grava)
function dense(x, W, b, rows, cols) {
  const out = new Float32Array(cols);
  for (let j = 0; j < cols; j++) out[j] = b[j];
  for (let i = 0; i < rows; i++) {
    const xi = x[i]; if (xi === 0) continue;
    const base = i * cols;
    for (let j = 0; j < cols; j++) out[j] += xi * W[base + j];
  }
  return out;
}

export class BotBrain {
  constructor() { this.ready = false; }

  // O modo neural carrega o modelo sob demanda e usa a versão do release no cache bust.
  async load(baseUrl = '/models/bot-brain') {
    const version = encodeURIComponent(VERSION);
    const [model, norm] = await Promise.all([
      fetch(`${baseUrl}/model.json?v=${version}`).then((r) => r.json()),
      fetch(`${baseUrl}/norm.json?v=${version}`).then((r) => r.json()),
    ]);
    const manifest = model.weightsManifest[0];
    const wpath = manifest.paths[0];
    const buf = await fetch(`${baseUrl}/${wpath}?v=${version}`).then((r) => r.arrayBuffer());
    this.loadFromData(manifest.weights, buf, norm);
    return this;
  }

  // Caminho comum para navegador e régua em Node.
  loadFromData(specs, weightsBuffer, norm) {
    const f32 = new Float32Array(weightsBuffer);
    const byName = {};
    let off = 0;
    for (const w of specs) {
      const size = w.shape.reduce((a, b) => a * b, 1);
      byName[w.name] = { data: f32.subarray(off, off + size), shape: w.shape };
      off += size;
    }
    this.W1 = byName['dense_Dense1/kernel']; this.b1 = byName['dense_Dense1/bias'];
    this.W2 = byName['dense_Dense2/kernel']; this.b2 = byName['dense_Dense2/bias'];
    this.Wc = byName['cont/kernel']; this.bc = byName['cont/bias'];
    this.Wb = byName['bin/kernel']; this.bb = byName['bin/bias'];
    this.norm = norm;
    this.ready = !!(this.W1 && this.W2 && this.Wc && this.Wb && norm && norm.mean);
    return this;
  }

  decide(raw) {
    const s = buildState(raw);
    return this.decideFromState(s);
  }

  decideFromState(s) {
    if (!this.ready) return null;
    const { mean, std } = this.norm;
    const x = new Float32Array(STATE_DIM);
    for (let i = 0; i < STATE_DIM; i++) x[i] = (s[i] - mean[i]) / (std[i] || 1);
    const h1 = relu(dense(x, this.W1.data, this.b1.data, this.W1.shape[0], this.W1.shape[1]));
    const h2 = relu(dense(h1, this.W2.data, this.b2.data, this.W2.shape[0], this.W2.shape[1]));
    const cont = tanh(dense(h2, this.Wc.data, this.bc.data, this.Wc.shape[0], this.Wc.shape[1]));
    const bin = sigmoid(dense(h2, this.Wb.data, this.bb.data, this.Wb.shape[0], this.Wb.shape[1]));
    return {
      moveFwd: cont[0], moveStrafe: cont[1],
      dyaw: decodeDaim(cont[2]), dpitch: decodeDaim(cont[3]),
      fire: bin[0], crouch: bin[1], reload: bin[2],
    };
  }
}
