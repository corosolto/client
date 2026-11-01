// Escadão e Lajes usavam galinha sem albedo e gato atlas256 apesar do acervo Mint.
// Referências identificam arquivos; aprovação visual e movimento exigem runtime real.
export function auditCuratedFaunaCensus(data, references) {
  const failures=[],expected=new Set(references.map(r=>r.map)),seen=new Set();
  if(!Array.isArray(data?.results))return {pass:false,reports:[],failures:[{family:'census',detail:'Captura runtime ausente ou results inválido.'}]};
  for(const sample of data.results){
    const map=sample?.map;
    if(!expected.has(map))failures.push({family:'census',detail:`Mapa inesperado: ${String(map)}.`});
    if(seen.has(map))failures.push({family:'census',detail:`Mapa duplicado: ${String(map)}.`});
    seen.add(map);
  }
  for(const map of expected)if(!seen.has(map))failures.push({family:'census',detail:`Mapa ausente: ${map}.`});
  // Um censo incompleto não deve produzir aprovações parciais enganosas.
  const reports=failures.length?[]:data.results.map(sample=>auditCuratedFauna(sample,references));
  return {pass:!failures.length&&reports.every(r=>r.pass),reports,failures};
}

export function auditCuratedFauna(sample, references) {
  const failures=[];
  const fail=(family,detail)=>failures.push({family,detail});
  const refs=references.filter(r=>r.map===sample?.map);
  if(!refs.length)fail('scope','Mapa sem referência curada; não pode receber PASS.');
  for(const ref of refs){
    const animals=(sample.animals||[]).filter(a=>a.type===ref.type);
    if(animals.length!==ref.count)fail('count',`${ref.map}/${ref.type}: ${animals.length}/${ref.count}; não remover fauna para aprovar.`);
    for(const a of animals){
      const id=`${ref.map}/${a.id}`;
      if(a.source!=='gltf')fail('source',`${id}: fallback em vez do GLB curado.`);
      if(a.assetId!==ref.assetId||a.assetPath!==ref.path)fail('identity',`${id}: ${a.assetId} / ${a.assetPath}; esperado ${ref.assetId} / ${ref.path}.`);
      if(!(sample.declaredPreload||[]).includes(ref.assetId))fail('declaredPreload',`${id}: modelo instanciado fora do preload declarado.`);
      const mats=(a.meshes||[]).flatMap(m=>m.materials||[]);
      if(!mats.length)fail('materials',`${id}: nenhum material medido.`);
      for(const [i,mat] of mats.entries())for(const [channel,size] of Object.entries(ref.textures)){
        const tex=mat[channel];
        if(!tex||!Number.isFinite(tex.width)||!Number.isFinite(tex.height)||!(tex.width>=size[0]&&tex.height>=size[1])||tex.colorSpace!==(channel==='albedo'?'srgb':''))fail('texture',`${id}/material${i}/${channel}: textura decodificada ${size.join('x')} e espaço de cor esperado ausentes.`);
      }
      if(!/idle$/i.test(a.actions?.idle||'')||!/walk$/i.test(a.actions?.walk||''))fail('clips',`${id}: Idle/Walk ausentes.`);
      if(ref.run&&!/run$/i.test(a.actions?.run||''))fail('clips',`${id}: Run ausente.`);
      if(ref.speed&&(!a.speed||a.speed.walk!==ref.speed.walk||a.speed.flee!==ref.speed.flee))fail('speed',`${id}: cadência diferente do rig de referência.`);
      const motion=a.motion;
      if(!motion||!Number.isFinite(motion.distance)||motion.distance<=0||!Number.isInteger(motion.localPoseChanges)||motion.localPoseChanges<=0||!/walk$/i.test(motion.activeClip||''))fail('motion',`${id}: deslocamento com Walk e mudança local do rig não demonstrados.`);
      if(ref.turnRate&&(a.turnRate!==ref.turnRate||!Number.isFinite(motion?.maxYawDelta)||motion.maxYawDelta<0||motion.maxYawDelta>ref.turnRate/60+1e-9))fail('turn',`${id}: giro excede o limite por tick 1/60 ou não foi medido.`);
    }
  }
  return {pass:failures.length===0,scope:sample?.map,failures};
}
