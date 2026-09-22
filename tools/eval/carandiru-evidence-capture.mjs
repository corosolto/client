import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { launchCarandiruMatch } from './carandiru-browser-launch.mjs';

const option=(name,fallback)=>process.argv.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const base=option('base','http://127.0.0.1:8210'),out=option('out','artifacts/carandiru-main-r3/evidence');
mkdirSync(out,{recursive:true});
const sourceSha256=createHash('sha256').update(readFileSync('public/js/map_penitenciaria.js')).digest('hex');
const views=[
  ['pavilhao-sul',[0,1.62,-20],[0,3.8,0]],
  ['escada-muralha-sul',[35.6,1.62,-23],[35.6,3.8,-34]],
  ['escada-muralha-norte',[35.6,1.62,23],[35.6,3.8,34]],
  ['guarita-norte',[36.7,7.4,30],[33.5,6.4,43.5]],
  ['galeria-pavilhao',[8,4.8,0],[0,4.6,4]],
  ['viatura',[24,1.62,-32],[17,1.2,-25]],
  ['patio-elevado',[0,10,-32],[0,1.5,3]],
];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
const captures=[];
try{
  for(const viewport of [{id:'3x2',width:1536,height:1024},{id:'16x9',width:1600,height:900}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
    const page=await context.newPage();
    await page.addInitScript(()=>localStorage.setItem('awpbr_settings',JSON.stringify({quality:'med',bots:8,vol:0,speech:false})));
    await launchCarandiruMatch(page,{base,mode:'ctf'});await page.waitForTimeout(4500);
    for(const [id,pos,look] of views){
      await page.evaluate(({pos,look})=>{const g=window.__game;g.paused=true;g.player.hp=100;g._updateHud();g.player.pos.set(pos[0],0,pos[2]);g.camera.position.set(...pos);g.camera.fov=70;g.camera.updateProjectionMatrix();g.camera.lookAt(...look);g.scene.updateMatrixWorld(true);g.renderer.render(g.scene,g.camera);},{pos,look});
      const path=`${out}/${viewport.id}-${id}.png`;await page.screenshot({path});const bytes=readFileSync(path);
      captures.push({id,aspect:viewport.id,path,width:viewport.width,height:viewport.height,bytes:statSync(path).size,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
    await context.close();
  }
}finally{await browser.close();}
writeFileSync(`${out}/captures.json`,JSON.stringify({sourceSha256,base,state:'live',mode:'ctf',teams:8,captures,humanVisualApproval:'pending'},null,2));
console.log(`CAPTURAS CARANDIRU: ${captures.length}/${views.length*2} em ${out}`);
