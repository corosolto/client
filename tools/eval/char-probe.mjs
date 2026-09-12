#!/usr/bin/env node
/* ============================================================================
   char-probe.mjs — A RÉGUA DOS PERSONAGENS (C1..C6)
   ----------------------------------------------------------------------------
   POR QUE ESTE ARQUIVO EXISTE
   O dono jogou e disse, literal: "os funkeiros tão ainda balão, e o coach quântico e
   dollynho ruim". Antes disso: "veja os personagens funkeiro, compare com o mandrake.
   veja o dollynho é um dos piores personagens do jogo". E a leitura dos screenshots
   dele foi: "o funkeiro de azul é liso, cor chapada, sem textura nenhuma — parece
   manequim. Ao lado tem carro com sujeira, normal map e reflexo. Os palhaços têm bem
   mais detalhe. Não é personagem feio, é TRÊS NÍVEIS DE ACABAMENTO na mesma tela".

   Nada disso é gosto. Tudo isso é NÚMERO:
     "balão"                  -> razão antropométrica fora da faixa   (C1)
     "um maior que o outro"   -> altura em metros                     (C2)
     "flutuando / afundado"   -> base da bbox em y                    (C3)
     "não segura a arma"      -> distância palma↔grip                 (C4)
     "liso, cor chapada"      -> nº de mapas e resolução de textura   (C5)
     "todo mundo igual"       -> IoU de silhueta par a par            (C6)

   A REGRA DA CASA (a mesma do tools/eval/ref-measure.py, que destravou a frente de
   armas depois de 3 dias perdidos): RÉGUA ANTES DO CONSERTO, E TETO SÓ COM
   PROCEDÊNCIA. Lá, a VM12 exigia "boca em y ≥ 0,66" e o vmattach dizia "coronha
   INTEIRA no canto" — dois números que ninguém tinha medido em pixel nenhum, e que
   estavam ERRADOS (a referência mede 0,51-0,60, e a coronha SAI pela quina). Aqui a
   regra vale igual, e ela me morde primeiro: ver o bloco PROCEDÊNCIA logo abaixo.

   ── PROCEDÊNCIA DOS TETOS DO C1 (leia antes de acreditar em qualquer faixa) ────
   As fotos AGORA EXISTEM: `references/funkeiros/` tem 22 e `references/palhacos/` tem 21
   (espelhadas no commit e332c87). Foram TODAS medidas pelo tools/eval/ref-body.py e as
   máscaras foram OLHADAS (`--masks`, /tmp/refbody_*.png). Resultado, dito na cara: são
   selfies e closes; a segmentação heurística devolve a MÃO, um pedaço de JAQUETA ou o
   cabelo de outra pessoa do fundo, e o ombro/altura sai entre 0,42 e 3,78 (um humano mede
   0,259). Sobra ~1 foto de corpo inteiro utilizável — não é amostra. O ref-body.py exige
   6 fotos aceitas pra virar teto, e ele DIZ por que não virou.
   Portanto o teto absoluto do C1 continua sendo FALLBACK PUBLICADO, declarado como tal em
   todo lugar que ele aparece (campo `procedencia` do JSON, coluna do relatório):
     Drillis, R. & Contini, R. (1966), "Body Segment Parameters", NYU School of
     Engineering, report 1166-03 — a tabela de frações de estatura reproduzida em
     Winter, D.A., "Biomechanics and Motor Control of Human Movement", fig. 4.1.
   Ver tools/eval/ref-body.py, que é o script que produz esse teto E que MEDE as fotos
   de verdade assim que elas existirem (basta o dono soltar os JPGs nas pastas).

   O TETO QUE **NÃO** É FALLBACK, e por isso é o principal: o C1 também compara TODOS
   os personagens ENTRE SI (mediana + MAD do próprio elenco). Esse é o teto com
   procedência total — ele não precisa de foto nenhuma, porque a reclamação do dono é
   COMPARATIVA ("compare com o mandrake", "três níveis na mesma tela"). Um personagem
   3 MADs fora da mediana do elenco é o "balão", e o número diz de quanto.

   ── AS DUAS FONTES DE GEOMETRIA (e por que a sonda mede as duas) ───────────────
   O jogo tem DOIS caminhos de personagem e o dono vê um ou outro sem saber qual:
     (a) GLB riggado, public/models/characters/<id>.glb  -> glbchars.js
     (b) fallback procedural de caixas, characters.js:buildCharacter
   glbchars.js:227-232 engole a falha de carga ("model load failed") e cai em (b)
   silenciosamente. Então uma régua que só olhasse (a) mediria um jogo que talvez não
   seja o que está na tela. Esta mede as duas e IMPRIME QUAL usou, por personagem.
   NESTA ÁRVORE os 45 GLB existem (commit e332c87) e são eles que a régua mede — 44 dos 44
   personagens do elenco saem com fonte `glb`. O que NÃO existe aqui é `public/models/anims/`
   (nenhum clipe), então tudo o que sai desta sonda é BIND POSE. Está declarado no C7 e no
   tp-mount-probe (poseOrBind). Sem clipe não dá pra medir deformação de animação, e a
   sonda diz isso em vez de fingir que mediu.

   ── PROTOCOLO ─────────────────────────────────────────────────────────────────
   Node puro. Sem browser, sem rede, sem npm install:
     • DOM stubado + three vendorizado pela ponte de node_modules — mesmo protocolo do
       tools/eval/botsim.mjs:88-111 e do tools/eval/pickup-check.mjs.
     • leitura de GLB e skinning REUSADOS de tools/eval/tp-mount-probe.mjs (readGLB,
       buildScene, worldMats, poseWith, skinVerts, skinTris, bboxOf). A tarefa manda
       reaproveitar e não duplicar; foi por isso que aquele arquivo ganhou uma guarda de
       CLI e passou a exportar os utilitários.
     • o C4 (mão na arma) NÃO é reimplementado: esta sonda EXECUTA o tp-mount-probe.mjs
       e lê a tabela dele, do mesmo jeito que o invariants.mjs executa os arneses.

   uso:  node tools/eval/char-probe.mjs                 (escreve char_probe.json)
         node tools/eval/char-probe.mjs --json          (JSON no stdout)
         node tools/eval/char-probe.mjs --sem-c4        (pula o tp-mount-probe, mais rápido)
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  readGLB, buildScene, worldMats, poseWith, skinVerts, skinTris, bboxOf,
} from './tp-mount-probe.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PUB = path.join(ROOT, 'public');
const JS = path.join(PUB, 'js');
const SO_JSON = process.argv.includes('--json');
const SEM_C4 = process.argv.includes('--sem-c4');

/* ═══════════════════════════════════════════════════════════════════════════
   TETO ABSOLUTO — FALLBACK PUBLICADO (ver bloco PROCEDÊNCIA no topo)
   Frações de ESTATURA de um adulto. Não são opinião, mas TAMBÉM NÃO SÃO as fotos
   que a tarefa pedia: as fotos não existem nesta árvore. Quem for apertar estes
   números tem que trocá-los por medição em imagem, não por outro palpite.
   ═══════════════════════════════════════════════════════════════════════════ */
export const REF_HUMANO = {
  procedencia: 'FALLBACK PUBLICADO (Drillis & Contini 1966 / Winter fig.4.1) — NÃO é foto medida',
  cabecaSobreAltura: 0.130,      // vértex→mento = 0,130 H  (o "1/7,5" do enunciado = 0,133)
  ombroSobreAltura: 0.259,       // largura biacromial
  cinturaSobreOmbro: 0.740,      // largura de quadril 0,191 H ÷ ombro 0,259 H
  larguraTorsoSobreAltura: 0.174, // largura de tórax
  bracoSobreAltura: 0.440,       // acrômio→dactílio (0,186 braço + 0,146 antebraço + 0,108 mão)
  pernaSobreAltura: 0.530,       // trocânter maior→chão
  // Tolerância de "ainda lê como gente". Larga de propósito: sátira deforma, e o
  // enunciado proíbe inventar teto. ±35% é o que separa "estilizado" de "balão".
  tolerancia: 0.35,
};

// C2: faixa de altura. Teto COM procedência interna: glbchars.js normaliza todo mundo
// para TARGET_HEIGHT, e game.js mira na cabeça via hitbox de 0,30 m de altura
// (glbchars.js:296 BoxGeometry(0.26, 0.30, 0.26)). Se dois personagens diferem mais que
// meia hitbox de cabeça, a mira na cabeça vira loteria. Daí 0,15 m.
const C2_DISPERSAO_MAX = 0.15;
// C3: pé no chão. 1 cm é a folga que o pickup-check.mjs já usa como "encostado" (0,05)
// dividida com margem — personagem é mais visível que arma largada.
const C3_TOL = 0.01;
/* C3 mede PÉ, não a bbox inteira. Caso que comprou a distinção (medido em 30/08):
   proerd/crouch tinha a base da bbox a -0,43 m e os PÉS plantados em +0,003 — quem
   cruzava o chão era o rabo (vértices skinados em Hips). A régua de bbox pedia um
   offset de +43 cm que faria o boneco VOAR. Canela/pé = Left/RightLeg, Foot, ToeBase
   (44/44 do elenco: 1 skin, 8 juntas mixamo de perna — conferido). UpLeg fica fora:
   coxa não é contato com o chão. */
const RX_PE = /foot|toe|ankle|heel|shin|calf|knee|(?<!up)leg/i;

/* ── ponte do especificador nu `three` (idêntica ao botsim.mjs:88-111) ─────────
   Os módulos do jogo fazem `import * as THREE from 'three'`, resolvido no browser pelo
   import map do index.astro. Em node não há import map e `npm install` está bloqueado,
   então plantamos um pacote-ponte FORA do repo apontando pro three vendorizado. */
{
  const raiz = path.resolve(HERE, '../../..');
  const shim = path.join(raiz, 'node_modules', 'three');
  if (!fs.existsSync(path.join(shim, 'index.js'))) {
    fs.mkdirSync(shim, { recursive: true });
    fs.writeFileSync(path.join(shim, 'package.json'), JSON.stringify({
      name: 'three', version: '0.160.0', type: 'module', main: 'index.js',
      exports: { '.': './index.js', './addons/*': './addons/*' },
    }));
    try { fs.symlinkSync(path.join(PUB, 'vendor/three.module.js'), path.join(shim, 'index.js')); } catch { /* já existe */ }
    try { fs.symlinkSync(path.join(PUB, 'vendor/addons'), path.join(shim, 'addons'), 'dir'); } catch { /* já existe */ }
  }
}

/* ── DOM mínimo: characters.js lê location.search, localStorage e cria um canvas
   (contactShadowTexture). É o subconjunto do stub do pickup-check.mjs. ───────── */
const ctx2d = new Proxy({}, {
  get: (t, k) => {
    if (k === 'canvas') return { width: 64, height: 64 };
    if (k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern') return () => ({ addColorStop() {} });
    // measureText tem que devolver {width}: map_havan.js:326 e map_ferrovelho.js:320 fazem
    // `measureText(t).width` dentro de um while de ajuste de fonte. Sem isto os dois mapas
    // nem constroem, e a escala do C5 sairia contando 3 mapas em vez de 5.
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'getImageData' || k === 'createImageData') return (a, b, w, h) => {
      const W = (h === undefined ? a : w) | 0, H = (h === undefined ? b : h) | 0;
      return { data: new Uint8ClampedArray(Math.max(4, W * H * 4)), width: W, height: H };
    };
    return () => {};
  },
});
globalThis.location = { search: '', href: 'http://x/', pathname: '/' };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
// addEventListener no elemento: os mapas criam texturas a partir de canvas/imagem e o
// three registra listeners de load neles ("image.addEventListener is not a function" foi
// o erro exato que derrubou a medição de runtime do C5 na primeira tentativa).
const mkEl = () => ({
  width: 64, height: 64, style: {}, getContext: () => ctx2d,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  setAttribute() {}, appendChild(c) { return c; }, remove() {},
  toDataURL: () => 'data:image/png;base64,', getBoundingClientRect: () => ({ width: 64, height: 64, left: 0, top: 0 }),
});
globalThis.Image = class { constructor() { Object.assign(this, mkEl()); } };
globalThis.document = {
  createElement: mkEl,
  createElementNS: mkEl,   // ImageLoader do three cria <img> por NS e registra listener nele
  addEventListener() {}, body: { appendChild() {}, style: {} },
  querySelector: () => null, getElementById: () => null,
};
globalThis.window = globalThis;
// navigator já existe em node 22 e é somente-leitura: define só se faltar.
if (!globalThis.navigator) globalThis.navigator = { userAgent: 'node' };
globalThis.self = globalThis;

const THREE = await import('three');
const { CHARACTERS, buildCharacter, poseCharacter } = await import(`${JS}/characters.js`);

/* ═══════════════════════════════════════════════════════════════════════════
   1. GEOMETRIA: uma estrutura comum para as duas fontes
   ---------------------------------------------------------------------------
   Tudo que vem daqui está em METROS, com o personagem JÁ normalizado do jeito que o
   jogo o normaliza (glbchars.js:319-322 escala pro TARGET_HEIGHT e assenta os pés em
   y=0). Medir na escala crua do asset é o erro clássico deste projeto: os GLB do Meshy
   têm malha em ~1,7 e ossos em ~170, e quem mede errado erra por 100× (está documentado
   no topo do tp-mount-probe.mjs). Aqui as duas fontes saem no MESMO espaço, e é isso que
   torna a comparação GLB × procedural (a coluna "fonte" do relatório) honesta.
   ═══════════════════════════════════════════════════════════════════════════ */
const TARGET_H = 1.72;   // = TARGET_HEIGHT do glbchars.js:52

/* larguraNaFaixa — LARGURA DA SEÇÃO TRANSVERSAL entre duas alturas, medida por
   CLIPE DE ARESTA e não por vértice dentro da faixa.
   POR QUE (bug que esta régua teve na primeira execução, e que é exatamente o modo de
   falha que o ref-measure.py adverte — "não confie num número que você não olhou"):
   a versão anterior somava só os VÉRTICES com y na faixa. Num personagem procedural o
   tronco é uma BoxGeometry: os 24 vértices dela estão todos nos cantos (y = 0,78 e
   y = 1,38) e NENHUM cai numa fatia de 10 cm no meio do peito. Resultado medido: a
   régua reportava ombro/altura = 0,084 (14 cm de ombro num boneco de 1,66 m) e
   cintura/ombro = 3,17 — números que não descrevem boneco nenhum, e que teriam virado
   "teto" se eu não tivesse olhado. Aqui cada ARESTA de cada triângulo é recortada na
   faixa e os extremos do recorte entram na conta; face plana sem vértice interno passa
   a contribuir corretamente. Em malha densa (GLB) o resultado converge pro anterior. */
function larguraNaFaixa(tris, eixo, y0, y1) {
  const P = tris.pos, I = tris.idx;
  let mn = Infinity, mx = -Infinity;
  const põe = (c) => { if (c < mn) mn = c; if (c > mx) mx = c; };
  for (let t = 0; t < I.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = I[t + e] * 3, b = I[t + (e + 1) % 3] * 3;
      const ya = P[a + 1], yb = P[b + 1];
      const ca = P[a + eixo], cb = P[b + eixo];
      if (ya >= y0 && ya <= y1) põe(ca);
      if (yb >= y0 && yb <= y1) põe(cb);
      // aresta atravessando um dos limites da faixa: interpola o ponto de cruzamento
      for (const yl of [y0, y1]) {
        if ((ya - yl) * (yb - yl) < 0) {
          const k = (yl - ya) / (yb - ya);
          põe(ca + (cb - ca) * k);
        }
      }
    }
  }
  return mx > mn ? mx - mn : null;
}


// ── fonte (a): GLB riggado ────────────────────────────────────────────────────
/* ═══════════════════════════════════════════════════════════════════════════════════
   char-probe.mjs:229 — O MARCO DE OMBRO ESTAVA SENDO SORTEADO PELA ORDEM DOS NÓS
   -----------------------------------------------------------------------------------
   ESTE É O DEFEITO DE MEDIDOR QUE INVENTOU O "BALÃO" DA FAMÍLIA C. Está aqui em detalhe
   porque a régua da casa manda desconfiar do medidor antes do modelo.
   `lsho` era /left.?(shoulder|arm)$/i — casa com `LeftShoulder` E com `LeftArm`, dois
   ossos DIFERENTES a 13 cm um do outro. Quem decidia qual valia era o `Array.find`, isto
   é, a ORDEM DOS NÓS DENTRO DO GLB. E ela não é a mesma nas três famílias de rig:
     • 24 e 26 juntas (mandrake, coach, dollynho…): `LeftArm` é o nó 10, `LeftShoulder` o 11
       -> a régua media DELTOIDE a DELTOIDE  -> ombro/H ≈ 0,19
     • 28 juntas (jozo, raul, oakley, os 17 rigados por transplante): `LeftShoulder` é o 14,
       `LeftArm` o 15  -> a régua media CLAVÍCULA a CLAVÍCULA -> ombro/H = 0,039 (6,7 cm!)
   Resultado medido ANTES: os 18 modelos de 28 juntas apareciam TODOS com ombro/H = 0,039
   e cintura/ombro entre 5,0 e 18,7 (o jozo com 18,7 e "z 30,3" de outlier do elenco), e a
   leitura óbvia era "os funkeiros são um balão". Não são: 0,039 não é ombro de ninguém, é
   a distância entre as duas clavículas. A régua estava comparando maçã com laranja EXATA-
   MENTE ao longo da fronteira que separa o mandrake (que o dono aprova) dos outros
   funkeiros (que ele reprova) — ou seja, o número confirmava a queixa por acidente.
   Agora o marco é escolhido por PREFERÊNCIA EXPLÍCITA e igual dos dois lados: deltoide
   (`LeftArm`/`RightArm`) primeiro, clavícula só como último recurso, e a régua REGISTRA
   qual osso usou (`marcosUsados` no JSON) pra ninguém precisar confiar.
   ═══════════════════════════════════════════════════════════════════════════════════ */
const RX = {
  head: /^(mixamorig)?head$/i, neck: /^(mixamorig)?neck$/i, hips: /^(mixamorig)?hips$/i,
  // ordem = preferência. Deltoide antes de clavícula: é o vão biacromial da antropometria.
  lsho: [/^(mixamorig)?left.?arm$/i, /^(mixamorig)?left.?shoulder$/i],
  rsho: [/^(mixamorig)?right.?arm$/i, /^(mixamorig)?right.?shoulder$/i],
  lhand: /left.?hand$/i, larm: /left.?arm$/i, lfore: /left.?forearm$/i,
  lupleg: /left.?upleg$/i, lfoot: /left.?foot$/i, spine: /^(mixamorig)?spine$/i,
};
let _ultimoOsso = null;
function ossoPos(sc, W, rx, S) {
  const lista = Array.isArray(rx) ? rx : [rx];
  let n = null;
  for (const r of lista) { n = sc.nodes.find((x) => r.test(x.name)); if (n) break; }
  if (!n) { _ultimoOsso = null; return null; }
  _ultimoOsso = n.name;
  const m = W[n.i];
  return [m[12] * S, m[13] * S, m[14] * S];
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   C7 — A FAMÍLIA DE RIG. "os personagens mal riggados continuam"
   -----------------------------------------------------------------------------------
   O dono não reclama de personagem: ele reclama de GRUPO ("todos os funkeiros TIRANDO o
   mandrake"). Grupo é rig. Os 45 GLB se separam em três famílias pelo NÚMERO DE JUNTAS, e
   dentro da família de 28 juntas o esqueleto é LITERALMENTE O MESMO ARQUIVO: as translações
   de junta são byte-idênticas nos 18 modelos (o doador é o `mst`, transplantado por
   tools/rig-from-donor.mjs com auto-skin por proximidade — está escrito no glbchars.js:32-41).
   Um esqueleto que serve pra 18 malhas diferentes não serve direito pra nenhuma, e isso vira
   número em três medidas, todas independentes de clipe (medem a BIND, que é o que existe
   nesta árvore):
     • impressaoEsqueleto — soma das translações de junta. Igual = mesmo esqueleto.
     • desalinhamento     — RMS, por junta, entre a posição do OSSO e o centroide da MALHA
                            que ele domina. É "o osso está dentro do membro dele?".
     • alavancaPalma      — |palma − osso da mão| / antebraço. É o braço de alavanca do
                            mount da arma (ver glbchars.js:measurePalmLocal e a seção 5 do
                            tp-mount-probe). > 0,9 = a arma vai parar longe da mão.
     • abducaoBraco       — ângulo do braço na BIND. Diz se a MALHA e o ESQUELETO estão na
                            mesma pose, e é o que separa "postura errada" de "postura ok".
   ═══════════════════════════════════════════════════════════════════════════════════ */
function rigDoGLB(g, sc, Wb, S, off, joints, dropArm) {
  const J = g.json;
  const nomes = joints.map((i) => sc.nodes[i].name);
  const bpos = joints.map((n) => [Wb[n][12] * S, Wb[n][13] * S + off, Wb[n][14] * S]);
  const bp = (nm) => { const k = nomes.findIndex((x) => new RegExp(`^${nm}$`, 'i').test(x)); return k >= 0 ? bpos[k] : null; };
  // impressão digital do esqueleto: soma das translações locais de junta (invariante a
  // ordem de nó, sensível a qualquer osso movido). Dois rigs com a MESMA impressão são,
  // pra todos os efeitos, o mesmo esqueleto.
  const fp = joints.reduce((a, i) => a + sc.nodes[i].t.reduce((x, y) => x + Math.abs(y), 0), 0);
  // desalinhamento osso ↔ malha
  const vs = skinVerts(sc, g, Wb, 2);
  const acc = joints.map(() => [0, 0, 0]), cnt = joints.map(() => 0);
  for (const v of vs) {
    if (!v.j) continue;
    let bi = -1, bw = 0;
    for (let k = 0; k < 4; k++) if (v.w[k] > bw) { bw = v.w[k]; bi = v.j[k]; }
    if (bi < 0 || bw < 0.5 || bi >= joints.length) continue;
    acc[bi][0] += v.p[0] * S; acc[bi][1] += v.p[1] * S + off; acc[bi][2] += v.p[2] * S; cnt[bi]++;
  }
  /* ── RAIO DE SKIN: A MEDIDA DE "BALÃO" QUE NÃO DEPENDE DE CLIPE ────────────────────
     Depois que o marco de ombro foi consertado (ver o bloco em char-probe.mjs:229), a
     PROPORÇÃO de bind dos funkeiros ficou indistinguível da do mandrake — ou seja, "balão"
     NÃO é proporção. Mas há uma coisa que a bind pose ainda diz sobre como o corpo vai
     INCHAR quando animar: a distância de cada vértice até o SEGMENTO DE OSSO que o domina.
     Esse raio é o BRAÇO DE ALAVANCA da deformação: um grau de rotação de junta desloca o
     vértice proporcionalmente a ele. Rig bem ajustado = raio ≈ raio do membro. Esqueleto
     alheio, colado por proximidade, = vértices pendurados longe do osso, e cada passo da
     caminhada empurra a malha pra fora. É isso que lê como "balão"/"mal riggado".
     MEDIDO (mediana por personagem, corpo normalizado em 1,72 m):
       mandrake            0,087 m      | família de 24 juntas: 0,069-0,115
       raul 0,171  chave 0,168  fluxo 0,166  funkraiz 0,158  criarj 0,150
       trapfunk 0,144  ostentacao 0,143  oakley 0,134
     Ou seja: os funkeiros de esqueleto transplantado carregam 1,5× a 2,0× o raio de skin
     do mandrake. A queixa "todos os funkeiros tirando o mandrake são um balão" tem, aqui,
     um número — e ele separa exatamente os mesmos personagens que o dono separou. */
  const kidsDe = joints.map(() => []);
  joints.forEach((nj, k) => (sc.nodes[nj].children || []).forEach((c) => { const ck = joints.indexOf(c); if (ck >= 0) kidsDe[k].push(ck); }));
  const distSeg = (p, a, b) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const L = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    let t = L ? ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + ab[0] * t), p[1] - (a[1] + ab[1] * t), p[2] - (a[2] + ab[2] * t));
  };
  const raios = [];
  for (const v of vs) {
    if (!v.j) continue;
    let bi = -1, bw = 0;
    for (let k = 0; k < 4; k++) if (v.w[k] > bw) { bw = v.w[k]; bi = v.j[k]; }
    if (bi < 0 || bw < 0.5 || bi >= joints.length) continue;
    const p = [v.p[0] * S, v.p[1] * S + off, v.p[2] * S];
    let melhor = Infinity;
    if (kidsDe[bi].length) for (const c of kidsDe[bi]) melhor = Math.min(melhor, distSeg(p, bpos[bi], bpos[c]));
    else melhor = Math.hypot(p[0] - bpos[bi][0], p[1] - bpos[bi][1], p[2] - bpos[bi][2]);
    raios.push(melhor);
  }
  raios.sort((a, b) => a - b);
  const qtl = (fr) => (raios.length ? raios[Math.min(raios.length - 1, Math.floor(raios.length * fr))] : null);

  /* ── CONVENÇÃO DE SKIN: a carne está pintada pelo osso PROXIMAL ou pelo DISTAL? ──────
     Num rig Meshy o osso aponta pro filho: `LeftArm` é o OMBRO, `LeftForeArm` o COTOVELO,
     `LeftHand` o PUNHO. Logo a carne do BRAÇO pertence a `LeftArm` (segmento junta→FILHO).
     O auto-skin do rig-from-donor usava segmento junta→PAI e pintava tudo com a junta
     DISTAL — o braço obedecendo ao cotovelo, a coxa ao joelho. Dobrar uma junta girava o
     membro inteiro, e é isso que o olho lê como "balão" (04/08).
     A conta: centroide da carne que a junta domina, comparado ao MEIO do segmento
     junta→pai e ao MEIO do segmento junta→filho. Quem ganha por 25% leva o voto.
     Medido: raul transplantado 15×0 (invertido) contra mandrake do Mint 0×17 (certo).
     Depois do tools/reskin-glb.mjs, os 17 transplantados foram para 0×N.
     Guarda em runtime: invariante CHR7. Régua do efeito: tools/eval/pose-inflate.mjs. */
  const paiDe = joints.map(() => -1);
  kidsDe.forEach((cs, k) => cs.forEach((c) => { paiDe[c] = k; }));
  let votoPai = 0, votoFilho = 0;
  const invertidos = [];
  joints.forEach((_, k) => {
    if (!cnt[k] || !/arm|leg|hand|foot|spine|head|neck|hips|shoulder|toe/i.test(nomes[k])) return;
    if (paiDe[k] < 0 || !kidsDe[k].length) return;
    const c = [acc[k][0] / cnt[k], acc[k][1] / cnt[k], acc[k][2] / cnt[k]];
    const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const mp = meio(bpos[k], bpos[paiDe[k]]), mf = meio(bpos[k], bpos[kidsDe[k][0]]);
    const dP = Math.hypot(c[0] - mp[0], c[1] - mp[1], c[2] - mp[2]);
    const dF = Math.hypot(c[0] - mf[0], c[1] - mf[1], c[2] - mf[2]);
    if (dP < dF * 0.75) { votoPai++; invertidos.push(nomes[k]); } else if (dF < dP * 0.75) votoFilho++;
  });

  let som = 0, n = 0, pior = 0, piorN = null;
  joints.forEach((_, k) => {
    if (!cnt[k]) return;
    const c = [acc[k][0] / cnt[k], acc[k][1] / cnt[k], acc[k][2] / cnt[k]];
    const d = Math.hypot(c[0] - bpos[k][0], c[1] - bpos[k][1], c[2] - bpos[k][2]);
    som += d * d; n++;
    if (d > pior) { pior = d; piorN = nomes[k]; }
  });
  // alavanca da palma (a conta do glbchars.js:measurePalmLocal, ANTES da guarda)
  const hk = nomes.findIndex((x) => /^right.?hand$/i.test(x));
  const curlK = nomes.map((x, k) => (/^curl_r$/i.test(x) ? k : -1)).filter((k) => k >= 0);
  let pc = [0, 0, 0], pn = 0;
  if (hk >= 0) for (const v of vs) {
    if (!v.j) continue;
    let w = 0; for (let k = 0; k < 4; k++) if (v.j[k] === hk || curlK.includes(v.j[k])) w += v.w[k];
    if (w > 0.5) { pc[0] += v.p[0] * S; pc[1] += v.p[1] * S + off; pc[2] += v.p[2] * S; pn++; }
  }
  const hand = bp('RightHand'), fore = bp('RightForeArm'), armR = bp('RightArm');
  const palm = pn ? [pc[0] / pn, pc[1] / pn, pc[2] / pn] : null;
  const antebraco = hand && fore ? Math.hypot(hand[0] - fore[0], hand[1] - fore[1], hand[2] - fore[2]) : null;
  const dPalma = palm && hand ? Math.hypot(palm[0] - hand[0], palm[1] - hand[1], palm[2] - hand[2]) : null;
  // abdução do braço na BIND: ângulo entre (mão − ombro) e a vertical pra baixo.
  // T-pose ≈ 90°, braço caído ≈ 0°.
  let abducao = null;
  if (armR && hand) {
    const u = [hand[0] - armR[0], hand[1] - armR[1], hand[2] - armR[2]];
    const l = Math.hypot(...u) || 1;
    abducao = Math.acos(Math.max(-1, Math.min(1, -u[1] / l))) * 180 / Math.PI;
  }
  return {
    familia: `${J.nodes.length}n/${joints.length}j`,
    juntas: joints.length, nos: J.nodes.length, clipesNoGLB: (J.animations || []).length,
    impressaoEsqueleto: +fp.toFixed(2),
    curlDuplicado: nomes.filter((x) => /^curl_/i.test(x)).length,
    convencaoSkinPai: votoPai, convencaoSkinFilho: votoFilho,
    ossosInvertidos: invertidos.slice(0, 6),
    raioSkinP50: qtl(0.5) != null ? +qtl(0.5).toFixed(3) : null,
    raioSkinP95: qtl(0.95) != null ? +qtl(0.95).toFixed(3) : null,
    desalinhamentoRMS: n ? +Math.sqrt(som / n).toFixed(4) : null,
    piorJunta: piorN, piorDesalinhamento: +pior.toFixed(3),
    antebraco: antebraco != null ? +antebraco.toFixed(3) : null,
    dPalmaOsso: dPalma != null ? +dPalma.toFixed(3) : null,
    alavancaPalma: dPalma != null && antebraco ? +(dPalma / antebraco).toFixed(2) : null,
    abducaoBraco: abducao != null ? +abducao.toFixed(1) : null,
  };
}

function medirGLB(id, file) {
  const g = readGLB(file), sc = buildScene(g);
  const Wb = worldMats(sc);
  const vsRaw = skinVerts(sc, g, Wb, 1);
  const bbRaw = bboxOf(vsRaw);
  const hRaw = (bbRaw[4] - bbRaw[1]) || 1;
  const S = TARGET_H / hRaw;                    // exatamente o `s` do glbchars.js:321
  const vs = vsRaw.map((v) => ({ ...v, p: [v.p[0] * S, (v.p[1] - bbRaw[1]) * S, v.p[2] * S] }));
  const bb = bboxOf(vs);

  // marcos por OSSO (o esqueleto é a única fonte confiável de "onde é o ombro"; a bbox
  // não distingue ombro de mochila). Deslocados pra mesma origem da malha.
  const off = -bbRaw[1] * S;
  const usados = {};
  const P = (rx, rot) => { const p = ossoPos(sc, Wb, rx, S); if (rot) usados[rot] = _ultimoOsso; return p ? [p[0], p[1] + off, p[2]] : null; };
  const head = P(RX.head, 'cabeca'), neck = P(RX.neck, 'pescoco'), hips = P(RX.hips, 'quadril');
  const lsho = P(RX.lsho, 'ombroE'), rsho = P(RX.rsho, 'ombroD'), lhand = P(RX.lhand, 'maoE');
  const lupleg = P(RX.lupleg, 'coxaE'), lfoot = P(RX.lfoot, 'peE');

  // largura de ombro: distância entre os ossos quando existem; senão, largura da malha
  // na faixa de altura do pescoço (fatia de 6 cm).
  let ombroL = lsho && rsho ? Math.abs(lsho[0] - rsho[0]) : null;
  const tris = skinTris(sc, g, Wb);
  for (let i = 0; i < tris.pos.length; i += 3) {
    tris.pos[i] *= S; tris.pos[i + 1] = (tris.pos[i + 1] - bbRaw[1]) * S; tris.pos[i + 2] *= S;
  }
  /* char-probe.mjs:280 — TÓRAX SEM BRAÇO, IGUAL AO CAMINHO PROCEDURAL.
     O caminho procedural já excluía braço destas fatias, com o motivo escrito em
     char-probe.mjs:307-312 ("com os braços dentro, o tronco dava 0,244, 40% acima da
     referência — o erro era do MEDIDOR"). O caminho GLB NÃO excluía, e por isso reportava
     larguraTorso/H = 1,000 no mandrake e 0,994 no raul: 1,71 m de "tórax". Isso não é
     tórax, é o VÃO DE BRAÇOS de um boneco em T-pose (que é a pose de bind de 43 dos 45
     GLB). Com o mesmo defeito nos dois lados a comparação mandrake × funkeiros media
     "quem abre mais o braço na bind", não "quem é mais largo". */
  const joints = (g.json.skins && g.json.skins[0] && g.json.skins[0].joints) || [];
  const dropArm = new Set(sc.nodes.filter((n) => /arm|hand|shoulder|clavicle|curl/i.test(n.name))
    .map((n) => joints.indexOf(n.i)).filter((k) => k >= 0));
  const trisCorpo = skinTris(sc, g, Wb, dropArm);
  for (let i = 0; i < trisCorpo.pos.length; i += 3) {
    trisCorpo.pos[i] *= S; trisCorpo.pos[i + 1] = (trisCorpo.pos[i + 1] - bbRaw[1]) * S; trisCorpo.pos[i + 2] *= S;
  }
  const fatiaW = (y0, y1) => larguraNaFaixa(tris, 0, y0, y1);
  const fatiaWc = (y0, y1) => larguraNaFaixa(trisCorpo, 0, y0, y1);
  const fatiaDc = (y0, y1) => larguraNaFaixa(trisCorpo, 2, y0, y1);
  const yOmbro = neck ? neck[1] : bb[4] * 0.82;
  const yCintura = hips ? hips[1] : bb[4] * 0.55;
  if (!ombroL) ombroL = fatiaW(yOmbro - 0.05, yOmbro + 0.01);
  return {
    fonte: 'glb', file, bb, hRaw, escala: S, tris,
    marcosUsados: usados,
    rig: rigDoGLB(g, sc, Wb, S, off, joints, dropArm),
    alturaOsso: head ? head[1] : null,
    marcos: {
      alturaTotal: bb[4] - bb[1],
      // "cabeça" antropométrica = vértex→mento. Aproximação de rig: topo da malha até o
      // osso Neck (o mento fica ~2 cm acima do pescoço; o erro é menor que a diferença
      // entre um humano e um mascote, que é o que se quer separar).
      cabeca: neck ? bb[4] - neck[1] : null,
      ombroLargura: ombroL,
      cinturaLargura: fatiaWc(yCintura - 0.04, yCintura + 0.04),
      torsoLargura: fatiaWc(yOmbro - 0.28, yOmbro - 0.10),
      torsoProfundidade: fatiaDc(yOmbro - 0.28, yOmbro - 0.10),
      braco: lsho && lhand ? Math.hypot(lsho[0] - lhand[0], lsho[1] - lhand[1], lsho[2] - lhand[2]) : null,
      perna: lupleg && lfoot ? Math.abs(lupleg[1] - lfoot[1]) : (hips ? hips[1] : null),
      larguraMax: bb[3] - bb[0],
    },
    // acabamento (C5) direto do JSON do glTF
    acab: acabamentoGLB(g),
  };
}

// ── fonte (b): procedural (characters.js) ─────────────────────────────────────
// buildCharacter devolve {group, parts}. As medidas saem da ÁRVORE DE OBJETOS em
// espaço de mundo — nunca dos literais do código: se alguém mexer num box, a régua
// acompanha sozinha. `parts` dá o nome dos marcos (head/torso/legL/armL), que é o
// equivalente do esqueleto no caminho GLB.
function medirProcedural(def) {
  const { group, parts } = buildCharacter(def);
  group.updateMatrixWorld(true);
  const semArma = new Set();
  if (parts.gun) parts.gun.traverse((o) => semArma.add(o));
  // conjunto SEM BRAÇOS para as larguras de tórax/cintura: a referência publicada
  // `larguraTorsoSobreAltura` = 0,174 é LARGURA DE TÓRAX, e o braço pendurado ao lado do
  // corpo entra na fatia e faz a régua ler envergadura. Medido: com os braços dentro, o
  // tronco dava 0,244 (40% acima da referência) num corpo cuja largura real é exatamente
  // 0,299/1,72 = 0,174. Ou seja: o erro era do MEDIDOR, e ele inflava o índice de balão
  // em 40% — exatamente o tipo de número que viraria "teto" sem ninguém conferir.
  // O OMBRO continua medido COM os braços: vão biacromial inclui o deltoide por definição.
  const semBraco = new Set(semArma);
  for (const k of ['armL', 'armR']) if (parts[k]) parts[k].traverse((o) => semBraco.add(o));

  // triângulos em espaço de mundo, ignorando a sombra de contato (é um decalque no
  // chão, não corpo — entrava na silhueta como um disco de 0,86 m e achatava o IoU).
  const pos = [], idx = [], posC = [], idxC = [];
  let nMat = 0, nTri = 0;
  const mats = new Set();
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    if (o.userData && o.userData.csShadow) return;
    // a ARMA não é o personagem. Ela é idêntica em todos os procedurais (buildRifle()),
    // então mantê-la na máscara só ADICIONA área comum e empurra todo IoU pra cima —
    // mascarando exatamente a diferença de corpo que o C6 existe pra medir.
    if (semArma.has(o)) return;
    if (o.material && o.material.userData && o.material.userData.csShadow) return;
    if (o.name === 'contactShadow') return;
    const g = o.geometry, p = g.attributes.position, base = pos.length / 3;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z); }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx.push(base + a[i]); nTri += a.length / 3; }
    else { for (let i = 0; i < p.count; i++) idx.push(base + i); nTri += p.count / 3; }
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && mats.add(m));
    // corpo = sem braço e sem adereço (boné/cabelo/mochila): é o que a antropometria mede
    if (semBraco.has(o) || (o.userData && o.userData.adereco)) return;
    const bC = posC.length / 3;
    { const v2 = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v2.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); posC.push(v2.x, v2.y, v2.z); } }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idxC.push(bC + a[i]); }
    else for (let i = 0; i < p.count; i++) idxC.push(bC + i);
  });
  nMat = mats.size;
  const tris = { pos: Float64Array.from(pos), idx: Uint32Array.from(idx) };
  const trisCorpo = { pos: Float64Array.from(posC), idx: Uint32Array.from(idxC) };
  // ALTURA DO CORPO (sem adereço) x altura da BBOX: a diferença é o chapéu/cabelo/mastro.
  // Ela importa porque o glbchars.js:319-322 normaliza a altura pela BBOX BRUTA, então um
  // personagem de chapéu é ENCOLHIDO pra caber em 1,72 e passa a ler mais largo do que é —
  // que é um dos caminhos concretos pro "balão". Sai no JSON como `alturaCorpo`.
  let bbC = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < trisCorpo.pos.length; i += 3) for (let k = 0; k < 3; k++) {
    bbC[k] = Math.min(bbC[k], trisCorpo.pos[i + k]); bbC[3 + k] = Math.max(bbC[3 + k], trisCorpo.pos[i + k]);
  }

  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < tris.pos.length; i += 3) for (let k = 0; k < 3; k++) {
    bb[k] = Math.min(bb[k], tris.pos[i + k]); bb[3 + k] = Math.max(bb[3 + k], tris.pos[i + k]);
  }

  const wp = (o) => o.getWorldPosition(new THREE.Vector3());
  const yPescoco = wp(parts.head).y;                         // pivô da cabeça = base do pescoço
  const fatia = (eixo, y0, y1) => larguraNaFaixa(tris, eixo, y0, y1);
  const fatiaCorpo = (eixo, y0, y1) => larguraNaFaixa(trisCorpo, eixo, y0, y1);
  const quadril = wp(parts.torso).y;
  // COMPRIMENTO de braço = distância 3D do ombro ao vértice mais distante do braço.
  // Era `ombroY - bboxMin.y` (queda VERTICAL), e o braço procedural está rotacionado
  // -1,35 rad pra frente: a queda vertical de um braço de 50 cm quase deitado é 17 cm,
  // e a régua reportava braço/altura = 0,105 (contra 0,44 do humano) — defeito do
  // MEDIDOR, não do boneco. Antropometria mede comprimento, não projeção.
  const armL = parts.armL;
  const ombroW = wp(armL);
  let braco = 0;
  {
    const pa = armL.geometry.attributes.position, v = new THREE.Vector3();
    armL.updateWorldMatrix(true, false);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(armL.matrixWorld); braco = Math.max(braco, v.distanceTo(ombroW)); }
  }
  const perna = wp(parts.legL).y - bb[1];

  return {
    fonte: 'procedural', bb, escala: 1, tris,
    marcos: {
      alturaTotal: bb[4] - bb[1],
      alturaCorpo: isFinite(bbC[4]) ? bbC[4] - bbC[1] : null,
      cabeca: (isFinite(bbC[4]) ? bbC[4] : bb[4]) - yPescoco,
      ombroLargura: fatia(0, yPescoco - 0.12, yPescoco - 0.02),
      cinturaLargura: fatiaCorpo(0, quadril - 0.02, quadril + 0.06),
      torsoLargura: fatiaCorpo(0, yPescoco - 0.40, yPescoco - 0.18),
      torsoProfundidade: fatiaCorpo(2, yPescoco - 0.40, yPescoco - 0.18),
      braco, perna,
      larguraMax: bb[3] - bb[0],
    },
    acab: { materiais: nMat, triangulos: Math.round(nTri), map: 0, normalMap: 0, roughnessMap: 0, aoMap: 0, texturas: [] },
    _parts: parts, _group: group,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   C5 — ACABAMENTO. "liso, cor chapada" vira contagem de mapas e resolução.
   O tamanho da textura sai do CABEÇALHO do arquivo embutido no GLB (PNG/JPEG/WebP).
   Sem decodificar imagem: só os primeiros bytes. Depender de decodificador aqui seria
   depender de rede (nenhum está instalado).
   ═══════════════════════════════════════════════════════════════════════════ */
function tamImagem(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; // PNG IHDR
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {                                                     // JPEG SOFn
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const m = buf[o + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [buf.readUInt16BE(o + 7), buf.readUInt16BE(o + 5)];
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const t = buf.toString('ascii', 12, 16);
    if (t === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
    if (t === 'VP8L') { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
    if (t === 'VP8X') return [1 + (buf.readUIntLE(24, 3)), 1 + (buf.readUIntLE(27, 3))];
  }
  return null;
}
function acabamentoGLB(g) {
  const J = g.json;
  const imgTam = (ti) => {
    const t = (J.textures || [])[ti]; if (!t) return null;
    const src = t.source !== undefined ? t.source : (t.extensions && t.extensions.EXT_texture_webp ? t.extensions.EXT_texture_webp.source : undefined);
    const im = (J.images || [])[src]; if (!im || im.bufferView === undefined) return null;
    const bv = J.bufferViews[im.bufferView];
    return tamImagem(g.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + Math.min(bv.byteLength, 4096)));
  };
  let map = 0, nrm = 0, rgh = 0, ao = 0; const texs = [];
  for (const m of J.materials || []) {
    const pbr = m.pbrMetallicRoughness || {};
    if (pbr.baseColorTexture) { map++; const s = imgTam(pbr.baseColorTexture.index); if (s) texs.push(`base ${s[0]}x${s[1]}`); }
    if (m.normalTexture) { nrm++; const s = imgTam(m.normalTexture.index); if (s) texs.push(`normal ${s[0]}x${s[1]}`); }
    if (pbr.metallicRoughnessTexture) { rgh++; const s = imgTam(pbr.metallicRoughnessTexture.index); if (s) texs.push(`rough ${s[0]}x${s[1]}`); }
    if (m.occlusionTexture) { ao++; const s = imgTam(m.occlusionTexture.index); if (s) texs.push(`ao ${s[0]}x${s[1]}`); }
  }
  let tri = 0;
  for (const me of J.meshes || []) for (const p of me.primitives) {
    if (p.mode !== undefined && p.mode !== 4) continue;
    tri += (p.indices !== undefined ? J.accessors[p.indices].count : J.accessors[p.attributes.POSITION].count) / 3;
  }
  return { materiais: (J.materials || []).length, triangulos: Math.round(tri), map, normalMap: nrm, roughnessMap: rgh, aoMap: ao, texturas: texs };
}

/* A ESCALA CONTRA A QUAL O ACABAMENTO DO PERSONAGEM É LIDO.
   O enunciado afirma "o mundo tem 0 normalMap/roughnessMap/aoMap nos 5 mapas e os props
   têm 175 normalMaps". Afirmação não medida é opinião — a regra da casa vale pro
   enunciado também. Então esta função MEDE, e o que ela mede DESMENTE a primeira metade:
   os 5 mapas NÃO têm zero normalMap. Desde a rodada R7 o map.js:20-28 (`lam`) pendura
   normalMap + roughnessMap derivados do PRÓPRIO albedo por Sobel (textures.js:28-45,
   `detailFor`) em todo material que tenha `map`. O grep não acha porque o mapa nunca
   escreve a palavra `normalMap`: quem escreve é o `lam()`, uma vez, em runtime.
   Por isso a contagem aqui é FEITA EM RUNTIME — os 5 mapas são construídos de verdade
   (MAPS[id].build(scene, textures), o mesmo que o game.js:550 faz) e a cena inteira é
   percorrida material a material. É a única contagem que descreve o que o dono vê. */
async function escalaDoMundo() {
  try {
    const { MAPS } = await import(`${JS}/maps.js`);
    const { initTextures } = await import(`${JS}/textures.js`);
    const T = initTextures();
    const porMapa = [];
    for (const id of Object.keys(MAPS)) {
      const cena = new THREE.Scene();
      let W = null;
      try { W = MAPS[id].build(cena, T); } catch (e) { porMapa.push({ mapa: id, erro: String(e && e.stack || e).slice(0, 300) }); continue; }
      const vistos = new Set();
      const c = { materiais: 0, map: 0, normalMap: 0, roughnessMap: 0, aoMap: 0, meshes: 0, triangulos: 0 };
      const conta = (o) => {
        if (o.isMesh) {
          c.meshes++;
          const g = o.geometry;
          if (g && g.index) c.triangulos += g.index.count / 3;
          else if (g && g.attributes && g.attributes.position) c.triangulos += g.attributes.position.count / 3;
        }
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of ms) {
          if (!m || vistos.has(m)) continue;
          vistos.add(m); c.materiais++;
          if (m.map) c.map++;
          if (m.normalMap) c.normalMap++;
          if (m.roughnessMap) c.roughnessMap++;
          if (m.aoMap) c.aoMap++;
        }
      };
      cena.traverse(conta);
      // props do mapa (loja_h/ferro_velho declaram `props` fora do build)
      const props = MAPS[id].props;
      if (props) { const g2 = new THREE.Group(); try { (Array.isArray(props) ? props : [props]).forEach(() => {}); } catch { /* props é descritor, não cena */ } }
      c.triangulos = Math.round(c.triangulos);
      porMapa.push({ mapa: id, ...c });
    }
    const tot = porMapa.reduce((a, m) => ({
      materiais: a.materiais + (m.materiais || 0), map: a.map + (m.map || 0),
      normalMap: a.normalMap + (m.normalMap || 0), roughnessMap: a.roughnessMap + (m.roughnessMap || 0), aoMap: a.aoMap + (m.aoMap || 0),
    }), { materiais: 0, map: 0, normalMap: 0, roughnessMap: 0, aoMap: 0 });
    return { medidoEm: 'runtime (MAPS[id].build)', porMapa, total: tot };
  } catch (e) {
    return { medidoEm: 'FALHOU', erro: String(e && e.stack || e).slice(0, 900) };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   C6 — SILHUETA. Projeção ortográfica + rasterização de TRIÂNGULO.
   Nuvem de pontos dilatada NÃO serve: o cabeçalho do invariants.mjs registra que esse
   instrumento inflava a área de 1,15 a 1,90× e de forma DESIGUAL por modelo — ou seja,
   ele inventava diferença entre personagens que é do medidor, não do modelo.
   A grade é COMPARTILHADA (mesmos metros por pixel para todos), ancorada nos pés e
   centrada no eixo X do personagem: assim um personagem mais largo REALMENTE ocupa mais
   pixels, que é a informação que o C6 quer. Normalizar cada um pela própria largura
   apagaria justamente o "balão".
   ═══════════════════════════════════════════════════════════════════════════ */
const SIL_W = 128, SIL_H = 192, SIL_M = 1.30;   // 1,30 m de largura de campo, 1,72+folga de altura
function silhueta(tris, vista) {
  const g = new Uint8Array(SIL_W * SIL_H);
  const P = tris.pos, I = tris.idx;
  // centro em X pela mediana dos vértices (robusto a um braço estendido)
  const xs = []; for (let i = 0; i < P.length; i += 3) xs.push(vista === 0 ? P[i] : P[i + 2]);
  xs.sort((a, b) => a - b);
  const cx = xs.length ? xs[xs.length >> 1] : 0;
  const alturaCampo = SIL_M * SIL_H / SIL_W;
  const px = (i) => ((vista === 0 ? P[i] : P[i + 2]) - cx + SIL_M / 2) / SIL_M * SIL_W;
  const py = (i) => SIL_H - (P[i + 1] / alturaCampo) * SIL_H;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ax = px(a), ay = py(a), bx = px(b), by = py(b), cxx = px(c), cy = py(c);
    const lo = Math.max(0, Math.floor(Math.min(ax, bx, cxx))), hi = Math.min(SIL_W - 1, Math.ceil(Math.max(ax, bx, cxx)));
    const to = Math.max(0, Math.floor(Math.min(ay, by, cy))), bo = Math.min(SIL_H - 1, Math.ceil(Math.max(ay, by, cy)));
    const d = (bx - ax) * (cy - ay) - (by - ay) * (cxx - ax);
    if (Math.abs(d) < 1e-12 || hi < lo || bo < to) continue;
    const inv = 1 / d;
    for (let j = to; j <= bo; j++) {
      const yy = j + 0.5;
      for (let i2 = lo; i2 <= hi; i2++) {
        const xx = i2 + 0.5;
        const w0 = ((bx - ax) * (yy - ay) - (by - ay) * (xx - ax)) * inv;
        const w1 = ((xx - ax) * (cy - ay) - (yy - ay) * (cxx - ax)) * inv;
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) g[j * SIL_W + i2] = 1;
      }
    }
  }
  return g;
}
function iou(a, b) {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (x || y) uni++; if (x && y) inter++; }
  return uni ? inter / uni : 1;
}
// PNG cru (sem zlib de compressão real: usa blocos "stored" do deflate). Serve pra
// CONFERIR a silhueta com o olho — a regra do ref-measure.py: "não confie num número de
// segmentação que você não olhou".
function salvaPGM(g, arq) {
  const cab = Buffer.from(`P5\n${SIL_W} ${SIL_H}\n255\n`, 'ascii');
  const px = Buffer.alloc(SIL_W * SIL_H);
  for (let i = 0; i < g.length; i++) px[i] = g[i] ? 255 : 0;
  fs.writeFileSync(arq, Buffer.concat([cab, px]));
}

/* ═══════════════════════════════════════════════════════════════════════════
   C1 — RAZÕES + OUTLIER DO ELENCO
   "balão" é reclamação de PROPORÇÃO. Duas leituras, e as duas saem no relatório:
     (i)  ABSOLUTA contra REF_HUMANO  -> teto de FALLBACK PUBLICADO (declarado)
     (ii) RELATIVA ao próprio elenco  -> mediana + MAD, SEM teto inventado
   A (ii) é a que responde a frase do dono ("compare com o mandrake"), e é a que não
   depende de foto nenhuma. MAD (desvio absoluto mediano) e não desvio-padrão porque o
   elenco TEM outlier por construção — a média e o σ seriam contaminados justamente pelo
   personagem que se quer encontrar. O fator 1,4826 põe o MAD na escala de um σ normal.
   ═══════════════════════════════════════════════════════════════════════════ */
const RAZOES = ['cabecaSobreAltura', 'ombroSobreAltura', 'cinturaSobreOmbro', 'larguraTorsoSobreAltura', 'bracoSobreAltura', 'pernaSobreAltura'];
function razoesDe(m) {
  const H = m.alturaTotal || 1;
  return {
    cabecaSobreAltura: m.cabeca != null ? m.cabeca / H : null,
    ombroSobreAltura: m.ombroLargura != null ? m.ombroLargura / H : null,
    cinturaSobreOmbro: m.cinturaLargura != null && m.ombroLargura ? m.cinturaLargura / m.ombroLargura : null,
    larguraTorsoSobreAltura: m.torsoLargura != null ? m.torsoLargura / H : null,
    bracoSobreAltura: m.braco != null ? m.braco / H : null,
    pernaSobreAltura: m.perna != null ? m.perna / H : null,
  };
}
const mediana = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

/* ═══════════════════════════════════════════════════════════════════════════
   EXECUÇÃO
   ═══════════════════════════════════════════════════════════════════════════ */
const DIR_GLB = path.join(PUB, 'models/characters');
const DIR_ANIM = path.join(PUB, 'models/anims');
const registros = [];
const semGLB = [];

for (const def of CHARACTERS) {
  const arq = path.join(DIR_GLB, `${def.id}.glb`);
  let med;
  try {
    if (fs.existsSync(arq)) med = medirGLB(def.id, arq);
    else { semGLB.push(def.id); med = medirProcedural(def); }
  } catch (e) {
    med = { fonte: 'ERRO', erro: String(e && e.message || e), marcos: {}, acab: {}, bb: null };
  }
  registros.push({ id: def.id, nome: def.name, time: def.team, tribo: def.tribe || null, ...med });
}

/* ── C3: pés no chão, na bind E em cada clipe ────────────────────────────────
   No caminho GLB dá pra rodar os clipes de verdade (poseWith). No procedural o
   equivalente é o poseCharacter(), que é o que o jogo chama por quadro. Um personagem
   que afunda 4 cm no chão a meio ciclo de caminhada é o "pé enterrado" — e ele nunca
   apareceu numa bind pose, que é onde todo mundo olha. */
for (const r of registros) {
  if (r.fonte === 'ERRO') { r.C3 = { erro: r.erro }; continue; }
  const base = { bind: r.bb ? r.bb[1] : null };
  if (r.fonte === 'glb') {
    const g = readGLB(r.file), sc = buildScene(g);
    const bbRaw = bboxOf(skinVerts(sc, g, worldMats(sc), 3));
    const S = TARGET_H / ((bbRaw[4] - bbRaw[1]) || 1);
    const nomesJuntas = (g.json.skins || []).length === 1
      ? g.json.skins[0].joints.map((j) => g.json.nodes[j].name) : null;
    // y do vértice mais baixo ENTRE OS DE CANELA/PÉ (junta dominante). Sem junta de
    // pé no rig (não acontece no elenco), cai na bbox inteira — comportamento antigo.
    const peMin = (vs) => {
      if (!nomesJuntas) return bboxOf(vs)[1];
      let mn = Infinity;
      for (const v of vs) {
        if (!v.j) continue;
        let dom = 0; for (let c = 1; c < 4; c++) if (v.w[c] > v.w[dom]) dom = c;
        if (RX_PE.test(nomesJuntas[v.j[dom]] || '') && v.p[1] < mn) mn = v.p[1];
      }
      return mn === Infinity ? bboxOf(vs)[1] : mn;
    };
    const faixa = {}, corpo = {};
    for (const clipe of ['idle', 'walk', 'run', 'shoot', 'crouch']) {
      const proprio = path.join(DIR_ANIM, r.id, `${clipe}.glb`);
      const comum = path.join(DIR_ANIM, 'mixamo', `${clipe}.glb`);
      const f = fs.existsSync(proprio) ? proprio : (fs.existsSync(comum) ? comum : null);
      if (!f) continue;
      let pior = 0, mn = Infinity, mx = -Infinity, piorCorpo = 0;
      for (const t of [0, 0.2, 0.4, 0.6, 0.8]) {
        const Wp = poseWith(sc, f, t);
        const vs = skinVerts(sc, g, Wp, 5);
        const y0 = (peMin(vs) - bbRaw[1]) * S;
        const yc = (bboxOf(vs)[1] - bbRaw[1]) * S;
        if (y0 < mn) mn = y0; if (y0 > mx) mx = y0;
        if (Math.abs(y0) > Math.abs(pior)) pior = y0;
        if (Math.abs(yc) > Math.abs(piorCorpo)) piorCorpo = yc;
      }
      base[clipe] = pior;
      // faixa [min,max] do pé no clipe: é ela que separa "desvio constante, offset
      // constante resolve" de "raiz oscilando, offset troca afundar por flutuar".
      faixa[clipe] = [mn, mx];
      // corpo (bbox inteira) só quando diverge do pé: documenta rabo/quadril cruzando
      // o chão com o pé plantado — outro defeito, que NÃO é "pé fora do chão".
      if (Math.abs(piorCorpo - pior) > 0.05) corpo[clipe] = piorCorpo;
    }
    base._faixa = faixa;
    if (Object.keys(corpo).length) base._corpo = corpo;
  } else if (r._parts) {
    // 8 fases do ciclo, não 4: com 4 dá pra passar por sorte (as fases 0 e 0,5 têm as pernas
    // juntas, onde qualquer implementação acerta). O defeito mora nas fases intermediárias.
    const fases = [['idle', 0, 0]];
    for (let k = 1; k < 8; k++) fases.push([`walk-${(k / 8).toFixed(3)}`, Math.PI * 2 * k / 8, 1]);
    for (const [nome, fase, mov] of fases) {
      poseCharacter(r._parts, fase, mov, fase);
      r._group.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(r._group);
      base[nome] = b.min.y;
    }
    poseCharacter(r._parts, 0, 0, 0); r._group.updateMatrixWorld(true);
  }
  // O SINAL importa e a régua não pode agregá-lo: y < 0 é pé DENTRO do chão (o boneco
  // afunda, e o tiro no pé some); y > 0 é o boneco FLUTUANDO (sombra de contato mentindo).
  // Um "pior desvio" em valor absoluto misturaria os dois num número só.
  const faixa = base._faixa, corpo = base._corpo;
  delete base._faixa; delete base._corpo;
  const vals = Object.values(base).filter((v) => v != null && isFinite(v));
  r.C3 = {
    porPose: base,
    faixaPorPose: faixa,
    corpoPorPose: corpo,
    afunda: vals.length ? Math.min(0, ...vals) : null,
    flutua: vals.length ? Math.max(0, ...vals) : null,
    piorDesvio: vals.length ? vals.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0) : null,
  };
}

/* ── C1 + C2 ─────────────────────────────────────────────────────────────── */
for (const r of registros) r.C1 = { razoes: r.marcos ? razoesDe(r.marcos) : {} };
const coorte = {};
for (const k of RAZOES) {
  const v = registros.map((r) => r.C1.razoes[k]).filter((x) => x != null && isFinite(x));
  const med = mediana(v);
  const mad = med != null ? mediana(v.map((x) => Math.abs(x - med))) : null;
  coorte[k] = { mediana: med, mad, sigma: mad ? mad * 1.4826 : null, n: v.length };
}
for (const r of registros) {
  const z = {}, dRef = {};
  let piorZ = 0, piorZk = null, piorRef = 0, piorRefK = null;
  const pct = {};
  let piorPct = 0, piorPctK = null;
  for (const k of RAZOES) {
    const x = r.C1.razoes[k];
    if (x == null || !isFinite(x)) { z[k] = null; dRef[k] = null; pct[k] = null; continue; }
    const c = coorte[k];
    // sigma robusto = 0 significa MAD = 0, ou seja: mais da metade do elenco tem
    // EXATAMENTE a mesma razão. Isso não é "todo mundo perfeito", é elenco degenerado —
    // e um z-score com sigma 0 explodiria pra ±Infinity num personagem e ficaria 0/0 nos
    // outros, escondendo o defeito em vez de mostrá-lo. Nesse caso a leitura relativa cai
    // para DESVIO PERCENTUAL da mediana, que continua respondendo "de quanto?" sem
    // inventar escala. `elencoDegenerado` marca a situação no JSON.
    z[k] = c.sigma && c.sigma > 1e-6 ? (x - c.mediana) / c.sigma : null;
    pct[k] = c.mediana ? (x - c.mediana) / c.mediana : null;
    dRef[k] = REF_HUMANO[k] ? (x - REF_HUMANO[k]) / REF_HUMANO[k] : null;
    if (z[k] != null && Math.abs(z[k]) > Math.abs(piorZ)) { piorZ = z[k]; piorZk = k; }
    if (pct[k] != null && Math.abs(pct[k]) > Math.abs(piorPct)) { piorPct = pct[k]; piorPctK = k; }
    if (dRef[k] != null && Math.abs(dRef[k]) > Math.abs(piorRef)) { piorRef = dRef[k]; piorRefK = k; }
  }
  r.C1.pctElenco = pct; r.C1.piorPct = piorPct; r.C1.piorPctRazao = piorPctK;
  r.C1.zElenco = z; r.C1.desvioRef = dRef;
  r.C1.elencoDegenerado = RAZOES.every((k) => !coorte[k].sigma || coorte[k].sigma <= 1e-6);
  r.C1.piorZ = piorZ; r.C1.piorZRazao = piorZk;
  r.C1.piorDesvioRef = piorRef; r.C1.piorDesvioRefRazao = piorRefK;
  // Índice de BALÃO: quanto o corpo é mais largo que o de um humano de MESMA altura.
  // Larguras (ombro/torso/cintura) contam; comprimentos de membro não — perna curta
  // deixa o boneco baixinho, não "balão". Fallback declarado no divisor.
  const lt = r.C1.razoes.larguraTorsoSobreAltura, om = r.C1.razoes.ombroSobreAltura;
  r.C1.indiceBalao = lt != null && om != null
    ? Math.max(lt / REF_HUMANO.larguraTorsoSobreAltura, om / REF_HUMANO.ombroSobreAltura)
    : null;
  // C2 mede a altura do CORPO, não da bbox. A bbox inclui chapéu, cabelo e mastro de
  // bandeira, e nenhum deles é onde a mira acerta: a hitbox de cabeça segue o osso/pivô da
  // cabeça (glbchars.js:290-297). Reportar a bbox aqui misturaria "o mst é mais alto" com
  // "o mst carrega uma bandeirinha". As duas saem no JSON; quem manda no teto é o corpo.
  r.C2 = {
    alturaM: r.marcos ? (r.marcos.alturaCorpo != null ? r.marcos.alturaCorpo : r.marcos.alturaTotal) : null,
    alturaBBox: r.marcos ? r.marcos.alturaTotal : null,
    adereçoAcima: r.marcos && r.marcos.alturaCorpo != null ? r.marcos.alturaTotal - r.marcos.alturaCorpo : null,
  };
}
const alturas = registros.map((r) => r.C2.alturaM).filter((v) => v != null && isFinite(v));
const C2 = { min: Math.min(...alturas), max: Math.max(...alturas), dispersao: Math.max(...alturas) - Math.min(...alturas), teto: C2_DISPERSAO_MAX };

/* ── C5 ──────────────────────────────────────────────────────────────────── */
const mundo = await escalaDoMundo();
for (const r of registros) {
  const a = r.acab || {};
  r.C5 = {
    ...a,
    // "liso" é ISTO: zero mapas de superfície. É o número que responde "o funkeiro é
    // liso e o carro do lado tem sujeira, normal e reflexo".
    mapasDeSuperficie: (a.normalMap || 0) + (a.roughnessMap || 0) + (a.aoMap || 0),
  };
}

/* ── C6 ──────────────────────────────────────────────────────────────────── */
const sils = new Map();
for (const r of registros) {
  if (!r.tris || !r.tris.idx.length) continue;
  sils.set(r.id, { frente: silhueta(r.tris, 0), lado: silhueta(r.tris, 2) });
}
const paresC6 = [];
const ids = [...sils.keys()];
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const A = sils.get(ids[i]), B = sils.get(ids[j]);
    const f = iou(A.frente, B.frente), l = iou(A.lado, B.lado);
    paresC6.push({ a: ids[i], b: ids[j], frente: f, lado: l, pior: Math.min(f, l) });
  }
}
paresC6.sort((x, y) => y.pior - x.pior);
for (const r of registros) {
  const meus = paresC6.filter((p) => p.a === r.id || p.b === r.id);
  const top = meus.length ? meus.reduce((a, b) => (b.pior > a.pior ? b : a)) : null;
  r.C6 = top ? { piorIoU: top.pior, contra: top.a === r.id ? top.b : top.a } : { piorIoU: null, contra: null };
}
// aliado × inimigo: o par que mais importa (o dono precisa decidir em 1 frame se atira)
const interTime = paresC6.filter((p) => {
  const A = registros.find((r) => r.id === p.a), B = registros.find((r) => r.id === p.b);
  return A && B && A.time !== B.time;
});

/* ── C4: delegado ao tp-mount-probe.mjs (não reimplementado) ──────────────── */
let C4 = { estado: 'pulado (--sem-c4)' };
if (!SEM_C4) {
  try {
    const saida = execFileSync(process.execPath, [path.join(HERE, 'tp-mount-probe.mjs')], { encoding: 'utf8', timeout: 300000 });
    const linhas = saida.split('\n');
    const i3 = linhas.findIndex((l) => l.includes('palma dentro da silhueta'));
    const enterrados = [], semModelo = [];
    for (const l of linhas) {
      const m = /^(\w+):\s*SEM MODELO/.exec(l); if (m) semModelo.push(m[1]);
    }
    if (i3 >= 0) for (const l of linhas.slice(i3 + 2)) {
      const m = /^(\w+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(\S.*)$/.exec(l.trim());
      if (m && /ENTERRADA/.test(m[5])) enterrados.push({ id: m[1], raioPalma: +m[2], raioCorpo: +m[3], folga: +m[4] });
    }
    C4 = {
      // `semModelo` vem da lista PRÓPRIA do tp-mount-probe (36 ids), que não é o elenco
      // inteiro (44). Comparar com CHARACTERS.length dizia 'ok' num relatório em que
      // NENHUM personagem foi medido — falso verde, o modo de falha que este projeto
      // já pagou caro. Agora: se nenhum GLB foi lido, o estado diz isso.
      estado: semModelo.length && !enterrados.length && !/palma dentro/.test(saida.split('===')[0] || '') && semModelo.length >= 30
        ? `SEM GLB — ${semModelo.length} ids sem modelo, nada a medir` : 'ok',
      semModelo: semModelo.length, enterrados,
      nota: 'medido por tools/eval/tp-mount-probe.mjs (seção 3: palma dentro da silhueta do corpo)',
    };
  } catch (e) { C4 = { estado: 'ERRO', erro: String(e && e.message || e).slice(0, 200) }; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SAÍDA
   ═══════════════════════════════════════════════════════════════════════════ */
const _c6linhas = [];
// nº de silhuetas DISTINTAS: fecho transitivo sobre "IoU > 0,98". É o número que traduz
// a frase do dono "todo funkeiro é igual" em uma contagem verificável.
const _c6 = (() => {
  const pai = new Map(ids.map((i) => [i, i]));
  const acha = (x) => (pai.get(x) === x ? x : (pai.set(x, acha(pai.get(x))), pai.get(x)));
  for (const p2 of paresC6) if (p2.pior > 0.98) pai.set(acha(p2.a), acha(p2.b));
  const grupos = new Map();
  for (const i of ids) { const r2 = acha(i); grupos.set(r2, (grupos.get(r2) || []).concat(i)); }
  const gs = [...grupos.values()].sort((a, b) => b.length - a.length);
  _c6linhas.push(`silhuetas DISTINTAS no elenco: ${gs.length} para ${ids.length} personagens`);
  for (const g2 of gs.filter((x) => x.length > 1)) _c6linhas.push(`  grupo de ${g2.length} idênticos: ${g2.join(', ')}`);
  
  
  return { distintas: gs.length, grupos: gs.filter((x) => x.length > 1) };
})();
const saida = {
  gerado: new Date().toISOString(),
  protocolo: 'node puro; DOM stubado + three vendorizado (mesmo protocolo de botsim.mjs/pickup-check.mjs); GLB lido por tp-mount-probe.mjs',
  fontes: { glb: registros.filter((r) => r.fonte === 'glb').length, procedural: registros.filter((r) => r.fonte === 'procedural').length, erro: registros.filter((r) => r.fonte === 'ERRO').length },
  semGLB,
  avisoDeProcedencia: semGLB.length
    ? `${semGLB.length} personagens SEM GLB em public/models/characters/ — medidos no fallback procedural de characters.js.`
    : null,
  // O que FALTA nesta árvore, dito explicitamente pra ninguém ler os números como mais do
  // que eles são: sem clipe, toda medida é BIND POSE.
  poseMedida: fs.existsSync(DIR_ANIM) ? 'clipes disponíveis' : 'BIND POSE — public/models/anims/ não existe nesta árvore, nenhum clipe foi carregado',
  refHumano: REF_HUMANO,
  coorteC1: coorte,
  C2, C4,
  escalaDoMundoC5: mundo,
  personagens: registros.map((r) => ({
    id: r.id, nome: r.nome, time: r.time, tribo: r.tribo, fonte: r.fonte, erro: r.erro || undefined,
    marcos: r.marcos, marcosUsados: r.marcosUsados, C7: r.rig,
    C1: r.C1, C2: r.C2, C3: r.C3, C5: r.C5, C6: r.C6,
  })),
  C6silhuetasDistintas: _c6.distintas,
  C6grupos: _c6.grupos,
  C6topo: paresC6.slice(0, 25),
  C6interTimePior: interTime.slice(0, 15),
};

if (process.argv.includes('--silhuetas')) {
  fs.mkdirSync('/tmp/charsil', { recursive: true });
  for (const [id, s] of sils) { salvaPGM(s.frente, `/tmp/charsil/${id}_frente.pgm`); salvaPGM(s.lado, `/tmp/charsil/${id}_lado.pgm`); }
  console.log('silhuetas -> /tmp/charsil/*.pgm (conferência visual; a régua manda OLHAR)');
}

const p = path.join(HERE, 'char_probe.json');
if (fs.existsSync(p)) {
  try {
    const anterior = JSON.parse(fs.readFileSync(p, 'utf8'));
    const semDataAnterior = { ...anterior, gerado: null };
    const semDataAtual = { ...saida, gerado: null };
    if (JSON.stringify(semDataAnterior) === JSON.stringify(semDataAtual)) saida.gerado = anterior.gerado;
  } catch { /* JSON inválido é substituído pela medição nova */ }
}
fs.writeFileSync(p, JSON.stringify(saida, null, 1));

if (SO_JSON) { console.log(JSON.stringify(saida, null, 1)); process.exit(0); }

const f = (v, n = 3, w = 7) => (v == null || !isFinite(v) ? '-'.padStart(w) : v.toFixed(n).padStart(w));
console.log('\n============ RÉGUA DOS PERSONAGENS (char-probe) ============\n');
if (saida.avisoDeProcedencia) console.log('AVISO DE PROCEDÊNCIA: ' + saida.avisoDeProcedencia + '\n');
console.log(`teto absoluto do C1: ${REF_HUMANO.procedencia}\n`);

console.log('=== C1 PROPORÇÃO (razões antropométricas na bind pose) ===');
/* DUAS DIVERGÊNCIAS DE DEFINIÇÃO ENTRE ESTA RÉGUA E A TABELA PUBLICADA — declaradas, não
   escondidas, porque elas explicam por que a coluna ABSOLUTA sempre acusa desvio mesmo em
   personagem são, e por que quem manda aqui é a coluna RELATIVA (mediana do elenco):
     • `cabeça` daqui = topo da malha → OSSO DO PESCOÇO. Drillis/Winter mede vértex → MENTO.
       O pescoço + a mandíbula entram na nossa conta, e cabelo/boné também: daí a mediana
       0,223 contra 0,130 da tabela. Não é cabeça de balão; é outro segmento.
     • `braço` daqui = ombro → OSSO DO PUNHO. A tabela mede acrômio → DACTÍLIO (ponta do
       dedo), que soma ~0,108 H de mão. Daí 0,278 contra 0,440.
   Corrigir isso exige um marco de mento e um de ponta de dedo que estes rigs não têm.
   Enquanto não houver, o teto ABSOLUTO destas duas linhas é indicativo, e o teto que decide
   é o do próprio elenco. */
console.log('id            fonte  altura cabeça/H ombro/H cint/omb torso/H braço/H perna/H  balão  piorZ(elenco)');
for (const r of registros) {
  const z = r.C1.razoes;
  console.log(`${r.id.padEnd(13)} ${(r.fonte === 'procedural' ? 'proc' : r.fonte).padEnd(5)} ${f(r.C2.alturaM, 3, 6)} ${f(z.cabecaSobreAltura, 3, 8)} ${f(z.ombroSobreAltura, 3, 7)} ${f(z.cinturaSobreOmbro, 3, 8)} ${f(z.larguraTorsoSobreAltura, 3, 7)} ${f(z.bracoSobreAltura, 3, 7)} ${f(z.pernaSobreAltura, 3, 7)} ${f(r.C1.indiceBalao, 2, 6)}  ${r.C1.piorZRazao ? `z ${r.C1.piorZ.toFixed(1)} ${r.C1.piorZRazao}` : (r.C1.piorPctRazao ? `${(r.C1.piorPct * 100).toFixed(0)}% ${r.C1.piorPctRazao} (sigma degenerado)` : '= mediana do elenco')}`);
}
console.log('\nreferência humana (FALLBACK PUBLICADO): ' + RAZOES.map((k) => `${k.replace('SobreAltura', '/H').replace('SobreOmbro', '/omb')} ${REF_HUMANO[k]}`).join('  '));
console.log('mediana do elenco:                      ' + RAZOES.map((k) => `${k.replace('SobreAltura', '/H').replace('SobreOmbro', '/omb')} ${coorte[k].mediana != null ? coorte[k].mediana.toFixed(3) : '-'}`).join('  '));
console.log('sigma robusto (1,4826·MAD):             ' + RAZOES.map((k) => `${k.replace('SobreAltura', '/H').replace('SobreOmbro', '/omb')} ${coorte[k].sigma != null ? coorte[k].sigma.toFixed(4) : '0 (elenco idêntico)'}`).join('  '));

/* ── C7 FAMÍLIA DE RIG (ver rigDoGLB) ─────────────────────────────────────────
   Impressa ANTES do C2 de propósito: ela é a variável que explica a queixa por GRUPO
   ("todos os funkeiros tirando o mandrake"), e o resto da tabela só faz sentido depois
   de saber que 18 personagens compartilham um esqueleto só. */
{
  const comRig = registros.filter((r) => r.rig);
  console.log('\n=== C7 FAMÍLIA DE RIG (bind pose; nada aqui depende de clipe) ===');
  if (!comRig.length) console.log('nenhum GLB medido');
  else {
    const fam = new Map();
    for (const r of comRig) {
      const k = r.rig.familia;
      if (!fam.has(k)) fam.set(k, []);
      fam.get(k).push(r);
    }
    console.log('família     n  esqueletos  raioSkin50  raioSkin95  desalinhRMS  alavancaPalma  abduçãoBraço  curl  membros');
    for (const [k, rs] of [...fam.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const md = (fn) => { const v = rs.map(fn).filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };
      // ESQUELETOS DISTINTOS dentro da família. É O NÚMERO DA RODADA: 18 personagens
      // compartilhando 1 esqueleto é um rig que não é de ninguém.
      const distintos = new Set(rs.map((r) => r.rig.impressaoEsqueleto)).size;
      console.log(`${k.padEnd(11)} ${String(rs.length).padStart(2)}  ${String(distintos).padStart(9)}  ${f(md((r) => r.rig.raioSkinP50), 3, 9)}   ${f(md((r) => r.rig.raioSkinP95), 3, 9)}   ${f(md((r) => r.rig.desalinhamentoRMS), 3, 10)}   ${f(md((r) => r.rig.alavancaPalma), 2, 12)}  ${f(md((r) => r.rig.abducaoBraco), 1, 12)}    ${String(rs[0].rig.curlDuplicado).padStart(2)}  ${rs.map((r) => r.id).slice(0, 6).join(' ')}${rs.length > 6 ? ` (+${rs.length - 6})` : ''}`);
      if (distintos === 1 && rs.length > 1) console.log(`${''.padEnd(11)}     ^^^ ${rs.length} personagens com O MESMO esqueleto (impressão ${rs[0].rig.impressaoEsqueleto}) — doador transplantado, glbchars.js:32-41`);
    }
    const medAbd = (() => { const v = comRig.map((r) => r.rig.abducaoBraco).filter((x) => x != null).sort((a, b) => a - b); return v[v.length >> 1]; })();
    const medAla = (() => { const v = comRig.map((r) => r.rig.alavancaPalma).filter((x) => x != null).sort((a, b) => a - b); return v[v.length >> 1]; })();
    console.log(`mediana do elenco: abdução ${medAbd.toFixed(1)}°   alavanca de palma ${medAla.toFixed(2)}× antebraço`);
    const posturaFora = comRig.filter((r) => r.rig.abducaoBraco != null && Math.abs(r.rig.abducaoBraco - medAbd) > 15)
      .sort((a, b) => Math.abs(b.rig.abducaoBraco - medAbd) - Math.abs(a.rig.abducaoBraco - medAbd));
    console.log('POSTURA fora da bind do elenco (|Δabdução| > 15°): '
      + (posturaFora.map((r) => `${r.id} ${r.rig.abducaoBraco.toFixed(0)}° (Δ${(r.rig.abducaoBraco - medAbd).toFixed(0)}°)`).join(', ') || 'nenhum'));
    const alavFora = comRig.filter((r) => r.rig.alavancaPalma != null && r.rig.alavancaPalma > 0.9)
      .sort((a, b) => b.rig.alavancaPalma - a.rig.alavancaPalma);
    console.log('ARMA fora da mão (alavanca > 0,9 antebraço — a guarda do glbchars.js corrige em runtime): '
      + (alavFora.map((r) => `${r.id} ${r.rig.alavancaPalma.toFixed(2)}x`).join(', ') || 'nenhum'));
    // A COMPARAÇÃO QUE O DONO PEDIU, EM NÚMERO: mandrake × os outros funkeiros.
    const FUNK = ['mandrake', 'raul', 'oakley', 'criarj', 'chave', 'funkraiz', 'trapfunk', 'fluxo', 'ostentacao'];
    const mand = comRig.find((r) => r.id === 'mandrake');
    if (mand && mand.rig.raioSkinP50) {
      const linha = FUNK.map((id) => {
        const r = comRig.find((x) => x.id === id);
        if (!r || r.rig.raioSkinP50 == null) return `${id} -`;
        return `${id} ${r.rig.raioSkinP50.toFixed(3)}${id === 'mandrake' ? '' : ` (${(r.rig.raioSkinP50 / mand.rig.raioSkinP50).toFixed(2)}x)`}`;
      }).join('  ');
      console.log('FUNKEIROS — raio de skin mediano (m) e razão contra o mandrake:');
      console.log('  ' + linha);
    }
    const dups = comRig.filter((r) => r.rig.curlDuplicado > 2);
    console.log(`ossos de dedo DUPLICADOS (Curl_R/Curl_L em par): ${dups.length} personagens${dups.length ? ' — ' + dups.slice(0, 4).map((r) => r.id).join(', ') + (dups.length > 4 ? ` (+${dups.length - 4})` : '') : ''}`);
  }
}

console.log('\n=== C2 ESCALA (altura em metros) ===');
console.log(`min ${C2.min.toFixed(3)}  max ${C2.max.toFixed(3)}  dispersão ${C2.dispersao.toFixed(3)} m  (teto ${C2_DISPERSAO_MAX} = meia hitbox de cabeça)`);
const fora = registros.filter((r) => r.C2.alturaM != null && Math.abs(r.C2.alturaM - mediana(alturas)) > C2_DISPERSAO_MAX / 2);
console.log(fora.length ? 'fora da faixa: ' + fora.map((r) => `${r.id} ${r.C2.alturaM.toFixed(2)}m`).join(', ') : 'todos dentro da faixa');
{
  const ad = registros.filter((r) => r.C2.adereçoAcima != null && r.C2.adereçoAcima > 0.02)
    .sort((a, b) => b.C2.adereçoAcima - a.C2.adereçoAcima);
  console.log('adereço ACIMA da cabeça (chapéu/cabelo/mastro) — infla a bbox e, no caminho GLB,');
  console.log('faz o glbchars.js:319-322 ENCOLHER o corpo pra caber em 1,72 (caminho pro "balão"):');
  console.log('  ' + (ad.length ? ad.slice(0, 8).map((r) => `${r.id} +${(r.C2.adereçoAcima * 100).toFixed(0)}cm`).join(', ') : 'nenhum'));
}

console.log('\n=== C3 PÉS NO CHÃO (base da bbox em y, por pose) ===');
const ruimC3 = registros.filter((r) => r.C3 && r.C3.piorDesvio != null && Math.abs(r.C3.piorDesvio) > C3_TOL);
console.log(`tolerância ${C3_TOL} m | fora: ${ruimC3.length}/${registros.length}`);
for (const r of ruimC3.slice(0, 6)) console.log(`  ${r.id.padEnd(13)} afunda ${r.C3.afunda.toFixed(4)}  flutua ${r.C3.flutua.toFixed(4)}  ${Object.entries(r.C3.porPose).map(([k, v]) => `${k}=${v == null ? '-' : v.toFixed(3)}`).join(' ')}`);
if (ruimC3.length > 6) console.log(`  (+${ruimC3.length - 6} iguais — no caminho procedural o ciclo de passo é o MESMO pra todos)`);

console.log('\n=== C4 MÃO NA ARMA (delegado a tp-mount-probe.mjs) ===');
console.log(JSON.stringify(C4));

console.log('\n=== C5 ACABAMENTO ===');
console.log('escala do mundo — MEDIDA EM RUNTIME, não asserida (' + mundo.medidoEm + '):');
if (mundo.porMapa) for (const m of mundo.porMapa) console.log(`  ${String(m.mapa).padEnd(15)} mats ${String(m.materiais ?? '-').padStart(4)}  map ${String(m.map ?? '-').padStart(4)}  normal ${String(m.normalMap ?? '-').padStart(4)}  rough ${String(m.roughnessMap ?? '-').padStart(4)}  ao ${String(m.aoMap ?? '-').padStart(3)}  ${m.erro || ''}`);
if (mundo.total) console.log(`  TOTAL           mats ${mundo.total.materiais}  normal ${mundo.total.normalMap}  rough ${mundo.total.roughnessMap}  ao ${mundo.total.aoMap}`);
console.log('id            mats  tris  map normal rough  ao  texturas');
for (const r of registros) console.log(`${r.id.padEnd(13)} ${String(r.C5.materiais).padStart(4)} ${String(r.C5.triangulos).padStart(6)} ${String(r.C5.map).padStart(4)} ${String(r.C5.normalMap).padStart(6)} ${String(r.C5.roughnessMap).padStart(5)} ${String(r.C5.aoMap).padStart(3)}  ${(r.C5.texturas || []).join(', ') || '(nenhuma)'}`);

console.log('\n=== C6 SILHUETA (IoU par a par; 1,000 = silhueta idêntica) ===');
console.log(`${paresC6.length} pares medidos, grade ${SIL_W}x${SIL_H} compartilhada (${(SIL_M / SIL_W * 100).toFixed(1)} cm/px)`);
console.log('piores (mais parecidos):');
for (const p2 of paresC6.slice(0, 12)) console.log(`  ${p2.a.padEnd(13)} × ${p2.b.padEnd(13)} frente ${p2.frente.toFixed(3)}  lado ${p2.lado.toFixed(3)}`);
const idênticos = paresC6.filter((p2) => p2.pior > 0.98).length;
console.log(`pares com IoU > 0,98 (praticamente o MESMO boneco): ${idênticos}`);
// (o fecho transitivo das silhuetas foi calculado ANTES da escrita do JSON — ver acima)
for (const L of _c6linhas) console.log(L);

if (interTime.length) console.log(`pior par ALIADO × INIMIGO: ${interTime[0].a} × ${interTime[0].b} = ${interTime[0].pior.toFixed(3)}`);

console.log('\n-> ' + p);
