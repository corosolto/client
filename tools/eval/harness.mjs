/* ============================================================================
   harness.mjs — SUBIR O JOGO DE VERDADE EM NODE PURO (DOM stubado + three vendorizado).
   ----------------------------------------------------------------------------
   POR QUE EXISTE: este stub nasceu duplicado byte a byte em botsim.mjs e em
   pickup-check.mjs (~90 linhas cada). Ao escrever a terceira régua (map-check.mjs,
   rodada dos 4 defeitos de mapa do dono) a cópia viraria a TERCEIRA — e um stub que
   diverge entre réguas é um jeito silencioso de duas medidas discordarem por causa do
   INSTRUMENTO e não do jogo. Aqui ele é UM só: pickup-check.mjs e map-check.mjs
   importam daqui; a saída do pickup-check foi conferida IDÊNTICA antes e depois da
   extração (só o campo `gerado`, que é timestamp, muda).
   botsim.mjs NÃO foi migrado de propósito: ele é o baseline determinístico byte a byte
   desta rodada, e mexer no arquivo que serve de referência A/B é o erro clássico.

   O que este módulo faz ao ser importado (efeitos colaterais, nessa ordem):
     1. planta um DOM/canvas mínimo em globalThis (o que three + game.js tocam);
     2. planta o pacote-ponte `three` fora do repo, apontando pro vendorizado;
     3. importa THREE, MAPS, initTextures, Game, CHARACTERS.
   Exporta ainda `seedRandom` (Math.random determinístico) e `bootGame` (Game já com
   o round iniciado, que é o único estado em que os spawns/armário existem).
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
/* Image: o CTF carrega os emblemas de facção com `new Image()` (game.js:3178). Sem rede o
   onload nunca dispara — que é o comportamento certo aqui: a régua mede geometria, não
   textura. Sem este stub o Game nem constrói com ctf:true ("Image is not defined"). */
globalThis.Image = class { constructor() { this.onload = null; this.onerror = null; this.width = 1; this.height = 1; } set src(v) { this._src = v; } get src() { return this._src || ''; } };

/* Resolução do especificador nu `three`: os módulos de mapa fazem `import * as THREE from
   'three'`, que no browser é resolvido pelo import map do index.astro. Em node não existe
   import map, e `npm install` está bloqueado — então plantamos um pacote-ponte FORA do repo
   (subindo a árvore de node_modules a partir de tools/eval) apontando para o three
   vendorizado. Nada é baixado; é um arquivo de 3 linhas + dois symlinks. */
{
  const fs = await import('node:fs');
  /* DENTRO DO PROJETO, e não um nível acima (correção 07/08, achada pelo build limpo
     do T3). O atalho morava em `<pai-do-projeto>/node_modules/three`, e isso tem duas
     consequências que só aparecem em checkout novo:

       · ele é COMPARTILHADO por todo checkout debaixo daquele pai. Um clone antigo em
         /tmp/qb_base deixou o atalho apontando pra si; a pasta sumiu; o symlink virou
         pendurado. Aí `npm run assert:assets` num clone NOVO em /tmp/t3 morria com
         ERR_MODULE_NOT_FOUND — apontando pro caminho de um projeto que não existe mais.
       · `existsSync` num symlink QUEBRADO devolve false, então a guarda achava que
         precisava recriar; o `mkdir`/`writeFile` passavam, o `symlinkSync` estourava
         EEXIST, e o `try {} catch {}` engolia. Falha silenciosa permanente.

     Dentro do projeto o atalho nasce e morre com o checkout, é sempre gravável (a
     Vercel roda `npm ci` antes do buildCommand) e não contamina vizinho. E agora o
     symlink pendurado é CONSERTADO em vez de engolido. */
  const raiz = path.resolve(HERE, '../..');            // a raiz do projeto
  const shim = path.join(raiz, 'node_modules', 'three');
  const alvoIdx = path.resolve(raiz, 'public/vendor/three.module.js');
  const alvoAdd = path.resolve(raiz, 'public/vendor/addons');
  const liga = (de, para, tipo) => {
    // lstat vê o LINK; existsSync vê o DESTINO. Link pendurado só aparece pro lstat.
    try { fs.lstatSync(de); fs.rmSync(de, { recursive: true, force: true }); } catch { /* não existe */ }
    fs.symlinkSync(para, de, tipo);
  };
  if (!fs.existsSync(path.join(shim, 'index.js'))) {
    fs.mkdirSync(shim, { recursive: true });
    fs.writeFileSync(path.join(shim, 'package.json'), JSON.stringify({
      name: 'three', version: '0.160.0', type: 'module', main: 'index.js',
      exports: { '.': './index.js', './addons/*': './addons/*' },
    }));
    /* SEM catch mudo: se não der pra plantar o atalho, nenhuma régua sobe, e a mensagem
       tem que dizer isso — foi o silêncio aqui que escondeu o defeito por 3 dias. */
    liga(path.join(shim, 'index.js'), alvoIdx);
    liga(path.join(shim, 'addons'), alvoAdd, 'dir');
  }
}
export const THREE = await import('three');
export const { MAPS } = await import(`${JS}/maps.js`);
export const { initTextures } = await import(`${JS}/textures.js`);
export const { Game, confirmGate, CONFIRM_MIN_MS, CONFIRM_MAX_MS } = await import(`${JS}/game.js`);
export const { CHARACTERS } = await import(`${JS}/characters.js`);
export const PCHAR = (CHARACTERS.find(c => c.team === 'E') || CHARACTERS[0]).id;   // o scoreboard lê player.def.name
export { mkEl };

/* sfx mudo: qualquer método vira no-op (o Game chama uns 20 diferentes) */
export const sfx = new Proxy({}, { get: () => () => {} });
/* renderer stub: o loop de update não desenha, mas o construtor toca em capabilities */
const rendererBase = {
  capabilities: { getMaxAnisotropy: () => 4, isWebGL2: true }, shadowMap: { enabled: true, type: 0 },
  domElement: mkEl('canvas'), info: { render: {}, memory: {} }, outputColorSpace: '', toneMapping: 0, toneMappingExposure: 1,
  getPixelRatio: () => 1, getContext: () => ({}), getSize: (v) => (v ? v.set(1008, 655) : { width: 1008, height: 655 }),
  getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0, getClearColor: (c) => c,
  getClearAlpha: () => 1, xr: { enabled: false },
};
export const renderer = new Proxy(rendererBase, { get: (t, k) => (k in t ? t[k] : () => {}) });

/* RNG DETERMINÍSTICO: sem semente, duas execuções do mesmo código davam 22 e 34 latFlips
   no piscinão — variância maior que o efeito que se quer medir. Com semente fixa o A/B
   antes→depois compara a MESMA partida. Média de N sementes = robustez. */
export function seedRandom(seed) {
  let s = seed >>> 0;
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* Game com o round JÁ INICIADO: antes do _startRound não existem spawns aplicados nem
   armário montado, e medir ali seria medir o mapa vazio. */
export function bootGame(mapId, { textures, ctf = false, seed = 12345, bots = 4 } = {}) {
  seedRandom(seed);
  const g = new Game({
    renderer, textures, sfx, settings: { bots, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'SIM', mapId, ctf, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};        // a câmera de fim de round cria um WebGLRenderer — não existe aqui
  g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  /* MATRIZES DE MUNDO: no browser o WebGLRenderer.render() chama scene.updateMatrixWorld() a
     cada quadro; no harness NÃO há renderer, então ninguém atualiza e o Raycaster do three
     (que assume matrizes prontas) enxerga cada occluder na posição LOCAL — empilhados na
     ORIGEM com matrixWorld identidade. Medido no piscina_treta: 92/92 occluders na origem
     (o build do decalque atualiza 78 de raspão, sobram 14), praca_poderes 66/66, ferro_velho
     100/100. Toda métrica de bot que depende de linha de visão (`_losClear` faz raycast
     contra `world.occluders`, game.js:5044) estava medida contra geometria na origem — régua
     verde de graça. Occluder é estático: uma passada aqui, depois do build, basta. */
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  return g;
}
