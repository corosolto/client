#!/usr/bin/env node
// BUG-85: mesmos Game/controladores/atlas servidos; varredura de lente é só candidato.
// Ossos projetados são régua de enquadramento, não comprimentos físicos da arma.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root = path.resolve(import.meta.dirname, '../..');
const args = new Map(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
for (const k of args.keys()) if (!['saida','porta','sweep','reload','inspection','asset-candidate'].includes(k)) throw Error(`flag ${k}`);
const out = path.resolve(root, args.get('saida') || 'artifacts/viewmodels/astra-series/hand-continuity/runtime');
const port = Number(args.get('porta') || 8348), base = `http://127.0.0.1:${port}`;
const candidate=args.has('asset-candidate')?path.resolve(root,args.get('asset-candidate')):null;
if(candidate&&(!candidate.startsWith(path.join(root,'artifacts/'))||path.extname(candidate)!=='.glb'))throw Error('candidato deve ser GLB em artifacts');
const playwright = await import(pathToFileURL(`${execFileSync('npm',['root','-g']).toString().trim()}/playwright/index.js`));
const chromium = playwright.chromium || playwright.default?.chromium;
await fs.mkdir(out,{recursive:true});
try { await fetch(base,{signal:AbortSignal.timeout(1000)}); throw Error('porta ocupada'); }
catch(e) { if(e.message==='porta ocupada') throw e; }
const server = spawn(process.execPath,['tools/eval/serve.mjs',String(port)],{cwd:root,stdio:'ignore'});
process.on('exit',()=>server.kill());
let browser;
const report={checks:[],errors:[],states:[],scope:'Game real; fotos congeladas; não mede FPS/contato/qualidade humana'};
const check=(ok,name,evidence)=>report.checks.push({ok:!!ok,name,evidence});
try {
  for(let i=0;i<60;i++) { try { if((await fetch(base)).ok)break; }catch{} await new Promise(r=>setTimeout(r,250)); }
  browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio']});
  const page=await browser.newPage({viewport:{width:960,height:640}});
  if(candidate)await page.route('**/models/viewmodels/coro/melee/knife-hires.glb*',r=>r.fulfill({path:candidate,contentType:'model/gltf-binary'}));
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/viewmodels|vmhands/.test(r.url()))report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}/?debug=1&auto=E&vmweapon=knife&map=brasilia&armaslazy=0`,{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>window.__game?.state==='live'&&window.__game?.vm?.melee?.loaded,null,{timeout:180000});
  await page.evaluate(()=>{
    const g=window.__game;g.__qaUpdate=g.update;g.update=()=>{};
    g._switchWeapon('pistol');
  });
  await page.waitForFunction(()=>window.__authoredVm?.entry('pistol'),null,{timeout:120000});
  const nativeKnifeFov=await page.evaluate(()=>window.__game.vm.melee.cameraFov);
  report.knifeAsset=await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/melee/knife-hires.glb')).name;
    const r=await fetch(url),b=await r.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',b);
    return {url,bytes:b.byteLength,sha256:[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('')};
  });
  report.candidate=candidate;
  const advance=async seconds=>page.evaluate(seconds=>{
    const g=window.__game;for(let t=0;t<seconds;t+=1/120)g.__qaUpdate.call(g,Math.min(1/120,seconds-t),false);
  },seconds);
  const capture=async(label)=>{
    await page.waitForFunction(()=>{
      const g=window.__game,meshes=[];
      g.vm.melee.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
      meshes.push(...g.vm.authored.entry('pistol').handMeshes);
      return meshes.every(o=>(Array.isArray(o.material)?o.material:[o.material]).every(m=>!m.userData.teamHands||(m.map?.image?.width>0&&m.bumpMap?.image?.width>0)));
    });
    const state=await page.evaluate(()=>{
      const g=window.__game;g.__qaUpdate.call(g,0,true);
      const knife=g.player.weapon==='knife',entry=g.vm.authored.entry('pistol');
      const scene=knife?g.vm.melee.scene:entry.scene;
      const names=knife?['R_wrist_026','R_middle1_035','R_point1_031']:['hand_r','middle_01_r','index_01_r'];
      const bones=names.map(name=>{const b=scene.getObjectByName(name);if(!b)throw Error(`bone ${name}`);
        const w=b.getWorldPosition(b.position.clone()),p=w.clone().project(g.vmCamera);
        return {name,world:w.toArray(),screen:[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]};});
      const span=(key)=>Math.hypot(...bones[0][key].map((x,i)=>x-bones[1][key][i]));
      const materials=[];
      scene.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material])){
        if(m.userData.teamHands)materials.push({mesh:o.name,...m.userData.teamHands,map:m.map.image.currentSrc||m.map.image.src,bump:m.bumpMap.image.currentSrc||m.bumpMap.image.src,width:m.map.image.width,color:m.color.getHexString()});
      }});
      return {weapon:g.player.weapon,faction:g.playerFaction,alive:g.player.alive,fov:g.vmCamera.fov,aspect:g.vmCamera.aspect,
        profileKnife:g.vm.melee.profile.faction,profilePistol:g.vm.authored.profile.faction,
        materials,bones,palmWorld:span('world'),palmPixels:span('screen'),state:knife?g.vm.melee.state:entry.state};
    });
    const file=`${label}.png`;await page.screenshot({path:path.join(out,file)});
    const record={label,file,...state};report.states.push(record);
    check(state.materials.length>0&&state.materials.every(m=>m.faction===state.faction&&m.width===512),`${label}: atlas real carregado do time`,state.materials);
    check(state.alive&&state.profileKnife===state.faction&&state.profilePistol===state.faction,`${label}: Game atualiza ambas as rotas`,[state.profileKnife,state.profilePistol]);
    return record;
  };
  for(const height of [640,540]){
    await page.setViewportSize({width:960,height});
    await page.evaluate(()=>window.__game.onResize());
    const tag=height===640?'3x2':'16x9';
    if(args.has('sweep')){
      await page.evaluate(()=>window.__game._switchWeapon('pistol'));await advance(.8);await capture(`${tag}-pistol`);
      for(const fov of [nativeKnifeFov,40,45,50,55]){
        await page.evaluate(fov=>{const g=window.__game;g.vm.melee.cameraFov=fov;g._switchWeapon('knife');g._applyVmVisibility();},fov);
        await advance(.8);await capture(`${tag}-knife-fov${fov}`);
      }
    }else{
      for(const faction of ['E','B','C','F','U']){
        await page.evaluate(faction=>{
          const g=window.__game;g.enemyFaction=faction;
          g._switchTeam(); // caminho real, inclusive os dois setProfile
        },faction);
        for(const weapon of ['pistol','knife']){
          await page.evaluate(w=>window.__game._switchWeapon(w),weapon);await advance(.8);
          await capture(`${tag}-${faction}-${weapon}`);
          if(weapon==='pistol'&&args.has('reload')){
            await page.evaluate(()=>window.__game._tryShoot());await advance(.1);
            const duration=await page.evaluate(()=>{const g=window.__game;g._startReload();if(!g._reloading())throw Error('reload não iniciou');return g.player.reloadUntil-g.time;});
            let elapsed=0;
            for(const fraction of [.25,.6,.85]){
              await advance(duration*fraction-elapsed);elapsed=duration*fraction;
              await capture(`${tag}-${faction}-reload${Math.round(fraction*100)}`);
            }
            await advance(duration-elapsed+.15);
          }
          if(weapon==='pistol'&&args.has('inspection')){
            const y=await page.evaluate(()=>{const e=window.__game.vm.authored.entry('pistol');const y=e.frame.y;e.frame={...e.frame,y:y+.14};return y;});
            try { const s=await capture(`${tag}-${faction}-inspect-pistol`);s.qaInspection={offsetY:.14,production:false}; }
            finally {await page.evaluate(y=>{const e=window.__game.vm.authored.entry('pistol');e.frame={...e.frame,y};},y);}
          }
        }
      }
    }
    console.log(`continuidade: ${tag} capturado`);
  }
  check(!report.errors.length,'sem falhas de assets/runtime',report.errors);
  report.ok=report.checks.every(c=>c.ok);
}catch(e){report.errors.push(e.stack);report.ok=false;}
finally{await browser?.close();server.kill();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({ok:report.ok,states:report.states.length,failures:report.checks.filter(c=>!c.ok),errors:report.errors,out}));
process.exitCode=report.ok?0:1;
