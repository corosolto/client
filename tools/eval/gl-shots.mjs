// GAUNTLET LOOP — bateria de capturas (menu + in-game em todos os mapas, 2 aspectos).
// Uso: node tools/eval/gl-shots.mjs <outDir> [set]   set = menu|game|all
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/root/shots/base';
const SET = process.argv[3] || 'all';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
mkdirSync(OUT, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
/* GPU=1 troca o SwiftShader pelo backend nativo. O padrão continua software porque é o que
   roda no container do CI e é o que mantém a captura comparável entre máquinas. Mas o dono
   joga numa GPU de verdade: quando o objetivo é JULGAR o visual (e não comparar número com
   corrida antiga), software rendering mente — ele achata o que a Metal desenha e leva ~4-6
   min por mapa, o que na prática fez ninguém rodar a bateria completa. */
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: [
    ...(process.env.GPU === '1' ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
    '--headless=new', '--mute-audio', '--no-sandbox',
  ],
});
const log = [];
const metrics = [];
const ASPECTS = { '169': [1600, 900], '32': [1500, 1000] };

async function menuShots() {
  const [W, H] = ASPECTS['169'];
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => log.push('[pageerror] ' + e.message));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/menu-00-splash.png` });
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/menu-01-main.png` });
  // navega pelas telas via API do DOM (botões)
  const ids = await page.evaluate(() => [...document.querySelectorAll('button,[id]')].map(e => e.id).filter(Boolean));
  writeFileSync(`${OUT}/_dom-ids.txt`, ids.join('\n'));
  // o menu CS roteia por data-act nos .cs-item (btn-* legados estão em .side-actions.hidden)
  for (const [act, name] of [['sp', 'menu-02-setup'], ['ctf', 'menu-07-ctf'], ['config', 'menu-04-settings'], ['ranking', 'menu-06-ranking'], ['sobre', 'menu-05-howto']]) {
    try {
      await page.evaluate(() => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById('main-menu').classList.remove('hidden'); });
      await page.click(`.cs-item[data-act="${act}"]`, { timeout: 6000 });
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 60000 });
    } catch (e) { log.push(`[menu ${act}] ${e.message.split('\n')[0]}`); }
  }
  // time e personagem (telas do fluxo, forçadas via DOM)
  for (const [id, name] of [['team-select', 'menu-08-team'], ['char-select', 'menu-03-char']]) {
    try {
      await page.evaluate((i) => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(i).classList.remove('hidden'); }, id);
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 60000 });
    } catch (e) { log.push(`[${id}] ${e.message.split('\n')[0]}`); }
  }
  await page.close();
}

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
/* A lista de mapas é LIDA DO REGISTRO, não repetida aqui — e a razão é cara.

   Até 12/08 esta era uma lista literal. Ela ficou em 5 enquanto o jogo foi para 10, e
   por isso os 5 mapas novos (escadão, campo do morro, lajes, córrego, mansão) entraram
   sem NUNCA passar por uma captura. Foi assim que chegaram chapados e injogáveis na tela
   do dono: mapa que não é fotografado não é criticado, e o que não é criticado regride
   calado. A prova disso está no código dos mapas — `map_ferrovelho.js` tem comentários
   citando crítico do gauntlet ("horizonte vazio", "crítico R6") e tem skyline em camadas;
   os 5 novos não tinham uma linha de horizonte.

   Uma lista à mão só adia a próxima defasagem. Aqui o registro é a única verdade: mapa
   novo em `maps.js` entra na bateria sozinho. `AUTO` é só a escolha de time/personagem,
   com um padrão para quem não estiver na tabela — esquecer de preencher `AUTO` custa um
   personagem diferente na foto, não um mapa invisível. */
const REG = readFileSync('public/js/maps.js', 'utf8');
const BLOCO = REG.slice(REG.indexOf('export const MAPS'), REG.indexOf('\n};', REG.indexOf('export const MAPS')));
const IDS = [...BLOCO.matchAll(/^\s{2}([a-z][a-z0-9_]*)\s*:\s*\{/gm)].map((m) => m[1]);
if (IDS.length < 2) throw new Error('gl-shots: registro de mapas não parseado de public/js/maps.js — falhar alto é melhor que capturar meio jogo em silêncio');
const AUTO = { praca_poderes: 'P,mst', piscina_treta: 'P,mst', loja_h: 'B,bozo', ferro_velho: 'B,bozo' };
const MAPS = IDS.map((id) => [id, AUTO[id] || 'B,sertanejo']);

async function gameShots() {
  for (const [map, auto] of MAPS.filter(x => !ONLY || ONLY.includes(x[0]))) {
    for (const [aName, [W, H]] of Object.entries(ASPECTS)) {
      const page = await browser.newPage({ viewport: { width: W, height: H } });
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      const t0 = Date.now();
      let tLive = null;
      try {
        await page.goto(`${BASE}/?debug=1&map=${map}&auto=${auto}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
        await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 900000 });
        tLive = (Date.now() - t0) / 1000;
        await page.waitForTimeout(6000);
        await page.screenshot({ path: `${OUT}/game-${map}-${aName}-a.png`, timeout: 120000 });
        // olha em volta: 3 yaws
        for (let i = 1; i <= 3; i++) {
          await page.evaluate((k) => { const g = window.__game; if (g && g.player) { g.player.yaw = (g.player.yaw || 0) + k * 1.6; } }, i);
          await page.waitForTimeout(1500);
          await page.screenshot({ path: `${OUT}/game-${map}-${aName}-${'bcd'[i - 1]}.png`, timeout: 120000 });
        }
        // 30s de jogo antes de medir
        const liveMs = Date.now() - (t0 + tLive * 1000);
        if (liveMs < 30000) await page.waitForTimeout(30000 - liveMs);
        const m = await page.evaluate(() => {
          const g = window.__game, r = g && g.renderer, i = r && r.info;
          return {
            calls: i ? i.render.calls : null, tris: i ? i.render.triangles : null,
            textures: i ? i.memory.textures : null, geometries: i ? i.memory.geometries : null,
            programs: i && i.programs ? i.programs.length : null,
            heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
            state: g ? g.state : null,
          };
        });
        metrics.push({ map, aspect: aName, tLive, ...m });
      } catch (e) { errs.push('[fatal] ' + e.message.split('\n')[0]); }
      if (!metrics.some(x => x.map === map && x.aspect === aName)) metrics.push({ map, aspect: aName, tLive, fatal: true });
      if (errs.length) {
        log.push(`[${map} ${aName}] ` + errs.slice(0, 6).join(' | '));
        writeFileSync(`${OUT}/_errs-${map}-${aName}.txt`, errs.join('\n'));
      }
      writeFileSync(`${OUT}/_metrics.json`, JSON.stringify(metrics, null, 2));
      console.log('[done] ' + JSON.stringify(metrics[metrics.length - 1]));
      await page.close();
    }
  }
}

if (SET === 'menu' || SET === 'all') await menuShots();
if (SET === 'game' || SET === 'all') await gameShots();
writeFileSync(`${OUT}/_metrics.json`, JSON.stringify(metrics, null, 2));
writeFileSync(`${OUT}/_log.txt`, log.join('\n') || 'sem erros');
console.log(log.join('\n') || 'sem erros');
await browser.close();
