/** R98 focal CPU, Native correction of rejected GLM checker. R97 measured yaw0 fronts away from west alley.
 * node tools/eval/quebrada-frontage-check.mjs --baseline=/absolute/base.js --out=/new/dir [--candidate=/absolute/variant.js]
 * Actual two GLBs, other props fallback. Root owns browser, movement and artistic review.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {register} from 'node:module';
const SELF=fileURLToPath(import.meta.url),W=path.resolve(path.dirname(SELF),'../..')+'/';
const H=x=>createHash('sha256').update(typeof x==='string'?x:Buffer.from(x.buffer??x,x.byteOffset??0,x.byteLength??x.length)).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const EXPECTED={"2":[-0.5051103830337524,0.0,-6.185818086327111e-17,0.0,0.0,0.5051103830337524,0.0,0.0,6.185818086327111e-17,0.0,-0.5051103830337524,0.0,-18.761844635009766,0.10604283958673477,-36.48775863647461,1.0],"3":[-0.5051103830337524,0.0,-6.185818086327111e-17,0.0,0.0,0.5051103830337524,0.0,0.0,6.185818086327111e-17,0.0,-0.5051103830337524,0.0,-18.761844635009766,0.10604283958673477,-33.887760162353516,1.0],"6":[-0.5368450284004211,0.0,-6.574455993117596e-17,0.0,0.0,0.5368450284004211,0.0,0.0,6.574455993117596e-17,0.0,-0.5368450284004211,0.0,-18.754735946655273,0.11270522326231003,-31.274425506591797,1.0]};
const MAPPROPS_SHA='d2338a65e84265f7b20d8f8e4be9012f11e929eef0c12c21fdc34265f6b59ee2';
const BASE_BUCKET='bdf8d481f44191830602ddc605dc2d7328c72d5637316b9fc7462adfc029fb81';
if(process.argv[2]!=='--capture'){
 const opts=Object.fromEntries(process.argv.slice(2).map(a=>{const m=/^--(baseline|out|candidate)=(.+)$/.exec(a);if(!m)throw Error('expected --baseline= --out= [--candidate=]');return[m[1],m[2]];}));
 if(!opts.baseline||!opts.out||!path.isAbsolute(opts.baseline)||fs.existsSync(opts.out))throw Error('absolute baseline and new output dir required');
 fs.mkdirSync(opts.out,{recursive:true});const snapshots=[];
 for(const [name,source] of [['baseline',opts.baseline],['candidate',opts.candidate??W+'public/js/map_quebrada.js']]){
  const output=path.resolve(opts.out,name+'.json');
  const run=spawnSync(process.execPath,[SELF,'--capture',path.resolve(source),output],{encoding:'utf8',timeout:45000,maxBuffer:1024*1024,env:{...process.env,NODE_NO_WARNINGS:'1'}});
  fs.writeFileSync(path.join(opts.out,name+'.log'),(run.stdout||'')+(run.stderr||''));
  if(run.status!==0||run.error||run.signal)throw Error(name+' capture failed: '+run.status+' '+(run.error?.message||run.stderr).slice(0,600));
  snapshots.push(JSON.parse(fs.readFileSync(output,'utf8')));
 }
 const [b,c]=snapshots,failures=[];const check=(ok,id)=>{if(!ok)failures.push(id);};
 for(const [name,s] of [['baseline',b],['candidate',c]])check(s.inputs?.['public/js/mapprops.js']===MAPPROPS_SHA,'MAPPROPS_HELPER_PIN_'+name);
 for(const [name,s] of [['baseline',b],['candidate',c]]){
  check(Array.isArray(s.art?.inventory)&&s.art.inventory.length>0,'ART_INVENTORY_MISSING_'+name);
  check(Array.isArray(s.art?.meshes)&&s.art.meshes.length>0,'ART_MESHES_MISSING_'+name);
  check(Array.isArray(s.support)&&s.support.length>0,'SUPPORT_ROWS_MISSING_'+name);
  check(Array.isArray(s.support)&&s.support.length>0&&s.support.every(r=>r?.supported===true),'SUPPORT_ALL_TRUE_'+name);
 }
 const parts=b.meshes.filter(m=>m.mapPropId==='fav_house'&&m.count===12&&m.nonUV.instances?.matrix.sha===BASE_BUCKET);
 check(parts.length===10&&new Set(parts.map(m=>m.nonUV.material.name)).size===10,'BASE_TEN_PARTS');
 if(parts.length!==10)throw Error('baseline target missing or ambiguous; cannot compare');
 const ordinals=new Set(parts.map(m=>m.ordinal)),changed=[];
 check(equal(b.inputs,c.inputs),'ASSET_HELPER_BINDINGS');check(equal(b.images,c.images)&&b.images.length>0,'ENCODED_IMAGE_METADATA');
 check(b.hierarchySHA===c.hierarchySHA&&b.meshes.length===c.meshes.length,'HIERARCHY');
 for(let i=0;i<b.meshes.length;i++){
  const x=b.meshes[i],y=c.meshes[i];if(!y){check(false,'MISSING_MESH');continue;}
  if(!ordinals.has(x.ordinal)){check(equal(x,y),'OTHER_MESH_'+x.ordinal);continue;}
  const xb=structuredClone(x),yc=structuredClone(y);
  for(const k of ['matrices','matrixBytes','boxes']){delete xb[k];delete yc[k];}
  delete xb.nonUV.instances.matrix;delete yc.nonUV.instances.matrix;
  check(equal(xb,yc),'TARGET_GEOMETRY_MATERIAL_UV_'+x.ordinal);
  check(y.count===12&&y.matrices.length===12,'INSTANCE_COUNT_'+x.ordinal);
  for(let j=0;j<12;j++){
   const before=x.matrices[j],after=y.matrices[j];
   if(EXPECTED[j]){
    check(y.matrixBytes[j]===H(Float32Array.from(EXPECTED[j])),'FRONTAGE_PI_'+x.ordinal+'_'+j);
    check(after[5]===before[5]&&after[13]===before[13],'GROUND_SCALE_'+x.ordinal+'_'+j);
    if(x.matrixBytes[j]!==y.matrixBytes[j])changed.push([x.ordinal,j]);
   }else check(x.matrixBytes[j]===y.matrixBytes[j],'CONTROL_MATRIX_'+x.ordinal+'_'+j);
  }
 }
 const union=(s,i)=>{const boxes=parts.map(p=>s.meshes.find(m=>m.ordinal===p.ordinal).boxes[i]);return[0,1,2].map(k=>Math.min(...boxes.map(b=>b[k]))).concat([3,4,5].map(k=>Math.max(...boxes.map(b=>b[k]))));};
 let maxEnvelopeDelta=0;const envelopes=Object.keys(EXPECTED).map(i=>{const before=union(b,+i),after=union(c,+i);maxEnvelopeDelta=Math.max(maxEnvelopeDelta,...before.map((v,k)=>Math.abs(v-after[k])));return{instance:+i,before,after};});
 // R97 whole-unit replay measured 1.217331e-6 m: rounding tolerance only, never physical clearance.
 check(maxEnvelopeDelta<=2e-6,'MEASURED_FLOAT32_ENVELOPE');check(changed.length===30,'EXACT_THREE_WHOLE_UNITS');
 check(b.physicsSHA===c.physicsSHA,'BODY_ROUTES_OCCLUDER_MEMBERSHIP');
 check(equal(b.templates,c.templates)&&b.templatesUnchanged&&c.templatesUnchanged,'TEMPLATES');check(equal(b.stats,c.stats),'CPU_STRUCTURE_COST');
 check(equal(b.art,c.art),'ART_EMISSION');check(equal(b.support,c.support),'BAKED_SUPPORT');
 const result={ok:failures.length===0,failures,baselineSHA:b.sourceSHA,candidateSHA:c.sourceSHA,changed,tenParts:parts.map(p=>({ordinal:p.ordinal,material:p.nonUV.material.name})),envelopes,maxEnvelopeDelta,physicsSHA:c.physicsSHA,art:{count:Array.isArray(c.art?.inventory)?c.art.inventory.length:0,meshCount:Array.isArray(c.art?.meshes)?c.art.meshes.length:0,nonempty:Array.isArray(c.art?.inventory)&&c.art.inventory.length>0&&Array.isArray(c.art?.meshes)&&c.art.meshes.length>0},support:{baseline:b.support,candidate:c.support},stats:c.stats,scope:c.scope};
 fs.writeFileSync(path.join(opts.out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({ok:result.ok,failures,changed:changed.length,maxEnvelopeDelta,out:opts.out}));process.exit(result.ok?0:1);
}
const sourceFile=process.argv[3],output=process.argv[4];
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(s,c,n){if(s==='three')return{url:${JSON.stringify(pathToFileURL(W+'public/vendor/three.module.js').href)},shortCircuit:true};if(s.startsWith('three/addons/'))return{url:${JSON.stringify(pathToFileURL(W+'public/vendor/addons/').href)}+s.slice(13),shortCircuit:true};return n(s,c);}`),import.meta.url);
const fetchNative=globalThis.fetch;
const harness=fs.readFileSync(W+'tools/eval/harness.mjs','utf8');
const stub=harness.slice(harness.indexOf('const ctx2d ='),harness.indexOf('/* Resolução do especificador nu'));
if(!stub.startsWith('const ctx2d =')||!stub.includes('harness sem rede'))throw Error('DOM stub extraction failed');
new Function(stub)();
globalThis.self=globalThis;globalThis.localStorage={getItem:k=>k==='awpbr_settings'?JSON.stringify({quality:'med'}):null,setItem(){}};
globalThis.location.search='';globalThis.__CS_TEXTURA_MAX__=0;
const images=[];
function webp(b){
 if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')throw Error('not WebP');
 for(let p=12;p+8<=b.length;){const tag=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4),s=p+8;
  if(tag==='VP8X')return[b.readUIntLE(s+4,3)+1,b.readUIntLE(s+7,3)+1];
  if(tag==='VP8 '&&b[s+3]===0x9d&&b[s+4]===1&&b[s+5]===0x2a)return[b.readUInt16LE(s+6)&16383,b.readUInt16LE(s+8)&16383];
  if(tag==='VP8L'&&b[s]===0x2f){const v=b.readUInt32LE(s+1);return[(v&16383)+1,((v>>>14)&16383)+1];}p=s+n+(n%2);
 }throw Error('WebP dims unavailable');
}
globalThis.Image=class{constructor(){this.width=1;this.height=1;}set src(v){this._src=v;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
globalThis.fetch=async(url,opts)=>{const u=String(url);if(!u.startsWith('blob:')&&!u.startsWith('data:'))throw Error('offline image-only fetch: '+u);return fetchNative(url,opts);};
globalThis.createImageBitmap=async(blob)=>{const b=Buffer.from(await blob.arrayBuffer()),[width,height]=webp(b),encodedSHA=H(b);images.push({width,height,encodedSHA});return{width,height,encodedSHA,metadataOnly:true,close(){}};};
const THREE=await import(pathToFileURL(W+'public/vendor/three.module.js'));
const {GLTFLoader}=await import(pathToFileURL(W+'public/vendor/addons/loaders/GLTFLoader.js'));
const mapPropsSHA=H(fs.readFileSync(W+'public/js/mapprops.js'));
if(mapPropsSHA!==MAPPROPS_SHA)throw Error('MAPPROPS_HELPER_PIN mismatch: helper drifted from base d2338a65; refusing to build map with unpinned helper');
const MP=await import(pathToFileURL(W+'public/js/mapprops.js'));
const {initTextures}=await import(pathToFileURL(W+'public/js/textures.js'));
const array=a=>a?{ctor:(a.array??a.data?.array)?.constructor.name,count:a.count,itemSize:a.itemSize,normalized:a.normalized,offset:a.offset??0,stride:a.data?.stride??null,sha:H(a.array??a.data.array)}:null;
const raw=v=>v===undefined?{absent:true}:v===null||['string','number','boolean'].includes(typeof v)?v:typeof v==='function'?{functionSHA:H(String(v))}:Array.isArray(v)?v.map(raw):v.isVector2||v.isVector3||v.isVector4||v.isQuaternion||v.isColor?{type:v.constructor.name,values:v.toArray()}:Object.fromEntries(Object.keys(v).filter(k=>k!=='uuid').sort().map(k=>[k,raw(v[k])]));
function texture(t){if(!t)return null;return{type:t.type,repeat:t.repeat.toArray(),offset:t.offset.toArray(),center:t.center.toArray(),rotation:t.rotation,wrapS:t.wrapS,wrapT:t.wrapT,magFilter:t.magFilter,minFilter:t.minFilter,channel:t.channel,colorSpace:t.colorSpace,flipY:t.flipY,image:t.image?{width:t.image.width,height:t.image.height,encodedSHA:t.image.encodedSHA??null,dataSHA:t.image.data?H(t.image.data):null}:null};}
function material(m){if(!m)return null;if(Array.isArray(m))return m.map(material);const out={type:m.type,name:m.name};
 for(const k of ['visible','colorWrite','depthTest','depthWrite','depthFunc','stencilWrite','stencilWriteMask','stencilFunc','stencilRef','stencilFuncMask','stencilFail','stencilZFail','stencilZPass','side','opacity','transparent','alphaTest','alphaHash','alphaToCoverage','blending','blendSrc','blendDst','blendEquation','blendSrcAlpha','blendDstAlpha','blendEquationAlpha','blendAlpha','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','premultipliedAlpha','vertexColors','wireframe','roughness','metalness','emissiveIntensity','envMapIntensity','toneMapped','fog','clippingPlanes','clipIntersection','clipShadows'])out[k]=raw(m[k]);
 for(const k of ['color','emissive','normalScale','blendColor'])out[k]=m[k]?.toArray()??null;
 for(const k of ['map','normalMap','roughnessMap','metalnessMap','alphaMap','aoMap','emissiveMap','displacementMap','envMap','lightMap'])out[k]=texture(m[k]);
 out.onBeforeCompile=H(String(m.onBeforeCompile));out.customProgramCacheKey=H(String(m.customProgramCacheKey));return out;}
function geometry(g,uv=true){return{attributes:Object.fromEntries(Object.keys(g.attributes).sort().filter(k=>uv||k!=='uv').map(k=>[k,array(g.attributes[k])])),index:array(g.index),groups:g.groups,drawRange:{start:g.drawRange.start,count:String(g.drawRange.count)},morphAttributes:Object.fromEntries(Object.entries(g.morphAttributes).map(([k,v])=>[k,v.map(array)])),morphTargetsRelative:g.morphTargetsRelative};}
function tplSig(root){const a=[];root.updateMatrixWorld(true);root.traverse(n=>{if(n.isMesh)a.push({matrix:n.matrixWorld.toArray(),geometry:geometry(n.geometry),material:material(n.material)});});return H(JSON.stringify(a));}
const templates={},preTemplate={};
for(const name of ['fav_house','fav_brasileira']){
 const bytes=fs.readFileSync(W+'public/models/props/'+name+'.glb'),expectedHash=name==='fav_house'?'d937bbec49d89ea81ea128c738ae3c882cc90907cfb95c21e9161facd6965499':'e0c3f445e16e3d929d119e2b40777ab5adfefbfed59ad4b2084c5a0efe077166';if(H(bytes)!==expectedHash)throw Error('asset pin '+name);
 const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const jsonLen=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLen).toString());let count=0;
 g.scene.traverse(n=>{if(!n.isMesh)return;count++;const original=doc.materials.find(m=>m.name===n.material.name);if(original?.pbrMetallicRoughness?.baseColorTexture&&!n.material.map)throw Error('GLTFLoader silent missing image');});
 if(count!==(name==='fav_house'?10:7))throw Error('actual GLB mesh count');templates[name]=g.scene;MP.registerPropTemplate(name,g.scene);preTemplate[name]=tplSig(g.scene);
}
let source=fs.readFileSync(sourceFile,'utf8');
const fileURL=pathToFileURL(W+'public/js/map_quebrada.js');
source=source.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,a,p,b)=>a+new URL(p,fileURL).href+b);
const {buildQuebrada}=await import('data:text/javascript,'+encodeURIComponent(source));
let seed=7717;Math.random=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed>>>=0;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
const scene=new THREE.Scene(),T=initTextures(),start=performance.now(),world=buildQuebrada(scene,T);scene.updateMatrixWorld(true);
const root=world.root,meshes=[],nodeOrd=new WeakMap(),geoSet=new Set(),matSet=new Set(),texSet=new Set();let n=0;
root.traverse(o=>nodeOrd.set(o,n++));
function meshData(o){const g=o.geometry;geoSet.add(g);for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m){matSet.add(m);for(const v of Object.values(m))if(v?.isTexture)texSet.add(v);}
 const uv=g.attributes.uv,rec={ordinal:nodeOrd.get(o),mapPropId:o.userData.mapPropId??null,name:o.name,type:o.type,count:o.isInstancedMesh?o.count:1,marked:o.userData.quebradaFinishR85===true,uv:uv?{...array(uv)}:null,nonUV:{geometry:geometry(g,false),matrix:o.matrixWorld.toArray(),matrixFloat64SHA:H(Float64Array.from(o.matrixWorld.elements)),visible:o.visible,layers:o.layers.mask,cast:o.castShadow,receive:o.receiveShadow,frustum:o.frustumCulled,renderOrder:o.renderOrder,instances:o.isInstancedMesh?{count:o.count,matrix:array(o.instanceMatrix),color:array(o.instanceColor)}:null,material:material(o.material)}};if(o.isInstancedMesh){const M=new THREE.Matrix4(),local=new THREE.Box3().setFromBufferAttribute(g.attributes.position);rec.matrices=[];rec.matrixBytes=[];rec.boxes=[];for(let i=0;i<o.count;i++){o.getMatrixAt(i,M);rec.matrices.push(M.toArray());rec.matrixBytes.push(H(o.instanceMatrix.array.subarray(i*16,(i+1)*16)));const box=local.clone().applyMatrix4(M.clone().premultiply(o.matrixWorld));rec.boxes.push([...box.min.toArray(),...box.max.toArray()]);}}return rec;}
root.traverse(o=>{if(o.isMesh)meshes.push(meshData(o));});
function phys(v,seen=new Set()){
 if(v===undefined)return{absent:true};if(v===null||['string','number','boolean'].includes(typeof v))return v;if(typeof v==='function')return{functionSHA:H(String(v))};if(v.isMesh)return{ordinal:nodeOrd.get(v)};if(seen.has(v))throw Error('physical cycle');seen.add(v);let out;
 if(ArrayBuffer.isView(v))out={ctor:v.constructor.name,sha:H(v)};else if(v.isObject3D)out={type:v.type,matrix:v.matrixWorld.toArray(),children:v.children.map(x=>phys(x,seen))};else out=Array.isArray(v)?v.map(x=>phys(x,seen)):Object.fromEntries(Object.keys(v).filter(k=>k!=='uuid').sort().map(k=>[k,phys(v[k],seen)]));seen.delete(v);return out;}
let physics=null;{physics={};for(const k of ['colliders','occluders','camBlockers','spawns','pickups','ctfPoints','waypoints','tacticalRoutes','bounds','levels','casario'])physics[k]=phys(world[k]);const ground=[];for(let x=-27.5;x<=27.5;x+=.5)for(let z=-46.5;z<=46.5;z+=.5){const y=world.groundHeightAt(x,z);if(!Number.isFinite(y))throw Error('ground nonfinite');ground.push(y);}physics.ground={samples:ground.length,rawFloat64SHA:H(Float64Array.from(ground)),functionSHA:H(String(world.groundHeightAt))};}
const postTemplate=Object.fromEntries(Object.entries(templates).map(([k,v])=>[k,tplSig(v)]));
const stats={drawGroupsMeaning:'CPU mesh groups incl hidden; NOT renderer calls',trianglesMeaning:'CPU references incl hidden times instance count; NOT rendered triangles',meshes:meshes.length,geometries:geoSet.size,materials:matSet.size,textures:texSet.size,triangles:0,drawGroups:0,rawGeometryBytes:0};
root.traverse(o=>{if(o.isMesh){stats.triangles+=(o.geometry.index?.count??o.geometry.attributes.position?.count??0)/3*(o.isInstancedMesh?o.count:1);stats.drawGroups+=Math.max(1,o.geometry.groups.length);}});
for(const g of geoSet){for(const a of Object.values(g.attributes))stats.rawGeometryBytes+=(a.array??a.data?.array)?.byteLength??0;stats.rawGeometryBytes+=g.index?.array.byteLength??0;}
const sceneOrd=new WeakMap(),hierarchy=[];let sceneIndex=0;
scene.traverse(o=>sceneOrd.set(o,sceneIndex++));
scene.traverse(o=>hierarchy.push({ordinal:sceneOrd.get(o),parent:o.parent?sceneOrd.get(o.parent):null,type:o.type,name:o.name,visible:o.visible,layers:o.layers.mask,cast:o.castShadow,receive:o.receiveShadow,order:o.renderOrder,frustum:o.frustumCulled,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),matrix:o.matrix.toArray(),world:o.matrixWorld.toArray(),worldFloat64SHA:H(Float64Array.from(o.matrixWorld.elements)),mapPropId:o.userData.mapPropId??null,light:o.isLight?{color:o.color.toArray(),intensity:o.intensity,distance:o.distance??null,decay:o.decay??null}:null}));
const hierarchySHA=H(JSON.stringify(hierarchy));
const inputs=Object.fromEntries(['public/js/mapprops.js','public/models/props/fav_house.glb','public/models/props/fav_brasileira.glb'].map(p=>[p,H(fs.readFileSync(W+p))]));
const art={inventory:raw(root.userData.graffitiPecas??null),meshes:meshes.filter(m=>/^(decal:|mural:|poster:)/.test(m.name)).map(m=>({ordinal:m.ordinal,name:m.name,uv:m.uv,nonUV:m.nonUV}))};
const {criarSuporteGrafite}=await import(pathToFileURL(W+'public/js/graffiti_surface.js'));
const {gradeEspacial}=await import(pathToFileURL(W+'public/js/graffiti_pass.js'));
const {GRAFITE}=await import(pathToFileURL(W+'public/js/graffiti_layout.js'));
const actualSupport=criarSuporteGrafite(root,gradeEspacial);
const support=(GRAFITE.quebrada.pecas??[]).map(([a,x,y,z,ry,w,h],i)=>({i,name:GRAFITE.quebrada.arquivos[a],x,y,z,ry,w,h,supported:actualSupport({x,y,z,ry,w,h})}));
const supportWitnesses=[];
for(const row of support.filter(p=>p.x>-23&&p.x<-12&&p.z>-40&&p.z<-26)){
 const nx=Math.sin(row.ry),nz=Math.cos(row.ry),ray=new THREE.Raycaster(new THREE.Vector3(row.x+nx*.02,row.y,row.z+nz*.02),new THREE.Vector3(-nx,0,-nz),0,.07);
 const hits=ray.intersectObject(root,true).filter(h=>{for(let n=h.object;n;n=n.parent)if(!n.visible||/^(decal:|mural:)/.test(n.name))return false;return h.object.material?.opacity>0;});
 supportWitnesses.push({row:row.i,name:row.name,hits:hits.slice(0,3).map(h=>({ordinal:nodeOrd.get(h.object),asset:h.object.userData.mapPropId??null,material:h.object.material.name,instance:h.instanceId??null,face:h.faceIndex,point:h.point.toArray(),distance:h.distance}))});
}
const result={sourceSHA:H(fs.readFileSync(sourceFile)),inputs,scope:'CPU actual2GLBs; all other props fallback; encoded image metadata only; no Game/browser/visual, GPU/FPS or shot parity claim',buildMs:performance.now()-start,templates:preTemplate,templatesUnchanged:equal(preTemplate,postTemplate),hierarchySHA,meshes,physics,physicsSHA:H(JSON.stringify(physics)),art,support,supportWitnesses,images,stats};
fs.writeFileSync(output,JSON.stringify(result)+'\n');console.log(JSON.stringify({meshes:meshes.length,artMeshes:art.meshes.length,supportRows:support.length,scope:result.scope}));
