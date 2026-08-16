/* weapon-shots.mjs — AS 26 MINIATURAS DE /armas, RENDERIZADAS DOS GLB QUE O JOGO USA.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA FERRAMENTA EXISTE

   `/armas` publica dano, pente, reserva e cadência das 26 armas e não mostra NENHUMA.
   O caminho tentador é pedir "uma AK-47 estilizada" para um gerador de imagem — e esse
   caminho já foi percorrido e reprovado neste repo, com as palavras do dono registradas
   na docstring de `tools/eval/team-plate.mjs`: *"a qualidade visual ficou muito boa, mas
   não usou os models reais que temos, tem que usar, tem personagens aí que não existem"*.
   Uma AK inventada num catálogo que promete "os números são os mesmos do jogo" é o mesmo
   erro, num lugar pior: a página existe justamente para ser a fonte confiável.

   Então aqui não há IA e não há rede. O modelo é `public/models/weapons/<id>.glb` montado
   pelo MESMO `weaponModel(id)` de `public/js/weapons.js` que o jogo chama para a
   viewmodel, para o pickup do chão e para a mão do bot. Se a arma aparece na miniatura,
   o GLB existe e o motor sabe desenhá-lo — por construção, não por revisão.

   ── CATÁLOGO: A CONSISTÊNCIA É O PRODUTO ───────────────────────────────────────────
   26 miniaturas lado a lado numa página é onde a falta de padrão salta. Três coisas são
   idênticas nas 26, por construção e não por disciplina:

     ÂNGULO       um só (`--yaw`/`--pitch`), aplicado ao grupo, nunca à câmera.
     LUZ          um só rig de estúdio, montado uma vez fora do laço.
     ENQUADRAMENTO **uma câmera só para as 26**, calculada em DUAS PASSADAS: a primeira
                  mede a caixa projetada de cada arma no ângulo escolhido, a segunda
                  renderiza todas dentro da UNIÃO dessas caixas.

   A caixa única é o mesmo padrão do giro do canarinho (`canarinho-icon.mjs`, "caixa
   única do giro") e é o que torna a ESCALA RELATIVA verdadeira: a AWP (1,15 m) sai
   3,8× mais comprida que a faca (0,30 m) porque ela É 3,8× mais comprida. Ajustar cada
   arma à sua própria caixa daria miniaturas mais "cheias" e mentiria sobre o arsenal —
   e o leitor não teria como saber que a faca não é do tamanho de um fuzil.

   ── POR QUE LUZ DE ESTÚDIO, E NÃO A LUZ DO JOGO ────────────────────────────────────
   A `team-plate` e a `canarinho-icon` usam a luz da TELA DE SELEÇÃO de propósito: lá
   existe um caminho de produção único onde o jogador vê aquele personagem. Arma não tem
   isso — ela é vista com a iluminação do MAPA (5 mapas, do salão fechado do Piscinão ao
   fim de tarde do Ferro Velho), e escolher um dos cinco faria as 26 miniaturas herdarem
   a cor de um mapa arbitrário. O rig aqui é neutro e igual para todas; o que ele NÃO faz
   é inventar geometria, cor de material ou textura, que é o que estava em jogo.

   ── PESO ───────────────────────────────────────────────────────────────────────────
   `public/` versionado está em ~352 MB contra o teto de 250 MB da CrazyGames, então
   miniatura aqui não é enfeite barato: a saída é WebP com alfa, no tamanho de exibição
   (`--px`), e a execução IMPRIME o peso somado. Qualquer aumento de `--px` tem que ser
   pago com esse número na mão.

   USO
     node tools/eval/serve.mjs 8123 &
     node tools/eval/weapon-shots.mjs --sheet          # grade de ângulos candidatos
     node tools/eval/weapon-shots.mjs --contato        # contact sheet das 26 no ângulo atual
     node tools/eval/weapon-shots.mjs                  # grava public/img/weapons/*.webp
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:8123';
const args = process.argv.slice(2);
const SHEET = args.includes('--sheet');
const CONTATO = args.includes('--contato');
const num = (k, d) => {
  const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
  return v === undefined ? d : parseFloat(v);
};
const TMP = (args.find((a) => a.startsWith('--tmp=')) || '').split('=')[1]
  || '/private/tmp/claude-504/-Users-ruben-game/8e0ad904-6bb5-4589-ab1a-48cf35c08b4f/scratchpad/wshots';
const SAIDA = (args.find((a) => a.startsWith('--out=')) || '').split('=')[1] || 'public/img/weapons';

/* ── ÂNGULO ────────────────────────────────────────────────────────────────────────
   `weaponModel()` entrega o cano em +Z e o grip na origem, então:
     yaw   = giro em torno do eixo vertical. 0° = cano apontando para a câmera (inútil);
             90° = perfil puro; entre os dois, o 3/4 que mostra a lateral E dá volume.
     pitch = de quanto se olha DE CIMA. Um pouco separa o corpo da arma do plano de fundo
             e mostra o topo do receiver (alça, trilho, tambor do revólver).
   Os dois valores saíram da grade de `--sheet`, olhando as 26 (ver o comentário no fim). */
const YAW = num('yaw', 105);
const PITCH = num('pitch', 12);
const PX = Math.round(num('px', 360));      // largura da miniatura publicada
const MARGEM = num('margem', 1.06);
/* EXPOSIÇÃO — o knob que mais mudou o resultado, e por um motivo estrutural: metal de
   arma é quase todo escuro, e 18 das 26 são pretas ou cinza-chumbo. Na primeira folha de
   contato (`contato.png`, exposição 1,15) as de madeira (AK, Mosin, SKS, carabina) liam
   bem e as pretas (M4, MP5, TAVOR, P90, SCAR, FAMAS, UZI, LMG) viravam mancha escura
   sobre fundo escuro — catálogo com metade das fichas ilegíveis. Medido depois com
   `--luma`, que imprime a mediana de luminância da TINTA de cada arma (só os pixels com
   alfa), que é o número que diz se a peça existe na página. */
const EXP = num('exp', 1.45);
const LUZ = num('luz', 1);

// ────────────────────────────────────────────────────────────────────────────────────
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(1200);

const ids = await page.evaluate(async (cfg) => {
  const THREE = await import('three');
  const W = await import('./js/weapons.js');
  const P = {};
  window.__wp = P;
  P.THREE = THREE; P.W = W; P.exp = cfg.exp; P.luz = cfg.luz;
  await W.preloadWeapons();

  /* ── AMBIENTE (IBL) — E POR QUE SEM ELE NÃO EXISTE MINIATURA DE ARMA ─────────────
     A primeira versão desta ferramenta tinha três luzes direcionais e nenhum ambiente,
     e 23 das 26 miniaturas reprovavam na `--luma` (uzi mediana 7 de 255, 78 % da tinta
     indistinguível do fundo). A explicação NÃO é "faltou exposição" — está escrita no
     próprio motor, em `public/js/game.js:1457`:

       "SEM ambiente (?env=0, ou PMREM falhando) metalness 1,0 lê como silhueta preta"

     Arma do arsenal é PBR metálica: sem `scene.environment`, o termo especular não tem
     de onde refletir e o material devolve preto por definição. Cranking de exposição não
     conserta isso, só estoura a madeira da AK enquanto a UZI continua preta — foi
     exatamente o que a varredura de `--exp` mostrou (uzi 7 -> 21 enquanto a carbine ia a
     117). O conserto é dar um ambiente, que é o que o jogo faz em `_buildEnv()`.

     O ambiente aqui é de ESTÚDIO, não o céu de um mapa: `_buildEnv` deriva o céu do
     `world.sun` de cada arena, e as 26 miniaturas herdariam a cor de um mapa arbitrário
     (o fim de tarde do Ferro Velho pinta tudo de laranja). Softbox superior grande +
     dois refletores laterais + piso de bounce, em FLOAT (HDR de verdade: o softbox vale
     ~12 em linear), passado pelo mesmo `PMREMGenerator` do jogo.

     MATERIAL NÃO É TOCADO. Com ambiente presente, o caminho de produção NÃO clampa
     metalness nem mexe em `envMapIntensity` (game.js:1463-1470, invariante MAT1: "mesmo
     GLB, mesmo material, nos 3 caminhos"). A miniatura usa o material do GLB como está. */
  P.ambiente = (renderer) => {
    if (P._env) return P._env;
    const W = 256, H = 128;
    const d = new Float32Array(W * H * 4);
    for (let j = 0; j < H; j++) {
      const v = (j + 0.5) / H, phi = (v - 0.5) * Math.PI;
      const sy = Math.sin(phi), cy = Math.cos(phi);
      for (let i = 0; i < W; i++) {
        const u = (i + 0.5) / W, th = (u - 0.5) * Math.PI * 2;
        const dx = cy * Math.cos(th), dz = cy * Math.sin(th);
        let r, g, b;
        if (sy >= 0) {
          const t = Math.pow(1 - sy, 3);
          r = 1.05 + (0.30 - 1.05) * t; g = 1.10 + (0.33 - 1.10) * t; b = 1.22 + (0.40 - 1.22) * t;
          // softbox: calota larga no alto — é ela que desenha o brilho comprido do cano
          const sb = Math.pow(Math.max(sy, 0), 2.2);
          r += 12 * sb; g += 12.3 * sb; b += 12.8 * sb;
          // dois refletores laterais, quentes de um lado e frios do outro: separa as duas
          // faces do receiver sem precisar de luz direcional apontada em arma nenhuma
          const lq = Math.pow(Math.max(-dx * 0.85 + dz * 0.5, 0), 5);
          const lf = Math.pow(Math.max(dx * 0.85 + dz * 0.4, 0), 5);
          r += 3.2 * lq + 0.9 * lf; g += 2.9 * lq + 1.1 * lf; b += 2.3 * lq + 1.6 * lf;
        } else {
          /* PISO DE BOUNCE — 0,22 e não 0,13. Com 0,13 a UZI ficava em 26,7 % de tinta
             invisível (teto 25): ela é a arma com maior fração de superfície virada para
             BAIXO no ângulo do catálogo — receiver chato, carregador longo saindo da
             coronha e nada de madeira para devolver luz. Subir a exposição global também
             fechava, mas ao preço de levar a SVD de 164 para ~180 e começar a queimar a
             madeira clara; subir o piso do chão mexe só no que está virado para baixo,
             que é onde o defeito estava. Medido: uzi 26,7 -> 17,9 % e a SVD anda 3 de
             luma. É o mesmo raciocínio do `gnd` de `_buildEnv` (game.js:1246), que
             também existe para o lado escuro não fechar em preto. */
          const t = Math.pow(1 + sy, 6);
          r = 0.22 * (1 + 2.2 * t); g = 0.225 * (1 + 2.2 * t); b = 0.235 * (1 + 2.0 * t);
        }
        const o = (j * W + i) * 4;
        d[o] = r * P.luz; d[o + 1] = g * P.luz; d[o + 2] = b * P.luz; d[o + 3] = 1;
      }
    }
    const tex = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.FloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    const pm = new THREE.PMREMGenerator(renderer); pm.compileEquirectangularShader();
    P._env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
    return P._env;
  };

  /* Direcionais por cima do IBL: o ambiente entrega volume e reflexo, e estas três
     entregam a ARESTA — o traço claro no topo do cano que faz a arma existir contra o
     fundo escuro da página. Ordem importa: o IBL é a base, não o contrário. */
  P.cena = (renderer) => {
    const k = P.luz;
    const s = new THREE.Scene();
    s.environment = P.ambiente(renderer);
    const key = new THREE.DirectionalLight(0xfff2dd, 2.0 * k); key.position.set(-2.2, 3.4, 3.0); s.add(key);
    const fill = new THREE.DirectionalLight(0x9fc4ff, 0.9 * k); fill.position.set(3.0, 1.2, 2.2); s.add(fill);
    const rim = new THREE.DirectionalLight(0xffd7a0, 1.4 * k); rim.position.set(1.4, 2.6, -3.2); s.add(rim);
    return s;
  };

  /* Um único grupo pivô: a arma entra nele, o pivô recebe yaw/pitch, a câmera nunca se
     move. Assim "mesmo ângulo" é uma propriedade do código, não uma promessa. */
  P.montar = (id, yaw, pitch) => {
    const g = P.W.weaponModel(id);
    if (!g) return null;
    const pivo = new THREE.Group();
    const rot = new THREE.Group();
    rot.add(g);
    rot.rotation.y = (yaw * Math.PI) / 180;
    pivo.add(rot);
    pivo.rotation.x = (pitch * Math.PI) / 180;
    pivo.updateMatrixWorld(true);
    // centra a arma no pivô pela caixa dela, senão o grip na origem joga a coronha
    // para fora do quadro nas armas de coronha longa.
    const bb = new THREE.Box3().setFromObject(pivo);
    const c = bb.getCenter(new THREE.Vector3());
    rot.position.sub(c.applyMatrix4(new THREE.Matrix4().extractRotation(pivo.matrixWorld).invert()));
    pivo.updateMatrixWorld(true);
    return pivo;
  };

  /* Caixa do que a GPU DESENHA, no plano da câmera (que olha -Z): meia-largura e
     meia-altura já em coordenadas de tela. `Box3.setFromObject` basta aqui — arma não é
     skinned mesh e não carrega sombra de contato nem hitbox invisível como o personagem
     (a armadilha que a `canarinho-icon.mjs` documenta em `caixaVisivel`). Conferido
     mesmo assim: nenhum dos 26 grupos tem material com `visible === false`. */
  P.caixa = (pivo) => {
    const bb = new THREE.Box3().setFromObject(pivo);
    return { w: bb.max.x - bb.min.x, h: bb.max.y - bb.min.y, cx: (bb.max.x + bb.min.x) / 2, cy: (bb.max.y + bb.min.y) / 2 };
  };

  P.invisiveis = (pivo) => {
    let n = 0;
    pivo.traverse((o) => { if (o.isMesh && (!o.visible || (o.material && o.material.visible === false))) n++; });
    return n;
  };

  /* UM renderer para as 26. Não é micro-otimização: o PMREM do ambiente é construído a
     partir do renderer, e um renderer por quadro significaria um ambiente por quadro —
     26 IBLs numericamente iguais mas gerados em contextos WebGL diferentes, que é
     precisamente o tipo de coisa que faz "mesma luz" deixar de ser verdade sem ninguém
     ver. Um renderer, um ambiente, 26 quadros. */
  P.render = (pivo, cam, w, h) => {
    if (!P._r) {
      P._canvas = document.createElement('canvas');
      P._r = new THREE.WebGLRenderer({ canvas: P._canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      P._r.outputColorSpace = THREE.SRGBColorSpace;
      P._r.toneMapping = THREE.ACESFilmicToneMapping;
    }
    const r = P._r;
    P._canvas.width = w; P._canvas.height = h;
    r.setSize(w, h, false);
    r.setClearColor(0x000000, 0);
    r.toneMappingExposure = P.exp;
    const s = P.cena(r); s.add(pivo);
    s.updateMatrixWorld(true);
    const c = new THREE.OrthographicCamera(-cam.hw, cam.hw, cam.hh, -cam.hh, 0.01, 100);
    c.position.set(cam.cx, cam.cy, 6);
    c.lookAt(cam.cx, cam.cy, 0);
    r.render(s, c);
    return P._canvas.toDataURL('image/png');
  };

  return P.W.WEAPON_IDS.slice();
}, { exp: EXP, luz: LUZ });

if (ids.length !== 26) { console.error(`WEAPON_IDS tem ${ids.length}, esperava 26`); process.exit(2); }

/* ── GARANTIA DE PROCEDÊNCIA ──────────────────────────────────────────────────────
   Antes de desenhar um pixel: cada id de `WEAPON_IDS` tem GLB no disco. Não é "eu olhei",
   é arquivo:tamanho impresso. (Se um dia voltar a existir `MODEL_ALIAS`, a arma reusada
   apontará para o GLB da arma-fonte e este bloco precisa saber disso.) */
const alias = await page.evaluate(() => {
  const o = {};
  for (const id of window.__wp.W.WEAPON_IDS) o[id] = window.__wp.W.hasWeapon(id);
  return o;
});
let faltando = 0;
for (const id of ids) {
  const f = `public/models/weapons/${id}.glb`;
  if (!fs.existsSync(f) || !alias[id]) { console.error(`FALTA modelo de ${id} (${f}, cache=${alias[id]})`); faltando++; }
}
if (faltando) { console.error('abortado: nada foi gravado'); await browser.close(); process.exit(2); }

fs.mkdirSync(TMP, { recursive: true });
const buf = (u) => Buffer.from(u.split(',')[1], 'base64');

// ── MODO --sheet: a mesma arma em vários ângulos, para ESCOLHER o ângulo ────────────
if (SHEET) {
  const alvo = (args.find((a) => a.startsWith('--arma=')) || '').split('=')[1] || 'ak';
  const comp = [];
  const CEL = 300, LIN = 110;
  const yaws = [90, 100, 108, 118, 130];
  const pitches = [0, 10, 14, 22];
  let i = 0;
  for (const p of pitches) for (const y of yaws) {
    const u = await page.evaluate(({ id, yy, pp }) => {
      const P = window.__wp;
      const pivo = P.montar(id, yy, pp);
      const b = P.caixa(pivo);
      return P.render(pivo, { hw: (b.w / 2) * 1.06, hh: ((b.w / 2) * 1.06 * 110) / 300, cx: b.cx, cy: b.cy }, 600, 220);
    }, { id: alvo, yy: y, pp: p });
    comp.push({ input: await sharp(buf(u)).resize(CEL, LIN).png().toBuffer(), left: 60 + (i % yaws.length) * (CEL + 6), top: 20 + Math.floor(i / yaws.length) * (LIN + 6) });
    comp.push({ input: Buffer.from(`<svg width="${CEL}" height="16"><text x="2" y="12" font-family="sans-serif" font-size="12" fill="#8f8">yaw ${y} · pitch ${p}</text></svg>`), left: 60 + (i % yaws.length) * (CEL + 6), top: 6 + Math.floor(i / yaws.length) * (LIN + 6) });
    i++;
    process.stdout.write('.');
  }
  const W = 60 + yaws.length * (CEL + 6) + 10, H = 20 + pitches.length * (LIN + 6) + 10;
  const f = path.join(TMP, `sheet-${alvo}.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: '#1b1a16' } }).composite(comp).png().toFile(f);
  console.log(`\n-> ${f}`);
  await browser.close();
  process.exit(0);
}

/* ── PASSADA 1: A CAIXA ÚNICA ──────────────────────────────────────────────────────
   Mede as 26 no ângulo final e devolve a união. É isto que faz o enquadramento ser
   literalmente o mesmo nas 26 e a escala relativa ser verdadeira. */
const caixas = [];
for (const id of ids) {
  const b = await page.evaluate(({ i, y, p }) => {
    const P = window.__wp;
    const pivo = P.montar(i, y, p);
    return { ...P.caixa(pivo), inv: P.invisiveis(pivo) };
  }, { i: id, y: YAW, p: PITCH });
  caixas.push({ id, ...b });
}
const inv = caixas.filter((c) => c.inv > 0);
if (inv.length) console.log(`aviso: ${inv.length} armas com malha invisível (${inv.map((c) => c.id).join(', ')}) — a caixa pode contar geometria que ninguém vê`);
const maxW = Math.max(...caixas.map((c) => c.w));
const maxH = Math.max(...caixas.map((c) => c.h));
const HW = (maxW / 2) * MARGEM;
const HH = (maxH / 2) * MARGEM;
const ASPECTO = HW / HH;
const PY = Math.round(PX / ASPECTO / 2) * 2;
const maisComp = caixas.reduce((a, b) => (b.w > a.w ? b : a));
const maisCurta = caixas.reduce((a, b) => (b.w < a.w ? b : a));
console.log(`caixa única (26 armas, yaw ${YAW}° pitch ${PITCH}°): ${(HW * 2).toFixed(3)} × ${(HH * 2).toFixed(3)} m -> ${PX}×${PY} px`);
console.log(`  mais comprida ${maisComp.id} ${maisComp.w.toFixed(3)} m · mais curta ${maisCurta.id} ${maisCurta.w.toFixed(3)} m (${(maisComp.w / maisCurta.w).toFixed(1)}× — a razão sobrevive na miniatura)`);

/* ── MODO --luma: A MINIATURA EXISTE NA PÁGINA? ────────────────────────────────────
   "Está escuro" é opinião; isto é medida. Para cada arma, no tamanho REAL de publicação:

     mediana   luminância (BT.601, byte) dos pixels de TINTA — só alfa > 128, senão a
               margem transparente domina a estatística e toda arma marca ~0.
     some%     fração da tinta abaixo de FUNDO+10.

   O piso do `some%` tem PROCEDÊNCIA, não é gosto: o fundo da página é `--bg:#0a0a08`
   (`src/layouts/Layout.astro:203`), luma 9,7, e o painel da tabela é
   `rgba(18,16,10,.78)` sobre ele — luma ~14. Pixel de arma abaixo de 20 está a menos de
   4 % de contraste do que ele senta em cima: ele está desenhado e não está visível.
   O teto de 25 % é o ponto em que um quarto da peça desaparece — aí não é sombra, é
   buraco na silhueta.

   A MEDIANA não ganha teto de propósito. Levantar um piso de mediana empurraria a
   correção para "clarear tudo", e arma preta é preta — a `--luma` existe para comparar
   as 26 ENTRE SI (o spread é o que denuncia catálogo inconsistente) e para provar que
   uma mudança de luz melhorou de fato, não para transformar aço em prata. */
const FUNDO = 14;      // luma do painel de /armas, medido do token acima
const SOME_MAX = 25;   // % de tinta indistinguível do fundo
if (args.includes('--luma')) {
  const rows = [];
  for (const id of ids) {
    const u = await page.evaluate(({ i, y, p, hw, hh, w, h }) => {
      const P = window.__wp;
      const pivo = P.montar(i, y, p);
      const b = P.caixa(pivo);
      return P.render(pivo, { hw, hh, cx: b.cx, cy: b.cy }, w, h);
    }, { i: id, y: YAW, p: PITCH, hw: HW, hh: HH, w: Math.round(PX * 2.5), h: Math.round(PY * 2.5) });
    const { data, info } = await sharp(buf(u)).resize(PX, PY, { kernel: 'lanczos3' })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const lum = [];
    for (let i2 = 0; i2 < info.width * info.height; i2++) {
      const o = i2 * info.channels;
      if (data[o + 3] <= 128) continue;
      lum.push(0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]);
    }
    lum.sort((a, b) => a - b);
    const med = lum[Math.floor(lum.length / 2)] || 0;
    const some = (100 * lum.filter((v) => v < FUNDO + 10).length) / (lum.length || 1);
    rows.push({ id, med, some, px: lum.length });
    process.stdout.write('.');
  }
  rows.sort((a, b) => a.med - b.med);
  console.log(`\n\n=== LEGIBILIDADE DA MINIATURA (exp ${EXP} · luz ${LUZ}×) ===`);
  console.log(`fundo da página luma ${FUNDO} · "some" = tinta abaixo de ${FUNDO + 10}\n`);
  for (const r of rows) console.log(`  ${r.id.padEnd(12)} mediana ${r.med.toFixed(0).padStart(3)}   some ${r.some.toFixed(1).padStart(5)} %   ${r.some > SOME_MAX ? '  <-- REPROVA' : ''}`);
  const ruins = rows.filter((r) => r.some > SOME_MAX);
  console.log(`\nmediana: ${rows[0].med.toFixed(0)} (${rows[0].id}) .. ${rows[rows.length - 1].med.toFixed(0)} (${rows[rows.length - 1].id})`);
  console.log(ruins.length ? `\n${ruins.length}/26 acima de ${SOME_MAX} % de tinta invisível` : `\n0/26 acima de ${SOME_MAX} % de tinta invisível -> PASSA`);
  await browser.close();
  process.exit(ruins.length ? 1 : 0);
}

// ── MODO --contato: as 26 numa folha, no tamanho REAL de publicação ────────────────
if (CONTATO) {
  const COLS = 4;
  const comp = [];
  for (let i = 0; i < ids.length; i++) {
    const u = await page.evaluate(({ id, y, p, hw, hh }) => {
      const P = window.__wp;
      const pivo = P.montar(id, y, p);
      const b = P.caixa(pivo);
      return P.render(pivo, { hw, hh, cx: b.cx, cy: b.cy }, 900, Math.round((900 * hh) / hw), true);
    }, { id: ids[i], y: YAW, p: PITCH, hw: HW, hh: HH });
    const col = i % COLS, lin = Math.floor(i / COLS);
    comp.push({ input: await sharp(buf(u)).resize(PX, PY).png().toBuffer(), left: 8 + col * (PX + 8), top: 22 + lin * (PY + 24) });
    comp.push({ input: Buffer.from(`<svg width="${PX}" height="18"><text x="2" y="13" font-family="sans-serif" font-size="12" fill="#e8b34b">${ids[i]}</text></svg>`), left: 8 + col * (PX + 8), top: 4 + lin * (PY + 24) });
    process.stdout.write('.');
  }
  const f = path.join(TMP, 'contato.png');
  await sharp({ create: { width: 8 + COLS * (PX + 8), height: 22 + Math.ceil(ids.length / COLS) * (PY + 24), channels: 4, background: '#141008' } })
    .composite(comp).png().toFile(f);
  console.log(`\n-> ${f}`);
  await browser.close();
  process.exit(0);
}

/* ── PASSADA 2: GRAVA ──────────────────────────────────────────────────────────────
   Supersampling 2,5× e redução lanczos: o cano de uma arma tem 2-3 px de espessura na
   miniatura, e sem supersampling ele serrilha ou some. WebP com alfa (`alphaQuality`
   alto): o fundo da tabela de /armas é escuro mas não é uma cor só — recortar contra
   uma cor fixa deixaria halo no dia em que o painel mudar de tom. */
const SS = 2.5;
fs.mkdirSync(SAIDA, { recursive: true });
let total = 0;
const linhas = [];
for (const id of ids) {
  const u = await page.evaluate(({ i, y, p, hw, hh, w, h }) => {
    const P = window.__wp;
    const pivo = P.montar(i, y, p);
    const b = P.caixa(pivo);
    return P.render(pivo, { hw, hh, cx: b.cx, cy: b.cy }, w, h);
  }, { i: id, y: YAW, p: PITCH, hw: HW, hh: HH, w: Math.round(PX * SS), h: Math.round(PY * SS) });
  const f = path.join(SAIDA, `${id}.webp`);
  await sharp(buf(u)).resize(PX, PY, { kernel: 'lanczos3' })
    .webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(f);
  const kb = fs.statSync(f).size / 1024;
  total += fs.statSync(f).size;
  linhas.push(`  ${id.padEnd(12)} ${kb.toFixed(1).padStart(6)} KB`);
  process.stdout.write('.');
}
await browser.close();
console.log(`\n${linhas.join('\n')}`);
console.log(`\n${ids.length} miniaturas ${PX}×${PY} WebP em ${SAIDA}/`);
console.log(`PESO SOMADO: ${(total / 1024).toFixed(1)} KB (${(total / 1024 / 1024).toFixed(2)} MB) · média ${(total / ids.length / 1024).toFixed(1)} KB`);
