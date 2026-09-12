// Muda a fonte executada, não o relatório. Nenhum arquivo do builder é sobrescrito.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import{spawnSync}from'node:child_process';
const source=readFileSync('public/js/map_amazonia.js','utf8'),out='artifacts/amazonia-visual/access-mutants';mkdirSync(out,{recursive:true});
const trials=[
 ['parede-sem-oclusao',source.replace('occluders.push(addBox(casaChapa ?', 'addBox(casaChapa ?').replace('{collide:false}));','{collide:false});')],
 ['sem-piso',source.replace(/      if \(!\(\(st\.x===14[\s\S]*?      }\n(?=      if \(u >= CASA_A)/,'')],
 ['colisor-na-escada',source.replace('minX:st.x-2,maxX:st.x+2,minY:3.78,maxY:6.3,minZ:Math.min(z0,z1),maxZ:Math.max(z0,z1)','minX:st.x-2.7,maxX:st.x+2.7,minY:DECK_Y,maxY:6.3,minZ:st.z-2.7,maxZ:st.z+2.7')],
];
const results=[];
for(const[name,body]of trials){if(body===source)throw Error(`mutação não aplicou: ${name}`);
 const file=resolve(`${out}/${name}.mjs`);writeFileSync(file,body.replace(/from '\.\/([^']+)'/g,(_,p)=>`from '${pathToFileURL(resolve('public/js',p)).href}'`));
 const run=spawnSync(process.execPath,['tools/eval/amazonia-access-check.mjs'],{env:{...process.env,AMAZONIA_SOURCE:file},encoding:'utf8'});
 writeFileSync(`${out}/${name}.log`,run.stdout+run.stderr);const failures=(run.stdout.match(name==='parede-sem-oclusao'?/FAIL AMA3/g:/FAIL AMA1/g)||[]).length;const ok=run.status===1&&failures===(name==='parede-sem-oclusao'?2:9);results.push({name,status:run.status,failures,ok});console.log(name,ok?'KILLED':'SURVIVED',failures);}
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
