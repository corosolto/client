import { escalaTexturaCaixa } from './map_javaporcos_torre.js';
export function construirRefugios(kit, campo) {
  const refugios = [];
  for (const [team, inicial, extra] of [['E', -42, false], ['B', 42, false], ['E', -42, true], ['B', 42, true]]) {
    let x=inicial;
    const livre = z => !kit.colliders.some(c => {
      if (c.minY > campo.amostra(x,z)+2) return false;
      return (c.maxX > x-3 && c.minX < x+3 && c.maxZ > z-3 && c.minZ < z+3)
        || (c.maxX > x-1.4 && c.minX < x+1.4 && c.maxZ > z+3 && c.minZ < z+11);
    });
    let z;
    for (const cx of extra ? [38,40,44,46,48].map(v=>v*Math.sign(inicial)) : [inicial]) {
      x=cx;
      z=(extra ? [-32,-28,-24,24,28,32,-20,20] : [-16,-12,-8,-4,4,8,12]).find(cz=>livre(cz)&&refugios.every(r=>Math.abs(r.x-x)>6||Math.abs(r.z-cz)>14));
      if(z!=null) break;
    }
    if (z == null) throw new Error(`JAV-REFUGIO: sem área livre para ${team}`);
    const y = Math.max(campo.amostra(x, z) + 3.8, campo.amostra(x, z + 9.7) + 3.55);
    escalaTexturaCaixa(kit.caixa(6,.25,6,kit.MAT.madeira,x,y-.25,z,{nome:`laje-refugio-${team}`}),6,.25,6);
    for (const dx of [-3,3]) kit.caixa(.2,1.15,6.2,kit.MAT.calcada,x+dx,y,z,{nome:'guarda-refugio'});
    kit.caixa(6,1.15,.2,kit.MAT.calcada,x,y,z-3,{nome:'guarda-refugio'});
    for (const dx of [-2.1,2.1]) kit.caixa(1.8,1.15,.2,kit.MAT.calcada,x+dx,y,z+3,{nome:'guarda-refugio'});
    kit.caixa(2,.2,1.66,kit.MAT.calcada,x,y-.65,z+3.83,{collide:false,nome:'patamar-refugio'});
    for (const dx of [-1.12,1.12]) kit.caixa(.2,1.6,1.86,kit.MAT.calcada,x+dx,y-.45,z+3.83,{nome:'guarda-refugio'});
    for (const dx of [-2.6, 2.6]) for (const dz of [-2.6, 2.6]) {
      const base = campo.amostra(x + dx, z + dz);
      kit.caixa(.22, y - base, .22, kit.MAT.calcada, x + dx, base, z + dz, {nome:'pilar-refugio'});
    }
    const degraus = [];
    const baseEscada = campo.amostra(x, z + 9.7), passo = (y - .45 - baseEscada) / 18;
    for (let i = 0; i < 18; i++) {
      const cz = z + 9.56 - i * .28, topo = baseEscada + (i + 1) * passo;
      escalaTexturaCaixa(kit.caixa(2,.2,.28,kit.MAT.madeira,x,topo-.2,cz,{collide:false,cast:false,nome:'escada-refugio'}),2,.2,.28);
      degraus.push({z0:cz-.14,z1:cz+.14,y:topo});
      for (const dx of [-1.12,1.12]) kit.caixa(.2,1.15,.28,kit.MAT.calcada,x+dx,topo,cz,{nome:'guarda-escada-refugio'});
    }
    refugios.push({team,x,z,y,x0:x-3,x1:x+3,z0:z-3,z1:z+3,degraus});
  }
  return refugios;
}

export function pisosElevados(colliders, root, materiais) {
  const cells = new Map(), coberturas = [...(root.userData.coberturas || [])];
  const degraus=(root.userData.interiores||[]).flatMap(c=>[...c.escada.map(s=>({...s,superficieEscada:true})),...c.pisos].map(s=>{
    const cos=Math.cos(c.ry),sin=Math.sin(c.ry),{hx,hz}=s;
    const cx=c.x+s.x*cos+s.z*sin,cz=c.z-s.x*sin+s.z*cos,ax=Math.abs(hx*cos)+Math.abs(hz*sin),az=Math.abs(hx*sin)+Math.abs(hz*cos);
    return {minX:cx-ax,maxX:cx+ax,minZ:cz-az,maxZ:cz+az,minY:c.y+s.y-.125,maxY:c.y+s.y,ry:c.ry,cx,cz,hx,hz,cos,sin,superficieEscada:s.superficieEscada};
  }));
  const key = (x,z) => `${Math.floor(x/8)},${Math.floor(z/8)}`;
  for (const c of [...colliders,...degraus,...(root.userData.superficiesElevadas||[])]) {
    if (c.maxY > 10 || c.maxY < .05) continue;
    for (let x=Math.floor(c.minX/8);x<=Math.floor(c.maxX/8);x++) for(let z=Math.floor(c.minZ/8);z<=Math.floor(c.maxZ/8);z++) {
      const k=`${x},${z}`; if(!cells.has(k)) cells.set(k,[]); cells.get(k).push(c);
    }
  }
  root.traverse(m => {
    const p=m.geometry?.parameters;
    if (p?.radialSegments===4 && materiais.includes(m.material)) coberturas.push({x:m.position.x,z:m.position.z,y:m.position.y-p.height/2,h:p.height,r:p.radius,cos:Math.cos(m.rotation.y),sin:Math.sin(m.rotation.y)});
  });
  return (x,z,yRef,solo) => {
    let y=solo;
    for(const c of cells.get(key(x,z)) || []) {
      if((!c.superficieEscada&&(Number.isFinite(yRef)?yRef<c.maxY-.22:!c.pisoDeclarado)) || c.maxY<=y || x<c.minX || x>c.maxX || z<c.minZ || z>c.maxZ) continue;
      const dx=x-c.cx,dz=z-c.cz;
      if(c.ry && (Math.abs(dx*c.cos-dz*c.sin)>c.hx || Math.abs(dx*c.sin+dz*c.cos)>c.hz)) continue;
      y=c.maxY;
    }
    for(const r of coberturas) {
      if(r.tipo==='duas-aguas'){
        const dx=x-r.x,dz=z-r.z,lx=dx*r.cos-dz*r.sin,lz=dx*r.sin+dz*r.cos;
        if(Math.abs(lx)<=r.w&&Math.abs(lz)<=r.d){const topo=r.y+r.h*(1-Math.abs(lx)/r.w);if(yRef>=topo-.22)y=Math.max(y,topo);}
        continue;
      }
      const dx=x-r.x,dz=z-r.z,passo=2*Math.PI/(r.lados||4),theta=Math.atan2(dx,dz);
      const d=r.tipo==='cone'?Math.hypot(dx,dz)*Math.cos(theta-(Math.floor(theta/passo)+.5)*passo)/Math.cos(passo/2):Math.abs(dx*r.cos-dz*r.sin)+Math.abs(dx*r.sin+dz*r.cos);
      if(d>r.r) continue;
      const topo=r.y+r.h*(1-d/r.r);
      if(yRef>=topo-.22) y=Math.max(y,topo);
    }
    return y;
  };
}

export function tetoDosInteriores(root,x,z,yRef,altura) {
  let teto=Infinity;
  for(const c of root.userData.interiores||[]){
    const dx=x-c.x,dz=z-c.z,lx=dx*Math.cos(c.ry)-dz*Math.sin(c.ry),lz=dx*Math.sin(c.ry)+dz*Math.cos(c.ry);
    for(const p of c.pisos) if(Math.abs(lx-p.x)<=p.hx+.3&&Math.abs(lz-p.z)<=p.hz+.3&&yRef<c.y+p.base-.3) teto=Math.min(teto,c.y+p.base-altura);
  }
  for(const p of root.userData.torre?.pisos||[])if(x>=p.minX-.3&&x<=p.maxX+.3&&z>=p.minZ-.3&&z<=p.maxZ+.3&&yRef<p.minY-.3)teto=Math.min(teto,p.minY-altura);
  return teto;
}

export function pisoDosRefugios(refugios, x, z, yRef, solo) {
  for (const r of refugios) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && (yRef == null || yRef >= r.y - .55)) return r.y;
    if (Math.abs(x - r.x) <= 1) {
      if (z > r.z+3 && z < r.z+4.67) return Math.max(solo,r.y-.45);
      const degrau = r.degraus.find(d=>z>=d.z0 && z<=d.z1);
      if (degrau) return Math.max(solo,degrau.y);
    }
  }
  return solo;
}
