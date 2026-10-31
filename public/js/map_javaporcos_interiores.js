export function construirInterior(kit,{x,z,y,w,d,ry,parede}) {
  const {MAT,caixa}=kit,cs=Math.cos(ry),sn=Math.sin(ry),escada=[],pisos=[];
  const box=(px,pz,pw,pd,base,h,mat=parede,nome='parede-interior',collide=true)=>{
    if(nome==='piso-superior'||nome==='patamar-interior'){pisos.push({x:px,z:pz,hx:pw/2,hz:pd/2,base,y:base+h});collide=false;}
    return caixa(pw,h,pd,mat,x+px*cs+pz*sn,y+base,z-px*sn+pz*cs,{ry,nome,collide,bala:!collide});
  };
  const esp=.2,vao=1.6;
  for(const s of [-1,1])box(s*(w+vao)/4,d/2,(w-vao)/2,esp,0,6);
  box(0,d/2,vao,esp,2.4,.6);box(0,d/2,vao,esp,3,1);box(0,d/2,vao,esp,5.4,.6);
  box(0,-d/2,w,esp,0,6);
  for(const s of [-1,1])box(s*w/2,0,esp,d,0,6);
  box(0,0,w-.2,d-.2,0,.06,MAT.ceramica,'piso-interior');
  const sx=-w/2+1,largura=1.4,run=d-1.6,passo=run/24;
  for(let i=0;i<24;i++){
    const sz=d/2-.4-(i+.5)*passo,topo=(i+1)*3/24;
    box(sx,sz,largura,passo,topo-.125,.125,MAT.calcada,'degrau-interior',false);
    escada.push({x:sx,z:sz,y:topo,hx:largura/2,hz:passo/2});
  }
  const limite=sx+largura/2;
  box((limite+w/2)/2,0,w/2-limite,d-.2,2.84,.16,MAT.madeira,'piso-superior');
  box(((-w/2+.1)+(sx-largura/2))/2,0,sx-largura/2+w/2-.1,d-.2,2.84,.16,MAT.madeira,'piso-superior');
  box(sx,-d/2+.6,largura,1.2,2.84,.16,MAT.madeira,'patamar-interior');
  box(limite+.04,.5,.08,d-1.8,3,.95,MAT.madeira,'guarda-escada-interior');
  for(const sy of [0,3])box(w/2-.65,-d/2+.7,.8,.9,sy,.55,MAT.caixote,'movel-interior');
  (kit.root.userData.interiores ||= []).push({x,z,y,w,d,ry,escada,pisos});
}
