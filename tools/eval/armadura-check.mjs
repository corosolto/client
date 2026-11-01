/* ARMADURA-CHECK — colete e capacete estilo CS (public/js/armadura.js + ARMOR_PEN em
   public/js/data/weapons.js + `_damage` do game.js).

   Imprime a régua de dano: arma × (sem colete, colete, colete+capacete) × (corpo, cabeça),
   com o dano BRUTO do jogo (`_shotDamage` a 0 m, então o multiplicador de cabeça é o real)
   e colete cheio (100). E cobra:

     AR1  sem colete o dano não muda (corpo e cabeça, toda arma)
     AR2  colete reduz o CORPO de toda arma e NÃO mexe na cabeça sem capacete
     AR3  capacete reduz a cabeça de todo fuzil e pistola
     AR4  capacete NÃO reduz a cabeça da AWP (pedido do dono) e ela segue matando
     AR5  ordem de penetração: AWP > todo fuzil > toda SMG
     AR6  nada some: vida + colete gasto / BONUS = dano bruto (inclusive colete quase vazio)
     AR7  identidades do CS: AK no corpo 3 → 4 tiros com colete; AK na cabeça com capacete
          ainda mata; PT-38 na cabeça com capacete não mata; AWP no corpo com colete mata
     AR8  ANDANDO o motor: `_damage` real tira menos vida de quem tem colete e gasta o colete
     AR9  HUD: número aparece com colete, some com 0; capacete marca a classe
     AR10 `?debug=1&colete=100&capacete=1` equipa jogador e bots; sem `debug=1` não equipa
     AR11 `?armadura=0` volta ao jogo antigo (sem colete, dano cheio)
     AR12 partida online/servidor dedicado: o `_damage` não aplica armadura (o servidor é
          a autoridade e não tem esse estado — contrato no corpo do PR)
     AR13 renascer (jogador e bot) passa pelo `_equiparArmadura`: re-equipa no debug, zera fora dele
     AR14 rajada de escopeta do bot com 1 chumbo na cabeça e o resto no peito: o colete sem
          capacete ainda segura a parte do peito (a rajada é somada antes do `_damage`)

   Mutantes (cada um TEM que reprovar):
     --mutante=sem-armadura   o motor roda com `?armadura=0` onde a régua espera armadura
     --mutante=capacete-awp   o capacete passa a segurar a AWP
     --mutante=pen-plana      toda arma com a mesma penetração (some AWP > fuzil > SMG)
     --mutante=sem-equipar    o respawn deixa de re-equipar (o colete da vida anterior fica)
     --mutante=chumbo-cabeca  `?armadurachumbo=0`: a rajada inteira passa pela regra da cabeça

   uso: node tools/eval/armadura-check.mjs [--mutante=...]
   (o motor roda em processo filho porque a querystring é lida na carga do game.js) */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ARQ = fileURLToPath(import.meta.url);
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');
const MUT = arg('mutante');

/* ── processo filho: sobe o motor com a querystring dada e devolve medidas em JSON ── */
if (process.argv.includes('--motor')) {
  const { bootGame, initTextures, THREE } = await import('./harness.mjs');
  const { WEAPONS } = await import('../../public/js/data/weapons.js');
  const g = bootGame('ferro_velho', { textures: initTextures(), ctf: false, seed: 4242 });
  const p = g.player, b = g.bots[0];
  const out = { equip: { player: [p.armor, p.helmet], bots: g.bots.map((x) => [x.armor, x.helmet]) } };
  g.state = 'live';
  const golpe = (alvo, colete, capacete, dano, arma, cabeca) => {
    alvo.alive = true; alvo.hp = 100; alvo.protUntil = 0; alvo.armor = colete; alvo.helmet = capacete;
    g._damage(alvo, dano, alvo === p ? b : p, arma, cabeca, null);
    return { hp: +alvo.hp.toFixed(3), colete: +(alvo.armor || 0).toFixed(3) };
  };
  out.bruto = Object.fromEntries(Object.keys(WEAPONS).map((w) => [w, {
    corpo: g._shotDamage(WEAPONS[w].dmg * (WEAPONS[w].pellets || 1), w, 0, false),
    cabeca: g._shotDamage(WEAPONS[w].dmg * (WEAPONS[w].pellets || 1), w, 0, true),
  }]));
  out.akCorpoColete = golpe(b, 100, false, 36, 'AK', false);
  out.akCorpoSem = golpe(b, 0, false, 36, 'AK', false);
  out.jogadorAk = golpe(p, 100, true, 36, 'AK', true);
  g._updateHud();
  const hud = () => ({ oculto: document.getElementById('armor-hud').classList.contains('hidden'),
    capacete: document.getElementById('armor-hud').classList.contains('com-capacete'),
    num: document.getElementById('armor-num').textContent });
  p.armor = 50; p.helmet = true; g._updateHud(); out.hudCheio = hud();
  p.armor = 0; p.helmet = false; g._updateHud(); out.hudVazio = hud();
  p.armor = 50; p.helmet = true; p.alive = false; g._updateHud(); out.hudMorto = hud(); p.alive = true;
  // renascer re-equipa (debug) ou zera (sem debug): anda o caminho de respawn de verdade
  if (process.env.ARMADURA_MUT === 'sem-equipar') g._equiparArmadura = () => {};
  for (const x of [p, b]) { x.armor = 7; x.helmet = false; }
  b.alive = false; g._respawnEntity(b);
  p.alive = false; g._respawnPlayer();
  out.renasce = { player: [p.armor, p.helmet], bot: [b.armor, b.helmet] };
  // rajada de escopeta de bot, sem sorteio: o cone real, 1 chumbo na cabeça e o resto no peito
  const rajada = (colete) => {
    p.alive = true; p.hp = 100; p.protUntil = 0; p.armor = colete; p.helmet = false;
    const consulta = g._consultarTiro; let n = 0;
    g._consultarTiro = () => ({ ent: p, head: n++ === 0, point: p.pos.clone(), dist: 4 });
    b.weapon = 'shotgun';
    g._dispararBot(b, b.pos.clone(), new THREE.Vector3(0, 0, -1), WEAPONS.shotgun, true);
    g._consultarTiro = consulta;
    return +(100 - p.hp).toFixed(3);
  };
  out.chumbo = { sem: rajada(0), colete: rajada(100) };
  g.dedicated = true; out.dedicado = golpe(b, 100, true, 36, 'AK', false); g.dedicated = false;
  g.online = true; out.online = golpe(b, 100, true, 36, 'AK', false); g.online = false;
  process.stdout.write('\n@@' + JSON.stringify(out));
  process.exit(0);
}

const motor = (qs) => {
  const r = spawnSync(process.execPath, [ARQ, '--motor'], { env: { ...process.env, SIM_QS: qs, ARMADURA_MUT: MUT }, encoding: 'utf8', maxBuffer: 64 << 20 });
  const i = (r.stdout || '').lastIndexOf('@@');
  if (r.status !== 0 || i < 0) { console.error(r.stderr?.slice(-2000)); throw new Error(`motor (${qs}) não subiu`); }
  return JSON.parse(r.stdout.slice(i + 2));
};

const { danoComArmadura, ARMADURA_BONUS } = await import('../../public/js/armadura.js');
const { WEAPONS, ARMOR_PEN, ATRAVESSA_CAPACETE } = await import('../../public/js/data/weapons.js');
const { perfilArma } = await import('../../public/js/data/weapon-profiles.js');

let tabela = ARMOR_PEN, atravessa = ATRAVESSA_CAPACETE;
if (MUT === 'capacete-awp') atravessa = [];
if (MUT === 'pen-plana') tabela = Object.fromEntries(Object.keys(ARMOR_PEN).map((k) => [k, 0.775]));
const calc = (dano, cabeca, colete, capacete, arma) => danoComArmadura({ dano, cabeca, colete, capacete, arma }, tabela, atravessa);

const padrao = motor(MUT === 'sem-armadura' ? 'armadura=0' : '');
const comDebug = motor(MUT === 'sem-armadura' ? 'armadura=0&debug=1&colete=100&capacete=1' : 'debug=1&colete=100&capacete=1');
const semGate = motor('colete=100&capacete=1');
const desligado = motor('armadura=0&debug=1&colete=100&capacete=1');
const chumbo = MUT === 'chumbo-cabeca' ? motor('armadurachumbo=0').chumbo : padrao.chumbo;

const falhas = [];
const cobra = (id, ok, msg) => { if (!ok) falhas.push(`${id} ${msg}`); };
const f1 = (n) => n.toFixed(1).padStart(6);

/* ── a régua de dano ── */
const linhas = [];
for (const w of Object.keys(WEAPONS)) {
  const { corpo, cabeca } = padrao.bruto[w];
  const c = { sem: calc(corpo, false, 0, false, w).vida, col: calc(corpo, false, 100, false, w).vida, cap: calc(corpo, false, 100, true, w).vida };
  const h = { sem: calc(cabeca, true, 0, false, w).vida, col: calc(cabeca, true, 100, false, w).vida, cap: calc(cabeca, true, 100, true, w).vida };
  linhas.push({ w, classe: perfilArma(w).perfilDano, pen: tabela[w], corpo, cabeca, c, h });
}
console.log('ARMADURA — dano na VIDA com colete 100 (bruto a 0 m, cabeça com o multiplicador real do jogo)');
console.log('arma        classe   pen  | corpo: sem  colete  +capac | cabeça: sem  colete  +capac');
for (const l of linhas) {
  console.log(`${l.w.padEnd(11)} ${l.classe.padEnd(7)} ${l.pen.toFixed(3)} |   ${f1(l.c.sem)} ${f1(l.c.col)} ${f1(l.c.cap)}  |  ${f1(l.h.sem)} ${f1(l.h.col)} ${f1(l.h.cap)}`);
}

for (const l of linhas) {
  cobra('AR1', l.c.sem === l.corpo && l.h.sem === l.cabeca, `${l.w}: sem colete o dano mudou`);
  cobra('AR2', l.c.col < l.corpo, `${l.w}: colete não reduziu o corpo (${l.corpo} → ${l.c.col})`);
  cobra('AR2', l.h.col === l.cabeca, `${l.w}: colete SEM capacete mexeu na cabeça`);
  if (['rifle', 'pistol'].includes(l.classe) && l.w !== 'knife') cobra('AR3', l.h.cap < l.cabeca, `${l.w}: capacete não reduziu a cabeça`);
}
const awp = linhas.find((l) => l.w === 'awp');
cobra('AR4', awp.h.cap === awp.cabeca && awp.h.cap >= 100, `AWP na cabeça com capacete: ${awp.cabeca} → ${awp.h.cap} (tem que passar inteiro e matar)`);
const pens = (pred) => linhas.filter(pred).map((l) => l.pen);
const fuzis = pens((l) => l.classe === 'rifle' && l.w !== 'knife'), smgs = pens((l) => l.classe === 'smg');
cobra('AR5', awp.pen > Math.max(...fuzis), `AWP (${awp.pen}) não atravessa mais que todo fuzil (máx ${Math.max(...fuzis)})`);
cobra('AR5', Math.min(...fuzis) > Math.max(...smgs), `fuzil mais fraco (${Math.min(...fuzis)}) não passa a SMG mais forte (${Math.max(...smgs)})`);
for (const [dano, colete, arma] of [[36, 100, 'ak'], [400, 5, 'awp'], [136, 2, 'pistol'], [126, 100, 'shotgun']]) {
  const r = calc(dano, false, colete, false, arma);
  const soma = r.vida + (colete - r.colete) / ARMADURA_BONUS;
  cobra('AR6', Math.abs(soma - dano) < 1e-9 && r.colete >= 0, `${arma} ${dano} com colete ${colete}: vida ${r.vida} + colete ${(colete - r.colete)}/${ARMADURA_BONUS} ≠ ${dano}`);
}
const tiros = (d) => Math.ceil(100 / d);
const ak = linhas.find((l) => l.w === 'ak'), pt = linhas.find((l) => l.w === 'pistol');
cobra('AR7', tiros(ak.c.sem) === 3 && tiros(ak.c.col) === 4, `AK no corpo: ${tiros(ak.c.sem)} → ${tiros(ak.c.col)} tiros (esperado 3 → 4)`);
cobra('AR7', ak.h.cap >= 100, `AK na cabeça com capacete não mata (${ak.h.cap.toFixed(1)})`);
cobra('AR7', pt.h.cap < 100, `PT-38 na cabeça com capacete ainda mata (${pt.h.cap.toFixed(1)})`);
cobra('AR7', awp.c.col >= 100, `AWP no corpo com colete não mata (${awp.c.col.toFixed(1)})`);

/* ── o motor ── */
const a = padrao.akCorpoColete, s = padrao.akCorpoSem;
console.log(`motor: AK 36 no corpo — sem colete hp ${s.hp}; com colete 100 hp ${a.hp}, colete ${a.colete}`);
cobra('AR8', Math.abs(a.hp - (100 - 36 * ARMOR_PEN.ak)) < 1e-6 && a.colete < 100, `_damage não aplicou o colete (hp ${a.hp}, colete ${a.colete}; esperado ${100 - 36 * ARMOR_PEN.ak})`);
cobra('AR8', s.hp === 64, `sem colete o _damage mudou (hp ${s.hp}, esperado 64)`);
cobra('AR8', padrao.jogadorAk.hp > 64, `jogador com capacete levou a AK na cabeça cheia (hp ${padrao.jogadorAk.hp})`);
cobra('AR9', !padrao.hudCheio.oculto && padrao.hudCheio.num === '50' && padrao.hudCheio.capacete, `HUD com colete 50 + capacete: ${JSON.stringify(padrao.hudCheio)}`);
cobra('AR9', padrao.hudVazio.oculto, 'HUD não some com colete 0');
cobra('AR9', padrao.hudMorto.oculto, 'HUD de morto ainda mostra o colete que sobrou');
cobra('AR13', comDebug.renasce.player[0] === 100 && comDebug.renasce.bot[0] === 100 && comDebug.renasce.player[1] && comDebug.renasce.bot[1],
  `renascer com ?debug=1&colete=100&capacete=1 não re-equipou: ${JSON.stringify(comDebug.renasce)}`);
cobra('AR13', padrao.renasce.player[0] === 0 && padrao.renasce.bot[0] === 0, `renascer sem debug não zerou o colete: ${JSON.stringify(padrao.renasce)}`);
const todos = (e, v) => [e.player, ...e.bots].every(([c, h]) => c === v && h === (v > 0));
cobra('AR10', todos(comDebug.equip, 100), `?debug=1&colete=100&capacete=1 não equipou todo mundo: ${JSON.stringify(comDebug.equip)}`);
cobra('AR10', todos(semGate.equip, 0), `sem ?debug=1 a querystring equipou: ${JSON.stringify(semGate.equip)}`);
cobra('AR11', todos(desligado.equip, 0) && desligado.akCorpoColete.hp === 64, `?armadura=0 não voltou ao antigo (hp ${desligado.akCorpoColete.hp})`);
cobra('AR12', padrao.dedicado.hp === 64 && padrao.online.hp === 64, `servidor/online aplicou armadura localmente (dedicado hp ${padrao.dedicado.hp}, online hp ${padrao.online.hp})`);

cobra('AR14', chumbo.sem > 0 && chumbo.colete < chumbo.sem * 0.85,
  `colete sem capacete não segurou a rajada com 1 chumbo na cabeça: perdeu ${chumbo.colete} com colete, ${chumbo.sem} sem`);
if (falhas.length) { for (const f of falhas) console.error('  ✗', f); process.exit(1); }
console.log(`  ✓ armadura: AR1-AR14 verdes${MUT ? ` (MUTANTE ${MUT} NÃO MORDEU)` : ''}`);
