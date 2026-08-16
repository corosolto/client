/* RÉGUA DE MÍDIA E REDE — play() de mídia guardado + wrapper api() à prova de queda.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Dois crashes reais do alpha.41, hoje já consertados no upstream, mas SEM portão que
   impeça a reintrodução:

   • #117 — HTMLMediaElement.play() rejeitado pelo autoplay. `new Audio(url).play()`
     devolve uma Promise; quando o navegador barra o autoplay (NotAllowedError) e essa
     Promise não tem tratador, o console cospe "Uncaught (in promise)" e, no fluxo de
     boot, derrubava a inicialização. Conserto: TODO play() de mídia tem `.catch()` ou
     é capturado numa Promise tratada (audio.js:46, main.js — música do menu).

   • #125 — `TypeError: network error` não capturado. Todo fetch do cliente pode
     rejeitar (offline, CORS, servidor fora). O wrapper central `api()` de main.js
     embrulha o fetch em try/catch e devolve `null` em vez de estourar — é o que faz a
     telemetria/ranking falharem em SILÊNCIO sem quebrar a partida.

   Esta régua TRANCA os dois contratos. É estática (grep estruturado), não sobe browser
   nem rede: entra no `check` sempre-verde.

   ── CLÁUSULA PLAY ──────────────────────────────────────────────────────────────────
   Só os módulos que CONSTROEM mídia (`new Audio(`, `createElement('audio'|'video')`)
   são varridos — hoje audio.js e main.js. Nesses módulos, TODO `.play(` precisa estar
   guardado: ou `.play().catch(` direto, ou o retorno capturado numa var cujo `.then(`/
   `.catch(` aparece logo abaixo (o caso `const p = m.play(); if (p&&p.then) p.then(...)`).
   Os `.play()` de THREE.AnimationAction (game.js, glbchars.js, fparms.js) NÃO entram:
   esses arquivos não constroem mídia, e animação e áudio moram em módulos separados —
   fato de arquitetura que a régua encosta de propósito (um play de animação NUNCA deve
   nascer num módulo de mídia; se nascer, esta régua acusa e é sinal de que ele está no
   lugar errado).

   ── CLÁUSULA API ───────────────────────────────────────────────────────────────────
   O wrapper `api()` de main.js precisa embrulhar seu `fetch` em try/catch e RETORNAR do
   catch (fail-silent). É a rede de segurança do #125: sem ela, qualquer chamada de rede
   volta a poder estourar Promise não tratada.

   uso: node tools/eval/media-net-check.mjs [--mutante=play|fetch]
     --mutante=play   arranca o guard de um play de mídia; prova a CLÁUSULA PLAY
     --mutante=fetch  arranca o try/catch do api(); prova a CLÁUSULA API
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'public/js';
const MAIN = 'public/js/main.js';
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';

// PRIVADO: net.js/netgame.js e tudo em editor/ são o repo privado — fora de escopo.
const PRIVADO = /(^|\/)(net|netgame)\.js$|(^|\/)editor(\/|$)/;
const CONSTROI_MIDIA = /new Audio\s*\(|createElement\s*\(\s*['"`](audio|video)['"`]/;
const PLAY = /\.play\s*\(/;
const CATCH_DIRETO = /\.play\s*\(\s*\)\s*\.catch\s*\(/;
const ATRIBUI_PLAY = /(?:^|[^.\w])(\w+)\s*=\s*[^=].*\.play\s*\(\s*\)/;

function arquivosJs(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) arquivosJs(p, acc);
    else if (e.endsWith('.js') && !PRIVADO.test(p)) acc.push(p);
  }
  return acc;
}

function playGuardado(linhas, i) {
  const linha = linhas[i];
  if (CATCH_DIRETO.test(linha)) return true;             // X.play().catch(...)
  const m = linha.match(ATRIBUI_PLAY);                   // const p = X.play(); ... p.then(...)
  if (m) {
    const v = m[1];
    const handler = new RegExp(`\\b${v}\\s*\\.\\s*(then|catch)\\s*\\(`);
    for (let j = i; j <= Math.min(i + 4, linhas.length - 1); j++) {
      if (handler.test(linhas[j])) return true;
    }
  }
  return false;
}

function corpoApi(texto) {
  const abre = texto.search(/async\s+function\s+api\s*\(/);
  if (abre < 0) return null;
  const ini = texto.indexOf('{', abre);
  let prof = 0;
  for (let k = ini; k < texto.length; k++) {
    if (texto[k] === '{') prof++;
    else if (texto[k] === '}') { prof--; if (prof === 0) return texto.slice(ini, k + 1); }
  }
  return null;
}

// ── coleta ──
const arquivos = arquivosJs(RAIZ);
if (!arquivos.length) { console.error(`nenhum .js varrido em ${RAIZ}/`); process.exit(1); }

const falhas = [];

// CLÁUSULA PLAY
let modulosMidia = 0, playsVistos = 0;
for (const p of arquivos) {
  let texto = readFileSync(p, 'utf8');
  if (MUT === 'play' && p === join('public/js', 'audio.js')) texto += "\n_probe = new Audio('/x.mp3'); _probe.play();\n";
  if (!CONSTROI_MIDIA.test(texto)) continue;
  modulosMidia++;
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    if (!PLAY.test(linhas[i])) continue;
    playsVistos++;
    if (!playGuardado(linhas, i)) falhas.push(`PLAY sem guard  ${p}:${i + 1}  ${linhas[i].trim().slice(0, 80)}`);
  }
}
if (!modulosMidia) falhas.push('nenhum módulo de mídia encontrado (new Audio/createElement) — varredura vazia');

// CLÁUSULA API
let textoMain = readFileSync(MAIN, 'utf8');
if (MUT === 'fetch') textoMain = textoMain.replace(/(async\s+function\s+api\s*\([^)]*\)\s*\{)\s*try\s*\{/, '$1');
const corpo = corpoApi(textoMain);
if (!corpo) falhas.push(`api() não encontrado em ${MAIN}`);
else {
  const idxTry = corpo.search(/try\s*\{/);
  const idxFetch = corpo.search(/fetch\s*\(/);
  const catchRetorna = /catch\s*(\([^)]*\))?\s*\{[^{}]*return/.test(corpo);
  if (idxTry < 0 || idxFetch < 0 || idxFetch < idxTry)
    falhas.push(`api() com fetch FORA de try/catch em ${MAIN} — rede pode estourar (#125)`);
  else if (!catchRetorna)
    falhas.push(`api() sem return no catch em ${MAIN} — não é fail-silent (#125)`);
}

// ── veredito ──
console.log(`MEDIA-NET-CHECK: ${arquivos.length} .js varridos · ${modulosMidia} módulo(s) de mídia · ${playsVistos} play() inspecionado(s)`);
if (falhas.length) {
  console.error(`  ✗ ${falhas.length} falha(s):`);
  for (const f of falhas) console.error('    ', f);
  process.exit(1);
}
console.log('  ✓ todo play() de mídia guardado (#117) e api() fail-silent (#125)');
