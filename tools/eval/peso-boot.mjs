#!/usr/bin/env node
/* ============================================================================
   peso-boot.mjs — RÉGUA DE PESO E TEMPO DO BOOT (lane glm/peso, 14/10/2026)
   ----------------------------------------------------------------------------
   POR QUE EXISTE: a splash fica clicável em 40,4 s num celular 4G e o jogo baixa
   4,3 MB até o menu e ~13,5 MB de imagem depois (medição do handoff 14/10). A lane
   de peso precisa de UM instrumento que meça antes/depois no mesmo mundo: browser
   real, cache limpo, rede e CPU controladas por CDP.

   O QUE MEDE (por cenário × mapa, contexto limpo a cada jornada):
     menu   : `/?debug=1` até `__CS_MAIN_READY__` (menu pronto) e até o botão
              habilitado da splash Treta Pop (ou prompt visível da splash legada);
     partida: `/?debug=1&auto=P,mst&map=<id>` até `state === 'live'`
              (o fluxo ?auto remove a splash, então aqui o marco é só o live).
   Em cada marco: bytes na rede acumulados por tipo (js, glb, textura, audio,
   dados, outro) e contagem de requests. Só conta payload de JOGO: arquivos
   servidos de public/ (vite/src/ do dev ficam no balde "site", fora dos
   marcos). Bytes são os de rede (`encodedDataLength`) no serve.mjs local,
   que NÃO comprime: em produção o CDN comprime texto, então js/dados reais
   são menores; o que compara bem é a variação antes/depois no instrumento.

   Cenários:
     desktop — 1600×900, rede livre, CPU 1x;
     4g      — 390×844, 1,6 Mbps / 150 ms (perfil do handoff), CPU 4x.

   USO: node tools/eval/peso-boot.mjs [--cenario=desktop|4g|ambos]
        [--mapa=leve|pesado|ambos] [--json=<caminho>] [--base=<url>] [--porta=9147]
   Sem --base, sobe tools/eval/serve.mjs na porta (9100-9900, nunca a 8123) e
   aquece o renderer Astro antes da 1ª jornada (custo de compilação não é peso
   do jogo). Um browser por vez: rode sob tools/eval/with-browser-lock.sh.
   Mapa leve: piscina_treta · pesado: velho_oeste (Sertão, mais draw calls).
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { normalize as normPath, join as joinPath } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const CENARIO = arg('cenario') || 'ambos';
const MAPA = arg('mapa') || 'ambos';
const JSON_OUT = arg('json');
const PORTA = arg('porta') || '9147';
const BASE = arg('base') || `http://127.0.0.1:${PORTA}`;

const MAPAS = { leve: 'piscina_treta', pesado: 'velho_oeste' };
const CENARIOS = {
  desktop: { viewport: { width: 1600, height: 900 }, rede: null, cpu: 1 },
  '4g': { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, rede: { downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, latency: 150 }, cpu: 4 },
};

const tipo = (u) =>
  /\.glb(\?|$)/.test(u) ? 'glb' :
  /\.(mp3|wav|ogg|m4a)(\?|$)/.test(u) ? 'audio' :
  /\.(png|jpg|jpeg|webp|svg|ico|ktx2|basis|avif)(\?|$)/.test(u) ? 'textura' :
  /\.js(\?|$)/.test(u) ? 'js' :
  /\.(css|json|wasm|txt|html)(\?|$)/.test(u) ? 'dados' : 'outro';

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = arg('base') ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv?.kill());
if (srv) {
  await new Promise((r) => setTimeout(r, 800));
  // Aquecimento: a 1ª requisição compila o index.astro no dev server. `fetch` só
  // lança em erro de REDE: sem o `ok`, um 500 do Astro vira "aquecido" e a
  // jornada inteira mede uma página de erro (lição 5: falha silenciosa).
  let pronta = false;
  for (let i = 0; i < 60 && !pronta; i++) {
    try { const resp = await fetch(`${BASE}/`); pronta = resp.ok && (await resp.text()).includes('importmap'); } catch {}
    if (!pronta) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!pronta) { console.error(`servidor não respondeu OK em ${BASE}/`); process.exit(1); }
}

const browser = await chromium.launch(
  process.env.CHROME_BIN
    ? { executablePath: process.env.CHROME_BIN, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'] }
    : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] },
);

const fmtMB = (b) => (b / 1e6).toFixed(2);
const soma = (reqs) => reqs.reduce((s, r) => s + r.bytes, 0);
const porTipo = (reqs) => {
  const t = {};
  for (const r of reqs) (t[r.tipo] || (t[r.tipo] = { n: 0, bytes: 0 })).n++, t[r.tipo].bytes += r.bytes;
  return Object.fromEntries(Object.entries(t).sort((a, b) => b[1].bytes - a[1].bytes));
};


/* Payload de JOGO = arquivo servido de public/ (js, vendor, models, img, áudio…).
   O dev server do Astro injeta os seus (vite client, src/, transforms) que em
   produção não existem: ficam fora dos marcos, no balde "site". */
const cacheJogo = new Map();
const ehJogo = (url) => {
  const p = decodeURIComponent(new URL(url).pathname);
  if (p === '/') return false;
  if (cacheJogo.has(p)) return cacheJogo.get(p);
  const arquivo = normPath(joinPath('public', p));
  const jogo = arquivo.startsWith('public/') && existsSync(arquivo);
  cacheJogo.set(p, jogo);
  return jogo;
};

async function jornada(nome, cenario, url, marcos, tetoS) {
  const cfg = CENARIOS[cenario];
  const ctx = await browser.newContext({ viewport: cfg.viewport, ...(cfg.context || {}) });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => { if (erros.length < 5) erros.push(String(e?.message || e)); });
  page.on('console', (m) => { if (m.type() === 'error' && erros.length < 5) erros.push(m.text().slice(0, 200)); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });   // jornada = 1ª visita
  if (cfg.rede) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...cfg.rede });
  if (cfg.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cfg.cpu });

  const reqs = [];
  const abertos = new Map();
  const onReq = (e) => abertos.set(e.requestId, e.request.url);
  const onFim = (e) => {
    const u = abertos.get(e.requestId);
    if (u !== undefined) reqs.push({ url: u, tipo: tipo(u), jogo: ehJogo(u), bytes: e.encodedDataLength || 0, t: Date.now() });
    abertos.delete(e.requestId);
  };
  cdp.on('Network.requestWillBeSent', onReq);
  cdp.on('Network.loadingFinished', onFim);
  cdp.on('Network.loadingFailed', (e) => abertos.delete(e.requestId));


  const t0 = Date.now();
  const resultado = { cenario, nome, marcos: {} };
  // 'commit': nenhum evento de load serve no 4G (o grafo ES module segura tanto
  // DOMContentLoaded quanto load por minutos); quem espera são os marcos abaixo.
  await page.goto(url, { waitUntil: 'commit', timeout: 60_000 });
  for (const [chave, fn] of Object.entries(marcos)) {
    try {
      await page.waitForFunction(fn, null, { timeout: tetoS * 1000 });
      const t = Date.now();
      const ate = reqs.filter((r) => r.jogo && r.t <= t);
      resultado.marcos[chave] = { ms: t - t0, bytes: soma(ate), reqs: ate.length, porTipo: porTipo(ate) };
      console.log(`  ${chave.padEnd(14)} ${((t - t0) / 1000).toFixed(1).padStart(6)} s  ${fmtMB(soma(ate)).padStart(7)} MB  ${String(ate.length).padStart(4)} req`);
    } catch {
      resultado.marcos[chave] = null;
      console.log(`  ${chave.padEnd(14)} TIMEOUT (${tetoS}s)${erros.length ? ' · erros: ' + erros.slice(0, 2).join(' | ') : ''}`);
    }
  }
  // poeira baixar: lazy que chega depois do último marco entra na conta da jornada
  await page.waitForTimeout(3000);
  const doJogo = reqs.filter((r) => r.jogo), doSite = reqs.filter((r) => !r.jogo);
  resultado.total = { bytes: soma(doJogo), reqs: doJogo.length, porTipo: porTipo(doJogo), site: { bytes: soma(doSite), reqs: doSite.length } };
  resultado.reqsJogo = doJogo.map(({ url, tipo, bytes }) => ({ url: url.replace(BASE, ''), tipo, bytes }));
  const top = [...doJogo].sort((a, b) => b.bytes - a.bytes).slice(0, 6)
    .map((r) => `    ${fmtMB(r.bytes).padStart(6)} MB  ${r.url.replace(BASE, '')}`);
  console.log(`  total jogo ${fmtMB(soma(doJogo))} MB · ${doJogo.length} req (site/dev: ${fmtMB(soma(doSite))} MB · ${doSite.length} req)\n  maiores:\n${top.join('\n')}`);
  cdp.off('Network.requestWillBeSent', onReq);
  cdp.off('Network.loadingFinished', onFim);
  await ctx.close();
  relatorio.jornadas.push(resultado);   // persiste JORNADA A JORNADA
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(relatorio, null, 2));
  return resultado;
}

const relatorio = { base: BASE, quando: new Date().toISOString(), jornadas: [] };
const listaCenarios = CENARIO === 'ambos' ? ['desktop', '4g'] : [CENARIO];
const listaMapas = MAPA === 'ambos' ? ['leve', 'pesado'] : [MAPA];

for (const cenario of listaCenarios) {
  console.log(`\n===== ${cenario} =====`);
  await jornada('menu', cenario, `${BASE}/?debug=1`, {
    menu: () => window.__CS_MAIN_READY__ === true,
    splash: () => {
      const pop = document.getElementById('tp-splash-jogar');
      const legada = document.getElementById('splash-enter');
      return (!!pop && pop.disabled === false) || (!!legada && !legada.classList.contains('hidden'));
    },
  }, cenario === '4g' ? 300 : 90);
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(relatorio, null, 2));
  for (const chave of listaMapas) {
    await jornada(`partida-${chave}`, cenario,
      `${BASE}/?debug=1&auto=P,mst&map=${MAPAS[chave]}`, {
        menu: () => window.__CS_MAIN_READY__ === true,
        partida: () => window.__game && window.__game.state === 'live',
      }, cenario === '4g' ? 900 : 300);
  }
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(relatorio, null, 2));
}

const resumo = {};
for (const j of relatorio.jornadas) for (const [k, v] of Object.entries(j.marcos)) if (v) (resumo[`${j.cenario}/${j.nome}/${k}`] ||= { s: +(v.ms / 1000).toFixed(1), mb: +(v.bytes / 1e6).toFixed(2), reqs: v.reqs });
console.log('\nRESUMO (cenario/jornada/marco: segundos · MB · reqs)');
for (const [k, v] of Object.entries(resumo)) console.log(`  ${k.padEnd(36)} ${String(v.s).padStart(6)} s ${String(v.mb).padStart(7)} MB ${String(v.reqs).padStart(4)} req`);

if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify(relatorio, null, 2)); console.log(`\njson -> ${JSON_OUT}`); }
await browser.close();
srv?.kill();
process.exit(0);
