/* char-native-vids.mjs — vídeos dos personagens capturados do JOGO REAL (não de IA).
   Por que existe: o dono reprovou os clipes estilizados de IA ("não combinam com o visual
   do jogo"). Aqui quem anima é o próprio pipeline do jogo (mounttest.html +
   buildCharacterModel + os clipes de public/models/anims/<id>/), então o vídeo é
   LITERALMENTE o personagem que o jogador encontra na arena.

   Três saídas por personagem:
     selecao  → public/video/chars/<id>.webm        (idle, 640×854, loop direto)
     vitoria  → public/video/resultado/<id>-vitoria.webm  (jump, 640×640, palíndromo)
     derrota  → public/video/resultado/<id>-derrota.webm  (death, 640×640, palíndromo)

   UM browser por vez (regra da casa). Uso:
     node tools/eval/char-native-vids.mjs              # os 44 × 3
     node tools/eval/char-native-vids.mjs mst bonzo    # só estes
     TIPOS=vitoria node tools/eval/char-native-vids.mjs mst
*/
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const SO = process.argv.slice(2);
const TIPOS = (process.env.TIPOS || 'selecao,vitoria,derrota').split(',').map((x) => x.trim());
const characters = readFileSync(join(ROOT, 'public/js/characters.js'), 'utf8');
const roster = characters.match(/export const CHARACTERS = \[([\s\S]*?)\n\];\nexport const byId/);
const weaponBlock = characters.match(/export const CHAR_WEAPON = \{([\s\S]*?)\n\};/);
if (!roster || !weaponBlock) throw new Error('Não foi possível ler CHARACTERS/CHAR_WEAPON');
const ALL = [...roster[1].matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]);
const weaponById = Object.fromEntries(
  [...weaponBlock[1].matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]),
);
const lista = SO.length ? SO : ALL;
const desconhecidos = lista.filter((id) => !ALL.includes(id));
if (desconhecidos.length) throw new Error(`Personagem desconhecido: ${desconhecidos.join(', ')}`);

const SPEC = {
  selecao: { clip: 'idle', w: 640, h: 854, frames: 40, gap: 75, palindromo: false },
  vitoria: { clip: 'jump', w: 640, h: 640, frames: 26, gap: 75, palindromo: true },
  derrota: { clip: 'death', w: 640, h: 640, frames: 34, gap: 75, palindromo: true },
};
const tiposInvalidos = TIPOS.filter((tipo) => !SPEC[tipo]);
if (tiposInvalidos.length) throw new Error(`TIPOS inválidos: ${tiposInvalidos.join(', ')}`);

mkdirSync(join(ROOT, 'public/video/chars'), { recursive: true });
mkdirSync(join(ROOT, 'public/video/resultado'), { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [
    '--headless=new', '--mute-audio',
    ...(process.env.GL === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
  ],
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(`${error.name}: ${error.message}`));

for (const id of lista) {
  const weapon = weaponById[id] || 'ak';
  await page.setViewportSize({ width: 640, height: 854 });
  await page.goto(`${BASE}/mounttest.html?char=${encodeURIComponent(id)}&w=${encodeURIComponent(weapon)}&play=idle&view=tq&orbit=0&clean=1`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.MOUNT_READY && window.MOUNT_SET_PLAY, null, { timeout: 60000 });
  } catch { throw new Error(`${id}: mounttest não ficou pronto`); }

  for (const tipo of TIPOS) {
    const s = SPEC[tipo];
    const out = tipo === 'selecao'
      ? join(ROOT, `public/video/chars/${id}.webm`)
      : join(ROOT, `public/video/resultado/${id}-${tipo}.webm`);
    if (process.env.SKIP_EXISTING === '1' && existsSync(out)) {
      console.log(`· ${id} ${tipo} já existe`);
      continue;
    }
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const quadro = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], canvas: [document.querySelector('canvas')?.width, document.querySelector('canvas')?.height] }));
    if (quadro.viewport[0] !== s.w || quadro.viewport[1] !== s.h || quadro.canvas[0] !== s.w || quadro.canvas[1] !== s.h) {
      throw new Error(`${id} ${tipo}: resize incompleto ${JSON.stringify(quadro)}; esperado ${s.w}x${s.h}`);
    }
    const DIR = '/tmp/csbrasil-native-frames';
    rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
    await page.evaluate((clip) => window.MOUNT_SET_PLAY(clip), s.clip);
    await page.waitForTimeout(200);
    for (let i = 0; i < s.frames; i++) {
      await page.waitForTimeout(s.gap);
      await page.screenshot({ path: `${DIR}/f${String(i).padStart(3, '0')}.png` });
    }
    const filtro = s.palindromo
      ? '[0]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1'
      : 'null';
    execFileSync('ffmpeg', [
      '-nostdin', '-y', '-loglevel', 'error', '-framerate', '13',
      '-i', `${DIR}/f%03d.png`, '-filter_complex', filtro,
      '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', '31', '-an', out,
    ]);
    console.log(`✓ ${id} ${tipo} (${weapon})`);
  }
}
await browser.close();
if (pageErrors.length) throw new Error(`Falhas no browser:\n${pageErrors.join('\n')}`);
console.log('FIM');
