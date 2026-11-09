// Negociação real do NetClient: v9 preferida, v8 continua utilizável e ack precisa casar.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const selected=(process.argv.find(a=>a.startsWith('--mutante='))||'').slice(10);
const guard='m.protocolVersion < 8 || m.protocolVersion !== snapshotVersionForProtocol(tp.protocolo)';
const mutations={
  'welcome-version': [`if (m.type === 'welcome') {\n          if (${guard})`,`if (m.type === 'welcome') {\n          if (false)`,['N3','N5','N9']],
  'partida-version': [`} else if (m.type === 'partida') {\n          if (${guard})`,`} else if (m.type === 'partida') {\n          if (false)`,['N4']],
  'attempt-guard': ['const ativo = () => !ended && this.tp === tp;','const ativo = () => true;',['N4','N9']],
  'ws-selection': ['if (!SNAPSHOT_PROTOCOLS.includes(this.ws.protocol)) {', 'if (false) {', ['N8']],
  'oferta-so-v9': ['new WebSocket(this.url, SNAPSHOT_PROTOCOLS)', 'new WebSocket(this.url, [CLIENT_SNAPSHOT_PROTOCOL])', ['N2']],
  'early-close-notify': ['if (accepted) this.onClose?.();', 'this.onClose?.();', ['N10','N9']],
  'callback-before-close': ['tp.fechar(codigo, motivo);\n        if (accepted) this.onClose?.();', 'if (accepted) this.onClose?.();\n        tp.fechar(codigo, motivo);', ['N4']],
};
if(selected&&!mutations[selected])throw Error('mutante desconhecido: '+selected);
const TRANSPORTE=new Set(['ws-selection','oferta-so-v9']);
const flush=()=>new Promise(r=>setImmediate(r));
const saved=globalThis.WebSocket;
const metadata=(type,protocolVersion,id=1)=>({type,protocolVersion,yourEnt:id,yourTeam:'E',espectador:false,events:1});
async function measure(NetClient){
  const rows=[];
  // Servidor honesto só seleciona protocolo oferecido; `hostil` (N8) seleciona mesmo sem oferta.
  async function scenario(id,protocol,version,action,hostil=false){
    let ws;
    globalThis.WebSocket=class {
      constructor(url,offered){this.protocol=hostil||offered.includes(protocol)?protocol:'';this.offered=offered;this.readyState=0;this.closes=0;ws=this;
        queueMicrotask(()=>{this.readyState=1;this.onopen?.();this.connectedAfterOpen=client.connected;if(version==='close')this.close();else if(this.readyState===1&&version!==null)this.emit(metadata('welcome',version));});}
      emit(m){this.onmessage?.({data:JSON.stringify(m)});}
      send(){}
      close(){this.closes++;this.readyState=3;queueMicrotask(()=>this.onclose?.());}
    };
    const client=new NetClient('ws://boundary/ws');let notifications=0;
    client.onClose=()=>notifications++;
    const result=await client.connect(30).then(()=>true,()=>false);
    try{rows.push({id,ok:await action(client,ws,result,()=>notifications)});}finally{client.close();await flush();}
  }
  await scenario('N1','coro-snapshot-v9',9,(n,w,ok)=>ok&&n.connected&&n.meta.protocolVersion===9&&w.offered[0]==='coro-snapshot-v9');
  await scenario('N2','coro-snapshot-v8',8,(n,w,ok)=>ok&&n.connected&&n.meta.protocolVersion===8&&w.offered.includes('coro-snapshot-v8'));
  await scenario('N3','coro-snapshot-v9',8,(n,w,ok)=>!ok&&!n.connected&&w.closes>0);
  await scenario('N4','coro-snapshot-v9',9,async(n,w,ok)=>{
    if(!ok)return false;
    const old=n.meta;let delivered=0,closed=0,closedBeforeSocket=false;n.onPartida=()=>delivered++;n.onClose=()=>{closed++;closedBeforeSocket ||= w.closes===0;};
    w.emit(metadata('partida',8,2));w.emit(metadata('partida',9,3));await flush();
    return n.meta===old&&delivered===0&&!n.connected&&w.closes===1&&closed===1&&!closedBeforeSocket;
  });
  await scenario('N5','coro-snapshot-v7',7,(n,w,ok)=>!ok&&!n.connected&&w.closes>0);
  await scenario('N6','',9,(n,w,ok)=>!ok&&!n.connected&&w.closes>0);
  await scenario('N7','coro-snapshot-v9',null,(n,w,ok)=>!ok&&!n.connected&&w.closes>0);
  await scenario('N8','coro-snapshot-v99',null,(n,w,ok)=>!ok&&!n.connected&&w.closes>0&&w.connectedAfterOpen===false,true);
  await scenario('N9','coro-snapshot-v9',8,(n,w,ok,notifications)=>!ok&&!n.connected&&notifications()===0);
  await scenario('N10','coro-snapshot-v9','close',(n,w,ok,notifications)=>!ok&&!n.connected&&w.closes>0&&notifications()===0);
  return rows.filter(r=>!r.ok).map(r=>r.id).sort();
}
async function run(mutant){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rede3p-negotiation-'));
  try{
    let source=fs.readFileSync(path.join(root,'public/js/net.js'),'utf8');
    let transport=fs.readFileSync(path.join(root,'public/js/transporte.js'),'utf8');
    if(mutant){
      const [a,b]=mutations[mutant],isTransport=TRANSPORTE.has(mutant);
      let target=isTransport?transport:source;
      const count=mutant==='early-close-notify'?2:1;
      if(target.split(a).length!==count+1)throw Error('INFRA: âncora ausente/ambígua: '+mutant);
      target=target.replaceAll(a,b);
      if(isTransport)transport=target;else source=target;
    }
    transport=transport.replace(/from '\.\/([^']+)'/g,(_m,file)=>`from '${pathToFileURL(path.join(root,'public/js',file)).href}'`);
    const transportFile=path.join(temp,'transporte.mjs');fs.writeFileSync(transportFile,transport);
    source=source.replace(/from '\.\/([^']+)'/g,(_m,file)=>`from '${pathToFileURL(file==='transporte.js'?transportFile:path.join(root,'public/js',file)).href}'`);
    const file=path.join(temp,'net.mjs');fs.writeFileSync(file,source);
    const {NetClient}=await import(pathToFileURL(file).href);
    return await measure(NetClient);
  }finally{fs.rmSync(temp,{recursive:true});}
}
try{
  const nominal=await run('');if(nominal.length)throw Error('nominal vermelho: '+nominal);
  const failed=selected?await run(selected):[],expected=selected?mutations[selected][2]:[];
  const pass=JSON.stringify(failed)===JSON.stringify(expected);
  console.log(JSON.stringify({status:pass?(selected?'DETECTED':'GREEN'):'RED',cases:10,mutant:selected,failed,expected}));
  process.exitCode=pass?0:1;
}finally{globalThis.WebSocket=saved;}
