import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
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

// mutantes-anunciados: casos esperados são independentes do child (9 nominais + 1 injetado).
for(const fix of [{mutant:'anuncia-fantasma',clause:'MA1',cases:10},{mutant:'executa-fantasma',clause:'MA2',cases:10}]){
 const row={clause:fix.clause,type:'ContractViolation',message:'Anunciado sem execução: '+fix.mutant};
 const base={status:1,stdout:'Mutação aplicada: '+fix.mutant+'\n'+JSON.stringify({mutant:fix.mutant,cases:fix.cases,failed:[row]}),stderr:''};
 assert.equal(aceitaResultado(base,fix),true,'mutantes-anunciados aceita rejeição semântica de '+fix.mutant);
 const v=overrides=>({...base,...overrides,stdout:overrides.stdout??('Mutação aplicada: '+fix.mutant+'\n'+JSON.stringify({mutant:fix.mutant,cases:fix.cases,failed:[row],...(overrides.report||{})}))});
 const rejeitar=[v({status:0}),v({status:2}),v({stdout:base.stdout.replace('Mutação aplicada: ','Sem aplicação: ')}),
  v({report:{mutant:'outro'}}),v({report:{cases:9}}),v({report:{cases:11}}),v({report:{failed:[]}}),
  v({report:{failed:[{...row,clause:'MA9'}]}}),v({report:{failed:[{...row,type:'TypeError'}]}}),
  {...base,stderr:'SyntaxError: setup'},{...base,stdout:'Mutação aplicada: '+fix.mutant+'\n{quebrado'}];
 for(const [i,r] of rejeitar.entries())assert.equal(aceitaResultado(r,fix),false,'mutantes-anunciados rejeita falso-verde '+fix.mutant+' caso '+i);
}

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
 const proofPath=fileURLToPath(new URL('./mutante-semantico-proof.mjs',import.meta.url));
 for(const [script,name] of [['script-ausente','retry-new-key'],['constructor','retry-new-key'],['__proto__','retry-new-key'],['community-inbox','constructor'],['community-inbox','__proto__']]){
  const cli=spawnSync(process.execPath,[proofPath,script,'--mutant='+name],{encoding:'utf8',timeout:5000});
  assert.equal(cli.status,2,'CLI recusa '+script+' / '+name+' antes de executar child');
 }
 console.log('PASS semantic-proof: quatro cadeias reais de alias e CLI inválido');
}finally{rmSync(dir,{recursive:true,force:true});}
