/* ============================================================================
   geo-proxy-check.mjs — A GEO DO JOGADOR CHEGA AO BACKEND (backend#22)
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Desde 30/08/2026 o jogo manda as rotas de banco direto ao Cloud Run
   (run.app, sem Cloudflare nem Vercel na frente). O `geoFrom` do backend só lê
   headers de borda, então city_daily congelou em 2026-08-30T02:41:50Z e 88,9%
   das linhas de presença ficaram sem geo — com as rotas respondendo 200. Nada
   no repositório reprovava isso: a régua de APIs cobrava o DESTINO, não se o
   destino tinha como saber de onde o jogador vem.

   O QUE COBRA
     GP1 em produção, as rotas que gravam geo/IP (VIA_SITE) vão pelo proxy
         same-origin; as outras migradas continuam indo direto ao backend
     GP2 `?api=` (backend local/alternativo) continua valendo para todas
     GP3 toda rota VIA_SITE existe no proxy do site (senão 404)
     GP4 salto da Cloudflare: IP = cf-connecting-ip, geo = cf-* (cidade em UTF-8
         codificada); x-vercel-ip-* NÃO sobe (descreve o PoP)
     GP5 salto fora da Cloudflare: geo = x-vercel-ip-*; cf-* e cf-connecting-ip
         forjados NÃO sobem
     GP6 o segredo da env API_PROXY_SECRET sobe como x-csb-proxy-auth, e só ele
     GP7 main.js manda telemetry/presence/heartbeat/submit-match/perf por apiUrl
     GP8 o fetch do proxy tem prazo (backend pendurado não segura a função)

   Mutantes: --mutante=geo-direto | pop-como-cidade | cf-forjado | sem-segredo
             | rota-fora-do-proxy | fetch-cru | sem-prazo
   Uso: node tools/eval/geo-proxy-check.mjs [--mutante=...]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['geo-direto', 'pop-como-cidade', 'cf-forjado', 'sem-segredo', 'rota-fora-do-proxy', 'fetch-cru', 'sem-prazo'];
if (mut && !MUTANTES.includes(mut)) throw new Error(`mutante desconhecido: ${mut}`);
const muta = (fonte, de, para) => {
  const novo = fonte.replace(de, para);
  if (novo === fonte) throw new Error(`MUTANTE NAO APLICOU: ${mut}`);
  return novo;
};

let jogo = readFileSync('public/js/apibase.js', 'utf8');
let proxy = readFileSync('src/lib/api-proxy.mjs', 'utf8');
let rota = readFileSync('src/pages/api/[rota].ts', 'utf8');
let main = readFileSync('public/js/main.js', 'utf8');
if (mut === 'geo-direto') jogo = muta(jogo, "if (VIA_SITE.has(nome) && !forcado) return caminho;", '');
if (mut === 'pop-como-cidade') proxy = muta(proxy, 'if (saltoDaCloudflare(clientAddress)) {', 'if (false) {');
if (mut === 'cf-forjado') proxy = muta(proxy, 'if (saltoDaCloudflare(clientAddress)) {', "if (request.headers.has('cf-connecting-ip')) {");
if (mut === 'sem-prazo') proxy = muta(proxy, '    signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),\n', '');
if (mut === 'sem-segredo') rota = muta(rota, '{ segredo: SEGREDO }', '{}');
if (mut === 'rota-fora-do-proxy') rota = muta(rota, "'submit-match', ", '');
if (mut === 'fetch-cru') main = muta(main, "void fetch(apiUrl(path), {", "void fetch(path, {");

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const importa = (fonte) => import(`data:text/javascript;base64,${Buffer.from(fonte).toString('base64')}#${Date.now()}-${Math.random()}`);

async function comLocation(loc, fn) {
  const antes = globalThis.location;
  globalThis.location = loc;
  try { return await fn(await importa(jogo)); } finally {
    if (antes === undefined) delete globalThis.location; else globalThis.location = antes;
  }
}

const ESPERADAS = ['heartbeat', 'perf', 'presence', 'submit-match', 'telemetry'];
await comLocation({ search: '', hostname: 'www.csbrasil.online' }, async (api) => {
  const via = [...(api.ROTAS_VIA_SITE || [])].sort();
  cobra(via.join(',') === ESPERADAS.join(','), `GP1 ROTAS_VIA_SITE = [${via}] — esperado [${ESPERADAS}]`);
  for (const r of ESPERADAS) {
    const url = api.apiUrl(`/api/${r}`);
    cobra(url === `/api/${r}`, `GP1 /api/${r} em produção vai para ${url} — run.app não tem borda, a geo morre (city_daily congelado desde 30/08)`);
  }
  const direta = api.apiUrl('/api/online');
  cobra(/^https:\/\//.test(direta), `GP1 /api/online deveria continuar direto no backend (veio ${direta}) — o recorte é só das rotas de geo`);
});
await comLocation({ search: '?api=1', hostname: 'localhost' }, async (api) => {
  cobra(api.apiUrl('/api/telemetry') === 'http://localhost:8080/api/telemetry', `GP2 ?api=1 não aponta telemetry para o backend local (${api.apiUrl('/api/telemetry')})`);
});

const migradas = [...rota.slice(rota.indexOf('const MIGRADAS = new Set([')).split(']')[0].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
const fora = ESPERADAS.filter((r) => !migradas.includes(r));
cobra(fora.length === 0, `GP3 rota(s) de geo fora do proxy do site: ${fora.join(', ')} — responderiam 404`);

const { proxyApiRequest } = await importa(proxy);
let sinal;
async function sobe(headers, clientAddress, opcoes) {
  let enviados;
  await proxyApiRequest(
    new Request('https://www.csbrasil.online/api/telemetry', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' }),
    'https://backend.invalid/api/telemetry', clientAddress,
    async (_url, init) => { enviados = init.headers; sinal = init.signal; return new Response('{}', { status: 200 }); },
    opcoes,
  );
  return enviados;
}
const VERCEL_POP = { 'x-vercel-ip-country': 'US', 'x-vercel-ip-city': 'Ashburn', 'x-vercel-ip-latitude': '39.04', 'x-vercel-ip-longitude': '-77.48' };
const CF = { 'cf-connecting-ip': '201.17.0.9', 'cf-ipcountry': 'BR', 'cf-ipcity': Buffer.from('São Paulo', 'utf8').toString('latin1') };

{
  const h = await sobe({ ...VERCEL_POP, ...CF }, '172.70.1.2');
  cobra(h.get('x-csb-client-ip') === '201.17.0.9' && h.get('x-forwarded-for') === '201.17.0.9',
    `GP4 salto da Cloudflare: IP subiu como ${h.get('x-csb-client-ip')} — o rate limit (submit 1/30 s) contaria o PoP inteiro como um jogador`);
  cobra(h.get('cf-ipcountry') === 'BR' && decodeURIComponent(h.get('cf-ipcity') || '') === 'São Paulo',
    `GP4 geo da Cloudflare não subiu inteira (país=${h.get('cf-ipcountry')}, cidade=${h.get('cf-ipcity')})`);
  cobra(!h.has('x-vercel-ip-city') && !h.has('x-vercel-ip-country'),
    `GP4 x-vercel-ip-* subiu com salto da Cloudflare (${h.get('x-vercel-ip-city')}) — gravaria a cidade do PoP como se fosse do jogador`);
}
{
  const h = await sobe({ 'cf-connecting-ip': '201.17.0.9', 'cf-ipcountry': 'BR', 'cf-ipcity': 'S%C3%A3o%20Paulo' }, '172.70.1.2');
  cobra(decodeURIComponent(h.get('cf-ipcity') || '') === 'São Paulo', `GP4 cidade já codificada foi codificada de novo (${h.get('cf-ipcity')})`);
}
{
  const h = await sobe({ 'x-vercel-ip-country': 'BR', 'x-vercel-ip-city': 'Recife', ...CF }, '203.0.113.9');
  cobra(h.get('x-vercel-ip-city') === 'Recife' && h.get('x-csb-client-ip') === '203.0.113.9',
    `GP5 salto direto na Vercel perdeu a geo/IP da Vercel (cidade=${h.get('x-vercel-ip-city')}, ip=${h.get('x-csb-client-ip')})`);
  cobra(!h.has('cf-ipcountry') && !h.has('cf-ipcity') && h.get('x-forwarded-for') === '203.0.113.9',
    'GP5 cf-* forjado por quem não passou pela Cloudflare subiu ao backend');
}
{
  const com = await sobe({}, '203.0.113.9', { segredo: 'z'.repeat(40) });
  const sem = await sobe({ 'x-csb-proxy-auth': 'forjado' }, '203.0.113.9');
  cobra(com.get('x-csb-proxy-auth') === 'z'.repeat(40), 'GP6 o proxy não prova a origem ao backend — com API_PROXY_SECRET no backend a geo seria descartada');
  cobra(!sem.has('x-csb-proxy-auth'), 'GP6 x-csb-proxy-auth do NAVEGADOR atravessou o proxy');
}
cobra(sinal instanceof AbortSignal, 'GP8 fetch do proxy sem prazo — Cloud Run pendurado segura cada chamada de telemetria até o teto da função da Vercel');
cobra(/const SEGREDO = import\.meta\.env\.API_PROXY_SECRET \|\| '';/.test(rota) && /\{ segredo: SEGREDO \}/.test(rota),
  'GP6 [rota].ts não repassa API_PROXY_SECRET ao proxy');

cobra(/void fetch\(apiUrl\(path\), \{/.test(main) && /fetch\(apiUrl\('\/api\/presence'\)/.test(main)
  && /const r = await fetch\(apiUrl\(path\), body/.test(main),
  'GP7 main.js tem caminho de telemetria/presença/submit que não passa por apiUrl');
cobra(!/run\.app/.test(main), 'GP7 main.js tem URL do Cloud Run fixa');

if (falhas.length) {
  console.error('✗ GP a geo do jogador não chega ao backend:');
  for (const f of falhas) console.error(`    ${f}`);
  process.exit(1);
}
console.log(`✓ GP ${ESPERADAS.length} rotas de geo pelo proxy same-origin; Cloudflare × Vercel sem mistura; segredo repassado`);
