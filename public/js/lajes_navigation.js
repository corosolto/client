/* Navegação local da planta V4. Toda aresta conserva apoio e espaço para o corpo;
   não confunde o chão sob uma ponte com o convés da ponte. */
export function buildLajesNavigation({ colliders, groundHeightAt, bounds, platforms, bridges, stairs, spawns, groundRoutes = [] }) {
  const R = .38, EPS = 1e-3, GRID = 2, SAMPLE = R / 2, STEP_H = .55;
  const nodes = [], adj = [], byPosition = new Map();
  const surfaces = [...platforms, ...bridges];
  if (!colliders || !bounds || !surfaces.length || !stairs.length) throw Error('Lajes nav: planta incompleta');

  // Mesmo círculo/AABB e círculo/caixa girada usados por Game._collide.
  const free = (p, candidates = colliders) => {
    if (p.x < bounds.minX + R || p.x > bounds.maxX - R
      || p.z < bounds.minZ + R || p.z > bounds.maxZ - R) return false;
    for (const c of candidates) {
      if (p.y + 1.5 <= c.minY || p.y + .3 >= c.maxY) continue;
      const dx = p.x - Math.max(c.minX, Math.min(p.x, c.maxX));
      const dz = p.z - Math.max(c.minZ, Math.min(p.z, c.maxZ));
      if (dx * dx + dz * dz >= R * R) continue;
      if (!c.ry) return false;
      const wx = p.x - c.cx, wz = p.z - c.cz;
      const lx = wx * c.cos - wz * c.sin, lz = wx * c.sin + wz * c.cos;
      const ex = Math.max(0, Math.abs(lx) - c.hx), ez = Math.max(0, Math.abs(lz) - c.hz);
      if (ex * ex + ez * ez < R * R) return false;
    }
    return true;
  };
  const stairAt = (x, z) => stairs.find(s => {
    const along = (z - s.z) * s.dirZ;
    return Math.abs(x - s.x) <= s.width / 2 && along >= -R - EPS && along <= s.run + R + EPS;
  });
  const supported = (p) => Math.abs(groundHeightAt(p.x, p.z, p.y) - p.y) <= EPS;
  const addNode = (x, z, y, kind) => {
    const p = { x, y, z };
    if (!Number.isFinite(y) || !supported(p) || !free(p)) return -1;
    const key = `${x.toFixed(4)}:${y.toFixed(4)}:${z.toFixed(4)}`;
    if (byPosition.has(key)) return byPosition.get(key);
    const index = nodes.length;
    nodes.push({ ...p, malha: kind === 'ground', navKind: kind }); adj.push([]);
    byPosition.set(key, index); return index;
  };
  const clearSegment = (a, b) => {
    const candidates = colliders.filter(c => c.maxX > Math.min(a.x,b.x)-R
      && c.minX < Math.max(a.x,b.x)+R && c.maxZ > Math.min(a.z,b.z)-R && c.minZ < Math.max(a.z,b.z)+R);
    const count = Math.max(1, Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z) / SAMPLE));
    let previousFloor = a.y;
    for (let i = 0; i <= count; i++) {
      const t = i / count, p = { x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, z:a.z+(b.z-a.z)*t };
      const floor = groundHeightAt(p.x,p.z,p.y), stair = stairAt(p.x,p.z);
      // A inclinação da linha passa entre pisos discretos (~0,172 m). O corpo real
      // pisa no piso retornado, não numa rampa inventada entre as pontas da escada.
      const allowance = stair && Math.abs(a.y-b.y)>EPS ? stair.height/stair.steps+EPS : EPS;
      if (!Number.isFinite(floor) || Math.abs(floor-p.y)>allowance || Math.abs(floor-previousFloor)>STEP_H+EPS) return false;
      if (!free(p,candidates) || !free({ ...p,y:floor },candidates)) return false;
      previousFloor = floor;
    }
    return true;
  };
  const link = (a, b) => {
    if (a<0 || b<0 || a===b || adj[a].includes(b)) return;
    if (!clearSegment(nodes[a],nodes[b]) || !clearSegment(nodes[b],nodes[a])) return;
    adj[a].push(b); adj[b].push(a);
  };

  // Grade existente no plano: térreo de 2 m, sem atravessar as casas sólidas.
  for (let x=bounds.minX+1; x<=bounds.maxX-1; x+=GRID)
    for (let z=bounds.minZ+1; z<=bounds.maxZ-1; z+=GRID) addNode(x,z,0,'ground');
  for (const route of groundRoutes) for (let i = 1; i < route.points.length; i++) {
    const [ax, az] = route.points[i - 1], [bx, bz] = route.points[i];
    const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
    for (let k = 0; k <= count; k++) addNode(ax + (bx - ax) * k / count, az + (bz - az) * k / count, 0, 'ground');
  }
  // Cada retângulo inclui margens e centro. As bordas mantêm o raio dentro do piso.
  const axis = (min,max) => {
    const start=min+R, end=max-R;
    if (end<start) throw Error('Lajes nav: superfície mais estreita que o corpo');
    const count=Math.max(1,Math.ceil((end-start)/GRID));
    return Array.from({length:count+1},(_,i)=>start+(end-start)*i/count);
  };
  for (const s of surfaces) {
    for (const x of axis(s.x0,s.x1)) for (const z of axis(s.z0,s.z1)) addNode(x,z,s.y,'roof');
    addNode((s.x0+s.x1)/2,(s.z0+s.z1)/2,s.y,'roof');
  }

  const required = [];
  for (const s of stairs) {
    if (!(s.steps>0 && s.height/s.steps<=STEP_H && s.run>0 && s.width>=2*R)) throw Error(`Lajes nav: escada inválida ${s.name}`);
    const base = addNode(s.x,s.z-s.dirZ*(R+EPS),0,'stair');
    const chain = [base], tread = s.run/s.steps;
    // Centro de cada piso: normalmente 0,30 m de passada e 0,172 m de espelho.
    // groundHeightAt decide a altura efetiva; height/steps serve apenas de yRef.
    const subdivisions = Math.max(1,Math.ceil(tread/.3));
    for (let step=0; step<s.steps; step++) for (let j=0; j<subdivisions; j++) {
      const along=(step+(j+.5)/subdivisions)*tread, z=s.z+s.dirZ*along;
      chain.push(addNode(s.x,z,groundHeightAt(s.x,z,(step+1)*s.height/s.steps),'stair'));
    }
    const top = addNode(s.x,s.z+s.dirZ*(s.run+R+EPS),s.height,'stair');
    chain.push(top);
    if (chain.some(i=>i<0)) throw Error(`Lajes nav: piso/base/topo ocupado ou sem apoio em ${s.name}`);
    for (let i=1;i<chain.length;i++) link(chain[i-1],chain[i]);
    if (chain.slice(1).some((id,i)=>!adj[chain[i]].includes(id))) throw Error(`Lajes nav: degraus desconectados em ${s.name}`);
    required.push({name:s.name,indices:[base,top]});
  }
  for (const [team,list] of Object.entries(spawns)) for (let i=0;i<list.length;i++) {
    const s=list[i], id=addNode(s.x,s.z,0,'spawn');
    if (id<0) throw Error(`Lajes nav: spawn ${team}/${i} não é térreo livre`);
    required.push({name:`spawn ${team}/${i}`,indices:[id]});
  }

  // Costura apenas vizinhos locais; não inventa ligação de longe para fechar ilha.
  const cells = new Map(), cellKey = (x,z) => `${x},${z}`;
  for (let i=0;i<nodes.length;i++) {
    const n=nodes[i], x=Math.floor(n.x/GRID), z=Math.floor(n.z/GRID), key=cellKey(x,z);
    if (!cells.has(key)) cells.set(key,[]); cells.get(key).push(i);
  }
  for (let i=0;i<nodes.length;i++) {
    const a=nodes[i], x=Math.floor(a.x/GRID), z=Math.floor(a.z/GRID);
    for (let dx=-2;dx<=2;dx++) for (let dz=-2;dz<=2;dz++) for (const j of cells.get(cellKey(x+dx,z+dz))||[]) {
      if (j<=i) continue;
      const b=nodes[j];
      if (Math.abs(a.y-b.y)>EPS && (a.navKind!=='stair'||b.navKind!=='stair')) continue;
      if (Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>GRID*1.5) continue;
      link(i,j);
    }
  }
  const origin=required.find(r=>r.name.startsWith('spawn'))?.indices[0];
  if (origin==null || !nodes.length) throw Error('Lajes nav: grafo sem spawn');
  const visited=new Set([origin]), queue=[origin];
  for (let i=0;i<queue.length;i++) for (const j of adj[queue[i]]) if (!visited.has(j)) {visited.add(j);queue.push(j);}
  const missing=required.filter(r=>r.indices.some(i=>!visited.has(i))).map(r=>r.name);
  if (visited.size!==nodes.length) throw Error(`Lajes nav: ${nodes.length-visited.size}/${nodes.length} nós desconectados; acessos: ${missing.join(', ')||'grade local'}; isolados: ${JSON.stringify(nodes.filter((n,i)=>!visited.has(i)).slice(0,8))}`);

  function nearestWaypoint(x,z,yRef) {
    const y=Number.isFinite(yRef)?yRef:groundHeightAt(x,z);
    let best=-1, score=Infinity;
    for (let i=0;i<nodes.length;i++) {
      const n=nodes[i], d=(n.x-x)**2+(n.z-z)**2+((n.y-y)*3)**2;
      if (d<score) {score=d;best=i;}
    }
    return best;
  }
  function findPath(from,to) {
    if (!nodes[from]||!nodes[to]) return [];
    if (from===to) return [to];
    const distance=new Float64Array(nodes.length).fill(Infinity), previous=new Int32Array(nodes.length).fill(-1);
    const open=new Set([from]), target=nodes[to];distance[from]=0;
    const estimate=i=>distance[i]+Math.hypot(nodes[i].x-target.x,nodes[i].y-target.y,nodes[i].z-target.z);
    while (open.size) {
      let current=-1, score=Infinity;
      for (const i of open) {const e=estimate(i);if(e<score){score=e;current=i;}}
      if (current===to) break;
      open.delete(current);
      for (const next of adj[current]) {
        const a=nodes[current],b=nodes[next],d=distance[current]+Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
        if (d<distance[next]) {distance[next]=d;previous[next]=current;open.add(next);}
      }
    }
    if (!Number.isFinite(distance[to])) return [];
    const path=[to];for(let i=previous[to];i>=0;i=previous[i])path.unshift(i);return path;
  }
  return {waypoints:{nodes,adj},nearestWaypoint,findPath};
}
