/* medir-boot.mjs — quanto tempo o jogador espera até poder jogar, e por quê.
   ═══════════════════════════════════════════════════════════════════════════════
   Mede o boot REAL (produção ou local) em cenários de rede/CPU, com CDP:
     · tempo até a splash liberar a entrada (`#splash-enter` sem .hidden)
     · tempo até `#btn-jogar` existir com aria-disabled=false
     · bytes baixados e número de requisições ATÉ esse instante
     · os N maiores recursos (encodedDataLength real, do CDP, não do Resource Timing)
     · marcos de `performance` e amostra de long tasks na main thread

   A/B SEM MUDAR O SERVIDOR
     `--patch` serve os arquivos DESTA árvore por cima dos de produção (interceptação de
     rota, igual aos mutantes do boot-check). Mesma CDN, mesmo HTML, mesmo import map:
     a única variável é o diff. Confira antes que a base bate com o que prod serve —
     `curl /js/main.js?v=... | cmp - <(git show origin/main:public/js/main.js)`.

   USO
     node tools/medir-boot.mjs --cenario=desktop-cabo
     node tools/medir-boot.mjs --todos --repeticoes=3 --base=https://www.csbrasil.online
     node tools/medir-boot.mjs --todos --json=evidence/boot.json
     node tools/medir-boot.mjs --cenario=celular-3g --patch   # com o diff local aplicado

   REPRODUZIR OS NÚMEROS DE 25/10
     Toda a bateria daquele dia (evidence/boot/*.json) rodou com WebGL por SOFTWARE.
     Para repetir exatamente, acrescente --software; sem ele a medição usa a GPU, que é
     o caminho do jogador comum e liga o MOBILE_AUTO nos cenários de celular.
   ═══════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('='); return v === '' || v === undefined ? d : v; };
const flag = (k) => args.includes(`--${k}`);

const BASE = val('base', process.env.BASE || 'https://www.csbrasil.online');
const REPS = Number(val('repeticoes', 3));
const TOPN = Number(val('top', 15));
const TIMEOUT = Number(val('timeout', 180000));
const JSON_OUT = val('json', '');
/* CONSENTIMENTO. `land`/`perf`/`acquisition` só saem com `cs_privacy.analytics === true`
   (privacy-runtime.js). Medir com `nao` evita que a bateria de medição injete linhas
   falsas no funil de produção; `sim` reproduz a sessão que de fato é contada; `nenhum`
   é o visitante NOVO, que é o estado real da maioria. O caminho do boot é o mesmo nos
   três: o consentimento só liga/desliga POSTs que acontecem depois do portão. */
const CONSENT = val('consentimento', 'nao');
if (!['sim', 'nao', 'nenhum'].includes(CONSENT)) { console.error('--consentimento=sim|nao|nenhum'); process.exit(2); }
const PERFIL = flag('perfil');
/* CACHE QUENTE: navega duas vezes no MESMO contexto e mede a segunda. Separa
   "custo de baixar" de "custo de executar" sem mudar nada no site. */
const AQUECIDO = flag('aquecido');
/* Arquivos servidos a partir do disco quando `--patch`. A lista é explícita: trocar
   `public/js/*` inteiro mascararia um arquivo que o diff nem toca. */
const PATCH = flag('patch');
/* --software volta ao swiftshader: é o caminho de COMPAT_MODE, cenário real de quem
   tem WebGL por software. Por padrão a medição usa a GPU, que é o caso comum. */
const SOFTWARE = flag('software');
const PATCHADOS = ['js/main.js', 'js/textures.js'];

/* Perfis de rede: valores explícitos em bits/s e ms, para o relatório poder citá-los.
   São os presets do DevTools; quem reproduzir tem de bater o número, não o nome. */
const CENARIOS = {
  'desktop-cabo': {
    rotulo: 'desktop cabo',
    rede: null,
    cpu: 1,
    viewport: { width: 1366, height: 768 },
    mobile: false,
  },
  'desktop-4g-rapido': {
    rotulo: 'desktop 4G rápido',
    rede: { downloadThroughput: 9_000_000 / 8, uploadThroughput: 1_500_000 / 8, latency: 85 },
    cpu: 1,
    viewport: { width: 1366, height: 768 },
    mobile: false,
  },
  'celular-4g-lento': {
    rotulo: 'celular 4G lento (CPU 4x)',
    rede: { downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, latency: 300 },
    cpu: 4,
    viewport: { width: 412, height: 915 },
    mobile: true,
  },
  'celular-3g': {
    rotulo: 'celular 3G lento (CPU 4x)',
    rede: { downloadThroughput: 400_000 / 8, uploadThroughput: 400_000 / 8, latency: 2000 },
    cpu: 4,
    viewport: { width: 412, height: 915 },
    mobile: true,
  },
};

const UA_MOBILE = 'Mozilla/5.0 (Linux; Android 13; Moto G54) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

const alvos = flag('todos') ? Object.keys(CENARIOS) : [val('cenario', 'desktop-cabo')];
for (const c of alvos) if (!CENARIOS[c]) { console.error(`cenário desconhecido: ${c}\nconhecidos: ${Object.keys(CENARIOS).join(', ')}`); process.exit(2); }

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const fmtKB = (b) => `${(b / 1024).toFixed(0)} KB`;
const fmtMB = (b) => `${(b / 1048576).toFixed(2)} MB`;
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

async function umaRodada(cen, nome) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    /* GPU DE VERDADE POR PADRÃO. Com `--use-angle=swiftshader` o jogo detecta software
       (`glcontext.js` -> `GLMETA.software`), liga COMPAT_MODE e, com isso, DESLIGA o
       MOBILE_AUTO — ou seja, o celular emulado deixava de pegar o caminho leve e a
       medida virava "celular com WebGL quebrado", que não é o caso comum. Este Mac
       entrega ANGLE Metal (M4 Pro) em headless; `--software` volta ao caminho de
       compatibilidade de propósito, que também é um cenário real. */
    args: SOFTWARE
      ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--disable-dev-shm-usage']
      : ['--headless=new', '--mute-audio', '--disable-dev-shm-usage'],
  });
  try {
    const context = await browser.newContext({
      viewport: cen.viewport,
      userAgent: cen.mobile ? UA_MOBILE : undefined,
      hasTouch: cen.mobile,
      isMobile: cen.mobile,
      deviceScaleFactor: cen.mobile ? 2.625 : 1,
      bypassCSP: false,
    });
    /* `nenhum` deixa o localStorage virgem (visitante novo de verdade). */
    if (CONSENT !== 'nenhum') {
      await context.addInitScript((ok) => {
        try { localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: ok, updatedAt: new Date(0).toISOString() })); } catch {}
      }, CONSENT === 'sim');
    }
    /* O corpo vem do disco, mas o CABEÇALHO continua o de produção: o `content-type`
       de módulo ES é obrigatório pro import map, e cair pro default do Playwright
       quebraria o boot inteiro em vez de medi-lo. */
    if (PATCH) {
      for (const rel of PATCHADOS) {
        const disco = new URL(`../public/${rel}`, import.meta.url);
        const corpo = readFileSync(disco, 'utf8');
        await context.route(`**/${rel}*`, async (rota) => {
          const r = await rota.fetch();
          await rota.fulfill({ response: r, body: corpo });
        });
      }
    }
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Page.enable');
    await cdp.send('Performance.enable');
    if (PERFIL) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); }
    if (cen.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cen.cpu });
    if (cen.rede) {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, ...cen.rede });
    } else {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 });
    }

    /* Contabilidade por requisição. `encodedDataLength` do Network.loadingFinished é o
       byte que SAIU do fio (comprimido); somar transferSize do Resource Timing mente
       quando o recurso vem do cache de memória. */
    const reqs = new Map();      // requestId -> {url, type, bytes, fim}
    const t0 = Date.now();
    /* QUEM pediu importa tanto quanto quanto pesa: `parser` é tag no HTML, `script` traz
       o arquivo:linha que disparou o fetch. Sem isto, "8,9 MB de imagem" não vira ação. */
    const quemPediu = (ini) => {
      if (!ini) return '?';
      const q = (ini.stack?.callFrames || [])[0];
      if (q?.url) return `${q.url.replace(BASE, '').split('?')[0]}:${q.lineNumber + 1}`;
      return ini.url ? `${ini.type}:${ini.url.replace(BASE, '').split('?')[0]}` : ini.type || '?';
    };
    cdp.on('Network.requestWillBeSent', (e) => {
      reqs.set(e.requestId, {
        url: e.request.url, type: e.type || '?', bytes: 0,
        inicio: Date.now() - t0, fim: null, cache: false, pedidoPor: quemPediu(e.initiator),
      });
    });
    cdp.on('Network.responseReceived', (e) => {
      const r = reqs.get(e.requestId); if (!r) return;
      r.type = e.type || r.type;
      r.status = e.response.status;
      r.mime = e.response.mimeType;
      r.cache = !!e.response.fromDiskCache;
    });
    cdp.on('Network.loadingFinished', (e) => {
      const r = reqs.get(e.requestId); if (!r) return;
      r.bytes = e.encodedDataLength || 0;
      r.fim = Date.now() - t0;
    });
    cdp.on('Network.loadingFailed', (e) => {
      const r = reqs.get(e.requestId); if (!r) return;
      r.falhou = e.errorText; r.fim = Date.now() - t0;
    });

    /* Passada de aquecimento: mesma aba, mesmo cache HTTP. A medida é a SEGUNDA. */
    if (AQUECIDO) {
      await page.goto(BASE, { waitUntil: 'load', timeout: TIMEOUT }).catch(() => {});
      await page.waitForFunction(() => {
        const se = document.getElementById('splash-enter');
        return !!se && !se.classList.contains('hidden');
      }, null, { timeout: TIMEOUT, polling: 200 }).catch(() => {});
      reqs.clear();
    }
    /* PERFIL DE CPU. A janela entre "o último módulo chegou" e "o primeiro GLB foi
       pedido" é silenciosa na rede e cara no relógio; sem amostrar a main thread o
       diagnóstico vira palpite. `Profiler` do CDP dá self-time por arquivo. */
    if (PERFIL) await cdp.send('Profiler.start');
    const navInicio = Date.now();
    await page.goto(BASE, { waitUntil: 'commit', timeout: TIMEOUT });

    /* O instante em que o jogador pode entrar: a splash liberou o gesto. Carimbado NA
       PÁGINA com `performance.now()` — o polling pelo lado do node custa um round-trip
       de CDP por amostra e, com a CPU estrangulada em 4x, esse custo entra na medida.

       UMA continuação por passada, e `setTimeout` em vez de `requestAnimationFrame`.
       A primeira versão agendava OS DOIS: cada `marca()` criava duas, as duas criavam
       quatro, e em segundos o sondador comia a main thread que ele devia estar
       observando. A medida de cabo com a bomba ligada saiu 10,45 s; o número honesto
       está no cabeçalho do relatório desta medição. Instrumento que muda o que mede
       não é medida. */
    await page.evaluate(() => {
      window.__csMedida = { splash: null, jogar: null };
      const marca = () => {
        const se = document.getElementById('splash-enter');
        if (!window.__csMedida.splash && se && !se.classList.contains('hidden')) window.__csMedida.splash = performance.now();
        const bj = document.getElementById('btn-jogar');
        if (!window.__csMedida.jogar && bj && bj.getAttribute('aria-disabled') === 'false') window.__csMedida.jogar = performance.now();
        if (window.__csMedida.splash && window.__csMedida.jogar) return;
        setTimeout(marca, 25);
      };
      marca();
    }).catch(() => {});

    const prontoEm = await page.waitForFunction(
      () => window.__csMedida && window.__csMedida.splash && window.__csMedida.jogar ? window.__csMedida : null,
      null, { timeout: TIMEOUT, polling: 100 },
    ).then((h) => h.jsonValue()).catch(() => null);

    const tJogavel = prontoEm ? Math.max(prontoEm.splash, prontoEm.jogar) : null;
    const relogioParede = Date.now() - navInicio;
    /* Self-time agregado por ARQUIVO e por FUNÇÃO. Por arquivo responde "quem come a
       main thread"; por função responde "o quê, lá dentro" — sem a segunda, "textures.js
       custa 4 s" é um dedo apontado, não um diagnóstico. `hitCount` × intervalo real de
       amostragem; `(program)`/`(idle)`/`(garbage collector)` ficam com o nome próprio
       deles pra não inflarem arquivo nenhum. */
    let perfil = null; let perfilFn = null;
    if (PERFIL) {
      const { profile } = await cdp.send('Profiler.stop');
      const intervalo = profile.endTime && profile.startTime && profile.samples?.length
        ? (profile.endTime - profile.startTime) / profile.samples.length / 1000 : 0.2;
      const porArquivo = new Map(); const porFuncao = new Map();
      const curto = (u) => (u ? u.replace(BASE, '').split('?')[0] : '');
      for (const n of profile.nodes) {
        if (!n.hitCount) continue;
        const cf = n.callFrame || {};
        const ms = n.hitCount * intervalo;
        const arquivo = cf.url ? curto(cf.url) : `(${cf.functionName || 'programa'})`;
        porArquivo.set(arquivo, (porArquivo.get(arquivo) || 0) + ms);
        if (cf.url) {
          const fn = `${curto(cf.url).split('/').pop()}:${cf.lineNumber + 1} ${cf.functionName || '(anônima)'}`;
          porFuncao.set(fn, (porFuncao.get(fn) || 0) + ms);
        }
      }
      const ordena = (m, n) => [...m.entries()].map(([k, ms]) => ({ arquivo: k, ms: Math.round(ms) }))
        .sort((a, b) => b.ms - a.ms).slice(0, n);
      perfil = ordena(porArquivo, 14);
      perfilFn = ordena(porFuncao, 16);
    }

    /* Corte: só conta o que terminou ANTES do instante jogável. `fim` é relativo ao t0
       do node, que começa alguns ms antes do navigationStart; o viés é o mesmo para
       todos os cenários e está abaixo do desvio entre repetições. */
    const corte = tJogavel ?? relogioParede;
    const ate = [...reqs.values()].filter((r) => r.fim !== null && r.fim <= corte + 50);
    const bytes = ate.reduce((s, r) => s + r.bytes, 0);
    /* `fulfill` entrega o corpo do disco SEM compressão, enquanto a CDN serve br/gzip:
       em `--patch` o main.js pulou de 103 KB para 298 KB sozinho. Esse total exclui os
       arquivos patchados DOS DOIS LADOS — é o único jeito de o A/B comparar asset com
       asset em vez de comparar compressão. */
    const bytesSemPatch = ate.reduce((s, r) => s + (PATCHADOS.some((p) => r.url.includes(p)) ? 0 : r.bytes), 0);

    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return {
        marks: performance.getEntriesByType('mark').map((m) => ({ nome: m.name, t: Math.round(m.startTime) })),
        measures: performance.getEntriesByType('measure').map((m) => ({ nome: m.name, t: Math.round(m.startTime), dur: Math.round(m.duration) })),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
        responseEnd: Math.round(nav.responseEnd || 0),
        fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0),
        longTasks: (window.__csLongTasks || []).slice(0, 40),
        webgl: (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })(),
      };
    }).catch(() => ({}));

    const metrics = await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
    const m = Object.fromEntries((metrics.metrics || []).map((x) => [x.name, x.value]));

    await browser.close();
    return {
      cenario: nome,
      tJogavel, tSplash: prontoEm?.splash ?? null, tBtnJogar: prontoEm?.jogar ?? null,
      relogioParede, bytes, bytesSemPatch, reqs: ate.length,
      todosBytes: [...reqs.values()].reduce((s, r) => s + r.bytes, 0),
      todasReqs: reqs.size,
      recursos: ate.map((r) => ({ url: r.url.replace(BASE, ''), bytes: r.bytes, type: r.type, fim: r.fim, inicio: r.inicio, pedidoPor: r.pedidoPor })).sort((a, b) => b.bytes - a.bytes),
      /* Prova de QUANDO a telemetria sai: `/api/funnel` com step=land é o que o painel
         admin conta como "chegou". Sem consentimento ele não sai — e isso é medição,
         não leitura de código. */
      apis: [...reqs.values()].filter((r) => r.url.includes('/api/')).map((r) => ({ url: r.url.replace(BASE, ''), inicio: r.inicio, fim: r.fim })),
      perf, perfil, perfilFn,
      cpuTarefa: Math.round((m.TaskDuration || 0) * 1000),
      cpuScript: Math.round((m.ScriptDuration || 0) * 1000),
      cpuLayout: Math.round((m.LayoutDuration || 0) * 1000),
      cpuRecalc: Math.round((m.RecalcStyleDuration || 0) * 1000),
      jsHeap: m.JSHeapUsedSize || 0,
    };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

const resultados = [];
for (const nome of alvos) {
  const cen = CENARIOS[nome];
  const rodadas = [];
  for (let i = 0; i < REPS; i++) {
    process.stderr.write(`· ${nome} rodada ${i + 1}/${REPS}…\n`);
    rodadas.push(await umaRodada(cen, nome));
  }
  const ok = rodadas.filter((r) => r.tJogavel !== null);
  const base = ok.length ? ok : rodadas;
  const rep = base[0];
  resultados.push({
    cenario: nome, rotulo: cen.rotulo, rede: cen.rede, cpu: cen.cpu, mobile: cen.mobile,
    rodadas: rodadas.map((r) => ({ tJogavel: r.tJogavel, bytes: r.bytes, reqs: r.reqs })),
    medianaJogavel: ok.length ? Math.round(med(ok.map((r) => r.tJogavel))) : null,
    medianaBytes: Math.round(med(base.map((r) => r.bytes))),
    medianaBytesSemPatch: Math.round(med(base.map((r) => r.bytesSemPatch))),
    medianaReqs: Math.round(med(base.map((r) => r.reqs))),
    detalhe: rep,
  });
}

console.log(`\n══ BOOT em ${BASE} · ${REPS} rodada(s) por cenário · mediana · consentimento=${CONSENT}${PATCH ? ` · PATCH local em ${PATCHADOS.join(', ')}` : ''}${AQUECIDO ? ' · cache quente' : ''} ══\n`);
console.log('cenário                         até-jogável   bytes    s/patch   reqs   splash    btn-jogar');
for (const r of resultados) {
  const d = r.detalhe;
  console.log(
    `${r.rotulo.padEnd(30)}  ${(r.medianaJogavel === null ? 'TIMEOUT' : `${(r.medianaJogavel / 1000).toFixed(2)} s`).padStart(10)}  ${fmtMB(r.medianaBytes).padStart(9)} ${fmtMB(r.medianaBytesSemPatch).padStart(9)}  ${String(r.medianaReqs).padStart(5)}  ${d.tSplash ? `${(d.tSplash / 1000).toFixed(2)}s` : '—'.padStart(6)}  ${d.tBtnJogar ? `${(d.tBtnJogar / 1000).toFixed(2)}s` : '—'}`,
  );
}
for (const r of resultados) {
  const d = r.detalhe;
  console.log(`\n── ${r.rotulo} ─ ${TOPN} maiores recursos até ficar jogável (total ${fmtMB(d.bytes)} em ${d.reqs} req) ──`);
  for (const rec of d.recursos.slice(0, TOPN)) {
    console.log(`  ${fmtKB(rec.bytes).padStart(9)}  ${String(rec.type).padEnd(9)} t=${String(rec.fim).padStart(6)}ms  ${rec.url}   ← ${rec.pedidoPor}`);
  }
  const porTipo = {};
  for (const rec of d.recursos) porTipo[rec.type] = (porTipo[rec.type] || 0) + rec.bytes;
  console.log(`  por tipo: ${Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${fmtKB(v)}`).join('  ')}`);
  console.log(`  CPU: task=${d.cpuTarefa}ms script=${d.cpuScript}ms layout=${d.cpuLayout}ms recalc=${d.cpuRecalc}ms · FCP=${d.perf.fcp}ms DCL=${d.perf.domContentLoaded}ms · webgl=${d.perf.webgl}`);
  if (d.perf.marks?.length) console.log(`  marks: ${d.perf.marks.map((x) => `${x.nome}@${x.t}`).join(' ')}`);
  console.log(`  /api/ no boot: ${d.apis.length ? d.apis.map((x) => `${x.url.replace('/api/', '')}@${x.inicio}ms`).join(' ') : 'NENHUMA'}`);
  if (d.perfil) {
    console.log('  CPU por arquivo (self-time amostrado, ms):');
    for (const x of d.perfil) console.log(`    ${String(x.ms).padStart(6)} ms  ${x.arquivo}`);
  }
  if (d.perfilFn) {
    console.log('  CPU por função (self-time amostrado, ms):');
    for (const x of d.perfilFn) console.log(`    ${String(x.ms).padStart(6)} ms  ${x.arquivo}`);
  }
  if (d.perf.measures?.length) console.log(`  measures: ${d.perf.measures.map((x) => `${x.nome}@${x.t}+${x.dur}`).join(' ')}`);
}

if (JSON_OUT) {
  mkdirSync(dirname(JSON_OUT), { recursive: true });
  writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, quando: new Date().toISOString(), reps: REPS, patch: PATCH ? PATCHADOS : null, aquecido: AQUECIDO, consentimento: CONSENT, resultados }, null, 2));
  console.log(`\njson: ${JSON_OUT}`);
}
