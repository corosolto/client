// Skin de primeira-dama usa nome de paródia na loja; o nome real não aparece ao jogador.
import assert from 'node:assert/strict';
import {TRETA_SKINS} from '../../public/js/treta-catalog.js';
const REAIS=/\b(janja|michelle)\b/i;
const mutante=process.argv.includes('--mutate');
const skins=mutante?TRETA_SKINS.map(s=>s.id==='janja'?{...s,name:'Janja'}:s):TRETA_SKINS;
const vazou=skins.filter(s=>REAIS.test(`${s.name} ${s.series} ${s.description}`)).map(s=>s.id);
if(mutante){assert(vazou.includes('janja'),'MUTANTE NÃO DETECTADO: nome real voltou e a régua não viu');console.log('PASS: mutante nome-real detectado');process.exit(0);}
assert.deepEqual(vazou,[],`nome real na loja: ${vazou.join(', ')}`);
console.log('SKIN-NOMES verde: primeiras-damas com nome de paródia');
