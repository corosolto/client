// Sonda de materiais efetivamente usados; rollbacks R3 seguem os pixels independentes.
// Não aprova aparência: contexto, crops e regressões em R3-MATERIAL-CORRECTIONS.md.
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const { THREE, MAPS, initTextures, seedRandom } = await import('./harness.mjs');
const {registerDetail,detailFor} = await import('../../public/js/textures.js');
const { preloadPropGeometry } = await import('./prop-geometry-fixture.mjs');
globalThis.localStorage = {getItem:()=>'{"quality":"medium"}',setItem(){}};
const corregoCLI = fileURLToPath(new URL('./corrego-masonry-material-check.mjs', import.meta.url));
const corregoBudget = {timeout:60_000, maxBuffer:1024*1024};
function medirCorrego(mutante = null) {
  let child, resultado;
  const recibo = {id:'corrego', checker:'corrego-masonry-material-check.mjs', mutante,
    node:process.version, timeoutMs:corregoBudget.timeout, maxBufferBytes:corregoBudget.maxBuffer};
  try {
    child = spawnSync(process.execPath, [corregoCLI, ...(mutante ? [`--mutante=${mutante}`] : [])], {
      encoding:'utf8', cwd:fileURLToPath(new URL('../../', import.meta.url)),
      ...corregoBudget, shell:false, killSignal:'SIGKILL',
    });
    assert.equal(child.error, undefined, 'Córrego: falha ao executar CLI dedicada');
    assert.equal(child.signal, null, 'Córrego: CLI dedicada terminou por sinal');
    assert.equal(child.status, mutante ? 1 : 0, 'Córrego: exit incompatível com o contrato dedicado');
    resultado = JSON.parse(child.stdout);
    assert.ok(resultado && typeof resultado === 'object' && !Array.isArray(resultado), 'Córrego: recibo JSON não é objeto');
    assert.equal(resultado.mutante, mutante, 'Córrego: identidade do mutante divergente');
    if (mutante) {
      assert.deepEqual(Object.keys(resultado).sort(), ['esperado','falhas','mutante','obtido','veredito']);
      const esperado = {'muro-samplers':1, 'muro-sampler-transform':1};
      assert.equal(resultado.veredito, 'RED');
      assert.deepEqual(resultado.esperado, esperado);
      assert.deepEqual(resultado.obtido, esperado);
      assert.ok(Array.isArray(resultado.falhas), 'Córrego: falhas ausentes');
      for (const f of resultado.falhas) {
        assert.ok(f && typeof f === 'object' && !Array.isArray(f), 'Córrego: falha malformada');
        assert.deepEqual(Object.keys(f).sort(), ['id','msg']);
        assert.equal(typeof f.msg, 'string');
        assert.ok(f.msg.trim(), 'Córrego: falha sem mensagem');
      }
      assert.deepEqual(resultado.falhas.map(f=>f.id).sort(), Object.keys(esperado).sort());
    } else {
      assert.deepEqual(Object.keys(resultado).sort(), ['cru','falhas','muros','mutante','veredito']);
      assert.equal(resultado.veredito, 'GREEN');
      assert.deepEqual(resultado.falhas, []);
      assert.equal(resultado.muros, 8);
      assert.equal(resultado.cru, 1);
    }
  } catch (error) {
    console.log(JSON.stringify({...recibo, exit:child?.status ?? null, signal:child?.signal ?? null,
      childError:child?.error?.code ?? null, pass:false,
      erro:error.message.slice(0,1200), stdoutTail:child?.stdout?.slice(-2000) ?? '',
      stderrTail:child?.stderr?.slice(-2000) ?? ''}));
    throw error;
  }
  console.log(JSON.stringify({...recibo, exit:child.status, signal:child.signal, resultado, pass:true}));
}
let fail = 0;
for (const id of ['escadao','mansao','penitenciaria','corrego','amazonia']) {
  if (id === 'corrego') {
    medirCorrego();
    if (process.argv.includes('--self-test')) {
      medirCorrego('repeat-diverge');
      console.log('Mutante morto: '+id);
    }
    continue;
  }
  await preloadPropGeometry(MAPS[id].props); seedRandom(12345);
  let serragemSource;
  const load = THREE.TextureLoader.prototype.load;
  if(id==='amazonia') THREE.TextureLoader.prototype.load=function(url,...args){
    const texture=load.call(this,url,...args);
    if(url==='/img/textures/tex_madeira_serragem.webp')serragemSource=texture.source;
    return texture;
  };
  let world;
  try { const scene=new THREE.Scene(); world=MAPS[id].build(scene,initTextures()); }
  finally { THREE.TextureLoader.prototype.load=load; }
  const meshes=[];world.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  let material;
  if(id==='escadao') material=meshes.find(o=>Math.abs(o.position.x-1.5)<.0001 && Math.abs(o.position.y-.6)<.0001 && Math.abs(o.position.z-14.5)<.0001)?.material;
  if(id==='mansao') material=meshes.find(o=>o.userData.mansaoFeature==='interior-surface' && o.userData.surfaceType==='floor')?.material;
  if(id==='penitenciaria') material=meshes.find(o=>o.material?.map?.name==='penitenciaria-poca')?.material;
  if(id==='amazonia') material=meshes.find(o=>o.material?.color?.getHex()===0x76604a && o.material?.roughness===1 && o.material?.map?.repeat?.x===5)?.material;
  assert.ok(material,`Cannot measure runtime material: ${id}`);
  const measure = m => id==='escadao' ? !!m.map && m.map.image?.width===128 : id==='mansao' ? m.map?.image?.width===256 && m.roughness===.58 : id==='amazonia' ? !!serragemSource && m.map?.source===serragemSource && m.map.repeat.x===5 && m.map.repeat.y===4 && m.color.getHex()===0x76604a && m.roughness===1 : m.roughness===.07 && m.metalness===.4;
  const data={id,map:material.map?.name,size:material.map?.image?.width,roughness:material.roughness,metalness:material.metalness,...(id==='amazonia'?{usesLoadedSerragem:material.map?.source===serragemSource,repeat:material.map?.repeat?.toArray()}:{}),pass:measure(material)};
  console.log(JSON.stringify(data));if(!data.pass)fail++;
  if(process.argv.includes('--self-test') && data.pass){
    const mutant=material.clone();
    if(id==='escadao')mutant.map=null;
    if(id==='amazonia'){
      const rejected=execFileSync('git',['show','bd7ec16336204211b2a18c31ddc3eef95b1b2c19:public/js/map_surface_finish.js'],{encoding:'utf8'});
      const create=new Function('THREE','registerDetail','detailFor',rejected.replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const|let)\b)/g,'')+';return forestLeafLitter;')(THREE,registerDetail,detailFor);
      const leaf=create(5,4);leaf.name=material.map.name;
      mutant.map=leaf;assert.notEqual(mutant.map.source,material.map.source,'R2 leaf replacement did not apply');
    }
    if(id==='mansao')mutant.map=new THREE.DataTexture(new Uint8Array(16*16*4),16,16);
    if(id==='penitenciaria'){mutant.roughness=.34;mutant.metalness=.04;}
    assert.ok(!measure(mutant),`Blind runtime mutation: ${id}`);console.log('Mutante morto: '+id);
  }
}
assert.equal(fail,0,'Runtime fabrication gaps remain; this probe does not judge appearance.');
