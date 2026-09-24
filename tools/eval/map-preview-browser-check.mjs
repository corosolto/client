#!/usr/bin/env node
// O que o jsdom do map-preview-check não alcança: o webm gravado DECODIFICA no
// Chrome e o card do mapa monta a prévia. Roda para TODO id do allow-list —
// mapa novo entra aqui sozinho, sem editar este arquivo.
// Uso: BASE=http://127.0.0.1:8191 node tools/eval/map-preview-browser-check.mjs
// Mutantes: --mutante=sem-allowlist (card sem prévia) | --mutante=video-quebrado (404 na mídia)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const base = process.env.BASE || 'http://127.0.0.1:4321';
const out = process.env.OUT || 'artifacts/mansao-hover/browser';
const semAllowlist = process.argv.includes('--mutante=sem-allowlist');
const videoQuebrado = process.argv.includes('--mutante=video-quebrado');
mkdirSync(out, { recursive: true });

const fonte = await readFile(new URL('../../public/js/map_preview.js', import.meta.url), 'utf8');
const { VIDEO_MAPS } = await import(`data:text/javascript,${encodeURIComponent(fonte)}`);
const ids = [...VIDEO_MAPS];
if (!ids.length) throw Error('allow-list de vídeo vazio: nada a provar');

const resultados = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
try {
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
    const errors = [], pedidos = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.url().includes(`/video/map-previews/${id}.webm`)) pedidos.push(r.url()); });
    await page.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (videoQuebrado && u.pathname === `/video/map-previews/${id}.webm`) return r.fulfill({ status: 404, body: '' });
      if (semAllowlist && u.pathname === '/js/map_preview.js') {
        const res = await r.fetch(), source = await res.text();
        const body = source.replace(/new Set\(\[[^\]]*\]\)/, 'new Set([])');
        if (body === source) throw Error('mutante não aplicou');
        return r.fulfill({ response: res, body });
      }
      return r.continue();
    });
    await page.goto(`${base}/?tela=maps&map=${id}&lang=pt-BR&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const card = page.locator(`.ms-thumb[data-id="${id}"]`);
    await card.waitFor({ state: 'visible', timeout: 90000 });
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    const antesDoHover = pedidos.length;
    await card.hover();
    let tocou = false;
    try {
      await page.waitForFunction(sel => {
        const v = document.querySelector(`${sel} video.map-preview-video`);
        return v && !v.paused && v.currentTime > 0.1 && v.videoWidth > 0;
      }, `.ms-thumb[data-id="${id}"]`, { timeout: 10000 });
      tocou = true;
    } catch { /* medido abaixo */ }
    const estado = await card.evaluate(host => {
      const v = host.querySelector('video.map-preview-video'), media = host.querySelector('.ms-thumb-media');
      return {
        temVideo: !!v, pausado: v?.paused ?? null, tempo: v?.currentTime ?? null,
        largura: v?.videoWidth ?? null, altura: v?.videoHeight ?? null, mudo: v?.muted ?? null,
        tocandoNaClasse: !!media?.classList.contains('map-preview-playing'),
        posterVivo: !!host.querySelector('img.ms-thumb-img')?.complete,
      };
    });
    await page.screenshot({ path: `${out}/${id}-hover.png` });
    let parou = null;
    if (tocou) {
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      parou = await card.evaluate(host => {
        const v = host.querySelector('video.map-preview-video');
        return v.paused && v.currentTime === 0 && !host.querySelector('.ms-thumb-media').classList.contains('map-preview-playing');
      });
    }
    resultados.push({ id, semPedidoAntesDoHover: antesDoHover === 0, tocou, parou, ...estado, errors });
    await page.close();
  }
} finally { await browser.close(); }

let falhas = 0;
for (const r of resultados) {
  // Mutante NÃO inverte a expectativa: a régua sempre exige prévia viva, então
  // rodar com mutante tem que ficar VERMELHO — é isso que prova que ela morde.
  const ok = r.semPedidoAntesDoHover && r.errors.length === 0 && r.tocou &&
    r.parou === true && r.mudo === true && r.largura > 0 && r.tocandoNaClasse;
  if (!ok) falhas++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${r.id} ` + JSON.stringify({
    pedidoSoNoHover: r.semPedidoAntesDoHover, tocou: r.tocou, parouAoSair: r.parou,
    quadro: r.largura && `${r.largura}x${r.altura}`, mudo: r.mudo, classe: r.tocandoNaClasse, errors: r.errors,
  }));
}
console.log(`${resultados.length - falhas}/${resultados.length} mapas do allow-list com prévia viva no Chrome`);
if (falhas) process.exitCode = 1;
