// O CI usa Chromium instalado pelo portão; QA local continua na TaskSpace Ego.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { captureCuratedFauna } from './map-fauna-curated-collector.mjs';
import { auditCuratedFaunaCensus } from './map-fauna-curated.mjs';

const base=new URL(process.env.BASE||'http://127.0.0.1:8123');
if(!['http:','https:'].includes(base.protocol))throw Error('Base HTTP(S) obrigatória.');
// Cada tentativa tem diretório próprio: um JSON antigo não pode suprir uma captura ausente.
const out=path.resolve(process.env.FAUNA_OUT||'artifacts/map-fauna-curated');
await fs.mkdir(out,{recursive:true});
const dir=await fs.mkdtemp(path.join(out,'run-'));
const references=JSON.parse(await fs.readFile(new URL('./map-fauna-curated.json',import.meta.url),'utf8'));
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:960,height:640}});
  page.setDefaultTimeout(90000);
  const data=await captureCuratedFauna(page,{base:base.href.replace(/\/$/,''),dir,fotos:2});
  await fs.writeFile(path.join(dir,'map-fauna-curated-runtime.json'),JSON.stringify(data,null,2)+'\n');
  // Releitura obrigatória do arquivo desta execução, não de uma fixture ou run anterior.
  const actual=JSON.parse(await fs.readFile(path.join(dir,'map-fauna-curated-runtime.json'),'utf8'));
  const audit=auditCuratedFaunaCensus(actual,references);
  await fs.writeFile(path.join(dir,'map-fauna-audit.json'),JSON.stringify(audit,null,2)+'\n');
  console.log(JSON.stringify({dir,...audit}));
  if(!audit.pass)process.exitCode=1;
} catch(error) {
  await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({pass:false,error:String(error?.stack||error)},null,2)+'\n');
  console.error('Captura/auditoria runtime falhou; veja '+dir);process.exitCode=1;
} finally {await browser?.close();}
