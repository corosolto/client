/* ============================================================================
   piscina-bsp-check.mjs — PISCINA CENTRAL + ANEL, DECISÃO DO DONO (26/08).
   ----------------------------------------------------------------------------
   PROCEDÊNCIA DA DECISÃO
   O re-authoring pelo BSP (r2) saiu com a piscina 13,5x9 ATRAVESSADA no eixo
   curto e descentrada — o pátio do fy_pool_day. O dono jogou e reprovou, com
   estas palavras (26/08): "adicionou layout no meio da piscina, e nao em volta
   dela, ficou super esquisito, o mapa na piscina tinha que continuar igual, a
   piscina menor, e adicionar corredores, vestiários, banheiro em volta dela
   como area de respawn". Decisão derivada daí: piscina CENTRAL e MENOR
   (~10x7 m), o espaço negativo vira um ANEL de construções (vestiário,
   banheiro, corredores cobertos) servindo de respawn e flanqueio.

   O BSP (tools/eval/piscina_bsp.json, medido por bsp-measure.mjs) SEGUE como
   referência — da PISCINA, não do anel: proporção ~1,5:1 (hx/hz do BSP) é o
   que sobrevive da medição. As PB antigas que mediam o pátio atravessado
   (salão × BSP, corredores laterais, estruturas verticais do func_wall)
   saem: codificavam o layout rejeitado.

   r3 (27/08), dono: "o mapa da piscina eu queria corredores fechados como a
   fy_poolday mesmo" — a r2 saiu com alamedas ABERTAS (pilares + ripado a 2,62).
   No BSP medido o anel do original é 99-100% COBERTO (forro a 192u = 6,75 m,
   corredores.teto no JSON) com a piscina a céu aberto. A cláusula PB7 cobra o
   fechado NO NOSSO corredor: teto sólido sobre ≥80% do trajeto e paredes
   laterais fechadas a ≤3 m (raio horizontal trava) — a altura de 3,0 m é a
   leitura nossa de galeria de clube, abaixo do forro do original de propósito.

   O QUE MEDE (mundo real: buildPoolDay via harness, uso e não declaração)
     PB1 centro X da piscina   |cx| ≤ 3 m  ("~0,0 ±3 m" do dono)
     PB2 centro Z da piscina   |cz| ≤ 3 m
     PB3 área do fundo plano   ≤ 71 m² (10x7 + 2% de folga da amostragem 0,25 m)
     PB4 aspecto X/Z           1,5 ±20% (hx/hz LIDO do piscina_bsp.json)
     PB5 spawns E × B          ≥ 25 m e em lados opostos do anel (z de sinais
                               contrários, folga 5 m do centro)
      PB6 anel ≥ 3 estruturas   colisores h ≥ 2,4 m e pegada ≥ 4 m² FORA do
                                miolo do deck (|cx|>8,5 ou |cz|>10) — vestiário,
                                banheiro, corredor/guarita contam; pilar (1,2 m²)
                                e armário avulso (0,9 m²) não
      PB7 corredor FECHADO      (r3, como o fy_pool_day): teto sólido (collider
                                com maxY>2,8) sobre ≥80% das células do corredor
                                E paredes laterais: raio horizontal em ±x a partir
                                do eixo (x ±15,75) trava a ≤3 m em parede alta
                                (h≥2,4), fora do vão central (|z|<2,3), das bocas
                                (|z|>19,5) e da porta do respawn (|z| 11,4-13,4)

   r4 (27/08), dono depois de jogar a r3: "continua aberto sem corredores fechadas
   […] a parte do respawn nao ser de frente pra piscina, ele ter acesso a piscina
   mas ser protegido por paredes, e tem que ter uma estrutura boa". A r3 tinha
   fechado a GALERIA e deixado a cabeceira como pátio — medido nela, 1144/1440
   raios de spawn até a lâmina passavam livres. Quatro cláusulas novas:

      PB8  respawn protegido    ZERO raios livres do olho (1,6 m) de cada spawn até
                                uma grade da lâmina d'água, contra `world.occluders`
                                — a mesma lista que decide visada em partida
      PB9  rota fechada         ≥2 caminhos spawn↔spawn DISJUNTOS EM NÓ no grafo real
                                de waypoints, com a arena (|x|<13,7 e |z|<9,5) fora
                                do grafo: quem sobrevive ao corte foi pela galeria.
                                Disjunto porque duas rotas que dividem um nó são um
                                gargalo só — o "corredor único" que o dono reclamou
      PB10 não é campo aberto   ≤10% de céu aberto sobre as células DAS ROTAS QUE A
                                PB9 ACHOU (amostra a cada 0,5 m). A amostra sai da
                                planta, não de um retângulo escrito à mão: mudou o
                                mapa, a amostra anda junto. A piscina segue a céu
                                aberto de propósito — é a arena, e está fora das rotas
      PB11 arte ancorada        100% das peças COLADAS PELO BUILDER (poster:/mural:/
                                decal: com transformação própria) com superfície atrás
                                por `paredeAtras`. A passada assada fica FORA — ver a
                                docstring da cláusula: o critério aplicado a ela em
                                node acusa 100% de órfãs em praca_poderes, que tem
                                bake fresco, porque os GLB não existem em node

    LEI 1: nasceu reprovando o builder atravessado (PB3 +121% de área, PB6 com
    2 estruturas de anel — vermelha no commit em que entrou). PB8/PB9/PB10 nasceram
    vermelhas contra a r3 (2310/2856 raios livres, 0 rotas, 100% de céu).
    LEI 3: cada mutação abaixo declara o conjunto EXATO de cláusulas que tem de
    acender, e o check reprova se acender uma a mais ou a menos.

    USO
      node tools/eval/piscina-bsp-check.mjs
      node tools/eval/piscina-bsp-check.mjs --mutar=desloca-parede   # PB1
      node tools/eval/piscina-bsp-check.mjs --mutar=bsp-furado       # PB4
      node tools/eval/piscina-bsp-check.mjs --mutar=sem-anel         # PB6
      node tools/eval/piscina-bsp-check.mjs --mutar=corredor-aberto  # PB7a+PB7b
      node tools/eval/piscina-bsp-check.mjs --mutar=spawn-exposto    # PB8
      node tools/eval/piscina-bsp-check.mjs --mutar=corredor-cortado # PB9
      node tools/eval/piscina-bsp-check.mjs --mutar=sem-forro        # PB10
      node tools/eval/piscina-bsp-check.mjs --mutar=parede-afastada  # PB11
    mutação desconhecida sai com código 2 (≠ 1, que é "o mapa reprovou").
    ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootGame, initTextures, THREE } from './harness.mjs';
import { paredeAtras } from '../../public/js/map_decals.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MUTANTES = ['desloca-parede', 'bsp-furado', 'sem-anel', 'corredor-aberto',
  'spawn-exposto', 'corredor-cortado', 'sem-forro', 'parede-afastada'];
const MUTAR = (process.argv.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || null;
/* Mutante desconhecido sai com 2, não com 1: 1 é "o mapa reprovou" e 2 é "você pediu
   uma mutação que não existe". Colapsar os dois faz um erro de digitação passar por
   prova de mordida — a régua ficaria verde por não ter rodado nada. */
if (MUTAR && !MUTANTES.includes(MUTAR)) {
  console.error(`mutação desconhecida: ${MUTAR} — conhecidas: ${MUTANTES.join(', ')}`);
  process.exit(2);
}

/* piscina_bsp.json continua sendo A referência da proporção da piscina. */
const bsp = JSON.parse(readFileSync(path.join(HERE, 'piscina_bsp.json'), 'utf8'));
if (MUTAR === 'bsp-furado') bsp.piscina.hx *= 0.3;   // medida do JSON corrompida: o check tem que LER o JSON

const AREA_MAX = 71;          // 10x7 (decisão do dono) + 2% de folga da amostragem
/* piso de peças de arte do builder: 44 medidas na r4, teto de queda de 25%. Existe pra
   que "a régua parou de achar arte" reprove em vez de virar 100% de zero. */
const ARTE_MIN = 33;
const TETO = 0.20;

const T = await initTextures();
const g = bootGame('piscina_treta', { textures: T });
const W = g.world;

/* ── medidas do builder ────────────────────────────────────────────────────── */
const medido = {};

/* fundo plano da piscina: platô da profundidade máxima via groundHeightAt.
   Área e aspecto pelos EXTENTOS do platô (±meio passo), não pela contagem de
   células — a contagem infla ~6% pelas células de borda e morreria no teto. */
const PASSO = 0.25;
let hmin = 0, flatMinX = 0, flatMaxX = 0, flatMinZ = 0, flatMaxZ = 0;
for (let x = W.bounds.minX; x <= W.bounds.maxX; x += PASSO) {
  for (let z = W.bounds.minZ; z <= W.bounds.maxZ; z += PASSO) {
    const h = W.groundHeightAt(x, z);
    if (h < hmin - 1e-9) { hmin = h; flatMinX = flatMaxX = x; flatMinZ = flatMaxZ = z; }
    else if (h <= hmin + 0.03 && h < -0.2) {
      flatMinX = Math.min(flatMinX, x); flatMaxX = Math.max(flatMaxX, x);
      flatMinZ = Math.min(flatMinZ, z); flatMaxZ = Math.max(flatMaxZ, z);
    }
  }
}
if (hmin > -0.2) { console.error('PISCINA-BSP VERMELHA · não achei piscina (nenhum ponto rebaixado no groundHeightAt)'); process.exit(1); }
medido.piscina = {
  cx: (flatMinX + flatMaxX) / 2,
  cz: (flatMinZ + flatMaxZ) / 2,
  area: (flatMaxX - flatMinX) * (flatMaxZ - flatMinZ),
  aspecto: (flatMaxX - flatMinX) / Math.max(0.01, flatMaxZ - flatMinZ),
};

const cen = (lst) => lst.reduce((a, s) => ({ x: a.x + s.x / lst.length, z: a.z + s.z / lst.length }), { x: 0, z: 0 });
const cE = cen(W.spawns.E), cB = cen(W.spawns.B);
medido.spawns = {
  dist: Math.hypot(cB.x - cE.x, cB.z - cE.z),
  opostos: cE.z < -5 && cB.z > 5,
};

/* anel: estruturas altas FORA do miolo do deck (piscina + passagem) */
medido.anel = W.colliders.filter((c) => {
  if (typeof c.minX !== 'number') return false;
  const h = c.maxY - c.minY, pegada = (c.maxX - c.minX) * (c.maxZ - c.minZ);
  const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
  return h >= 2.4 && c.maxY > 0.5 && pegada >= 4 && (Math.abs(cx) > 8.5 || Math.abs(cz) > 10)
    && Math.abs(cx) < W.bounds.maxX - 1 && Math.abs(cz) < W.bounds.maxZ - 1;
}).length;

/* ── PB7: corredor FECHADO (r3). Faixa e eixo são o DESENHO do anel: parede interna
      face ±14,0 · parede externa do salão face ±17,5. Teto = collider com maxY > 2,8
      sobre a célula; parede = raio horizontal que trava em collider h ≥ 2,4 nascido
      no chão (minY < 1,6) a ≤3 m, nos dois sentidos, fora do vão central e das bocas.
      A mutação corredor-aberto é aplicada NO INSTRUMENTO (os sólidos da galeria saem
      da lista que o medidor lê — a alameda aberta da r2), não no número final. */
const CXc = (c) => (c.minX + c.maxX) / 2;
const mutTeto = (c) => MUTAR === 'corredor-aberto' && c.minY >= 2.8 && Math.abs(CXc(c)) > 13.5 && Math.abs(CXc(c)) < 17.9;
const mutParede = (c) => MUTAR === 'corredor-aberto' && (c.maxY - c.minY) >= 2.4 && Math.abs(CXc(c)) > 13.5 && Math.abs(CXc(c)) < 14.25;
let celTot = 0, celTeto = 0;
for (let x = 14.3; x <= 17.2; x += 0.5) for (let z = -21.5; z <= 21.5; z += 0.5) for (const s of [1, -1]) {
  celTot++;
  const tem = W.colliders.some((c) => !mutTeto(c) && c.minY >= 2.4 && c.maxY > 2.8
    && s * x > c.minX && s * x < c.maxX && z > c.minZ && z < c.maxZ);
  if (tem) celTeto++;
}
const raioTrava = (x0, z, dir) => {
  for (let d = 0.1; d <= 3.0; d += 0.1) {
    const x = x0 + dir * d;
    for (const c of W.colliders) {
      if (mutParede(c)) continue;
      if ((c.maxY - c.minY) >= 2.4 && c.minY < 1.6 && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return d;
    }
  }
  return Infinity;
};
let paredesOk = 0, paredesTot = 0;
for (let z = -18.3; z <= 18.3; z += 0.5) {
  if (Math.abs(z) < 2.3) continue;   // vão central pra piscina: ali NÃO pode ter parede
  /* porta de serviço do respawn (z ±12,4, vão 11,6..13,2): rasgo DECLARADO na planta,
     não fresta. Fica fora da amostra porque exigir parede aqui seria exigir que a
     segunda rota do lado não existisse — a PB9 é quem cobra que ela exista. */
  if (Math.abs(z) > 11.4 && Math.abs(z) < 13.4) continue;
  for (const s of [1, -1]) {
    paredesTot++;
    if (raioTrava(s * 15.75, z, 1) <= 3 && raioTrava(s * 15.75, z, -1) <= 3) paredesOk++;
  }
}
medido.corredor = { tetoFrac: celTeto / Math.max(1, celTot), paredesFrac: paredesOk / Math.max(1, paredesTot) };

/* ══ r4 (27/08) ═══════════════════════════════════════════════════════════════
   O dono jogou a r3 e reprovou: "continua aberto sem corredores fechadas […] a
   ideia era a piscina ser o centro do mapa, mas o mapa nao ser aberto […] e a
   parte do respawn nao ser de frente pra piscina, ele ter acesso a piscina mas
   ser protegido por paredes". A r3 tinha fechado o CORREDOR e deixado a cabeceira
   como pátio: MEDIDO no commit dela, 1144 de 1440 raios spawn→lâmina passavam
   livres (79,4%). PB8..PB11 cobram as quatro coisas que faltavam.
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── PB8: RESPAWN PROTEGIDO — zero visada da área de nascimento para a lâmina.
      Mede o que o jogo mede: raio do OLHO (1,6 m, a mesma altura do `_losClear` do
      game.js) de cada spawn até uma grade de pontos da superfície da água, contra
      `world.occluders` — a MESMA lista que decide linha de visão em partida. Não é
      "existe uma parede", é "não existe um raio": parede com fresta reprova.
      O vidro do clerestório está na lista de propósito — neste mapa ele é parede
      declarada (segura corpo e bala), então também tem que segurar visada. */
const olhoY = 1.6;
const box3 = new THREE.Box3();
const bboxDe = (o) => { o.updateWorldMatrix(true, false); return box3.setFromObject(o).clone(); };
/* mutação spawn-exposto: a parede de proteção do respawn some da lista que o medidor
   lê — é a planta da r3 de volta (cabeceira aberta pra piscina), não um número torto.
   Reconhecida pela FORMA, não por índice: painel largo (>15 m em x), alto (>3 m) e
   assentado na linha z = ±10. Índice de array vira outra peça no próximo commit. */
const ehParedeRespawn = (b) => {
  const cz = (b.min.z + b.max.z) / 2;
  return Math.abs(Math.abs(cz) - 10) < 0.6 && b.max.y > 3 && (b.max.x - b.min.x) > 15;
};
const occVis = W.occluders.filter((o) => o && o.visible !== false)
  .filter((o) => !(MUTAR === 'spawn-exposto' && ehParedeRespawn(bboxDe(o))));
/* mutação parede-afastada: a parede interna do corredor OESTE (face x = −13,7) anda
   0,7 m pra longe da arte que está colada nela. É o defeito histórico desta frente
   reencenado — a planta mudou, a tinta ficou onde a parede estava ontem. */
if (MUTAR === 'parede-afastada') {
  for (const o of W.occluders) {
    const b = bboxDe(o);
    const cx = (b.min.x + b.max.x) / 2;
    if (cx < -13.5 && cx > -14.2 && b.max.y > 2 && (b.max.z - b.min.z) > 5) { o.position.x -= 0.7; o.updateWorldMatrix(true, true); }
  }
  W.root.updateMatrixWorld(true);
}
{
  const rc = new THREE.Raycaster();
  const lamina = [];
  for (let x = -7.5; x <= 7.5; x += 0.75) for (let z = -6; z <= 6; z += 0.75) lamina.push([x, -0.4, z]);
  let livres = 0, tot = 0;
  const o = new THREE.Vector3(), d = new THREE.Vector3();
  for (const t of ['E', 'B']) for (const s of W.spawns[t]) for (const a of lamina) {
    tot++;
    o.set(s.x, olhoY, s.z); d.set(a[0], a[1], a[2]).sub(o);
    const dist = d.length(); d.normalize();
    rc.set(o, d); rc.near = 0.05; rc.far = dist - 0.05;
    if (!rc.intersectObjects(occVis, true).length) livres++;
  }
  medido.visadaSpawn = { livres, tot };
}

/* ── PB9: ROTA FECHADA — ≥2 caminhos spawn-a-spawn que NÃO passam pela arena.
      "corredores fechados ligando um respawn ao outro, pra dar rota que não passe
      pela lâmina d'água" + "não virar corredor único de um tiro só": duas rotas, e
      DISJUNTAS EM NÓ — duas rotas que compartilham um nó são um gargalo só, e é o
      gargalo que o dono está reclamando. Fluxo máximo com nó dividido (capacidade 1
      por nó) sobre o grafo REAL de waypoints; a arena (|x| < 13,7 e |z| < 9,5 — a
      piscina e o deck em volta dela) é removida do grafo, então quem sobreviver ao
      corte só pode ter ido pelas galerias laterais.
      Mutação corredor-cortado: a coluna de nós do corredor leste some (é o corredor
      emparedado). Sobra uma rota e a cláusula acende. */
const N = W.waypoints.nodes, ADJ = W.waypoints.adj;
const naArena = (n) => Math.abs(n.x) < 13.7 && Math.abs(n.z) < 9.5;
const cortado = (i) => MUTAR === 'corredor-cortado' && N[i].x > 13.7;
let rotas = [];
const caminhos = (usavel) => {
  /* nó-a-nó com capacidade 1: cada nó vira IN(i)=2i e OUT(i)=2i+1 com aresta de
     capacidade 1 entre eles. Fonte e sorvedouro artificiais nos nós de spawn. */
  const V = N.length * 2 + 2, S = V - 2, Tk = V - 1;
  const cap = new Map(), viz = Array.from({ length: V }, () => []);
  const arco = (a, b, c) => { if (!cap.has(a * V + b)) { viz[a].push(b); viz[b].push(a); } cap.set(a * V + b, (cap.get(a * V + b) || 0) + c); cap.set(b * V + a, cap.get(b * V + a) || 0); };
  for (let i = 0; i < N.length; i++) if (usavel(i)) arco(2 * i, 2 * i + 1, 1);
  for (let i = 0; i < N.length; i++) if (usavel(i)) for (const j of ADJ[i]) if (usavel(j)) arco(2 * i + 1, 2 * j, 1);
  const perto = (p) => { let b = -1, bd = 1e9; for (let i = 0; i < N.length; i++) { if (!usavel(i)) continue; const d = (N[i].x - p.x) ** 2 + (N[i].z - p.z) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
  const fontes = new Set(W.spawns.E.map(perto).filter((i) => i >= 0));
  const sorvs = new Set(W.spawns.B.map(perto).filter((i) => i >= 0));
  for (const i of fontes) arco(S, 2 * i, 1);
  for (const i of sorvs) arco(2 * i + 1, Tk, 1);
  const achados = []; let fluxo = 0;
  for (;;) {
    const prev = new Int32Array(V).fill(-1); prev[S] = S;
    const fila = [S]; let achou = false;
    while (fila.length && !achou) {
      const u = fila.shift();
      for (const v of viz[u]) if (prev[v] === -1 && (cap.get(u * V + v) || 0) > 0) { prev[v] = u; if (v === Tk) { achou = true; break; } fila.push(v); }
    }
    if (!achou) break;
    const cam = [];
    for (let v = Tk; v !== S; v = prev[v]) { cam.push([prev[v], v]); cap.set(prev[v] * V + v, cap.get(prev[v] * V + v) - 1); cap.set(v * V + prev[v], (cap.get(v * V + prev[v]) || 0) + 1); }
    fluxo++;
    // a rota em nós do mundo, pra PB10 medir o céu EM CIMA DELA e não de uma região decretada
    achados.push(cam.reverse().map(([a]) => a).filter((v) => v !== S && v % 2 === 0).map((v) => N[v / 2]));
    if (fluxo > 8) break;
  }
  return { fluxo, achados };
};
medido.rotas = caminhos((i) => !naArena(N[i]) && !cortado(i)).fluxo;
/* A AMOSTRA DA PB10 SAI DO GRAFO NÃO-MUTADO, de propósito. `corredor-cortado` é a
   mutação da PB9: se a PB10 medisse o céu sobre a rota QUE SOBROU depois do corte,
   ela acenderia junto — e uma cláusula que acende por dano colateral não provou nada
   sobre si mesma. Aqui a PB10 sempre pergunta "as rotas principais DESTE mapa estão
   cobertas?", e só `sem-forro`/`corredor-aberto` mexem nessa resposta. */
rotas = caminhos((i) => !naArena(N[i])).achados;

/* ── PB10: O MAPA NÃO É CAMPO ABERTO — céu aberto sobre as rotas de PB9.
      A métrica de fechamento vai EM CIMA DA ROTA QUE A PB9 ACHOU, não sobre um
      retângulo escrito à mão: mudou a planta, a amostra anda junto. Amostra a cada
      0,5 m ao longo da polilinha e pergunta se há sólido acima de 1,8 m. A piscina
      continua a céu aberto de propósito (é a arena) — e ela está fora destas rotas
      por construção, que é justamente o contrato do mapa.
      Mutação sem-forro: o forro da sala de respawn some da lista de colisores. */
const mutForro = (c) => MUTAR === 'sem-forro' && c.minY >= 2.8 && Math.abs(CXc(c)) < 13.8
  && Math.abs((c.minZ + c.maxZ) / 2) > 9 && Math.abs((c.minZ + c.maxZ) / 2) < 16;
{
  const cobre = (x, z) => W.colliders.some((c) => !mutForro(c) && c.minY >= 1.8
    && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ);
  let cel = 0, aberto = 0;
  for (const r of rotas) for (let k = 1; k < r.length; k++) {
    const a = r[k - 1], b = r[k], L = Math.hypot(b.x - a.x, b.z - a.z), passos = Math.max(1, Math.round(L / 0.5));
    for (let s = 0; s <= passos; s++) {
      const t = s / passos, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      cel++; if (!cobre(x, z)) aberto++;
    }
  }
  medido.ceuRota = { aberto, cel, frac: cel ? aberto / cel : 1 };
}

/* ── PB11: ARTE DE PAREDE ANCORADA — 100% das peças COLADAS PELO BUILDER com
      superfície atrás. É a metade node-mensurável do defeito do dono ("cheio de
      poster e grafite soltado no ar"): cartaz, mural e decalque nascem aqui, de
      coordenada escrita neste repositório, e é aqui que a coordenada envelhecia.

      O QUE ESTA CLÁUSULA **NÃO** MEDE — e por que, com prova.
      A passada de grafite (`grafitar`) monta o layout ASSADO, que foi gerado NO
      NAVEGADOR, onde os GLB existem. Em node os GLB não carregam. A primeira versão
      desta cláusula incluía `root.userData.graffitiPecas` e acusou 266 de 275 peças
      órfãs no Piscinão — número que parecia confirmar o dono. MEDIDO nos mapas de
      bake fresco e intocado, o mesmo critério acusa praca_poderes 276/276 (100%),
      quebrada 641/894 (72%), ferro_velho 277/413 (67%): a peça está ancorada numa
      fachada que só existe no navegador (praca_poderes tem 176 malhas pintáveis em
      node contra as centenas do jogo). O número media o INSTRUMENTO, não o mapa.
      Quem mede a passada é a `graffiti-census`, que roda no navegador de propósito,
      mais a F2 do `eval:grafitelayout`, que reprova bake velho por hash. Esta
      cláusula fica com o que node vê inteiro, e diz em voz alta o que não vê.

      Critério: `paredeAtras` do map_decals.js — o mesmo que o builder usa pra decidir
      se pinta. Régua e builder discordando sobre "tem parede?" seria BUG-02. */
{
  const pecas = [];
  const vis = new THREE.Vector3(), esc = new THREE.Vector3(), eul = new THREE.Euler();
  W.root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.parameters || o.geometry.type !== 'PlaneGeometry') return;
    const n = String(o.name || '');
    if (!/^(poster|mural|decal):/.test(n)) return;
    /* malha-mãe da passada assada: geometria já em MUNDO e a malha na ORIGEM (ler a
       posição dela dá 0,0,0). Fora do escopo desta cláusula — ver docstring. */
    if (o.userData && o.userData.pecas) return;
    o.updateWorldMatrix(true, false);
    vis.setFromMatrixPosition(o.matrixWorld); esc.setFromMatrixScale(o.matrixWorld); eul.setFromRotationMatrix(o.matrixWorld);
    if (Math.abs(eul.x) > 0.2) return;               // plano deitado não é arte de parede
    pecas.push({ nome: n, x: vis.x, y: vis.y, z: vis.z, ry: eul.y, w: o.geometry.parameters.width * esc.x, h: o.geometry.parameters.height * esc.y });
  });
  const orfas = pecas.filter((p) => !paredeAtras([W.root], p.x, p.y, p.z, p.ry, p.w, p.h));
  medido.arte = {
    tot: pecas.length, orfas: orfas.length,
    /* PISO DE POPULAÇÃO — a cláusula acha a arte PELO NOME, e por isso ela tinha um
       buraco: contra o builder anterior a PB11 dava 61/61 VERDE enquanto havia cartaz
       órfão na parede sul, porque naquele builder o cartaz entrava por `addPlane` sem
       nome nenhum e a régua simplesmente não o enxergava. "100% de zero" é o jeito
       clássico de uma régua passar sem medir. Por isso ela também cobra que a
       população não colapse e que as duas famílias nomeadas continuem existindo. */
    poster: pecas.filter((p) => p.nome.startsWith('poster:')).length,
    mural: pecas.filter((p) => p.nome.startsWith('mural:')).length,
    passada: (W.root.userData.graffitiPecas || []).length,
    exemplos: orfas.slice(0, 4).map((p) => `${p.nome}@${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`),
  };
}

/* ── mutação desloca-parede: a parede oeste empurra a piscina pra fora do
       centro. Simulação ABSOLUTA (+6 m > que a tolerância de 3 m do dono),
       senão o tamanho do desvio dependeria de quão errado o mapa já está. */
if (MUTAR === 'desloca-parede') medido.piscina.cx += 6;
/* ── mutação sem-anel: o anel inteiro some (o layout voltou a ser piscina
       atravessada sem construções em volta — exatamente o que o dono reprovou). */
if (MUTAR === 'sem-anel') medido.anel = 0;

/* ── comparação ────────────────────────────────────────────────────────────── */
const verdes = [];
const vermelhas = [];
const cl = (id, nome, ok) => { (ok ? verdes : vermelhas).push(id); console.log(`  ${ok ? 'ok' : 'x '} ${id} ${nome}`); };
console.log(`PISCINA · piscina central 10x7 + anel (decisão do dono 26/08; aspecto do BSP ${bsp.piscina.hx}/${bsp.piscina.hz})${MUTAR ? `  [mutação: ${MUTAR}]` : '\n'}`);
cl('PB1', `centro X            jogo ${medido.piscina.cx.toFixed(2)} m (tolerância ±3)`, Math.abs(medido.piscina.cx) <= 3);
cl('PB2', `centro Z            jogo ${medido.piscina.cz.toFixed(2)} m (tolerância ±3)`, Math.abs(medido.piscina.cz) <= 3);
cl('PB3', `área da piscina     jogo ${medido.piscina.area.toFixed(1)} m² ≤ ${AREA_MAX}`, medido.piscina.area <= AREA_MAX);
cl('PB4', `aspecto X/Z         jogo ${medido.piscina.aspecto.toFixed(2)} · bsp ${(bsp.piscina.hx / bsp.piscina.hz).toFixed(2)} ±20%`,
  Math.abs(medido.piscina.aspecto - bsp.piscina.hx / bsp.piscina.hz) / (bsp.piscina.hx / bsp.piscina.hz) <= TETO);
cl('PB5', `spawns E×B          jogo ${medido.spawns.dist.toFixed(1)} m, lados opostos=${medido.spawns.opostos} (≥25 m)`,
  medido.spawns.dist >= 25 && medido.spawns.opostos);
cl('PB6', `estruturas do anel  jogo ${medido.anel} ≥ 3 (vestiário/banheiro/corredor)`, medido.anel >= 3);
cl('PB7a', `teto do corredor    jogo ${(medido.corredor.tetoFrac * 100).toFixed(0)}% das células ≥ 80% (bsp: anel 99-100% coberto)`, medido.corredor.tetoFrac >= 0.8);
cl('PB7b', `paredes do corredor jogo ${(medido.corredor.paredesFrac * 100).toFixed(0)}% dos raios ±x travam a ≤3 m (≥100%)`, medido.corredor.paredesFrac >= 1);
cl('PB8', `respawn protegido   jogo ${medido.visadaSpawn.livres}/${medido.visadaSpawn.tot} raios spawn→lâmina livres (=0)`, medido.visadaSpawn.livres === 0);
cl('PB9', `rotas fechadas      jogo ${medido.rotas} caminhos spawn↔spawn disjuntos fora da arena (≥2)`, medido.rotas >= 2);
cl('PB10', `céu sobre a rota    jogo ${(medido.ceuRota.frac * 100).toFixed(0)}% aberto (${medido.ceuRota.aberto}/${medido.ceuRota.cel}) ≤ 10%`, medido.ceuRota.frac <= 0.10);
cl('PB11', `arte ancorada       jogo ${medido.arte.tot - medido.arte.orfas}/${medido.arte.tot} peças do builder com parede atrás (=100%)`
  + ` · ${medido.arte.poster} cartaz + ${medido.arte.mural} mural nomeados (≥1 cada, ≥${ARTE_MIN} no total)`
  + ` · ${medido.arte.passada} da passada assada NÃO medidas aqui (browser-only, ver docstring)`
  + `${medido.arte.orfas ? ' · ' + medido.arte.exemplos.join(' ') : ''}`,
  medido.arte.orfas === 0 && medido.arte.tot >= ARTE_MIN && medido.arte.poster >= 1 && medido.arte.mural >= 1);

const verde = vermelhas.length === 0;
console.log(`\nPISCINA-BSP ${verde ? 'ok' : 'VERMELHA'} · ${verdes.length}/${verdes.length + vermelhas.length} cláusulas`);

/* ── CONTRATO DAS MUTAÇÕES ────────────────────────────────────────────────────
   Cada mutante declara o conjunto EXATO de cláusulas que ele tem de acender. Não é
   "acendeu alguma": régua que reprova por acidente numa cláusula vizinha não provou
   nada sobre a sua. Duas réguas desta frota nasceram sem morder e só a mutação
   revelou — a exigência de conjunto exato é o que faz esta não repetir o truque. */
const ESPERADO = {
  'desloca-parede': ['PB1'],
  'bsp-furado': ['PB4'],
  'sem-anel': ['PB6'],
  'corredor-aberto': ['PB7a', 'PB7b'],   // mutação escopada no medidor do corredor: a PB10 tem a sua
  'spawn-exposto': ['PB8'],
  'corredor-cortado': ['PB9'],
  'sem-forro': ['PB10'],
  'parede-afastada': ['PB11'],
};
if (MUTAR) {
  const esp = ESPERADO[MUTAR].join(',');
  const teve = [...vermelhas].sort((a, b) => ESPERADO[MUTAR].indexOf(a) - ESPERADO[MUTAR].indexOf(b));
  const iguais = vermelhas.length === ESPERADO[MUTAR].length && ESPERADO[MUTAR].every((c) => vermelhas.includes(c));
  if (!iguais) {
    console.error(`mutação ${MUTAR}: esperava acender exatamente [${esp}], acendeu [${teve.join(',') || 'nada'}] — a régua não morde onde devia`);
    process.exit(1);
  }
  console.log(`mutação ${MUTAR} reprovada como esperado (${esp})`); process.exit(0);
}
process.exit(verde ? 0 : 1);
