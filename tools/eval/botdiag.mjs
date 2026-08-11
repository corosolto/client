/* ============================================================================
   botdiag.mjs — BOTSIM COM INSTRUMENTAÇÃO (irmão de diagnóstico do botsim.mjs).
   ----------------------------------------------------------------------------
   POR QUE existe: botsim.mjs responde "quanto"; este responde "POR QUÊ". Ele roda
   exatamente a mesma simulação (Game real, mapas reais, node puro) mas grava o
   detalhe por evento, que é o que permite achar CAUSA-RAIZ em vez de chutar
   constante. Foi com ele que se descobriu, nesta rodada, que:
     - a rajada que matava o jogador entregava 3 acertos em 0,25 s (cadência
       cíclica da arma), vindos de 2-3 bots ao mesmo tempo;
     - 62% dos "flips laterais" aconteciam em frames em que o bot girava mais de
       0,25 rad — ou seja, o "andando de lado" era o corpo PIVOTANDO, não passo
       lateral;
     - 90% das amostras de "bot travado" eram o COUNTDOWN de round, quando o jogo
       inteiro está congelado de propósito (corrigido no botsim.mjs).

   Uso (tudo por variável de ambiente, some quando não pedido):
     SIM_DUEL=1 SIM_EV=1     → imprime, em stderr, a rajada que matou o jogador
                               tiro a tiro (quem, arma, dano, distância, tempo)
     SIM_DUEL=1 SIM_ENG=1    → percentis da distância de engajamento por mapa
     SIM_FLIP=1              → atribui os flips laterais (girando? em combate?
                               no deslize de destravamento? sem rota?)
     SIM_STUCK=1             → atribui as amostras de bot parado
     SIM_SEEDS=1,2,3         → troca as sementes (checar se o ganho é real ou
                               sorte da semente fixa do portão)
   Uso: [SIM_*] node tools/eval/botdiag.mjs [segundos] [mapId|all]
   NOTA: rodar um mapa sozinho NÃO dá o mesmo resultado que rodar 'all' com a
   mesma semente (caches globais de textura/personagem consomem RNG diferente).
   Para comparar A/B, use sempre o mesmo conjunto de mapas.
   ============================================================================ */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.resolve(HERE, '../../public/js');

/* ---------- stub de DOM/canvas: o mínimo pra three + game.js subirem em node ---------- */
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
function mkEl(tag) {
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
globalThis.__els = {};
globalThis.document = {
  createElement: (t) => mkEl(t),
  createElementNS: (ns, t) => mkEl(t),
  getElementById: (id) => globalThis.__els[id] || (globalThis.__els[id] = mkEl('div')),
  body: mkEl('body'), documentElement: mkEl('html'),
  addEventListener() {}, removeEventListener() {}, querySelector: (sel) => (globalThis.__els['sel:' + sel] || (globalThis.__els['sel:' + sel] = mkEl('div'))), querySelectorAll: () => [],
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

/* Resolução do especificador nu `three`: os módulos de mapa fazem `import * as THREE from
   'three'`, que no browser é resolvido pelo import map do index.astro. Em node não existe
   import map, e `npm install` está bloqueado — então plantamos um pacote-ponte FORA do repo
   (subindo a árvore de node_modules a partir de tools/eval) apontando para o three
   vendorizado. Nada é baixado; é um arquivo de 3 linhas + dois symlinks. */
{
  const fs = await import('node:fs');
  const root = path.resolve(HERE, '../../..');   // .../csb/.. -> a árvore acima do projeto
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
const THREE = await import('three');
const { MAPS } = await import(`${JS}/maps.js`);
const { initTextures } = await import(`${JS}/textures.js`);
const { Game, WEAPONS } = await import(`${JS}/game.js`);
const { CHARACTERS } = await import(`${JS}/characters.js`);
const PCHAR = (CHARACTERS.find(c => c.team === 'E') || CHARACTERS[0]).id;   // o scoreboard lê player.def.name

/* sfx mudo: qualquer método vira no-op (o Game chama uns 20 diferentes) */
const sfx = new Proxy({}, { get: () => () => {} });
/* renderer stub: o loop de update não desenha, mas o construtor toca em capabilities */
const rendererBase = {
  capabilities: { getMaxAnisotropy: () => 4, isWebGL2: true }, shadowMap: { enabled: true, type: 0 },
  domElement: mkEl('canvas'), info: { render: {}, memory: {} }, outputColorSpace: '', toneMapping: 0, toneMappingExposure: 1,
  getPixelRatio: () => 1, getContext: () => ({}), getSize: (v) => (v ? v.set(1008, 655) : { width: 1008, height: 655 }),
  getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0, getClearColor: (c) => c,
  getClearAlpha: () => 1, xr: { enabled: false },
};
const renderer = new Proxy(rendererBase, { get: (t, k) => (k in t ? t[k] : () => {}) });

/* RNG DETERMINÍSTICO: sem semente, duas execuções do mesmo código davam 22 e 34 latFlips
   no piscinão — variância maior que o efeito que se quer medir. Com semente fixa o A/B
   antes→depois compara a MESMA partida. Média de N sementes = robustez. */
function seedRandom(seed) {
  let s = seed >>> 0;
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const SECS = parseFloat(process.argv[2] || '60');
const ONLY = process.argv[3] || 'all';
const DT = 1 / 60, SAMPLE = 9;
const DUEL = process.env.SIM_DUEL === '1';   // amostra a cada 9 passos ≈ 150 ms
/* ===== SIM_SHOOTGATE=1 — "VIU E NAO ATIROU" (metrica que faltava) =====
   O botsim media tiros/acertos/mortes; nada media o SILENCIO. O gate de fogo do bot
   (game.js:4661-4662) tem SETE travas em AND — reactAt, focusUntil, nextShotAt,
   reloadUntil, |dy|<0.3, !_losLost, inRange, hasTurn (token de duelo). Basta uma ficar
   presa pro bot encarar o jogador a 10 m e nao puxar o gatilho, que e exatamente o
   "bot burro" que o dono relata e que nenhum numero do repo capturava.
   O QUE MEDE: por bot, o tempo acumulado em CONDICAO DE TIRO REAL — alvo == jogador,
   LOS geometrica livre (g._losClear, o mesmo raycast do jogo, NAO o flag _losLost) e
   dentro do alcance da arma — contra os tiros efetivamente disparados nessa janela
   (detectados pelo AVANCO de b.nextShotAt, que so o bloco de fogo escreve).
   EPISODIO MUDO = janela continua > MUDO_S segundos com ZERO tiros.
   Os motivos sao amostrados por quadro DENTRO dos episodios mudos (um quadro pode ter
   varios motivos ativos; o "predominante" e o de maior contagem). O token de duelo e
   lido do mapa _duelTok em vez de chamar _duelToken(), que TEM efeito colateral
   (distribui token) e mudaria o comportamento sob medicao. */
const GATE = process.env.SIM_SHOOTGATE === '1';
const MUDO_S = parseFloat(process.env.SIM_SHOOTGATE_S || '1.5');
const PLAYER_IN = DUEL || GATE;   // jogador vivo e andando pelo mapa (alvo de verdade)

let D = null;
function runMap(mapId, textures, seed) {
  seedRandom(seed);
  const g = new Game({
    renderer, textures, sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'SIM', mapId, ctf: process.env.SIM_CTF === '1', testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};        // a câmera de fim de round cria um WebGLRenderer — não existe aqui
  g.killsToWin = Infinity;          // sem alvo de abates: a amostra tem que durar a corrida inteira
  g.start ? g.start() : g._startRound();
  if (DUEL) {
    /* MODO DUELO: o jogador fica NO MAPA, parado no spawn, sem atirar, e MORTAL. Mede o que
       o dono reclamou — "matam muito fácil" e "sempre na cabeça" — em números: tiros do bot,
       taxa de acerto, fração de acertos na cabeça, mortes do jogador por minuto e o tempo
       entre o primeiro tiro que encosta e a morte (a janela que ele tem pra reagir). */
    D = { shots: 0, hits: 0, hs: 0, deaths: 0, firstHit: 0, lastHit: -99, ttk: 0, ttkN: 0, ev: [], burst: [] };
    const f0 = g._flash.bind(g); g._flash = (...a) => { D.shots++; return f0(...a); };
    const n0 = g._noteHit.bind(g);
    g._noteHit = (by, w, dmg, head, dist) => {
      D.hits++; if (head) D.hs++;
      if (!D.firstHit || g.time - D.lastHit > 3) D.burst = [];
      D.burst.push({ t: g.time, by: by.name, sk: +by.skill.toFixed(2), w, dmg, head, d: +dist.toFixed(1) });
      // 'janela' = duração da RAJADA que matou: se faz mais de 3 s que ninguém encosta, é
      // outro engajamento. Sem esse corte a média virava "tempo desde o 1º tiro da vida".
      if (!D.firstHit || g.time - D.lastHit > 3) D.firstHit = g.time;
      D.lastHit = g.time;
      return n0(by, w, dmg, head, dist);
    };
    const k0 = g._kill.bind(g);
    g._kill = (ent, ...a) => {
      if (ent.isPlayer && ent.alive) {
        D.deaths++; if (D.firstHit) { D.ttk += g.time - D.firstHit; D.ttkN++; }
        // registra a RAJADA INTEIRA que matou: quem, com o quê, a que distância e quando.
        D.ev.push({ map: mapId, janela: +(g.time - D.firstHit).toFixed(2), n: D.burst.length,
          quantosBots: new Set(D.burst.map(h => h.by)).size, hits: D.burst.slice(-9) });
        D.firstHit = 0; D.burst = [];
      }
      return k0(ent, ...a);
    };
  } else if (!GATE) {
    // tira o jogador do jogo: queremos medir NAVEGAÇÃO, não o duelo com o player parado
    g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
  }
  /* SHOOTGATE: jogador imortal e ANDANDO (patrulha abaixo). Imortal de propósito — com
     morte/respawn a janela de condição de tiro é picotada pelo respawn e o "silêncio"
     ficaria subestimado. Aqui interessa o gate, não a letalidade (isso é o SIM_DUEL). */
  if (GATE) { g.player.hp = 1e9; }
  const GS = GATE ? { epi: 0, epiMudos: 0, tCond: 0, tMudo: 0, tiros: 0, mot: {}, maxMudo: 0, botSecs: 0 } : null;
  const gst = GATE ? new Map() : null;
  if (GATE) for (const b of g.bots) gst.set(b, { on: false, dur: 0, shots: 0, lastNext: b.nextShotAt || 0, mot: {} });
  const gateSample = () => {
    const P = g.player;
    for (const b of g.bots) {
      const s = gst.get(b);
      const alvo = b.alive && P.alive && b.target && b.target.isPlayer;
      let cond = false, dyAbs = 0;
      if (alvo) {
        const W = WEAPONS[b.weapon];
        const dx = P.pos.x - b.pos.x, dz = P.pos.z - b.pos.z;
        const dist = Math.hypot(dx, dz);
        const inRange = !(W && W.range) || dist <= W.range + 0.6;
        let dy = Math.atan2(dx, dz) - b.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        dyAbs = Math.abs(dy);
        // LOS GEOMÉTRICA (mesmo raycast do jogo). Independe do flag _losLost — é
        // justamente a divergência entre "dá pra ver" e "o bot acha que perdeu" que
        // aparece como motivo de bloqueio.
        const los = inRange && g._losClear(g._botEye(b), g.camera.position);
        cond = !!(inRange && los);
      }
      if (!cond) {
        if (s.on) {
          GS.epi++;
          if (s.dur > MUDO_S && s.shots === 0) {
            GS.epiMudos++; GS.tMudo += s.dur; GS.maxMudo = Math.max(GS.maxMudo, s.dur);
            for (const k of Object.keys(s.mot)) GS.mot[k] = (GS.mot[k] || 0) + s.mot[k];
          }
          s.on = false; s.dur = 0; s.shots = 0; s.mot = {};
        }
        continue;
      }
      if (!s.on) { s.on = true; s.dur = 0; s.shots = 0; s.mot = {}; s.lastNext = b.nextShotAt || 0; }
      s.dur += DT; GS.tCond += DT; GS.botSecs += DT;
      // TIRO: só o bloco de fogo escreve b.nextShotAt, e sempre pra frente.
      const nx = b.nextShotAt || 0;
      const fired = nx > s.lastNext + 1e-9;
      s.lastNext = nx;
      if (fired) { s.shots++; GS.tiros++; continue; }
      const tok = g._duelTok;
      const add = (k) => { s.mot[k] = (s.mot[k] || 0) + 1; };
      if (g.time <= b.reactAt) add('reactAt');
      if (g.time <= (b.focusUntil || 0)) add('focusUntil');
      if (g.time <= nx) add('nextShotAt');
      if (g.time <= (b.reloadUntil || 0)) add('reloadUntil');
      if (dyAbs >= 0.3) add('|dy|>0.3');
      if (b._losLost) add('_losLost');
      if (!(tok && tok.has(b) && tok.get(b) > g.time)) add('hasTurn');
    }
  };
  const tr = new Map();
  for (const b of g.bots) tr.set(b, { lp: { x: b.pos.x, z: b.pos.z }, ly: b.yaw, lat: 0, fwd: 0, latF: 0, latFc: 0, fwdF: 0, fwdFc: 0, spin: 0, spinR: 0, latAbs: 0, mvAbs: 0, stuck: 0, n: 0, nR: 0, path: 0, x0: b.pos.x, z0: b.pos.z });
  const steps = Math.round(SECS / DT);
  for (let i = 0; i < steps; i++) {
    // DUELO: o jogador fica GRUDADO no meio do mapa. Parado no spawn ele às vezes passava a
    // partida inteira sem ser encontrado e a amostra ia a zero; no meio, ele é o alvo mais
    // exposto possível — é o pior caso, que é o que interessa medir.
    if (PLAYER_IN) {
      /* O jogador PATRULHA entre o próprio spawn e o inimigo a 3,5 m/s, como quem avança pra
         briga. Parado no spawn ele às vezes passava a partida sem ser achado (amostra zero);
         no centro fixo ele caía dentro de geometria e ninguém tinha linha de visão. Andando
         ele encontra os bots o tempo todo, que é a situação que o dono descreve. */
      const P = g.player, sp = g.world.spawns;
      const a = sp[P.team][0], bsp = sp[P.team === 'E' ? 'B' : 'E'][0];
      if (!P._simTgt) P._simTgt = bsp;
      const tx = P._simTgt.x - P.pos.x, tz = P._simTgt.z - P.pos.z, td = Math.hypot(tx, tz) || 1;
      if (td < 4) P._simTgt = P._simTgt === bsp ? a : bsp;
      P.pos.x += (tx / td) * 3.5 * DT; P.pos.z += (tz / td) * 3.5 * DT;
      g._collide(P.pos, 0.4);
      P.yaw = Math.atan2(tx, tz);
    }
    g.update(DT);
    if (GATE) gateSample();
    if (DUEL) { for (const b of g.bots) if (b.alive && b.target && b.target.isPlayer) { D.eng = D.eng || []; D.eng.push(+b.pos.distanceTo(g.player.pos).toFixed(1)); } }
    if (i % SAMPLE) continue;
    const dts = DT * SAMPLE;
    for (const b of g.bots) {
      const s = tr.get(b);
      if (!b.alive) { s.lp = { x: b.pos.x, z: b.pos.z }; s.ly = b.yaw; continue; }
      const mx = b.pos.x - s.lp.x, mz = b.pos.z - s.lp.z;
      const d = Math.hypot(mx, mz);
      const spd = d / dts;
      // decompõe no referencial do bot
      const fwd = (mx * Math.sin(b.yaw) + mz * Math.cos(b.yaw)) / dts;
      const lat = (mx * Math.cos(b.yaw) - mz * Math.sin(b.yaw)) / dts;
      const H = 0.35;   // histerese: abaixo disso é tremor, não decisão
      let _dyq = b.yaw - s.ly; while (_dyq > Math.PI) _dyq -= Math.PI * 2; while (_dyq < -Math.PI) _dyq += Math.PI * 2;
      if (Math.abs(lat) > H) { const sg = Math.sign(lat); if (s.lat && sg !== s.lat) { s.latF++; if (b.target) s.latFc++; globalThis.__FLIP = globalThis.__FLIP || []; globalThis.__FLIP.push({ dy: +Math.abs(_dyq).toFixed(2), spd: +spd.toFixed(2), tgt: !!b.target, side: g.time < (b._sideUntil || 0), esc: g.time < (b._escapeUntil || 0), np: !b.path }); } s.lat = sg; }
      if (Math.abs(fwd) > H) { const sg = Math.sign(fwd); if (s.fwd && sg !== s.fwd) { s.fwdF++; if (b.target) s.fwdFc++; } s.fwd = sg; }
      let dy = b.yaw - s.ly; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      // 'segurando o ponto de captura' NÃO é bot travado — é o comportamento certo.
      const roaming = !b.target && b._ctfMoving !== 0;
      if (spd < 0.5) { s.spin += Math.abs(dy); if (roaming) s.spinR += Math.abs(dy); }
      if (roaming) { s.nR++; if (spd < 0.5) { s.stuck++;
        const _wp = g.world.waypoints.nodes;
        const _n = b.path && b.path.length ? _wp[b.path[Math.min(b.pathIdx, b.path.length - 1)]] : null;
        globalThis.__ST = globalThis.__ST || [];
        globalThis.__ST.push({ np: !b.path, len: b.path ? b.path.length : 0, esc: g.time < (b._escapeUntil || 0),
          side: g.time < (b._sideUntil || 0), reach: _n ? !!g._walkReach(b, _n) : null, live: g.state === 'live',
          dn: _n ? +Math.hypot(_n.x - b.pos.x, _n.z - b.pos.z).toFixed(1) : -1, spd: +spd.toFixed(2) }); } }
      s.latAbs += Math.abs(lat) * dts; s.mvAbs += d;
      s.n++; s.path += d;
      s.lp = { x: b.pos.x, z: b.pos.z }; s.ly = b.yaw;
    }
  }
  let latAbs = 0, mvAbs = 0, latF = 0, latFc = 0, fwdF = 0, fwdFc = 0, spin = 0, spinR = 0, stuck = 0, n = 0, nR = 0, path = 0, net = 0;
  for (const b of g.bots) {
    const s = tr.get(b);
    latF += s.latF; latFc += s.latFc; fwdF += s.fwdF; fwdFc += s.fwdFc; latAbs += s.latAbs; mvAbs += s.mvAbs; spin += s.spin; spinR += s.spinR; stuck += s.stuck; n += s.n; nR += s.nR; path += s.path;
    net += Math.hypot(b.pos.x - s.x0, b.pos.z - s.z0);
  }
  const nb = g.bots.length, mins = SECS / 60;
  if (GATE) {
    // fecha os episódios abertos no fim da corrida (senão o último some da conta)
    for (const b of g.bots) {
      const s = gst.get(b);
      if (!s.on) continue;
      GS.epi++;
      if (s.dur > MUDO_S && s.shots === 0) {
        GS.epiMudos++; GS.tMudo += s.dur; GS.maxMudo = Math.max(GS.maxMudo, s.dur);
        for (const k of Object.keys(s.mot)) GS.mot[k] = (GS.mot[k] || 0) + s.mot[k];
      }
    }
    const rank = Object.entries(GS.mot).sort((a, b) => b[1] - a[1]);
    const totMot = rank.reduce((a, r) => a + r[1], 0) || 1;
    return {
      map: mapId, bots: nb,
      tCondS: +GS.tCond.toFixed(1),          // segundos-bot em condição de tiro real
      tiros: GS.tiros,
      tirosPorSegCond: +(GS.tiros / Math.max(0.001, GS.tCond)).toFixed(3),
      episodios: GS.epi,
      epiMudos: GS.epiMudos,                 // >MUDO_S s vendo o jogador, ZERO tiros
      epiMudosPorMin: +(GS.epiMudos / Math.max(0.001, mins)).toFixed(2),
      pctTempoMudo: +(100 * GS.tMudo / Math.max(0.001, GS.tCond)).toFixed(1),
      maiorMudoS: +GS.maxMudo.toFixed(2),
      motivoTop: rank[0] ? `${rank[0][0]} ${Math.round(100 * rank[0][1] / totMot)}%` : '-',
      motivos: Object.fromEntries(rank.map(([k, v]) => [k, Math.round(100 * v / totMot)])),
      _mot: GS.mot, _tMudo: GS.tMudo,
    };
  }
  if (DUEL && process.env.SIM_ENG === '1') {
    const e = (D.eng || []).sort((a, b) => a - b);
    const q = (f) => e.length ? e[Math.floor(f * (e.length - 1))] : 0;
    console.error(JSON.stringify({ map: mapId, engFrames: e.length, p10: q(0.1), mediana: q(0.5), p90: q(0.9) }));
  }
  if (DUEL && process.env.SIM_EV === '1') { for (const e of D.ev) console.error(JSON.stringify(e)); }
  if (DUEL) return {
    map: mapId, bots: nb, tirosBot: D.shots, acertos: D.hits,
    taxaAcerto: +(D.hits / Math.max(1, D.shots)).toFixed(3),
    fracCabeca: +(D.hs / Math.max(1, D.hits)).toFixed(3),
    mortesPorMin: +(D.deaths / (SECS / 60)).toFixed(2),
    janelaAteMorrer: +(D.ttk / Math.max(1, D.ttkN)).toFixed(2), ttkSum: D.ttk, ttkN: D.ttkN,
  };
  return {
    map: mapId, bots: nb,
    latFlips: +(latF / nb / mins).toFixed(1),
    latFlipsCombat: +(latFc / nb / mins).toFixed(1),
    fwdFlips: +(fwdF / nb / mins).toFixed(1),
    fwdFlipsCombat: +(fwdFc / nb / mins).toFixed(1),
    latShare: +(latAbs / Math.max(0.001, mvAbs)).toFixed(3),
    spinTurns: +(spin / (Math.PI * 2) / nb / mins).toFixed(2),
    spinRoam: +(spinR / (Math.PI * 2) / nb / mins).toFixed(2),
    stuckPct: +(100 * stuck / Math.max(1, nR)).toFixed(1),
    eff: +(net / Math.max(1, path)).toFixed(3),
  };
}

const textures = initTextures();
const ids = ONLY === 'all' ? ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho'] : [ONLY];
const SEEDS = (process.env.SIM_SEEDS || '12345,777,4242').split(',').map(Number);
const out = [];
for (const id of ids) {
  const runs = [];
  for (const sd of SEEDS) { try { runs.push(runMap(id, textures, sd)); } catch (e) { if (process.env.SIM_TRACE) console.error(e.stack); runs.push({ map: id, err: e.message + ' @' + sd }); } }
  const ok = runs.filter(r => !r.err);
  if (!ok.length) { out.push(runs[0]); continue; }
  const m = (k) => +(ok.reduce((a, r) => a + r[k], 0) / ok.length).toFixed(3);
  if (GATE) {
    const mot = {};
    for (const r of ok) for (const k of Object.keys(r._mot)) mot[k] = (mot[k] || 0) + r._mot[k];
    const rank = Object.entries(mot).sort((a, b) => b[1] - a[1]);
    const tot = rank.reduce((a, x) => a + x[1], 0) || 1;
    const tCond = ok.reduce((a, r) => a + r.tCondS, 0), tMudo = ok.reduce((a, r) => a + r._tMudo, 0);
    out.push({
      map: id, bots: ok[0].bots, tCondS: m('tCondS'), tiros: m('tiros'), tirosPorSegCond: m('tirosPorSegCond'),
      episodios: m('episodios'), epiMudos: m('epiMudos'), epiMudosPorMin: m('epiMudosPorMin'),
      pctTempoMudo: +(100 * tMudo / Math.max(0.001, tCond)).toFixed(1), maiorMudoS: Math.max(...ok.map(r => r.maiorMudoS)),
      motivoTop: rank[0] ? `${rank[0][0]} ${Math.round(100 * rank[0][1] / tot)}%` : '-',
      motivos: Object.fromEntries(rank.map(([k, v]) => [k, Math.round(100 * v / tot)])),
      _mot: mot, _tMudo: tMudo,
    });
    continue;
  }
  if (DUEL) { const ts = ok.reduce((a, r) => a + r.ttkSum, 0), tn = ok.reduce((a, r) => a + r.ttkN, 0);
    out.push({ map: id, tirosBot: m('tirosBot'), acertos: m('acertos'), taxaAcerto: m('taxaAcerto'), fracCabeca: m('fracCabeca'), mortesPorMin: m('mortesPorMin'), janelaAteMorrer: +(tn ? ts / tn : 0).toFixed(2), ttkSum: ts, ttkN: tn }); continue; }
  out.push({ map: id, bots: ok[0].bots, latFlips: m('latFlips'), latFlipsCombat: m('latFlipsCombat'), latShare: m('latShare'), fwdFlips: m('fwdFlips'), fwdFlipsCombat: m('fwdFlipsCombat'), spinTurns: m('spinTurns'), spinRoam: m('spinRoam'), stuckPct: m('stuckPct'), eff: m('eff') });
}
if (process.env.SIM_FLIP === '1') {
  const F = globalThis.__FLIP || [];
  const n = F.length || 1;
  const pc = (f) => Math.round(100 * F.filter(f).length / n);
  console.error('FLIPS', n, '| girando>0.25rad', pc(x => x.dy > 0.25) + '%', '| girando>0.5rad', pc(x => x.dy > 0.5) + '%',
    '| em combate', pc(x => x.tgt) + '%', '| no slide', pc(x => x.side) + '%', '| em escape', pc(x => x.esc) + '%', '| sem path', pc(x => x.np) + '%',
    '| dy mediana', F.map(x => x.dy).sort((a, b) => a - b)[Math.floor(n / 2)]);
}
if (process.env.SIM_STUCK === '1') {
  const F = globalThis.__ST || []; const n = F.length || 1;
  const pc = (f) => Math.round(100 * F.filter(f).length / n);
  console.error('STUCK', n, '| sem path', pc(x => x.np) + '%', '| path len<=1', pc(x => x.len <= 1) + '%',
    '| no escape', pc(x => x.esc) + '%', '| no slide', pc(x => x.side) + '%', '| no inalcancavel', pc(x => x.reach === false) + '%',
    '| fora do live', pc(x => !x.live) + '%', '| dn<1.5', pc(x => x.dn >= 0 && x.dn < 1.5) + '%', '| spd<0.1', pc(x => x.spd < 0.1) + '%', '| dn mediana', F.map(x => x.dn).sort((a, b) => a - b)[Math.floor(n / 2)]);
}
if (GATE) {
  const okd = out.filter(o => !o.err);
  const mot = {};
  for (const r of okd) for (const k of Object.keys(r._mot || {})) mot[k] = (mot[k] || 0) + r._mot[k];
  const rank = Object.entries(mot).sort((a, b) => b[1] - a[1]);
  const tot = rank.reduce((a, x) => a + x[1], 0) || 1;
  const tCond = okd.reduce((a, r) => a + r.tCondS, 0), tMudo = okd.reduce((a, r) => a + (r._tMudo || 0), 0);
  const epi = okd.reduce((a, r) => a + r.epiMudos, 0);
  for (const r of out) { delete r._mot; delete r._tMudo; }
  console.log(JSON.stringify(out, null, 1));
  console.log('SHOOTGATE (>' + MUDO_S + 's vendo o jogador SEM atirar) | episodios mudos', +epi.toFixed(1),
    '| /min/mapa', +(epi / okd.length / (SECS / 60)).toFixed(2),
    '| tempo em condicao', +tCond.toFixed(0) + 's', '| % do tempo mudo', +(100 * tMudo / Math.max(0.001, tCond)).toFixed(1) + '%',
    '| maior silencio', Math.max(...okd.map(r => r.maiorMudoS)) + 's',
    '| tiros/s em condicao', +(okd.reduce((a, r) => a + r.tiros, 0) / Math.max(0.001, tCond)).toFixed(3));
  console.log('MOTIVOS', rank.map(([k, v]) => `${k} ${Math.round(100 * v / tot)}%`).join(' | '));
  process.exit(0);
}
console.log(JSON.stringify(out, null, 1));
const avg = (k) => +(out.filter(o => !o.err).reduce((a, o) => a + o[k], 0) / Math.max(1, out.filter(o => !o.err).length)).toFixed(3);
if (DUEL) { const okd = out.filter(o => !o.err); const ts = okd.reduce((a, o) => a + o.ttkSum, 0), tn = okd.reduce((a, o) => a + o.ttkN, 0);
  console.log('MEDIA taxaAcerto', avg('taxaAcerto'), '| fracCabeca', avg('fracCabeca'), '| mortes/min', avg('mortesPorMin'), '| janela ate morrer (s)', +(tn ? ts / tn : 0).toFixed(3), '| mortes amostradas', tn); process.exit(0); }
console.log('MEDIA latFlips/min', avg('latFlips'), '| fwdFlips/min', avg('fwdFlips'), '| latShare', avg('latShare'), '| spin voltas/min', avg('spinTurns'), '| spinRoam', avg('spinRoam'), '| stuck%', avg('stuckPct'), '| eff', avg('eff'));
