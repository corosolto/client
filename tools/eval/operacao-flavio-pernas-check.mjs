#!/usr/bin/env node
/* PERNAS DOS BOTS NA OPERAÇÃO FLÁVIO — quem se desloca anda, não levita.
   Defeito (dono, 17/11/2026, ROUNDS 3/5, 1ª pessoa): o VIP de quepe e a escolta cruzavam o
   pátio parados numa pose, sem mexer as pernas. Medido no browser (?map=operacao_flavio):
   o VIP em marcha reta trocava o par 8-way (run|strafe_right_pistol) ↔ (strafe_left_pistol|run)
   em TODO quadro — a lateral real é ±0 de ruído e cai dos dois lados da fronteira de setor —
   e `_setLocoPar` dava reset() nos dois clipes a cada troca: run preso em t≈0,01 s com peso de
   fade-in 0,1..0,6, o resto do esqueleto na pose de ligação. Segundo modo do mesmo defeito: o
   par escreve `weight` (1−mix / mix) e `_to` (fallback sem strafe, LOD≥2) reativava o clipe
   com o peso velho do par — bot a 50 m correndo com run a 0,03 de peso (97 % pose de ligação).

   Tudo pelo Game real em operacao_flavio, GLBs e AnimationMixer reais, pack extras.glb real:
     FP1-marcha     · rodada sem ataque: VIP + escolta em marcha pelo game.update real.
     FP2-rodada     · rodada com ataque (combate, recuo, strafe, LOD pela câmera do jogador).
     FP3-reta-ruido · um bot real andando reto pelo _updateBot, lateral ±1e-7 m/s de ruído.
     FP4-lod-longe  · o mesmo bot de lado perto da câmera e depois correndo a >45 m (LOD 2).
     FP5-reta-sem-pack · FP3 sem os clipes do extras.glb (antes do pack chegar): o lado
                    vazio cai no fallback `_to` do clipe base.
   Por bot com pernas pedidas (banda _mvHigh do jogo): peso efetivo somado ≥ 0,85 em ≥ 95 %
   dos quadros (resto = pose de ligação), fase do clipe dominante avançando ≥ 60 % do tempo
   esperado (dt × timeScale) e coxa (LeftUpLeg) girando ≥ 0,25 rad por metro andado.
   Mutantes (cada um devolve UMA metade do defeito e tem de reprovar):
     reset-no-par · `_setLocoPar` volta a reiniciar o clipe que já toca no par
     peso-velho   · `_to` não devolve weight=1 ao clipe que saiu do par
     to-reinicia  · `_to` volta a reiniciar o clipe base que já tocava no par
   Uso: node tools/eval/operacao-flavio-pernas-check.mjs [--mutante=…|--mutantes] */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUTANTES = {
  'reset-no-par': {
    antes: '        if (vivos.includes(action) && action.isRunning()) continue;\n',
    depois: '',
    reprova: ['FP1-marcha', 'FP2-rodada', 'FP3-reta-ruido', 'FP5-reta-sem-pack'],
  },
  'peso-velho': {
    antes: '    a.weight = 1;\n',
    depois: '',
    reprova: ['FP4-lod-longe'],
  },
  'to-reinicia': {
    antes: 'const herda = !once && (a === this._locoA || a === this._locoB) && a.isRunning();',
    depois: 'const herda = false;',
    reprova: ['FP5-reta-sem-pack'],
  },
};
if (process.argv.includes('--mutantes')) {
  for (const kind of ['', ...Object.keys(MUTANTES)]) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...(kind ? [`--mutante=${kind}`] : [])], { cwd: root, encoding: 'utf8' });
    process.stdout.write(r.stdout);
    assert.equal(r.status, 0, `${kind || 'nominal'}: ${r.stderr.slice(-1200)}`);
  }
  process.exit(0);
}
const mutante = process.argv.find((x) => x.startsWith('--mutante='))?.slice(10) || '';
assert.ok(!mutante || MUTANTES[mutante], `mutante desconhecido: ${mutante}`);
const glbUrl = new URL('../../public/js/glbchars.js', import.meta.url).href;
if (mutante) {
  const { antes, depois } = MUTANTES[mutante];
  const src = fs.readFileSync(fileURLToPath(glbUrl), 'utf8');
  assert.equal(src.split(antes).length, 2, `mutante ${mutante} deve aplicar uma vez`);
  const mutado = src.replace(antes, depois);
  registerHooks({ load(url, context, next) { return url === glbUrl ? { format: 'module', source: mutado, shortCircuit: true } : next(url, context); } });
  console.log(`Mutação aplicada: ${mutante}`);
}

const assetPath = (url) => path.resolve(root, 'public', String(url).split('?')[0].replace(/^\//, ''));
const localFetch = async (url) => {
  const file = assetPath(url);
  return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 });
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
const H = await import('./harness.mjs');
const { THREE, CHARACTERS } = H;
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t;
  } }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(assetPath(url));
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch((e) => (fail ? fail(e) : Promise.reject(e)));
};
const G = await import(glbUrl);

const def = (id) => { const d = CHARACTERS.find((c) => c.id === id); assert.ok(d, `personagem ${id} ausente`); return d; };
// Elenco do print/medição do browser: VIP (senador) abre o lado B; bandeirante é o de chapéu.
const ALIADOS = ['senador', 'curupira', 'bandeirante'], INIMIGOS = ['punk', 'bonzo', 'chave', 'metaleiro'];
const ARMAS = ['pistol', 'ak'];
await G.preloadCharacterAssets([...ALIADOS, ...INIMIGOS, 'capitao'], { weapons: ARMAS });
for (const id of [...ALIADOS, ...INIMIGOS]) assert.ok(G.hasModel(id), `${id}.glb não carregou — a régua não sabe medir`);
const espera = (ms = 0) => new Promise((r) => setTimeout(r, ms));
{ // pack extras.glb pronto antes da partida: no browser ele chega no primeiro strafe/recuo.
  const m = G.buildCharacterModel(def('capitao'), { weaponId: 'ak' });
  m.ctrl._requestExtras();
  for (let i = 0; i < 300 && !m.ctrl.actions.strafe_left; i++) await espera(10);
  assert.ok(m.ctrl.actions.strafe_left, 'extras.glb não registrou strafe_left');
}

const LOCO = /^(walk|walk1h|run|crouchwalk|walkfire|walk_back|walk_back_pistol|run_back|strafe_(left|right)(_pistol)?)$/;
const DT = 1 / 60;
const novoJogo = (seed) => {
  H.seedRandom(seed);
  const g = new H.Game({ renderer: H.renderer, textures: H.initTextures(), sfx: H.sfx,
    settings: { bots: 3, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: 'capitao', playerTeam: 'B', playerFaction: 'B', enemyFaction: 'E', nickname: 'PERNAS',
    mapId: 'operacao_flavio', ctf: false, testMode: true,
    // Como elencoOperacaoFlavio (main.js): o def do VIP abre o lado B.
    matchRoster: { allyDefs: ALIADOS.map(def), enemyDefs: INIMIGOS.map(def) }, matchWeapons: ['pistol', 'ak', 'ak', 'ak', 'ak', 'ak', 'ak'],
    onQuit() {}, onMatchEnd() {} });
  g._ensureDolly = () => {}; g.killsToWin = Infinity; g.start(); g.state = 'live';
  g.scene.updateMatrixWorld(true); g.world.root.updateMatrixWorld(true);
  assert.ok(g.objective?.vip?.mesh?.isGLB, 'VIP sem corpo GLB — a régua não sabe medir');
  return g;
};

/* Amostra por bot, depois de cada quadro: pernas pedidas = banda _mvHigh do próprio jogo
   (o corpo transladou > 0,45 m/s). Mede peso, fase do clipe dominante e giro da coxa. */
const amostrador = () => {
  const porBot = new Map();
  const coxa = (c) => c.corpo?.get?.('LeftUpLeg') || null;
  return {
    porBot,
    quadro(bot, dt, mede = true) {
      const c = bot.mesh?.ctrl;
      if (!bot.alive || !bot.mesh?.isGLB || !c || c.dead) { porBot.get(bot) && (porBot.get(bot).ant = null); return; }
      let m = porBot.get(bot);
      if (!m) { m = { nome: bot.name, char: c.charId, n: 0, pesoOk: 0, faseReal: 0, faseEsperada: 0, rad: 0, metros: 0, lods: new Set(), ant: null }; porBot.set(bot, m); }
      const leg = coxa(c);
      let dom = null, domW = -1, total = 0;
      for (const [nome, a] of Object.entries(c.actions)) {
        if (!a.isRunning()) continue;
        const w = a.getEffectiveWeight(); total += w;
        if (LOCO.test(nome) && w > domW) { dom = a; domW = w; }
      }
      const atual = { x: bot.pos.x, z: bot.pos.z, dom, t: dom?.time ?? 0, q: leg ? leg.quaternion.clone() : null };
      const ant = m.ant; m.ant = atual;
      if (!mede || !ant || !bot._mvHigh || /^(victory|defeat|jump)$/.test(c.curName || '')) return;
      m.n++; m.lods.add(c.lod);
      if (total >= 0.85) m.pesoOk++;
      m.metros += Math.hypot(atual.x - ant.x, atual.z - ant.z);
      if (atual.q && ant.q) m.rad += atual.q.angleTo(ant.q);
      if (dom && ant.dom === dom) {
        const dur = dom.getClip().duration || 1;
        let d = Math.abs(atual.t - ant.t); if (d > dur / 2) d = dur - d;   // volta do loop
        m.faseReal += d; m.faseEsperada += dt * Math.abs(dom.getEffectiveTimeScale());
      }
    },
  };
};
const veredito = (m, minimo = 30) => {
  if (m.n < minimo) return null;
  const peso = m.pesoOk / m.n, fase = m.faseEsperada > 0 ? m.faseReal / m.faseEsperada : 0, radM = m.metros > 0.5 ? m.rad / m.metros : 0;
  const txt = `${m.nome} (${m.char}) n=${m.n} lod=${[...m.lods].join('/')} peso≥0,85 ${(peso * 100).toFixed(0)}% fase ${(fase * 100).toFixed(0)}% coxa ${radM.toFixed(2)} rad/m`;
  return { ok: peso >= 0.95 && fase >= 0.6 && radM >= 0.25, txt };
};

const results = [];
const check = async (id, fn) => {
  try { const linhas = await fn(); results.push({ id, ok: true, linhas }); }
  catch (e) { results.push({ id, ok: false, erro: e.message }); }
};
const simula = async (g, segundos, aquece = 2) => {
  const am = amostrador();
  const quadros = Math.round(segundos / DT), ignora = Math.round(aquece / DT);
  for (let f = 0; f < quadros; f++) {
    g.update(DT, false);
    if (g.state !== 'live') { g.state = 'live'; g.timeLeft = Math.max(g.timeLeft || 0, 60); }
    if (f >= ignora) for (const b of g.bots) am.quadro(b, DT);
    if (f % 20 === 0) await espera();   // promessas do pack lazy resolvem como no browser
  }
  return am;
};
const exigeBots = (am, quem, minBots) => {
  const vs = [...am.porBot.values()].map((m) => veredito(m)).filter(Boolean);
  assert.ok(vs.length >= minBots, `${quem}: só ${vs.length} bot(s) andaram o bastante para medir`);
  const ruins = vs.filter((v) => !v.ok);
  assert.equal(ruins.length, 0, `${quem}: ${ruins.length}/${vs.length} bot(s) deslizando sem perna:\n    ${ruins.map((v) => v.txt).join('\n    ')}`);
  return vs.map((v) => v.txt);
};

await check('FP1-marcha', async () => {
  const g = novoJogo(7);
  for (const b of g.bots) if (b.team === 'E') { b.alive = false; b.respawnAt = Infinity; b.hp = 0; }
  const am = await simula(g, 24);
  const vip = am.porBot.get(g.objective.vip);
  assert.ok(vip && veredito(vip), 'VIP não marchou o bastante para medir');
  return exigeBots(am, 'marcha', 3);
});
await check('FP2-rodada', async () => {
  const g = novoJogo(11);
  const am = await simula(g, 30);
  return exigeBots(am, 'rodada', 4);
});

/* FP3/FP4: um bot real (escolta B) pelo _updateBot real, com posição e rumo roteirizados
   (setters ignorados: a IA não move o corpo, o resto do caminho é o do jogo — o mesmo
   recurso do EX11 em estados3p-check). */
const roteiro = (g, bot, passos) => {
  let x = 0, z = 0, yaw = 0;
  const pos = new THREE.Vector3();
  Object.defineProperty(pos, 'x', { configurable: true, get: () => x, set() {} });
  Object.defineProperty(pos, 'z', { configurable: true, get: () => z, set() {} });
  const posOriginal = bot.pos;
  Object.defineProperty(bot, 'pos', { configurable: true, writable: true, value: pos });
  Object.defineProperty(bot, 'yaw', { configurable: true, get: () => yaw, set() {} });
  const am = amostrador();
  try {
    for (const passo of passos) {
      ({ x, z, yaw } = passo.inicio(g.camera.position));
      bot._lp = { x, z }; bot._mvHigh = false; bot.target = null;
      for (let i = 0; i < passo.quadros; i++) {
        const [dx, dz] = passo.mov(i); x += dx; z += dz;
        g._updateBot(bot, DT); g.time += DT;
        am.quadro(bot, DT, i >= 20);   // 1/3 s de assentamento após cada teleporte do roteiro
      }
    }
  } finally {
    delete bot.yaw; bot.yaw = yaw;
    Object.defineProperty(bot, 'pos', { configurable: true, writable: true, value: posOriginal });
  }
  return am.porBot.get(bot);
};
const botRoteiro = (g) => {
  const bot = g.bots.find((b) => b.team === 'B' && b !== g.objective.vip && b.mesh?.isGLB);
  assert.ok(bot, 'sem escolta GLB para roteirizar');
  g.objective.botDestination = () => null;   // o modo não puxa o corpo roteirizado
  bot.alive = true; bot.target = null; bot.crouchBias = false; bot.protUntil = 0; bot.mesh.ctrl.revive();
  return bot;
};
await check('FP3-reta-ruido', async () => {
  const g = novoJogo(3); const bot = botRoteiro(g);
  for (const b of g.bots) if (b !== bot) { b.alive = false; b.respawnAt = Infinity; }
  const v = 3.2 * DT;   // corrida reta ao longo do rumo 0 (+Z), com lateral ±1e-7 m/s de ruído
  const m = roteiro(g, bot, [{ quadros: 240, inicio: (c) => ({ x: c.x + 4, z: c.z + 6, yaw: 0 }), mov: (i) => [(i % 2 ? 1 : -1) * 1e-7 * DT, v] }]);
  const r = veredito(m);
  assert.ok(r, 'bot roteirizado não pediu pernas');
  assert.ok(r.ok, r.txt);
  return [r.txt];
});
await check('FP4-lod-longe', async () => {
  const g = novoJogo(5); const bot = botRoteiro(g);
  for (const b of g.bots) if (b !== bot) { b.alive = false; b.respawnAt = Infinity; }
  const v = 3.2 * DT;
  // 1) de lado para a esquerda a 8 m da câmera (par strafe_left|run com run a peso ~0);
  // 2) mesmo corpo correndo para a frente a 60 m (LOD 2: clipe único, sem par).
  const m = roteiro(g, bot, [
    { quadros: 90, inicio: (c) => ({ x: c.x + 5, z: c.z + 6, yaw: 0 }), mov: () => [v, 0] },
    { quadros: 240, inicio: (c) => ({ x: c.x + 60, z: c.z + 6, yaw: 0 }), mov: () => [0, v] },
  ]);
  const r = veredito(m);
  assert.ok(r, 'bot roteirizado não pediu pernas');
  assert.ok(m.lods.has(2), `LOD 2 não exercitado: ${[...m.lods].join('/')}`);
  assert.ok(r.ok, r.txt);
  return [r.txt];
});
await check('FP5-reta-sem-pack', async () => {
  // Antes do extras.glb chegar (ou sem ele): o setor do lado vazio cai no fallback `_to`
  // do clipe base, o outro volta ao par (run|—) — alternando a cada quadro na reta.
  const g = novoJogo(9); const bot = botRoteiro(g);
  for (const b of g.bots) if (b !== bot) { b.alive = false; b.respawnAt = Infinity; }
  const ctrl = bot.mesh.ctrl;
  for (const k of Object.keys(ctrl.actions)) if (/^(strafe_|walk_back|run_back)/.test(k)) delete ctrl.actions[k];
  ctrl._requestExtras = () => {};
  const v = 3.2 * DT;
  const m = roteiro(g, bot, [{ quadros: 240, inicio: (c) => ({ x: c.x + 4, z: c.z + 6, yaw: 0 }), mov: (i) => [(i % 2 ? 1 : -1) * 1e-7 * DT, v] }]);
  const r = veredito(m);
  assert.ok(r, 'bot roteirizado não pediu pernas');
  assert.ok(r.ok, r.txt);
  return [r.txt];
});

const falhas = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'ok  ' : 'FALHA'} ${r.id}${r.erro ? ` · ${r.erro}` : ''}`);
  for (const l of r.linhas || []) console.log(`      ${l}`);
}
if (mutante) {
  assert.deepEqual(falhas.map((r) => r.id), MUTANTES[mutante].reprova, `mutante ${mutante} fora das cláusulas dele`);
  console.log(`MUTANTE ${mutante} REPROVADO: ${falhas.map((r) => r.id).join(', ')}`);
} else {
  assert.equal(falhas.length, 0, `${falhas.length} cláusula(s) vermelha(s)`);
  console.log(`PERNAS FLÁVIO VERDE: ${results.length} cláusulas; bots em deslocamento tocam locomoção com peso, fase e coxa`);
}
process.exit(0);
