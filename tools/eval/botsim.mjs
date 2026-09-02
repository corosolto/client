/* ============================================================================
   botsim.mjs — SIMULAÇÃO DE BOTS EM FAST-FORWARD, SEM CHROME E SEM RENDER.
   ----------------------------------------------------------------------------
   POR QUE existe: o harness anterior (g2r6-bots2.mjs) subia Playwright+SwiftShader
   pra medir movimento de bot. Isso custa ~10 min por mapa nesta máquina de 2 CPUs e
   está proibido nesta rodada. Aqui o jogo roda em NODE PURO: `stub` de DOM/canvas +
   three vendorizado, a classe Game real, os mapas reais, o `_updateBot` real.
   O que se mede é o CÓDIGO DE PRODUÇÃO, não uma reimplementação — se o número
   melhorar aqui, melhorou no jogo.

   Métricas (por mapa, por minuto de tempo de jogo):
     latFlips/min  — trocas de sinal da velocidade LATERAL do bot (o "andando de lado
                     pro lado e pro outro" do dono). Amostrado a 150 ms, com histerese
                     de 0.35 m/s pra não contar tremor numérico.
     fwdFlips/min  — idem no eixo À FRENTE (avança/recua/avança).
     spin/min      — ROTAÇÃO ACUMULADA (em voltas) enquanto o bot está praticamente
                     PARADO (<0.5 m/s). É a medida direta de "rodando em volta de si
                     mesmo": girar andando é curva normal, girar parado é bug.
     stuck%        — % das amostras com deslocamento < 12% do esperado.
     eff           — deslocamento líquido / caminho percorrido (1 = reto, 0 = milling).

   Uso: node tools/eval/botsim.mjs [segundos] [mapId|all]
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
const { Game } = await import(`${JS}/game.js`);
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

let D = null;
function runMap(mapId, textures, seed) {
  seedRandom(seed);
  const g = new Game({
    renderer, textures, sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'SIM', mapId, ctf: process.env.SIM_CTF === '1', testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};        // a câmera de fim de round cria um WebGLRenderer — não existe aqui
  // SIM_MUT_YAW: mutante da botsim-golden (deriva de rumo em rad/s no _updateBot) — a régua
  // exige que isto pinte o placar de vermelho. Ver tools/eval/botsim-golden.mjs.
  if (process.env.SIM_MUT_YAW) g.__mutBotYaw = +process.env.SIM_MUT_YAW || 0;
  if (process.env.SIM_MUT_LANES) g.__mutBotLanes = true;
  if (process.env.SIM_MUT_DEPTH) g.__mutBotDepth = true;
  g.killsToWin = Infinity;          // sem alvo de abates: a amostra tem que durar a corrida inteira
  g.start ? g.start() : g._startRound();
  /* MATRIZES DE MUNDO: sem renderer ninguém chama updateMatrixWorld, e o Raycaster do three
     assume matrizes prontas — sem esta linha os occluders ficam empilhados na ORIGEM (matriz
     identidade) e o `_losClear` dos bots (raycast contra `world.occluders`, game.js:5044) mede
     linha de visão contra geometria fantasma. As métricas de navegação (latFlips/fwdFlips/
     stuck/eff) dependiam dessa LOS: eram verde de graça. Occluder é estático — uma passada
     aqui, depois do build, basta; e updateMatrixWorld NÃO consome Math.random, então o fluxo
     determinístico semeado fica idêntico. */
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  if (DUEL) {
    /* MODO DUELO: o jogador fica NO MAPA, parado no spawn, sem atirar, e MORTAL. Mede o que
       o dono reclamou — "matam muito fácil" e "sempre na cabeça" — em números: tiros do bot,
       taxa de acerto, fração de acertos na cabeça, mortes do jogador por minuto e o tempo
       entre o primeiro tiro que encosta e a morte (a janela que ele tem pra reagir). */
    D = { shots: 0, hits: 0, hs: 0, deaths: 0, firstHit: 0, lastHit: -99, ttk: 0, ttkN: 0 };
    const f0 = g._flash.bind(g); g._flash = (...a) => { D.shots++; return f0(...a); };
    const n0 = g._noteHit.bind(g);
    g._noteHit = (by, w, dmg, head, dist) => {
      D.hits++; if (head) D.hs++;
      // 'janela' = duração da RAJADA que matou: se faz mais de 3 s que ninguém encosta, é
      // outro engajamento. Sem esse corte a média virava "tempo desde o 1º tiro da vida".
      if (!D.firstHit || g.time - D.lastHit > 3) D.firstHit = g.time;
      D.lastHit = g.time;
      return n0(by, w, dmg, head, dist);
    };
    const k0 = g._kill.bind(g);
    g._kill = (ent, ...a) => {
      if (ent.isPlayer && ent.alive) { D.deaths++; if (D.firstHit) { D.ttk += g.time - D.firstHit; D.ttkN++; } D.firstHit = 0; }
      return k0(ent, ...a);
    };
  } else {
    // tira o jogador do jogo: queremos medir NAVEGAÇÃO, não o duelo com o player parado
    g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
  }
  const tr = new Map();
  for (const b of g.bots) tr.set(b, { lp: { x: b.pos.x, z: b.pos.z }, ly: b.yaw, lat: 0, fwd: 0, latF: 0, latFc: 0, fwdF: 0, fwdFc: 0, spin: 0, spinR: 0, latAbs: 0, mvAbs: 0, stuck: 0, n: 0, nR: 0, path: 0, x0: b.pos.x, z0: b.pos.z, roamZMin: Infinity, roamZMax: -Infinity });
  const mapWidth = Math.max(0.001, g.world.bounds.maxX - g.world.bounds.minX);
  const mapDepth = Math.max(0.001, g.world.bounds.maxZ - g.world.bounds.minZ);
  let laneSpreadSum = 0, laneSpreadN = 0;
  const steps = Math.round(SECS / DT);
  for (let i = 0; i < steps; i++) {
    // DUELO: o jogador fica GRUDADO no meio do mapa. Parado no spawn ele às vezes passava a
    // partida inteira sem ser encontrado e a amostra ia a zero; no meio, ele é o alvo mais
    // exposto possível — é o pior caso, que é o que interessa medir.
    if (DUEL) {
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
      if (Math.abs(lat) > H) { const sg = Math.sign(lat); if (s.lat && sg !== s.lat) { s.latF++; if (b.target) s.latFc++; } s.lat = sg; }
      if (Math.abs(fwd) > H) { const sg = Math.sign(fwd); if (s.fwd && sg !== s.fwd) { s.fwdF++; if (b.target) s.fwdFc++; } s.fwd = sg; }
      let dy = b.yaw - s.ly; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      /* 'segurando o ponto de captura' NÃO é bot travado — é o comportamento certo.
         Nem o COUNTDOWN de round: entre `_startRound()` e o fim da contagem (3 s) o jogo
         inteiro fica congelado de propósito — `_updateBot` retorna cedo e NINGUÉM anda, nem
         o jogador. Medido em botdiag: 90% das amostras que contavam como "bot travado" eram
         exatamente esses frames de countdown, e como o denominador só conta amostras SEM
         alvo (durante o countdown nenhum bot tem alvo, durante o jogo metade tem), o peso
         delas era desproporcional. Contar isso como travamento é medir o bot pelo relógio
         da partida, não pela navegação. */
      const roaming = !b.target && b._ctfMoving !== 0 && g.state === 'live';
      if (roaming && Number.isInteger(b.roamIdx)) {
        const rz = g.world.waypoints.nodes[b.roamIdx]?.z;
        if (Number.isFinite(rz)) { s.roamZMin = Math.min(s.roamZMin, rz); s.roamZMax = Math.max(s.roamZMax, rz); }
      }
      if (spd < 0.5) { s.spin += Math.abs(dy); if (roaming) s.spinR += Math.abs(dy); }
      if (roaming) { s.nR++; if (spd < 0.5) s.stuck++; }
      s.latAbs += Math.abs(lat) * dts; s.mvAbs += d;
      s.n++; s.path += d;
      s.lp = { x: b.pos.x, z: b.pos.z }; s.ly = b.yaw;
    }
    for (const team of ['E', 'B']) {
      const xs = g.bots
        .filter((b) => b.team === team && !b.target && Number.isInteger(b.roamIdx))
        .map((b) => g.world.waypoints.nodes[b.roamIdx]?.x)
        .filter(Number.isFinite);
      if (xs.length > 1) { laneSpreadSum += (Math.max(...xs) - Math.min(...xs)) / mapWidth; laneSpreadN++; }
    }
  }
  let latAbs = 0, mvAbs = 0, latF = 0, latFc = 0, fwdF = 0, fwdFc = 0, spin = 0, spinR = 0, stuck = 0, n = 0, nR = 0, path = 0, net = 0;
  for (const b of g.bots) {
    const s = tr.get(b);
    latF += s.latF; latFc += s.latFc; fwdF += s.fwdF; fwdFc += s.fwdFc; latAbs += s.latAbs; mvAbs += s.mvAbs; spin += s.spin; spinR += s.spinR; stuck += s.stuck; n += s.n; nR += s.nR; path += s.path;
    net += Math.hypot(b.pos.x - s.x0, b.pos.z - s.z0);
  }
  const nb = g.bots.length, mins = SECS / 60;
  const laneSpans = ['E', 'B'].map((team) => {
    const xs = g.bots.filter((b) => b.team === team && Number.isFinite(b.laneX)).map((b) => b.laneX);
    return xs.length > 1 ? (Math.max(...xs) - Math.min(...xs)) / mapWidth : 0;
  });
  const roamDepthSpread = g.bots.reduce((sum, b) => {
    const s = tr.get(b);
    return sum + (Number.isFinite(s.roamZMin) && Number.isFinite(s.roamZMax) ? (s.roamZMax - s.roamZMin) / mapDepth : 0);
  }, 0) / nb;
  if (DUEL) return {
    map: mapId, bots: nb, tirosBot: D.shots, acertos: D.hits,
    taxaAcerto: +(D.hits / Math.max(1, D.shots)).toFixed(3),
    fracCabeca: +(D.hs / Math.max(1, D.hits)).toFixed(3),
    mortesPorMin: +(D.deaths / (SECS / 60)).toFixed(2),
    janelaAteMorrer: +(D.ttk / Math.max(1, D.ttkN)).toFixed(2),
    // SOMAS CRUAS da janela (ver o comentário do pooling lá embaixo): sem elas a média de
    // médias contava "0 s" para toda semente/mapa em que NINGUÉM MORREU — ou seja, o caso
    // mais justo possível pontuava como o mais injusto, e melhorar a justiça PIORAVA o número.
    ttkSum: D.ttk, ttkN: D.ttkN,
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
    laneSpread: +Math.min(...laneSpans).toFixed(3),
    laneTargetSpread: +(laneSpreadSum / Math.max(1, laneSpreadN)).toFixed(3),
    roamDepthSpread: +roamDepthSpread.toFixed(3),
  };
}

const textures = initTextures();
const ids = ONLY === 'all' ? ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho'] : [ONLY];
/* 9 SEMENTES, NÃO 3 — e o motivo é medido, não estético.
   `THREE.generateUUID` consome 4 `Math.random()` por Texture criada (three.module.js:318).
   Como o botsim monkeypatcha `Math.random` com um xorshift semeado pra ser determinístico,
   **o NÚMERO de texturas da cena faz parte do fluxo aleatório**: criar uma textura a mais,
   mesmo INVISÍVEL, desloca todos os sorteios seguintes. A rodada do PBR mediu isso com um
   controle de N texturas invisíveis na árvore base — BOT4 (janela entre o 1º tiro e a morte,
   teto 3 s) foi para 2,39 s com N=53, 5,14 s com N=17 e 9,13 s com N=40, com ZERO mudança de
   comportamento de bot. Ou seja: com 3 sementes o BOT4 é ruído de estimador, e ficava
   vermelho/verde conforme quantas texturas o mapa tivesse.
   Com 9 sementes a mesma comparação deu base 3,82 s × entrega 3,46 s (as duas passam), acerto
   0,069→0,066 e mortes/min 0,944→0,861. O custo é ~3× de tempo de execução do botsim, que é o
   preço de o portão parar de mentir nos dois sentidos. As 3 primeiras são as históricas, para
   quem quiser reproduzir um A/B antigo com `SIM_SEEDS=12345,777,4242`. */
const SEEDS = (process.env.SIM_SEEDS || '12345,777,4242,90210,31337,8675309,2718,1618,42')
  .split(',').map(Number).filter((n) => Number.isFinite(n));
const out = [];
for (const id of ids) {
  const runs = [];
  for (const sd of SEEDS) { try { runs.push(runMap(id, textures, sd)); } catch (e) { if (process.env.SIM_TRACE) console.error(e.stack); runs.push({ map: id, err: e.message + ' @' + sd }); } }
  const ok = runs.filter(r => !r.err);
  if (!ok.length) { out.push(runs[0]); continue; }
  const m = (k) => +(ok.reduce((a, r) => a + r[k], 0) / ok.length).toFixed(3);
  if (DUEL) {
    // JANELA = média POOLED (soma dos tempos / número de mortes), não média de médias:
    // semente sem morte não tem amostra de "tempo até morrer" e não pode entrar como zero.
    const ts = ok.reduce((a, r) => a + r.ttkSum, 0), tn = ok.reduce((a, r) => a + r.ttkN, 0);
    out.push({ map: id, tirosBot: m('tirosBot'), acertos: m('acertos'), taxaAcerto: m('taxaAcerto'), fracCabeca: m('fracCabeca'), mortesPorMin: m('mortesPorMin'), janelaAteMorrer: +(tn ? ts / tn : 0).toFixed(2), ttkSum: ts, ttkN: tn }); continue;
  }
  out.push({ map: id, bots: ok[0].bots, latFlips: m('latFlips'), latFlipsCombat: m('latFlipsCombat'), latShare: m('latShare'), fwdFlips: m('fwdFlips'), fwdFlipsCombat: m('fwdFlipsCombat'), spinTurns: m('spinTurns'), spinRoam: m('spinRoam'), stuckPct: m('stuckPct'), eff: m('eff'), laneSpread: m('laneSpread'), laneTargetSpread: m('laneTargetSpread'), roamDepthSpread: m('roamDepthSpread') });
}
console.log(JSON.stringify(out, null, 1));
const avg = (k) => +(out.filter(o => !o.err).reduce((a, o) => a + o[k], 0) / Math.max(1, out.filter(o => !o.err).length)).toFixed(3);
if (DUEL) {
  const ok = out.filter(o => !o.err);
  const ts = ok.reduce((a, o) => a + o.ttkSum, 0), tn = ok.reduce((a, o) => a + o.ttkN, 0);
  console.log('MEDIA taxaAcerto', avg('taxaAcerto'), '| fracCabeca', avg('fracCabeca'), '| mortes/min', avg('mortesPorMin'),
    '| janela ate morrer (s)', +(tn ? ts / tn : 0).toFixed(3), '| mortes amostradas', tn);
  process.exit(0);
}
console.log('MEDIA latFlips/min', avg('latFlips'), '| fwdFlips/min', avg('fwdFlips'), '| latShare', avg('latShare'), '| spin voltas/min', avg('spinTurns'), '| spinRoam', avg('spinRoam'), '| stuck%', avg('stuckPct'), '| eff', avg('eff'));
