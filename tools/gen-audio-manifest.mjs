#!/usr/bin/env node
/* Gera public/audio/manifest.json A PARTIR DO DISCO.
 *
 * POR QUE ESTE SCRIPT EXISTE
 * Em 04/08/2026 o disco tinha 295 mp3 e o manifest referenciava 136. A diferença não
 * era lixo: era a facção dos Funkeiros inteira (60 arquivos) tocando com a voz dos
 * Tribos, mais 25 arquivos de petista/bolsonaro gravados e nunca tocados. O manifest
 * era escrito à mão, então toda leva de som novo dependia de alguém lembrar de editá-lo
 * — e ninguém lembrava. Arquivo novo na pasta não fazia nada, sem erro no console.
 *
 * A regra agora é: **a pasta é a verdade**. Jogou som novo em
 * `public/audio/<facção>/ingame/`, rodou `npm run audio`, tocou.
 *
 * O QUE É GERADO E O QUE É PRESERVADO
 * Gerado do disco (pools grandes, onde "todos os arquivos entram" é a intenção):
 *   voice.<T>        <facção>/ingame/*.mp3
 *   round.<T>        <facção>/round/*.mp3
 *   capture          capture/*.mp3            (raiz)
 *   captureByTeam.<T> capture/<facção>/*.mp3
 *   soundtrack       soundtrack/*.mp3
 * Preservado do manifest atual (curadoria 1-para-1, onde arquivo errado = som errado):
 *   cs, weapons, general, weaponSamples
 *
 * CODIFICAÇÃO DE URL: nomes reais aqui têm espaço e parêntese
 * (`...olodum (1).mp3`, `mc tevez - pam pam tim pam.mp3`). O caminho vira URL no
 * `fetch` do audio.js, então cada segmento é codificado. Sem isso o arquivo existe,
 * o manifest aponta pra ele, e o som não toca — o pior tipo de defeito.
 *
 * USO
 *   node tools/gen-audio-manifest.mjs           escreve o manifest e relata órfãos
 *   node tools/gen-audio-manifest.mjs --check   não escreve; sai 1 se estiver defasado
 */
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { carregarPolitica, motivoDeRecusa } from './audio/politica.mjs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENU_MUSIC_ACTIVE_IDS } from '../public/js/menu-music-selection.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/* `--raiz=<dir>` troca a pasta de áudio inteira. Existe para a régua de alcance
   (tools/eval/audio-alcance-check.mjs) medir gerador+empacotador numa fixture
   sintética, sem depender do pacote privado. Sem o flag, nada muda. */
const RAIZ = (process.argv.find((a) => a.startsWith('--raiz=')) || '').slice(7);
const AUDIO = RAIZ ? resolve(RAIZ) : join(ROOT, 'public', 'audio');
const PUBLICO = RAIZ ? dirname(AUDIO) : join(ROOT, 'public');
const MANIFEST = join(AUDIO, 'manifest.json');
const CHECK = process.argv.includes('--check');

// facção em disco -> letra de time usada pelo jogo (game.js/characters.js)
const FACTIONS = { 'time-e': 'E', 'time-b': 'B', tribos: 'U', palhacos: 'C', funkeiros: 'F' };
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|webm)$/i;

// Contratos curados não podem ser reconstruídos pela ordem dos arquivos no disco. Isso inclui
// os packs locais e seus metadados: `audio:check` precisa medir o mesmo jogo instalado.
const CURATED = [
  '_localLab', 'cs', 'weapons', 'weaponSamples', 'weaponSamplesAuthentic',
  'defaultWeaponPack', 'weaponCandidates', 'weaponPacks', 'general', 'roundNumbers',
  'characterPhysical', 'mapSoundscapes',
];

function listAudio(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => AUDIO_EXT.test(f) && !f.startsWith('.'))
    .sort()
    .map(f => join(dir, f));
}

/* caminho de disco -> caminho do manifest, CRU (sem codificar).

   NÃO CODIFIQUE AQUI. `audio.js/_sample()` já faz `new Audio(encodeURI(url))`, e codificar
   dos dois lados vira DUPLA CODIFICAÇÃO: `%20` (espaço) vira `%2520`, o arquivo não existe
   nesse caminho e o áudio some sem erro nenhum na tela.

   Foi exatamente o que aconteceu em 04/08: eu codifiquei aqui pra resolver nomes com espaço
   e parêntese (`...olodum (1).mp3`), sem ver que o `_sample` já codificava. Efeito: as 20
   faixas de round dos FUNKEIROS, que têm espaço no nome, pararam de tocar — e só elas, o
   que fez o defeito parecer "problema dos funkeiros" em vez de "manifest quebrado".
   O dono pegou jogando: "quando acaba um round não está tocando música mais, pelo menos
   pro funkeiro".

   Quem grava o caminho não codifica; quem monta a URL codifica. Um lado só. */
const toUrl = (abs) => relative(PUBLICO, abs).split('/').join('/');

const used = new Set();
const take = (files) => { files.forEach(f => used.add(f)); return files.map(toUrl); };

const prev = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

// O pacote privado já chega com todas as folhas reescritas para audio/a/<hash>.
// Reconstruí-lo pela estrutura do disco apagaria characterVoice e trocaria as músicas
// hasheadas pelo espelho menu-music/, criando exatamente 44 falsos órfãos. Neste formato
// o check correto é integridade referencial e ausência de arquivos opacos não usados.
if (prev?._privateBuild?.format === 'content-addressed-v1') {
  const refs = [];
  const collect = (value) => {
    if (typeof value === 'string' && value.startsWith('audio/')) refs.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(prev);
  const unique = new Set(refs);
  const missing = [...unique].filter((ref) => !existsSync(join(PUBLICO, decodeURIComponent(ref))));
  const opaqueDir = join(AUDIO, 'a');
  const opaque = existsSync(opaqueDir)
    ? readdirSync(opaqueDir).filter((name) => AUDIO_EXT.test(name)).map((name) => `audio/a/${name}`)
    : [];
  const orphanOpaque = opaque.filter((ref) => !unique.has(ref));
  const menuExpected = MENU_MUSIC_ACTIVE_IDS.map((id) => `audio/menu-music/${id}.mp3`);
  const missingMenuMirror = menuExpected.filter((ref) => !existsSync(join(PUBLICO, ref)));
  console.log(`AUDIO PRIVATE  ${refs.length} referências · ${unique.size} únicas · ${opaque.length} opacas`);
  if (missing.length || orphanOpaque.length || missingMenuMirror.length) {
    if (missing.length) console.error(`✗ ${missing.length} referência(s) ausente(s): ${missing.slice(0, 8).join(', ')}`);
    if (orphanOpaque.length) console.error(`✗ ${orphanOpaque.length} arquivo(s) opaco(s) órfão(s): ${orphanOpaque.slice(0, 8).join(', ')}`);
    if (missingMenuMirror.length) console.error(`✗ espelho das oito músicas incompleto: ${missingMenuMirror.join(', ')}`);
    process.exit(1);
  }
  console.log(`✓ pacote privado íntegro; menu espelhado: ${MENU_MUSIC_ACTIVE_IDS.join(', ')}`);
  process.exit(0);
}
const out = {};

// ── pools por facção ────────────────────────────────────────────────────────
out.voice = {}; out.round = {};
for (const [dir, team] of Object.entries(FACTIONS)) {
  out.voice[team] = take(listAudio(join(AUDIO, dir, 'ingame')));
  out.round[team] = take(listAudio(join(AUDIO, dir, 'round')));
}

// ── curados: vêm do manifest anterior, menos o que o ledger barra ───────────
/* O ledger CONTROLA o que sai daqui, e a regra é ALLOWLIST sob o prefixo
   derivado: o que não está catalogado não entra, nem no manifest local. A
   decisão mora em `tools/audio/politica.mjs`, a mesma que o empacotador e o
   `assets-check` usam — três cópias divergiriam na próxima edição (lição 2).
   Régua: `npm run eval:audioproc`, cláusulas PRV7 e PRV11. */
const LEDGER = (process.argv.find((a) => a.startsWith('--ledger=')) || '').slice(9)
  || join(ROOT, 'docs', 'audio', 'proveniencia.json');
const politica = carregarPolitica(LEDGER);
/* SEM LEDGER, ABORTA — antes de escrever qualquer coisa, e nos dois modos.
   Isto fazia `return null` e seguia: "não consigo verificar" virava "pode passar",
   e o manifest saía com o não catalogado dentro, exit 0, sem diagnóstico. O
   empacotador e o `assets-check` já falhavam fechados; era esta camada que
   contradizia a política. Régua: PRV12. */
if (politica.erro) {
  console.error(`FALTA o ledger de procedência (${politica.erro}).`);
  console.error('Sem ele não dá para saber o que pode entrar no manifest, e não saber custa o'
    + ' mesmo que estar errado. Nada foi escrito.');
  process.exit(1);
}
const barrado = (rel) => {
  const abs = join(PUBLICO, decodeURIComponent(rel));
  if (!existsSync(abs)) return null;
  return motivoDeRecusa(rel, readFileSync(abs), politica, 'manifest');
};
const tirados = [];
const podar = (v) => {
  if (typeof v === 'string') { const m = barrado(v); if (m) { tirados.push(`${v} (${m})`); return undefined; } return v; }
  if (Array.isArray(v)) return v.map(podar).filter((x) => x !== undefined);
  if (v && typeof v === 'object') {
    const r = {};
    for (const [k, val] of Object.entries(v)) { const p = podar(val); if (p !== undefined) r[k] = p; }
    return r;
  }
  return v;
};
for (const k of CURATED) if (prev[k] !== undefined) out[k] = podar(prev[k]);
// marca os curados como "usados" pra não aparecerem como órfãos no relatório
const markUsed = (v) => {
  if (typeof v === 'string') { const p = join(PUBLICO, decodeURIComponent(v)); if (existsSync(p)) used.add(p); }
  else if (Array.isArray(v)) v.forEach(markUsed);
  else if (v && typeof v === 'object') Object.values(v).forEach(markUsed);
};
CURATED.forEach(k => markUsed(prev[k]));

// ── captura: pool geral + pool por facção ───────────────────────────────────
out.capture = take(listAudio(join(AUDIO, 'capture')));
out.captureByTeam = {};
for (const [dir, team] of Object.entries(FACTIONS)) {
  const f = take(listAudio(join(AUDIO, 'capture', dir)));
  if (f.length) out.captureByTeam[team] = f;
}

// ── trilha in-game ──────────────────────────────────────────────────────────
// Fica no manifest mesmo antes de existir um player: assim `--check` já cobra o
// arquivo novo, e quem for implementar o player encontra a lista pronta.
out.soundtrack = take(listAudio(join(AUDIO, 'soundtrack')));

// ── música de menu ──────────────────────────────────────────────────────────
// Loop das telas de menu (public/audio/menu-music/mNN.mp3). Caiu na MESMA armadilha das
// outras listas: main.js trazia `Array.from({ length: 26 })` e a faixa nova na pasta sumia
// calada (issue #47). Agora a pasta manda — main.js lê `menuMusic` daqui com fallback pra
// lista antiga, e o `--check` cobra a 27ª faixa no dia em que ela entrar.
const menuMusic = take(listAudio(join(AUDIO, 'menu-music')));
const activeMenuPaths = new Set(MENU_MUSIC_ACTIVE_IDS.map((id) => `audio/menu-music/${id}.mp3`));
out.menuMusic = RAIZ ? menuMusic : menuMusic.filter((url) => activeMenuPaths.has(url));

// ── áudio ambiente por mapa ─────────────────────────────────────────────────
// `public/js/soundscape.js` nomeia esses arquivos, e ANTES DISTO nenhum deles era
// alcançado: sem regra aqui eles entravam como ÓRFÃOS, não viravam folha do
// manifest, e `scripts/build-audio-pack.mjs` — que copia só o que o manifest
// nomeia — não os punha no zip. Em produção viravam 404 que `soundscape.js:59`
// engolia com um warn. Régua: `npm run eval:audioalcance`.
out.ambiente = take(listAudio(join(AUDIO, 'ambiente')));

/* ── TETO DE DURAÇÃO DA VOZ IN-GAME ─────────────────────────────────────────
   Regra do dono (04/08): fala de `ingame/` tem no máximo **8 s**. Ela toca por cima do
   jogo — uma linha de 28 s (era o caso do "coe rapaziada" dos funkeiros, contra 5,8 s do
   segundo mais longo) fica na frente do tiroteio inteiro e some a chance de ouvir passo
   e recarga, que é informação de jogo.

   `round/` NÃO entra na regra: toca entre rodadas, e vinheta longa lá é intencional.

   Mede com ffprobe quando existir; sem ffprobe, avisa e segue (a régua não pode derrubar
   quem não tem a ferramenta). Hoje só REPORTA — os outros longos que sobraram são decisão
   do dono, não defeito confirmado. Quando ele decidir, é trocar este bloco por exit 1. */
const LIMITE_INGAME = 8;
/* ACEITAS PELO DONO (04/08), depois de ver a medição. Não são exceção "porque incomoda":
   ele olhou os três e decidiu que valem o tempo de tela que ocupam. Ficam nomeadas aqui em
   vez de o teto subir para 13 s — subir o teto perderia o próximo "coe rapaziada" de 28 s,
   que é exatamente o caso que esta régua existe pra pegar. */
const LONGAS_OK = new Set([
  'bolsonaro/ingame/bolsonaro-popcorn-and-ice-cream.mp3',
  'petista/ingame/pense-no-lula.mp3',
  'petista/ingame/setembro-vai-entrar-o-grosso-lula.mp3',
]);
let longas = [];
try {
  execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
  for (const [dir] of Object.entries(FACTIONS)) {
    for (const f of listAudio(join(AUDIO, dir, 'ingame'))) {
      const d = +execFileSync('ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
        { encoding: 'utf8' }).trim();
      const rel = relative(AUDIO, f);
      if (d > LIMITE_INGAME && !LONGAS_OK.has(rel)) longas.push({ f: rel, d });
    }
  }
} catch { longas = null; }   // sem ffprobe: silêncio, não falso negativo disfarçado de verde

// ── relatório de órfãos: som no disco que nenhuma chave alcança ─────────────
const orphans = [];
(function walk(d) {
  if (!existsSync(d)) return;
  for (const f of readdirSync(d)) {
    if (f.startsWith('.')) continue;
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (AUDIO_EXT.test(f) && !used.has(p)) orphans.push(relative(AUDIO, p));
  }
})(AUDIO);

const total = (function count(d) {
  if (!existsSync(d)) return 0;
  return readdirSync(d).reduce((n, f) => {
    if (f.startsWith('.')) return n;
    const p = join(d, f);
    return n + (statSync(p).isDirectory() ? count(p) : (AUDIO_EXT.test(f) ? 1 : 0));
  }, 0);
})(AUDIO);

const next = JSON.stringify(out, null, 1) + '\n';
const same = existsSync(MANIFEST) && readFileSync(MANIFEST, 'utf8') === next;

const byFolder = orphans.reduce((m, f) => (m[f.split('/')[0]] = (m[f.split('/')[0]] || 0) + 1, m), {});
console.log(`AUDIO  ${total} arquivos no disco · ${total - orphans.length} alcançáveis pelo manifest · ${orphans.length} órfãos`);
for (const [k, v] of Object.entries(byFolder).sort((a, b) => b[1] - a[1])) console.log(`  órfãos ${String(v).padStart(3)}  ${k}/`);
console.log(`  voice ${Object.entries(out.voice).map(([t, a]) => t + ':' + a.length).join(' ')}`);
console.log(`  round ${Object.entries(out.round).map(([t, a]) => t + ':' + a.length).join(' ')}`);
console.log(`  capture ${out.capture.length} · soundtrack ${out.soundtrack.length} · menuMusic ${out.menuMusic.length}`);
if (tirados.length) {
  console.log(`  ⚠ ${tirados.length} caminho(s) BARRADO(S) pelo ledger de procedência — não entram no manifest:`);
  for (const t of tirados) console.log(`     ${t}`);
}
if (longas === null) console.log('  (ffprobe ausente — teto de 8 s da voz in-game NÃO foi verificado)');
else if (longas.length) {
  console.log(`  ⚠ ${longas.length} fala(s) de ingame acima de ${LIMITE_INGAME}s (tocam por cima do jogo):`);
  for (const l of longas.sort((a, b) => b.d - a.d)) console.log(`     ${l.d.toFixed(1)}s  ${l.f}`);
} else console.log(`  ✓ nenhuma fala de ingame acima de ${LIMITE_INGAME}s`);

if (CHECK) {
  if (!same) {
    console.error('\n✗ manifest.json DEFASADO em relação ao disco. Rode: npm run audio');
    process.exit(1);
  }
  console.log('\n✓ manifest.json em dia com o disco');
  process.exit(0);
}
if (same) { console.log('\nmanifest.json já estava em dia — nada escrito.'); process.exit(0); }
writeFileSync(MANIFEST, next);
console.log(`\n✓ ${relative(ROOT, MANIFEST)} escrito`);
