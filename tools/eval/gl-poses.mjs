/* CAPTURA POR POSE DECLARADA — o quadro tem de mostrar o MAPA, não o spawn.
 *
 * POR QUE ESTE ARQUIVO EXISTE (e por que não é o gl-shots.mjs)
 * ═══════════════════════════════════════════════════════════════════════════
 * O `gl-shots.mjs` nasce no spawn, fotografa, gira o yaw em +1,6 rad três vezes
 * e fotografa de novo. Isso é ÓTIMO para o que ele serve (detectar mapa preto,
 * erro de console, tempo de boot) e PÉSSIMO como amostra da arquitetura: o
 * ângulo é sorteado em relação ao que o mapa construiu. A régua `foto-vs-render`
 * rodou em cima daqueles frames e diagnosticou ela mesma o problema:
 *
 *   "o frame da quebrada é um campo de terra vazio com uma trave — não é a
 *    arquitetura daquele mapa. O ranking está medindo ONDE O JOGADOR NASCE E
 *    PRA ONDE OLHA."
 *
 * Mais dois vieses MEDIDOS naqueles frames, que qualquer número tirado deles
 * carrega junto:
 *   1) O VIEWMODEL empresta detalhe ao mapa. O gap de orientação da `loja_h` é
 *      −3,0σ com a arma no quadro e −9,6σ com ela mascarada. A arma é a única
 *      aresta oblíqua de alguns frames.
 *   2) O HUD foi contado como CÉU (`ceu_frac` chegou a AUC 1,00 — "somos metade
 *      céu" — e era radar + placar + barra de vida).
 *
 * O gl-shots continua vivo e intocado: outras réguas dependem do formato dele.
 * Este aqui é um segundo capturador, com outro contrato:
 *   • pose DECLARADA por mapa (tabela POSES), escolhida olhando o frame;
 *   • sem HUD e sem viewmodel no quadro;
 *   • simulação CONGELADA e Math.random semeado -> duas corridas byte-idênticas;
 *   • lista de mapas LIDA DO REGISTRO (mapa novo entra sozinho);
 *   • resolução nativa (1600x900), que é onde a régua enxerga: `juncao_dens`
 *     mede 0,76 em 0,55 MP e 0,95 em nativa — reduzir a imagem CEGA a régua.
 *
 * NOME DOS ARQUIVOS: `game-<mapa>-<aspecto>-<a..d>.png`, IGUAL ao gl-shots, de
 * propósito — é o formato que `foto-vs-render.mjs` sabe parsear (o regex dele
 * aceita só as letras a..d, e é por isso que são 4 poses por mapa e não 6).
 *
 * USO
 *   node tools/eval/serve.mjs 8123 &
 *   GPU=1 node tools/eval/gl-poses.mjs /tmp/shots/poses            # captura
 *   GPU=1 node tools/eval/gl-poses.mjs /tmp/shots/scout --scout    # procura pose
 *   ... --maps=fy_corrego,quebrada    # recorta a bateria
 *   ... --aspecto=169                 # só um aspecto (padrão: os dois)
 *
 * UMA SESSÃO HEADLESS POR VEZ. Duas em paralelo derrubam o boot e falsificam a
 * medição — armadilha já registrada nesta base.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/shots/poses';
const SCOUT = process.argv.includes('--scout');
const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const ASPECTS_ALL = { 169: [1600, 900], 32: [1500, 1000] };
const ASP_SEL = arg('aspecto', null);
const ASPECTS = ASP_SEL
  ? Object.fromEntries(Object.entries(ASPECTS_ALL).filter(([k]) => k === ASP_SEL))
  : ASPECTS_ALL;

mkdirSync(OUT, { recursive: true });

/* ── REGISTRO ────────────────────────────────────────────────────────────────
   A lista de mapas NÃO é repetida aqui. Ela foi literal no gl-shots até 12/08,
   ficou em 5 enquanto o jogo foi para 10, e os 5 mapas novos entraram sem nunca
   passar por uma captura — mapa que não é fotografado não é criticado, e o que
   não é criticado regride calado. Mesmo caminho, mesma razão. */
const REG = readFileSync('public/js/maps.js', 'utf8');
const BLOCO = REG.slice(REG.indexOf('export const MAPS'), REG.indexOf('\n};', REG.indexOf('export const MAPS')));
const IDS = [...BLOCO.matchAll(/^\s{2}([a-z][a-z0-9_]*)\s*:\s*\{/gm)].map((m) => m[1]);
if (IDS.length < 2) throw new Error('gl-poses: registro de mapas não parseou — falhar alto é melhor que capturar meio jogo em silêncio');
const ONLY = arg('maps', null)?.split(',');
const MAPS = IDS.filter((id) => !ONLY || ONLY.includes(id));

/* time/personagem por mapa: só para o auto-start não parar na tela de seleção.
   Como o viewmodel sai do quadro e os bots ficam invisíveis, a escolha não
   entra no pixel — está aqui para o boot não travar. */
const AUTO = { praca_poderes: 'P,mst', piscina_treta: 'P,mst', loja_h: 'B,bozo', ferro_velho: 'B,bozo' };

/* ── POSES ───────────────────────────────────────────────────────────────────
   [x, y, z, yaw, pitch] — x/y/z em metros no mundo (y é a ALTURA DO OLHO, não
   do pé), yaw/pitch em radianos, exatamente como `camera.rotation.set(pitch,
   yaw, 0)` com ordem YXZ (é o que o game.js faz em game.js:4713).

   Cada pose foi ESCOLHIDA OLHANDO O FRAME, em duas passadas de scout (`--scout`
   pontua candidatas por quanto de geometria construída cai no cone de visão, e
   depois o olho corta as que enquadram céu vazio ou chão liso). O comentário de
   cada uma diz O QUE ela enquadra — se a geometria mudar e a pose passar a
   olhar para o nada, o comentário é o que denuncia.

   PREENCHIDO PELO SCOUT + REVISÃO VISUAL (12/08). */
const POSES = JSON.parse(readFileSync(new URL('./gl-poses.json', import.meta.url), 'utf8'));

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

/* GPU=1 troca o SwiftShader pelo backend nativo — mesmo contrato do gl-shots:
   software rendering achata o que o Metal desenha e leva minutos por mapa. */
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: [
    ...(process.env.GPU === '1' ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
    '--headless=new', '--mute-audio', '--no-sandbox',
  ],
});

/* SEMENTE DE Math.random ANTES DE QUALQUER SCRIPT DO JOGO.
   Sem isto não existe "duas corridas byte-idênticas": `map_quebrada.js` espalha
   prop com Math.random, a seleção de carros da loja_h é sorteada por partida e
   o spawn dos bots idem. Semear do lado da CAPTURA (e não do jogo) mantém o
   jogo intocado e ainda garante que o pixel medido é o mesmo em toda corrida.
   LCG de Numerical Recipes — o mesmo já usado em main.js:1993. */
const SEED_SCRIPT = `(() => {
  let s = 20260812 >>> 0;
  Math.random = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
})();`;

/* CONGELAMENTO — tudo o que tira do quadro o que NÃO é mapa, e tudo o que faz
   duas corridas darem o mesmo pixel. Roda uma vez por página, depois do `live`. */
const FREEZE = `(() => {
  const g = window.__game;
  if (!g) throw new Error('sem window.__game');
  // 1. HUD fora. Ele é DOM por cima do canvas; o descritor ceu_frac já contou
  //    radar/placar como céu (AUC 1,00 — "somos metade céu").
  //    #launch-error entra na lista por um motivo MEDIDO nesta rodada: o
  //    relógio de abertura da partida (main.js, 60 s) estoura em captura
  //    headless — a partida abre em ~90-390 s aqui — e o cartaz "A ARENA NÃO
  //    ABRIU" sobe POR CIMA do jogo já rodando, com backdrop-filter blur(8px)
  //    (style.css:1516). A primeira bateria saiu inteira assim: quatro poses,
  //    quatro arquivos do MESMO tamanho, todos o cartaz borrado. O jogo estava
  //    vivo (state 'live'); quem mentia era o DOM.
  const st = document.createElement('style');
  st.textContent = '#hud, #launch-error, #boot-splash, #load-overlay, #mobile-warning,'
    + ' #pause-menu, #match-end, .screen { display: none !important; }';
  document.head.appendChild(st);
  // 2. VIEWMODEL fora. Não basta vm.root.visible=false: game.js:4769 reescreve
  //    esse flag TODO frame. Tirar o root da vmScene é o corte que sobrevive ao
  //    loop (o vmPass continua existindo e só limpa profundidade).
  if (g.vmScene && g.vm && g.vm.root) g.vmScene.remove(g.vm.root);
  // 3. BOTS fora. Personagem é detalhe que NÃO é arquitetura (mesmo viés da
  //    arma) e a posição dele depende do tempo de boot — mata a determinismo.
  for (const b of (g.bots || [])) { if (b.mesh && b.mesh.group) b.mesh.group.visible = false; }
  // 4. ARMA NO CHÃO fora (rack do spawn + o que os bots largam). Também não é
  //    arquitetura — e era a ÚNICA fonte de não-determinismo que sobrou depois
  //    da semente: medido em duas corridas do mesmo mapa, os quadros SEM arma no
  //    chão saíram byte-idênticos e os COM arma diferiam em 0,02-0,04% dos
  //    pixels, sempre em cima de um fuzil caído. A causa é a janela de simulação
  //    entre 'live' e a pausa: nela os bots andam e pegam/largam arma, e essa
  //    janela mede tempo de parede, não quadros.
  for (const pk of ((g.world && g.world.pickups) || [])) { if (pk.mesh) pk.mesh.visible = false; }
  for (const d of (g.drops || [])) { if (d.mesh) d.mesh.visible = false; }
  // 5. Simulação congelada: update() sai no primeiro if. Nada de mixer, de
  //    partícula, de relógio de round. A partir daqui QUEM desenha é a captura.
  g.paused = true;
  g.camera.rotation.order = 'YXZ';
  return { fov: g.camera.fov, nodes: (g.world && g.world.waypoints && g.world.waypoints.nodes || []).length };
})()`;

/* Desenha UMA pose. Posiciona a câmera à mão e chama o render patchado pelo
   bloom (composer: SSAO -> vmPass -> bloom -> AgX), que é o MESMO cano que o
   dono vê jogando. Renderizar dentro de um rAF garante que o compositor do
   Chrome tem o frame quando o screenshot chega. */
/* FUNÇÃO DE VERDADE, NÃO STRING. Isto custou uma bateria inteira: `page.evaluate`
   com uma STRING avalia a string como EXPRESSÃO — o texto "(p) => {...}" vira o
   objeto função e NUNCA é chamado, o argumento é ignorado e nada estoura. As
   quatro poses saíram byte-idênticas (o quadro do spawn, com arma), e o log
   dizia "4 poses". Só a guarda de quadro parado (mais abaixo) denunciou.
   Passando a função, o Playwright serializa e CHAMA com o argumento. */
const DRAW = (p) => new Promise((ok) => {
  const g = window.__game;
  g.camera.position.set(p[0], p[1], p[2]);
  g.camera.rotation.set(p[4], p[3], 0);
  g.camera.updateMatrixWorld(true);
  requestAnimationFrame(() => {
    g.renderer.render(g.scene, g.camera);
    requestAnimationFrame(() => ok(1));
  });
});

/* SCOUT — pontua candidatas a pose. NÃO escolhe pose: reduz algumas centenas de
   opções a 8 imagens que o olho julga depois.
   RODA NO `mapview.html`, NÃO no jogo. Duas razões:
     • custo: o jogo leva ~3 min para chegar em `live` (GLB de personagem, áudio,
       bots); o mapview constrói só o mapa em segundos. Procurar enquadramento
       em 10 mapas dentro do jogo é meia hora de espera por passada, e escolher
       pose é justamente o que precisa de VÁRIAS passadas;
     • o que se procura aqui é COMPOSIÇÃO (o que a geometria põe no quadro), e
       geometria é a mesma nos dois — `mapview` chama o mesmo `MAPS[id].build`.
   A CAPTURA que vale continua sendo no jogo, com o cano de pós do jogo.

   POR QUE FRUSTUM E NÃO RAYCAST: a primeira versão lançava 1728 raios por mapa
   com `intersectObjects(cena, true)` e não terminou em 11 minutos num mapa só —
   raycast recursivo numa favela inteira é caro demais para varredura. Contar
   esfera-envolvente dentro do frustum dá a MESMA informação grosseira ("tem
   construção no quadro, e ela está espalhada em profundidade") por alguns
   milissegundos. Raio só entra na conferência final das 24 melhores, para
   descartar câmera enfiada dentro de parede. */
const SCOUT_FN = `(cfg) => {
  /* SEM import de three: as classes saem de objetos que o mapview já tem
     (cam.position -> Vector3, cam.projectionMatrix -> Matrix4). Injetar um
     <script type=module> com \`import * as T from 'three'\` funcionou em 3 mapas
     e estourou timeout no ferro_velho — página ocupada no rAF de recarga faz o
     módulo chegar tarde, e um scout que falha em mapa pesado é justamente o que
     deixa mapa sem pose. Sem dependência, sem esse modo de falha. */
  const scene = window.__scene, world = window.__gworld;
  const cam0 = window.MAPEVAL.cam;
  const V3 = cam0.position.constructor, M4 = cam0.projectionMatrix.constructor;
  const T = { Vector3: V3, Matrix4: M4, PerspectiveCamera: cam0.constructor };
  const nodes = (world && world.waypoints && world.waypoints.nodes) || [];
  const pt = (n) => (n && n.pos ? n.pos : n);

  // inventário: uma esfera envolvente em MUNDO por mesh. Chão é marcado e vale
  // pouco — piso liso é o que a régua já reprova, não é o que se quer enquadrar.
  const meshes = [];
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere; if (!bs) return;
    const c = bs.center.clone().applyMatrix4(o.matrixWorld);
    const s = o.matrixWorld.getMaxScaleOnAxis();
    const g = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
    const alt = (g.max.y - g.min.y) * s;
    meshes.push({ c, r: Math.max(0.2, bs.radius * s), chao: alt < 0.6 });
  });

  const cam = new T.PerspectiveCamera(cfg.fov, cfg.aspect, 0.1, 400);
  cam.rotation.order = 'YXZ';
  const mm = new T.Matrix4(), v = new T.Vector3();
  const tanH = Math.tan(cfg.fov * Math.PI / 360);
  // "está no quadro?" por NDC, com folga proporcional ao raio da esfera: uma
  // peça grande cujo centro caiu fora ainda ocupa quadro. Equivale ao teste de
  // frustum para o que interessa aqui (contagem grosseira), sem classe extra.
  const noQuadro = (c, r) => {
    v.copy(c).applyMatrix4(mm);
    const d = v.z;
    if (!(d > -1 && d < 1)) return false;
    const dist = c.distanceTo(cam.position);
    const folga = r / Math.max(1, dist * tanH);
    return Math.abs(v.x) < 1 + folga && Math.abs(v.y) < 1 + folga;
  };
  const passo = Math.max(1, Math.floor(nodes.length / cfg.nAmostra));
  const cands = [];
  for (let i = 0; i < nodes.length; i += passo) {
    const p = pt(nodes[i]);
    if (!p || !Number.isFinite(p.x)) continue;
    const olho = new T.Vector3(p.x, (Number.isFinite(p.y) ? p.y : 0) + cfg.olho, p.z);
    for (let k = 0; k < cfg.nYaw; k++) {
      const yaw = (k / cfg.nYaw) * Math.PI * 2;
      for (const pitch of cfg.pitches) {
        cam.position.copy(olho); cam.rotation.set(pitch, yaw, 0);
        cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
        mm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        let n = 0, ang = 0, colado = 0; const ds = [];
        for (const m of meshes) {
          if (m.chao) continue;
          const d = m.c.distanceTo(olho);
          if (d > cfg.longe) continue;
          if (!noQuadro(m.c, m.r)) continue;
          n++; ds.push(d);
          ang += Math.min(0.6, m.r / Math.max(1.5, d));   // tamanho angular, saturado
          if (d < m.r + 0.9) colado++;                    // câmera dentro/colada na peça
        }
        if (n < 3) continue;
        const md = ds.reduce((a, b) => a + b, 0) / ds.length;
        const sd = Math.sqrt(ds.reduce((a, b) => a + (b - md) ** 2, 0) / ds.length);
        const perto = ds.filter((d) => d < 25).length / ds.length;
        // nota: massa angular construída x camada de profundidade x perto do olho.
        // "colado" derruba: parede na cara é textura, não arquitetura.
        const nota = ang * (1 + Math.min(sd, 30) / 30) * (0.4 + 0.6 * perto) * (colado >= 2 ? 0.25 : 1);
        cands.push({ p: [+p.x.toFixed(2), +olho.y.toFixed(2), +p.z.toFixed(2), +yaw.toFixed(3), pitch],
                     nota: +nota.toFixed(2), n, md: +md.toFixed(1), sd: +sd.toFixed(1) });
      }
    }
  }
  cands.sort((a, b) => b.nota - a.nota);
  // espalha: não adianta 8 fotos do mesmo canto. A nota premia o miolo do mapa
  // (é onde mais geometria cai no frustum), então SEM esta trava o scout devolve
  // o mesmo ponto girando — e a amostra volta a ser "um lugar", que é o defeito
  // que este arquivo veio consertar. Máximo 2 poses por ponto.
  const esc = [], usos = new Map();
  for (const c of cands) {
    const chave = c.p[0] + ',' + c.p[2];
    if ((usos.get(chave) || 0) >= 2) continue;
    const perto = esc.some((e) => Math.hypot(e.p[0] - c.p[0], e.p[2] - c.p[2]) < cfg.minDist
      && Math.abs(((e.p[3] - c.p[3] + Math.PI) % (2 * Math.PI)) - Math.PI) < 1.0);
    if (perto) continue;
    usos.set(chave, (usos.get(chave) || 0) + 1);
    esc.push(c);
    if (esc.length >= cfg.n) break;
  }
  return { total: cands.length, nodes: nodes.length, meshes: meshes.length, esc };
}`;

const log = [];
const FOV_JOGO = 70;   // game.js:603 — a lente do jogador. Scout com outra lente é escolher pose no escuro.

// ── SCOUT (mapview.html): procura enquadramento; barato, sem bot, sem arma.
async function scoutMapa(map, W, H) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  try {
    await page.goto(`${BASE}/mapview.html?map=${map}&hud=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.MAPEVAL && window.MAPEVAL.ready, null, { timeout: 300000 });
    await page.waitForTimeout(4000);   // GLTF/textura de prop chegam depois do 1º frame


    const r = await page.evaluate(`(${SCOUT_FN})(${JSON.stringify({
      nAmostra: 26, nYaw: 8, pitches: [0, -0.12], olho: 1.62, aspect: W / H, fov: FOV_JOGO, n: 8, minDist: 10, longe: 90,
    })})`);
    mkdirSync(`${OUT}/scout`, { recursive: true });
    writeFileSync(`${OUT}/scout/${map}.json`, JSON.stringify(r, null, 2));
    for (let i = 0; i < r.esc.length; i++) {
      await page.evaluate(([p, fov]) => window.MAPEVAL.pose(p[0], p[1], p[2], p[3], p[4], fov), [r.esc[i].p, FOV_JOGO]);
      await page.screenshot({ path: `${OUT}/scout/${map}-${String(i).padStart(2, '0')}.png`, timeout: 120000 });
    }
    console.log(`[scout ${map}] nodes=${r.nodes} meshes=${r.meshes} cand=${r.total} -> ${r.esc.length} fotos`);
  } catch (e) {
    log.push(`[scout ${map}] ${e.message.split('\n')[0]}`);
    console.log(`x [scout ${map}] ${e.message.split('\n')[0]}`);
  }
  if (errs.length) writeFileSync(`${OUT}/_errs-scout-${map}.txt`, errs.join('\n'));
  await page.close();
}

// ── CAPTURA (jogo): a foto que a régua mede. Cano de pós igual ao do jogador.
async function capturaMapa(map, W, H, aName) {
  const ps = POSES[map];
  if (!ps || !ps.length) { log.push(`[${map}] sem pose declarada — rode --scout e preencha gl-poses.json`); return; }
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.addInitScript(SEED_SCRIPT);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const auto = AUTO[map] || 'B,sertanejo';
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/?debug=1&map=${map}&auto=${auto}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 900000 });
    // margem de carga: GLTFLoader/TextureLoader concluem DEPOIS do primeiro
    // frame. Congelar antes disso fotografa o fallback cinza (armadilha que já
    // custou uma bateria inteira nesta base — ver mapview.html:63).
    await page.waitForTimeout(8000);
    await page.evaluate(FREEZE);
    const hs = [];
    for (let i = 0; i < ps.length && i < 4; i++) {
      await page.evaluate(DRAW, ps[i].p);
      const f = `${OUT}/game-${map}-${aName}-${'abcd'[i]}.png`;
      await page.screenshot({ path: f, timeout: 120000 });
      hs.push(createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12));
    }
    /* GUARDA DE QUADRO PARADO. Quatro poses TÊM de dar quatro imagens. Se saírem
       iguais, a câmera não se moveu ou o screenshot pegou um quadro anterior — e
       nesse caso a bateria inteira é uma foto repetida com dez nomes. Isso já
       aconteceu (cartaz de erro por cima do jogo, ver o bloco do FREEZE), e sem
       esta linha o defeito só apareceria no ranking, tarde e disfarçado. */
    if (new Set(hs).size < hs.length) {
      log.push(`[${map} ${aName}] POSES REPETIDAS: ${hs.join(' ')} — a câmera não se moveu ou o quadro é o anterior`);
      console.log(`x [${map} ${aName}] poses repetidas (${hs.join(' ')})`);
    }
    console.log(`[pose ${map} ${aName}] ${hs.length} poses · ${((Date.now() - t0) / 1000).toFixed(0)}s · ${hs.join(' ')}`);
  } catch (e) {
    log.push(`[${map} ${aName}] ${e.message.split('\n')[0]}`);
    console.log(`x [${map} ${aName}] ${e.message.split('\n')[0]}`);
  }
  if (errs.length) writeFileSync(`${OUT}/_errs-${map}-${aName}.txt`, errs.join('\n'));
  await page.close();
}

/* O scout fotografa em 800x450 (mesmo aspecto 16:9, mesma lente): escolher
   enquadramento não precisa de pixel, precisa de composição, e o screenshot em
   1600x900 custava ~15 s por quadro — 40 min só para varrer os 10 mapas, que na
   prática é o mesmo que não varrer. A CAPTURA medida continua nativa. */
for (const map of MAPS) {
  if (SCOUT) { await scoutMapa(map, 800, 450); continue; }
  for (const [aName, [W, H]] of Object.entries(ASPECTS)) await capturaMapa(map, W, H, aName);
}
writeFileSync(`${OUT}/_log.txt`, log.join('\n') || 'sem erros');
console.log(log.join('\n') || 'sem erros');
await browser.close();
