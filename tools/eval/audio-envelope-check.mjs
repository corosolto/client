/* ============================================================================
   audio-envelope-check.mjs — ENVELOPE DE GANHO ACEITA VOLUME ZERO? (ENV)
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   `exponentialRampToValueAtTime` é proibido de mirar em zero: a Web Audio API
   lança RangeError se o alvo cair no intervalo (-1.40130e-45, 1.40130e-45). O
   `_env` de audio.js manda `peak` direto para a rampa, e vários chamadores
   calculam esse `peak` multiplicando por um volume espacial que chega a 0 quando
   a fonte está longe demais:

       _burst(.12, .22 * vol, …)          ← grenadeThrow, vol espacial
       this._env(g, t, 0.002, g0 * lvl, dec)
       this._env(g, t, 0.004, 0.5 * level, …)

   Medido no navegador, capturando a pilha durante partida local:

       RangeError: Failed to execute 'exponentialRampToValueAtTime' on
       'AudioParam': The float target value provided (0) should not be in the
       range (-1.40130e-45, 1.40130e-45).
           at Sfx._env (audio.js:284)
           at Sfx._burst (audio.js:299)
           at Sfx.grenadeThrow (audio.js:870)
           at Game._spawnGrenade (game.js:4098)
           at Game._updateBot (game.js:6351)

   Quem estoura é o laço de quadro: um bot jogando granada longe derruba o
   `update` inteiro daquele frame. `grenadeBounce` já se protegia com
   `if (vol < .06) return false;` — `grenadeThrow` não. Corrigir só o
   grenadeThrow deixaria os outros três chamadores de pé, então o piso vai para
   o `_env`, que é por onde todos passam.

   ── POR QUE NENHUMA RÉGUA DE ÁUDIO PEGOU ISTO ──────────────────────────────
   Porque o `AudioParam` falso das réguas existentes é MAIS PERMISSIVO que o
   navegador: `audio-espacial-check.mjs:105` só empilha `['exp', v, t]` e nunca
   reclama de alvo zero. Régua com dublê mais frouxo que a produção não mede a
   produção. Aqui o dublê aplica a restrição da especificação — é essa a
   diferença que faz esta régua morder.

   ── O QUE ELA NÃO ALCANÇA ──────────────────────────────────────────────────
   Não mede som, mixagem nem tempo real: mede se o grafo aceita os números que o
   jogo entrega. Não cobre caminho de sample (HTMLAudio) nem o pack privado.

   node tools/eval/audio-envelope-check.mjs [--mutante=env-sem-piso]
============================================================================ */
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
if (mutante && mutante !== 'env-sem-piso') throw new Error(`Mutante desconhecido: ${mutante}`);

const PISO_SPEC = 1.40130e-45;
let rampas = 0;

function param(valor = 0) {
  const p = {
    value: valor,
    setValueAtTime(v) { p.value = v; return p; },
    exponentialRampToValueAtTime(v) {
      rampas++;
      if (!(Math.abs(v) > PISO_SPEC)) {
        throw new RangeError(`Failed to execute 'exponentialRampToValueAtTime' on 'AudioParam': The float target value provided (${v}) should not be in the range (-1.40130e-45, 1.40130e-45).`);
      }
      return p;
    },
    linearRampToValueAtTime() { return p; },
    setTargetAtTime() { return p; },
    cancelScheduledValues() { return p; },
  };
  return p;
}
const no = (tipo, extra = {}) => ({ tipo, connect: (d) => d, disconnect() {}, ...extra });

class CtxFalso {
  constructor() { this.currentTime = 100; this.sampleRate = 48000; this.state = 'running'; this.destination = no('destination'); }
  resume() {}
  createGain() { return no('gain', { gain: param(1) }); }
  createStereoPanner() { return no('panner', { pan: param(0) }); }
  createBiquadFilter() { return no('biquad', { type: 'lowpass', frequency: param(350), Q: param(1), detune: param(0) }); }
  createDynamicsCompressor() { return no('comp', { threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25) }); }
  createWaveShaper() { return no('shaper', { curve: null, oversample: 'none' }); }
  createConvolver() { return no('convolver', { buffer: null }); }
  createOscillator() { const n = no('osc', { type: 'sine', frequency: param(440), detune: param(0) }); n.start = () => {}; n.stop = () => {}; return n; }
  createBufferSource() { const n = no('src', { buffer: null, loop: false, playbackRate: param(1), detune: param(0) }); n.start = () => {}; n.stop = () => {}; return n; }
  createBuffer(ch, n, sr) {
    const dados = Array.from({ length: ch }, () => new Float32Array(n));
    return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: (i) => dados[i] };
  }
  decodeAudioData() { return Promise.resolve(this.createBuffer(1, 12000, this.sampleRate)); }
}

globalThis.window = globalThis;
globalThis.location = { search: '', href: 'http://regua/' };
globalThis.AudioContext = CtxFalso;
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(0), 0);
globalThis.Audio = class { constructor() { this.volume = 1; } addEventListener() {} removeEventListener() {} pause() {} play() { return Promise.resolve(); } };
globalThis.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), arrayBuffer: () => Promise.resolve(new ArrayBuffer(32)) });
globalThis.document = { createElement: () => ({ getContext: () => null }), addEventListener() {}, hidden: false };

const { Sfx } = await import('../../public/js/audio.js');

if (mutante === 'env-sem-piso') {
  /* Versão anterior ao conserto: manda peak e end crus para a rampa. */
  Sfx.prototype._env = function (node, t0, a, peak, d, end = 0.0001) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(end, t0 + a + d);
  };
}

const sfx = new Sfx();
sfx.ensure();

/* Volumes que o jogo realmente entrega: 0 é o caso do bot longe demais. */
const VOLUMES = [0, 0, 0.0000001, 0.004, 0.5, 1];
const EVENTOS = [
  ['grenadeThrow', (v) => sfx.grenadeThrow('frag', v, 0, 0)],
  ['grenadeThrow smoke', (v) => sfx.grenadeThrow('smoke', v, 0.4, 0.05)],
  ['grenadeBounce', (v) => sfx.grenadeBounce('frag', v, 0, 0)],
];
for (const nome of ['shotWeapon', 'hit', 'step', 'reload', 'explosion', 'jump', 'land', 'pickup', 'noAmmo', 'headshot']) {
  if (typeof sfx[nome] === 'function') EVENTOS.push([nome, (v) => sfx[nome].length >= 2 ? sfx[nome]('ak', v, 0, 0) : sfx[nome](v)]);
}

const falhas = [];
for (const [nome, chama] of EVENTOS) {
  for (const v of VOLUMES) {
    try { chama(v); } catch (e) {
      if (e instanceof RangeError) falhas.push(`${nome} com vol=${v}: ${e.message.split(':').pop().trim()}`);
      /* Erro que não é da rampa é problema de dublê, não do jogo: ignora. */
    }
  }
}

const resultados = [];
const check = (id, ok, detalhe) => { resultados.push({ id, ok }); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detalhe}`); };
check('ENV1', rampas > 0, `${rampas} rampas exponenciais exercidas (dublê aplica a restrição da especificação)`);
check('ENV2', falhas.length === 0, falhas.length ? `${falhas.length} evento(s) estouram: ${falhas.slice(0, 3).join(' | ')}` : 'nenhum evento estoura com volume zero ou subnormal');

const reprovadas = resultados.filter((r) => !r.ok).map((r) => r.id);
if (mutante === 'env-sem-piso') {
  const pegou = reprovadas.includes('ENV2');
  console.log(`MUTANTE env-sem-piso ${pegou ? 'DETECTADO' : 'PASSOU BATIDO'} — a régua ${pegou ? 'morde' : 'NÃO morde'}`);
  process.exit(pegou ? 0 : 1);
}
console.log(`AUDIO-ENVELOPE ${reprovadas.length ? `VERMELHA: ${reprovadas.join(', ')}` : 'ok: ENV1–ENV2'}`);
process.exit(reprovadas.length ? 1 : 0);
