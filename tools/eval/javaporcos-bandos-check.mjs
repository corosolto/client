import assert from 'node:assert/strict';
import {criarHorda,iniciarOnda,passoHorda,escolherAlvo,poseMorteJavaporco} from '../../public/js/mode_javaporcos.js';
const mutant=process.argv.includes('--mutante');let failures=0;
function test(n,fn){try{fn();console.log('✓ BANDO '+n);}catch(e){failures++;console.log('✗ BANDO '+n+': '+e.message);}}
const h=criarHorda({seed:7,entradas:6,mutante:mutant?'persegue-tudo':''});iniciarOnda(h);passoHorda(h,15);
test('mesma frente em grupos de 3–4',()=>{let runs=[];for(const a of h.alive){if(runs.at(-1)?.entrance===a.entrance)runs.at(-1).n++;else runs.push({entrance:a.entrance,n:1});}assert.ok(runs.length>=6);assert.ok(runs.slice(0,-1).every(r=>r.n===3||r.n===4),JSON.stringify(runs));});
const setores=Array.from({length:9},(_,i)=>({x0:(i%3)*10-15,x1:(i%3)*10-5,z0:Math.floor(i/3)*10-15,z1:Math.floor(i/3)*10-5}));
const world={foodSpots:[{id:'lixo',x:0,z:1,hp:10}],horda:{setores},cityBounds:{minX:-15,maxX:15,minZ:-15,maxZ:15}};
const bot={pos:{x:0,z:0},_boarId:'1.0'};
test('sem provocação não persegue jogador distante',()=>{const a=escolherAlvo(bot,{world,state:h,setores,jogadores:[{alive:true,pos:{x:15,z:0}}]});assert.notEqual(a.kind,'jogador');});
test('alerta conserva defesa contra provocação',()=>{const a=escolherAlvo({...bot,_boarAlertaAte:10},{world,state:h,setores,tempo:1,jogadores:[{alive:true,pos:{x:25,z:0}}]});assert.equal(a.kind,'jogador');});
test('grupos se distribuem pelos setores',()=>{const targets=new Set();for(let ordinal=0;ordinal<21;ordinal++){const a=escolherAlvo({...bot,_boarId:`1.${ordinal}`},{world:{...world,foodSpots:[]},state:h,setores,jogadores:[]});targets.add(`${a.x},${a.z}`);}assert.ok(targets.size>=5,`só ${targets.size} destinos`);});
test('corpos ficam estirados por ao menos um minuto',()=>{assert.equal(poseMorteJavaporco(45).done,false);assert.equal(poseMorteJavaporco(125).done,true);});
process.exitCode=mutant?(failures?0:1):(failures?1:0);
