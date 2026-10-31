/* ============================================================================
   mode-check.mjs — O MODO ESCOLHIDO É O MODO JOGADO? (alimenta a MOD2)
   ----------------------------------------------------------------------------
   POR QUE EXISTE (defeito relatado pelo dono, com estas palavras)
     "esse mapa está como CAPTURA, mas eu selecionei SINGLE PLAYER — e esse erro
      se repete em outros mapas"
   Causa: `gotoMap` (public/js/main.js) reescrevia `matchMode` a CADA troca de mapa,
   incondicionalmente, com o padrão do mapa. No fluxo do menu o carrossel de mapas vem
   DEPOIS da escolha do modo, então navegar até a Loja H / o Ferro Velho apagava um
   "SINGLE PLAYER" recém-clicado, e navegar até os outros três apagava um "CAPTURE THE
   FLAG". A invariante que existia (MOD1) só confere que `ctfOnly` sumiu do registro de
   mapas — mede o MAPA, e quem forçava o modo era o MENU.

   COMO ELE MEDE (e por que não é regex)
   Um teste que procurasse a string `matchMode =` em `gotoMap` mediria a FORMA do código,
   não o comportamento: bastaria alguém reescrever o mesmo bug com outro nome pra ele ficar
   verde. Aqui o arnês EXECUTA O CÓDIGO DE PRODUÇÃO: recorta do main.js, por casamento de
   chaves, o texto EXATO de
       - o bloco de inicialização de `matchMode` (e da bandeira de escolha, se houver),
       - `openSetup` (o que os itens SINGLE PLAYER / CAPTURE THE FLAG chamam),
       - `gotoMap`   (o que o carrossel de mapas chama),
       - o handler de clique do badge de modo,
       - a EXPRESSÃO que o startGame passa pro Game em `ctf:`,
   e roda isso num sandbox com o resto do menu stubado. Importar o main.js inteiro não é
   opção: ele constrói WebGLRenderer, áudio e bloom na carga.
   Se algum desses trechos deixar de existir com a forma esperada, o arnês FALHA em vez de
   passar — portão verde por ausência de dado é o modo de falha que este projeto já teve.

   OS CASOS: todos os mapas × três modos. Em cada um o jogador faz o que faz de verdade —
   escolhe o modo, navega no carrossel e aperta JOGAR. O que se compara é o par
   `ctf`/`arena` que o Game receberia contra o modo pedido.

   Uso: node tools/eval/mode-check.mjs [--json]
   ============================================================================ */
import { readFileSync, writeSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const ARGS = process.argv.slice(2);
const MUTANTE = ARGS.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
const DRIVER = ARGS.includes('--mutantes'), META = ARGS.includes('--selftest');
const JSON_OUT = ARGS.includes('--json');
const known = ['--json', '--mutantes', '--selftest', '--mutante=sem-backdrop', '--mutante=arena-no-construtor'];
if (new Set(ARGS).size !== ARGS.length || ARGS.some((a) => !known.includes(a))
    || ((DRIVER || META) && ARGS.length !== 1)
    || (!DRIVER && !META && ARGS.length > (MUTANTE ? 2 : 1))) {
  console.error('uso: mode-check [--json] [--mutante=sem-backdrop] | --mutantes | --selftest'); process.exit(2);
}
if (MUTANTE === 'arena-no-construtor' && (!JSON_OUT || process.env.MODECHECK_DRIVER_PROV !== MUTANTE)) {
  console.error('setup: arena-no-construtor exige o driver'); process.exit(2);
}
let SRC = readFileSync(path.join(ROOT, 'public', 'js', 'main.js'), 'utf8');
if (MUTANTE === 'arena-no-construtor') {
  const anchor = 'game = new Game({';
  if (SRC.split(anchor).length !== 2) throw new Error('setup: newGame não único');
  const obj = bloco(SRC, anchor), matches = [...obj.matchAll(/\barena:\s*[^,]+,/g)];
  if (matches.length !== 1) throw new Error('setup: campo arena do newGame não único');
  const offset = SRC.indexOf(anchor) + matches[0].index, field = matches[0][0];
  const before = SRC;
  SRC = SRC.slice(0, offset) + 'arena: false,' + SRC.slice(offset + field.length);
  if (SRC === before) throw new Error('setup: arena-no-construtor não aplicado');
  writeSync(2, 'MODECHECK_APPLIED:arena-no-construtor\n');
}
const MAPSRC = readFileSync(path.join(ROOT, 'public', 'js', 'maps.js'), 'utf8');

/* ---- recorte por casamento de chaves (não por regex de linha inteira) ---- */
function bloco(fonte, ancora, abre = '{', fecha = '}') {
  const i = fonte.indexOf(ancora);
  if (i < 0) throw new Error(`âncora não encontrada no main.js: ${ancora}`);
  let j = fonte.indexOf(abre, i), n = 0;
  if (j < 0) throw new Error(`abre-chaves não encontrado após: ${ancora}`);
  for (let k = j; k < fonte.length; k++) {
    if (fonte[k] === abre) n++;
    else if (fonte[k] === fecha) { n--; if (n === 0) return fonte.slice(i, k + 1); }
  }
  throw new Error(`chaves desbalanceadas após: ${ancora}`);
}

// inicialização: da linha `let matchMode` até a última linha seguida que ainda fala de modo
function blocoInicial() {
  const linhas = SRC.split('\n');
  const i = linhas.findIndex((l) => /^let matchMode\s*=/.test(l));
  if (i < 0) throw new Error('não achei `let matchMode =` no topo do main.js');
  const out = [linhas[i]];
  let emComentario = false;   // um /* ... */ no meio do bloco não pode ser cortado ao meio
  for (let k = i + 1; k < linhas.length; k++) {
    const l = linhas[k];
    if (emComentario) { out.push(l); if (l.includes('*/')) emComentario = false; continue; }
    if (/^\s*\/\*/.test(l)) { out.push(l); if (!l.includes('*/')) emComentario = true; continue; }
    if (/^\s*\/\//.test(l)) { out.push(l); continue; }
    if (/matchMode|modoEscolhido/.test(l) && /^(let|const|if|var)\b/.test(l.trim())) { out.push(l); continue; }
    break;
  }
  return out.join('\n');
}

const INIT = blocoInicial();
const OPEN_SETUP = bloco(SRC, 'const openSetup = (mode, title, act) =>');
const SELECT_MODE = bloco(SRC, 'function selectMatchMode(');
const MODE_CHOSEN = (SRC.match(/^let modoEscolhido = .*$/m) || [])[0];
if (!MODE_CHOSEN) throw new Error('não achei `let modoEscolhido =` no main.js');
const GOTO_MAP = bloco(SRC, 'function gotoMap(');
const MAP_IDX = (SRC.match(/^let mapIdx = .*$/m) || [])[0];
if (!MAP_IDX) throw new Error('não achei `let mapIdx =` no main.js');
// handler do badge de modo: o corpo do addEventListener('click', ...) dentro do bloco `mm`
const BADGE = (() => {
  const i = SRC.indexOf("if (mm) mm.addEventListener('click'");
  if (i < 0) throw new Error('não achei o handler de clique do badge de modo');
  return bloco(SRC.slice(i), "mm.addEventListener('click'");
})();
// a expressão que vai pro Game: ancorada no objeto REAL `game = new Game({` do main.js
// (RED da crítica: o primeiro `arena:` solto era o __tpElenco, não o Game). Fail-closed:
// âncora única + cada propriedade exatamente 1x dentro do objeto recortado por chaves.
const NEWGAME_ANCORA = 'game = new Game({';
{
  const n = SRC.split(NEWGAME_ANCORA).length - 1;
  if (n !== 1) throw new Error(`âncora \`${NEWGAME_ANCORA}\` não é única no main.js (${n}x)`);
}
const NEWGAME = bloco(SRC, NEWGAME_ANCORA);
const prop = (nome) => {
  const m = [...NEWGAME.matchAll(new RegExp(`\\b${nome}:\\s*([^,]+),`, 'g'))];
  if (m.length !== 1) throw new Error(`esperava exatamente 1 \`${nome}:\` no objeto new Game, achei ${m.length}`);
  return m[0][1];
};
const CTF_EXPR = prop('ctf');
const ARENA_EXPR = prop('arena');

/* ---- registro de mapas: lido do maps.js, sem importar (evita puxar three) ---- */
const MAP_IDS = [...MAPSRC.matchAll(/^\s{2}(\w+):\s*\{/gm)].map((m) => m[1]);
const MAPS = Object.fromEntries(MAP_IDS.map((id) => {
  const i = MAPSRC.indexOf(`\n  ${id}:`);
  const linha = MAPSRC.slice(i, MAPSRC.indexOf('\n', i + 1) + 1);
  return [id, { name: id, ctfMode: /ctfMode:\s*true/.test(linha) }];
}));
const DEFAULT_MAP = (MAPSRC.match(/export const DEFAULT_MAP = '(\w+)'/) || [])[1] || MAP_IDS[0];

/* ---- sandbox: o menu de verdade, com tudo que não é modo virando no-op ---- */
function novoMenu(mapaInicial) {
  const noop = () => {};
  // gotoMap também atualiza o backdrop assíncrono do menu. O sandbox precisa manter
  // essa dependência como Promise resolvida; `--mutante=sem-backdrop` a remove e prova
  // que a execução real (não só a forma do fonte) continua sendo exercitada.
  const loadMenuBackdrop = process.argv.includes('--mutante=sem-backdrop')
    ? undefined : () => Promise.resolve();
  const el = new Proxy({ dataset: {}, textContent: '', innerHTML: '', style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, querySelectorAll: () => [], addEventListener: noop },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const corpo = `
    let currentMap = ${JSON.stringify(mapaInicial)};
    const sessao = null;
    let setupTitle = 'SINGLE PLAYER';
    ${INIT}
    ${MODE_CHOSEN}
    ${MAP_IDX}
    ${GOTO_MAP}
    ${OPEN_SETUP}
    ${SELECT_MODE}
    const badge = () => { const mm = $('map-mode'); ${BADGE.replace("mm.addEventListener('click', () =>", 'const _h = () =>')}; return _h(); };
    return {
      // o modo que o Game receberia — expressões literais do startGame
      jogar: () => (${ARENA_EXPR}) ? 'arena' : ((${CTF_EXPR}) ? 'ctf' : 'rounds'),
      modo: () => matchMode,
      mapa: () => currentMap,
      idx: () => mapIdx,
      openSetup, gotoMap, badge,
    };`;
  const f = new Function('MAPS', 'MAP_IDS', 'MAPAS_MENU', 'DEFAULT_MAP', 'resolveMapId', 'settings', 'saveSettings',
    '$', 'ui', 'setMapMode', 'setSetupStep', 'markCurrent', 'menuSetup', 'applySetupWall',
    'mapNameEl', 'setMapThumb', 'rebuildMenuBackdrop', 'renderMapScreen', 'loadMenuBackdrop', 'hubNavigate', corpo);
  return f(MAPS, MAP_IDS, MAP_IDS, DEFAULT_MAP, (id) => (MAPS[id] ? id : DEFAULT_MAP), { map: mapaInicial }, noop,
    () => el, { click: noop, hover: noop, back: noop }, noop, noop, noop, el, noop,
    el, noop, noop, noop, loadMenuBackdrop, noop);
}

// Só status semântico da fonte realmente transformada vale como mutante detectado.
function veredito(r, mutante = '') {
  if (r.error || r.signal || r.status !== (mutante ? 1 : 0)) return false;
  const stderr = r.stderr || '';
  if (/TypeError|ReferenceError|SyntaxError|setup:/.test(stderr)) return false;
  const markers = stderr.split('\n').filter((s) => s.startsWith('MODECHECK_APPLIED:'));
  if (mutante ? (markers.length !== 1 || markers[0] !== 'MODECHECK_APPLIED:' + mutante) : markers.length !== 0) return false;
  const records = stderr.split('\n').filter((s) => s.startsWith('MODECHECK_RESULT:'));
  if (records.length !== 1) return false;
  let d; try { d = JSON.parse(records[0].slice('MODECHECK_RESULT:'.length)); } catch { return false; }
  return d.tool === 'mode-check' && d.clausula === 'MOD2' && d.mutante === mutante && Number.isInteger(d.total) && d.total > 0
    && (mutante ? (d.erro === 'ContractViolation' && Number.isInteger(d.falhas) && d.falhas > 0 && d.falhas <= d.total
      && d.falhasArena === d.falhas && d.falhasOutros === 0)
      : (d.erro === null && d.falhas === 0 && d.falhasArena === 0 && d.falhasOutros === 0));
}
function metaDriver() {
  const nome = 'arena-no-construtor';
  const record = { tool: 'mode-check', clausula: 'MOD2', mutante: nome, erro: 'ContractViolation', total: 180, falhas: 36, falhasArena: 36, falhasOutros: 0 };
  const stderr = (d) => `MODECHECK_APPLIED:${nome}\nMODECHECK_RESULT:${JSON.stringify(d)}\n`;
  const ok = { status: 1, signal: null, error: null, stderr: stderr(record) };
  const exige = (p, msg) => { if (!p) throw new Error('metadriver: ' + msg); };
  exige(veredito(ok, nome), 'controle válido recusado');
  const bad = [
    { ...ok, error: new Error('spawn') }, { ...ok, signal: 'SIGTERM' },
    ...[0, 2, null].map((status) => ({ ...ok, status })),
    { ...ok, stderr: ok.stderr.split('\n').slice(1).join('\n') },
    { ...ok, stderr: ok.stderr + `MODECHECK_APPLIED:${nome}\n` },
    { ...ok, stderr: `MODECHECK_APPLIED:${nome}\n` },
    { ...ok, stderr: ok.stderr + `MODECHECK_RESULT:${JSON.stringify(record)}\n` },
    ...[{ tool: 'outro' }, { clausula: 'outra' }, { mutante: 'outro' }, { erro: 'TypeError' },
      { falhas: 0 }, { falhasArena: 0 }, { falhasOutros: 1 }].map((x) => ({ ...ok, stderr: stderr({ ...record, ...x }) })),
    { ...ok, stderr: ok.stderr + 'TypeError: setup\n' },
  ];
  bad.forEach((r, i) => exige(!veredito(r, nome), 'falso positivo aceito ' + i));
  const base = { status: 0, signal: null, error: null, stderr: 'MODECHECK_RESULT:' + JSON.stringify({ ...record, mutante: '', erro: null, falhas: 0, falhasArena: 0 }) + '\n' };
  exige(veredito(base), 'baseline válida recusada');
  for (const r of [{ ...base, status: 1 }, { ...base, signal: 'SIGKILL' }, { ...base, error: new Error('spawn') },
    { ...base, stderr: 'MODECHECK_APPLIED:arena-no-construtor\n' + base.stderr }]) exige(!veredito(r), 'baseline falsa aceita');
}
if (DRIVER || META) {
  metaDriver();
  if (DRIVER) {
    const roda = (mutante = '') => {
      const env = { ...process.env }; delete env.MODECHECK_DRIVER_PROV;
      const args = [fileURLToPath(import.meta.url), '--json'];
      if (mutante) { env.MODECHECK_DRIVER_PROV = mutante; args.push('--mutante=' + mutante); }
      return spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
    };
    for (const nome of ['', 'arena-no-construtor']) {
      const r = roda(nome);
      if (!veredito(r, nome)) { console.error('mode driver inválido:', nome || 'baseline', r.status, r.signal, (r.stderr || '').slice(-1000)); process.exit(2); }
    }
  }
  console.log('MODECHECK driver: baseline0 + arena-no-construtor MOD2/arena + metadriver PASS');
  process.exit(0);
}

/* ---- modos explícitos × mapas ---- */
const casos = [];
for (const alvo of MAP_IDS) {
  for (const escolha of ['rounds', 'ctf', 'arena']) {
    // o jogador começa no mapa padrão (é o que o menu abre) e ESCOLHE o modo no item
    const m = novoMenu(DEFAULT_MAP);
    m.openSetup(escolha, escolha === 'arena' ? 'VIRA-CASACA' : (escolha === 'ctf' ? 'CAPTURE THE FLAG' : 'SINGLE PLAYER'), escolha);
    // ...depois navega no carrossel até o mapa que quer, uma seta por vez (como no jogo)
    const destino = MAP_IDS.indexOf(alvo);
    for (let i = 0; i < MAP_IDS.length; i++) { if (m.idx() === destino) break; m.gotoMap(m.idx() + 1); }
    const jogado = m.jogar();
    casos.push({ mapa: alvo, escolhido: escolha, jogado, ok: jogado === escolha, via: 'carrossel' });
  }
}
/* caso extra: alternar no badge DEPOIS de já estar no mapa também tem que valer, e navegar
   em seguida não pode desfazer (o badge é a outra porta de entrada da escolha). */
for (const alvo of MAP_IDS) {
  const m = novoMenu(DEFAULT_MAP);
  m.openSetup(null, 'ESCOLHER MAPA', 'mapa');          // entrou SEM escolher: o padrão do mapa vale
  const destino = MAP_IDS.indexOf(alvo);
  for (let i = 0; i < MAP_IDS.length; i++) { if (m.idx() === destino) break; m.gotoMap(m.idx() + 1); }
  const antes = m.modo();
  m.badge();                                            // avança no ciclo rounds → ctf → arena
  const ordem = ['rounds', 'ctf', 'arena'];
  const escolha = ordem[(ordem.indexOf(antes) + 1) % ordem.length];
  m.gotoMap(m.idx() + 1); m.gotoMap(m.idx() - 1);       // vai e volta no carrossel
  const jogado = m.jogar();
  casos.push({ mapa: alvo, escolhido: escolha, jogado, ok: jogado === escolha, via: 'badge+carrossel' });
}
/* caso extra: SEM escolha nenhuma, o padrão do mapa TEM que continuar valendo (senão o
   conserto teria matado o `ctfMode`, que é comportamento pedido pelo dono). */
for (const alvo of MAP_IDS) {
  const m = novoMenu(DEFAULT_MAP);
  m.openSetup(null, 'ESCOLHER MAPA', 'mapa');
  const destino = MAP_IDS.indexOf(alvo);
  for (let i = 0; i < MAP_IDS.length; i++) { if (m.idx() === destino) break; m.gotoMap(m.idx() + 1); }
  const esperado = MAPS[alvo].ctfMode ? 'ctf' : 'rounds';
  const jogado = m.jogar();
  casos.push({ mapa: alvo, escolhido: esperado, jogado, ok: jogado === esperado, via: 'padrao-do-mapa' });
}

const falhas = casos.filter((c) => !c.ok);
writeSync(2, 'MODECHECK_RESULT:' + JSON.stringify({ tool: 'mode-check', clausula: 'MOD2', mutante: MUTANTE, erro: falhas.length ? 'ContractViolation' : null, total: casos.length, falhas: falhas.length, falhasArena: falhas.filter((c) => c.escolhido === 'arena').length, falhasOutros: falhas.filter((c) => c.escolhido !== 'arena').length }) + '\n');
const saida = { gerado: new Date().toISOString(), total: casos.length, falhas: falhas.length, casos };
if (JSON_OUT) console.log(JSON.stringify(saida, null, 1));
else {
  for (const c of casos)
    console.log(`${c.ok ? 'ok  ' : 'FALHA'} ${c.mapa.padEnd(15)} ${c.via.padEnd(16)} escolhido ${c.escolhido.padEnd(7)} jogado ${c.jogado}`);
}
console.log(`MODECHECK ${casos.length - falhas.length}/${casos.length} casos com o modo escolhido == modo jogado` +
  (falhas.length ? ` | FALHAS: ${falhas.map((f) => `${f.mapa}/${f.via} pediu ${f.escolhido} jogou ${f.jogado}`).join(', ')}` : ''));
process.exitCode = falhas.length ? 1 : 0;
