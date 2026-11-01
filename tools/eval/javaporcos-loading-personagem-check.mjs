import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {THREE} from './harness.mjs';

let src=readFileSync('public/js/loading3d.js','utf8');
const main=readFileSync('public/js/main.js','utf8');
const card=readFileSync('public/js/tp/carregamento.js','utf8');
const mutant=process.argv.includes('--mutante=humano');
if(mutant) src=src.replace("faction === 'J' ? 'javaporco' :",'');
const definition=src.replace("import('./mode_javaporcos.js')",'carregarHorda()').replace(/^import .*;$/gm,'').replaceAll('export ','');
const Stage=vm.runInNewContext(definition+'\nLoadingCharacterStage;', {THREE, carregarHorda:()=>Promise.resolve({preloadJavaporcos:()=>pendente,criarPreviewJavaporco:()=>new THREE.Group()})});
let resolver,pendente=Promise.resolve();
const old={group:new THREE.Group()},group=new THREE.Group();
const canvas={dataset:{}},scene=new THREE.Scene();scene.add(old.group);
const stage=Object.assign(Object.create(Stage.prototype),{canvas,scene,cache:new Map([
 ['javaporco',{group,javaporco:true}],['gotinha',{group:new THREE.Group(),ctrl:{}}]
]),current:old,renderer:{clear(){}},camera:new THREE.PerspectiveCamera(),token:0});
let failed=false;
try {
 await stage.show('J');
 assert.equal(canvas.dataset.character,'javaporco');
 assert.equal(stage.current.group,group);
 assert.equal(canvas.dataset.ready,'1');
 assert.equal(old.group.parent,null);
 assert.match(main,/loadingStage\.show\(ehMapaJavaporcos\(currentMap\) \? 'J' : currentFaction\)/);
 const cartao=vm.runInNewContext(card.slice(0,card.indexOf('export function ligar')).replace(/^import .*;$/gm,'')+'\ncartao;',{
  tr:s=>s,JAVAPORCO_RETRATO:'/img/javaporco-card.webp',document:{createElement:()=>({dataset:{},style:{setProperty(){}},children:[],append(...nodes){this.children.push(...nodes);}})}
 });
 const rendered=cartao({id:'javaporco',nome:'Javaporcos',javaporco:true},0).children[0];
 assert.equal(rendered.children[0].src,'/img/javaporco-card.webp');
 assert.ok('javaporco' in rendered.dataset);
 // Exercita o ramo frio real e a invalidação por hide/troca de facção.
 stage.cache.delete('javaporco');pendente=new Promise(r=>resolver=r);
 const frio=stage.show('J');await Promise.resolve();await Promise.resolve();
 assert.equal(stage.current,null);assert.equal(canvas.dataset.ready,'0');
 resolver();await frio;assert.equal(stage.current.javaporco,true);
 stage.cache.delete('javaporco');pendente=new Promise(r=>resolver=r);
 const cancelado=stage.show('J');await Promise.resolve();await Promise.resolve();stage.hide();resolver();await cancelado;
 assert.equal(stage.current,null);assert.equal(stage.active,false);assert.equal(canvas.dataset.ready,'0');
 stage.cache.delete('javaporco');pendente=new Promise(r=>resolver=r);
 const atrasado=stage.show('J');await Promise.resolve();await Promise.resolve();await stage.show('E');resolver();await atrasado;
 assert.equal(canvas.dataset.character,'gotinha');assert.equal(stage.current,stage.cache.get('gotinha'));
 console.log('✓ Loading real seleciona javaporco, retira humano e mantém facção nos outros mapas');
} catch(e) {failed=true;console.log('✗ Loading personagem: '+e.message);}
process.exitCode=mutant?(failed?0:1):(failed?1:0);
