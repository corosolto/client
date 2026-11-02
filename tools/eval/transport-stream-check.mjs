// O tamanho hostil encerra no cabecalho; fragmentacao valida continua funcionando.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const sourceURL=new URL('../../public/js/transporte.js',import.meta.url);
const source=readFileSync(sourceURL,'utf8'),sourceSHA256=createHash('sha256').update(source).digest('hex');
const args=process.argv.slice(2),mutant=args.length===1&&args[0]==='--mutante';
if(!(args.length===0||mutant||args.length===1&&args[0]==='--suite')){
 console.error('CLI invalida; use sem argumentos, --mutante ou --suite');process.exit(2);
}
const own=['oversized-header','maximum-u32-header','fragmented-oversized-header','cancel-rejection'];
if(args[0]==='--suite'){
 for(const bad of [false,true]){
  const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),...(bad?['--mutante']:[])],{encoding:'utf8',timeout:10000,maxBuffer:128*1024});
  assert.ok(!r.error&&!r.signal&&r.stderr===''&&r.status===(bad?1:0),'child infra or exit mismatch');
  const d=JSON.parse(r.stdout);assert.equal(d.schema,'transport-stream/1');assert.equal(d.sourceSHA256,sourceSHA256);assert.equal(d.mutant,bad);assert.equal(d.rows.length,8);
  assert.deepEqual(d.rows.filter(x=>!x.pass).map(x=>x.id),bad?own:[]);
  console.log((bad?'mutant':'nominal')+': framing verdict verified');
 }
 process.exit(0);
}
let Runtime;
if(mutant){
 const from="        if (n > MAX_SNAPSHOT_BYTES) {\n          this.fechar(1009, 'snapshot_too_large');\n          try { await r.cancel('snapshot_too_large'); } catch { /* transporte ja encerrado */ }\n          return;\n        }\n        if (buf.length < 4 + n) break;";
 assert.equal(source.split(from).length,2,'unique mutation anchor');
 let s=source.replace(from,'        if (n > MAX_SNAPSHOT_BYTES || buf.length < 4 + n) break;');
 assert.notEqual(s,source);s=s.replace("'./netcodec.js'",JSON.stringify(new URL('../../public/js/netcodec.js',import.meta.url).href));
 Runtime=await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
}else Runtime=await import(sourceURL.href);
const {MAX_SNAPSHOT_BYTES}=await import('../../public/js/netcodec.js');
const {TransporteWT}=Runtime;
const header=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n);return b;};
const concat=parts=>{const b=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){b.set(p,o);o+=p.length;}return b;};
const frame=b=>concat([header(b.length+1),new Uint8Array([1]),b]);
const payload=new Uint8Array([11,22,33,44,55]),wire=frame(payload),maxBody=new Uint8Array(MAX_SNAPSHOT_BYTES-1);
const rows=[];
for(const c of [
 {id:'whole-frame',chunks:[wire],want:[payload]},
 {id:'fragmented-header-body',chunks:[wire.slice(0,1),wire.slice(1,3),wire.slice(3,6),wire.slice(6)],want:[payload]},
 {id:'coalesced-frames',chunks:[concat([wire,wire])],want:[payload,payload]},
 {id:'inclusive-maximum',chunks:[frame(maxBody)],want:[maxBody]},
 {id:own[0],chunks:[header(MAX_SNAPSHOT_BYTES+1),payload],stopAt:1},
 {id:own[1],chunks:[header(0xffffffff),payload],stopAt:1},
 {id:own[2],chunks:[header(MAX_SNAPSHOT_BYTES+1).slice(0,2),header(MAX_SNAPSHOT_BYTES+1).slice(2),payload],stopAt:2},
 {id:own[3],chunks:[header(MAX_SNAPSHOT_BYTES+1),payload],stopAt:1,rejectCancel:true},
]){
 let reads=0,cancels=0;const closes=[],messages=[],t=new TransporteWT('https://synthetic.invalid');
 t.wt={close:info=>closes.push(info)};
 const reader={read:async()=>{const value=c.chunks[reads++];return value?{done:false,value}:{done:true};},cancel:async()=>{cancels++;if(c.rejectCancel)throw Error('already closed');}};
 await t._lerStream(reader,{mensagem:(b,binary,bytes)=>messages.push({body:new Uint8Array(b),binary,bytes})});
 let pass;
 if(c.stopAt)pass=reads===c.stopAt&&cancels===1&&closes.length===1&&closes[0].closeCode===1009&&closes[0].reason==='snapshot_too_large'&&messages.length===0;
 else pass=reads===c.chunks.length+1&&cancels===0&&closes.length===0&&messages.length===c.want.length&&messages.every((m,i)=>m.binary&&m.bytes===c.want[i].length&&Buffer.from(m.body).equals(Buffer.from(c.want[i])));
 rows.push({id:c.id,pass,reads,cancels,closed:closes.length,delivered:messages.length});
}
assert.equal(createHash('sha256').update(readFileSync(sourceURL)).digest('hex'),sourceSHA256,'source changed');
console.log(JSON.stringify({schema:'transport-stream/1',mutant,sourceSHA256,rows}));process.exitCode=rows.every(r=>r.pass)?0:1;
