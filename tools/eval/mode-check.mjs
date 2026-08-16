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

   OS 10 CASOS: 5 mapas × 2 modos. Em cada um o jogador faz o que faz de verdade —
   clica no item do menu (escolha), depois navega no carrossel até o mapa (uma seta por
   vez, como no jogo), e só então aperta JOGAR. O que se compara é o valor que o `Game`
   RECEBERIA em `ctf:` contra o que ele pediu.

   Uso: node tools/eval/mode-check.mjs [--json]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SRC = readFileSync(path.join(ROOT, 'public', 'js', 'main.js'), 'utf8');
const MAPSRC = readFileSync(path.join(ROOT, 'public', 'js', 'maps.js'), 'utf8');
const JSON_OUT = process.argv.includes('--json');

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
const GOTO_MAP = bloco(SRC, 'function gotoMap(i)');
const MAP_IDX = (SRC.match(/^let mapIdx = .*$/m) || [])[0];
if (!MAP_IDX) throw new Error('não achei `let mapIdx =` no main.js');
// handler do badge de modo: o corpo do addEventListener('click', ...) dentro do bloco `mm`
const BADGE = (() => {
  const i = SRC.indexOf("if (mm) mm.addEventListener('click'");
  if (i < 0) throw new Error('não achei o handler de clique do badge de modo');
  return bloco(SRC.slice(i), "mm.addEventListener('click'");
})();
// a expressão que vai pro Game
const CTF_EXPR = (SRC.match(/^\s*ctf:\s*([^,]+),/m) || [])[1];
if (!CTF_EXPR) throw new Error('não achei a propriedade `ctf:` passada ao Game');

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
  const el = new Proxy({ dataset: {}, textContent: '', innerHTML: '', style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, querySelectorAll: () => [], addEventListener: noop },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const corpo = `
    let currentMap = ${JSON.stringify(mapaInicial)};
    let setupTitle = 'SINGLE PLAYER';
    ${INIT}
    ${MAP_IDX}
    ${GOTO_MAP}
    ${OPEN_SETUP}
    const badge = () => { const mm = $('map-mode'); ${BADGE.replace("mm.addEventListener('click', () =>", 'const _h = () =>')}; return _h(); };
    return {
      // o que o Game receberia em ctf: — a EXPRESSÃO literal do startGame
      jogar: () => (${CTF_EXPR}) ? 'ctf' : 'rounds',
      modo: () => matchMode,
      mapa: () => currentMap,
      idx: () => mapIdx,
      openSetup, gotoMap, badge,
    };`;
  const f = new Function('MAPS', 'MAP_IDS', 'DEFAULT_MAP', 'resolveMapId', 'settings', 'saveSettings',
    '$', 'ui', 'setMapMode', 'setSetupStep', 'markCurrent', 'menuSetup', 'applySetupWall',
    'mapNameEl', 'setMapThumb', 'rebuildMenuBackdrop', 'renderMapScreen', corpo);
  return f(MAPS, MAP_IDS, DEFAULT_MAP, (id) => (MAPS[id] ? id : DEFAULT_MAP), { map: mapaInicial }, noop,
    () => el, { click: noop, hover: noop, back: noop }, noop, noop, noop, el, noop,
    el, noop, noop, noop);
}

/* ---- os 10 casos ---- */
const casos = [];
for (const alvo of MAP_IDS) {
  for (const escolha of ['rounds', 'ctf']) {
    // o jogador começa no mapa padrão (é o que o menu abre) e ESCOLHE o modo no item
    const m = novoMenu(DEFAULT_MAP);
    m.openSetup(escolha, escolha === 'ctf' ? 'CAPTURE THE FLAG' : 'SINGLE PLAYER', escolha);
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
  m.badge();                                            // alterna
  const escolha = antes === 'ctf' ? 'rounds' : 'ctf';
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
const saida = { gerado: new Date().toISOString(), total: casos.length, falhas: falhas.length, casos };
if (JSON_OUT) console.log(JSON.stringify(saida, null, 1));
else {
  for (const c of casos)
    console.log(`${c.ok ? 'ok  ' : 'FALHA'} ${c.mapa.padEnd(15)} ${c.via.padEnd(16)} escolhido ${c.escolhido.padEnd(7)} jogado ${c.jogado}`);
}
console.log(`MODECHECK ${casos.length - falhas.length}/${casos.length} casos com o modo escolhido == modo jogado` +
  (falhas.length ? ` | FALHAS: ${falhas.map((f) => `${f.mapa}/${f.via} pediu ${f.escolhido} jogou ${f.jogado}`).join(', ')}` : ''));
process.exitCode = falhas.length ? 1 : 0;
