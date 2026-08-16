// Entra numa partida headless e fotografa. usage: node tools/shoot-game.mjs <auto> <map> <out> [ads]
import { chromium } from 'playwright';
const [,, auto='B,sertanejo', map='', out='/tmp/shots/game.png', ads=''] = process.argv;
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const p = await b.newPage({ viewport:{ width:1920, height:1080 } });
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,140)));
const url = `http://localhost:4455/?debug=1&auto=${auto}${map?`&map=${map}`:''}${process.env.VMQS?'&'+process.env.VMQS:''}`;
await p.goto(url,{waitUntil:'load',timeout:30000}).catch(()=>{});
await p.waitForTimeout(1500);
await p.mouse.click(640,400);            // dispensa splash
await p.keyboard.press('Space');
await p.waitForTimeout(6000);            // carrega mapa+char
if (ads==='ads'){ await p.mouse.move(960,540); await p.mouse.down({button:'right'}); await p.waitForTimeout(1200); }
if (ads==='fire'){ await p.mouse.move(960,540); await p.mouse.down({button:'left'}); await p.waitForTimeout(180); }
await p.screenshot({ path: out });
await b.close();
console.log('shot ->', out, errs.length?('\nERR '+[...new Set(errs)].slice(0,4).join(' | ')):'');
