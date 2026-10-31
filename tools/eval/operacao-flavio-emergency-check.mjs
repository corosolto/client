import { usePresentationClock } from './presentation-clock-fixture.mjs';
// Spec docs/maps/operacao-decola.md: vitória E apaga hangar e aciona sirene vermelha.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game, initTextures, renderer, sfx, PCHAR, CHARACTERS } from './harness.mjs';

const mutants = {
  'hangar-aceso': ['luz.intensity *= 0.08;', 'luz.intensity *= 1;', /luz do hangar reduzida/],
  'pulso-parado': ['if (sirene) sirene.intensity = 2.4 + 2.2 * Math.sin(elapsed * 8.2 - Math.PI / 2);', 'if (sirene) sirene.intensity = 2.4;', /pulso varia no tempo/],
  'sirene-ausente': ['this.fontes.push(...sireneEmergencia(this.game.sfx));', '', /sirene varre frequência/],
  'sem-restaurar': ['const estado = this._amb;', 'const estado = null;', /intensidade original restaurada/],
  'material-vaza': ['const escuro = original.clone();', 'const escuro = original;', /terminal e perímetro preservados|intensidade original restaurada/],
  'audio-dedicated': ['if (!this.game.dedicated || this.game.online) this.fontes = marchaMilitar(this.game.sfx);', 'this.fontes = marchaMilitar(this.game.sfx);', /nenhum oscilador no servidor/],
};
if (process.argv.includes('--mutantes')) {
  for (const [name, [, , clause]] of Object.entries(mutants)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante='+name], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
    assert.equal(r.status, 1, name+' precisa reprovar a régua');
    assert.ok(r.stdout.includes('Mutação aplicada: '+name), name+' precisa aplicar');
    assert.match(r.stderr, clause, name+' precisa falhar pela cláusula esperada');
    console.log('Mutante reprovado na cláusula esperada: '+name);
  }
  process.exit(0);
}
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];

console.info=()=>{};
const g=new Game({renderer,textures:initTextures(),sfx,
  settings:{bots:2,quality:'low',sens:1},playerCharId:PCHAR,playerTeam:'E',
  mapId:'operacao_flavio',testMode:true,onQuit(){},onMatchEnd(){}});
if (mutant) {
  assert.ok(mutants[mutant], 'mutante conhecido');
  let source = readFileSync(new URL('../../public/js/mode_operacao_flavio.js', import.meta.url), 'utf8');
  const [old, replacement] = mutants[mutant];
  assert.equal(source.split(old).length - 1, 1, 'alvo único');
  source = source.replace(old, replacement);
  const { OperacaoFlavio } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  g.objective.dispose();g.objective = new OperacaoFlavio(g, CHARACTERS.find(c=>c.id==='senador'));
  console.log('Mutação aplicada: '+mutant);
}
g.start();g.state='roundEnd';g.time=10;
const restoreClock=usePresentationClock(()=>g.time*1000);
const mode=g.objective, nodes=[];
const param=()=>({value:0,events:[],
  setValueAtTime(v,t){this.events.push(['set',v,t]);this.value=v;},
  linearRampToValueAtTime(v,t){this.events.push(['linear',v,t]);this.value=v;},
  exponentialRampToValueAtTime(v,t){this.events.push(['exp',v,t]);this.value=v;},
  cancelScheduledValues(){},
});
const master={};
g.sfx={ensure(){},master,ctx:{currentTime:100,
  createOscillator(){const n={frequency:param(),stops:[],connect(){},disconnect(){},
    start(t){this.started=t;},stop(t){this.stops.push(t);}};nodes.push(n);return n;},
  createGain(){return {gain:param(),connect(){},disconnect(){}};},
}};
const hangar=[],outside=[],priorLights=new Set();
g.world.root.traverse(o=>{
  if(o.isPointLight)priorLights.add(o);
  if(o.isPointLight && [29,42].includes(o.position.z)) hangar.push(o);
  if(o.isMesh && o.name==='luz-hangar') hangar.push(o);
  if(o.isMesh && /^(luminaria-terminal|luz-poste-perimetro)/.test(o.name)) outside.push(o);
});
assert.ok(hangar.some(o=>o.isPointLight) && hangar.some(o=>o.isMesh) && outside.length,'ambiente real, não fixture vazia');
const originals=new Map([...hangar,...outside].map(o=>[o,{material:o.material,
  value:o.isPointLight?o.intensity:o.material.emissiveIntensity}]));
const value=o=>o.isPointLight?o.intensity:o.material.emissiveIntensity;
const redLights=()=>{
  const list=[];g.world.root.traverse(o=>{
    if(o.isPointLight && o.color.r>o.color.g && o.color.r>o.color.b && !priorLights.has(o)) list.push(o);
  });return list;
};
let failed=0;
const check=(name,fn)=>{try{fn();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.message);}};
const reset=()=>{mode.prepareRound();g.state='roundEnd';g.time=10;};
const restored=()=>{
  for(const o of [...hangar,...outside]){
    assert.equal(value(o),originals.get(o).value,'intensidade original restaurada');
    if(o.isMesh) assert.equal(o.material,originals.get(o).material,'material compartilhado volta à origem');
  }
  assert.equal(redLights().length,0,'luz temporária removida');
};
try{
  check('vitória E escurece só o hangar e preserva autoridade',()=>{
    reset();const net=structuredClone(mode.netState()),plane=g.world.objectivePlane.position.clone();
    mode.startCinematic('E');g.time+=.25;mode.updatePresentation();
    assert.deepEqual(mode.netState(),net,'apresentação não altera snapshot');
    assert.ok(g.world.objectivePlane.position.equals(plane),'avião imóvel em E');
    for(const o of hangar)assert.ok(value(o)<originals.get(o).value,'luz do hangar reduzida');
    for(const o of outside)assert.equal(value(o),originals.get(o).value,'terminal e perímetro preservados');
  });
  check('vitória E tem luz vermelha pulsante e sirene audível agendada',()=>{
    mode.updatePresentation();const reds=redLights();
    assert.ok(reds.length>0,'luz vermelha no mundo real');
    const first=reds.map(o=>o.intensity);g.time+=.3;mode.updatePresentation();
    assert.ok(reds.some((o,i)=>o.intensity!==first[i]),'pulso varia no tempo');
    const siren=nodes.filter(n=>n.frequency.events.some(e=>e[0]==='linear'||e[0]==='exp'));
    assert.ok(siren.length,'sirene varre frequência, não só marcha');
    assert.ok(siren.every(n=>mode.fontes.includes(n)),'fontes canceláveis registradas');
  });
  for(const action of ['skip','reset','new-scene','dispose']) check('restaura ambiente e cala áudio: '+action,()=>{
    reset();mode.startCinematic('E');g.time=13;mode.updatePresentation();
    const scheduled=[...nodes];
    if(action==='skip')mode._key({code:'Space'});
    if(action==='reset')mode.prepareRound();
    if(action==='new-scene')mode.startCinematic('B');
    if(action==='dispose')mode.dispose();
    restored();
    assert.ok(scheduled.every(n=>n.stops.at(-1)===undefined),'fontes anteriores interrompidas');
  });
  check('dedicated não cria luz nem agenda áudio de apresentação',()=>{
    reset();g.dedicated=true;
    const n=nodes.length;mode.startCinematic('E');g.time=13;mode.updatePresentation();
    restored();assert.equal(nodes.length,n,'nenhum oscilador no servidor');g.dedicated=false;
  });
}finally{g.dedicated=false;g.dispose();restoreClock();}
process.exitCode=failed?1:0;
