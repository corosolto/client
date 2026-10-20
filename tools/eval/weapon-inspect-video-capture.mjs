#!/usr/bin/env node
import {execFileSync,execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {TRETA_PACKS,TRETA_WEAPON_SKINS} from '../../public/js/treta-catalog.js';

const ROOT=path.resolve(import.meta.dirname,'../..');
const BASE=process.env.BASE || 'http://127.0.0.1:9481';
const TMP='/tmp/coro-weapon-skin-videos';
const OUTPUT_DIR=path.join(ROOT,'public/video/weapon-skins');
const MANIFEST=path.join(OUTPUT_DIR,'manifest.json');
const SIZE={width:960,height:540};
const CAPTURE_MS=3600;
const SPIN='0.16';

const targets=[
  ...TRETA_WEAPON_SKINS.map(skin=>({
    owner:skin.id,
    weapon:skin.weapon,
    skinId:skin.id,
    output:skin.previewVideo,
  })),
  ...TRETA_PACKS.flatMap(pack=>['ak','pistol'].map(weapon=>({
    owner:pack.id,
    weapon,
    skinId:pack.weaponSkins[weapon],
    output:pack.weaponPreviewVideos[weapon],
  }))),
];
const tupleKeys=targets.map(({owner,weapon,skinId,output})=>JSON.stringify([owner,weapon,skinId,output]));
const outputKeys=targets.map(({output})=>output);
if(new Set(tupleKeys).size!==targets.length || new Set(outputKeys).size!==targets.length){
  throw new Error(`catálogo de vídeos inválido: ${targets.length} linhas, ${new Set(tupleKeys).size} tuplas e ${new Set(outputKeys).size} saídas únicas`);
}
for(const target of targets){
  if(target.output!==`/video/weapon-skins/${target.skinId}.webm`)throw new Error(`saída divergente para ${target.skinId}: ${target.output}`);
}
/* --ids=<a,b> regenera só a lista pedida e mantém as demais entradas do manifesto. */
const only=process.argv.find(arg=>arg.startsWith('--ids='))?.slice(6).split(',').filter(Boolean) || null;
const runTargets=only?targets.filter(target=>only.includes(target.skinId)):targets;
if(only && runTargets.length!==only.length)throw new Error(`--ids com itens fora do catálogo: ${only.join(',')}`);

await rm(TMP,{recursive:true,force:true});
await mkdir(TMP,{recursive:true});
await mkdir(OUTPUT_DIR,{recursive:true});
const gRoot=execSync('npm root -g').toString().trim();
const playwright=await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium=playwright.chromium || playwright.default?.chromium;
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio']});
const entries=[];

try{
  for(const [index,target] of runTargets.entries()){
    const captureDir=path.join(TMP,String(index).padStart(2,'0'));
    await mkdir(captureDir,{recursive:true});
    const context=await browser.newContext({viewport:SIZE,recordVideo:{dir:captureDir,size:SIZE}});
    const page=await context.newPage();
    const recorded=page.video();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      const query=new URLSearchParams({weapon:target.weapon,skin:target.skinId,view:'three-quarter',spin:SPIN});
      await page.goto(`${BASE}/weapon-skin-review.html?${query}`,{waitUntil:'domcontentloaded',timeout:120000});
      await page.addStyleTag({content:'.title,.note{display:none!important}'});
      await page.waitForFunction(()=>window.REVIEW_READY===true,null,{timeout:120000});
      const selection=await page.evaluate(()=>{const query=new URLSearchParams(location.search);return {weapon:query.get('weapon'),skinId:query.get('skin')};});
      if(selection.weapon!==target.weapon || selection.skinId!==target.skinId)throw new Error(`seleção divergente: ${JSON.stringify(selection)}`);
      await page.waitForTimeout(CAPTURE_MS);
      if(errors.length)throw new Error(`erros na página: ${errors.join(' | ')}`);
    }finally{
      await page.close().catch(()=>{});
      await context.close().catch(()=>{});
    }
    const raw=await recorded.path();
    const output=path.join(ROOT,'public',target.output.slice(1));
    await mkdir(path.dirname(output),{recursive:true});
    execFileSync('ffmpeg',[
      '-y','-sseof','-3','-i',raw,'-t','3','-an',
      '-vf',`scale=${SIZE.width}:${SIZE.height}:flags=lanczos,fps=30`,
      '-c:v','libvpx-vp9','-crf','31','-b:v','0','-pix_fmt','yuv420p',
      '-deadline','good','-cpu-used','2',output,
    ],{stdio:'ignore'});
    const probe=JSON.parse(execFileSync('ffprobe',[
      '-v','error','-select_streams','v:0',
      '-show_entries','stream=codec_name,width,height,duration:format=duration',
      '-of','json',output,
    ],{encoding:'utf8'}));
    const stream=probe.streams?.[0],streamDuration=Number(stream?.duration),formatDuration=Number(probe.format?.duration);
    const duration=Number.isFinite(streamDuration)?streamDuration:formatDuration;
    if(stream?.codec_name!=='vp9' || stream.width!==SIZE.width || stream.height!==SIZE.height || !Number.isFinite(duration) || duration<2){
      throw new Error(`mídia inválida para ${target.skinId}: ${JSON.stringify({stream,duration})}`);
    }
    entries.push({...target,duration,width:stream.width,height:stream.height,codec:stream.codec_name});
    console.error(`[${entries.length}/${targets.length}] ${target.owner} · ${target.weapon} · ${target.skinId}`);
  }
}finally{
  await browser.close();
}

/* Execução parcial sobrepõe só o que capturou; o resto do manifesto permanece. */
let manifestEntries=entries;
if(only){
  try{
    const previous=JSON.parse(readFileSync(MANIFEST,'utf8'));
    manifestEntries=[...previous.entries.filter(entry=>!entries.some(fresh=>fresh.output===entry.output)),...entries];
  }catch{ /* sem manifesto anterior: primeiro run parcial cria a base */ }
}
const manifest={
  version:1,
  generatedAt:new Date().toISOString(),
  source:'weapon-skin-review.html',
  capture:{width:SIZE.width,height:SIZE.height,spin:Number(SPIN),durationSeconds:3},
  count:manifestEntries.length,
  entries:manifestEntries,
};
await writeFile(MANIFEST,`${JSON.stringify(manifest,null,2)}\n`);
console.log(JSON.stringify({...manifest,manifest:path.relative(ROOT,MANIFEST)},null,2));
