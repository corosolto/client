/* LAJES — BOTS: o mapa é jogado, ou só o telhado do spawn é?

   DEFEITO DE ORIGEM (dono, 26/08/2026): "os bots ficam so no respawn em cima e nao tentam
   circular pelo mapa embaixo tambem". O portão estava inteiro verde: a LV1 já provava que
   existe rota POR BAIXO entre spawn e bandeira, e a LV6 já provava que toda aresta de
   TÉRREO é andável. Nenhuma das duas olha para o bot. Medido na sonda de 26/08 (harness
   real, 3 sementes × 60 s × 7 bots): 21 de 21 bots com ymin = 5,20 m — nenhum pisou no
   chão a partida inteira —, 0% de amostra no térreo e 0% em escada.

   As três causas, cada uma medida antes de ser consertada:
     1. TÁBUA COM CORRIMÃO ERA ARMADILHA. O guarda-corpo da tábua é um colisor GIRADO de
        7 cm; a grade de navegação testava só a AABB dele, que para a tábua diagonal CN-NE
        mede 6,0 × 1,7 m. O bot saía do convés, encostava no corrimão e moía ali o resto da
        partida (medido: preso em (−6,97 / −26,67) de t = 6 s a t = 34 s).
     2. NÓ MAIS PRÓXIMO EM PLANTA, NUM MAPA DE DUAS CAMADAS. `nearestWaypoint(x, z)` ignorava
        y: a projeção de um bot na laje cai sobre um nó de BECO, então o A* recebia origem no
        térreo e o bot "seguia" uma rota de chão andando pelo telhado.
     3. LAJE COM UM NÓ POR TELHADO. A camada de cima tinha o CENTRO de cada parte e nada
        mais; sair da tábua para o centro era uma reta que raspava a platibanda na quina.

   O QUE ESTA RÉGUA COBRA (e o que ela deliberadamente NÃO cobra):
     LB1  TODA aresta do grafo — em QUALQUER camada — é andável de ponta a ponta pelo corpo
          do jogo. É a LV6 promovida para o mapa inteiro: a LV6 só olha aresta de térreo
          (`nodes[a].y >= Y_TERREO` → continue) e por construção era cega para as 4 arestas
          de laje que prendiam o bot. Mesmo instrumento da LV6 — `_collide` de produção com
          o raio do jogador —, porque régua e jogo têm que rodar no mesmo mundo (lição 3).
     LB2  ORIGEM DE ROTA NA CAMADA CERTA: para um ponto na laje, `nearestWaypoint` devolve nó
          de laje; para um ponto no térreo, nó de térreo. Sem isso o A* responde a pergunta
          errada e nenhuma rota do mapa vale.
   CLÁUSULA QUE NÃO ENTROU, e por que está escrita aqui em vez de apagada. A primeira versão
   tinha uma LB3 — "o bot simulado põe pé no térreo" —, que é literalmente o pedido do dono.
   Ela foi MEDIDA no estado ANTERIOR a esta rodada e nasceu VERDE: com o combate suprimido, o
   bot já descia antes (7,2% das amostras no térreo, 6 de 21 bots). Uma cláusula que já
   passava antes do conserto não prova conserto nenhum, e cláusula que não morde é pior que
   cláusula ausente — ela dá por resolvido o que continua aberto. Com o combate LIGADO, que é
   como o dono joga, o número é 0,0% antes e 1,4% depois: melhora, mas o que manda ali é o
   BUG-75 abaixo, não o grafo. Os dois números ficam IMPRESSOS em toda execução, sem
   cláusula, até que alguém ataque a causa de verdade.

   O QUE ELA NÃO COBRA, e por que isso está escrito aqui e não escondido:
     O raio de exploração do bot no lajes é 15,1 m contra 23,2 m (escadão), 23,0 m
     (piscinão) e 38,5 m (ferro velho) — medido com o mesmo harness. A causa NÃO é o grafo,
     que esta rodada consertou: com o combate desligado no mesmo mapa e no mesmo grafo o
     raio vai a 41,8 m e a escada finalmente aparece (1,1% das amostras). A causa é que no
     lajes 100% dos engajamentos acontecem acima de 25 m, com mediana de 49,6 m (escadão
     19,0 m, ferro velho 18,6 m): as duas lajes de spawn se enxergam por um corredor de ar
     de 60 m sobre o miolo, e `_updateBot` não avança rota nenhuma enquanto `b.target`
     existe (game.js, ramo `else` do roam). O bot não precisa andar para atirar, então não
     anda. Consertar isso é redesenhar a visada do telhado ou mexer na IA de combate de
     TODOS os mapas — nenhuma das duas cabe nesta frente. O número fica IMPRESSO abaixo em
     toda execução, para não passar por resolvido. Ver KNOWN-BUGS (BUG-75).

   REPRODUZ:  node tools/eval/lajes-bots-check.mjs
   MUTAÇÕES (cada uma morde a sua cláusula):
     --mutante=aresta-fantasma-laje  liga dois nós de LAJE através da platibanda   → LB1
     --mutante=planta-2d             nearestWaypoint volta a ignorar y             → LB2
     --mutante=porta-fechada         guarda de patamar de volta atravessando a boca de
                                     acesso da laje (o defeito original)          → LB1
*/
import { THREE, bootGame, initTextures } from './harness.mjs';

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const conhecidos = new Set(['', 'aresta-fantasma-laje', 'planta-2d', 'porta-fechada']);
if (!conhecidos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);


const Y_TERREO = .06;         // chão puro; o primeiro piso V4 já está a 0,172 m
const CORPO = .38;             // raio do jogador no `_collide` (game.js)
const SEMENTES = [12345, 777, 4242];
const SEGUNDOS = 60, DT = 1 / 60, AMOSTRA = 9;

const textures = initTextures();
const game = bootGame('lajes', { textures, bots: 0, seed: 1 });
const W = game.world, nodes = W.waypoints.nodes, adj = W.waypoints.adj;
const ROOF_H = W.design.roofHeight;

/* ===================== LB1 — toda aresta é andável, em toda camada ===================== */
const p = new THREE.Vector3();
function andavel(n, x = n.x, z = n.z, y = n.y) {
  p.set(x, y, z); game._collide(p, CORPO);
  return Math.hypot(p.x - x, p.z - z) < 1e-3;
}
function vaoAndavel(A, B) {
  const d = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z);
  const passos = Math.max(1, Math.ceil(d / .19));          // < a parede mais fina que colide (0,14 m)
  for (let s = 0; s <= passos; s++) {
    const t = s / passos;
    if (!andavel(A, A.x + (B.x - A.x) * t, A.z + (B.z - A.z) * t, A.y + (B.y - A.y) * t)) return false;
  }
  return true;
}

/* Repõe o guarda de patamar que esta rodada abriu na boca de acesso das lajes: uma parede de
   0,62 m atravessando o corredor por onde se sai da tábua para o miolo do telhado. É o
   defeito original, plantado de volta no MUNDO (colisor), não no grafo. */
function fecharPorta(g) {
  const s = g.world.design.stairs[0];
  if (!s) throw new Error('MUTANTE NÃO APLICOU: escada ausente');
  const z = s.z + s.dirZ * s.run;
  g.world.colliders.push({ minX:s.x-s.width/2, maxX:s.x+s.width/2,
    minY:s.height, maxY:s.height+.62, minZ:z-.07, maxZ:z+.07 });
}
if (mutante === 'porta-fechada') fecharPorta(game);
if (mutante === 'aresta-fantasma-laje') {
  // Liga dois nós superiores livres através de um sólido real.
  let ligou = 0;
  for (let a = 0; a < nodes.length && !ligou; a++) {
    if (Math.abs(nodes[a].y - ROOF_H) > .001) continue;
    for (let b = a + 1; b < nodes.length; b++) {
      if (Math.abs(nodes[b].y - ROOF_H) > .001 || adj[a].includes(b)) continue;
      if (Math.abs(nodes[a].y - nodes[b].y) > .1) continue;
      const d = Math.hypot(nodes[b].x - nodes[a].x, nodes[b].z - nodes[a].z);
      if (d < 1.5 || d > 5) continue;
      if (!andavel(nodes[a]) || !andavel(nodes[b])) continue;
      if (vaoAndavel(nodes[a], nodes[b])) continue;        // já passava: não é fantasma
      adj[a].push(b); adj[b].push(a); ligou = 1; break;
    }
  }
  if (!ligou) throw new Error('MUTANTE NÃO APLICOU: não achei par de nós de laje separados por sólido');
}

const ruins = [];
let arestas = 0, arestasLaje = 0;
for (let a = 0; a < nodes.length; a++) for (const b of adj[a]) {
  if (b <= a) continue;
  arestas++;
  if (Math.abs(nodes[a].y-ROOF_H)<.001 && Math.abs(nodes[b].y-ROOF_H)<.001) arestasLaje++;
  const A = nodes[a], B = nodes[b];
  if (!vaoAndavel(A, B)) ruins.push(`${A.x.toFixed(1)},${A.y.toFixed(1)},${A.z.toFixed(1)} → ${B.x.toFixed(1)},${B.y.toFixed(1)},${B.z.toFixed(1)}`);
}
const lb1 = ruins.length === 0;
console.log(`${lb1 ? '✓' : '✗'} LB1 aresta andável em toda camada: ${ruins.length} bloqueada(s) de ${arestas} (${arestasLaje} em laje)`);
for (const r of ruins.slice(0, 8)) console.log(`      ${r}`);

/* ===================== LB2 — origem de rota na camada certa ===================== */
if(mutante==='planta-2d'){
  const original=W.nearestWaypoint;
  W.nearestWaypoint=(x,z)=>original(x,z);
  if(W.nearestWaypoint===original)throw Error('MUTANTE NÃO APLICOU: nearestWaypoint não mudou');
}
const nearest = (x,z,y)=>W.nearestWaypoint(x,z,y);
/* Amostra nos DOIS andares sobre o mesmo XZ: é exatamente onde a planta erra. Só conta
   ponto que o mapa entrega como piso naquela camada (senão a pergunta não existe). */
let consultas = 0, camadaCerta = 0;
for (let x = W.bounds.minX+1; x <= W.bounds.maxX-1; x += 1.5) for (let z = W.bounds.minZ+1; z <= W.bounds.maxZ-1; z += 2.5) {
  for (const [y, alvoLaje] of [[0, false], [ROOF_H, true]]) {
    if (Math.abs(W.groundHeightAt(x, z, alvoLaje ? 1e3 : 0) - y) > .12) continue;
    if (!andavel({ x, y, z }, x, z, y)) continue;
    consultas++;
    if ((nodes[nearest(x, z, y)].y >= Y_TERREO) === alvoLaje) camadaCerta++;
  }
}
const fracCamada = consultas ? camadaCerta / consultas : 0;
// O estrato de dois pisos não pode ser diluído pelas centenas de pontos de um piso.
let pairedQueries=0,pairedCorrect=0;
for(const bridge of W.design.bridges)for(const t of [.25,.5,.75]){
  const x=(bridge.x0+bridge.x1)/2,z=bridge.z0+(bridge.z1-bridge.z0)*t;
  for(const y of [0,bridge.y]){
    if(Math.abs(W.groundHeightAt(x,z,y)-y)>.001 || !andavel({x,y,z},x,z,y))throw Error('LB2 não sei medir: par de pisos da ponte indisponível');
    pairedQueries++;
    if(Math.abs(nodes[nearest(x,z,y)].y-y)<.001)pairedCorrect++;
  }
}
const pairedFraction=pairedQueries?pairedCorrect/pairedQueries:0;
const lb2 = consultas > 100 && fracCamada >= .97 && pairedQueries>0 && pairedFraction>=.97;
console.log(`${lb2 ? '✓' : '✗'} LB2 origem de rota na camada certa: ${(100 * fracCamada).toFixed(1)}% de ${consultas} consultas; dois pisos ${(100*pairedFraction).toFixed(1)}% de ${pairedQueries} (ambos mín 97%)`);

/* ============ MEDIDA SEM CLÁUSULA — o mapa é jogado ou só o telhado do spawn? ============ */
const PRACA = { ...W.praca };
function simular({ combate }) {
  let amostras = 0, noTerreo = 0, emEscada = 0, botsTot = 0, desceram = 0, naPraca = 0, raio = 0;
  const distAlvo = [];
  for (const semente of SEMENTES) {
    const g = bootGame('lajes', { textures, bots: 4, seed: semente });
    if (mutante === 'porta-fechada') fecharPorta(g);
    if (!combate) {
      /* Não é "desligar o bot": é tirar o ALVO do caminho. Todo o resto — roam, A*, rota,
         colisão, escada — continua sendo o código de produção. */
      const original = g._updateBot.bind(g);
      g._updateBot = (b, dt) => { b.target = null; return original(b, dt); };
    }
    g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
    const marca = new Map(g.bots.map((b) => [b, { x: b.pos.x, z: b.pos.z, max: 0, desceu: false, praca: false }]));
    for (let i = 0; i < Math.round(SEGUNDOS / DT); i++) {
      g.update(DT);
      if (i % AMOSTRA) continue;
      for (const b of g.bots) {
        if (!b.alive) continue;
        amostras++;
        const s2 = marca.get(b);
        if (b.pos.y < Y_TERREO) {
          noTerreo++; s2.desceu = true;
          if (b.pos.x > PRACA.x0 && b.pos.x < PRACA.x1 && b.pos.z > PRACA.z0 && b.pos.z < PRACA.z1) s2.praca = true;
        } else if (b.pos.y < ROOF_H - .06) emEscada++;
        if (b.target) distAlvo.push(Math.hypot(b.pos.x - b.target.pos.x, b.pos.z - b.target.pos.z));
        s2.max = Math.max(s2.max, Math.hypot(b.pos.x - s2.x, b.pos.z - s2.z));
      }
    }
    for (const [, s2] of marca) { botsTot++; raio += s2.max; if (s2.desceu) desceram++; if (s2.praca) naPraca++; }
  }
  distAlvo.sort((a, b) => a - b);
  return { fracTerreo: noTerreo / amostras, fracEscada: emEscada / amostras, botsTot, desceram, naPraca,
    raio: raio / botsTot, medianaAlvo: distAlvo.length ? distAlvo[distAlvo.length >> 1] : NaN };
}

/* Os DOIS lados do mesmo mapa, impressos lado a lado (BUG-75). Sem combate mede-se o que
   esta frente constrói — grafo, rota, escada. Com combate mede-se o que o dono vê. A
   distância entre os dois números É o defeito em aberto, e ele fica visível em toda
   execução para não passar por resolvido. */
const nav = simular({ combate: false });
console.log(`· MEDIDA navegação (combate suprimido): térreo ${(100 * nav.fracTerreo).toFixed(1)}%`
  + ` · escada ${(100 * nav.fracEscada).toFixed(2)}% · ${nav.desceram}/${nav.botsTot} bots no chão`
  + ` · ${nav.naPraca}/${nav.botsTot} na praça · raio ${nav.raio.toFixed(1)} m`);
const real = simular({ combate: true });
console.log(`· MEDIDA partida real (combate ligado): térreo ${(100 * real.fracTerreo).toFixed(1)}%`
  + ` · escada ${(100 * real.fracEscada).toFixed(2)}% · ${real.desceram}/${real.botsTot} bots no chão`
  + ` · raio ${real.raio.toFixed(1)} m (escadão 23,2 · piscinão 23,0 · ferro velho 38,5)`
  + ` · engajamento mediano ${real.medianaAlvo.toFixed(1)} m (escadão 19,0) — BUG-75, SEM CLÁUSULA`);

const falhas = [lb1, lb2].filter((ok) => !ok).length;
if (falhas) { console.error(`LAJES-BOTS FALHA: ${falhas}/2`); process.exitCode = 1; }
else if (mutante) { console.error(`MUTANTE ${mutante} sobreviveu`); process.exitCode = 1; }
else console.log('LAJES-BOTS OK');
