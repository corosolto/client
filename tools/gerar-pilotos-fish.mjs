#!/usr/bin/env node
// Upgrade de vozes dos FUNKEIROS (+ Pagodeiro do U) via Fish Audio — modelos
// comunitários escolhidos pelo dono (30/08). STAGING SEPARADO: o pack F atual
// fica intacto; integração no pool é decisão à parte.
// Roteiro versionado: docs/audio/ROTEIRO-FUNKEIROS-UPGRADE.md (esta tabela espelha ele).
//
// Uso:
//   node tools/gerar-pilotos-fish.mjs --dry
//   FISH_AUDIO_API_KEY=... node tools/gerar-pilotos-fish.mjs [--so=mandrake] [--faltantes]
//
// API: POST https://api.fish.audio/v1/tts {text, reference_id, format:'mp3'}.
// HTTP 402 = crédito de API zerado (fish.audio/app/developers).
// Saída: public/audio/ia/funkeiros-upgrade/<id>/<slug>.mp3 (gitignorado).
// Destino de cada fala (kill=ingame, select=tela de seleção) está no roteiro.

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/funkeiros-upgrade';
const FISH_API = 'https://api.fish.audio/v1/tts';

// falas: [slug, texto, destino ('kill' | 'select')]
const PILOTOS = [
  {
    id: 'cria-rj', ref: 'cf4a65e7fff3408aa30982d4ddfbddb2', nome: 'cria do RJ funk (pool F)',
    falas: [
      ['bota-a-cara', 'BOTA A CARA! Bota a cara agora!', 'kill'],
      ['e-os-cria', 'É os cria, mermão!', 'kill'],
      ['abaixa', 'Abaixa a CABEÇA!', 'kill'],
      ['tomou', 'Tomou, né?! Fala aí!', 'kill'],
      ['ta-de-xereka', 'Tá de xereka!', 'kill'],
      ['sarneou', 'Sarneou!', 'kill'],
    ],
  },
  {
    id: 'funkraiz', ref: '8ccdb95bd1f3415d8a4004ff13b95c3c', nome: 'Funk Raiz (F) — das antigas',
    falas: [
      ['coe-caiu', 'Coé, caiu!', 'kill'],
      ['das-antigas', 'Das antigas, né?', 'kill'],
      ['tamborzao', 'Tamborzão comeu.', 'kill'],
      ['na-base', 'Na base do charme.', 'kill'],
      ['sentiu-o-grave', 'Sentiu o grave.', 'kill'],
      ['select-raiz', 'Funk raiz é isso: tamborzão no peito e respeito na pista.', 'select'],
    ],
  },
  {
    id: 'trapfunk', ref: 'b1355c5151eb43d88df3efe2e1bad5c7', nome: 'Trap Funk (F) — drill/trap',
    falas: [
      ['no-beat', 'No beat, mano.', 'kill'],
      ['oitocentos-e-oito', '808 no peito.', 'kill'],
      ['tomou-drill', 'Tomou drill.', 'kill'],
      ['ta-pago', 'Tá pago.', 'kill'],
      ['sem-flow', 'Sem flow, né?', 'kill'],
      ['select-trap', 'Autotune no grito e 808 no coração — isso aqui é trap funk.', 'select'],
    ],
  },
  {
    id: 'oakley', ref: '0c5d8d65ded6439a8466e3ca8ec73a50', nome: 'Oakley (F) — mandrakeria Juliet',
    falas: [
      ['pela-lente', 'Pela lente, cria.', 'kill'],
      ['juliet-viu', 'Juliet viu tudo.', 'kill'],
      ['brilhou-caiu', 'Brilhou, caiu.', 'kill'],
      ['estilo-mata', 'Estilo mata.', 'kill'],
      ['perdeu-a-pose', 'Perdeu a pose.', 'kill'],
      ['select-oakley', 'De Juliet no rosto e corte na régua — quem brilha aqui sou eu.', 'select'],
    ],
  },
  {
    id: 'mandrake', ref: '6a27a3ab74af45cb8890a6974e9eeb06', nome: 'Mandrake (F)',
    falas: [
      ['no-fluxo', 'No fluxo é assim, mano.', 'kill'],
      ['na-regua', 'Corte na régua, mira na régua.', 'kill'],
      ['perdeu-playboy', 'Perdeu, playboy.', 'kill'],
      ['quebrada-manda', 'Quebrada manda.', 'kill'],
      ['o-mandrake', 'Ó o mandrake! Juliet no rosto, ouro no pescoço.', 'select'],
    ],
  },
  {
    id: 'pagodeiro', ref: 'c481e5eba6254be49de0f33af6736085', nome: 'Pagodeiro (U)',
    falas: [
      ['no-refrao', 'Acertei no refrão!', 'kill'],
      ['sorriso', 'Sorriso aberto, gatilho também.', 'kill'],
      ['tanta', 'Tá no couro do tantã!', 'kill'],
      ['so-no-grave', 'Só no grave, parceiro.', 'kill'],
      ['pagode-e-paz', 'Pagode é paz... foi você que atirou primeiro.', 'select'],
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
  for (const p of lote) for (const [slug, texto, destino] of p.falas) { console.log(`${p.id}/${slug}.mp3 (${destino}) [${p.nome}]  "${texto}"`); n++; }
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
