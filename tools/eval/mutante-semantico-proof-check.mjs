import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {aceitaResultado} from './mutante-semantico-proof.mjs';
const expected={mutant:'retry-new-key',clause:'falha de envio preserva rascunho e a mesma chave no retry',cases:25};
const row={clause:expected.clause,type:'AssertionError',message:'Retry trocou chave idempotente'};
const good={status:1,stdout:'Mutação aplicada: '+expected.mutant+'\n'+JSON.stringify({mutant:expected.mutant,cases:25,failed:[row]}),stderr:''};
assert.equal(aceitaResultado(good,expected),true,'controle: rejeição semântica aplicada é evidência válida');
const withReport=overrides=>({...good,stdout:'Mutação aplicada: '+expected.mutant+'\n'+JSON.stringify({mutant:expected.mutant,cases:25,failed:[row],...overrides})});
const bad=[{...good,status:0},{...good,status:2},{...good,status:78},{...good,signal:'SIGTERM'},
 {...good,error:{code:'ETIMEDOUT'}},{...good,stdout:good.stdout.replace('Mutação aplicada: ','Sem aplicação: ')},
 withReport({mutant:'outro'}),withReport({cases:24}),withReport({failed:[]}),
 withReport({failed:[{...row,clause:'outro contrato'}]}),withReport({failed:[{...row,type:'TypeError'}]}),
 {...good,stderr:'SyntaxError: setup'},{...good,stdout:'Mutação aplicada: retry-new-key\n{broken'},
 {...good,stdout:'',stderr:'AssertionError: MUTANTE NÃO APLICOU: trecho ausente'},
 {...good,stdout:'TypeError: fixture\n'+good.stdout},{...good,stdout:'MUTANTE NÃO APLICOU\n'+good.stdout},
];
for(const [i,r] of bad.entries())assert.equal(aceitaResultado(r,expected),false,'rejeitar falsoverde '+i);
console.log('PASS semantic-proof: controle válido e'+bad.length+' falsos positivos rejeitados');

// Executa as cadeias reais do package com child isolado: mede a polaridade do shell.
const dir=mkdtempSync(join(tmpdir(),'corosolto-proof132-'));
try{
 const trace=join(dir,'calls'),node=join(dir,'node');
 writeFileSync(node,'#!/bin/sh\nif [ "$1" = "tools/eval/mutante-semantico-proof.mjs" ]; then\n  printf "%s\\n" "$*" >> "$PROOF_CHILD_TRACE"\n  exit "$PROOF_CHILD_EXIT"\nfi\nexit 0\n');chmodSync(node,0o700);
 const scripts=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).scripts;
 for(const [name,count] of [['eval:community-inbox',13],['eval:mutantes-anunciados',2]]){
  for(const code of [0,7]){
   writeFileSync(trace,'');const r=spawnSync('/bin/sh',['-c',scripts[name]],{encoding:'utf8',timeout:5000,env:{...process.env,PATH:dir+':'+process.env.PATH,PROOF_CHILD_TRACE:trace,PROOF_CHILD_EXIT:String(code)}});
   assert(!r.error&&!r.signal,'cadeia encerra normalmente');
   assert.equal(r.status,code,'alias propaga resultado do helper sem inversão: '+name);
   const calls=readFileSync(trace,'utf8').trim().split('\n').filter(Boolean);assert.equal(calls.length,code?1:count,'todos os mutantes entram e erro interrompe: '+name);
  }
 }
 const cli=spawnSync(process.execPath,[new URL('./mutante-semantico-proof.mjs',import.meta.url).pathname,'script-ausente','--mutant=retry-new-key'],{encoding:'utf8',timeout:5000});
 assert.equal(cli.status,2,'CLI recusa script fora da whitelist');
 console.log('PASS semantic-proof: quatro cadeias reais de alias e CLI inválido');
}finally{rmSync(dir,{recursive:true,force:true});}
