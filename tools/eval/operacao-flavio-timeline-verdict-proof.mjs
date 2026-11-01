import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const result={tool:'operacao-flavio-timeline-verdict-proof',sourceSHA:null,cases:[],infra:null};
try {
 const args=process.argv.slice(2);
 if(args.length!==0 && (args.length!==2 || !args[0].startsWith('--checker=') || !args[1].startsWith('--sha256=')))throw new Error('expected checker and SHA arguments');
 const path=args.length===0?fileURLToPath(new URL('./operacao-flavio-browser-timeline-check.mjs',import.meta.url)):args[0].slice('--checker='.length),pin=args.length===0?null:args[1].slice('--sha256='.length);
 if(!isAbsolute(path)||(pin!==null&&!/^[a-f0-9]{64}$/.test(pin)))throw new Error('invalid checker path or SHA');
 const source=readFileSync(path,'utf8');result.sourceSHA=createHash('sha256').update(source).digest('hex');
 if(pin!==null&&result.sourceSHA!==pin)throw new Error('source hash mismatch');
 const first='if(reject){',last='else if(error)throw error;';
 if(source.split(first).length!==2||source.split(last).length!==2)throw new Error('ambiguous actual reject branch');
 const start=source.indexOf(first),end=source.indexOf(last);
 if(end<=start)throw new Error('invalid actual reject branch bounds');
 const branch=source.slice(start,end);
 const entries=[['taxi-cedo','FB_PRE_DOOR'],['sem-taxi','FB_TAXI_ADVANCE'],['original-oculto-move','FB_TAXI_ADVANCE'],['prazo-curto','FB_DURATION']];
 for(const [scenario,prefix]of entries){
  const wrong=prefix==='FB_DURATION'?'FB_PRE_DOOR':'FB_DURATION';
  const fixtures=[
   ['own assertion',new assert.AssertionError({message:prefix+': declared own clause'}),true],
   ['unrelated assertion',new assert.AssertionError({message:'unrelated invariant failed'}),false],
   ['wrong scenario assertion',new assert.AssertionError({message:wrong+': other clause'}),false],
   ...[TypeError,ReferenceError,SyntaxError,Error].map(K=>[K.name,new K('declared infrastructure fixture'),false]),
  ];
  for(const [fixture,error,expectedAccept]of fixtures){
   let accepted=true;
   try{vm.runInNewContext('(()=>{'+branch+'})()',{reject:true,error,scenario,assert},{timeout:1000});}
   catch(e){if(e instanceof assert.AssertionError)accepted=false;else throw e;}
   result.cases.push({scenario,fixture,expectedAccept,actualAccept:accepted,pass:accepted===expectedAccept});
  }
 }
 if(result.cases.length!==28||new Set(result.cases.map(x=>x.scenario+':'+x.fixture)).size!==28)throw new Error('fixture inventory mismatch');
 console.log(JSON.stringify(result));process.exit(result.cases.every(c=>c.pass)?0:1);
}catch(e){result.infra={type:e?.name??'Error',message:String(e?.message??e).slice(0,300)};console.log(JSON.stringify(result));process.exit(2);}
