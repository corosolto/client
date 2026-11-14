#!/usr/bin/env node
/* Destrave do AudioContext fora de gesto (deep-link `?sala=`: o 1º som chega sem clique).
   UNL1  ensure() fora de gesto não derruba o Sfx: ctx fica `suspended`, `disabled` segue false.
   UNL2  o 1º pointerdown/keydown em captura chama resume() dentro do gesto e o ctx vira running.
   UNL3  listener some depois do destrave (gesto seguinte não chama resume de novo).
   UNL4  main.js arma o destrave logo após criar o Sfx.
   Mutantes: --mutante=sem-destrave (main.js não arma) | --mutante=gesto-vazio (o listener não chama
   ensure/resume dentro do gesto — o ctx continua suspended para sempre). */
import { readFileSync } from 'node:fs';
import { importAudioProbe } from './audio-probe-module.mjs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
if (mutante && !['sem-destrave', 'gesto-vazio'].includes(mutante)) { console.error(`mutante desconhecido: ${mutante}`); process.exit(2); }
const muta = (src, ancora, troca) => {
  if (src.split(ancora).length !== 2) { console.error(`mutante ${mutante} NÃO APLICOU: âncora ${ancora}`); process.exit(2); }
  return src.replace(ancora, troca);
};
let audio = readFileSync('public/js/audio.js', 'utf8');
let main = readFileSync('public/js/main.js', 'utf8');
if (mutante === 'gesto-vazio') audio = muta(muta(audio, "    const tenta = () => {\n      this.ensure();\n", "    const tenta = () => {\n"), 'const p = this._resume();', 'const p = null;');
if (mutante === 'sem-destrave') main = muta(main, 'sfx.unlockOnGesture(document);', '');

/* AudioContext falso com a política de autoplay: resume() só funciona dentro de um gesto. */
let emGesto = false, resumes = 0;
class FakeCtx {
  constructor() { this.state = 'suspended'; this.destination = {}; this.sampleRate = 48000; }
  createDynamicsCompressor() { return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} }; }
  createGain() { return { gain: {}, connect() {} }; }
  resume() {
    resumes++;
    if (!emGesto) return Promise.reject(new Error('NotAllowedError'));
    this.state = 'running';
    return Promise.resolve();
  }
}
const listeners = new Map();
const doc = {
  addEventListener(ev, fn, cap) { listeners.set(`${ev}:${cap}`, fn); },
  removeEventListener(ev, fn, cap) { if (listeners.get(`${ev}:${cap}`) === fn) listeners.delete(`${ev}:${cap}`); },
};
const gesto = async (ev) => { emGesto = true; listeners.get(`${ev}:true`)?.(); emGesto = false; await new Promise((r) => setTimeout(r, 0)); };
globalThis.window = { AudioContext: FakeCtx };
globalThis.document = doc;
process.on('unhandledRejection', (e) => { console.log(`UNL0 FALHA — rejeição não tratada: ${e?.message || e}`); process.exit(1); });
globalThis.location = { search: '', href: 'http://regua/' };
globalThis.performance ||= { now: () => Date.now() };

const { Sfx } = await importAudioProbe(audio, mutante || 'normal');
const sfx = new Sfx();
const falhas = [];
const check = (id, ok, det) => { if (!ok) falhas.push(id); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${det}`); };

sfx.unlockOnGesture(doc);
sfx.ensure();   // primeiro som fora de gesto (deep-link)
await new Promise((r) => setTimeout(r, 0));
check('UNL1', sfx.ctx?.state === 'suspended' && sfx.disabled !== true, `fora de gesto: state=${sfx.ctx?.state}, disabled=${!!sfx.disabled}`);
await gesto('pointerdown');
check('UNL2', sfx.ctx?.state === 'running', `após pointerdown: state=${sfx.ctx?.state}, resumes=${resumes}`);
const antes = resumes;
await gesto('keydown'); await gesto('pointerdown');
check('UNL3', resumes === antes && listeners.size === 0, `listener removido após destrave (resumes extra=${resumes - antes}, listeners=${listeners.size})`);
check('UNL4', /const sfx = new Sfx\(\);[\s\S]{0,400}sfx\.unlockOnGesture\(document\);/.test(main), 'main.js arma o destrave logo após criar o Sfx');

if (falhas.length) { console.error(`AUDIO-UNLOCK VERMELHA (${falhas.length}): ${falhas.join(', ')}`); process.exit(1); }
console.log('AUDIO-UNLOCK verde — deep-link sem clique destrava no primeiro gesto.');
