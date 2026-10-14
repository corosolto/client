// Real renderer/embedded font/current roster. Fixture image is not match evidence.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Resvg} from '@resvg/resvg-js';
import {pathToFileURL} from 'node:url';
import {careerRank} from '../../public/js/career-rank.js';
let source=readFileSync('src/lib/profile-card.mjs','utf8');
const mutant=process.argv.find(s=>s.startsWith('--mutant='))?.split('=')[1];
if(mutant){
 const patches={'unsafe-source':["!['server_verified','historical_plus_server_verified'].includes(p?.source) || p.visibility!=='public'","false"],'no-portrait':["const image=character&&portrait&&",'const image=false&&character&&portrait&&'],'small-portrait':['x="650" y="8" width="550" height="614"','x="840" y="140" width="300" height="365"'],'other-character-small':['height="614"','height="${character.id===\'canarinho\'?614:365}"'],'no-logo':['const logoImage=logo&&','const logoImage=false&&'],'small-logo':['const LOGO_HEIGHT=150','const LOGO_HEIGHT=60'],'no-badge':['${rankBadge(rank)}',''],'level-from-points':["const level=p.level==null?'—':number(p.level)",'const level=number(Math.floor(p.points/100))'],'url-off-margin':['y="570" font-size="20"','y="600" font-size="20"'],'one-line-nick':['if(single>=34)','if(true)'],'narrow-estimate':['??117)','??64)'],'code-unit-cut':['].slice(0,24).join(\'\')','].join(\'\').slice(0,24)'],'keep-controls':["\\u0000-\\u001F\\u007F-\\u009F","\\u0080-\\u009F"]};
 if(!['no-font','square-source'].includes(mutant)){assert(patches[mutant],'Unknown mutant');const [from,to]=patches[mutant];assert(source.includes(from),'Mutation must apply');source=source.replace(from,to);}
}
source=source.replaceAll("'../../public/js/career-rank.js'",JSON.stringify(pathToFileURL(path.resolve('public/js/career-rank.js')).href));
const {profileCardSvg:cardSvg}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {SITE}=await import('../../src/lib/site-origin.mjs');
let logo=null;
const profileCardSvg=(p,character=null,portrait=null,brand=logo)=>cardSvg(p,character,portrait,SITE,brand);
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
const prepared=await new AsyncFunction('readFileSync','existsSync','sharp',prepare+";return {characters:SOCIAL_CHARACTERS,portraits:SOCIAL_PORTRAITS,logo:typeof SOCIAL_LOGO==='undefined'?null:SOCIAL_LOGO}")(readFileSync,(await import('node:fs')).existsSync,sharp);
const {characters,portraits}=prepared;logo=prepared.logo;
assert(logo?.startsWith('data:image/png;base64,'),'build must embed the official public/logo.png as SOCIAL_LOGO');
const logoPixels=await sharp(Buffer.from(logo.split(',')[1],'base64')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const logoExpected=await sharp('public/logo.png').trim({threshold:10}).resize({height:150}).ensureAlpha().raw().toBuffer();
assert(logoPixels.data.equals(logoExpected),'SOCIAL_LOGO must be public/logo.png trimmed and resized once to 150px');
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
const nickTag=svg.match(/<text\b([^>]*)>OG Fixture<\/text>/)[1],nickY=+nickTag.match(/\by="(\d+)"/)[1],nickX=+nickTag.match(/\bx="(\d+)"/)[1];
for(let y=nickY-50;y<nickY+4;y++)for(let x=nickX;x<800;x++){const i=(y*1200+x)*4;if(pixels[i]>200&&pixels[i+1]>200&&pixels[i+2]>180)textPixels++;}
assert(imagePixels>0,'portrait missing from rendered pixels');assert(textPixels>0,'embedded font does not render nickname');
assert(minY<=8&&maxY>=621,`portrait must span the card between its existing 8px border bands; actual y=${minY}..${maxY}`);
assert.throws(()=>profileCardSvg({...p,source:'browser'}));assert.throws(()=>profileCardSvg({...p,visibility:'private'}));
assert(!profileCardSvg({...p,nick:'<script>"&'}).includes('<script>'),'nickname escapes XML');
assert(profileCardSvg(p).includes(`>${new URL(SITE).host}</text>`),'card must print the canonical host');
assert(!profileCardSvg(p,characters.canarinho,'https://evil.test/image').includes('https://evil.test'),'no arbitrary image fetch');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/\b([a-zA-Z-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const logoTag=[...svg.matchAll(/<image\b[^>]*>/g)].map(m=>m[0]).find(t=>t.includes(logo));
assert(logoTag,'card must embed the game logo as an image');
const box=attrs(logoTag),lx=+box.x,ly=+box.y,lw=+box.width,lh=+box.height;
assert(lh>=140&&lw>=200,`logo must stay legible in small previews; actual ${lw}x${lh}`);
assert(lx>=40&&ly>=16&&lx+lw<=640&&ly+lh<=614,`logo must sit in the left column safe area; actual ${lx},${ly} ${lw}x${lh}`);
assert(!/>CORO SOLTO</.test(svg),'logo replaces the plain CORO SOLTO text');
const noLogo=render(profileCardSvg(p,characters.canarinho,portraits.canarinho,null)).pixels;let logoChanged=0;
for(let y=ly;y<ly+lh;y++)for(let x=lx;x<lx+lw;x++){const i=(y*1200+x)*4;if(pixels[i]!==noLogo[i]||pixels[i+1]!==noLogo[i+1]||pixels[i+2]!==noLogo[i+2])logoChanged++;}
assert(logoChanged>lw*lh*0.4,`logo missing from rendered pixels; ${logoChanged} changed in ${lw*lh}`);
assert(!profileCardSvg(p,null,null,'https://evil.test/logo.png').includes('evil.test'),'no arbitrary logo fetch');
for(const fixture of [p,{...p,level:1,points:42},{...p,level:520,points:51974}]){
 const card=profileCardSvg(fixture),rank=careerRank(fixture.points);
 const badge=card.match(/<g\b[^>]*data-rank="([^"]+)"[^>]*>([\s\S]*?)<\/g>/);
 assert(badge,`level badge missing for level ${fixture.level}`);
 assert.equal(badge[1],rank.id,'badge must use the game career rank');
 assert.equal((badge[2].match(/class="mark"/g)||[]).length,rank.marks,'badge marks must match the game rank');
 const level=card.match(/<text\b([^>]*)>NÍVEL ([^<]+)<\/text>/);
 assert(level,'NÍVEL N must be printed beside the name');assert.equal(level[2],fixture.level.toLocaleString('pt-BR'));
 assert(+attrs(level[1])['font-size']>=26,'NÍVEL N must be prominent');
 assert(card.includes(`>${rank.label.toUpperCase()}<`),'rank name must be printed in the badge');
 const nick=card.match(/<text\b([^>]*)>OG Fixture<\/text>/);assert(nick&&+attrs(nick[1])['font-size']>=44,'nickname must stay prominent');
 for(const [,t] of card.matchAll(/<text\b([^>]*)>/g)){const a=attrs(t);assert(+a.x>=60&&+a.y<=572,`text outside the 60px safe area: x=${a.x} y=${a.y}`);}
}
const nickTexts=card=>[...card.matchAll(/<text\b([^>]*fill="#f2ead8"[^>]*font-weight="bold"[^>]*|[^>]*font-weight="bold"[^>]*fill="#f2ead8"[^>]*)>([^<]*)<\/text>/g)].map(m=>({...attrs(m[1]),text:m[2]})).filter(t=>+t.y<126);
for(const level of [null,undefined])assert(profileCardSvg({...p,level}).includes('>NÍVEL —<'),`missing level must read NÍVEL —, not 0 (${level})`);
{const card=profileCardSvg({...p,nick:'Bad\u0001Nick\u0007\u001b\u007f'});assert(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(card),'control characters must not reach the SVG');assert(card.includes('>BadNick<'));assert.equal(render(card).width,1200);}
let longNickChecked=0;
for(const nick of ['ŒÆŴÓÕÂÊÔÇ@WMŒÆŴÓÕÂÊÔÇ@WM','WWWWWWWWWWWWWWWWWWWWWWWW','Coro😀Solto🔥Treta😀Supremaa']){
 const card=profileCardSvg({...p,nick}),lines=nickTexts(card);
 assert(lines.length>=1&&lines.length<=2,`nickname must use one or two lines: ${nick}`);
 for(const line of lines)assert(+line['font-size']>=28,`nickname ${nick} shrank to ${line['font-size']}px; minimum 28px`);
 const shown=lines.map(l=>l.text).join('');
 assert(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(shown),'nickname cut inside a surrogate pair');
 assert(shown===[...nick].slice(0,32).join('')||shown.endsWith('…')&&[...nick].join('').startsWith(shown.slice(0,-1)),`nickname must be whole or a clean prefix with an ellipsis: ${shown}`);
 const px=render(card).pixels;let inside=0,past=0;
 for(let y=20;y<126;y++)for(let x=280;x<1200;x++){const i=(y*1200+x)*4;if(px[i]>200&&px[i+1]>200&&px[i+2]>180){if(x<645)inside++;else past++;}}
 assert(inside>0,`nickname ${nick} did not render`);
 assert.equal(past,0,`nickname ${nick} crosses into the portrait column (x>=645): ${past} px`);
 longNickChecked++;
}
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
console.log(`PASS logo ${lw}x${lh} ${logoChanged}px; level badge; long nicknames ${longNickChecked}/3; safe area; roster ${roster.length}/${roster.length}; actual portrait ${imagePixels} pixels y=${minY}..${maxY}; embedded nickname ${textPixels} pixels; public verified source; XML/URL guards; PNG1200x630`);
