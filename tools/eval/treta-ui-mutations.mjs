import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const out=process.env.OUT || '/tmp/treta-ui-mutations';
mkdirSync(out,{recursive:true});
const cases=[['preview',/Failed base-only preview must block purchase/],['framing',/Skin body must fit the camera/],['manifest',/Unapproved manifest must keep the skin in production/]];
let failed=false;
for(const [mutant,expected] of cases){
  const run=spawnSync(process.execPath,[new URL('./treta-ui-browser.mjs',import.meta.url).pathname,`--mutant=${mutant}`],{env:{...process.env,OUT:resolve(out,mutant)},encoding:'utf8',timeout:180000,maxBuffer:1024*1024});
  const log=String(run.stdout || '')+String(run.stderr || '');
  writeFileSync(resolve(out,`${mutant}.log`),log);
  const detected=run.status!==0 && expected.test(log);
  console.log(`${detected?'DETECTED':'FAIL'} ${mutant} · ${resolve(out,`${mutant}.log`)}`);
  if(!detected)failed=true;
}
process.exitCode=failed?1:0;
