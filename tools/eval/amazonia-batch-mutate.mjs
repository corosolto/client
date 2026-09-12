// Regressões encontradas pela revisão: a régua genérica deve continuar a vê-las.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{resolve}from'node:path';import{pathToFileURL}from'node:url';import{spawnSync}from'node:child_process';
const source=readFileSync('public/js/map_amazonia.js','utf8'),out='artifacts/amazonia-visual/batch-mutants';mkdirSync(out,{recursive:true});
const trials=[
 ['decoracao-solida','mesh.userData.nonSolidSurface||','','MAP1'],
 ['deck-sem-guarda','[[-1.6, -.1], [1.5, 1.6]]','[]','MAP6'],
 ['borda-float32','const edgeEpsilon = 1e-6','const edgeEpsilon = 0','MAP1'],
];const results=[];
for(const[name,from,to,clause]of trials){if(source.split(from).length!==2)throw Error(`alvo não único: ${name}`);
 const file=resolve(`${out}/${name}.mjs`);writeFileSync(file,source.replace(from,to).replace(/from '\.\/([^']+)'/g,(_,p)=>`from '${pathToFileURL(resolve('public/js',p)).href}'`));
 const code=`const h=await import('./tools/eval/harness.mjs');h.MAPS.amazonia.build=(await import(${JSON.stringify(pathToFileURL(file).href)})).buildAmazonia;process.argv=[process.execPath,'tools/eval/map-check.mjs','amazonia'];await import('./tools/eval/map-check.mjs');`;
 const run=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',maxBuffer:2000000});writeFileSync(`${out}/${name}.log`,run.stdout+run.stderr);
 const failures=[...((run.stdout+run.stderr).matchAll(/^(MAP\d) FALHA/gm))].map(m=>m[1]);const ok=run.status===1&&failures.length===1&&failures[0]===clause;
 results.push({name,clause,status:run.status,failures,ok});console.log(name,ok?'KILLED':'SURVIVED',failures.join(','));
}writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
