/* javaporcos-wallpaper-check.mjs — a espera do mapa javaporcos mostra a arte dos javaporcos?
 *
 * Pedido do dono (30/10/2026): "fazer um wallpaper pra ler no modo javaporco com os javaporcos".
 *
 *   JW1  carregando invasao_javaporcos, o #load-overlay usa /img/loading-javaporcos.webp;
 *   JW2  carregando outro mapa (praca_poderes), a rotação normal continua (sem a arte do modo);
 *   JW3  o arquivo existe e é servido como imagem.
 *
 * Mutante (sai 1 se a mutação PASSAR): --mutante=sem-fixa  showLoading ignora `loadingWall`.
 *
 *   BASE=http://localhost:4321 node tools/eval/javaporcos-wallpaper-check.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE;
if (!BASE) { console.error('BASE obrigatório (ex.: BASE=http://localhost:4321)'); process.exit(1); }
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!['', 'sem-fixa'].includes(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(1); }
const ALVO = "_loadWallFixa = (mapName && MAPS[currentMap]?.loadingWall) || '';";

const b = await chromium.launch({ args: ['--use-angle=metal', '--headless=new', '--mute-audio'] });
async function paredeDaEspera(mapa) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'low', menuMusic: false })));
  let aplicou = !MUTANTE;
  if (MUTANTE) {
    await ctx.route(/\/js\/main\.js/, async (route) => {
      const r = await route.fetch();
      const src = await r.text();
      aplicou = src.includes(ALVO);
      await route.fulfill({ response: r, body: src.replace(ALVO, "_loadWallFixa = '';") });
    });
  }
  const p = await ctx.newPage();
  await p.goto(`${BASE}/?debug=1&adaptativa=0&map=${mapa}&auto=E&bots=1`, { waitUntil: 'domcontentloaded' });
  const parede = await p.waitForFunction(() => {
    const el = document.getElementById('load-overlay');
    if (!el || el.classList.contains('hidden')) return null;
    return el.style.getPropertyValue('--loading-wall') || null;
  }, null, { timeout: 180000, polling: 50 }).then((h) => h.jsonValue());
  await ctx.close();
  if (!aplicou) { console.error('MUTANTE NAO APLICOU: sem-fixa'); process.exit(1); }
  return parede;
}

const res = [];
const java = await paredeDaEspera('invasao_javaporcos');
res.push(['JW1', 'espera do javaporcos usa a arte do modo', /loading-javaporcos\.webp/.test(java), java]);
const praca = await paredeDaEspera('praca_poderes');
res.push(['JW2', 'outro mapa segue a rotação normal', /loading-\d+\.webp/.test(praca), praca]);
const ctx = await b.newContext();
const resp = await ctx.request.get(`${BASE}/img/loading-javaporcos.webp`);
res.push(['JW3', 'arquivo servido como imagem', resp.ok() && /image\//.test(resp.headers()['content-type'] || ''), `${resp.status()} ${resp.headers()['content-type']}`]);
await b.close();

let falhou = 0;
for (const [id, nome, ok, det] of res) { console.log(`${ok ? '✓' : '✗'} ${id} ${nome} · ${det}`); if (!ok) falhou++; }
process.exit(falhou ? 1 : 0);
