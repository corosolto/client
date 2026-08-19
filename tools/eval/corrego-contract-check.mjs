/* Contrato mecânico e de fauna do Córrego, medido no mundo real.

   - as duas pontas alagadas reduzem velocidade, pontes e margens secas não;
   - a capivara mora numa ponta alagada (|z| >= 34);
   - capivara cabe na escala naturalista (comprimento <= 1,85 m), não invade pneus e
     usa tronco/cabeça afunilados contínuos + pernas articuladas (não ovo+caixa+pinos);
   - 3–5 ratos têm anatomia legível, patas apoiadas sob o corpo e contexto de lixo;
   - o canal tem lâmina rebaixada e duas paredes verticais visíveis de profundidade.

   Procedência visual: `tmp/map-alpha61-openrouter-review.json`, fy_corrego, itens 1–5.
   Mutações: sem-lento | capivara-centro | ratos-parados | capivara-gigante | ratos-ovais
   | capivara-brinquedo | ratos-sem-contexto | canal-sem-profundidade

   ── FRENTE B v2.1.0 (plans/13-VISUAL-V2.1.md): fauna GLB + água viva + grama ──

   O jogo sobe DUAS vezes: primeiro SEM templates de fauna (os proxies procedurais —
   cláusulas originais intactas, é o que os demais checks e o ?glb=0 medem), depois
   COM templates registrados (o clone GLB tem de estar posicionado: jacaré ~1,8 m
   meio submerso no canal, capivara ~1,0 m na margem alagada, e os proxies invisíveis).

   LIMITAÇÃO DECLARADA (por que stub e não o binário): o GLTFLoader do jogo trava em
   node no caminho de TEXTURA (EXT_texture_webp → ImageBitmap/DOM; medido: GLB sem
   textura parseia, com textura a promise do parse nunca resolve). O censo injeta um
   stub cujos BOUNDS vêm do binário real (accessor POSITION de meshes[].primitives[],
   o mesmo critério que o shader-budget usa para a urna) pelo mesmo registro que o
   preload do browser usa (`registerFaunaTemplate`). Isso valida registro, clone,
   normalização de escala, posição e afundamento — todo o código do JOGO. O parse real
   do binário fica coberto por `eval:gltf-validator` (Khronos 0 erros) e pela captura
   de browser (evidência da frente em tools/eval/asset-evidence/maps/fy_corrego/).

   ÁGUA VIVA ("o threejs consegue fazer coisa muito melhor que isso", dono 18/08): a
   lâmina base precisa de onBeforeCompile com uniform de tempo (uAgua), geometria
   subdividida para a onda de vértice existir (>= 6 x 24 segmentos) e onBeforeRender
   que avança o uniforme entre quadros; amplitude <= 3 cm (a crista tem de ficar
   abaixo das fitas de brilho, que estão a +3 cm da lâmina).
   Mutações: agua-morta (remove onBeforeCompile e congela o relógio → vermelho).

   GRAMA (lote E-B, frente E): o mundo expõe `gramaSpots` (terreno reservado) e
   `gramaServida` (meshes colocados quando o prop `grama_corrego` existir no acervo).
   Sem o prop, a cláusula de presença fica DORMENTE e AVISA (pendência da frente E);
   com o prop, >= 90% dos spots servidos. Mutante grama-sumiu (só aplica com prop).
*/
import { readFileSync } from 'node:fs';
import { THREE, initTextures, bootGame } from './harness.mjs';
import { registerFaunaTemplate } from '../../public/js/ambientlife.js';

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const MUTANTES_FALLBACK = ['sem-lento', 'capivara-centro', 'ratos-parados', 'capivara-gigante', 'ratos-ovais',
  'capivara-urso', 'capivara-brinquedo', 'capivara-tapir', 'capivara-dois-apoios', 'ratos-clonados',
  'ratos-sem-contexto', 'ratos-sob-lixo', 'canal-preto', 'canal-sem-profundidade', 'ponte-prancha'];
const MUTANTES_GLB = ['proxy-volta', 'agua-morta', 'grama-sumiu'];
if (mutante && !MUTANTES_FALLBACK.includes(mutante) && !MUTANTES_GLB.includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}

function glbBounds(file) {
  const d = readFileSync(file);
  if (d.readUInt32LE(0) !== 0x46546c67 || d.readUInt32LE(4) !== 2) throw new Error(`${file}: GLB 2.0 inválido`);
  let offset = 12, json = null, bin = null;
  while (offset + 8 <= d.length) {
    const length = d.readUInt32LE(offset);
    const type = d.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) json = JSON.parse(d.subarray(offset + 8, offset + 8 + length).toString('utf8'));
    if (type === 0x004e4942) bin = d.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error(`${file}: chunk JSON/BIN ausente`);
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes || []) for (const prim of mesh.primitives || []) {
    const acc = json.accessors[prim.attributes?.POSITION];
    if (!acc?.min || !acc?.max) throw new Error(`${file}: accessor POSITION sem min/max`);
    for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], acc.min[k]); mx[k] = Math.max(mx[k], acc.max[k]); }
  }
  return { min: mn, max: mx };
}
function registrarStubs() {
  for (const [id, file, alvoLen, yawFix] of [
    ['jacare', 'public/models/ambient/jacare_corrego.glb', 1.8, Math.PI / 2],   // focinho -X no GLB → +Z após o fix
    ['capivara', 'public/models/ambient/capivara_corrego.glb', 1.0, 0],          // focinho +Z nativo
  ]) {
    const b = glbBounds(file);
    const size = [0, 1, 2].map((k) => b.max[k] - b.min[k]);
    const scene = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), new THREE.MeshStandardMaterial());
    mesh.position.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
    scene.add(mesh);
    registerFaunaTemplate(id, scene, { len: alvoLen, yawFix });
  }
}

/* ══ PASS 1 — SEM templates: proxies procedurais (cláusulas originais) ══ */
const game = bootGame('fy_corrego', { textures: initTextures(), ctf: true, seed: 13007 });
const world = game.world;
const slowAt = mutante === 'sem-lento' ? () => false : world.slowAt;
const fauna = [];
const canal = [], pontesLegiveis = [], profundidadeCanal = [], contextoRatos = [], tabuasPonte = [], colisoresPonte = [];
world.root.traverse((object) => {
  if (object.userData?.fauna) fauna.push(object);
  if (object.userData?.corregoWaterSurface) canal.push(object);
  if (object.userData?.bridgeReadable) pontesLegiveis.push(object);
  if (object.userData?.corregoDepthWall) profundidadeCanal.push(object);
  if (object.userData?.corregoRatContext) contextoRatos.push(object);
  if (object.userData?.corregoBridgeBoard) tabuasPonte.push(object);
  if (object.userData?.corregoBridgeCollider) colisoresPonte.push(object);
});
const capivara = fauna.find((object) => object.userData.fauna === 'capivara');
const ratos = fauna.filter((object) => object.userData.fauna === 'rato');
if (mutante === 'capivara-centro' && capivara) capivara.position.z = 0;
if (mutante === 'ratos-parados') for (const rato of ratos) delete rato.userData.motion;
if (mutante === 'capivara-gigante' && capivara) capivara.scale.multiplyScalar(2.2);
if (mutante === 'ratos-ovais') for (const rato of ratos) rato.children.splice(1);
if (mutante === 'capivara-urso' && capivara) for (const part of capivara.children) delete part.userData.capivaraPart;
if (mutante === 'capivara-brinquedo' && capivara) {
  for (const part of capivara.children) {
    if (['rounded-body-core','body-cap','blunt-head','blunt-muzzle','short-leg','rounded-foot'].includes(part.userData.capivaraPart)) {
      part.userData.capivaraPart = 'toy-part';
    }
  }
}
if (mutante === 'capivara-tapir' && capivara) for (const part of capivara.children) {
  if (['rounded-body-core','body-cap','blunt-head','blunt-muzzle','short-leg','rounded-foot'].includes(part.userData.capivaraPart)) part.userData.capivaraPart='tapir-part';
}
if (mutante === 'capivara-dois-apoios' && capivara) {
  const apoios = [];
  capivara.traverse((part) => { if (part.userData?.capivaraPart === 'rounded-foot') apoios.push(part); });
  for (let i = 0; i < apoios.length; i++) apoios[i].position.z = i < 2 ? -.4 : .3;
}
if (mutante === 'ratos-clonados') for (const rato of ratos) { rato.userData.poseId = 'same'; rato.userData.albedoId = 'same'; }
if (mutante === 'ratos-sem-contexto') for (const object of contextoRatos) object.userData.corregoRatContext = null;
if (mutante === 'ratos-sob-lixo') {
  const posicoesAntigas = [[-18,-3],[-17.62,-2.68],[-17.25,-3.2]];
  for (let i=0;i<Math.min(3,ratos.length);i++) ratos[i].position.set(posicoesAntigas[i][0], ratos[i].position.y, posicoesAntigas[i][1]);
}
if (mutante === 'canal-preto') for (const agua of canal) {
  if (agua.material.isShaderMaterial) {   // lâmina viva do RC2: a cor mora nos uniforms
    agua.material.uniforms.uCorRasa.value.setHex(0x050706);
    agua.material.uniforms.uCorFunda.value.setHex(0x050706);
  } else { agua.material.color.setHex(0x050706); agua.material.emissiveIntensity = 0; }
}
if (mutante === 'canal-sem-profundidade') for (const parede of profundidadeCanal) parede.visible = false;
if (mutante === 'ponte-prancha') for (const colisor of colisoresPonte) colisor.material.visible = true;
world.root.updateMatrixWorld(true);
const tamanhoCap = capivara ? new THREE.Box3().setFromObject(capivara).getSize(new THREE.Vector3()) : new THREE.Vector3(Infinity, Infinity, Infinity);
const caixaCap = capivara ? new THREE.Box3().setFromObject(capivara) : null;
const distanciaXZ = (box, x, z) => Math.hypot(Math.max(box.min.x - x, 0, x - box.max.x), Math.max(box.min.z - z, 0, z - box.max.z));
const folgaPneus = caixaCap ? Math.min(...[[-6, -36], [6, -36]].map(([x, z]) => distanciaXZ(caixaCap, x, z))) : -Infinity;
const anatomiaRato = (rato) => {
  const partes = [];
  rato.traverse((part) => { if (part.userData?.faunaPart) partes.push(part.userData.faunaPart); });
  return partes.filter((p) => p === 'ear').length >= 2 && partes.filter((p) => p === 'leg').length >= 4 && partes.includes('curved-tail');
};
const partesCap = new Map();
capivara?.traverse((part) => {
  const tipo = part.userData?.capivaraPart;
  if (tipo) partesCap.set(tipo, [...(partesCap.get(tipo) || []), part]);
});
const contaCap = (tipo) => (partesCap.get(tipo) || []).filter((part) => part.visible !== false).length;
const apoiosCap = (partesCap.get('rounded-foot') || []).filter((part) => part.visible !== false);
// Mesma origem do frame capivara.png. Contar posições locais deixou passar quatro
// pés escondidos dois-a-dois pelo tronco; a régua agora exige que o primeiro impacto
// do raio de cada apoio seja perna/pé, isto é, silhueta materializada no pixel.
const cameraCap = new THREE.Vector3(-8.2,1.65,-38);
const rayCap = new THREE.Raycaster();
const apoiosVisiveis = apoiosCap.filter((apoio) => {
  const alvo = new THREE.Vector3(); apoio.getWorldPosition(alvo);
  rayCap.set(cameraCap, alvo.clone().sub(cameraCap).normalize());
  const primeiro = rayCap.intersectObject(capivara, true)[0]?.object;
  return ['short-leg','rounded-foot'].includes(primeiro?.userData?.capivaraPart);
}).length;
const troncoCap = partesCap.get('rounded-body-core')?.[0];
const cabecaCap = partesCap.get('blunt-head')?.[0];
const juntaContinua = !!troncoCap && !!cabecaCap && (() => {
  const corpo = new THREE.Box3().setFromObject(troncoCap);
  const cabeca = new THREE.Box3().setFromObject(cabecaCap);
  corpo.expandByScalar(.055);
  return corpo.intersectsBox(cabeca);
})();
const formaCapivara = !!troncoCap && !!cabecaCap
  && troncoCap.geometry?.type === 'CylinderGeometry'
  && cabecaCap.geometry?.type === 'SphereGeometry'
  && contaCap('body-cap') >= 2 && contaCap('blunt-muzzle') >= 1
  && contaCap('short-leg') >= 4 && contaCap('rounded-foot') >= 4
  && juntaContinua;
/* A lâmina base do RC2 é ShaderMaterial: a cor mora em uCorRasa/uCorFunda e a
   textura em tMapa — ler `.color`/`.map` aqui mediria o material errado (o
   mutante canal-preto acima zera os MESMOS uniforms, senão a régua ficava cega). */
const legivelAgua = (agua) => {
  const m = agua.material;
  if (!m) return false;
  if (m.isShaderMaterial) {
    const c = m.uniforms?.uCorRasa?.value;
    const tex = m.uniforms?.tMapa?.value || m.map;
    return !!c && (c.r + c.g + c.b) / 3 >= .12 && !!tex;
  }
  const c = m.color;
  return c && (c.r + c.g + c.b) / 3 >= .12 && (m.map || m.emissiveIntensity >= .08);
};
const canalLegivel = canal.length >= 2 && canal.every(legivelAgua);
const paredesProfundas = profundidadeCanal.filter((parede) => {
  if (parede.visible === false || !parede.isMesh) return false;
  const size = new THREE.Box3().setFromObject(parede).getSize(new THREE.Vector3());
  const top = new THREE.Box3().setFromObject(parede).max.y;
  return size.y >= .42 && top >= -.04;
});
const tabuasNorte=tabuasPonte.filter((t)=>t.userData.corregoBridgeBoard==='norte'&&t.visible!==false).sort((a,b)=>a.position.x-b.position.x);
const gapsNorte=tabuasNorte.slice(1).filter((t,i)=>t.position.x-tabuasNorte[i].position.x>.92).length;
const alturasTabua=new Set(tabuasNorte.map((t)=>t.position.y.toFixed(3)));
const offsetsTabua=new Set(tabuasNorte.map((t)=>t.position.z.toFixed(3)));
const ponteIrregular=tabuasNorte.length>=10&&gapsNorte>=2&&alturasTabua.size>=3&&offsetsTabua.size>=3
  && colisoresPonte.some((c)=>c.userData.corregoBridgeCollider==='norte'&&c.material?.visible===false);
const ratosContextualizados = ratos.filter((rato) => contextoRatos.some((contexto) => {
  if (!contexto.userData.corregoRatContext) return false;
  let meshesContexto = 0; contexto.traverse((o) => { if (o.isMesh && o.visible !== false) meshesContexto++; });
  if (meshesContexto < 4) return false;
  const a = new THREE.Vector3(); const b = new THREE.Vector3();
  rato.getWorldPosition(a); contexto.getWorldPosition(b);
  return Math.hypot(a.x - b.x, a.z - b.z) <= 1.65;
}));
const meshesContexto=[];
for(const contexto of contextoRatos) contexto.traverse((o)=>{if(o.isMesh&&o.visible!==false)meshesContexto.push(o);});
const trioSemOclusao = ratos.slice(0,3).filter((rato)=>{
  const caixaRato=new THREE.Box3().setFromObject(rato);
  return !meshesContexto.some((mesh)=>caixaRato.intersectsBox(new THREE.Box3().setFromObject(mesh)));
});

const checks = [
  ['slowAt exportado', typeof slowAt === 'function'],
  ['alagado norte lento', !!slowAt?.(0, -37)],
  ['alagado sul lento', !!slowAt?.(0, 37)],
  ['ponte central normal', !slowAt?.(0, 0)],
  ['margem seca normal', !slowAt?.(12, 15)],
  ['capivara na margem alagada', !!capivara && Math.abs(capivara.position.z) >= 34],
  ['capivara em escala naturalista', tamanhoCap.z <= 1.85 && tamanhoCap.y <= 1.05],
  ['capivara fora dos pneus', folgaPneus >= .35],
  ['capivara de cabeça romba, corpo arredondado e quatro patas curtas sob o corpo', formaCapivara],
  ['capivara materializa quatro apoios sem oclusão na câmera lateral', apoiosVisiveis === 4],
  ['capivara com olhos/orelhas altos, garupa e contato',
    ['high-eyes','high-ears','raised-rump','contact-shadow'].every((p) => contaCap(p) >= 1)],
  ['3–5 ratos', ratos.length >= 3 && ratos.length <= 5],
  ['ratos com movimento', ratos.length > 0 && ratos.every((rato) => rato.userData.motion === 'deterministic-run-idle')],
  ['ratos com orelhas, quatro patas e cauda curva', ratos.length >= 3 && ratos.every(anatomiaRato)],
  ['ratos com corpo de 12–15 cm', ratos.length >= 3 && ratos.every((rato) => rato.userData.bodyLength >= .12 && rato.userData.bodyLength <= .15)],
  ['ratos alongados com cauda afinada', ratos.length >= 3 && ratos.every((rato) => rato.userData.bodyAspect >= 1.7 && rato.userData.taperedTail === true)],
  ['ratos com pelo menos duas poses e dois albedos', new Set(ratos.map((r) => r.userData.poseId)).size >= 2 && new Set(ratos.map((r) => r.userData.albedoId)).size >= 2],
  ['trio principal de ratos encostado em lixo/manilha', ratosContextualizados.length >= 3],
  ['trio principal fora dos volumes de lixo', trioSemOclusao.length === 3],
  ['canal legível', canalLegivel],
  ['canal rebaixado com duas paredes de profundidade', canal.some((agua) => agua.position.y <= -.3) && paredesProfundas.length >= 2],
  ['três pranchas/pontes legíveis e assentadas', new Set(pontesLegiveis.map((p) => p.userData.bridgeReadable)).size >= 3 && pontesLegiveis.every((p) => p.userData.grounded === true)],
  ['ponte norte com tábuas irregulares e pelo menos duas lacunas', ponteIrregular],
  ['fauna sem collider', fauna.length > 0 && fauna.every((animal) => {
    let ok = animal.userData.nonCollider === true;
    animal.traverse((part) => { if (part.isMesh && part.userData.nonSolidSurface !== true) ok = false; });
    return ok;
  })],
];

/* ══ PASS 2 — COM templates de fauna: censo GLB + água viva + grama ══ */
registrarStubs();
const game2 = bootGame('fy_corrego', { textures: initTextures(), ctf: true, seed: 13007 });
const world2 = game2.world;
const fauna2 = [], faunaProxy2 = [], canal2 = [];
world2.root.updateMatrixWorld(true);
world2.root.traverse((object) => {
  if (object.userData?.fauna) fauna2.push(object);
  if (object.userData?.faunaProxy) faunaProxy2.push(object);
  if (object.userData?.corregoWaterSurface) canal2.push(object);
});
if (mutante === 'proxy-volta') {
  const glbs = fauna2.filter((o) => o.userData.fauna === 'jacare' && o.userData.source === 'gltf' && o.visible !== false);
  if (!glbs.length) throw new Error('MUTANTE NAO APLICOU: nenhum jacaré GLB visível para sumir');
  for (const glb of glbs) { glb.visible = false; delete glb.userData.source; }
  const proxy = faunaProxy2.find((o) => o.userData.faunaProxy === 'jacare');
  if (!proxy) throw new Error('MUTANTE NAO APLICOU: proxy do jacaré não existe para voltar');
  proxy.visible = true;
}
const lamina = canal2.find((agua) => agua.userData.corregoWaterSurface === 'base');
if (mutante === 'agua-morta') {
  if (!lamina) throw new Error('MUTANTE NAO APLICOU: lâmina base não existe');
  lamina.material.onBeforeCompile = undefined;
  lamina.onBeforeRender = undefined;
  /* RC2: o relógio é o update(dt) do world — congela junto senão o mutante
     só mata a implementação v1 e passa verde com a água morta de verdade */
  if (typeof world2.update === 'function') world2.update = () => {};
}
const gramaServida = (world2.gramaServida || []).filter((g) => g && g.isObject3D);
if (mutante === 'grama-sumiu') {
  if (!gramaServida.length) throw new Error('MUTANTE NAO APLICOU: nenhuma grama servida (prop grama_corrego existe?)');
  for (const g of gramaServida) g.visible = false;
}
world2.root.updateMatrixWorld(true);

const jacareGlb = fauna2.find((o) => o.userData.fauna === 'jacare' && o.userData.source === 'gltf' && o.visible !== false);
const capivaraGlb = fauna2.find((o) => o.userData.fauna === 'capivara' && o.userData.source === 'gltf' && o.visible !== false);
const proxyJacare = faunaProxy2.find((o) => o.userData.faunaProxy === 'jacare');
const proxyCapivara = faunaProxy2.find((o) => o.userData.faunaProxy === 'capivara');
const CANAL_AGUA_Y = -1.61;
const boxDe = (o) => new THREE.Box3().setFromObject(o);
// comprimento SEM o yaw: AABB de objeto girado infla o eixo (1,8 m a 92° mede 2,01);
// tirar a rotação mede o tamanho real do asset como posicionado (escala incluída).
const lenSemYaw = (o) => {
  const ry = o.rotation.y;
  o.rotation.y = 0;
  o.updateMatrixWorld(true);
  const s = boxDe(o).getSize(new THREE.Vector3());
  o.rotation.y = ry;
  o.updateMatrixWorld(true);
  return Math.max(s.x, s.z);
};
const tamDe = (o) => boxDe(o).getSize(new THREE.Vector3());
const submerso = (o) => { const b = boxDe(o); return b.min.y < CANAL_AGUA_Y - 0.02 && b.max.y > CANAL_AGUA_Y + 0.05; };
const aguaShader = !!lamina && (
  (typeof lamina.material.onBeforeCompile === 'function' && /uAgua/.test(String(lamina.material.onBeforeCompile)))
  /* RC2 (frente G): a lâmina vira ShaderMaterial da water.js com uTime — a
     cláusula mede o CONTRATO (onda viva), não a implementação v1 */
  || (lamina.material.isShaderMaterial && !!lamina.material.uniforms?.uTime));
const aguaSegs = !!lamina
  && (lamina.geometry.parameters?.widthSegments || 0) >= 6
  && (lamina.geometry.parameters?.heightSegments || 0) >= 24;
let aguaRelogioAnda = false;
try {
  const antes = lamina.material.userData?.uAgua?.value;
  lamina.onBeforeRender?.();
  const depois = lamina.material.userData?.uAgua?.value;
  const v1 = Number.isFinite(antes) && Number.isFinite(depois) && depois > antes;
  let v2 = false;
  if (lamina.material.uniforms?.uTime && typeof world2.update === 'function') {
    const t0 = lamina.material.uniforms.uTime.value;
    world2.update(0.4);
    v2 = lamina.material.uniforms.uTime.value > t0;
  }
  aguaRelogioAnda = v1 || v2;
} catch { aguaRelogioAnda = false; }
const aguaAmpOk = !lamina?.userData?.aguaAmp || (lamina.userData.aguaAmp > 0 && lamina.userData.aguaAmp <= 0.03);   // brilho está a +3 cm da lâmina: crista tem de ficar abaixo
const gramaSpots = world2.gramaSpots || [];
const gramaAtiva = gramaServida.length > 0;
const gramaVisivel = gramaServida.filter((g) => g.visible !== false).length;
// dentro do mapa PELOS BOUNDS do próprio world — número de outra fonte é teto órfão
const b0 = world2.bounds || {};
const gramaSpotsDentro = gramaSpots.every((s) =>
  s.x >= (b0.minX ?? -Infinity) && s.x <= (b0.maxX ?? Infinity)
  && s.z >= (b0.minZ ?? -Infinity) && s.z <= (b0.maxZ ?? Infinity)
  && Math.abs(s.x) >= 3);   // grama é de MARGEM: nunca no vão do canal

checks.push(
  ['jacaré GLB posicionado no canal na escala do Mint (BUG-57)', !!jacareGlb && (() => {
    const b = boxDe(jacareGlb);
    const len = lenSemYaw(jacareGlb);
    const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    return len >= 1.62 && len <= 1.98 && Math.abs(cx - 0.8) < 2.5 && Math.abs(cz + 7) < 2.5;
  })()],
  ['jacaré meio submerso na lâmina (dorso de fora, patas na água)', !!jacareGlb && submerso(jacareGlb)],
  ['capivara GLB na margem alagada com escala da ficha', !!capivaraGlb && (() => {
    const b = boxDe(capivaraGlb);
    const len = lenSemYaw(capivaraGlb);
    const cz = (b.min.z + b.max.z) / 2;
    return len >= 0.9 && len <= 1.2 && Math.abs(cz + 38) < 4;
  })()],
  ['capivara GLB com os pés no chão da margem', !!capivaraGlb && (() => {
    const b = boxDe(capivaraGlb);
    const chao = world2.groundHeightAt((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2);
    return b.min.y >= chao - 0.12 && b.min.y <= chao + 0.12;
  })()],
  ['GLB substitui o proxy (proxies invisíveis quando o template existe)',
    !!jacareGlb && !!proxyJacare && proxyJacare.visible === false
    && !!capivaraGlb && !!proxyCapivara && proxyCapivara.visible === false],
  ['fauna GLB sem collider e fora de superfície sólida', !!jacareGlb && !!capivaraGlb
    && [jacareGlb, capivaraGlb].every((animal) => {
      let ok = animal.userData.nonCollider === true;
      animal.traverse((part) => { if (part.isMesh && part.userData.nonSolidSurface !== true) ok = false; });
      return ok;
    })],
  ['água com shader de onda (onBeforeCompile + uAgua)', aguaShader],
  ['água com geometria subdividida para a onda de vértice', aguaSegs],
  ['água com relógio vivo (uniform avança entre quadros)', aguaRelogioAnda],
  ['amplitude da onda <= 3 cm (crista abaixo do brilho)', aguaAmpOk],
  ['grama: terreno reservado nas margens (>= 12 spots dentro do mapa)', gramaSpots.length >= 12 && gramaSpotsDentro],
);
if (!gramaAtiva) {
  console.log('· GRAMA: prop grama_corrego ausente no acervo — cláusula de presença DORMENTE (pendência da frente E, lote E-B)');
} else {
  checks.push(['grama servida e visível em >= 90% dos spots', gramaVisivel / Math.max(1, gramaServida.length) >= 0.9]);
}

let falhas = 0;
for (const [nome, ok] of checks) { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome}`); }
if (falhas) {
  console.error(`CÓRREGO-CONTRATO FALHA: ${falhas}/${checks.length}${mutante ? ` (mutante ${mutante} mordido)` : ''}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu.`);
  process.exitCode = 1;
} else console.log('CÓRREGO-CONTRATO OK');
