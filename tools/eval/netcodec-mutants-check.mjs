// Mutação em cópia isolada do codec: só a cláusula comportamental indicada pode cair.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const original=fs.readFileSync(path.join(root,'public/js/netcodec.js'),'utf8');
const cases=[
  ['crouch-mudo','version >= 9 && ent.crouch ? 8 : 0','false ? 8 : 0',['R1']],
  ['recarga-muda','w.u8(qTenths(ent.reloadIn));','w.u8(0);',['R2','R6']],
  ['emote-mudo','w.u8(emoteId);','w.u8(0);',['R3','R9']],
  ['fase-zero','w.u8(emoteId ? qTenths(ent.emoteElapsed) : 0);','w.u8(0);',['R3']],
  ['v8-contaminado','version >= 9 && ent.crouch ? 8 : 0','ent.crouch ? 8 : 0',['R5']],
  // Comportamento antigo: um ID de catálogo mais novo derrubava o snapshot inteiro.
  ['emote-desconhecido-derruba-snapshot','const emote = V9_EMOTE_IDS[emoteId - 1] ?? null;',
    "if (emoteId > V9_EMOTE_IDS.length) throw new RangeError('emote'); const emote = V9_EMOTE_IDS[emoteId - 1] ?? null;",['R8']],
  ['v9-vaza-id-novo','new Map(V9_EMOTE_IDS.map((id, i) => [id, i + 1]))',
    "new Map([...V9_EMOTE_IDS, 'capoeira'].map((id, i) => [id, i + 1]))",['R9']],
];
let failures=0;
function run(name,file,expected){
  const r=spawnSync(process.execPath,['--test','--test-reporter=tap','tests/netcodec-v9.test.mjs'],{cwd:root,encoding:'utf8',timeout:20000,
    env:{...process.env,CODEC_UNDER_TEST:pathToFileURL(file).href}});
  const actual=[...(r.stdout||'').matchAll(/^not ok \d+ - (R\d+) /gm)].map(m=>m[1]).sort();
  const pass=!r.error&&!r.signal&&!r.stderr&&/^# tests 9$/m.test(r.stdout||'')
    &&r.status===(expected.length?1:0)&&JSON.stringify(actual)===JSON.stringify([...expected].sort());
  console.log(JSON.stringify({name,pass,exit:r.status,failed:actual,expected}));
  if(!pass){failures++;console.error(r.stdout,r.stderr);}
}
run('nominal',path.join(root,'public/js/netcodec.js'),[]);
for(const [name,before,after,expected] of cases){
  if(original.split(before).length!==2)throw Error(`INFRA: âncora ${name} ausente/ambígua`);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rede3p-codec-'));
  try{
    fs.writeFileSync(path.join(temp,'package.json'),'{"type":"module"}');
    fs.mkdirSync(path.join(temp,'data'));
    for(const file of ['weapons.js','emote-catalog.js'])fs.copyFileSync(path.join(root,'public/js/data',file),path.join(temp,'data',file));
    const file=path.join(temp,'netcodec.js');fs.writeFileSync(file,original.replace(before,after));
    run(name,file,expected);
  }finally{fs.rmSync(temp,{recursive:true});}
}
process.exitCode=failures?1:0;
