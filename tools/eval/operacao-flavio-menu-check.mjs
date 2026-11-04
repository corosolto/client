// Ponte do menu e renderizador Treta Pop reais; DOM mínimo para rótulos e posse dos botões.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
let modos = readFileSync(new URL('../../public/js/tp/modos.js', import.meta.url), 'utf8');
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const edits = {
  'preferencia': ['main', 'mapa: currentMap, modo: modoEfetivoAtual(), objetivo: modoObjetivoAtual(),', 'mapa: currentMap, modo: matchMode, objetivo: modoObjetivoAtual(),'],
  'sem-objetivo': ['main', 'objetivo: modoObjetivoAtual(),', 'objetivo: false,'],
  'botoes-ativos': ['modos', 'b.disabled = !!est.objetivo;', 'b.disabled = false;'],
  'rotulo': ['modos', "est.objetivo ? 'ESCOLTA' : est.modo", 'est.modo'],
};
if (mutant) {
  const edit = edits[mutant];
  assert.ok(edit, 'mutante conhecido');
  let source = edit[0] === 'main' ? main : modos;
  assert.equal(source.split(edit[1]).length, 2, 'alvo único');
  source = source.replace(edit[1],edit[2]);
  if (edit[0] === 'main') main = source; else modos = source;
  console.log('Mutação aplicada: '+mutant);
}
const init = main.slice(main.indexOf("let matchMode ="), main.indexOf('const menuSetup ='));
const bridge = main.match(/estado: \(\) => \((\{ mapa: currentMap,[^\n]+\})\),/)?.[1];
assert.ok(bridge, 'ponte Treta Pop presente');
const start = modos.indexOf('function pintar() {');
assert.ok(start >= 0, 'renderizador presente');
let depth = 0, end = -1;
for (let i = modos.indexOf('{', start); i < modos.length; i++) {
  if (modos[i] === '{') depth++;
  if (modos[i] === '}' && --depth === 0) { end = i+1; break; }
}
assert.ok(end > start);
const element = () => ({ textContent: '', disabled: false, dataset: {}, attrs: {},
  setAttribute(k,v) { this.attrs[k] = v; }, appendChild() {}, replaceChildren() {},
  querySelector() { return element(); }, querySelectorAll() { return []; } });
let failures = 0;
for (const [map, preference] of [['operacao_flavio','ctf'],['operacao_flavio','rounds'],['normal','ctf']]) {
  const objective = map === 'operacao_flavio';
  const state = new Function('MAPS','currentMap','settings','matchRounds', init+
    '\nmatchMode='+JSON.stringify(preference)+';return ('+bridge+');')(
      { operacao_flavio: { objectiveMode: 'operacao_flavio' }, normal: {} }, map,
      { pinnedChars: [], allyBots: 2, enemyBots: 2 }, () => 5);
  const buttons = ['rounds','ctf'].map(mode => Object.assign(element(), { dataset: { modo: mode } }));
  const eye = element(), scope = {
    api: () => ({ estado: () => state, mapas: () => [{ id: map, cats: [], nome: map }] }),
    tela: { modos: { querySelectorAll: () => buttons }, lista: element(), ficha: { querySelector: () => eye },
      painel: element(), giro: element(), escalacao: element() },
    PASSOS: {}, ARMAS: [['all','TODAS']], BOTS: [['normal','NORMAL']], tr: text => text, el: element,
  };
  // Cada seletor da ficha tem seu próprio nó, como no DOM real.
  scope.tela.ficha.querySelector = selector => selector === '.tp-modos__olho' ? eye : element();
  try {
    vm.runInNewContext(modos.slice(start,end)+';pintar();',scope,{timeout:250});
    assert.equal(state.modo, objective ? 'rounds' : preference);
    assert.match(eye.textContent, objective ? /^ESCOLTA/ : /^CAPTURA/);
    assert.ok(buttons.every(b => b.disabled === objective));
    assert.equal(buttons.filter(b => b.attrs['aria-pressed'] === 'true').length, objective ? 0 : 1);
    console.log('ok menu-objective-'+map+'-'+preference);
  } catch(error) { failures++; console.error('FALHA menu-objective-'+map+'-'+preference+': '+error.message); }
}
process.exitCode = failures ? 1 : 0;
