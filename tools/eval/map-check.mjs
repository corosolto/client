/* ============================================================================
   map-check.mjs — A RÉGUA DOS 4 DEFEITOS DE MAPA QUE O DONO RELATOU.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O dono jogou e disse, com estas palavras:
     "os jogadores estão SUBMERSOS EMBAIXO DA ESTÁTUA"          -> MAP1
     "o RESPAWN DE DENTRO DA LOJA tinha q ser no ANDAR DE CIMA"  -> MAP2
     "e o RESPAWN É VISÍVEL DE FORA"                             -> MAP2
     "a ESCADA tinha q ser MELHOR FEITA"                         -> MAP3
     "os bots da loja ficam todos NA BANDEIRA DO MEIO"           -> CTF1
   Nenhuma dessas frases é gosto: as cinco são propriedades geométricas do mundo
   que dá pra MEDIR sem abrir o jogo. Enquanto ninguém mediu, cada rodada
   "consertava" uma e a régua era o olho de quem consertou.

   O QUE ELE MEDE (tudo no MUNDO REAL do jogo: mapas reais, Game real, node puro)
     MAP1  corpo dentro de sólido — sonda vertical em TODO spawn e numa amostra de
           TODO chão alcançável: se existir geometria VISÍVEL do mapa cujo topo
           passe de 0,30 m acima do chão local naquele ponto, o corpo do jogador
           está DENTRO dela (0,30 m é o degrau que o corpo sobe: acima disso não é
           "passar por cima", é "estar dentro"). Instrumento = raycast contra
           `world.root`, então batch/merge não engana (o raycast vê a malha mesclada
           igual) e collide:false não esconde nada — é justamente o caso do pedestal.
     MAP2  andar do respawn + exposição: altura do chão em cada ponto de spawn, e a
           fração dos pontos andáveis A ≥ 25 m que enxergam a CABEÇA de quem acabou
           de nascer, medida com o `_losClear` DO JOGO (game.js:4461) — a mesma
           função que decide se o bot atira em você.
     MAP3  escada: perfil REAL medido por raycast na linha de centro (espelho, piso,
           largura, inclinação, Blondel 2h+p) contra a faixa de escada de verdade
           (NBR 9077: espelho 16-18 cm, piso 25-32 cm, 2h+p 63-65 cm, largura ≥ 1,20 m)
           + travessia: o grafo de navegação e o flood-fill de andabilidade têm que
           SUBIR por ela (A* do spawn até o mezanino e células alcançadas lá em cima).
     CTF1  bandeiras: colinearidade (altura mínima do triângulo), distância até o
           spawn mais próximo e maior linha de tiro limpa até a bandeira.

   Uso:  node tools/eval/map-check.mjs [mapId|all]     (escreve map_check.json)
         node tools/eval/map-check.mjs <mapId> --mutante=rota-unica
   ============================================================================ */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ONLY = process.argv[2] || 'all';
// O nome antigo fica como alias porque já aparece em comandos de auditoria registrados.
const MUTANTE_SUPERFICIE_SOLIDA = process.argv.includes('--mutante=superficie-solida') ||
  process.argv.includes('--mutante=agua-solida');
const MUTANTE_SEM_GUARDA_ANDAR = process.argv.includes('--mutante=sem-guarda-andar');
const MUTANTE_DESVIO_ESCADA = process.argv.includes('--mutante=desvio-escada');
const MUTANTE_TRAVESSIA = process.argv.includes('--mutante=travessia-falsa');
const MUTANTE_ROTA_UNICA = process.argv.includes('--mutante=rota-unica');
/* MUTANTE penetracao-injetada: prova que a sonda do MAP1 mede MAGNITUDE, não só presença,
   e que `nonSolidSurface` não virou passe livre — o bloco injetado NÃO leva a marca. */
const MUTANTE_PENETRACAO = process.argv.includes('--mutante=penetracao-injetada');
const PEN_INJETADA = 0.90;   // acima do degrau (0,30) e abaixo do peito (1,40): "dentro", não "submerso"
const SEED = 12345;

/* ---- constantes de corpo/andabilidade: as MESMAS do pickup-check.mjs, e pelo mesmo
   motivo (são as do jogo: `_collide` usa raio 0,38; o degrau que o corpo sobe é 0,30). */
const STEP_G = 0.25;     // passo da grade de andabilidade
const R_BODY = 0.38;     // raio do corpo
const DEGRAU = 0.30;     // desnível que se sobe andando
const OLHO = 1.62;       // altura do olho (game.js: `const eye = 1.62 - ...`)
const PEITO = 1.40;      // altura do peito — acima disto o jogador está SUBMERSO, não "com o pé dentro"
const CEL_NIVEL_MIN = Math.ceil(Math.PI * R_BODY * R_BODY / (STEP_G * STEP_G));

/* ---- MAP2: o que conta como "de fora" e o teto de exposição.
   25 m é a distância em que uma AWP/M400 mata em 1 tiro sem o alvo ter tempo de reagir
   (o TTK medido do bot é 3,6 s a média, mas o tiro de sniper é instantâneo). Um respawn
   que é enxergado de ≥ 25 m por metade do mapa é o "respawn visível de fora" do dono. */
const D_FORA = 25;
const PASSO_OBS = 2.0;   // grade de observadores (m) — 1 obs a cada 2 m de chão andável

/* ---- MAP3: faixa de ESCADA DE VERDADE (NBR 9077 / Blondel). Não é opinião: é a norma
   brasileira de escada fixa de uso coletivo, que é o que um mezanino de loja tem. */
const ESPELHO = [0.16, 0.19];   // altura do degrau
const PISO_D  = [0.25, 0.32];   // profundidade do degrau
const BLONDEL = [0.62, 0.66];   // 2·espelho + piso
const LARG_MIN = 1.20;          // largura mínima
const INCLIN = [25, 40];        // inclinação em GRAUS (o código antigo dizia "30 a 40%", que é rampa)

/* ---- MAP2B: "o respawn é um LUGAR, não uma fresta".
   POR QUE EXISTE (regressão de 08/2026, relatada pelo dono): o depósito do loja_h foi
   construído com uma chicana-parede de 19 m a 1,80 m da parede de portas, e os 4 spawns
   ficaram numa faixa de 2,6 m de profundidade — a MAP2 (exposição) ficou 0,0%, VERDE, e a
   experiência ficou péssima. Exposição zero é fácil: basta emparedar. O que faltava era a
   régua do OUTRO lado — o respawn tem que caber gente.
     folgaParede  = distância horizontal do ponto de spawn até a superfície sólida mais
                    próxima (32 direções, na altura do peito). Na fresta media 0,45 m: o
                    corpo tem 0,38 m de raio, ou seja, o jogador nascia ENCOSTADO.
     areaSpawn    = área andável CONTÍGUA (flood-fill a partir do próprio spawn, então
                    parede do outro lado não conta) dentro de um raio de 5 m. O teto
                    geométrico é π·5² = 78,5 m².
   Os dois tetos são derivados do corpo, não de gosto: 1,20 m de folga = 0,38 de raio +
   0,82 de passo lateral (uma esquiva); 40 m² = pouco mais da METADE do disco de 5 m, que é
   o mínimo pra 4 pessoas nascerem juntas e se espalharem sem se empurrar. */
const R_SPAWN = 5.0;            // raio do disco em que a área contígua do respawn é medida
const FOLGA_MIN = 1.20;         // folga mínima até a parede mais próxima
const AREA_MIN = 40;            // m² de chão contíguo dentro do disco

/* ---- MAP4: "atira e a marca fica no ar, como se tivesse uma parede invisível".
   O que a BALA bate é `world.occluders` (game.js:2611, raycast NÃO-recursivo). Quando um
   occluder é uma CAIXA DE PROCURAÇÃO invisível (o truque legítimo pra dar corpo de bala a
   um GLB que é Group) e essa caixa é MAIOR que a massa visível que ela representa, a bala
   para onde não há nada desenhado — e o decal de impacto fica boiando. É medível: pra cada
   ponto amostrado na SUPERFÍCIE do occluder, existe malha VISÍVEL a menos de TOL_MALHA?
   TOLERÂNCIA DECLARADA: 0,35 m. Não é zero de propósito — uma caixa de procuração tem que
   poder envolver folgadamente a silhueta do modelo (senão a bala passa raspando pela quina
   de um GLB e não acerta nada). 0,35 m é menor que o raio do corpo (0,38): uma folga que o
   jogador não consegue ocupar não é "parede invisível", é margem de colisão.
   LIMITE CONHECIDO: em node nenhum GLB carrega, então as caixas de procuração de GLB são
   PULADAS (marcadas com `userData.proxyGLB`) e o número de pulos é reportado. */
const TOL_MALHA = 0.35;         // folga aceita entre a superfície do occluder e a malha visível
const PASSO_MALHA = 0.5;        // grade de amostragem na superfície do occluder (m)
const FRAC_MALHA = 0.10;        // reprova acima de 10% da superfície lateral sem malha visível

/* ---- MAP5 / CTF2: "a loja fica vazia dos cantos" e "os bots ficam todos no meio".
   MAP5  densidade de PROP e de WAYPOINT por quadrante (grade 4×4 sobre os bounds do mapa),
         normalizada pela área ANDÁVEL do quadrante — quadrante sem chão não conta. O teto é
         relativo à MEDIANA dos quadrantes do próprio mapa: um mapa não é obrigado a ser
         uniforme, mas nenhum pedaço jogável pode ser um deserto comparado ao resto dele.
   CTF2  rotas SEPARADAS entre cada spawn e cada bandeira: acha o caminho mais curto no
         grafo, APAGA tudo que está a menos de SEP_ROTA do traçado dele e procura outro. É
         o número de caminhos que um bot pode tomar sem esbarrar no bando — contar caminhos
         "vértice-disjuntos" não serviria: num grafo de 3,4 m de passo, duas fitas dentro do
         MESMO corredor já são disjuntas e o número não diria nada sobre convergir no meio. */
const QUAD_N = 4;               // grade QUAD_N × QUAD_N
const QUAD_MIN_AND = 40;        // m² de chão andável pra um quadrante entrar na conta
/* DOIS critérios, e o segundo é o que tem dente. O dono enunciou o primeiro ("densidade
   abaixo de X do MEDIANO") e ele sozinho NÃO mede o que ele quer: encher os cantos sobe a
   mediana junto, então a razão min/mediana fica parada. Medido no loja_h: antes 0,67×,
   depois 0,68× — enquanto a densidade ABSOLUTA do pior quadrante subia 1,63 -> 2,57 peças
   por 100 m² (+58%). A razão fica como rede de segurança (pega o mapa onde UM pedaço é
   deserto e o resto é entulhado); quem cobra o povoamento é o espaçamento absoluto.
   DE ONDE VEM O 7,0 m: com densidade d peças por 100 m², o espaçamento médio entre peças de
   cobertura é √(100/d). 7,0 m são DUAS ARESTAS do grafo de navegação do jogo (STEP = 3,4 m):
   acima disso um bot atravessa o quadrante percorrendo duas arestas inteiras sem ter uma
   peça de cobertura ao alcance — que é, em número, "o mapa fica vazio" do dono. */
const QUAD_FRAC = 0.35;         // densidade mínima = 35% da mediana dos quadrantes do mapa
const QUAD_ESPAC = 7.0;         // espaçamento médio máximo entre props do quadrante (m)
const SEP_ROTA = 6.0;           // m de afastamento pra duas rotas contarem como rotas diferentes

/* ---- MAP6: borda de andar alto não pode despejar o jogador sob a laje.
   Caso real (screenshot do dono, 09/08/2026): no mirante do escadao, a câmera apareceu
   sob o piso vendo bots, pickups e caixas suspensos. A causa imediata era a câmera de morte
   descendo até y global 0,5; a geometria também tinha bordas com queda de 14,28 m sem guarda.
   A régua irmã mede a geometria: toda transição alcançável com queda >= 2 m precisa empurrar
   o corpo na altura do piso superior. Dois metros vêm do próprio corpo jogável (olho 1,62 m):
   acima disso não é degrau nem queda tática, é passagem para o avesso da camada.
   `--mutante=sem-guarda-andar` ignora os colliders e prova que a sonda encontra as bordas. */
const QUEDA_ANDAR = 2.0;

const textures = initTextures();
const MAPAS_NOVOS = ['escadao', 'campomorro', 'lajes', 'corrego', 'mansao', 'sitio'];
const MAP_IDS = ONLY === 'all' ? Object.keys(MAPS) : ONLY === 'novos' ? MAPAS_NOVOS : [ONLY];
const down = new THREE.Vector3(0, -1, 0);

const mapas = [];
for (const mapId of MAP_IDS) {
  let g = null;
  try {
    // ctf:true = as bandeiras que o jogo REALMENTE usa (mapa sem ctfPoints cai no layout
    // padrão do game.js). As malhas de CTF vão pra `scene`, não pro `world.root`, então a
    // sonda vertical do MAP1 não as enxerga — de propósito: bandeira não é chão.
    g = bootGame(mapId, { textures, ctf: true, seed: SEED });
  } catch (e) { mapas.push({ map: mapId, err: e.message }); continue; }

  const W = g.world;
  /* MATRIZES DE MUNDO: sem render ninguém chama updateMatrixWorld, e o Raycaster do three
     NÃO atualiza sozinho — ele assume matrizes prontas. Sem esta linha o raio testa cada
     malha na posição LOCAL dela: a primeira versão desta régua acusou 16 pontos "dentro de
     sólido" em (±0,5, −3,5..3,5) no havan que eram, na verdade, os ÔNIBUS de (±28, 50)
     testados na origem — e o `_losClear` (que também é raycast, contra `occluders`) dava
     linha de tiro 0 m nas bandeiras MID e B pelo mesmo motivo. Número de instrumento
     quebrado é pior que número nenhum. */
  g.scene.updateMatrixWorld(true);
  W.root.updateMatrixWorld(true);
  const gh = typeof W.groundHeightAt === 'function' ? W.groundHeightAt : () => 0;
  /* MUTANTE penetracao-injetada — a régua tem que DISTINGUIR "penetração de 1,384 m" de
     zero, senão ela não presta. Injeta no 1º spawn de cada time o caso do dono em
     laboratório: um bloco VISÍVEL, SEM colisor (o pedestal do `collide:false`) e SEM a
     marca `nonSolidSurface`, com o topo exatamente a PEN_INJETADA acima do chão local.
     Se o MAP1 não devolver essa penetração em TODO mapa, a sonda não mede magnitude. */
  if (MUTANTE_PENETRACAO) {
    for (const ss of Object.values(W.spawns || {})) {
      const s = ss && ss[0]; if (!s) continue;
      const cubo = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6),
        new THREE.MeshBasicMaterial({ color: 0xff00ff }));
      cubo.position.set(s.x, gh(s.x, s.z) + PEN_INJETADA - 0.3, s.z);
      W.root.add(cubo);
    }
    W.root.updateMatrixWorld(true);
  }
  const B = W.bounds;
  const ray = new THREE.Raycaster();
  ray.camera = g.camera;   // sprites (fumaça/ícone) precisam de câmera pra raycast — ver filtro abaixo
  /* SÓLIDO = malha. Sprite/linha/ponto são billboard e decal: um raio que "encosta" num
     sprite de poeira não significa que o corpo do jogador está dentro de coisa nenhuma.
     Sem este filtro o praca_poderes derruba o arnês (Sprite.raycast exige câmera) e, pior,
     contaria fumaça como chão. */
  // Água, manchas e folhagem de superfície continuam em `root` para descarte do mapa, mas
  // não podem virar teto na sonda vertical. O mutante reativa todas as superfícies marcadas:
  // `node tools/eval/map-check.mjs <mapa> --mutante=superficie-solida` deve reprovar.
  const solido = (h) => h.object && h.object.isMesh && !h.object.isSprite &&
    (MUTANTE_SUPERFICIE_SOLIDA || !h.object.userData?.nonSolidSurface);
  const primeiroSolido = (hits) => { for (const h of hits) if (solido(h)) return h; return null; };

  /* ================= grade de andabilidade (idêntica à do pickup-check) ================= */
  const nGx = Math.ceil((B.maxX - B.minX) / STEP_G) + 1;
  const nGz = Math.ceil((B.maxZ - B.minZ) / STEP_G) + 1;
  const GX = (i) => B.minX + i * STEP_G, GZ = (j) => B.minZ + j * STEP_G;
  const gid = (i, j) => i * nGz + j;
  const andavelCache = new Int8Array(nGx * nGz).fill(-1);
  const andavel = (i, j) => {
    if (i < 0 || j < 0 || i >= nGx || j >= nGz) return false;
    const k = gid(i, j);
    if (andavelCache[k] < 0) {
      const x = GX(i), z = GZ(j), p = { x, y: gh(x, z), z };
      if (MUTANTE_SEM_GUARDA_ANDAR) andavelCache[k] = 1;
      else {
        g._collide(p, R_BODY);
        andavelCache[k] = (Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6) ? 1 : 0;
      }
    }
    return andavelCache[k] === 1;
  };
  const alturaCache = new Float32Array(nGx * nGz).fill(NaN);
  const altura = (i, j) => {
    const k = gid(i, j);
    if (Number.isNaN(alturaCache[k])) alturaCache[k] = gh(GX(i), GZ(j));
    return alturaCache[k];
  };
  const alcancado = new Uint8Array(nGx * nGz);
  {
    const fila = [];
    for (const s of Object.values(W.spawns || {}).flat()) {
      let i = Math.round((s.x - B.minX) / STEP_G), j = Math.round((s.z - B.minZ) / STEP_G);
      let ok = andavel(i, j);
      for (let rad = 1; rad <= 8 && !ok; rad++)
        for (let di = -rad; di <= rad && !ok; di++)
          for (let dj = -rad; dj <= rad && !ok; dj++) {
            if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
            if (andavel(i + di, j + dj)) { i += di; j += dj; ok = true; }
          }
      if (!ok) continue;
      if (!alcancado[gid(i, j)]) { alcancado[gid(i, j)] = 1; fila.push(i, j); }
    }
    for (let h = 0; h < fila.length; h += 2) {
      const i = fila[h], j = fila[h + 1], y0 = altura(i, j);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= nGx || b >= nGz) continue;
        const k = gid(a, b);
        if (alcancado[k] || !andavel(a, b)) continue;
        if (Math.abs(altura(a, b) - y0) > DEGRAU) continue;
        alcancado[k] = 1; fila.push(a, b);
      }
    }
  }
  const celulasAlcancadas = alcancado.reduce((a, v) => a + v, 0);

  /* ================= MAP6 — borda alta sem guarda ================= */
  const bordasSemGuarda = [];
  for (let i = 0; i < nGx; i++) for (let j = 0; j < nGz; j++) {
    if (!alcancado[gid(i, j)]) continue;
    const y0 = altura(i, j);
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      const a = i + di, b = j + dj;
      if (a >= nGx || b >= nGz) continue;
      const y1 = altura(a, b), queda = Math.abs(y1 - y0);
      if (queda < QUEDA_ANDAR) continue;
      const altoI = y0 >= y1 ? i : a, altoJ = y0 >= y1 ? j : b;
      if (!alcancado[gid(altoI, altoJ)]) continue;
      const baixoI = y0 >= y1 ? a : i, baixoJ = y0 >= y1 ? b : j;
      const x = GX(baixoI), z = GZ(baixoJ), p = { x, y: Math.max(y0, y1), z };
      if (!MUTANTE_SEM_GUARDA_ANDAR) g._collide(p, R_BODY);
      if (Math.hypot(p.x - x, p.z - z) <= 0.02 && bordasSemGuarda.length < 64)
        bordasSemGuarda.push({ x: +GX(altoI).toFixed(2), z: +GZ(altoJ).toFixed(2), queda: +queda.toFixed(2) });
    }
  }

  /* ================= MAP1 — corpo dentro de sólido =================
     Sonda VERTICAL: um raio que sai da altura do peito e desce até o chão local. Se ele
     encosta em qualquer coisa acima de `chão + 0,30 m`, o corpo do jogador está DENTRO
     de geometria visível naquele ponto — que é exatamente o "submerso embaixo da estátua".
     Por que raycast e não a lista de colliders: o defeito É a caixa SEM collider
     (`collide:false`), então uma régua que só olha colliders é cega pra ele por construção.
     Por que `world.root` e não `scene`: root é a geometria do MAPA; bandeira, arma largada
     e boneco vivo não são chão e não podem contaminar a medida. */
  const sonda = (x, z) => {
    const chao = gh(x, z);
    ray.set(new THREE.Vector3(x, chao + PEITO, z), down);
    ray.far = PEITO - 0.01;   // -0,01: não conta o PRÓPRIO piso em que se está de pé
    const h0 = primeiroSolido(ray.intersectObject(W.root, true));
    if (!h0) return { topo: null, pen: 0 };
    const topo = h0.point.y;                           // raio pra baixo: o 1º sólido é o mais alto
    return { topo, pen: Math.max(0, topo - chao) };
  };
  const dentro = [];   // pontos com corpo dentro de sólido
  const registra = (x, z, tipo) => {
    const s = sonda(x, z);
    if (s.pen > DEGRAU) dentro.push({ tipo, x: +x.toFixed(2), z: +z.toFixed(2), pen: +s.pen.toFixed(3) });
    return s.pen;
  };
  const spawnsInfo = [];
  for (const [team, ss] of Object.entries(W.spawns || {}))
    for (const s of ss) {
      const pen = registra(s.x, s.z, `spawn ${team}`);
      spawnsInfo.push({ team, x: s.x, z: s.z, chao: +gh(s.x, s.z).toFixed(2), penetracao: +pen.toFixed(3) });
    }
  /* amostra do chão andável: 1 sonda a cada 1 m (4 células). Sondar as ~80 mil células
     custaria ~80 mil raycasts por mapa; 1 m é menor que o corpo (0,76 m de diâmetro), então
     nenhum sólido em que o jogador CABE passa entre duas amostras. */
  let amostras = 0;
  for (let i = 0; i < nGx; i += 4) for (let j = 0; j < nGz; j += 4) {
    if (!alcancado[gid(i, j)]) continue;
    amostras++; registra(GX(i), GZ(j), 'chao');
  }
  const piorPen = dentro.length ? Math.max(...dentro.map((d) => d.pen)) : 0;
  const submersos = dentro.filter((d) => d.pen >= PEITO).length;   // corpo INTEIRO dentro

  /* ================= MAP2 — andar do respawn + exposição =================
     `_losClear` é a função DO JOGO que decide se um bot enxerga (e portanto atira). Usar a
     mesma função é o ponto: se o respawn passa aqui, o bot não te vê nascer. */
  const observadores = [];
  {
    const passo = Math.max(1, Math.round(PASSO_OBS / STEP_G));
    for (let i = 0; i < nGx; i += passo) for (let j = 0; j < nGz; j += passo)
      if (alcancado[gid(i, j)]) observadores.push({ x: GX(i), z: GZ(j), y: altura(i, j) + OLHO });
  }
  const exposicao = [];
  for (const [team, ss] of Object.entries(W.spawns || {})) {
    for (const s of ss) {
      const alvo = new THREE.Vector3(s.x, gh(s.x, s.z) + OLHO, s.z);
      let longe = 0, vendo = 0, maiorVisada = 0;
      for (const o of observadores) {
        const d = Math.hypot(o.x - s.x, o.z - s.z);
        if (d < D_FORA) continue;
        longe++;
        if (g._losClear(new THREE.Vector3(o.x, o.y, o.z), alvo.clone())) { vendo++; maiorVisada = Math.max(maiorVisada, d); }
      }
      exposicao.push({
        team, x: s.x, z: s.z, chao: +gh(s.x, s.z).toFixed(2),
        obsLonge: longe, obsVendo: vendo,
        frac: longe ? +(vendo / longe).toFixed(4) : 0,
        maiorVisada: +maiorVisada.toFixed(1),
      });
    }
  }
  const porTime = {};
  for (const e of exposicao) {
    const t = (porTime[e.team] ||= { team: e.team, chao: e.chao, chaoMin: e.chao, chaoMax: e.chao, frac: 0, maiorVisada: 0, n: 0 });
    t.chaoMin = Math.min(t.chaoMin, e.chao); t.chaoMax = Math.max(t.chaoMax, e.chao);
    t.frac += e.frac; t.maiorVisada = Math.max(t.maiorVisada, e.maiorVisada); t.n++;
  }
  const expTime = Object.values(porTime).map((t) => ({
    team: t.team, chaoMin: t.chaoMin, chaoMax: t.chaoMax,
    fracMedia: +(t.frac / t.n).toFixed(4), maiorVisada: +t.maiorVisada.toFixed(1),
  }));

  /* ================= MAP3 — a escada =================
     O mapa DECLARA onde a escada está (`world.stairs`); o perfil é MEDIDO na geometria
     construída, por raycast de cima pra baixo na linha de centro a cada 2 cm. Declaração
     errada não passa despercebida: o perfil medido vira degrau nenhum e a régua fica
     vermelha. E o que a régua cobra é a NORMA (espelho/piso/Blondel/largura/inclinação),
     não o número que o autor da escada escolheu. */
  const escadas = [];
  for (const st of (W.stairs || [])) {
    const cx = (st.x0 + st.x1) / 2;
    const z0 = Math.min(st.z0, st.z1), z1 = Math.max(st.z0, st.z1);
    /* O raio da sondagem sai de `yRef + 0,45` e desce 0,90 m — uma JANELA em volta da altura
       de referência, não um raio do céu. Duas razões, as duas medidas: (1) de cima o primeiro
       sólido é o TELHADO da loja (a 1ª versão desta régua mediu o telhado e reportou "0
       degraus, desvio 4,5 m"); (2) de baixo demais o primeiro sólido é o CORRIMÃO. A janela de
       ±0,45 m em volta do chão andável isola a superfície em que se PISA — e se a geometria
       da escada divergir do chão andável em mais de 0,45 m o perfil some e a MAP3 fica
       vermelha, que é o comportamento certo (foi esse desencontro que fez o jogador "subir
       23 cm acima dos degraus" na versão anterior). */
    const topoRaio = (x, z, yRef) => {
      const y0 = (yRef === undefined ? gh(x, z) : yRef) + 0.45;
      ray.set(new THREE.Vector3(x, y0, z), down);
      ray.far = 0.90;
      const h = primeiroSolido(ray.intersectObject(W.root, true));
      return h ? h.point.y : null;
    };
    // perfil ao longo do eixo de subida (z), na linha de centro
    const perfil = [];
    for (let z = z0 + 0.01; z <= z1; z += 0.02) perfil.push({ z: +z.toFixed(3), y: topoRaio(cx, z) });
    // patamares = trechos consecutivos com a MESMA altura (tolerância 1 cm)
    const flats = [];
    for (const p of perfil) {
      if (p.y === null) { continue; }
      const f = flats[flats.length - 1];
      if (f && Math.abs(f.y - p.y) <= 0.01) { f.z1 = p.z; f.n++; }
      else flats.push({ y: p.y, z0: p.z, z1: p.z, n: 1 });
    }
    const uteis = flats.filter((f) => f.z1 - f.z0 >= 0.03);   // ruído de raycast na quina não é degrau
    const espelhos = [], pisos = [];
    for (let i = 1; i < uteis.length; i++) {
      const dh = Math.abs(uteis[i].y - uteis[i - 1].y);
      if (dh > 0.005) espelhos.push(+dh.toFixed(4));
    }
    for (const f of uteis) pisos.push(+(f.z1 - f.z0 + 0.02).toFixed(3));
    // largura: varre x no meio de um degrau do miolo e mede a faixa contígua na MESMA altura
    let largura = 0;
    if (uteis.length > 2) {
      const meio = uteis[Math.floor(uteis.length / 2)];
      const zm = (meio.z0 + meio.z1) / 2;
      for (let x = st.x0 - 2; x <= st.x1 + 2; x += 0.05) {
        const y = topoRaio(x, zm, meio.y);   // referência = a altura do degrau, não o chão fora dele
        if (y !== null && Math.abs(y - meio.y) <= 0.02) largura += 0.05;
      }
    }
    const subida = uteis.length ? Math.abs(uteis[uteis.length - 1].y - uteis[0].y) : 0;
    const corrida = uteis.length ? Math.abs(uteis[uteis.length - 1].z0 - uteis[0].z1) : 0;
    const incl = corrida > 0 ? +(Math.atan2(subida, corrida) * 180 / Math.PI).toFixed(2) : 0;
    const med = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(4) : 0);
    const eMed = med(espelhos), pMed = med(pisos.slice(1, -1));   // 1º e último são patamar
    // desvio entre o chão ANDÁVEL (groundHeightAt) e o topo do degrau em que se pisa:
    // é a divergência que fez o jogador "escalar parede invisível" na versão anterior
    let desvio = 0;
    for (const f of uteis) {
      const zm = (f.z0 + f.z1) / 2;
      const chaoAndavel = gh(cx, zm) + (MUTANTE_DESVIO_ESCADA ? 0.20 : 0);
      desvio = Math.max(desvio, Math.abs(chaoAndavel - f.y));
    }
    escadas.push({
      nome: st.nome || 'escada', x0: st.x0, x1: st.x1, z0, z1,
      degraus: Math.max(0, uteis.length - 1),
      espelhoMed: eMed, espelhoMin: espelhos.length ? Math.min(...espelhos) : 0, espelhoMax: espelhos.length ? Math.max(...espelhos) : 0,
      pisoMed: pMed, larguraMedida: +largura.toFixed(2),
      subida: +subida.toFixed(3), corrida: +corrida.toFixed(3), inclinacaoGraus: incl,
      blondel: +(2 * eMed + pMed).toFixed(3),
      desvioChaoDegrau: +desvio.toFixed(3),
      okEspelho: eMed >= ESPELHO[0] && eMed <= ESPELHO[1],
      okPiso: pMed >= PISO_D[0] && pMed <= PISO_D[1],
      okBlondel: 2 * eMed + pMed >= BLONDEL[0] && 2 * eMed + pMed <= BLONDEL[1],
      okLargura: largura >= LARG_MIN,
      okInclinacao: incl >= INCLIN[0] && incl <= INCLIN[1],
      okDesvio: desvio <= 0.10,
    });
  }
  /* travessia: o andar de cima só existe se dá pra CHEGAR nele — de duas maneiras
     independentes, a pé (flood-fill) e pelo A* dos bots (grafo de waypoints). */
  const niveis = W.levels || null;   // o mapa declara os patamares que precisam ser alcançados
  const travessia = [];
  for (const lv of (niveis || [])) {
    let cel = 0;
    for (let i = 0; i < nGx; i++) for (let j = 0; j < nGz; j++) {
      const x = GX(i), zz = GZ(j);
      if (x < lv.x0 || x > lv.x1 || zz < lv.z0 || zz > lv.z1) continue;
      if (alcancado[gid(i, j)]) cel++;
    }
    // A*: do waypoint mais perto de um spawn até o waypoint mais perto do centro do nível
    let ok = false, nós = 0;
    const alvoX = (lv.x0 + lv.x1) / 2, alvoZ = (lv.z0 + lv.z1) / 2;
    if (W.nearestWaypoint && W.findPath) {
      const nodes = W.waypoints.nodes;
      nós = nodes.filter((n) => n.x >= lv.x0 && n.x <= lv.x1 && n.z >= lv.z0 && n.z <= lv.z1).length;
      const s = (W.spawns[lv.dePartida || 'B'] || W.spawns.B || [])[0];
      if (s) {
        const a = W.nearestWaypoint(s.x, s.z), b = W.nearestWaypoint(alvoX, alvoZ);
        const p = W.findPath(a, b);
        ok = p.length > 0 && p[p.length - 1] === b && b !== a;
      }
    }
    if (MUTANTE_TRAVESSIA && travessia.length === 0) { cel = 0; ok = false; }
    travessia.push({ nivel: lv.nome || 'nivel', celulasAlcancadas: cel, waypointsNoNivel: nós, aEstrelaChega: ok });
  }

  /* ================= MAP2B — o respawn é um LUGAR, não uma fresta =================
     Duas medidas independentes por SLOT de spawn (ver o cabeçalho das constantes):
     folga até a parede mais próxima e área andável contígua num raio de 5 m. */
  const sala = [];
  for (const [team, ss] of Object.entries(W.spawns || {})) {
    for (const s of ss) {
      const y0 = gh(s.x, s.z);
      /* FOLGA: 64 direções na horizontal, na altura do peito. Mede contra a lista de
         COLISORES (não por raycast) porque é o corpo que esbarra, e o corpo esbarra em
         collider — inclusive nos props que só têm collider empurrado à mão. */
      let folga = Infinity, dirPior = 0;
      for (let a = 0; a < 64; a++) {
        const ang = (a / 64) * Math.PI * 2, dx = Math.cos(ang), dz = Math.sin(ang);
        let d = 0;
        for (; d < 12; d += 0.05) {
          const x = s.x + dx * d, z = s.z + dz * d, h = gh(x, z);
          let bate = Math.abs(h - y0) > DEGRAU;   // degrau alto/buraco também é "parede"
          if (!bate) for (const c of W.colliders) {
            if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.minY < y0 + 1.5 && c.maxY > y0 + 0.3) { bate = true; break; }
          }
          if (bate) break;
        }
        if (d < folga) { folga = d; dirPior = +(ang * 180 / Math.PI).toFixed(0); }
      }
      /* ÁREA CONTÍGUA: flood-fill na mesma grade de andabilidade, a partir da célula do
         spawn, limitado ao disco de R_SPAWN. Contígua importa: numa fresta a parede corta o
         disco em dois e o lado de lá NÃO conta (era exatamente o caso do armário partido). */
      let i0 = Math.round((s.x - B.minX) / STEP_G), j0 = Math.round((s.z - B.minZ) / STEP_G);
      let ok0 = andavel(i0, j0);
      for (let rad = 1; rad <= 6 && !ok0; rad++)
        for (let di = -rad; di <= rad && !ok0; di++)
          for (let dj = -rad; dj <= rad && !ok0; dj++) {
            if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
            if (andavel(i0 + di, j0 + dj)) { i0 += di; j0 += dj; ok0 = true; }
          }
      let area = 0;
      if (ok0) {
        const vis = new Set([gid(i0, j0)]); const fila = [i0, j0];
        for (let h = 0; h < fila.length; h += 2) {
          const i = fila[h], j = fila[h + 1]; area++;
          const yh = altura(i, j);
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const a = i + di, b = j + dj, k = gid(a, b);
            if (a < 0 || b < 0 || a >= nGx || b >= nGz || vis.has(k)) continue;
            if (Math.hypot(GX(a) - s.x, GZ(b) - s.z) > R_SPAWN) continue;
            if (!andavel(a, b) || Math.abs(altura(a, b) - yh) > DEGRAU) continue;
            vis.add(k); fila.push(a, b);
          }
        }
      }
      sala.push({ team, x: s.x, z: s.z,
        folgaParede: +folga.toFixed(2), dirPior,
        areaContigua: +(area * STEP_G * STEP_G).toFixed(1),
        okFolga: folga >= FOLGA_MIN, okArea: area * STEP_G * STEP_G >= AREA_MIN });
    }
  }

  /* ================= MAP4 — occluder sem malha visível ("marca do tiro no ar") =================
     Amostra a SUPERFÍCIE REAL do occluder (triângulo a triângulo, densidade proporcional à
     área), não o AABB dele: a 1ª versão desta régua usava as faces do AABB e acusou os CONES
     do praca_old em 96% — a pirâmide não preenche a caixa dela, e a régua estava medindo a
     caixa. Instrumento errado dá número errado com a mesma confiança do certo.
     Só faces LATERAIS (|n·y| < 0,7): é o que a bala do duelo encontra; topo e base de caixa
     apoiada no chão não produzem "marca no ar". */
  const semMalha = [];
  let occPulados = 0, occMedidos = 0, amostrasOcc = 0, amostrasVazias = 0;
  {
    const visivel = (o) => {
      if (!o || !o.isMesh || o.isSprite) return false;
      let p = o; while (p) { if (p.visible === false) return false; p = p.parent; }
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      return ms.some((m) => m && m.visible !== false && (m.transparent !== true || (m.opacity ?? 1) > 0.05));
    };
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nW = new THREE.Vector3(), pW = new THREE.Vector3();
    for (const oc of (W.occluders || [])) {
      /* Group de GLB, InstancedMesh e caixa de PROCURAÇÃO de GLB ficam de fora: ou não têm
         geometria própria, ou representam um modelo que NÃO CARREGA em node (a régua roda
         sem GPU e sem loader). O número de pulos é reportado — é o limite declarado. */
      if (!oc.isMesh || oc.isInstancedMesh || !oc.geometry || (oc.userData && oc.userData.proxyGLB)) { occPulados++; continue; }
      const pos = oc.geometry.attributes && oc.geometry.attributes.position;
      if (!pos) { occPulados++; continue; }
      const idx = oc.geometry.index;
      const nTri = idx ? idx.count / 3 : pos.count / 3;
      occMedidos++;
      let vazias = 0, total = 0, piorAlt = 0, orc = 900;   // teto de amostras por occluder
      for (let t = 0; t < nTri && orc > 0; t++) {
        const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        vA.fromBufferAttribute(pos, i0).applyMatrix4(oc.matrixWorld);
        vB.fromBufferAttribute(pos, i1).applyMatrix4(oc.matrixWorld);
        vC.fromBufferAttribute(pos, i2).applyMatrix4(oc.matrixWorld);
        e1.subVectors(vB, vA); e2.subVectors(vC, vA);
        nW.crossVectors(e1, e2);
        const area = nW.length() / 2;
        if (area < 1e-4) continue;
        nW.normalize();
        if (Math.abs(nW.y) > 0.7) continue;                        // topo/base não é "parede"
        const n = Math.min(orc, Math.max(1, Math.round(area / (PASSO_MALHA * PASSO_MALHA))));
        for (let k = 0; k < n; k++) {
          // amostra baricêntrica regular (centroide quando n=1; grade rala quando n>1)
          let u = ((k % 7) + 0.5) / 7, v = ((Math.floor(k / 7) % 7) + 0.5) / 7;
          if (u + v > 1) { u = 1 - u; v = 1 - v; }
          pW.copy(vA).addScaledVector(e1, u).addScaledVector(e2, v);
          if (pW.y < 0.15) continue;                               // rente ao chão: o chão é a malha
          total++; amostrasOcc++; orc--;
          ray.set(pW.clone().addScaledVector(nW, TOL_MALHA), nW.clone().negate());
          ray.far = TOL_MALHA * 2;
          const hits = ray.intersectObject(W.root, true);
          if (!hits.some((h) => visivel(h.object))) { vazias++; amostrasVazias++; piorAlt = Math.max(piorAlt, pW.y); }
        }
      }
      if (total >= 4 && vazias / total > FRAC_MALHA) {
        const bw = new THREE.Box3().setFromObject(oc);
        semMalha.push({ frac: +(vazias / total).toFixed(3), amostras: total, alturaPior: +piorAlt.toFixed(1),
          caixa: [bw.min.x, bw.min.y, bw.min.z, bw.max.x, bw.max.y, bw.max.z].map((n2) => +n2.toFixed(1)) });
      }
    }
    semMalha.sort((a, b) => b.frac - a.frac);
  }

  /* ================= MAP5 — densidade de prop e de waypoint por quadrante ================= */
  const quadrantes = [];
  {
    const qx = (B.maxX - B.minX) / QUAD_N, qz = (B.maxZ - B.minZ) / QUAD_N;
    const wps = (W.waypoints && W.waypoints.nodes) || [];
    // "prop" = colisor com pelo menos 0,60 m de altura útil (gôndola, carro, poste, caixa);
    // parede/laje de estrutura entra igual — a régua mede o que OCUPA e dá cobertura.
    const props = (W.colliders || []).filter((c) => c.maxY - c.minY >= 0.6 && (c.maxX - c.minX) * (c.maxZ - c.minZ) <= 60);
    for (let a = 0; a < QUAD_N; a++) for (let b = 0; b < QUAD_N; b++) {
      const x0 = B.minX + a * qx, x1 = x0 + qx, z0 = B.minZ + b * qz, z1 = z0 + qz;
      let cel = 0;
      for (let i = 0; i < nGx; i++) for (let j = 0; j < nGz; j++) {
        const x = GX(i), z = GZ(j);
        if (x < x0 || x >= x1 || z < z0 || z >= z1) continue;
        if (alcancado[gid(i, j)]) cel++;
      }
      const areaAnd = cel * STEP_G * STEP_G;
      if (areaAnd < QUAD_MIN_AND) continue;   // quadrante sem chão jogável não é deserto, é fora do mapa
      const nP = props.filter((c) => { const cx2 = (c.minX + c.maxX) / 2, cz2 = (c.minZ + c.maxZ) / 2; return cx2 >= x0 && cx2 < x1 && cz2 >= z0 && cz2 < z1; }).length;
      const nW = wps.filter((n) => n.x >= x0 && n.x < x1 && n.z >= z0 && n.z < z1).length;
      const dP = nP / areaAnd * 100;
      quadrantes.push({ q: `${a},${b}`, x0: +x0.toFixed(1), z0: +z0.toFixed(1), areaAndavel: +areaAnd.toFixed(0),
        props: nP, waypoints: nW,
        densProp: +dP.toFixed(2), densWp: +(nW / areaAnd * 100).toFixed(2),
        espacamento: +(dP > 0 ? Math.sqrt(100 / dP) : 99).toFixed(2) });
    }
    const mediana = (arr) => { const s = [...arr].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
    const medP = mediana(quadrantes.map((q) => q.densProp)), medW = mediana(quadrantes.map((q) => q.densWp));
    for (const q of quadrantes) {
      q.razaoProp = medP ? +(q.densProp / medP).toFixed(2) : 1;
      q.razaoWp = medW ? +(q.densWp / medW).toFixed(2) : 1;
    }
    quadrantes.medianaProp = medP; quadrantes.medianaWp = medW;
  }

  /* ================= CTF2 — rotas SEPARADAS spawn ↔ bandeira ================= */
  const rotas = [];
  {
    const nodes = (W.waypoints && W.waypoints.nodes) || [];
    const adjW = (W.waypoints && W.waypoints.adj) || [];
    const ptsCtf = (g.ctfPts || []);
    if (nodes.length && adjW.length && W.nearestWaypoint) {
      // Dijkstra próprio com nós PROIBIDOS (o findPath do mapa não aceita bloqueio)
      const caminho = (from, to, bloq) => {
        const n = nodes.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
        const vis2 = new Uint8Array(n);
        if (bloq[from] || bloq[to]) return null;
        dist[from] = 0;
        for (;;) {
          let cur = -1, bd = Infinity;
          for (let i = 0; i < n; i++) if (!vis2[i] && dist[i] < bd) { bd = dist[i]; cur = i; }
          if (cur === -1) break;
          if (cur === to) break;
          vis2[cur] = 1;
          for (const m of adjW[cur]) {
            if (bloq[m]) continue;
            const d = dist[cur] + Math.hypot(nodes[cur].x - nodes[m].x, nodes[cur].z - nodes[m].z);
            if (d < dist[m]) { dist[m] = d; prev[m] = cur; }
          }
        }
        if (!isFinite(dist[to])) return null;
        const p = [to]; let c = prev[to]; while (c !== -1) { p.unshift(c); c = prev[c]; }
        return p;
      };
      for (const [team, ss] of Object.entries(W.spawns || {})) {
        for (const p of ptsCtf) {
          const from = W.nearestWaypoint(ss[0].x, ss[0].z), to = W.nearestWaypoint(p.x, p.z);
          const bloq = new Uint8Array(nodes.length);
          const achadas = [];
          for (let k = 0; k < 4; k++) {
            const cam = caminho(from, to, bloq);
            if (!cam) break;
            achadas.push(+cam.reduce((a, _, i2) => i2 ? a + Math.hypot(nodes[cam[i2]].x - nodes[cam[i2 - 1]].x, nodes[cam[i2]].z - nodes[cam[i2 - 1]].z) : 0, 0).toFixed(1));
            /* Apaga a FAIXA da rota, POUPANDO as vizinhanças das duas pontas.
               Sem a poupança o número era 1 em todo lugar e não media nada: as últimas
               dezenas de metros até a bandeira e os primeiros metros saindo do respawn são
               obrigatoriamente COMPARTILHADOS (a bandeira é um ponto, o spawn é uma sala),
               então apagar a faixa inteira apagava também o único acesso ao destino. O que
               interessa — e o que o dono descreveu ("os bots ficam todos no meio") — é se o
               MIOLO do trajeto tem alternativa. RAIO_PONTA = SEP_ROTA + 3,4 m (um passo do
               grafo) em volta de cada ponta. */
            const RAIO_PONTA = SEP_ROTA + 3.4;
            const pA = nodes[from], pB = nodes[to];
            for (let i2 = 0; i2 < nodes.length; i2++) {
              if (i2 === from || i2 === to) continue;
              // Mutante da régua: depois da primeira rota, elimina fisicamente todo o
              // miolo do grafo. Se CTF2 não ficar vermelho, o portão mede só o log.
              if (MUTANTE_ROTA_UNICA) { bloq[i2] = 1; continue; }
              if (Math.hypot(nodes[i2].x - pA.x, nodes[i2].z - pA.z) <= RAIO_PONTA) continue;
              if (Math.hypot(nodes[i2].x - pB.x, nodes[i2].z - pB.z) <= RAIO_PONTA) continue;
              for (const c2 of cam) {
                if (Math.hypot(nodes[i2].x - nodes[c2].x, nodes[i2].z - nodes[c2].z) <= SEP_ROTA) { bloq[i2] = 1; break; }
              }
            }
          }
          rotas.push({ time: team, bandeira: p.id, rotas: achadas.length, comprimentos: achadas });
        }
      }
    }
  }

  /* ================= CTF1 — as bandeiras ================= */
  const pts = (g.ctfPts || []).map((p) => ({ id: p.id, label: p.label, x: p.x, z: p.z, r: p.r }));
  const spawnsTodos = Object.entries(W.spawns || {}).flatMap(([t, ss]) => ss.map((s) => ({ ...s, team: t })));
  const bandeiras = pts.map((p) => {
    let dMin = Infinity, tMin = null;
    for (const s of spawnsTodos) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < dMin) { dMin = d; tMin = s.team; } }
    // maior linha de tiro LIMPA até a bandeira (peito de quem está capturando)
    const alvo = new THREE.Vector3(p.x, gh(p.x, p.z) + 1.2, p.z);
    let maiorLinha = 0;
    for (const o of observadores) {
      const d = Math.hypot(o.x - p.x, o.z - p.z);
      if (d <= maiorLinha) continue;
      if (g._losClear(new THREE.Vector3(o.x, o.y, o.z), alvo.clone())) maiorLinha = d;
    }
    // a bandeira também é um LUGAR: se o corpo de quem captura fica dentro de sólido ali
    // (foi o caso da MID em cima do pedestal da estátua), o anel de captura atravessa a
    // geometria — é o "anel rosa cortando o pedestal" dos prints do dono.
    const sp = sonda(p.x, p.z);
    return { id: p.id, label: p.label, x: p.x, z: p.z, distSpawn: +dMin.toFixed(2), timeSpawn: tMin,
      maiorLinhaTiro: +maiorLinha.toFixed(1), chao: +gh(p.x, p.z).toFixed(2), penetracao: +sp.pen.toFixed(3) };
  });
  /* COLINEARIDADE: pra cada trio de bandeiras, a ALTURA do triângulo (a distância do vértice
     do meio até a reta dos outros dois). 3 bandeiras na mesma reta = altura 0 = o mapa vira
     um corredor de ida e volta, que é o "os bots ficam todos na bandeira do meio": com tudo
     na linha central, o caminho ótimo entre as duas pontas PASSA pela do meio. */
  let alturaTrianguloMin = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) for (let k = j + 1; k < pts.length; k++) {
    const A = pts[i], Bp = pts[j], C = pts[k];
    const area2 = Math.abs((Bp.x - A.x) * (C.z - A.z) - (C.x - A.x) * (Bp.z - A.z));
    // altura mínima do triângulo = 2·área / maior lado
    const lados = [Math.hypot(Bp.x - A.x, Bp.z - A.z), Math.hypot(C.x - A.x, C.z - A.z), Math.hypot(C.x - Bp.x, C.z - Bp.z)];
    const h = area2 / Math.max(...lados);
    alturaTrianguloMin = Math.min(alturaTrianguloMin, h);
  }
  if (!isFinite(alturaTrianguloMin)) alturaTrianguloMin = 0;

  mapas.push({
    map: mapId,
    celulasAlcancadas, amostrasChao: amostras, observadores: observadores.length,
    // MAP1
    corpoDentroDeSolido: dentro.length, submersosAcimaDoPeito: submersos, piorPenetracao: +piorPen.toFixed(3),
    piores: dentro.sort((a, b) => b.pen - a.pen).slice(0, 8), dentroTodos: dentro,
    spawns: spawnsInfo,
    // MAP2
    exposicaoPorTime: expTime, exposicaoPorSpawn: exposicao,
    // MAP2B
    salaDoSpawn: sala,
    piorFolga: sala.length ? +Math.min(...sala.map((s) => s.folgaParede)).toFixed(2) : 0,
    piorArea: sala.length ? +Math.min(...sala.map((s) => s.areaContigua)).toFixed(1) : 0,
    // MAP3
    escadas, travessia,
    // MAP4
    occluderSemMalha: semMalha, occMedidos, occPulados,
    fracSemMalha: amostrasOcc ? +(amostrasVazias / amostrasOcc).toFixed(4) : 0,
    // MAP5 / CTF2
    quadrantes: [...quadrantes], medianaProp: quadrantes.medianaProp, medianaWp: quadrantes.medianaWp,
    piorRazaoProp: quadrantes.length ? +Math.min(...quadrantes.map((q) => q.razaoProp)).toFixed(2) : 1,
    piorRazaoWp: quadrantes.length ? +Math.min(...quadrantes.map((q) => q.razaoWp)).toFixed(2) : 1,
    piorEspacamento: quadrantes.length ? +Math.max(...quadrantes.map((q) => q.espacamento)).toFixed(2) : 0,
    // MAP6
    bordasSemGuarda,
    rotasSpawnBandeira: rotas, piorRotas: rotas.length ? Math.min(...rotas.map((r) => r.rotas)) : 0,
    // CTF1
    bandeiras, alturaTrianguloMin: +alturaTrianguloMin.toFixed(2),
  });
}

const saida = {
  gerado: new Date().toISOString(),
  criterios: {
    map1: `corpo dentro de sólido: raycast do peito (${PEITO} m) até o chão; sólido com topo > ${DEGRAU} m acima do chão local reprova`,
    map2: `exposição: fração dos pontos andáveis a ≥ ${D_FORA} m com _losClear até a cabeça (${OLHO} m) de quem nasce`,
    map2b: `respawn é lugar: folga até a parede ≥ ${FOLGA_MIN} m e área andável contígua ≥ ${AREA_MIN} m² num raio de ${R_SPAWN} m`,
    map3: `NBR 9077: espelho ${ESPELHO}, piso ${PISO_D}, 2h+p ${BLONDEL}, largura ≥ ${LARG_MIN} m, inclinação ${INCLIN}°`,
    map4: `occluder com malha visível a ≤ ${TOL_MALHA} m (tolerância declarada); reprova acima de ${FRAC_MALHA * 100}% da face lateral sem malha`,
    map5: `espaçamento médio entre props ≤ ${QUAD_ESPAC} m E densidade de prop/waypoint ≥ ${QUAD_FRAC} × a mediana do próprio mapa (grade ${QUAD_N}×${QUAD_N}, só quadrante com ≥ ${QUAD_MIN_AND} m² andáveis)`,
    map6: `toda borda alcançável com queda ≥ ${QUEDA_ANDAR} m empurra o corpo na altura do piso superior`,
    ctf1: 'altura mínima do triângulo das bandeiras, distância ao spawn mais próximo, maior linha de tiro limpa',
    ctf2: `rotas separadas por ≥ ${SEP_ROTA} m entre cada spawn e cada bandeira`,
  },
  mapas,
};
writeFileSync(path.join(HERE, 'map_check.json'), JSON.stringify(saida, null, 1));

for (const m of mapas) {
  if (m.err) { console.log(`${m.map.padEnd(15)} ERRO ${m.err}`); continue; }
  console.log(`${m.map.padEnd(15)} MAP1 dentro ${String(m.corpoDentroDeSolido).padStart(4)} (submerso ${m.submersosAcimaDoPeito}, pior ${m.piorPenetracao} m) | ` +
    `MAP2 ${m.exposicaoPorTime.map((t) => `${t.team} chao ${t.chaoMin}-${t.chaoMax} exp ${(t.fracMedia * 100).toFixed(1)}% vis ${t.maiorVisada}m`).join(' / ')}`);
  for (const e of m.escadas)
    console.log(`${''.padEnd(15)} MAP3 ${e.nome}: ${e.degraus} degraus | espelho ${e.espelhoMed} | piso ${e.pisoMed} | 2h+p ${e.blondel} | larg ${e.larguraMedida} | ${e.inclinacaoGraus}° | desvio ${e.desvioChaoDegrau} m`);
  for (const t of m.travessia)
    console.log(`${''.padEnd(15)} MAP3 ${t.nivel}: ${t.celulasAlcancadas} cel alcançadas, ${t.waypointsNoNivel} wp, A* chega ${t.aEstrelaChega}`);
  console.log(`${''.padEnd(15)} MAP2B pior folga ${m.piorFolga} m [≥${FOLGA_MIN}] · pior área contígua ${m.piorArea} m² [≥${AREA_MIN}] | ` +
    m.salaDoSpawn.filter((s) => !s.okFolga || !s.okArea).map((s) => `${s.team}(${s.x},${s.z}) folga ${s.folgaParede} área ${s.areaContigua}`).join(' · '));
  console.log(`${''.padEnd(15)} MAP4 ${m.occluderSemMalha.length} occluder(s) sem malha visível de ${m.occMedidos} medidos (${m.occPulados} pulados) | ` +
    m.occluderSemMalha.slice(0, 4).map((o) => `${(o.frac * 100).toFixed(0)}% vazio até y ${o.alturaPior} m em [${o.caixa.join(' ')}]`).join(' · '));
  console.log(`${''.padEnd(15)} MAP5 pior espaçamento ${m.piorEspacamento} m [≤${QUAD_ESPAC}] · pior razão prop ${m.piorRazaoProp}× / wp ${m.piorRazaoWp}× da mediana [≥${QUAD_FRAC}] em ${m.quadrantes.length} quadrantes | ` +
    m.quadrantes.filter((q) => q.razaoProp < QUAD_FRAC || q.razaoWp < QUAD_FRAC || q.espacamento > QUAD_ESPAC).map((q) => `q${q.q}(x${q.x0} z${q.z0}) esp ${q.espacamento} m prop ${q.razaoProp}× wp ${q.razaoWp}×`).join(' · '));
  console.log(`${''.padEnd(15)} MAP6 ${m.bordasSemGuarda.length} borda(s) de andar alto sem guarda | ` +
    m.bordasSemGuarda.slice(0, 6).map((b) => `[${b.x},${b.z}] queda ${b.queda} m`).join(' · '));
  console.log(`${''.padEnd(15)} CTF1 alturaTriangulo ${m.alturaTrianguloMin} m | ` +
    m.bandeiras.map((b) => `${b.id} d${b.distSpawn}m linha ${b.maiorLinhaTiro}m`).join(' | '));
  console.log(`${''.padEnd(15)} CTF2 mínimo ${m.piorRotas} rota(s) separada(s) | ` +
    m.rotasSpawnBandeira.map((r) => `${r.time}→${r.bandeira} ${r.rotas}`).join(' · '));
}
console.log(`MAPCHECK dentro ${mapas.reduce((a, m) => a + (m.corpoDentroDeSolido || 0), 0)} | submersos ${mapas.reduce((a, m) => a + (m.submersosAcimaDoPeito || 0), 0)}`);
const bordasAltasAbertas = mapas.reduce((n, m) => n + (m.bordasSemGuarda?.length || 0), 0);
const rotasInsuficientes = mapas.flatMap((m) => (m.rotasSpawnBandeira || [])
  .filter((r) => r.rotas < 2)
  .map((r) => `${m.map}/${r.time}→${r.bandeira}(${r.rotas})`));
const escadasFora = mapas.flatMap((m) => (m.escadas || []).filter((e) =>
  !e.okEspelho || !e.okPiso || !e.okBlondel || !e.okLargura || !e.okInclinacao || !e.okDesvio)
  .map((e) => `${m.map}/${e.nome}`));
const niveisInacessiveis = mapas.flatMap((m) => (m.travessia || []).filter((t) =>
  t.celulasAlcancadas < CEL_NIVEL_MIN || !t.aEstrelaChega)
  .map((t) => `${m.map}/${t.nivel}(${t.celulasAlcancadas} células, A* ${t.aEstrelaChega ? 'ok' : 'falha'})`));
if (escadasFora.length > 0) {
  console.error(`MAP3 FALHA: ${escadasFora.length} escada(s) fora do contrato medido: ${escadasFora.join(', ')}`);
  process.exitCode = 1;
} else if (MUTANTE_DESVIO_ESCADA) {
  console.error('MUTANTE desvio-escada sobreviveu: a divergência injetada não foi medida');
  process.exitCode = 1;
}
if (niveisInacessiveis.length > 0) {
  console.error(`MAP3 TRAVESSIA FALHA: ${niveisInacessiveis.length} nível(is) declarado(s) sem espaço alcançável para um corpo (${CEL_NIVEL_MIN} células) ou sem rota A*: ${niveisInacessiveis.join(', ')}`);
  if (MUTANTE_TRAVESSIA) console.error('MUTANTE travessia-falsa mordido: o nível injetado como inacessível ficou vermelho');
  process.exitCode = 1;
} else if (MUTANTE_TRAVESSIA) {
  console.error('MUTANTE travessia-falsa sobreviveu: zerar a travessia não mudou o portão');
  process.exitCode = 1;
}
if (rotasInsuficientes.length > 0) {
  console.error(`CTF2 FALHA: ${rotasInsuficientes.length} par(es) spawn↔bandeira sem 2 rotas separadas: ${rotasInsuficientes.join(', ')}`);
  process.exitCode = 1;
} else if (MUTANTE_ROTA_UNICA) {
  console.error('MUTANTE rota-unica sobreviveu: a segunda faixa eliminada não foi medida');
  process.exitCode = 1;
}
if (!MUTANTE_SEM_GUARDA_ANDAR && bordasAltasAbertas > 0) {
  console.error(`MAP6 FALHA: ${bordasAltasAbertas} borda(s) alcançável(is) com queda ≥ ${QUEDA_ANDAR} m sem guarda; o jogador pode cair sob uma laje.`);
  process.exitCode = 1;
}
/* MAP1 SÓ IMPRIMIA. Até 12/08/2026 o critério que o dono relatou primeiro ("os jogadores
   estão SUBMERSOS EMBAIXO DA ESTÁTUA") era o único sem cláusula de reprovação: `map-check`
   saía 0 com 5 pontos de corpo dentro de sólido no mansao. Régua que não morde não é
   régua. O teto é ZERO e não precisa de lista de dívida: medido em 12/08, os outros NOVE
   mapas já estão em zero — o mansao era o único fora. */
const dentroTotal = mapas.reduce((a, m) => a + (m.corpoDentroDeSolido || 0), 0);
if (!MUTANTE_SUPERFICIE_SOLIDA && !MUTANTE_PENETRACAO && dentroTotal > 0) {
  const quais = mapas.filter((m) => (m.corpoDentroDeSolido || 0) > 0)
    .map((m) => `${m.map}(${m.corpoDentroDeSolido} ponto(s), pior ${m.piorPenetracao} m)`);
  console.error(`MAP1 FALHA: ${dentroTotal} ponto(s) andável(is) com o corpo dentro de geometria visível: ${quais.join(', ')}`);
  process.exitCode = 1;
}
if (MUTANTE_PENETRACAO) {
  const cegos = mapas.filter((m) => !(m.dentroTodos || []).some((d) =>
    String(d.tipo).startsWith('spawn') && Math.abs(d.pen - PEN_INJETADA) <= 0.02));
  if (cegos.length === 0) {
    console.error(`MUTANTE penetracao-injetada mordido: os ${mapas.length} mapas acusaram a penetração de ${PEN_INJETADA} m no spawn`);
  } else {
    console.error(`MUTANTE penetracao-injetada SOBREVIVEU em ${cegos.length} mapa(s): ${cegos.map((m) => `${m.map}(pior ${m.piorPenetracao})`).join(', ')}`);
  }
  process.exitCode = 1;
}
if (MUTANTE_SUPERFICIE_SOLIDA) {
  const falsosSolidos = mapas.reduce((n, m) => n + (m.corpoDentroDeSolido || 0), 0);
  if (falsosSolidos > 0) {
    console.error(`MUTANTE superficie-solida mordido: ${falsosSolidos} falso(s) sólido(s)`);
    process.exitCode = 1;
  } else {
    console.error('MUTANTE superficie-solida sobreviveu: nenhuma marca nonSolidSurface foi exercitada');
  }
}
if (MUTANTE_SEM_GUARDA_ANDAR) {
  const abertas = mapas.reduce((n, m) => n + (m.bordasSemGuarda?.length || 0), 0);
  if (abertas > 0) {
    console.error(`MUTANTE sem-guarda-andar mordido: ${abertas} borda(s) alta(s) abertas`);
    process.exitCode = 1;
  } else {
    console.error('MUTANTE sem-guarda-andar sobreviveu: nenhuma borda alta foi exercitada');
    process.exitCode = 1;
  }
}
