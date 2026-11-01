import {InfraError} from './boot-overlay.mjs';
import {awaitBodies} from './boot-network-body.mjs';

export async function awaitLocalModuleProof({requests,verification,verified,failure,barrier,timeoutMs=30000}) {
  const deadline=performance.now()+timeoutMs;
  const remaining=()=>{const ms=deadline-performance.now();if(ms<=0)throw new InfraError('prova local timeout: '+[...requests()].filter(r=>!verified(r)).map(r=>typeof r.url==='function'?r.url():r.url??'?').join(', '));return ms;};
  try {
    for(;;) {
      const observed=[...requests()],checks=observed.map(verification);
      if(checks.every(Boolean))await awaitBodies(checks,remaining());
      await awaitBodies([barrier()],remaining());
      if(checks.every(Boolean))for(const request of observed)if(!verified(request))throw new InfraError('prova local negada: '+failure(request));
      const current=[...requests()];
      if(current.length===observed.length&&current.every(verified))return {requests:current.length,verified:current.length};
      remaining();await new Promise(resolve=>setTimeout(resolve,1));
    }
  } catch(error) {if(error instanceof InfraError)throw error;throw new InfraError('barreira de prova local: '+error.message);}
}
