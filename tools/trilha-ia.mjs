#!/usr/bin/env node
/* TRILHA-IA — pós-processa áudio instrumental gerado por IA (Suno) e o coloca
 * nas pastas canônicas de public/audio/, prontas pro `npm run audio`.
 *
 * POR QUE ESTE SCRIPT EXISTE
 * O Suno não gera áudio loopável. A música de menu toca com `menuMusic.loop = true`
 * (main.js:394), que é um corte seco: o navegador volta pro sample 0 sem transição.
 * Faixa gerada por IA tem intro atmosférica e cauda com fade — no wrap isso vira um
 * "tump" audível a cada 105 segundos. Trimar na mão não resolve: o ponto de emenda
 * precisa cair na MESMA fase rítmica do começo, e isso é medida, não ouvido.
 *
 * Também padroniza o resto do caminho que hoje é manual: normalizar, cortar vinheta
 * de round no onset certo, aplicar a degradação anti-verniz e gravar no lugar que o
 * tools/gen-audio-manifest.mjs já varre. A pasta é a verdade — o script alimenta a pasta.
 *
 * USO
 *   node tools/trilha-ia.mjs <entrada> --tipo=menu      [--min=20] [--max=60] [--suja=0]
 *   node tools/trilha-ia.mjs <entrada> --tipo=soundtrack --slug=nome [--min=20] [--max=60]
 *   node tools/trilha-ia.mjs <entrada> --tipo=round   --team=F --slug=nome [--dur=18]
 *   node tools/trilha-ia.mjs <entrada> --tipo=capture --team=F --slug=nome [--dur=2]
 *
 *   --suja=0..3   degradação anti-verniz (0 = nenhuma, 3 = fita estragada)
 *   --dry         calcula e mostra, não escreve nada
 *   --out=DIR     grava aqui em vez de public/audio (útil pra revisar antes)
 *
 * DEPOIS: `npm run audio` regenera o manifest a partir do disco.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AUDIO = join(ROOT, 'public', 'audio');

// facção -> pasta em disco (mesmo mapa do gen-audio-manifest.mjs; se divergir, o
// arquivo cai numa pasta que o gerador não varre e o som some calado)
const TEAM_DIR = { E: 'time-e', B: 'time-b', U: 'tribos', C: 'palhacos', F: 'funkeiros' };

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const entrada = argv.find(a => !a.startsWith('--'));
const flag = (n, d) => {
  const a = argv.find(x => x.startsWith(`--${n}=`));
  return a === undefined ? d : a.slice(n.length + 3);
};
const has = n => argv.includes(`--${n}`);

const tipo = flag('tipo');
const team = (flag('team') || '').toUpperCase();
const slug = flag('slug');
const suja = Number(flag('suja', 0));
const dry = has('dry');
const outBase = flag('out', AUDIO);

const morre = m => { console.error('erro: ' + m); process.exit(1); };

if (!entrada) morre('falta o arquivo de entrada. Veja o cabeçalho do script pro uso.');
if (!existsSync(entrada)) morre(`não achei: ${entrada}`);
if (!['menu', 'soundtrack', 'round', 'capture'].includes(tipo)) morre('--tipo= menu | soundtrack | round | capture');
if (['round', 'capture'].includes(tipo) && !TEAM_DIR[team]) morre(`--team= ${Object.keys(TEAM_DIR).join(' | ')}`);
if (tipo !== 'menu' && !slug) morre('--slug= nome-curto-em-kebab-case');
if (!(suja >= 0 && suja <= 3)) morre('--suja= 0 | 1 | 2 | 3');

// ── ffmpeg ──────────────────────────────────────────────────────────────────
const ff = (args, opts = {}) => spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { maxBuffer: 1 << 30, ...opts });
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
catch { morre('ffmpeg não encontrado no PATH (mac: `brew install ffmpeg`)'); }

const duracao = f => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]);
  const d = parseFloat(String(r.stdout).trim());
  if (!(d > 0)) morre(`ffprobe não leu a duração de ${f}`);
  return d;
};

/* Decodifica pra mono s16le na taxa pedida e devolve Float32Array em [-1,1].
   11 kHz é de propósito: a busca de loop compara ritmo e fase, não timbre. Em
   44,1 kHz a mesma janela custa 4x e casa PIOR — o detalhe de alta frequência de
   música gerada por IA não se repete de um compasso pro outro, então ele entra
   na conta como ruído. */
function pcm(file, sr = 11025) {
  const r = ff(['-i', file, '-ac', '1', '-ar', String(sr), '-f', 's16le', '-'], { encoding: 'buffer' });
  if (r.status !== 0) morre('ffmpeg falhou ao decodificar:\n' + String(r.stderr));
  const b = r.stdout, n = b.length >> 1, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(i << 1) / 32768;
  return out;
}

// envelope de energia: RMS por quadro (hop de ~10 ms)
function envelope(x, sr, hop) {
  const n = Math.floor(x.length / hop), e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * hop, k = 0; k < hop; k++, j++) s += x[j] * x[j];
    e[i] = Math.sqrt(s / hop);
  }
  return e;
}

// similaridade do cosseno entre duas janelas (a partir de ia e ib, tamanho w)
function cos(a, ia, b, ib, w) {
  let num = 0, na = 0, nb = 0;
  for (let k = 0; k < w; k++) {
    const va = a[ia + k], vb = b[ib + k];
    num += va * vb; na += va * va; nb += vb * vb;
  }
  return na > 0 && nb > 0 ? num / Math.sqrt(na * nb) : -1;
}

/* ── ONDE COMEÇA A MÚSICA ────────────────────────────────────────────────────
   Faixa de IA quase sempre abre com intro fraca (pad, sweep, um instrumento só).
   Loopar incluindo a intro repete a intro pra sempre. Pego o primeiro quadro em
   que a energia passa de 55% da MEDIANA da faixa e segura por 0,5 s — mediana e
   não média porque um pico de bumbo puxaria a média e o corte entraria tarde. */
function inicioDaMusica(env, fps) {
  const ord = [...env].sort((a, b) => a - b);
  const med = ord[ord.length >> 1];
  const lim = med * 0.55, sustenta = Math.round(fps * 0.5);
  for (let i = 0; i + sustenta < env.length; i++) {
    let ok = true;
    for (let k = 0; k < sustenta; k++) if (env[i + k] < lim) { ok = false; break; }
    if (ok) return i / fps;
  }
  return 0;
}

/* ── PONTO DE LOOP ───────────────────────────────────────────────────────────
   Queremos E tal que a música em E esteja na MESMA fase rítmica que em S: aí o
   wrap E->S não muda o compasso. Formalmente, maximizar a similaridade entre o
   trecho que vem DEPOIS de E e o trecho que vem DEPOIS de S.

   Duas passadas, e a razão é custo: busca fina em 11 kHz sobre 40 s de candidatos
   são ~440 mil posições x 11 mil multiplicações. A grossa roda no envelope (100 Hz,
   4400x mais barato) e entrega o compasso certo; a fina só ajusta a fase dentro de
   +-60 ms, que é onde o envelope não tem resolução. */
function achaLoop(x, sr, S, minLen, maxLen) {
  const HOP = Math.round(sr / 100), fps = sr / HOP;   // envelope a 100 fps
  const env = envelope(x, sr, HOP);
  const dur = x.length / sr;
  if (S + minLen > dur) morre(`faixa de ${dur.toFixed(1)}s é curta pra loop de ${minLen}s a partir de ${S.toFixed(1)}s`);

  const W_ENV = Math.round(fps * 2.0);               // 2 s de contexto rítmico
  const sIdx = Math.round(S * fps);
  if (sIdx + W_ENV >= env.length) morre('sem contexto suficiente depois do início da música');

  let melhor = null;
  const eMin = Math.round((S + minLen) * fps);
  const eMax = Math.min(Math.round((S + Math.min(maxLen, dur - S)) * fps), env.length - W_ENV - 1);
  for (let e = eMin; e <= eMax; e++) {
    const sc = cos(env, e, env, sIdx, W_ENV);
    if (!melhor || sc > melhor.sc) melhor = { e, sc };
  }
  if (!melhor) morre('não achei candidato de loop — faixa curta demais pro --min pedido');

  // refino: +-60 ms em passo de 1 sample, agora no waveform
  const E0 = melhor.e / fps;
  const W_RAW = Math.round(sr * 0.5);
  const s0 = Math.round(S * sr), raio = Math.round(sr * 0.06);
  let fino = { e: Math.round(E0 * sr), sc: -1 };
  for (let e = fino.e - raio; e <= fino.e + raio; e++) {
    if (e < 0 || e + W_RAW >= x.length || s0 + W_RAW >= x.length) continue;
    const sc = cos(x, e, x, s0, W_RAW);
    if (sc > fino.sc) fino = { e, sc };
  }
  return { S, E: fino.e / sr, scoreEnv: melhor.sc, scoreRaw: fino.sc };
}

/* ── ONSET MAIS FORTE ────────────────────────────────────────────────────────
   Pra vinheta de round/capture: começar num ataque, não no meio de uma nota.
   Maior salto positivo de energia entre quadros vizinhos na janela de busca. */
function melhorOnset(x, sr, ate) {
  const HOP = Math.round(sr / 100), fps = sr / HOP;
  const env = envelope(x, sr, HOP);
  const lim = Math.min(Math.round(ate * fps), env.length - 1);
  let melhor = { i: 0, d: -Infinity };
  for (let i = 1; i < lim; i++) {
    const d = env[i] - env[i - 1];
    if (d > melhor.d) melhor = { i, d };
  }
  return Math.max(0, melhor.i / fps - 0.02);          // 20 ms de respiro antes do ataque
}

/* ── DEGRADAÇÃO ANTI-VERNIZ ──────────────────────────────────────────────────
   Cadeia validada (a de PROMPTS-SUNO v4 não rodava: `acruncher` e `highcut` não
   existem no ffmpeg — os nomes reais são `acrusher` e `lowpass`). */
const SUJEIRA = {
  1: 'highpass=f=45,acrusher=bits=12:mode=log:aa=1,acompressor=threshold=0.1:ratio=4:attack=8:release=80:makeup=2,lowpass=f=9000',
  2: 'aformat=channel_layouts=mono,highpass=f=45,acrusher=bits=10:mode=log:aa=1,acompressor=threshold=0.05:ratio=8:attack=5:release=60:makeup=3,lowpass=f=7500,vibrato=f=1.3:d=0.07',
  3: 'aformat=channel_layouts=mono,highpass=f=60,acrusher=bits=8:mode=log:aa=1,acompressor=threshold=0.03:ratio=12:attack=3:release=50:makeup=4,lowpass=f=6000,vibrato=f=1.6:d=0.12',
};
// -14 LUFS: mesmo alvo dos trims de menu já normalizados (main.js:360). Faixa nova
// fora desse alvo entra mais alta que as outras e o jogador mexe no volume do SO.
const NORM = 'loudnorm=I=-14:TP=-1.5:LRA=11';
const cadeia = extra => [suja ? SUJEIRA[suja] : null, extra, NORM].filter(Boolean).join(',');

// próximo mNN livre em menu-music/
function proximoM(dir) {
  let max = 0;
  if (existsSync(dir)) for (const f of readdirSync(dir)) {
    const m = /^m(\d+)\.mp3$/.exec(f);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `m${String(max + 1).padStart(2, '0')}.mp3`;
}

// ── destino ─────────────────────────────────────────────────────────────────
let destDir, destNome;
if (tipo === 'menu') {
  destDir = join(outBase, 'menu-music');
  destNome = proximoM(destDir);
} else if (tipo === 'soundtrack') {
  destDir = join(outBase, 'soundtrack');
  destNome = `${slug}.mp3`;
} else if (tipo === 'round') {
  destDir = join(outBase, TEAM_DIR[team], 'round');
  destNome = `${team.toLowerCase()}-round-${slug}.mp3`;
} else {
  destDir = join(outBase, 'capture', TEAM_DIR[team]);
  destNome = `${team.toLowerCase()}-capture-${slug}.mp3`;
}
const dest = join(destDir, destNome);

// ── execução ────────────────────────────────────────────────────────────────
const SR = 11025;
const dur = duracao(entrada);
console.log(`entrada: ${basename(entrada)} (${dur.toFixed(1)}s)`);

if (tipo === 'menu' || tipo === 'soundtrack') {
  const minLen = Number(flag('min', 20)), maxLen = Number(flag('max', 60));
  const XF = 0.15;                                   // crossfade do wrap
  const x = pcm(entrada, SR);
  const HOP = Math.round(SR / 100);
  const S = flag('start') !== undefined ? Number(flag('start')) : inicioDaMusica(envelope(x, SR, HOP), SR / HOP);
  const r = achaLoop(x, SR, S, minLen, maxLen);
  const L = r.E - r.S;
  console.log(`  início da música: ${r.S.toFixed(2)}s`);
  console.log(`  loop: ${r.S.toFixed(2)}s -> ${r.E.toFixed(2)}s  (${L.toFixed(2)}s)`);
  console.log(`  casamento: ritmo ${(r.scoreEnv * 100).toFixed(1)}% · fase ${(r.scoreRaw * 100).toFixed(1)}%`);
  if (r.scoreEnv < 0.80) console.log('  AVISO: casamento rítmico abaixo de 80% — provavelmente a faixa não tem\n' +
                                     '  seção repetida nesse intervalo. Tente outro --min/--max, ou gere de novo.');
  if (r.E + XF > dur) morre(`preciso de ${XF}s depois de ${r.E.toFixed(2)}s pro crossfade e a faixa acaba em ${dur.toFixed(1)}s`);

  if (dry) { console.log(`  (dry) gravaria em ${dest}`); process.exit(0); }
  mkdirSync(destDir, { recursive: true });

  /* Crossfade do wrap: a cauda [E, E+XF) é musicalmente o mesmo material que a
     cabeça [S, S+XF) — é o que a busca acabou de garantir. Sobrepor as duas com
     fade cruzado faz o corpo terminar já "entrando" no próprio começo, então o
     salto do loop=true do navegador cai dentro da transição em vez de em cima
     de um transiente. */
  const rr = ff([
    '-ss', String(r.S), '-t', String(L), '-i', entrada,     // 0 = corpo do loop
    '-ss', String(r.E), '-t', String(XF), '-i', entrada,    // 1 = cauda pro crossfade
    '-filter_complex',
    `[0:a]atrim=0:${XF},afade=t=in:st=0:d=${XF},asetpts=PTS-STARTPTS[cab];` +
    `[1:a]afade=t=out:st=0:d=${XF},asetpts=PTS-STARTPTS[cau];` +
    `[cab][cau]amix=inputs=2:normalize=0[emenda];` +
    `[0:a]atrim=start=${XF},asetpts=PTS-STARTPTS[resto];` +
    `[emenda][resto]concat=n=2:v=0:a=1,${cadeia(null)}[out]`,
    '-map', '[out]', '-b:a', '160k', dest,
  ]);
  if (rr.status !== 0) morre('ffmpeg falhou na montagem do loop:\n' + String(rr.stderr));
} else {
  const alvo = Number(flag('dur', tipo === 'round' ? 18 : 2));
  // Janela de busca do onset. Curta de propósito: vinheta de round começa no topo de
  // uma seção, não no drop do meio da faixa. Se o ataque certo estiver depois, passe --start.
  const busca = Math.min(tipo === 'round' ? 12 : 20, dur - alvo);
  const x = pcm(entrada, SR);
  const S = flag('start') !== undefined ? Number(flag('start')) : melhorOnset(x, SR, Math.max(busca, 1));
  const fade = tipo === 'round' ? 0.6 : 0.15;
  console.log(`  onset: ${S.toFixed(2)}s · corte de ${alvo}s · fade out ${fade}s`);
  if (S + alvo > dur) morre(`corte de ${alvo}s a partir de ${S.toFixed(2)}s passa do fim (${dur.toFixed(1)}s)`);
  if (dry) { console.log(`  (dry) gravaria em ${dest}`); process.exit(0); }
  mkdirSync(destDir, { recursive: true });
  const rr = ff([
    '-ss', String(S), '-t', String(alvo), '-i', entrada,
    '-af', cadeia(`afade=t=out:st=${(alvo - fade).toFixed(3)}:d=${fade}`),
    '-b:a', '160k', dest,
  ]);
  if (rr.status !== 0) morre('ffmpeg falhou no corte:\n' + String(rr.stderr));
}

const kb = (statSync(dest).size / 1024).toFixed(0);
console.log(`\nOK  ${dest.replace(ROOT, '')}  (${duracao(dest).toFixed(2)}s · ${kb} KB${suja ? ` · sujeira ${suja}` : ''})`);
console.log('rode `npm run audio` pra o manifest pegar o arquivo novo.');
