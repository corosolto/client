#!/usr/bin/env node
/* ============================================================================
   botfaca-check.mjs — EM RODADA DE FACA O BOT TEM QUE JOGAR DE FACA
   ----------------------------------------------------------------------------
   O DEFEITO (pedido do dono: "em rodadas de faca, bots respeitarem o modo")
   O modo já entregava a faca na mão do bot (`_botWeapon()` devolve 'knife' quando
   `settings.wpnMode === 'knife'`), mas a CABEÇA dele continuou de arma de fogo, em
   duas frentes:

     (a) A BANDA DE DISTÂNCIA. `_updateBot` mantém uma histerese calibrada pra fuzil:
         entra em recuo abaixo de 6 m e só volta a 'mid' acima de 9,5 m. A faca alcança
         2,4 m. O bot fecha até 6 m, RECUA, fecha de novo — um ciclo-limite que nunca
         chega no alcance da própria arma. MEDIDO na árvore antes do conserto
         (praca_poderes, seed 4242, 7 bots, 90 s de simulação): menor distância
         bot->alvo = 5,98 m, ZERO ataques, ZERO abates. A rodada de faca era um
         desfile de bonecos se namorando a 6 metros.
     (b) O ATAQUE. Quando (por acaso) entrava no alcance, o bot resolvia o golpe pelo
         mesmo caminho do tiro: hitscan com desvio angular, TRAÇANTE e FOGACHO de cano.
         MEDIDO com o bot forçado a 1,5 m do alvo: 1 traçante e 3 fogachos em 3 s.
         Faca não tem cano nem projétil — o traçante é a arma de fogo aparecendo.

   O QUE ESTA RÉGUA MEDE (Game de verdade, sem navegador, semente fixa)
   BF1 em modo faca TODO combatente nasce com 'knife', e trocar para uma arma de fogo
       pelos slots 1/2 é recusado. A seleção do modo não pode ser só cosmética.
   BF2 PERSEGUIÇÃO: em 60 s de partida os bots encostam — a menor distância bot->alvo
       cai dentro do alcance da faca — e o combate ACONTECE (há abates).
   BF3 CONTATO REAL: o golpe respeita os 2,4 m declarados por WEAPONS.knife.range (com
       só 8 cm de tolerância para o passo discreto da simulação), sem a margem escondida
       de 0,6 m que dava ao bot 25% mais alcance que o jogador. Durante o golpe não sai
       traçante nem fogacho, e o som é o da faca.
   BF4 o modo 'all' (rodada normal) NÃO muda: os bots continuam abrindo distância (piso de
       4 m, derivado do 'back' abaixo de 6 m da própria banda de fuzil). É a cláusula que
       impede "consertar" a faca transformando todo bot num corredor.
   BF5 a virada de rodada preserva arma e placar individual, transfere os abates do time
       uma vez para o acumulado e não deixa rack/drop de arma furar o modo.

   Mutantes:
     recuo    — devolve a banda de recuo de fuzil pro bot de faca (defeito (a))
     tracante — devolve traçante/fogacho no golpe de faca (defeito (b))
     corredor — tira a banda de distância de TODO bot, inclusive de fuzil (prova BF4)
     alcance  — devolve os 0,6 m extras ao golpe do bot (prova BF3)
     troca    — deixa o jogador equipar arma de fogo no modo só faca (prova BF1)
   Uso: node tools/eval/botfaca-check.mjs [--mutante=<nome>]
   ============================================================================ */
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['recuo', 'tracante', 'corredor', 'alcance', 'troca'];
if (MUT && !MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const h = await import('./harness.mjs');
const { WEAPONS } = await import(new URL('../../public/js/data/weapons.js', import.meta.url).href);

const ALCANCE = WEAPONS.knife.range;
const DT = 1 / 60;
const falhas = [];
const num = (v, n = 2) => Number(v).toFixed(n);
const textures = h.initTextures(h.renderer);

function jogo(wpnMode, seed) {
  h.seedRandom(seed);
  const g = new h.Game({
    renderer: h.renderer, textures, sfx: h.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1, wpnMode },
    playerCharId: h.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'SIM', mapId: 'praca_poderes', testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  g._startRound();
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  g.state = 'live';
  return g;
}

/* Os mutantes voltam o defeito por cima do jogo já construído — comportamento, não texto. */
function planta(g) {
  if (MUT === 'troca') {
    const orig = g._switchWeapon.bind(g);
    g._switchWeapon = (wid, ...args) => {
      const mode = g.settings.wpnMode;
      g.settings.wpnMode = 'all';
      const out = orig(wid, ...args);
      g.settings.wpnMode = mode;
      return out;
    };
  }
  if (MUT === 'alcance') {
    const orig = g._meleeRange.bind(g);
    g._meleeRange = (wid) => orig(wid) + (wid === 'knife' ? 0.6 : 0);
  }
  /* Os dois mexem na POSIÇÃO depois do quadro, não em `b._range`: a banda é recalculada no
     topo de todo `_updateBot`, então escrever nela por fora não muda deslocamento nenhum — o
     mutante passaria verde sem reproduzir defeito algum. */
  if (MUT === 'recuo' || MUT === 'corredor') {
    const orig = g._updateBot.bind(g);
    g._updateBot = function (b, dt) {
      const r = orig(b, dt);
      const alvo = b.target;
      if (!b.alive || !alvo || !alvo.alive || !alvo.pos) return r;
      const d = Math.hypot(b.pos.x - alvo.pos.x, b.pos.z - alvo.pos.z);
      // 'recuo': o bot volta a fugir de perto (defeito (a)). 'corredor': todo bot cola no
      // alvo, inclusive o de fuzil — é o "conserto" preguiçoso que a BF4 tem de pegar.
      const sinal = MUT === 'recuo' ? (d < 6 ? 1 : 0) : (d > 1 ? -1 : 0);
      if (!sinal) return r;
      const a = Math.atan2(b.pos.x - alvo.pos.x, b.pos.z - alvo.pos.z);
      b.pos.x += Math.sin(a) * 3 * dt * sinal;
      b.pos.z += Math.cos(a) * 3 * dt * sinal;
      return r;
    };
  }
  if (MUT === 'tracante') {
    const origDmg = g._damage.bind(g);
    g._damage = function (ent, dmg, att, weap, head, pt) {
      if (att && !att.isPlayer && att.weapon === 'knife') { g._tracer(att.pos.clone(), (ent.pos || att.pos).clone()); g._flash(att.pos.clone(), new h.THREE.Vector3(0, 0, 1)); }
      return origDmg(ent, dmg, att, weap, head, pt);
    };
  }
  return g;
}

/* instrumentação: conta o enfeite de arma de fogo e os golpes de bot */
function instrumenta(g) {
  const m = { tracers: 0, flashes: 0, sons: [], golpes: [], menorDist: Infinity };
  const oT = g._tracer.bind(g); g._tracer = (...a) => { m.tracers++; return oT(...a); };
  const oF = g._flash.bind(g); g._flash = (...a) => { m.flashes++; return oF(...a); };
  const oD = g._damage.bind(g);
  g._damage = (ent, dmg, att, weap, head, pt) => {
    if (att && !att.isPlayer && att.pos && ent.pos) m.golpes.push({ arma: att.weapon, d: att.pos.distanceTo(ent.pos), weap });
    return oD(ent, dmg, att, weap, head, pt);
  };
  g.sfx = new Proxy({}, { get: (_t, k) => (...a) => { m.sons.push(k === 'shotWeapon' ? `shotWeapon:${a[0]}` : String(k)); } });
  return m;
}

function roda(g, m, segundos) {
  for (let i = 0; i < 60 * segundos; i++) {
    g.update(DT, false);
    for (const b of g.bots) {
      const e = b.target;
      if (!b.alive || !e || !e.alive || !e.pos) continue;
      const d = Math.hypot(b.pos.x - e.pos.x, b.pos.z - e.pos.z);
      if (d < m.menorDist) m.menorDist = d;
    }
  }
}

/* ---------------- BF1/BF2/BF3: rodada de faca ---------------- */
const gk = planta(jogo('knife', 4242));
const mk = instrumenta(gk);

const semFaca = gk.bots.filter((b) => b.weapon !== 'knife');
if (semFaca.length) falhas.push(`BF1 ${semFaca.length}/${gk.bots.length} bots nasceram com arma de fogo em rodada de faca (${[...new Set(semFaca.map((b) => b.weapon))].join(', ')})`);
if (gk.player.weapon !== 'knife') falhas.push(`BF1 jogador nasceu com ${gk.player.weapon}, não com faca`);
gk._switchWeapon('awp');
if (gk.player.weapon !== 'knife') falhas.push(`BF1 slot de arma furou o modo só faca: jogador equipou ${gk.player.weapon}`);
/* O mutante deixa a arma proibida ativa; restaura o cenário para BF2/BF3 medirem a IA,
   e não a consequência secundária de um player armado no meio da rodada. */
if (gk.player.weapon !== 'knife') gk._switchWeapon('knife');

roda(gk, mk, 60);

const abates = gk.bots.reduce((a, b) => a + b.kills, 0);
if (mk.menorDist > ALCANCE)
  falhas.push(`BF2 os bots nunca encostaram: menor distância bot->alvo ${num(mk.menorDist)} m, alcance da faca ${num(ALCANCE)} m`);
if (!mk.golpes.length)
  falhas.push('BF2 nenhum golpe de faca em 60 s — o bot carrega a faca e nunca ataca');
if (!abates)
  falhas.push('BF2 zero abates em 60 s de rodada de faca — a rodada não acontece');

/* Um quadro a 60 Hz desloca o bot em ~5 cm; 8 cm absorvem essa discretização sem
   transformar tolerância técnica em alcance de gameplay. Medido antes do conserto:
   2,99 m para uma arma declarada com 2,40 m. */
const MARGEM_PASSO = 0.08;
const longe = mk.golpes.filter((x) => x.d > ALCANCE + MARGEM_PASSO);
if (longe.length) falhas.push(`BF3 ${longe.length} golpes de faca fora do alcance declarado (até ${num(Math.max(...longe.map((x) => x.d)))} m, máximo ${num(ALCANCE + MARGEM_PASSO)} m)`);
if (mk.tracers) falhas.push(`BF3 ${mk.tracers} traçantes numa rodada de faca — faca não tem projétil`);
if (mk.flashes) falhas.push(`BF3 ${mk.flashes} fogachos de cano numa rodada de faca — faca não tem cano`);
const tiros = mk.sons.filter((s) => s.startsWith('shotWeapon'));
if (tiros.length) falhas.push(`BF3 ${tiros.length} chamadas de som de TIRO numa rodada de faca (${[...new Set(tiros)].join(', ')}) — o golpe deve tocar knife/knifeHit`);
if (mk.golpes.length && !mk.sons.some((s) => s === 'knife' || s === 'knifeHit'))
  falhas.push('BF3 houve golpe de faca e nenhum som de faca — o ataque saiu mudo');

/* ---------------- BF5: continuidade entre rodadas ---------------- */
const roundAntes = { ...gk.roundKills };
const matchAntes = { ...gk.matchKills };
const individuais = gk.combatants.map((c) => c.kills);
gk._startRound();
const armadosDepois = gk.bots.filter((b) => b.weapon !== 'knife');
if (gk.player.weapon !== 'knife' || armadosDepois.length)
  falhas.push(`BF5 rodada nova furou o modo faca (player=${gk.player.weapon}, bots armados=${armadosDepois.length})`);
if (gk.roundKills.E !== 0 || gk.roundKills.B !== 0)
  falhas.push(`BF5 placar da rodada não zerou (${gk.roundKills.E}×${gk.roundKills.B})`);
if (gk.matchKills.E !== matchAntes.E + roundAntes.E || gk.matchKills.B !== matchAntes.B + roundAntes.B)
  falhas.push('BF5 abates do round não foram transferidos exatamente uma vez para matchKills');
if (gk.combatants.some((c, i) => c.kills !== individuais[i]))
  falhas.push('BF5 a virada zerou/alterou o contador individual de abates');
if ((gk.world.pickups?.length || 0) || gk.drops.length)
  falhas.push(`BF5 modo faca deixou armas coletáveis após reset (mapa=${gk.world.pickups?.length || 0}, drops=${gk.drops.length})`);

/* ---------------- BF4: a rodada normal não vira corrida ---------------- */
const ga = planta(jogo('all', 4242));
const ma = instrumenta(ga);
const facaEmAll = ga.bots.filter((b) => b.weapon === 'knife');
if (facaEmAll.length) falhas.push(`BF4 ${facaEmAll.length} bots receberam faca em rodada NORMAL — o conserto vazou pro outro modo`);
roda(ga, ma, 30);
/* PISO COM PROCEDÊNCIA: a banda de fuzil de `_updateBot` entra em 'back' abaixo de 6 m
   (game.js, `dist < 6 ? 'back'`), então rodada normal não desce muito disso; 4 m dá a
   margem de um quadro de reação. Medido nesta árvore: 23,46 m no jogo limpo contra
   2,87 m com o mutante 'corredor'. */
const PISO_FUZIL = 4.0;
if (ma.menorDist < PISO_FUZIL)
  falhas.push(`BF4 em rodada normal os bots passaram a colar no alvo (menor distância ${num(ma.menorDist)} m, piso ${num(PISO_FUZIL)} m) — a banda de fuzil foi embora junto`);

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) {
  console.log(`  \x1b[32m✓\x1b[0m BF rodada de faca: encostou a ${num(mk.menorDist)} m (alcance ${num(ALCANCE)}), ${mk.golpes.length} golpes, ${abates} abates, 0 traçante/fogacho`
    + ` · rodada normal intacta (menor distância ${num(ma.menorDist)} m)`);
}
const mutacaoCega = !!MUT && !falhas.length;
if (mutacaoCega) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');
}
process.exit(falhas.length ? 1 : 0);
