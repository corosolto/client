// Derivados de runtime: originais Mint ficam privados. Não simplificar/quantizar
// malha skinned: a família Mint já tem geometria pequena; comprimir só texturas.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,dedup,prune,unpartition,textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {TRETA_SKINS} from '../public/js/treta-catalog.js';
import {addGripRig,bakeGround} from './treta-skin-rig.mjs';
import {readGLB,buildScene,poseWith} from './eval/tp-mount-probe.mjs';

const root=process.env.TRETA_PRIVATE_ROOT;
if(!root)throw new Error('Set TRETA_PRIVATE_ROOT to the private Mint directory');
const staging=resolve(root,'runtime-integration');mkdirSync(staging,{recursive:true});
const output=resolve('public/models/skins');mkdirSync(output,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const states=['idle','walk','run','shoot','death','crouch','crouchwalk','jump','idle1h','walk1h','walkfire'];
const original={'lula-drip':'lula-drip-idle.glb','bolsonaro-drip':'bolsonaro-drip-idle.glb','senador-drip':'senador-idle.glb',janja:'janja-idle.glb','michelle-bolsonaro':'michelle-idle.glb'};
const previous=existsSync(join(output,'manifest.json'))?JSON.parse(readFileSync(join(output,'manifest.json'))).skins:{};
const manifest={schema:1,skins:{}};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const skin of TRETA_SKINS){
  const source=original[skin.id]?join(root,original[skin.id]):join(root,'batch2-cyborg-mandrake/glb',`${skin.id}-idle.glb`);
  const clipsDir=join(staging,skin.id);mkdirSync(clipsDir,{recursive:true});
  const result=spawnSync(process.execPath,['tools/retarget-glb.mjs','public/models/anims/mixamo',source,clipsDir,...states],{encoding:'utf8'});
  writeFileSync(join(clipsDir,'retarget.log'),result.stdout+result.stderr);
  if(result.status!==0)throw new Error(`Retarget failed: ${skin.id}; see ${clipsDir}/retarget.log`);
  const doc=await io.read(source),r=doc.getRoot();
  const src=readGLB(source),scene=buildScene(src),world=poseWith(scene,source,1);
  const head=scene.nodes.find(n=>n.name==='Head'),front=scene.nodes.find(n=>n.name==='headfront');
  const heading=Math.atan2(world[front.i][12]-world[head.i][12],world[front.i][14]-world[head.i][14]);
  r.listScenes()[0].setExtras({showroomYaw:-heading});
  for(const animation of r.listAnimations())animation.setName('showroomIdle');
  const nodes=new Map(r.listNodes().map(n=>[n.getName(),n]));
  for(const state of states){
    const clip=await io.read(join(clipsDir,`${state}.glb`));
    const beforeNodes=new Set(r.listNodes()),beforeScenes=new Set(r.listScenes()),beforeAnimations=new Set(r.listAnimations());
    mergeDocuments(doc,clip);
    for(const anim of r.listAnimations().filter(a=>!beforeAnimations.has(a)))for(const ch of anim.listChannels()){
      const target=nodes.get(ch.getTargetNode()?.getName());if(!target)throw new Error(`Unmapped bone ${skin.id}/${state}`);ch.setTargetNode(target);
    }
    for(const n of r.listNodes())if(!beforeNodes.has(n))n.dispose();
    for(const s of r.listScenes())if(!beforeScenes.has(s))s.dispose();
  }
  await doc.transform(unpartition());
  const grip=addGripRig(doc),ground=await bakeGround(doc,io);
  writeFileSync(join(clipsDir,'rig-review.json'),JSON.stringify({grip,ground},null,2)+'\n');
  await doc.transform(dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024]}),prune(),unpartition());
  const bytes=await io.writeBinary(doc),hash=sha(bytes),filename=`${skin.id}-${hash.slice(0,12)}.glb`;
  writeFileSync(join(output,filename),bytes);
  manifest.skins[skin.id]={character:skin.character,model:`/models/skins/${filename}`,poster:`/img/skins/${skin.id}.webp`,approved:previous[skin.id]?.sha256===hash && previous[skin.id]?.approved===true,preview:true,gripProfile:'mint24-curl-v1',sha256:hash,bytes:bytes.length,sourceSha256:sha(readFileSync(source)),animationNames:Object.fromEntries(states.map(s=>[s,s]))};
  if(previous[skin.id]?.sha256===hash)for(const field of ['reviewScope','reviewBlocker'])if(previous[skin.id][field])manifest.skins[skin.id][field]=previous[skin.id][field];
  console.log(`${skin.id}: ${bytes.length} B; ${r.listAnimations().length} clips, ${r.listSkins()[0].listJoints().length} joints`);
}
writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
writeFileSync(join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
