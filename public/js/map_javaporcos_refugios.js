export function construirRefugios(kit, campo) {
  const refugios = [];
  for (const [team, x] of [['E', -42], ['B', 42]]) {
    const livre = z => !kit.colliders.some(c => {
      if (c.minY > campo.amostra(x,z)+2) return false;
      return (c.maxX > x-3 && c.minX < x+3 && c.maxZ > z-3 && c.minZ < z+3)
        || (c.maxX > x-1.4 && c.minX < x+1.4 && c.maxZ > z+3 && c.minZ < z+11);
    });
    const z = [-16,-12,-8,-4,4,8,12].find(livre);
    if (z == null) throw new Error(`JAV-REFUGIO: sem área livre para ${team}`);
    const y = campo.amostra(x, z) + 3.8;
    kit.caixa(6, .25, 6, kit.MAT.calcada, x, y - .25, z, {nome:`laje-refugio-${team}`});
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
      kit.caixa(2, .2, .28, kit.MAT.calcada, x, topo - .2, cz, {collide:false,cast:false,nome:'escada-refugio'});
      degraus.push({z0:cz-.14,z1:cz+.14,y:topo});
      for (const dx of [-1.12,1.12]) kit.caixa(.2,1.15,.28,kit.MAT.calcada,x+dx,topo,cz,{nome:'guarda-escada-refugio'});
    }
    refugios.push({team,x,z,y,x0:x-3,x1:x+3,z0:z-3,z1:z+3,degraus});
  }
  return refugios;
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
