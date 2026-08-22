#!/usr/bin/env node
// Vinhetas de round via Lyria 3 no OpenRouter (chat completions, saída de áudio).
// Prompts = styles da v7 (docs/audio/PROMPTS-SUNO.md §5) — mesma especificação de
// modo/métrica que a régua validou. Clips de ~30s; o corte final é do trilha-ia.mjs.
//
// Uso:
//   OPENROUTER_API_KEY=... node tools/gerar-vinhetas-lyria.mjs        # gera as 5
//   node tools/gerar-vinhetas-lyria.mjs --dry                         # só lista
//   node tools/gerar-vinhetas-lyria.mjs --so=r-f,r-e                  # filtra
//   node tools/gerar-vinhetas-lyria.mjs --model=google/lyria-3-pro-preview
//
// Depois de gerar: .venv-audio/bin/python tools/eval/trilha-medida.py --conjunto ...

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/rounds-lyria';
const CLIP = 'google/lyria-3-clip-preview';

// Styles verbatim da v7 (seção 5 do PROMPTS-SUNO.md) + trava de instrumental.
const LOTE = [
  { id: 'r-e', style: '2/4 marcha, chromatic descending bass line, diminished passing chords, II7 V7 turnaround, choro harmony, street protest drum corps, surdo and caixa marching pattern, sharp referee whistle hits, brass band melody, raw outdoor recording, live and loose, 112 BPM. Instrumental, no vocals, no corporate stock music feel.' },
  { id: 'r-b', style: 'melody in parallel thirds, two voices harmonizing a third apart, viola caipira ponteado lead, major key, electric guitar power chords, punchy electronic kick and clap, accordion stabs, confident anthem energy, polished country pop production, wide stereo, 128 BPM, sertanejo universitario. Instrumental, no vocals.' },
  { id: 'r-u', style: 'power chords with no third, root and fifth only, i VI VII minor punk vamp, three chord distorted guitar riff, fast driving snare and hi-hat, simple root note bass, blown out amp, one take band in a room, cheap microphone, 156 BPM, garage punk. Instrumental, no vocals.' },
  { id: 'r-c', style: '6/8 galop screamer march, chromatic runs, diminished seventh chords, augmented passing chords, modulation to subdominant in the trio, oompah tuba and bass drum, crash cymbal accents, clown horn honks, calliope organ, vintage circus band, old mono recording, 150 BPM. Instrumental, no vocals.' },
  { id: 'r-f', style: 'single bass note, no chord progression, atabaque cadence, Roland R-8 drum machine, hard dry tamborzao beat, booming distorted sub, aggressive kick pattern, steady groove, raw bedroom recording, tape saturation, mono, 130 BPM. Instrumental, no vocals, no melodic synth.' },
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const model = (args.find(a => a.startsWith('--model=')) || `--model=${CLIP}`).split('=')[1];
const so = (args.find(a => a.startsWith('--so=')) || '').replace('--so=', '').split(',').filter(Boolean);
const lote = LOTE.filter(p => !so.length || so.includes(p.id));

if (dry) {
  for (const p of lote) console.log(`${p.id}\n  ${p.style}\n`);
  console.log(`${lote.length} vinhetas → ${OUT}/ (modelo ${model})`);
  process.exit(0);
}

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) { console.error('OPENROUTER_API_KEY ausente no ambiente.'); process.exit(1); }

const EXT = [[0x52, 0x49, 0x46, 0x46, '.wav'], [0x49, 0x44, 0x33, null, '.mp3'], [0xff, 0xfb, null, null, '.mp3'], [0x4f, 0x67, 0x67, 0x53, '.ogg'], [0x66, 0x4c, 0x61, 0x43, '.flac']];
const extDe = buf => (EXT.find(([a, b, c, d]) => buf[0] === a && (b === null || buf[1] === b) && (c === null || buf[2] === c) && (d === null || buf[3] === d)) || [])[4] || '.bin';

await mkdir(OUT, { recursive: true });
let ok = 0, erro = 0;
for (const p of lote) {
  process.stdout.write(`${p.id}… `);
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      modalities: ['text', 'audio'],
      audio: { format: 'wav' },
      messages: [{ role: 'user', content: `Generate a short instrumental video game round-victory jingle: ${p.style}` }],
    }),
  });
  if (!res.ok) { erro++; console.error(`✗ HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`); continue; }

  // SSE: acumula delta.audio.data (base64) até data: [DONE]
  const sse = await res.text();
  let b64 = '';
  for (const linha of sse.split('\n')) {
    if (!linha.startsWith('data: ') || linha === 'data: [DONE]') continue;
    try { b64 += JSON.parse(linha.slice(6)).choices?.[0]?.delta?.audio?.data || ''; } catch { /* chunk parcial */ }
  }
  if (!b64) { erro++; console.error(`✗ sem áudio no stream (${sse.length} bytes SSE)`); continue; }
  const buf = Buffer.from(b64, 'base64');
  const nome = `${p.id}${extDe(buf)}`;
  await writeFile(join(OUT, nome), buf);
  ok++;
  console.log(`✓ ${nome} (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log(`\n${ok} geradas, ${erro} erros → ${OUT}/`);
process.exit(erro ? 1 : 0);
