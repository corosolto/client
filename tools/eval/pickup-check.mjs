/* ============================================================================
   pickup-check.mjs — TODA ARMA LARGADA NO CHÃO É ALCANÇÁVEL? (alimenta a VM14)
   ----------------------------------------------------------------------------
   POR QUE EXISTE (o defeito que ninguém mediu, rodada de 08/2026)
   (NOTA 08/2026: o defeito de altura descrito neste cabeçalho JÁ FOI CONSERTADO — hoje
   `_assentarNoChao` mede a bbox girada e assenta no chão local, e o vão é 0,0100 m nos 26
   GLBs. O texto fica porque é o motivo de o arquivo existir e a memória de como um VERDE
   pode mentir. O critério (a) mudou de forma duas vezes desde então — ver abaixo.)
   O armário do spawn (game.js:1836-1869) empurra cada arma pro ponto andável mais
   próximo com `_freeSpot`, que resolve COLISÃO no plano XZ — e só. A ALTURA sai de
   `_dropWeapon(x, z, w, true, TOP)` com TOP = 0,12 ABSOLUTO (game.js:1826 e 4336):
   um número de mundo, não `groundHeightAt(x,z) + 0,12`. Em mapa plano os dois são a
   mesma coisa e ninguém nota. Em piscina_treta o chão da piscina vale −1,5 m
   (map_piscina.js:267 -> poolDepth) e as duas contas divergem por 1,6 m.
   Resultado medido: armas do armário caem DENTRO da piscina, e o grafo de navegação
   daquele mapa nem sequer tem waypoint lá — map_piscina.js:281 só cria nó onde
   `groundHeightAt > −0,35`, ou seja, o A* dos bots NÃO CHEGA NA ARMA, e o jogador
   que pular atrás dela cai num buraco de 1,5 m de onde a arma está fora de alcance.

   E o pior: a métrica anterior olhava `y − groundHeightAt(x,z)` e imprimia vão
   0,0000 — VERDE — exatamente porque groundHeightAt ali vale −1,5 e a arma estava
   assentada no fundo. Medir o vão contra o chão LOCAL certifica "a arma encosta em
   ALGUMA superfície"; nunca "o jogador consegue pegar a arma". Por isso aqui são
   TRÊS critérios independentes, e o (a) é o que não dá pra enganar.

   CRITÉRIOS (por pickup, por mapa)
     (a) ALCANCE   — CONECTIVIDADE REAL: flood-fill de andabilidade em grade de 0,25 m
                     (célula andável = o `_collide` do jogo não empurra um corpo de raio
                     0,38; aresta = 4-vizinhança com degrau ≤ 0,30 m), semeado nos pontos de
                     spawn DOS DOIS TIMES. A arma passa se existir célula ALCANÇADA a ≤ 1,0 m
                     dela. Vale igual pras duas fontes. Ver o bloco longo lá embaixo com o
                     histórico das duas formas anteriores — "waypoint ≤ 3 m" (74
                     falsos-positivos e VERDE em bolsão fechado, porque o grafo tem nós em
                     componentes desconexas) e "reta andável do spawn" (mede visada, 17
                     acusados dos quais 13 inocentes, e também VERDE no bolsão). As duas
                     saem no JSON como `okAlcanceWpVelho`/`okAlcanceRetaVelho`, só como
                     diagnóstico: nenhuma reprova mais nada.
     (b) NÍVEL     — groundHeightAt(x,z) ≥ −0,10: nada abaixo do nível de piso.
     (c) ASSENTADA — a arma ENCOSTA no chão: |vão| ≤ 0,05, onde vão = base da bbox
                     do mesh − groundHeightAt(x,z). É a BASE, não a origem do mesh:
                     `_dropWeapon` deita a arma de lado (roll 90°) e põe a ORIGEM a
                     0,12 m, então origem−chão = 0,12 em TODO mapa plano — medir a
                     origem reprovaria as 5 arenas por um deslocamento que é só a
                     meia-espessura da arma. `vaoOrigem` sai no JSON do mesmo jeito,
                     pra ninguém ter que confiar na minha escolha.

   O QUE CONTA COMO PICKUP: `world.pickups` (as armas que o MAPA cria) MAIS
   `game.drops` com `rack:true` (as ~50 do armário dos dois times, que nascem no
   _resetPositions). O bug do dono está nas do ARMÁRIO — checar só world.pickups
   deixaria justamente as 50 de fora.

   Roda o jogo REAL em node (DOM stubado + three vendorizado), o mesmo protocolo do
   botsim.mjs:88-111 — sem browser, sem npm install. Semente fixa: o `_freeSpot` e o
   yaw do rack chamam Math.random, então sem semente duas execuções mediriam layouts
   diferentes e o A/B da rodada não valeria nada.

   Uso:  node tools/eval/pickup-check.mjs [mapId|all]      (escreve pickup_check.json)
   ============================================================================ */
/* O stub de DOM/three e o boot do Game moram em harness.mjs (um só pros três arneses):
   duas cópias do mesmo stub é o jeito silencioso de duas réguas discordarem por causa do
   INSTRUMENTO. A saída deste arquivo foi conferida IDÊNTICA antes e depois da extração. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* --------------------------------------------------------------------------
   MEDIÇÃO
   -------------------------------------------------------------------------- */
import { writeFileSync } from 'node:fs';

const ONLY = process.argv[2] || 'all';
const R_WP = 3.0;      // diagnóstico do critério VELHO (waypoint mais próximo) — não reprova mais
const H_MIN = -0.10;   // (b) piso: nada pode estar abaixo disto
const VAO_MAX = 0.05;  // (c) folga máxima entre a base da arma e o chão
/* (a) CONECTIVIDADE REAL — parâmetros do flood-fill. STEP_G = 0,25 m é menor que o raio do
   corpo (0,38), então nenhum vão por onde o jogador passa é fechado pela discretização, e
   nenhuma fresta menor que o corpo é aberta por ela. R_BODY e DEGRAU são os do jogo
   (game.js `_collide` usa 0,38 no jogador; o degrau de 0,30 m é o mesmo do `_walkDepth`).
   R_ALCANCE = 1,0 m: a arma é pega ANDANDO POR CIMA (raio 1,7-1,9 m em _updatePickups), 1 m
   é a folga estreita que exige que o chão alcançável ENCOSTE na arma. */
const STEP_G = 0.25;
const R_BODY = 0.38;
const DEGRAU = 0.30;
const R_ALCANCE = 1.0;

const textures = initTextures();
const MAP_IDS = ONLY === 'all' ? Object.keys(MAPS) : [ONLY];
const SEED = 12345;

/* bbox do mesh já POSICIONADO e ROTACIONADO na cena: é o que o jogador vê. O three
   vendorizado tem Box3.setFromObject, que percorre os filhos aplicando as matrizes —
   uso ele em vez de reimplementar, pra medir a mesma geometria que é desenhada. */
function baseDoMesh(THREE, mesh) {
  try {
    mesh.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(mesh);
    return isFinite(b.min.y) ? b.min.y : null;
  } catch { return null; }
}

const mapas = [];
for (const mapId of MAP_IDS) {
  let g = null;
  try {
    g = bootGame(mapId, { textures, ctf: false, seed: SEED });   // _resetPositions -> monta o armário
  } catch (e) {
    mapas.push({ map: mapId, err: e.message });
    continue;
  }

  const W = g.world;
  const nodes = (W.waypoints && W.waypoints.nodes) || [];
  const gh = typeof W.groundHeightAt === 'function' ? W.groundHeightAt : () => 0;

  // world.pickups (do mapa) + drops do ARMÁRIO (as ~50 que o _resetPositions espalha)
  const lista = [
    ...(W.pickups || []).map((pk) => ({ pk, fonte: 'mapa' })),
    ...(g.drops || []).filter((d) => d.rack).map((pk) => ({ pk, fonte: 'rack' })),
  ];

  const perto = (x, z) => {
    let d2 = Infinity;
    for (const n of nodes) { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < d2) d2 = d; }
    return nodes.length ? Math.sqrt(d2) : Infinity;
  };

  /* CONTROLE DE RESOLUÇÃO DO GRAFO — sem isto o número de (a) é ilegível.
     O grafo é uma GRADE: STEP 4,4 m em praca_poderes/praca_old (map_brasilia.js:1358,
     map.js:334) e 3,4 m nos outros três. Numa grade de passo S o pior ponto andável
     do mundo já fica S/√2 do nó mais próximo — 3,11 m em praca_poderes. Ou seja: o raio de
     3 m sozinho reprova pontos PERFEITAMENTE alcançáveis nos mapas de grade grossa.
     Então medimos o MESMO raio nos PONTOS DE SPAWN, que são por definição lugares que
     o jogo considera bons: se o spawn também está a > 3 m de todo nó, o vermelho de
     (a) naquele mapa é resolução de grade, não arma inalcançável — e a leitura certa
     é a MARGEM (distância do pickup menos a distância típica do spawn). Os dois
     números saem no JSON de propósito; nenhum deles é ajustado pra ficar bonito. */
  const spawnDists = Object.values(W.spawns || {}).flat().map((s) => perto(s.x, s.z));
  const spawnPior = spawnDists.length ? Math.max(...spawnDists) : null;

  /* ================= (a) CONECTIVIDADE REAL — FLOOD-FILL DE ANDABILIDADE =================
     Terceira e definitiva forma do critério (a). As duas anteriores foram REFUTADAS por
     medição, e as duas erravam PRA VERDE — o pior defeito possível num portão:

       (a-v1) "existe waypoint do grafo a ≤ 3 m". Mede RESOLUÇÃO DE GRADE, não alcance.
              O grafo é uma grade de passo 3,4-4,4 m, então o pior ponto perfeitamente
              andável do mundo já nasce a S/√2 = 3,11 m do nó mais próximo: acusava 74
              falsos-positivos das 202 armas de armário. Pior ainda, ele nem olha se o nó
              está na MESMA componente conexa: em loja_h o grafo TEM nós dentro do bolsão
              atrás do colisor {x −28..28, z −42,5..−41,5} (map_havan.js:1207), numa
              componente que nenhum spawn alcança — e o critério dava VERDE nas 2 armas de lá.
       (a-v2) "existe reta andável do spawn até a arma" (commit 5f8b5a5, revertido).
              Mede VISADA, não alcance: reprova toda arma que exige contornar um colisor.
              Acusava 17, das quais 13 eram inocentes. E também dava VERDE nas 2 do bolsão
              do havan — a reta do spawn P até lá não cruza o muro, ela cruza o VÃO ao lado.

     A pergunta certa não é "tem nó perto" nem "dá pra ver dali": é EXISTE CAMINHO. Aqui ela
     é respondida por busca em largura sobre uma grade de andabilidade de 0,25 m, semeada
     nos pontos de spawn DOS DOIS TIMES, com a física do próprio jogo:
       • célula andável  = `g._collide({x, gh(x,z), z}, 0,38)` não empurra o corpo;
       • aresta          = 4-vizinhança com |Δ groundHeightAt| ≤ 0,30 m (degrau que se sobe);
       • a arma PASSA    = existe célula ALCANÇADA a ≤ 1,0 m dela.
     Vale IGUAL pras duas fontes (`mapa` e `rack`). Antes cada fonte tinha a sua régua, o que
     é exatamente o buraco por onde passaram as 2 do bolsão: o bot precisa chegar na arma do
     mapa e o jogador na do armário, mas "chegar" é a MESMA propriedade do mundo, e um lugar
     que nenhum humano alcança a pé também não é lugar de arma nenhuma.

     ESTRITAMENTE MAIS FORTE que (a-v1) e (a-v2): tudo que elas reprovam com razão continua
     vermelho aqui, e ele reprova o que as duas deixavam passar (as 2 do bolsão do havan —
     flood-fill mediu 26.412 células andáveis lá dentro e 0 alcançadas a partir dos spawns).
     E é DIFÍCIL DE ENGANAR: adensar o grafo de waypoints não move este número (ele não olha
     o grafo), e mover a arma pra um lugar sem chão andável perto reprova na hora.

     A física é reimplementada AQUI, chamando só `g._collide`/`groundHeightAt`, e não um
     helper do jogo: a régua não pode ser a mesma função que o jogo usa pra colocar a arma,
     senão um bug nela ficaria invisível dos dois lados.
     Custo medido: ~0,4-1,6 s por mapa (a grade tem 10^5 células e cada uma custa um
     `_collide`); os dois caches abaixo evitam recalcular a mesma célula na sondagem final. */
  const B = W.bounds;
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
      g._collide(p, R_BODY);
      andavelCache[k] = (Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6) ? 1 : 0;
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
      /* o ponto de spawn pode cair numa célula que o `_collide` rejeita (o spawn é o CENTRO
         do corpo e a grade não se alinha com ele): procura em anéis a andável mais perto,
         senão a semente se perde e o mapa inteiro sai "inalcançável" — falso VERMELHO. */
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
        if (Math.abs(altura(a, b) - y0) > DEGRAU) continue;    // degrau alto: não se sobe andando
        alcancado[k] = 1; fila.push(a, b);
      }
    }
  }
  const celulasAlcancadas = alcancado.reduce((a, v) => a + v, 0);
  // distância da arma à célula ALCANÇADA mais próxima (só varre a vizinhança de `max`)
  const distAndavel = (x, z, max = 4.0) => {
    const ci = Math.round((x - B.minX) / STEP_G), cj = Math.round((z - B.minZ) / STEP_G);
    const R = Math.ceil(max / STEP_G);
    let melhor = Infinity;
    for (let di = -R; di <= R; di++) for (let dj = -R; dj <= R; dj++) {
      const a = ci + di, b = cj + dj;
      if (a < 0 || b < 0 || a >= nGx || b >= nGz || !alcancado[gid(a, b)]) continue;
      const d = Math.hypot(GX(a) - x, GZ(b) - z);
      if (d < melhor) melhor = d;
    }
    return melhor;
  };

  /* DIAGNÓSTICO (não reprova): a reta andável do spawn do time, que foi o critério (a-v2).
     Fica no JSON pra qualquer um conferir o desacordo entre as réguas sem me reexecutar. */
  const retaAndavel = (sx, sz, tx, tz, r = 0.42, degrau = DEGRAU) => {
    const dx = tx - sx, dz = tz - sz, dist = Math.hypot(dx, dz);
    const n = Math.max(2, Math.ceil(dist / 0.25));
    let gPrev = gh(sx, sz);
    for (let i = 1; i <= n; i++) {
      const t = i / n, px = sx + dx * t, pz = sz + dz * t;
      const gg = gh(px, pz);
      if (Math.abs(gg - gPrev) > degrau) return false;
      gPrev = gg;
      const p = { x: px, y: gg, z: pz };
      g._collide(p, r);
      if (Math.abs(p.x - px) > 1e-3 || Math.abs(p.z - pz) > 1e-3) return false;
    }
    return true;
  };
  // time dono da arma do armário = o do spawn mais próximo (o armário é montado por time)
  const timeDe = (x, z) => {
    let melhor = null;
    for (const [team, ss] of Object.entries(W.spawns || {}))
      for (const s of ss) { const d = Math.hypot(s.x - x, s.z - z); if (!melhor || d < melhor.d) melhor = { team, d }; }
    return melhor ? melhor.team : null;
  };
  const retaDoSpawn = (x, z) => {
    const team = timeDe(x, z);
    const ss = (W.spawns && W.spawns[team]) || [];
    return ss.some((s) => retaAndavel(s.x, s.z, x, z));   // o jogador respawna em QUALQUER slot do time
  };

  const itens = [];
  for (const { pk, fonte } of lista) {
    const x = pk.x, z = pk.z;
    const chao = gh(x, z);
    const dWp = perto(x, z);
    const reta = retaDoSpawn(x, z);
    const dAnd = distAndavel(x, z);
    const yOrig = pk.mesh ? pk.mesh.position.y : null;
    const base = pk.mesh ? baseDoMesh(THREE, pk.mesh) : null;
    const vao = base === null ? null : base - chao;
    itens.push({
      arma: pk.weapon, fonte, x: +x.toFixed(2), z: +z.toFixed(2),
      chao: +chao.toFixed(3), distWaypoint: +dWp.toFixed(2),
      yOrigem: yOrig === null ? null : +yOrig.toFixed(3),
      vaoOrigem: yOrig === null ? null : +(yOrig - chao).toFixed(4),
      baseMesh: base === null ? null : +base.toFixed(3),
      vao: vao === null ? null : +vao.toFixed(4),
      // distância até o chão ANDÁVEL ALCANÇADO a partir dos spawns — este é o critério (a)
      distAndavel: dAnd === Infinity ? null : +dAnd.toFixed(2),
      // diagnósticos das réguas REFUTADAS, pra comparação (não reprovam nada):
      retaDoSpawn: reta, okAlcanceWpVelho: dWp <= R_WP, okAlcanceRetaVelho: reta,
      okAlcance: dAnd <= R_ALCANCE,          // (a) CONECTIVIDADE REAL — ver comentário acima
      okNivel: chao >= H_MIN,
      okAssentada: vao !== null && Math.abs(vao) <= VAO_MAX,
    });
  }
  const falha = (k) => itens.filter((i) => !i[k]);
  mapas.push({
    map: mapId, waypoints: nodes.length, pickups: itens.length,
    spawnPiorDistWaypoint: spawnPior === null ? null : +spawnPior.toFixed(2),
    celulasAlcancadas,                       // tamanho do flood-fill: se despencar, a semente quebrou
    semAlcance: falha('okAlcance').length,
    semAlcanceWpVelho: falha('okAlcanceWpVelho').length,     // o que a régua (a-v1) acusava
    semAlcanceRetaVelho: falha('okAlcanceRetaVelho').length, // o que a régua (a-v2) acusava
    piorDistAndavel: itens.length ? +Math.max(...itens.map((i) => (i.distAndavel === null ? 99 : i.distAndavel))).toFixed(2) : 0,
    abaixoDoPiso: falha('okNivel').length,
    flutuando: falha('okAssentada').length,
    piorDistWaypoint: itens.length ? +Math.max(...itens.map((i) => i.distWaypoint)).toFixed(2) : 0,
    piorChao: itens.length ? +Math.min(...itens.map((i) => i.chao)).toFixed(3) : 0,
    piorVao: itens.length ? +Math.max(...itens.filter((i) => i.vao !== null).map((i) => Math.abs(i.vao))).toFixed(4) : 0,
    itens,
  });
}

const tot = (k) => mapas.reduce((a, m) => a + (m[k] || 0), 0);
const saida = {
  gerado: new Date().toISOString(),
  criterios: {
    chaoMinimoM: H_MIN, vaoMaximoM: VAO_MAX,
    alcance: `(a) conectividade real: flood-fill de andabilidade (grade ${STEP_G} m, corpo ${R_BODY} m, ` +
      `degrau ≤ ${DEGRAU} m) a partir dos spawns dos DOIS times; a arma passa com célula alcançada a ≤ ${R_ALCANCE} m`,
    diagnosticoSoInformativo: { raioWaypointM: R_WP, reta: 'reta andável de um spawn do time' },
  },
  totalPickups: tot('pickups'),
  semAlcance: tot('semAlcance'),
  abaixoDoPiso: tot('abaixoDoPiso'),
  flutuando: tot('flutuando'),
  mapas,
};
writeFileSync(path.join(HERE, 'pickup_check.json'), JSON.stringify(saida, null, 1));

for (const m of mapas) {
  if (m.err) { console.log(`${m.map.padEnd(15)} ERRO ${m.err}`); continue; }
  console.log(`${m.map.padEnd(15)} ${String(m.pickups).padStart(3)} pickups | ${m.waypoints} wp | ` +
    `sem alcance ${m.semAlcance} (pior dist andável ${m.piorDistAndavel} m; réguas velhas acusavam wp ${m.semAlcanceWpVelho} / reta ${m.semAlcanceRetaVelho}) | ` +
    `abaixo do piso ${m.abaixoDoPiso} (pior chão ${m.piorChao} m) | ` +
    `flutuando ${m.flutuando} (pior vão ${m.piorVao} m)`);
}
console.log(`PICKUPCHECK total ${saida.totalPickups} | semAlcance ${saida.semAlcance} | abaixoDoPiso ${saida.abaixoDoPiso} | flutuando ${saida.flutuando}`);
