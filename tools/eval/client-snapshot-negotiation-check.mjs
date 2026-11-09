// Negociação real do NetClient: v9 preferida, v8 continua utilizável e ack precisa casar.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const selected=(process.argv.find(a=>a.startsWith('--mutante='))||'').slice(10);
const guard='m.protocolVersion < 8 || m.protocolVersion !== snapshotVersionForProtocol(tp.protocolo)';
const mutations={
  'welcome-version': [`if (m.type === 'welcome') {\n          if (${guard})`,`if (m.type === 'welcome') {\n          if (false)`,['N3','N5']],
  'partida-version': [`} else if (m.type === 'partida') {\n          if (${guard})`,`} else if (m.type === 'partida') {\n          if (false)`,['N4']],
  'attempt-guard': ['const ativo = () => !ended && this.tp === tp;','const ativo = () => true;',['N4']],
};
if(selected&&!mutations[selected])throw Error('mutante desconhecido: '+selected);
const flush=()=>new Promise(r=>setImmediate(r));
const saved=globalThis.WebSocket;
const metadata=(type,protocolVersion,id=1)=>({type,protocolVersion,yourEnt:id,yourTeam:'E',espectador:false,events:1});
async function measure(NetClient){
  const rows=[];
  async function scenario(id,protocol,version,action){
    let ws;
    globalThis.WebSocket=class {
      constructor(url,offered){this.protocol=protocol;this.offered=offered;this.readyState=0;this.closes=0;ws=this;
        queueMicrotask(()=>{this.readyState=1;this.onopen?.();if(this.readyState===1&&version!==null)this.emit(metadata('welcome',version));});}
      emit(m){this.onmessage?.({data:JSON.stringify(m)});}
      send(){}
      close(){this.closes++;this.readyState=3;queueMicrotask(()=>this.onclose?.());}
    };
    const client=new NetClient('ws://boundary/ws');
    const result=await client.connect(30).then(()=>true,()=>false);
    try{rows.push({id,ok:await action(client,ws,result)});}finally{client.close();await flush();}
  }
  await scenario('N1','coro-snapshot-v9',9,(n,w,ok)=>ok&&n.connected&&n.meta.protocolVersion===9&&w.offered[0]==='coro-snapshot-v9');
  await scenario('N2','coro-snapshot-v8',8,(n,w,ok)=>ok&&n.connected&&n.meta.protocolVersion===8);
  await scenario('N3','coro-snapshot-v9',8,(n,w,ok)=>!ok&&!n.connected&&w.closes>0);
  await scenario('N4','coro-snapshot-v9',9,async(n,w,ok)=>{
    if(!ok)return false;
    const old=n.meta;let delivered=0,closed=0;n.onPartida=()=>delivered++;n.onClose=()=>closed++;
    w.emit(metadata('partida',8,2));w.emit(metadata('partida',9,3));await flush();
    return n.meta===old&&delivered===0&&!n.connected&&w.closes===1&&closed===1;
  });
  await scenario('N5','coro-snapshot-v7',7,(n,w,ok)=>!ok&&!n.connected&&w.closes>0);
  await scenario('N6','',9,(n,w,ok)=>!ok&&!n.connected&&w.closes>0);
  await scenario('N7','coro-snapshot-v9',null,(n,w,ok)=>!ok&&!n.connected&&w.closes>0);
  return rows.filter(r=>!r.ok).map(r=>r.id).sort();
}
async function run(mutant){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rede3p-negotiation-'));
  try{
    let source=fs.readFileSync(path.join(root,'public/js/net.js'),'utf8');
    if(mutant){const [a,b]=mutations[mutant];if(source.split(a).length!==2)throw Error('INFRA: âncora ausente/ambígua');source=source.replace(a,b);}
    source=source.replace(/from '\.\/([^']+)'/g,(_m,file)=>`from '${pathToFileURL(path.join(root,'public/js',file)).href}'`);
    const file=path.join(temp,'net.mjs');fs.writeFileSync(file,source);
    const {NetClient}=await import(pathToFileURL(file).href);
    return await measure(NetClient);
  }finally{fs.rmSync(temp,{recursive:true});}
}
try{
  const nominal=await run('');if(nominal.length)throw Error('nominal vermelho: '+nominal);
  const failed=selected?await run(selected):[],expected=selected?mutations[selected][2]:[];
  const pass=JSON.stringify(failed)===JSON.stringify(expected);
  console.log(JSON.stringify({status:pass?(selected?'DETECTED':'GREEN'):'RED',cases:7,mutant:selected,failed,expected}));
  process.exitCode=pass?0:1;
}finally{globalThis.WebSocket=saved;}
