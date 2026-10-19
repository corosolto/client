#!/usr/bin/env node
/* live-map-check.mjs — o /mapa real consome a projeção pública via proxy e a desenha.

   LM1  GET /api/live-map atravessa a rota same-origin do Astro até o backend fixture.
   LM2  um agregado de cidade vira exatamente um marcador no Leaflet.
   LM3  o mesmo agregado vira um item legível com cidade, partidas e rounds.
   LM4  nenhum campo nominal da fixture aparece no HTML visível.

   Uso:
     node tools/eval/live-map-check.mjs
     node tools/eval/live-map-check.mjs --mutante=sem-proxy

   O mutante atende /api/live-map no navegador, sem deixar o proxy do Astro encaminhar
   a chamada. A tela ainda pode renderizar, mas LM1 precisa ficar vermelha. */
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUTANTE = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
if (MUTANTE && MUTANTE !== 'sem-proxy') throw new Error(`mutante desconhecido: ${MUTANTE}`);

const PORTA_ASTRO = Number(process.env.LIVE_MAP_PORT || 9467);
const PORTA_FIXTURE = Number(process.env.LIVE_MAP_FIXTURE_PORT || 9468);
const BASE = `http://localhost:${PORTA_ASTRO}`;
const FIXTURE_BASE = `http://127.0.0.1:${PORTA_FIXTURE}`;
const SEGREDOS = ['NICK_NAO_PODE_APARECER', 'player-secret-42', '198.51.100.77', '-8.047612345'];
const PAYLOAD = {
  cities: [{
    city: 'Recife', country: 'BR', lat: -8.0476, lon: -34.877, matches: 3, rounds: 7,
    nick: SEGREDOS[0], player_id: SEGREDOS[1], ip: SEGREDOS[2],
    position: { lat: Number(SEGREDOS[3]), lon: -34.877012345 },
  }],
};

let encaminhados = 0;
const fixture = createServer((request, response) => {
  if (request.url === '/api/live-map' && request.method === 'GET') {
    encaminhados++;
    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
    });
    response.end(JSON.stringify(PAYLOAD));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end('{"error":"fixture_not_found"}');
});
await new Promise((resolve, reject) => {
  fixture.once('error', reject);
  fixture.listen(PORTA_FIXTURE, '127.0.0.1', resolve);
});

Object.assign(process.env, {
  PUBLIC_API_BASE: FIXTURE_BASE,
  SUPABASE_URL: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  PUBLIC_SUPABASE_URL: '',
  PUBLIC_SUPABASE_ANON_KEY: '',
});
const { dev } = await import('astro');
const astro = await dev({
  root: ROOT,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: PORTA_ASTRO },
});
const fechaServidor = (server) => new Promise((resolve) => server.close(resolve));
const paraAstro = () => astro.stop();

const falhas = [];
const cobra = (ok, mensagem) => { if (!ok) falhas.push(mensagem); };
let browser;
let mutanteAplicou = !MUTANTE;
try {
  if (!(await fetch(`${BASE}/robots.txt`)).ok) throw new Error(`Astro não respondeu em ${BASE}`);
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const erros = [];
  page.on('pageerror', (error) => erros.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (MUTANTE === 'sem-proxy' && url.origin === BASE && url.pathname === '/api/live-map') {
      mutanteAplicou = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) });
    }
    if (url.origin !== BASE) return route.abort();
    return route.continue();
  });

  const navegacao = await page.goto(`${BASE}/mapa`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(500);

  const marcadores = await page.locator('#map .leaflet-interactive').count();
  const itens = page.locator('main li').filter({ hasText: 'Recife' });
  const quantidadeItens = await itens.count();
  const textoItem = quantidadeItens ? (await itens.first().innerText()).replace(/\s+/g, ' ').trim() : '';
  const textoVisivel = (await page.locator('main').innerText()).replace(/\s+/g, ' ');

  cobra(navegacao?.status() === 200, `LM0 /mapa respondeu ${navegacao?.status() ?? 'sem resposta'}`);
  cobra(encaminhados === 1, `LM1 proxy encaminhou ${encaminhados} vez(es), esperado 1`);
  cobra(marcadores === 1, `LM2 renderizou ${marcadores} marcador(es), esperado 1 agregado de cidade`);
  cobra(quantidadeItens === 1, `LM3 renderizou ${quantidadeItens} item(ns) de cidade para Recife, esperado 1`);
  cobra(/3\s+partidas?/i.test(textoItem) && /7\s+rounds?/i.test(textoItem), `LM3 item não expõe partidas/rounds: "${textoItem}"`);
  cobra(!SEGREDOS.some((segredo) => textoVisivel.includes(segredo)), 'LM4 campo nominal ou posição exata apareceu na página');
  cobra(erros.length === 0, `LM0 erro(s) de página: ${erros.join(' | ')}`);
} catch (error) {
  falhas.push(`LM0 instrumento: ${error.message}`);
} finally {
  await browser?.close().catch(() => {});
  await Promise.race([paraAstro(), new Promise((resolve) => setTimeout(resolve, 3_000))]);
  await fechaServidor(fixture);
}

if (!mutanteAplicou) falhas.push(`MUTAÇÃO '${MUTANTE}' não aplicou`);
for (const falha of falhas) console.error(`  ✗ ${falha}`);
if (falhas.length) {
  console.error(`LIVE MAP CLIENTE: ${falhas.length} VERMELHA(S)${MUTANTE ? ` (mutante=${MUTANTE})` : ''}`);
  process.exit(1);
}
console.log('LIVE MAP CLIENTE: LM1–LM4 verdes — proxy, marcador, lista e privacidade observados');
process.exit(0);
