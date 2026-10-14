/* CT1–CT10 — contagem agregada SEM identificador (public/js/contagem.js → backend /api/count).
 *
 * Regra legal: sem consentimento, só contagem agregada e sem identificador. Esta régua roda o
 * contagem.js REAL (com os dois imports trocados por stubs) e cobra:
 *   · o corpo só leva event, version e os campos do evento (mesma allowlist do backend);
 *   · session_end leva FAIXAS de duração e de partidas, nunca o número exato;
 *   · nenhum id, cookie ou storage; fetch keepalive com credentials 'omit'; falha não repete;
 *   · o main.js chama a contagem fora dos gates de consentimento, e esses gates continuam lá.
 * Mutantes (cada um tem de ficar VERMELHO): --mutante=manda-id | duracao-exata |
 *   partidas-exatas | com-cookie | usa-storage | retenta | sem-gate-telemetria | sem-gate-funil
 * Uso: node tools/eval/contagem-check.mjs [--mutante=<nome>] */
import { readFileSync } from 'node:fs';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['manda-id', 'duracao-exata', 'partidas-exatas', 'com-cookie', 'usa-storage', 'retenta', 'sem-gate-telemetria', 'sem-gate-funil'];
if (mut && !MUTANTES.includes(mut)) { console.error(`mutante desconhecido: ${mut}`); process.exit(2); }

const ler = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
let fonte = ler('public/js/contagem.js');
let main = ler('public/js/main.js');
const index = ler('src/pages/index.astro');
const apibase = ler('public/js/apibase.js');
const troca = (alvo, velho, novo) => {
  const n = alvo.replace(velho, novo);
  if (n === alvo) { console.error(`MUTANTE ${mut} NAO APLICOU`); process.exit(2); }
  return n;
};
if (mut === 'manda-id') fonte = troca(fonte, 'enviar(JSON.stringify({ event, version: versao, ...campos }))', 'enviar(JSON.stringify({ event, version: versao, ...campos, sid: Math.random().toString(36).slice(2) }))');
if (mut === 'duracao-exata') fonte = troca(fonte, 'dur: faixaDuracao(agora())', 'dur: String(Math.round(agora() / 1000))');
if (mut === 'partidas-exatas') fonte = troca(fonte, 'matches: faixaPartidas(partidas)', 'matches: String(partidas)');
if (mut === 'com-cookie') fonte = troca(fonte, "keepalive: true, credentials: 'omit'", "keepalive: true, credentials: 'include'");
if (mut === 'usa-storage') fonte = troca(fonte, 'const enviarDeVerdade = (corpo) => {', "const enviarDeVerdade = (corpo) => {\n  try { sessionStorage.setItem('cs_conta', '1'); } catch {}");
if (mut === 'retenta') fonte = troca(fonte, '}).catch(() => {});\n};', '}).catch(() => setTimeout(() => enviarDeVerdade(corpo), 1000));\n};');
if (mut === 'sem-gate-telemetria') main = troca(main, 'function sendTelemetry() {\n  if (!analyticsAllowed()) return;', 'function sendTelemetry() {');
if (mut === 'sem-gate-funil') main = troca(main, 'function _funnel(step) {\n  if (!analyticsAllowed()) return;', 'function _funnel(step) {');

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };

/* Mesma allowlist do backend (api/_lib/count.mjs): campo fora daqui perde o evento lá. */
const CAMPOS = {
  page_view: [], game_loaded: [], splash_enter: [], boot_error: [],
  login_prompt_shown: [], login_prompt_dismissed: [], login_prompt_provider_click: [],
  match_start: ['map', 'mode', 'game'], match_end: ['map', 'mode', 'game'], mp_join: ['map', 'mode'],
  session_end: ['dur', 'matches'],
};
const ENUM = { mode: ['rounds', 'ctf'], game: ['sp', 'mp'], dur: ['lt1', '1-5', '5-15', '15-60', 'gt60'], matches: ['0', '1', '2-3', '4+'] };
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const corpoLimpo = (txt) => {
  let c;
  try { c = JSON.parse(txt); } catch { return `não é JSON: ${txt}`; }
  const permitidos = CAMPOS[c.event];
  if (!permitidos) return `evento fora da lista: ${c.event}`;
  for (const [k, v] of Object.entries(c)) {
    if (k !== 'event' && k !== 'version' && !permitidos.includes(k)) return `campo ${k} fora da allowlist de ${c.event}`;
    if (typeof v !== 'string') return `campo ${k} não é texto (${typeof v}): número exato não sai`;
    if (UUID_RE.test(v)) return `campo ${k} parece id`;
    if (ENUM[k] && !ENUM[k].includes(v)) return `campo ${k}=${v} fora das faixas`;
  }
  return '';
};

/* Mundo falso: rede, DOM e relógio controlados; o módulo é importado de novo a cada mundo. */
let n = 0;
async function mundo({ webdriver = false, search = '', fetchFalha = false, agoraMs = 0 } = {}) {
  const enviados = [], storage = [], agendados = [], ouvintes = {};
  const relogio = { t: agoraMs };
  const acessoStorage = (nome) => new Proxy({}, { get: (_, k) => (...a) => { storage.push(`${nome}.${String(k)}(${a.join(',')})`); return null; } });
  const doc = { visibilityState: 'visible', addEventListener: (t, fn) => { (ouvintes[`doc:${t}`] ||= []).push(fn); } };
  Object.defineProperty(doc, 'cookie', { get() { storage.push('document.cookie'); return ''; }, set() { storage.push('document.cookie='); } });
  const g = {
    location: { search, hostname: 'www.csbrasil.online' },
    navigator: { webdriver },
    document: doc,
    window: {},
    localStorage: acessoStorage('localStorage'),
    sessionStorage: acessoStorage('sessionStorage'),
    addEventListener: (t, fn) => { (ouvintes[t] ||= []).push(fn); },
    setTimeout: (fn, ms) => { agendados.push(ms); return 0; },
    performance: { now: () => relogio.t },
    fetch: (url, opts) => { enviados.push({ url, opts }); return fetchFalha ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ ok: true }); },
  };
  const nomes = Object.keys(g);
  const src = fonte
    .replace("import { apiUrl } from './apibase.js';", "const apiUrl = (p) => 'https://api.mock' + p;")
    .replace("import { VERSION } from './version.js';", "const VERSION = '2.1.0-alpha.90';");
  globalThis.__mundoContagem = g;
  const prefixo = `const { ${nomes.join(', ')} } = globalThis.__mundoContagem;\n`;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(prefixo + src).toString('base64')}#${++n}`);
  await new Promise((r) => setImmediate(r));
  return {
    mod, enviados, storage, agendados, relogio, g,
    corpos: () => enviados.map((e) => JSON.parse(e.opts.body)),
    emite: (t) => (ouvintes[t] || []).forEach((fn) => fn({ type: t })),
    escondeAba: () => { doc.visibilityState = 'hidden'; (ouvintes['doc:visibilitychange'] || []).forEach((fn) => fn({})); },
  };
}

{ // CT1: page_view na carga, no transporte certo
  const m = await mundo({ agoraMs: 1500 });
  cobra(m.enviados.length === 1 && m.corpos()[0].event === 'page_view', `CT1 page_view não saiu 1x na carga (${m.enviados.length} envio(s))`);
  const e = m.enviados[0];
  if (e) {
    cobra(e.url === 'https://api.mock/api/count', `CT1 destino errado: ${e.url}`);
    cobra(e.opts.credentials === 'omit', `CT1 credentials tem de ser 'omit' (sem cookie), veio ${e.opts.credentials}`);
    cobra(e.opts.keepalive === true, 'CT1 keepalive ausente: o fim de sessão morre com a aba');
    cobra(Object.keys(e.opts.headers || {}).join(',') === 'content-type' && e.opts.headers['content-type'] === 'text/plain', `CT1 cabeçalhos além de content-type text/plain: ${JSON.stringify(e.opts.headers)}`);
    const sujo = corpoLimpo(e.opts.body);
    cobra(!sujo, `CT1 corpo do page_view: ${sujo}`);
  }
  cobra(typeof m.g.window.__csConta === 'function', 'CT1 gancho window.__csConta ausente (boot_error do index.astro)');
}
{ // CT2: todo evento sai só com campos da allowlist e valores de enum
  const m = await mundo();
  const c = m.mod.contagem;
  c.evento('game_loaded'); c.evento('splash_enter'); c.evento('login_prompt_shown'); c.evento('login_prompt_dismissed'); c.evento('login_prompt_provider_click');
  m.g.window.__csConta('boot_error');
  c.partidaIniciada({ map: 'escadao', mode: 'ctf', game: 'sp' });
  c.partidaTerminada({ map: 'escadao', mode: 'ctf', game: 'sp' });
  c.entrouNoMp({ map: 'lajes', mode: 'rounds' });
  c.partidaIniciada({ map: 'lajes', mode: 'rounds', game: 'mp' });
  m.relogio.t = 7 * 60_000 + 412;
  c.fimDaSessao();
  const sujos = m.enviados.map((e) => corpoLimpo(e.opts.body)).filter(Boolean);
  cobra(sujos.length === 0, `CT2 corpo fora da allowlist: ${sujos.join(' | ')}`);
  const eventos = m.corpos().map((b) => b.event);
  for (const ev of Object.keys(CAMPOS)) cobra(eventos.includes(ev), `CT2 evento ${ev} não saiu`);
  const fim = m.corpos().find((b) => b.event === 'session_end');
  cobra(fim?.dur === '5-15' && fim?.matches === '2-3', `CT3 session_end com 7 min e 2 partidas tem de ser 5-15/2-3, veio ${JSON.stringify(fim)}`);
  cobra(m.storage.length === 0, `CT4 tocou storage/cookie: ${m.storage.join(', ')}`);
}
{ // CT3: faixas nas bordas
  const { faixaDuracao: d, faixaPartidas: p } = (await mundo()).mod;
  const casos = [[59_999, 'lt1'], [60_000, '1-5'], [299_999, '1-5'], [300_000, '5-15'], [900_000, '15-60'], [3_600_000, 'gt60']];
  for (const [ms, f] of casos) cobra(d(ms) === f, `CT3 ${ms} ms tem de ser ${f}, veio ${d(ms)}`);
  cobra([0, 1, 2, 3, 4, 40].map(p).join(',') === '0,1,2-3,2-3,4+,4+', `CT3 faixas de partidas: ${[0, 1, 2, 3, 4, 40].map(p)}`);
}
{ // CT5: uma sessão por página, mesmo com pagehide + aba oculta + pagehide de novo
  const m = await mundo();
  m.relogio.t = 30_000;
  m.escondeAba(); m.emite('pagehide'); m.emite('pagehide');
  const fins = m.corpos().filter((b) => b.event === 'session_end');
  cobra(fins.length === 1 && fins[0].dur === 'lt1' && fins[0].matches === '0', `CT5 session_end: ${JSON.stringify(fins)} (esperado 1x lt1/0)`);
  m.mod.contagem.evento('page_view'); m.mod.contagem.evento('game_loaded'); m.mod.contagem.evento('game_loaded');
  cobra(m.corpos().filter((b) => b.event === 'page_view').length === 1 && m.corpos().filter((b) => b.event === 'game_loaded').length === 1, 'CT5 eventos de uma vez por página saíram duplicados');
}
{ // CT6: fetch falhando não quebra e não repete
  const m = await mundo({ fetchFalha: true });
  let quebrou = false;
  try { m.mod.contagem.partidaIniciada({ map: 'escadao', mode: 'rounds', game: 'sp' }); } catch { quebrou = true; }
  await new Promise((r) => setImmediate(r));
  cobra(!quebrou, 'CT6 fetch falhando quebrou o chamador');
  cobra(m.enviados.length === 2 && m.agendados.length === 0, `CT6 falha de rede reenviou/agendou (${m.enviados.length} envio(s), ${m.agendados.length} timer)`);
  const quebra = await mundo();
  let estourou = false;
  quebra.g.fetch = () => { throw new Error('sem rede'); };
  try { quebra.mod.contagem.evento('game_loaded'); } catch { estourou = true; }
  cobra(!estourou, 'CT6 fetch que lança na hora quebrou o chamador');
}
{ // CT7: automação e sessão de teste não contam
  const robo = await mundo({ webdriver: true });
  cobra(robo.enviados.length === 0, 'CT7 navigator.webdriver contou page_view');
  const debug = await mundo({ search: '?debug=1' });
  cobra(debug.enviados.length === 0, 'CT7 ?debug=1 contou page_view');
  const m = await mundo();
  m.mod.contagem.desligar(); m.mod.contagem.evento('game_loaded');
  cobra(m.enviados.length === 1, 'CT7 desligar() não parou a contagem (testMode do main.js)');
}
{ // CT8: fonte sem identificador nem storage, e independente do consentimento
  const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  for (const proibido of ['localStorage', 'sessionStorage', 'document.cookie', 'indexedDB', 'randomUUID', 'getAnonId', 'getSessionId', 'analyticsAllowed', 'privacy-preferences', "'include'"])
    cobra(!codigo.includes(proibido), `CT8 contagem.js usa ${proibido}`);
}
{ // CT9: main.js chama a contagem nos pontos certos, fora dos gates
  cobra(/^import \{ contagem \} from '\.\/contagem\.js';/m.test(main), 'CT9 main.js não importa a contagem');
  cobra(/window\.__CS_MAIN_READY__ = true;\nwindow\.__gameLaunch\?\.ready\('boot'\);\ncontagem\.evento\('game_loaded'\);/.test(main), 'CT9 game_loaded não sai no boot pronto');
  cobra(/ready\('entrada'\);\n\s+contagem\.evento\('splash_enter'\);/.test(main), 'CT9 splash_enter não sai ao sair da splash');
  cobra(/if \(!continuaPartida\) contagem\.partidaIniciada\(\{ map: currentMap, mode: matchMode, game: sessao \? 'mp' : 'sp' \}\);/.test(main), 'CT9 match_start (SP e MP) ausente do _startGame');
  cobra(/function recordMatchStats[\s\S]{0,600}contagem\.partidaTerminada\(/.test(main), 'CT9 match_end ausente do recordMatchStats');
  cobra(/modoEscolhido = true;\n\s+contagem\.entrouNoMp\(/.test(main), 'CT9 mp_join ausente do welcome do MP');
  cobra(/if \(testMode\) contagem\.desligar\(\);/.test(main), 'CT9 testMode não desliga a contagem');
  const linhas = main.split('\n').filter((l) => /\bcontagem\.(evento|partida|entrou)/.test(l));
  cobra(linhas.length >= 5 && linhas.every((l) => !/analyticsAllowed/.test(l)), 'CT9 alguma chamada da contagem depende de analyticsAllowed');
  cobra(/<script type="module" async src=\{`\/js\/contagem\.js\?v=\$\{V\}-\$\{JS_REV\}`\} is:inline><\/script>/.test(index) && index.indexOf('/js/contagem.js') < index.indexOf('/js/main.js'), 'CT9 index.astro não carrega contagem.js (async, versionado, antes do main.js)');
  cobra(/window\.__csConta\('boot_error'\)/.test(index), 'CT9 boot_error não está ligado ao modal de falha');
  cobra(/'count'/.test(apibase.slice(apibase.indexOf('const NO_BACKEND'), apibase.indexOf(']);'))) && !/'count'/.test(apibase.slice(apibase.indexOf('const VIA_SITE'), apibase.indexOf('const VIA_SITE') + 200)), 'CT9 /api/count tem de ir direto ao backend (NO_BACKEND, fora do VIA_SITE)');
}
{ // CT10: o gate de consentimento antigo continua em cada função de telemetria por navegador
  for (const f of ['function sendTelemetry() {', 'function sendGameStarted() {', 'function _pick(kind, key) {', 'function _picks(lote) {', 'function _funnel(step) {', 'async function _sendAcquisition() {', 'function _sendPerf() {', 'function sendMatchEvent(result) {', 'function sendTrainingFrames(blob) {']) {
    const i = main.indexOf(f);
    const corpo = i < 0 ? '' : main.slice(i, i + 300);
    cobra(i >= 0 && /^[^\n]*\{\n(?:\s*\/\/[^\n]*\n)*\s*if \(!analyticsAllowed\(\)\) return;/.test(corpo), `CT10 gate de consentimento sumiu de ${f.replace(' {', '')}`);
  }
}

if (falhas.length) {
  console.error(`contagem${mut ? ` [mutante ${mut}]` : ''}: ${falhas.length} FALHA(S)`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('contagem: CT1–CT10 verde (corpo só com enums e faixas, sem id/cookie/storage, sem nova tentativa, gates de consentimento intactos)');
