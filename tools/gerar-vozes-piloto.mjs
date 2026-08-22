#!/usr/bin/env node
// Piloto de vozes TTS via OpenRouter. Mantém as falas fora do manifest de jogo
// até a escuta e aprovação do dono.
//
// Uso:
//   OPENROUTER_API_KEY=... node tools/gerar-vozes-piloto.mjs
//   node tools/gerar-vozes-piloto.mjs --dry
//   node tools/gerar-vozes-piloto.mjs --so=f-rj,ovo

import { mkdir, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const OUT = 'public/audio/ia/piloto';
const MODEL = 'google/gemini-3.1-flash-tts-preview';
const VOZES = ['Fenrir', 'Puck', 'Kore'];
const API = 'https://openrouter.ai/api/v1/audio/speech';

const PILOTO = [
  { id: 'f-rj', texto: '[excited] BOTA A CARA! ... Bota a cara agora!' },
  { id: 'f-sp', texto: '[confident] É OS CRIA! Abaixa a CABEÇA!' },
  { id: 'streak', texto: '[triumphant] TRETA DUPLA!' },
  { id: 'ovo', texto: '[cheerful] Atenção, dona de casa! Chegou o carro do OVO! Ovo caipira, ovo branco — uma dúzia é dez, duas é QUINZE!' },
  { id: 'e', texto: '[passionate] Tese! Antítese! TIRO NA CABEÇA!' },
  { id: 'c', texto: '[gleeful] O CIRCO chegou! [laughs]' },
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const so = (args.find(a => a.startsWith('--so=')) || '').replace('--so=', '').split(',').filter(Boolean);
const lote = PILOTO.filter(p => !so.length || so.includes(p.id));

if (dry) {
  for (const p of lote) for (const [i, v] of VOZES.entries())
    console.log(`${p.id}-t${i + 1} [${v}]  ${p.texto}`);
  console.log(`\n${lote.length * VOZES.length} tomadas → ${OUT}/`);
  process.exit(0);
}

const key = process.env.OPENROUTER_API_KEY;
if (!key) {
  console.error('OPENROUTER_API_KEY ausente no ambiente.');
  process.exit(1);
}

function pcmParaMp3(pcm, destino) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1',
      '-i', 'pipe:0', '-codec:a', 'libmp3lame', '-b:a', '96k', '-y', destino,
    ]);
    let erro = '';
    ffmpeg.stderr.on('data', chunk => { erro += chunk; });
    ffmpeg.once('error', reject);
    ffmpeg.once('close', code => code === 0 ? resolve() : reject(new Error(erro || `ffmpeg saiu com ${code}`)));
    ffmpeg.stdin.end(pcm);
  });
}

await mkdir(OUT, { recursive: true });
let ok = 0, existente = 0, erro = 0;
for (const p of lote) {
  for (const [i, voz] of VOZES.entries()) {
    const nome = `${p.id}-t${i + 1}-${voz.toLowerCase()}.mp3`;
    try {
      await access(`${OUT}/${nome}`);
      existente++;
      console.log(`${nome}… ↷ já existe`);
      continue;
    } catch { /* arquivo ainda não existe */ }
    process.stdout.write(`${nome}… `);
    const res = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: p.texto, voice: voz, response_format: 'pcm' }),
    });
    if (!res.ok) {
      erro++;
      console.error(`✗ HTTP ${res.status} — ${(await res.text()).slice(0, 240)}`);
      continue;
    }
    try {
      const pcm = Buffer.from(await res.arrayBuffer());
      await pcmParaMp3(pcm, `${OUT}/${nome}`);
      ok++;
      console.log(`✓ ${(pcm.length / 1024).toFixed(0)} KB PCM`);
    } catch (cause) {
      erro++;
      console.error(`✗ ${cause.message}`);
    }
  }
}
console.log(`\n${ok} geradas, ${existente} já existentes, ${erro} erros → ${OUT}/`);
process.exit(erro ? 1 : 0);
