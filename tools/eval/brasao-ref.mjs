/* brasao-ref.mjs — A REFERÊNCIA VISUAL DO BRASÃO, TIRADA DO GLB QUE O JOGO USA.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA FERRAMENTA EXISTE

   O pedido do dono é "pegue o rosto do Oakley com a touca medusa e faça em formato
   ícone". A lição mais cara do projeto está escrita na docstring de `team-plate.mjs` e
   repetida na de `canarinho-icon.mjs`: **gerador de imagem por texto desenha o
   arquétipo, não o teu personagem**. Uma leva inteira de placas de facção foi reprovada
   porque os personagens eram inventados — a causa não foi prompt ruim, foi partir do
   TEXTO em vez do MODELO.

   Então esta ferramenta não gera nada e não fala com rede nenhuma. Ela renderiza a
   CABEÇA de `public/models/characters/<id>.glb` pelo MESMO `buildCharacterModel()` de
   `glbchars.js` que a tela de seleção chama, e grava PNGs que servem de `--ref` para o
   `tools/gen-image.mjs`. O brasão nasce do boneco, não de uma descrição dele.

   ── AMBIENTE NÃO É ENFEITE, É O QUE IMPEDE A SILHUETA PRETA ──────────────────────
   Está escrito em `public/js/game.js:1457`: "SEM ambiente (?env=0, ou PMREM falhando)
   metalness 1,0 lê como silhueta preta". Foi o defeito das 26 miniaturas de arma, e o
   Oakley é o pior caso possível dessa armadilha — `characters.js:563` declara
   `shirt: 0x1a1a1a, hair: 0x1a1a1a` e ele usa ÓCULOS ESCUROS sobre uma touca escura.
   Três direcionais e nenhum `environment` devolvem uma mancha preta onde deveria estar
   o rosto, e o modelo de imagem copiaria a mancha.

   Por isso aqui o PMREM entra em `scene.environment` (o corpo inteiro), não só num
   material — é a diferença entre `canarinho-icon.mjs` (que ilumina só a arma, porque só
   a arma é metálica) e este arquivo. `--medir` imprime a luminância média da caixa do
   rosto: é o número que prova que não é preto no preto.

   ── UM RENDERER PARA A EXECUÇÃO INTEIRA ──────────────────────────────────────────
   Mesma pegadinha registrada em `canarinho-icon.mjs:484`: o `PMREMGenerator` produz um
   render target do CONTEXTO WebGL que o criou, então envMap gerado num renderer
   descartável não existe no renderer seguinte, e a falha é SILENCIOSA.

   USO
     node tools/eval/serve.mjs 8123 &
     node tools/eval/brasao-ref.mjs --id=oakley            # grava os PNGs de referência
     node tools/eval/brasao-ref.mjs --id=oakley --medir    # luminância do rosto
     node tools/eval/brasao-ref.mjs --id=oakley --half=0.19 --dy=0.02   # reenquadra
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8123';
const args = process.argv.slice(2);
const val = (k, d) => {
  const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
  return v === undefined ? d : v;
};
const num = (k, d) => { const v = val(k); return v === undefined ? d : parseFloat(v); };
const MEDIR = args.includes('--medir');
const ID = val('id', 'oakley');
const OUT = val('out', '/private/tmp/claude-504/-Users-ruben-game/8e0ad904-6bb5-4589-ab1a-48cf35c08b4f/scratchpad/brasao');
const PX = Math.round(num('px', 768));
/* Enquadramento da cabeça. `half` é a meia-caixa da ortográfica em METROS: a cabeça de
   um personagem de 1,72 m mede ~0,22 m, então 0,17 dá o rosto com um pouco de gola.
   `dy` sobe/desce o centro a partir do osso Head (o osso fica na BASE do crânio, não no
   meio dele, então o padrão sobe um pouco). */
const HALF = num('half', 0.17);
const DY = num('dy', 0.045);
/* Ângulos gravados. 0 = de frente (é o que vai pro brasão); os outros existem para eu
   confirmar que a touca é volume e não textura chapada antes de mandar pro gerador. */
const YAWS = (val('yaws', '0,-20,20,-35') || '').split(',').map(Number);

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
await page.waitForTimeout(1500);

await page.evaluate(async ({ id }) => {
  const THREE = await import('three');
  const G = await import('./js/glbchars.js');
  const C = await import('./js/characters.js');
  const P = {}; window.__ref = P;
  P.THREE = THREE;

  P.rend = (w, h) => {
    if (!P._r) {
      P._canvas = document.createElement('canvas');
      P._r = new THREE.WebGLRenderer({ canvas: P._canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      P._r.outputColorSpace = THREE.SRGBColorSpace;
      P._r.toneMapping = THREE.ACESFilmicToneMapping;
    }
    P._canvas.width = w; P._canvas.height = h;
    P._r.setSize(w, h, false);
    return P._r;
  };

  /* Softbox alto + preenchimento frio, em FLOAT, pelo mesmo PMREMGenerator do
     `_buildEnv()` do jogo. Vai para `scene.environment`: o alvo aqui é a PELE e o
     PLÁSTICO PRETO do óculos, não só um metal. */
  P.ambiente = () => {
    if (P._env) return P._env;
    const W = 256, H = 128;
    const d = new Float32Array(W * H * 4);
    for (let j = 0; j < H; j++) {
      const v = (j + 0.5) / H, phi = (v - 0.5) * Math.PI;
      const sy = Math.sin(phi), cy = Math.cos(phi);
      for (let i = 0; i < W; i++) {
        const u = (i + 0.5) / W, th = (u - 0.5) * Math.PI * 2;
        const dz = cy * Math.sin(th);
        let r, g, b;
        if (sy >= 0) {                       // céu -> softbox: claro no zênite, morno no horizonte
          const t = Math.pow(1 - sy, 2.4);
          r = 1.15 + (0.42 - 1.15) * t; g = 1.20 + (0.46 - 1.20) * t; b = 1.32 + (0.55 - 1.32) * t;
          if (dz > 0.55) { const k = (dz - 0.55) / 0.45; r += 0.5 * k; g += 0.5 * k; b += 0.52 * k; }  // refletor FRONTAL: é ele que acende o rosto
        } else {                              // chão -> bounce quente fraco
          const t = Math.pow(Math.max(-sy, 0), 0.7);
          r = 0.30 * (1 - 0.6 * t); g = 0.27 * (1 - 0.6 * t); b = 0.24 * (1 - 0.6 * t);
        }
        const o = (j * W + i) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 1;
      }
    }
    const tex = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.FloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
    const pm = new THREE.PMREMGenerator(P.rend(64, 64)); pm.compileEquirectangularShader();
    P._env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
    return P._env;
  };

  P.cena = () => {
    const s = new THREE.Scene();
    s.environment = P.ambiente();          // <- o que impede o rosto preto (ver docstring)
    s.environmentIntensity = 1.0;
    s.add(new THREE.HemisphereLight(0xffe6c0, 0x5a4a38, 0.55));
    const key = new THREE.DirectionalLight(0xfff0d8, 1.9); key.position.set(1.6, 2.4, 3.4); s.add(key);
    const rim = new THREE.DirectionalLight(0x9ec0ff, 1.1); rim.position.set(-2.6, 1.8, -1.4); s.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffb066, 0.6); rim2.position.set(2.6, 1.2, -2.0); s.add(rim2);
    return s;
  };

  P.osso = (raiz, re) => { let b = null; raiz.traverse((o) => { if (o.isBone && !b && re.test(o.name)) b = o; }); return b; };

  P.pronto = async () => {
    if (P._cena) return P._dim;
    const def = C.CHARACTERS.find((c) => c.id === id);
    if (!def) throw new Error(`personagem ${id} não existe em characters.js`);
    await G.preloadCharacterAssets([id]);
    if (!G.hasModel(id)) throw new Error(`${id}.glb não carregou`);
    const m = G.buildCharacterModel(def, { weapon: false });
    if (!m) throw new Error('buildCharacterModel devolveu null');
    if (m.ctrl && m.ctrl.shadow) m.ctrl.shadow.visible = false;
    const s = P.cena(); s.add(m.group);
    s.updateMatrixWorld(true);
    const head = P.osso(m.group, /^Head$/);
    if (!head) throw new Error('osso Head não encontrado');
    head.updateWorldMatrix(true, false);
    P._cena = s; P._modelo = m.group;
    P._dim = { headY: +head.matrixWorld.elements[13].toFixed(4), team: def.team, nome: def.name };
    return P._dim;
  };

  P.quadro = (yaw, cam, px) => {
    P._modelo.rotation.y = (yaw * Math.PI) / 180;
    P._cena.updateMatrixWorld(true);
    const r = P.rend(px, px);
    r.setClearColor(0x000000, 0);
    const c = new THREE.OrthographicCamera(-cam.half, cam.half, cam.half, -cam.half, 0.01, 100);
    c.position.set(0, cam.y, 4); c.lookAt(0, cam.y, 0);
    r.render(P._cena, c);
    return P._canvas.toDataURL('image/png');
  };
}, { id: ID });

const dim = await page.evaluate(() => window.__ref.pronto());
const CAM = { half: HALF, y: +(dim.headY + DY).toFixed(4) };
console.log(`${dim.nome} (time ${dim.team}) · osso Head em y=${dim.headY} m -> caixa ±${CAM.half} m centrada em y=${CAM.y}`);

fs.mkdirSync(OUT, { recursive: true });
const buf = (u) => Buffer.from(u.split(',')[1], 'base64');
const arquivos = [];
for (const y of YAWS) {
  const b = buf(await page.evaluate(({ yy, cam, px }) => window.__ref.quadro(yy, cam, px), { yy: y, cam: CAM, px: PX }));
  const f = path.join(OUT, `${ID}-head-${y < 0 ? 'm' : ''}${Math.abs(y)}.png`);
  fs.writeFileSync(f, b);
  arquivos.push(f);
  console.log(`  ${path.basename(f)}  ${(b.length / 1024).toFixed(1)} KB`);
}

/* ── A MEDIDA QUE PROVA QUE O ROSTO NÃO É UMA MANCHA PRETA ──────────────────────────
   Luminância média dos pixels OPACOS do quadro frontal. O defeito das 26 armas dava
   luminância de silhueta (~0,02-0,05); rosto iluminado de verdade fica bem acima. */
if (MEDIR) {
  const m = await page.evaluate(({ cam, px }) => {
    const P = window.__ref;
    P.quadro(0, cam, px);
    const g = P._canvas.getContext('2d') || null;
    const c2 = document.createElement('canvas'); c2.width = c2.height = px;
    const x2 = c2.getContext('2d');
    const img = new Image();
    return new Promise((res) => {
      img.onload = () => {
        x2.drawImage(img, 0, 0);
        const d = x2.getImageData(0, 0, px, px).data;
        let n = 0, sum = 0, min = 1, max = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue;
          const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
          sum += l; n++; if (l < min) min = l; if (l > max) max = l;
        }
        res({ n, media: n ? sum / n : 0, min, max, cobertura: n / (px * px) });
      };
      img.src = P.quadro(0, cam, px);
      void g;
    });
  }, { cam: CAM, px: 256 });
  console.log(`\nMEDIDA (quadro frontal, pixels opacos):`);
  console.log(`  cobertura   ${(m.cobertura * 100).toFixed(1)} % do quadro`);
  console.log(`  luminância  média ${m.media.toFixed(3)}  ·  min ${m.min.toFixed(3)}  ·  max ${m.max.toFixed(3)}`);
  console.log(`  ${m.media >= 0.18 ? 'OK' : 'RUIM'}: silhueta preta é média < 0,08 (defeito das 26 armas). Teto de aceite: >= 0,18.`);
}

await browser.close();
console.log(`\n${arquivos.length} referência(s) em ${OUT}`);
