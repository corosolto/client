// Executa montagem e atualização reais do HUD TP; não substitui QA no navegador.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
let source=readFileSync(new URL('../../public/js/tp/hud.js',import.meta.url),'utf8');
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1];
const edits={
  'tp-dica-b':["dica('N', 'câmera');","dica('B', 'câmera');"],
  'tp-chip-b':['|| CAMERA.first)} · N`','|| CAMERA.first)} · B`'],
};
if(mutant){const e=edits[mutant];assert.ok(e);assert.equal(source.split(e[0]).length,2);source=source.replace(...e);console.log('Mutação aplicada: '+mutant);}
const element=(tag,cls,txt)=>({tagName:tag,className:cls||'',dataset:{},children:[],own:txt||'',
  append(...items){this.children.push(...items);},prepend(...items){this.children.unshift(...items);},
  get textContent(){return this.own+this.children.map(c=>c.textContent).join('');},
  set textContent(v){this.own=v;this.children=[];},
});
const hud=element('div'),actions=element('div'),chip=element('span');
const context=vm.createContext({
  el:element,tr:x=>x,$:id=>id==='hud-actions'?actions:null,
  document:{createTextNode:txt=>element('text','',txt),querySelector:()=>chip},
});
const a=source.indexOf('function montarHud(hud) {'),b=source.indexOf('function atualizarAbates()',a);
assert.ok(a>=0&&b>a);
vm.runInContext(source.slice(a,b),context);
context.hud=hud;context.g={camView:'first'};
let failures=0;
const check=(name,fn)=>{try{fn();console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name+': '+e.message);}};
check('TP dica N câmera preserva B para loja',()=>{
  vm.runInContext('montarHud(hud)',context);
  assert.match(hud.textContent,/N câmera/);assert.doesNotMatch(hud.textContent,/B câmera/);
});
for(const mode of ['first','third','shoulder'])check('TP chip atualizado anuncia N: '+mode,()=>{
  context.g.camView=mode;vm.runInContext('atualizarCamera(g)',context);
  assert.match(chip.textContent,/ · N$/);assert.doesNotMatch(chip.textContent,/ · B$/);
});
process.exitCode=failures?1:0;
