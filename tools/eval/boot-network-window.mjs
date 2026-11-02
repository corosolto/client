export function freezeWindow(requests,portao,tolerance=50) {
 if(!Number.isFinite(portao)||portao<=0||!Number.isFinite(tolerance)||tolerance<0)throw Error('janela de medição inválida');
 for(const r of requests){if(!Number.isFinite(r.inicio)||r.inicio<0)throw Error('início de request inválido');if(r.fim!==null&&(!Number.isFinite(r.fim)||r.fim<r.inicio))throw Error('fim de request inválido');}
 return Object.freeze(requests.filter(r=>r.fim!==null&&r.fim<=portao+tolerance));
}
export async function awaitWindow(requests,timeoutMs=30000) {
 const deadline=Date.now()+timeoutMs;
 while(true) {
  for(const r of requests)if(r.erro&&!r.canceladaUi)throw Error('request da janela falhou: '+r.url+' '+r.erro);
  if(requests.every(r=>r.fim!==null))return;
  if(Date.now()>=deadline)throw Error('requests da janela sem término: '+requests.filter(r=>r.fim===null).map(r=>r.url).join(', '));
  await new Promise(r=>setTimeout(r,10));
 }
}

export function validateReadyExact(value,current) {
 const keys=['cause','hidden','time','timeOrigin'];
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.join(','))throw Error('READY exact ausente/schema inválido');
 if(!Number.isFinite(value.time)||value.time<0||!Number.isFinite(value.timeOrigin)||value.timeOrigin<=0||!current||!Number.isFinite(current.now)||value.time>current.now||value.timeOrigin!==current.timeOrigin)throw Error('READY exact clock ausente/stale/inválido');
 if(!['assets','failsafe'].includes(value.cause)||value.cause!==current.cause||value.hidden!==false||current.hidden!==false)throw Error('READY exact causa/DOM inválido');
 return {portao:value.time,causa:value.cause,timeOrigin:value.timeOrigin};
}
