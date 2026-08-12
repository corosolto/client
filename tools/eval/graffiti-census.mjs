/* ============================================================================
   graffiti-census.mjs — QUANTA PAREDE O JOGADOR VÊ PELADA, MEDIDO NO NAVEGADOR.
   ----------------------------------------------------------------------------
   POR QUE ESTA RÉGUA EXISTE E POR QUE A `decal-probe` NÃO BASTAVA

   A `decal-probe` roda em node e diz "fy_quebrada: 334 decalques". O dono andou
   pelo mapa e disse "tem 10-15% de arte urbana". As duas coisas são verdade ao
   mesmo tempo, e a diferença é o instrumento:

     · em node NENHUM GLB carrega. Os barracos da Quebrada, as empenas da Brasília
       e as fachadas do Ferro Velho não existem, então `medirParede` mede contra a
       caixa procedural e TODA peça é aceita;
     · no navegador o GLB desenha a parede alguns centímetros fora do plano
       declarado, com micro-recuos. `medirParede` devolve null e a peça MORRE
       calada — `return null` dentro de `decal()`, sem aviso, sem contagem.

   Ou seja: a régua antiga conta o que foi PEDIDO, não o que foi PINTADO. Esta
   conta o que foi pintado, e mede contra o que o dono realmente cobrou: não
   "quantas peças", e sim QUANTO DA PAREDE QUE APARECE ANDANDO tem arte.

   ── O CRITÉRIO ─────────────────────────────────────────────────────────────
   1. PONTO DE VISTA = waypoint do mapa. É por onde bot e jogador andam de fato;
      medir a partir da bounding box premiaria parede de fundo que ninguém vê.
   2. De cada waypoint, 16 raios em 3 alturas até 7 m; o primeiro acerto em
      malha VISÍVEL, OPACA e QUASE VERTICAL é uma "placa" de parede.
   3. Placas são deduplicadas por célula de 1,5 m + direção da normal: a mesma
      empena vista de 4 waypoints conta UMA vez.
   4. Uma placa está PINTADA se existe quad de arte (`decal:*` / `mural:*`) com
      normal alinhada (dot > 0,6), com o ponto da placa dentro do retângulo do
      quad (folga de 0,35 m) e a menos de 0,6 m do plano dele.

   COBERTURA = pintadas / total. É esse número que o dono pediu em 90-95% na
   Quebrada e no Piscina, 60% na Brasília.

   O relatório também cospe as PIORES CÉLULAS de 8 m (as regiões peladas, com
   coordenada) — porque "cobertura 41%" não diz onde pintar, e a lista diz.

   Uso:
     npm run eval:serve &                       # precisa do servidor no ar
     node tools/eval/graffiti-census.mjs        # os 5 mapas
     node tools/eval/graffiti-census.mjs fy_quebrada
     JSON=1 node ...                            # despeja o JSON cru
   ============================================================================ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8123';
const ONLY = process.argv[2];
const MAPS = ['awp_map', 'fy_pool_day', 'fy_havan', 'fy_ferrovelho', 'fy_quebrada'];
/* As metas do dono (07/08), em cobertura de placa de parede. Quebrada e Piscina são
   "os mapas mais degradados" e vão a 90%; Brasília é cidade oficial e vai a 60%;
   Loja H e Ferro Velho são pátio murado — a meta vale pro muro, que é quase tudo
   que eles têm de parede. */
/* Loja H e Ferro Velho baixaram de 85 em 07/08 por DECISÃO DE ARTE, não por dívida:
   a Loja H só é pichada por fora (a zona limpa está declarada no mapa e a régua a
   respeita) e no Ferro Velho lataria e mato não recebem tinta — e essas superfícies
   CONTINUAM contando como placa de parede aqui, porque elas são parede que o jogador
   vê. Cobrar 85 delas seria a régua brigando com o pedido do dono. */
// Pisos medidos nas três faixas; aumente-os quando a cobertura melhorar.
const META = { awp_map: 35, fy_pool_day: 76, fy_havan: 43, fy_ferrovelho: 46, fy_quebrada: 67 };

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});

/* Roda DENTRO da página: precisa do THREE da própria página e da cena montada. */
const CENSO = async () => {
  const THREE = await import('./vendor/three.module.js');
  const { normalMundo } = await import('./js/graffiti_pass.js');
  /* ZONA LIMPA: parede que o mapa declara como "sem tinta de propósito". Sem ler isto,
     a régua cobraria a loja inteira da Loja H — 74% das placas dela — de uma decisão
     de direção de arte do dono. A declaração mora no mapa e viaja no layout assado;
     aqui só se lê, pra não existirem duas listas discordando. */
  const { GRAFITE } = await import('./js/graffiti_layout.js');
  const LIMPO = ((GRAFITE || {})[window.__mapId] || {}).limpo || [];
  const _limpo = (x, z) => LIMPO.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1);
  const scene = window.__scene, W = window.__gworld;
  // A deduplicação vertical separa as três faixas por célula.
  const ALTURAS = [1.6, 3.2, 5.0], ALCANCE = 7, RAIOS = 16, CEL = 1.5, FOLGA = 0.35, PERTO = 0.6;

  /* --- 1. quads de arte ------------------------------------------------------
     Dois caminhos, porque há dois jeitos de arte existir no mapa:
     · MALHA POR PEÇA — as vagas escolhidas a dedo (porta de aço, muro do baile) e
       os murais de homenagem. Têm `geometry.parameters`, que é onde mora o tamanho;
     · MALHA JUNTA POR ARQUIVO — a passada procedural junta todas as peças do mesmo
       PNG numa geometria só pra não gastar 2.600 draw calls (graffiti_pass._juntar).
       Depois da junção não existe `parameters`, então o retângulo de cada peça vem
       de `root.userData.graffitiPecas`, que a passada escreve justamente pra régua
       continuar enxergando peça a peça. Sem isso a cobertura mediria 0 e a régua
       diria que a passada não fez nada. */
  const arte = [];
  const doPass = [];
  scene.traverse((o) => { if (o.userData && o.userData.graffitiPecas) doPass.push(...o.userData.graffitiPecas); });
  for (const p of doPass) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0));
    arte.push({
      p: new THREE.Vector3(p.x, p.y, p.z),
      nor: new THREE.Vector3(0, 0, 1).applyQuaternion(q),
      eu: new THREE.Vector3(1, 0, 0).applyQuaternion(q),
      ev: new THREE.Vector3(0, 1, 0).applyQuaternion(q),
      hw: p.w / 2, hh: p.h / 2, file: 'decal:' + (p.f || 'peça'), w: p.w, h: p.h,
    });
  }
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const n = String(o.name);
    if (!n.startsWith('decal:') && !n.startsWith('mural:')) return;
    if (!(o.geometry.parameters && o.geometry.parameters.width)) return;   // malha junta: já entrou acima
    o.updateMatrixWorld(true);
    const p = o.getWorldPosition(new THREE.Vector3());
    const q = o.getWorldQuaternion(new THREE.Quaternion());
    const nor = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const eu = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const ev = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const g = o.geometry.parameters || {};
    const sc = new THREE.Vector3(); o.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
    arte.push({
      p, nor, eu, ev, hw: (g.width || 0) * sc.x / 2, hh: (g.height || 0) * sc.y / 2,
      file: n, w: (g.width || 0) * sc.x, h: (g.height || 0) * sc.y,
    });
  });

  // --- 2. alvos pintáveis (o que serve de parede) -----------------------------
  const alvos = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.material || !o.geometry) return;
    const n = String(o.name);
    if (n.startsWith('decal:') || n.startsWith('mural:')) return;
    const teste = (m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9));
    const ok = Array.isArray(o.material) ? o.material.some(teste) : teste(o.material);
    if (!ok) return;
    let vis = true;
    o.traverseAncestors((a) => { if (!a.visible) vis = false; });
    if (vis) alvos.push(o);
  });

  // --- 3. placas de parede vistas dos waypoints -------------------------------
  const nodes = (W.waypoints && W.waypoints.nodes) || [];
  const rc = new THREE.Raycaster(); rc.far = ALCANCE;
  const placas = new Map();
  const o3 = new THREE.Vector3(), d3 = new THREE.Vector3();
  for (const nd of nodes) {
    const ox = nd.x !== undefined ? nd.x : nd[0], oz = nd.z !== undefined ? nd.z : nd[2];
    const baseY = nd.y !== undefined ? nd.y : 0;
    for (const alt of ALTURAS) {
      const oy = baseY + alt;
      for (let a = 0; a < RAIOS; a++) {
        const ang = (a / RAIOS) * Math.PI * 2;
        rc.set(o3.set(ox, oy, oz), d3.set(Math.sin(ang), 0, Math.cos(ang)).normalize());
        const hits = rc.intersectObjects(alvos, false);
        let h = null;
        for (const x of hits) if (x.distance > 0.25) { h = x; break; }
        if (!h || !h.face) continue;
        // MESMA função da passada (`normalMundo`), de propósito: régua e passada não
        // podem discordar por causa do instrumento. Em InstancedMesh a normal só sai
        // certa somando a matriz da instância.
        const nw = normalMundo(h);
        if (Math.abs(nw.y) > 0.45) continue;                    // chão/teto não é parede
        if (_limpo(h.point.x, h.point.z)) continue;              // declarada limpa: não é dívida
        /* FACE DE TRÁS NÃO É PAREDE PRA ESTA RÉGUA. Medido na Quebrada: das 114 placas
           que continuavam "peladas" com a cobertura em 85%, ~92 eram a face INTERNA do
           muro externo (x ≈ -26, normal apontando pra fora do mapa) — o raio entrava por
           um vão da pele de fora e acertava a casca por dentro. A captura do mesmo trecho
           mostra o muro pintado de "ZICA" de ponta a ponta. Com material FrontSide (o
           padrão), essa face é descartada pelo culling: o jogador NUNCA a vê, e cobrar
           tinta nela é a régua inventando dívida. DoubleSide continua contando, porque aí
           a face é mesmo desenhada. */
        const mat = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
        const doisLados = mat && mat.side === THREE.DoubleSide;
        if (!doisLados && nw.dot(d3) > 0) continue;
        if (nw.dot(d3) > 0) nw.negate();                        // normal virada pro observador
        const kx = Math.round(h.point.x / CEL), ky = Math.round(h.point.y / CEL), kz = Math.round(h.point.z / CEL);
        const kd = Math.round(Math.atan2(nw.x, nw.z) / (Math.PI / 4));
        const k = `${kx}|${ky}|${kz}|${kd}`;
        // `quem` é o nome da malha da placa: sem ele, "163 placas peladas" não diz se
        // falta tinta ou se aquilo nem é parede (poste, toldo, placa de rua)
        if (!placas.has(k)) {
          placas.set(k, {
            x: h.point.x, y: h.point.y, z: h.point.z, nx: nw.x, ny: nw.y, nz: nw.z,
            banda: alt,
            quem: String(h.object.name || h.object.type) + (h.object.isInstancedMesh ? '[inst]' : ''),
          });
        }
      }
    }
  }

  // --- 4. placa pintada? ------------------------------------------------------
  const v = new THREE.Vector3();
  let pintadas = 0;
  const celulas = new Map();                                   // 8 m: onde está pelada
  const quemPelado = new Map();                                // qual malha fica sem tinta
  const nuas = [];                                             // as primeiras, com coordenada pra ir olhar
  const porBanda = new Map();                                  // cobertura por faixa de altura
  for (const pl of placas.values()) {
    let ok = false;
    for (const A of arte) {
      if (A.nor.x * pl.nx + A.nor.y * pl.ny + A.nor.z * pl.nz < 0.6
        && -(A.nor.x * pl.nx + A.nor.y * pl.ny + A.nor.z * pl.nz) < 0.6) continue;
      v.set(pl.x - A.p.x, pl.y - A.p.y, pl.z - A.p.z);
      if (Math.abs(v.dot(A.nor)) > PERTO) continue;
      if (Math.abs(v.dot(A.eu)) > A.hw + FOLGA) continue;
      if (Math.abs(v.dot(A.ev)) > A.hh + FOLGA) continue;
      ok = true; break;
    }
    if (ok) pintadas++;
    else {
      quemPelado.set(pl.quem, (quemPelado.get(pl.quem) || 0) + 1);
      nuas.push({
        x: +pl.x.toFixed(1), y: +pl.y.toFixed(1), z: +pl.z.toFixed(1),
        ry: +Math.atan2(pl.nx, pl.nz).toFixed(2), quem: pl.quem,
      });
    }
    const ck = `${Math.round(pl.x / 8) * 8},${Math.round(pl.z / 8) * 8}`;
    const c = celulas.get(ck) || { t: 0, p: 0 };
    c.t++; if (ok) c.p++;
    celulas.set(ck, c);
    const b = porBanda.get(pl.banda) || { t: 0, p: 0 };
    b.t++; if (ok) b.p++;
    porBanda.set(pl.banda, b);
  }

  const peladas = [...celulas.entries()]
    .filter(([, c]) => c.t >= 3 && c.p / c.t < 0.6)
    .sort((a, b) => (a[1].p / a[1].t) - (b[1].p / b[1].t))
    .slice(0, 14)
    .map(([k, c]) => ({ xz: k, t: c.t, p: c.p, pct: Math.round(100 * c.p / c.t) }));

  const arqs = new Map();
  for (const A of arte) arqs.set(A.file, (arqs.get(A.file) || 0) + 1);
  const alturas = arte.map((A) => A.h).sort((x, y) => x - y);

  return {
    pecas: arte.length,
    arquivos: arqs.size,
    murais: arte.filter((A) => A.file.startsWith('mural:')).length,
    hMin: alturas[0] || 0, hMax: alturas[alturas.length - 1] || 0,
    hMed: alturas[Math.floor(alturas.length / 2)] || 0,
    placas: placas.size, pintadas,
    bandas: [...porBanda.entries()]
      .map(([alt, c]) => ({ alt, t: c.t, p: c.p, pct: c.t ? Math.round(1000 * c.p / c.t) / 10 : 0 }))
      .sort((a, b) => a.alt - b.alt),
    pelados: [...quemPelado.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    amostraPelada: nuas.slice(0, 12),
    cobertura: placas.size ? Math.round(1000 * pintadas / placas.size) / 10 : 0,
    peladas,
    usados: [...arqs.keys()].sort(),
    waypoints: nodes.length,
  };
};

const out = {};
for (const id of MAPS) {
  if (ONLY && id !== ONLY) continue;
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  await page.goto(`${BASE}/mapview.html?map=${id}`, { waitUntil: 'networkidle' });
  // o 2º argumento é o ARG da função, não as opções — sem o `null` o timeout vira
  // o padrão de 30 s e o Ferro Velho/Loja H (GLB pesado) estoura antes de montar.
  await page.waitForFunction('window.MAPEVAL && window.MAPEVAL.ready===true', null, { timeout: 120000 });
  const r = await page.evaluate(CENSO);
  await page.close();
  out[id] = r;
  const meta = META[id] || 0;
  const sinal = r.cobertura >= meta ? 'OK  ' : 'BAIXO';
  console.log(`${sinal} ${id.padEnd(14)} cobertura ${String(r.cobertura).padStart(5)}%  (meta ${meta}%)  `
    + `${r.pintadas}/${r.placas} placas | ${r.pecas} peças (${r.murais} murais) | ${r.arquivos} arquivos | `
    + `altura ${r.hMin.toFixed(2)}–${r.hMax.toFixed(2)} m (mediana ${r.hMed.toFixed(2)})`);
  if (r.bandas && r.bandas.length) {
    console.log('      por faixa (altura · pintadas/placas · %):  '
      + r.bandas.map((b) => `${b.alt.toFixed(1)}m ${b.p}/${b.t} ${b.pct}%`).join('   '));
  }
  if (r.peladas.length) {
    console.log('      peladas (x,z · pintadas/placas):  '
      + r.peladas.map((c) => `${c.xz} ${c.p}/${c.t}`).join('   '));
  }
  if (r.pelados && r.pelados.length) {
    console.log('      malha sem tinta:  ' + r.pelados.map(([q, c]) => `${q}×${c}`).join('   '));
  }
}
await browser.close();
if (process.env.JSON === '1') {
  writeFileSync('tools/eval/graffiti_census.json', JSON.stringify(out, null, 1));
  console.log('-> tools/eval/graffiti_census.json');
}
