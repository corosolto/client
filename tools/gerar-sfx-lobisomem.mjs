#!/usr/bin/env node
// Set de sons do Lobisomem via ElevenLabs Sound Effects (text-to-sfx).
// Direção do dono (30/08): o Lobisomem NÃO fala — só uiva, rosna e late.
// 2 tomadas por som → public/audio/ia/miticos-sfx/lobisomem/<slug>-tN.mp3
// (public/audio é gitignorado — mp3 fora do git).
//
// Uso:
//   ELEVENLABS_API_KEY=... node tools/gerar-sfx-lobisomem.mjs [--dry] [--so=uivo-lua,...]
//   node tools/gerar-sfx-lobisomem.mjs --fallback-v3   # gera TAMBÉM a comparação
//        via TTS eleven_v3 com texto só de tags/onomatopeia (voz da conta),
//        caso a sound-generation não esteja no tier ou pra comparar no ouvido.
//
// API: POST /v1/sound-generation { text, duration_seconds, prompt_influence }.
// 401/403 ⇒ tier sem sound effects: rode com --fallback-v3.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/miticos-sfx/lobisomem';
const API = 'https://api.elevenlabs.io/v1';
const TOMADAS = 2;

// [slug, prompt-em-inglês, duração s] — kill-react ideal <= 2 s; uivo de lua pode ser maior.
const SONS = [
  ['uivo-lua', 'long mournful lone wolf howl at the full moon, wild and echoing, night ambience', 4],
  ['uivo-vitoria', 'short powerful triumphant wolf howl, close up, victorious', 2],
  ['rosnado-baixo', 'low menacing wolf growl, slow deep rumble, close and threatening', 2.5],
  ['rosnado-agressivo', 'aggressive snarling wolf growl, teeth bared, about to attack', 2],
  ['latido-duplo', 'two sharp aggressive wolf barks in quick succession', 1.5],
  ['bufo', 'wolf snorting and sniffing the air, heavy breath through the nose', 1.5],
  ['mordida', 'wolf bite attack, jaws snapping shut with a snarl', 1.5],
  ['rosnado-uivo', 'deep wolf growl rising into a short victorious howl', 2.5],
];

// Fallback/comparação: eleven_v3 com onomatopeia + tags (sem palavra humana).
const V3_VOZ = 'CPYJeGOY3LvpmBJRlYK9'; // Adriano Ferreira (grave, já na conta)
const V3_AMOSTRAS = [
  ['v3-uivo', '[howls] Auuuuuu! Auuuuuuuuu!'],
  ['v3-rosnado', '[growls] Grrrrr... grrrRRRR!'],
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const fallbackV3 = args.includes('--fallback-v3');
const so = (args.find(a => a.startsWith('--so=')) || '').replace('--so=', '').split(',').filter(Boolean);
const lote = SONS.filter(([slug]) => !so.length || so.includes(slug));

if (dry) {
  for (const [slug, prompt, dur] of lote) for (let t = 1; t <= TOMADAS; t++)
    console.log(`${slug}-t${t}.mp3 (${dur}s) "${prompt}"`);
  if (fallbackV3) for (const [slug, texto] of V3_AMOSTRAS) console.log(`${slug}.mp3 [v3] "${texto}"`);
  process.exit(0);
}

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('ELEVENLABS_API_KEY ausente. Carregue com: set -a; source /Users/ruben/game/.env; set +a');
  process.exit(1);
}

async function quota() {
  const res = await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': KEY } });
  if (!res.ok) return null;
  const j = await res.json();
  return { usados: j.character_count, limite: j.character_limit };
}

async function sfx(prompt, dur) {
  const res = await fetch(`${API}/sound-generation`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: prompt, duration_seconds: dur, prompt_influence: 0.5 }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`HTTP ${res.status} — tier sem sound effects; rode com --fallback-v3. ${(await res.text()).slice(0, 150)}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function ttsV3(texto) {
  const res = await fetch(`${API}/text-to-speech/${V3_VOZ}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: 'eleven_v3' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

const antes = await quota();
await mkdir(OUT, { recursive: true });
let ok = 0, erro = 0;
for (const [slug, prompt, dur] of lote) {
  for (let t = 1; t <= TOMADAS; t++) {
    const nome = `${slug}-t${t}.mp3`;
    let buf = null, err = null;
    for (let tent = 1; tent <= 2 && !buf; tent++) {
      try { buf = await sfx(prompt, dur); }
      catch (e) { err = e; if (tent === 1) await new Promise(r => setTimeout(r, 2000)); }
    }
    if (!buf) { erro++; console.error(`✗ ${nome}: ${err.message}`); continue; }
    await writeFile(join(OUT, nome), buf);
    ok++;
    console.log(`✓ ${nome} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
}
if (fallbackV3) {
  for (const [slug, texto] of V3_AMOSTRAS) {
    try {
      await writeFile(join(OUT, `${slug}.mp3`), await ttsV3(texto));
      ok++;
      console.log(`✓ ${slug}.mp3 (comparação eleven_v3)`);
    } catch (e) { erro++; console.error(`✗ ${slug}.mp3: ${e.message}`); }
  }
}
const depois = await quota();
console.log(`\n${ok} sons salvos, ${erro} erros → ${OUT}/`);
if (antes && depois) console.log(`Cota: ${antes.usados} → ${depois.usados} de ${depois.limite} (${depois.usados - antes.usados} chars consumidos)`);
process.exit(erro ? 1 : 0);
