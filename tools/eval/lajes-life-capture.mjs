import { chromium } from 'playwright';
import fs from 'node:fs';
const out='artifacts/lajes-visual/v7/life-final';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
try {
 const page=await browser.newPage({viewport:{width:1536,height:1024}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('awpbr_settings',JSON.stringify({quality:'med',bots:0,vol:0,speech:false})));
 await page.goto('http://127.0.0.1:8147/?debug=1&auto=P,mst&map=lajes&perfilauto=0&ctf=1');
 await page.waitForFunction(()=>window.__game?.state==='live',null,{timeout:180000});
 const specs=[{name:'ratos',pos:[0,1.62,-21],target:[-.35,.10,-17.5],type:'rat'},{name:'baratas',pos:[0,1.62,-14.5],target:[.35,.04,-10.7],type:'cockroach'},{name:'santos-voo',pos:[-9,4.72,-10],type:'14bis'}];
 for(const spec of specs.filter(s=>!process.argv.includes('--sky-only')||s.type==='14bis')){
 const result=await page.evaluate(async spec=>{
  const g=window.__game,a=g.world.ambience;g.paused=true;g.vmScene.visible=false;for(const b of g.bots)b.mesh.group.visible=false;
  g.el.pause.classList.add('hidden');g.el.banner.classList.add('hidden');
  g.camera.position.set(...spec.pos);const target=spec.target||a.lajesSantosDumont.snapshot().position;g.camera.lookAt(...target);g.camera.updateMatrixWorld(true);
  a.paused=false;g.renderer.render(g.scene,g.camera);
  const snapshot=()=>({fauna:a.snapshot().filter(v=>v.type===spec.type),santos:a.lajesSantosDumont.snapshot(),source:a.report()});
  const before=snapshot(),first=g.renderer.domElement.toDataURL('image/png');
  const stream=g.renderer.domElement.captureStream(24),chunks=[],rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1800000});
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(resolve=>rec.onstop=resolve);rec.start();let previous=performance.now();const start=previous;
  await new Promise(resolve=>{function frame(){const now=performance.now();a.update(Math.min(.05,(now-previous)/1000),g.player.pos);previous=now;g.renderer.render(g.scene,g.camera);if(now-start<8000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  const after=snapshot(),last=g.renderer.domElement.toDataURL('image/png');rec.stop();await done;stream.getTracks().forEach(t=>t.stop());
  return {before,after,first,last,video:Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()))};
 },spec);
 for(const key of ['first','last'])fs.writeFileSync(`${out}/${spec.name}-${key}.png`,Buffer.from(result[key].split(',')[1],'base64'));
 fs.writeFileSync(`${out}/${spec.name}.webm`,Buffer.from(result.video));fs.writeFileSync(`${out}/${spec.name}.json`,JSON.stringify({spec,before:result.before,after:result.after,errors},null,2));console.log(spec.name,result.video.length);
 }
 if(errors.length){console.log(errors);process.exitCode=1;}
}finally{await browser.close();}
