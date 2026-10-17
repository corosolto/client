// Prova visual do modal de convite (lane glm/amigos): abre /comunidade/amigos,
// clica em CONVIDAR AMIGOS e fotografa o diálogo. Sem login: o convite funciona
// para visitante também. Uso: node tools/eval/convida-amigos-capture.mjs [--porta=9149]
import { execSync, spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (n) => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '9149';
const BASE = arg('base') || `http://127.0.0.1:${PORTA}`;
const EVID = 'tools/eval/asset-evidence/convida-amigos';

const srv = arg('base') ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv?.kill());
if (srv) { await new Promise(r => setTimeout(r, 800)); for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/`); if (r.ok && (await r.text()).includes('importmap')) break; } catch {} await new Promise(r => setTimeout(r, 1000)); } }

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}/?social=friends`, { waitUntil: 'domcontentloaded', timeout: 240_000 });
// Sem backend local o boot da comunidade mostra TENTAR DE NOVO em vez da aba de
// amigos: o botão real é clicado quando existe; senão o modal é aberto pelo módulo
// (a prova visual é do diálogo, não da aba).
const temBotao = await page.waitForFunction(() => [...document.querySelectorAll('#social-content button')].some(b => b.textContent.includes('CONVIDAR AMIGOS')), null, { timeout: 15000 }).then(() => true).catch(() => false);
if (temBotao) await page.click('text=CONVIDAR AMIGOS');
else await page.evaluate(() => import('/js/convida-amigos.js').then(m => m.abrirConviteAmigos('testador')));
await page.waitForSelector('.social-invite-dialog', { timeout: 10_000 });
await page.waitForTimeout(300);
mkdirSync(EVID, { recursive: true });
const buf = await page.screenshot();
writeFileSync(`${EVID}/modal.png`, buf);
const plataformas = await page.evaluate(() => [...document.querySelectorAll('.social-invite-grade button')].map(b => b.textContent));
console.log('plataformas no modal:', plataformas.join(' · '));
console.log(`captura -> ${EVID}/modal.png`);
await browser.close();
srv?.kill();
process.exit(0);
