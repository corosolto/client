export function escalaTexturaCaixa(mesh,w,h,d) {
  const uv=mesh.geometry.attributes.uv,normal=mesh.geometry.attributes.normal;
  for(let i=0;i<uv.count;i++){
    const eixo=Math.abs(normal.getX(i))>.5?'x':Math.abs(normal.getY(i))>.5?'y':'z';
    uv.setXY(i,uv.getX(i)*(eixo==='x'?d:w)/.8,uv.getY(i)*(eixo==='y'?d:h)/.8);
  }
  uv.needsUpdate=true;return mesh;
}

export function construirTorre(kit,campo,x,z,giro=0) {
  const {MAT,caixa,root}=kit,base=campo.amostra(x,z),y=base+6.2,degraus=[],pisos=[];
  const box=(px,pz,w,d,py,h,mat,nome,collide=true)=>{
    const mesh=caixa(w,h,d,mat,x+px,py,z+pz,{nome,collide,bala:!collide});
    if(collide&&nome.startsWith('guarda'))kit.colliders.at(-1).guardaTorre=true;
    return mesh;
  };
  const superficie=(px,pz,w,d,py,h,nome,escada=false)=>{
    escalaTexturaCaixa(box(px,pz,w,d,py,h,MAT.madeira,nome,false),w,h,d);
    const s={minX:x+px-w/2,maxX:x+px+w/2,minZ:z+pz-d/2,maxZ:z+pz+d/2,minY:py,maxY:py+h,superficieEscada:escada};
    (root.userData.superficiesElevadas||=[]).push(s);return s;
  };
  for(const dx of [-1.9,1.9])for(const dz of [-1.8,2.8])box(dx,dz,.2,.2,base,6.2,MAT.metal,'pilar-torre');
  caixa(2.4,2.1,2.4,MAT.caixaDagua,x,base+8.5,z,{nome:'reservatorio-torre',ry:giro});
  for(const dx of [-1.9,1.9])for(const dz of [-1.8,1.8])box(dx,dz,.18,.18,y,2.3,MAT.metal,'suporte-reservatorio');
  for(const dz of [-1.8,1.8])box(0,dz,4,.18,base+8.3,.2,MAT.metal,'viga-reservatorio');
  for(const [px,pz,w,d]of [[-2.2375,-.7,1.525,3],[0,-.7,.25,3],[2.2375,-.7,1.525,3],[0,2,6,2.4]]){
    const piso=superficie(px,pz,w,d,y-.16,.16,'piso-torre');piso.pisoDeclarado=true;pisos.push(piso);
  }
  for(const dx of [-3,3])box(dx,.5,.12,5.5,y,1.05,MAT.madeira,'guarda-torre');
  for(const dz of [-2.2,3.2])box(0,dz,6,.12,y,1.05,MAT.madeira,'guarda-torre');
  for(const dx of [-1.475,-.125,.125,1.475])box(dx,-.7,.08,3,y,1,MAT.madeira,'guarda-vao-torre');
  box(-.8,.8,1.35,.08,y,1,MAT.madeira,'guarda-vao-torre');
  superficie(0,-4.84,3.2,1.2,base+3.1-.16,.16,'patamar-torre',true);
  for(const dx of [-1.6,1.6])box(dx,-4.84,.1,1.3,base+3.1,1,MAT.madeira,'guarda-patamar-torre');
  box(0,-5.44,3.2,.1,base+3.1,1,MAT.madeira,'guarda-patamar-torre');
  for(let lance=0;lance<2;lance++)for(let i=0;i<18;i++){
    const px=lance?.8:-.8,pz=lance?-4.24+(i+.5)*.28:.8-(i+.5)*.28,topo=base+(lance*18+i+1)*6.2/36;
    const s=superficie(px,pz,1.35,.28,base,topo-base,'degrau-torre',true);degraus.push({...s,x:x+px,z:z+pz,y:topo});
    for(const lado of [-1,1]){
      kit.colisor(x+px+lado*.655,z+pz,.02,.14,base,topo,0);kit.colliders.at(-1).escadaLateral=true;
      box(px+lado*.725,pz,.1,.28,topo,1,MAT.madeira,'guarda-escada-torre');
    }
  }
  const rota=[[-.8,1.5],[-.8,-4.84],[.8,-4.84],[.8,1.5]].map(([dx,dz])=>({x:x+dx,z:z+dz}));
  root.userData.torre={x,z,base,y,x0:x-3.05,x1:x+3.05,z0:z-5.5,z1:z+3.25,degraus,pisos,rota};
}
