/* ============================================================================
   javaporcos-mapa-check.mjs — O MAPA DA INVASÃO: A MATA É A PAREDE, O CHÃO É DE
   VERDADE, A COMIDA ESTÁ NA CIDADE E A TRILHA CHEGA DENTRO DA LOJA.

   POR QUE EXISTE
   O dono jogou a primeira versão e reprovou com estas palavras (28-29/10/2026):

     "o mapa esta horrivel, totalmente lowpoly, tem que ter arvores, grama e mata fechada"
     "o javaporco tem que invadir a cidade; não pode ser possível pros players irem até o
      limite do mapa, tem que ficar difícil sair da cidade"
     "o javaporco tava indo por baixo da terra, está errado"
     "seria legal pôr lixos e alimentos pros javaporcos revirarem a cidade toda, entrarem
      em casas, lojas, ruas"

   Nenhuma das quatro é gosto: as quatro são propriedades mensuráveis do mundo que o
   `buildInvasaoJavaporcos` devolve. O que já existia media OUTRA coisa — o portão de mapa
   novo (mapa-novo-gate.mjs) cobra ortogonalidade, altura e superfície, e o map-check cobra
   corpo-dentro-de-sólido no conjunto dos mapas. Nenhum dos dois sabe que ESTE mapa tem de
   ser um cerco, nem que o chão dele tem de ter relevo, nem onde a comida mora.

   O QUE ELE MEDE (mundo real, mapa real, node puro, via tools/eval/harness.mjs)
     MATA1  CERCO: varredura a pé (flood-fill com o `_collide` DO JOGO e raio de corpo
            0,38) a partir do cruzamento central. Nenhuma célula alcançável pode chegar
            além de LIMITE_ESCAPE em `max(|x|,|z|)`. É a tradução literal de "não pode ser
            possível pros players irem até o limite do mapa".
     MATA2  DENSIDADE E BOCAS: o cinturão tem de ter mata instanciada de verdade, parede de
            colisor, e de 8 a 10 bocas espalhadas pelos QUATRO lados.
     CHAO1  RELEVO: `groundHeightAt` tem de separar rua, calçada, soleira de loja, barranco
            e leito do córrego — e, nos pontos andáveis, a altura que ele devolve tem de
            bater com a malha visível (sonda vertical, mesma do MAP1). Chão constante é o
            "javaporco indo por baixo da terra".
     COMIDA1 LIXO: 12 a 20 `foodSpots`, todos DENTRO de `cityBounds`, com `kind`/`r`/`hp`
            válidos, malha recuperável por `foodMesh(id)` e colisor VIVO por
            `foodCollider(id)` (o mesmo objeto do array, não cópia).
     TRILHA1 A horda sai da boca de mata e chega nos objetivos pela navegação do mapa.
     TRILHA2 E chega DENTRO das quatro lojas: sem a costura da porta na grade de 1,5 m a
            invasão para na calçada, que é o defeito que o dono viu.

   MUTANTES (cada um tem de deixar a régua VERMELHA):
     mata-furada     derruba a parede de colisor do lado norte  -> MATA1
     chao-constante  `groundHeightAt` volta a devolver 0 fixo   -> CHAO1
     comida-fora     joga dois foodSpots para dentro da mata    -> COMIDA1
     trilha-solta    corta a costura da porta na navegação      -> TRILHA2

   Uso: node tools/eval/javaporcos-mapa-check.mjs [--mutante=X] [--json-out=arq]
   ============================================================================ */
import fs from 'node:fs';
import { THREE, initTextures, bootGame } from './harness.mjs';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
const MUTANTES = ['mata-furada', 'chao-constante', 'comida-fora', 'trilha-solta'];
if (MUT && !MUTANTES.includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT}. Há: ${MUTANTES.join(', ')}`);
  process.exit(2);
}

const MAPA = 'invasao_javaporcos';
const R_CORPO = 0.38;        // raio do corpo do jogador (game.js `_collide`)
const PASSO = 0.6;           // grade do flood-fill de fuga
/* O teto é de INCLINAÇÃO, não de degrau fixo: o map-check mede 0,30 m a cada 0,25 m, que
   é 1,2 m/m. Com passo de 0,6 m o mesmo barranco tem de continuar subível. */
const DEGRAU = 1.2 * PASSO;
const PEITO = 1.40;
const PEN_MAX = 0.30;        // penetração máxima da sonda vertical (MAP1 do map-check)
/* 54 m: a clareira mais funda fica a 51,3 m do centro (boca a 47,5 + raio 3,8), e a borda
   do mapa está em 58. Entre 51,3 e 58 sobram 6,7 m de mata que ninguém pode atravessar. */
const LIMITE_ESCAPE = 54;
const SEED = 13007;
let falhas = 0;
const relatorio = {};
const regra = (nome, fn) => {
  try { const d = fn(); console.log(`✓ ${nome}${d ? ` — ${d}` : ''}`); }
  catch (e) { falhas++; console.error(`✗ ${nome}: ${e.message}`); }
};
const exige = (cond, msg) => { if (!cond) throw new Error(msg); };

const T = initTextures();
const jogo = bootGame(MAPA, { textures: T, seed: SEED });
const W = jogo.world;
jogo.scene.updateMatrixWorld(true);
W.root.updateMatrixWorld(true);

/* ---------------------------------------------------------------- mutantes */
if (MUT === 'mata-furada') {
  const antes = W.colliders.length;
  for (let i = W.colliders.length - 1; i >= 0; i--) {
    const c = W.colliders[i];
    const cz = (c.minZ + c.maxZ) / 2, cx = (c.minX + c.maxX) / 2;
    if (cz < -38 && Math.abs(cx) < 30 && (c.maxX - c.minX) > 2.5) W.colliders.splice(i, 1);
  }
  if (W.colliders.length === antes) throw new Error('MUTANTE mata-furada NÃO APLICOU: nenhuma parede de mata encontrada');
}
if (MUT === 'chao-constante') W.groundHeightAt = () => 0;
if (MUT === 'comida-fora') {
  exige(W.foodSpots?.length >= 2, 'MUTANTE comida-fora NÃO APLICOU: sem foodSpots');
  W.foodSpots[0] = { ...W.foodSpots[0], x: -48, z: -48 };
  W.foodSpots[1] = { ...W.foodSpots[1], z: 51 };
}
if (MUT === 'trilha-solta') {
  const portas = (W.lojas || []).map((l) => l.porta);
  exige(portas.length, 'MUTANTE trilha-solta NÃO APLICOU: o mapa não expôs as lojas');
  let cortados = 0;
  const nos = W.waypoints.nodes, adj = W.waypoints.adj;
  for (let i = 0; i < nos.length; i++) {
    if (!portas.some((p) => Math.hypot(nos[i].x - p.x, nos[i].z - p.z) < 1.8)) continue;
    for (const j of adj[i]) { const k = adj[j].indexOf(i); if (k >= 0) adj[j].splice(k, 1); }
    adj[i].length = 0; cortados++;
  }
  exige(cortados > 0, 'MUTANTE trilha-solta NÃO APLICOU: nenhum nó de porta encontrado');
}

/* ------------------------------------------------- varredura a pé (MATA1) */
const B = W.bounds;
const gh = W.groundHeightAt;
const nX = Math.ceil((B.maxX - B.minX) / PASSO) + 1;
const nZ = Math.ceil((B.maxZ - B.minZ) / PASSO) + 1;
const GX = (i) => B.minX + i * PASSO, GZ = (j) => B.minZ + j * PASSO;
const gid = (i, j) => i * nZ + j;
const cacheLivre = new Int8Array(nX * nZ).fill(-1);
const livre = (i, j) => {
  if (i < 0 || j < 0 || i >= nX || j >= nZ) return false;
  const k = gid(i, j);
  if (cacheLivre[k] < 0) {
    const x = GX(i), z = GZ(j), p = { x, y: gh(x, z), z };
    jogo._collide(p, R_CORPO);
    cacheLivre[k] = (Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6) ? 1 : 0;
  }
  return cacheLivre[k] === 1;
};
const alcancado = new Uint8Array(nX * nZ);
let maiorRaio = 0, pontoMaisLonge = null, celulas = 0;
{
  const partidas = [[0, 11], [0, -11], [11, 0], [-11, 0], [0, 0]];
  const fila = [];
  for (const [x, z] of partidas) {
    const i = Math.round((x - B.minX) / PASSO), j = Math.round((z - B.minZ) / PASSO);
    if (livre(i, j) && !alcancado[gid(i, j)]) { alcancado[gid(i, j)] = 1; fila.push(i, j); }
  }
  for (let h = 0; h < fila.length; h += 2) {
    const i = fila[h], j = fila[h + 1];
    const y0 = gh(GX(i), GZ(j));
    celulas++;
    const r = Math.max(Math.abs(GX(i)), Math.abs(GZ(j)));
    if (r > maiorRaio) { maiorRaio = r; pontoMaisLonge = [+GX(i).toFixed(1), +GZ(j).toFixed(1)]; }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj, k = gid(a, b);
      if (a < 0 || b < 0 || a >= nX || b >= nZ || alcancado[k] || !livre(a, b)) continue;
      if (Math.abs(gh(GX(a), GZ(b)) - y0) > DEGRAU) continue;
      alcancado[k] = 1; fila.push(a, b);
    }
  }
}
relatorio.escape = { maiorRaio: +maiorRaio.toFixed(1), pontoMaisLonge, celulas };

regra('MATA1 a mata fecha o mapa: ninguém chega na borda a pé', () => {
  exige(celulas > 4000, `varredura degenerada: só ${celulas} células alcançadas — o teste não mediu nada`);
  exige(maiorRaio <= LIMITE_ESCAPE,
    `ponto alcançável a ${maiorRaio.toFixed(1)} m do centro em ${JSON.stringify(pontoMaisLonge)} ` +
    `(teto ${LIMITE_ESCAPE} m, borda do mapa ${B.maxX} m). A mata está furada: o jogador sai da cidade.`);
  return `${celulas} células andáveis, a mais longe a ${maiorRaio.toFixed(1)} m`;
});

regra('MATA2 cinturão denso e 8 a 10 bocas nos quatro lados', () => {
  const c = W.censo || {};
  exige(c.arvores >= 900, `só ${c.arvores} árvores no cinturão (piso 900)`);
  exige(c.subbosque >= 2000, `só ${c.subbosque} peças de sub-bosque (piso 2000): a parede fecha por sub-bosque`);
  exige(c.colisoresParede >= 80, `só ${c.colisoresParede} colisores de parede de mata (piso 80)`);
  exige(c.instanciados <= 14, `${c.instanciados} InstancedMesh na mata (teto 14): mata tem de ser lote, não malha por árvore`);
  const bocas = W.boarEntrances || [];
  exige(bocas.length >= 8 && bocas.length <= 10, `${bocas.length} bocas de mata (faixa 8 a 10)`);
  const lados = new Set();
  for (const b of bocas) {
    exige(Number.isFinite(b.x) && Number.isFinite(b.z), `boca sem x/z: ${JSON.stringify(b)}`);
    const r = Math.max(Math.abs(b.x), Math.abs(b.z));
    exige(r > 40, `boca em (${b.x}, ${b.z}) está a ${r.toFixed(1)} m: boca de mata nasce no cinturão, não na cidade`);
    lados.add(Math.abs(b.z) >= Math.abs(b.x) ? (b.z < 0 ? 'N' : 'S') : (b.x < 0 ? 'O' : 'L'));
  }
  exige(lados.size === 4, `as bocas cobrem só ${[...lados].join('/')}: o cerco precisa de saída nos quatro lados`);
  return `${c.arvores} árvores, ${c.colisoresParede} colisores de parede, ${bocas.length} bocas`;
});

/* ------------------------------------------------------------ chão (CHAO1) */
const marcadoNaoSolido = (o) => { for (let n = o; n; n = n.parent) if (n.userData?.nonSolidSurface === true) return true; return false; };
const raio = new THREE.Raycaster();
raio.camera = jogo.camera;
const sonda = (x, z) => {
  const chao = gh(x, z);
  raio.set(new THREE.Vector3(x, chao + PEITO, z), new THREE.Vector3(0, -1, 0));
  raio.far = PEITO - 0.01;
  for (const h of raio.intersectObject(W.root, true)) {
    if (!h.object?.isMesh || h.object.isSprite || marcadoNaoSolido(h.object)) continue;
    return { pen: Math.max(0, h.point.y - chao), nome: h.object.name || '(sem nome)' };
  }
  return { pen: 0, nome: null };
};

regra('CHAO1 groundHeightAt tem relevo e bate com a malha visível', () => {
  const rua = gh(0, 10), calcada = gh(7, 10), barranco = gh(0, -46), leito = gh(0, -39);
  exige(calcada - rua > 0.08, `calçada (${calcada.toFixed(2)} m) não sobe sobre a rua (${rua.toFixed(2)} m): o chão é chapado`);
  exige(barranco > 2.0, `barranco do cinturão a ${barranco.toFixed(2)} m (piso 2,0): a cidade não está encaixada`);
  exige(barranco - leito > 1.0, `córrego a ${leito.toFixed(2)} m contra platô ${barranco.toFixed(2)} m: não há leito`);
  const soleiras = (W.lojas || []).map((l) => gh(l.interior[0], l.interior[1]));
  exige(soleiras.length >= 4, `o mapa expôs ${soleiras.length} lojas (piso 4)`);
  for (const s of soleiras) exige(s > 0.25, `piso de loja a ${s.toFixed(2)} m: sem soleira o bicho entra por baixo`);

  let amostras = 0, pior = 0, ondePior = null;
  for (let i = 0; i < nX; i += 3) for (let j = 0; j < nZ; j += 3) {
    if (!alcancado[gid(i, j)]) continue;
    amostras++;
    const s = sonda(GX(i), GZ(j));
    if (s.pen > pior) { pior = s.pen; ondePior = [+GX(i).toFixed(1), +GZ(j).toFixed(1), s.nome]; }
  }
  relatorio.chao = { amostras, piorPenetracao: +pior.toFixed(3), ondePior };
  exige(amostras > 400, `só ${amostras} amostras de chão andável`);
  exige(pior <= PEN_MAX,
    `penetração de ${pior.toFixed(2)} m em ${JSON.stringify(ondePior)}: a altura devolvida não é a do chão ` +
    'desenhado, que é o "javaporco indo por baixo da terra" do relato.');
  return `${amostras} sondas, pior penetração ${pior.toFixed(3)} m; rua ${rua.toFixed(2)} / calçada ${calcada.toFixed(2)} / barranco ${barranco.toFixed(2)} / leito ${leito.toFixed(2)} m`;
});

/* ----------------------------------------------------------- comida (COMIDA1) */
regra('COMIDA1 lixo e comida dentro da cidade, com malha e colisor vivos', () => {
  const spots = W.foodSpots || [];
  const cb = W.cityBounds;
  exige(cb && Number.isFinite(cb.minX), 'o mapa não expôs cityBounds');
  exige(spots.length >= 12 && spots.length <= 20, `${spots.length} foodSpots (faixa 12 a 20)`);
  const KINDS = new Set(['lixo', 'feira', 'cacamba', 'racao']);
  const quadrantes = new Set();
  for (const s of spots) {
    exige(KINDS.has(s.kind), `foodSpot ${s.id} com kind "${s.kind}" fora do contrato`);
    exige(s.hp > 0, `foodSpot ${s.id} sem hp`);
    exige(s.r >= 0.5 && s.r <= 2.5, `foodSpot ${s.id} com r = ${s.r} fora da faixa de focinho (0,5 a 2,5 m)`);
    exige(s.x > cb.minX && s.x < cb.maxX && s.z > cb.minZ && s.z < cb.maxZ,
      `foodSpot ${s.id} em (${s.x}, ${s.z}) está FORA de cityBounds: a horda não revira a cidade, revira o mato`);
    exige(W.foodMesh(s.id)?.isObject3D, `foodMesh("${s.id}") não devolveu Object3D`);
    const col = W.foodCollider(s.id);
    exige(col && W.colliders.includes(col), `foodCollider("${s.id}") não é um colisor VIVO do mundo`);
    quadrantes.add(`${s.x < 0 ? 'O' : 'L'}${s.z < 0 ? 'N' : 'S'}`);
  }
  exige(quadrantes.size === 4, `comida só nos quadrantes ${[...quadrantes].join('/')}: a horda tem de achar lixo em qualquer entrada`);
  const porKind = {};
  for (const s of spots) porKind[s.kind] = (porKind[s.kind] || 0) + 1;
  for (const k of KINDS) exige(porKind[k] >= 1, `nenhum foodSpot do tipo ${k}`);
  relatorio.comida = { total: spots.length, porKind };
  return `${spots.length} pontos: ${Object.entries(porKind).map(([k, v]) => `${v} ${k}`).join(', ')}`;
});

/* ---------------------------------------------------------- trilhas (TRILHA) */
const perto = (no, x, z) => Math.hypot(no.x - x, no.z - z);
const alcanca = (de, para) => {
  const caminho = W.findPath(de, para);
  return caminho.length > 1 && caminho[caminho.length - 1] === para;
};

/* Nó dentro de sólido é destino que ninguém alcança, e aresta cruzando muro é bicho
   empurrando tijolo. As duas foram relatadas pelo modo depois de 270 s de horda real. */
const dentroDeSolido = (x, z) => {
  const y = gh(x, z);
  for (const c of W.colliders) {
    if (x <= c.minX || x >= c.maxX || z <= c.minZ || z >= c.maxZ) continue;
    if (y + 1.4 <= c.minY || y + 0.3 >= c.maxY) continue;
    if (c.ry) {
      const wx = x - c.cx, wz = z - c.cz;
      const lx = wx * c.cos - wz * c.sin, lz = wx * c.sin + wz * c.cos;
      if (Math.abs(lx) >= c.hx || Math.abs(lz) >= c.hz) continue;
    }
    return c;
  }
  return null;
};

regra('NAV1 nenhum nó dentro de sólido e nenhuma aresta cruzando muro', () => {
  const nos = W.waypoints.nodes, adj = W.waypoints.adj;
  exige(nos.length > 3000, `grade com só ${nos.length} nós: fina demais para calçada de 2 m`);
  const presos = [];
  for (let i = 0; i < nos.length; i++) {
    if (dentroDeSolido(nos[i].x, nos[i].z)) presos.push([+nos[i].x.toFixed(1), +nos[i].z.toFixed(1)]);
  }
  exige(!presos.length, `${presos.length} nó(s) dentro de colisor, ex.: ${JSON.stringify(presos.slice(0, 5))}`);
  let arestas = 0, cruzando = 0;
  for (let i = 0; i < nos.length; i++) for (const j of adj[i]) {
    if (j < i) continue;
    arestas++;
    if (dentroDeSolido((nos[i].x + nos[j].x) / 2, (nos[i].z + nos[j].z) / 2)) cruzando++;
  }
  exige(cruzando === 0, `${cruzando} de ${arestas} arestas passam por dentro de colisor`);
  relatorio.nav = { nos: nos.length, arestas };
  return `${nos.length} nós, ${arestas} arestas, 0 presos, 0 cruzando`;
});

regra('TRILHA1 da boca de mata até os três objetivos', () => {
  const nos = W.waypoints.nodes;
  const falhou = [];
  for (const o of W.hordeObjectives) {
    exige(o.r > 1.5 && o.r < 8, `objetivo ${o.id} com r = ${o.r}: sem raio o bando bate na parede`);
    const destino = W.nearestWaypoint(o.x, o.z);
    exige(perto(nos[destino], o.x, o.z) <= o.r,
      `objetivo ${o.id} em (${o.x}, ${o.z}) tem nó mais perto a ${perto(nos[destino], o.x, o.z).toFixed(2)} m, além do próprio r`);
  }
  for (const b of W.boarEntrances) {
    const origem = W.nearestWaypoint(b.x, b.z);
    exige(perto(nos[origem], b.x, b.z) < 4.0,
      `boca ${b.id || ''} (${b.x}, ${b.z}) não tem nó de navegação a menos de 4 m — a horda nasce fora do grafo`);
    for (const o of W.hordeObjectives) {
      const destino = W.nearestWaypoint(o.x, o.z);
      if (!alcanca(origem, destino)) falhou.push(`${b.id || `${b.x},${b.z}`} -> ${o.id}`);
    }
  }
  exige(!falhou.length, `sem rota: ${falhou.slice(0, 6).join(' · ')}`);
  return `${W.boarEntrances.length} bocas × ${W.hordeObjectives.length} objetivos`;
});

regra('TRILHA2 a horda entra DENTRO das lojas', () => {
  const nos = W.waypoints.nodes;
  const lojas = W.lojas || [];
  exige(lojas.length >= 4, `${lojas.length} lojas com interior (piso 4)`);
  const falhou = [];
  for (const l of lojas) {
    const dentro = W.nearestWaypoint(l.interior[0], l.interior[1]);
    exige(perto(nos[dentro], l.interior[0], l.interior[1]) < 2.0,
      `a loja ${l.papel} não tem nó de navegação no interior (mais perto: ${perto(nos[dentro], l.interior[0], l.interior[1]).toFixed(2)} m)`);
    for (const b of W.boarEntrances) {
      const origem = W.nearestWaypoint(b.x, b.z);
      if (!alcanca(origem, dentro)) falhou.push(`${b.id || `${b.x},${b.z}`} -> ${l.papel}`);
    }
  }
  exige(!falhou.length,
    `a porta não está costurada na grade de navegação: ${falhou.slice(0, 6).join(' · ')}`);
  return `${lojas.length} lojas alcançadas das ${W.boarEntrances.length} bocas`;
});

/* ------------------------------------------------------------------ fecho */
relatorio.censo = W.censo;
relatorio.mutante = MUT || null;
const saida = arg('json-out');
if (saida) fs.writeFileSync(saida, `${JSON.stringify(relatorio, null, 2)}\n`);

console.log('');
if (MUT) {
  if (falhas) { console.log(`✓ MUTANTE ${MUT} acendeu ${falhas} cláusula(s) — a régua morde.`); process.exit(0); }
  console.error(`✗ MUTANTE ${MUT} SOBREVIVEU: a régua não mede o que diz medir.`);
  process.exit(1);
}
if (falhas) { console.error(`✗ MAPA DA INVASÃO: ${falhas} cláusula(s) vermelha(s).`); process.exit(1); }
console.log('✓ MAPA DA INVASÃO OK — cerco, relevo, comida e trilhas até dentro da loja.');
