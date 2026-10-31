const indices = new WeakMap();
const orcamentos = new WeakMap();
const CELULA = 8;
export const DIRECAO_FLUIDA = new URLSearchParams(globalThis.location?.search || '').get('boarsteer') !== '0';

export function reservarPlano(modo,bot,tempo) {
  let orcamento=orcamentos.get(modo);
  if(!orcamento){orcamento={tempo:-1,restante:0,fila:[],pedidos:new WeakMap()};orcamentos.set(modo,orcamento);}
  if(orcamento.tempo!==tempo){orcamento.tempo=tempo;orcamento.restante=4;}
  let pedido=orcamento.pedidos.get(bot);
  if(!pedido){pedido={bot,esperando:false,ultimo:tempo};orcamento.pedidos.set(bot,pedido);}
  pedido.ultimo=tempo;
  if(!pedido.esperando){pedido.esperando=true;orcamento.fila.push(pedido);}
  let primeiro=orcamento.fila[0];
  while(primeiro&&(!primeiro.bot.alive||!primeiro.bot._boarId||tempo-primeiro.ultimo>.1)){
    primeiro.esperando=false;orcamento.fila.shift();primeiro=orcamento.fila[0];
  }
  if(!orcamento.restante||primeiro!==pedido)return false;
  orcamento.fila.shift();pedido.esperando=false;
  orcamento.restante--;return true;
}

function indice(world) {
  const lista=world.colliders||[];let idx=indices.get(world);
  if(idx?.lista===lista&&idx.total===lista.length)return idx;
  const cells=new Map();
  for(let i=0;i<lista.length;i++){
    const c=lista[i];
    for(let x=Math.floor(c.minX/CELULA);x<=Math.floor(c.maxX/CELULA);x++)for(let z=Math.floor(c.minZ/CELULA);z<=Math.floor(c.maxZ/CELULA);z++){
      const key=`${x},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
    }
  }
  idx={lista,total:lista.length,cells,seen:new Uint32Array(lista.length),stamp:0};indices.set(world,idx);return idx;
}

// Cápsula do jogo: a poda só corta caminho quando chão e corpo atravessam todo o trecho.
export function segmentoLivre(world, origem, x, z) {
  const bounds=world.bounds,r=.38;
  if(bounds&&(x<bounds.minX+r||x>bounds.maxX-r||z<bounds.minZ+r||z>bounds.maxZ-r))return false;
  const dx=x-origem.x,dz=z-origem.z,dist=Math.hypot(dx,dz),idx=indice(world),stamp=++idx.stamp;
  for(let cx=Math.floor((Math.min(origem.x,x)-r)/CELULA);cx<=Math.floor((Math.max(origem.x,x)+r)/CELULA);cx++)for(let cz=Math.floor((Math.min(origem.z,z)-r)/CELULA);cz<=Math.floor((Math.max(origem.z,z)+r)/CELULA);cz++)for(const id of idx.cells.get(`${cx},${cz}`)||[]){
    if(idx.seen[id]===stamp)continue;idx.seen[id]=stamp;const c=idx.lista[id];
    const ox=c.ry?(origem.x-c.cx)*c.cos-(origem.z-c.cz)*c.sin:origem.x;
    const oz=c.ry?(origem.x-c.cx)*c.sin+(origem.z-c.cz)*c.cos:origem.z;
    const vx=c.ry?dx*c.cos-dz*c.sin:dx,vz=c.ry?dx*c.sin+dz*c.cos:dz;
    const x0=c.ry?-c.hx-r:c.minX-r,x1=c.ry?c.hx+r:c.maxX+r,z0=c.ry?-c.hz-r:c.minZ-r,z1=c.ry?c.hz+r:c.maxZ+r;
    let lo=0,hi=1;
    if(Math.abs(vx)<1e-9){if(ox<x0||ox>x1)continue;}
    else{const a=(x0-ox)/vx,b=(x1-ox)/vx;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    if(Math.abs(vz)<1e-9){if(oz<z0||oz>z1)continue;}
    else{const a=(z0-oz)/vz,b=(z1-oz)/vz;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    if(lo>hi||lo>1||hi<0)continue;
    const h=world.groundHeightAt?.(origem.x+dx*lo,origem.z+dz*lo,origem.y)??origem.y??0;
    if(h+1.5>c.minY&&h+.3<c.maxY)return false;
  }
  const steps=Math.max(1,Math.ceil(dist/.5));let y=origem.y||0;
  for(let i=1;i<=steps;i++){
    const h=world.groundHeightAt?.(origem.x+dx*i/steps,origem.z+dz*i/steps,y)??y;
    if(!Number.isFinite(h)||Math.abs(h-y)>.55)return false;y=h;
  }
  return true;
}

export function direcaoDaHorda(modo,bot,alvo,tempo,mutante='') {
  if(mutante==='sem-contorno')return Math.atan2(alvo.x-bot.pos.x,alvo.z-bot.pos.z);
  const game=modo.game,boars=modo.boars;
  const world=game.world;let rota=bot._boarRumo;
  if((!rota||rota.chave!==alvo.chave||tempo>=rota.ate||Math.hypot(rota.x-bot.pos.x,rota.z-bot.pos.z)<.8)&&reservarPlano(modo,bot,tempo)){
    rota=bot._boarRumo||={x:0,z:0,ate:0,chave:''};
    let x=alvo.x,z=alvo.z;
    if(alvo.kind==='jogador'&&mutante!=='sem-flanco'){
      const dx=x-bot.pos.x,dz=z-bot.pos.z,d=Math.max(.01,Math.hypot(dx,dz));
      const ordinal=Number(bot._boarId?.split('.')[1])||0,side=ordinal%3-1;
      const flank=Math.min(2.1,Math.max(0,d-2.5)*.65)*side;
      x+=dz/d*flank+Math.max(-1.2,Math.min(1.2,(alvo.ent?.vel?.x||0)*.35));
      z-=dx/d*flank;z+=Math.max(-1.2,Math.min(1.2,(alvo.ent?.vel?.z||0)*.35));
    }
    const distance=Math.hypot(x-bot.pos.x,z-bot.pos.z);
    if(distance>10){x=bot.pos.x+(x-bot.pos.x)/distance*10;z=bot.pos.z+(z-bot.pos.z)/distance*10;}
    if(!segmentoLivre(world,bot.pos,x,z)){
      const no=modo.noDoBicho(bot,tempo),campo=no>=0?modo.campoDe(alvo):null;
      let current=no,best=null;
      for(let i=0;i<18;i++){
        const next=campo&&current>=0?campo[current]:-1;
        if(next<0||next===current)break;current=next;
        const n=world.waypoints.nodes[current];
        if(Math.hypot(n.x-bot.pos.x,n.z-bot.pos.z)>10)break;
        if(i===0||i%3===2){if(segmentoLivre(world,bot.pos,n.x,n.z))best=n;else if(best)break;}
      }
      if(best){x=best.x;z=best.z;}
    }
    rota.x=x;rota.z=z;rota.chave=alvo.chave;rota.ate=tempo+.28+(bot._boarJitter||0)*.08;
  }
  if(!rota)rota=bot._boarRumo={x:alvo.x,z:alvo.z,ate:tempo,chave:alvo.chave};
  let dx=rota.x-bot.pos.x,dz=rota.z-bot.pos.z,d=Math.max(.01,Math.hypot(dx,dz));
  if(tempo>=(rota.socialAte||0)){
    let sx=0,sz=0;
    for(const other of boars){
      if(mutante==='sem-separacao')break;
      if(other===bot||!other.alive||!other._boarId)continue;
      const x=bot.pos.x-other.pos.x,z=bot.pos.z-other.pos.z,dd=x*x+z*z;
      if(dd>=1.6*1.6||dd<1e-6)continue;
      const k=(1-Math.sqrt(dd)/1.6)/Math.sqrt(dd);sx+=x*k;sz+=z*k;
    }
    const separation=Math.min(1,1/Math.max(.01,Math.hypot(sx,sz)));
    rota.sx=sx*separation;rota.sz=sz*separation;rota.socialAte=tempo+.1;
  }
  dx=dx/d*3+(rota.sx||0);dz=dz/d*3+(rota.sz||0);
  return Math.atan2(dx,dz);
}

export function curvarRumo(atual,desejado,dt) {
  let delta=(desejado-atual+Math.PI)%(2*Math.PI);
  if(delta<0)delta+=2*Math.PI;delta-=Math.PI;
  return atual+Math.max(-5*dt,Math.min(5*dt,delta));
}
