import {createHash} from 'node:crypto';
export function verifyDecoded(body,record) {
 if(!record||!Number.isSafeInteger(record.decodedBytes)||record.decodedBytes<0||!Number.isSafeInteger(record.payloadBytes)||record.payloadBytes<0||!/^[a-f0-9]{64}$/.test(record.sha256||''))throw Error('registro de payload ausente/inválido');
 if(!Buffer.isBuffer(body))throw Error('corpo não é Buffer');
 const hash=createHash('sha256').update(body).digest('hex');
 if(body.length!==record.decodedBytes||hash!==record.sha256)throw Error('corpo entregue divergiu do servidor: '+record.path);
 return {bytes:body.length,sha256:hash};
}
export function verifyResponseRecord({url,id,status,record,seen}) {
 if(typeof id!=='string'||!/^\d+$/.test(id)||!record||record.id!==id)throw Error('resposta sem registro único do servidor');
 if(seen.has(id))throw Error('registro do servidor reutilizado em outro Request');seen.add(id);
 const u=new URL(url);if(u.pathname+u.search!==record.path||status!==record.status)throw Error('registro não corresponde ao Request/Response real');
 return record;
}
export async function awaitBodies(pending,timeoutMs=30000) {
 let timer;try{return await Promise.race([Promise.all(pending),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('barreira de corpo timeout')),timeoutMs);})]);}finally{clearTimeout(timer);}
}
