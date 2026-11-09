// Negociação real do NetClient: v9 preferida, v8 continua utilizável e ack precisa casar;
// N11–N13 cobrem o contrato transporte → codec (ArrayBuffer, decoder real, teto, canal inseguro).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { encodeSnapshot, MAX_SNAPSHOT_BYTES } from '../../public/js/netcodec.js';
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
  'sem-decoder': ['m = binary ? decodeSnapshot(dados) : JSON.parse(dados);', 'm = JSON.parse(dados);', ['N11']],
  'sem-arraybuffer': ["this.ws.binaryType = 'arraybuffer';", '', ['N11']],
  'sem-teto': ['if (binario && bytes > MAX_SNAPSHOT_BYTES)', 'if (false)', ['N12']],
  'input-confiavel': ["this.tp.enviarInseguro(JSON.stringify({ type: 'input'", "this.tp.enviar(JSON.stringify({ type: 'input'", ['N13']],
  'sem-canal-inseguro': ['enviarInseguro(dados) { return this.enviar(dados); }', '', ['N13']],
};
if(selected&&!mutations[selected])throw Error('mutante desconhecido: '+selected);
const TRANSPORTE=new Set(['ws-selection','oferta-so-v9','sem-arraybuffer','sem-teto','sem-canal-inseguro']);
const flush=()=>new Promise(r=>setImmediate(r));
const SNAPSHOT={type:'snapshot',room:'livre',tick:4242,t:12.5,state:'live',owner:null,players:2,spectators:0,livre:{E:4,B:4},timeLeft:90,roundNum:1,scoreE:0,scoreB:0,roundKillsE:0,roundKillsB:0,
  ents:[0,1].map(i=>({id:10+i,name:`J${i}`,team:i?'B':'E',bot:i,x:i,y:0,z:-i,yaw:0,pitch:0,hp:100,alive:true,weapon:'ak',fire:0,fireN:0,voice:0,voiceN:0,k:0,d:0,respawnIn:0}))};
const saved=globalThis.WebSocket;
const metadata=(type,protocolVersion,id=1)=>({type,protocolVersion,yourEnt:id,yourTeam:'E',espectador:false,events:1});
async function measure(NetClient){
  const rows=[];
  // Servidor honesto só seleciona protocolo oferecido; `hostil` (N8) seleciona mesmo sem oferta.
  async function scenario(id,protocol,version,action,hostil=false){
    let ws;
    globalThis.WebSocket=class {
      constructor(url,offered){this.protocol=hostil||offered.includes(protocol)?protocol:'';this.offered=offered;this.readyState=0;this.closes=0;this.binaryType='blob';this.sent=[];ws=this;
        queueMicrotask(()=>{this.readyState=1;this.onopen?.();this.connectedAfterOpen=client.connected;if(version==='close')this.close();else if(this.readyState===1&&version!==null)this.emit(metadata('welcome',version));});}
      emit(m){this.onmessage?.({data:JSON.stringify(m)});}
      // Como o navegador: frame binário vira Blob, a menos que o transporte peça ArrayBuffer.
      emitBinary(bytes){const buf=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);this.onmessage?.({data:this.binaryType==='arraybuffer'?buf:new Blob([buf])});}
      send(d){this.sent.push(d);}
      close(code,reason){this.closes++;this.closeCode=code;this.closeReason=reason;this.readyState=3;queueMicrotask(()=>this.onclose?.());}
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
  // Contrato transporte → codec (antes regex no netcodec-check): snapshot binário chega como
  // ArrayBuffer e passa pelo decodeSnapshot real; frame acima do teto fecha 1009 antes do decoder;
  // input sai pelo canal que tolera perda (o que vira datagrama no WebTransport).
  await scenario('N11','coro-snapshot-v9',9,async(n,w,ok)=>{
    if(!ok)return false;
    w.emitBinary(encodeSnapshot(SNAPSHOT,9));await flush();
    return n.connected&&n.snap?.tick===SNAPSHOT.tick&&n.snap.ents.length===SNAPSHOT.ents.length&&w.closes===0;
  });
  await scenario('N12','coro-snapshot-v9',9,async(n,w,ok)=>{
    if(!ok)return false;
    w.emitBinary(new Uint8Array(MAX_SNAPSHOT_BYTES+1));await flush();
    return !n.connected&&n.snap==null&&w.closes===1&&w.closeCode===1009&&w.closeReason==='snapshot_too_large';
  });
  await scenario('N13','coro-snapshot-v9',9,async(n,w,ok)=>{
    if(!ok)return false;
    let inseguro=0;const original=n.tp.enviarInseguro;
    if(typeof original!=='function')return false;
    n.tp.enviarInseguro=function(d){inseguro++;return original.call(this,d);};
    const seq=n.sendInput({f:1});
    return seq===1&&inseguro===1&&w.sent.length===1&&JSON.parse(w.sent[0]).type==='input';
  });
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
  console.log(JSON.stringify({status:pass?(selected?'DETECTED':'GREEN'):'RED',cases:13,mutant:selected,failed,expected}));
  process.exitCode=pass?0:1;
}finally{globalThis.WebSocket=saved;}
