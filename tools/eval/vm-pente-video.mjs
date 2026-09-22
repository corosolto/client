#!/usr/bin/env node
/* ============================================================================
   vm-pente-video.mjs — VÍDEO DA RECARGA QUE NÃO DEPENDE DA TAXA DE QUADROS.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   O dono pediu para ver em movimento, e tem razão: figura parada não decide
   animação. Mas o vídeo de aceite (`vm-cs16-video.mjs`) grava em tempo real, e o
   SwiftShader roda este jogo a **~0,3 FPS** — em 11/09 um clipe de 10 s da
   `carbine` rendeu **um** quadro distinto repetido dez vezes. Gravar movimento
   num rasterizador de software grava o rasterizador.

   A saída é parar de gravar tempo e passar a gravar ANIMAÇÃO: o mixer é
   posicionado à mão em N frações do clipe, um quadro é desenhado em cada parada,
   e o ffmpeg monta os N quadros a 30 fps. O tempo de parede vira irrelevante — o
   vídeo sai fluido mesmo que cada quadro leve um segundo para ser desenhado.

   `--forcar` liga o recorte por peça na arma SEM tocar no `vmconfig.js`: chama
   `splitParts` ao vivo. Serve para mostrar ao dono o que aconteceria numa arma
   que ainda não foi aprovada, sem prometer nada no código.

   USO
     node tools/eval/vm-pente-video.mjs --arma=awp --porta=4361
     node tools/eval/vm-pente-video.mjs --arma=deagle --porta=4361 --forcar
   ========================================================================== */

import { execSync, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const PORTA = arg('porta', '4361');
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMAS = (arg('armas') || arg('arma', 'awp')).split(',').filter(Boolean);
const SAIDA = arg('saida', 'artifacts/pente-bug90/videos');
const FORCAR = process.argv.includes('--forcar');
const QUADROS = Number(arg('quadros', '48'));

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

fs.mkdirSync(SAIDA, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});

for (const arma of ARMAS) {
  const tmp = fs.mkdtempSync(path.join('/tmp', `pente-${arma}-`));
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  try {
    const qs = `?debug=1&vmauthored=1&auto=E&vmweapon=${arma}&map=brasilia&armaslazy=0${FORCAR ? '' : ''}`;
    await page.goto(`${BASE}/${qs}`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForFunction((w) => Boolean(window.__authoredVm?.entry?.(w)?.scene), arma, { timeout: 120000 });

    const info = await page.evaluate(async ([nome, forcar]) => {
      const entry = window.__authoredVm.entry(nome);
      if (forcar && entry.mint?.active) {
        const mapa = JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
        const url = mapa['./js/vmweapon.js'] || Object.values(mapa).find((u) => /\/vmweapon\.js\?/.test(u));
        const V = await import(url);
        V.splitParts(entry, entry.mint.active, { mag: { peca: true, bone: 'Mag' } });
      }
      let peca = null;
      entry.scene.traverse((o) => { if (o.name === 'mint_part_mag') peca = o; });
      const clipe = entry.clips.get('reload_tactical') || entry.clips.get('reload_empty') || entry.clips.get('reload');
      window.__pv = { entry, clipe };
      return { peca: Boolean(peca), clipe: clipe?.name || null, dur: clipe?.duration ?? null };
    }, [arma, FORCAR]);

    console.log(`  ${arma.padEnd(10)} peça ${info.peca ? 'presente' : 'AUSENTE'} · clipe ${info.clipe} ${info.dur?.toFixed(2)}s · ${QUADROS} quadros`);
    if (!info.clipe) { console.log('    sem clipe de recarga — pulando'); continue; }

    for (let i = 0; i < QUADROS; i += 1) {
      await page.evaluate((f) => {
        const { entry, clipe } = window.__pv;
        entry.mixer.stopAllAction();
        const a = entry.mixer.clipAction(clipe);
        a.reset().play();
        a.paused = true;
        a.time = clipe.duration * f;
        entry.mixer.update(0);
      }, i / (QUADROS - 1));
      await page.screenshot({ path: path.join(tmp, `q${String(i).padStart(3, '0')}.png`) });
    }

    const out = path.join(SAIDA, `${arma}${FORCAR ? '-forcado' : ''}.mp4`);
    // 12 fps: o clipe de recarga dura ~3 s e 48 quadros a 12 fps devolvem a
    // cadência real. Acima disso o movimento fica acelerado e engana o olho.
    execFileSync('ffmpeg', ['-v', 'error', '-framerate', '12', '-i', path.join(tmp, 'q%03d.png'),
      '-vf', 'scale=900:-2', '-pix_fmt', 'yuv420p', '-y', out]);
    console.log(`    vídeo: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`  ${arma.padEnd(10)} ERRO ${String(e).slice(0, 110)}`);
  } finally {
    await page.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

await browser.close();
console.log('');
