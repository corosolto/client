/* ============================================================================
   economia-jogo-check.mjs: TRETA$ DA PARTIDA DENTRO DO GAME REAL (arnês, sem browser)
   ----------------------------------------------------------------------------
   Irmã de economia-check.mjs (que mede o módulo puro). Aqui o Game sobe com
   `economia: true`, como o main.js faz no single player, e a régua cobra:

     EJ1 nasce com faca + pistola, sem primária, saldo 800 e SEM armário grátis
     EJ2 kill-switch: sem `economia` (arnês, nó dedicado, ?economia=0) volta o loadout
         de hoje: arma do personagem na mão e armário no spawn
     EJ3 kill paga por classe: pistola +300, faca +1500, aliado 0
     EJ4 compra no spawn e no tempo debita e equipa; fora do tempo e fora do spawn recusa
     EJ5 tecla 1 sem primária não dá AWP de brinde
     EJ6 morreu, perdeu: a primária comprada cai no chão e o renascido volta de pistola
     EJ7 fim de rodada: vitória 3250, derrota 1400, sobrevivente mantém a compra
     EJ8 modos especiais e nó dedicado não abrem loja mesmo com `economia: true`
     EJ9 nada disso escreve no localStorage de chave treta nem chama /api/treta
     EJ10 bots nascem de pistola com 800 e guardam a arma sorteada para comprar (a pistola
          sorteada de 600/700 já sai na rodada 1, paga)
     EJ11 começo de rodada: bot com saldo compra a sorteada e paga; sem saldo fica de pistola
     EJ12 bot que morre perde a arma, renasce de pistola e só recompra na rodada seguinte;
          bot que mata recebe pela classe da arma

   Mutantes (rodam sempre; cada um TEM de acender pelo menos uma cláusula):
     carteira-menu  o crédito de abate também grava o saldo numa chave treta do localStorage
     tecla1-awp     _slotPrimaria volta a cair na AWP
     sem-perda      rearmar vira no-op (morrer não custa nada)
     armario        o armário grátis volta com a loja ligada
     bot-de-graca   o bot pega a arma sorteada sem pagar
     bot-sem-perda  bot que morre renasce com a arma comprada

   Uso: node tools/eval/economia-jogo-check.mjs
   ============================================================================ */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { initTextures, renderer, sfx, seedRandom, CHARACTERS } =
  await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
const { Game } = await import(pathToFileURL(path.join(ROOT, 'public/js/game.js')));
const { charWeapon } = await import(pathToFileURL(path.join(ROOT, 'public/js/characters.js')));
const { ECONOMIA, precoDe } = await import(pathToFileURL(path.join(ROOT, 'public/js/economia-partida.js')));

console.info = () => {};   // o Game anuncia a composição dos times a cada boot
const textures = initTextures();
const PERSONAGEM = CHARACTERS.find((c) => c.team === 'E' && !['pistol', 'deagle', 'revolver38'].includes(charWeapon(c.id)));

function boot({ economia = true, settings = {}, dedicated = false, mut = null } = {}) {
  seedRandom(12345);
  const g = new Game({
    renderer, textures, sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1, ...settings },
    playerCharId: PERSONAGEM.id, playerTeam: 'E', playerFaction: PERSONAGEM.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'ferro_velho', ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
    economia, dedicated,
  });
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  if (mut) mut(g);
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  return g;
}

const tecla = (g, code) => g._kd({ code, target: null, repeat: false, preventDefault() {} });
const rack = (g) => g.drops.filter((d) => d.rack).length;
const inimigo = (g) => g.bots.find((b) => b.team !== g.playerTeam);
const aliado = (g) => g.bots.find((b) => b.team === g.playerTeam);
const matar = (g, vit, att, weap) => { g.time += 0.05; g._kill(vit, att, weap, false); };
const saldo = (g) => g.player.carteira?.saldo;

function medir(mut = {}) {
  const rows = [];
  const check = (id, nome, pass, obs = {}) => rows.push({ id, nome, pass: !!pass, obs });

  {
    const g = boot({ mut: mut.boot });
    const p = g.player;
    check('EJ1', 'nasce com faca + pistola, 800 e sem armário',
      !!g._compra && p.weapon === 'pistol' && !p.primary && p.secondary === 'pistol' && saldo(g) === 800 && rack(g) === 0,
      { weapon: p.weapon, primary: p.primary, saldo: saldo(g), rack: rack(g) });

    tecla(g, 'Digit1');
    check('EJ5', 'tecla 1 sem primária não dá AWP', p.weapon === 'pistol' && !p.primary, { weapon: p.weapon });

    const v = inimigo(g), a = aliado(g);
    matar(g, v, p, 'PT-38'); const s1 = saldo(g);
    p.weapon = 'knife'; matar(g, inimigo(g), p, 'FACA'); const s2 = saldo(g);
    p.weapon = 'pistol';
    if (a) matar(g, a, p, 'PT-38');
    const s3 = saldo(g);
    check('EJ3', 'kill: pistola +300, faca +1500, aliado 0', s1 === 1100 && s2 === 2600 && s3 === 2600, { s1, s2, s3 });
  }

  {
    const g = boot({ mut: mut.boot });
    const p = g.player;
    g.player.carteira.saldo = 5000;
    g._compra.comprar('ak');
    const ok = p.weapon === 'ak' && p.primary === 'ak' && saldo(g) === 5000 - (charWeapon(PERSONAGEM.id) === 'ak' ? 2450 : 2700);
    const s0 = saldo(g);
    const tAntes = g.time;
    g.time = g._compra.compraAte + 0.1;
    const rTempo = g._compra.comprar('m4');
    g.time = tAntes;
    const pos = p.pos.clone();
    p.pos.x += 200;
    const rZona = g._compra.comprar('m4');
    p.pos.copy(pos);
    check('EJ4', 'compra no tempo/spawn equipa; fora do tempo e do spawn recusa',
      ok && rTempo.motivo === 'tempo' && rZona.motivo === 'zona' && saldo(g) === s0 && p.primary === 'ak',
      { weapon: p.weapon, saldo: saldo(g), tempo: rTempo.motivo || 'ACEITOU', zona: rZona.motivo || 'ACEITOU' });

    p.weapon = 'pistol';
    const antesDrops = g.drops.filter((d) => d.weapon === 'ak').length;
    matar(g, p, inimigo(g), 'AK');
    const caiu = g.drops.filter((d) => d.weapon === 'ak').length - antesDrops;
    g.state = 'live';
    g._respawnPlayer();
    check('EJ6', 'morreu: AK cai no chão, renasce de pistola sem primária',
      caiu === 1 && p.weapon === 'pistol' && !p.primary, { caiu, weapon: p.weapon, primary: p.primary });

    // sobrevivente: compra de novo, vence a rodada, rodada nova mantém a arma
    g.time = tAntes; g._compra.compraAte = g.time + 10;
    p.carteira.saldo = 3000; g._compra.comprar('mp5');
    const sAntes = saldo(g);
    g.roundKills = { E: 3, B: 1 };
    g._endRound();
    const ganhoVit = saldo(g) - sAntes;
    g._startRound();
    const mantem = p.primary === 'mp5' && p.weapon === 'mp5';
    const s2 = saldo(g);
    g.roundKills = { E: 0, B: 2 };
    g._endRound();
    const ganhoDer = saldo(g) - s2;
    p.carteira.saldo = 15900; g.roundKills = { E: 2, B: 0 }; g._endRound();
    check('EJ7', 'rodada: vitória 3250, derrota 1400, teto, sobrevivente mantém',
      ganhoVit === 3250 && ganhoDer === 1400 && mantem && saldo(g) === ECONOMIA.teto,
      { ganhoVit, ganhoDer, mantem, teto: saldo(g) });
  }

  {
    const g = boot({ mut: mut.boot });
    const bots = g.bots;
    check('EJ10', 'bots nascem de pistola com 800 e guardam a sorteada',
      // quem sorteou pistola de 600/700 já compra na rodada 1, como no CS; o resto segura os 800
      bots.length > 0 && bots.every((b) => b._armaAlvo && (b.weapon === 'pistol'
        ? b.carteira?.saldo === 800 : b.weapon === b._armaAlvo && b.carteira?.saldo === 800 - precoDe(b._armaAlvo))),
      { bots: bots.map((b) => `${b.weapon}/${b.carteira?.saldo}/${b._armaAlvo}`) });

    const [rico, pobre] = bots.filter((b) => b.team !== g.playerTeam);
    rico._armaAlvo = 'ak'; rico.carteira.saldo = 3000;
    pobre._armaAlvo = 'awp'; pobre.carteira.saldo = 1000;
    g._startRound();
    check('EJ11', 'rodada: bot com saldo compra e paga; sem saldo fica de pistola',
      rico.weapon === 'ak' && rico._meshWeapon === 'ak' && rico.carteira.saldo === 300
      && pobre.weapon === 'pistol' && pobre.carteira.saldo === 1000,
      { rico: `${rico.weapon}/${rico.carteira.saldo}`, pobre: `${pobre.weapon}/${pobre.carteira.saldo}` });

    g.state = 'live';
    const antes = g.drops.filter((d) => d.weapon === 'ak').length;
    matar(g, rico, g.player, 'PT-38');
    const caiu = g.drops.filter((d) => d.weapon === 'ak').length - antes;
    const saldoMorto = rico.carteira.saldo;
    g._respawnEntity(rico);
    const sPobre = pobre.carteira.saldo;
    pobre.weapon = 'pistol'; matar(g, g.player, pobre, 'PT-38');
    check('EJ12', 'bot morto larga a arma, renasce de pistola sem recomprar; bot que mata recebe',
      caiu === 1 && rico.weapon === 'pistol' && rico.carteira.saldo === saldoMorto && pobre.carteira.saldo === sPobre + 300,
      { caiu, renasceu: rico.weapon, saldo: rico.carteira.saldo, killer: pobre.carteira.saldo - sPobre });
  }

  {
    const off = boot({ economia: false, mut: mut.boot });
    check('EJ2', 'sem economia: arma do personagem e armário de hoje',
      !off._compra && off.player.weapon === charWeapon(PERSONAGEM.id) && rack(off) > 0,
      { weapon: off.player.weapon, rack: rack(off) });
  }

  {
    const modos = ['awp', 'knife', 'pistols'].map((m) => !!boot({ settings: { wpnMode: m } })._compra);
    const ded = !!boot({ dedicated: true })._compra;
    check('EJ8', 'modos especiais e dedicado sem loja', !modos.some(Boolean) && !ded, { modos, ded });
  }
  return rows;
}

// EJ9: espiões no localStorage e no fetch durante TODA a medição
function comEspiao(fn) {
  const sujo = [];
  const ls = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), f0 = globalThis.fetch;
  const mem = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, writable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { if (/treta/i.test(k)) sujo.push(`set:${k}`); mem.set(k, String(v)); },
      removeItem: (k) => { if (/treta/i.test(k)) sujo.push(`rm:${k}`); mem.delete(k); },
      clear: () => sujo.push('clear'),
    },
  });
  globalThis.fetch = (u) => { if (/treta/i.test(String(u))) sujo.push(`fetch:${u}`); return Promise.resolve({ ok: true, json: async () => ({}) }); };
  let rows;
  try { rows = fn(); } finally {
    if (ls) Object.defineProperty(globalThis, 'localStorage', ls); else delete globalThis.localStorage;
    globalThis.fetch = f0;
  }
  rows.push({ id: 'EJ9', nome: 'carteira do menu intocada', pass: sujo.length === 0, obs: { sujo: sujo.slice(0, 5) } });
  return rows;
}

const MUTANTES = {
  'carteira-menu': { boot: (g) => {
    if (!g._compra) return;
    const a = g._compra.aoAbate.bind(g._compra);
    g._compra.aoAbate = (...x) => { a(...x); globalThis.localStorage.setItem('cs_treta_saldo', String(g.player.carteira.saldo)); };
  } },
  'tecla1-awp': { boot: (g) => { g._slotPrimaria = () => g.player.primary || 'awp'; } },
  'sem-perda': { boot: (g) => { if (g._compra) g._compra.rearmar = () => {}; } },
  'bot-sem-perda': { boot: (g) => { if (g._compra) g._compra._rearmarBot = () => {}; } },
  'bot-de-graca': { boot: (g) => { if (g._compra) g._compra._botCompra = (b) => g._compra._armarBot(b, b._armaAlvo); } },
  'armario': { boot: (g) => {
    if (!g._compra) return;
    const r = g._resetPositions.bind(g);
    g._resetPositions = () => { const c = g._compra; g._compra = null; r(); g._compra = c; };
  } },
};

const print = (rows) => rows.map((r) => `${r.pass ? 'ok ' : 'XX '} ${r.id} ${r.nome}${r.pass ? '' : ' ' + JSON.stringify(r.obs)}`).join('\n');
const real = comEspiao(() => medir());
console.log(print(real));
const falhas = real.filter((r) => !r.pass);
const cegos = [];
for (const [nome, m] of Object.entries(MUTANTES)) {
  let vermelhas;
  try { vermelhas = comEspiao(() => medir(m)).filter((r) => !r.pass).map((r) => r.id); } catch (e) { vermelhas = [`exceção: ${e.message}`]; }
  console.log(`mutante ${nome}: ${vermelhas.length ? 'VERMELHO (' + vermelhas.join(',') + ')' : 'VERDE, régua cega'}`);
  if (!vermelhas.length) cegos.push(nome);
}
console.log(`\neconomia no jogo: ${real.length - falhas.length}/${real.length} verdes; mutantes cegos: ${cegos.length ? cegos.join(',') : 'nenhum'}`);
if (falhas.length || cegos.length) process.exitCode = 1;
process.exit();
