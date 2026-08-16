/* ============================================================================
   graffiti-audit.mjs — CADA PEÇA DE GRAFITE, UMA A UMA: TEM PAREDE ATRÁS?
   ----------------------------------------------------------------------------
   POR QUE ESTA RÉGUA EXISTE, E POR QUE A `graffiti-census` NÃO BASTAVA

   A `graffiti-census` responde "quanto da parede tem tinta". É a pergunta do
   dono quando ele reclamou de parede pelada, e ela levou a Quebrada de 12,7% a
   87%. Mas ela mede **da parede para a tinta**, e por isso é cega para o defeito
   oposto — tinta que não tem parede:

     "tem grafites no ar, tipo no respawn bolsonarista no quebrada tem grafites
      no ar entre o muro e a parte de vidro, e em vários locais"

   Uma peça flutuando não derruba a cobertura: ela até AJUDA o número, porque
   cobre a placa que está atrás dela. Régua que só sabe subir não enxerga isso.

   ── O QUE ELA MEDE, E CONTRA O QUÊ ──────────────────────────────────────────
   Para CADA peça assada (`graffiti_layout.js`, lida da cena montada), 15 amostras
   no quad (5 × 3), e três perguntas:

     VÃO      — o raio para TRÁS (2 cm à frente do plano, até 0,6 m) não acha nada.
                Aquele pedaço da peça está no ar.
     TAPADA   — o raio para FRENTE (até 0,25 m) acha algo OPACO. A peça existe, é
                desenhada, e ninguém nunca vai ver.
     COBERTA  — outra peça no mesmo plano invadindo mais que `LIMITE_SOBREPOR` da
                área. O dono pediu "preencher, mas sem um sobrepor o outro".

   A diferença que faz esta régua morder onde a passada não mordeu: ela testa
   contra **TODA malha visível**, inclusive a transparente. Grade, tela e vidro
   não são superfície pintável (`NAO_PINTA`/`transparent` no graffiti_pass), então
   a passada os atravessa como se não existissem — e é assim que a tinta vai parar
   no vão ATRÁS da grade. Para ocluir, porém, eles existem: o jogador os vê.
   Pintável e opaco são perguntas diferentes, e confundir as duas é o defeito.

   ── E ELA TIRA FOTO ─────────────────────────────────────────────────────────
   `--fotos N` posiciona a câmera na frente das N piores e salva PNG. Número diz
   que existe; foto diz o que é. Foi olhando que se descobriu que o problema do
   respawn era a faixa passando por cima da grade — nenhuma contagem diria isso.

   Uso:
     npm run eval:serve &
     node tools/eval/graffiti-audit.mjs                 # os 5 mapas
     node tools/eval/graffiti-audit.mjs quebrada
     node tools/eval/graffiti-audit.mjs quebrada --fotos 12
   ============================================================================ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8123';
const MAPAS = ['praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho', 'quebrada'];
const argv = process.argv.slice(2);
const ONLY = argv.find((a) => !a.startsWith('--'));
const FOTOS = argv.includes('--fotos') ? (+argv[argv.indexOf('--fotos') + 1] || 8) : 0;
const OUT = '/tmp/graffiti-audit';

/* Limites, com a razão de cada um:
   VAO_MAX     — 2 de 15 amostras podem furar sem que a peça leia como flutuante:
                 vão de porta e caixilho de janela abrem buraco legítimo no meio de
                 um muro pichado (é a mesma tolerância do `_encaixar` da passada).
   SOBREPOR    — o dono pediu SEM sobreposição. 12% é a folga de medição do quad
                 contra o quad, não permissão para empilhar arte.  */
const VAO_MAX = 2 / 15, LIMITE_SOBREPOR = 0.12;

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const AUDITAR = async ([vaoMax, limSobrepor]) => {
  const THREE = await import('./vendor/three.module.js');
  const { gradeEspacial } = await import('./js/graffiti_pass.js');
  const scene = window.__scene;

  /* TODA malha visível serve de OCLUSOR — inclusive a transparente. É a diferença
     desta régua para a passada: lá a pergunta é "dá pra pintar?", aqui é "o jogador
     vê alguma coisa aí?". Grade e vidro respondem não pra primeira e SIM pra
     segunda, e é nesse buraco que a tinta vai parar no vão. */
  const solidos = [], opacos = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.material || !o.geometry) return;
    const n = String(o.name);
    if (n.startsWith('decal:') || n.startsWith('mural:')) return;
    let vis = true;
    o.traverseAncestors((a) => { if (!a.visible) vis = false; });
    if (!vis) return;
    solidos.push(o);
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9))) opacos.push(o);
  });

  // --- as peças, das duas formas em que elas existem ---------------------------
  const pecas = [];
  scene.traverse((o) => {
    if (o.userData && o.userData.graffitiPecas) {
      for (const p of o.userData.graffitiPecas) pecas.push({ ...p, quem: p.f || 'passada' });
    }
  });
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const n = String(o.name);
    if (!n.startsWith('decal:') && !n.startsWith('mural:')) return;
    const g = o.geometry.parameters;
    if (!g || !g.width) return;                         // malha junta: já entrou acima
    o.updateMatrixWorld(true);
    const p = o.getWorldPosition(new THREE.Vector3());
    pecas.push({ x: p.x, y: p.y, z: p.z, ry: o.rotation.y, w: g.width, h: g.height, quem: n });
  });

  // --- vão / tapada -----------------------------------------------------------
  /* PREFILTRO ESPACIAL, o mesmo da passada. Sem ele são ~48 mil raycasts contra a
     lista inteira de malhas do mapa, e a régua leva mais de 10 min — tempo que
     ninguém paga, então ela não roda, então ela não serve. Os raios daqui têm no
     máximo 0,62 m: só malha vizinha pode ser acertada, e a grade prova isso em vez
     de supor. */
  const pertoSolidos = gradeEspacial(solidos, 4);
  const pertoOpacos = gradeEspacial(opacos, 4);
  const rc = new THREE.Raycaster();
  const o3 = new THREE.Vector3(), d3 = new THREE.Vector3();
  const tiro = (alvos, ox, oy, oz, dx, dz, far) => {
    rc.far = far;
    rc.set(o3.set(ox, oy, oz), d3.set(dx, 0, dz).normalize());
    for (const h of rc.intersectObjects(alvos, false)) if (h.distance > 1e-4) return h.distance;
    return null;
  };

  const ruins = [];
  for (const p of pecas) {
    const nx = Math.sin(p.ry), nz = Math.cos(p.ry);
    const ux = Math.cos(p.ry), uz = -Math.sin(p.ry);
    let vao = 0, tapada = 0, n = 0;
    for (const su of [-0.45, -0.22, 0, 0.22, 0.45]) {
      for (const sv of [-0.4, 0, 0.4]) {
        const px = p.x + ux * su * p.w, py = p.y + sv * p.h, pz = p.z + uz * su * p.w;
        n++;
        // 2 cm à frente do plano, olhando pra dentro da parede
        if (tiro(pertoSolidos(px, pz), px + nx * 0.02, py, pz + nz * 0.02, -nx, -nz, 0.62) === null) vao++;
        if (tiro(pertoOpacos(px, pz), px + nx * 0.02, py, pz + nz * 0.02, nx, nz, 0.25) !== null) tapada++;
      }
    }
    const fVao = vao / n, fTap = tapada / n;
    if (fVao > vaoMax || fTap > 0.5) {
      ruins.push({ ...p, vao: +fVao.toFixed(2), tapada: +fTap.toFixed(2) });
    }
  }

  // --- sobreposição -----------------------------------------------------------
  const sobrepostas = [];
  for (let i = 0; i < pecas.length; i++) {
    const a = pecas[i];
    const ax = Math.cos(a.ry), az = -Math.sin(a.ry), anx = Math.sin(a.ry), anz = Math.cos(a.ry);
    for (let j = i + 1; j < pecas.length; j++) {
      const b = pecas[j];
      if (Math.abs(Math.cos(b.ry - a.ry)) < 0.9) continue;              // outro plano
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      if (Math.abs(dx * anx + dz * anz) > 0.35) continue;               // parede diferente
      const du = Math.abs(dx * ax + dz * az), dv = Math.abs(dy);
      const ou = (a.w + b.w) / 2 - du, ov = (a.h + b.h) / 2 - dv;
      if (ou <= 0 || ov <= 0) continue;
      const frac = (ou * ov) / Math.min(a.w * a.h, b.w * b.h);
      if (frac > limSobrepor) {
        sobrepostas.push({ x: +a.x.toFixed(1), y: +a.y.toFixed(1), z: +a.z.toFixed(1), frac: +frac.toFixed(2), a: a.quem, b: b.quem });
      }
    }
  }

  ruins.sort((a, b) => (b.vao + b.tapada) - (a.vao + a.tapada));
  sobrepostas.sort((a, b) => b.frac - a.frac);
  return {
    total: pecas.length,
    noAr: ruins.filter((r) => r.vao > vaoMax).length,
    tapadas: ruins.filter((r) => r.tapada > 0.5).length,
    sobrepostas: sobrepostas.length,
    piores: ruins.slice(0, 40).map((r) => ({
      x: +r.x.toFixed(2), y: +r.y.toFixed(2), z: +r.z.toFixed(2), ry: +r.ry.toFixed(2),
      w: +r.w.toFixed(2), h: +r.h.toFixed(2), vao: r.vao, tapada: r.tapada, quem: r.quem,
    })),
    piorSobrepor: sobrepostas.slice(0, 12),
  };
};

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});

let totalNoAr = 0, totalSobre = 0;
const relatorio = {};
for (const id of MAPAS) {
  if (ONLY && id !== ONLY) continue;
  const page = await browser.newPage({ viewport: { width: 1100, height: 660 } });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  await page.goto(`${BASE}/mapview.html?map=${id}`, { waitUntil: 'networkidle' });
  await page.waitForFunction('window.MAPEVAL && window.MAPEVAL.ready===true', null, { timeout: 180000 });
  const r = await page.evaluate(AUDITAR, [VAO_MAX, LIMITE_SOBREPOR]);
  relatorio[id] = r;
  totalNoAr += r.noAr; totalSobre += r.sobrepostas;

  const sinal = (r.noAr || r.sobrepostas) ? 'RUIM' : 'OK  ';
  console.log(`${sinal} ${id.padEnd(14)} ${r.total} peças | NO AR ${r.noAr} | tapadas ${r.tapadas} | sobrepostas ${r.sobrepostas}`);
  for (const p of r.piores.slice(0, 6)) {
    console.log(`      no ar ${Math.round(p.vao * 100)}%  (${p.x}, ${p.y}, ${p.z}) ry=${p.ry}  ${p.w}×${p.h} m  ${p.quem}`);
  }
  for (const s of r.piorSobrepor.slice(0, 3)) {
    console.log(`      sobrepõe ${Math.round(s.frac * 100)}%  (${s.x}, ${s.y}, ${s.z})  ${s.a} × ${s.b}`);
  }

  /* FOTO DAS PIORES: a câmera nasce 3 m à frente da peça, na altura dela, olhando
     pra ela. Sem isto o relatório é uma lista de coordenadas que ninguém confere. */
  if (FOTOS && r.piores.length) {
    mkdirSync(`${OUT}/${id}`, { recursive: true });
    for (let i = 0; i < Math.min(FOTOS, r.piores.length); i++) {
      const p = r.piores[i];
      const nx = Math.sin(p.ry), nz = Math.cos(p.ry);
      await page.evaluate(([f, l]) => window.MAPEVAL.view(f, l),
        [[p.x + nx * 3.2, p.y + 0.4, p.z + nz * 3.2], [p.x, p.y, p.z]]);
      await page.screenshot({ path: `${OUT}/${id}/${String(i).padStart(2, '0')}_vao${Math.round(p.vao * 100)}.png` });
    }
    console.log(`      -> ${Math.min(FOTOS, r.piores.length)} fotos em ${OUT}/${id}/`);
  }
  await page.close();
}
await browser.close();
writeFileSync('tools/eval/graffiti_audit.json', JSON.stringify(relatorio, null, 1));
console.log(`GRAFFITI-AUDIT no ar ${totalNoAr} | sobrepostas ${totalSobre} -> tools/eval/graffiti_audit.json`);
if (totalNoAr || totalSobre) process.exitCode = 1;
