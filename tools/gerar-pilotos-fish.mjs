#!/usr/bin/env node
// PILOTOS de upgrade de voz dos times existentes via Fish Audio (modelos
// comunitários escolhidos pelo dono, 30/08). Só 3-4 falas por piloto, para
// página de audição — NÃO mexe nos packs atuais.
//
// Tom de referência: falas/blurbs do pack atual (public/js/characters.js) —
//   mandrake (time F): "Boné, Juliet vermelho e corrente de ouro. Ostenta e domina na quebrada."
//   pagodeiro (time U): "Platinado, roupa toda branca e corrente de ouro. Canta o hit e acerta o tiro no refrão."
//   cria-rj: pool de voz F (funkeiros RJ — tom do piloto f-rj: "BOTA A CARA!").
//
// Uso:
//   node tools/gerar-pilotos-fish.mjs --dry
//   FISH_AUDIO_API_KEY=... node tools/gerar-pilotos-fish.mjs [--so=mandrake] [--faltantes]
//
// API: POST https://api.fish.audio/v1/tts {text, reference_id, format:'mp3'}.
// HTTP 402 = crédito de API zerado (fish.audio/app/developers).
// Saída: public/audio/ia/pilotos-fish/<id>/<slug>.mp3 (gitignorado).

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/pilotos-fish';
const FISH_API = 'https://api.fish.audio/v1/tts';

const PILOTOS = [
  {
    id: 'cria-rj', ref: 'cf4a65e7fff3408aa30982d4ddfbddb2', nome: 'cria do RJ funk (pool F)',
    falas: [
      ['bota-a-cara', 'BOTA A CARA! Bota a cara agora!'],
      ['e-os-cria', 'É os cria, mermão!'],
      ['abaixa', 'Abaixa a CABEÇA!'],
      ['tomou', 'Tomou, né?! Fala aí!'],
    ],
  },
  {
    id: 'mandrake', ref: '6a27a3ab74af45cb8890a6974e9eeb06', nome: 'Mandrake (time F)',
    falas: [
      ['no-fluxo', 'No fluxo é assim, mano.'],
      ['na-regua', 'Corte na régua, mira na régua.'],
      ['perdeu-playboy', 'Perdeu, playboy.'],
      ['o-mandrake', 'Ó o mandrake! Juliet no rosto, ouro no pescoço.'],
    ],
  },
  {
    id: 'pagodeiro', ref: 'c481e5eba6254be49de0f33af6736085', nome: 'Pagodeiro (time U)',
    falas: [
      ['no-refrao', 'Acertei no refrão!'],
      ['sorriso', 'Sorriso aberto, gatilho também.'],
      ['pagode-e-paz', 'Pagode é paz... foi você que atirou primeiro.'],
      ['tanta', 'Tá no couro do tantã!'],
    ],
  },
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const faltantes = args.includes('--faltantes');
const so = (args.find(a => a.startsWith('--so=')) || '').replace('--so=', '').split(',').filter(Boolean);
const lote = PILOTOS.filter(p => !so.length || so.includes(p.id));

if (dry) {
  let n = 0;
  for (const p of lote) for (const [slug, texto] of p.falas) { console.log(`${p.id}/${slug}.mp3  [${p.nome}]  "${texto}"`); n++; }
  console.log(`\n${n} falas → ${OUT}/<id>/`);
  process.exit(0);
}

const KEY = process.env.FISH_AUDIO_API_KEY;
if (!KEY) { console.error('FISH_AUDIO_API_KEY ausente (set -a; source /Users/ruben/game/.env; set +a).'); process.exit(1); }

let ok = 0, erro = 0, pulado = 0;
for (const p of lote) {
  const dir = join(OUT, p.id);
  await mkdir(dir, { recursive: true });
  for (const [slug, texto] of p.falas) {
    const destino = join(dir, `${slug}.mp3`);
    if (faltantes && await access(destino).then(() => true, () => false)) { pulado++; continue; }
    let buf = null, err = null;
    for (let tent = 1; tent <= 2 && !buf; tent++) {
      try {
        const res = await fetch(FISH_API, {
          method: 'POST',
          headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: texto, reference_id: p.ref, format: 'mp3' }),
        });
        if (res.status === 402) throw new Error('HTTP 402 — crédito de API zerado (fish.audio/app/developers).');
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
        buf = Buffer.from(await res.arrayBuffer());
      } catch (e) { err = e; if (e.message.includes('402')) break; if (tent === 1) await new Promise(r => setTimeout(r, 2000)); }
    }
    if (!buf) { erro++; console.error(`✗ ${p.id}/${slug}.mp3: ${err.message}`); continue; }
    await writeFile(destino, buf);
    ok++;
    console.log(`✓ ${p.id}/${slug}.mp3`);
  }
}
console.log(`\n${ok} geradas, ${erro} erros${pulado ? `, ${pulado} puladas` : ''} → ${OUT}/`);
process.exit(erro ? 1 : 0);
