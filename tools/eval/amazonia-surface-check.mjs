// Baseline 5c66d28b: ponte submersa (.18 < .20), margem física sem malha,
// e 44 caixas altas no horizonte. Evidência: docs/reports/AMAZONIA-VISUAL-CONTINUATION.md.
import { THREE, bootGame, initTextures } from './harness.mjs';
const g = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: 13007 });
const w = g.world;
w.root.updateMatrixWorld(true);
const waters = [];
w.root.traverse(o => { if (o.userData.aguaViva) waters.push(o); });
const waterY = waters[0]?.getWorldPosition(new THREE.Vector3()).y;
const bridgeY = w.groundHeightAt(0, 24, 0);
const samples = [], ray = new THREE.Raycaster();
for (const z of [-20, 20]) for (const side of [-1, 1]) for (const ax of [7, 8, 9, 9.6]) {
  const x = side * ax, expected = w.groundHeightAt(x, z, 0);
  ray.set(new THREE.Vector3(x, 0.01, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObject(w.root, true).filter(h => !h.object.userData.aguaViva && !h.object.material?.transparent);
  const actual = hits[0]?.point.y;
  samples.push({ x, z, expected, actual, delta: actual == null ? null : Math.abs(expected - actual) });
}
const towers = [];
// Mede componentes cúbicos da malha, inclusive após StaticBatch apagar BoxGeometry.
w.root.traverse(o => {
  if (!o.visible || !o.isMesh || o.isInstancedMesh) return;
  const pos=o.geometry.attributes.position, ids=[], points=[], unique=new Map();
  for(let i=0;i<pos.count;i++) {
    const v=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);
    const key=v.toArray().map(n=>Math.round(n*1e5)).join(',');
    if(!unique.has(key)){unique.set(key,points.length);points.push(v);}
    ids.push(unique.get(key));
  }
  const parent=points.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
  const index=o.geometry.index, count=index?.count||pos.count;
  for(let i=0;i<count;i+=3){const a=ids[index?index.getX(i):i];for(let j=1;j<3;j++){const b=ids[index?index.getX(i+j):i+j];parent[find(b)]=find(a);}}
  const groups=new Map();points.forEach((p,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);});
  for(const vs of groups.values()) {
    const box=new THREE.Box3().setFromPoints(vs),center=box.getCenter(new THREE.Vector3());
    if(box.max.y-box.min.y<6.5 || (Math.abs(center.x)<29&&Math.abs(center.z)<41.5))continue;
    const corner=v=>['x','y','z'].every(k=>Math.min(Math.abs(v[k]-box.min[k]),Math.abs(v[k]-box.max[k]))<1e-4);
    if(vs.length>=8&&vs.every(corner))towers.push(center.toArray());
  }
});

const spawnLines = [];
for (const a of w.spawns.E) for (const b of w.spawns.B) {
  const from = new THREE.Vector3(a.x, 1.4, a.z), to = new THREE.Vector3(b.x, 1.4, b.z);
  const dir = to.clone().sub(from); ray.set(from, dir.clone().normalize()); ray.far = dir.length();
  if (!ray.intersectObjects(w.occluders, true).length) spawnLines.push({ a:[a.x,a.z], b:[b.x,b.z] });
}
const drySlow = [9.5,10,10.3].filter(x => w.slowAt(x,20));
const autoClimbs = [];
for (const z of [-24,0]) for (const x of [7.2,7.5,7.8,8.1,11.2,10.9]) {
  const p=g.player, startY=w.groundHeightAt(x,z,0);
  p.pos.set(x,startY,z);p.vel.set(0,0,0);p.grounded=true;p.alive=true;p.hp=100;p.yaw=0;p.crouchF=0;
  g.keys=x<9.4?{KeyD:true}:{KeyA:true};g.touchMove={x:0,z:0};
  for(let i=0;i<30;i++){g._updatePlayer(1/120);if(p.pos.y>startY+.4){autoClimbs.push({x,z,target:p.pos.toArray()});break;}}
  g.keys={};
}
const results = [
  { id:'AMV7', ok:autoClimbs.length === 0, value:autoClimbs, rule:'travessia baixa não escala automaticamente o teto' },
  { id:'AMV5', ok:spawnLines.length === 0, value:spawnLines.length, rule:'zero linhas diretas entre spawns em pé' },
  { id:'AMV6', ok:drySlow.length === 0, value:drySlow, rule:'margem seca não aplica lentidão de água' },
  { id: 'AMV1', ok: Number.isFinite(waterY) && bridgeY > waterY, value: { waterY, bridgeY }, rule: 'ponte acima da água' },
  { id: 'AMV2', ok: samples.every(s => s.delta !== null && s.delta < 1e-4), value: samples, rule: 'malha coincide com chão físico nas rampas' },
  { id: 'AMV3', ok: towers.length === 0, value: towers.length, rule: 'zero torres retangulares do baseline no horizonte; AMZ6 protege densidade' },
];
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.rule}: ${JSON.stringify(r.value)}`);
if (results.some(r => !r.ok)) process.exitCode = 1;
