import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { launchPracaMatch } from './praca-browser-launch.mjs';

const base = process.argv.find((arg) => arg.startsWith('--base='))?.slice(7) || 'http://127.0.0.1:8220';
const out = 'artifacts/praca-poderes-main-r2/evidence';
const sourceSha256 = createHash('sha256').update(readFileSync('public/js/map_brasilia.js')).digest('hex');
const views = [
  ['eixo-central', [0, 1.62, -38], [0, 2, 24]],
  ['flanco-oeste', [-34, 1.62, -42], [-34, 1.4, 24]],
  // O ponto antigo x=34 ficava dentro de uma coluna cinza do piloti. A câmera agora parte
  // da rota andável e olha em diagonal para as jardineiras, sem atravessar geometria.
  ['flanco-leste', [32, 1.62, -42], [38, 1.15, 18]],
  // A borda de granito tem 0,55 m; elevar a câmera mostra a lâmina, o fundo e o parapeito.
  ['espelho-dagua', [0, 7.0, 62], [0, 0.45, 76]],
  ['horizonte-pilotis', [32, 1.62, 2], [105, 8, 18]],
];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const captures = [];
try {
  for (const viewport of [{ id: '3x2', width: 1536, height: 1024 }, { id: '16x9', width: 1600, height: 900 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots: 8, vol: 0, speech: false })));
    await launchPracaMatch(page, { base, mode: 'ctf' });
    await page.waitForTimeout(4000);
    for (const [id, pos, look] of views) {
      await page.evaluate(({ pos, look }) => {
        const game = window.__game; game.paused = true; game.player.hp = 100; game._updateHud();
        game.player.pos.set(pos[0], 0, pos[2]); game.camera.position.set(...pos);
        game.camera.fov = 70; game.camera.updateProjectionMatrix(); game.camera.lookAt(...look);
        game.scene.updateMatrixWorld(true); game.renderer.render(game.scene, game.camera);
      }, { pos, look });
      await page.waitForTimeout(500);
      const path = `${out}/${viewport.id}-${id}.png`;
      await page.screenshot({ path });
      const bytes = readFileSync(path);
      captures.push({ id, aspect: viewport.id, path, width: viewport.width, height: viewport.height,
        bytes: statSync(path).size, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync(`${out}/captures.json`, JSON.stringify({ sourceSha256, base, state: 'live', mode: 'ctf', teams: 8,
  captures, humanVisualApproval: 'pending' }, null, 2));
console.log(`CAPTURAS PRAÇA: ${captures.length}/${views.length * 2} em ${out}`);
