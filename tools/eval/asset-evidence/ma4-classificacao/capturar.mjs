/* Captura a tela de mapas (?) com prova de identidade: lê #ms-name ANTES e DEPOIS
   do screenshot — se o carrossel avançar no meio, aborta e tenta de novo. A parelha
   antes/depois do MA4 só vale se cada shot mostrar o mapa pedido. */
import { chromium } from 'playwright';

const label = process.argv.find((a) => a.startsWith('--label='))?.slice(8) ?? 'depois';
const base = 'http://localhost:4321';
const alvos = [
  ['amazonia', 'Treta na Amazônia'],
  ['corrego', 'Córrego (Favela de SP)'],
];
const norm = (s) => s.trim().replace(/\s+/g, ' ');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
for (const [id, nomeEsperado] of alvos) {
  let ok = false;
  for (let tent = 0; tent < 3 && !ok; tent++) {
    await page.goto(`${base}/?tela=maps&map=${id}`, { waitUntil: 'load' });
    await page.waitForSelector('.ms-name', { timeout: 20000 });
    // congela o carrossel se ele existir (a tela expõe stopMapPreviews/stopMapPreview)
    await page.evaluate(() => {
      for (const f of ['stopMapPreviews', 'stopMapPreview']) {
        if (typeof window[f] === 'function') window[f]();
      }
    }).catch(() => {});
    await page.waitForTimeout(3000);
    const nome1 = norm(await page.textContent('#ms-name'));
    const ficha1 = norm(await page.textContent('#ms-cat'));
    const out = `tools/eval/asset-evidence/ma4-classificacao/${label}-${id}.webp`;
    await page.screenshot({ path: out, type: 'webp' });
    const nome2 = norm(await page.textContent('#ms-name'));
    const ficha2 = norm(await page.textContent('#ms-cat'));
    ok = nome1 === nomeEsperado && nome2 === nomeEsperado && nome1 === nome2;
    console.log(`${label} ${id}: nome='${nome1}'→'${nome2}' ficha='${ficha1}'→'${ficha2}' ${ok ? 'OK -> ' + out : 'INSTÁVEL, retentando'}`);
  }
  if (!ok) { console.error(`✗ não conseguiu estabilizar ${id} (${label})`); process.exit(1); }
}
await browser.close();
