// G2-R2 (MENUS/UI): captura thumbnails quadrados REAIS dos mapas pro seletor de mapa.
// Entra numa partida debug por mapa, congela os bots, esconde HUD + viewmodel + racks de
// arma e tira screenshots 900x900 em VÁRIOS yaws (calibração — o melhor vira o asset).
// Saída: /tmp/gauntlet/g2ui-maps/<id>-y<yaw>.png → escolhido → public/img/map-previews/<id>.jpg
//
// Uso:
//   node tools/eval/g2ui-map-previews.mjs [mapa1,mapa2] [yaw1,yaw2,...]
//   node tools/eval/g2ui-map-previews.mjs --write <mapa>=<arquivo.png> [...]
//
// POSE: um mapa pode declarar um ponto de vista fixo em POSES (abaixo). Sem pose, a
// câmera fica onde o jogador nasceu — que é onde o mapa é MENOS fotogênico (spawn
// olha pra parede em 2 dos 4 mapas). A pose é fixada quadro a quadro por rAF porque
// gravidade e colisão puxam o jogador de volta pro chão em ~3 quadros.
//
// PORQUE `domcontentloaded` E NÃO `load`: com os GLB de personagem + áudio o evento
// `load` não chega em 30 s nesta árvore (medido 04/08: goto estourava o timeout com o
// jogo JÁ jogável na tela). Quem diz que a cena está pronta é `__game.state`, não o
// evento de rede.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = '/tmp/gauntlet/g2ui-maps';
const DEST = 'public/img/map-previews';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const SIZE = 640;               // as thumbs versionadas são 640×640 (sips no asset antigo)
const SHOT = 900;               // captura maior e reduz: antialias de graça

// Pontos de vista escolhidos a olho depois da varredura de calibração.
// pos = [x, y, z] em metros nos PÉS do jogador (o olho fica ~1,6 m acima); yaw 0 = +Z.
// Extents reais medidos por `g.world.bounds` (04/08):
//   praca_poderes  X ±35,0  Z -76..84   | piscina_treta  X ±16,5  Z ±24,5
//   loja_h X ±37,5  Z ±57,5     | ferro_velho X ±31,5  Z ±35,5
// `yaw` é o quadro ESCOLHIDO (o que virou o .jpg versionado em 04/08); a varredura de
// calibração ignora esse campo e passa a lista de yaws da linha de comando.
const POSES = process.env.POSES ? JSON.parse(process.env.POSES) : {
  // Esplanada em perspectiva, ministérios dos dois lados, Catedral no fundo do eixo.
  praca_poderes:      { pos: [0, 8.0, 30], pitch: -0.10, yaw:  0.3 },
  // Piscina inteira no quadro com o trampolim em primeiro plano e os cartazes na parede.
  piscina_treta:  { pos: [0, 3.5, 18], pitch: -0.16, yaw:  0.0 },
  // Estátua centrada com a fachada LOJA H atrás e o estacionamento cheio na frente.
  loja_h:     { pos: [0, 3.0, 44], pitch: -0.12, yaw:  0.6 },
  // Pilhas de carro + guindaste + rotatória: o "cânion" e a profundidade do pátio.
  ferro_velho:{ pos: [0, 5.0, 12], pitch: -0.15, yaw: -0.6 },
  // Rua inteira do campinho até a rotunda do baile, comércio dos dois lados, faixa na
  // frente. Câmera alta e pitch fundo porque a -0,17 metade do cartaz era céu.
  quebrada:  { pos: [0, 8.0, 30], pitch: -0.30, yaw:  0.0 },
  /* Os três do Ubiracy chegaram como PRINT DE PARTIDA — arma, HUD e o "VALENDO!" no
     quadro. Regerados em 21/08 pela mesma pose aérea: do spawn a câmera olha para fora
     do mapa nos três, e a nível do olho o cartaz vira 60% de céu. yaw 3,14 é o único
     meio-giro que enquadra o mapa inteiro. */
  velho_oeste:   { pos: [0, 30, -35], pitch: -0.55, yaw: 3.14 },
  penitenciaria: { pos: [0, 30, -35], pitch: -0.55, yaw: 3.14 },
  parque_treta:  { pos: [0, 30, -35], pitch: -0.55, yaw: 3.14 },
  // Mesma pose aérea dos irmãos USANTOS: enquadra galpão, praça da fogueira e quentão.
  gelo:          { pos: [0, 30, -35], pitch: -0.55, yaw: 3.14 },
};
const NOPOSE = process.env.NOPOSE === '1';   // captura do spawn, sem pino de posição
const TAG = process.env.TAG || '';

/* ---------------- modo --write: PNG escolhido → JPG versionado ---------------- */
if (process.argv[2] === '--write') {
  const sharp = (await import('sharp')).default;
  for (const arg of process.argv.slice(3)) {
    const [id, src] = arg.split('=');
    if (!id || !src) { console.error('uso: --write <mapa>=<arquivo.png>'); process.exit(2); }
    const buf = await sharp(src).resize(SIZE, SIZE, { fit: 'cover' }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    writeFileSync(`${DEST}/${id}.jpg`, buf);
    console.log('write', `${DEST}/${id}.jpg`, (buf.length / 1024).toFixed(1) + ' KB');
  }
  process.exit(0);
}

/* ---------------- modo captura ---------------- */
const LIST = (process.argv[2] || 'praca_poderes,piscina_treta,loja_h,ferro_velho,quebrada').split(',');
const YAWS = (process.argv[3] || '-2.4,-1.8,-1.2,-0.6,0,0.6,1.2,1.8,2.4,3.0').split(',').map(Number);
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: SHOT, height: SHOT } });
let errors = 0;
// 404 de recurso vira `console.error` sem `pageerror`; áudio faltando (BUG-19) não é
// defeito de mapa e não pode reprovar a captura.
page.on('console', m => {
  const t = m.text();
  if (m.type() !== 'error') return;
  if (/Failed to load resource/.test(t)) return;
  errors++; console.error('[console-err]', t);
});
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });

for (const mapId of LIST) {
  await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${mapId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
  await page.addStyleTag({ content: '#hud{display:none!important}' });
  await page.evaluate((pose) => {
    const g = window.__game;
    g.player.hp = 1e9;
    g.player.pitch = pose ? pose.pitch : 0.03;
    if (g.vmScene) g.vmScene.visible = false;
    // BOTS E ARMAS DE CHÃO: `visible = false` NÃO segura, nem uma vez nem por quadro.
    // O bot morre, RESPAWNA e o próprio jogo devolve `group.visible = true`
    // (`game.js:2249-2251`); e o rAF do jogo desenha ANTES do nosso, então qualquer
    // limpeza nossa é desfeita antes do próximo render. Enterrar em y=-80 tem o mesmo
    // problema. O primeiro cartão gerado assim saiu com 5 bots parados no meio da
    // Esplanada, cada um com o anel de time embaixo (`game.js:5065` amarra o halo à
    // visibilidade do grupo) — lê como captura de debug, não como cartaz de mapa.
    // Trava a propriedade: o setter do jogo vira no-op e o render sempre lê false.
    const mute = (o) => { try { Object.defineProperty(o, 'visible', { get: () => false, set: () => {}, configurable: true }); } catch {} };
    for (const b of g.bots || []) if (b.mesh?.group) mute(b.mesh.group);
    if (g.drops) for (const d of g.drops) if (d.mesh) mute(d.mesh);
    // FIXA a pose todo quadro: gravidade + colisão derrubam a câmera pro chão em ~3 quadros.
    window.__pin = { yaw: 0, pitch: pose ? pose.pitch : 0.03, pos: pose ? pose.pos : null };
    const tick = () => {
      const gg = window.__game;
      const p = gg?.player;
      if (p) {
        p.yaw = window.__pin.yaw; p.pitch = window.__pin.pitch;
        if (window.__pin.pos) p.pos.set(window.__pin.pos[0], window.__pin.pos[1], window.__pin.pos[2]);
        p.vel?.set?.(0, 0, 0);
        if (gg.vmScene) gg.vmScene.visible = false;
        for (const b of gg.bots || []) if (b.mesh?.group) mute(b.mesh.group);
        if (gg.drops) for (const d of gg.drops) if (d.mesh) mute(d.mesh);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, NOPOSE ? null : (POSES[mapId] || null));
  await page.waitForTimeout(900);
  for (const yaw of YAWS) {
    await page.evaluate((y) => { window.__pin.yaw = y; }, yaw);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${mapId}${TAG}-y${yaw}.png` });
  }
  console.log('shot', mapId, YAWS.length + ' yaws');
}
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);
