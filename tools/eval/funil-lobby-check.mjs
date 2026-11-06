/* L1–L12 — marcos de boot e permanência no lobby no funil (migration 084).
 * O que cobra, com relógio e visibilidade falsos (nada de navegador):
 *   · o tempo de lobby só anda com a aba VISÍVEL (document.hidden congela o relógio);
 *   · quem entra em partida para de ser "parado no lobby";
 *   · a saída sai uma vez só, por pagehide/visibilitychange (o beforeunload não conta);
 *   · assets_ready é o caminho dos assets e o failsafe de 20 s solta só splash_ready;
 *   · sem consentimento NADA vai para a rede, e ao consentir os marcos guardados saem;
 *   · teto de volume: no pior caso a sessão manda 6 eventos novos.
 * Uso: node tools/eval/funil-lobby-check.mjs            régua + todos os mutantes
 *      node tools/eval/funil-lobby-check.mjs --mutante=<nome>
 *      node tools/eval/funil-lobby-check.mjs --fonte=<arquivo>   (mede outro main.js) */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const mut = arg('mutante');
const fonte = arg('fonte') || new URL('../../public/js/main.js', import.meta.url);
let main = readFileSync(fonte, 'utf8');

const MUTANTES = {
  'sem-guarda-hidden': ['if (!_noLobby || document.hidden) return;   // relógio parado; volta no visibilitychange', 'if (!_noLobby) return;'],
  'lobby-sem-saida': ["  if (_noLobby) marcoFunil('lobby_exit');", ''],
  'marco-duplicado': ['    _marcosEnviados.add(step);\n', ''],
  'splash-sem-marco': [/(const entrarNoLobby = \(\) => \{[\s\S]*?)marcoFunil\('splash_enter'\);/, '$1'],
  'splash-sem-relogio': [/(const entrarNoLobby = \(\) => \{[\s\S]*?)_lobbyEntrou\(\);/, '$1'],
  'relogio-nao-pausa': ['if (_lobbyDesde !== null) { _lobbyMs += performance.now() - _lobbyDesde; _lobbyDesde = null; }', 'if (_lobbyDesde !== null) { _lobbyMs += performance.now() - _lobbyDesde; }'],
  'partida-sem-aviso': ["  _lobbySaiuPraPartida();    // funil (084): quem entrou em partida não é mais \"parado no lobby\"\n", ''],
  'partida-nao-para': ['function _lobbySaiuPraPartida() { _noLobby = false; _lobbyDesde = null; clearTimeout(_lobbyTimer); _lobbyTimer = 0; }', 'function _lobbySaiuPraPartida() {}'],
  'failsafe-mente': ["if (!_splashPorFailsafe) marcoFunil('assets_ready');", "marcoFunil('assets_ready');"],
  'marco-sem-consentimento': ['if (!_funilPronto || !analyticsAllowed()) return;', 'if (!_funilPronto) return;'],
};
const NOMES = Object.keys(MUTANTES);
if (mut) {
  const par = MUTANTES[mut];
  if (!par) { console.error(`mutante desconhecido: ${mut}`); process.exit(2); }
  const depois = main.replace(par[0], par[1]);
  if (depois === main) { console.error(`mutação ${mut} não aplicou`); process.exit(2); }
  main = depois;
}

const regiao = (ini, fim) => {
  const a = main.indexOf(ini), b = main.indexOf(fim, a);
  if (a < 0 || b < 0) { console.error(`funil lobby: marcador sumiu de main.js (${ini.slice(0, 32)}…) — a régua não sabe medir`); process.exit(1); }
  return main.slice(a, b);
};
/* Âncora no CÓDIGO, não no comentário: o teto de 2 linhas do CM1 reescreve comentário. */
const codigo = regiao('const _marcos = new Set();', '\n// fase de boot: props')
  + regiao('let _splashPorFailsafe = false;', "\nif (document.documentElement.dataset.ui === 'v3')")
  + regiao('function _clientSessionContext()', '// PERF (018)')
  + regiao('/* Telemetria nova (feat/telemetria)', '\nasync function startGame(');

/* Cláusula de FIAÇÃO: o marco não serve de nada se ninguém o chama no lugar certo. */
const fiacaoSplash = /function dismissSplash\(e\)[\s\S]*?marcoFunil\('splash_enter'\);[\s\S]*?_lobbyEntrou\(\);/.test(main);
const fiacaoPartida = /_funnel\('match_start'[^\n]*\);[\s\S]{0,120}?_lobbySaiuPraPartida\(\);/.test(main);

function relogioFalso() {
  let agora = 0, seq = 0;
  const tarefas = new Map();
  const correr = (ate) => {
    for (;;) {
      let chave = null, proxima = null;
      for (const [k, t] of tarefas) if (t.quando <= ate && (!proxima || t.quando < proxima.quando)) { chave = k; proxima = t; }
      if (!proxima) break;
      tarefas.delete(chave);
      agora = proxima.quando;
      proxima.fn();
    }
    agora = ate;
  };
  return {
    now: () => agora,
    setTimeout: (fn, ms) => { const k = ++seq; tarefas.set(k, { quando: agora + Math.max(0, ms || 0), fn }); return k; },
    clearTimeout: (k) => { tarefas.delete(k); },
    avanca: (ms) => correr(agora + ms),
  };
}

function mundo({ consentido = true } = {}) {
  const enviados = [], ouvintes = {}, ouvintesDoc = {};
  const rel = relogioFalso();
  let ok = consentido;
  const ctx = {
    testMode: false,
    performance: { now: rel.now },
    setTimeout: rel.setTimeout, clearTimeout: rel.clearTimeout,
    setInterval: () => 0, clearInterval: () => {},
    document: {
      hidden: false, referrer: '', getElementById: () => null,
      addEventListener: (t, fn) => { (ouvintesDoc[t] ||= new Set()).add(fn); },
    },
    addEventListener: (t, fn) => { (ouvintes[t] ||= new Set()).add(fn); },
    removeEventListener: (t, fn) => ouvintes[t]?.delete(fn),
    analyticsAllowed: () => ok,
    sendJsonKeepalive: (rota, corpo) => { enviados.push({ rota, corpo }); return true; },
    fetch: async () => ({ ok: true, json: async () => ({ ok: true, stored: true }) }),
    localStorage: { getItem: () => '1', setItem: () => {}, removeItem: () => {} },
    getAnonId: () => '00000000-0000-4000-8000-000000000001',
    getSessionId: () => '00000000-0000-4000-8000-000000000002',
    apiUrl: (p) => `https://api.mock${p}`,
    _sendPerf: () => {},
    location: { pathname: '/', search: '' },
    URL, URLSearchParams,
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile', platform: 'Linux armv8l', maxTouchPoints: 5 },
    TOUCH: true, screen: { width: 390, height: 844 }, innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
    renderer: { getPixelRatio: () => 1 }, VERSION: 'test', versaoComOrigem: (v) => v,
    sinaisDeBuild: () => ({}), telemetryGameContext: {}, window: {},
    // Pedaços do boot que a região da splash encosta e que não são o objeto da medição.
    _splashReady: false, _bootPhase: { set: () => {} }, _lstat: {}, tr: (s) => s,
  };
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx);
  const emite = (t) => [...(ouvintes[t] || [])].forEach((fn) => fn({ type: t }));
  return {
    enviados, ctx, rel,
    passos: () => enviados.filter((e) => e.rota === '/api/funnel').map((e) => e.corpo.step),
    entraNoLobby() { ctx.marcoFunil('splash_enter'); ctx._lobbyEntrou(); },
    esconde() { ctx.document.hidden = true; [...(ouvintesDoc.visibilitychange || [])].forEach((fn) => fn({ type: 'visibilitychange' })); },
    mostra() { ctx.document.hidden = false; [...(ouvintesDoc.visibilitychange || [])].forEach((fn) => fn({ type: 'visibilitychange' })); },
    fecha() { emite('pagehide'); },
    consente(v) { ok = v; emite('cs-privacy-change'); },
  };
}

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const conta = (m, step) => m.passos().filter((s) => s === step).length;

{ // L1: 30 s de aba visível no lobby viram lobby_30s
  const m = mundo();
  m.entraNoLobby();
  m.rel.avanca(29_000);
  cobra(conta(m, 'lobby_30s') === 0, 'L1 lobby_30s saiu antes dos 30 s');
  m.rel.avanca(2_000);
  cobra(conta(m, 'lobby_30s') === 1, `L1 30 s de lobby visível não viraram lobby_30s (saiu ${JSON.stringify(m.passos())})`);
  cobra(conta(m, 'lobby_120s') === 0, 'L1 lobby_120s saiu junto com o de 30 s');
}
{ // L2: aba escondida NÃO conta tempo de lobby
  const m = mundo();
  m.entraNoLobby();
  m.esconde();
  m.rel.avanca(600_000);
  cobra(conta(m, 'lobby_30s') === 0 && conta(m, 'lobby_120s') === 0,
    `L2 aba em segundo plano virou permanência (${JSON.stringify(m.passos())}) — o marco mediria "deixou a aba aberta"`);
  const j = mundo();   // já entra no lobby com a aba escondida (saída programática da splash)
  j.esconde();
  j.entraNoLobby();
  j.rel.avanca(600_000);
  cobra(conta(j, 'lobby_30s') === 0 && conta(j, 'lobby_120s') === 0,
    `L2 lobby aberto com a aba já escondida contou tempo (${JSON.stringify(j.passos())})`);
  j.mostra();
  j.rel.avanca(31_000);
  cobra(conta(j, 'lobby_30s') === 1, `L2 o relógio não começou quando a aba voltou (${JSON.stringify(j.passos())})`);
}
{ // L3: o relógio soma só os trechos visíveis
  const m = mundo();
  m.entraNoLobby();
  m.rel.avanca(20_000);
  m.esconde(); m.rel.avanca(300_000); m.mostra();
  cobra(conta(m, 'lobby_30s') === 0, 'L3 os 300 s escondido contaram como lobby');
  m.rel.avanca(9_000);
  cobra(conta(m, 'lobby_30s') === 0, 'L3 lobby_30s saiu com 29 s visíveis');
  m.rel.avanca(2_000);
  cobra(conta(m, 'lobby_30s') === 1, `L3 20 s + 11 s visíveis não fecharam os 30 s (${JSON.stringify(m.passos())})`);
}
{ // L4: o segundo marco é 120 s visíveis, e cada um sai uma vez só
  const m = mundo();
  m.entraNoLobby();
  m.rel.avanca(119_000);
  cobra(conta(m, 'lobby_120s') === 0, 'L4 lobby_120s saiu antes dos 120 s');
  m.rel.avanca(2_000);
  cobra(conta(m, 'lobby_120s') === 1, `L4 120 s visíveis não viraram lobby_120s (${JSON.stringify(m.passos())})`);
  m.rel.avanca(600_000);
  cobra(conta(m, 'lobby_30s') === 1 && conta(m, 'lobby_120s') === 1, 'L4 os marcos de lobby repetiram');
}
{ // L5: quem entra em partida não é mais "parado no lobby"
  const m = mundo();
  m.entraNoLobby();
  m.rel.avanca(31_000);
  m.ctx._lobbySaiuPraPartida();
  m.rel.avanca(600_000);
  cobra(conta(m, 'lobby_120s') === 0, `L5 o relógio do lobby continuou correndo dentro da partida (${JSON.stringify(m.passos())})`);
}
{ // L6: saída confiável, uma vez só
  const m = mundo();
  m.entraNoLobby();
  m.rel.avanca(5_000);
  m.esconde();
  cobra(conta(m, 'lobby_exit') === 1, `L6 esconder a aba no lobby não virou lobby_exit (${JSON.stringify(m.passos())})`);
  m.mostra(); m.rel.avanca(1_000); m.esconde(); m.fecha();
  cobra(conta(m, 'lobby_exit') === 1, `L6 lobby_exit repetiu (${conta(m, 'lobby_exit')} vezes) — um evento por sessão`);
}
{ // L7: quem nunca passou da splash não gera saída de lobby
  const m = mundo();
  m.rel.avanca(5_000);
  m.esconde(); m.fecha();
  cobra(conta(m, 'lobby_exit') === 0, 'L7 lobby_exit saiu sem o jogador ter entrado no lobby');
}
{ // L8: consentimento manda — nada antes, tudo guardado até ele chegar
  const m = mundo({ consentido: false });
  m.entraNoLobby();
  m.rel.avanca(130_000);
  m.esconde();
  cobra(m.enviados.length === 0, `L8 ${m.enviados.length} envio(s) SEM consentimento (${JSON.stringify(m.passos())})`);
  m.consente(true);
  const p = m.passos();
  cobra(p.includes('splash_enter') && p.includes('lobby_30s') && p.includes('lobby_120s') && p.includes('lobby_exit'),
    `L8 ao consentir, os marcos já atingidos têm de sair (saiu ${JSON.stringify(p)})`);
  cobra(p.filter((s) => s === 'splash_enter').length === 1, 'L8 marco duplicado depois de consentir');
}
{ // L9: assets_ready é o caminho dos assets; o failsafe solta só o botão
  const m = mundo();
  m.ctx._splashSetReady();
  const p = m.passos();
  cobra(p.includes('assets_ready') && p.includes('splash_ready'), `L9 splash pelos assets tem de marcar os dois (${JSON.stringify(p)})`);

  const f = mundo();
  f.rel.avanca(20_000);   // só o failsafe de 20 s
  cobra(f.passos().includes('splash_ready') && !f.passos().includes('assets_ready'),
    `L9 o failsafe de 20 s não pode fingir que os assets ficaram prontos (${JSON.stringify(f.passos())})`);
  f.ctx._splashSetReady();   // os assets chegam depois do failsafe
  cobra(f.passos().includes('assets_ready'), 'L9 assets que chegam DEPOIS do failsafe continuam sem marco');
  cobra(f.passos().filter((s) => s === 'splash_ready').length === 1, 'L9 splash_ready repetiu');
}
{ // L10: teto de volume — no pior caso, 6 eventos novos por sessão
  const m = mundo();
  m.ctx._splashSetReady();
  m.entraNoLobby();
  m.rel.avanca(600_000);
  m.esconde(); m.mostra(); m.rel.avanca(600_000); m.esconde(); m.fecha();
  const novos = m.passos().filter((s) => !['land', 'menu', 'match_start', 'match_end', 'quit'].includes(s));
  cobra(novos.length <= 6, `L10 a sessão mandou ${novos.length} eventos novos (teto 6): ${JSON.stringify(novos)}`);
  cobra(new Set(novos).size === novos.length, `L10 evento novo repetido na mesma sessão: ${JSON.stringify(novos)}`);
}
cobra(fiacaoSplash, 'L11 dismissSplash não marca splash_enter nem liga o relógio do lobby — o marco existe e ninguém chama');
cobra(fiacaoPartida, 'L12 o match_start do funil não avisa o relógio do lobby (_lobbySaiuPraPartida)');

if (mut) {
  console.log(falhas.length ? `mutante "${mut}" DETECTADO` : `mutante "${mut}" NÃO detectado`);
  process.exit(falhas.length ? 0 : 1);
}
if (falhas.length) {
  console.error('funil lobby REPROVADO:');
  for (const f of falhas) console.error(`  · ${f}`);
  process.exit(1);
}
let vivos = 0;
const linhas = [];
for (const nome of NOMES) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${nome}`, ...(arg('fonte') ? [`--fonte=${arg('fonte')}`] : [])], { encoding: 'utf8' });
  if (r.status !== 0) vivos++;
  linhas.push(`  ${r.status === 0 ? 'morto' : 'VIVO '} ${nome}`);
}
console.log(`funil lobby: L1–L12 verde (relógio só com aba visível, saída única, failsafe honesto, teto de 6 eventos)`);
console.log(linhas.join('\n'));
console.log(`${vivos ? 'REPROVADO' : 'APROVADO'}: ${NOMES.length - vivos}/${NOMES.length} mutantes mortos`);
process.exit(vivos ? 1 : 0);
