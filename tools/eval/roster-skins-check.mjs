/* RS1 a RS6: skin de personagem comprada é PERSONAGEM SELECIONÁVEL no modal TODOS OS
 * PERSONAGENS (pedido do dono, 23/10/2026), e não só um card da loja.
 *
 * Roda o treta-store.js REAL num vm (sem browser, sem rede) e lê o fonte do main.js para
 * provar a fiação do modal. Posse, venda e nome vêm do catálogo do servidor; arte e
 * aprovação vêm de public/models/skins/manifest.json. Nada de número ou nome inventado.
 *
 * Mutantes (--mutante=<nome>), cada um apaga/inverte UMA linha do fonte real:
 * sem-disponivel, sem-aprovado, sem-posse, sem-desequipar, sem-redesenho */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { TRETA_SKINS, TRETA_WEAPON_SKINS, TRETA_GLOVES, TRETA_PACKS, TRETA_EYEWEAR } from '../../public/js/treta-catalog.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const MUT = arg('mutante');

const MUTANTES = {
  'sem-disponivel': ['loja', "    if(!posse || server.available!==true || (server.slot || 'character')!=='character')continue;\n", "    if(!posse || (server.slot || 'character')!=='character')continue;\n"],
  'sem-aprovado': ['loja', '    if(!arte || arte.approved!==true || arte.model!==server.model_path || arte.character!==server.character_id)continue;\n', ''],
  'sem-posse': ['loja', '    const posse=inventory.find(p=>p.skin_id===server.id);\n', '    const posse=inventory.find(p=>p.skin_id!==server.id);\n'],
  'sem-desequipar': ['main', '        if (equipada) {\n', '        if (!equipada) {\n'],
  'sem-redesenho': ['main', "if(!$('hub-roster-modal')?.hidden)hubRosterRender?.();", ''],
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }
const muta = (alvo, fonte) => {
  if (!MUT || MUTANTES[MUT][0] !== alvo) return fonte;
  const [, velho, novo] = MUTANTES[MUT];
  const n = fonte.replace(velho, novo);
  if (n === fonte) { console.error(`MUTANTE ${MUT} NAO APLICOU`); process.exit(2); }
  return n;
};

let falhas = 0;
const caso = (id, nome, fn) => {
  try { fn(); console.log(`PASS ${id} ${nome}`); }
  catch (e) { falhas++; console.log(`RED  ${id} ${nome}: ${String(e.message).split('\n')[0]}`); }
};

const fonteLoja = muta('loja', read('public/js/treta-store.js'));
const fonteMain = muta('main', read('public/js/main.js'));
const MANIFESTO = JSON.parse(read('public/models/skins/manifest.json')).skins;

/* O módulo da loja é de browser: só os imports saem, o corpo roda inteiro no vm. */
function carrega() {
  const corpo = fonteLoja.replace(/^import .*$/gm, '').replace(/^export /gm, '');
  const ctx = {
    TRETA_SKINS, TRETA_WEAPON_SKINS, TRETA_GLOVES, TRETA_PACKS, TRETA_EYEWEAR,
    document: { addEventListener: () => {}, getElementById: () => null },
  };
  vm.runInNewContext(`${corpo}\n;globalThis.__api={skinsDeArmario,tretaSkinsDoArmario};`, ctx);
  return ctx.__api;
}
const api = carrega();

/* Catálogo do servidor espelhando o manifesto real: o nome é do SERVIDOR de propósito,
   diferente do nome do catálogo local do cliente (treta-catalog.js). */
const servidor = (id, extra = {}) => ({
  id, name: `Skin ${id} do servidor`, character_id: MANIFESTO[id].character, price: 300,
  model_path: MANIFESTO[id].model, available: true, slot: 'character', weapon_id: null, ...extra,
});
const posse = (id, equipped = false) => ({ skin_id: id, equipped, slot: 'character', weapon_id: null });
/* O vm tem Array próprio: trazer a lista para cá antes de comparar. */
const aqui = (lista) => [...lista];
const ids = (lista) => aqui(lista).map((s) => s.id);

caso('RS1', 'skin não possuída fica de fora; a possuída entra no armário', () => {
  const catalogo = [servidor('lula-drip'), servidor('bolsonaro-drip')];
  const armario = api.skinsDeArmario([posse('lula-drip')], catalogo, MANIFESTO);
  assert.deepEqual(ids(armario), ['lula-drip']);
  assert.equal(armario[0].character, 'barbudo');
  assert.equal(armario[0].poster, MANIFESTO['lula-drip'].poster);
  assert.deepEqual(ids(api.skinsDeArmario([], catalogo, MANIFESTO)), []);
});

caso('RS2', 'skin com available:false no catálogo do servidor fica de fora', () => {
  const catalogo = [servidor('lula-drip', { available: false }), servidor('bolsonaro-drip')];
  const armario = api.skinsDeArmario([posse('lula-drip', true), posse('bolsonaro-drip')], catalogo, MANIFESTO);
  assert.deepEqual(ids(armario), ['bolsonaro-drip']);
});

caso('RS3', 'manifesto manda: approved:false ou model fora do model_path fica de fora', () => {
  assert.equal(MANIFESTO['lula-na-regua'].approved, false, 'fixture: lula-na-regua deixou de ser a skin em revisão');
  const naoAprovada = api.skinsDeArmario(
    [posse('lula-na-regua', true), posse('bolsonaro-drip')],
    [servidor('lula-na-regua'), servidor('bolsonaro-drip')], MANIFESTO);
  assert.deepEqual(ids(naoAprovada), ['bolsonaro-drip']);
  const modeloTrocado = api.skinsDeArmario(
    [posse('lula-drip', true), posse('bolsonaro-drip')],
    [servidor('lula-drip', { model_path: '/models/skins/lula-drip-000000000000.glb' }), servidor('bolsonaro-drip')], MANIFESTO);
  assert.deepEqual(ids(modeloTrocado), ['bolsonaro-drip']);
  const personagemTrocado = api.skinsDeArmario(
    [posse('lula-drip', true), posse('bolsonaro-drip')],
    [servidor('lula-drip', { character_id: 'capitao' }), servidor('bolsonaro-drip')], MANIFESTO);
  assert.deepEqual(ids(personagemTrocado), ['bolsonaro-drip']);
  const semManifesto = api.skinsDeArmario([posse('lula-drip', true)], [servidor('lula-drip')], undefined);
  assert.deepEqual(aqui(semManifesto), [], 'sem manifesto carregado nada pode entrar no armário');
});

caso('RS4', 'equipped vem do inventário e o nome vem do catálogo do SERVIDOR', () => {
  const catalogo = [servidor('lula-drip', { name: 'Barbudo do Servidor' }), servidor('bolsonaro-drip', { name: 'Capitão do Servidor' })];
  const ligado = api.skinsDeArmario([posse('lula-drip', true), posse('bolsonaro-drip', true)], catalogo, MANIFESTO);
  const desligado = api.skinsDeArmario([posse('lula-drip', false), posse('bolsonaro-drip', false)], catalogo, MANIFESTO);
  assert.deepEqual(aqui(ligado).map((s) => s.equipped), [true, true]);
  assert.deepEqual(aqui(desligado).map((s) => s.equipped), [false, false]);
  assert.deepEqual(aqui(ligado).map((s) => s.name), ['Barbudo do Servidor', 'Capitão do Servidor']);
  const localDoCliente = TRETA_SKINS.find((s) => s.id === 'lula-drip').name;
  assert.equal(aqui(ligado).some((s) => s.name === localDoCliente), false, `nome saiu do catálogo local (${localDoCliente})`);
});

caso('RS5', 'fiação do modal: armário no openHubRoster, equipar na célula de skin, desequipar no personagem base', () => {
  const importa = fonteMain.split('\n').find((l) => l.includes("from './treta-store.js'"));
  for (const nome of ['tretaSkinsDoArmario', 'equiparTretaSkin', 'desequiparTretaSkin']) {
    assert.ok(importa.includes(nome), `main.js não importa ${nome} da loja`);
  }
  const inicio = fonteMain.indexOf('function openHubRoster(');
  const fim = fonteMain.indexOf('\nlet currentEnemyFaction', inicio);
  assert.ok(inicio >= 0 && fim > inicio, 'openHubRoster não encontrado no main.js');
  const roster = fonteMain.slice(inicio, fim);
  assert.ok(/const armario = tretaSkinsDoArmario\(\);/.test(roster), 'openHubRoster não lê o armário');
  assert.ok(/hub-roster-cell hub-roster-cell--skin/.test(roster), 'não há célula de skin na grade');
  assert.ok(/skinButton\.onclick = async \(\) => \{[\s\S]{0,200}?equiparTretaSkin\(skin\.id\)/.test(roster), 'clique da skin não equipa a skin');
  assert.ok(/if \(equipada\) \{\s*\n\s*try \{ if \(!await desequiparTretaSkin\(\)\) throw new Error/.test(roster), 'clique do personagem base não desequipa a skin equipada');
  assert.ok(/aria-pressed', String\(def\.id === currentChar && !equipada\)/.test(roster), 'personagem base segue aceso com skin equipada');
  assert.ok(/aria-pressed', String\(skin\.equipped && def\.id === currentChar\)/.test(roster), 'célula de skin não reflete o equipado');
  assert.ok(/hub-roster-selected'\)\.textContent = `Selecionado:[^`]*\$\{skinAtual \? ` · \$\{skinAtual\.name\}` : ''\}`/.test(roster), 'a linha Selecionado não mostra a skin');
  assert.ok(/hubRosterRender = render;/.test(roster), 'openHubRoster não publica o render do modal');
  const start=fonteMain.indexOf('function refreshMenuEquipment()');
  const end=fonteMain.indexOf('let hubMapReturnQuick',start);
  assert.ok(start>=0 && end>start,'handler de equipamento ausente');
  const registration=fonteMain.split('\n').find(line=>line.startsWith("document.addEventListener('cs-treta-inventory-change',"));
  assert.ok(registration,'evento de equipamento sem inscrição');
  const modal={hidden:false},events=new EventTarget();let renders=0;
  vm.runInNewContext(fonteMain.slice(start,end)+'\n'+registration,{
    document:events,$:id=>id==='hub-roster-modal'?modal:null,selChar:null,
    syncHomeCharacter:()=>{},hubRosterRender:()=>{renders++;},
  });
  events.dispatchEvent(new Event('cs-treta-inventory-change'));
  assert.equal(renders,1,'o armário que chega depois do boot não redesenha o modal aberto');
  modal.hidden=true;events.dispatchEvent(new Event('cs-treta-inventory-change'));
  assert.equal(renders,1,'modal fechado não deve ser redesenhado');
});

caso('RS6', 'sem conta e sem inventário o armário é vazio: o modal fica igual ao de hoje', () => {
  const catalogo = [servidor('lula-drip'), servidor('bolsonaro-drip')];
  for (const inventario of [null, undefined, []]) {
    assert.deepEqual(aqui(api.skinsDeArmario(inventario, catalogo, MANIFESTO)), [], `inventário ${JSON.stringify(inventario)}`);
  }
  assert.deepEqual(aqui(api.skinsDeArmario([posse('lula-drip')], null, MANIFESTO)), []);
  assert.deepEqual(aqui(api.tretaSkinsDoArmario()), [], 'acessor sem estado carregado');
});

console.log(falhas ? `\n${falhas} RED${MUT ? ` [mutante ${MUT}]` : ''}` : `\nroster-skins: tudo verde${MUT ? ` [mutante ${MUT} NÃO pegou]` : ''}`);
process.exit(falhas ? 1 : (MUT ? 3 : 0));
