/* select-inflate.mjs — O BALÃO MEDIDO NO CAMINHO DA TELA DE SELEÇÃO.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE (o buraco que deixou o defeito passar DUAS vezes)

   A `pose-inflate.mjs` mede o GLB do disco com os clipes do disco. Ela é correta e é
   ela que pegou a inversão de segmento do auto-skin. Mas ela é CEGA para a tela que o
   dono olha, por três motivos MEDIDOS — não supostos:

   1. CLIPE ERRADO. Ela roda `['walk','run','idle','crouchwalk']`. Quem carrega arma de
      uma mão (10 do elenco: deagle/pistol/revolver38/knife) NÃO usa `idle` na tela de
      seleção: o `ctrl.oneHanded` (glbchars.js:404) troca para `idle1h`, que a régua
      antiga nunca abriu.
   2. POSE QUE SÓ EXISTE EM RUNTIME. Metade da deformação da tela de seleção é escrita
      DEPOIS do mixer, em JavaScript, e não está em clipe nenhum:
        • `solveCCDIK` da mão de apoio (glbchars.js:539, handik.js:30) reescreve
          LeftArm+LeftForeArm todo quadro, 8 iterações, SEM limite de junta;
        • os ossos de curl levam `rotation.x += curl` (glbchars.js:529-531);
        • a arma pendurada muda o clipe escolhido.
      Nada disso existe no GLB, então nada disso a régua antiga podia ver.
   3. PERCENTIL CEGO. O artefato vive numa fatia PEQUENA da malha. Medido no
      `ostentacao` em `idle`: a régua antiga dá esticP95 = 0,163 — o 5º MENOR de 44 —
      e mesmo assim a imagem mostra os braços virados em asa de morcego
      (scratchpad ikab3/ostentacao-C.png contra ostentacao-Z.png, que é a bind e está
      limpa). Motivo: só 2,9% das arestas passam de 25%, e P95 lê o percentil 95.
      Um defeito que mora acima do P97 é invisível para o P95 POR CONSTRUÇÃO.

   O QUE ESTA RÉGUA FAZ DIFERENTE
   Ela abre o jogo de verdade (Chromium + swiftshader), chama o MESMO
   `buildCharacterModel(def, { weaponId: charWeapon(id) })` da tela de seleção, assenta
   com o MESMO `ctrl.update(dt, 0, false, 0)` do loop do preview (main.js:1527) e só
   então mede — com a pele calculada pelo próprio three (`applyBoneTransform`), que é o
   que a GPU desenha. Percentis altos (P99/P99.9/máx) porque é lá que o defeito mora.

   MÉTRICA
     esticP99 / esticP999 / esticMax — razão simétrica max(L/L0, L0/L) − 1 por aresta,
     posado contra bind. Simétrica pelo mesmo motivo da pose-inflate: aresta que COLABA
     satura em 1,0 na forma ingênua e a régua acabava premiando malha rasgada.
     ruins/1e4 — arestas com r > 1,0 (dobraram de tamanho) por 10 mil arestas. É o
     contador que enxerga defeito de 1% da malha; percentil nenhum faz isso.

   TETO, COM PROCEDÊNCIA (a Lei 2 da casa)
   Não é opinião: é o pior dos DOIS personagens que o dono elogia, medidos por esta
   mesma régua, neste mesmo caminho. `mandrake` e `pagodeiro` são os que ele citou como
   bons. O teto é o pior deles com folga de 25%. Rode `--ref` para reimprimir de onde
   o número vem.

   TESTE DE MUTAÇÃO (o corolário do HANDOFF: régua que não morde não existe)
   Com `--mutate` o teto vem CONGELADO da última execução limpa, senão o mutante piora as
   referências junto, o teto sobe e o teatro fica verde. Rodados contra `mandrake` e
   `pagodeiro`, que passam limpos:

     --mutate=skin   devolve o off-by-one do 88144c4 (antebraço obedecendo ao punho)
                     -> 2/2 VERMELHOS (mandrake 24,9 -> 97,7 ruins/1e4; pagodeiro 44,6 -> 111)
     --mutate=curl   fecha os ossos de dedo 2,2 rad
                     -> pagodeiro 3,82 -> 15,52 %>25, VERMELHO. mandrake NÃO muda, e está
                        certo: o rig dele não tem osso `Curl_*` (conferido no GLB).

   O QUE NÃO MORDE, E POR QUÊ (resultado negativo, medido — não é buraco de régua)
     --mutate=ik     estraga o alvo da mão de apoio. Fica VERDE nos dois. Duas medições
                     explicam: (a) alvo 6× mais longe deixa mandrake em 17,9 contra 24,9
                     do limpo, MELHOR, porque `solveCCDIK` projeta o alvo na esfera de
                     alcance e o braço só estica; (b) alvo atrás do corpo, com o ombro
                     girando meia volta, dá 23,9. Ou seja: pose errada não rasga malha
                     BEM PINTADA. Esta régua mede rasgo de pele, não plausibilidade de
                     pose — e é de propósito, porque é rasgo que o dono chama de balão.
     --mutate=semik  diagnóstico: desliga o CCD e mede quanto do balão era dele.
                     Medido nos 11 transplantados com IK: cai só 5-20%
                     (chave 160->158, oakley 142,3->133,6, adjim 132,7->106,2).
                     O CCD agrava; a causa é a pintura de peso.

   USO
     node tools/eval/serve.mjs 8123 &
     node tools/eval/select-inflate.mjs                 # todos, imprime tabela + grava JSON
     node tools/eval/select-inflate.mjs mandrake,fluxo  # só alguns
     node tools/eval/select-inflate.mjs --mutate=skin   # tem que ficar VERMELHA
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8123';
const args = process.argv.slice(2);
const MUT = (args.find((a) => a.startsWith('--mutate')) || '').split('=')[1] || null;
const SO_REF = args.includes('--ref');
const DIAG = args.includes('--diagnose');
const IDS = (args.find((a) => !a.startsWith('-')) || '').split(',').filter(Boolean);
const FOTO_ARG = args.find((a) => a === '--fotos' || a.startsWith('--fotos='));
const FOTO_DIR = FOTO_ARG ? (FOTO_ARG.split('=')[1] || '/tmp/select-inflate-fotos') : null;
if (FOTO_DIR) fs.mkdirSync(FOTO_DIR, { recursive: true });

/* Referências do dono, textualmente: "compare com o pagodeiro e o mandrake, que ele
   elogia". Os tetos saem daqui e de mais lugar nenhum. */
const REFS = ['mandrake', 'pagodeiro'];
const FOLGA = 1.25;   // 25% acima do pior elogiado: acusa o que é PIOR que o bom, não o que é diferente

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
// Esta sonda nao mede menu. O shell virtual do serve.mjs contem apenas o import map;
// depender de `index.astro` fazia a playlist do menu (BUG-19) bloquear a medicao por
// 120 s antes de qualquer personagem. Cada GLB segue aguardado no preload abaixo.
await page.goto(`${BASE}/eval-character.html?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });

const alvos = IDS.length ? IDS : await page.evaluate(async () => {
  const C = await import('./js/characters.js');
  const G = await import('./js/glbchars.js');
  return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
});

const out = [];
for (const id of alvos) {
  const r = await page.evaluate(async ([cid, mut, foto, diagnostico]) => {
    const THREE = await import('three');
    const G = await import('./js/glbchars.js');
    const C = await import('./js/characters.js');
    const def = C.CHARACTERS.find((c) => c.id === cid);
    if (!def) return { id: cid, erro: 'sem definição de personagem' };
    await G.preloadCharacterAssets([cid]);
    if (!G.hasModel(cid)) return { id: cid, erro: 'sem GLB carregado' };

    // EXATAMENTE o que main.js:355 (pvSetChar) monta na tela de seleção.
    const wid = C.charWeapon(cid);
    const m = G.buildCharacterModel(def, { weaponId: wid });
    if (!m) return { id: cid, erro: 'buildCharacterModel retornou null' };

    /* MUTAÇÕES — cada uma reintroduz uma das causas reais que esta régua tem que pegar.
       Se a régua não ficar vermelha com elas, ela não existe (corolário do HANDOFF). */
    /* mut=ik — o alvo da mão de apoio vai parar ATRÁS do corpo. É a regressão plausível
       de `gripPoints` com sinal trocado, e obriga o ombro a girar meia volta: o CCD
       obedece (não tem limite de junta) e a axila rasga.
       NOTA HONESTA sobre o que este mutante NÃO prova: mandar o alvo pra LONGE não morde,
       porque `solveCCDIK` projeta o alvo na esfera de alcance (handik.js, bloco ALCANCE)
       e o braço só estica; e esticar não rasga malha bem pintada. Verificado: com o alvo
       6× mais longe, mandrake fica em ruins/1e4 17,9 contra 24,9 do limpo — MELHOR. */
    if (mut === 'ik' && m.ctrl.ikL) m.ctrl.ikL.fore.set(-m.ctrl.ikL.fore.x, m.ctrl.ikL.fore.y - 0.9, m.ctrl.ikL.fore.z - 1.4);
    if (mut === 'semik') m.ctrl.ikL = null;   // DIAGNÓSTICO (não é mutação): quanto do balão é do CCD?
    if (mut === 'curl') m.group.traverse((o) => { if (o.isBone && /^Curl_/.test(o.name)) o.rotation.x += 2.2; });
    /* mut=skin — devolve EXATAMENTE o off-by-one que o 88144c4 consertou: a carne do
       antebraço volta a obedecer ao punho. Se a régua não ficar vermelha aqui, ela não
       enxerga a causa raiz que ela existe para vigiar. */
    if (mut === 'skin') {
      m.group.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        const si = o.geometry.attributes.skinIndex, nomes = o.skeleton.bones.map((x) => x.name);
        const pares = [['LeftForeArm', 'LeftHand'], ['RightForeArm', 'RightHand'], ['LeftArm', 'LeftForeArm'], ['RightArm', 'RightForeArm']]
          .map(([a, z]) => [nomes.indexOf(a), nomes.indexOf(z)]).filter(([a, z]) => a >= 0 && z >= 0);
        if (!pares.length) return;
        const get = ['getX', 'getY', 'getZ', 'getW'], set = ['setX', 'setY', 'setZ', 'setW'];
        for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) {
          const v = si[get[k]](i);
          const p = pares.find(([a]) => a === v);
          if (p) si[set[k]](i, p[1]);
        }
        si.needsUpdate = true;
      });
    }

    /* REFERÊNCIA = GÊMEO NÃO POSADO, não o atributo cru.
       ARMADILHA QUE ESTA RÉGUA JÁ PAGOU: comparar `applyBoneTransform` com a POSITION
       do buffer dá razão ~110 em TODOS os 44, porque `buildCharacterModel` reescala o
       modelo (`model.scale.setScalar(TARGET_HEIGHT/h)`, ~0,01) DEPOIS do `bindMatrix`
       ter sido capturado no template. O shader cancela isso no `matrixWorld` da malha;
       a conta em CPU não cancela. Um gêmeo passado pela MESMA função e nunca atualizado
       (mixer intocado = pose de rest) mede na mesma convenção, e aí a razão de aresta é
       de deformação de verdade. */
    const ref = G.buildCharacterModel(def, { weapon: false });
    const cenaRef = new THREE.Scene(); cenaRef.add(ref.group); cenaRef.updateMatrixWorld(true);
    const refMeshes = []; ref.group.traverse((o) => { if (o.isSkinnedMesh) refMeshes.push(o); });

    // MESMO settle do loop do preview (main.js:1527: ctrl.update(dt, 0, false, 0)).
    const scene = new THREE.Scene();
    scene.add(m.group);
    for (let i = 0; i < 60; i++) m.ctrl.update(1 / 60, 0, false, 0);
    scene.updateMatrixWorld(true);

    const meshes = [];
    m.group.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
    if (meshes.length !== refMeshes.length) return { id: cid, erro: 'malhas divergem' };
    const rs = [];
    const badEdges = [];
    const boneHits = {};
    const vb = new THREE.Vector3(), vp = new THREE.Vector3();
    for (let mi = 0; mi < meshes.length; mi++) {
      const sm = meshes[mi], sr = refMeshes[mi];
      sm.skeleton.update(); sr.skeleton.update();
      const pos = sm.geometry.attributes.position;
      const skinIndex = sm.geometry.attributes.skinIndex;
      const skinWeight = sm.geometry.attributes.skinWeight;
      const N = pos.count;
      const bx = new Float32Array(N * 3), px = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        vb.fromBufferAttribute(sr.geometry.attributes.position, i); sr.applyBoneTransform(i, vb);
        bx[i * 3] = vb.x; bx[i * 3 + 1] = vb.y; bx[i * 3 + 2] = vb.z;
        vp.fromBufferAttribute(pos, i); sm.applyBoneTransform(i, vp);
        px[i * 3] = vp.x; px[i * 3 + 1] = vp.y; px[i * 3 + 2] = vp.z;
      }
      const idx = sm.geometry.index;
      const cnt = idx ? idx.count : N;
      const gi = (k) => (idx ? idx.getX(k) : k);
      const vistas = new Set();
      const d = (arr, a, b) => Math.hypot(arr[a * 3] - arr[b * 3], arr[a * 3 + 1] - arr[b * 3 + 1], arr[a * 3 + 2] - arr[b * 3 + 2]);
      for (let k = 0; k + 2 < cnt; k += 3) {
        const a = gi(k), b = gi(k + 1), c = gi(k + 2);
        for (const [x, y] of [[a, b], [b, c], [c, a]]) {
          const key = x < y ? x * 1e7 + y : y * 1e7 + x;
          if (vistas.has(key)) continue;
          vistas.add(key);
          const L0 = d(bx, x, y); if (L0 < 1e-6) continue;
          const L = d(px, x, y);
          const ratio = (L >= L0 ? L / L0 : L0 / Math.max(L, 1e-9)) - 1;
          rs.push(ratio);
          if (ratio > 1 && skinIndex && skinWeight) {
            const get = ['getX', 'getY', 'getZ', 'getW'];
            for (const vi of [x, y]) {
              let melhorK = 0, melhorPeso = -1;
              for (let k = 0; k < 4; k++) {
                const peso = skinWeight[get[k]](vi);
                if (peso > melhorPeso) { melhorPeso = peso; melhorK = k; }
              }
              const bone = sm.skeleton.bones[skinIndex[get[melhorK]](vi)]?.name || '(sem osso)';
              boneHits[bone] = (boneHits[bone] || 0) + 1;
            }
            if (diagnostico) {
              const dominante = (vi) => {
                const get = ['getX', 'getY', 'getZ', 'getW'];
                let melhorK = 0, melhorPeso = -1;
                for (let ki = 0; ki < 4; ki++) {
                  const peso = skinWeight[get[ki]](vi);
                  if (peso > melhorPeso) { melhorPeso = peso; melhorK = ki; }
                }
                return {
                  bone: sm.skeleton.bones[skinIndex[get[melhorK]](vi)]?.name || '(sem osso)',
                  weight: +melhorPeso.toFixed(4),
                };
              };
              badEdges.push({ mesh: mi, a: x, b: y, l0: +L0.toFixed(7), l: +L.toFixed(7), ratio: +ratio.toFixed(3), da: dominante(x), db: dominante(y) });
            }
          }
        }
      }
    }
    if (!rs.length) return { id: cid, erro: 'nenhuma aresta skinned mensurável' };
    rs.sort((a, b) => a - b);
    const q = (f) => rs[Math.min(rs.length - 1, Math.floor(rs.length * f))];
    const acima = (t) => rs.reduce((n, r) => n + (r > t ? 1 : 0), 0);
    const result = {
      id: cid, arma: wid, oneHanded: !!m.ctrl.oneHanded, ik: !!m.ctrl.ikL, arestas: rs.length,
      p95: +q(0.95).toFixed(3), p99: +q(0.99).toFixed(3), p999: +q(0.999).toFixed(3),
      max: +rs[rs.length - 1].toFixed(2),
      pct25: +((100 * acima(0.25)) / rs.length).toFixed(2),
      ruins1e4: +((1e4 * acima(1.0)) / rs.length).toFixed(1),
      ruinsPorOsso: Object.entries(boneHits).sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
    if (diagnostico) result.ruinsArestas = badEdges.sort((a, b) => b.ratio - a.ratio).slice(0, 256);
    if (foto) {
      document.body.replaceChildren();
      document.body.style.margin = '0';
      document.body.style.background = '#17191d';
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(640, 640);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.dataset.selectInflate = cid;
      document.body.appendChild(renderer.domElement);
      scene.background = new THREE.Color(0x17191d);
      scene.add(new THREE.HemisphereLight(0xdde8ff, 0x4a3528, 2.1));
      const key = new THREE.DirectionalLight(0xffffff, 3.0);
      key.position.set(3, 5, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x88aaff, 1.5);
      rim.position.set(-4, 3, -3);
      scene.add(rim);
      const box = new THREE.Box3().setFromObject(m.group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z);
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 8),
        new THREE.MeshStandardMaterial({ color: 0x30343b, roughness: 0.95, metalness: 0 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0;
      scene.add(floor);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
      const target = new THREE.Vector3(center.x, 0.86, center.z);
      camera.position.copy(target).add(new THREE.Vector3(0.38, 0.04, 1).normalize().multiplyScalar(radius * 2.05));
      camera.lookAt(target);
      renderer.render(scene, camera);
    }
    return result;
  }, [id, MUT, !!FOTO_DIR, DIAG]);
  if (r) out.push(r);
  else console.error('sem modelo:', id);
  if (r && FOTO_DIR) {
    await page.locator(`canvas[data-select-inflate="${id}"]`).screenshot({ path: `${FOTO_DIR}/${id}${MUT ? `-${MUT}` : ''}.png` });
    console.log('foto:', `${FOTO_DIR}/${id}${MUT ? `-${MUT}` : ''}.png`);
  }
}
await browser.close();

// ── tetos, medidos nos elogiados nesta MESMA execução ──────────────────────────────
const refs = out.filter((r) => REFS.includes(r.id) && !r.erro);
if (!MUT && refs.length !== REFS.length) {
  const ausentes = REFS.filter((id) => !refs.some((r) => r.id === id));
  console.error('ERRO: referências ausentes (' + ausentes.join(', ') + '); sem elas os tetos viram null e a régua não mede.');
  process.exit(2);
}
let teto = {
  p99: refs.length ? +(Math.max(...refs.map((r) => r.p99)) * FOLGA).toFixed(3) : null,
  ruins1e4: refs.length ? +(Math.max(...refs.map((r) => r.ruins1e4)) * FOLGA).toFixed(1) : null,
};
/* TETO CONGELADO NA MUTAÇÃO. Sem isto o teste de mutação é teatro: o mutante piora
   TAMBÉM as referências, o teto sobe junto e a régua continua verde enquanto o jogo
   inteiro derrete. Com `--mutate` o teto vem da última execução limpa (o JSON), então
   estragar de propósito tem que ficar vermelho — inclusive nas referências. */
if (MUT && MUT !== 'semik') {
  const prev = JSON.parse(fs.readFileSync('tools/eval/select_inflate.json', 'utf8'));
  if (prev.mutante) { console.error('ERRO: select_inflate.json é de uma execução MUTANTE. Rode limpo primeiro.'); process.exit(2); }
  teto = prev.teto;
  console.log('   (mutação: teto CONGELADO da execução limpa -> p99 <= ' + teto.p99 + ', ruins/1e4 <= ' + teto.ruins1e4 + ')');
}
if (SO_REF || refs.length) {
  console.log('\nTETO (pior dos elogiados × ' + FOLGA + '):');
  for (const r of refs) console.log('   ref ' + r.id.padEnd(12) + ' p99=' + r.p99 + '  ruins/1e4=' + r.ruins1e4);
  console.log('   -> p99 <= ' + teto.p99 + ' e ruins/1e4 <= ' + teto.ruins1e4);
}
if (DIAG) {
  for (const r of out.filter((x) => !x.erro)) {
    console.log('   diag ' + r.id + ': ' + (r.ruinsPorOsso || []).map(([bone, n]) => `${bone}=${n}`).join(', '));
  }
}
if (SO_REF) process.exit(0);

console.log('\n=== BALÃO NO CAMINHO DA TELA DE SELEÇÃO' + (MUT ? '  [MUTANTE: ' + MUT + ']' : '') + ' ===');
console.log('id'.padEnd(15), 'arma'.padEnd(10), 'IK', 'P95'.padStart(7), 'P99'.padStart(7), 'P99.9'.padStart(7), 'máx'.padStart(8), '%>25'.padStart(6), 'ruins/1e4'.padStart(10));
out.sort((a, b) => (b.ruins1e4 ?? -Infinity) - (a.ruins1e4 ?? -Infinity));
let reprovados = 0;
for (const r of out) {
  if (r.erro) {
    reprovados++;
    console.log('✗ ' + r.id.padEnd(13) + ' ERRO: ' + r.erro);
    continue;
  }
  const ruim = teto.p99 != null && (r.p99 > teto.p99 || r.ruins1e4 > teto.ruins1e4);
  if (ruim) reprovados++;
  console.log(
    (ruim ? '✗ ' : '  ') + r.id.padEnd(13), r.arma.padEnd(10), r.ik ? 'ik' : '  ',
    String(r.p95).padStart(7), String(r.p99).padStart(7), String(r.p999).padStart(7),
    String(r.max).padStart(8), String(r.pct25).padStart(6), String(r.ruins1e4).padStart(10));
}
console.log(`\nREPROVADOS: ${reprovados}/${out.length}`);
// execução mutante NÃO sobrescreve o baseline: senão o teto congelado vira o do mutante
if (!MUT) {
  fs.writeFileSync('tools/eval/select_inflate.json', JSON.stringify({ gerado: new Date().toISOString(), mutante: null, refs: REFS, folga: FOLGA, teto, personagens: out }, null, 1));
  console.log('-> tools/eval/select_inflate.json');
}
process.exit(reprovados > 0 ? 1 : 0);
