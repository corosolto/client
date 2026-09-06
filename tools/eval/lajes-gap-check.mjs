/* V4: duas pontes reais ancoradas nas quatro plataformas, cotas ±0,30 m.
   Aposentadoria das 13 ligações e três alas: LAJES-V4-CONTRATOS-PLANO.md.
   Mutantes deslocam/subem a malha real; inventário vazio reprova. */
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('lajes', { textures: initTextures(), bots: 0 });
game.world.root.updateMatrixWorld(true);
const tabuas = [], lajes = [], cables = [];
game.world.root.traverse(object=>{
  if(object.isMesh && object.userData?.lajesPlatform)lajes.push(object);
  if(object.isMesh && object.userData?.lajesBridge)tabuas.push(object);
  if(object.userData?.overheadCable)cables.push(object);
});
if(lajes.length!==4 || tabuas.length!==2)throw Error(`V4 inventário: ${lajes.length}/4 lajes, ${tabuas.length}/2 pontes`);
if (process.argv.includes('--mutante=tabua-solta') && tabuas[0]) {
  /* 1,5 m nas duas direções: maior que a sobreposição da tábua com qualquer laje
     (~0,4 m) + a folga da Box3 (0,3 m) — pelo menos uma ponta TEM que descolar */
  tabuas[0].position.x += 1.5; tabuas[0].position.z += 1.5; tabuas[0].updateMatrixWorld(true);
}
if (process.argv.includes('--mutante=tabua-flutuante') && tabuas[0]) {
  tabuas[0].position.y += .6; tabuas[0].updateMatrixWorld(true);
}
if (process.argv.includes('--mutante=alas-clonadas')) throw Error('Mutante aposentado com as três alas antigas: ver LAJES-V4-CONTRATOS-PLANO.md');
if (process.argv.includes('--mutante=cabo-alias')) for (const cable of cables) cable.userData.cableDiameter = .01;

// V4 substitui as 13 tábuas antigas pelas duas conexões da planta aprovada.
const LIGACOES = game.world.design.bridges;
const box = lajes.map(mesh=>new THREE.Box3().setFromObject(mesh));
let falhas = 0;
for (const bridge of LIGACOES) {
  const x=(bridge.x0+bridge.x1)/2;
  const t=tabuas.find(m=>Math.abs(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).x-x)<1e-3);
  if(!t){falhas++;console.log(`✗ ${bridge.name}: ponte ausente`);continue;}
  const T=new THREE.Box3().setFromObject(t);
  const touching=box.filter(B=>T.intersectsBox(B.clone().expandByScalar(.3)));
  const ancorada=touching.length===2;
  const cotas=touching.map(B=>B.max.y), deck=T.max.y;
  const nivelada=cotas.length===2&&deck>=Math.min(...cotas)-.30&&deck<=Math.max(...cotas)+.30;
  const ok=ancorada&&nivelada;
  if(!ok)falhas++;
  console.log(`${ok?'✓':'✗'} ${bridge.name}: ancorada ${ancorada} · deck ${deck.toFixed(2)} · cotas ${cotas.map(c=>c.toFixed(2)).join('/')}`);
}
if (cables.some((cable) => cable.userData.cableDiameter < .055)) { falhas++; console.log('✗ cabo aéreo abaixo de 5,5 cm'); }
else console.log(`✓ cabos aéreos: ${cables.length ? 'espessura legível' : 'removidos'}`);
if (falhas) { console.error(`LAJES-TÁBUAS FALHA: ${falhas}/${LIGACOES.length + 1}`); process.exitCode = 1; }
else if (process.argv.some((arg) => arg.startsWith('--mutante='))) { console.error('MUTANTE sobreviveu'); process.exitCode = 1; }
else console.log('LAJES-TÁBUAS OK');
