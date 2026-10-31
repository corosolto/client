import {sonda,pula} from './sonda-filho.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const out=process.env.OUT || '/tmp/treta-ui-mutations';
mkdirSync(out,{recursive:true});
const cases=[['preview',/Failed base-only preview must block purchase/],['framing',/Skin body must fit the camera/],['manifest',/Unapproved manifest must keep the skin in production/]];
let failed=false;
for(const [mutant,expected] of cases){
  const run=sonda([new URL('./treta-ui-browser.mjs',import.meta.url).pathname,`--mutant=${mutant}`],{env:{...process.env,OUT:resolve(out,mutant)},timeout:180000,maxBuffer:1024*1024});
  const log=String(run.stdout || '')+String(run.stderr || '');
  writeFileSync(resolve(out,`${mutant}.log`),log);
  /* Vermelho já medido em mutants anteriores vence o SKIP deste (issue #1133). */
  if(!run.mediu){if(failed)process.exitCode=1;pula(run.causa,`treta-ui ${mutant}`);}
  const detected=run.status!==0 && expected.test(log);
  console.log(`${detected?'DETECTED':'FAIL'} ${mutant} · ${resolve(out,`${mutant}.log`)}`);
  if(!detected)failed=true;
}
process.exitCode=failed?1:0;
