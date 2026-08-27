/* ============================================================================
   bsp-measure.mjs — MEDIR O fy_pool_day.bsp DE VERDADE (régua de proporção).
   ----------------------------------------------------------------------------
   POR QUE EXISTE — o "Piscina da Treta" nasceu "inspirado" no fy_pool_day do CS 1.6:
   proporções escritas de cabeça, nunca medidas. Este módulo lê o BSP real e devolve
   as medidas que viram a régua `piscina-bsp-check.mjs` (Lei 1: a régua vem ANTES do
   conserto, e ela tem que REPROVAR o estado atual — as medidas abaixo provam que
   reprova).

   FORMATO — este arquivo NÃO é um BSP30 canônico de GoldSrc. Descoberto na unha
   (hexdump + validação de face planar, 2048/2048 faces fecham):
     · header: int32 version=30, depois 15 lumps {offset,len} — SEM magic "IBSP";
     · a ORDEM dos lumps é a do Quake 1 (id), não a do GoldSrc: 11=marksurfaces,
       12=edges, 13=surfedges, 14=models. Na ordem GoldSrc (11=edges, 12=surfedges,
       13=models, 14=clipnodes) o models cai num array de int32 e nada fecha;
     · dface_t = 20 bytes; dmodel_t = 64 bytes com firstface em +56 e numfaces em
       +60 (o campo +52 não é firstface — os spans das entidades provam: world
       0..1768, *1 1768..1784, somando exatamente 2048);
     · dedge_t = 2×uint16; surfedge = int32 com sinal (direção);
     · nomes de textura no lump 2 no formato WAD3 (nome DIRETO no offset, sem o
       int32 de prefixo do miptexlump de Quake).

   O QUE MEDE (unidades Hammer → metros, ver derivação no JSON de saída)
     · bounds do mundo (model[0]);
     · o pátio jogável: o anel de func_wall verticais que cerca a func_water
       principal, pelas FACES INTERNAS (é o "salão" — os bounds do mundo incluem
       os prédios vizinhos de cenário);
     · a piscina: bounds da maior func_water (a caixa d'água: lâmina no topo);
     · spawns: centróides de info_player_start (CT) e info_player_deathmatch (T)
       e a distância axial entre eles;
     · estruturas verticais internas: func_wall com vão-z ≥ 16u e espessura
       horizontal ≤ 64u (o guardanapo do dossel tem vão-z de 4u e fica de fora);
     · extras documentados (não portados): segunda água do anexo leste, profundidade
       real da água, portas giratórias, armoury.

   A CONVERSÃO NÃO É NÚMERO DE FÓRUM. O fator m/unidade é derivado PELO JOGO:
   âncora = o salão do map_piscina.js no commit em que esta régua nasceu
   (34 × 50 m declarados, HALF_X=17/HALF_Z=25), que é a correspondência maior e
   mais confiável entre o BSP e o nosso mapa. Coerência conferida: os fatores por
   eixo (34/1024 e 50/1344) divergem 11% entre si — mesma ordem, nenhum eixo
   absurdo — então UM fator único, preservando área, é honesto. Cruzamento com a
   escala canônica da Valve (1 m ≈ 39-40u): o fator derivado dá 1 m ≈ 28,5u, ou
   seja, o nosso salão histórico é ~35% MAIOR que o original em metros — coerente
   com a leitura de jogo dele, que é o que manda aqui (maps/fy_pool_day lê-se
   grande porque o jogador anda rápido).

   USO
     node tools/eval/bsp-measure.mjs            # lê ~/map2/fy_pool_day.bsp
     node tools/eval/bsp-measure.mjs --bsp=/caminho/do.bsp
   Escreve tools/eval/piscina_bsp.json (o assado que o portão lê — o check NÃO
   precisa do BSP, do mesmo jeito que o look-check não precisa do webp fresco).
   ============================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const argBsp = (process.argv.find((a) => a.startsWith('--bsp=')) || '').slice(6);
const BSP_PATH = argBsp || path.join(homedir(), 'map2', 'fy_pool_day.bsp');
const SAIDA = path.resolve(HERE, 'piscina_bsp.json');

/* ── âncora da conversão (Lei 2: procedência, não forum) ─────────────────────
   Salão declarado pelo map_piscina.js quando esta régua nasceu, no branch
   map2/piscina @ cc7d9940 (constantes HALF_X=17, HALF_Z=25). NÃO ler do fonte
   vivo: depois do re-authoring o salão passa a DERIVAR do BSP e a âncora viraria
   circular — medição que se auto-justifica não é régua. */
const ANCORA_SALAO_JOGO = { x: 34, z: 50, provenance: 'map_piscina.js@cc7d9940 (HALF_X=17, HALF_Z=25)' };

const buf = readFileSync(BSP_PATH);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const i32 = (o) => dv.getInt32(o, true);
const i16 = (o) => dv.getInt16(o, true);
const u16 = (o) => dv.getUint16(o, true);
const f32 = (o) => dv.getFloat32(o, true);

/* ── header + lumps (ordem Quake-1 — ver cabeçalho) ────────────────────────── */
const versao = i32(0);
if (versao !== 30) throw new Error(`versão BSP ${versao} não suportada (esperava 30)`);
const LUMP = {};
const NOMES = ['entities', 'planes', 'textures', 'vertexes', 'visibility', 'nodes', 'texinfo',
  'faces', 'lighting', 'clipnodes', 'leafs', 'marksurfaces', 'edges', 'surfedges', 'models'];
NOMES.forEach((n, i) => { LUMP[n] = { off: i32(4 + i * 8), len: i32(8 + i * 8) }; });

/* ── vertexes / edges / surfedges / faces ──────────────────────────────────── */
const V = [];
for (let i = 0; i < LUMP.vertexes.len / 12; i++) {
  const o = LUMP.vertexes.off + i * 12;
  V.push([f32(o), f32(o + 4), f32(o + 8)]);
}
const E = [];
for (let i = 0; i < LUMP.edges.len / 4; i++) {
  E.push([u16(LUMP.edges.off + i * 4), u16(LUMP.edges.off + i * 4 + 2)]);
}
const SE = [];
for (let i = 0; i < LUMP.surfedges.len / 4; i++) SE.push(i32(LUMP.surfedges.off + i * 4));

function facePts(fi) {
  const o = LUMP.faces.off + fi * 20;
  const fe = i32(o + 4), ne = u16(o + 8);
  const pts = [];
  for (let i = 0; i < ne; i++) {
    const s = SE[fe + i];
    if (s === undefined) throw new Error(`face ${fi}: surfedge ${fe + i} fora do lump`);
    const e = E[Math.abs(s)];
    if (!e || e[0] >= V.length || e[1] >= V.length) throw new Error(`face ${fi}: edge inválido`);
    pts.push(V[s >= 0 ? e[0] : e[1]]);
  }
  return pts;
}
/* sanidade do parse inteiro: toda face resolve (2048/2048) e o bbox das faces de
   um model bate com o bbox do model — instrumento que não se valida mede nada. */
let nFaces = 0;
for (let fi = 0; fi < LUMP.faces.len / 20; fi++) { facePts(fi); nFaces++; }

/* ── models (slot 14 na ordem Quake-1) ─────────────────────────────────────── */
const models = [];
for (let m = 0; m < LUMP.models.len / 64; m++) {
  const o = LUMP.models.off + m * 64;
  models.push({
    mins: [f32(o), f32(o + 4), f32(o + 8)],
    maxs: [f32(o + 12), f32(o + 16), f32(o + 20)],
    firstface: i32(o + 56), numfaces: i32(o + 60),
  });
}
function modelBboxPorFaces(m) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let fi = m.firstface; fi < m.firstface + m.numfaces; fi++) {
    for (const p of facePts(fi)) for (let k = 0; k < 3; k++) {
      mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]);
    }
  }
  return { mn, mx };
}
{
  const porFaces = modelBboxPorFaces(models[0]);
  const dist = Math.max(...[0, 1, 2].map((k) => Math.abs(porFaces.mn[k] - models[0].mins[k]) + Math.abs(porFaces.mx[k] - models[0].maxs[k])));
  if (dist > 4) throw new Error(`bbox de faces (${porFaces.mn.map(Math.round)}..${porFaces.mx.map(Math.round)}) diverge do model[0] (${models[0].mins.map(Math.round)}..${models[0].maxs.map(Math.round)}): parse desalinhado, NÃO medir`);
}

/* ── entidades ─────────────────────────────────────────────────────────────── */
const entsTexto = buf.toString('latin1', LUMP.entities.off, LUMP.entities.off + LUMP.entities.len);
const ents = entsTexto.split('{').slice(1).map((b) => {
  const e = {};
  for (const m of b.matchAll(/"(\w+)"\s*"([^"]*)"/g)) e[m[1]] = m[2];
  return e;
}).filter((e) => e.classname);
const porClasse = {};
for (const e of ents) porClasse[e.classname] = (porClasse[e.classname] || 0) + 1;

/* model "*N" da entidade -> bounds em unidades */
const modelDaEnt = (e) => {
  if (!e.model || !e.model.startsWith('*')) return null;
  return models[parseInt(e.model.slice(1), 10)] || null;
};
const areaXZ = (m) => (m.maxs[0] - m.mins[0]) * (m.maxs[1] - m.mins[1]);
const cobre = (a, b) => a[0] <= b[1] && b[0] <= a[1];   // intervalos 1D se sobrepõem

/* ── piscina: maior func_water ─────────────────────────────────────────────── */
const aguas = ents.filter((e) => e.classname === 'func_water').map(modelDaEnt).filter(Boolean)
  .sort((a, b) => areaXZ(b) - areaXZ(a));
const piscinaB = aguas[0];
if (!piscinaB) throw new Error('nenhuma func_water no BSP — não é o fy_pool_day');
const piscinaY = [piscinaB.mins[1], piscinaB.maxs[1]];
const piscinaX = [piscinaB.mins[0], piscinaB.maxs[0]];

/* ── salão: anel de func_wall verticais em volta da piscina (faces internas) ── */
const verticais = ents.filter((e) => e.classname === 'func_wall').map(modelDaEnt).filter((m) => {
  const zSpan = m.maxs[2] - m.mins[2];
  const espX = m.maxs[0] - m.mins[0], espY = m.maxs[1] - m.mins[1];
  return zSpan >= 16 && Math.min(espX, espY) <= 64;   // espessura = o MENOR lado horizontal
});
/* folga: o lado LESTE do pátio original é parede PARTIDA — *2 e *5 ladeiam a
   boca do anexo (vão y 288..736) sem cobrir o y da piscina; com folga 192u as
   duas voltam a ser candidatas e o min() escolhe a face interna delas (352),
   não a parede do fundo do anexo (512). */
const yAchega = 192;
const oeste = verticais.filter((m) => m.maxs[0] <= piscinaX[0] + 64 && cobre([piscinaY[0] - yAchega, piscinaY[1] + yAchega], [m.mins[1], m.maxs[1]]));
const leste = verticais.filter((m) => m.mins[0] >= piscinaX[1] - 192 && cobre([piscinaY[0] - yAchega, piscinaY[1] + yAchega], [m.mins[1], m.maxs[1]]));
const sul = verticais.filter((m) => m.maxs[1] <= piscinaY[0] + 64 && cobre([piscinaX[0] - yAchega, piscinaX[1] + yAchega], [m.mins[0], m.maxs[0]]));
const norte = verticais.filter((m) => m.mins[1] >= piscinaY[1] - 64 && cobre([piscinaX[0] - yAchega, piscinaX[1] + yAchega], [m.mins[0], m.maxs[0]]));
if (![oeste, leste, sul, norte].every((l) => l.length)) throw new Error('anel do pátio incompleto: não achei paredão em um dos 4 lados da piscina');
const salaoU = {
  minX: Math.max(...oeste.map((m) => m.maxs[0])),
  maxX: Math.min(...leste.map((m) => m.mins[0])),
  minY: Math.max(...sul.map((m) => m.maxs[1])),
  maxY: Math.min(...norte.map((m) => m.mins[1])),
};
if (salaoU.minX >= piscinaX[0] || salaoU.maxX <= piscinaX[1] || salaoU.minY >= piscinaY[0] || salaoU.maxY <= piscinaY[1])
  throw new Error('piscina fora do anel medido — geometria inesperada');

/* ── spawns: centróides CT (info_player_start) × T (info_player_deathmatch) ── */
const origem = (e) => (e.origin || '').split(' ').map(Number);
const ct = ents.filter((e) => e.classname === 'info_player_start' && e.origin).map(origem);
const tt = ents.filter((e) => e.classname === 'info_player_deathmatch' && e.origin).map(origem);
const centro = (lst) => lst.reduce((a, p) => [a[0] + p[0] / lst.length, a[1] + p[1] / lst.length, a[2] + p[2] / lst.length], [0, 0, 0]);
const ctC = centro(ct), tC = centro(tt);

/* ── conversão: UM fator, preservando área, ancorado no jogo ───────────────── */
const salaoUx = salaoU.maxX - salaoU.minX, salaoUy = salaoU.maxY - salaoU.minY;
const fx = ANCORA_SALAO_JOGO.x / salaoUx, fz = ANCORA_SALAO_JOGO.z / salaoUy;
const coerencia = Math.abs(fx / fz - 1);
if (coerencia > 0.25) throw new Error(`fatores por eixo divergem ${(coerencia * 100).toFixed(0)}% — o salão do jogo não é coerente com o do BSP, âncora errada`);
const F = Math.sqrt(ANCORA_SALAO_JOGO.x * ANCORA_SALAO_JOGO.z / (salaoUx * salaoUy));

/* eixos do jogo: x_bsp -> x_jogo (leste +), y_bsp -> z_jogo (norte +, lado T),
   origem no CENTRO do salão medido */
const conv = (x, y) => [+( (x - (salaoU.minX + salaoU.maxX) / 2) * F ).toFixed(2), +( (y - (salaoU.minY + salaoU.maxY) / 2) * F ).toFixed(2)];
const r2 = (v) => +v.toFixed(2);
const r4 = (v) => +v.toFixed(4);

const [pcx, pcz] = conv((piscinaX[0] + piscinaX[1]) / 2, (piscinaY[0] + piscinaY[1]) / 2);
const [ctX, ctZ] = conv(ctC[0], ctC[1]);
const [tX, tZ] = conv(tC[0], tC[1]);
const agua2 = aguas[1] || null;
const [a2x, a2z] = agua2 ? conv((agua2.mins[0] + agua2.maxs[0]) / 2, (agua2.mins[1] + agua2.maxs[1]) / 2) : [null, null];

/* ── teto do pátio (r3, "corredores fechados como a fy_poolday"): forro real por região.
   Normal calibrada pelo lump PLANE de cada face (planenum u16@0, side u16@2) — winding
   mentiu na primeira análise; o plano não. Chão de referência = maior piso ≤ 48u (as
   entidades do pátio nascem a 16..88u, a piscina desce a -128); teto = menor face -z
   com z ≥ chão+64u (exclui tampo de mesa/dossel) e z < 300u — acima disso é a casca do
   céu do mapa (316u), que não é forro. */
const planes = [];
for (let i = 0; i < LUMP.planes.len / 12; i++) {
  const o = LUMP.planes.off + i * 12;
  planes.push([f32(o), f32(o + 4), f32(o + 8)]);
}
const inPoly = (pts, x, y) => {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if ((pts[i][1] > y) !== (pts[j][1] > y) &&
      x < ((pts[j][0] - pts[i][0]) * (y - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]) dentro = !dentro;
  }
  return dentro;
};
const horiz = [];
for (let fi = 0; fi < LUMP.faces.len / 20; fi++) {
  const o = LUMP.faces.off + fi * 20;
  const pl = planes[u16(o)], side = u16(o + 2);
  if (!pl || Math.abs(side ? -pl[2] : pl[2]) < 0.9) continue;
  const pts = facePts(fi);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  if (x1 < salaoU.minX || x0 > salaoU.maxX || y1 < salaoU.minY || y0 > salaoU.maxY) continue;
  horiz.push({ piso: (side ? -pl[2] : pl[2]) > 0, z: Math.max(...pts.map((p) => p[2])), pts, x0, x1, y0, y1 });
}
const CEL_TETO = 32;
const tetoPorRegiao = {};
{
  const regiao = (x, y) => {
    if (x >= piscinaX[0] && x <= piscinaX[1] && y >= piscinaY[0] && y <= piscinaY[1]) return 'piscina';
    if (x < piscinaX[0]) return 'corredor_oeste';
    if (x > piscinaX[1]) return 'corredor_leste';
    return y < piscinaY[0] ? 'deck_sul' : 'deck_norte';
  };
  const stats = {};
  for (let x = salaoU.minX + 16; x < salaoU.maxX; x += CEL_TETO) {
    for (let y = salaoU.minY + 16; y < salaoU.maxY; y += CEL_TETO) {
      let chao = -1e9;
      for (const f of horiz) {
        if (!f.piso || f.z > 48 || x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1 || !inPoly(f.pts, x, y)) continue;
        chao = Math.max(chao, f.z);
      }
      if (chao === -1e9) continue;
      let teto = 1e9;
      for (const f of horiz) {
        if (f.piso || f.z <= chao + 64 || f.z >= 300 || x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1 || !inPoly(f.pts, x, y)) continue;
        teto = Math.min(teto, f.z);
      }
      const r = stats[regiao(x, y)] || (stats[regiao(x, y)] = { cel: 0, cobertas: 0, zs: [] });
      r.cel++;
      if (teto < 1e9) { r.cobertas++; r.zs.push(teto); }
    }
  }
  const moda = (a) => {
    if (!a.length) return null;
    const m = new Map(); let best = 0, bv = 0;
    for (const v of a) { const c = (m.get(v) || 0) + 1; m.set(v, c); if (c > best) { best = c; bv = v; } }
    return bv;
  };
  for (const [k, r] of Object.entries(stats)) {
    tetoPorRegiao[k] = {
      celulas: r.cel,
      frac_coberta: r4(r.cobertas / r.cel),
      teto_moda_u: moda(r.zs),
      teto_moda_m: r2(moda(r.zs) * F),
    };
  }
}

const medidas = {
  _doc: [
    `Medido de ${path.basename(BSP_PATH)} por tools/eval/bsp-measure.mjs — NÃO editar à mão.`,
    `Conversão: fator único ${r4(F)} m/unidade, preservando área, ancorado no salão do jogo`,
    `(${ANCORA_SALAO_JOGO.x}x${ANCORA_SALAO_JOGO.z} m, ${ANCORA_SALAO_JOGO.provenance}) contra o pátio`,
    `interno do BSP (${salaoUx}x${salaoUy}u). Fatores por eixo ${r4(fx)}/${r4(fz)} divergem`,
    `${(coerencia * 100).toFixed(0)}% — mesma ordem, âncora coerente. Eixos do jogo: y_bsp -> z_jogo,`,
    'origem no centro do pátio. O check (piscina-bsp-check.mjs) lê ESTE arquivo; regenerar',
    'rodando o bsp-measure de novo (o BSP fica fora do repo, em ~/map2/).',
  ].join('\n'),
  fonte: {
    arquivo: path.basename(BSP_PATH), bytes: buf.length, versao_bsp: versao,
    ordem_lumps: 'Quake-1 (id): 12=edges 13=surfedges 14=models — difere do GoldSrc canônico',
    entidades: porClasse,
  },
  fator_m_por_unidade: r4(F),
  salao: { x: r2(salaoUx * F), z: r2(salaoUy * F) },
  piscina: {
    cx: pcx, cz: pcz, hx: r2((piscinaX[1] - piscinaX[0]) / 2 * F), hz: r2((piscinaY[1] - piscinaY[0]) / 2 * F),
    profundidade_agua: r2((piscinaB.maxs[2] - piscinaB.mins[2]) * F),
  },
  corredores: {
    oeste: r2((piscinaX[0] - salaoU.minX) * F),
    leste: r2((salaoU.maxX - piscinaX[1]) * F),
    /* r3: o que prova o "corredor FECHADO" do original — forro contínuo sobre as
       laterais e decks, piscina a céu aberto. É a procedência da cláusula PB7 do
       piscina-bsp-check (cobertura ≥80% no NOSSO corredor; a altura de 3,0 m lá é
       decisão nossa de leitura de clube, mais baixa que a do original). */
    teto: tetoPorRegiao,
  },
  decks: {
    sul: r2((piscinaY[0] - salaoU.minY) * F),
    norte: r2((salaoU.maxY - piscinaY[1]) * F),
  },
  spawns: {
    ct: { x: ctX, z: ctZ, n: ct.length },
    t: { x: tX, z: tZ, n: tt.length },
    distancia_centroides: r2(Math.hypot(tX - ctX, tZ - ctZ)),
  },
  estruturas_verticais: verticais.length,
  nao_portados: {
    segunda_agua: agua2 ? { cx: a2x, cz: a2z, lado: r2((agua2.maxs[0] - agua2.mins[0]) * F), por_quê: 'fica no anexo leste do mapa original, que não existe no nosso salão fechado' } : null,
    profundidade_da_agua: `${r2((piscinaB.maxs[2] - piscinaB.mins[2]) * F)} m no original; a nossa segue andável em 1,5 m (decisão de gameplay registrada no map_piscina.js)`,
  },
};

writeFileSync(SAIDA, JSON.stringify(medidas, null, 2) + '\n');
console.log(`BSP ${path.basename(BSP_PATH)} — ${nFaces} faces validadas, ${models.length} models, ${ents.length} entidades`);
console.log(`  mundo (u):   ${models[0].mins.map(Math.round)} .. ${models[0].maxs.map(Math.round)}`);
console.log(`  pátio (u):   x ${salaoU.minX}..${salaoU.maxX}  y ${salaoU.minY}..${salaoU.maxY}  (${salaoUx}x${salaoUy}u -> ${medidas.salao.x}x${medidas.salao.z} m)`);
console.log(`  piscina:     ${medidas.piscina.hx * 2}x${medidas.piscina.hz * 2} m em (${pcx}, ${pcz}) — água ${medidas.piscina.profundidade_agua} m no original`);
console.log(`  corredores:  O ${medidas.corredores.oeste} · L ${medidas.corredores.leste}   decks: S ${medidas.decks.sul} · N ${medidas.decks.norte}`);
console.log(`  spawns:      CT (${ctX}, ${ctZ}) × T (${tX}, ${tZ}) -> ${medidas.spawns.distancia_centroides} m entre centróides`);
console.log(`  verticais:   ${verticais.length} func_wall  ·  fator ${r4(F)} m/u (por eixo ${r4(fx)}/${r4(fz)})`);
console.log(`  -> ${path.relative(RAIZ, SAIDA)}`);
