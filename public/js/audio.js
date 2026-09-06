// Procedural WebAudio SFX + user sample packs (audio/manifest.json).
// Real CS 1.6 samples are NOT bundled (Valve copyright) — drop your own legally-owned
// files in audio/cs/ and register them under "cs" in audio/manifest.json.
/* Fator global do tiro — ver shotWeapon(). 0,42 = -7,5 dB, revisão pedida pelo dono no
   BUG-140 para a arma não cobrir voz e passo (era 1,0; depois 0,62 e 0,52).
   O duck continua independente. Tunável ao vivo: ?gunvol=N. */
const GUN_VOL = (() => {
  const q = +new URLSearchParams(location.search).get('gunvol');
  return Number.isFinite(q) && q > 0 ? q : 0.42;
})();
/* Samples de tiro do Fab têm caudas de até 3,5 s, enquanto uma automática chega a
   disparar a cada 65–120 ms. Sem estes tetos, uma única arma acumula dezenas de
   BufferSources e cobre passos/vozes; vários bots ainda multiplicam o problema. */
const MAX_SHOT_VOICES_PER_SAMPLE = 4;
const MAX_SHOT_VOICES = 16;
// Sem dublagem genérica: Funkeiros usam apenas takes próprios estruturados;
// Palhaços ficam sem fala até existir catálogo aprovado. Fish e SFX são separados.
const NO_GENERIC_VOICE_FACTIONS = new Set(['C', 'F']);

export const CHARACTER_SELECT_VOICE = Object.freeze({
  gotinha: 'audio/a/cc77ec4f134a71ba.mp3',
  farialimer: 'audio/a/fc5bf11f5b8287f5.mp3',
  dollynho: 'audio/a/dc26854fa366d0ec.mp3',
  clubber: 'audio/a/08290068f8d9935f.mp3',
  reggae: 'audio/a/f180be207d0b440b.mp3',
  funkraiz: 'audio/a/d5b87c3d2638e166.mp3',
});

const VOICE_FALLBACK = Object.freeze({
  E: ['Boa!', 'Avança!', 'Pegamos!'],
  B: ['Boa!', 'Vai pra cima!', 'Derrubamos!'],
  U: ['Bonito tiro!', 'É nossa!', 'Bora pra treta!'],
  C: ['O circo chegou!', 'Ingresso pago!', 'A praça é nossa!'],
  F: ['É os cria!', 'Bicho solto!', 'Passou o corre!'],
});
const GENERAL_FALLBACK = Object.freeze({
  headshot: 'Headshot!',
  doublekill: 'Double kill!',
  triplekill: 'Triple kill!',
  multikill: 'Multi kill!',
  megakill: 'Mega kill!',
  killingspree: 'Killing spree!',
  godlike: 'Godlike!',
});
const ROUND_FALLBACK = Object.freeze(['', 'Round one!', 'Round two!', 'Round three!',
  'Round four!', 'Round five!', 'Round six!', 'Round seven!']);

export class Sfx {
  constructor() {
    this.ctx = null; this.master = null; this.vol = 0.7;
    this.pack = null;            // parsed manifest
    this.speechEnabled = true;   // falas dos times (memes) — vitória/UT/arma sempre tocam
    this._lastVoice = 0;
    this._lastKillVoice = 0;
    this._radioAudio = null;
    this._announcerAudio = null; // locucao prioritaria: um callout por vez
    this._live = new Set();      // samples HTMLAudio tocando (pra duck de vozes)
    this._stepI = -1;            // round-robin dos passos
    this.reverbOn = false;       // send de reverb leve (opt-in: ?reverb=1) — OFF por padrão
    this.onDuck = null;          // hook externo (main.js: abaixa a música do menu)
  }
  async loadManifest(revision = '') {
    // Local pack first (audio/manifest.json, gitignored — dev's own CS samples);
    // fall back to the committed CC0 pack (real gun recordings, public domain) so
    // production plays real shots instead of the synth. Never throws.
    // O manifesto muda junto com a release, mas seus MP3 por hash permanecem imutáveis.
    // Receber a revisão do boot impede a CDN de manter um catálogo de pack anterior.
    const query = revision ? `?v=${encodeURIComponent(revision)}` : '';
    for (const url of [`audio/manifest.json${query}`, 'audio/manifest.default.json?v=1']) {
      try {
        const r = await fetch(url, { cache: 'no-cache' });
        if (r.ok) { this.pack = await r.json(); return; }
      } catch { /* try next */ }
    }
    this.pack = null;
  }
  _sample(url, vol = 1, duckable = true, rate = 1) {
    try {
      const a = new Audio(encodeURI(url));
      // o "fahhh...bro" é MUITO alto — abaixa bastante onde quer que toque (ingame + captura)
      if (/fah{4,}/i.test(url)) vol *= 0.35;
      if (Number.isFinite(rate) && rate > 0) a.playbackRate = rate;
      a._baseVol = Math.min(1, this.vol * vol);
      a.volume = a._baseVol * (duckable && this._ducked ? this._duckAmt : 1);
      if (duckable) this._live.add(a);
      const off = () => { if (duckable) this._live.delete(a); };
      a.addEventListener('ended', off); a.addEventListener('pause', off); a.addEventListener('error', off);
      a.play().catch(() => off());
      return a;
    } catch { return null; }
  }
  // Sidechain simples: tiros/explosões abaixam vozes/rádio/música por ~150-250ms e voltam
  // suave. Cobre os 2 mundos: duckBus (synth WebAudio) e samples HTMLAudio (_live).
  duck(amt = 0.32, hold = 0.18) {
    this._duckAmt = amt;
    if (this.ctx && this.duckBus) {
      const t = this.ctx.currentTime, g = this.duckBus.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(amt, t, 0.008);
      g.setTargetAtTime(1, t + hold, 0.12);
    }
    this._ducked = true;
    for (const a of this._live) a.volume = Math.min(1, a._baseVol * amt);
    clearTimeout(this._duckT);
    this._duckT = setTimeout(() => {
      this._ducked = false;
      for (const a of this._live) a.volume = a._baseVol;
    }, hold * 1000 + 220);
    if (this.onDuck) { try { this.onDuck(amt, hold); } catch {} }
  }
  _pick(arr) { return arr && arr.length ? arr[(Math.random() * arr.length) | 0] : null; }

  _speak(text, { lang = 'pt-BR', volume = 0.72, interrupt = false } = {}) {
    if (!this.speechEnabled || !text || !globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return false;
    try {
      if (interrupt) globalThis.speechSynthesis.cancel();
      const utterance = new globalThis.SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.volume = Math.max(0, Math.min(1, this.vol * volume));
      utterance.rate = lang === 'en-US' ? 0.92 : 1;
      utterance.pitch = lang === 'en-US' ? 0.82 : 0.94;
      this._spokenUtterance = utterance;
      globalThis.speechSynthesis.speak(utterance);
      return true;
    } catch { return false; }
  }
  _voiceFallback(team) { return this._pick(VOICE_FALLBACK[team]) || this._pick(VOICE_FALLBACK.U); }

  // team voice line (kill celebration / random), throttled
  voice(team, minGap = 3.5) {
    if (!this.speechEnabled) return false;
    if (NO_GENERIC_VOICE_FACTIONS.has(team)) return false;
    const now = performance.now();
    if (this._lastVoice > 0 && now - this._lastVoice < minGap * 1000) return false;
    const arr = this.pack?.voice?.[team];
    // IN-GAME (grito de kill): prioriza clipes CURTOS. O array vem ordenado do mais curto
    // pro mais longo (por tamanho no manifest); random*random puxa o sorteio pro início.
    const f = arr?.length ? arr[Math.floor(Math.random() * Math.random() * arr.length)] : null;
    const played = f ? !!this._sample(f) : this._speak(this._voiceFallback(team), { volume: 0.72 });
    if (played) this._lastVoice = now;
    return played;
  }
  // player-triggered radio line (CS-style) — always plays, stops previous
  radioVoice(team) {
    if (!this.speechEnabled) return false;
    if (NO_GENERIC_VOICE_FACTIONS.has(team)) return false;
    const f = this._pick(this.pack?.voice?.[team]);
    if (f) {
      if (this._radioAudio) this._radioAudio.pause();
      this._radioAudio = this._sample(f);
    } else if (!this._speak(this._voiceFallback(team), { volume: 0.78, interrupt: true })) return false;
    this._lastVoice = performance.now();
    return true;
  }
  // Fala autoral do personagem. Os nove Funkeiros aprovados têm um take próprio por
  // select/kill/radio/round; só cai na facção/voz sintética quando esse take não existe.
  characterVoice(characterId, event, { fallbackFaction = null, interrupt = false } = {}) {
    if (!this.speechEnabled) return false;
    const now = performance.now();
    if (event === 'kill' && this._lastKillVoice > 0 && now - this._lastKillVoice < 3500) return false;
    const own = this.pack?.characterVoice?.[characterId]?.[event];
    const genericPool = NO_GENERIC_VOICE_FACTIONS.has(fallbackFaction) ? null : this.pack?.voice?.[fallbackFaction];
    const file = this._pick(own?.length ? own : genericPool);
    if (file) {
      if (interrupt && this._characterAudio) this._characterAudio.pause();
      const audio = this._sample(file);
      if (!audio) return false;
      this._characterAudio = audio; this._lastVoice = now;
      if (event === 'kill') this._lastKillVoice = now;
      const text = this.pack?.characterVoiceText?.[file] || null;
      if (this.onCharacterVoice) {
        try { this.onCharacterVoice({ characterId, event, text, file }); } catch {}
      }
      return true;
    }
    if (NO_GENERIC_VOICE_FACTIONS.has(fallbackFaction)) return false;
    const spoken = this._speak(this._voiceFallback(fallbackFaction), { volume: 0.78, interrupt });
    if (spoken) {
      this._lastVoice = now;
      if (event === 'kill') this._lastKillVoice = now;
    }
    return spoken;
  }
  characterSelectVoice(characterId, faction, rosterIds) {
    if (!this.speechEnabled) return false;
    const rosterSlot = rosterIds?.indexOf(characterId) ?? -1;
    if (rosterSlot < 0) return false;
    const ownSelect = this.pack?.characterVoice?.[characterId]?.select;
    if (ownSelect?.length) {
      if (this._characterSelectAudio) this._characterSelectAudio.pause();
      const file = ownSelect[rosterSlot % ownSelect.length];
      this._characterSelectAudio = this._sample(file);
      const text = this.pack?.characterVoiceText?.[file] || null;
      if (this.onCharacterVoice) {
        try { this.onCharacterVoice({ characterId, event: 'select', text, file }); } catch {}
      }
      return !!this._characterSelectAudio;
    }
    if (NO_GENERIC_VOICE_FACTIONS.has(faction)) return false;
    const pool = this.pack?.voice?.[faction];
    const configuredVoice = this.pack?.characterVoice || {};
    const flatConfigured = Object.fromEntries(Object.entries(configuredVoice)
      .filter(([, value]) => typeof value === 'string'));
    const characterVoice = { ...CHARACTER_SELECT_VOICE, ...flatConfigured };
    let file = flatConfigured[characterId];
    const knownFile = CHARACTER_SELECT_VOICE[characterId];
    if (!file && knownFile && pool?.includes(knownFile)) file = knownFile;
    if (!file) {
      const reserved = new Set(rosterIds
        .map((id) => characterVoice[id])
        .filter((candidate) => pool?.includes(candidate)));
      const fallbackSlot = rosterIds
        .filter((id) => !characterVoice[id])
        .indexOf(characterId);
      file = pool?.filter((candidate) => !reserved.has(candidate))[fallbackSlot];
    }
    if (!file) return this._speak(this._voiceFallback(faction), { volume: 0.78, interrupt: true });
    if (this._characterSelectAudio) this._characterSelectAudio.pause();
    this._characterSelectAudio = this._sample(file);
    return !!this._characterSelectAudio;
  }
  /* SOM DE FIM DE ROUND — com teto e com fim.
     Regra do dono (04/08), depois de uma faixa do Mc Magrinho de 188 s atravessar DOIS
     rounds: "nenhum som de final de round pode ficar mais de 5 segs após o round acabar,
     o máximo de 20-30 segs".

     Duas travas, porque uma só não basta:
       · TETO de 25 s com fade de 1,2 s — pega a faixa longa mesmo que nada mais aconteça.
         O `round/` NÃO tem teto de duração no arquivo (só o `ingame/` tem, 8 s), de
         propósito: vinheta longa é intencional. Quem corta é aqui, na reprodução.
       · `stopRound()` no começo do round seguinte (game.js/_startRound) com fade de 0,45 s.
         É o que garante os "5 s após o round acabar" — o teto sozinho deixaria a vinheta
         entrar por cima da rodada nova.
     Fade e não corte seco: som que some no talo lê como bug de áudio. */
  roundSound(team) {
    const f = this._pick(this.pack?.round?.[team]);
    if (!f) return false;
    this.stopRound(0);                       // vinheta anterior nunca acumula com a nova
    const a = this._sample(f);
    if (a) { this._roundAudio = a; this._roundT = setTimeout(() => this.stopRound(1.2), 25000); }
    return true;
  }
  /** Agenda o corte da vinheta pra daqui a `secs` — o round novo já começou e ela segue
      tocando por baixo (pedido do dono, 07/08: "quando um round acaba deixa a música tocar
      uns 15 s"; ~4,5 s correm na pausa de fim de round + estes aqui). Reusa o _roundT:
      um stopRound() de verdade (sair pro menu, dispose) cancela a agenda e corta na hora. */
  stopRoundAfter(secs, fade = 1.2) {
    if (!this._roundAudio) return;
    clearTimeout(this._roundT);
    this._roundT = setTimeout(() => this.stopRound(fade), secs * 1000);
  }

  /** Corta a vinheta de round com fade (s). Idempotente: pode ser chamado sempre. */
  stopRound(fade = 0.45) {
    clearTimeout(this._roundT); this._roundT = null;
    const a = this._roundAudio; if (!a) return;
    this._roundAudio = null;
    if (fade <= 0) { try { a.pause(); a.currentTime = 0; } catch {} return; }
    const v0 = a.volume, t0 = performance.now();
    const step = () => {
      const k = (performance.now() - t0) / (fade * 1000);
      if (k >= 1 || a.paused) { try { a.pause(); a.currentTime = 0; } catch {} return; }
      a.volume = Math.max(0, v0 * (1 - k));
      requestAnimationFrame(step);
    };
    step();
  }
  csSound(key) { const f = this._cs(key); if (f) { this._sample(f); return true; } return false; }
  _announcer(pool, vol = 0.78) {
    const f = this._pick(pool);
    if (!f) return false;
    if (this._announcerAudio) { try { this._announcerAudio.pause(); } catch {} }
    // Callout curto nao entra no duck dos tiros: precisa continuar inteligivel.
    this._announcerAudio = this._sample(f, vol, false);
    return !!this._announcerAudio;
  }
  general(kind) {
    return this._announcer(this.pack?.general?.[kind])
      || this._speak(GENERAL_FALLBACK[kind], { lang: 'en-US', volume: 0.78, interrupt: true });
  }
  roundNumber(number) {
    return this._announcer(this.pack?.roundNumbers?.[String(number)], 0.72)
      || this._speak(ROUND_FALLBACK[number], { lang: 'en-US', volume: 0.72, interrupt: true });
  }
  captureSound(faction) { const arr = (faction && this.pack?.captureByTeam?.[faction]) || this.pack?.capture; const f = this._pick(arr); if (f) { this._sample(f); return true; } return false; }   // captura de bandeira (CTF): pool por facção (captureByTeam) c/ fallback global
  _cs(key) { const v = this.pack?.cs?.[key]; return v && v.length ? this._pick(v) : null; }

  ensure() {
    if (this.disabled) return;
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        // master chain: master (volume do usuário) → limiter (anti-clip quando muitos
        // tiros somam) → destination. duckBus = vozes/foley synth (sidechain dos tiros).
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -6; this.limiter.knee.value = 3;
        this.limiter.ratio.value = 12; this.limiter.attack.value = 0.001; this.limiter.release.value = 0.18;
        this.limiter.connect(this.ctx.destination);
        this.master = this.ctx.createGain();
        this.master.gain.value = this.vol;
        this.master.connect(this.limiter);
        this.duckBus = this.ctx.createGain();
        this.duckBus.connect(this.master);
        if (this.reverbOn) this._buildReverb();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.disabled = true; }
  }
  // Reverb leve opcional (opt-in): IR sintético curto (~0.45s, decay exponencial, estéreo
  // descorrelacionado) num send bus. Mix baixo por voz — "espaço" sem eco de banheiro.
  _buildReverb() {
    const R = this.ctx, dur = 0.45, n = R.sampleRate * dur;
    const ir = R.createBuffer(2, n, R.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    this.verb = R.createConvolver(); this.verb.buffer = ir;
    this.verbWet = R.createGain(); this.verbWet.gain.value = 0.12;
    // sem sub no reverb (lama) nem fizz (chiado) — mesmo shaping do send do CoD
    const hp = R.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    const lp = R.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8500;
    this.verbSend = R.createGain();
    this.verbSend.connect(hp); hp.connect(lp); lp.connect(this.verb);
    this.verb.connect(this.verbWet); this.verbWet.connect(this.master);
  }
  // send de reverb por voz: nível baixo, maior de longe (a "sala" mora na distância)
  _send(node, lvl) { if (!this.verbSend || lvl <= 0) return;
    const g = this.ctx.createGain(); g.gain.value = lvl; node.connect(g); g.connect(this.verbSend); }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }

  _env(node, t0, a, peak, d, end = 0.0001) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(end, t0 + a + d);
  }
  _noise(dur) {
    const n = this.ctx.sampleRate * dur, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf; return src;
  }
  _osc(type, freq) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; return o; }
  _bus(direct) { return direct === true ? this.master : (direct || this.duckBus || this.master); }
  _burst(dur, peak, filterFreq, q = 1, type = 'lowpass', delay = 0, direct = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, src = this._noise(dur);
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq; f.Q.value = q;
    const g = this.ctx.createGain(); this._env(g, t, 0.004, peak, dur);
    src.connect(f); f.connect(g); g.connect(this._bus(direct));
    src.start(t); src.stop(t + dur + 0.05);
  }
  _beep(type, f0, f1, dur, peak, delay = 0, direct = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, o = this._osc(type, f0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = this.ctx.createGain(); this._env(g, t, 0.005, peak, dur);
    o.connect(g); g.connect(this._bus(direct));
    o.start(t); o.stop(t + dur + 0.05);
  }

  // Curva de saturação (tanh) cacheada por drive — dá o "grão"/estouro do tiro.
  _satCurve(drive) {
    this._satCache = this._satCache || {};
    if (this._satCache[drive]) return this._satCache[drive];
    const n = 1024, c = new Float32Array(n), k = Math.tanh(drive);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * drive) / k; }
    return (this._satCache[drive] = c);
  }
  // Perfis por CLASSE (Hz/s). Estrutura portada do synth do Claude-of-Duty (audio/weapons.js):
  // bodyF2 = fim do sweep do corpo, subF/subDecay = soco grave, tailEndF = fim do lowpass da
  // cauda, mechPartials = ressonâncias metálicas do ferrolho, send = quanto a cauda "canta".
  static GUN = {
    sniper:  { lvl: 1.0, bodyF: 96, bodyF2: 34, bodyDecay: 0.16, subF: 38, subDecay: 0.24, crackF: 1320, crackQ: 0.8, crackDecay: 0.11, drive: 9, midF: 470, midDecay: 0.1, tailDecay: 0.5, tailF: 3300, tailEndF: 380, mechDelay: 0.19, mechLvl: 0.65, mechPartials: [1150, 2050, 3400] },
    ak:      { lvl: 0.94, bodyF: 118, bodyF2: 44, bodyDecay: 0.11, subF: 50, subDecay: 0.15, crackF: 1680, crackQ: 0.9, crackDecay: 0.075, drive: 8, midF: 590, midDecay: 0.065, tailDecay: 0.32, tailF: 4000, tailEndF: 560, mechDelay: 0.034, mechLvl: 0.55, mechPartials: [1420, 2650, 4300] },
    ar:      { lvl: 0.8, bodyF: 140, bodyF2: 54, bodyDecay: 0.085, subF: 60, subDecay: 0.12, crackF: 2600, crackQ: 1.0, crackDecay: 0.05, drive: 6, midF: 800, midDecay: 0.045, tailDecay: 0.24, tailF: 5400, tailEndF: 750, mechDelay: 0.027, mechLvl: 0.45, mechPartials: [1950, 3400, 5600] },
    rifle:   { lvl: 0.82, bodyF: 148, bodyF2: 56, bodyDecay: 0.085, subF: 62, subDecay: 0.12, crackF: 2450, crackQ: 0.95, crackDecay: 0.055, drive: 6, midF: 780, midDecay: 0.05, tailDecay: 0.26, tailF: 5200, tailEndF: 700, mechDelay: 0.028, mechLvl: 0.42, mechPartials: [1880, 3260, 5400] },
    smg:     { lvl: 0.6, bodyF: 172, bodyF2: 72, bodyDecay: 0.06, subF: 78, subDecay: 0.08, crackF: 3150, crackQ: 1.05, crackDecay: 0.04, drive: 5, midF: 920, midDecay: 0.035, tailDecay: 0.17, tailF: 6200, tailEndF: 900, mechDelay: 0.021, mechLvl: 0.5, mechPartials: [2200, 3900, 6300] },
    pistol:  { lvl: 0.72, bodyF: 190, bodyF2: 84, bodyDecay: 0.055, subF: 92, subDecay: 0.07, crackF: 2700, crackQ: 1.1, crackDecay: 0.04, drive: 5, midF: 920, midDecay: 0.03, tailDecay: 0.15, tailF: 6400, tailEndF: 950, mechDelay: 0.038, mechLvl: 0.46, mechPartials: [2450, 4200, 6900] },
    shotgun: { lvl: 1.0, bodyF: 100, bodyF2: 38, bodyDecay: 0.14, subF: 44, subDecay: 0.19, crackF: 1350, crackQ: 0.7, crackDecay: 0.1, drive: 8.5, midF: 500, midDecay: 0.08, tailDecay: 0.42, tailF: 3600, tailEndF: 460, mechDelay: 0.16, mechLvl: 0.7, mechPartials: [980, 1760, 3050], pellets: 6 },
    lmg:     { lvl: 0.95, bodyF: 118, bodyF2: 44, bodyDecay: 0.11, subF: 50, subDecay: 0.16, crackF: 1920, crackQ: 0.85, crackDecay: 0.075, drive: 8, midF: 610, midDecay: 0.065, tailDecay: 0.36, tailF: 4000, tailEndF: 520, mechDelay: 0.03, mechLvl: 0.6, mechPartials: [1330, 2480, 4100] },
  };
  static GUN_CLASS = {
    awp: 'sniper', mosin: 'sniper', rem700: 'sniper', m400: 'sniper', svd: 'sniper', g3sg1: 'sniper', sks: 'sniper',
    shotgun: 'shotgun', mp5: 'smg', uzi: 'smg', p90: 'smg', lmg: 'lmg',
    // MD97 = IMBEL MD97, o fuzil 5,56 do Exército Brasileiro — NÃO é espingarda. Estava em
    // 'shotgun' só porque o viewmodel dela reaproveita a malha da shotgun (STATIC_CLASS no
    // game.js), e a classe de SOM foi arrastada junto. Som de classe é calibre, não malha.
    pistol: 'pistol', deagle: 'pistol', revolver38: 'pistol',
    m92: 'ak', ak: 'ak', akm: 'ak', g3: 'ak',   // M92 daqui = Zastava 7,62 curta, não Beretta
    m4: 'ar', scar: 'ar', famas: 'ar', tavor: 'ar', carbine: 'ar', md97: 'ar', // 5.56 crisp (era fallback 'rifle')
  };
  /* Um disparo tem UMA fonte. O WAV Fab pode receber apenas rate/EQ/gain; nunca outro
     transiente/sub sintetizado por cima. Perfis exatos separam armas da mesma família.
     A AK fica totalmente neutra para preservar o take aprovado na escuta local. */
  static SAMPLE_WEAPON_SIGNATURE = {
    ak:         { rate: 1.00, hp: 0,   lp: 22000, gain: 1.00 },
    pistol:     { rate: 1.12, hp: 220, lp: 11000, gain: .84 },
    revolver38: { rate: .98,  hp: 85,  lp: 9000,  gain: 1.02 },
    deagle:     { rate: .88,  hp: 35,  lp: 7200,  gain: 1.12 },
    m92:        { rate: .98,  hp: 55,  lp: 9000,  gain: 1.04 },
    shotgun:    { rate: 1.00, hp: 0,   lp: 22000, gain: .95 },
  };
  static SAMPLE_CLASS_SIGNATURE = {
    ak:      { rate: 1.00, hp: 0,   lp: 22000, gain: 1.00 },
    pistol:  { rate: 1.06, hp: 150, lp: 10000, gain: .92 },
    smg:     { rate: 1.04, hp: 120, lp: 9500,  gain: .92 },
    ar:      { rate: 1.01, hp: 75,  lp: 11000, gain: .98 },
    rifle:   { rate: .99,  hp: 60,  lp: 9500,  gain: 1.00 },
    lmg:     { rate: .94,  hp: 35,  lp: 7600,  gain: 1.05 },
    sniper:  { rate: .90,  hp: 28,  lp: 6800,  gain: 1.08 },
    shotgun: { rate: .96,  hp: 28,  lp: 7800,  gain: 1.08 },
  };
  static SAMPLE_SOURCE_NEUTRAL = Object.freeze({ rate: 1, hp: 0, lp: 22000, gain: 1 });
  // Ressonador metálico (mini struckResonator do CoD): burst de ruído em bandpass com Q alto
  // e decay curto — soa como ferrolho/mola, não como "beep atrasado" (o tal eco estranho).
  _resonator(t, freqs, lvl) {
    const R = this.ctx;
    const src = this._noise(0.05);
    for (const [f, q, g0, dec] of freqs) {
      const bp = R.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = R.createGain(); this._env(g, t, 0.002, g0 * lvl, dec);
      src.connect(bp); bp.connect(g); g.connect(this.master);
    }
    src.start(t); src.stop(t + 0.15);
  }
  // Round-robin de timbres por classe (6 slots, lazy) — 2 tiros seguidos nunca são iguais.
  _rr(cls) {
    this._rrTab = this._rrTab || {};
    if (!this._rrTab[cls]) {
      const slots = [];
      for (let i = 0; i < 6; i++) slots.push({
        body: Math.pow(2, (Math.random() * 2.2 - 1.1) / 12),
        crack: Math.pow(2, (Math.random() * 3.4 - 1.7) / 12),
        crackQ: 0.85 + Math.random() * 0.35,
        tail: 0.86 + Math.random() * 0.32,
        drive: 0.85 + Math.random() * 0.35,
        level: 0.93 + Math.random() * 0.14,
        mech: 0.8 + Math.random() * 0.45,
      });
      this._rrTab[cls] = { slots, i: (Math.random() * 6) | 0 };
    }
    const t = this._rrTab[cls];
    t.i = (t.i + 1) % 6;
    return t.slots[t.i];
  }
  // Tiro SINTETIZADO (port do CoD weapons.js): 7 camadas com MIX POR DISTÂNCIA — perto =
  // click+crack+mech; longe = boom grave+cauda. É isso que mata o "eco": cauda/mech/boom
  // NÃO tocam mais em todo tiro de qualquer distância. dist em METROS (0 = 1ª pessoa).
  // pan = estéreo pela direção relativa (só bots; player = 0/central); propDelay = delay
  // de propagação dist/343 (só bots; player = 0/imediato).
  _gunshot(cls, dist = 0, vol = 1, pan = 0, propDelay = 0) {
    this.ensure(); if (!this.ctx) return;
    const R = this.ctx, t = R.currentTime + propDelay;
    // sidechain: tiro abaixa vozes/rádio/jingles por ~160ms (tiro perto ducka mais)
    this.duck(Sfx.duckTiro(dist), 0.16);
    const bus = R.createGain(); const lim = R.createDynamicsCompressor();
    lim.threshold.value = -5; lim.knee.value = 8; lim.ratio.value = 14; lim.attack.value = 0.002; lim.release.value = 0.12;
    if (pan) {   // StereoPanner entre o bus da voz e o compressor (pan simples, sem HRTF)
      const pz = R.createStereoPanner(); pz.pan.value = Math.max(-1, Math.min(1, pan));
      bus.connect(pz); pz.connect(lim);
    } else bus.connect(lim);
    lim.connect(this.master);
    const out = bus;
    const P = Sfx.GUN[cls] || Sfx.GUN.rifle;
    const v = this._rr(cls);
    const jit = 1 + (Math.random() - 0.5) * 0.09;
    // distância → near/far (42m = alcance do mix)
    const near = Math.max(0, Math.min(1, 1 - dist / 42));
    const nearP = Math.pow(near, 0.7), far = 1 - near;
    const V = P.lvl * v.level * (0.92 + Math.random() * 0.16) * 0.85 * vol;
    const env = (g, a, pk, d, t0 = t) => this._env(g, t0, a, pk, d);
    // GUNFEEL — CARÁTER POR CLASSE aplicado aqui (a tabela GUN é compartilhada com outras
    // rotinas, então o tempero fica no sintetizador): [snap] quanto o tiro ESTALA no
    // transiente, [punch] quanto ele SOCA no grave, [room] quanto a sala devolve. É o que
    // separa de verdade pistola × rifle × sniper × shotgun — antes as 4 tinham a mesma
    // arquitetura de envelope e só mudavam de frequência.
    const CH = { pistol: [1.30, 0.72, 0.45], smg: [1.18, 0.80, 0.55], ar: [1.10, 0.95, 0.70],
      rifle: [1.05, 1.00, 0.75], ak: [0.94, 1.28, 0.88], lmg: [0.94, 1.32, 0.95],
      sniper: [0.80, 1.65, 1.30], shotgun: [0.70, 1.55, 1.15] }[cls] || [1, 1, 0.8];
    const snap = CH[0], punch = CH[1];
    // `room` é ajustável de fora (this.room = 0..1.6) para dar cauda por AMBIENTE — mapa
    // fechado devolve mais que praça aberta. Default 1 = comportamento neutro.
    const roomK = CH[2] * (this.room ?? 1);
    const rr2 = 0.88 + Math.random() * 0.24;   // variação extra por tiro em cima do round-robin
    const shaper = R.createWaveShaper(); shaper.curve = this._satCurve(P.drive * v.drive); shaper.oversample = '2x';
    const shg = R.createGain(); shg.gain.value = V; shaper.connect(shg); shg.connect(out);
    // 1) transiente (click agudo + snap) — só de perto
    if (nearP > 0.05) {
      const s = this._noise(0.008); const hp = R.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400 * snap;
      const g = R.createGain(); env(g, 0.0004, 0.95 * snap * nearP * V, 0.007); s.connect(hp); hp.connect(g); g.connect(out); s.start(t); s.stop(t + 0.02);
      // sub-camada de ATAQUE (GUNFEEL): 2.5 ms em 7 kHz. O transiente antigo começava em
      // 2.4 kHz e subia em 0.5 ms — no alto-falante lia como "pop" e não como estalo; este
      // é o "tick" que o ouvido usa pra datar o disparo (e é o que dá a impressão de rapidez).
      const s2 = this._noise(0.004); const hp2 = R.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = 7000;
      const g2 = R.createGain(); env(g2, 0.0002, 0.55 * snap * nearP * V, 0.0025); s2.connect(hp2); hp2.connect(g2); g2.connect(out); s2.start(t); s2.stop(t + 0.02);
      const clk = this._osc('triangle', 1750 * v.crack * rr2); const cg = R.createGain(); env(cg, 0.0005, 0.34 * snap * nearP * V, 0.004);
      clk.connect(cg); cg.connect(out); clk.start(t); clk.stop(t + 0.02);
    }
    // 2) corpo (sine+tri em queda) → shaper + sub grave direto
    { const o = this._osc('sine', P.bodyF * v.body * jit); o.frequency.exponentialRampToValueAtTime(Math.max(20, P.bodyF2 * v.body * jit), t + P.bodyDecay * 1.4);
      const g = R.createGain(); env(g, 0.0012, (0.85 + far * 0.5), P.bodyDecay); o.connect(g); g.connect(shaper); o.start(t); o.stop(t + P.bodyDecay * 1.8);
      const o2 = this._osc('triangle', P.bodyF * 0.5 * v.body * jit); o2.frequency.exponentialRampToValueAtTime(Math.max(20, P.bodyF2 * 0.55 * v.body * jit), t + P.bodyDecay * 1.6);
      const g2 = R.createGain(); env(g2, 0.0012, 0.6, P.bodyDecay * 1.15); o2.connect(g2); g2.connect(shaper); o2.start(t); o2.stop(t + P.bodyDecay * 1.8);
      const s = this._osc('sine', P.subF * v.body * jit); s.frequency.exponentialRampToValueAtTime(Math.max(18, P.subF * 0.8 * v.body * jit), t + P.subDecay);
      // GUNFEEL: o SOCO grave escala por classe (punch) e o ataque é mais rápido (4→2 ms) —
      // sub lento chega DEPOIS do estalo e o tiro soa mole/desconectado.
      const sg = R.createGain(); env(sg, 0.002, (0.5 + far * 0.55) * punch * V, P.subDecay * 1.3 * (0.85 + 0.3 * punch)); s.connect(sg); sg.connect(out); s.start(t); s.stop(t + P.subDecay * 2.4 + 0.05); }
    // 3) crack (bandpass saturado, sweep pra baixo) — caráter do calibre, só de perto
    if (nearP > 0.03) {
      const s = this._noise(P.crackDecay + 0.02); const bp = R.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.setValueAtTime(P.crackF * v.crack * 1.35, t); bp.frequency.exponentialRampToValueAtTime(P.crackF * v.crack * 0.8, t + P.crackDecay * 2);
      bp.Q.value = P.crackQ * v.crackQ;
      const g = R.createGain(); env(g, 0.0015, 0.95 * nearP, P.crackDecay); s.connect(bp); bp.connect(g); g.connect(shaper); s.start(t); s.stop(t + P.crackDecay * 3 + 0.05);
    }
    // 4) mid (cola)
    { const s = this._noise(P.midDecay); const bp = R.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = P.midF * v.body; bp.Q.value = 1.1;
      const g = R.createGain(); env(g, 0.002, (0.5 + far * 0.35) * V, P.midDecay * 1.4); s.connect(bp); bp.connect(g); g.connect(out); s.start(t); s.stop(t + P.midDecay * 4 + 0.05); }
    // 5) cauda (lowpass caindo) — curta de perto, longa de longe (a "sala" mora na DISTÂNCIA)
    { const dur = P.tailDecay * v.tail * rr2 * (1 + far * 1.6);   // rr2: 2 tiros seguidos nunca têm a mesma cauda
      const s = this._noise(dur); const lp = R.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(P.tailF * (1 - 0.65 * far), t); lp.frequency.exponentialRampToValueAtTime(Math.max(60, P.tailEndF * (1 - 0.4 * far)), t + dur);
      const hp = R.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160 - 90 * far;
      const g = R.createGain(); env(g, 0.006, (0.35 + far * 0.45) * V, dur); s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); s.start(t); s.stop(t + dur * 1.3 + 0.05); }
    // 6) mecânica (ferrolho = ressonadores metálicos) — SÓ a menos de 14m.
    // Cap de 0.12s no delay: acima disso o ouvido separa o "ting" do tiro e lê como ECO
    // (era 0.19s na AWP / 0.16s na shotgun — a "resposta da sala" que o dono reportou).
    if (dist < 14 && P.mechLvl > 0) {
      const md = Math.min(0.12, P.mechDelay * (0.85 + Math.random() * 0.35));
      const lvl = P.mechLvl * v.mech * (dist === 0 ? 1 : 0.6) * Math.max(0.15, 1 - dist / 14) * V;
      const [p0, p1, p2] = P.mechPartials;
      const src = this._noise(0.05);
      for (const [f, q, g0, dec] of [[p0, 26, 0.5, 0.055], [p1, 20, 0.34, 0.035], [p2, 14, 0.2, 0.02]]) {
        const bp = R.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * (0.96 + Math.random() * 0.09); bp.Q.value = q;
        const g = R.createGain(); env(g, 0.002, g0 * lvl, dec, t + md);
        src.connect(bp); bp.connect(g); g.connect(out);
      }
      src.start(t + md); src.stop(t + md + 0.15);
    }
    // 7) boom de distância + ground bounce — SÓ de longe (tiro de bot longe = trovão).
    // Bounce capado em 80ms (antes chegava a 120ms: segundo "boom" audível = eco).
    if (far > 0.12) {
      const dur = 0.28 + dist * 0.0055;
      const s = this._noise(dur); const lp = R.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(620, t); lp.frequency.exponentialRampToValueAtTime(190, t + dur);
      const g = R.createGain(); env(g, 0.012, 0.9 * far * far * V, dur); s.connect(lp); lp.connect(g); g.connect(out); s.start(t); s.stop(t + dur * 1.4 + 0.05);
      const bt = t + Math.min(0.08, Math.max(0.012, dist * 0.0022));
      const s2 = this._noise(0.4); const lp2 = R.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 900;
      const g2 = R.createGain(); env(g2, 0.004, 0.2 * far * V, 0.12 + dist * 0.001, bt); s2.connect(lp2); lp2.connect(g2); g2.connect(out); s2.start(bt); s2.stop(bt + 0.45);
    }
    // 8) pellets da shotgun (spatter)
    if (P.pellets && nearP > 0.2) for (let i = 0; i < P.pellets; i++) {
      const pt = t + 0.0004 + Math.random() * 0.006;
      const s = this._noise(0.05); const bp = R.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600 + Math.random() * 3600; bp.Q.value = 1.8;
      const g = R.createGain(); env(g, 0.001, 0.1 * nearP * V, 0.004 + Math.random() * 0.01, pt); s.connect(bp); bp.connect(g); g.connect(out); s.start(pt); s.stop(pt + 0.05);
    }
    // 9) CAUDA DE AMBIENTE (GUNFEEL): 2 reflexões curtas (slap) a ~26 ms e ~55 ms. A cauda
    // que já existia só cresce com a DISTÂNCIA — o tiro do PRÓPRIO jogador (dist 0) saía sem
    // espaço nenhum, "seco de fone". Aqui a sala responde perto também, com peso por classe
    // (uma AWP devolve muito mais parede que uma pistola). Buffer de ruído CACHEADO: em
    // full-auto o custo dominante do synth é justamente gerar ruído por camada.
    if (roomK > 0.05 && nearP > 0.12) {
      if (!this._roomBuf) {
        const n = (R.sampleRate * 0.22) | 0, b = R.createBuffer(1, n, R.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
        this._roomBuf = b;
      }
      for (const [dl, lv, fq] of [[0.026, 0.30, 1800], [0.055, 0.18, 900]]) {
        const src = R.createBufferSource(); src.buffer = this._roomBuf;
        src.playbackRate.value = 0.8 + Math.random() * 0.5;
        const lp = R.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = fq * (1 - 0.4 * far);
        const hp = R.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
        const td = t + dl * (0.85 + Math.random() * 0.3);
        const g = R.createGain(); env(g, 0.004, lv * roomK * nearP * V, 0.10 + roomK * 0.16, td);
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
        src.start(td); src.stop(td + 0.3);
      }
    }
    this._send(out, 0.06 + far * 0.14);   // reverb opt-in: mais "sala" de longe, quase nada em 1ª pessoa
  }
  /* UMA regra de duck para sample e synth — o sample usava 0.3 fixo (lição 2).
     Régua: `npm run eval:audioespacial`, cláusula ESP4. */
  static duckTiro(dist) { return dist < 12 ? 0.3 : 0.55; }

  /* Tiro por sample no grafo: HTMLAudio não tem pan nem `start(t)`, então pan e
     propDelay que o game.js calcula eram descartados. Régua ESP2/ESP3. */
  _loadShotSample(url) {
    this.ensure();
    this._shotBuf = this._shotBuf || new Map();
    this._shotCarregando = this._shotCarregando || new Map();
    const buf = this._shotBuf.get(url);
    if (!this.ctx || buf === null) return Promise.resolve(buf || null);
    if (buf !== undefined) return Promise.resolve(buf);
    if (!this._shotCarregando.has(url)) {
      this._shotCarregando.set(url, (async () => {
        try {
          const res = await fetch(encodeURI(url));
          if (!res.ok) throw new Error(`http ${res.status}`);
          const decoded = await this.ctx.decodeAudioData(await res.arrayBuffer());
          this._shotBuf.set(url, decoded);
          return decoded;
        } catch (error) {
          this._shotBuf.set(url, null);
          console.warn('[sfx] sample de tiro não carregou; o synth assume', url, error?.message || error);
          return null;
        } finally {
          this._shotCarregando.delete(url);
        }
      })());
    }
    return this._shotCarregando.get(url);
  }
  async preloadWeaponSamples(weapons = []) {
    this.ensure();
    if (!this.ctx || !this.pack?.weaponSamples) return;
    const query = new URLSearchParams(location.search);
    const packId = query.has('gunpack') ? query.get('gunpack') : this.pack?.defaultWeaponPack;
    const fallbackWeapons = this.pack?.weaponPacks?.[packId]?.fallbackWeapons || [];
    /* Armas que o pack ativo não cobre podem aparecer depois do preload inicial
       (pickup/troca). Aquecê-las aqui evita que o primeiro uso caia no synth genérico. */
    const requestedWeapons = [...new Set([...weapons, ...fallbackWeapons])];
    const urls = [...new Set(requestedWeapons.flatMap((weapon) => this._weaponPool(weapon)))];
    await Promise.all(urls.map((url) => this._loadShotSample(url)));
  }
  _weaponPack(weapon) {
    const query = new URLSearchParams(location.search);
    const id = query.has('gunpack') ? query.get('gunpack') : this.pack?.defaultWeaponPack;
    const pack = id ? this.pack?.weaponPacks?.[id] : null;
    const cfg = pack?.weapons?.[weapon];
    if (!cfg) return null;
    const requestedStyle = query.get('gunstyle');
    const style = cfg.styles?.[requestedStyle] ? requestedStyle : cfg.defaultStyle;
    const pool = cfg.styles?.[style] || [];
    const gain = Number.isFinite(pack.gain) && pack.gain >= 0 ? pack.gain : 1;
    return pool.length ? { id, pool, neutral: pack.neutralPlayback === true, gain } : null;
  }
  _weaponPool(weapon) {
    const selectedPack = this._weaponPack(weapon);
    if (selectedPack) return selectedPack.pool;
    const candidates = this.pack?.weaponCandidates?.[weapon];
    if (weapon === 'shotgun' && candidates?.length) return candidates;
    return this.pack?.weapons?.[weapon] || [];
  }
  _weaponSample(weapon) {
    const query = new URLSearchParams(location.search);
    const selectedPack = this._weaponPack(weapon);
    const pool = selectedPack?.pool || this._weaponPool(weapon);
    if (!pool.length) return undefined;
    const key = selectedPack ? 'guntake' : (weapon === 'shotgun' ? 'shotguntake' : null);
    if (key && query.has(key)) {
      const requested = Number.parseInt(query.get(key) || '1', 10);
      const index = Number.isFinite(requested) ? Math.max(1, Math.min(pool.length, requested)) - 1 : 0;
      return pool[index];
    }
    return this._pick(pool);
  }
  _shotSample(url, weapon, dist, vol, pan, propDelay, neutral = this.pack?.weaponSamplesAuthentic === true) {
    this.ensure();
    this._shotBuf = this._shotBuf || new Map();
    const buf = this._shotBuf.get(url);
    /* O jogo pré-carrega os WAVs das armas da partida. Se uma URL falhar ou uma chamada
       externa chegar antes do preload, false mantém o synth apenas como contingência. */
    if (!this.ctx || !buf) { if (buf !== null) this._loadShotSample(url); return false; }
    /* O duck fica DEPOIS das saídas por false: quem devolve false não tocou, e o
       `_gunshot` que assume ducka sozinho — duckar aqui duplicaria o sidechain. */
    this.duck(Sfx.duckTiro(dist), 0.16);
    const R = this.ctx, t = R.currentTime + propDelay;
    const src = R.createBufferSource(); src.buffer = buf;
    const cls = Sfx.GUN_CLASS[weapon] || 'rifle';
    const signature = neutral
      ? Sfx.SAMPLE_SOURCE_NEUTRAL
      : (Sfx.SAMPLE_WEAPON_SIGNATURE[weapon]
        || Sfx.SAMPLE_CLASS_SIGNATURE[cls]
        || Sfx.SAMPLE_CLASS_SIGNATURE.rifle);
    src.playbackRate.value = signature.rate;
    this._shotVoices = this._shotVoices || [];
    const cortar = (i) => {
      const [antiga] = this._shotVoices.splice(i, 1);
      try { antiga?.src.stop(); } catch {}
    };
    while (this._shotVoices.filter((v) => v.url === url).length >= MAX_SHOT_VOICES_PER_SAMPLE) {
      cortar(this._shotVoices.findIndex((v) => v.url === url));
    }
    while (this._shotVoices.length >= MAX_SHOT_VOICES) cortar(0);
    const voz = { src, url };
    this._shotVoices.push(voz);
    src.onended = () => {
      const i = this._shotVoices?.indexOf(voz) ?? -1;
      if (i >= 0) this._shotVoices.splice(i, 1);
    };
    /* `vol` entra uma vez e o perfil pode acertar o nível relativo da arma; quem passa
       pelo `master` já leva o volume do usuário. Régua ESP7. */
    const g = R.createGain(); g.gain.value = vol * signature.gain;
    let sampleOut = src;
    if (signature.hp > 0) { const hp = R.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = signature.hp; sampleOut.connect(hp); sampleOut = hp; }
    if (signature.lp < 20000) { const lp = R.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = signature.lp; sampleOut.connect(lp); sampleOut = lp; }
    sampleOut.connect(g);
    if (pan) {
      const pz = R.createStereoPanner(); pz.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(pz); pz.connect(this.master);
    } else g.connect(this.master);
    src.start(t); src.stop(t + buf.duration / signature.rate + 0.05);
    return true;
  }
  /* Eventos posicionais curtos (morte/explosão) usam o mesmo contrato espacial
     do tiro. No primeiro uso, HTMLAudio garante que o dono já ouça o candidato;
     usos seguintes saem do buffer com pan e atraso. */
  _eventSample(url, vol = 1, pan = 0, propDelay = 0, direct = false, rate = 1) {
    this.ensure();
    this._eventBuf = this._eventBuf || new Map();
    this._eventCarregando = this._eventCarregando || new Map();
    const buf = this._eventBuf.get(url);
    if (!this.ctx || buf === null) return false;
    if (buf === undefined) {
      if (!this._eventCarregando.has(url)) {
        this._eventCarregando.set(url, (async () => {
          try {
            const res = await fetch(encodeURI(url));
            if (!res.ok) throw new Error(`http ${res.status}`);
            this._eventBuf.set(url, await this.ctx.decodeAudioData(await res.arrayBuffer()));
          } catch (error) {
            this._eventBuf.set(url, null);
            console.warn('[sfx] sample de evento não carregou; synth assume', url, error?.message || error);
          } finally { this._eventCarregando.delete(url); }
        })());
      }
      return !!this._sample(url, vol, !direct, rate);
    }
    const R = this.ctx, t = R.currentTime + propDelay;
    const src = R.createBufferSource(); src.buffer = buf;
    if (src.playbackRate && Number.isFinite(rate) && rate > 0) src.playbackRate.value = rate;
    const gain = R.createGain(); gain.gain.value = vol; src.connect(gain);
    const output = direct ? this.master : (this.duckBus || this.master);
    if (pan) {
      const panner = R.createStereoPanner(); panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner); panner.connect(output);
    } else gain.connect(output);
    src.start(t); src.stop(t + buf.duration / Math.max(0.01, rate) + 0.05);
    return true;
  }

  /* Dor/morte FÍSICAS não fingem ser dublagem; o manifest pode trocar cada perfil no futuro.
     Cues vão direto ao master para o tiro não apagar a informação de dano ou morte. */
  _characterPhysical(kind, characterId, vol = 1, pan = 0, propDelay = 0) {
    const physical = this.pack?.characterPhysical;
    const profileId = physical?.byCharacter?.[characterId] || 'male';
    const profile = physical?.profiles?.[profileId];
    const sample = this._pick(profile?.[kind]);
    if (!sample) return false;
    return this._eventSample(sample, vol, pan, propDelay, true, profile?.rate || 1);
  }
  // tiro por arma: synth por classe é PRIMÁRIO (samples CC0 = opt-in via "weaponSamples":true).
  // dist em metros (game.js: 0 = player, _sd = distância do bot). pan/propDelay só de bots.
  shotWeapon(w, dist = 0, vol = 1, pan = 0, propDelay = 0) {
    if (w === 'knife') return this.knife();
    /* TETO DE VOLUME DO TIRO (04/08, dono: "os sons das armas tão muito altos").

       Por que um multiplicador aqui e não `setVolume` menor: o master é o volume do JOGO
       INTEIRO — baixá-lo abafaria voz, rádio, passo e captura junto, e passo é informação
       de jogo. O que estava desequilibrado era a arma CONTRA o resto, não o jogo contra o
       mundo. Este fator mexe só no tiro, mantendo intacta a hierarquia de calibre da tabela
       W abaixo (Deagle continua 1,25 do peso de uma AK).

       Vale para os dois caminhos — sample CC0 e synth — porque o volume alto se ouve nos
       dois. `?gunvol=N` para ajustar ao vivo sem recompilar nada. */
    const selectedPack = this._weaponPack(w);
    vol *= GUN_VOL * (selectedPack?.gain ?? 1);
    if (this.pack?.weaponSamples) {
      const f = this._weaponSample(w);
      const neutral = selectedPack?.neutral || this.pack?.weaponSamplesAuthentic === true;
      if (f && this._shotSample(f, w, dist, vol, pan, propDelay, neutral)) return;
    }
    // GUNFEEL: peso POR ARMA dentro da classe — só a classe fazia .38, PT-38 e Deagle
    // soarem idênticos (e a SKS soar igual à AWP). `vol` é o único parâmetro por tiro que o
    // synth aceita, então a hierarquia de calibre entra por aqui.
    const W = { deagle: 1.25, revolver38: 1.18, pistol: 0.90, m92: 0.95,
      awp: 1.15, mosin: 1.10, rem700: 1.12, m400: 0.85, svd: 0.90, g3sg1: 0.88, sks: 0.80,
      ak: 1.00, akm: 1.08, g3: 1.05, m4: 0.95, scar: 0.98, tavor: 0.93, famas: 0.90, carbine: 1.0,
      mp5: 0.90, uzi: 0.88, p90: 0.85, lmg: 1.10, shotgun: 1.15, md97: 0.96 };   // md97 = 5,56, peso de fuzil (era 1.08, de espingarda)
    this._gunshot(Sfx.GUN_CLASS[w] || 'rifle', dist, vol * (W[w] ?? 1), pan, propDelay);
  }
  // whizz: projétil supersônico passando perto do ouvido (CoD bulletWhizz) — tiro inimigo
  // que erra por pouco. miss = metros do ouvido.
  whizz(miss = 1.5) {
    this.ensure(); if (!this.ctx) return;
    const R = this.ctx, t = R.currentTime;
    const level = Math.max(0.1, Math.min(1, 1.1 - miss / 6)) * 0.8;
    const s = this._noise(0.2); const bp = R.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.2;
    bp.frequency.setValueAtTime(3600 + Math.random() * 1600, t); bp.frequency.exponentialRampToValueAtTime(900 + Math.random() * 600, t + 0.055 + miss * 0.012);
    const g = R.createGain(); this._env(g, t, 0.004, 0.5 * level, 0.055 + miss * 0.012);
    s.connect(bp); bp.connect(g); g.connect(this.master); s.start(t); s.stop(t + 0.25);
  }

  /* Feedback tatil por contrato. Cada familia consulta uma chave propria do
     manifest; false deixa o game executar o synth legado sem sobrepor sample. */
  impact(surface, vol = 1, pan = 0, propDelay = 0) {
    const key = ({ concreto: 'concrete', madeira: 'wood', vidro: 'glass', areia: 'dirt', agua: 'water' })[surface] || surface;
    const sample = this._pick(this.pack?.cs?.impactsBySurface?.[key]);
    return !!(sample && this._eventSample(sample, .34 * vol, pan, propDelay, true));
  }
  bodyImpact(armored = false, vol = 1, pan = 0, propDelay = 0) {
    const sample = this._pick(this.pack?.cs?.characterImpact?.[armored ? 'armor' : 'body']);
    return !!(sample && this._eventSample(sample, (armored ? .30 : .26) * vol, pan, propDelay, true));
  }
  pickup(kind = 'weapon') {
    const sample = this._pick(this.pack?.cs?.pickupByKind?.[kind]);
    if (sample && this._eventSample(sample, .42, 0, 0, true)) return true;
    this.reloadEnd();
    return false;
  }
  weaponSwitch(weapon, cls = 'rifle') {
    const exact = this.pack?.cs?.weaponSwitchByWeapon?.[weapon];
    const sample = this._pick(exact?.length ? exact : this.pack?.cs?.weaponSwitchByClass?.[cls]);
    return !!(sample && this._eventSample(sample, .26, 0, 0, true));
  }
  _uiAction(action, vol) {
    const sample = this._pick(this.pack?.cs?.uiByAction?.[action]);
    return !!(sample && this._eventSample(sample, vol, 0, 0, true));
  }
  uiClick()   { this.ensure(); this.duck(0.5, 0.12); if (this._uiAction('click', .30)) return true;
    this._beep('square', 880, 660, .06, .12, 0, true); return false; }
  uiHover()   { this.ensure(); if (this._uiAction('hover', .18)) return true;
    this._beep('square', 1240, 1240, .02, .04, 0, true); return false; }
  uiBack()    { this.ensure(); this.duck(0.5, 0.1); if (this._uiAction('back', .26)) return true;
    this._beep('square', 560, 400, .06, .10, 0, true); return false; }
  scopeIn()   { const s = this._cs('scope'); if (s) { this._sample(s); return; }
    this.ensure(); this._beep('sine', 500, 900, .09, .15); }
  scopeOut()  { this.ensure(); this._beep('sine', 900, 500, .09, .12); }
  shotAwp() {
    const s = this._cs('awp');
    if (s) { this._sample(s, 0.3); return; }
    this.ensure();
    this._burst(.32, .9, 900);            // crack
    this._burst(.5, .5, 220);             // body boom
    this._beep('sine', 120, 40, .4, .5);  // low thump
  }
  shotPistol(){ const s = this._cs('pistol'); if (s) { this._sample(s); return; }
    this.ensure(); this._burst(.14, .55, 1400); this._beep('sine', 200, 70, .15, .3); }
  knife()     { const s = this._cs('knife'); if (s) { this._sample(s); return; }
    this.ensure(); this._burst(.1, .3, 3000, 2, 'bandpass'); }
  knifeHit()  { const s = this._cs('knifehit'); if (s) { this._sample(s); return; }
    this.ensure(); this._burst(.08, .3, 1200); }
  knifeDeploy(){ const s = this._cs('knifedeploy'); if (s) { this._sample(s, .7); } }
  dryFire()   { const s = this._cs('dryfire'); if (s) { this._sample(s, .75); return; }
    this.ensure(); this._beep('square', 1200, 900, .03, .1); }
  // bolt da AWP: sample real do pack quando houver; fallback = 2 cliques de metal filtrado
  // (antes: 2 beeps square "game boy" a +420ms — soava como eco digital depois do estouro)
  bolt()      { const s = this._cs('bolt'); if (s) { this._sample(s, .8); return; }
    this.ensure(); this._burst(.03, .16, 2400, 3, 'bandpass'); this._burst(.035, .14, 1700, 3, 'bandpass', .11); }
  reloadStart(){ const s = this._cs('reload'); if (s) { this._sample(s); return; }
    this.ensure(); this._beep('square', 240, 160, .07, .16); this._burst(.08, .2, 2000); }
  reloadEnd() { const s = this._cs('reloadend'); if (s) { this._sample(s); return; }
    this.ensure(); this._beep('square', 180, 420, .09, .2); this._burst(.06, .25, 2600); }
  hitmark()   { this.ensure(); this._beep('sine', 1400, 1100, .05, .22); }
  killConfirm(){ this.ensure(); this._beep('sine', 660, 660, .07, .25); this._beep('sine', 990, 990, .1, .25, .08); }
  hurt(characterId = '') {
    if (this._characterPhysical('hurt', characterId, .52, 0, 0)) return;
    this.ensure(); this._beep('sawtooth', 180, 90, .18, .3); this._burst(.1, .2, 500);
  }
  death(characterId = '', vol = 1, pan = 0, propDelay = 0)     {
    /* Compatibilidade com chamadores/sondas anteriores: death(vol, pan, delay).
       Sem o overload, `death(1, 0, 0)` virava characterId=1, vol=0 e retornava mudo. */
    if (typeof characterId !== 'string') {
      propDelay = pan; pan = vol; vol = characterId; characterId = '';
    }
    // Morte padrão = apenas a queda corporal seca. O vocal Fab foi rejeitado na escuta por
    // soar como jogo de luta, e stings tonais por cima transformavam informação em drama.
    // vol escala por distância (game.js) — bot morrendo do outro lado do mapa não "canta" no
    // ouvido do player (antes: sting completo em TODA morte, somava com tiro = "eco estranho").
    // pan/propDelay: posição estéreo + delay de propagação da morte de bots (player = 0).
    if (vol < 0.08) return;
    const sample = this._cs('death');
    const bodyPlayed = sample && this._eventSample(sample, 0.72 * vol, pan, propDelay, true);
    if (bodyPlayed) return;
    this.ensure(); if (!this.ctx) return;
    let out = this.ctx.createGain();
    if (pan) { const panner = this.ctx.createStereoPanner(); panner.pan.value = pan; out.connect(panner); panner.connect(this.master); }
    else out.connect(this.master);
    this._burst(0.14, 0.34 * vol, 220, 0.8, 'lowpass', propDelay, out);
  }
  jump()      { this.ensure(); this._beep('sine', 220, 330, .08, .1); }
  land()      { this.ensure(); this._burst(.08, .18, 400); }
  // passos: round-robin nos samples (nunca repete o anterior) + playbackRate ±8% +
  // volume ±15%. Fallback synth: timbre por surface (água do piscinão = splash grave+ruído,
  // metal = brilho agudo, concreto = seco). surface vem do game.js (world.slowAt).
  step(surface = 'concrete') {
    const arr = this.pack?.cs?.footstepsBySurface?.[surface] || this.pack?.cs?.footsteps;
    if (arr && arr.length) {
      this._stepI = (this._stepI + 1) % arr.length;
      const a = this._sample(arr[this._stepI], 0.68 * (0.85 + Math.random() * 0.3));
      if (a) a.playbackRate = 0.92 + Math.random() * 0.16;
      return;
    }
    this.ensure();
    const v = 0.85 + Math.random() * 0.3;   // ±15% volume
    if (surface === 'water') {
      this._burst(.06, .1 * v, 380 + Math.random() * 320);                  // pisada na água
      this._burst(.09, .045 * v, 1500 + Math.random() * 700, 1.2, 'bandpass', .012);  // splash
    } else if (surface === 'metal') {
      this._burst(.05, .08 * v, 1300 + Math.random() * 900, 1.6, 'bandpass');
    } else {
      this._burst(.045, .09 * v, 700 + Math.random() * 300);
    }
  }
  respawn()   { this.ensure(); this._beep('sine', 440, 880, .18, .18); }
  ricochet()  { this.ensure(); this._beep('sine', 2400, 700, .12, .08); }
  grenadePin(kind = 'frag') {
    const sample = this._cs('grenadepin');
    if (sample && this._eventSample(sample, .52, 0, 0, true, kind === 'smoke' ? .94 : 1.04)) return true;
    this.ensure(); if (!this.ctx) return;
    const base = kind === 'smoke' ? 1180 : 1440;
    this._beep('square', base, base * .72, .035, .1, 0, true);
    this._beep('square', base * .62, base * .48, .045, .08, .055, true);
    return false;
  }
  grenadeThrow(kind = 'frag', vol = 1, pan = 0, propDelay = 0) {
    const sample = this._cs('grenadethrow');
    const rate = kind === 'smoke' ? .92 : 1.04;
    if (sample && this._eventSample(sample, .58 * vol, pan, propDelay, false, rate)) return true;
    this.ensure(); this._burst(.12, .22 * vol, kind === 'smoke' ? 950 : 1250, 2.2, 'bandpass', propDelay);
    return false;
  }
  grenadeBounce(kind = 'frag', vol = 1, pan = 0, propDelay = 0) {
    if (vol < .06) return false;
    const sample = this._cs('grenadebounce');
    const rate = kind === 'smoke' ? 1.12 : .96;
    if (sample && this._eventSample(sample, .38 * vol, pan, propDelay, false, rate)) return true;
    this.ensure(); this._burst(.055, .17 * vol, kind === 'smoke' ? 1500 : 950, 1.8, 'bandpass', propDelay);
    return false;
  }
  smokePop(vol = 1, pan = 0, propDelay = 0) {
    this.ensure(); if (!this.ctx) return;
    let out = this.ctx.createGain();
    if (pan) { const panner = this.ctx.createStereoPanner(); panner.pan.value = pan; out.connect(panner); panner.connect(this.master); }
    else out.connect(this.master);
    this._burst(.42, .36 * vol, 720, 1.1, 'lowpass', propDelay, out);
    this._burst(.18, .16 * vol, 2400, 1.8, 'bandpass', propDelay + .035, out);
  }
  explosion(vol = 1, pan = 0, propDelay = 0) { // frag: crack agudo + corpo grave + rumble
    const sample = this._cs('explosion');
    this.duck(0.22, 0.3);
    if (sample && this._eventSample(sample, 0.88 * vol, pan, propDelay, true)) return true;
    this.ensure(); if (!this.ctx) return;
                                               // explosão ducka tudo (vozes/rádio/música)
    // bus próprio (direct no master — explosão é ducker, não vítima) + send de reverb opt-in
    const bus = this.ctx.createGain(); bus.gain.value = vol;
    if (pan) { const panner = this.ctx.createStereoPanner(); panner.pan.value = pan; bus.connect(panner); panner.connect(this.master); }
    else bus.connect(this.master);
    this._send(bus, 0.2);
    /* Crack inicial, corpo e rumble grave formam uma explosão; sem sting tonal separado. */
    this._burst(.18, .95, 1800, 0.7, 'lowpass', propDelay, bus);
    this._burst(.6, .8, 300, 1, 'lowpass', propDelay, bus);
    this._beep('sine', 90, 30, .55, .6, propDelay, bus);
    this._beep('sawtooth', 160, 45, .35, .3, .02 + propDelay, bus);
    return false;
    }

  vuvuzela(dur = 1.2) { // round start — Brazilian stadium energy
    const sample = this._cs('roundstart');
    if (sample) { this._sample(sample, .75); return; }
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [233, 234.5, 232].forEach(f => {
      const o = this._osc('sawtooth', f), g = this.ctx.createGain();
      const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1200;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + .1);
      g.gain.setValueAtTime(0.12, t + dur - .15);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(g); g.connect(this.duckBus || this.master);
      o.start(t); o.stop(t + dur + .05);
    });
  }
  roundWin()  { const s = this._cs('roundwin'); if (s) { this._sample(s, .8); return; }
    this.ensure(); [523, 659, 784, 1047].forEach((f, i) => this._beep('square', f, f, .16, .2, i * .13)); }
  roundLose() { const s = this._cs('roundlose'); if (s) { this._sample(s, .8); return; }
    this.ensure(); [392, 330, 262].forEach((f, i) => this._beep('square', f, f * .9, .22, .2, i * .16)); }
  matchWin()  { const s = this._cs('roundwin'); if (s) { this._sample(s, .9); return; }
    this.ensure(); [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this._beep('square', f, f, .18, .22, i * .14)); this.vuvuzela(1.8); }
}
