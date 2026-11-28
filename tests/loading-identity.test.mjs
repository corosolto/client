import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { heroUrl, bustoUrl, recorteUrl, retratoFontes } from '../public/js/data/retratos.js';

const src = path => readFileSync(new URL(`../public/js/${path}`, import.meta.url), 'utf8');
const main = src('main.js'), renderer = src('tp/carregamento.js');
const original = {id:'gotinha',name:'Zé da Gotinha',team:'E'};
const chosen = {id:'barbudo',name:'Barbudo',team:'P'};
const skin = 'lula-cyborg', poster = '/img/skins/lula-cyborg.webp';
const version = 'fixture';

function between(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `trecho real ausente: ${start}`);
  return source.slice(a, b);
}
function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length, 2, `mutação exige uma âncora única: ${from}`);
  return source.replace(from, to);
}
function element(tag) {
  return {tag, children:[], dataset:{}, style:{setProperty(){}}, textContent:'',
    get childElementCount() { return this.children.length; },
    append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; },
    addEventListener() {},
  };
}
function find(node, fn) {
  if (fn(node)) return node;
  for (const child of node.children) { const hit = find(child, fn); if (hit) return hit; }
}

async function play({ welcome, mutate } = {}) {
  const m = mutate === 'M1' ? replaceOnce(main, 'eu: loadingPlayer,', 'eu: CHARACTERS[0],') : main;
  const html = mutate === 'M2' ? replaceOnce(renderer, 'retrato(p.id, p.retratos)', "retrato(p.voce ? 'gotinha' : p.id, p.voce ? undefined : p.retratos)") : renderer;
  const window = {dispatchEvent() {}};
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, element('div')); return nodes.get(id); };
  const canvas = element('canvas');
  const roster = welcome ? {net:{meta:welcome, yourEnt:welcome.yourEnt, espectador:welcome.espectador}} : null;
  const context = vm.createContext({
    $: node, window, VERSION:version, CHARACTERS:[original,chosen], heroUrl, recorteUrl, bustoUrl, retratoFontes,
    LANG:'pt', tr:x=>x, nomeTimeJavaporcos:()=>null, urlDoBrasao:()=>'/flag.svg', JAVAPORCO_RETRATO:'/horde.webp',
    document:{documentElement:{dataset:{ui:'v3'}},createElement:element,getElementById:id=>id==='load-character-3d'?canvas:node(id),dispatchEvent(){}},
    CustomEvent:class {}, q:node, box:{dataset:{}}, raiz:element('div'), espelha(){},
    tretaSkinPresentation:(id,charId)=>!welcome&&id===skin&&charId===chosen.id?{poster}:null,
    tretaRosterSkinPoster:async (id,charId)=>id===skin&&charId===chosen.id?poster:null,
    equippedTretaSkin:id=>id===chosen.id?skin:null, tretaStoreReady:Promise.resolve(),
    sfx:{uiClick(){}}, selChar:chosen, switchMode:false, game:null, HUB_ENABLED:false, personagemTravado:()=>false,
    ladoValido:(_def,side)=>side, currentTeam:'E', currentFaction:'E', currentChar:original.id,
    mpSessao:roster, lancamentoPerdeu:()=>false, ehMapaJavaporcos:()=>false,
    currentMap:'fixture', MAPS:{fixture:{name:'Mapa'}}, MAP_DESC:{}, mapPreviewPoster:()=>null,
    settings:{pinnedChars:[],allyBots:0,enemyBots:0}, podeNoLado:()=>true, pickMatchRoster:()=>({allyDefs:[],enemyDefs:[]}),
    modoEfetivoAtual:()=>'', matchMode:'', matchRounds:()=>0, sanitizeRounds:()=>0,
    LEAN:false, loadingStage:{show(_faction,{player}) { canvas.dataset.character=player.id; canvas.dataset.skin=player.skinId; return Promise.resolve(); }},
    bodyPreloads:Promise.resolve(), _vmStartWeapon:'pistol',
  });
  const boot = between(m, '  const tamanhoTime = sessao', '  const playerEyewearId =');
  const model = between(m, '      if (!LEAN && loadingPlayer', '      await aguardarPreloads');
  const script = [
    between(m, 'async function loadingPortraits(', '\nfunction showLoadingPortrait'),
    between(m, 'const portraitUrl =', '\n/* Rede de segurança'),
    between(m, 'function rosterDoServidor(', '\n/* Sessão de rede'),
    `let pending; function startGame(side,charId,enemyFac,online){ return pending = prepare(side,charId,enemyFac,online); }
     async function prepare(side,charId,enemyFac,online){
       const sessao = online ? mpSessao : null, faction = side, meuLancamento = {};
       const charDef = CHARACTERS.find(c => c.id === charId) || {};
       ${boot}
       ${model}
       return { player: charId, allies: matchRoster.allyDefs.map(c => c.id).join(',') };
     }`,
    between(m, 'async function mpMontarPartida(', '\n/* O personagem escolhido vale'),
    between(m, "$('char-confirm').onclick", '\n// A tela tem somente'),
    between(html, 'const ATE_BANNER', '\nexport function ligar'),
    between(html, '  const monta =', '\n  let visivel'),
    '({monta, mpMontarPartida, pending:()=>pending})',
  ].join('\n');
  const app = vm.runInNewContext(script, context);
  if (welcome) await app.mpMontarPartida(roster.net, welcome);
  else node('char-confirm').onclick();
  const gameplay = await app.pending();
  app.monta(window.__tpElenco);
  const chars = ['E','B'].flatMap(side => {
    const cards = node(`.tp-carga__lado[data-time="${side}"]`);
    return (cards.children[1]?.children || []).map(vaga => vaga.children[0]).filter(card => !Object.hasOwn(card.dataset,'vazia'));
  });
  const info = card => ({name:find(card,n=>n.className==='tp-carga__n')?.textContent,
    src:find(card,n=>n.className==='tp-carga__retrato')?.src});
  return {you:info(chars.find(card=>Object.hasOwn(card.dataset,'voce'))), others:chars.filter(card=>!Object.hasOwn(card.dataset,'voce')).map(info), model:canvas.dataset, gameplay};
}

function checkIntention(result) {
  assert.equal(result.you.name, chosen.name, 'identidade anunciada deve corresponder à confirmação');
  assert.equal(result.you.src, `${poster}?v=${version}`, 'src efetivo deve corresponder à skin equipada');
  assert.deepEqual(result.model, {character:chosen.id,skin}, 'o palco recebe o corpo e a skin confirmados');
}

test('confirmação offline mantém personagem, retrato da skin e modelo', async () => checkIntention(await play()));
test('M1: trocar somente eu no payload reprova por identidade', async () => {
  const result = await play({mutate:'M1'});
  assert.throws(() => checkIntention(result), /identidade anunciada/);
});
test('M2: trocar um retrato válido por outro reprova pelo src', async () => {
  const result = await play({mutate:'M2'});
  assert.equal(result.you.name, chosen.name);
  assert.ok(result.you.src?.includes('/gotinha.webp'));
  assert.throws(() => checkIntention(result), /src efetivo/);
});
test('MP: visitante vê o poster e o modelo da skin atribuída pelo servidor', async () => {
  checkIntention(await play({welcome:{yourTeam:'E',yourEnt:1,faccaoE:'E',faccaoB:'B',teamSize:1,
    roster:[{id:1,team:'E',char:chosen.id,skinId:skin}]}}));
});
for (const [label, char] of [['ausente',undefined],['desconhecido','id-de-outra-versao']]) {
  test(`MP: id ${label} não anuncia o fallback de gameplay`, async () => {
    const result = await play({welcome:{yourTeam:'E',yourEnt:1,faccaoE:'E',faccaoB:'B',teamSize:2,
      roster:[{id:1,team:'E',char,skinId:skin},{id:2,team:'E',char,skinId:skin},{id:3,team:'B',char:chosen.id}]}});
    assert.deepEqual(result.you, {name:'Personagem não identificado',src:undefined});
    assert.deepEqual(result.model, {});
    assert.deepEqual(result.others.map(card=>card.name), ['Personagem não identificado',chosen.name]);
    assert.equal(result.others[0].src, undefined);
    assert.equal(result.gameplay.player, original.id);
    assert.equal(result.gameplay.allies, original.id);
  });
}
