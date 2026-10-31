// Regressões do lado corrente, conversões pendentes e fim online pelo Game real.
import assert from 'node:assert/strict';
import { writeSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MUTANTES } from './arena-runtime-loader.mjs';

const AQUI = fileURLToPath(import.meta.url);
const LIMITE_MS = 120000;
let mutanteAtual = null;

function sai(codigo, obj) {
  writeSync(2, JSON.stringify({ ferramenta: 'arena-runtime-check', ...obj }) + '\n');
  process.exit(codigo);
}

/* driver --mutantes: só builtins; o harness pesado entra somente no filho */
function roda(argv) {
  const nome = argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
  return spawnSync(process.execPath, ['--loader', fileURLToPath(new URL('./arena-runtime-loader.mjs', import.meta.url)), AQUI, ...argv],
    { encoding: 'utf8', timeout: LIMITE_MS, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, ARENA_RUNTIME_MUTANT: nome } });
}

function morteValida(r, nome, clausula) {
  if (r.error || r.signal || r.status !== 1) return false;
  const err = r.stderr || '';
  if (err.split(`POST arena-runtime mutante=${nome} aplicado`).length !== 2) return false;
  if (/(SyntaxError|ReferenceError|TypeError)|setup:|mutante desconhecido/.test(err)) return false;
  const linhas = err.split('\n').filter((l) => l.startsWith('{'));
  if (linhas.length !== 1) return false;
  let falha;
  try { falha = JSON.parse(linhas[0]); } catch { return false; }
  return falha.ferramenta === 'arena-runtime-check' && falha.erro === 'AssertionError'
    && falha.mutante === nome && String(falha.clausula || '').includes(clausula);
}

function metadriver() {
  const [nome, def] = Object.entries(MUTANTES)[0];
  const falha = { ferramenta: 'arena-runtime-check', erro: 'AssertionError', mutante: nome, clausula: def.clausula };
  const stderr = (f) => `POST arena-runtime mutante=${nome} aplicado\n${JSON.stringify(f)}\n`;
  const ok = { status: 1, signal: null, error: null, stderr: stderr(falha) };
  assert(morteValida(ok, nome, def.clausula), 'metadriver recusou controle válido');
  const negativos = [
    { ...ok, error: new Error('spawn') }, { ...ok, signal: 'SIGTERM' },
    ...[0, 2, null].map((status) => ({ ...ok, status })),
    { ...ok, stderr: JSON.stringify(falha) },
    { ...ok, stderr: ok.stderr + `POST arena-runtime mutante=${nome} aplicado\n` },
    { ...ok, stderr: `POST arena-runtime mutante=${nome} aplicado\n` },
    { ...ok, stderr: stderr({ ...falha, erro: 'infra' }) },
    { ...ok, stderr: stderr({ ...falha, mutante: 'outro' }) },
    { ...ok, stderr: stderr({ ...falha, ferramenta: 'outra' }) },
    { ...ok, stderr: stderr({ ...falha, clausula: 'outra cláusula' }) },
    { ...ok, stderr: ok.stderr + 'TypeError: erro de preparação\n' },
  ];
  negativos.forEach((r, i) => assert(!morteValida(r, nome, def.clausula), `metadriver aceitou falso positivo ${i}`));
}

function driver() {
  const base = roda([]);
  if (base.error || base.signal || base.status !== 0) sai(2, { erro: 'driver', motivo: 'baseline deve sair 0 sem falha de processo', status: base.status });
  for (const [nome, def] of Object.entries(MUTANTES)) {
    const r = roda(['--mutante=' + nome]);
    if (!morteValida(r, nome, def.clausula)) sai(2, { erro: 'driver', mutante: nome, motivo: 'processo não provou a cláusula própria', status: r.status, stderr: (r.stderr || '').slice(-1500) });
    writeSync(1, `MUTANTE REPROVADO NA CLÁUSULA PRÓPRIA: ${nome} — ${def.clausula}\n`);
  }
  writeSync(1, `arena-runtime --mutantes OK: baseline 0 + ${Object.keys(MUTANTES).length} mutantes status 1 AssertionError\n`);
}

const evidencias = [];
function clausula(evidencia, predicado) {
  assert.ok(predicado(evidencia), evidencia.id + ' ' + JSON.stringify(evidencia));
  evidencias.push(evidencia);
}

async function prova(mutante) {
  mutanteAtual = mutante;
  if (mutante && (process.env.ARENA_RUNTIME_MUTANT !== mutante || !process.execArgv.includes(fileURLToPath(new URL('./arena-runtime-loader.mjs', import.meta.url))))) {
    throw new Error('setup: mutante exige o driver com loader confinado');
  }
  const harness = await import('./harness.mjs');
  const textures = harness.initTextures();
  const boot = ({ ctf = false, arena = false, seed, bots = 4 } = {}) => harness.bootGame('praca_poderes', { textures, ctf, arena, seed, bots });
  const visivel = (g) => !g.el.matchEnd.classList.contains('hidden');

  /* P1: fim online pelo snapshot REAL (rounds e CTF) */
  const { makeNetcode } = await import(new URL('../../public/js/netgame.js', import.meta.url).href);
  for (const ctf of [false, true]) {
    const g = boot({ ctf, seed: 735 });
    let eventos = 0;
    g.onMatchEnd = () => { eventos++; };
    g.online = true; g.state = 'live';
    const net = { yourEnt: 1, yourTeam: 'E', espectador: false, meta: { teamSize: 4, snapshotHz: 20, protocolVersion: 4 },
      snap: { state: 'live', tick: 1, t: 9, scoreE: 3, scoreB: 1, ents: [] }, startPing() {}, stopPing() {} };
    g.el.matchEnd.classList.add('hidden');   // o main real esconde ao (re)montar a tela; o _startRound não fecha o matchEnd
    clausula({ id: `P1 matchEnd oculto antes do fim (ctf=${ctf})`, visivel: visivel(g) }, (e) => e.visivel === false);
    const mp = makeNetcode(g, net); g._mp = mp; mp._netMap.set(999, g.bots[0]);
    mp.applySnapshot();
    net.snap = { ...net.snap, state: 'matchEnd', tick: 2, t: 10 };
    mp.applySnapshot();
    clausula({ id: `P1 snapshot matchEnd apresenta o resultado uma vez (ctf=${ctf})`, estado: g.state, eventos, visivel: visivel(g) },
      (e) => e.estado === 'matchEnd' && e.eventos === 1 && e.visivel === true);
    net.snap.tick = 3; mp.applySnapshot();
    g._endMatch();
    clausula({ id: `P1 duplicatas não repetem o fim (ctf=${ctf})`, eventos }, (e) => e.eventos === 1);
    g._startRound();
    g.el.matchEnd.classList.add('hidden');   // fechamento é do caller (main esconde no navegador), não do _startRound
    clausula({ id: `P1 matchEnd oculto antes da reapresentação (ctf=${ctf})`, visivel: visivel(g) }, (e) => e.visivel === false);
    g._endMatch();
    clausula({ id: `P1 _startRound rearma e outro fim legítimo emite de novo (ctf=${ctf})`, eventos, estado: g.state, visivel: visivel(g) },
      (e) => e.eventos === 2 && e.estado === 'matchEnd' && e.visivel === true);
    g.dispose();
  }

  /* P2: fila cruzada 1x1 — conversões pendentes para lados opostos, ambas ordens e lados */
  for (const [ladoPlayer, ladoBot] of [['E', 'B'], ['B', 'E']]) {
    for (const ordem of ['player', 'bot']) {
      const g = boot({ arena: true, seed: 7319 });
      const p = g.player, bot = g.bots[0];
      g.bots = [bot]; g.combatants = [p, bot];
      p.team = ladoPlayer; bot.team = ladoBot; g.state = 'live';
      let eventos = 0, ultimo = null;
      g.onMatchEnd = (d) => { eventos++; ultimo = d; };
      g.el.matchEnd.classList.add('hidden');   // DOM compartilhado entre fixtures: entra oculto como no navegador
      clausula({ id: `P2 matchEnd oculto antes do fim (${ladoPlayer}${ladoBot}/${ordem})`, visivel: visivel(g) }, (e) => e.visivel === false);
      g._kill(p, bot, 'FRAG');
      g._kill(bot, p, 'FRAG');
      clausula({ id: `P2 fila cruzada 1x1 pendente nos dois lados (${ladoPlayer}${ladoBot}/${ordem})`, pendentePlayer: p._switchTeam, pendenteBot: bot._switchTeam, estado: g.state, eventos },
        (e) => e.pendentePlayer === ladoBot && e.pendenteBot === ladoPlayer && e.estado === 'live' && e.eventos === 0);
      if (ordem === 'player') g._respawnPlayer(); else g._respawnEntity(bot);
      clausula({ id: `P2 respawn com fila cruzada pendente mantém a partida viva (${ladoPlayer}${ladoBot}/${ordem})`, estado: g.state, eventos, visivel: visivel(g) },
        (e) => e.estado === 'live' && e.eventos === 0 && e.visivel === false);
      if (ordem === 'player') g._respawnEntity(bot); else g._respawnPlayer();
      clausula({ id: `P2 fila esvaziada mantém os dois lados vivos (${ladoPlayer}${ladoBot}/${ordem})`, pendentePlayer: p._switchTeam, pendenteBot: bot._switchTeam, timePlayer: p.team, timeBot: bot.team, estado: g.state, eventos },
        (e) => e.pendentePlayer === null && e.pendenteBot === null && e.timePlayer === ladoBot && e.timeBot === ladoPlayer && e.estado === 'live' && e.eventos === 0);
      g.state = 'live';
      g.time += 1 / 60;
      g._kill(bot, p, 'FRAG');
      g._respawnEntity(bot);
      g._checkArenaWin();
      clausula({ id: `P2 última conversão encerra exatamente uma vez (${ladoPlayer}${ladoBot}/${ordem})`, venceu: ultimo?.won, timePlayer: ultimo?.team, esperado: p.team, eventos, estado: g.state, visivel: visivel(g) },
        (e) => e.venceu === true && e.timePlayer === e.esperado && e.eventos === 1 && e.estado === 'matchEnd' && e.visivel === true);
      g.dispose();
    }
  }
  metadriver();
  if (!mutante) writeSync(1, `arena-runtime-check OK: ${evidencias.length} cláusulas verdes + metadriver\n`);
}

const args = process.argv.slice(2);
try {
  metadriver();
  if (args.length === 1 && args[0] === '--selftest') {
    writeSync(1, 'arena-runtime metadriver OK\n');
  } else if (args.includes('--mutantes')) {
    if (args.length !== 1) sai(2, { erro: 'cli', motivo: '--mutantes não aceita outros argumentos', args });
    driver();
  } else if (args.length === 0) {
    await prova(null);
  } else if (args.length === 1 && args[0].startsWith('--mutante=')) {
    const nome = args[0].slice('--mutante='.length);
    if (!Object.hasOwn(MUTANTES, nome)) sai(2, { erro: 'cli', motivo: 'argumento não permitido', args });
    await prova(nome);
  } else {
    sai(2, { erro: 'cli', motivo: 'argumento não permitido', args });
  }
  process.exit(0);
} catch (e) {
  if (e instanceof assert.AssertionError) sai(1, { erro: 'AssertionError', mutante: mutanteAtual, clausula: e.message });
  sai(2, { erro: 'infra', mutante: mutanteAtual, mensagem: e && e.message });
}
