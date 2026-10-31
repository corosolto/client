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
            colisor, e 6 bocas nos 4 lados, a ≥ 40 m uma da outra (eram 10 até 30/10).
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

   LAYOUT DE 30/10/2026 (decisões do dono: pasto entre cidade e mata, seis frentes, becos):
     MATA3  FRENTES FECHADAS: anel de sondas a pé na ENTRADA da parede (v = 55 m, os quatro
            lados). Os arcos livres contíguos são as bocas de verdade — tem de haver
            EXATAMENTE 3, cada um sobre uma frente declarada. Declarar 3 e deixar furo
            aberto na mata é o que esta cláusula pega.
     PASTO1 LINHA DE TIRO: raio horizontal a 1,6 m da borda da cidade (r = 35,8) para fora,
            a cada 2 m dos quatro lados, contra `occluders` + sub-bosque. 85% dos raios têm de correr 17,4 m
            livres (o pasto) e a mediana do primeiro acerto tem de cair na mata (≤ 22 m):
            mede a largura do pasto pela primeira árvore, não pela constante.
     PASTO2 GRAMA DE VERDADE: capim em cartão ≥ 2,5 por m² do anel, touceira ≥ 150 com
            altura ≥ 0,9 m, ≥ 8 cupinzeiros com colisor, ≥ 60 mourões, e o chão do pasto
            com cor por vértice variando (desvio do canal mais variado > 0,03) — não um plano verde liso.
     HORDA1 CONTRATO `world.horda.frentes`: 6 frentes ≥ 40 m uma da outra, boca no fio da
            mata (53 a 55 m), rota da mata (≥ 56 m) até a borda da cidade (35,5 a 36,6 m).
            A rota é caminhada a cada 0,25 m: corpo de 0,45 m sem colisor, degrau ≤ 0,3 m
            por passo e sonda de chão ≤ 0,30 m (o bicho não afunda). A navegação liga a
            ponta da rota à cidade com ≤ 1,6× o comprimento da rota.
     BECO1  `world.horda.becos`: ≥ 4, em ≥ 3 lados, abrem na onda 3; de (anel perimetral)
            até (viela) caminhável com corpo de 0,45 m; corredor de VERDADE — em ≥ 60% das
            sondas do trecho entre muros há parede dos dois lados e a largura livre fica
            entre 2,0 e 3,2 m; e a navegação atravessa (≤ 1,3× a reta).
     SETOR1 `world.horda.setores`: retângulos dentro de cityBounds, sem sobreposição, que
            cobrem ≥ 98% dos nós de navegação da cidade, com peso = área relativa.
     PROPS1 CATÁLOGO: todo id de INVASAO_JAVAPORCOS_PROPS tem GLB em public/models/props,
            nenhum é carro Mint lowpoly (~2,8 k tris, troca pedida em 30/10) nem de licença NC
            (saveiro_robust, byd_dolphin: o dono decide), e há ≥ 3 carros realistas.

   GAUNTLET VISUAL, RODADA 2 (crítico 3/10 em 30/10: céu chapado salmão, sombra laranja,
   mata de icosaedro, mapa flutuando no vazio na vista alta):
     CEU1   o céu é panorama equirretangular 2:1 em disco (setMapSky), não `THREE.Color`; a
            névoa é neutra (b* ≤ 10) e começa longe (near ≥ 60, far ≥ 200), sem engolir a mata.
     LUZ1   hemisfério com céu FRIO (b* < 0) e chão de b* ≤ 15: a sombra é iluminada por ele,
            e céu quente é o que deixava a sombra laranja (b* 17,5 medido). Rodada 4 (crítico
            30/10: "mata ciano, cena lavada" com 0x98b0d0 a 1,7): céu b* entre -15 e -6, chão
            b* ≤ 10 e intensidade 0,85–1,1 (copa 149° → 140°, ΔL sombra/sol do asfalto 10 → 16).
            Rodada 5 (crítico 30/10: "mapa escuro", beco-n L* 27 → 17,6 com 0,95): intensidade
            1,25–1,45 com as mesmas cores (1,35: beco-n 21, ΔL sombra/sol 13, copa 139°).
     MATA4  nenhuma malha `mata-*` é poliedro (icosaedro/dodecaedro/octaedro); a copa é tufo de
            ≥ 8 cartões com alphaTest ≥ 0,3 em DoubleSide; o sub-bosque usa o MESMO material;
            tronco com ≥ 12 lados; ≤ 8 malhas `mata-*`, todas instanciadas (custo de draw call).
     CHAO2  chão `chao-horizonte` de ≥ 600 m nos dois eixos e ≥ 50 copas impostoras além de
            HALF + 20 em cada um dos 4 lados.

   MUTANTES (cada um tem de deixar a régua VERMELHA):
     mata-furada     derruba a parede de colisor do lado norte  -> MATA1, MATA3
     chao-constante  `groundHeightAt` volta a devolver 0 fixo   -> CHAO1, HORDA1
     comida-fora     joga dois foodSpots para dentro da mata    -> COMIDA1
     trilha-solta    corta a costura da porta na navegação      -> TRILHA2
     boca-aberta     abre a parede no sul, longe das frentes    -> MATA3
     mata-avanca     planta uma fileira de mata no meio do pasto leste -> PASTO1
     pasto-careca    zera o capim e a touceira                  -> PASTO2
     rota-no-muro    desvia o meio de uma rota para dentro da mata -> HORDA1
     beco-fechado    entulho de 1 m no meio de cada beco        -> BECO1
     beco-aberto     derruba as paredes de um beco              -> BECO1
     setor-buraco    some com um setor                          -> SETOR1
     carro-mint      põe o fusca Mint de volta no catálogo      -> PROPS1
     ceu-chapado     céu volta a `Color` salmão e névoa 38-150   -> CEU1
     luz-laranja     hemisfério volta ao céu 0xc79872            -> LUZ1
     hemi-ciano      hemisfério volta a 0x98b0d0/0x5a5856 a 1,7  -> LUZ1
     hemi-escuro     hemisfério volta a 0,95 (beco-n L* 17,6)    -> LUZ1
     copa-bola       copa volta a IcosahedronGeometry opaca      -> MATA4
     mata-sem-lote   30 copas soltas, uma malha cada             -> MATA4
     mapa-flutuando  tira o chão do horizonte e a mata impostora -> CHAO2

   Uso: node tools/eval/javaporcos-mapa-check.mjs [--mutante=X] [--json-out=arq]
   ============================================================================ */
import fs from 'node:fs';
import { THREE, initTextures, bootGame } from './harness.mjs';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
const MUTANTES = ['hemi-ciano', 'hemi-escuro', 'mata-furada', 'chao-constante', 'comida-fora', 'trilha-solta', 'boca-aberta', 'mata-avanca',
  'pasto-careca', 'rota-no-muro', 'beco-fechado', 'beco-aberto', 'setor-buraco', 'carro-mint',
  'ceu-chapado', 'luz-laranja', 'copa-bola', 'mata-sem-lote', 'mapa-flutuando'];
const CIDADE = await import('./javaporcos-cidade-regras.mjs');   // ICO1, JANELA1, CARRO1, POSTE1, DECAL1
const MATA = await import('./javaporcos-mata-regras.mjs');       // TRILHA3, MATA5, CUPIM1
if (MUT && ![...MUTANTES, ...CIDADE.MUTANTES, ...MATA.MUTANTES].includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT}. Há: ${[...MUTANTES, ...CIDADE.MUTANTES, ...MATA.MUTANTES].join(', ')}`);
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
/* 64 m: a clareira mais funda fica a 62,6 m do centro (59,6 + raio 3,0), e a borda do
   mapa está em 68. Entre 62,6 e 68 sobram 5,4 m de mata que ninguém atravessa. */
const LIMITE_ESCAPE = 64;
const CIDADE_R = 36, MATA_R = 54, V_SONDA_PAREDE = 63.8;   // 0,4 m dentro do começo da parede (54,6)
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
if (MUT === 'boca-aberta') {
  const antes = W.colliders.length;
  for (let i = W.colliders.length - 1; i >= 0; i--) {
    const c = W.colliders[i];
    if (c.maxZ > 44 && c.minX < 16 && c.maxX > 8) W.colliders.splice(i, 1);
  }
  if (W.colliders.length === antes) throw new Error('MUTANTE boca-aberta NÃO APLICOU');
}
if (MUT === 'mata-avanca') {
  const muro = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 66), new THREE.MeshBasicMaterial());
  muro.position.set(40, 3, 0); W.root.add(muro); muro.updateMatrixWorld(true); W.occluders.push(muro);
}
if (MUT === 'pasto-careca') {
  let n = 0;
  W.root.traverse((o) => { if (o.isInstancedMesh && /^pasto-(capim|touceira)$/.test(o.name)) { o.count = 0; n++; } });
  exige(n >= 2, 'MUTANTE pasto-careca NÃO APLICOU');
}
if (MUT === 'rota-no-muro') {
  const f = W.horda?.frentes?.[0];
  exige(f && f.rota.length > 3, 'MUTANTE rota-no-muro NÃO APLICOU: sem rota');
  f.rota[1] = { x: f.rota[1].x + 7, z: f.rota[1].z - 1.5 };
}
if (MUT === 'beco-fechado') {
  for (const b of W.horda?.becos || []) {
    const x = (b.de.x + b.ate.x) / 2, z = (b.de.z + b.ate.z) / 2;
    W.colliders.push({ minX: x - 0.9, maxX: x + 0.9, minY: -1, maxY: 1.2, minZ: z - 0.9, maxZ: z + 0.9 });
  }
  exige(W.horda?.becos?.length, 'MUTANTE beco-fechado NÃO APLICOU');
}
if (MUT === 'beco-aberto') {
  const b = W.horda?.becos?.[0];
  exige(b, 'MUTANTE beco-aberto NÃO APLICOU');
  const x0 = Math.min(b.de.x, b.ate.x) - 2.2, x1 = Math.max(b.de.x, b.ate.x) + 2.2;
  const z0 = Math.min(b.de.z, b.ate.z) - 2.2, z1 = Math.max(b.de.z, b.ate.z) + 2.2;
  for (let i = W.colliders.length - 1; i >= 0; i--) {
    const c = W.colliders[i];
    if (c.maxX > x0 && c.minX < x1 && c.maxZ > z0 && c.minZ < z1) W.colliders.splice(i, 1);
  }
}
if (MUT === 'setor-buraco') { exige(W.horda?.setores?.length, 'MUTANTE setor-buraco NÃO APLICOU'); W.horda.setores.shift(); }
const malhaNomeada = (nome) => { let m = null; W.root.traverse((o) => { if (o.name === nome) m = o; }); return m; };
if (MUT === 'ceu-chapado') {
  delete jogo.scene.userData.skySource; delete jogo.scene.userData.skyUrl;
  jogo.scene.background = new THREE.Color(0xbb8559); jogo.scene.fog = new THREE.Fog(0xc08b60, 38, 150);
}
if (MUT === 'luz-laranja') { exige(W.hemi, 'MUTANTE luz-laranja NÃO APLICOU: sem hemi'); W.hemi.color.set(0xc79872); }
if (MUT === 'hemi-ciano') { exige(W.hemi, 'MUTANTE hemi-ciano NÃO APLICOU: sem hemi'); W.hemi.color.set(0x98b0d0); W.hemi.groundColor.set(0x5a5856); W.hemi.intensity = 1.7; }
if (MUT === 'hemi-escuro') { exige(W.hemi, 'MUTANTE hemi-escuro NÃO APLICOU: sem hemi'); W.hemi.intensity = 0.95; }
if (MUT === 'copa-bola') {
  const c = malhaNomeada('mata-copa');
  exige(c, 'MUTANTE copa-bola NÃO APLICOU: sem mata-copa');
  c.geometry = new THREE.IcosahedronGeometry(1, 1); c.material = new THREE.MeshStandardMaterial();
}
if (MUT === 'mata-sem-lote') {
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial());
    m.name = 'mata-copa-solta'; m.position.set(-50 + i * 3, 8, -52); W.root.add(m); m.updateMatrixWorld(true);
  }
}
if (MUT === 'mapa-flutuando') {
  const chao = malhaNomeada('chao-horizonte'), c = malhaNomeada('mata-copa-horizonte');
  exige(chao && c && W.censo?.copasHorizonte, 'MUTANTE mapa-flutuando NÃO APLICOU');
  chao.parent.remove(chao); W.root.traverse(o=>{if(o.name === 'mata-copa-horizonte')o.count=0;});
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

/* Os pisos de densidade foram medidos no cinturão de 22 m (1.212 árvores); com a mata
   começando em r = 44 o anel tem 69% da área, e 935 árvores ainda passam do piso de 900. A
   contagem de colisor de parede deixou de ser densidade: com 3 bocas a parede funde em
   menos caixas (28), e quem prova que ela fecha é a MATA1 e a MATA3. */
regra('MATA2 cinturão denso e seis frentes separadas', () => {
  const c = W.censo || {};
  exige(c.arvores >= 900, `só ${c.arvores} árvores no cinturão (piso 900)`);
  exige(c.subbosque >= 2000, `só ${c.subbosque} peças de sub-bosque (piso 2000): a parede fecha por sub-bosque`);
  exige(c.colisoresParede >= 12, `só ${c.colisoresParede} colisores de parede de mata (piso 12, três por lado)`);
  exige(c.instanciados <= 14, `${c.instanciados} InstancedMesh na mata (teto 14): mata tem de ser lote, não malha por árvore`);
  const bocas = W.boarEntrances || [];
  exige(bocas.length === 6, `${bocas.length} bocas de mata (o dono pediu seis frentes)`);
  const lados = new Set();
  for (const b of bocas) {
    exige(Number.isFinite(b.x) && Number.isFinite(b.z), `boca sem x/z: ${JSON.stringify(b)}`);
    const r = Math.max(Math.abs(b.x), Math.abs(b.z));
    exige(r > MATA_R + 2, `boca em (${b.x}, ${b.z}) está a ${r.toFixed(1)} m: a clareira nasce dentro da mata`);
    lados.add(Math.abs(b.z) >= Math.abs(b.x) ? (b.z < 0 ? 'N' : 'S') : (b.x < 0 ? 'O' : 'L'));
  }
  exige(lados.size === 4, `as seis bocas estão em só ${lados.size} lado(s): frente tem de ser frente`);
  for (let i = 0; i < bocas.length; i++) for (let k = i + 1; k < bocas.length; k++) {
    const d = Math.hypot(bocas[i].x - bocas[k].x, bocas[i].z - bocas[k].z);
    exige(d >= 40, `bocas ${bocas[i].id} e ${bocas[k].id} a ${d.toFixed(1)} m (piso 40)`);
  }
  return `${c.arvores} árvores, ${c.colisoresParede} colisores de parede, ${bocas.length} bocas em ${[...lados].join('/')}`;
});

/* Anel de sondas DENTRO da parede: arco livre contíguo é boca que existe no chão, seja
   ela declarada ou não. A sonda usa o `_collide` do jogo, a mesma do MATA1. */
const paraMundo = (lado, u, v) => (lado === 'N' ? [u, -v] : lado === 'S' ? [u, v] : lado === 'O' ? [-v, u] : [v, u]);
const livreEm = (x, z) => { const p = { x, y: gh(x, z), z }; jogo._collide(p, R_CORPO); return Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6; };
regra('MATA3 mata explorável por dentro e limite externo fechado', () => {
  const arcos = [];
  for (const lado of ['N', 'L', 'S', 'O']) {
    let aberto = null;
    for (let u = -V_SONDA_PAREDE; u <= V_SONDA_PAREDE + 1e-6; u += 0.5) {
      const [x, z] = paraMundo(lado, u, V_SONDA_PAREDE);
      if (livreEm(x, z)) { if (!aberto) aberto = { lado, u0: u, pts: [] }; aberto.pts.push([x, z]); }
      else if (aberto) { aberto.u1 = u; arcos.push(aberto); aberto = null; }
    }
    if (aberto) { aberto.u1 = V_SONDA_PAREDE; arcos.push(aberto); }
  }
  const frentes = W.horda?.frentes || [];
  relatorio.arcosAbertos = arcos.map((a) => ({ lado: a.lado, u0: a.u0, u1: a.u1 }));
  exige(arcos.length === 0, `${arcos.length} aberturas no limite externo da mata`);
  let andaveis = 0, sondas = 0;
  for (const lado of ['N', 'L', 'S', 'O']) for (let u = -50; u <= 50; u += 2) {
    const [x,z] = paraMundo(lado,u,58); sondas++;
    if (livreEm(x,z)) andaveis++;
  }
  exige(andaveis / sondas >= .45, `mata explorável bloqueada: ${andaveis}/${sondas}`);
  for (const a of arcos) {
    const [mx, mz] = a.pts[(a.pts.length / 2) | 0];
    const dono = frentes.find((f) => f.rota.some((p) => Math.hypot(p.x - mx, p.z - mz) < 4.5));
    exige(dono, `arco aberto ${a.lado}[${a.u0}..${a.u1}] não pertence a nenhuma frente declarada`);
  }
  return `${arcos.length} arcos abertos: ${arcos.map((a) => `${a.lado} ${(a.u1 - a.u0).toFixed(1)} m`).join(', ')}`;
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
  const rua = gh(0, 10), calcada = gh(7, 10), barranco = gh(0, -62);
  let leito = Infinity;
  for (let z = -46; z <= -37; z += 0.25) leito = Math.min(leito, gh(0, z));
  exige(calcada - rua > 0.08, `calçada (${calcada.toFixed(2)} m) não sobe sobre a rua (${rua.toFixed(2)} m): o chão é chapado`);
  exige(barranco > 2.0, `barranco do cinturão a ${barranco.toFixed(2)} m (piso 2,0): a cidade não está encaixada`);
  exige(barranco - leito > 1.0, `córrego a ${leito.toFixed(2)} m contra platô ${barranco.toFixed(2)} m: não há leito`);
  exige(gh(0, -37) - leito > 0.5, `córrego a ${leito.toFixed(2)} m não afunda no pasto (borda a ${gh(0, -37).toFixed(2)} m)`);
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
  const rua = spots.filter(s => !s.loja);
  exige(rua.length >= 12 && rua.length <= 20, `${rua.length} foodSpots de rua (faixa 12 a 20)`);
  exige(spots.filter(s => s.loja).length === W.lojas.length, 'cada loja precisa de um ponto de saque');
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

/* --------------------------------------------------------- pasto (PASTO) */
const temNome = (o, re) => { for (let n = o; n; n = n.parent) if (re.test(n.name || '')) return true; return false; };
regra('PASTO1 linha de tiro aberta da borda da cidade até a mata', () => {
  const rc = new THREE.Raycaster();
  rc.camera = jogo.camera;
  const alvos = W.occluders.filter((o) => o.isMesh);
  W.root.traverse((o) => { if (o.name === 'mata-subbosque') alvos.push(o); });
  const dists = [];
  let livres = 0;
  for (const lado of ['N', 'L', 'S', 'O']) {
    for (let u = -34; u <= 34; u += 2) {
      const [x, z] = paraMundo(lado, u, CIDADE_R - 0.2);
      const [x2, z2] = paraMundo(lado, u, CIDADE_R + 1);
      const dir = new THREE.Vector3(x2 - x, 0, z2 - z).normalize();
      rc.set(new THREE.Vector3(x, gh(x, z) + 1.6, z), dir);
      rc.far = 30;
      const h = rc.intersectObjects(alvos, false)[0];
      const d = h ? h.distance : 30;
      dists.push(d);
      if (d >= 17.4) livres++;
    }
  }
  dists.sort((a, b) => a - b);
  const mediana = dists[dists.length >> 1], frac = livres / dists.length;
  relatorio.pasto = { raios: dists.length, livres, fracao: +frac.toFixed(3), larguraMediana: +mediana.toFixed(2) };
  exige(frac >= 0.85, `só ${(100 * frac).toFixed(0)}% dos ${dists.length} raios correm 17,4 m livres (piso 85%): o pasto está tomado`);
  exige(mediana <= 22, `mediana do primeiro acerto a ${mediana.toFixed(1)} m (teto 22): os raios não acham a mata, a régua não mediu`);
  return `${livres}/${dists.length} raios livres por 17,4 m; primeiro acerto mediano a ${mediana.toFixed(2)} m da borda`;
});

regra('PASTO2 grama densa, touceira alta, cupinzeiro e cerca', () => {
  const area = (2 * MATA_R) ** 2 - (2 * CIDADE_R) ** 2;
  const achar = (nome) => { let m = null; W.root.traverse((o) => { if (o.name === nome) m = o; }); return m; };
  const capim = achar('pasto-capim'), touc = achar('pasto-touceira');
  const naFaixa = (m, alturaMin) => {
    if (!m?.isInstancedMesh) return 0;
    let n = 0; const mt = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3();
    for (let i = 0; i < m.count; i++) {
      m.getMatrixAt(i, mt); mt.decompose(p, q, e);
      const r = Math.max(Math.abs(p.x), Math.abs(p.z));
      if (r > CIDADE_R && r < MATA_R && e.y >= alturaMin) n++;
    }
    return n;
  };
  let nCapim = 0;W.root.traverse(o=>{if(o.name === 'pasto-capim')nCapim+=naFaixa(o,0);});
  const nTouc = naFaixa(touc, 0.9);
  exige(nCapim / area >= 2.5, `capim a ${(nCapim / area).toFixed(2)}/m² no pasto (piso 2,5): é plano verde, não grama`);
  exige(nTouc >= 150, `${nTouc} touceiras de ≥ 0,9 m no pasto (piso 150)`);
  const cupins = W.cupinzeiros || [];
  exige(cupins.length >= 8, `${cupins.length} cupinzeiros (piso 8)`);
  for (const c of cupins) exige(dentroDeSolido(c.x, c.z), `cupinzeiro em (${c.x}, ${c.z}) sem colisor`);
  exige((W.censo?.mouroes || 0) >= 60, `${W.censo?.mouroes || 0} mourões de cerca (piso 60)`);
  let n = 0;
  const soma = [0, 0, 0], soma2 = [0, 0, 0];
  W.root.traverse((o) => {
    if (o.name !== 'chao-pasto' || !o.geometry?.attributes?.color) return;
    const c = o.geometry.attributes.color;
    for (let i = 0; i < c.count; i++) { n++; for (let k = 0; k < 3; k++) { const v = c.getComponent(i, k); soma[k] += v; soma2[k] += v * v; } }
  });
  const desvio = n ? Math.max(...[0, 1, 2].map((k) => Math.sqrt(Math.max(0, soma2[k] / n - (soma[k] / n) ** 2)))) : 0;
  exige(desvio > 0.03, `cor do chão do pasto com desvio ${desvio.toFixed(3)} (piso 0,03) em ${n} vértices: plano liso`);
  relatorio.grama = { capimPorM2: +(nCapim / area).toFixed(2), touceiras: nTouc, cupinzeiros: cupins.length, mouroes: W.censo?.mouroes, desvioCor: +desvio.toFixed(3) };
  return `${(nCapim / area).toFixed(2)} capim/m², ${nTouc} touceiras ≥ 0,9 m, ${cupins.length} cupinzeiros, ${W.censo?.mouroes} mourões, desvio de cor ${desvio.toFixed(3)}`;
});

/* -------------------------------------------- contrato da horda (HORDA/BECO) */
const R_BICHO = 0.45;
const bloqueado = (x, z) => {
  const y = gh(x, z);
  for (const c of W.colliders) {
    if (x <= c.minX - R_BICHO || x >= c.maxX + R_BICHO || z <= c.minZ - R_BICHO || z >= c.maxZ + R_BICHO) continue;
    if (y + 1.0 <= c.minY || y + 0.25 >= c.maxY) continue;
    if (c.ry) {
      const wx = x - c.cx, wz = z - c.cz;
      const lx = wx * c.cos - wz * c.sin, lz = wx * c.sin + wz * c.cos;
      if (Math.abs(lx) >= c.hx + R_BICHO || Math.abs(lz) >= c.hz + R_BICHO) continue;
    }
    return c;
  }
  return null;
};
/* Caminha a polilinha a cada 0,25 m: colisor no corpo, degrau e sonda de chão. */
const caminha = (pts) => {
  let comp = 0, prevY = null, pior = 0, onde = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 0.25));
    comp += L;
    for (let k = 0; k <= n; k++) {
      const x = a.x + (b.x - a.x) * (k / n), z = a.z + (b.z - a.z) * (k / n), y = gh(x, z);
      const c = bloqueado(x, z);
      if (c) return { erro: `colisor no caminho em (${x.toFixed(1)}, ${z.toFixed(1)})`, comp };
      if (prevY !== null && Math.abs(y - prevY) > 0.3) return { erro: `degrau de ${Math.abs(y - prevY).toFixed(2)} m em (${x.toFixed(1)}, ${z.toFixed(1)})`, comp };
      prevY = y;
      const s = sonda(x, z);
      if (s.pen > pior) { pior = s.pen; onde = [+x.toFixed(1), +z.toFixed(1), s.nome]; }
    }
  }
  if (pior > PEN_MAX) return { erro: `chão visível ${pior.toFixed(2)} m acima do groundHeightAt em ${JSON.stringify(onde)}: o bicho afunda`, comp };
  return { comp, pior };
};
const compCaminho = (cam) => { let L = 0; const nos = W.waypoints.nodes; for (let i = 1; i < cam.length; i++) L += Math.hypot(nos[cam[i]].x - nos[cam[i - 1]].x, nos[cam[i]].z - nos[cam[i - 1]].z); return L; };
const raioDe = (p) => Math.max(Math.abs(p.x), Math.abs(p.z));

regra('HORDA1 seis frentes com rota caminhável da mata até a cidade', () => {
  const H = W.horda;
  exige(H && Array.isArray(H.frentes), 'o mapa não expôs world.horda.frentes');
  const F = H.frentes;
  exige(F.length === 6, `${F.length} frentes (o dono pediu seis)`);
  exige(new Set(F.map((f) => f.id)).size === 6, 'ids de frente repetidos');
  for (let i = 0; i < F.length; i++) for (let k = i + 1; k < F.length; k++) {
    const d = Math.hypot(F[i].boca.x - F[k].boca.x, F[i].boca.z - F[k].boca.z);
    exige(d >= 40, `frentes ${F[i].id} e ${F[k].id} com bocas a ${d.toFixed(1)} m (piso 40)`);
  }
  const linhas = [];
  for (const f of F) {
    exige(typeof f.nome === 'string' && f.nome, `frente ${f.id} sem nome`);
    const rb = raioDe(f.boca);
    exige(rb >= 53 && rb <= 55, `boca da frente ${f.id} a ${rb.toFixed(1)} m (faixa 53 a 55: fio da mata)`);
    exige(f.rota.length >= 3, `rota da frente ${f.id} com ${f.rota.length} pontos`);
    const r0 = raioDe(f.rota[0]), r1 = raioDe(f.rota[f.rota.length - 1]);
    exige(r0 >= 56, `rota ${f.id} começa a ${r0.toFixed(1)} m: tem de sair de dentro da mata (≥ 56)`);
    exige(r1 >= 35.5 && r1 <= 36.6, `rota ${f.id} termina a ${r1.toFixed(1)} m: tem de encostar na cidade (35,5 a 36,6)`);
    exige(f.rota.some((p) => Math.hypot(p.x - f.boca.x, p.z - f.boca.z) < 0.6), `a rota ${f.id} não passa pela própria boca`);
    exige(W.boarEntrances.some((b) => Math.hypot(b.x - f.rota[0].x, b.z - f.rota[0].z) < 0.6), `rota ${f.id} não começa numa boarEntrance`);
    const c = caminha(f.rota);
    exige(!c.erro, `rota ${f.id}: ${c.erro}`);
    const a = W.nearestWaypoint(f.rota[0].x, f.rota[0].z), b = W.nearestWaypoint(f.rota[f.rota.length - 1].x, f.rota[f.rota.length - 1].z);
    const cam = W.findPath(a, b);
    exige(cam.length > 1 && cam[cam.length - 1] === b, `a navegação não liga a clareira ${f.id} à cidade`);
    const L = compCaminho(cam);
    exige(L <= 1.6 * c.comp + 2, `navegação ${f.id} com ${L.toFixed(1)} m contra rota de ${c.comp.toFixed(1)} m: a horda não usa a trilha`);
    linhas.push(`${f.id} ${c.comp.toFixed(1)} m (sonda ${c.pior.toFixed(2)})`);
  }
  relatorio.frentes = F.map((f) => ({ id: f.id, boca: f.boca, rota: f.rota }));
  return linhas.join(' · ');
});

regra('BECO1 becos caminháveis entre paredes, ligando o pasto à rua', () => {
  const B = W.horda?.becos;
  exige(Array.isArray(B), 'o mapa não expôs world.horda.becos');
  exige(B.length >= 4, `${B.length} becos (piso 4)`);
  const lados = new Set();
  const linhas = [];
  for (const b of B) {
    exige(b.abreNaOnda === 3, `beco ${b.id} abre na onda ${b.abreNaOnda} (contrato: 3)`);
    const rd = raioDe(b.de), ra = raioDe(b.ate);
    exige(rd >= 31.5 && rd <= 36.5, `beco ${b.id}: "de" a ${rd.toFixed(1)} m, fora do anel que encosta no pasto`);
    exige(ra < rd - 5, `beco ${b.id}: "ate" a ${ra.toFixed(1)} m não entra na cidade`);
    lados.add(Math.abs(b.de.z) >= Math.abs(b.de.x) ? (b.de.z < 0 ? 'N' : 'S') : (b.de.x < 0 ? 'O' : 'L'));
    const c = caminha([b.de, b.ate]);
    exige(!c.erro, `beco ${b.id}: ${c.erro}`);
    const dx = (b.ate.x - b.de.x) / c.comp, dz = (b.ate.z - b.de.z) / c.comp, nx = -dz, nz = dx;
    let sondas = 0, entreParedes = 0, largMin = Infinity, largMax = 0;
    for (let t = 1.2; t <= c.comp - 1.2; t += 0.5) {
      const x = b.de.x + dx * t, z = b.de.z + dz * t;
      const lateral = (s) => { for (let d = 0; d <= 2.4; d += 0.05) if (dentroDeSolido(x + nx * s * d, z + nz * s * d)) return d; return Infinity; };
      const e = lateral(1), d = lateral(-1);
      sondas++;
      if (Number.isFinite(e) && Number.isFinite(d)) {
        entreParedes++;
        largMin = Math.min(largMin, e + d); largMax = Math.max(largMax, e + d);
      }
    }
    const frac = entreParedes / Math.max(1, sondas);
    exige(frac >= 0.6, `beco ${b.id}: só ${(100 * frac).toFixed(0)}% das sondas têm parede dos dois lados — é terreno aberto, não beco`);
    exige(largMin >= 2.0 && largMax <= 3.2, `beco ${b.id}: largura livre ${largMin.toFixed(2)} a ${largMax.toFixed(2)} m (faixa 2,0 a 3,2)`);
    const a = W.nearestWaypoint(b.de.x, b.de.z), z = W.nearestWaypoint(b.ate.x, b.ate.z);
    const cam = W.findPath(a, z);
    exige(cam.length > 1 && cam[cam.length - 1] === z, `a navegação não atravessa o beco ${b.id}`);
    const L = compCaminho(cam);
    exige(L <= 1.3 * c.comp + 1.5, `navegação do beco ${b.id} com ${L.toFixed(1)} m contra ${c.comp.toFixed(1)} m de reta: dá a volta`);
    linhas.push(`${b.id} ${largMin.toFixed(2)}–${largMax.toFixed(2)} m, ${(100 * frac).toFixed(0)}% entre paredes`);
  }
  exige(lados.size >= 3, `becos em só ${lados.size} lado(s) (piso 3)`);
  relatorio.becos = B;
  return linhas.join(' · ');
});

regra('SETOR1 setores cobrem a cidade sem sobrepor, peso = área', () => {
  const S = W.horda?.setores;
  exige(Array.isArray(S) && S.length >= 4, `${S?.length || 0} setores (piso 4)`);
  const cb = W.cityBounds, total = (cb.maxX - cb.minX) * (cb.maxZ - cb.minZ);
  let soma = 0;
  for (const s of S) {
    exige(s.x0 < s.x1 && s.z0 < s.z1, `setor ${s.id} degenerado`);
    exige(s.x0 >= cb.minX - 1e-6 && s.x1 <= cb.maxX + 1e-6 && s.z0 >= cb.minZ - 1e-6 && s.z1 <= cb.maxZ + 1e-6, `setor ${s.id} sai de cityBounds`);
    const area = (s.x1 - s.x0) * (s.z1 - s.z0);
    exige(Math.abs(s.peso - area / total) < 0.002, `setor ${s.id} com peso ${s.peso} para área relativa ${(area / total).toFixed(4)}`);
    soma += s.peso;
  }
  exige(Math.abs(soma - 1) < 0.01 || S.length < 9, `pesos somam ${soma.toFixed(3)}`);
  for (let i = 0; i < S.length; i++) for (let k = i + 1; k < S.length; k++) {
    const ox = Math.min(S[i].x1, S[k].x1) - Math.max(S[i].x0, S[k].x0), oz = Math.min(S[i].z1, S[k].z1) - Math.max(S[i].z0, S[k].z0);
    exige(!(ox > 1e-6 && oz > 1e-6), `setores ${S[i].id} e ${S[k].id} se sobrepõem`);
  }
  let naCidade = 0, cobertos = 0;
  for (const n of W.waypoints.nodes) {
    if (n.x < cb.minX || n.x > cb.maxX || n.z < cb.minZ || n.z > cb.maxZ) continue;
    naCidade++;
    if (S.some((s) => n.x >= s.x0 && n.x <= s.x1 && n.z >= s.z0 && n.z <= s.z1)) cobertos++;
  }
  const frac = cobertos / Math.max(1, naCidade);
  exige(frac >= 0.98, `setores cobrem ${(100 * frac).toFixed(1)}% dos ${naCidade} nós da cidade (piso 98%)`);
  relatorio.setores = S;
  return `${S.length} setores, ${(100 * frac).toFixed(1)}% dos ${naCidade} nós da cidade, pesos somam ${soma.toFixed(3)}`;
});

/* ---------------------------------------------------------- props (PROPS1) */
const { INVASAO_JAVAPORCOS_PROPS } = await import('../../public/js/map_invasao_javaporcos.js');
regra('PROPS1 catálogo realista: sem carro Mint lowpoly, sem licença NC', () => {
  const lista = [...INVASAO_JAVAPORCOS_PROPS, ...(MUT === 'carro-mint' ? ['fusca'] : [])];
  const MINT = ['fusca', 'chevette', 'saveiro', 'opala', 'kombi', 'brasilia_vw'], NC = CIDADE.CARROS_NC;
  const proibido = lista.filter((id) => MINT.includes(id) || NC.includes(id));
  exige(!proibido.length, `catálogo com ${proibido.join(', ')} (Mint lowpoly ou licença NC)`);
  const faltando = lista.filter((id) => !fs.existsSync(new URL(`../../public/models/props/${id}.glb`, import.meta.url)));
  exige(!faltando.length, `sem GLB no disco: ${faltando.join(', ')}`);
  const carros = lista.filter((id) => CIDADE.CARROS_COMERCIAIS.includes(id));
  exige(carros.length >= 3, `só ${carros.length} carro(s) realista(s) no catálogo`);
  return `${lista.length} ids com GLB, ${carros.length} carros realistas`;
});

/* ------------------------------------------------- céu, luz e mata (CEU/LUZ/MATA4/CHAO2) */
const labB = (cor) => {
  const lin = [cor.r, cor.g, cor.b];   // THREE.Color guarda linear
  const X = (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.9505;
  const Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  const Z = (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.089;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return 200 * (f(Y) - f(Z));
};
const dimWebp = (arq) => {
  const b = fs.readFileSync(arq);
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (tipo === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (tipo === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return [0, 0];
};
regra('CEU1 céu é panorama 2:1 em disco e a névoa não engole a mata', () => {
  const src = jogo.scene.userData.skySource;
  exige(src?.kind === 'webp' && src.url, `céu sem panorama (skySource = ${JSON.stringify(src || null)}): fundo chapado de cor única`);
  const arq = new URL(`../../public${src.url}`, import.meta.url);
  exige(fs.existsSync(arq), `panorama ${src.url} não está no disco`);
  const [w, h] = dimWebp(arq);
  exige(w >= 2048 && w === 2 * h, `panorama ${w}×${h}: precisa ser equirretangular 2:1 com ≥ 2048 px`);
  const fog = jogo.scene.fog;
  exige(fog?.isFog, 'sem névoa linear');
  const b = labB(fog.color);
  exige(b <= 10, `névoa com b* ${b.toFixed(1)} (teto 10): salmão`);
  exige(fog.near >= 60 && fog.far >= 200, `névoa de ${fog.near} a ${fog.far} m (piso 60 e 200): engole a mata a 14 m da borda`);
  relatorio.ceu = { url: src.url, w, h, nevoaB: +b.toFixed(1), near: fog.near, far: fog.far };
  return `${src.url} ${w}×${h}, névoa b* ${b.toFixed(1)} de ${fog.near} a ${fog.far} m`;
});
regra('LUZ1 hemisfério de céu frio: a sombra não sai laranja', () => {
  exige(W.hemi?.isHemisphereLight, 'mundo sem hemi');
  const bc = labB(W.hemi.color), bg = labB(W.hemi.groundColor);
  exige(bc < 0, `céu do hemisfério com b* ${bc.toFixed(1)} (teto 0): luz de sombra quente`);
  exige(bc >= -15 && bc <= -6, `céu do hemisfério com b* ${bc.toFixed(1)} (faixa -15 a -6): abaixo a copa vira ciano`);
  exige(bg <= 10, `chão do hemisfério com b* ${bg.toFixed(1)} (teto 10)`);
  const i = W.hemi.intensity;
  exige(i >= 1.25, `hemisfério a ${i} (mínimo 1,25): abaixo o beco cai a L* 18 e metade dele fica abaixo de L* 15`);
  exige(i <= 1.45, `hemisfério a ${i} (teto 1,45): acima lava a cena e a sombra some`);
  relatorio.luz = { hemiCeuB: +bc.toFixed(1), hemiChaoB: +bg.toFixed(1), hemiInt: i, sol: W.sun?.intensity };
  return `hemi céu b* ${bc.toFixed(1)}, chão b* ${bg.toFixed(1)}, intensidade ${i}`;
});
regra('MATA4 copa de cartão de folha, tronco redondo e mata em lote', () => {
  const POLI = /Icosahedron|Dodecahedron|Octahedron|Tetrahedron/;
  const malhas = [];
  W.root.traverse((o) => { if (o.isMesh && /^mata-/.test(o.name)) malhas.push(o); });
  const poli = malhas.filter((m) => POLI.test(m.geometry?.type || ''));
  exige(!poli.length, `${poli.map((m) => `${m.name} (${m.geometry.type})`).join(', ')}: faceta de poliedro`);
  const copa = malhas.find((m) => m.name === 'mata-copa'), sub = malhas.find((m) => m.name === 'mata-subbosque');
  exige(copa?.isInstancedMesh, 'sem mata-copa instanciada');
  const g = copa.geometry, tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
  exige(tris >= 16, `tufo da copa com ${tris} triângulos (piso 16 = 8 cartões)`);
  exige((copa.material.alphaTest || 0) >= 0.3 && copa.material.side === THREE.DoubleSide,
    `copa sem recorte de folha (alphaTest ${copa.material.alphaTest}, side ${copa.material.side})`);
  exige(sub && sub.material === copa.material, 'sub-bosque com material próprio: cartão em poucos materiais');
  const tronco = malhas.find((m) => m.name === 'mata-troncos');
  const lados = tronco?.geometry?.parameters?.radialSegments || 0;
  exige(lados >= 12, `tronco com ${lados} lados (piso 12)`);
  const soltas = malhas.filter((m) => !m.isInstancedMesh);
  exige(malhas.length <= 125 && !soltas.length, `${malhas.length} malhas mata-* (teto 125 com horizonte em células de 64 m), ${soltas.length} fora de lote`);
  relatorio.mata4 = { malhas: malhas.length, trisTufo: tris, ladosTronco: lados, instanciasCopa: copa.count };
  return `${malhas.length} malhas mata-*, tufo de ${tris} tri, alphaTest ${copa.material.alphaTest}, tronco ${lados} lados`;
});
regra('CHAO2 o mapa não flutua: chão e mata até o horizonte', () => {
  const chao = malhaNomeada('chao-horizonte');
  exige(chao, 'sem chao-horizonte');
  chao.geometry.computeBoundingBox();
  const bb = chao.geometry.boundingBox;
  exige(bb.max.x - bb.min.x >= 600 && bb.max.z - bb.min.z >= 600, `chão do horizonte ${(bb.max.x - bb.min.x).toFixed(0)}×${(bb.max.z - bb.min.z).toFixed(0)} m (piso 600)`);
  const copa = malhaNomeada('mata-copa-horizonte');
  const lados = { N: 0, S: 0, O: 0, L: 0 };
  const mt = new THREE.Matrix4(), p = new THREE.Vector3();
  const horizonte = [];W.root.traverse(o=>{if(o.name === 'mata-copa-horizonte')horizonte.push(o);});
  for (const lote of horizonte) for (let i = 0; i < lote.count; i++) {
    lote.getMatrixAt(i, mt); p.setFromMatrixPosition(mt);
    if (Math.max(Math.abs(p.x), Math.abs(p.z)) <= 58 + 20) continue;
    lados[Math.abs(p.z) >= Math.abs(p.x) ? (p.z < 0 ? 'N' : 'S') : (p.x < 0 ? 'O' : 'L')]++;
  }
  const pior = Math.min(...Object.values(lados));
  exige(pior >= 50, `copas além de HALF+20 por lado ${JSON.stringify(lados)} (piso 50): o mapa flutua no vazio`);
  relatorio.horizonte = lados;
  return `chão ${(bb.max.x - bb.min.x).toFixed(0)} m, copas além de 78 m ${JSON.stringify(lados)}`;
});

CIDADE.regrasCidade({ W, THREE, MUT, regra, exige, fs });
MATA.regrasMata({ W, THREE, MUT, regra, exige });

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
console.log('✓ MAPA DA INVASÃO OK — cerco de seis frentes, pasto, becos, setores, relevo, comida e trilhas até dentro da loja.');
