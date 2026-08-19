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
*/
import { THREE, initTextures, bootGame } from './harness.mjs';

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
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

let falhas = 0;
for (const [nome, ok] of checks) { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome}`); }
if (falhas) {
  console.error(`CÓRREGO-CONTRATO FALHA: ${falhas}/${checks.length}${mutante ? ` (mutante ${mutante} mordido)` : ''}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu.`);
  process.exitCode = 1;
} else console.log('CÓRREGO-CONTRATO OK');
