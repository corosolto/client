/* boot-orcamento-check.mjs — O QUE O JOGADOR BAIXA ANTES DE PODER JOGAR.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO QUE COMPROU ESTA RÉGUA (medido em 25/10/2026, contra produção)

   O painel do dono mostrava "24/10: chegaram 173, jogaram 3". Medindo o boot real da
   home de desktop contra `https://www.csbrasil.online` (v2.1.0-alpha.123, cache frio,
   `tools/medir-boot.mjs --cenario=desktop-cabo --repeticoes=3`), o que o navegador
   baixa ANTES de a splash liberar a entrada:

     16,07 MB em 409 requisições, dos quais
       4.870 KB (30%)  posters/*          — pool INTEIRO de cartazes, 24 arquivos
       4.083 KB (25%)  models/props/*     — cenário do lobby (é o que o portão espera)
       2.568 KB (16%)  img/decals/*       — grafite das empenas
       1.588 KB (10%)  models/ambient/*   — fauna decorativa

   Duas coisas ali eram pedágio, e nenhuma delas muda um pixel do que o jogador vê:

     · O pool de cartazes descia INTEIRO porque `T.posterImgs` era
       `POSTER_FILES.map(load)` — o custo não seguia o uso. Instrumentando o getter com
       um stack (`tools/sonda-cartazes.mjs`), o lobby medido (Piscinão, `buildPoolDay`)
       lê 25 cartazes de verdade: cartaz é CONTEÚDO. Mas o pool é global e o lobby é
       por sessão (`mapaDaSessao`): quem cola seis cartazes pagava vinte e quatro.
     · A fauna era pedida EM PARALELO com os props, disputando banda com exatamente o
       que segura o portão — apesar de a cena só ser reconstruída com ela DEPOIS que os
       props terminam. Ela nunca aparecia antes, e atrapalhava assim mesmo.

   Depois dos dois cortes, no mesmo cenário e no mesmo dia: 13,29 MB em 358 req
   (−2.721 KB, −16,7%); em 4G rápido, 23,30 s → 21,10 s até jogável.

   POR QUE NENHUM PORTÃO EXISTENTE PEGOU
     · `eval:glbpeso`     — pesa GLB no disco, um a um; não sabe quantos o boot pede.
     · `eval:assetfetch`  — confere que o asset RESPONDE, não quanto ele custa.
     · `eval:edgecache`   — mede cache do edge, não volume de boot.
     · `eval:perfilmobile`— orçamento de QUADRO (draw calls, memória), depois de entrar.
     · `eval:boot`        — pergunta se o jogo ABRE. Abria: em 16 MB e 11 s.
   Nenhum media o custo do CAMINHO ATÉ O JOGÁVEL, que é onde o funil perde gente.

   O QUE ELA MEDE (no navegador, na rota real `/`, com os arquivos DESTA árvore
   servidos por cima do host — mesma CDN, mesmo HTML, mesmo import map)
     ORC1 · bytes que terminam de baixar antes de `#splash-enter` sair do `.hidden`
            ficam sob o teto. Os arquivos servidos do disco saem da conta DOS DOIS
            LADOS: `fulfill` não comprime e a CDN comprime, e comparar compressão com
            asset não é comparar nada.
     ORC2 · DIFERENCIAL, sem número mágico: a árvore candidata baixa ESTRITAMENTE menos
            arquivos de `posters/` que a mesma árvore com o pool ansioso. É a prova de
            que o custo segue o uso, e ela se recalibra sozinha quando o lobby muda de
            mapa — que é justamente o que um teto fixo de contagem não faz.
     ORC3 · nenhum `models/ambient/*` (fauna) é PEDIDO antes de o último
            `models/props/*` (cenário) ter TERMINADO. Ordem de prioridade, não volume.

   A MUTAÇÃO QUE A DEIXA VERMELHA (executada; mutação em MEMÓRIA, disco intacto)
     --mutante=cartaz-ansioso  devolve `T.posterImgs` ao `POSTER_FILES.map(_cartaz)`:
                               candidato e referência ficam IGUAIS -> ORC2 (e ORC1).
     --mutante=fauna-cedo      devolve o `preloadAmbientLife` para o paralelo -> ORC3.

   NÃO ESCREVE NO FUNIL. O `cs_privacy` entra com `analytics:false` de propósito: um
   portão de browser que roda a cada PR é exatamente o tipo de sessão que inflava o
   `land` do painel (24/10: 167 das 173 chegadas tinham `cohort='automacao'`).

   USO
     node tools/eval/boot-orcamento-check.mjs
     node tools/eval/boot-orcamento-check.mjs --mutante=cartaz-ansioso
     node tools/eval/boot-orcamento-check.mjs --base=http://127.0.0.1:9123
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('='); return v === '' || v === undefined ? d : v; };
const MUTANTE = val('mutante', '');
const BASE = val('base', process.env.BASE || 'https://www.csbrasil.online');
const MUTANTES = new Set(['', 'cartaz-ansioso', 'fauna-cedo']);
if (!MUTANTES.has(MUTANTE)) {
  console.error(`mutante desconhecido: ${MUTANTE}\nconhecidos: ${[...MUTANTES].filter(Boolean).join(', ')}`);
  process.exit(2);
}

/* TETO. Cinco passadas frias sobre o origin/main em 28/10 mediram 6,32–7,38 MiB e
   302–314 requisições no mesmo código, variando com a compressão e o edge da CDN.
   O teto deixa 5,9% sobre o maior valor observado; ainda reprova o pool ansioso,
   medido em 10,56 MiB, e a contagem continua com folga de só 26 requisições.
   Mexer no teto exige uma nova série fria e o intervalo medido no commit. */
const TETO_BYTES = 8_200_000;
const TETO_REQS = 340;

const JS_LOCAIS = ['js/main.js', 'js/client-id.js', 'js/textures.js', 'js/maps.js', 'js/audio.js', 'js/data/javaporcos_audio.js', 'js/javaporcos_equipe.js', 'js/javaporcos_intro.js', 'js/javaporcos_opcoes.js', 'js/javaporcos_apresentacao.js'];
/* O pool ansioso é a REFERÊNCIA do ORC2, e também o mutante. A mesma transformação
   serve aos dois papéis de propósito: se ela parar de casar com o código, o portão
   morre barulhento (`throw`) em vez de passar em silêncio. */
const ANSIOSO = /( {2})T\.posterImgs = \[\];\n {2}POSTER_FILES\.forEach\(\(\[f\], i\) => \{[\s\S]*?\n {2}\}\);\n/;
function poolAnsioso(corpo) {
  if (!ANSIOSO.test(corpo)) throw new Error('não achei o bloco de getters de T.posterImgs em textures.js');
  return corpo.replace(ANSIOSO, '  T.posterImgs = POSTER_FILES.map(([f]) => _cartaz(f));\n');
}
/* Ancorado em NOME, não em número de linha: a ordem do boot já mudou antes e cegou
   régua ancorada em posição. */
const FAUNA_ADIADA = '      preloadAmbientLife(mapa.ambience || []).then(rebuildCurrent).catch(() => {});\n';
function faunaCedo(corpo) {
  if (!corpo.includes(FAUNA_ADIADA)) throw new Error('não achei a chamada adiada de preloadAmbientLife em main.js');
  return corpo
    .replace(FAUNA_ADIADA, '')
    .replace('    return propsReady.then(() => {', `    preloadAmbientLife(mapa.ambience || []).then(rebuildCurrent).catch(() => {});\n    return propsReady.then(() => {`);
}
const SPLASH_READY = 'function _splashSetReady() {';
function instrumentaCausaSplash(corpo) {
  if (!corpo.includes(SPLASH_READY)) throw new Error('não achei _splashSetReady em main.js');
  return corpo.replace(SPLASH_READY, `${SPLASH_READY}\n  window.__csSplashCause ||= _splashPorFailsafe ? 'failsafe' : 'assets';`);
}

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

/* SwiftShader forçado no M4 consumia o mesmo CPU da aplicação: 88–150 s até o portão
   e quedas no failsafe. Com o backend padrão do Chrome: 1,6–1,8 s. No runner Linux
   sem GPU, mantém o software GL explícito. */
const softwareGLArgs = process.platform === 'darwin'
  ? []
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [...softwareGLArgs, '--headless=new', '--mute-audio', '--disable-dev-shm-usage'],
});

/* `refPoolAnsioso` liga a referência do ORC2; o mutante `cartaz-ansioso` liga a MESMA
   coisa no candidato, e aí os dois lados empatam e o portão fica vermelho. */
async function mede({ refPoolAnsioso = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    try { localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: false, updatedAt: new Date(0).toISOString() })); } catch {}
    /* Lobby FIXO: sem isto `mapaDaSessao` roda a fila a cada visita (maps.js:268) e as
       duas passadas do ORC2 comparariam CENAS diferentes. `mapPinned` é o mesmo campo
       que o carrossel grava quando o jogador escolhe — não é porta de teste. */
    try { localStorage.setItem('awpbr_settings', JSON.stringify({ map: 'praca_poderes', mapPinned: true })); } catch {}
  });
  for (const rel of JS_LOCAIS) {
    let corpo = readFileSync(new URL(`../../public/${rel}`, import.meta.url), 'utf8');
    if (rel === 'js/textures.js' && (refPoolAnsioso || MUTANTE === 'cartaz-ansioso')) corpo = poolAnsioso(corpo);
    if (rel === 'js/main.js') {
      if (MUTANTE === 'fauna-cedo') corpo = faunaCedo(corpo);
      corpo = instrumentaCausaSplash(corpo);
    }
    await context.route(`**/${rel}*`, async (rota) => {
      await rota.fulfill({ status: 200, contentType: 'text/javascript', body: corpo });
    });
  }

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');

  const reqs = new Map();
  const t0 = Date.now();
  cdp.on('Network.requestWillBeSent', (e) => {
    reqs.set(e.requestId, { url: e.request.url, inicio: Date.now() - t0, fim: null, bytes: 0 });
  });
  const fecha = (e) => {
    const r = reqs.get(e.requestId); if (!r) return;
    r.bytes = e.encodedDataLength || 0; r.fim = Date.now() - t0;
  };
  cdp.on('Network.loadingFinished', fecha);
  cdp.on('Network.loadingFailed', fecha);

  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(BASE, { waitUntil: 'commit', timeout: 180000 });
  await page.evaluate(() => {
    window.__csPortao = null;
    const marca = () => {
      const se = document.getElementById('splash-enter');
      if (se && !se.classList.contains('hidden')) { window.__csPortao = performance.now(); return; }
      setTimeout(marca, 25);
    };
    marca();
  });
  const portao = await page.waitForFunction(() => window.__csPortao, null, { timeout: 180000, polling: 100 })
    .then((h) => h.jsonValue()).catch(() => null);
  if (portao === null) {
    const estado = await page.evaluate(() => {
      const splash = document.getElementById('splash-enter');
      return {
        readyState: document.readyState,
        splash: splash?.className || null,
        href: location.href,
      };
    }).catch(() => null);
    const pendentes = [...reqs.values()]
      .filter((r) => r.fim === null)
      .slice(-8)
      .map((r) => r.url);
    throw new Error(`a splash não liberou a entrada em 180 s; estado=${JSON.stringify(estado)}; pendentes=${pendentes.join(', ') || 'nenhum'}; erros=${erros.join(' | ') || 'nenhum'}`);
  }
  const causa = await page.evaluate(() => window.__csSplashCause || null);
  /* O instante absoluto varia com CPU, GPU e CDP. A própria função de produção sabe
     se o primeiro desbloqueio veio dos assets ou do timer, então a régua carimba essa
     causa na cópia de main.js servida só neste navegador. A decisão fica no candidato:
     a referência deliberadamente pesada pode cair no failsafe sem invalidar a contagem. */
  const ate = [...reqs.values()].filter((r) => r.fim !== null && r.fim <= portao + 50);
  const patchado = (u) => JS_LOCAIS.some((p) => u.includes(p));
  const resultado = {
    portao,
    causa,
    bytes: ate.reduce((s, r) => s + (patchado(r.url) ? 0 : r.bytes), 0),
    reqs: ate.length,
    cartazes: new Set(ate.filter((r) => /\/posters\//.test(r.url)).map((r) => r.url.split('?')[0])).size,
    ultimoProp: Math.max(-1, ...ate.filter((r) => /\/models\/props\//.test(r.url)).map((r) => r.fim)),
    primeiraFauna: Math.min(Infinity, ...[...reqs.values()].filter((r) => /\/models\/ambient\//.test(r.url)).map((r) => r.inicio)),
    erros,
  };
  await context.close();
  return resultado;
}

let saida = 1;
try {
  const cand = await mede();
  const ref = await mede({ refPoolAnsioso: true });

  const ok = {
    READY: cand.causa === 'assets',
    ORC1: cand.bytes <= TETO_BYTES && cand.reqs <= TETO_REQS,
    ORC2: cand.cartazes < ref.cartazes,
    /* Sem props no lobby o ORC3 não tem o que ordenar; sem fauna ele passaria de graça.
       Os dois casos são falha: o mapa do lobby TEM as duas coisas, e portão que passa
       porque não achou o que medir é pior que portão nenhum. */
    ORC3: cand.ultimoProp > 0 && Number.isFinite(cand.primeiraFauna) && cand.primeiraFauna >= cand.ultimoProp,
  };

  console.log(`base      ${BASE}${MUTANTE ? `  (mutante=${MUTANTE})` : ''}`);
  console.log(`portão    splash liberou em ${Math.round(cand.portao)} ms por ${cand.causa}`);
  console.log(`READY     caminho dos assets  ${ok.READY ? 'ok' : 'FALHA'}`);
  console.log(`ORC1      ${(cand.bytes / 1048576).toFixed(2)} MB em ${cand.reqs} req  (teto ${(TETO_BYTES / 1048576).toFixed(2)} MB / ${TETO_REQS} req)  ${ok.ORC1 ? 'ok' : 'FALHA'}`);
  console.log(`ORC2      ${cand.cartazes} cartaz(es) sob demanda vs ${ref.cartazes} com o pool ansioso  ${ok.ORC2 ? 'ok' : 'FALHA'}`);
  console.log(`ORC3      último prop em ${cand.ultimoProp} ms, 1ª fauna pedida em ${Number.isFinite(cand.primeiraFauna) ? cand.primeiraFauna : '—'} ms  ${ok.ORC3 ? 'ok' : 'FALHA'}`);
  const erros = [...cand.erros, ...ref.erros];
  if (erros.length) console.log(`erros de página: ${erros.join(' | ')}`);

  const falhas = Object.entries(ok).filter(([, v]) => !v).map(([k]) => k);
  if (erros.length) falhas.push('pageerror');
  /* Convenção do repo (perfil-mobile-check): COM mutante, a régua passa quando a
     mutação foi VISTA. Mutação que escapa é o único resultado inaceitável. */
  if (MUTANTE) {
    if (falhas.length) { console.log(`\nmutante ${MUTANTE} reprovado como devia: ${falhas.join(', ')}`); saida = 0; }
    else console.error(`\nMUTAÇÃO PASSOU — ${MUTANTE} não foi visto pela régua.`);
  } else if (falhas.length) {
    console.error(`\n✗ orçamento de boot estourado: ${falhas.join(', ')}`);
  } else {
    console.log('\n✓ orçamento de boot dentro do teto');
    saida = 0;
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
} finally {
  await browser.close().catch(() => {});
}
process.exit(saida);
