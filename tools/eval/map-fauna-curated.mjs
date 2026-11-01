// Escadão e Lajes usavam galinha sem albedo e gato atlas256 apesar do acervo Mint.
// Referências identificam arquivos; aprovação visual e movimento exigem runtime real.
import { assetUrl } from '../../public/js/data/asseturl.js';
import { faunaResponseError, faunaDocumentURL } from './map-fauna-response-proof.mjs';
// Um mapa pode ter vários tipos curados (campomorro/corrego: gato E galinha):
// o censo exige uma amostra por mapa cobrindo todos os tipos referenciados.
export function auditCuratedFaunaCensus(data, references, {base}={}) {
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
  const reports=failures.length?[]:data.results.map(sample=>auditCuratedFauna(sample,references,{base}));
  return {pass:!failures.length&&reports.every(r=>r.pass),reports,failures};
}

export function auditCuratedFauna(sample, references, {base}={}) {
  const failures=[];
  const fail=(family,detail)=>failures.push({family,detail});
  let expectedDocumentURL;try{expectedDocumentURL=faunaDocumentURL(base,sample?.map);}catch{}
  const refs=references.filter(r=>r.map===sample?.map);
  if(!refs.length)fail('scope','Mapa sem referência curada; não pode receber PASS.');
  for(const a of sample?.animals||[])if(!refs.some(r=>r.type===a?.type))fail('count',`${sample?.map}/${a?.id}: tipo ${String(a?.type)} sem referência curada; não aprovar fauna fora do censo.`);
  const seenIds=new Set();
  for(const a of sample?.animals||[]){
    const key=`${a?.type}/${a?.id}`;
    if(seenIds.has(key))fail('identity',`${sample?.map}/${key}: animal duplicado na captura.`);
    seenIds.add(key);
  }
  for(const ref of refs){
    const animals=(sample.animals||[]).filter(a=>a.type===ref.type);
    if(animals.length!==ref.count)fail('count',`${ref.map}/${ref.type}: ${animals.length}/${ref.count}; não remover fauna para aprovar.`);
    const expectedIds=new Set(ref.animalIds||[]);
    if(expectedIds.size!==ref.count||animals.some(a=>!expectedIds.has(a.id))||[...expectedIds].some(id=>!animals.some(a=>a.id===id)))fail('identity',`${ref.map}/${ref.type}: IDs autorados ausentes, desconhecidos ou inválidos.`);
    for(const a of animals){
      const id=`${ref.map}/${a.id}`;
      if(a.source!=='gltf')fail('source',`${id}: fallback em vez do GLB curado.`);
      if(a.assetId!==ref.assetId||a.assetPath!==ref.path)fail('identity',`${id}: ${a.assetId} / ${a.assetPath}; esperado ${ref.assetId} / ${ref.path}.`);
      let expectedURL;try{expectedURL=new URL(assetUrl(ref.path),expectedDocumentURL).href;}catch{}
      const responseError=faunaResponseError(a.response,ref,a,sample.document,expectedURL,expectedDocumentURL);
      if(responseError)fail('response',`${id}: ${responseError}.`);
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
      if(ref.fleeSpace===true){
        // Regra original da Lajes, inalterada: 16 casos, pico > .5, apoio por groundHeightAt.
        const cases=a.fleeSpace?.cases,expected=new Set([3,8].flatMap(w=>Array.from({length:8},(_,angle)=>`${w}/${angle}`)));
        if(!Array.isArray(cases)||cases.length!==expected.size)fail('space',`${id}: censo de fugas espaciais ausente ou incompleto.`);
        else for(const c of cases){
          const key=`${c?.warmup}/${c?.angle}`;
          if(!expected.delete(key)||c.frames!==1200||c.dt!==1/60||c.obstacleOverlaps!==0||c.supportMisses!==0
            ||!Number.isFinite(c.maxHalfExtent)||c.maxHalfExtent<=0||c.maxHalfExtent>.5||!Number.isFinite(c.peakDistance)||c.peakDistance<=.5||c.rejoined!==true)
            fail('space',`${id}: fuga ${key} sem passagem livre, apoio, deslocamento ou retorno comprovados.`);
        }
      } else if(ref.fleeSpace&&typeof ref.fleeSpace==='object'){
        // Modos novos (ground/roof): mesmo esqueleto de censo, apoio e limite por modo.
        // Override por animal é da referência revisada (repo confiável), nunca do runtime.
        const per=(ref.fleeSpace.animals||{})[a.id]||{};
        const mode=per.mode||ref.fleeSpace.mode;
        const minEscape=Object.prototype.hasOwnProperty.call(per,'minEscapeDistance')?per.minEscapeDistance:.5;
        if(!['ground','roof'].includes(mode)||!Number.isFinite(minEscape)||minEscape<0||(minEscape===0&&mode!=='roof'))fail('space',`${id}: referência espacial inválida.`);
        const cases=a.fleeSpace?.cases,expected=new Set([3,8].flatMap(w=>Array.from({length:8},(_,angle)=>`${w}/${angle}`)));
        if(!Array.isArray(cases)||cases.length!==expected.size)fail('space',`${id}: censo de fugas espaciais ausente ou incompleto (modo ${mode}).`);
        else for(const c of cases){
          const key=`${c?.warmup}/${c?.angle}`;
          if(!expected.delete(key)||c.frames!==1200||c.dt!==1/60||c.obstacleOverlaps!==0||c.supportMisses!==0
            ||!Number.isFinite(c.maxHalfExtent)||c.maxHalfExtent<=0||c.maxHalfExtent>.5
            ||!Number.isFinite(c.peakDistance)||c.peakDistance<=minEscape||c.rejoined!==true
            ||c.mode!==mode
            ||!Number.isFinite(c.maxRenderedDelta)||c.maxRenderedDelta<0
            ||!Number.isFinite(c.roofTriangles)||(mode==='roof'?c.roofTriangles<1:c.roofTriangles!==0)
            ||(mode!=='roof'&&!Number.isFinite(c.minSlopeSpan)))
            fail('space',`${id}: fuga ${key} sem passagem livre, apoio (${mode}), deslocamento > ${minEscape} ou retorno comprovados.`);
        }
      }
    }
  }
  return {pass:failures.length===0,scope:sample?.map,failures};
}
