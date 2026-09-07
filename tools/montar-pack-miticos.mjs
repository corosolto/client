#!/usr/bin/env node
// Monta a ESTRUTURA FONTE do pack v8 do Time Mítico a partir das tomadas
// aprovadas pelo dono (30/08), no layout que o gen-audio-manifest.mjs do
// PR #481/merge-399 espera (lá `miticos → M` já está no FACTIONS):
//
//   kills  → public/audio/miticos/ingame/<id>-<slug>.mp3   → pool voice.M
//   raras  → public/audio/characters/<id>/select/<slug>.mp3 → characterVoice.<id>
//   lobo   → SFX *-t2.mp3 aprovados → miticos/ingame/lobisomem-<slug>.mp3
//
// Regra do dono: "frases finais longas ficam na TELA DE SELEÇÃO; as
// expressões (curtas) vão no GAME".
//
// Uso: node tools/montar-pack-miticos.mjs [--dry]
// Fontes: public/audio/ia/miticos/ e public/audio/ia/miticos-sfx/ (gitignorados).

import { mkdir, copyFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const IA = 'public/audio/ia/miticos';
const SFX = 'public/audio/ia/miticos-sfx/lobisomem';
const INGAME = 'public/audio/miticos/ingame';
const CHARS = 'public/audio/characters';

// Tomada aprovada por personagem (30/08) → sufixo -tN-<apelido> dos arquivos.
const TOMADA = {
  lampiao: 't2-fish-nordestino',
  mariabonita: 't1-fish-nordestina', // modelo novo do dono (regravada)
  saci: 't2-acougueirao',
  curupira: 't2-curupira-vd',
  cuca: 't2-cuca-vd',
  boto: 't1-boto-vd',
  bandeirante: 't1-artur',
  zumbi: 't1-carlos',
};

// slug → destino: 'select' para as raras; todo o resto é kill/ingame.
const SELECT = {
  lampiao: ['oia', 'pisar'],
  mariabonita: ['oxente-rara'],
  saci: ['vento'],
  curupira: ['pegada'],
  cuca: ['cem-anos'],
  boto: ['danca'],
  bandeirante: ['historia'],
  zumbi: ['quilombo'],
};

const FALAS = {
  lampiao: ['oxente', 'vote', 'arre-egua', 'cabra-da-peste', 'visse', 'lascou-se', 'oia', 'pisar'],
  mariabonita: ['caiu-ligeiro', 'assina-maria', 'um-tiro', 'vote-errou', 'arretada', 'de-nada-cabra', 'oxente-rara'],
  saci: ['sumiu', 'pegadinha', 'redemoinho', 'era-eu', 'uma-perna', 'achou-nao', 'vento'],
  curupira: ['pe-virado', 'rastro-errado', 'perdeu', 'mata-cobra', 'voltou-nao', 'fiu-fiu', 'pegada'],
  cuca: ['nana-nenem', 'dorme', 'boa-noite', 'sonho-bom', 'hora-de-dormir', 'mais-um', 'cem-anos'],
  boto: ['encantei', 'charme-puro', 'meu-bem', 'afundou', 'que-pena', 'rosa-vence', 'danca'],
  bandeirante: ['rastreado', 'marco-novo', 'fim-da-trilha', 'previsivel', 'mapeado', 'achei', 'historia'],
  zumbi: ['palmares', 'liberdade', 'avanca', 'de-pe', 'pela-serra', 'coragem', 'quilombo'],
};

// Set do lobo (SFX t2 aprovados) — tudo ingame.
const LOBO = ['uivo-lua', 'uivo-vitoria', 'rosnado-baixo', 'rosnado-agressivo', 'latido-duplo', 'bufo', 'mordida', 'rosnado-uivo'];

const dry = process.argv.includes('--dry');
const planos = [];
for (const [id, slugs] of Object.entries(FALAS)) {
  for (const slug of slugs) {
    const fonte = join(IA, id, `${slug}-${TOMADA[id]}.mp3`);
    const destino = SELECT[id].includes(slug)
      ? join(CHARS, id, 'select', `${slug}.mp3`)
      : join(INGAME, `${id}-${slug}.mp3`);
    planos.push([fonte, destino]);
  }
}
for (const slug of LOBO) planos.push([join(SFX, `${slug}-t2.mp3`), join(INGAME, `lobisomem-${slug}.mp3`)]);

let ok = 0, falta = 0;
for (const [fonte, destino] of planos) {
  const existe = await access(fonte).then(() => true, () => false);
  if (!existe) { falta++; console.error(`✗ FALTA fonte: ${fonte}`); continue; }
  if (dry) { console.log(`${fonte} → ${destino}`); ok++; continue; }
  await mkdir(join(destino, '..'), { recursive: true });
  await copyFile(fonte, destino);
  ok++;
  console.log(`✓ ${destino}`);
}
console.log(`\n${ok} arquivos${dry ? ' (dry)' : ''}, ${falta} fontes faltando.`);
process.exit(falta ? 1 : 0);
