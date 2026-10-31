// Funções e callback reais do formulário, com DOM/rede locais; sem abrir sala remota.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let source = readFileSync(new URL('../../public/js/main.js',import.meta.url),'utf8');
const mutant=process.argv.find(arg=>arg.startsWith('--mutante='))?.split('=')[1];
const edits={
  'sem-prune':['  for (const id of [...mpMapasEscolhidos]) if (!mpMapaCompativel(id)) mpMapasEscolhidos.delete(id);',''],
  'sem-validacao':["    if (aDedo && escolhidos.some((id) => !mpMapaCompativel(id)))\n      return mpErro('Operação Flávio exige rounds e pelo menos 2 por time. Ajuste modo/tamanho ou desmarque o mapa.');",''],
  'ctf-permitido':["mpEl('mp-modo')?.value !== 'ctf' &&",'true &&'],
  'x1-permitido':["+(mpEl('mp-teamsize')?.value || 5) >= 2", "+(mpEl('mp-teamsize')?.value || 5) >= 1"],
  'sem-modo-evento':["    mpEl('mp-modo').addEventListener('change', () => mpSincronizarMapas());",''],
  'sem-tamanho-evento':["    mpEl('mp-teamsize').addEventListener('change', () => mpSincronizarMapas());",''],
};
if(mutant){
  const edit=edits[mutant];assert.ok(edit,'mutante conhecido');assert.equal(source.split(edit[0]).length,2,'alvo único');
  source=source.replace(...edit);console.log('Mutação aplicada: '+mutant);
}
const begin = source.indexOf('/* Mapas da sala escolhidos a dedo.');
const end = source.indexOf('async function mpCarregarMapasDoNo()',begin);
const createBegin = source.indexOf("  const criar = mpEl('mp-criar');",end);
const createEnd = source.indexOf('  /* JOGAR COM AMIGOS:',createBegin);
const mountBegin = source.indexOf('function mpMontarFormulario() {',end);
const syncBegin = source.indexOf('function mpSincronizarMapas() {',end);
const syncEnd = source.indexOf('function mpDesenharNos()',syncBegin);
assert.ok(begin >= 0 && end > begin && createBegin > end && createEnd > createBegin,'fronteiras reais únicas');
const maps = {
  operacao_flavio: { name:'OPERAÇÃO FLÁVIO',objectiveMode:'escort' },
  ferro_velho: { name:'FERRO VELHO' },
  outro_objetivo: { name:'OUTRO OBJETIVO',objectiveMode:'outro' },
};
const fixture = (ctf,teamSize,ids) => {
  const elements = new Map(), calls = { tickets:0,creates:[],errors:[] };
  const el = id => {
    if(!elements.has(id)) {
      const listeners=new Map();
      elements.set(id,{value:'',checked:false,hidden:false,innerHTML:'',textContent:'',querySelectorAll:()=>[],
        addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list);},
        dispatch(type){for(const fn of listeners.get(type)||[]) fn();},
      });
    }
    return elements.get(id);
  };
  el('mp-modo').value=ctf?'ctf':'rounds';
  el('mp-teamsize').value=String(teamSize);
  el('mp-rotacao').value='escolher';
  const context=vm.createContext({
    MAPS:maps,MAPAS_MENU:Object.keys(maps),VERSION:'qa',mpEl:el,$:el,
    mapPreviewPoster:id=>id+'.webp',ui:{hover(){},click(){}},mpNoAtual:{http:'http://fixture.invalid'},
    mpErro:message=>calls.errors.push(message),
    obterMpTicket:async()=>{calls.tickets++;return 'fixture';},
    createRoom:async(_url,body)=>{calls.creates.push(body);return {id:'local',convite:'LOCAL'};},
    listRooms:async()=>[],mpModalSalaCriada(){},
  });
  vm.runInContext(source.slice(begin,end)+source.slice(syncBegin,syncEnd)+source.slice(mountBegin,createBegin)+'}\n'+source.slice(createBegin,createEnd),context);
  vm.runInContext('mpMapasDoNo='+JSON.stringify(Object.keys(maps))+';mpMapasEscolhidos=new Set('+JSON.stringify(ids)+');',context);
  return {context,el,calls};
};
let failures=0;
async function check(name,fn){
  try{await fn();console.log('ok '+name);}
  catch(error){failures++;console.error('FALHA '+name+': '+error.message);}
}
for(const [field,value] of [['mp-modo','ctf'],['mp-teamsize','1']]) {
  await check('mudança real do campo atualiza a grade '+field,()=>{
    const f=fixture(false,2,['operacao_flavio']);
    vm.runInContext('mpMontarFormulario();mpMontarFormulario()',f.context);
    assert.equal(vm.runInContext('mpMapasEscolhidos.has("operacao_flavio")',f.context),true);
    f.el(field).value=value;f.el(field).dispatch('change');
    assert.equal(vm.runInContext('mpMapasEscolhidos.has("operacao_flavio")',f.context),false);
    assert.match(f.el('mp-mapas-grade').innerHTML,/<button[^>]*data-id="operacao_flavio"[^>]*disabled/);
  });
  await check('selecionar todos respeita o campo '+field,()=>{
    const f=fixture(false,2,[]);
    vm.runInContext('mpMontarFormulario()',f.context);
    f.el(field).value=value;
    f.el('mp-mapas-todos').onclick();
    assert.equal(vm.runInContext('mpMapasEscolhidos.has("operacao_flavio")',f.context),false);
    assert.equal(vm.runInContext('mpMapasEscolhidos.has("ferro_velho")',f.context),true);
  });
}
for(const [ctf,teamSize] of [[true,2],[false,1]]){
  await check('grade exclui seleção incompatível '+ctf+'/'+teamSize,()=>{
    const f=fixture(ctf,teamSize,['operacao_flavio']);
    vm.runInContext('mpPintarMapas()',f.context);
    assert.equal(vm.runInContext('mpMapasEscolhidos.has("operacao_flavio")',f.context),false);
    const html=f.el('mp-mapas-grade').innerHTML;
    assert.match(html,/<button[^>]*data-id="operacao_flavio"[^>]*disabled/);
    assert.match(f.el('mp-mapas-conta').textContent,/Flávio.*(?:2|dois).*por (?:time|lado)/i);
  });
  await check('criação recusa seleção obsoleta antes do ticket '+ctf+'/'+teamSize,async()=>{
    const f=fixture(ctf,teamSize,['operacao_flavio']);
    await f.el('mp-criar').onclick();
    assert.equal(f.calls.tickets,0,'incompatibilidade não chama a rede');
    assert.equal(f.calls.creates.length,0);
    assert.ok(f.calls.errors.some(error=>/Flávio/i.test(error)),'erro explica o modo incompatível');
  });
}
for(const [name,ctf,teamSize,id] of [
  ['Flávio com defensor',false,2,'operacao_flavio'],
  ['CTF comum X1 preservado',true,1,'ferro_velho'],
  ['outro objetivo X1 preservado',false,1,'outro_objetivo'],
]) await check(name,async()=>{
  const f=fixture(ctf,teamSize,[id]);
  vm.runInContext('mpPintarMapas()',f.context);
  assert.equal(vm.runInContext('mpMapasEscolhidos.has('+JSON.stringify(id)+')',f.context),true);
  await f.el('mp-criar').onclick();
  assert.equal(f.calls.tickets,1);
  assert.equal(f.calls.creates.length,1);
  assert.equal(f.calls.creates[0].mapId,id);
  assert.equal(f.calls.creates[0].ctf,ctf);
  assert.equal(f.calls.creates[0].teamSize,teamSize);
});
process.exitCode=failures?1:0;
