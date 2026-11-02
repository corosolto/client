import assert from 'node:assert/strict';
import {EIXOS,MATA_R} from '../../public/js/map_javaporcos_relevo.js';
import {V_ANDAVEL,V_PAREDE0} from '../../public/js/map_javaporcos_mata.js';
const mutant=process.argv.includes('--mutante');let failed=0;
for(const [name,fn] of [
 ['seis frentes nos quatro lados',()=>{assert.equal(EIXOS.length,6);assert.equal(new Set(EIXOS.map(e=>e.lado)).size,4);}],
 ['mata acessível com nove metros de profundidade',()=>{assert.ok((mutant?MATA_R+.6:V_ANDAVEL)-MATA_R>=9);assert.equal(V_ANDAVEL,V_PAREDE0);}]
]){try{fn();console.log('✓ EXPLORAR '+name);}catch(e){failed++;console.log('✗ EXPLORAR '+name+': '+e.message.slice(0,100));}}
process.exitCode=mutant?(failed?0:1):(failed?1:0);
