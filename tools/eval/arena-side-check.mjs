// Prova independente do lado corrente e halo; preenchida pelo pacote GLM150.
// CLI: [] prova normal (famílias A/B/C + hook M + metaprova) · --mutantes driver (baseline 0 + mutantes) · --mutante=nome modo child.
import { readFileSync, writeSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AssertionError } from 'node:assert';
import assert from 'node:assert/strict';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.join(HERE, 'arena-side-check.mjs');
const LOADER = path.join(HERE, 'arena-side-loader.mjs');
const MAIN = path.resolve(HERE, '../../public/js/main.js');
const MUTANTES = ['lado-antigo', 'halo-congelado'];
const CLAUSULA = { 'lado-antigo': 'SIDE_MELEE', 'halo-congelado': 'SIDE_HALO' };

/* handlers globais ANTES de qualquer import dinâmico: nenhum erro é embrulhado como AssertionError. */
const reporta = (err) => {
  writeSync(2, `ARENA_SIDE_ERROR:${JSON.stringify({ tool: 'arena-side-check', name: err?.name || String(err), mutante: process.env.ARENA_SIDE_MUTANT || '', clause: String(err?.message ?? err) })}\n`);
  process.exit(err instanceof AssertionError ? 1 : 2);
};
process.on('uncaughtException', reporta);
process.on('unhandledRejection', reporta);

const args = process.argv.slice(2);
const driver = args.length === 1 && args[0] === '--mutantes';
const metaOnly = args.length === 1 && args[0] === '--selftest';
const mutanteArg = args.length === 1 && args[0].startsWith('--mutante=') ? args[0].slice(10) : '';
if (args.length && !driver && !metaOnly && !MUTANTES.includes(mutanteArg)) {
  console.error('uso: arena-side-check [--mutantes|--selftest|--mutante=nome]'); process.exit(2);
}
if (mutanteArg && (process.env.ARENA_SIDE_MUTANT !== mutanteArg || !process.execArgv.includes(LOADER))) {
  console.error('setup: mutante exige driver com loader confinado'); process.exit(2);
}

function parseRun(r) {
  const stderr = r.stderr || '';
  const marks = stderr.split('\n').filter((l) => l.startsWith('ARENA_SIDE_APPLIED:'));
  const errs = stderr.split('\n').filter((l) => l.startsWith('ARENA_SIDE_ERROR:'));
  let record = null;
  try { if (errs.length === 1) record = JSON.parse(errs[0].slice('ARENA_SIDE_ERROR:'.length)); } catch { /* rejeita */ }
  return { error: r.error, signal: r.signal, status: r.status, marks, errs, record,
    infra: /SyntaxError|ReferenceError|TypeError|setup:/.test(stderr) };
}
function verdict(r, nome = null) {
  if (r.error || r.signal || r.infra) return false;
  if (!nome) return r.status === 0 && r.marks.length === 0 && r.errs.length === 0;
  return r.status === 1 && r.marks.length === 1 && r.marks[0] === 'ARENA_SIDE_APPLIED:' + nome
    && r.errs.length === 1 && r.record?.name === 'AssertionError'
    && r.record?.mutante === nome && r.record?.tool === 'arena-side-check'
    && String(r.record?.clause || '').includes(CLAUSULA[nome]);
}
function metaProva() {
  const nome = MUTANTES[0];
  const record = { tool: 'arena-side-check', name: 'AssertionError', mutante: nome, clause: CLAUSULA[nome] };
  const ok = { status: 1, signal: null, error: null,
    stderr: `ARENA_SIDE_APPLIED:${nome}\nARENA_SIDE_ERROR:${JSON.stringify(record)}\n` };
  assert.ok(verdict(parseRun(ok), nome), 'meta: recusou controle mutante válido');
  const falsos = [
    { ...ok, error: new Error('spawn') }, { ...ok, signal: 'SIGTERM' },
    ...[0, 2, null].map((status) => ({ ...ok, status })),
    { ...ok, stderr: ok.stderr.split('\n').slice(1).join('\n') },
    { ...ok, stderr: ok.stderr + `ARENA_SIDE_APPLIED:${nome}\n` },
    { ...ok, stderr: `ARENA_SIDE_APPLIED:${nome}\n` },
    { ...ok, stderr: ok.stderr + `ARENA_SIDE_ERROR:${JSON.stringify(record)}\n` },
    ...[{ name: 'TypeError' }, { mutante: 'outro' }, { tool: 'outra' }, { clause: 'SIDE_OUTRA' }].map((delta) => ({ ...ok,
      stderr: `ARENA_SIDE_APPLIED:${nome}\nARENA_SIDE_ERROR:${JSON.stringify({ ...record, ...delta })}\n` })),
    { ...ok, stderr: ok.stderr + 'TypeError: preparação\n' },
  ];
  falsos.forEach((r, i) => assert.ok(!verdict(parseRun(r), nome), `meta: falso positivo ${i}`));
  const base = { status: 0, signal: null, error: null, stderr: '' };
  assert.ok(verdict(parseRun(base)), 'meta: recusou baseline válida');
  for (const r of [{ ...base, status: 1 }, { ...base, signal: 'SIGKILL' }, { ...base, error: new Error('spawn') },
    { ...base, stderr: ok.stderr }, { ...base, stderr: 'TypeError: preparação' }]) assert.ok(!verdict(parseRun(r)), 'meta: baseline falsa aceita');
}

async function prova() {
  /* harness importado DINAMICAMENTE: falha de setup cai nos handlers acima, nunca como AssertionError. */
  const H = await import('./harness.mjs');
  const { bootGame, initTextures, THREE } = H;
  const textures = await initTextures();
  const MAPA = H.MAP_IDS.includes('praca_poderes') ? 'praca_poderes' : H.MAP_IDS[0];
  const mappingDe = (g) => JSON.stringify({ spawns: g.world.spawns, playerTeam: g.playerTeam, enemyTeam: g.enemyTeam, playerFaction: g.playerFaction, enemyFaction: g.enemyFaction });
  const rosterDe = (g) => JSON.stringify(g.bots.map((b) => [b.def?.id, b.team]));
  const hpsDe = (g) => JSON.stringify(g.bots.map((b) => b.hp));
  const aoVivo = (g) => { if (g.state !== 'live') g.state = 'live'; };
  const corHex = (g, lado) => new THREE.Color(g._teamColor(lado)).getHexString();

  /* ---- A: lado corrente no kill/respawn do jogador e no _meleeHit (E→B e B→E) ---- */
  for (const alvo of ['B', 'E']) {
    const g = bootGame(MAPA, { textures, bots: 4, arena: true, seed: 1501 });
    aoVivo(g);
    const antigo = alvo === 'B' ? 'E' : 'B';
    if (alvo === 'E') g._switchTeam();   // cenário B→E começa com o jogador já no lado B
    assert.equal(g.player.team, antigo, `A: jogador não partiu do lado ${antigo}`);
    const map0 = mappingDe(g), ros0 = rosterDe(g), hp0 = hpsDe(g);
    const algoz = g.bots.find((b) => b.alive && b.team !== g.player.team);
    assert.ok(algoz, 'A: sem algoz do lado oposto');
    g._kill(g.player, algoz, 'AK', false);
    assert.equal(g.player.alive, false, 'A: kill real não matou o jogador');
    assert.equal(g.player._switchTeam, alvo, `A: morte não agendou conversão para ${alvo}`);
    assert.ok(g.bots.some((b) => b.alive && b.team === antigo), 'A: lado antigo ficou sem combatente com o jogador morto');
    assert.equal(g.state, 'live', 'A: partida encerrou com o jogador morto');
    assert.equal(mappingDe(g), map0, 'A: kill do jogador alterou o mapping E/B');
    assert.equal(rosterDe(g), ros0, 'A: kill do jogador alterou o roster dos outros');
    assert.equal(hpsDe(g), hp0, 'A: kill do jogador alterou o HP dos outros');
    g._respawnPlayer();
    assert.equal(g.player.team, alvo, `A: respawn não converteu o jogador para ${alvo}`);
    assert.equal(g.player.alive, true, 'A: respawn não reviveu o jogador');
    assert.equal(g.player.hp, 100, 'A: respawn não devolveu HP cheio');
    assert.ok(!g.player._switchTeam, 'A: respawn deixou _switchTeam pendente no jogador');
    assert.equal(g.state, 'live', 'A: partida encerrou após conversão do jogador');
    assert.equal(mappingDe(g), map0, 'A: respawn do jogador alterou o mapping E/B');
    assert.equal(rosterDe(g), ros0, 'A: respawn do jogador alterou o roster dos outros');
    assert.equal(hpsDe(g), hp0, 'A: respawn do jogador alterou o HP dos outros');
    /* _meleeHit real com _damage espião (só registra o alvo, não replica golpe nem dano) */
    const foe = g.bots.find((b) => b.alive && b.team !== g.player.team);
    const ally = g.bots.find((b) => b.alive && b.team === g.player.team);
    assert.ok(foe && ally, 'A: cenário de faca sem foe/ally');
    g.camView = 'first';
    g.camera.position.set(g.player.pos.x, g.player.pos.y + 1.6, g.player.pos.z);
    g.camera.quaternion.identity();
    g.camera.updateMatrixWorld(true);
    const from = g._aimOrigin(new THREE.Vector3());
    for (const b of g.bots) b.pos.set(from.x + 50, from.y, from.z + 50);
    foe.pos.set(from.x, from.y - 1.2, from.z - 1.4);   // inimigo a 1,4 m no eixo da mira
    ally.pos.set(from.x, from.y - 1.2, from.z - 1.0);  // aliado mais perto, também dentro da mira
    const alvos = [];
    const danoReal = g._damage;
    g._damage = (ent) => { alvos.push(ent); };         // espião: apenas registra, zero replicação
    try { g._meleeHit(); } finally { g._damage = danoReal; }
    assert.equal(alvos.length, 1, `SIDE_MELEE _meleeHit atingiu ${alvos.length} alvos (esperado só o foe)`);
    assert.ok(alvos[0] === foe, 'SIDE_MELEE golpe escolheu alguém que não é o foe (aliado mais perto dentro da mira)');
    /* M manual APÓS conversão, sem charId: identidade do jogador é preservada */
    const idAntes = g.playerDef.id, defAntes = g.player.def;
    g._switchTeam();
    assert.notEqual(g.player.team, alvo, 'A: M manual sem charId não trocou o lado');
    assert.equal(g.playerDef.id, idAntes, 'A: M manual sem charId trocou a identidade (playerDef)');
    assert.equal(g.player.def, defAntes, 'A: M manual sem charId trocou a identidade (player.def)');
    g.dispose?.();
  }

  /* ---- B: halo existente converte via _respawnEntity e volta com a conversão do jogador ---- */
  const cenariosB = [
    { paraAlly: true, texFim: 'haloAlly', texVolta: 'haloEnemy' },   // bot inimigo B→E (vira aliado), jogador E→B (volta inimigo)
    { paraAlly: false, texFim: 'haloEnemy', texVolta: 'haloAlly' },  // bot aliado E→B (vira inimigo), jogador E→B (volta aliado)
  ];
  for (const c of cenariosB) {
    const g = bootGame(MAPA, { textures, bots: 4, arena: true, seed: 1523 });
    aoVivo(g);
    const bot = g.bots.find((b) => b.alive && b._mark && (c.paraAlly ? b.team !== g.player.team : b.team === g.player.team));
    assert.ok(bot, 'B: cenário sem halo inicial no bot');
    assert.equal(bot._mark.ally, !c.paraAlly, 'B: marca inicial não condiz com o lado do bot');
    const halo = bot._mark.halo, geo = halo.geometry, pai = halo.parent;
    const contaHalos = () => pai.children.filter((o) => o.geometry === geo).length;
    const nHalos = contaHalos();
    const texAlly = g._teamMarkTex('haloAlly'), texEnemy = g._teamMarkTex('haloEnemy');
    assert.equal(halo.material.map, c.paraAlly ? texEnemy : texAlly, 'B: textura inicial não condiz com o lado');
    const destino = c.paraAlly ? g.player.team : (g.player.team === 'E' ? 'B' : 'E');
    const killer = [g.player, ...g.bots].find((x) => x !== bot && x.alive && x.team === destino);
    assert.ok(killer, 'B: sem algoz da facção de destino');
    g._kill(bot, killer, 'FRAG');
    assert.equal(bot.alive, false, 'B: kill real não matou o bot');
    assert.equal(bot._switchTeam, destino, 'B: kill real não enfileirou conversão');
    g._respawnEntity(bot);
    assert.equal(bot._switchTeam, null, 'B: _respawnEntity deixou _switchTeam pendente');
    assert.equal(bot.alive, true, 'B: bot não renasceu');
    assert.equal(bot.hp, 100, 'B: bot não renasceu com HP cheio');
    const ladoNovo = c.paraAlly ? g.player.team : (g.player.team === 'E' ? 'B' : 'E');
    assert.equal(bot.team, ladoNovo, 'B: conversão do bot foi pro lado errado');
    g._updateTeamMark(bot);
    assert.equal(bot._mark.halo, halo, 'SIDE_HALO conversão trocou o Mesh do halo');
    assert.equal(halo.geometry, geo, 'SIDE_HALO conversão trocou a geometria do halo');
    assert.equal(halo.parent, pai, 'SIDE_HALO conversão reparentou o halo');
    assert.equal(contaHalos(), nHalos, 'SIDE_HALO conversão duplicou ou removeu halos');
    assert.equal(bot._mark.ally, c.paraAlly, 'SIDE_HALO halo não migrou ally/enemy após a conversão do bot');
    assert.equal(halo.material.map, c.paraAlly ? texAlly : texEnemy, 'SIDE_HALO textura do halo não migrou para o cache do novo lado');
    assert.equal(halo.material.color.getHexString(), corHex(g, bot.team), 'SIDE_HALO cor do material diverge do _teamColor do novo lado');
    /* jogador converte pelo caminho real (morte por algoz + respawn): o MESMO halo inverte de novo */
    const algoz = g.bots.find((b) => b.alive && b.team !== g.player.team && b !== bot);
    assert.ok(algoz, 'B: sem algoz válido do outro lado');
    const anterior = g.player.team;
    g._kill(g.player, algoz, 'AK', false);
    g._respawnPlayer();
    assert.equal(g.player.team, anterior === 'E' ? 'B' : 'E', 'B: jogador não converteu');
    assert.ok(g.bots.some((b) => b.alive && b.team !== g.player.team), 'B: conversão do jogador deixou o outro lado sem atacante válido');
    assert.equal(g.state, 'live', 'B: partida encerrou na conversão do jogador');
    g._updateTeamMark(bot);
    assert.equal(bot._mark.halo, halo, 'SIDE_HALO o mesmo halo não sobreviveu à conversão do jogador');
    assert.equal(contaHalos(), nHalos, 'SIDE_HALO conversão do jogador duplicou ou removeu halos');
    assert.equal(bot._mark.ally, !c.paraAlly, 'SIDE_HALO halo não voltou ao lado original após a conversão do jogador');
    assert.equal(halo.material.map, c.paraAlly ? texEnemy : texAlly, 'SIDE_HALO textura não voltou ao cache do lado original');
    assert.equal(halo.material.color.getHexString(), corHex(g, bot.team), 'SIDE_HALO cor do material diverge do _teamColor após a volta');
    g.dispose?.();
  }

  // M reassina um bot morto sem deixar conversão viva órfã, nos dois sentidos.
  for (const inicial of ['E', 'B']) {
    const g = bootGame(MAPA, { textures, bots: 1, arena: true, seed: 7319 });
    aoVivo(g);
    if (inicial === 'B') g._switchTeam();
    const bot = g.bots[0], destino = inicial === 'E' ? 'B' : 'E';
    assert.equal(g.player.team, inicial, 'C: lado inicial incorreto');
    assert.equal(bot.team, destino, 'C: bot não está no lado oposto');
    const map0 = mappingDe(g), faccaoDestino = g._factionOf(destino);
    let finais = 0, resultado = null;
    g.onMatchEnd = (d) => { finais++; resultado = d; };
    g._kill(bot, g.player, 'FRAG');
    assert.equal(bot.alive, false, 'C: kill real não matou o bot');
    assert.equal(bot._switchTeam, inicial, 'C: morte não agendou conversão do bot');
    g._switchTeam('id-que-nao-existe-no-elenco');
    assert.equal(g.player.team, destino, 'C: M não usou o lado corrente');
    assert.equal(bot.team, inicial, 'C: bot não foi reassignado');
    assert.equal(bot.alive, true, 'C: M não reviveu o bot');
    assert.equal(bot._switchTeam, null, 'C: M deixou flag viva órfã');
    assert.equal(g.playerDef.team, faccaoDestino, 'C: fallback não escolheu a facção de destino');
    assert.equal(mappingDe(g), JSON.stringify({ ...JSON.parse(map0), playerTeam: destino, enemyTeam: inicial,
      playerFaction: faccaoDestino, enemyFaction: JSON.parse(map0).playerFaction }), 'C: M corrompeu o mapping de facções');
    assert.equal(g.state, 'live', 'C: M encerrou a partida cedo');
    assert.equal(finais, 0, 'C: M apresentou fim prematuro');
    g._kill(g.player, bot, 'FRAG');
    assert.equal(g.player._switchTeam, inicial, 'C: morte do jogador não agendou conversão');
    g._respawnPlayer();
    assert.equal(g.player.team, inicial, 'C: conversão final do jogador incorreta');
    assert.equal(g.player.team, bot.team, 'C: conversão final não unificou os lados');
    g._checkArenaWin();
    assert.equal(g.state, 'matchEnd', 'C: não encerrou após a conversão final');
    assert.equal(finais, 1, 'C: final não foi apresentado exatamente uma vez');
    assert.equal(resultado.won, true, 'C: jogador convertido não venceu');
    assert.equal([g.player, ...g.combatants].filter((x) => x.alive && x._switchTeam).length, 0, 'C: flag viva órfã final');
    g.dispose();
  }

  /* ---- hook M real: extraído do main por anchor único, executado com game real ---- */
  {
    const src = readFileSync(MAIN, 'utf8');
    const anchor = 'function armSwitchHook() {';
    assert.equal(src.split(anchor).length - 1, 1, 'hook: anchor armSwitchHook não é único no main');
    const ini = src.indexOf(anchor);
    let prof = 0, fim = -1;
    for (let i = ini; i < src.length; i++) {
      if (src[i] === '{') prof++;
      else if (src[i] === '}') { prof--; if (prof === 0) { fim = i + 1; break; } }
    }
    assert.ok(fim > ini, 'hook: não fechou as chaves de armSwitchHook');
    const fnSrc = src.slice(ini, fim);   // função REAL, nada replicado aqui
    const fabrica = new Function('game', 'mpSessao', 'pickTeam', 'abrirTrocaOnline',
      `${fnSrc}\nlet switchMode = false;\nreturn { armar: armSwitchHook, switchMode: () => switchMode };`);
    const g = bootGame(MAPA, { textures, bots: 4, arena: true, seed: 1541 });
    aoVivo(g);
    const lados = ['E', 'apos-conversao'];
    for (const fase of lados) {
      const faccoes = [], abriu = [];
      const ui = fabrica(g, null, (f) => { faccoes.push(f); }, () => { abriu.push(1); return 1; });
      ui.armar();
      assert.equal(typeof g.onRequestSwitch, 'function', `hook ${fase}: não armou onRequestSwitch`);
      g.onRequestSwitch();
      const oposto = g.player.team === 'E' ? 'B' : 'E';
      assert.equal(g.paused, true, `hook ${fase}: offline não pausou`);
      assert.equal(ui.switchMode(), true, `hook ${fase}: switchMode não ligou`);
      assert.equal(faccoes.length, 1, `hook ${fase}: pickTeam chamado ${faccoes.length}x`);
      assert.equal(faccoes[0], g._factionOf(oposto), `hook ${fase}: pediu facção fora do lado oposto ao corrente`);
      assert.equal(abriu.length, 0, `hook ${fase}: offline entrou no caminho online`);
      g.setPaused(false);   // estado/pausa corretos para a operação seguinte
      assert.equal(g.paused, false, `hook ${fase}: não devolveu a partida despausada`);
      if (fase === 'E') {
        const killer = g.bots.find((b) => b.alive && b.team !== g.player.team);
        assert.ok(killer, 'hook: sem algoz válido para conversão real');
        g._kill(g.player, killer, 'FRAG'); g._respawnPlayer();
        assert.equal(g.player.team, 'B', 'hook: conversão real não mudou lado corrente');
      }
    }
    /* online: abre a troca online (retorna 1) sem chamar pickTeam nem caminho SP */
    const faccoes = [], abriu = [];
    const ui = fabrica(g, { net: {} }, (f) => { faccoes.push(f); return 0; }, () => { abriu.push(1); return 1; });
    ui.armar();
    const ret = g.onRequestSwitch();
    assert.equal(ret, 1, 'hook online: onRequestSwitch não devolveu abrirTrocaOnline()=1');
    assert.equal(abriu.length, 1, 'hook online: abrirTrocaOnline não chamado 1x');
    assert.equal(faccoes.length, 0, 'hook online: chamou pickTeam (vazou caminho SP)');
    assert.equal(g.paused, false, 'hook online: pausou/entrou no caminho SP');
    g.dispose?.();
  }
}

function child(nome = '') {
  const env = { ...process.env }; delete env.ARENA_SIDE_MUTANT;
  const argv = [CHECK];
  if (nome) { env.ARENA_SIDE_MUTANT = nome; argv.unshift('--loader', LOADER); argv.push('--mutante=' + nome); }
  return parseRun(spawnSync(process.execPath, argv, { env, timeout: 120000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' }));
}

metaProva();
if (metaOnly) {
  console.log('arena-side metadriver: PASS');
} else if (driver) {
  const base = child();
  if (!verdict(base)) throw new Error('driver: baseline inválida ' + JSON.stringify(base));
  console.log('arena-side baseline 0: PASS');
  for (const nome of MUTANTES) {
    const run = child(nome);
    if (!verdict(run, nome)) throw new Error(`driver: mutante ${nome} não provou cláusula própria: ${JSON.stringify(run)}`);
    console.log(`arena-side mutante ${nome}: MORDIDO (${CLAUSULA[nome]})`);
  }
} else {
  await prova();
  console.log('arena-side: conversões/combate/M/halos + metadriver PASS');
}
