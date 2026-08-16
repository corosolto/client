// Gera VÍDEO do personagem a partir do MODELO REAL do jogo.
//
// É o par de `tools/gen-image.mjs` (arte 2D por texto via OpenRouter): ali a
// imagem é inventada a partir de um prompt, aqui ela é MEDIDA a partir do GLB.
// Os dois se encontram no `--ref` do gen-image: o frame que sai daqui é a
// referência que trava a identidade do personagem quando o modelo de imagem
// entra para dar acabamento realista.
//
// POR QUE NÃO TEXT-TO-VIDEO: o pedido é "100% igual ao modelo". Modelo generativo
// não sabe quem é o Mandrake — ele desenha *um* mandrake. Aqui cada frame sai do
// mesmo buildCharacterModel() que o jogo chama, com o mesmo rig, o mesmo clipe e
// a mesma luz (ver public/charvideo.html). Fidelidade não é promessa: é o mesmo código.
//
// Uso:
//   node tools/gen-char-video.mjs --id mandrake --bg alpha --shot busto --secs 3
//   node tools/gen-char-video.mjs --id mandrake --bg cena --shot corpo --pose idle --secs 5
//   node tools/gen-char-video.mjs --todos --bg alpha --shot busto --secs 3
//
// Flags:
//   --id <nome>     personagem (id de characters.js). Obrigatório, salvo com --todos
//   --todos         roda o elenco inteiro achado em public/models/characters/
//   --bg cena|alpha cena = mapa + composite do jogo; alpha = recorte transparente
//   --shot busto|corpo   enquadramento (busto p/ avatar, corpo p/ tela de resultado)
//   --pose <estado> idle (padrão), walk, run, shoot, death, crouch, jump
//   --secs N        duração (padrão 3)
//   --fps N         quadros por segundo (padrão 24)
//   --w/--h N       resolução (padrão 512x512 no alpha, 1280x720 na cena)
//   --spin N        graus por segundo de giro (turntable). 0 = parado
//   --map <id>      mapa de fundo/luz (padrão loja_h)
//   --out <dir>     padrão public/video/chars
//   --base <url>    padrão http://localhost:8123 (suba com `npm run eval:serve`)
//   --keep-frames   não apaga os PNGs intermediários
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const flag = (n) => argv.includes(`--${n}`);
const die = (m) => { console.error('ERRO:', m); process.exit(1); };

const TODOS = flag('todos');
const BG = (arg('bg', 'alpha') || 'alpha').toLowerCase();
if (!['cena', 'alpha'].includes(BG)) die(`--bg desconhecido: ${BG} (use cena ou alpha)`);
const SHOT = (arg('shot', BG === 'alpha' ? 'busto' : 'corpo') || '').toLowerCase();
if (!['busto', 'corpo'].includes(SHOT)) die(`--shot desconhecido: ${SHOT} (use busto ou corpo)`);
const POSE = arg('pose', 'idle');
const SECS = parseFloat(arg('secs', '3'));
const FPS = parseInt(arg('fps', '24'), 10);
const W = parseInt(arg('w', BG === 'alpha' ? '512' : '1280'), 10);
const H = parseInt(arg('h', BG === 'alpha' ? '512' : '720'), 10);
const SPIN = parseFloat(arg('spin', '0'));
const MAP = arg('map', 'loja_h');
const OUT = arg('out', 'public/video/chars');
const BASE = arg('base', process.env.BASE || 'http://localhost:8123');
const KEEP = flag('keep-frames');
const TMP = '/tmp/gen-char-video';

const N_FRAMES = Math.max(1, Math.round(SECS * FPS));

let IDS = [];
if (TODOS) {
  IDS = readdirSync('public/models/characters')
    .filter((f) => f.endsWith('.glb'))
    .map((f) => f.replace(/\.glb$/, ''))
    .sort();
} else {
  const id = arg('id');
  if (!id) die('faltou --id (ou --todos)');
  IDS = [id];
}

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

/* ffmpeg: alpha só sobrevive em VP9/webm com yuva420p. H.264 não tem canal alfa,
   então o recorte transparente sai SÓ em webm; o modo cena, que é opaco, sai nos
   dois (mp4 para Safari antigo, webm para o resto). */
function encoda(padrao, saidaSemExt) {
  const comum = ['-y', '-framerate', String(FPS), '-i', padrao];
  const feitos = [];
  if (BG === 'alpha') {
    const webm = `${saidaSemExt}.webm`;
    execFileSync('ffmpeg', [...comum,
      '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '34',
      '-an', webm], { stdio: 'pipe' });
    feitos.push(webm);
  } else {
    const mp4 = `${saidaSemExt}.mp4`;
    execFileSync('ffmpeg', [...comum,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow',
      '-movflags', '+faststart', '-an', mp4], { stdio: 'pipe' });
    feitos.push(mp4);
    const webm = `${saidaSemExt}.webm`;
    execFileSync('ffmpeg', [...comum,
      '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', '34',
      '-an', webm], { stdio: 'pipe' });
    feitos.push(webm);
  }
  return feitos;
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--no-sandbox'],
});

let falhas = 0;
for (const ID of IDS) {
  const t0 = Date.now();
  const dir = `${TMP}/${ID}-${BG}-${SHOT}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 200)); });

  const url = `${BASE}/charvideo.html?id=${encodeURIComponent(ID)}&bg=${BG}&shot=${SHOT}`
    + `&w=${W}&h=${H}&fps=${FPS}&pose=${encodeURIComponent(POSE)}&spin=${SPIN}`
    + `&map=${encodeURIComponent(MAP)}`;

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.CHARVID && window.CHARVID.ready, null, { timeout: 120000 });
    await page.evaluate(() => window.CHARVID.reset());

    for (let f = 0; f < N_FRAMES; f++) {
      const dataUrl = await page.evaluate((fps) => {
        window.CHARVID.step(1 / fps);
        return window.CHARVID.grab();
      }, FPS);
      const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      writeFileSync(`${dir}/${String(f).padStart(4, '0')}.png`, Buffer.from(b64, 'base64'));
    }

    const saida = `${OUT}/${ID}-${SHOT}`;
    const feitos = encoda(`${dir}/%04d.png`, saida);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`✓ ${ID} · ${N_FRAMES}f · ${secs}s → ${feitos.join(' , ')}`);
    if (!KEEP) rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    falhas++;
    console.error(`✗ ${ID}: ${String(e.message || e).slice(0, 200)}`);
    if (erros.length) console.error('   console:', [...new Set(erros)].slice(0, 3).join(' | '));
  }
  await page.close();
}

await browser.close();
if (falhas) { console.error(`${falhas} de ${IDS.length} falharam`); process.exit(1); }
console.log(`pronto: ${IDS.length} personagem(ns) em ${OUT}/`);
