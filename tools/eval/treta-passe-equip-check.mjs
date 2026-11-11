// Contrato do passe: catálogo local não é posse nem oferta; equipamento exige catálogo e inventário do servidor.
// Execução: node tools/eval/treta-passe-equip-check.mjs [--mutations]
// Arnês executa o store real com estado e API simulados: não comprova concessão no servidor nem renderização.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import * as catalog from '../../public/js/treta-catalog.js';
import {WEAPON_SKINS} from '../../public/js/data/weapon-skin-definitions.js';

const storePath = new URL('../../public/js/treta-store.js', import.meta.url);
const mainPath = new URL('../../public/js/main.js', import.meta.url);
let source = fs.readFileSync(storePath, 'utf8');
let main = fs.readFileSync(mainPath, 'utf8');
const mutations = {
  'sem-passe': [' || TRETA_PASSE_WEAPON_SKINS.find(s=>s.id===id) || TRETA_EYEWEAR', ' || TRETA_EYEWEAR', 'passe não reconhecido'],
  'sem-posse': ['!skin || !owned(id) || !available(id)', '!skin || !available(id)', 'equip sem posse'],
  'sem-servidor': ['if(!server || !client || server.available!==true)return false;', 'if(!server || !client)return false;', 'catálogo indisponível'],
  'arma-divergente': ['server.weapon_id===client.weapon', 'true', 'arma divergente'],
  'modelo-divergente': ["server.slot==='weapon' && server.weapon_id===client.weapon && server.model_path===client.model", "server.slot==='weapon' && server.weapon_id===client.weapon", 'modelo divergente'],
  'passe-vitrine': ['...TRETA_WEAPON_SKINS,...TRETA_GLOVES', '...TRETA_WEAPON_SKINS,...TRETA_PASSE_WEAPON_SKINS,...TRETA_GLOVES', 'passe na vitrine'],
  'faca-sem-fallback': ["playerPack?.knifeSkin || equippedTretaWeaponSkin('knife') || null", 'playerPack?.knifeSkin || null', 'faca sem fallback'],
  'faca-sem-pack': ["playerPack?.knifeSkin || equippedTretaWeaponSkin('knife') || null", "equippedTretaWeaponSkin('knife') || playerPack?.knifeSkin || null", 'precedência da faca'],
};
if (process.argv.includes('--mutations')) {
  for (const [id, , , message] of Object.entries(mutations).map(([id, args]) => [id, ...args])) {
    const result = spawnSync(process.execPath, [new URL(import.meta.url).pathname, `--mutante=${id}`], {encoding:'utf8'});
    assert(result.status !== 0 && result.stderr.includes(message), `${id}: mutante não falhou pela invariante esperada; ${result.stderr}`);
  }
  console.log(`PASS: ${Object.keys(mutations).length} mutantes detectados`);
  process.exit(0);
}
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
if (mutant) {
  const spec = mutations[mutant]; assert(spec, `mutante desconhecido: ${mutant}`);
  const [from, to] = spec;
  const isMain = mutant.startsWith('faca-');
  const text = isMain ? main : source;
  assert.equal(text.split(from).length, 2, `MUTANTE NÃO APLICOU: ${mutant}`);
  if (isMain) main = text.replace(from, to); else source = text.replace(from, to);
}
source = source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const season = Object.values(WEAPON_SKINS).filter(s => s.passe?.season === 'sessao-da-treta-s1');
assert.equal(season.length, 15, 'passe deve conter 15 definições');
const noop = () => {};
const requests = [];
const document = {addEventListener:noop, dispatchEvent:noop, getElementById:()=>({}), querySelectorAll:()=>[]};
const context = vm.createContext({...catalog, document, window:{}, CustomEvent:class {},
  socialApi:async (_path, body)=>{requests.push(body); return context.serverState;},
});
const api = new vm.Script(source + `\ndraw=()=>{};updateBuy=()=>{};notifyEquipment=()=>{};({setState:s=>{state=s},equippedTretaWeaponSkin,equiparTretaSkin,tretaWeaponPresentation,tretaVitrine,abrirTretaSkin});`).runInContext(context);
for (const skin of season) {
  assert.equal(skin.storeEnabled, false, `${skin.id}: passe vendável`);
  const server = {id:skin.id,slot:'weapon',weapon_id:skin.storeWeapon,model_path:`/models/weapons/${skin.storeWeapon}.glb`,available:true};
  const owned = {skin_id:skin.id,equipped:true};
  const state = {accountId:'fixture',inventory:[owned],catalog:[server]};
  context.serverState=state; api.setState(state);
  assert.equal(api.equippedTretaWeaponSkin(skin.storeWeapon), skin.id, `${skin.id}: passe não reconhecido`);
  assert.equal(api.tretaWeaponPresentation(skin.storeWeapon,skin.id)?.name, skin.name, `${skin.id}: apresentação ausente`);
  assert(!api.tretaVitrine().some(s=>s.id===skin.id), `${skin.id}: passe na vitrine`);
  assert.equal(api.abrirTretaSkin(skin.id), false, `${skin.id}: detalhe de venda acessível`);
  assert.equal(await api.equiparTretaSkin(skin.id), true, `${skin.id}: equip recusado`);
  assert.equal(requests.at(-1)?.action, 'equip', `${skin.id}: ação indevida`);
  api.setState({...state,inventory:[]});
  const before=requests.length;
  assert.equal(await api.equiparTretaSkin(skin.id),false,`${skin.id}: equip sem posse`);
  assert.equal(requests.length,before,`${skin.id}: requisição sem posse`);
  assert.equal(api.equippedTretaWeaponSkin(skin.storeWeapon),null,`${skin.id}: getter sem posse`);
  for (const [change, message] of [[{available:false},'catálogo indisponível'],[{weapon_id:'outra'},'arma divergente'],[{model_path:'/outro.glb'},'modelo divergente']]) {
    api.setState({...state,catalog:[{...server,...change}]});
    assert.equal(api.equippedTretaWeaponSkin(skin.storeWeapon),null,`${skin.id}: ${message}`);
    assert.equal(await api.equiparTretaSkin(skin.id),false,`${skin.id}: ${message}`);
  }
  api.setState({...state,catalog:[]});
  assert.equal(await api.equiparTretaSkin(skin.id),false,`${skin.id}: catálogo ausente`);
}
const knifeLine=main.match(/const playerKnifeSkinId = ([^;]+);/);
assert(knifeLine,'atribuição real da faca não reconhecida');
const knife=(playerPack, fallback)=>vm.runInNewContext(knifeLine[1],{playerPack,equippedTretaWeaponSkin:id=>id==='knife'?fallback:null});
assert.equal(knife(null,'arma-03'),'arma-03','faca sem fallback');
assert.equal(knife({knifeSkin:'pack-faca'},'arma-03'),'pack-faca','precedência da faca');
assert.equal(knife(null,null),null,'faca sem equipamento');
console.log(`PASS: ${season.length} itens, posse/catálogo/equip/vitrine e precedência da faca; API simulada`);
