#!/usr/bin/env node
/* pintura-fabrica-check.mjs — A PISTOLA PINTADA DA FÁBRICA (X18) LEVA A ARTE INTEIRA, SÓ NA ARMA.
   POR QUE EXISTE: com pinturaNaFabrica (10/11) a PT-38 pintada saiu na rota fab#pistol. O
   corpo X18 é skinned em vários ossos e a pintura entrava pelo SOCKET_WEAPON_PISTOL: o padrão
   lia `position` no espaço de bind do X18 (outra escala e outros eixos), então trabalho-13 e
   estrela-vermelha saíam em cor chapada, e as marcas nasciam no socket sem malha, com a lateral
   medida em ±Infinity (fora do quadro). Medido no jogo real (sonda em /tmp/pintura-fab, 1920×1080):
     ANTES  trabalho-13 vermelho liso, estrela-vermelha branco liso, emo-xadrez sem xadrez,
            0 marcas visíveis; mãos com o material do time (E) ou a luva do pack.
     DEPOIS padrão da loja no X18 (xadrez, faixas, camuflado), símbolo + letreiro no osso Arma.
   Luva xadrez em pack-emo-xadrez é a `gloveSkin` do PRÓPRIO pack (pack-emo-gloves), não pintura.

   Fixture: rig sintético no formato do X18 (osso Arma com a ficha boca/alça/cima, corpo e
   ferrolho skinned, mão skinned irmã na rig), pintado pelo _applyWeaponSkin real.
   PF1  mãos intactas: o grupo pintado não contém malha de mão, e material/identidade das mãos
        não mudam; nenhuma marca nasce dentro delas.
   PF2  a arma INTEIRA (corpo e ferrolho) recebe o material da pintura.
   PF3  padrão no espaço da loja: weaponSkinSpace leva o X18 à caixa da malha TP da pistola
        (cano −X de ±0,499, topo +0,38, lado ±0,093), sem espelho e com a boca em −X.
   PF4  marcas no osso da arma: grupo skin-frame-<id> filho de Arma, símbolo e letreiro dos dois
        lados, na lateral (|x| entre 1,6 e 2,0 cm do eixo) e dentro do comprimento e da altura.
   PF5  trocar de pintura não empilha grupo de marcas da anterior.
   PF6  todo SVG de marca (markAsset/markAssets) declara width e height no <svg>, na proporção do
        viewBox. Sem tamanho próprio o Chrome dá ao <img> 300×150 de faz-de-conta e o WebGL recusa
        o upload (texImage2D INVALID_VALUE): o plano existia sem oclusão e a marca não aparecia.
        Medido 10/11: usa-bandeira-grande.svg e maga-47.svg (liberdade e MAGA no X18, idle/inspeção
        e 3ª pessoa), acido-selo.svg e caveira-urbana.svg; com width/height os quatro sobem.

   REPRODUZ: node --import ./tools/eval/vm-hand-three-register.mjs tools/eval/pintura-fabrica-check.mjs [--mutante=<id>]
   MUTANTES: pintura-na-mao  -> pinta a rig inteira (mãos dentro do grupo pintado) -> PF1
             sem-referencia  -> a fábrica volta ao caminho do socket (estado de 10/11) -> PF3, PF4, PF5
             svg-sem-tamanho -> maga-47.svg sem width/height (estado de 10/11) -> PF6 */
import fs from 'node:fs';
import './harness.mjs';
const { THREE } = await import('./harness.mjs');

const MUTANTES = { 'pintura-na-mao': ['PF1'], 'sem-referencia': ['PF3', 'PF4', 'PF5'], 'svg-sem-tamanho': ['PF6'] };
const arg = process.argv.slice(2);
if (arg.length > 1 || arg.some((a) => !a.startsWith('--mutante=') || !MUTANTES[a.slice(10)])) throw Error(`CLI: --mutante=${Object.keys(MUTANTES).join('|')}`);
const MUTANTE = arg[0]?.slice(10) || '';

// Marca/símbolo sem rede: textura 512×512 no lugar do arquivo (a régua mede posição, não pixel).
THREE.TextureLoader.prototype.loadAsync = async function () { const t = new THREE.Texture(); t.image = { width: 512, height: 512 }; return t; };

const url = new URL('../../public/js/authoredvm.js', import.meta.url);
let source = fs.readFileSync(url, 'utf8');
const trocaUma = (antes, depois) => {
  if (source.split(antes).length !== 2) throw Error(`INFRA: trecho do mutante não é único: ${antes}`);
  source = source.replace(antes, depois);
};
if (MUTANTE === 'pintura-na-mao') {
  trocaUma('const corpo = meshes[0]?.parent;\n', 'const corpo = meshes[0]?.parent?.parent;\n');
  trocaUma('meshes.some((mesh) => mesh.parent !== corpo) || ', '');
  trocaUma('  if (comMao) return null;\n', '');
}
if (MUTANTE === 'sem-referencia') trocaUma('    if (entry.mint?.fabrica) {\n      const fabrica', '    if (false) {\n      const fabrica');
source = source.replace(/from (['"])([^'"]+)\1/g, (_, q, p) => `from ${q}${p.startsWith('.') ? new URL(p, url).href : import.meta.resolve(p)}${q}`)
  .replace(/import\((['"])(\.\.?\/[^'"]+)\1\)/g, (_, q, p) => `import(${q}${new URL(p, url).href}${q})`);
const runtime = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const { preloadWeaponSkinCandidate } = await import('../../public/js/weapon-skins.js');

// Rig no formato do X18 (cm, eixos do osso Arma: +Y boca, +Z cima, X lado), ver /tmp/pintura-fab/p2.
function rig() {
  const raiz = new THREE.Group(); raiz.name = 'RIG_FP_ARMS';
  const arma = new THREE.Bone(); arma.name = 'Arma';
  const ferrolhoOsso = new THREE.Bone(); ferrolhoOsso.name = 'Slider';
  const maoOsso = new THREE.Bone(); maoOsso.name = 'hand_r';
  arma.position.set(-58, 110, -5); arma.rotation.set(0.3, -1.2, 0.4); arma.add(ferrolhoOsso);
  raiz.add(arma, maoOsso);
  const socket = (nome, p) => { const o = new THREE.Object3D(); o.name = nome; o.position.set(...p); arma.add(o); return o; };
  const sockets = { muzzle: socket('SOCKET_FAB_MUZZLE', [0, 30.607, 3.0813]), sight: socket('SOCKET_FAB_SIGHT', [0, -9.393, 3.0813]),
    up: socket('SOCKET_FAB_UP', [0, -9.393, 13.0813]) };
  const ativo = socket('SOCKET_WEAPON_PISTOL', [0, -3.04, 1.63]);
  raiz.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([arma, ferrolhoOsso, maoOsso]);
  // Caixas no espaço do osso (pose de bind = a atual), levadas ao espaço da malha (bind = identidade).
  const malha = (nome, material, osso, caixas) => {
    const partes = caixas.map(([sx, sy, sz, cx, cy, cz]) => new THREE.BoxGeometry(sx, sy, sz).translate(cx, cy, cz));
    const pos = []; for (const g of partes) pos.push(...g.toNonIndexed().attributes.position.array);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.applyMatrix4(skeleton.bones[osso].matrixWorld);
    const n = pos.length / 3;
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0).map((_, i) => (i % 4 === 0 ? osso : 0)), 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
    const m = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial({ name: material }));
    m.name = nome; m.bind(skeleton, new THREE.Matrix4());
    return m;
  };
  const grupoArma = new THREE.Group(); grupoArma.name = 'GEO_WEAPON_PISTOL_SK_G18001';
  const corpo = malha('SK_G18', 'CoroSolto_polymer', 0, [[3.2, 20.4, 3.2, 0, -1.7, -1.6], [3.2, 4, 11, 0, -8, -6]]);
  const ferrolho = malha('SK_G18_3', 'CoroSolto_finish_dark', 1, [[3.6, 20.4, 3.4, 0, -1.7, 1.4]]);
  grupoArma.add(corpo, ferrolho);
  const mao = malha('GEO_FP_SK_Glove_01', 'CoroSolto_FP_Glove', 2, [[8, 10, 6, 0, 0, 0]]);
  raiz.add(grupoArma, mao);
  raiz.updateMatrixWorld(true);
  return { raiz, arma, mao, corpo, ferrolho, entry: { key: 'fab#pistol', mint: { active: ativo, wraps: new Map(), weaponId: 'pistol', fabrica: true }, sockets, weaponMeshes: [corpo, ferrolho], handMeshes: [mao] } };
}

let falhas = [];
const chk = (id, ok, ev) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${ev}`); if (!ok && !falhas.includes(id)) falhas.push(id); };
const materiais = (m) => (Array.isArray(m.material) ? m.material : [m.material]);
const pintar = (r, skinId) => runtime.AuthoredViewModels.prototype._applyWeaponSkin.call({ profile: { weaponSkins: { pistol: skinId } } }, r.entry, 'pistol');
const noOsso = (r, o) => { o.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(r.arma.matrixWorld.clone().invert()); };
const PISTOLAS = ['ouro-pistola', 'pack-emo-xadrez-pistol', 'trabalho-13-pistola', 'estrela-vermelha-pistola'];
for (const id of PISTOLAS) await preloadWeaponSkinCandidate(id);

for (const skinId of PISTOLAS) {
  const r = rig();
  const maoAntes = materiais(r.mao).map((m) => m.uuid).join();
  pintar(r, skinId);
  // PF1
  const pintados = [];
  r.raiz.traverse((o) => { if (o.isMesh && materiais(o).some((m) => m.userData?.weaponSkin)) pintados.push(o); });
  let grupoComMao = false;
  r.raiz.traverse((o) => { if (o.userData?.weaponSkin && o !== r.mao) o.traverse?.((f) => { if (f === r.mao) grupoComMao = true; }); });
  let marcaNaMao = false;
  r.mao.traverse((o) => { if (o !== r.mao && /^(skin-|club-mark-)/.test(o.name)) marcaNaMao = true; });
  chk('PF1', !grupoComMao && !marcaNaMao && maoAntes === materiais(r.mao).map((m) => m.uuid).join() && !pintados.includes(r.mao),
    `${skinId}: grupo pintado ${grupoComMao ? 'CONTÉM' : 'sem'} mão, material da mão ${maoAntes === materiais(r.mao).map((m) => m.uuid).join() ? 'intacto' : 'TROCADO'}, marca na mão=${marcaNaMao}`);
  // PF2
  chk('PF2', [r.corpo, r.ferrolho].every((m) => materiais(m).every((x) => x.userData?.weaponSkin === skinId)), `${skinId}: corpo e ferrolho com a pintura`);
  // PF3
  const caixa = new THREE.Box3();
  let espacos = 0, boca = null, det = 0;
  for (const m of [r.corpo, r.ferrolho]) {
    const e = materiais(m)[0].userData?.weaponSkinSpace;
    if (!e) continue;
    espacos += 1;
    const S = new THREE.Matrix4().fromArray(e);
    det = S.determinant();
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) caixa.expandByPoint(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(S));
    boca ??= new THREE.Vector3(0, 30.607, 3.0813).applyMatrix4(r.arma.matrixWorld).applyMatrix4(S);
  }
  const perto = (a, b, t = 0.03) => Math.abs(a - b) <= t;
  chk('PF3', espacos === 2 && det > 0 && perto(caixa.min.x, -0.499) && perto(caixa.max.x, 0.499) && perto(caixa.max.y, 0.38)
    && caixa.max.z <= 0.093 + 0.03 && caixa.min.z >= -0.093 - 0.03 && boca && boca.x < caixa.min.x,
  `${skinId}: espaço em ${espacos}/2 malhas, caixa TP x[${caixa.min.x.toFixed(3)}, ${caixa.max.x.toFixed(3)}] y≤${caixa.max.y.toFixed(3)} z[${caixa.min.z.toFixed(3)}, ${caixa.max.z.toFixed(3)}], det ${det.toExponential(2)}, boca x=${boca?.x.toFixed(2)}`);
  // PF4
  const host = r.arma.children.find((o) => o.name === `skin-frame-${skinId}`);
  const marcas = [];
  r.raiz.traverse((o) => { if (o.isMesh && /^(skin-|club-mark-)/.test(o.name)) marcas.push(o); });
  const def = (await import('../../public/js/data/weapon-skin-definitions.js')).WEAPON_SKINS[skinId];
  const esperadas = (def.markAsset ? 2 : 0) + (def.slogan ? 2 : 0);
  const fora = marcas.filter((o) => {
    const p = noOsso(r, o);
    return !(o.parent === host && Math.abs(Math.abs(p.x) - 1.8) <= 0.2 && p.y >= -11.9 && p.y <= 8.5 && p.z >= -11.5 && p.z <= 3.1 && Number.isFinite(p.x + p.y + p.z));
  });
  chk('PF4', (esperadas === 0 || host) && marcas.length === esperadas && !fora.length,
    `${skinId}: ${marcas.length}/${esperadas} marcas, grupo ${host ? 'no osso Arma' : 'AUSENTE'}, fora da lateral: ${fora.map((o) => `${o.name}@${noOsso(r, o).toArray().map((v) => v.toFixed(1))}`).join(' ') || 'nenhuma'}`);
  // PF5
  if (skinId === 'trabalho-13-pistola') {
    pintar(r, 'estrela-vermelha-pistola');
    const grupos = r.arma.children.filter((o) => /^skin-frame-/.test(o.name)).map((o) => o.name);
    chk('PF5', grupos.length === 1 && grupos[0] === 'skin-frame-estrela-vermelha-pistola', `grupos no osso após trocar: ${grupos.join(', ') || 'nenhum'}`);
  }
}

// PF6
const { WEAPON_SKINS } = await import('../../public/js/data/weapon-skin-definitions.js');
const svgs = [...new Set(Object.values(WEAPON_SKINS).flatMap((d) => [d.markAsset, ...Object.values(d.markAssets || {})])
  .filter((a) => typeof a === 'string' && a.endsWith('.svg')))].sort();
const semTamanho = svgs.filter((asset) => {
  let texto = fs.readFileSync(new URL(`../../public${asset}`, import.meta.url), 'utf8');
  if (MUTANTE === 'svg-sem-tamanho' && asset.endsWith('/maga-47.svg')) texto = texto.replace(/(<svg\b[^>]*?)\s+width="[^"]*"\s+height="[^"]*"/, '$1');
  const raiz = texto.match(/<svg\b[^>]*>/)?.[0] || '';
  const attr = (n) => Number(raiz.match(new RegExp(`\\s${n}="([\\d.]+)"`))?.[1]);
  const caixa = raiz.match(/\sviewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number) || [];
  const [w, h] = [attr('width'), attr('height')];
  return !(w > 0 && h > 0 && caixa.length === 4 && Math.abs(w / h - caixa[2] / caixa[3]) <= 0.01 * (caixa[2] / caixa[3]));
});
chk('PF6', svgs.length > 0 && !semTamanho.length, `${svgs.length} SVGs de marca; sem width/height na proporção do viewBox: ${semTamanho.join(' ') || 'nenhum'}`);

falhas = falhas.sort();
if (MUTANTE) {
  const ok = JSON.stringify(falhas) === JSON.stringify([...MUTANTES[MUTANTE]].sort());
  console.log(`PINTURA-FABRICA mutante ${MUTANTE}: reprovou ${falhas.join(',') || 'nada'} (esperado ${MUTANTES[MUTANTE].join(',')}) → ${ok ? 'REPROVOU COMO DEVIA' : 'NÃO REPROVOU COMO DEVIA'}`);
  process.exit(ok ? 1 : 0);
}
console.log(`PINTURA-FABRICA ${falhas.length ? `VERMELHO: ${falhas.join(',')}` : 'VERDE'}`);
process.exit(falhas.length ? 1 : 0);
