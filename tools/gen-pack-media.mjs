#!/usr/bin/env node
/* gen-pack-media.mjs — mídia de seleção dos personagens de pack Studio, renderizada no
   public/charvideo.html (mesmo buildCharacterModel, rig e clipes do jogo, enquadramento pelo
   envelope deformado da animação: js/charvideo-frame.js). O resultado de vitória/derrota NÃO
   sai daqui: é o tools/eval/char-result-stills.mjs de sempre.

   Saídas por personagem (fundo opaco, como o elenco publicado):
     public/img/chars/avatars/<id>.webp  256×256  busto
     public/img/chars-hero/<id>.webp     512×512  busto
     public/img/chars/<id>.webp          360×463  corpo inteiro
     public/video/chars/<id>.webm        640×854  VP9, idle em loop, codificado pelo gen-char-video.mjs

   Só aceita id com release fixada (data/content-releases.js) e confere no navegador o SHA do
   manifest servido contra o pin: pack errado ou não verificado aborta o lote.

   Uso (um browser por vez):
     STUDIO_PACK_ROOT=… node tools/eval/serve.mjs 8123 &
     BASE=http://127.0.0.1:8123 sh tools/eval/with-browser-lock.sh node tools/gen-pack-media.mjs [id ...]
   Sem ids: todos os personagens com release fixada. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

await import('./eval/three-node.mjs');   // characters.js importa 'three' (ponte do public/vendor)
globalThis.location ||= { search: '' };
globalThis.localStorage ||= { getItem: () => null };
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const { CHARACTERS, charWeapon } = await import('../public/js/characters.js');
const { CHARACTER_RELEASES } = await import('../public/js/data/content-releases.js');
const pedidos = process.argv.slice(2);
const ids = pedidos.length ? pedidos : Object.keys(CHARACTER_RELEASES);
const fora = ids.filter((id) => !CHARACTER_RELEASES[id] || !CHARACTERS.some((c) => c.id === id));
if (fora.length) { console.error(`sem release fixada ou fora do elenco: ${fora.join(', ')}`); process.exit(2); }

const FPS = 24;
const FUNDO_RETRATO = { r: 12, g: 18, b: 22 };   // painel escuro do seletor
const FUNDO_CORPO = { r: 0, g: 0, b: 0 };        // mesmo preto dos vídeos/recortes publicados
/* Luz do jogo (IBL + sol do mapa) do charvideo. No modo alpha a cena some e o tonemap é o
   ACESFilmic sem composer: ?exp=2 e o parque (sol quente) deixam o personagem legível no
   painel escuro; loja_h a 1,0 saía escuro e esverdeado. ?fatia=1,04 é a folga sobre o
   envelope animado (o padrão 1,16 deixava a figura com ~62% da altura do quadro). */
const LUZ = { map: process.env.MAPA || 'parque_treta', exp: process.env.EXPOSICAO || '2.0', fatia: process.env.FATIA || '1.04' };

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const page = await browser.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(`${e.name}: ${e.message}`));
const png = (url) => Buffer.from(url.split(',')[1], 'base64');

async function abrir(id, { w, h, shot, yaw }) {
  const q = new URLSearchParams({ id, bg: 'alpha', w: String(w), h: String(h), shot, pose: 'idle', fps: String(FPS), wpn: charWeapon(id), yaw: String(yaw), ...LUZ });
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}/charvideo.html?${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.CHARVID?.ready || null, null, { timeout: 120000 });
  const r = await page.evaluate(() => ({ id: CHARVID.id, weapon: CHARVID.weapon, manifestSha256: CHARVID.studio?.manifestSha256, modelSha256: CHARVID.studio?.modelSha256, idleSecs: CHARVID.idleSecs, framing: CHARVID.framing }));
  const pin = CHARACTER_RELEASES[id];
  if (r.id !== id || r.manifestSha256 !== pin.manifestSha256 || !r.modelSha256 || r.weapon !== charWeapon(id)) {
    throw new Error(`${id}: origem divergente do pin ${JSON.stringify(r)}`);
  }
  return r;
}
const quadro = async () => png(await page.evaluate(() => { CHARVID.reset(); return CHARVID.grab(); }));
/* Quadro de corpo inteiro (enquadrado pelo envelope deformado) + posição na tela do osso Head
   do próprio rig. O shot=busto do charvideo mira 84% da altura e corta a cara de quem tem
   cabeça grande ou antena (mascotes de 1,3 m); aqui o busto sai do esqueleto, não da altura. */
async function quadroComCabeca(w, h) {
  const r = await page.evaluate(() => {
    CHARVID.reset();
    const head = CHARVID.ctrl.headBone, g = CHARVID.ctrl.group;
    const v = head.position.clone(); head.getWorldPosition(v);
    return { url: CHARVID.grab(), head: v.toArray(), base: g.position.toArray(), framing: CHARVID.framing };
  });
  const tanY = Math.tan((34 / 2) * Math.PI / 180), tanX = tanY * (w / h);   // FOV do shot=corpo
  const cam = [r.base[0], r.framing.targetY, r.base[2] - r.framing.distance];
  const dz = r.head[2] - cam[2];
  /* Câmera em -Z olhando +Z: o +X do mundo vai para a esquerda da tela. */
  const sx = (0.5 - (r.head[0] - cam[0]) / (dz * tanX) / 2) * w;
  const sy = (0.5 - (r.head[1] - cam[1]) / (dz * tanY) / 2) * h;
  return { buf: png(r.url), cabeca: { x: sx, y: sy } };
}
const sobre = (buf, fundo) => sharp(buf).flatten({ background: fundo });

/* Quadrado do busto: topo no alpha mais alto da coluna da cabeça, lado = 2,6× a distância
   topo→osso da cabeça (cabeça + ombros), limitado a 30–62% da figura; centrado no osso. */
async function busto(buf, cabeca) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, a = (x, y) => data[(y * W + x) * 4 + 3] > 8;
  let top = -1, bottom = -1;
  for (let y = 0; y < H && top < 0; y++) for (let x = 0; x < W; x++) if (a(x, y)) { top = y; break; }
  for (let y = H - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < W; x++) if (a(x, y)) { bottom = y; break; }
  if (top < 0) throw new Error('quadro sem personagem');
  if (!(cabeca.y > top && cabeca.y < bottom)) throw new Error(`osso da cabeça fora da figura (${cabeca.y} ∉ ${top}..${bottom})`);
  const figura = bottom - top + 1;
  const lado = Math.round(Math.min(figura * 0.62, Math.max(figura * 0.30, (cabeca.y - top) * 2.6)));
  const left = Math.round(cabeca.x - lado / 2), y = top - Math.round(lado * 0.05);
  const pad = { top: Math.max(0, -y), left: Math.max(0, -left), right: Math.max(0, left + lado - W), bottom: Math.max(0, y + lado - H) };
  const base = await sharp(buf).extend({ ...pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(base).extract({ left: left + pad.left, top: y + pad.top, width: lado, height: lado }).png().toBuffer();
}

const recibos = {};
for (const id of ids) {
  const pose = await abrir(id, { w: 1024, h: 1536, shot: 'corpo', yaw: -15 });
  const { buf: inteiro, cabeca } = await quadroComCabeca(1024, 1536);
  const rosto = await busto(inteiro, cabeca);
  await sobre(rosto, FUNDO_RETRATO).resize(512, 512, { kernel: 'lanczos3' }).webp({ quality: 88 }).toFile(join(ROOT, `public/img/chars-hero/${id}.webp`));
  await sobre(rosto, FUNDO_RETRATO).resize(256, 256, { kernel: 'lanczos3' }).webp({ quality: 88 }).toFile(join(ROOT, `public/img/chars/avatars/${id}.webp`));

  await abrir(id, { w: 720, h: 926, shot: 'corpo', yaw: -20 });
  await sobre(await quadro(), FUNDO_CORPO).resize(360, 463, { kernel: 'lanczos3' }).webp({ quality: 86 }).toFile(join(ROOT, `public/img/chars/${id}.webp`));

  const corpo = await abrir(id, { w: 640, h: 854, shot: 'corpo', yaw: -20 });
  /* Um ciclo inteiro do idle (loop sem salto), entre 2 e 4 s. */
  const segundos = Math.min(4, Math.max(2, Math.round((corpo.idleSecs || 2) * FPS) / FPS));
  const total = Math.round(segundos * FPS);
  const dir = join('/tmp', `gen-pack-media-${id}`);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  await page.evaluate(() => CHARVID.reset());
  for (let n = 0; n < total; n += 8) {
    const lote = await page.evaluate((k) => { const out = []; for (let i = 0; i < k; i++) { CHARVID.step(); out.push(CHARVID.grab()); } return out; }, Math.min(8, total - n));
    for (let i = 0; i < lote.length; i++) {
      await sobre(png(lote[i]), FUNDO_CORPO).png().toFile(join(dir, `${String(n + i).padStart(4, '0')}.png`));
    }
  }
  execFileSync(process.execPath, [join(ROOT, 'tools/gen-char-video.mjs'), '--id', id, '--frames', dir, '--bg', 'cena', '--shot', 'corpo',
    '--fps', String(FPS), '--secs', String(total / FPS), '--w', '640', '--h', '854', '--wpn', charWeapon(id),
    '--out-file', join(ROOT, `public/video/chars/${id}.webm`), '--force'], { cwd: ROOT, stdio: 'pipe' });
  rmSync(dir, { recursive: true, force: true });
  recibos[id] = { manifestSha256: pose.manifestSha256, modelSha256: pose.modelSha256, weapon: pose.weapon, frames: total, fps: FPS, framing: corpo.framing };
  console.log(`✓ ${id} ${pose.weapon} ${total} quadros`);
}
await browser.close();
if (process.env.RECIBO) writeFileSync(process.env.RECIBO, `${JSON.stringify(recibos, null, 2)}\n`);
if (erros.length) { console.error(`Falhas no browser:\n${erros.join('\n')}`); process.exit(1); }
