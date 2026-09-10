import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { carregarMapIds } from '../audio/map-ids.mjs';
import { extendMapSoundscapes } from '../audio/extend-map-soundscapes.mjs';

const dir=mkdtempSync(join(tmpdir(),'mansao-audio-')),asset='audio/a/ambiente.wav';
try {
  mkdirSync(join(dir,'audio/a'),{recursive:true});writeFileSync(join(dir,asset),'fixture\n');
  const ids=carregarMapIds(),maps=Object.fromEntries(ids.filter(id=>id!=='mansao').map(id=>[id,{loops:[{src:asset,global:true,vol:.06,pos:[0,0,0],radius:240}]}]));
  const manifest={fixtureCapacity:Array(250).fill(asset),mapSoundscapes:maps},before=structuredClone(maps);
  const ledger=join(dir,'ledger.json');writeFileSync(ledger,JSON.stringify({prefixoDerivado:'audio/piloto/',raizesRuntime:[],fontes:{},derivados:[],piloto:[]}));
  const check=()=>{writeFileSync(join(dir,'audio/manifest.json'),JSON.stringify(manifest));return spawnSync(process.execPath,['tools/eval/assets-check.mjs',`--raiz=${dir}`,`--ledger=${ledger}`,'--so=runtime-audio'],{encoding:'utf8'});};
  const red=check();assert.notEqual(red.status,0);assert.match(red.stderr+red.stdout,/mansao/);
  assert.ok(extendMapSoundscapes(manifest));
  for(const id of Object.keys(before))assert.deepEqual(maps[id],before[id],'Preserva mapas existentes');
  assert.deepEqual(maps.mansao,before.parque_treta);assert.notEqual(maps.mansao,maps.parque_treta);
  assert.equal(check().status,0,'Pack estendido passa no mesmo assert:assets que bloqueou Vercel');
  assert.equal(extendMapSoundscapes(manifest),false,'Idempotente');
  maps.mansao={synth:{kind:'indoor-hum',vol:.01}};const curated=maps.mansao;
  assert.equal(extendMapSoundscapes(manifest),false);assert.equal(maps.mansao,curated,'Override curado é preservado');
  delete maps.mansao;delete maps.parque_treta;delete maps.corrego;delete maps.quebrada;
  assert.equal(extendMapSoundscapes(manifest),false,'Sem doador válido não inventa caminho');
  assert.notEqual(check().status,0,'Não mascara pack sem origem');
  console.log('AUDIO MANSÃO PASS: pack antigo vermelho, extensão real, preservação e idempotência');
} finally {rmSync(dir,{recursive:true,force:true});}
