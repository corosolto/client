/* Prop sólido JSON: dimensões cruas e orientação devem concordar com navegação, spawn e colisão.
   RED real R1794: 66/70 casos falhavam. Oráculo usa Matrix4 e o _collide real, não a fórmula do builder. */
import { readFileSync, writeSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { THREE, Game, initTextures } from './harness.mjs';
const { registerPropTemplate } = await import('../../public/js/mapprops.js');
const ROOT=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const sourcePath=path.join(ROOT,'public/js/map_json.js'),source=readFileSync(sourcePath,'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex'),sourceSHA256=hash(source);
const mutations={
 dimensoes:{from:'if (solid) for (const [chave, valor]',to:'if (false) for (const [chave, valor]',own:'solid-dimensions-false'},
 dimensaoCd:{from:"[['cw', p.cw], ['cd', p.cd], ['h', h]]",to:"[['cw', p.cw], ['h', h]]",own:'solid-cd-false'},
 orientacao:{from:'ry: p.yaw, cx: p.x',to:'ry: 0, cx: p.x',own:'engine-exits-visual'},
 navegacao:{from:'dentroColisorXZ(c, x, z, inflate)',to:'(x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate)',own:'free-nav-node'},
 spawn:{from:'dentroColisorXZ(c, x, z)',to:'(x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ)',own:'free-spawn-accepted'},
};
const args=process.argv.slice(2),driver=args.length===1&&args[0]==='--mutantes';
const mutant=args.length===1&&args[0].startsWith('--mutante=')?args[0].slice(10):'';
if(args.length>1||args.length===1&&!driver&&!mutations[mutant]){console.error('uso: mapjson-solid-rotation-check [--mutantes|--mutante=dimensoes|orientacao|navegacao|spawn]');process.exit(2)}
function verdict(r,id=''){
 if(r.error||r.signal||r.status!==(id?1:0)||/TypeError|ReferenceError|SyntaxError|setup:|Multiple instances/.test(r.stderr||''))return false;
 const applied=(r.stderr||'').split('\n').filter(s=>s.startsWith('MJSON_APPLIED:'));
 if(id?applied.length!==1||applied[0]!=='MJSON_APPLIED:'+id:applied.length!==0)return false;
 const records=(r.stderr||'').split('\n').filter(s=>s.startsWith('MJSON_RESULT:'));if(records.length!==1)return false;
 let d;try{d=JSON.parse(records[0].slice(13))}catch{return false}
 return d.tool==='mapjson-solid-rotation'&&d.mutant===id&&d.sourceSHA256===sourceSHA256&&d.sourceUnchanged===true&&Number.isInteger(d.total)&&d.total===110&&Number.isInteger(d.failed)&&d.failed>=0&&d.failed<=d.total&&Array.isArray(d.failedNames)
  &&(id?d.failed>0&&d.failedNames.includes(mutations[id].own):d.failed===0&&d.failedNames.length===0);
}
if(driver){
 const run=id=>spawnSync(process.execPath,[fileURLToPath(import.meta.url),...(id?['--mutante='+id]:[])],{cwd:ROOT,encoding:'utf8',timeout:45000,maxBuffer:1024*1024});
 for(const id of ['',...Object.keys(mutations)]){const r=run(id);if(!verdict(r,id)){console.error('INFRA ou contrato: '+(id||'nominal')+' sem veredito próprio válido; status='+r.status+' '+(r.stderr||'').slice(-800));process.exit(2)}console.log('MJSON '+(id||'nominal')+': veredito próprio confirmado')}
 console.log('MJSON driver PASS: nominal e cinco mutantes reais');process.exit(0);
}
let src=source,url=pathToFileURL(sourcePath).href;
if(mutant){const m=mutations[mutant];if(src.split(m.from).length!==2)throw new Error('setup: âncora não única '+mutant);src=src.replace(m.from,m.to);if(src===source)throw new Error('setup: mutante não aplicado');
 src=src.replace("import * as THREE from 'three';","import { THREE } from "+JSON.stringify(new URL('./harness.mjs',import.meta.url).href)+";");
 src=src.replace(/from '([.]\/[^']+)'/g,(_,rel)=>'from '+JSON.stringify(pathToFileURL(path.resolve(ROOT,'public/js',rel)).href));
 url='data:text/javascript;base64,'+Buffer.from(src).toString('base64');writeSync(2,'MJSON_APPLIED:'+mutant+'\n');
}
const {planFromJSON,validatePlan,buildMapFromJSON}=await import(url);
const rows=[],id='qa-solid-rotation-r1793';
const template=new THREE.Mesh(new THREE.BoxGeometry(3,1,.5),new THREE.MeshBasicMaterial());
const base=()=>({bounds:{x:8,z:8},boxes:[],props:[{id,x:0,z:0,h:2,solid:true,cw:6,cd:1,yaw:Math.PI/4}],spawns:{E:[{x:-5,z:-5}],B:[{x:5,z:5}]},waypoints:{step:1,inset:2}});
const check=(name,pass,detail)=>rows.push({name,pass,detail});
try {
 for(const loaded of [false,true]){
  registerPropTemplate(id,loaded?template:null);
  for(const axis of ['cw','cd'])for(const value of [undefined,0,-1,NaN,Infinity]){
   const spec=base();spec.props[0][axis]=value;let refused=false;
   try{planFromJSON(spec)}catch(error){if(error instanceof TypeError||error instanceof ReferenceError)throw error;refused=error.message.includes(axis+' precisa')}
   check('solid-'+axis+'-'+loaded,refused,{value:String(value),loaded});
  }
  for(const h of [0,-1,NaN,Infinity,'2',null]){
   const s=base();s.props[0].h=h;let rejected=false;try{planFromJSON(s)}catch(e){if(e instanceof TypeError||e instanceof ReferenceError)throw e;rejected=/h precisa/.test(e.message)}check('explicit-solid-height',rejected,{loaded,h:String(h)});
  }
  const defaultHeight=base();delete defaultHeight.props[0].h;check('solid-default-height',planFromJSON(defaultHeight).props[0].h===2.4,{loaded});
  const valid=planFromJSON(base());check('asset-collider-presence',valid.colliders.length===(loaded?5:4),{loaded});
  const invalid=base();delete invalid.props[0].cw;const scene=new THREE.Scene();let refused=false;try{buildMapFromJSON(scene,initTextures(),invalid)}catch(e){if(e instanceof TypeError||e instanceof ReferenceError)throw e;refused=/cw precisa/.test(e.message)}check('solid-dimensions-builder',refused&&scene.children.length===0,{loaded,children:scene.children.length});

  registerPropTemplate(id,loaded?template:null);
  for(const a of [undefined,0,-1,NaN,Infinity])for(const b of [undefined,0,-1,NaN,Infinity]){
   const s=base();s.props[0].cw=a;s.props[0].cd=b;let rejected=false;try{planFromJSON(s)}catch(e){if(e instanceof TypeError||e instanceof ReferenceError)throw e;rejected=/cw|cd|dimens|larg|prof/.test(e.message)}
   check('solid-dimensions-'+loaded,rejected,{cw:String(a),cd:String(b)});
  }
 }
 registerPropTemplate(id,template);
 for(const yaw of [0,Math.PI/2,Math.PI/4,-Math.PI/4]){
  const s=base();s.props[0].yaw=yaw;const plan=planFromJSON(s),c=plan.colliders.at(-1);
  const matrix=new THREE.Matrix4().makeRotationY(yaw),mesh=template.clone();mesh.scale.setScalar(2);mesh.rotation.y=yaw;mesh.position.y=1;mesh.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(mesh);
  check('broadphase-bounds',Math.abs(c.minX-box.min.x)<1e-8&&Math.abs(c.maxX-box.max.x)<1e-8&&Math.abs(c.minZ-box.min.z)<1e-8&&Math.abs(c.maxZ-box.max.z)<1e-8,{yaw});
  const inv=matrix.clone().invert();const inside=(p,pad=0)=>{const q=new THREE.Vector3(p.x,0,p.z).applyMatrix4(inv);return Math.abs(q.x)<3+pad&&Math.abs(q.z)<.5+pad};
  const invalidNodes=plan.nodes.filter(p=>inside(p));check('nodes-outside-visual',invalidNodes.length===0,{yaw,count:invalidNodes.length});
  const probe=new THREE.Vector3(2,0,0).applyMatrix4(matrix),spawn=structuredClone(s);spawn.spawns.E=[{x:probe.x,z:probe.z}];check('spawn-in-visual-refused',validatePlan(planFromJSON(spawn)).some(x=>/R3 spawn E dentro de sólido/.test(x)),{yaw});
  const edge=new THREE.Vector3(2,0,.6).applyMatrix4(matrix),pos=edge.clone(),game=Object.create(Game.prototype);game.world={colliders:plan.colliders,bounds:plan.bounds};game._collide(pos,.2);const q=pos.clone().applyMatrix4(inv);const distance=Math.hypot(Math.max(Math.abs(q.x)-3,0),Math.max(Math.abs(q.z)-.5,0));check('engine-exits-visual',distance>=.1999,{yaw,distance});
  if(Math.abs(yaw)===Math.PI/4){check('free-nav-node',plan.nodes.some(p=>p.x===2&&p.z===0),{yaw});const free=new THREE.Vector3(2,0,0);const before=free.clone();game._collide(free,.2);check('no-ghost-push',free.distanceTo(before)<1e-8,{yaw,push:free.distanceTo(before)});const freeSpawn=structuredClone(s);freeSpawn.spawns.E=[{x:2,z:0}];check('free-spawn-accepted',!validatePlan(planFromJSON(freeSpawn)).some(x=>/R3 spawn E dentro de sólido/.test(x)),{yaw});}
 }
}finally{registerPropTemplate(id,null);template.geometry.dispose();template.material.dispose()}
const failed=rows.filter(x=>!x.pass);const out={state:failed.length?'RED_CONFIRMED':'GREEN_NOMINAL',total:rows.length,failed:failed.length,byName:Object.fromEntries([...new Set(rows.map(x=>x.name))].map(n=>[n,{total:rows.filter(x=>x.name===n).length,failed:failed.filter(x=>x.name===n).length}])),examples:failed.filter((x,i,a)=>a.findIndex(y=>y.name===x.name)===i)};const record={tool:'mapjson-solid-rotation',mutant,sourceSHA256,sourceUnchanged:hash(readFileSync(sourcePath,'utf8'))===sourceSHA256,total:rows.length,failed:failed.length,failedNames:[...new Set(failed.map(x=>x.name))]};
if(!record.sourceUnchanged)throw new Error('setup: fonte mudou durante a medição');
writeSync(2,'MJSON_RESULT:'+JSON.stringify(record)+'\n');console.log(JSON.stringify(out));process.exit(failed.length?1:0);
