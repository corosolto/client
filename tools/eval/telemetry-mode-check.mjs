#!/usr/bin/env node
// Régua R120: modo real emitido pelos 3 emissores de telemetria (arena > ctf > rounds).
// Executa os corpos REAIS extraídos de main.js em VM fresca por caso; nunca espelha o algoritmo.
// Saída: 0 = tudo verde; 1 = vermelho semântico medido; 2 = infra (parse/extração/mutação/throw).
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const options = new Map();
let argumentError = null;
for (let i = 0; i < args.length; i++) {
  const equal = args[i].indexOf('=');
  const key = equal < 0 ? args[i] : args[i].slice(0, equal);
  if (!['--source', '--mutante'].includes(key)) {
    argumentError = `argumento desconhecido: ${args[i]}`;
    break;
  }
  if (options.has(key)) {
    argumentError = `argumento duplicado: ${key}`;
    break;
  }
  const value = equal < 0 ? args[++i] : args[i].slice(equal + 1);
  if (typeof value !== 'string' || !value.length || value.startsWith('--')) {
    argumentError = `valor obrigatório para ${key}`;
    break;
  }
  options.set(key, value);
}
const mutante = options.get('--mutante') ?? null;
const sourcePath =
  options.get('--source') ?? new URL('../../public/js/main.js', import.meta.url).pathname;

const INFRA = (receipt, msg) => {
  receipt.infra = msg;
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(2);
};

const receipt = {
  check: 'telemetry-mode-check R120',
  source: sourcePath,
  sourceSha256: null,
  mutante,
  mutationsApplied: {},
  cases: 0,
  mismatches: [],
  modeActuals: {},
};
if (argumentError) INFRA(receipt, argumentError);

// --- extração por casamento de chaves (corpos não contêm '{' em strings) ---
function extractFn(src, name) {
  const idx = src.indexOf(`function ${name}(`);
  if (idx === -1) return null;
  const open = src.indexOf('{', idx);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(idx, i + 1);
    }
  }
  return null; // malformado
}
function bodyOf(fnText) {
  const open = fnText.indexOf('{');
  return fnText.slice(open + 1, fnText.lastIndexOf('}'));
}

function replaceOnce(text, from, to, label, counts) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`mutação ${label}: esperava 1 ocorrência, achei ${n}`);
  counts[label] = (counts[label] || 0) + 1;
  return text.replace(from, to);
}

let source;
try {
  source = fs.readFileSync(sourcePath, 'utf8');
} catch (e) {
  INFRA(receipt, `fonte ilegível: ${e.message}`);
}
receipt.sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');

// --- mutações em memória (contagem exata aplicada) ---
const counts = receipt.mutationsApplied;
try {
  if (mutante === 'legado') {
    for (const [fn, novo] of [
      ['sendTelemetry', "g.ctf ? 'ctf' : 'rounds'"],
      ['sendMatchEvent', "matchMode === 'ctf' ? 'ctf' : 'rounds'"],
    ]) {
      let fnText = extractFn(source, fn);
      if (!fnText) throw new Error(`mutação legado: ${fn} não extraída`);
      const novoBody = replaceOnce(bodyOf(fnText), 'modoTelemetria(g)', novo, `legado:${fn}`, counts);
      source = source.replace(fnText, fnText.slice(0, fnText.indexOf('{')) + '{' + novoBody + '}');
    }
    let gs = extractFn(source, 'sendGameStarted');
    if (!gs) throw new Error('mutação legado: sendGameStarted não extraída');
    const gsBody = replaceOnce(bodyOf(gs), 'modoTelemetria(game)', "game.ctf ? 'ctf' : 'rounds'", 'legado:sendGameStarted', counts);
    source = source.replace(gs, gs.slice(0, gs.indexOf('{')) + '{' + gsBody + '}');
  } else if (mutante === 'game-started-legado') {
    const gs = extractFn(source, 'sendGameStarted');
    if (!gs) throw new Error('mutação game-started-legado: sendGameStarted não extraída');
    const gsBody = replaceOnce(bodyOf(gs), 'modoTelemetria(game)', "game.ctf ? 'ctf' : 'rounds'", 'game-started-legado', counts);
    source = source.replace(gs, gs.slice(0, gs.indexOf('{')) + '{' + gsBody + '}');
  } else if (mutante === 'ctf-primeiro') {
    const h = extractFn(source, 'modoTelemetria');
    if (!h) throw new Error('mutação ctf-primeiro: helper ausente');
    const hBody = replaceOnce(bodyOf(h), "if (g?.arena) return 'arena';", "if (g?.ctf) return 'ctf';\n  if (g?.arena) return 'arena';", 'ctf-primeiro', counts);
    source = source.replace(h, h.slice(0, h.indexOf('{')) + '{' + hBody + '}');
  } else if (mutante === 'sem-consentimento') {
    for (const fn of ['sendTelemetry', 'sendGameStarted', 'sendMatchEvent']) {
      const f = extractFn(source, fn);
      if (!f) throw new Error(`mutação sem-consentimento: ${fn} não extraída`);
      const b = replaceOnce(bodyOf(f), 'if (!analyticsAllowed()) return;', '', `sem-consentimento:${fn}`, counts);
      source = source.replace(f, f.slice(0, f.indexOf('{')) + '{' + b + '}');
    }
  } else if (mutante !== null) {
    INFRA(receipt, `mutante desconhecido: ${mutante}`);
  }
} catch (e) {
  INFRA(receipt, `mutação não aplicada: ${e.message}`);
}

// --- extração final dos artefatos reais ---
const EMITTERS = {
  sendTelemetry: { sig: '', route: '/api/telemetry', event: 'match_end' },
  sendGameStarted: { sig: '', route: '/api/telemetry', event: 'game_started' },
  sendMatchEvent: { sig: 'result', route: '/api/match', event: null },
};
const helperText = extractFn(source, 'modoTelemetria');
const bodies = {};
for (const fn of Object.keys(EMITTERS)) {
  const f = extractFn(source, fn);
  if (!f) INFRA(receipt, `função real não extraída: ${fn}`);
  const b = bodyOf(f);
  if (b.includes('modoTelemetria(') && !helperText)
    INFRA(receipt, `${fn} chama modoTelemetria mas helper ausente`);
  bodies[fn] = b;
}
if (!helperText && mutante === 'ctf-primeiro') INFRA(receipt, 'helper ausente pós-mutação');

// --- execução em VM fresca por caso, com transporte capturado ---
const MODE_ROWS = [
  { id: 'rounds', arena: false, ctf: false, menuMode: 'rounds', expected: 'rounds' },
  { id: 'ctf', arena: false, ctf: true, menuMode: 'ctf', expected: 'ctf' },
  { id: 'arena', arena: true, ctf: false, menuMode: 'rounds', expected: 'arena' },
  { id: 'arena-over-ctf', arena: true, ctf: true, menuMode: 'ctf', expected: 'arena' },
];
const GUARDS = [
  { id: 'consentfalse', allow: false, testMode: false, game: true },
  { id: 'testMode', allow: true, testMode: true, game: true },
  { id: 'gameabsent', allow: true, testMode: false, game: false },
];

function makeGame(row) {
  return {
    arena: row?.arena, ctf: row?.ctf,
    player: { kills: 5, deaths: 2, headshots: 1 },
    mk: { best: 3 }, bots: [{}, {}], _wperf: { AWP: 3, AK: 1 },
    roundsWon: { E: 1, B: 2 }, time: 120, _mapId: 'cs_arena',
    playerTeam: 'E', playerFaction: 'sp',
    _flushTraining: () => {},
  };
}

function runEmitter(fnName, calls, opts) {
  const ctx = {
    getAnonId: () => 'anon', getSessionId: () => 'sess',
    versaoComOrigem: (v) => `v${v}`, VERSION: '1.2.3',
    telemetryGameContext: { gameType: 'fps' }, sinaisDeBuild: () => ({}),
    currentMap: 'cs_arena', currentChar: 'ze', currentFaction: 'sp',
    registeredNick: 'nick', _matchEventId: 'ev1',
    telemetrySent: false, _matchEventSent: false,
    testMode: opts.testMode ?? false,
    analyticsAllowed: () => opts.allow ?? true,
    matchMode: opts.menuMode ?? 'rounds',
    game: opts.game ? makeGame(opts.row ?? null) : undefined,
    sendJsonKeepalive: (route, payload) => ctx.__captures.push({ route, payload: JSON.parse(JSON.stringify(payload)) }),
    __captures: [], Math, Object, JSON,
  };
  const sig = EMITTERS[fnName].sig;
  const src = '(function () {\n' + (helperText ? helperText + '\n' : '') +
    `return function ${fnName}(${sig}) {\n${bodies[fnName]}\n};\n})()`;
  const fn = vm.runInNewContext(src, ctx, { filename: `${fnName}.r120.js` });
  for (let i = 0; i < calls; i++) fn('win');
  return ctx.__captures;
}

function note(caseId, expected, actual, extra) {
  receipt.cases++;
  if (expected !== actual)
    receipt.mismatches.push({ caseId, expected, actual, ...extra });
}

try {
  for (const fnName of Object.keys(EMITTERS)) {
    const { route, event } = EMITTERS[fnName];
    for (const row of MODE_ROWS) {
      const caps = runEmitter(fnName, 1, { row, menuMode: row.menuMode, game: true });
      const mode = caps.length === 1 ? caps[0].payload.mode : undefined;
      receipt.modeActuals[`${fnName}:${row.id}`] = mode;
      note(`modo:${fnName}:${row.id}`, 1, caps.length, { kind: 'captures' });
      if (caps.length === 1) {
        note(`rota:${fnName}:${row.id}`, route, caps[0].route, { kind: 'route' });
        note(`evento:${fnName}:${row.id}`, event, caps[0].payload.event ?? null, { kind: 'event' });
        note(`mode:${fnName}:${row.id}`, row.expected, mode, { kind: 'mode' });
      }
    }
    for (const g of GUARDS) {
      const caps = runEmitter(fnName, 1, { allow: g.allow, testMode: g.testMode, game: g.game });
      note(`guard:${fnName}:${g.id}`, 0, caps.length, { kind: 'guard' });
    }
  }
  note('dedupe:sendTelemetry', 1, runEmitter('sendTelemetry', 2, { row: MODE_ROWS[0], game: true }).length, { kind: 'dedupe' });
  note('dedupe:sendMatchEvent', 1, runEmitter('sendMatchEvent', 2, { row: MODE_ROWS[0], game: true }).length, { kind: 'dedupe' });
  note('dedupe:sendGameStarted', 2, runEmitter('sendGameStarted', 2, { row: MODE_ROWS[0], game: true }).length, { kind: 'dedupe' });
} catch (e) {
  INFRA(receipt, `throw inesperado na execução: ${e.message}`);
}

console.log(JSON.stringify(receipt, null, 2));
if (receipt.mismatches.length > 0) process.exit(1);
if (mutante && mutante !== null) {
  // mutante sem vermelho medido = mutação inócua (infra da régua de mutação)
  if (Object.keys(receipt.mutationsApplied).length === 0 || receipt.mismatches.length === 0)
    process.exit(2);
}
process.exit(0);
