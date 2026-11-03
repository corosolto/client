import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {aceitaResultado} from './mutante-semantico-proof.mjs';
import { validOwnedReceipt } from './grafite-owned-process.mjs';
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

// mutantes-anunciados: denominador literal da fixture, independente do catálogo real e do child.
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

// grafite-fiel: 1 caso, cláusula G2; infra/sobrevivente nunca são evidência semântica.
const ff={mutant:'engole-falta',clause:'G2',cases:1};
const ffRow={clause:'G2',type:'ContractViolation',message:'G2 loja_h: bake com GLB derrubado completou e gravou layout'};
const ffBase={status:1,stdout:'Mutação aplicada: engole-falta\n'+JSON.stringify({mutant:'engole-falta',cases:1,failed:[ffRow]}),stderr:''};
assert.equal(aceitaResultado(ffBase,ff),true,'grafite-fiel aceita rejeição semântica G2 do engole-falta');
const ffv = (overrides) => {
  const report = { mutant: 'engole-falta', cases: 1, failed: [ffRow], ...(overrides.report || {}) };
  return {
    ...ffBase,
    ...overrides,
    stdout: overrides.stdout ?? ('Mutação aplicada: engole-falta\n' + JSON.stringify(report)),
  };
};
const ffRejeitar=[ffv({status:0}),ffv({status:2}),ffv({status:3}),ffv({signal:'SIGTERM'}),
 ffv({error:{code:'ETIMEDOUT'}}),ffv({stdout:ffBase.stdout.replace('Mutação aplicada: ','Sem aplicação: ')}),
 ffv({stdout:'Mutação aplicada: engole-falta\n{quebrado'}),
 ffv({report:{mutant:'outro'}}),
 ffv({report:{cases:0}}),ffv({report:{cases:2}}),
 ffv({report:{failed:[]}}),ffv({report:{failed:[{...ffRow,clause:'G1'}]}}),
 ffv({report:{failed:[{...ffRow,type:'InfraError',message:'checkpoint ausente'}]}}),
 ffv({status:0,report:{failed:[]}}),
 ffv({report:{error:'producer failed'}}),ffv({report:{infra:'producer failed'}}),
 ffv({report:{failed:[ffRow,{clause:'G2',type:'InfraError',message:'spawn falhou'}]}}),
 {...ffBase,stderr:'SyntaxError: setup do navegador'},{...ffBase,stdout:'Error: connect ECONNREFUSED\n'+ffBase.stdout},
];
for(const [i,r] of ffRejeitar.entries())assert.equal(aceitaResultado(r,ff),false,'grafite-fiel rejeita falso-verde caso '+i);

// Executa as cadeias reais do package com child isolado: mede a polaridade do shell.
const dir=mkdtempSync(join(tmpdir(),'corosolto-proof132-'));
try{
 const trace=join(dir,'calls'),node=join(dir,'node');
 writeFileSync(node,'#!/bin/sh\nif [ "$1" = "tools/eval/mutante-semantico-proof.mjs" ]; then\n  printf "%s\\n" "$*" >> "$PROOF_CHILD_TRACE"\n  exit "$PROOF_CHILD_EXIT"\nfi\nexit 0\n');chmodSync(node,0o700);
 const scripts=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).scripts;
 for(const [name,count] of [['eval:community-inbox',13],['eval:mutantes-anunciados',2],['eval:grafite-fiel',1]]){
  for(const code of [0,7]){
   writeFileSync(trace,'');const r=spawnSync('/bin/sh',['-c',scripts[name]],{encoding:'utf8',timeout:5000,env:{...process.env,PATH:dir+':'+process.env.PATH,PROOF_CHILD_TRACE:trace,PROOF_CHILD_EXIT:String(code)}});
   assert(!r.error&&!r.signal,'cadeia encerra normalmente');
   assert.equal(r.status,code,'alias propaga resultado do helper sem inversão: '+name);
   const calls=readFileSync(trace,'utf8').trim().split('\n').filter(Boolean);assert.equal(calls.length,code?1:count,'todos os mutantes entram e erro interrompe: '+name);
  }
 }
 const proofPath=fileURLToPath(new URL('./mutante-semantico-proof.mjs',import.meta.url));
 for(const [script,name] of [['script-ausente','retry-new-key'],['constructor','retry-new-key'],['__proto__','retry-new-key'],['community-inbox','constructor'],['community-inbox','__proto__'],['grafite-fiel','nao-existe'],['grafite-fiel','__proto__']]){
  const cli=spawnSync(process.execPath,[proofPath,script,'--mutant='+name],{encoding:'utf8',timeout:5000});
  assert.equal(cli.status,2,'CLI recusa '+script+' / '+name+' antes de executar child');
 }
 console.log('PASS semantic-proof: seis cadeias reais de alias e CLI inválido');
}finally{rmSync(dir,{recursive:true,force:true});}
// grafite-owned-process (F4 R33): fixtures literais independentes do SUT; sem Ego/processo real.
{
 const NS='corosolto.grafite.owned.v1';
 const nonce='1f0e2d3c-4b5a-4978-8796-a5b4c3d2e1f0';
 const allocExp={nonce,space:43,kind:'allocated'};
 const alloc={namespace:NS,nonce,kind:'allocated',space:43,page:'p7',openedBy:'agent',before:['p1']};
 assert.equal(validOwnedReceipt(alloc,allocExp).ok,true,'recibo de alocação válido é aceito');
 assert.equal(validOwnedReceipt({...alloc,page:'p2'},{...allocExp,protected:'p2'}).ok,false,'page protegida do caller é rejeitada');
 const sem=(k)=>{const r={...alloc};delete r[k];return r;};
 const allocRejeitar=[
  sem('namespace'),{...alloc,namespace:'outro.ns'},sem('nonce'),{...alloc,nonce:'00000000-0000-4000-8000-000000000000'},
  sem('kind'),{...alloc,kind:'closed'},sem('space'),{...alloc,space:'43'},{...alloc,space:44},{...alloc,space:43.5},
  sem('page'),{...alloc,page:['p7']},{...alloc,page:7},{...alloc,page:'p0'},{...alloc,page:'p'},{...alloc,page:''},
  {...alloc,page:'p7',before:['p7']},{...alloc,openedBy:'user'},{...alloc,openedBy:'unknown'},{...alloc,openedBy:null},
  sem('before'),{...alloc,before:'p1'},{...alloc,before:['p1','p1']},{...alloc,before:[1]},{...alloc,before:['px']},
  ['array'],null,42,'texto',
 ];
 for(const [i,r] of allocRejeitar.entries())assert.equal(validOwnedReceipt(r,allocExp).ok,false,'alocação rejeita falso-verde caso '+i);

 const closed={namespace:NS,nonce,kind:'closed',space:43,page:'p7',openedBy:'agent',absent:true,after:['p1']};
 const closedExp={nonce,space:43,kind:'closed',page:'p7',before:['p1']};
 assert.equal(validOwnedReceipt(closed,closedExp).ok,true,'recibo de close válido é aceito');
 const closedSem=(k)=>{const r={...closed};delete r[k];return r;};
 const closedRejeitar=[
  closedSem('namespace'),{...closed,namespace:'outro.ns'},closedSem('nonce'),{...closed,nonce:'00000000-0000-4000-8000-000000000000'},
  closedSem('kind'),{...closed,kind:'allocated'},closedSem('space'),{...closed,space:'43'},{...closed,space:44},
  closedSem('page'),{...closed,page:'p8'},{...closed,page:'p0'},
  {...closed,openedBy:'ego-cli'},{...closed,openedBy:'unknown'},
  closedSem('absent'),{...closed,absent:false},
  closedSem('after'),{...closed,after:['p1','p7']},{...closed,after:['p3']},{...closed,after:'p1'},{...closed,after:['p1','p1']},{...closed,after:[7]},
 ];
 for(const [i,r] of closedRejeitar.entries())assert.equal(validOwnedReceipt(r,closedExp).ok,false,'close rejeita falso-verde caso '+i);
 console.log('PASS grafite-owned-process: recibos de alocação e close validados puro ('+(allocRejeitar.length+closedRejeitar.length)+' rejeições)');
}
