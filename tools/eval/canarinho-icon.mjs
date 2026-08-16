/* canarinho-icon.mjs — O FAVICON E O GIF, RENDERIZADOS DO GLB QUE O JOGO USA.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA FERRAMENTA EXISTE

   O pedido do dono é literal: *"o canarinho, agachado, uma perna à frente, segurando a
   pistola"*. Existe uma lição registrada na rodada das placas de facção
   (`tools/eval/team-plate.mjs`, docstring): **gerador de imagem por texto desenha o
   arquétipo, não o teu personagem**. As placas antigas saíram bonitas e ERRADAS porque
   os personagens eram inventados. Um favicon inventado seria o mesmo erro num arquivo
   que aparece em toda aba do navegador.

   Então aqui não há IA nem rede: o boneco é `public/models/characters/canarinho.glb`,
   montado pelo MESMO `buildCharacterModel()` de `glbchars.js` que a tela de seleção
   chama, e a pistola é a MESMA `weaponModel('deagle')` de `weapons.js` — `deagle` não é
   escolha de gosto, é o que `CHAR_WEAPON.canarinho` declara (`characters.js:594`), ou
   seja, a arma com que ele nasce em partida.

   ── POSE ESTÁTICA, PELO MESMO MOTIVO DA PLACA ────────────────────────────────────
   16 dos 44 personagens deformam em pose ANIMADA (KNOWN-BUGS BUG-25). O canarinho NÃO
   é um deles — medido, não suposto:

     node tools/eval/select-inflate.mjs canarinho,mandrake,pagodeiro
     canarinho  deagle  p99=0.655  ruins/1e4=37.0   (teto: p99 <= 0.761 · ruins/1e4 <= 55.8)

   Mesmo assim a pose aqui é escrita como ROTAÇÃO RÍGIDA NO OSSO a partir da bind, sem
   mixer, sem blend e sem IK — as três fontes de rasgo que a `select-inflate` isolou.
   Não é superstição: `--medir` imprime a métrica desta pose contra o mesmo teto, e o
   agachamento força ângulos de quadril/joelho que nenhum clipe do jogo tem.

   ── A ARMA VEM DO MOTOR, NÃO DE UM PALPITE DE ORIENTAÇÃO ─────────────────────────
   `buildCharacterModel({ weaponId })` roda 10 quadros de `ctrl.update` para assentar o
   mount (glbchars.js) — isto é, ele SAI da bind. Por isso montamos DOIS modelos:

     A) com arma  -> serve só para o motor calcular o mount (posição/rotação/escala
                     LOCAIS ao osso da mão, portanto independentes de pose);
     B) sem arma  -> chega na bind, limpa, e é o que vai para a tela.

   O mount de A é reparentado no osso da mão de B. Resultado: pose 100% estática com a
   pegada que o jogo de verdade calcula. Nenhum número de rotação de arma foi escrito
   à mão neste arquivo.

   ── O QUE DECIDE O RESULTADO: 16 PIXELS ──────────────────────────────────────────
   Favicon vive a 16×16. `--sheet` renderiza a grade de ângulos JÁ REDUZIDA a 16 e 32 px
   ao lado do tamanho grande, sobre aba clara E escura, porque olhar a versão ampliada é
   como aprovar tipografia no zoom de 400%.

   USO
     node tools/eval/serve.mjs 8123 &
     node tools/eval/canarinho-icon.mjs --sheet     # grade de ângulos, com 16/32 px reais
     node tools/eval/canarinho-icon.mjs --medir     # rasgo de pele desta pose vs. teto
     node tools/eval/canarinho-icon.mjs             # grava os arquivos finais
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:8123';
const args = process.argv.slice(2);
const SHEET = args.includes('--sheet');
const MEDIR = args.includes('--medir');
const num = (k, d) => {
  const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
  return v === undefined ? d : parseFloat(v);
};
const TMP = (args.find((a) => a.startsWith('--tmp=')) || '').split('=')[1]
  || '/private/tmp/claude-504/-Users-ruben-game/8e0ad904-6bb5-4589-ab1a-48cf35c08b4f/scratchpad/ico';
/* Diretório de saída. `public` é o padrão e é o que ninguém precisa digitar; existe para
   que a variante de CONTROLE (`--armaenv=0`) possa ser gerada sem sobrescrever o que
   está no ar — é isso que torna o antes/depois da `--medir-arma` uma comparação entre
   dois arquivos REALMENTE PRODUZIDOS, e não entre dois renders de laboratório. */
const OUT = (args.find((a) => a.startsWith('--out=')) || '').split('=')[1] || 'public';
const dest = (rel) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };

const ID = 'canarinho';
const SS = 4;              // supersampling do quadro grande
const HERO = 512;          // lado do quadro herói antes de reduzir
const GIRO_N = Math.round(num('frames', 24));   // quadros do giro
const GIRO_PX = Math.round(num('gif', 256));    // lado do GIF/WebP

/* ── POSE ──────────────────────────────────────────────────────────────────────────
   Ângulos em graus. Cada osso é APONTADO para uma direção do MUNDO (o personagem olha
   para +Z, que é a câmera), então os números abaixo são lidos como "quanto à frente" e
   "quanto abaixo" — não como euler de rig, que ninguém consegue revisar.

   `agacho` desce o quadril fechando quadril+joelho; a perna DIANTEIRA (direita, a do
   lado da arma) vai à frente e a TRASEIRA fica atrás com o joelho baixo. O corpo todo é
   reassentado no chão depois (o esqueleto é ancorado no Hips: girar perna move o PÉ,
   não o quadril), então quem garante que ele não flutua é a medida da bbox, não a pose. */
const POSE = {
  coxaF: num('coxaF', 78),      // coxa dianteira: graus à frente da vertical
  joelhoF: num('joelhoF', 5),   // canela dianteira: graus atrás da vertical
  coxaT: num('coxaT', 25),      // coxa traseira: graus atrás da vertical
  joelhoT: num('joelhoT', 75),  // canela traseira: graus atrás da vertical
  peF: num('peF', 0),           // pé dianteiro: graus de ponta (0 = plano)
  peT: num('peT', 45),          // pé traseiro: calcanhar levantado
  tronco: num('tronco', 22),    // inclinação do tronco para frente
  cabeca: num('cabeca', -10),   // negativo = queixo sobe (olhando à frente, não pro chão)
  bracoD: num('bracoD', 48),    // úmero direito: graus abaixo da lateral
  bracoDfrente: num('bracoDfrente', 52),
  cotoveloD: num('cotoveloD', 48), // antebraço direito para a frente (a arma segue a mão)
  bracoE: num('bracoE', 54),
  bracoEfrente: num('bracoEfrente', 48),
  cotoveloE: num('cotoveloE', 64),
  antebracoEdentro: num('antebracoEdentro', 60), // mão de apoio vem para o eixo do corpo
};
/* MEDIDO, e é o número que diz que ele agachou de verdade: o quadril cai de 0,717 m
   para 0,529 m (−26,2 %). A altura TOTAL só cai de 1,72 m para 1,53 m (−11 %) porque
   este boneco tem perna curta e cabeça enorme (`CHR1`: cabeça/altura 0,223 contra 0,13
   da antropometria) — julgar o agachamento pela altura total subestima pela metade. */

/* Ângulo do herói (favicon). O giro do GIF passa por todos; este é o quadro que fica
   parado na aba. Escolhido na `--sheet`, olhando a coluna de 16 px. */
const YAW_HERO = num('yaw', 60);

/* Intensidade do envMap aplicado SÓ na arma. 0 desliga (comportamento anterior, para o
   antes/depois de `--medir-arma`). 1,45 é o valor medido: ver o bloco `iluminaArma`. */
const ARMA_ENV = num('armaenv', 1.45);

const TETO = { p99: 0.761, ruins1e4: 55.8 };   // select_inflate.json — mesma procedência

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
await page.waitForTimeout(1500);

await page.evaluate(async ({ pose, armaEnv }) => {
  const THREE = await import('three');
  const G = await import('./js/glbchars.js');
  const C = await import('./js/characters.js');
  const P = {};
  window.__ico = P;
  P.THREE = THREE; P.G = G; P.C = C; P.pose = pose; P.armaEnv = armaEnv;

  const osso = (raiz, re) => { let b = null; raiz.traverse((o) => { if (o.isBone && !b && re.test(o.name)) b = o; }); return b; };

  /* Gira `b` de modo que a direção MUNDO b→filho vire `alvo`. Rotação rígida: o osso
     inteiro (e tudo abaixo) acompanha, exatamente como um clipe faria. Cópia deliberada
     do `apontar` de team-plate.mjs — a lógica é a mesma e é curta; importar entre
     ferramentas de eval exigiria transformar o arquivo em módulo com efeito colateral. */
  function apontar(b, filho, alvo) {
    b.updateWorldMatrix(true, true);
    const a = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    const c = new THREE.Vector3().setFromMatrixPosition(filho.matrixWorld);
    const cur = c.sub(a);
    if (cur.lengthSq() < 1e-12) return null;
    cur.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(cur, alvo.clone().normalize());
    const pw = new THREE.Quaternion(); b.parent.getWorldQuaternion(pw);
    const bw = new THREE.Quaternion(); b.getWorldQuaternion(bw);
    b.quaternion.copy(pw.invert().multiply(q).multiply(bw));
    b.updateMatrixWorld(true);
    return cur;
  }
  function girar(b, eixo, ang) {
    const q = new THREE.Quaternion().setFromAxisAngle(eixo, ang);
    const pw = new THREE.Quaternion(); b.parent.getWorldQuaternion(pw);
    const bw = new THREE.Quaternion(); b.getWorldQuaternion(bw);
    b.quaternion.copy(pw.invert().multiply(q).multiply(bw));
    b.updateMatrixWorld(true);
  }
  P._osso = osso;

  /* Direção no plano sagital: `abaixo` graus a partir da horizontal +Z, com sinal de
     `frente`. dir(90,+1) = reto para baixo. dir(30,+1) = 30° abaixo da horizontal,
     à frente. dir(30,-1) = idem, para trás. */
  const dir = (abaixo, frente) => {
    const r = (abaixo * Math.PI) / 180;
    return new THREE.Vector3(0, -Math.sin(r), Math.cos(r) * (frente < 0 ? -1 : 1));
  };

  P.posar = (model) => {
    const p = P.pose;
    const g = (d) => (d * Math.PI) / 180;
    const X = new THREE.Vector3(1, 0, 0);

    // ── PERNAS ── direita = dianteira (é o lado da arma; o joelho da frente não pode
    //    tapar a pistola, então a arma fica do MESMO lado que avança).
    const perna = (lado, coxa, joelho, pe, frenteCoxa) => {
      const up = osso(model, new RegExp(`^${lado}UpLeg$`));
      const lo = osso(model, new RegExp(`^${lado}Leg$`));
      const ft = osso(model, new RegExp(`^${lado}Foot$`));
      const toe = osso(model, new RegExp(`^${lado}ToeBase$`));
      if (!up || !lo || !ft) return;
      apontar(up, lo, dir(90 - coxa, frenteCoxa));
      apontar(lo, ft, dir(90 - joelho, -1));
      if (toe) apontar(ft, toe, dir(pe, +1));
    };
    perna('Right', p.coxaF, p.joelhoF, p.peF, +1);
    perna('Left', p.coxaT, p.joelhoT, p.peT, -1);

    // ── TRONCO ── dividido nas três juntas: uma junta só engolindo 16° dobra a barriga.
    for (const n of ['Spine02', 'Spine01', 'Spine']) {
      const b = osso(model, new RegExp(`^${n}$`));
      if (b) girar(b, X, g(p.tronco / 3));
    }
    const head = osso(model, /^Head$/);
    if (head) girar(head, X, g(p.cabeca));

    // ── BRAÇOS ── o direito segura a arma: úmero para baixo/frente, antebraço à frente,
    //    e a arma (mount local ao osso da mão) segue sozinha. O esquerdo é a mão de
    //    apoio: mesmo desenho, com o antebraço trazido para o eixo do corpo.
    const braco = (lado, abaixo, frente, cotovelo, dentro) => {
      const arm = osso(model, new RegExp(`^${lado}Arm$`));
      const fore = osso(model, new RegExp(`^${lado}ForeArm$`));
      const hand = osso(model, new RegExp(`^${lado}Hand$`));
      if (!arm || !fore || !hand) return;
      arm.updateWorldMatrix(true, true);
      const a = new THREE.Vector3().setFromMatrixPosition(arm.matrixWorld);
      const c = new THREE.Vector3().setFromMatrixPosition(fore.matrixWorld);
      const lateral = new THREE.Vector3(c.x - a.x, 0, 0).normalize();   // preserva o lado
      const alvoU = lateral.clone().multiplyScalar(Math.cos(g(abaixo)))
        .add(new THREE.Vector3(0, -Math.sin(g(abaixo)), 0))
        .add(new THREE.Vector3(0, 0, Math.sin(g(frente))))
        .normalize();
      apontar(arm, fore, alvoU);
      const alvoF = alvoU.clone().multiplyScalar(Math.cos(g(cotovelo)))
        .add(new THREE.Vector3(0, 0, Math.sin(g(cotovelo))))
        .add(lateral.clone().multiplyScalar(-Math.sin(g(dentro)) * 0.6))
        .normalize();
      apontar(fore, hand, alvoF);
    };
    braco('Right', p.bracoD, p.bracoDfrente, p.cotoveloD, 0);
    braco('Left', p.bracoE, p.bracoEfrente, p.cotoveloE, p.antebracoEdentro);
    model.updateMatrixWorld(true);
  };

  /* Métrica de rasgo de pele — a mesma da select-inflate/team-plate, sobre a pele que a
     GPU desenha. Gêmeo NÃO posado como referência (buildCharacterModel reescala depois
     do bindMatrix; comparar com o buffer cru daria razão ~110 em todos). */
  P.medir = (posado, referencia) => {
    const ma = [], mb = [];
    posado.traverse((o) => { if (o.isSkinnedMesh) ma.push(o); });
    referencia.traverse((o) => { if (o.isSkinnedMesh) mb.push(o); });
    if (ma.length !== mb.length) return { erro: 'malhas divergem' };
    const rs = [];
    const vb = new THREE.Vector3(), vp = new THREE.Vector3();
    const d = (arr, i, j) => Math.hypot(arr[i * 3] - arr[j * 3], arr[i * 3 + 1] - arr[j * 3 + 1], arr[i * 3 + 2] - arr[j * 3 + 2]);
    for (let mi = 0; mi < ma.length; mi++) {
      const sm = ma[mi], sr = mb[mi];
      sm.skeleton.update(); sr.skeleton.update();
      const pos = sm.geometry.attributes.position, N = pos.count;
      const bx = new Float32Array(N * 3), px = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        vb.fromBufferAttribute(sr.geometry.attributes.position, i); sr.applyBoneTransform(i, vb);
        bx[i * 3] = vb.x; bx[i * 3 + 1] = vb.y; bx[i * 3 + 2] = vb.z;
        vp.fromBufferAttribute(pos, i); sm.applyBoneTransform(i, vp);
        px[i * 3] = vp.x; px[i * 3 + 1] = vp.y; px[i * 3 + 2] = vp.z;
      }
      const idx = sm.geometry.index;
      const tri = idx ? idx.count : N;
      const vistas = new Set();
      for (let t = 0; t < tri; t += 3) {
        const v = [0, 1, 2].map((k) => (idx ? idx.getX(t + k) : t + k));
        for (let e = 0; e < 3; e++) {
          const a = v[e], b = v[(e + 1) % 3];
          const chave = a < b ? a * 1e7 + b : b * 1e7 + a;
          if (vistas.has(chave)) continue;
          vistas.add(chave);
          const L0 = d(bx, a, b), L = d(px, a, b);
          if (L0 < 1e-7 || L < 1e-9) continue;
          rs.push(Math.max(L / L0, L0 / L) - 1);
        }
      }
    }
    if (!rs.length) return { erro: 'sem arestas' };
    rs.sort((a, b) => a - b);
    const q = (f) => rs[Math.min(rs.length - 1, Math.floor(f * rs.length))];
    const acima = (t) => rs.reduce((n, v) => n + (v > t ? 1 : 0), 0);
    return {
      arestas: rs.length,
      p99: +q(0.99).toFixed(3), p999: +q(0.999).toFixed(3), max: +rs[rs.length - 1].toFixed(2),
      ruins1e4: +((1e4 * acima(1.0)) / rs.length).toFixed(1),
    };
  };

  /* Luz: a MESMA do preview da tela de seleção (main.js), pelo mesmo motivo da placa —
     o ícone e o personagem que o jogador vê ao clicar têm de ser o mesmo bicho.
     O `rim` frio é mais forte aqui porque o ícone vive sobre fundo desconhecido: sem
     recorte de luz, a 16 px a silhueta encosta no fundo e some. */
  P.cena = () => {
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffe6c0, 0x5a4a38, 1.05));
    const key = new THREE.DirectionalLight(0xffe8c0, 2.1); key.position.set(2.6, 4.2, 3.6); s.add(key);
    const rim = new THREE.DirectionalLight(0x9ec0ff, 1.35); rim.position.set(-3.4, 2.6, -2.0); s.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffb066, 0.7); rim2.position.set(3.4, 2.0, -2.6); s.add(rim2);
    return s;
  };

  /* ── A PISTOLA ESTAVA LÁ E NINGUÉM VIA ────────────────────────────────────────────
     O pedido do dono foi "o canarinho girando devia segurar uma arma", e a arma JÁ
     estava na mão desde o primeiro giro: `monta()` reparenta o mount da `deagle` e o
     `pronto()` gira exatamente esse modelo. Extraindo os 24 quadros do
     `canarinho-header.webp` commitado, a pistola aparece em todos.

     O defeito é de LEITURA, e tem a mesma causa raiz que as miniaturas de /armas
     tiveram — está escrita em `public/js/game.js:1457`: "SEM ambiente (?env=0, ou PMREM
     falhando) metalness 1,0 lê como silhueta preta". A `cena()` daqui tem três
     direcionais e nenhum `environment`, então a deagle (metal preto) devolve quase preto
     — e ela é servida a 60 px de altura, dentro de um recorte de CSS, sobre um fundo
     marrom escuro. Preto sobre preto, com 8 px de comprimento: existe e não se vê.

     O ambiente é aplicado SÓ NO MATERIAL DA ARMA, não em `scene.environment`. O
     canarinho é desenhado por um shader próprio (`characters.js`, piso de albedo
     regional do BUG-24) e o dono já aprovou como ele está no header: mudar a luz da CENA
     mudaria o passarinho junto, que não é o que foi pedido. Material é clonado antes,
     senão o envMap vazaria para o cache compartilhado de `weapons.js` e para qualquer
     outra arma montada na mesma página.

     GEOMETRIA NÃO MUDA — nenhum vértice, nenhum osso, nenhuma escala. É a garantia de
     que a caixa única do giro (e portanto os 604×240 e o recorte x 288-586 / y 0-236 que
     o `.brand-bird` de Layout.astro assume) continua idêntica. A execução IMPRIME essa
     caixa: se o número mudar, o recorte do header quebrou e tem que ser avisado.

     Kill-switch: `--armaenv=0` volta ao estado anterior — é assim que o antes/depois da
     `--medir-arma` é medido no mesmo binário. */
  P.iluminaArma = (mount) => {
    const env = P.ambienteArma();
    mount.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const novos = mats.map((m) => {
        const c = m.clone();
        if ('envMap' in c) { c.envMap = env; c.envMapIntensity = P.armaEnv; }
        c.needsUpdate = true;
        return c;
      });
      o.material = Array.isArray(o.material) ? novos : novos[0];
    });
  };

  /* Softbox alto + dois refletores, em FLOAT, pelo mesmo PMREMGenerator que o
     `_buildEnv()` do jogo usa. Pequeno de propósito (128×64): o alvo tem 8 px na tela,
     e mip de PMREM acima disso é byte gasto sem diferença medível. */
  P.ambienteArma = () => {
    if (P._envArma) return P._envArma;
    const W = 128, H = 64;
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
          r = 0.9 + (0.26 - 0.9) * t; g = 0.95 + (0.29 - 0.95) * t; b = 1.06 + (0.36 - 1.06) * t;
          const sb = Math.pow(Math.max(sy, 0), 2.2);
          r += 10 * sb; g += 10.2 * sb; b += 10.6 * sb;
          const lq = Math.pow(Math.max(-dx * 0.85 + dz * 0.5, 0), 5);
          const lf = Math.pow(Math.max(dx * 0.85 + dz * 0.4, 0), 5);
          r += 3.0 * lq + 0.8 * lf; g += 2.7 * lq + 1.0 * lf; b += 2.1 * lq + 1.5 * lf;
        } else {
          const t = Math.pow(1 + sy, 6);
          r = 0.20 * (1 + 2.2 * t); g = 0.205 * (1 + 2.2 * t); b = 0.215 * (1 + 2.0 * t);
        }
        const o = (j * W + i) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 1;
      }
    }
    const tex = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.FloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    const pm = new THREE.PMREMGenerator(P.rend(64, 64)); pm.compileEquirectangularShader();
    P._envArma = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
    return P._envArma;
  };

  /* Monta o canarinho posado, com a pistola do jogo na mão. Ver docstring: dois modelos,
     porque o caminho com arma do `buildCharacterModel` assenta o mount rodando o mixer
     (= sai da bind), e o mount é local ao osso da mão (= vale em qualquer pose). */
  P.monta = async ({ semArma = false, semPose = false } = {}) => {
    const def = P.C.CHARACTERS.find((c) => c.id === 'canarinho');
    await P.G.preloadCharacterAssets(['canarinho']);
    if (!P.G.hasModel('canarinho')) throw new Error('canarinho.glb não carregou');
    const alvo = P.G.buildCharacterModel(def, { weapon: false });
    if (!alvo) throw new Error('buildCharacterModel devolveu null');
    if (alvo.ctrl && alvo.ctrl.shadow) alvo.ctrl.shadow.visible = false;
    if (!semArma) {
      const wid = P.C.charWeapon('canarinho');
      const doador = P.G.buildCharacterModel(def, { weaponId: wid });
      const mao = (m) => { let b = null; m.traverse((o) => { if (o.isBone && !b && /^RightHand$/.test(o.name)) b = o; }); return b; };
      const mA = mao(doador.group), mB = mao(alvo.group);
      if (!mA || !mB) throw new Error('osso RightHand não encontrado');
      const mount = mA.children.find((k) => !k.isBone);
      if (!mount) throw new Error('mount da arma não encontrado (o motor mudou?)');
      mB.add(mount);                       // reparenta preservando o transform LOCAL
      if (P.armaEnv) P.iluminaArma(mount);
      alvo.armaOk = true;
    }
    if (!semPose) P.posar(alvo.group);
    alvo.group.updateMatrixWorld(true);
    return alvo;
  };

  /* Caixa do que a GPU DESENHA. `Box3.setFromObject` conta objeto invisível: o grupo do
     personagem carrega a sombra de contato (plano largo, `visible=false` aqui) e a
     hitbox de cabeça (`MeshBasicMaterial({visible:false})`, glbchars.js). Medido: com
     eles dentro, o raio dava 0,877 m — exatamente a envergadura da BIND — e não mudava
     com pose nenhuma, ou seja, o enquadramento estava sendo decidido por geometria que
     ninguém vê. */
  P.caixaVisivel = (grupo) => {
    const bb = new THREE.Box3();
    const tmp = new THREE.Box3();
    grupo.updateMatrixWorld(true);
    grupo.traverse((o) => {
      if (!o.isMesh || !o.visible || (o.material && o.material.visible === false)) return;
      for (let p = o.parent; p; p = p.parent) if (!p.visible) return;
      if (!o.geometry) return;
      if (o.isSkinnedMesh) {          // bbox de geometria não segue o esqueleto
        const pos = o.geometry.attributes.position, v = new THREE.Vector3();
        const step = Math.max(1, Math.ceil(pos.count / 8000));
        for (let i = 0; i < pos.count; i += step) {
          v.fromBufferAttribute(pos, i); o.applyBoneTransform(i, v);
          bb.expandByPoint(o.localToWorld(v));
        }
      } else {
        tmp.setFromObject(o); bb.union(tmp);
      }
    });
    return bb;
  };

  /* Assenta o grupo no chão e devolve o raio que a câmera precisa cobrir GIRANDO.
     O enquadramento do GIF tem de ser FIXO, senão o boneco pulsa a cada quadro: o raio
     é o maior |x|,|z| do corpo, não a largura de um ângulo. */
  P.assenta = (grupo) => {
    const bb = P.caixaVisivel(grupo);
    grupo.position.y -= bb.min.y;
    grupo.updateMatrixWorld(true);
    const b2 = P.caixaVisivel(grupo);
    const r = Math.max(Math.abs(b2.min.x), Math.abs(b2.max.x), Math.abs(b2.min.z), Math.abs(b2.max.z));
    return { raio: r, alturaMin: b2.min.y, alturaMax: b2.max.y };
  };

  /* Monta UMA vez e guarda. Cada `monta()` custa dois `buildCharacterModel` + preload, e
     o giro pede 24 quadros: sem cache cada execução gastava ~45 s montando o mesmo
     boneco, e iterar pose vira espera em vez de trabalho. */
  P.pronto = async () => {
    if (P._cena) return P._dim;
    const m = await P.monta();
    if (!m.armaOk) throw new Error('a arma não montou');
    const s = P.cena(); s.add(m.group);
    const g = P.assenta(m.group);
    const ref = await P.monta({ semArma: true, semPose: true });
    P.assenta(ref.group);
    /* AGACHAMENTO = quadril acima do TORNOZELO, não acima do chão do quadro.
       O chão do quadro é o ponto mais baixo do que se desenha, e neste boneco isso às
       vezes é a PONTA DA CAUDA: medido, a mesma pose de perna dava 0,621 m e 0,529 m só
       porque o tronco inclinou e a cauda passou a ser o ponto mais baixo. Tornozelo é
       osso, não sobra de silhueta. */
    const yb = (raiz, re) => { const b = P._osso(raiz, re); b.updateWorldMatrix(true, false); return b.matrixWorld.elements[13]; };
    const qh = (raiz) => yb(raiz, /^Hips$/) - Math.min(yb(raiz, /^LeftFoot$/), yb(raiz, /^RightFoot$/));
    P._cena = s; P._modelo = m.group;
    P._dim = {
      ...g,
      cabecaY: +yb(m.group, /^Head$/).toFixed(3),
      quadril: +qh(m.group).toFixed(3),
      quadrilBind: +qh(ref.group).toFixed(3),
    };
    s.remove(ref.group);
    return P._dim;
  };
  P.quadro = (yaw, cam, px) => {
    P._modelo.rotation.y = (yaw * Math.PI) / 180;
    P._cena.updateMatrixWorld(true);
    return P.render(P._cena, px, px, cam);
  };

  /* UM renderer para a execução inteira. Antes era um por quadro, e a primeira tentativa
     de iluminar a arma FALHOU EM SILÊNCIO por causa disso: o `PMREMGenerator` produz um
     render target do CONTEXTO WebGL que o criou, então o envMap gerado num renderer
     descartável não existe para o renderer do quadro seguinte. O sintoma foi bonito de
     diagnosticar — o `.webp` saiu com **exatamente os mesmos 98.064 bytes** do arquivo
     commitado, ou seja, nem um pixel mudou. Um renderer só, um ambiente só. */
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

  P.render = (scene, w, h, cam) => {
    const r = P.rend(w, h);
    const canvas = P._canvas;
    r.setClearColor(0x000000, 0);
    const c = new THREE.OrthographicCamera(-cam.half, cam.half, cam.half, -cam.half, 0.01, 100);
    const cx = cam.x || 0;
    c.position.set(cx, cam.y, cam.z);
    c.lookAt(cx, cam.y, 0);
    r.render(scene, c);
    return canvas.toDataURL('image/png');   // NÃO descarta: o renderer é o da execução inteira
  };
}, { pose: POSE, armaEnv: ARMA_ENV });

const buf = (u) => Buffer.from(u.split(',')[1], 'base64');
fs.mkdirSync(TMP, { recursive: true });

/* Enquadramento: câmera ORTOGRÁFICA. Num giro com perspectiva o boneco "respira" (a
   parte que se aproxima cresce) e num ícone de 32 px isso lê como tremor. Ortográfica
   também é o que faz a silhueta do quadro parado ser a mesma que o GIF mostra. */
const dim = await page.evaluate(async () => window.__ico.pronto());
const MARGEM = 1.04;
const CAM_CORPO = {
  half: +(Math.max(dim.raio, (dim.alturaMax - dim.alturaMin) / 2) * MARGEM).toFixed(4),
  y: +((dim.alturaMax + dim.alturaMin) / 2).toFixed(4),
  z: 6,
};
console.log(`enquadramento: raio ${dim.raio.toFixed(3)} m · altura ${dim.alturaMin.toFixed(3)}..${dim.alturaMax.toFixed(3)} m -> meia-caixa ${CAM_CORPO.half} m`);
console.log(`agachamento: quadril ${dim.quadril} m acima do tornozelo, contra ${dim.quadrilBind} m na bind (-${((1 - dim.quadril / dim.quadrilBind) * 100).toFixed(1)} %)`);

// ── MODO --medir ────────────────────────────────────────────────────────────────────
if (MEDIR) {
  const r = await page.evaluate(async () => {
    const P = window.__ico;
    const posado = await P.monta({ semArma: true });
    const ref = await P.monta({ semArma: true, semPose: true });
    const s = P.cena(); s.add(posado.group); s.add(ref.group);
    s.updateMatrixWorld(true);
    return P.medir(posado.group, ref.group);
  });
  console.log('\n=== RASGO DE PELE NA POSE DO ÍCONE (métrica da select-inflate) ===');
  console.log(`  ${ID}  p99=${r.p99}  p99.9=${r.p999}  máx=${r.max}  ruins/1e4=${r.ruins1e4}  (${r.arestas} arestas)`);
  console.log(`  TETO (select_inflate.json, calibrado no que o dono chama de balão): p99 <= ${TETO.p99} · ruins/1e4 <= ${TETO.ruins1e4}`);
  const ok = r.p99 <= TETO.p99 && r.ruins1e4 <= TETO.ruins1e4;
  console.log(ok ? '  -> PASSA\n' : '  -> REPROVA\n');
  await browser.close();
  process.exit(ok ? 0 : 1);
}

/* CORTE BUSTO — calculado, não chutado: a caixa que contém a CABEÇA e a ARMA no ângulo
   herói, com folga. A câmera ganha deslocamento em X porque a arma fica à frente do
   corpo e uma caixa centrada no eixo do boneco cortaria justamente o cano. */
const bustoCam = async (yaw) => {
  const b = await page.evaluate(({ y }) => {
    const P = window.__ico;
    P._modelo.rotation.y = (y * Math.PI) / 180;
    P._cena.updateMatrixWorld(true);
    const THREE = P.THREE;
    const cab = P._osso(P._modelo, /^Head$/);
    const mao = P._osso(P._modelo, /^RightHand$/);
    const arma = mao.children.find((k) => !k.isBone);
    const cx = new THREE.Box3().setFromObject(arma);
    const pc = new THREE.Vector3().setFromMatrixPosition(cab.matrixWorld);
    const bb = new THREE.Box3().setFromObject(P._modelo);   // só para o topo da crista
    return {
      cabeca: pc.toArray(), topo: bb.max.y,
      arma: [cx.min.toArray(), cx.max.toArray()],
    };
  }, { y: yaw });
  const minX = Math.min(b.cabeca[0] - 0.30, b.arma[0][0]);
  const maxX = Math.max(b.cabeca[0] + 0.30, b.arma[1][0]);
  const minY = Math.min(b.cabeca[1] - 0.30, b.arma[0][1]);
  const maxY = Math.max(b.topo, b.arma[1][1]);
  const half = (Math.max(maxX - minX, maxY - minY) / 2) * 1.06;
  const c = { half: +half.toFixed(4), x: +((minX + maxX) / 2).toFixed(4), y: +((minY + maxY) / 2).toFixed(4), z: 6 };
  /* Aperto opcional: `--bhalf` encolhe a caixa (a arma sai pelo canto) e `--bx/--by`
     reencontram o centro. Existe porque a caixa que CABE tudo não é a que LÊ a 16 px —
     ver a tabela de `--cortes`. */
  const h2 = num('bhalf', 0);
  if (h2 > 0) {
    c.x = +(c.x + num('bx', 0)).toFixed(4);
    c.y = +(c.y + num('by', 0)).toFixed(4);
    c.half = h2;
  }
  return c;
};

// ── MODO --sheet: a grade de ângulos, JÁ a 16 e 32 px ───────────────────────────────
/* Sem esta redução a revisão é teatro: tudo lê bem a 512 px. As duas faixas de fundo
   (clara e escura) existem porque o favicon é transparente e a aba não é. */
if (SHEET) {
  const angs = [];
  for (let a = 0; a < 360; a += num('passo', 15)) angs.push(a);
  const linhas = [];
  for (const a of angs) {
    linhas.push({ a, buf: buf(await page.evaluate(({ y, cam }) => window.__ico.quadro(y, cam, 384), { y: a, cam: CAM_CORPO })) });
    process.stdout.write('.');
  }
  console.log('');
  await grade(linhas.map((l) => ({ rot: `${l.a}°`, buf: l.buf })), path.join(TMP, 'sheet-angulos.png'));
  console.log(`-> ${path.join(TMP, 'sheet-angulos.png')}`);
  await browser.close();
  process.exit(0);
}

/* Grade de revisão: grande à esquerda, e à direita o MESMO quadro reduzido a 48, 32 e
   16 px sobre branco, cinza-claro (aba inativa do Chrome claro) e grafite (tema escuro).
   É esta coluna da direita que decide, não a da esquerda. */
async function grade(itens, saida) {
  const CEL = 128, PAD = 8, TAM = [48, 32, 16], BGS = ['#ffffff', '#d6d3cc', '#202124'];
  const W = 46 + CEL + PAD + TAM.length * BGS.length * 30 + TAM.reduce((s, t) => s + t * BGS.length, 0);
  const H = itens.length * (CEL + PAD) + 12;
  const comp = [];
  for (let i = 0; i < itens.length; i++) {
    const top = 6 + i * (CEL + PAD);
    comp.push({ input: await sharp(itens[i].buf).resize(CEL, CEL).png().toBuffer(), left: 46, top });
    comp.push({ input: Buffer.from(`<svg width="46" height="20"><text x="4" y="15" font-family="sans-serif" font-size="13" fill="#fff">${itens[i].rot}</text></svg>`), left: 0, top: top + CEL / 2 - 10 });
    let x = 46 + CEL + PAD;
    for (const t of TAM) {
      const p = await sharp(itens[i].buf).resize(t, t).png().toBuffer();
      for (const bg of BGS) {
        comp.push({
          input: await sharp({ create: { width: t + 16, height: t + 16, channels: 4, background: bg } })
            .composite([{ input: p, left: 8, top: 8 }]).png().toBuffer(),
          left: x, top: top + Math.round(CEL / 2 - (t + 16) / 2),
        });
        x += t + 16 + 6;
      }
      x += 8;
    }
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: '#3a3a3a' } })
    .composite(comp).png().toFile(saida);
}

// ── MODO --cortes: corpo inteiro × busto, no tamanho REAL ───────────────────────────
if (args.includes('--cortes')) {
  const bc = await bustoCam(YAW_HERO);
  const itens = [{ rot: 'corpo', buf: buf(await page.evaluate(({ yy, cam }) => window.__ico.quadro(yy, cam, 512), { yy: YAW_HERO, cam: CAM_CORPO })) }];
  for (const [nome, c] of [
    ['busto', bc],
    ['b .46', { ...bc, half: 0.46, y: bc.y + 0.06, x: bc.x - 0.04 }],
    ['b .38', { ...bc, half: 0.38, y: bc.y + 0.10, x: bc.x - 0.07 }],
    ['b .30', { ...bc, half: 0.30, y: bc.y + 0.14, x: bc.x - 0.10 }],
  ]) {
    itens.push({ rot: nome, buf: buf(await page.evaluate(({ yy, cam }) => window.__ico.quadro(yy, cam, 512), { yy: YAW_HERO, cam: c })) });
    console.log(`${nome}: meia-caixa ${c.half} · centro (${(+c.x).toFixed(3)}, ${(+c.y).toFixed(3)})`);
  }
  await grade(itens, path.join(TMP, 'sheet-cortes.png'));
  console.log(`-> ${path.join(TMP, 'sheet-cortes.png')}`);
  await browser.close();
  process.exit(0);
}


/* ── MODO PADRÃO: grava os arquivos ────────────────────────────────────────────────
   CORTE POR TAMANHO, e não um desenho só reduzido três vezes. Medido: o corpo inteiro
   a 16 px é uma mancha amarela — o boneco ocupa 16 px de altura e a cabeça sobra 4.
   O `.ico` aceita uma imagem POR TAMANHO, então cada entrada usa o enquadramento que
   ainda lê no tamanho dela (as três estão em `sheet-cortes.png`, com a coluna de 16 px
   sobre branco, cinza e grafite):

     16 px  cabeça       bico laranja + crista = a silhueta que sobrevive
     32 px  cabeça+peito colarinho verde e o cano da pistola já aparecem
     48 px  busto        cabeça, ombro, asa e a pistola inteira

   Não é troca de assunto entre tamanhos: é o mesmo quadro, o mesmo ângulo e a mesma
   pose, com mais contexto conforme cabe. Zoom, não redesenho.

   CONTORNO ESCURO: TESTADO E DESCARTADO. A direção de arte é toon com contorno, então
   a tentativa óbvia era orlar a figura. Medido a 16 px (halo de 9 px no render de 512):
   sobre grafite o contorno vira borrão e come o bico; sobre branco ele engorda a
   silhueta e mata o vão entre cabeça e ombro. As duas versões estão em
   `zc-all.png` do scratchpad. O amarelo do canarinho já separa dos dois fundos sozinho. */
const CROP = {
  16: { half: 0.38, dx: -0.07, dy: 0.10 },
  32: { half: 0.46, dx: -0.04, dy: 0.06 },
  48: { half: 0.575, dx: 0, dy: 0 },
};
const base = await bustoCam(YAW_HERO);
const camDe = (c) => (c.half === 0.575 ? base : { ...base, half: c.half, x: base.x + c.dx, y: base.y + c.dy });

/* CROMA DEPOIS DE REDUZIR, e não antes. Reduzir 1024 -> 16 é uma média de 4096 texels
   por pixel: o sombreado toon do personagem (amarelo claro + sombra fria) colapsa num
   cáqui morto, e o bico laranja — que é metade da identidade dele a 16 px — vira bege.
   Medido lado a lado sobre branco, cinza de aba inativa e grafite (`sat.png` do
   scratchpad): com +35 % de croma o bico volta a separar da cabeça nos três fundos.
   É o mesmo defeito que o BUG-24 descreve no jogo ("esbranquiçado"), só que aqui a
   causa é a redução, não o piso de albedo — por isso o conserto é no pixel final. */
const SAT = num('croma', 1.35);
const png = async (cam, px, lado) => sharp(buf(await page.evaluate(({ c, p, y }) => window.__ico.quadro(y, c, p), { c: cam, p: px, y: YAW_HERO })))
  .resize(lado, lado, { kernel: 'lanczos3' }).modulate({ saturation: SAT }).png().toBuffer();

const icoPartes = [];
for (const t of [16, 32, 48]) {
  const b = await png(camDe(CROP[t]), 1024, t);
  const f = path.join(TMP, `ico-${t}.png`);
  fs.writeFileSync(f, b);
  icoPartes.push(f);
}
execSync(`magick ${icoPartes.join(' ')} ${path.join(TMP, 'favicon.ico')}`);
fs.copyFileSync(path.join(TMP, 'favicon.ico'), dest('favicon.ico'));

/* apple-touch-icon: 180×180 e SEM transparência de propósito. O iOS compõe o ícone da
   tela de início sobre fundo próprio e recorta em quadrado arredondado; PNG com alfa
   vira silhueta preta em metade dos aparelhos. Fundo = o gradiente de marca
   (`--bg-800` -> `--bg-900` de public/style.css), com 9% de folga porque o recorte
   arredondado come a borda. */
const AT = 180, folga = Math.round(AT * 0.09);
const fundoAT = await sharp({ create: { width: AT, height: AT, channels: 4, background: '#141008' } })
  .composite([{ input: Buffer.from(`<svg width="${AT}" height="${AT}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1c170d"/><stop offset="100%" stop-color="#090704"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`) }])
  .png().toBuffer();
await sharp(fundoAT)
  .composite([{ input: await png(camDe(CROP[48]), 1024, AT - folga * 2), left: folga, top: folga }])
  .png({ compressionLevel: 9 }).toFile(dest('apple-touch-icon.png'));

/* Quadro parado do corpo inteiro, transparente — README, card de release, redes. */
await sharp(buf(await page.evaluate(({ c, p, y }) => window.__ico.quadro(y, c, p), { c: CAM_CORPO, p: 1024, y: YAW_HERO })))
  .resize(512, 512, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(dest('img/canarinho-pistola.png'));


/* ── GIRO ──────────────────────────────────────────────────────────────────────────
   FORMATO DE HEADER, não quadrado. O destino declarado é cabeçalho de README e de
   página de documentação, e header é LARGO E BAIXO: um quadrado de 256 entregue para
   um header de 900 px vira ou um selo perdido no canto ou uma imagem esticada pelo CSS.
   Aqui a faixa já sai no tamanho em que vai ser usada.

   E o canarinho fica AO LADO DA MARCA, não no lugar dela: `public/logo.png` (que tem
   alfa de verdade — conferido, canto 0,0 = alfa 0, e a área útil é 642×489 de 651×526,
   ou seja 1,4 % de margem morta) entra na esquerda e ele gira na direita. Um arquivo só,
   sem depender de o Markdown conseguir alinhar duas imagens lado a lado — que é
   justamente o que o README não faz sem HTML.

   Fundo SÓLIDO, não transparente: GIF só tem 1 bit de alfa, e sobre transparência a
   borda antialiasada do render vira serrilha branca em qualquer fundo que não seja o
   que o encoder supôs. Com o gradiente de marca o GIF e o WebP ficam idênticos, que é o
   que permite trocar um pelo outro num `<picture>` sem ninguém notar.

   O LOOP FECHA POR CONSTRUÇÃO: 24 quadros × 15° = 360°. O último quadro é o vizinho do
   primeiro, então não existe salto para esconder com pingue-pongue nem com pausa. */
const HH = Math.round(num('altura', 240));
const FIG_H = Math.round(HH * 0.98);     // altura do boneco dentro da faixa

const marca = await sharp('public/logo.png').trim().resize({ height: Math.round(HH * 0.66) }).png().toBuffer();
const marcaM = await sharp(marca).metadata();

/* ── PRIMEIRA PASSADA: os 24 quadros crus, e a CAIXA ÚNICA que serve a todos ────────
   Recortar a margem transparente de cada quadro individualmente faria o boneco pular na
   faixa (a silhueta muda a cada 15° de giro). A caixa é a UNIÃO das 24 caixas de alfa:
   ele fica parado, e some a margem morta que o render quadrado carrega — que é o que
   deixava um vão de 276 px no meio do header. */
const crus = [];
let U = null;
for (let i = 0; i < GIRO_N; i++) {
  const yaw = YAW_HERO + (360 * i) / GIRO_N;
  const url = await page.evaluate(({ y, c, p }) => window.__ico.quadro(y, c, p), { y: yaw, c: CAM_CORPO, p: FIG_H * 2 });
  const b = buf(url);
  crus.push(b);
  const t = await sharp(b).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const cx = { l: -t.info.trimOffsetLeft, t: -t.info.trimOffsetTop, w: t.info.width, h: t.info.height };
  U = U ? { l: Math.min(U.l, cx.l), t: Math.min(U.t, cx.t), r: Math.max(U.r, cx.l + cx.w), b: Math.max(U.b, cx.t + cx.h) }
        : { l: cx.l, t: cx.t, r: cx.l + cx.w, b: cx.t + cx.h };
  process.stdout.write('·');
}
await browser.close();
const figW0 = U.r - U.l, figH0 = U.b - U.t;
const FIG_W = Math.round((figW0 / figH0) * FIG_H);
console.log(`\ncaixa única do giro: ${figW0}×${figH0} de ${FIG_H * 2}² -> ${FIG_W}×${FIG_H} na faixa`);

/* LARGURA DA FAIXA DERIVADA, não chutada: margem + marca + vão + boneco + margem. */
const MARG = Math.round(HH * 0.11), VAO = Math.round(HH * 0.16);
const HW = Math.round((MARG * 2 + marcaM.width + VAO + FIG_W) / 4) * 4;

const fundoFaixa = await sharp({ create: { width: HW, height: HH, channels: 4, background: '#0d0b06' } })
  .composite([{
    input: Buffer.from(`<svg width="${HW}" height="${HH}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#191408"/><stop offset="55%" stop-color="#0f0c05"/><stop offset="100%" stop-color="#070502"/>
        </linearGradient>
        <radialGradient id="h" cx="${Math.round((100 * (HW - FIG_W * 0.5)) / HW)}%" cy="52%" r="46%">
          <stop offset="0%" stop-color="#5a4a1e" stop-opacity=".55"/><stop offset="100%" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect width="100%" height="100%" fill="url(#h)"/>
      <rect x="0" y="${HH - 3}" width="100%" height="3" fill="#e8b34b" opacity=".75"/>
    </svg>`),
  }])
  .png().toBuffer();

const faixaBase = await sharp(fundoFaixa)
  .composite([{ input: marca, left: MARG, top: Math.round((HH - marcaM.height) / 2) }])
  .png().toBuffer();

const frames = [];
for (let i = 0; i < GIRO_N; i++) {
  const fig = await sharp(crus[i])
    .extract({ left: U.l, top: U.t, width: figW0, height: figH0 })
    .resize(FIG_W, FIG_H, { kernel: 'lanczos3' }).png().toBuffer();
  const f = path.join(TMP, `giro-${String(i).padStart(3, '0')}.png`);
  await sharp(faixaBase)
    .composite([{ input: fig, left: HW - MARG - FIG_W, top: HH - FIG_H - 3 }])
    .png().toFile(f);
  frames.push(f);
  process.stdout.write('.');
}
console.log('');

const DELAY = Math.round(num('delay', 80));   // ms por quadro -> 24 quadros = 1,92 s de volta
const gif = dest('img/canarinho-header.gif');
const webp = dest('img/canarinho-header.webp');
/* Paleta GLOBAL gerada dos 24 quadros (`palettegen` + `paletteuse`) em vez da paleta por
   quadro do codificador padrão: o boneco gira, cada quadro tem amarelos diferentes, e
   paleta por quadro faz a cor da marca PULSAR na volta inteira. */
const fps = Math.round(1000 / DELAY);
execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${TMP}/giro-%03d.png -vf "palettegen=max_colors=160:stats_mode=full" ${TMP}/pal.png`);
execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${TMP}/giro-%03d.png -i ${TMP}/pal.png -lavfi "paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" -loop 0 ${gif}`);
execSync(`img2webp -loop 0 -min_size -d ${DELAY} -lossy -q 72 -m 6 ${frames.join(' ')} -o ${webp}`);

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0);
console.log(`\nfavicon.ico                16+32+48    ${kb(dest('favicon.ico'))} KB`);
console.log(`apple-touch-icon.png       ${AT}×${AT}     ${kb(dest('apple-touch-icon.png'))} KB`);
console.log(`img/canarinho-pistola.png  512×512     ${kb(dest('img/canarinho-pistola.png'))} KB   (parado, alfa)`);
console.log(`img/canarinho-header.gif   ${HW}×${HH} ${GIRO_N}q ${kb(gif)} KB`);
console.log(`img/canarinho-header.webp  ${HW}×${HH} ${GIRO_N}q ${kb(webp)} KB   (${(100 - (fs.statSync(webp).size / fs.statSync(gif).size) * 100).toFixed(0)} % menor que o GIF)`);
