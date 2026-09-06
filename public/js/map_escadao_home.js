export const ESCADAO_HOME = Object.freeze({ x0: 1.35, x1: 8.6, z0: 14.2, z1: 18.5, floor: 2.75, stairX: 9.3, stairBottom: 23, stairTop: 17.5 });

export function escadaoHomeGround(x, z) {
  const h = ESCADAO_HOME;
  if (x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1) return h.floor;
  if (x >= 8.5 && x <= 10.1 && z >= 14.2 && z <= h.stairBottom)
    return z <= h.stairTop ? h.floor : h.floor * (h.stairBottom - z) / (h.stairBottom - h.stairTop);
  return undefined;
}

export function buildEscadaoHome({ addBox, occluders, wall, concrete, dark, metal, glass = dark }) {
  const h = ESCADAO_HOME, width = h.x1-h.x0, depth = h.z1-h.z0, x = (h.x0+h.x1)/2, z = (h.z0+h.z1)/2;
  const box = (...args) => { const mesh = addBox(...args); mesh.userData.escadaoAbrigo = true; mesh.userData.escadaoHome = true; return mesh; };
  box(width,h.floor,depth,concrete,x,0,z);
  box(width,3.35,.25,wall,x,h.floor,h.z1-.125);
  box(.25,3.35,depth,wall,h.x0+.125,h.floor,z);
  // Porta na lateral; janela posterior mira o patamar, com peitoril e verga sólidos.
  box(.25,3.35,1.15,wall,h.x1-.125,h.floor,14.775);
  box(.25,3.35,1.9,wall,h.x1-.125,h.floor,17.55);
  box(.25,1.1,1.25,wall,h.x1-.125,h.floor+2.25,15.975);
  box(width,1,.25,wall,x,h.floor,h.z0+.125);
  box(width,1.15,.25,wall,x,h.floor+2.2,h.z0+.125);
  box(4.05,1.2,.25,wall,3.375,h.floor+1,h.z0+.125);
  box(1.7,1.2,.25,wall,7.75,h.floor+1,h.z0+.125);
  box(1.7,.1,.4,concrete,6.15,h.floor+.95,h.z0+.1);
  box(width+.12,.16,depth+.12,concrete,x,h.floor+3.35,z);
  for(const wx of [3.05,6.5]) {
    const detail=(w,h,d,mat,x,y,z)=>{const mesh=addBox(w,h,d,mat,x,y,z,{collide:false,cast:false,skirt:false,vao:false});mesh.name='janela_casa';return mesh;};
    detail(1.26,1.25,.06,glass,wx,h.floor+1.05,h.z1+.025);
    for(const dx of [-.67,.67]) detail(.08,1.4,.14,concrete,wx+dx,h.floor+.98,h.z1+.045);
    detail(1.5,.10,.24,concrete,wx,h.floor+.98,h.z1+.08);
    detail(1.42,.08,.14,concrete,wx,h.floor+2.3,h.z1+.045);
    for(const dx of [-.4,0,.4]) detail(.025,1.23,.04,metal,wx+dx,h.floor+1.06,h.z1+.075);
    detail(1.26,.025,.04,metal,wx,h.floor+1.67,h.z1+.075);
  }

  for (let i=0;i<16;i++) {
    const d=(h.stairBottom-h.stairTop)/16, y=(i+1)*h.floor/16;
    const step=box(1.6,y,d,concrete,h.stairX,0,h.stairBottom-(i+.5)*d,{collide:false,vao:false});
    step.userData.escadaoHomeStair=true; occluders.push(step);
  }
  occluders.push(box(1.6,h.floor,3.3,concrete,h.stairX,0,15.85,{collide:false}));
  for(let i=0;i<16;i++) {
    const d=(h.stairBottom-h.stairTop)/16, z=h.stairBottom-(i+.5)*d, y=(i+1)*h.floor/16;
    for(const x of [8.43,10.17]) box(.14,y+.9,d,dark,x,0,z);
  }
  box(.14,h.floor+1.05,3.3,dark,10.17,0,15.85);
  box(1.6,h.floor+1.05,.14,dark,h.stairX,0,14.15);
}
