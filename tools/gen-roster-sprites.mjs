import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import sharp from 'sharp';
import { chromium } from 'playwright';

const source = readFileSync('public/js/characters.js', 'utf8');
const characters = vm.runInNewContext(source.match(/export const CHARACTERS = (\[[\s\S]*?\n\]);/)[1]);
const roster = characters.filter(c => c.team === 'P' || c.team === 'M');
const ids = process.argv.slice(2);
const selected = ids.length ? roster.filter(c => ids.includes(c.id)) : roster;
const base = process.env.BASE || 'http://localhost:8197';
const refs = 'references/wallpapers-roster';
const out = 'public/img/roster-sprites';
mkdirSync(refs, { recursive: true });
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  for (const character of selected) {
    const { id } = character;
    if (existsSync(`${out}/${id}.webp`) && existsSync(`${refs}/${id}.png`)) { console.log(`${id}: já renderizado`); continue; }
    await page.goto(`${base}/charvideo.html?id=${id}&bg=alpha&shot=corpo&w=512&h=512&yaw=20&spin=180`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.CHARVID?.ready, null, { timeout: 90000 });
    const frames = [];
    const dir = `/tmp/cs-wallpapers-5k/sprites/${id}`;
    mkdirSync(dir, { recursive: true });
    for (let frame = 0; frame < 24; frame++) {
      const data = await page.evaluate(() => { const image = window.CHARVID.grab(); window.CHARVID.step(1 / 12); return image; });
      const png = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
      if (frame === 0) {
        writeFileSync(`${refs}/${id}.png`, png);
        await sharp(png).resize(192, 192).webp({ quality: 88 }).toFile(`${out}/${id}-still.webp`);
      }
      const file = `${dir}/${String(frame).padStart(2, '0')}.png`;
      await sharp(png).resize(192, 192).png().toFile(file);
      frames.push(file);
    }
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '12', '-i', `${dir}/%02d.png`, '-c:v', 'libwebp_anim', '-lossless', '0', '-quality', '82', '-loop', '0', `${out}/${id}.webp`]);
    console.log(`${id}: referência GLB + sprite 192×192, 24 quadros`);
  }
} finally {
  await browser.close();
}
writeFileSync(`${out}/manifest.json`, JSON.stringify(roster.map(c => ({ id: c.id, name: c.name, animated: `/img/roster-sprites/${c.id}.webp`, still: `/img/roster-sprites/${c.id}-still.webp` })), null, 2) + '\n');
writeFileSync(`${refs}/FONTE.md`, '# Referências do elenco\n\nRender de `public/models/characters/<id>.glb` pelo `public/charvideo.html`,\ncom os materiais do jogo e sem arma adicional. Gerador: `tools/gen-roster-sprites.mjs`.\nNenhuma referência externa ou foto real.\n');
writeFileSync(`${out}/FONTE.md`, '# Sprites do elenco\n\nRender dos GLBs versionados em `public/models/characters/` pelo `public/charvideo.html`,\ncom materiais do jogo e sem arma adicional. Gerador: `tools/gen-roster-sprites.mjs`.\nWebP animado: 192×192, 24 quadros, 12 fps, alpha; cada personagem tem um still\npara movimento reduzido. Nenhuma foto ou referência externa.\n');
