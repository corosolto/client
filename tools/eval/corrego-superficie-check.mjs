/* ============================================================================
   corrego-superficie-check.mjs — A RÉGUA DE COR CHAPADA E DE FAUNA DO CÓRREGO.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O dono, jogando: "o do corrego esta horrivel, sem textura nenhuma" e
   "precisavamos de um jacare real, capivara real, rato real no mapa do corrego".
   As duas frases descrevem UM defeito só com duas caras: superfície que chega no
   olho como plástico de cor única, porque nunca recebeu mapa de textura, e bicho
   que chega como brinquedo, porque é feito de caixa.

   Nenhuma régua desta árvore mordia isso. O `texel-check.mjs` mede densidade de
   texel (px/m) e é EXCELENTE nisso — mas quem não tem textura nenhuma nem entra
   na conta dele: sai numa linha de diagnóstico que não reprova
   ("· fy_corrego: 217 malhas sem textura nenhuma (2058 m²) — cor pura, fora da
   conta"). Ou seja, a pior superfície do mapa era exatamente a que a régua de
   superfície não conseguia reprovar. O `corrego-contract-check.mjs` cobra
   anatomia de capivara e de rato com detalhe, e não diz UMA palavra sobre o
   jacaré — que é o bicho que o dono cita primeiro.

   O DEFEITO QUE ELA PREMIA (pergunta 1 da skill `regua`: qual estado ruim faz
   este número parecer bom?)
   - Medir cor chapada só por ÁREA premia quem deixa 24 caixas d'água de plástico
     azul liso no telhado: 24 props gritantes somam 324 m² contra 13 mil m² de
     chão e parede, e o percentual mal se move. Por isso a cláusula principal é a
     FRAÇÃO DE MATERIAIS sem `map` — que é, aliás, exatamente o número que o
     crítico de contexto limpo relatou (66% no córrego contra 31% de média dos 5
     mapas maduros) e que ninguém tinha instrumento para conferir.
   - Medir só por MATERIAL premia o contrário: quem compartilha um material liso
     entre 200 malhas fica com percentual ótimo e o mapa continua de plástico.
     Por isso a fração de ÁREA continua sendo cobrada junto, e vem do
     `texel-check.mjs` — esta régua NÃO reimplementa aquela medida, ela a
     CONSOME (`--json-out`), para que os dois números não possam divergir.
   - Medir bicho por número de malhas premia quem pica a mesma caixa em oito
     caixas menores. Por isso a cláusula de fauna cobra a FRAÇÃO DE ÁREA DO BICHO
     QUE É `BoxGeometry`: jacaré de caixa é indefensável mesmo com 30 peças.

   O QUE ELA NÃO ALCANÇA
   - Ela não sabe se a textura é BONITA nem se é a certa para o material; sabe que
     existe. Densidade e nitidez continuam sendo trabalho do `texel-check.mjs`.
   - Ela não vê malha com material `visible:false` (colisor invisível da ponte) e
     não vê a saia de contato (`ContactSkirt`, geometria mesclada preta): as duas
     são cor chapada DE PROPÓSITO e estão descontadas com nome, não caladas.
   - Ela mede no harness de node. Geometria de mapa e catálogo de textura são
     procedurais e idênticos ao browser; o que difere é o pixel, que não entra aqui.

   OS TETOS, E DE ONDE VIERAM
   Medido nos 10 mapas em 12/08 (probe de área/material, antes do conserto):

       praca_poderes  15% mats   1,2% área      fy_escadao     63% mats  14,6% área
       ferro_velho    14% mats   0,4% área      fy_campomorro  53% mats  17,2% área
       piscina_treta  21% mats  20,0% área      fy_lajes       56% mats  18,0% área
       quebrada       41% mats   8,6% área      fy_corrego     66% mats  13,1% área
       loja_h         68% mats   8,7% área      fy_mansao      97% mats  35,9% área

   Os 5 maduros dão média de 31,8% de materiais chapados; os 5 novos, 67%. O teto
   abaixo NÃO é a média dos maduros (teto colado no medido reprova por ruído): é a
   média dos maduros com folga, e ainda assim o córrego nasce VERMELHO nele, que é
   o ponto — teto que já nasce verde não é portão.

   MUTAÇÃO — o que prova que ela morde (contra a base VERDE de 12/08)
     tudo-chapado ..... SUP1 vermelha (100% dos materiais sem map)
     jacare-de-caixa .. SUP4 vermelha (100% da área do jacaré em BoxGeometry)
     fauna-picada ..... SUP3 vermelha nos três bichos (3 malhas cada)
   SUP2 não tem mutante sintético de propósito: o número dela vem de um SUBPROCESSO
   (texel-check), e um mutante que mexesse no valor lido provaria a aritmética daqui,
   não a medida de lá. A prova dela é empírica e está no registro: no estado ANTES do
   conserto ela saiu VERMELHA sozinha, com 13,0% (2.058 m²) contra teto de 6%.

   USO
     node tools/eval/corrego-superficie-check.mjs
     node tools/eval/corrego-superficie-check.mjs --mutante=tudo-chapado
     node tools/eval/corrego-superficie-check.mjs --mutante=jacare-de-caixa
     node tools/eval/corrego-superficie-check.mjs --mutante=fauna-picada
   ============================================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const MAPA = 'fy_corrego';

/* ---------------------------------------------------------------------------
   TETOS — um lugar só. Ver o cabeçalho para a medição que os originou.
   ------------------------------------------------------------------------- */
export const MATS_CHAPADOS_MAX = 0.40;  // fração de materiais sem `map` (maduros: média 0,32)
export const AREA_CHAPADA_MAX = 0.06;   // fração de m² sem `map` (piso irredutível ~0,027: saia + colisor)
export const BOX_FAUNA_MAX = 0.12;      // fração de área do bicho em BoxGeometry
/* Piso de malhas por bicho: NÃO é "quanto mais melhor" (ver o defeito premiado
   acima), é só o mínimo abaixo do qual não cabe anatomia nenhuma. */
export const MALHAS_MIN = { jacare: 18, capivara: 14, rato: 10 };

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;

/* ---------------------------------------------------------------------------
   1. COR CHAPADA — os m² vêm do texel-check (fonte única), o resto é local.
   ------------------------------------------------------------------------- */
/* O `--json-out` grava fora de tools/eval de propósito: artefato de uma régua não
   pode ser efeito colateral de outra (o texel_check.json é do texel-check). */
const tmpJson = path.join(os.tmpdir(), `corrego-texel-${process.pid}.json`);
let texel = null;
try {
  execFileSync(process.execPath,
    [path.join(HERE, 'texel-check.mjs'), `--mapa=${MAPA}`, `--json-out=${tmpJson}`],
    { cwd: ROOT, stdio: 'ignore' });
} catch { /* texel-check sai 1 quando alguma cláusula DELE está vermelha; o JSON sai igual */ }
try { texel = JSON.parse(fs.readFileSync(tmpJson, 'utf8')).mapas.find((m) => m.id === MAPA); }
catch { texel = null; }
finally { try { fs.unlinkSync(tmpJson); } catch { /* já não existe */ } }

if (!texel || texel.erro) {
  // não saber medir custa o mesmo que estar errado
  console.error(`✗ SUP0: texel-check não devolveu medida de ${MAPA} (${texel?.erro || 'sem JSON'}). ` +
    `Esta régua consome os m² dele em vez de reimplementá-los; sem ele não há número.`);
  process.exit(1);
}

/* ---------------------------------------------------------------------------
   2. O MAPA CONSTRUÍDO DE VERDADE — materiais e fauna.
   ------------------------------------------------------------------------- */
const { THREE, initTextures, bootGame } = await import('./harness.mjs');
const game = bootGame(MAPA, { textures: initTextures(), ctf: true, seed: 13007 });
const root = game.world.root;
root.updateMatrixWorld(true);

const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), cr = new THREE.Vector3();
function areaDe(o) {
  const g = o.geometry;
  if (!g?.attributes?.position) return 0;
  const pos = g.attributes.position, idx = g.index, mw = o.matrixWorld;
  const n = (idx ? idx.count : pos.count) / 3;
  const passo = Math.max(1, Math.ceil(n / 400));
  let s = 0;
  for (let t = 0; t < n; t += passo) {
    const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    v0.fromBufferAttribute(pos, a).applyMatrix4(mw);
    v1.fromBufferAttribute(pos, b).applyMatrix4(mw);
    v2.fromBufferAttribute(pos, c).applyMatrix4(mw);
    e1.subVectors(v1, v0); e2.subVectors(v2, v0);
    s += cr.crossVectors(e1, e2).length() * 0.5;
  }
  return s * passo;
}

const fauna = [];
const materiais = new Map();   // uuid -> { map: bool, malhas, area }
/* VIDA DE CÉU fora do censo de superfície, pelo MESMO motivo que o parque-wheel-check
   tira a fauna do dele: no arnês node os GLBs não baixam, os proxies procedurais entram
   sem textura e mexem numa razão que mede SUPERFÍCIE DE MAPA. Pipa a 18 m de altura não
   é parede. Medido: com os proxies dentro, 31,4% -> 39,0% contra teto de 40% — a régua
   estaria reprovando o céu achando que reprovava o barraco. */
const doCeu = (o) => { for (let p = o; p; p = p.parent) if (p.userData?.skyLife) return true; return false; };
root.traverse((o) => {
  if (o.userData?.fauna) fauna.push(o);
  if (!o.isMesh || o.visible === false) return;
  if (doCeu(o)) return;
  const arr = Array.isArray(o.material) ? o.material : [o.material];
  const m = arr.find((x) => x && x.map) || arr[0];
  if (!m || m.visible === false) return;   // colisor invisível da ponte: não chega no olho
  for (const x of arr) {
    if (!x) continue;
    const e = materiais.get(x.uuid) || { map: !!x.map, malhas: 0, area: 0, cor: x.color ? '#' + x.color.getHexString() : '?' };
    e.malhas++; e.area += areaDe(o);
    materiais.set(x.uuid, e);
  }
});

/* MUTANTES — provam que a régua morde antes de o conserto existir. */
if (mutante === 'tudo-chapado') for (const e of materiais.values()) e.map = false;
if (mutante === 'jacare-de-caixa' || mutante === 'fauna-picada') {
  const alvo = mutante === 'jacare-de-caixa'
    ? fauna.filter((a) => a.userData.fauna === 'jacare')
    : fauna;
  for (const a of alvo) a.traverse((o) => {
    if (!o.isMesh) return;
    if (mutante === 'fauna-picada') { o.userData.faunaMutanteRemover = true; return; }
    // caixa do mesmo tamanho: é literalmente o estado "bicho de Minecraft"
    o.geometry.computeBoundingBox();
    const s = o.geometry.boundingBox.getSize(new THREE.Vector3());
    o.geometry = new THREE.BoxGeometry(Math.max(s.x, 1e-3), Math.max(s.y, 1e-3), Math.max(s.z, 1e-3));
  });
}

const matsTotal = materiais.size;
const matsChapados = [...materiais.values()].filter((e) => !e.map).length;
const fracMats = matsTotal ? matsChapados / matsTotal : 0;

const areaSemTex = texel.areaSemTextura || 0;
const areaComTex = texel.areaTotal || 0;
const fracArea = (areaSemTex + areaComTex) > 0 ? areaSemTex / (areaSemTex + areaComTex) : 0;

/* ---------------------------------------------------------------------------
   3. FAUNA — quantas malhas e quanto do bicho é caixa.
   ------------------------------------------------------------------------- */
function censoBicho(grupo) {
  let malhas = 0, area = 0, areaBox = 0;
  const tipos = new Map();
  grupo.traverse((o) => {
    if (!o.isMesh || o.visible === false) return;
    if (o.userData.faunaMutanteRemover && malhas >= 3) return;   // mutante `fauna-picada`
    const a = areaDe(o);
    malhas++; area += a;
    if (o.geometry?.type === 'BoxGeometry') areaBox += a;
    tipos.set(o.geometry?.type || '?', (tipos.get(o.geometry?.type || '?') || 0) + 1);
  });
  return { malhas, area, fracBox: area > 0 ? areaBox / area : 0, tipos };
}

const especies = ['jacare', 'capivara', 'rato'];
const censo = {};
for (const sp of especies) {
  const gs = fauna.filter((a) => a.userData.fauna === sp);
  if (!gs.length) { censo[sp] = null; continue; }
  // o pior indivíduo é o que vale: 5 ratos bons não salvam 1 rato de caixa
  const cs = gs.map(censoBicho);
  censo[sp] = {
    n: gs.length,
    malhas: Math.min(...cs.map((c) => c.malhas)),
    fracBox: Math.max(...cs.map((c) => c.fracBox)),
    tipos: cs[0].tipos,
  };
}

/* ---------------------------------------------------------------------------
   4. AS CLÁUSULAS
   ------------------------------------------------------------------------- */
const falhas = [];
console.log('');
console.log(`  CÓRREGO-SUPERFÍCIE — cor chapada e fauna (${MAPA})`);
console.log('  ' + '-'.repeat(88));
console.log(`  materiais sem map .... ${matsChapados}/${matsTotal} = ${(100 * fracMats).toFixed(1)}%   (teto ${(100 * MATS_CHAPADOS_MAX).toFixed(0)}%)`);
console.log(`  área sem textura ..... ${areaSemTex.toFixed(0)} m² de ${(areaSemTex + areaComTex).toFixed(0)} m² = ${(100 * fracArea).toFixed(1)}%   (teto ${(100 * AREA_CHAPADA_MAX).toFixed(0)}%)  [fonte: texel-check]`);
console.log(`  malhas sem textura ... ${texel.semTextura}`);
for (const sp of especies) {
  const c = censo[sp];
  if (!c) { console.log(`  ${sp.padEnd(10)} ....... AUSENTE`); continue; }
  const t = [...c.tipos].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.replace('Geometry', '')}×${n}`).join(' ');
  console.log(`  ${sp.padEnd(10)} ....... ${c.n} indivíduo(s), pior com ${String(c.malhas).padStart(3)} malhas, ` +
    `${(100 * c.fracBox).toFixed(0).padStart(3)}% de área em caixa   ${t}`);
}
console.log('  ' + '-'.repeat(88));

// SUP1 — a fração de MATERIAIS chapados (o número do relato do dono)
if (fracMats > MATS_CHAPADOS_MAX)
  falhas.push(
    `SUP1: ${(100 * fracMats).toFixed(1)}% dos materiais sem \`map\` (${matsChapados} de ${matsTotal}), ` +
    `teto ${(100 * MATS_CHAPADOS_MAX).toFixed(0)}%. Os 5 mapas maduros ficam em 32% de média. ` +
    `Conserto: consumir o catálogo de public/js/textures.js (T.concrete, T.dirt, T.metal, T.asphalt, ` +
    `T.crate) em vez de \`lam({ color })\`, e COMPARTILHAR o material entre as repetições ` +
    `(24 caixas d'água não precisam de 24 materiais — material repetido não some com draw call, ` +
    `mas multiplica troca de estado e o cache de aoMatFactory). Ignorar = plástico de cor única no olho.`
  );

// SUP2 — a fração de ÁREA chapada (a cláusula irmã: sozinha, SUP1 se compra com compartilhamento)
if (fracArea > AREA_CHAPADA_MAX)
  falhas.push(
    `SUP2: ${(100 * fracArea).toFixed(1)}% da superfície (${areaSemTex.toFixed(0)} m²) sem textura nenhuma, ` +
    `teto ${(100 * AREA_CHAPADA_MAX).toFixed(0)}%. Medida importada do texel-check, onde esses m² saem ` +
    `FORA da conta de densidade — é a superfície que nenhuma régua de px/m alcança.`
  );

// SUP3 — fauna: existe, tem peça suficiente para anatomia, e não é feita de caixa
for (const sp of especies) {
  const c = censo[sp];
  if (!c) { falhas.push(`SUP3 ${sp}: nenhum grupo com \`userData.fauna === '${sp}'\` no mapa.`); continue; }
  if (c.malhas < MALHAS_MIN[sp])
    falhas.push(
      `SUP3 ${sp}: pior indivíduo com ${c.malhas} malhas, mínimo ${MALHAS_MIN[sp]}. ` +
      `Abaixo disso não cabe anatomia — o bicho lê como silhueta genérica.`
    );
  if (c.fracBox > BOX_FAUNA_MAX)
    falhas.push(
      `SUP4 ${sp}: ${(100 * c.fracBox).toFixed(0)}% da área do bicho é BoxGeometry (teto ` +
      `${(100 * BOX_FAUNA_MAX).toFixed(0)}%). Caixa não tem silhueta de animal: o jacaré lê como bicho ` +
      `de Minecraft dentro do córrego. Conserto: cilindro afunilado para focinho e patas, esfera ` +
      `escalada para crânio e tronco, cone para cauda e crista.`
    );
}

console.log('');
if (falhas.length) {
  for (const x of falhas) console.error('  ✗ ' + x);
  console.error(`\n  ✗ CÓRREGO-SUPERFÍCIE: ${falhas.length} cláusula(s) vermelha(s)${mutante ? ` (mutante ${mutante} mordido)` : ''}.`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`  ✗ MUTANTE ${mutante} SOBREVIVEU — a régua não morde o estado ruim que ela promete morder.`);
  process.exitCode = 1;
} else {
  console.log('  ✓ CÓRREGO-SUPERFÍCIE OK');
}
