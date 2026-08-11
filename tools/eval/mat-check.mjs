/* ============================================================================
   mat-check.mjs — A RÉGUA DE MATERIAL, LUZ E SUPERFÍCIE.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O dono jogou e disse, com estas palavras:
     "o material do viewmodel não bate com o da mesma arma no chão: no chão metal
      escuro e madeira certa, NA MÃO ficam brancas/cromadas"          -> MAT1 / MAT2
     "a tela lava pra branco, o mapa inteiro vira branco e dá pra ver
      só o contorno da geometria"                                     -> FOG1
     "placas e bandeiras brancas sem textura, retângulos brancos
      grandes e lisos; uma placa é branco puro"                       -> TEX1
   Nenhuma das três é gosto. As três são propriedades MENSURÁVEIS do estado do
   jogo em node puro, e enquanto ninguém as mediu cada rodada trocou um sintoma
   por outro (o clamp que fez a arma ficar branca existe porque, antes dele, ela
   ficava preta — ver o bloco do `fixVmMaterials` no game.js).

   REGRA DE PROCEDÊNCIA (o padrão que o ref-measure.py fixou nesta árvore)
   Nada aqui é tabelado à mão. Cada número tem uma origem:
     · fatores de material  -> lidos do chunk JSON dos 26 GLB (spec glTF §material:
                               metallicFactor/roughnessFactor ausentes = 1,0)
     · transformação por caminho -> EXTRAÍDA DO game.js E EXECUTADA. O corpo do
                               `fixVmMaterials` é recortado do arquivo e rodado
                               sobre um material-sonda; se o código mudar, a régua
                               muda junto. Isto é o mesmo princípio do AUD1: uma
                               régua que carrega uma CÓPIA da regra mente no dia
                               em que a regra muda.
     · luzes / env / fog    -> MEDIDOS em runtime, subindo os 5 mapas reais com o
                               harness.mjs (Game real, DOM stubado).
     · superfícies sem mapa -> varredura de malha da cena real, área do MAIOR
                               triângulo (bbox de geometria mesclada mente).
     · luminância prevista  -> tools/eval/mat_shade.py (avaliação analítica do
                               MeshStandardMaterial do three + AgX do bloom.js).

   Uso:  node tools/eval/mat-check.mjs        (escreve mat_scenes.json + mat_check.json)
   ============================================================================ */
import path from 'node:path';
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';
// a régua chama a MESMA função do jogo pra referência de céu; cópia aqui seria a dívida
// de sincronia que o AUD1 existe pra vigiar
const { skyRadiance } = await import('../../public/js/bloom.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const JS = path.join(ROOT, 'public', 'js');
const GAME_JS = readFileSync(path.join(JS, 'game.js'), 'utf8');
const GLBCHARS_JS = readFileSync(path.join(JS, 'glbchars.js'), 'utf8');

const round = (v, d = 3) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(d) : v);
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

/* ---------------------------------------------------------------------------
   1. A TRANSFORMAÇÃO DE MATERIAL DE CADA CAMINHO, LIDA DO JOGO
   O mesmo GLB entra em três lugares diferentes do código:
     VM   game.js `mountRw` -> `fixVmMaterials(rw)`      (1ª pessoa)
     CHÃO game.js, troca do pickup + `_dropWeapon`       (arma no chão)
     TP   glbchars.js, mount da arma no boneco           (3ª pessoa)
   Aqui a gente não RE-ESCREVE o que cada um faz: recorta o trecho do arquivo e,
   no caso do VM, EXECUTA o corpo sobre um material-sonda. Assim o número que sai
   é o do código que está no disco, não o do código que alguém lembrou. */
/* Recorta a EXPRESSÃO inteira de `const <nome> = <expr>;` — parênteses e chaves
   balanceados, parando no `;` de profundidade zero. Recortar só o corpo interno
   não serve: ele fala do parâmetro do arrow de dentro (`o`), que só existe se a
   expressão inteira for avaliada. */
function extraiExpressao(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) return null;
  let k = src.indexOf('=', i) + 1;
  let par = 0, chv = 0;
  const ini = k;
  for (; k < src.length; k++) {
    const c = src[k];
    if (c === '(') par++;
    else if (c === ')') par--;
    else if (c === '{') chv++;
    else if (c === '}') chv--;
    else if (c === ';' && par === 0 && chv === 0) break;
  }
  return { expr: src.slice(ini, k).trim(), linha: lineOf(src, i) };
}

/* Material-sonda: só o que o `fixVmMaterials` toca. `clone()` devolve um objeto
   com os mesmos campos (é o que o three faz) para que o `o.material = o.material.clone()`
   do jogo não perca o estado que a gente quer medir. */
function sondaMaterial(base) {
  const mk = (o) => ({ ...o, isMaterial: true, clone() { return mk(this); } });
  return mk(base);
}

function medeCaminhoVM(metalFactor, roughFactor) {
  const ex = extraiExpressao(GAME_JS, 'const fixVmMaterials =');
  if (!ex) return { erro: 'fixVmMaterials não encontrado em game.js' };
  const mat = sondaMaterial({ metalness: metalFactor, roughness: roughFactor, envMapIntensity: 1 });
  const o = { isMesh: true, material: mat };
  const alvo = { traverse: (fn) => fn(o) };
  try {
    /* Avalia a expressão DO ARQUIVO e aplica no alvo-sonda. Nenhuma cópia da regra mora
       aqui: se alguém trocar o 0,55, o número desta régua troca no mesmo commit.
       CONTEXTO INJETADO = a CONFIGURAÇÃO PADRÃO do jogo, e é isso que a régua mede:
         VM_MAT_LEGACY = false  (sem ?vmmat=legacy)
         temEnv        = true   (o IBL existe — conferido de verdade logo abaixo, por mapa,
                                 no campo `env` de cada entrada de `maps`)
       Se um dia o `fixVmMaterials` passar a depender de outro nome livre, isto estoura com
       ReferenceError e a régua acusa em vez de mentir um número. */
    // eslint-disable-next-line no-new-func
    const fn = new Function('THREE', 'VM_MAT_LEGACY', 'temEnv', 'QS', 'return (' + ex.expr + ');')(
      THREE, false, true, new URLSearchParams(''));
    fn(alvo);
  } catch (e) { return { erro: 'fixVmMaterials não executou: ' + e.message, fonte: ex.expr.slice(0, 120) }; }
  return {
    linha: ex.linha, fonte: ex.expr.replace(/\s+/g, ' ').slice(0, 200),
    metalFactor: o.material.metalness, roughFactor: o.material.roughness,
    envMapIntensity: o.material.envMapIntensity ?? 1,
  };
}

/* Caminhos que NÃO transformam: prova por varredura. Recorta N linhas a partir da
   âncora e procura qualquer escrita em `.material`. Se não houver nenhuma, o material
   chega no shader com os fatores CRUS do GLB — que é justamente a assimetria que o
   dono viu. Se alguém adicionar um ajuste ali, esta função passa a enxergar. */
function mutacoesDeMaterial(src, ancora, nLinhas, arquivo) {
  const i = src.indexOf(ancora);
  if (i < 0) return { erro: `âncora ausente em ${arquivo}: ${ancora.slice(0, 40)}` };
  const l0 = lineOf(src, i);
  const linhas = src.split('\n').slice(l0 - 1, l0 - 1 + nLinhas);
  const hits = [];
  linhas.forEach((ln, k) => {
    const semComentario = ln.replace(/\/\/.*$/, '');
    if (/\.material\s*(\.\w+)?\s*=/.test(semComentario) || /(metalness|roughness|envMapIntensity)\s*=/.test(semComentario)) {
      hits.push(`${arquivo}:${l0 + k}`);
    }
  });
  return { linha: l0, mutacoes: hits };
}

/* ---------------------------------------------------------------------------
   2. ORÇAMENTO DE LUZ POR CENA
   Soma de intensidades COM TIPO. Luz pontual com intensidade 0 (o pool de muzzle
   flash) não entra: ela não ilumina nada. Luz pontual do mapa (as 3 do teto do
   loja_h) entra numa coluna separada — ela é LOCAL (decay quadrático, alcance
   finito) e não é comparável a uma direcional que banha a cena inteira; misturar
   as duas na mesma soma foi o que quase fez o havan parecer 56 unidades de luz. */
function orcamento(scene) {
  const itens = [];
  let dir = 0, hemi = 0, amb = 0, pontual = 0;
  scene.traverse((o) => {
    if (!o.isLight || !(o.intensity > 0)) return;
    const rec = { type: o.type, intensity: round(o.intensity), color: '#' + o.color.getHexString() };
    if (o.position) rec.pos = [round(o.position.x, 2), round(o.position.y, 2), round(o.position.z, 2)];
    if (o.groundColor) rec.ground = '#' + o.groundColor.getHexString();
    if (o.distance !== undefined && o.type !== 'HemisphereLight') rec.distance = round(o.distance, 1);
    itens.push(rec);
    if (o.type === 'DirectionalLight') dir += o.intensity;
    else if (o.type === 'HemisphereLight') hemi += o.intensity;
    else if (o.type === 'AmbientLight') amb += o.intensity;
    else pontual += o.intensity;
  });
  return { lights: itens, dir: round(dir), hemi: round(hemi), amb: round(amb), pontual: round(pontual), global: round(dir + hemi + amb) };
}

/* ---------------------------------------------------------------------------
   3. SUPERFÍCIE GRANDE SEM MAPA DE ALBEDO (TEX1)
   Métrica = área do MAIOR TRIÂNGULO em metros de mundo. A bbox de uma malha
   MESCLADA (o `havan-deco` junta dezenas de lâmpadas num BufferGeometry só) dá
   milhares de m² que não existem como superfície contínua; o maior triângulo dá
   o tamanho do maior pedaço LISO de verdade, que é o que o olho lê como
   "retângulo branco grande". Só conta o que é VISÍVEL (objeto, pais e material)
   e claro — uma caixa cinza-escura sem textura não é a queixa do dono. */
function maiorTriangulo(geo, escala) {
  const p = geo.attributes && geo.attributes.position;
  if (!p) return 0;
  const idx = geo.index, n = idx ? idx.count : p.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();
  let mx = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(p, i0).multiply(escala);
    b.fromBufferAttribute(p, i1).multiply(escala);
    c.fromBufferAttribute(p, i2).multiply(escala);
    const ar = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
    if (ar > mx) mx = ar;
  }
  return mx;
}

const TEX1_AREA = 6;      // m² do maior triângulo — 6 m² é uma parede de 2×3 m
const TEX1_LUM = 0.55;    // luminância relativa do albedo: acima disto lê como "clara/branca"

function superficiesLisas(scene) {
  scene.updateMatrixWorld(true);
  const rows = [];
  const esc = new THREE.Vector3(), pos = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || !o.material || !o.geometry || !o.visible) return;
    /* proxy de GLB (userData.glbFallback): no browser ele some quando o asset
       carrega; no node o GLB nunca carrega e o proxy fica visível com material
       cru — media parede branca que jogador nenhum vê. Fica de fora do TEX1. */
    if (o.userData && o.userData.glbFallback) return;
    for (let p = o.parent; p; p = p.parent) if (!p.visible) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.map || m.visible === false) continue;
      /* TRANSLÚCIDO FICA DE FORA. A queixa do dono é "retângulo BRANCO GRANDE E LISO" — uma
         vidraça, uma claraboia ou um decalque de tinta é justamente o caso em que NÃO ter
         albedo é o certo (quem dá a cor é o que está atrás). Incluí-los enchia a TEX1 de
         falso positivo: a claraboia do piscina_treta (300 m², opacidade 0,35) e as 6 vitrines
         do loja_h não são placas sem textura, são vidro. */
      if (m.transparent && m.opacity < 0.95) continue;
      o.getWorldScale(esc);
      const tri = maiorTriangulo(o.geometry, esc);
      if (tri < TEX1_AREA) continue;
      const c = m.color;
      const lum = c ? 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b : 0;
      o.getWorldPosition(pos);
      rows.push({
        cor: c ? '#' + c.getHexString() : '-', lum: round(lum, 2), mat: m.type, geo: o.geometry.type,
        maiorTri: round(tri, 1), pos: [round(pos.x, 0), round(pos.y, 0), round(pos.z, 0)],
        claro: lum >= TEX1_LUM,
      });
    }
  });
  rows.sort((a, b) => b.maiorTri - a.maiorTri);
  return rows;
}

/* ---------------------------------------------------------------------------
   4. A FUMAÇA (FOG1)
   O dono viu "o mapa inteiro branco, só o contorno da geometria". Três suspeitos
   possíveis: névoa do mapa, exposição do tonemap, ou a nuvem de granada. Aqui se
   mede o TERCEIRO com o código do próprio jogo: estoura uma fumaça, avança o
   relógio até o pico de opacidade e pergunta quanto do CENTRO DA TELA a nuvem
   cobre a partir de dentro dela — que é a situação real de quem joga fumaça no
   próprio pé ou atravessa a do bot.
   ALFA ACUMULADO = 1 − Π(1 − αᵢ) sobre os sprites cujo disco cobre o centro da
   tela. Com α acumulado ≈ 1 o pixel É a cor da fumaça, e aí só falta saber que
   cor é essa DEPOIS do tonemap — é o segundo número (L* previsto). */
function medeFumaca(g, mapId) {
  const alvo = new THREE.Vector3(0, 1.6, 0);
  g._smokes.length = 0;
  g.time = 0;
  g._popSmoke(alvo.clone());
  const s = g._smokes[0];
  if (!s) return { erro: '_popSmoke não criou nuvem' };
  // avança até o pico (grow satura em 0,8 s; o fade só começa em dur−2,5 s)
  for (let t = 0; t < 1.2; t += 1 / 60) { g.time = t; g._updateGrenades(1 / 60); }
  s.group.updateMatrixWorld(true);
  const cam = s.group.position.clone();          // câmera DENTRO da nuvem
  const wp = new THREE.Vector3();
  let naoCobre = 1;
  let maiorOp = 0, nCobrindo = 0;
  const raios = [];
  for (const sp of s.sprites) {
    sp.getWorldPosition(wp);
    const d = wp.distanceTo(cam);
    const r = sp.scale.x * 0.5;                  // sprite é um quadrado de lado scale
    raios.push(round(r, 2));
    // o centro da tela é coberto quando o disco do sprite contém a linha de visada;
    // com a câmera dentro da nuvem o pior caso é a distância radial < raio do sprite
    if (d < r) {
      // alfa do texel central da textura de fumaça: o gradiente do _makeSmokeTex vale
      // 0,95 no centro e cai a 0 na borda — usa-se o valor no raio normalizado d/r
      const k = d / Math.max(r, 1e-6);
      const aTex = k < 0.5 ? 0.95 + (0.6 - 0.95) * (k / 0.5) : 0.6 * (1 - (k - 0.5) / 0.5);
      const a = Math.max(0, Math.min(1, sp.material.opacity * aTex));
      naoCobre *= (1 - a);
      if (a > maiorOp) maiorOp = a;
      nCobrindo++;
    }
  }
  /* RADIÂNCIA LINEAR — a grandeza que decide FOG1. `material.color` do three já está no
     espaço linear de trabalho, então a luminância Rec.709 dele É radiância relativa. O teto
     é o CÉU MEDIDO do mapa (a cor-base da névoa em bloom.js:145-153, que o r3_fog.py tirou
     de frames reais; sem névoa, a cor da hemisférica). Nuvem iluminada pelo céu não pode ser
     mais clara que o céu — albedo ≤ 1. O teste não depende de exposição nem de tonemap. */
  const lumLin = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const ceu = skyRadiance(mapId);   // a MESMA função que o jogo usa (bloom.js) — sem cópia
  const fonteCeu = 'bloom.js skyRadiance(' + mapId + ') — AERIAL, medida por r3_fog.py';
  const cSm = s.sprites[0].material.color;
  return {
    sprites: s.sprites.length, raio: round(s.radius, 2), duracao: round(s.dur, 1),
    corSprite: '#' + cSm.getHexString(),
    opacidadeSprite: round(Math.max(...s.sprites.map((x) => x.material.opacity)), 3),
    escalaSprite: [Math.min(...raios) * 2, Math.max(...raios) * 2].map((v) => round(v, 2)),
    spritesCobrindoCentro: nCobrindo,
    alfaAcumuladoCentro: round(1 - naoCobre, 4),
    maiorAlfaSprite: round(maiorOp, 3),
    radianciaFumaca: round(lumLin(cSm), 4),
    radianciaCeu: round(lumLin(ceu), 4),
    razaoFumacaCeu: round(lumLin(cSm) / (lumLin(ceu) || 1e-9), 3),
    fonteCeu,
  };
}

/* NÉVOA E EXPOSIÇÃO — os outros dois suspeitos do "lava pra branco", medidos para poder
   ABSOLVÊ-LOS com número em vez de com opinião. A névoa só satura de longe (fogFactor
   exponencial); a exposição é medida contra cinza médio (0,18 linear). */
function medeNevoaEExposicao(g) {
  const fog = g.scene.fog;
  if (!fog) return { nevoa: null };
  const d = fog.density;
  const f = (D) => (d ? round(1 - Math.exp(-(d * D) * (d * D)), 3) : null);
  const c = fog.color;
  // o pior caso do shader de névoa direcional (bloom.js:190): olhando NA direção do sol
  const quente = new THREE.Color(
    Math.min(c.r * 2.30 + 0.045, 2), Math.min(c.g * 1.35 + 0.022, 2), Math.min(c.b * 0.72 + 0.006, 2));
  const lum = (x) => round(0.2126 * x.r + 0.7152 * x.g + 0.0722 * x.b, 4);
  return {
    nevoa: {
      densidade: round(d, 5), cor: '#' + c.getHexString(),
      radianciaNevoa: lum(c), radianciaNevoaContraluz: lum(quente),
      fogFactor: { m50: f(50), m100: f(100), m200: f(200) },
    },
  };
}

/* ---------------------------------------------------------------------------
   5. RENDERER / TONEMAP
   O caminho padrão (quality med/high, sem ?bloom=0) desliga o tonemap do three e
   aplica o AgX do bloom.js no composite. Os três valores por mapa (exposição,
   piso, saturação) saem da tabela LOOKS — lidos do arquivo, não copiados. */
function leLooks() {
  const src = readFileSync(path.join(JS, 'bloom.js'), 'utf8');
  const bloco = src.slice(src.indexOf('const LOOKS = {'), src.indexOf('const DEFAULT_LOOK'));
  const out = {};
  for (const m of bloco.matchAll(/(\w+):\s*\{\s*exposure:\s*([\d.]+),\s*floor:\s*([\d.]+),\s*expAces:\s*([\d.]+)\s*\}/g)) {
    out[m[1]] = { exposure: +m[2], floor: +m[3], expAces: +m[4] };
  }
  const sat = /const LOOK_SAT = ([\d.]+)/.exec(src);
  return { looks: out, sat: sat ? +sat[1] : 1.0 };
}

function leRenderer() {
  const src = readFileSync(path.join(JS, 'main.js'), 'utf8');
  const tm = /renderer\.toneMapping = THREE\.(\w+)/.exec(src);
  const ex = /renderer\.toneMappingExposure = ([\d.]+)/.exec(src);
  const cs = /renderer\.outputColorSpace\s*=\s*THREE\.(\w+)/.exec(src);
  const semPos = /if \(_qp\.get\('post'\) !== 'output'\) renderer\.toneMapping = THREE\.(\w+)/.exec(src);
  return {
    toneMappingInicial: tm ? tm[1] : null,
    toneMappingExposureInicial: ex ? +ex[1] : null,
    // outputColorSpace não é setado: o three r160 já nasce em SRGBColorSpace (default),
    // então o valor efetivo é esse — declarado aqui pra a régua não mentir por omissão.
    outputColorSpace: cs ? cs[1] : 'SRGBColorSpace (default do three r160, não setado)',
    comComposer: semPos ? semPos[1] : null,
  };
}

/* ---------------------------------------------------------------------------
   MEDIÇÃO
   -------------------------------------------------------------------------- */
const textures = initTextures();
const { looks, sat } = leLooks();
const DEFAULT_LOOK = { exposure: 2.40, floor: 0.0042, expAces: 2.61 };

// fatores declarados nos 26 GLB (spec glTF: ausente = 1,0)
function fatoresGLB() {
  const dir = path.join(ROOT, 'public', 'models', 'weapons');
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.glb')).sort()) {
    const b = readFileSync(path.join(dir, f));
    const jl = b.readUInt32LE(12);
    const j = JSON.parse(b.slice(20, 20 + jl).toString('utf8'));
    const mats = (j.materials || []).map((m) => {
      const p = m.pbrMetallicRoughness || {};
      return {
        metallicFactor: p.metallicFactor ?? 1, roughnessFactor: p.roughnessFactor ?? 1,
        temMapaMR: !!p.metallicRoughnessTexture, temMapaAlbedo: !!p.baseColorTexture,
      };
    });
    out.push({ arma: f.replace('.glb', ''), materiais: mats });
  }
  return out;
}
const glb = fatoresGLB();
const mfDeclarado = glb[0].materiais[0].metallicFactor;
const rfDeclarado = glb[0].materiais[0].roughnessFactor;

const vmPath = medeCaminhoVM(mfDeclarado, rfDeclarado);
const chaoPickup = mutacoesDeMaterial(GAME_JS, 'const rw = weaponModel(pk.weapon);', 8, 'game.js');
const chaoDrop = mutacoesDeMaterial(GAME_JS, 'const mesh = weaponModel(weapon) || buildRifle();', 10, 'game.js');
const tpMount = mutacoesDeMaterial(GLBCHARS_JS, "const gun = weaponModel(opts.weaponId || 'awp') || buildRifle();", 30, 'glbchars.js');

const maps = [], paths = [];
for (const mapId of Object.keys(MAPS)) {
  let g = null;
  try { g = bootGame(mapId, { textures }); }
  catch (e) { maps.push({ map: mapId, err: e.message }); continue; }
  const look = looks[mapId] || DEFAULT_LOOK;
  const oMapa = orcamento(g.scene);
  const oVm = orcamento(g.vmScene);
  const sun = g.world && g.world.sun;
  const fog = g.scene.fog;
  maps.push({
    map: mapId,
    sun: sun ? { pos: [sun.position.x, sun.position.y, sun.position.z], color: '#' + sun.color.getHexString(), intensity: round(sun.intensity) } : null,
    mapa: oMapa, vm: oVm,
    razaoVmMapa: round(oVm.global / (oMapa.global || 1e-9), 2),
    env: { cena: !!g.scene.environment, vm: !!g.vmScene.environment, mesmaTextura: g.scene.environment === g.vmScene.environment },
    fog: fog ? { tipo: fog.constructor.name, cor: '#' + fog.color.getHexString(), densidade: round(fog.density ?? null, 5), near: fog.near ?? null, far: fog.far ?? null } : null,
    look: { ...look, sat },
    superficies: superficiesLisas(g.scene),
    fumaca: medeFumaca(g, mapId),
    ...medeNevoaEExposicao(g),
  });
  const base = { exposure: look.exposure, floor: look.floor, sat };
  paths.push({
    id: `vm@${mapId}`, envMap: mapId, scene: { lights: oVm.lights }, ...base,
    metalFactor: vmPath.metalFactor ?? mfDeclarado, roughFactor: vmPath.roughFactor ?? rfDeclarado,
    envMapIntensity: vmPath.envMapIntensity ?? 1, lightMul: 1,
  });
  /* O caminho LEGADO entra na medição SEMPRE, não como curiosidade histórica: é o que o
     `?vmmat=legacy` reativa. Se um dia alguém precisar apertar a querystring de emergência,
     o número do que ele vai ver já está medido no mesmo relatório — clamp 0,55 sobre o fator,
     envMapIntensity 1,2 e o rig de luz de volta às 7,60 unidades fixas. */
  paths.push({
    id: `vmLegado@${mapId}`, envMap: mapId, scene: { lights: oVm.lights }, ...base,
    metalFactor: 0.55, roughFactor: 1, envMapIntensity: 1.2,
    lightMul: round(7.60 / (oVm.global || 1e-9), 4),
  });
  paths.push({
    id: `chao@${mapId}`, envMap: mapId,
    // a arma no chão é iluminada pelas luzes GLOBAIS do mapa; as pontuais do teto do
    // loja_h são locais e ficam de fora (ver `orcamento`)
    scene: { lights: oMapa.lights.filter((l) => l.type === 'DirectionalLight' || l.type === 'HemisphereLight' || l.type === 'AmbientLight') },
    ...base, metalFactor: mfDeclarado, roughFactor: rfDeclarado, envMapIntensity: 1, lightMul: 1,
  });
}

const scenes = {
  gerado: new Date().toISOString(),
  nota: 'luzes e env MEDIDOS em runtime (harness.mjs); fatores lidos do chunk JSON dos GLB',
  maps: maps.map((m) => ({ map: m.map, sun: m.sun })),
  paths,
};
writeFileSync(path.join(HERE, 'mat_scenes.json'), JSON.stringify(scenes, null, 1));

/* Luminância prevista: só roda se houver python3 + numpy + PIL. Sem eles a régua
   NÃO inventa um número — declara que não mediu (é a diferença entre "verde" e
   "não sei", e o repositório já paga caro por confundir as duas). */
let shade = null, shadeErr = null;
try {
  const out = execFileSync('python3', [path.join(HERE, 'mat_shade.py')], { cwd: ROOT, encoding: 'utf8', timeout: 900000 });
  if (!/MATSHADE_OK/.test(out)) shadeErr = out.trim().slice(0, 200);
  else shade = JSON.parse(readFileSync(path.join(HERE, 'mat_shade.json'), 'utf8'));
} catch (e) { shadeErr = (e.stdout || '') + ' ' + (e.message || ''); }

/* CROMATICIDADE MÃO × CHÃO — o resumo que o MAT1 cobra.
   Existe aqui, e não só no invariants.mjs, porque `npm run eval:mat` é o comando que se
   roda ao mexer em luz/material, e o número que decide esta rodada ("a arma na mão está
   dourada") não pode depender de rodar a bateria inteira pra aparecer. ΔL* mede claridade
   e foi o que a rodada passada olhou; Δa*b* e a razão de croma medem COR, que é a queixa. */
const cromatico = (() => {
  if (!shade?.armas?.length) return null;
  const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : null);
  const linhas = {};
  for (const m of maps.filter((x) => !x.err)) {
    const pares = shade.armas.map((a) => {
      const v = a.caminhos[`vm@${m.map}`], c = a.caminhos[`chao@${m.map}`];
      return v && c ? { arma: a.arma, v, c } : null;
    }).filter(Boolean);
    if (!pares.length) continue;
    const ab = pares.map(({ v, c }) => Math.hypot((v.aStar ?? 0) - (c.aStar ?? 0), (v.bStar ?? 0) - (c.bStar ?? 0)));
    const raz = pares.filter(({ c }) => (c.croma ?? 0) > 1.0).map(({ v, c }) => v.croma / c.croma);
    const pior = pares.reduce((p, x, i) => (ab[i] > p.ab ? { arma: x.arma, ab: ab[i] } : p), { arma: null, ab: -1 });
    linhas[m.map] = {
      dLmediano: round(med(pares.map(({ v, c }) => v.Lmean - c.Lmean)), 2),
      dABmediano: round(med(ab), 2), dABmax: round(Math.max(...ab), 2), dABpior: pior.arma,
      razaoCromaMediana: round(med(raz), 2),
      matizVmMediano: round(med(pares.map(({ v }) => v.matiz)), 1),
      matizChaoMediano: round(med(pares.map(({ c }) => c.matiz)), 1),
    };
  }
  return linhas;
})();

const j = {
  gerado: scenes.gerado,
  renderer: leRenderer(),
  cromatico,
  looks, sat,
  glb,
  caminhos: {
    vm: vmPath,
    chao_pickup: chaoPickup,
    chao_drop: chaoDrop,
    tp_mount: tpMount,
  },
  maps,
  shade, shadeErr,
  criterios: { TEX1_AREA, TEX1_LUM },
};
writeFileSync(path.join(HERE, 'mat_check.json'), JSON.stringify(j, null, 1));
console.log('MATCHECK_OK ' + maps.filter((m) => !m.err).length + ' mapas' + (shade ? ' + shade' : ' (sem shade: ' + String(shadeErr).slice(0, 80) + ')'));
if (cromatico) {
  console.log('COR DA ARMA — 1ª pessoa contra o drop de chão (mediana das 26 armas):');
  for (const [mapa, c] of Object.entries(cromatico))
    console.log(`  ${mapa.padEnd(14)} ΔL* ${String(c.dLmediano).padStart(6)}  Δa*b* ${String(c.dABmediano).padStart(5)} (pior ${c.dABmax} em ${c.dABpior})  croma mão/chão ${String(c.razaoCromaMediana).padStart(5)}×  matiz ${c.matizVmMediano}° vs ${c.matizChaoMediano}°`);
}
