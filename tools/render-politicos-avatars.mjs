// Avatars from the exact GLB and lighting used by charvideo.html, not 2D portraits.
// Run with the local eval server: BASE=http://127.0.0.1:8123 node tools/render-politicos-avatars.mjs
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { chromium } from 'playwright';

const IDS = ['barbudo', 'capitao', 'dama', 'professor', 'senador', 'ministro', 'deputado', 'juiz'];
const base = process.env.BASE || 'http://127.0.0.1:8123';
const background = Buffer.from(`<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="g"><stop stop-color="#344250"/><stop offset="1" stop-color="#111922"/></radialGradient></defs>
  <rect width="256" height="256" fill="url(#g)"/>
</svg>`);
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  for (const id of IDS) {
    await page.goto(`${base}/charvideo.html?id=${id}&bg=alpha&shot=busto&w=512&h=512&yaw=20`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.CHARVID?.ready, null, { timeout: 60000 });
    const data = await page.evaluate(() => window.CHARVID.grab());
    const png = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (!(await sharp(png).metadata()).hasAlpha) throw new Error(`${id}: recorte 3D sem alpha`);
    const portrait = await sharp(png).resize(256, 256).png().toBuffer();
    const output = await sharp(background).composite([{ input: portrait }]).webp({ quality: 90 }).toBuffer();
    const path = `public/img/chars/avatars/${id}.webp`;
    writeFileSync(path, output);
    console.log(`${id}: ${output.length} bytes → ${path}`);
  }
} finally {
  await browser.close();
}
