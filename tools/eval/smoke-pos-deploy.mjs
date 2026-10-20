#!/usr/bin/env node
/* ============================================================================
   smoke-pos-deploy.mjs — O QUE ACABOU DE SUBIR AINDA JOGA?
   ----------------------------------------------------------------------------
   O CASO: o app de loja é uma WebView apontada para a produção, e a produção
   recebe vários deploys por dia sem revisão de loja. Entre o deploy e o primeiro
   jogador reclamando não havia NADA olhando. Este é o gate de DEPOIS do deploy:
   abre uma partida de verdade no endereço publicado, espera ela ficar viva,
   assiste ~15 s e reprova se o jogo não abriu, quebrou no console ou não desenhou.

   É de propósito curto e burro: não baixa dependência, não escreve UM BYTE no
   repositório (nem captura, nem relatório) e termina em menos de 2 min. Não é
   régua de qualidade — é alarme de incêndio.

   CLÁUSULAS (uma linha impressa por cláusula):
     SPD1  a partida chegou a `live` dentro do prazo;
     SPD2  nenhum erro de console/pageerror que seja NOSSO (rede de terceiro —
           analytics, anúncio, fonte externa — é ruído conhecido, não é o deploy);
     SPD3  o jogo desenhou: quadros contados no aparelho e draw calls > 0.

   Uso: node tools/eval/smoke-pos-deploy.mjs [--base=https://www.csbrasil.online]
                                             [--mapa=praca_poderes] [--desktop]
        BASE=… também serve. Por padrão mede em Pixel 5 emulado, que é a cara do
        app de loja; `--desktop` troca para 1280×720.
   ============================================================================ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const BASE = (arg('base') || process.env.BASE || 'https://www.csbrasil.online').replace(/\/+$/, '');
const MAPA = arg('mapa') || 'praca_poderes';
const DESKTOP = process.argv.includes('--desktop');
const PRAZO_LIVE_MS = Number(arg('prazo')) || 90_000;
const JANELA_MS = Number(arg('janela')) || 15_000;
const HOST_DO_JOGO = new URL(BASE).host;
/* Ensaio: rodar o gate contra o `tools/eval/serve.mjs` para provar que ele funciona.
   Só nesse caso existe ruído ESTRUTURAL do ambiente — e ele some contra produção. */
const ENSAIO_LOCAL = /^(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])$/.test(new URL(BASE).hostname);

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const devices = pw.devices || pw.default?.devices;

/* Ruído conhecido de rede de terceiro. Reprovar o deploy porque o bloqueador de
   anúncio do runner cortou o script de analytics é alarme falso — e alarme falso
   repetido vira alarme ignorado. */
const TERCEIROS = /vercel|vitals|insights|googletagmanager|google-analytics|doubleclick|gstatic|facebook|clarity|sentry|hotjar|adsbygoogle/i;
const RUIDO_REDE = /Failed to load resource|net::ERR_|ERR_BLOCKED_BY_CLIENT|ERR_INTERNET_DISCONNECTED|favicon/i;
/* Ruído que SÓ existe no ensaio local: barra do Astro e HMR do Vite (`/.astro/`,
   `@vite`, WebSocket em ws://) não existem no site publicado, e o CORS do backend
   recusa `127.0.0.1` de propósito — a allowlist dele é de produção. Contra produção
   NADA disto é filtrado: CORS quebrado depois de um deploy é exatamente o que este
   gate existe para pegar. */
const RUIDO_LOCAL = /\/\.astro\/|@vite|\[vite\]|dev-toolbar|@id\/|vite\/dist|WebSocket connection to 'ws:|blocked by CORS policy/;
const nosso = (texto) => {
  if (TERCEIROS.test(texto)) return false;
  if (ENSAIO_LOCAL && RUIDO_LOCAL.test(texto)) return false;
  // erro de carga de recurso só conta quando o recurso é do NOSSO host
  if (RUIDO_REDE.test(texto)) return texto.includes(HOST_DO_JOGO);
  return true;
};

const linhas = [];
const falhas = [];
const cobra = (clausula, ok, mensagem) => {
  linhas.push(`  ${ok ? 'ok   ' : 'FALHA'} ${clausula} · ${mensagem}`);
  if (!ok) falhas.push(clausula);
};

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}),
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext(DESKTOP
  ? { viewport: { width: 1280, height: 720 } }
  : { ...devices['Pixel 5'] });
const page = await ctx.newPage();

const barulho = [];
page.on('pageerror', (erro) => barulho.push(`pageerror: ${String(erro?.message || erro).slice(0, 240)}`));
page.on('console', (msg) => { if (msg.type() === 'error') barulho.push(`console: ${msg.text().slice(0, 240)}`); });
page.on('requestfailed', (req) => barulho.push(`requestfailed: ${req.url().slice(0, 200)} ${req.failure()?.errorText || ''}`));

const url = `${BASE}/?debug=1&auto=E,esquerdomacho&map=${MAPA}`;
let viva = false;
try {
  await page.goto(url, { waitUntil: 'commit', timeout: 60_000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: PRAZO_LIVE_MS });
  viva = true;
} catch { /* o prazo estourou: SPD1 conta a história */ }
cobra('SPD1', viva, viva
  ? `partida viva em ${url} (contexto ${DESKTOP ? 'desktop 1280×720' : 'Pixel 5'})`
  : `a partida NÃO chegou a 'live' em ${PRAZO_LIVE_MS / 1000} s em ${url}`);

/* Conta quadros no próprio aparelho: independe de consentimento de analytics e do
   ops.js, que é o que o jogador de verdade pode ter desligado.
   DRAW CALLS: ler `renderer.info.render` num rAF qualquer devolve ZERO, e não é
   defeito do three — na qualidade baixa o game.js desenha o mundo e DEPOIS o
   viewmodel numa segunda `renderer.render`, e o `autoReset` zera os contadores no
   início de cada uma. Sobra a passada do viewmodel, que pode ser 0. Então desliga o
   autoReset, deixa ACUMULAR a janela inteira e divide pelos quadros que o jogo
   realmente desenhou (`game._rafFrames`). No fim devolve o autoReset como estava. */
let medida = { quadros: 0, desenhados: 0, segundos: 0, drawCalls: 0, triangulos: 0, estado: null, fpsOps: null };
if (viva) {
  medida = await page.evaluate(async (janelaMs) => {
    const renderer = window.__escada?.renderer;
    const info = renderer?.info;
    const autoResetAntes = info ? info.autoReset : null;
    const desenhadosAntes = window.__game?._rafFrames || 0;
    if (info) { info.autoReset = false; info.reset(); }
    const inicio = performance.now();
    let quadros = 0;
    await new Promise((pronto) => {
      const passo = () => {
        quadros++;
        if (performance.now() - inicio >= janelaMs) pronto();
        else requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
    const desenhados = Math.max(1, (window.__game?._rafFrames || 0) - desenhadosAntes);
    const calls = info ? info.render.calls : 0;
    const tri = info ? info.render.triangles : 0;
    if (info) { info.autoReset = autoResetAntes; info.reset(); }
    const ops = (() => { try { return window.__csbOps?.resumo?.().fps || null; } catch { return null; } })();
    return {
      quadros,
      desenhados,
      segundos: Number(((performance.now() - inicio) / 1000).toFixed(2)),
      drawCalls: Math.round(calls / desenhados),
      triangulos: Math.round(tri / desenhados),
      estado: window.__game?.state || null,
      fpsOps: ops && ops.amostras ? `p50=${ops.p50} p5=${ops.p5} travadas=${ops.travadas}` : null,
    };
  }, JANELA_MS);
}

const meus = barulho.filter(nosso);
cobra('SPD2', viva && meus.length === 0, meus.length
  ? `${meus.length} erro(s) nosso(s) no console: ${meus.slice(0, 5).join(' | ')}`
  : `console limpo (${barulho.length - meus.length} ruído(s) ignorado(s) de terceiro${ENSAIO_LOCAL ? ' e do servidor de desenvolvimento' : ''})`);

const fps = medida.segundos ? (medida.desenhados / medida.segundos) : 0;
const desenhou = viva && medida.desenhados > 0 && medida.drawCalls > 0;
cobra('SPD3', desenhou, desenhou
  ? `desenhou ${medida.desenhados} quadros em ${medida.segundos}s (${fps.toFixed(1)} FPS), ${medida.drawCalls} draw calls e ${medida.triangulos} triângulos por quadro; estado '${medida.estado}'${medida.fpsOps ? `; ops ${medida.fpsOps}` : ''}`
  : `o jogo NÃO desenhou: ${medida.desenhados} quadro(s) desenhado(s) em ${medida.quadros} rAF, ${medida.drawCalls} draw calls, estado '${medida.estado}'`);

await ctx.close();
await browser.close();

console.log(`\nsmoke pós-deploy · ${BASE}${ENSAIO_LOCAL ? ' (ENSAIO LOCAL: ruído do servidor de desenvolvimento e CORS do backend ficam de fora)' : ''}`);
for (const linha of linhas) console.log(linha);
if (falhas.length) {
  console.error(`\nREPROVADO — ${falhas.join(', ')}. O que subiu não está jogável; considere reverter.`);
  process.exit(1);
}
console.log('\nAPROVADO — o que está no ar abre, roda e desenha.');
