/* ============================================================================
   mansao-beach-check.mjs — RÉGUA DA PRAIA E DO HORIZONTE DO JOÁ.
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA PREMIA NÃO EXISTIR (palavras do dono, 25/08/2026):
     "o mansao joa precisava melhorar o horizonte (em todos mapas) e a praia".

   Até aqui o "mar" do Joá era: deck de madeira até z=-35, um LEITO inclinado de
   200x44,5 m pintado de 0x6f6350 (`map_mansao.js`, bloco COSTÃO E OCEANO) e a
   lâmina viva da `water.js` por cima. Não havia AREIA — havia um plano marrom de
   dois triângulos com cinco dodecaedros de pedra. E o horizonte era só o que o
   panorama `sky_joa.webp` traz assado: no setor NORTE (que é para onde o terraço
   inteiro olha) o panorama é mar aberto e vazio, sem um morro sequer.

   Régua ANTES do conserto (Lei 1): este arquivo nasceu VERMELHO no estado
   anterior à praia. Reprodução do estado velho: `git stash` das mudanças de
   `map_mansao.js`/`look.js`/`map_sky.js` e rodar de novo.

   ----------------------------------------------------------------------------
   O QUE ELA MEDE — no MESMO mundo em que o jogo roda (bootGame = a classe Game de
   verdade), lendo GEOMETRIA VIVA da cena, nunca declaração de arquivo (BUG-02).

     B1  AREIA DE VERDADE: área EMERSA (acima do nível do mar vivo, lido do mesh
         do oceano) de superfície marcada `praiaFeature='areia'`, medida por sonda
         vertical numa grade de 1 m — não pela dimensão declarada da geometria.
         Mede também RELEVO (a praia sobe da água e tem berma) e a TRAVESSIA da
         linha d'água (tem areia molhada e areia seca).
     B2  MARGEM VIVA: existe uma lâmina `aguaViva` DEDICADA à rebentação (não o
         plano de oceano de 1000x480) cobrindo a linha d'água da areia, com espuma
         de swash (uEspumaFaixa apertada) e com uTime que AVANÇA no world.update.
     B3  COQUEIRO INCLINADO: >= COQ_MIN coqueiros, cada um com a copa deslocada da
         base o bastante para o tronco fazer >= COQ_INCLIN_MIN graus com a
         vertical. Coqueiro de praia inclina para o mar; palmeira reta é jardim.
     B4  BARRACA: >= 1 barraca com >= BARRACA_PARTES tipos de peça distintos
         (cobertura, poste, balcão, banco...) — caixa com pano em cima não é
         barraca, é caixa.
     B5  FRESCOBOL: >= 2 silhuetas distantes, cada uma dentro do orçamento de
         silhueta (é vulto de longe, não personagem).
     B6  A PRAIA NÃO ENTRA NO JOGO: nenhuma peça de praia/horizonte cruza
         `world.bounds`, nenhuma está em `world.occluders` (bala não para em
         cenário fora do mapa) e nenhuma virou colisor.
     B7  ORÇAMENTO: praia + horizonte somados cabem no teto de malhas/triângulos.

     H1  HORIZONTE EM CAMADAS: morros + ilha + bruma existem na cena, todos dentro
         do alcance da câmera, e em pelo menos duas profundidades distintas —
         horizonte de UMA camada é recorte de papel, não horizonte.
     H2  SETOR LIMPO: nenhuma peça de horizonte cai no setor azimutal em que o
         `sky_joa.webp` JÁ tem terra assada — senão o morro 3D briga com o morro
         da foto.
     H3  DECLARADO NO LOOK E USADO: `LOOK.mansao.horizonte3d` existe e a contagem
         de morros/ilhas DECLARADA bate com a que a cena realmente tem.

   ----------------------------------------------------------------------------
   PROCEDÊNCIA DOS TETOS (Lei 2 — teto sem procedência é opinião)

   AREIA_MIN = 430 m². Derivado da GEOMETRIA DO MAPA, não de gosto. Do spawn B
   (0, -22) o jogador olha para o norte por uma "janela" cujas bordas são as quinas
   do muro lateral em (+-22, -36): meia-abertura atan(22/14) = 57,5°. Projetada até
   a linha d'água (z ~= -45,6, onde o leito de 0,0995 de inclinação cruza o nível
   -0,9 da água) essa abertura tem +-22*(45-22)/(36-22) = +-36 m, ou seja 72 m de
   frente visível. Uma praia mais estreita que isso mostra as PONTAS de dentro do
   terraço. Profundidade mínima de 6 m para a faixa seca não ler como uma linha.
     72 m x 6 m = 432 m² -> teto 430 m².
   Reprodução: `node tools/eval/mansao-beach-check.mjs` imprime a área medida.

   COQ_INCLIN_MIN = 8°. Coqueiro-da-baía (Cocos nucifera) de linha de praia cresce
   inclinado para o mar por fototropismo e vento; a inclinação típica das fotos de
   Joatinga/Prainha fica entre 10° e 25°. 8° é o PISO conservador: separa "coqueiro
   de praia" de "palmeira imperial reta", que é o que o jardim do mapa já tem
   (map_mansao.js, bloco JARDIM TROPICAL: `palmeira_imperial` em tronco vertical).

   SETOR_LIMPO — medido no próprio panorama, não asserido:
     python3 -c "medianas por setor azimutal da banda do horizonte de sky_joa.webp"
   A banda y=[431,441) de 887 (o equador equiretangular do map_sky.js), fatiada em
   16 setores, mostra mar aberto de azimute -2,83 rad até +0,94 rad e TERRA (ilhas,
   morro, copa de árvore) fora disso: setores 11-15 (+1,37 .. +2,95 rad) medem
   #2c2d19 / #2e2c10 / #7e828e / #4e5252 / #423f24 — verde e rocha, não mar; e o
   setor 0 (-2,95 rad) traz o ilhote da ponta oeste. Convenção do azimute: o
   `EquirectangularReflectionMapping` do three amostra u = atan2(dir.z, dir.x)/2pi
   + 0,5, então azimute = atan2(z, x) e -pi/2 é o NORTE do mapa (-z).

   ALCANCE = [100, 380] m. A câmera do jogo tem far = 400 (game.js); relevo além
   disso é recortado inteiro e não existe. 100 m é o piso para "distante": o mapa
   inteiro cabe em 44x72 m, então relevo a menos de 100 m é cenário de borda, não
   horizonte.

   TETO_TRIS = 16.000 / TETO_MALHAS = 200. O `world.root` do mansão media 984
   malhas e 35.272 triângulos ANTES desta frente (probe no rodapé deste arquivo).
   Decoração que o jogador nunca pisa não pode custar meio mapa: 45% do orçamento
   de triângulos e ~20% do de malhas é o limite declarado.

   ----------------------------------------------------------------------------
   MUTANTES (Lei 3 — se ela não morde, ela não existe). Cada um PROVA que aplicou:
     --mutante=sem-areia                 apaga a areia            -> B1
     --mutante=areia-plana               achata o relevo          -> B1
     --mutante=margem-congelada          tira a rebentação do tique -> B2
     --mutante=coqueiro-reto             endireita os coqueiros   -> B3
     --mutante=praia-invade              puxa uma peça pra dentro dos bounds -> B6
     --mutante=horizonte-raso            uma camada só            -> H1
     --mutante=horizonte-tapa-panorama   morro em cima da terra assada -> H2

   LIMITE CONHECIDO, declarado (Lição 3): esta régua roda em NODE, então nenhum GLB
   carrega. Ela mede a praia PROCEDURAL, que é a que existe em todo lugar. A prova
   visual (Lei 4) é a captura 3:2 do `tools/eval/look-capture.mjs`, que NÃO foi
   rodada nesta sessão (slot único de browser do orquestrador).
   ============================================================================ */
import { THREE, initTextures, bootGame } from './harness.mjs';
import { LOOK } from '../../public/js/look.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = new Set(['sem-areia', 'areia-plana', 'margem-congelada', 'coqueiro-reto',
  'praia-invade', 'horizonte-raso', 'horizonte-tapa-panorama']);
if (MUT && !MUTANTES.has(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(1); }

/* ---------------- tetos, todos com procedência no cabeçalho ---------------- */
const PASSO = 1.0;              // grade da sonda vertical (m)
const AREA_MIN = 430;           // m² de areia EMERSA
const RELEVO_MIN = 0.8;         // m entre o ponto mais alto e o mais baixo da areia
const PROF_MIN = 6.0;           // m de profundidade da faixa seca
const COQ_MIN = 6;
const COQ_INCLIN_MIN = 8;       // graus com a vertical
const BARRACA_PARTES = 4;
const FRESCOBOL_MIN = 2;
const FRESCOBOL_TRIS = 400;     // silhueta distante, não personagem
const TETO_TRIS = 16000;
const TETO_MALHAS = 200;
const MORROS_MIN = 4;
const ALCANCE = [100, 380];     // m (far da câmera = 400)
const CAMADAS_RAZAO = 1.4;      // maior/menor distância
const SETOR_LIMPO = [-2.83, 0.94];   // rad, azimute atan2(z,x) — mar aberto no sky_joa.webp

const falhas = [];
const linhas = [];
const clausula = (id, ok, texto) => { linhas.push(`${ok ? 'ok ' : 'x  '} ${id}  ${texto}`); if (!ok) falhas.push(`${id}: ${texto}`); };

/* ---------------- sobe o jogo de verdade ---------------- */
const g = bootGame('mansao', { textures: initTextures(), seed: 14000 });
g.scene.updateMatrixWorld(true);
g.world.root.updateMatrixWorld(true);

/* ---------------- inventário: praia e horizonte, lidos da CENA ---------------- */
const praia = [];       // { obj, tipo }
const horizonte = [];   // { obj, tipo }
g.scene.traverse((o) => {
  const p = o.userData?.praiaFeature;
  if (p) praia.push({ obj: o, tipo: p });
  const h = o.userData?.horizonteFeature;
  if (h) horizonte.push({ obj: o, tipo: h });
});
const doTipo = (lista, tipo) => lista.filter((e) => e.tipo === tipo && e.obj.visible !== false);

/* nível do mar VIVO: a maior lâmina aguaViva da cena é o oceano */
let oceano = null, aguas = [];
g.scene.traverse((o) => {
  if (!(o.isMesh && o.userData?.aguaViva)) return;
  aguas.push(o);
  const par = o.geometry?.parameters || {};
  const area = (par.width || 0) * (par.height || 0);
  if (!oceano || area > (oceano.geometry.parameters.width * oceano.geometry.parameters.height)) oceano = o;
});
const NIVEL_MAR = oceano ? oceano.position.y : -0.9;

/* ---------------- mutantes de MUNDO (cada um prova que aplicou) ---------------- */
const morre = (msg) => { console.error(`MUTANTE ${MUT} NÃO APLICOU: ${msg}`); process.exit(1); };
if (MUT === 'sem-areia') {
  const areias = doTipo(praia, 'areia');
  if (!areias.length) morre('nenhuma superfície praiaFeature="areia" na cena (a régua já estava vermelha)');
  for (const a of areias) a.obj.visible = false;
}
if (MUT === 'areia-plana') {
  const areias = doTipo(praia, 'areia');
  if (!areias.length) morre('nenhuma superfície praiaFeature="areia" na cena');
  let mexeu = false;
  for (const a of areias) {
    const pos = a.obj.geometry?.attributes?.position;
    if (!pos) continue;
    // plano deitado por rotation.x=-PI/2: o z LOCAL é a altura do mundo
    for (let i = 0; i < pos.count; i++) { if (pos.getZ(i) !== 0) mexeu = true; pos.setZ(i, 0); }
    pos.needsUpdate = true;
  }
  if (!mexeu) morre('a areia já era plana (nenhum vértice deslocado)');
  g.world.root.updateMatrixWorld(true);
}
if (MUT === 'margem-congelada') {
  const ws = g.scene.userData.waters || [];
  const rebentacao = doTipo(praia, 'rebentacao')[0];
  if (!rebentacao) morre('nenhuma lâmina praiaFeature="rebentacao" na cena');
  const antes = ws.length;
  g.scene.userData.waters = ws.filter((w) => w.mesh !== rebentacao.obj);
  if (g.scene.userData.waters.length === antes) morre('a rebentação não estava na lista que o world.update tica');
}
if (MUT === 'coqueiro-reto') {
  const copas = praia.filter((e) => e.obj.userData?.praiaParte === 'copa');
  if (!copas.length) morre('nenhuma peça praiaParte="copa" na cena');
  let mexeu = false;
  for (const c of copas) {
    if (Math.abs(c.obj.position.x) > 1e-4 || Math.abs(c.obj.position.z) > 1e-4) mexeu = true;
    c.obj.position.x = 0; c.obj.position.z = 0;
  }
  if (!mexeu) morre('as copas já nasciam alinhadas com a base (coqueiros já eram retos)');
  g.scene.updateMatrixWorld(true);
}
if (MUT === 'praia-invade') {
  const alvo = doTipo(praia, 'coqueiro')[0] || praia.find((e) => e.obj.visible !== false);
  if (!alvo) morre('nenhuma peça de praia na cena');
  alvo.obj.position.z = 0;   // meio do mapa, dentro dos bounds
  g.scene.updateMatrixWorld(true);
}
if (MUT === 'horizonte-raso') {
  if (!horizonte.length) morre('nenhuma peça horizonteFeature na cena');
  const d0 = Math.hypot(horizonte[0].obj.position.x, horizonte[0].obj.position.z) || 150;
  let mexeu = false;
  for (const h of horizonte) {
    const d = Math.hypot(h.obj.position.x, h.obj.position.z) || 1;
    if (Math.abs(d - d0) > 1e-3) mexeu = true;
    h.obj.position.x *= d0 / d; h.obj.position.z *= d0 / d;
  }
  if (!mexeu) morre('o horizonte já tinha uma camada só');
  g.scene.updateMatrixWorld(true);
}
if (MUT === 'horizonte-tapa-panorama') {
  const m = doTipo(horizonte, 'morro')[0];
  if (!m) morre('nenhum horizonteFeature="morro" na cena');
  const d = Math.hypot(m.obj.position.x, m.obj.position.z) || 250;
  m.obj.position.x = Math.cos(2.2) * d; m.obj.position.z = Math.sin(2.2) * d;   // 2,2 rad = terra assada
  g.scene.updateMatrixWorld(true);
}

/* ============================ B1 — AREIA DE VERDADE ============================ */
{
  const areias = doTipo(praia, 'areia').map((e) => e.obj);
  const caixa = new THREE.Box3();
  for (const a of areias) caixa.union(new THREE.Box3().setFromObject(a));
  let celulasSecas = 0, yMin = Infinity, yMax = -Infinity, zSeco0 = Infinity, zSeco1 = -Infinity;
  let xSeco0 = Infinity, xSeco1 = -Infinity, molhada = 0;
  if (areias.length) {
    const ray = new THREE.Raycaster();
    ray.camera = g.camera;
    const alvo = new THREE.Group();   // sonda SÓ a areia: leito e pedras não são praia
    const abaixo = new THREE.Vector3(0, -1, 0);
    for (let x = Math.ceil(caixa.min.x); x <= caixa.max.x; x += PASSO)
      for (let z = Math.ceil(caixa.min.z); z <= caixa.max.z; z += PASSO) {
        ray.set(new THREE.Vector3(x, caixa.max.y + 5, z), abaixo);
        ray.far = (caixa.max.y + 5) - (caixa.min.y - 5);
        let melhor = null;
        for (const a of areias) {
          const hit = ray.intersectObject(a, true).find((h) => h.object.isMesh);
          if (hit && (!melhor || hit.point.y > melhor)) melhor = hit.point.y;
        }
        if (melhor === null) continue;
        yMin = Math.min(yMin, melhor); yMax = Math.max(yMax, melhor);
        if (melhor > NIVEL_MAR) {
          celulasSecas++;
          zSeco0 = Math.min(zSeco0, z); zSeco1 = Math.max(zSeco1, z);
          xSeco0 = Math.min(xSeco0, x); xSeco1 = Math.max(xSeco1, x);
        } else molhada++;
      }
    void alvo;
  }
  const area = celulasSecas * PASSO * PASSO;
  const relevo = Number.isFinite(yMax) && Number.isFinite(yMin) ? yMax - yMin : 0;
  const prof = Number.isFinite(zSeco0) ? zSeco1 - zSeco0 + PASSO : 0;
  const frente = Number.isFinite(xSeco0) ? xSeco1 - xSeco0 + PASSO : 0;
  clausula('B1a', area >= AREA_MIN,
    `areia emersa ${area.toFixed(0)} m² [>= ${AREA_MIN}] em ${areias.length} superfície(s) · frente ${frente.toFixed(0)} m · profundidade ${prof.toFixed(0)} m (nível do mar ${NIVEL_MAR.toFixed(2)} m)`);
  clausula('B1b', prof >= PROF_MIN, `faixa seca com ${prof.toFixed(1)} m de profundidade [>= ${PROF_MIN}]`);
  clausula('B1c', relevo >= RELEVO_MIN, `relevo da areia ${relevo.toFixed(2)} m [>= ${RELEVO_MIN}] — praia plana é plano marrom`);
  clausula('B1d', molhada > 0 && celulasSecas > 0, `a areia CRUZA a linha d'água: ${celulasSecas} célula(s) seca(s) e ${molhada} submersa(s)`);
}

/* ============================ B2 — MARGEM VIVA ============================ */
{
  const reb = doTipo(praia, 'rebentacao').map((e) => e.obj).filter((o) => o.isMesh && o.userData.aguaViva);
  const alvo = reb[0] || null;
  const dedicada = !!alvo && alvo !== oceano;
  let espuma = null, amp = null, avancou = false;
  if (alvo?.material?.uniforms) {
    espuma = alvo.material.uniforms.uEspumaFaixa?.value ?? null;
    amp = alvo.material.uniforms.uAmp?.value ?? null;
    const t0 = alvo.material.uniforms.uTime?.value ?? 0;
    if (typeof g.world.update === 'function') g.world.update(0.5, 0.5);
    avancou = (alvo.material.uniforms.uTime?.value ?? 0) > t0;
  }
  clausula('B2a', dedicada, `lâmina de rebentação dedicada: ${reb.length} (o plano de oceano ${oceano ? `${oceano.geometry.parameters.width}x${oceano.geometry.parameters.height}` : 'ausente'} não conta)`);
  clausula('B2b', espuma !== null && espuma <= 1.2, `espuma de swash uEspumaFaixa=${espuma === null ? 'ausente' : espuma.toFixed(2)} [<= 1,20] — faixa de mar aberto (2,4) não faz quebra na margem`);
  clausula('B2c', amp !== null && amp >= 1.0, `amplitude uAmp=${amp === null ? 'ausente' : amp.toFixed(2)} [>= 1,0] — onda de margem não é lâmina de espelho d'água`);
  clausula('B2d', avancou, `world.update AVANÇA o uTime da rebentação: ${avancou ? 'sim' : 'NÃO (onda congelada)'}`);
}

/* ============================ B3/B4/B5 — ELEMENTOS ============================ */
{
  const coqueiros = doTipo(praia, 'coqueiro');
  const inclinacoes = [];
  for (const c of coqueiros) {
    let copa = null;
    c.obj.traverse((o) => { if (!copa && o.userData?.praiaParte === 'copa') copa = o; });
    if (!copa) continue;
    const base = c.obj.getWorldPosition(new THREE.Vector3());
    const alto = copa.getWorldPosition(new THREE.Vector3());
    const dh = Math.hypot(alto.x - base.x, alto.z - base.z), dv = Math.max(0.01, alto.y - base.y);
    inclinacoes.push(THREE.MathUtils.radToDeg(Math.atan2(dh, dv)));
  }
  const inclinados = inclinacoes.filter((a) => a >= COQ_INCLIN_MIN).length;
  clausula('B3', coqueiros.length >= COQ_MIN && inclinados >= COQ_MIN,
    `${coqueiros.length} coqueiro(s) [>= ${COQ_MIN}], ${inclinados} com inclinação >= ${COQ_INCLIN_MIN}° (mediana ${inclinacoes.length ? mediana(inclinacoes).toFixed(1) : '-'}°)`);

  const barracas = doTipo(praia, 'barraca');
  const partes = barracas.map((b) => {
    const tipos = new Set();
    b.obj.traverse((o) => { if (o.userData?.praiaParte) tipos.add(o.userData.praiaParte); });
    return tipos.size;
  });
  clausula('B4', barracas.length >= 1 && Math.max(0, ...partes) >= BARRACA_PARTES,
    `${barracas.length} barraca(s), melhor com ${Math.max(0, ...partes)} tipo(s) de peça [>= ${BARRACA_PARTES}]`);

  const frescobol = doTipo(praia, 'frescobol');
  const trisPorSilhueta = frescobol.map((f) => contaTris(f.obj).tris);
  clausula('B5', frescobol.length >= FRESCOBOL_MIN && trisPorSilhueta.every((t) => t <= FRESCOBOL_TRIS),
    `${frescobol.length} silhueta(s) de frescobol [>= ${FRESCOBOL_MIN}] · maior ${Math.max(0, ...trisPorSilhueta)} tris [<= ${FRESCOBOL_TRIS}]`);
}

/* ============================ B6 — A PRAIA NÃO ENTRA NO JOGO ============================ */
{
  const B = g.world.bounds;
  const occ = new Set(g.world.occluders || []);
  const invasores = [], balas = [];
  for (const { obj, tipo } of [...praia, ...horizonte]) {
    if (obj.visible === false) continue;
    const cx = new THREE.Box3().setFromObject(obj);
    if (!cx.isEmpty() && cx.max.z > B.minZ && cx.min.z < B.maxZ && cx.max.x > B.minX && cx.min.x < B.maxX)
      invasores.push(`${tipo}@(${obj.position.x.toFixed(1)},${obj.position.z.toFixed(1)})`);
    obj.traverse((o) => { if (occ.has(o)) balas.push(tipo); });
  }
  clausula('B6a', invasores.length === 0,
    `${invasores.length} peça(s) de cenário dentro dos bounds jogáveis${invasores.length ? `: ${invasores.slice(0, 4).join(', ')}` : ''} — praia é vista, não arena`);
  clausula('B6b', balas.length === 0, `${balas.length} peça(s) de praia/horizonte em world.occluders — a bala pararia no cenário`);
}

/* ============================ B7 — ORÇAMENTO ============================ */
{
  let malhas = 0, tris = 0;
  const vistos = new Set();
  for (const { obj } of [...praia, ...horizonte]) {
    if (vistos.has(obj)) continue;
    vistos.add(obj);
    const c = contaTris(obj);
    malhas += c.malhas; tris += c.tris;
  }
  clausula('B7', malhas <= TETO_MALHAS && tris <= TETO_TRIS,
    `praia + horizonte custam ${malhas} malha(s) [<= ${TETO_MALHAS}] e ${tris} triângulo(s) [<= ${TETO_TRIS}]`);
}

/* ============================ H1/H2/H3 — HORIZONTE ============================ */
{
  const morros = doTipo(horizonte, 'morro');
  const ilhas = doTipo(horizonte, 'ilha');
  const brumas = doTipo(horizonte, 'bruma');
  const dists = [...morros, ...ilhas].map((e) => {
    const p = e.obj.getWorldPosition(new THREE.Vector3());
    return Math.hypot(p.x, p.z);
  });
  const dentroDoAlcance = dists.filter((d) => d >= ALCANCE[0] && d <= ALCANCE[1]).length;
  const razao = dists.length >= 2 ? Math.max(...dists) / Math.max(1, Math.min(...dists)) : 1;
  clausula('H1a', morros.length >= MORROS_MIN && ilhas.length >= 1 && brumas.length >= 1,
    `${morros.length} morro(s) [>= ${MORROS_MIN}] · ${ilhas.length} ilha(s) [>= 1] · ${brumas.length} bruma(s) [>= 1]`);
  clausula('H1b', dists.length > 0 && dentroDoAlcance === dists.length,
    `${dentroDoAlcance}/${dists.length} relevo(s) em [${ALCANCE[0]}, ${ALCANCE[1]}] m (far da câmera = 400)${dists.length ? ` · ${Math.min(...dists).toFixed(0)}–${Math.max(...dists).toFixed(0)} m` : ''}`);
  clausula('H1c', razao >= CAMADAS_RAZAO,
    `razão entre a camada mais longe e a mais perto ${razao.toFixed(2)} [>= ${CAMADAS_RAZAO}] — uma camada só é recorte de papel`);

  const fora = [];
  for (const e of [...morros, ...ilhas, ...brumas]) {
    const p = e.obj.getWorldPosition(new THREE.Vector3());
    if (e.tipo === 'bruma') continue;   // a bruma é anel/faixa, não tem azimute único
    const az = Math.atan2(p.z, p.x);
    if (az < SETOR_LIMPO[0] || az > SETOR_LIMPO[1]) fora.push(`${e.tipo}@${az.toFixed(2)}rad`);
  }
  clausula('H2', fora.length === 0,
    `${fora.length} peça(s) no setor em que o sky_joa.webp já tem terra assada${fora.length ? `: ${fora.slice(0, 4).join(', ')}` : ''} (mar aberto = azimute ${SETOR_LIMPO[0]} .. ${SETOR_LIMPO[1]} rad)`);

  const decl = LOOK.mansao?.horizonte3d || null;
  const declMorros = decl?.morros?.length || 0, declIlhas = decl?.ilhas?.length || 0;
  clausula('H3', !!decl && declMorros === morros.length && declIlhas === ilhas.length,
    decl ? `LOOK.mansao.horizonte3d declara ${declMorros} morro(s)/${declIlhas} ilha(s); a CENA tem ${morros.length}/${ilhas.length}`
      : 'LOOK.mansao.horizonte3d ausente — o horizonte não nasce do look, então nenhum outro mapa herda o mecanismo');
}

/* ---------------- utilitários ---------------- */
function contaTris(obj) {
  let malhas = 0, tris = 0;
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    malhas++;
    const n = (o.geometry.index?.count || o.geometry.attributes.position?.count || 0) / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
  });
  return { malhas, tris: Math.round(tris) };
}
function mediana(v) { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }

/* ---------------- placar ---------------- */
console.log(`PRAIA E HORIZONTE DO JOÁ${MUT ? `  [mutante: ${MUT}]` : ''}\n`);
for (const l of linhas) console.log(`  ${l}`);

if (MUT) {
  if (falhas.length) { console.log(`\nPRAIA ok · mutante '${MUT}' reprovado como esperado (${falhas.length} cláusula(s) vermelha(s))`); process.exit(0); }
  console.log(`\nPRAIA VERMELHA · mutante '${MUT}' passou — a régua NÃO morde`);
  process.exit(1);
}
if (falhas.length) {
  console.log(`\nPRAIA VERMELHA · ${falhas.length} cláusula(s) — o Joá ainda é deck + mar decorativo`);
  process.exit(1);
}
console.log('\nPRAIA ok · areia andável emersa, margem viva, coqueiros inclinados e horizonte em camadas');
