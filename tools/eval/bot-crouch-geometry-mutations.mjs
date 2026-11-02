import {sonda, pula} from './sonda-filho.mjs';
for(const mutante of [null,'postura','olho','rodada']){
 const r=sonda([new URL('bot-crouch-geometry-check.mjs',import.meta.url).pathname,...(mutante?[`--mutante=${mutante}`]:[])],{maxBuffer:2**20});
 /* Mutante não medido não é mutante morto (issue #1133). */
 if(!r.mediu)pula(r.causa,`postura do bot ${mutante||'normal'}`);
 if(r.error)throw r.error;
 const ok=mutante?r.status===1&&/^FALHA /m.test(r.stdout)&&!r.stderr.includes('Error:'):r.status===0;
 console.log(`${ok?'OK':'FALHA'} postura do bot ${mutante||'normal'}`);
 if(!ok){process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(1);}
}
