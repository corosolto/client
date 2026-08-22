/* ============================================================================
   texel-check.mjs — A RÉGUA DE DENSIDADE DE TEXEL (px/m) DOS 10 MAPAS.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O BAR.md §1.8 escreve, desde a rodada 3, que chão e parede de playspace vivem
   entre 256 e 512 px/m e que fundo vive entre 64 e 128. A BAR-CONSISTENCIA §3.1
   escreve que "nenhum asset pode passar de 1,5x a densidade mediana do mapa".
   Nenhum dos dois número tinha instrumento: `grep -n "texel" tools/eval/*.mjs`
   não devolvia uma linha antes deste arquivo. Número escrito em prosa e nunca
   medido envelhece sem avisar — foi assim que o loja_h chegou a 4.347 draw calls
   com o teto de 300-800 escrito num comentário (ver o cabeçalho do cena-tetos.mjs).

   O DEFEITO QUE ELA PREMIA (pergunta 1 da skill `regua`: qual estado ruim SOBE
   este número?). Densidade de texel sobe de graça se você medir só a média: basta
   um mural fotográfico de 2048 px num quadro de 3 m para puxar a média do mapa
   inteiro para cima enquanto o chão continua a 8 px/m. Por isso a régua NÃO usa
   média: usa MEDIANA PONDERADA POR ÁREA (metro quadrado de chão pesa o que ele
   ocupa) e cobra, separado, a FRAÇÃO DE ÁREA abaixo do piso. Um mapa só fica
   verde se a superfície que o jogador pisa e encosta estiver na banda — não dá
   para comprar verde com arte.

   COMO ELA MEDE
   Densidade de texel é uma propriedade puramente geométrica:

       densidade (px/m) = sqrt( areaUV(triangulo) * larguraTex * alturaTex
                                / areaMundo(triangulo) )

   com larguraTex = image.width * map.repeat.x (o `repeat` multiplica texels sobre
   a mesma extensão de UV, então entra na conta exatamente como resolução extra).
   Nada disso depende de GPU, de shader ou de pixel na tela: depende de UV, de
   matriz de mundo e do tamanho do canvas. Todos os três existem, IDÊNTICOS, no
   harness de node — a geometria dos mapas é procedural e as texturas de cenário
   são CanvasTexture criadas por textures.js. Este é o caso raro em que node NÃO
   mede outro jogo (LIÇÃO 3), e a régua diz explicitamente o que ela não alcança:

   O QUE ELA NÃO ALCANÇA, E COMO ELA FALHA (pergunta 4 da skill)
   Decalque e mural (`decal:*`, `mural:*`) carregam PNG/JPG por TextureLoader, que
   em node não resolve — `map.image` fica null. Em vez de pular calado (que é o
   erro do `gen-docs` que publicou licença errada), a régua LÊ O CABEÇALHO DO
   ARQUIVO NO DISCO e mede a densidade real. O que sobrar sem resolver é contado,
   nomeado e sai no relatório como `naoMedido`; se passar de 5% da área com
   textura, a régua fica VERMELHA — não saber custa o mesmo que estar errado.

   POR QUE A ARTE NÃO ENTRA NO GATE DE DISPERSÃO
   A camada de arte (decalque, mural, cartaz) é hero surface pela própria BAR §1.8
   ("exceções que sempre sobem: ... hero prop inspecionável, superfície
   cinematográfica") e mora em arquivos que esta frente não pode tocar
   (graffiti_pass.js, map_decals.js). Ela é MEDIDA e REPORTADA — inclusive a
   dispersão total com ela dentro, que é o número que dói — mas o gate de §3.1
   incide sobre a superfície estrutural, que é onde o conserto alcança.

   USO
     node tools/eval/texel-check.mjs                    # os 10 mapas
     node tools/eval/texel-check.mjs --mapa=quebrada    # um só
     node tools/eval/texel-check.mjs --json             # texel_check.json
     node tools/eval/texel-check.mjs --json-out=/tmp/x  # grava em outro caminho
     node tools/eval/texel-check.mjs --piores=15        # as N piores superfícies
     node tools/eval/texel-check.mjs --mutante=<nome>   # ver texel-mutantes.mjs
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TEXEL_MIN, TEXEL_MAX, TEXEL_ALVO,
  DISPERSAO_MAX, DISPERSAO_MAX_ABS, PISO_AREA_MAX,
  ANISO_MIN,
} from './texel-tetos.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const arg = (n, d = null) => {
  const p = process.argv.find((a) => a.startsWith(`--${n}=`));
  return p ? p.slice(n.length + 3) : (process.argv.includes(`--${n}`) ? true : d);
};
const SO_MAPA = arg('mapa');
const N_PIORES = +(arg('piores', 10));
/* `--json-out=<caminho>` existe porque outra régua (corrego-superficie-check.mjs) CONSOME
   esta medida em vez de reimplementá-la. Sem isso, toda execução daquela régua sobrescreveria
   o texel_check.json compartilhado — artefato de uma régua não pode ser efeito colateral de
   outra. Sem o flag nada muda: continua caindo em tools/eval/texel_check.json. */
const JSON_OUT = arg('json-out');
const EM_JSON = !!arg('json') || !!JSON_OUT;
const NAO_MEDIDO_MAX = 0.05;   // fração da área com textura que pode ficar sem medida

/* ---------------------------------------------------------------------------
   1. DIMENSÃO DE IMAGEM LIDA DO CABEÇALHO — sem dependência, sem decodificar.
   Existe só para a camada de arte, que o TextureLoader não resolve em node. Se
   o formato não for reconhecido devolve null, e null vira `naoMedido` (vermelho),
   nunca um número inventado.
   ------------------------------------------------------------------------- */
function dimsDoArquivo(abs) {
  let b;
  try { b = fs.readFileSync(abs); } catch { return null; }
  // PNG: assinatura + IHDR nos bytes 16..23
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  // JPEG: varre marcadores até um SOFn
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  }
  // WEBP: RIFF....WEBP + VP8 / VP8L / VP8X
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tag = b.toString('ascii', 12, 16);
    if (tag === 'VP8X') return { w: (b.readUIntLE(24, 3) & 0xffffff) + 1, h: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (tag === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (tag === 'VP8L') {
      const n = b.readUInt32LE(21);
      return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

/* Índice basename -> dimensão, montado uma vez sobre public/img. A camada de arte cita
   o arquivo pelo NOME da malha (`decal:personagens-graffiti-04.png`), que é o que o
   graffiti_pass.js grava — não há URL guardada na textura depois que o loader falha. */
const IDX_IMG = new Map();
(function indexaImagens(dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { indexaImagens(p); continue; }
    if (!/\.(png|jpe?g|webp)$/i.test(e.name)) continue;
    if (!IDX_IMG.has(e.name)) IDX_IMG.set(e.name, p);
  }
})(path.join(ROOT, 'public'));
const DIMS_CACHE = new Map();
function dimsPorNome(nome) {
  if (DIMS_CACHE.has(nome)) return DIMS_CACHE.get(nome);
  const abs = IDX_IMG.get(nome);
  const d = abs ? dimsDoArquivo(abs) : null;
  DIMS_CACHE.set(nome, d);
  return d;
}

/* ---------------------------------------------------------------------------
   2. A MEDIDA, superfície por superfície.
   ------------------------------------------------------------------------- */
const { THREE, MAPS, initTextures, bootGame } = await import('./harness.mjs');

/* LIMIAR COMPARTILHADO, CONFERIDO EM TEMPO DE EXECUÇÃO.
   O alvo de px/m existe em dois lugares por necessidade: o jogo (public/js/vao.js) não pode
   importar de tools/eval, e a régua não pode inventar o alvo do jogo. A dívida de sincronia
   que isso cria é a mesma que fez a passada de grafite aprovar de um lado e reprovar do
   outro (451 -> 445 -> 445, dois consertos sem mover o número). Aqui ela é IMPOSSÍVEL de
   passar calada: se os dois divergirem, a régua morre antes de medir. */
{
  const vao = await import('../../public/js/vao.js');
  if (vao.ALVO_PXM !== undefined && vao.ALVO_PXM !== TEXEL_ALVO) {
    console.error(`✗ TEXEL: limiar DIVERGENTE — public/js/vao.js ALVO_PXM=${vao.ALVO_PXM} contra ` +
      `tools/eval/texel-tetos.mjs TEXEL_ALVO=${TEXEL_ALVO}. Dois números para o mesmo conceito ` +
      `fazem a superfície nascer aprovada num lado e reprovada no outro. Alinhe os dois.`);
    process.exit(1);
  }
}

/* INSTRUMENTO: TextureLoader que resolve no DISCO em vez de na rede.
   Sem isto, 71% da área do fy_lajes, 92% do fy_corrego e 89% do fy_mansao saem como
   `naoMedido` — esses três mapas usam textura externa (/img/textures/*.webp), o
   TextureLoader em node nunca completa e `map.image` fica null. Medir só o que carrega
   seria a LIÇÃO 3 outra vez (decal-probe jurando 334 decalques onde havia 96), com o
   agravante de que a régua ficaria CEGA justamente onde o defeito é maior.
   O patch NÃO decodifica imagem: lê largura/altura do cabeçalho e planta um `image`
   mínimo. Densidade de texel só precisa disso — pixel nenhum entra na conta.
   Quando o arquivo não resolve, `image` continua null e a malha cai em `naoMedido`,
   que é vermelho. Não saber continua custando o mesmo que estar errado. */
{
  const orig = THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load = function (url, onLoad, onProg, onErr) {
    const t = new THREE.Texture();
    t.userData.arquivo = url;
    const base = String(url).split('?')[0].split('/').pop();
    const d = dimsPorNome(base);
    if (d) { t.image = { width: d.w, height: d.h, data: null }; t.needsUpdate = true; }
    if (onLoad) { try { onLoad(t); } catch { /* callback do jogo pode tocar DOM */ } }
    return t;
  };
  void orig;
}

const IDS = Object.keys(MAPS);
const ALVO = SO_MAPA ? IDS.filter((k) => k === SO_MAPA || MAPS[k]?.id === SO_MAPA) : IDS;
if (!ALVO.length) { console.error(`✗ TEXEL: mapa "${SO_MAPA}" não existe. Há: ${IDS.join(', ')}`); process.exit(1); }

const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), cr = new THREE.Vector3();
const nrm = new THREE.Vector3();

/* Amostragem de triângulo: geometria mesclada de mapa passa de 100 k triângulos e
   medir todos custaria minutos por mapa (orçamento da skill: portão em minutos, mapa em
   milissegundos). Passo escolhido para dar >= 400 triângulos por malha, que já estabiliza
   a média ponderada em 3 casas — conferido contra a medida exaustiva do quebrada. */
const MAX_TRI = 400;

function classe(nome) {
  if (/^(decal|mural|poster|lambe):/.test(nome)) return 'arte';
  return 'estrutural';
}

function mediraMalha(o) {
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const m = mats.find((x) => x && x.map) || mats[0];
  const g = o.geometry;
  if (!g || !g.attributes?.position || !g.attributes?.uv) return null;

  const cl = classe(o.name || '');
  let texW = 0, texH = 0, aniso = null, origem = 'canvas';
  if (m && m.map) {
    const img = m.map.image;
    if (img && img.width) { texW = img.width; texH = img.height; }
    else {
      // camada de arte: resolve pelo nome da malha, no disco
      const arq = (o.name || '').split(':')[1];
      const d = arq ? dimsPorNome(arq) : null;
      if (d) { texW = d.w; texH = d.h; origem = 'disco'; }
      else return { semMedida: true, classe: cl, nome: o.name || '(anon)', area: areaDe(o) };
    }
    texW *= (m.map.repeat?.x ?? 1);
    texH *= (m.map.repeat?.y ?? 1);
    aniso = m.map.anisotropy ?? 1;
  } else {
    return { semTextura: true, classe: cl, nome: o.name || '(anon)', area: areaDe(o) };
  }

  /* SPAN de UV e a declaração de wrap do autor. Isto é a CLÁUSULA IRMÃ (TEXEL6): a régua
     de densidade, sozinha, PREMIA o estado ruim de esticar UV sobre uma textura que o autor
     marcou ClampToEdge — a densidade sobe e a face fica com a última coluna de texels
     borrada pelo resto do painel. `ClampToEdgeWrapping` não é acidente nesta árvore: os
     mapas o escrevem à mão em mural, placa e faixa (map_ferrovelho.js:178, map_lajes.js:110,
     map_piscinao_ramos.js:312 e mais 15 lugares). É a declaração "esta textura NÃO tila". */
  const repetivel = !m.map || (m.map.wrapS === THREE.RepeatWrapping && m.map.wrapT === THREE.RepeatWrapping);

  const pos = g.attributes.position, uv = g.attributes.uv;
  const idx = g.index;
  const nTri = (idx ? idx.count : pos.count) / 3;
  const passo = Math.max(1, Math.ceil(nTri / MAX_TRI));
  const mw = o.matrixWorld;

  let somaArea = 0, somaTexel = 0, somaAreaAmostrada = 0, somaNy = 0;
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let t = 0; t < nTri; t += passo) {
    const a = idx ? idx.getX(t * 3) : t * 3;
    const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    v0.fromBufferAttribute(pos, a).applyMatrix4(mw);
    v1.fromBufferAttribute(pos, b).applyMatrix4(mw);
    v2.fromBufferAttribute(pos, c).applyMatrix4(mw);
    e1.subVectors(v1, v0); e2.subVectors(v2, v0);
    cr.crossVectors(e1, e2);
    const areaM = cr.length() * 0.5;
    if (!(areaM > 1e-9)) continue;
    nrm.copy(cr).normalize();

    const u0x = uv.getX(a), u0y = uv.getY(a);
    const areaUV = Math.abs(
      (uv.getX(b) - u0x) * (uv.getY(c) - u0y) - (uv.getX(c) - u0x) * (uv.getY(b) - u0y)
    ) * 0.5;

    for (const k of [a, b, c]) {
      const ux = uv.getX(k), uy = uv.getY(k);
      if (ux < uMin) uMin = ux; if (ux > uMax) uMax = ux;
      if (uy < vMin) vMin = uy; if (uy > vMax) vMax = uy;
    }

    somaArea += areaM;
    somaAreaAmostrada += areaM;
    somaTexel += areaUV * texW * texH;
    somaNy += Math.abs(nrm.y) * areaM;
  }
  if (!(somaAreaAmostrada > 0) || !(somaTexel > 0)) {
    return { semMedida: true, classe: cl, nome: o.name || '(anon)', area: areaDe(o) };
  }
  // extrapola a área amostrada para a área real da malha (o passo é uniforme)
  const areaReal = somaAreaAmostrada * passo;
  return {
    nome: o.name || `(${g.type})`,
    tipo: g.type,
    classe: cl,
    origem,
    densidade: Math.sqrt(somaTexel / somaAreaAmostrada),
    area: areaReal,
    horizontal: (somaNy / somaAreaAmostrada) > 0.7,
    aniso,
    texW, texH,
    repetivel,
    spanUV: Math.max(uMax - uMin, vMax - vMin),
  };
}

function areaDe(o) {
  const g = o.geometry;
  if (!g?.attributes?.position) return 0;
  const pos = g.attributes.position, idx = g.index, mw = o.matrixWorld;
  const nTri = (idx ? idx.count : pos.count) / 3;
  const passo = Math.max(1, Math.ceil(nTri / MAX_TRI));
  let s = 0;
  for (let t = 0; t < nTri; t += passo) {
    const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    v0.fromBufferAttribute(pos, a).applyMatrix4(mw);
    v1.fromBufferAttribute(pos, b).applyMatrix4(mw);
    v2.fromBufferAttribute(pos, c).applyMatrix4(mw);
    e1.subVectors(v1, v0); e2.subVectors(v2, v0);
    s += cr.crossVectors(e1, e2).length() * 0.5;
  }
  return s * passo;
}

/* Percentil PONDERADO POR ÁREA: metro quadrado de chão pesa o que ele ocupa. É a
   diferença entre "a mediana das malhas" (onde 300 parafusos afogam o chão) e "a
   mediana da superfície que o jogador vê". */
function percentilPorArea(lista, q) {
  if (!lista.length) return null;
  const ord = [...lista].sort((a, b) => a.densidade - b.densidade);
  const total = ord.reduce((s, x) => s + x.area, 0);
  if (!(total > 0)) return null;
  let acc = 0;
  for (const x of ord) { acc += x.area; if (acc >= total * q) return x.densidade; }
  return ord[ord.length - 1].densidade;
}

const IGNORA = /^(sky|ceu|water|agua|fog|luz|light)/i;

function medirMapa(id, T) {
  const g = bootGame(id, { textures: T });
  const root = g.world?.root || g.scene;
  root.updateMatrixWorld(true);
  const sup = [], semTextura = [], semMedida = [];
  root.traverse((o) => {
    if (!o.isMesh || o.visible === false) return;
    if (IGNORA.test(o.name || '')) return;
    const r = mediraMalha(o);
    if (!r) return;
    if (r.semTextura) { semTextura.push(r); return; }
    if (r.semMedida) { semMedida.push(r); return; }
    sup.push(r);
  });

  const est = sup.filter((s) => s.classe === 'estrutural');
  const arte = sup.filter((s) => s.classe === 'arte');
  const areaEst = est.reduce((s, x) => s + x.area, 0);
  const areaTot = sup.reduce((s, x) => s + x.area, 0);
  const areaSemMedida = semMedida.reduce((s, x) => s + x.area, 0);

  const med = percentilPorArea(est, 0.5);
  const p95 = percentilPorArea(est, 0.95);
  const p05 = percentilPorArea(est, 0.05);
  const maxEst = est.length ? Math.max(...est.map((x) => x.densidade)) : null;
  const maxTot = sup.length ? Math.max(...sup.map((x) => x.densidade)) : null;
  const abaixo = est.filter((x) => x.densidade < TEXEL_MIN).reduce((s, x) => s + x.area, 0);

  // anisotropia: só interessa onde a vista é rasante, ou seja, superfície horizontal
  const chao = est.filter((x) => x.horizontal);
  const anisoRuim = chao.filter((x) => (x.aniso ?? 1) < ANISO_MIN);
  // TEXEL6: quem o autor marcou "não tila" não pode ter UV esticada além de uma volta.
  // 1,001 de folga: a soma de floats de uma face pode passar de 1,0 no último bit.
  const borrados = sup.filter((x) => !x.repetivel && x.spanUV > 1.001);

  return {
    id,
    nome: MAPS[id]?.nome || MAPS[id]?.name || id,
    malhas: sup.length + semTextura.length + semMedida.length,
    superficies: sup.length,
    areaEstrutural: areaEst,
    areaTotal: areaTot,
    mediana: med, p05, p95, maxEstrutural: maxEst, maxTotal: maxTot,
    dispersaoP95: med ? p95 / med : null,
    dispersaoMax: med ? maxEst / med : null,
    dispersaoTotal: med ? maxTot / med : null,
    fracAbaixoDoPiso: areaEst > 0 ? abaixo / areaEst : 0,
    fracNaoMedida: (areaTot + areaSemMedida) > 0 ? areaSemMedida / (areaTot + areaSemMedida) : 0,
    semMedida: semMedida.length,
    semTextura: semTextura.length,
    areaSemTextura: semTextura.reduce((s, x) => s + x.area, 0),
    anisoRuim: anisoRuim.length,
    borrados: borrados.length,
    borradosEx: borrados.slice(0, 3).map((x) => `${x.nome} (span ${x.spanUV.toFixed(1)})`),
    areaChao: chao.reduce((s, x) => s + x.area, 0),
    medianaChao: percentilPorArea(chao, 0.5),
    medianaArte: percentilPorArea(arte, 0.5),
    piores: [...est].sort((a, b) => a.densidade - b.densidade).slice(0, N_PIORES)
      .map((x) => ({ nome: x.nome, tipo: x.tipo, d: +x.densidade.toFixed(1), area: +x.area.toFixed(1) })),
    topo: [...est].sort((a, b) => b.densidade - a.densidade).slice(0, 5)
      .map((x) => ({ nome: x.nome, tipo: x.tipo, d: +x.densidade.toFixed(1), area: +x.area.toFixed(1) })),
  };
}

/* ---------------------------------------------------------------------------
   3. AS CLÁUSULAS
   ------------------------------------------------------------------------- */
const T = initTextures();
const linhas = [];
for (const id of ALVO) {
  try { linhas.push(medirMapa(id, T)); }
  catch (e) {
    // não saber medir custa o mesmo que estar errado
    linhas.push({ id, erro: e.message });
  }
}

const falhas = [];
const f = (n) => (n == null ? ' n/d' : n.toFixed(n < 10 ? 2 : 0));

console.log('');
console.log('  TEXEL — densidade de texel por mapa (px/m, mediana ponderada por área)');
console.log(`  banda BAR §1.8: ${TEXEL_MIN}–${TEXEL_MAX} px/m   alvo ${TEXEL_ALVO}   dispersão §3.1: ≤ ${DISPERSAO_MAX}×`);
console.log('  ' + '-'.repeat(104));
console.log('  mapa            med     chão      p05      p95   disp95   dispMax  <piso   arte    aniso✗  n/med');
for (const L of linhas) {
  if (L.erro) { console.log(`  ${L.id.padEnd(14)} ERRO: ${L.erro}`); falhas.push(`TEXEL0 ${L.id}: não foi possível medir (${L.erro})`); continue; }
  console.log(
    `  ${L.id.padEnd(14)}${f(L.mediana).padStart(6)}${f(L.medianaChao).padStart(9)}` +
    `${f(L.p05).padStart(9)}${f(L.p95).padStart(9)}` +
    `${(L.dispersaoP95 == null ? 'n/d' : L.dispersaoP95.toFixed(2) + '×').padStart(9)}` +
    `${(L.dispersaoMax == null ? 'n/d' : L.dispersaoMax.toFixed(1) + '×').padStart(10)}` +
    `${(100 * L.fracAbaixoDoPiso).toFixed(0).padStart(6)}%` +
    `${f(L.medianaArte).padStart(8)}` +
    `${String(L.anisoRuim).padStart(8)}` +
    `${(100 * L.fracNaoMedida).toFixed(1).padStart(7)}%`
  );

  // TEXEL1 — a mediana da superfície estrutural dentro da banda do BAR §1.8
  if (L.mediana == null) falhas.push(`TEXEL1 ${L.id}: nenhuma superfície estrutural mensurável`);
  else if (L.mediana < TEXEL_MIN || L.mediana > TEXEL_MAX)
    falhas.push(
      `TEXEL1 ${L.id}: mediana ${L.mediana.toFixed(1)} px/m fora da banda ${TEXEL_MIN}–${TEXEL_MAX} ` +
      `(BAR §1.8; alvo ${TEXEL_ALVO}). Chão em ${f(L.medianaChao)} px/m. ` +
      `Conserto: escalar UV pelo tamanho do mundo em vao.js aoBoxGeo (tile 2,0 m) e trocar o ` +
      `\`repeat\` fixo de textures.js por metros-por-tile. Ignorar = chão borrado a 1 m do nariz.`
    );

  // TEXEL2 — nenhuma fatia grande da área abaixo do piso (a mediana sozinha não morde)
  if (L.fracAbaixoDoPiso > PISO_AREA_MAX)
    falhas.push(
      `TEXEL2 ${L.id}: ${(100 * L.fracAbaixoDoPiso).toFixed(1)}% da área estrutural abaixo de ` +
      `${TEXEL_MIN} px/m (teto ${(100 * PISO_AREA_MAX).toFixed(0)}%). Pior: ` +
      L.piores.slice(0, 3).map((p) => `${p.nome} ${p.d}px/m em ${p.area}m²`).join(', ') +
      `. Estas superfícies recebem UV 0→1 independentemente do tamanho.`
    );

  // TEXEL3 — dispersão (BAR-CONSISTENCIA §3.1)
  if (L.dispersaoP95 != null && L.dispersaoP95 > DISPERSAO_MAX)
    falhas.push(
      `TEXEL3 ${L.id}: dispersão p95/mediana = ${L.dispersaoP95.toFixed(2)}× > ${DISPERSAO_MAX}× ` +
      `(BAR-CONSISTENCIA §3.1). Maior estrutural: ${L.topo[0]?.nome} a ${L.topo[0]?.d} px/m ` +
      `contra mediana ${L.mediana.toFixed(1)}. Dois níveis de detalhe na mesma tela leem como bug.`
    );
  if (L.dispersaoMax != null && L.dispersaoMax > DISPERSAO_MAX_ABS)
    falhas.push(
      `TEXEL3b ${L.id}: maior/mediana = ${L.dispersaoMax.toFixed(1)}× > ${DISPERSAO_MAX_ABS}× — ` +
      `acima da exceção de hero prop da BAR §1.8. Culpado: ${L.topo[0]?.nome} (${L.topo[0]?.d} px/m).`
    );

  // TEXEL4 — anisotropia no chão (a superfície vista em ângulo rasante)
  if (L.anisoRuim > 0)
    falhas.push(
      `TEXEL4 ${L.id}: ${L.anisoRuim} superfície(s) horizontal(is) com anisotropy < ${ANISO_MIN}. ` +
      `textures.js:5 \`tex()\` nunca atribui \`anisotropy\`, então o default 1 vale para TODO chão ` +
      `procedural. Conserto: \`t.anisotropy = ANISO_ALVO\` na fábrica.`
    );

  // TEXEL6 — a cláusula IRMÃ: o conserto de densidade não pode borrar textura desenhada
  if (L.borrados > 0)
    falhas.push(
      `TEXEL6 ${L.id}: ${L.borrados} superfície(s) com UV além de uma volta sobre textura ` +
      `marcada ClampToEdge pelo autor do mapa: ${L.borradosEx.join(', ')}. ` +
      `Fora da volta o WebGL repete a ÚLTIMA COLUNA DE TEXELS pelo resto da face — mural e ` +
      `placa viram borrão esticado. Quem escala UV (vao.js aoBoxGeo) tem que pular material ` +
      `cujo \`map.wrapS\` não seja RepeatWrapping. Esta cláusula existe porque subir ` +
      `densidade de texel PREMIA exatamente esse estado ruim.`
    );

  // TEXEL5 — o que não foi possível medir
  if (L.fracNaoMedida > NAO_MEDIDO_MAX)
    falhas.push(
      `TEXEL5 ${L.id}: ${(100 * L.fracNaoMedida).toFixed(1)}% da área com textura ficou SEM MEDIDA ` +
      `(${L.semMedida} malhas). A régua não sabe medir e isso custa o mesmo que estar errado. ` +
      `Provável: arquivo de decalque ausente (\`bash scripts/fetch-decals.sh\`) ou formato de ` +
      `imagem que o leitor de cabeçalho não reconhece.`
    );
}
console.log('  ' + '-'.repeat(104));

// diagnóstico que não reprova: a dispersão COM a camada de arte dentro
for (const L of linhas) {
  if (L.erro || L.dispersaoTotal == null) continue;
  if (L.dispersaoTotal > DISPERSAO_MAX_ABS)
    console.log(`  · ${L.id}: dispersão TOTAL (com arte) = ${L.dispersaoTotal.toFixed(0)}× — arte a ` +
      `${f(L.medianaArte)} px/m contra cenário a ${f(L.mediana)}. Não reprova (hero surface, BAR §1.8) ` +
      `mas é o número que o olho vê.`);
}
for (const L of linhas) {
  if (L.erro) continue;
  if (L.semTextura) console.log(`  · ${L.id}: ${L.semTextura} malhas sem textura nenhuma (${L.areaSemTextura.toFixed(0)} m²) — cor pura, fora da conta.`);
}

if (arg('piores') !== null && !EM_JSON) {
  for (const L of linhas) {
    if (L.erro) continue;
    console.log(`\n  ${L.id} — ${N_PIORES} piores superfícies estruturais:`);
    for (const p of L.piores) console.log(`      ${String(p.d).padStart(8)} px/m  ${String(p.area).padStart(8)} m²  ${p.tipo.padEnd(16)} ${p.nome}`);
  }
}

if (EM_JSON) {
  const out = typeof JSON_OUT === 'string' ? path.resolve(ROOT, JSON_OUT) : path.join(HERE, 'texel_check.json');
  fs.writeFileSync(out, JSON.stringify({ gerado: new Date().toISOString(), tetos: { TEXEL_MIN, TEXEL_MAX, TEXEL_ALVO, DISPERSAO_MAX, PISO_AREA_MAX, ANISO_MIN }, mapas: linhas }, null, 1));
  console.log(`\n  → ${path.relative(ROOT, out)}`);
}

console.log('');
if (falhas.length) {
  for (const x of falhas) console.error('  ✗ ' + x);
  console.error(`\n  ✗ TEXEL: ${falhas.length} cláusula(s) vermelha(s) em ${ALVO.length} mapa(s).`);
  process.exit(1);
}
console.log(`  ✓ TEXEL: ${ALVO.length} mapa(s) dentro da banda ${TEXEL_MIN}–${TEXEL_MAX} px/m, dispersão ≤ ${DISPERSAO_MAX}×, anisotropia ≥ ${ANISO_MIN}.`);
