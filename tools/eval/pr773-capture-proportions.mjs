// After `node tools/eval/serve.mjs 8123`, run with Node 20+.
// Optional: BASE=http://127.0.0.1:8132 node tools/eval/pr773-capture-proportions.mjs
import sharp from 'sharp';
import { chromium } from 'playwright';

const ids = ['barbudo', 'capitao', 'dama', 'professor', 'senador', 'ministro', 'deputado', 'juiz',
  'doutora', 'sindicato', 'esquerdomacho', 'coach'];
const labels = ['Barbudo', 'Capitão', 'Dama', 'Professor', 'Senador', 'Ministro', 'Deputado', 'Juiz',
  'Doutora · regular', 'Sindicato · regular', 'Esquerdomacho · regular', 'Coach · regular'];
const base = process.env.BASE || 'http://127.0.0.1:8123';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'] });
const tiles = [];
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    await page.goto(`${base}/charvideo.html?id=${id}&bg=alpha&shot=corpo&w=512&h=512&yaw=20`);
    await page.waitForFunction(() => window.CHARVID?.ready, null, { timeout: 60000 });
    const data = await page.evaluate(() => window.CHARVID.grab());
    const png = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    const portrait = await sharp(png).resize(380, 380).toBuffer();
    const label = `<svg width="400" height="44" xmlns="http://www.w3.org/2000/svg"><text x="12" y="28" fill="white" font-size="19" font-family="Arial, sans-serif">${labels[i]}</text></svg>`;
    const tile = await sharp({ create: { width: 400, height: 420, channels: 4, background: i < 8 ? '#172332' : '#344034' } })
      .composite([{ input: portrait, left: 10, top: 0 }, { input: Buffer.from(label), left: 0, top: 376 }]).png().toBuffer();
    tiles.push(tile);
    console.log(id, png.length);
  }
  const result = await sharp({ create: { width: 1600, height: 1260, channels: 4, background: '#121820' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % 4) * 400, top: Math.floor(i / 4) * 420 })))
    .jpeg({ quality: 85 }).toFile('tools/eval/asset-evidence/pr773/proportions-fullbody.jpg');
  console.log('CONTACT', result.size);
} finally { await browser.close(); }
