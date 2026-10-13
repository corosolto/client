// Real renderer/embedded font/current roster. Fixture image is not match evidence.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Resvg} from '@resvg/resvg-js';
let source=readFileSync('src/lib/profile-card.mjs','utf8');
const mutant=process.argv.find(s=>s.startsWith('--mutant='))?.split('=')[1];
if(mutant){
 const patches={'unsafe-source':["!['server_verified','historical_plus_server_verified'].includes(p?.source) || p.visibility!=='public'","false"],'no-portrait':["const image=character&&portrait&&",'const image=false&&character&&portrait&&'],'small-portrait':['x="650" y="8" width="550" height="614"','x="840" y="140" width="300" height="365"'],'other-character-small':['height="614"','height="${character.id===\'canarinho\'?614:365}"']};
 if(!['no-font','square-source'].includes(mutant)){assert(patches[mutant],'Unknown mutant');const [from,to]=patches[mutant];assert(source.includes(from),'Mutation must apply');source=source.replace(from,to);}
}
const {profileCardSvg}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const font=readFileSync('src/lib/font-data.ts','utf8');
const dir=mkdtempSync(path.join(tmpdir(),'profile-contract-')),file=path.join(dir,'bold.ttf');
writeFileSync(file,Buffer.from([...font.matchAll(/'([A-Za-z0-9+/=]+)'/g)].map(m=>m[1]).join(''),'base64'));
const rosterSource=readFileSync('public/js/characters.js','utf8').match(/export const CHARACTERS = ([\s\S]*?\n\]);/);assert(rosterSource);
const roster=vm.runInNewContext(rosterSource[1],{}, {timeout:20000});
const config=readFileSync('astro.config.mjs','utf8');
let prepare=config.slice(config.indexOf('const roster='),config.indexOf('/* MANIFESTO'));
if(mutant==='square-source'){
 const from='const file=`public/img/resultado/${id}-vitoria.webp`;';
 assert(prepare.includes(from),'Source mutation must apply');
 prepare=prepare.replace(from,'const file=[`public/img/chars/${id}.webp`,`public/img/chars-hero/${id}.webp`,`public/img/social-chars/${id}.png`].find(existsSync);');
}
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const {characters,portraits}=await new AsyncFunction('readFileSync','existsSync','sharp',prepare+';return {characters:SOCIAL_CHARACTERS,portraits:SOCIAL_PORTRAITS}')(readFileSync,(await import('node:fs')).existsSync,sharp);
assert.deepEqual(Object.keys(characters).sort(),Array.from(roster,c=>c.id).sort(),'share roster differs from game');
const p={source:'server_verified',visibility:'public',nick:'OG Fixture',handle:'treta_fixture',level:3,points:248,position:17,kills:180,deaths:92,kd:1.96,play_seconds:7380};
const historical={...p,source:'historical_plus_server_verified',legacy_points:200,verified_points:48,verified_play_seconds:0};
const historicalCard=profileCardSvg(historical);
assert(historicalCard.includes('HISTÓRICO + PARTIDAS CONFIRMADAS'),'mixed history needs a truthful source label');
assert(!historicalCard.includes('>2,05<'),'legacy time must not be certified as active time');
assert.throws(()=>profileCardSvg({...historical,visibility:'private'}));
for(const c of roster){
 assert.equal(characters[c.id].nome,c.name);assert(portraits[c.id]?.startsWith('data:image/png;base64,'),'missing encoded PNG: '+c.id);
 const actual=await sharp(Buffer.from(portraits[c.id].split(',')[1],'base64')).ensureAlpha().raw().toBuffer();
 const expected=await sharp(`public/img/resultado/${c.id}-vitoria.webp`).trim({threshold:1}).resize({height:630}).ensureAlpha().raw().toBuffer();
 assert(actual.equals(expected),'vertical result art must be selected without square fallback: '+c.id);
 const image=profileCardSvg(p,characters[c.id],portraits[c.id]).match(/<image\b[^>]*>/)?.[0];
 assert(image,'missing image in actual card: '+c.id);
 for(const [attribute,value] of Object.entries({x:'650',y:'8',width:'550',height:'614',preserveAspectRatio:'xMidYMid meet'}))
  assert.equal(image.match(new RegExp(`\\b${attribute}="([^"]+)"`))?.[1],value,`actual ${c.id} image ${attribute}`);
}
const render=svg=>new Resvg(svg,{font:{fontFiles:mutant==='no-font'?[]:[file],loadSystemFonts:false,defaultFontFamily:'DejaVu Sans'},background:'#0c0e11'}).render();
const svg=profileCardSvg(p,characters.canarinho,portraits.canarinho),actual=render(svg),without=render(profileCardSvg(p,characters.canarinho,null));
assert.equal(actual.width,1200);assert.equal(actual.height,630);
const pixels=actual.pixels,blank=without.pixels;
let imagePixels=0,textPixels=0,minY=630,maxY=-1;
for(let y=0;y<630;y++)for(let x=650;x<1200;x++){const i=(y*1200+x)*4;if(pixels[i]!==blank[i] || pixels[i+1]!==blank[i+1] || pixels[i+2]!==blank[i+2]){imagePixels++;minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
for(let y=110;y<180;y++)for(let x=60;x<800;x++){const i=(y*1200+x)*4;if(pixels[i]>200&&pixels[i+1]>200&&pixels[i+2]>180)textPixels++;}
assert(imagePixels>0,'portrait missing from rendered pixels');assert(textPixels>0,'embedded font does not render nickname');
assert(minY<=8&&maxY>=621,`portrait must span the card between its existing 8px border bands; actual y=${minY}..${maxY}`);
assert.throws(()=>profileCardSvg({...p,source:'browser'}));assert.throws(()=>profileCardSvg({...p,visibility:'private'}));
assert(!profileCardSvg({...p,nick:'<script>"&'}).includes('<script>'),'nickname escapes XML');
assert(!profileCardSvg(p,characters.canarinho,'https://evil.test/image').includes('https://evil.test'),'no arbitrary image fetch');
mkdirSync('artifacts/social',{recursive:true});writeFileSync('artifacts/social/profile-card-fixture.png',actual.asPng());
if(process.argv.includes('--gallery')){
 const folder='artifacts/social/og-stylized';mkdirSync(folder+'/cards',{recursive:true});
 writeFileSync(`${folder}/sources.json`,JSON.stringify(Array.from(roster,c=>{const source=`public/img/resultado/${c.id}-vitoria.webp`;return {id:c.id,source,sha256:createHash('sha256').update(readFileSync(source)).digest('hex')};}),null,2)+'\n');
 const thumbs=[];
 for(const c of roster){
  const png=render(profileCardSvg(p,characters[c.id],portraits[c.id])).asPng();writeFileSync(`${folder}/cards/${c.id}.png`,png);
  thumbs.push({id:c.id,png:await sharp(png).resize(400,210).toBuffer()});
 }
 for(let group=0;group<Math.ceil(thumbs.length/21);group++){
  const chunk=thumbs.slice(group*21,(group+1)*21),layers=[];
  for(let i=0;i<chunk.length;i++){
   const left=i%3*400,top=Math.floor(i/3)*236;
   layers.push({input:chunk[i].png,left,top});
   layers.push({input:Buffer.from(`<svg width="400" height="26"><text x="12" y="18" font-size="14" fill="white">${chunk[i].id}</text></svg>`),left,top:top+210});
  }
  await sharp({create:{width:1200,height:Math.ceil(chunk.length/3)*236,channels:4,background:'#0c0e11'}}).composite(layers).png().toFile(`${folder}/gallery-${group+1}.png`);
 }
}
console.log(`PASS roster ${roster.length}/${roster.length}; actual portrait ${imagePixels} pixels y=${minY}..${maxY}; embedded nickname ${textPixels} pixels; public verified source; XML/URL guards; PNG1200x630`);
