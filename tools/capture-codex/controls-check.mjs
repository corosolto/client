import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const runtime = readFileSync(new URL('./runtime.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const marker = "    panel.querySelectorAll('[data-look]')";
const helper = runtime.indexOf('    function lookBy(');
const start = helper < 0 ? runtime.indexOf(marker) : helper;
const end = runtime.indexOf("    panel.querySelector('#capture-release')", start);
assert(start >= 0 && end > start, 'Callbacks locais encontrados');
let callbacks = runtime.slice(start, end);
if (process.argv.includes('--mutar=sem-finally')) callbacks = callbacks.replace('current.paused = paused;', '');
const bind = new Function('game', 'panel', 'valid', 'report', 'MouseEvent', callbacks);
const mmStart = source.indexOf('    this._mm = e => {');
const mmEnd = source.indexOf('    this._wh =', mmStart);
assert(mmStart >= 0 && mmEnd > mmStart, 'Handler de mouse original encontrado');
const bindMouse = new Function(source.slice(mmStart, mmEnd));
const inputStart = source.indexOf('  _acceptInput() {');
const inputEnd = source.indexOf('\n  /* Chat de sala', inputStart);
assert(inputStart >= 0 && inputEnd > inputStart, 'Gate de input original encontrado');
const acceptInput = new Function(`return ({${source.slice(inputStart, inputEnd)}})._acceptInput;`)();

let passed = 0, failed = 0;
function check(name, options, selector, value, expected, { throws = false, events = 1 } = {}) {
  const buttons = [{dataset:{look:'90'}}, {dataset:{pitch:'45'}},
    {dataset:{turn:'45'}}, {dataset:{turn:'90'}}, {dataset:{turn:'-90'}}];
  const emitted = [], reports = [];
  const keys = {KeyW:true, KeyC:true};
  const game = {
    paused:true, online:false, state:'live', testMode:true, _entradaTravada:false,
    camView:'third', keys, mouseDown0:true,
    settings:{sens:1, invertY:false}, camera:{fov:70},
    player:{alive:true, scoped:false, yaw:0, pitch:0, pos:{x:3,y:1,z:4}},
    _acceptInput:acceptInput,
    setPaused() { throw new Error('setPaused altera inputs/UI'); },
    update() { throw new Error('Ajuste de mira não pode simular tempo'); },
  };
  for (const [key, option] of Object.entries(options)) {
    if (['settings','camera','player'].includes(key)) Object.assign(game[key], option);
    else game[key] = option;
  }
  const paused = game.paused, pos = {...game.player.pos};
  class MouseEvent {
    constructor(type, init) { this.type = type; this.altKey = false; Object.assign(this, init); }
  }
  bindMouse.call(game);
  game.renderer = {domElement:{dispatchEvent(event) {
    emitted.push(event);
    if (throws) throw new Error('Falha de despacho');
    game._mm(event);
  }}};
  const panel = {querySelectorAll(query) {
    const key = query.slice('[data-'.length, -1);
    return buttons.filter(button => key in button.dataset);
  }};
  try {
    bind(game, panel, () => !game.online, message => reports.push(message), MouseEvent);
    const button = buttons.find(button => button.dataset[selector] === value);
    assert.equal(typeof button?.onclick, 'function', 'Callback do botão existe');
    try { button.onclick(); } catch (error) { if (!throws) throw error; }
    assert.equal(game.paused, paused, 'Pausa restaurada');
    assert.equal(game.keys, keys, 'Identidade das teclas preservada');
    assert.deepEqual(game.keys, {KeyW:true, KeyC:true}, 'Teclas pressionadas preservadas');
    assert.equal(game.mouseDown0, true, 'Tiro pressionado preservado');
    assert.deepEqual(game.player.pos, pos, 'Posição preservada');
    assert.equal(emitted.length, events, 'Exatamente um evento ou bloqueio');
    assert(emitted.every(event => event.type === 'mousemove' && !event.altKey), 'Só mousemove sem Alt');
    for (const [key, target] of Object.entries(expected)) {
      assert(Math.abs(game.player[key] - target) < 1e-12, `${key}=${game.player[key]}, esperado=${target}`);
    }
    console.log(`ok ${name}`); passed++;
  } catch (error) { console.log(`FALHA ${name}: ${error.message}`); failed++; }
}

check('olhar fino durante pausa', {}, 'look', '90', {yaw:-0.189});
check('pitch invertido durante pausa', {settings:{invertY:true}}, 'pitch', '45', {pitch:0.0945});
check('olhar em partida ativa preserva inputs', {paused:false}, 'look', '90', {yaw:-0.189});
check('45 graus com sensibilidade0.5', {settings:{sens:0.5}}, 'turn', '45', {yaw:-Math.PI/4});
check('90 graus com zoom e sensibilidade2', {settings:{sens:2},player:{scoped:true},camera:{fov:22}}, 'turn', '90', {yaw:-Math.PI/2});
check('90 graus esquerda com piso do zoom', {player:{scoped:true},camera:{fov:10}}, 'turn', '-90', {yaw:Math.PI/2});
check('finally restaura pausa quando despacho falha', {}, 'look', '90', {yaw:0}, {throws:true});
check('entrada travada bloqueada', {_entradaTravada:true}, 'look', '90', {yaw:0}, {events:0});
check('partida online bloqueada', {online:true}, 'turn', '90', {yaw:0}, {events:0});
check('jogador morto bloqueado', {player:{alive:false}}, 'pitch', '45', {pitch:0}, {events:0});
check('fim de round bloqueado e pausa restaurada', {state:'roundEnd'}, 'look', '90', {yaw:0}, {events:0});
check('sensibilidade inválida bloqueada', {settings:{sens:0}}, 'turn', '90', {yaw:0}, {events:0});
console.log(`${passed} ok, ${failed} falhas`);
process.exit(failed ? 1 : 0);
