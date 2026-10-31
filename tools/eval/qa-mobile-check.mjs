#!/usr/bin/env node
/* ============================================================================
   qa-mobile-check.mjs — O HARNESS DE QA MOBILE MEDE DE VERDADE, E SÓ QUANDO CHAMADO?
   ----------------------------------------------------------------------------
   O CASO: o app de loja é uma WebView apontada para a produção e recebe vários
   deploys por dia sem revisão de loja; não havia NENHUMA medição automatizada de
   gameplay nem de custo gráfico em aparelho. O `public/js/qa-mobile.js` roda um
   roteiro determinístico de ~20 s pelos eventos de toque do HUD e devolve um
   relatório. Esta régua prova que o relatório é medição e não carimbo — e que o
   harness não existe para quem está só jogando.

   O QUE MEDE (Chrome real, contexto Pixel 5 emulado, partida de verdade):
   QAM1  o relatório existe, tem TODOS os campos obrigatórios e números plausíveis:
         FPS p50 > 0, duração perto do roteiro declarado, draw calls > 0, degrau e
         DPR presentes, identificação com mapa/modo/VERSION/userAgent;
   QAM2  o roteiro MEXEU no jogo: munição caiu com o gatilho de toque E o ângulo da
         câmera mudou com o arraste. Relatório sem prova de interação é carimbo;
   QAM3  nenhum erro de JS nem rejeição durante o roteiro — nem pelo contador do
         harness, nem pelo `pageerror` do navegador;
   QAM4  CUSTO ZERO: a mesma partida SEM `?qa=mobile` nunca publica
         `window.__CS_QA_RESULT__` e nunca baixa `/js/qa-mobile.js`.

   MUTANTE `roteiro-mudo`: o dispatch de toque vira no-op. O relatório continua
   saindo bonitinho (QAM1/QAM3/QAM4 seguem verdes) e QAM2 tem que acender — é o
   que separa "mediu" de "preencheu campos".

   Uso: node tools/eval/qa-mobile-check.mjs [--base=URL] [--porta=9312] [--mutante=roteiro-mudo]
        BASE=http://127.0.0.1:9312 também serve. Sem BASE externa, sobe e derruba
        o `tools/eval/serve.mjs` sozinho.
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '9312';
const BASE_EXTERNA = arg('base') || process.env.BASE;
const BASE = BASE_EXTERNA || `http://127.0.0.1:${PORTA}`;
const MUTANTE = arg('mutante');
const MUTANTES = { 'roteiro-mudo': ['QAM2'] };
if (MUTANTE && !MUTANTES[MUTANTE]) throw new Error(`mutante desconhecido: ${MUTANTE} (conheço ${Object.keys(MUTANTES).join(', ')})`);

const PARTIDA = 'debug=1&economia=0&auto=E,esquerdomacho&map=praca_poderes';
const ARQUIVO_HARNESS = '/js/qa-mobile.js';
const PRAZO_LIVE_MS = 300_000;
const PRAZO_RELATORIO_MS = 120_000;
/* A sessão de controle (QAM4) só precisa provar que o harness não entrou: espera o
   mesmo `live` e mais um pedaço do roteiro, tempo de sobra para um import solto aparecer. */
const JANELA_CONTROLE_MS = 25_000;

const fonteHarness = readFileSync(new URL('../../public/js/qa-mobile.js', import.meta.url), 'utf8');
const fonteGlcontext = readFileSync(new URL('../../public/js/glcontext.js', import.meta.url), 'utf8');

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const devices = pw.devices || pw.default?.devices;

const servidor = BASE_EXTERNA ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 80 && !pronto; i++) {
    try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);
}

const falhas = [];
const cobra = (clausula, condicao, mensagem) => {
  if (condicao) console.log(`  ok   ${clausula} · ${mensagem}`);
  else { falhas.push(`${clausula} ${mensagem}`); console.log(`  FALHA ${clausula} · ${mensagem}`); }
};

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}),
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function abreContexto() {
  /* Deitado, e não o retrato padrão do Pixel 5: no celular o jogo trava a orientação em paisagem
     (app.json do shell, screen.orientation.lock no main.js) e o #touch-ui só existe assim. Em
     retrato o roteiro tocava no vazio e o relatório saía completo com zero interação — carimbo. */
  const ctx = await browser.newContext({
    ...devices['Pixel 5'],
    viewport: { width: 780, height: 360 },
    screen: { width: 780, height: 360 },
  });
  await ctx.addInitScript(() => {
    try { localStorage.clear(); localStorage.setItem('awpbr_nick', 'QA'); } catch { /* aba anônima */ }
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 8 });
  });
  return ctx;
}

/* O runner desenha em SwiftShader; sem este remendo o jogo acha que está num
   renderizador por software e troca de perfil, medindo outra coisa (mesma fixture
   do perfil-mobile-browser.mjs). */
async function fixaGpu(page) {
  await page.route('**/js/glcontext.js*', async (route) => {
    const trocado = fonteGlcontext.replaceAll('SOFTWARE_RE.test(gpu)', 'false')
      .replace('renderer: gpu.slice(0, 120),', "renderer: 'Test Mobile GPU',");
    if (trocado === fonteGlcontext) throw new Error('fixture de GPU hardware não aplicou');
    await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: trocado });
  });
}

async function aplicaMutante(page) {
  if (MUTANTE !== 'roteiro-mudo') return;
  await page.route('**/js/qa-mobile.js*', async (route) => {
    const alvo = 'function toque(tipo, alvo, x, y, dedo) {';
    if (!fonteHarness.includes(alvo)) throw new Error('mutante roteiro-mudo não achou o dispatch de toque');
    const trocado = fonteHarness.replace(alvo, `${alvo} if (dedo) return;`);
    await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: trocado });
  });
}

/* O `serve.mjs` serve a página pelo Astro em modo dev, e a barra de ferramentas do
   dev server tem módulo próprio que às vezes não resolve sob emulação. Esse barulho
   só existe no servidor local (`/.astro/`, `@vite`): em produção não há nenhum deles,
   então o filtro não esconde nada do jogo. */
const RUIDO_DEV = /\/\.astro\/|@vite|dev-toolbar|@id\/|vite\/dist/;
function vigiaPagina(page) {
  const erros = [];
  const pedidosHarness = [];
  page.on('pageerror', (erro) => {
    const texto = String(erro?.message || erro).slice(0, 200);
    if (!RUIDO_DEV.test(texto)) erros.push(texto);
  });
  page.on('request', (req) => { if (new URL(req.url()).pathname === ARQUIVO_HARNESS) pedidosHarness.push(req.url()); });
  return { erros, pedidosHarness };
}

/* ---------------- sessão de QA: ?qa=mobile ---------------- */
const qaCtx = await abreContexto();
const qaPage = await qaCtx.newPage();
await fixaGpu(qaPage);
await aplicaMutante(qaPage);
const qaVigia = vigiaPagina(qaPage);
await qaPage.goto(`${BASE}/?qa=mobile&${PARTIDA}`, { waitUntil: 'commit', timeout: 60_000 });
await qaPage.waitForFunction(() => window.__game?.state === 'live', null, { timeout: PRAZO_LIVE_MS });
await qaPage.waitForFunction(() => !!window.__CS_QA_RESULT__, null, { timeout: PRAZO_RELATORIO_MS });
const rel = await qaPage.evaluate(() => window.__CS_QA_RESULT__);
await qaCtx.close();

console.log(`\n· o relatório do harness (${BASE}/?qa=mobile&${PARTIDA})`);
console.log(`  ${JSON.stringify(rel)}`);

// QAM1 · campos obrigatórios preenchidos com número plausível
const faltando = [];
const exige = (caminho, valido) => {
  const valor = caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), rel);
  if (!valido(valor)) faltando.push(`${caminho}=${JSON.stringify(valor)}`);
};
const positivo = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const naoNegativo = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const texto = (v) => typeof v === 'string' && v.length > 0;
exige('fps.p50', positivo);
exige('fps.p5', positivo);
exige('fps.travadas', naoNegativo);
exige('escada.inicial', naoNegativo);
exige('escada.final', naoNegativo);
exige('render.dpr', positivo);
exige('render.drawCalls', positivo);
exige('render.triangulos', positivo);
exige('render.quadros', positivo);
exige('erros.js', naoNegativo);
exige('erros.rejeicoes', naoNegativo);
exige('duracaoMs', positivo);
exige('identificacao.mapa', texto);
exige('identificacao.modo', texto);
exige('identificacao.versao', texto);
exige('identificacao.userAgent', texto);
const roteiroMs = rel?.roteiroMs ?? 0;
/* Prazo absoluto por passo mantém o roteiro colado nos 20 s, e o piso de 95% é o que
   pega alguém encurtando a tabela. O teto é frouxo de propósito: medido entre 20,0 s e
   22,6 s sob SwiftShader a 13 FPS, onde o último passo ainda derrapa. */
const duracaoOk = positivo(rel?.duracaoMs) && rel.duracaoMs >= roteiroMs * 0.95 && rel.duracaoMs <= roteiroMs * 1.6;
cobra('QAM1', faltando.length === 0 && duracaoOk && !rel?.falhas?.length,
  faltando.length || !duracaoOk || rel?.falhas?.length
    ? `relatório incompleto: ${[...faltando, ...(duracaoOk ? [] : [`duracaoMs=${rel?.duracaoMs} contra roteiro ${roteiroMs}`]), ...(rel?.falhas || [])].join(', ')}`
    : `relatório completo: fps p50=${rel.fps.p50} p5=${rel.fps.p5} travadas=${rel.fps.travadas}; degrau ${rel.escada.inicial}→${rel.escada.final}; dpr ${rel.render.dpr}; ${rel.render.drawCalls} draw calls e ${rel.render.triangulos} triângulos por quadro em ${rel.render.quadros} quadros desenhados; ${rel.duracaoMs} ms de roteiro (${roteiroMs} ms declarados) no mapa ${rel.identificacao.mapa}/${rel.identificacao.modo} na ${rel.identificacao.versao}`);

/* QAM2 · o roteiro mexeu no jogo de verdade (a cláusula que o mutante tem que acender).
   O giro é SOMADO em módulo passo a passo: o roteiro olha para os dois lados e a
   diferença entre o início e o fim da partida se cancelaria sozinha. */
const tiros = rel?.interacao?.tiros;
const giro = rel?.interacao?.giroAcumulado ?? 0;
const mexeu = positivo(tiros) && giro >= 0.05;
cobra('QAM2', mexeu,
  `o roteiro ${mexeu ? 'mexeu' : 'NÃO mexeu'} no jogo: ${tiros} tiro(s) pelo gatilho de toque (munição ${rel?.interacao?.municaoAntes}→${rel?.interacao?.municaoDepois}) e ${giro.toFixed(3)} rad de giro acumulado da câmera; andou ${rel?.interacao?.deltaPos} m; armas na mão ${JSON.stringify(rel?.interacao?.armas || [])}`);

// QAM3 · nenhum erro de JS durante o roteiro
const errosPagina = qaVigia.erros;
cobra('QAM3', rel?.erros?.js === 0 && rel?.erros?.rejeicoes === 0 && errosPagina.length === 0,
  rel?.erros?.js || rel?.erros?.rejeicoes || errosPagina.length
    ? `erros na partida de QA: ${rel?.erros?.js} erro(s) e ${rel?.erros?.rejeicoes} rejeição(ões) no harness; navegador: ${errosPagina.join(' | ') || 'nenhum'}; ${JSON.stringify(rel?.erros?.mensagens || [])}`
    : 'nenhum erro de JS nem rejeição durante o roteiro');

/* ---------------- sessão de controle: a MESMA partida, sem ?qa=mobile ---------------- */
const limpoCtx = await abreContexto();
const limpoPage = await limpoCtx.newPage();
await fixaGpu(limpoPage);
const limpoVigia = vigiaPagina(limpoPage);
await limpoPage.goto(`${BASE}/?${PARTIDA}`, { waitUntil: 'commit', timeout: 60_000 });
await limpoPage.waitForFunction(() => window.__game?.state === 'live', null, { timeout: PRAZO_LIVE_MS });
await limpoPage.waitForTimeout(JANELA_CONTROLE_MS);
const semHarness = await limpoPage.evaluate(() => ({
  resultado: window.__CS_QA_RESULT__ === undefined ? 'ausente' : 'PRESENTE',
  estado: window.__game?.state || null,
}));
await limpoCtx.close();
await browser.close();
servidor?.kill();

// QAM4 · custo zero para quem só quer jogar
cobra('QAM4', semHarness.resultado === 'ausente' && limpoVigia.pedidosHarness.length === 0 && semHarness.estado === 'live',
  semHarness.resultado === 'ausente' && limpoVigia.pedidosHarness.length === 0
    ? `sem ?qa=mobile a partida chegou a '${semHarness.estado}', window.__CS_QA_RESULT__ ficou ausente e ${ARQUIVO_HARNESS} não foi pedido nenhuma vez em ${JANELA_CONTROLE_MS / 1000} s`
    : `o harness vazou para a sessão normal: __CS_QA_RESULT__ ${semHarness.resultado}, ${limpoVigia.pedidosHarness.length} pedido(s) de ${ARQUIVO_HARNESS} (${limpoVigia.pedidosHarness.join(', ')})`);

/* O harness PRECISA ter sido baixado na sessão de QA: sem isso QAM4 seria verde por
   nada ter rodado em lugar nenhum, e a régua inteira viraria enfeite. */
cobra('QAM4b', qaVigia.pedidosHarness.length > 0,
  qaVigia.pedidosHarness.length
    ? `com ?qa=mobile o navegador baixou ${ARQUIVO_HARNESS} (${qaVigia.pedidosHarness.length} pedido)`
    : `com ?qa=mobile o navegador NUNCA pediu ${ARQUIVO_HARNESS} — o relatório veio de outro lugar`);

if (MUTANTE) {
  const esperadas = MUTANTES[MUTANTE];
  const acenderam = falhas.filter((f) => esperadas.some((c) => f.startsWith(c)));
  const sobras = falhas.filter((f) => !esperadas.some((c) => f.startsWith(c)));
  if (acenderam.length && !sobras.length) {
    console.log(`\nmutante ${MUTANTE} reprovado como devia (${esperadas.join(', ')}): ${acenderam.join('; ')}`);
    process.exit(0);
  }
  console.error(`\nMUTAÇÃO ${MUTANTE} NÃO FOI PEGA COMO DEVIA — acenderam ${acenderam.length ? acenderam.join('; ') : 'nenhuma cláusula'}${sobras.length ? `; acenderam fora do alvo: ${sobras.join('; ')}` : ''}`);
  process.exit(1);
}
if (falhas.length) {
  console.error(`\nREPROVADO — ${falhas.length} cláusula(s): ${falhas.join('; ')}`);
  process.exit(1);
}
console.log('\nAPROVADO — o harness de QA mobile mede o jogo e não existe para quem está só jogando.');
