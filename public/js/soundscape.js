/* Áudio ambiente por mapa (plans/22): os arquivos shipam pelo audio-pack, não pelo git —
   faltando, silêncio com warn uma vez. Tudo pendura no duckBus do Sfx. Node-safe. */

const A = 'audio/ambiente';
// Ambiência é textura espacial, não uma trilha concorrente: deixa informação de
// combate, fala e música de fim de round claramente à frente do mapa.
const AMBIENCE_MIX = 0.36;
const AMBIENCE_SHOT_CHANCE = 0.55;

export const AMB_LOOPS = Object.freeze({
  funk: `${A}/funk-bar.mp3`, grilos: `${A}/grilos.mp3`, passaros: `${A}/passaros.mp3`,
  vento: `${A}/vento.mp3`, ondas: `${A}/ondas.mp3`, corrego: `${A}/agua-corrego.mp3`,
  piscina: `${A}/piscina.mp3`, cidade: `${A}/cidade.mp3`, obra: `${A}/obra.mp3`,
  hum: `${A}/hum-indoor.mp3`,
});

/* one-shot por bioma: pool compartilhada (o mapa declara só `bioma`). Gaps em
   segundos; o sorteio reagenda depois de cada toque. indoor fica sem one-shot —
   sala fechada com latido é o defeito, não a vida. */
export const BIOME_SHOTS = Object.freeze({
  favela: [
    { srcs: [`${A}/latido-1.mp3`, `${A}/latido-2.mp3`], minGap: 14, maxGap: 40, vol: .45 },
    { srcs: [`${A}/galo.mp3`], minGap: 35, maxGap: 95, vol: .35 },
    { srcs: [`${A}/panela.mp3`], minGap: 45, maxGap: 120, vol: .3 },
    { srcs: [`${A}/passaro-1.mp3`, `${A}/passaro-2.mp3`], minGap: 12, maxGap: 38, vol: .3 },
  ],
  campo: [
    { srcs: [`${A}/galo.mp3`], minGap: 30, maxGap: 85, vol: .4 },
    { srcs: [`${A}/passaro-1.mp3`, `${A}/passaro-2.mp3`], minGap: 10, maxGap: 32, vol: .32 },
    { srcs: [`${A}/latido-1.mp3`, `${A}/latido-2.mp3`], minGap: 25, maxGap: 70, vol: .35 },
  ],
  praia: [
    { srcs: [`${A}/passaro-1.mp3`, `${A}/passaro-2.mp3`], minGap: 12, maxGap: 36, vol: .3 },
  ],
  urbano: [
    { srcs: [`${A}/buzina.mp3`], minGap: 20, maxGap: 60, vol: .3 },
    { srcs: [`${A}/latido-1.mp3`, `${A}/latido-2.mp3`], minGap: 30, maxGap: 80, vol: .35 },
    { srcs: [`${A}/passaro-1.mp3`, `${A}/passaro-2.mp3`], minGap: 16, maxGap: 45, vol: .28 },
  ],
  indoor: [],
});

export function createSoundscape(sfx, config) {
  const state = {
    sfx, config: config || null, started: false, paused: false, time: 0,
    buffers: new Map(), loops: [], shots: [], failed: new Set(),
  };
  if (!config) return { update() {}, setPaused() {}, dispose() {}, state };

  const wanted = new Set((config.loops || []).map((l) => l.src));
  for (const pool of BIOME_SHOTS[config.bioma] || []) for (const src of pool.srcs) wanted.add(src);

  async function load(src) {
    if (state.buffers.has(src) || state.failed.has(src)) return state.buffers.get(src);
    try {
      const res = await fetch(encodeURI(src));
      if (!res.ok) throw new Error(`http ${res.status}`);
      const buf = await state.sfx.ctx.decodeAudioData(await res.arrayBuffer());
      state.buffers.set(src, buf);
      return buf;
    } catch (error) {
      state.failed.add(src);
      console.warn('[soundscape] áudio ambiente não carregou (pack sem o arquivo?)', src, error?.message || error);
      return null;
    }
  }

  async function start() {
    if (state.started || !state.sfx.ctx || !state.config) return;
    state.started = true;
    const bus = state.sfx.duckBus || state.sfx.master;
    for (const loop of state.config.loops || []) {
      const buf = await load(loop.src);
      if (!buf || !state.started) continue;
      const src = state.sfx.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const gain = state.sfx.ctx.createGain(); gain.gain.value = 0;
      const pan = state.sfx.ctx.createStereoPanner ? state.sfx.ctx.createStereoPanner() : null;
      src.connect(gain);
      if (pan) { gain.connect(pan); pan.connect(bus); } else gain.connect(bus);
      src.start();
      state.loops.push({ ...loop, srcNode: src, gain, pan });
    }
    let seed = 2;
    for (const pool of BIOME_SHOTS[state.config.bioma] || []) {
      state.shots.push({ ...pool, nextAt: seed += 1.5 + Math.random() * 6 });
    }
  }

  function update(dt, playerPos) {
    if (!state.config) return;
    state.time += Math.max(0, Math.min(.05, dt || 0));
    if (!state.sfx.ctx) return;
    if (!state.started) { start(); return; }
    const px = playerPos?.x ?? 0, py = playerPos?.y ?? 0, pz = playerPos?.z ?? 0;
    const mudo = state.paused ? 0 : 1;
    for (const loop of state.loops) {
      const dx = loop.pos[0] - px, dy = (loop.pos[1] ?? 0) - py, dz = loop.pos[2] - pz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      /* ganho ~vol no centro, 0 na borda do raio; expoente 1.5 segura o meio */
      const g = (loop.vol ?? .4) * AMBIENCE_MIX * Math.pow(Math.max(0, 1 - d / loop.radius), 1.5) * mudo;
      loop.gain.gain.setTargetAtTime(g, state.sfx.ctx.currentTime, .12);
      if (loop.pan && d > .5) loop.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, -dx / 20)), state.sfx.ctx.currentTime, .2);
    }
    if (mudo) for (const shot of state.shots) {
      if (state.time < shot.nextAt) continue;
      shot.nextAt = state.time + shot.minGap + Math.random() * (shot.maxGap - shot.minGap);
      if (Math.random() > AMBIENCE_SHOT_CHANCE) continue;
      const src = shot.srcs[(Math.random() * shot.srcs.length) | 0];
      const buf = state.buffers.get(src);
      if (!buf) { load(src); continue; }
      const node = state.sfx.ctx.createBufferSource(); node.buffer = buf;
      const gain = state.sfx.ctx.createGain(); gain.gain.value = shot.vol * AMBIENCE_MIX;
      const pan = state.sfx.ctx.createStereoPanner ? state.sfx.ctx.createStereoPanner() : null;
      node.connect(gain);
      if (pan) { pan.pan.value = Math.random() * 1.6 - .8; gain.connect(pan); pan.connect(state.sfx.duckBus || state.sfx.master); }
      else gain.connect(state.sfx.duckBus || state.sfx.master);
      node.start();
    }
  }

  function setPaused(v) {
    state.paused = !!v;
    /* o update pode não rodar com o jogo pausado — o ganho dos loops zera aqui
       mesmo; o one-shot novo não dispara porque o update cuida do gate `mudo` */
    if (!state.sfx.ctx) return;
    for (const loop of state.loops) {
      const alvo = v ? 0 : (loop.vol ?? .4) * AMBIENCE_MIX;
      loop.gain.gain.setTargetAtTime(alvo, state.sfx.ctx.currentTime, .1);
    }
  }

  function dispose() {
    state.started = false;
    for (const loop of state.loops) { try { loop.srcNode.stop(); } catch {} }
    state.loops = []; state.shots = []; state.buffers.clear();
  }

  return { update, setPaused, dispose, state };
}
