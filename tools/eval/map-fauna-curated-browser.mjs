// Reusa somente a TaskSpace informada (criada pelo operador/root); requer o guia atual
// do ego-browser lido pelo operador. As referências curadas entram pela config — o
// script dentro do browser não lê JSON do repo privado nem escolhe mapas sozinho.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { auditCuratedFaunaCensus } from './map-fauna-curated.mjs';
const {values}=parseArgs({options:{space:{type:'string'},fotos:{type:'string'},out:{type:'string'},base:{type:'string',default:'http://127.0.0.1:8545'},page:{type:'string',default:'p2'}}});
if(!/^\d+$/.test(values.space||'')||!values.out||!path.isAbsolute(values.out))throw Error('Informe --space ID da própria tarefa e --out /caminho/absoluto. Leia ego-browser skill antes.');
const references=JSON.parse(fs.readFileSync(new URL('./map-fauna-curated.json',import.meta.url),'utf8'));
const fotos=values.fotos===undefined?new Set(references.map(r=>r.map)).size:Number(values.fotos);if(!Number.isSafeInteger(fotos)||fotos<0)throw Error('--fotos deve ser inteiro não negativo.');
const base=new URL(values.base);if(!['http:','https:'].includes(base.protocol))throw Error('Base HTTP(S) obrigatória.');
fs.mkdirSync(values.out,{recursive:true});
const config={space:Number(values.space),dir:values.out,base:base.href.replace(/\/$/,''),pageId:values.page,fotos,references};
const source=fs.readFileSync(new URL('./map-fauna-curated-capture.mjs',import.meta.url),'utf8');
const collector=fs.readFileSync(new URL('./map-fauna-curated-collector.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
const helper=fs.readFileSync(new URL('./map-fauna-response-proof.mjs',import.meta.url),'utf8').replace("import { createHash } from 'node:crypto';\n",'').replace(/^export /gm,'');
const script='const FAUNA_CAPTURE_CONFIG='+JSON.stringify(config)+';\nconst {createHash}=await import("node:crypto");\n'+helper+'\n'+collector+'\n'+source;
const result=spawnSync('ego-browser',['nodejs'],{input:script,encoding:'utf8',maxBuffer:2*1024*1024,timeout:Math.max(240000,new Set(references.map(r=>r.map)).size*90000+60000)});
fs.writeFileSync(path.join(values.out,'map-fauna-capture.log'),(result.stdout||'')+(result.stderr||''));
if(result.error||result.status!==0)throw Error('Captura Ego falhou; veja map-fauna-capture.log. '+(result.error?.message||'exit '+result.status));
const data=JSON.parse(fs.readFileSync(path.join(values.out,'map-fauna-curated-runtime.json'),'utf8'));
const census=auditCuratedFaunaCensus(data,references,{base:base.href.replace(/\/$/,'')}),{reports}=census;
fs.writeFileSync(path.join(values.out,'map-fauna-audit.json'),JSON.stringify({utc:new Date().toISOString(),scope:'mapview GLBs, textures, deterministic controller/mixer; screenshots require independent visual review; actual mobile match separate',...census},null,2)+'\n');
console.log(JSON.stringify(census));if(!census.pass)process.exitCode=1;
