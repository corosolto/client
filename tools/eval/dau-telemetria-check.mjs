/* ============================================================================
   dau-telemetria-check.mjs — QUEM JOGOU ENTRA NA CONTA, UMA VEZ SÓ (backend#22)
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O painel mostrava 1.1K `game_start` (Vercel Analytics) para 215 `match_end`,
   e o banco não tinha início nenhum. Pior: sair do multiplayer (`mpSair`,
   `mpDesconectou`) nunca chamava `sendTelemetry`, então quem só jogou online
   não entrava em player_daily — o DAU do multiplayer era zero por construção.
   E mp_session gravava o SHA do cliente vendorizado no nó (alpha.250), não o
   build que o navegador rodava.

   O QUE COBRA
     DT1 saídas do MP mandam a telemetria ANTES de limpar o contexto da partida
     DT2 a mesma partida não conta duas vezes: sair do MP + fechar a aba + fim
         normal = 1 envio (simulado com a função real extraída do main.js)
     DT3 o envio leva event/gameType/matchEventId e mapa/modo do JOGO (no MP o
         currentMap já é o do mapa seguinte quando a partida vira)
     DT4 `game_started` sai no início, com o contexto da partida nova, e NÃO sai
         quando só se troca de vaga na mesma partida online
     DT5 _startGame fecha a partida anterior com o contexto DELA
     DT6 o join do MP leva o SHA do build do navegador (`csha`), e só se for hex

   Mutantes: --mutante=mp-sem-telemetria | sem-trava | sem-inicio | inicio-na-troca
             | contexto-novo | csha-livre
   ============================================================================ */
import { readFileSync } from 'node:fs';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['mp-sem-telemetria', 'sem-trava', 'sem-inicio', 'inicio-na-troca', 'contexto-novo', 'csha-livre'];
if (mut && !MUTANTES.includes(mut)) throw new Error(`mutante desconhecido: ${mut}`);
const muta = (fonte, de, para) => {
  const novo = fonte.replace(de, para);
  if (novo === fonte) throw new Error(`MUTANTE NAO APLICOU: ${mut}`);
  return novo;
};

let main = readFileSync('public/js/main.js', 'utf8');
let net = readFileSync('public/js/net.js', 'utf8');
const astro = readFileSync('src/pages/index.astro', 'utf8');
if (mut === 'mp-sem-telemetria') main = muta(main, "function mpSair() {\n  try { if (game) { sendTelemetry(); sendMatchEvent('quit'); } }", "function mpSair() {\n  try { if (game) { sendMatchEvent('quit'); } }");
if (mut === 'sem-trava') main = muta(main, '  telemetrySent = true;   // uma partida', '  // uma partida');
if (mut === 'sem-inicio') main = muta(main, '  if (!continuaPartida) sendGameStarted();\n', '');
if (mut === 'inicio-na-troca') main = muta(main, '  if (!continuaPartida) sendGameStarted();', '  sendGameStarted();');
if (mut === 'contexto-novo') main = muta(main, '  if (!continuaPartida) sendTelemetry();   // revanche', '  // revanche');
if (mut === 'csha-livre') net = muta(net, '...(/^[a-f0-9]{7,40}$/.test(csha) ? { csha } : {})', '...(csha ? { csha } : {})');

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };

function corpo(fonte, assinatura) {
  const i = fonte.indexOf(assinatura);
  if (i < 0) return null;
  let d = 0;
  for (let j = fonte.indexOf('{', i + assinatura.length - 1); j < fonte.length; j++) {
    if (fonte[j] === '{') d++;
    else if (fonte[j] === '}' && --d === 0) return fonte.slice(i, j + 1);
  }
  return null;
}

// DT1
for (const nome of ['mpSair', 'mpDesconectou']) {
  const f = corpo(main, `function ${nome}() {`);
  if (!f) { cobra(false, `DT1 ${nome}() não encontrada em main.js — a régua não sabe medir`); continue; }
  const envia = f.indexOf('sendTelemetry()');
  const limpa = f.indexOf('clearTelemetryGameContext()');
  cobra(envia >= 0 && limpa > envia,
    `DT1 ${nome}() não chama sendTelemetry() antes de clearTelemetryGameContext() — quem só joga online some do player_daily`);
}

// DT2 + DT3: a função real, com o mundo mínimo em volta.
const fnEnvia = corpo(main, 'function sendTelemetry() {');
const fnInicio = corpo(main, 'function sendGameStarted() {');
if (!fnEnvia) cobra(false, 'DT2 sendTelemetry() não encontrada — a régua não sabe medir');
else {
  const mundo = new Function('mundo', `
    let { testMode, game, telemetrySent, currentMap, matchMode, registeredNick, telemetryGameContext, _matchEventId } = mundo;
    const getAnonId = () => '11111111-1111-4111-8111-111111111111';
    const sendJsonKeepalive = (rota, payload) => mundo.envios.push({ rota, payload });
    ${fnEnvia}
    ${fnInicio || 'function sendGameStarted() {}'}
    return { sendTelemetry, sendGameStarted, novaPartida() { telemetrySent = false; } };
  `);
  const m = {
    testMode: false, telemetrySent: true, currentMap: 'mapa_seguinte', matchMode: 'rounds', registeredNick: '',
    game: { _mapId: 'ferro_velho', ctf: true, time: 312.4, roundsWon: { E: 2, B: 1 } },
    telemetryGameContext: { gameType: 'multiplayer', roomId: 'funk-x-palhaco' },
    _matchEventId: '22222222-2222-4222-8222-222222222222', envios: [],
  };
  const api = mundo(m);
  api.novaPartida();
  api.sendTelemetry();   // mpSair
  api.sendTelemetry();   // beforeunload logo depois
  api.sendTelemetry();   // fim normal que chegou atrasado
  const fins = m.envios.filter((e) => e.payload?.event !== 'game_started');
  cobra(fins.length === 1, `DT2 a mesma partida mandou ${fins.length} linhas de telemetria (sair do MP + fechar a aba) — player_daily contaria em dobro`);
  const p = fins[0]?.payload || {};
  cobra(p.event === 'match_end' && p.gameType === 'multiplayer' && p.matchEventId === m._matchEventId,
    `DT3 telemetria sem event/gameType/matchEventId (${JSON.stringify({ event: p.event, gameType: p.gameType, matchEventId: p.matchEventId })})`);
  cobra(p.map === 'ferro_velho' && p.mode === 'ctf',
    `DT3 telemetria com mapa/modo da variável global (${p.map}/${p.mode}) — no MP a partida que acabou seria contada no mapa seguinte`);
  if (fnInicio) {
    m.envios.length = 0;
    api.sendGameStarted();
    const s = m.envios[0]?.payload || {};
    cobra(m.envios.length === 1 && s.event === 'game_started' && s.gameType === 'multiplayer' && s.matchEventId === m._matchEventId,
      `DT4 game_started sem o contexto da partida (${JSON.stringify(s)})`);
  }
}

// DT4 + DT5: ordem dentro do _startGame.
const start = corpo(main, 'async function _startGame(');
if (!start) cobra(false, 'DT4 _startGame não encontrada — a régua não sabe medir');
else {
  const iFlush = start.indexOf('if (!continuaPartida) sendTelemetry();');
  const iContexto = start.indexOf('telemetryGameContext = online ?');
  const iJogo = start.indexOf('game = new Game(');
  const iInicio = start.indexOf('if (!continuaPartida) sendGameStarted();');
  cobra(iFlush >= 0 && iContexto > iFlush,
    'DT5 _startGame não fecha a partida anterior antes de trocar o contexto — revanche e mapa girando no MP perdem a partida (ou a mandam com o contexto da nova)');
  cobra(iInicio > iJogo && iJogo > 0, 'DT4 _startGame não manda game_started depois de o jogo existir — o banco continua sem início de partida');
  cobra(/const continuaPartida = online && telemetryGameContext\.gameType === 'multiplayer'/.test(start),
    'DT4 sem a guarda de troca de vaga: entrar no time depois de assistir contaria dois inícios para a mesma partida');
  cobra(!/\n\s*sendGameStarted\(\);/.test(start), 'DT4 game_started sai também na troca de vaga da mesma partida online');
}

// DT6
{
  globalThis.performance ??= { now: () => 0 };
  const { NetClient } = await import(`data:text/javascript;base64,${Buffer.from(net.replace(/from '\.\/([^']+)'/g, (_m, f) => `from '${new URL(`../../public/js/${f}`, import.meta.url).href}'`)).toString('base64')}`);
  const bom = new NetClient('wss://no.invalid/ws', { room: 'r', csha: 'abcdef1234567' }).url;
  const ruim = new NetClient('wss://no.invalid/ws', { room: 'r', csha: 'x&team=B' }).url;
  cobra(new URL(bom).searchParams.get('csha') === 'abcdef1234567', `DT6 NetClient não manda csha no join (${bom})`);
  cobra(!new URL(ruim).searchParams.has('csha') && new URL(ruim).searchParams.getAll('team').length === 1,
    `DT6 NetClient aceita csha que não é hex (${ruim})`);
  cobra(/csha: String\(window\.__CS_BUILD\?\.sha \|\| ''\)/.test(main), 'DT6 main.js não passa o build do navegador ao NetClient');
  cobra(/import\.meta\.env\.VERCEL_GIT_COMMIT_SHA/.test(astro) && /window\.__CS_BUILD = \{ sha: GIT_SHA \}/.test(astro),
    'DT6 index.astro não publica o commit do deploy em window.__CS_BUILD');
}

if (falhas.length) {
  console.error('✗ DT a conta de quem jogou não fecha:');
  for (const f of falhas) console.error(`    ${f}`);
  process.exit(1);
}
console.log('✓ DT saída do MP conta, uma vez só; início de partida no banco; build do navegador no join');
