#!/usr/bin/env node
/* ============================================================================
   vm-pente-foto.mjs — A PEÇA RECORTADA, TINGIDA, EM POSES CONTROLADAS DA RECARGA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   A lei 3 da casa manda gerar a figura e OLHAR. Mas o vídeo de aceite não serve
   para isto: o SwiftShader roda o jogo a **~0,3 FPS** e um clipe de 10 s tem um
   ou dois quadros distintos do jogo — em 11/09 os dez quadros extraídos da
   `carbine` saíram idênticos. Gravar movimento num rasterizador de software
   mede o rasterizador, não a animação. Foi assim que esta frente concluiu, no dia
   anterior, que a AK não animava a recarga (estava errado).

   Esta ferramenta tira a taxa de quadros da equação: ela **posiciona o mixer à
   mão** em frações do clipe de recarga e desenha um quadro em cada parada. O
   tempo de parede não importa mais.

   E TINGE A PEÇA
   O `splitParts` recorta o carregador num mesh próprio chamado `mint_part_mag`
   (`public/js/vmweapon.js`) e o pendura no osso. Pintá-lo responde de olho a
   pergunta que nenhuma contagem responde: **o pedaço recortado é o pente, ou é
   um pedaço do corpo da arma?**

   USO
     node tools/eval/vm-pente-foto.mjs --armas=carbine,awp,deagle --porta=4361
     node tools/eval/vm-pente-foto.mjs --armas=ak --porta=4361 --semtinta
   ========================================================================== */

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const PORTA = arg('porta', '4361');
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMAS = (arg('armas') || arg('arma', 'carbine')).split(',').filter(Boolean);
const SAIDA = arg('saida', 'artifacts/pente-bug90');
const SEM_TINTA = process.argv.includes('--semtinta');

// Cinco paradas cobrem o arco: pente no lugar, saindo, fora, voltando, assentado.
const PARADAS = [0, 0.25, 0.5, 0.75, 1];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

fs.mkdirSync(SAIDA, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});

for (const arma of ARMAS) {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  try {
    await page.goto(`${BASE}/?debug=1&auto=E&vmweapon=${arma}&map=brasilia&armaslazy=0`,
      { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForFunction((w) => Boolean(window.__authoredVm?.entry?.(w)?.scene), arma, { timeout: 120000 });

    const info = await page.evaluate(([nome, tingir]) => {
      const entry = window.__authoredVm.entry(nome);
      let peca = null;
      entry.scene.traverse((o) => { if (o.name === 'mint_part_mag') peca = o; });
      if (peca && tingir) {
        const m = peca.material.clone();
        if (m.color) m.color.setHex(0xff2020);
        if (m.emissive) m.emissive.setHex(0x400000);
        m.map = null;
        peca.material = m;
      }
      const clipe = entry.clips.get('reload_tactical') || entry.clips.get('reload_empty') || entry.clips.get('reload');
      window.__pente = { entry, peca, clipe };
      return { achou: Boolean(peca), clipe: clipe?.name || null, dur: clipe?.duration ?? null };
    }, [arma, !SEM_TINTA]);

    console.log(`  ${arma.padEnd(10)} peça ${info.achou ? 'tingida' : 'NÃO ENCONTRADA'} · clipe ${info.clipe || '(nenhum)'} ${info.dur ? `${info.dur.toFixed(2)}s` : ''}`);

    for (const f of PARADAS) {
      await page.evaluate((frac) => {
        const { entry, clipe } = window.__pente;
        if (!clipe) return;
        /* Para o mixer e posiciona à mão: `setTime` num clipe pausado é o que
           tira a taxa de quadros da medida. */
        entry.mixer.stopAllAction();
        const a = entry.mixer.clipAction(clipe);
        a.reset().play();
        a.paused = true;
        a.time = clipe.duration * frac;
        entry.mixer.update(0);
      }, f);
      await page.waitForTimeout(1200);
      const nome = path.join(SAIDA, `${arma}-recarga-${String(Math.round(f * 100)).padStart(3, '0')}.png`);
      await page.screenshot({ path: nome });
    }
  } catch (e) {
    console.log(`  ${arma.padEnd(10)} ERRO ${String(e).slice(0, 100)}`);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\n  fotos em ${SAIDA}\n`);
