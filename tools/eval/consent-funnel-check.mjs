/* CF1–CF6 — aquisição e funil com consentimento TARDIO (modal da 1ª visita).
 * Caso: até 13/10/2026 `_sendAcquisition()` e `_funnel('land')` rodavam uma vez na carga e
 * voltavam cedo sem consentimento; nada escutava `cs-privacy-change`. Quem aceitava depois
 * não registrava origem nem 'land', e a etapa 'menu' era consumida no clique que consentia.
 * Roda o código REAL de main.js (as duas regiões entre os marcadores) num vm com rede falsa.
 * Mutantes: --mutante=sem-listener | envia-antes | acq-antes | land-consumido | menu-consumido |
 * url-tardia | grava-antes | anon-antes
 * (cada um tem de ficar VERMELHO; `--fonte=arquivo` mede outra versão de main.js). */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const mut = arg('mutante');
const fonte = arg('fonte') || new URL('../../public/js/main.js', import.meta.url);
let main = readFileSync(fonte, 'utf8');

const troca = (velho, novo) => {
  const n = main.replace(velho, novo);
  if (n === main) { console.error(`MUTANTE ${mut} NAO APLICOU`); process.exit(2); }
  main = n;
};
if (mut === 'sem-listener') troca("addEventListener('cs-privacy-change', _funnelLand);", '');
const semGateLand = () => troca('if (_landFuneled || !analyticsAllowed()) return;', 'if (_landFuneled) return;');
if (mut === 'envia-antes') { semGateLand(); troca('function _funnel(step) {\n  if (!analyticsAllowed()) return;', 'function _funnel(step) {'); }
if (mut === 'acq-antes') { semGateLand(); troca('async function _sendAcquisition() {\n  if (!analyticsAllowed()) return;', 'async function _sendAcquisition() {'); }
if (mut === 'land-consumido') semGateLand();
if (mut === 'menu-consumido') troca('if (_menuFuneled || !_landFuneled || !analyticsAllowed()) return;', 'if (_menuFuneled) return;');
if (mut === 'url-tardia') troca('const payload = { anonId: getAnonId(), ..._landingOrigem };', "const payload = { anonId: getAnonId(), ..._landingOrigem, utmCampaign: new URLSearchParams(location.search).get('utm_campaign') };");
if (mut === 'anon-antes') troca('const _landingOrigem = (() => {', 'getAnonId();\nconst _landingOrigem = (() => {');
if (mut === 'grava-antes') troca('const _landingOrigem = (() => {', "try { localStorage.setItem('cs_landing', location.search); } catch {}\nconst _landingOrigem = (() => {");

const regiao = (ini, fim) => {
  const a = main.indexOf(ini), b = main.indexOf(fim, a);
  if (a < 0 || b < 0) { console.error(`consent funnel: marcador sumiu de main.js (${ini.slice(0, 30)}…) — a régua não sabe medir`); process.exit(1); }
  return main.slice(a, b);
};
const codigo = regiao('// FUNIL (017)', '// PERF (018)') + regiao('/* Telemetria nova (feat/telemetria)', '\nasync function startGame(');

const ENTRADA = { pathname: '/', search: '?utm_source=teste&utm_medium=post&utm_campaign=lancamento-out&utm_content=criativo-video&ref=AMIGO1' };

function mundo({ consentido = false, testMode = false } = {}) {
  const enviados = [], gravados = [], ouvintes = {};
  let ok = consentido;
  const store = new Map();
  const ctx = {
    testMode,
    location: { ...ENTRADA },
    document: { referrer: 'https://www.reddit.com/r/brasil/comments/abc?token=segredo' },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { gravados.push(k); store.set(k, v); }, removeItem: (k) => store.delete(k) },
    analyticsAllowed: () => ok,
    getAnonId: () => { if (!ok) gravados.push('cs_anon'); return '00000000-0000-4000-8000-000000000001'; },
    getSessionId: () => { if (!ok) gravados.push('cs_session'); return 'sessao-1'; },
    apiUrl: (p) => `https://api.mock${p}`,
    sendJsonKeepalive: (rota, corpo) => enviados.push({ rota, corpo }),
    fetch: async (url, opts) => { enviados.push({ rota: url.replace('https://api.mock', ''), corpo: JSON.parse(opts.body) }); return { ok: true, json: async () => ({ ok: true, stored: true }) }; },
    _sendPerf: () => {},
    URL, URLSearchParams, Object, JSON,
    addEventListener: (t, fn) => { (ouvintes[t] ||= new Set()).add(fn); },
    removeEventListener: (t, fn) => ouvintes[t]?.delete(fn),
  };
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx);
  const emite = (t) => [...(ouvintes[t] || [])].forEach((fn) => fn({ type: t }));
  return {
    enviados, gravados, ctx,
    consente(v) { ok = v; emite('cs-privacy-change'); },
    interage() { emite('pointerdown'); },
    navega(search) { ctx.location.search = search; },
  };
}
const passo = () => new Promise((r) => setImmediate(r));
const conta = (m, rota, step) => m.enviados.filter((e) => e.rota === rota && (!step || e.corpo.step === step)).length;

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };

{ // CF1–CF3: consentimento tardio, com a URL já reescrita pelo menu
  const m = mundo();
  m.navega('?home=jogar');
  m.interage();
  await passo();
  cobra(m.enviados.length === 0, `CF1 privacidade: ${m.enviados.length} envio(s) ANTES do consentimento (${m.enviados.map((e) => e.rota).join(', ')})`);
  cobra(m.gravados.length === 0, `CF1 privacidade: gravou ${m.gravados.join(', ')} no storage antes do consentimento`);
  m.consente(true);
  await passo();
  const acq = m.enviados.find((e) => e.rota === '/api/acquisition');
  cobra(!!acq, 'CF2 aceitar depois da carga não envia /api/acquisition — falta ouvir cs-privacy-change; a visita vira "direto" no first-touch');
  if (acq) {
    const c = acq.corpo;
    cobra(c.utmSource === 'teste' && c.utmMedium === 'post' && c.utmCampaign === 'lancamento-out' && c.utmContent === 'criativo-video' && c.ref === 'AMIGO1' && c.landing === '/',
      `CF2 aquisição tardia saiu com a origem completa errada (${JSON.stringify(c)}) — tem de ser a URL de ENTRADA, incluindo o criativo, capturada em memória na carga`);
    cobra(c.referrer === 'www.reddit.com', `CF2 referrer tem de sair só como host, saiu ${JSON.stringify(c.referrer)}`);
  }
  cobra(conta(m, '/api/funnel', 'land') === 1, `CF2 'land' tardio: ${conta(m, '/api/funnel', 'land')} envio(s), esperado 1`);
  cobra(conta(m, '/api/funnel', 'menu') === 0, "CF3 o clique de antes do consentimento não pode virar 'menu'");
  m.interage(); m.interage();
  m.consente(true);
  await passo();
  cobra(conta(m, '/api/funnel', 'menu') === 1, `CF3 'menu' após consentir: ${conta(m, '/api/funnel', 'menu')} envio(s), esperado 1 — a etapa foi consumida antes do consentimento`);
  cobra(conta(m, '/api/funnel', 'land') <= 1 && conta(m, '/api/acquisition') <= 1, 'CF3 consentir de novo duplicou land/aquisição');
}
{ // CF4: negado nunca envia
  const m = mundo();
  m.interage(); m.consente(false); m.interage();
  await passo();
  cobra(m.enviados.length === 0 && m.gravados.length === 0, `CF4 consentimento NEGADO enviou ${m.enviados.length} / gravou ${m.gravados.length}`);
}
{ // CF4b: retirada antes de interagir segura o 'menu' até novo consentimento
  const m = mundo({ consentido: true });
  m.consente(false); m.interage();
  await passo();
  cobra(conta(m, '/api/funnel', 'menu') === 0, "CF4 'menu' saiu depois da retirada do consentimento");
  m.consente(true); m.interage();
  await passo();
  cobra(conta(m, '/api/funnel', 'menu') === 1 && conta(m, '/api/funnel', 'land') === 1, 'CF4 reconsentir: menu/land fora de 1x');
}
{ // CF5: visitante que já consentiu — comportamento de antes
  const m = mundo({ consentido: true });
  await passo();
  cobra(conta(m, '/api/acquisition') === 1 && conta(m, '/api/funnel', 'land') === 1, 'CF5 consentimento prévio: aquisição/land não saíram na carga');
  m.interage(); m.interage();
  cobra(conta(m, '/api/funnel', 'menu') === 1, `CF5 consentimento prévio: 'menu' ${conta(m, '/api/funnel', 'menu')}x, esperado 1`);
}
{ // CF6: testMode não envia nem depois de consentir
  const m = mundo({ testMode: true });
  m.consente(true); m.interage();
  await passo();
  cobra(m.enviados.length === 0, `CF6 testMode enviou ${m.enviados.length} evento(s) após consentimento`);
}

if (falhas.length) {
  console.error(`consent funnel${mut ? ` [mutante ${mut}]` : ''}: ${falhas.length} FALHA(S)`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('consent funnel: CF1–CF6 verde (nada antes do consentimento, aquisição+land no consentimento tardio, menu só depois)');
