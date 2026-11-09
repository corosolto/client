#!/usr/bin/env node
// Lote 2 do Time Mítico: radio/round (o jogo roteia desde o PR #1263 e reaproveitava o
// bordão de kill) + Caipora inteira (único Mítico sem voz).
//
// Roteiro e casting: docs/audio/ROTEIRO-VOZES-MITICOS-RADIO.md (lote 1 em
// ROTEIRO-VOZES-MITICOS.md; vozes/idênticas ao PROVENANCE-v8.md — a identidade não muda
// entre kill e rádio). Lobisomem não fala (SFX já integrados).
//
// Uso:
//   node tools/gerar-vozes-miticos-radio.mjs --dry              # valida sem chave
//   node tools/gerar-vozes-miticos-radio.mjs                    # gera tudo
//   node tools/gerar-vozes-miticos-radio.mjs --so=caipora,cuca  # filtra
//   node tools/gerar-vozes-miticos-radio.mjs --faltantes        # só o que falta em disco
//
// Chaves: ELEVENLABS_API_KEY e FISH_AUDIO_API_KEY (set -a; source /Users/ruben/game/.env; set +a).
// Saída: public/audio/ia/miticos-radio/<id>/<evento>-<slug>-t<N>-<voz>.mp3 (gitignorado).

import { mkdir, writeFile, access, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/miticos-radio';
const ELEVEN_API = 'https://api.elevenlabs.io/v1';
const FISH_API = 'https://api.fish.audio/v1/tts';

// Vozes do lote 1 (PROVENANCE-v8.md) + Caipora (decisão do dono pendente: A=shinobu B=verity)
const VOZES = {
  'fish-nordestino': { backend: 'fish', ref: '9968a7351f6f4abda63be69518c29414', nome: 'Nordestino meia-idade (Fish)' },
  'fish-nordestina': { backend: 'fish', ref: '0f49c094859440a5b69c421a8ce2a570', nome: 'Nordestina clara (Fish)' },
  'fish-caipora-a': { backend: 'fish', ref: 'd4ee1915ce8e4708ab6b7e7eb97f43dd', nome: 'Shinobu BR — aguda animada (Fish, A)' },
  'fish-caipora-b': { backend: 'fish', ref: '52195d9c023a4d02a91bc7fd3eb6b53d', nome: 'Verity PT-BR — clara confiante (Fish, B)' },
  'cuca-vd': { backend: 'eleven', ref: 'TmfHJ19kMzZYALkBuv81', nome: 'Cuca (Mitico CS) — Voice Design' },
  'curupira-vd': { backend: 'eleven', ref: 'zKlPFm3CStZ8TNJn803F', nome: 'Curupira (Mitico CS) — Voice Design' },
  'boto-vd': { backend: 'eleven', ref: 'fLvlBA4sutzLZYXaKz0H', nome: 'Boto Cor de Rosa (Mitico CS) — Voice Design' },
  'acougueirao': { backend: 'eleven', ref: 'PSkrmGGNwoOIKXqzUWs9', nome: 'Açougueirão - Evil Cartoon Character' },
  'artur': { backend: 'eleven', ref: 'DFbzZEWhyi2l6rU3obC8', nome: 'Artur Mechedjiana' },
  'carlos': { backend: 'eleven', ref: 'NFmEzNOony1UsEJGXLth', nome: 'Carlos - Resonant & Majestic Storyteller' },
};

const semTags = (t) => t.replace(/\[[^\]]+\]\s*/g, '');
const MITICOS = [
  {
    id: 'caipora', vozes: ['fish-caipora-a', 'fish-caipora-b'],   // A/B pro dono
    falas: [
      ['select', 'guardia', 'A mata tem dona. E hoje ela tá armada.'],
      ['kill', 'virou-caca', 'Virou caça.'],
      ['kill', 'mata-cobra', 'A mata cobra.'],
      ['kill', 'sem-licenca', 'Caçou sem licença.'],
      ['kill', 'devolvido', 'Devolvido pro chão.'],
      ['kill', 'pisou-errado', 'Pisou onde não devia.'],
      ['kill', 'minha-mata', 'Minha mata, minhas regras.'],
      ['radio', 'farejei', 'Farejei um! Ali na frente.'],
      ['radio', 'rastro', 'Rastro fresco. Tem bicho perto.'],
      ['radio', 'cerca', 'Cerca ele comigo!'],
      ['round', 'mata-venceu', 'A mata venceu. Como sempre.'],
    ],
  },
  {
    id: 'lampiao', vozes: ['fish-nordestino', 'fish-nordestino'],
    falas: [
      ['radio', 'avistei', 'Avistei um, cabra! Na frente!'],
      ['radio', 'cerca', 'Cerca ele, meu bando!'],
      ['radio', 'lascou', 'Tem um ali. Lascô-se pra ele.'],
      ['round', 'sertao', 'O sertão é nosso, visse?'],
    ],
  },
  {
    id: 'mariabonita', vozes: ['fish-nordestina', 'fish-nordestina'],
    falas: [
      ['radio', 'vi-um', 'Vi um. Deixa comigo.'],
      ['radio', 'ali', 'Ali, ó. Mira nele.'],
      ['radio', 'cobre', 'Cobre eu, que eu acerto.'],
      ['round', 'assina', 'Assina embaixo: Maria levou.'],
    ],
  },
  {
    id: 'saci', vozes: ['acougueirao', 'acougueirao'],
    falas: [
      ['radio', 'achei', 'Achei um! [laughs]'],
      ['radio', 'ali-ali', 'Ali, ali! Tá vendo?'],
      ['radio', 'redemoinho', 'Vou de redemoinho nele!'],
      ['round', 'ganhamo', 'Ganhamo! [laughs] Uma perna só!'],
    ],
  },
  {
    id: 'curupira', vozes: ['curupira-vd', 'curupira-vd'],
    falas: [
      ['radio', 'pegada', 'Pegada nova! Vem cá!'],
      ['radio', 'tem-um', 'Tem um perdido ali.'],
      ['radio', 'assobio', '[whistles] Achei ele.'],
      ['round', 'mata-ganhou', 'A mata ganhou de novo.'],
    ],
  },
  {
    id: 'cuca', vozes: ['cuca-vd', 'cuca-vd'],
    falas: [
      ['radio', 'acordado', 'Tem um acordado ali.'],
      ['radio', 'vem-dormir', '[whispers] Vem dormir...'],
      ['radio', 'ninar', 'Deixa que eu nino esse.'],
      ['round', 'todos-dormiram', 'Todos dormiram. [laughs] Boa noite.'],
    ],
  },
  {
    id: 'boto', vozes: ['boto-vd', 'boto-vd'],
    falas: [
      ['radio', 'convidado', 'Temos um convidado, meu bem.'],
      ['radio', 'ali', 'Ali. Deixa que eu encanto.'],
      ['radio', 'rio', 'Saiu do rio um. Pra mim.'],
      ['round', 'rosa-levou', 'Rosa levou. Como sempre.'],
    ],
  },
  {
    id: 'bandeirante', vozes: ['artur', 'artur'],
    falas: [
      ['radio', 'rastreado', 'Rastreado. À frente.'],
      ['radio', 'sinal', 'Sinal fresco. Um.'],
      ['radio', 'marco', 'Marco a posição. Avança.'],
      ['round', 'mapeado', 'Território mapeado. Nosso.'],
    ],
  },
  {
    id: 'zumbi', vozes: ['carlos', 'carlos'],
    falas: [
      ['radio', 'inimigo', 'Inimigo à frente. Juntos!'],
      ['radio', 'avanca', 'Avança comigo!'],
      ['radio', 'firme', 'Firme. Eu cubro.'],
      ['round', 'palmares', 'Palmares vive. Vencemos.'],
    ],
  },
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const faltantes = args.includes('--faltantes');
const filtro = (args.find((a) => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean);
const lote = filtro.length ? MITICOS.filter((p) => filtro.includes(p.id)) : MITICOS;

const itens = [];
for (const p of lote) for (const [evento, slug, texto] of p.falas) for (const [i, apelido] of p.vozes.entries()) {
  itens.push({ id: p.id, evento, slug, texto, t: i + 1, ...VOZES[apelido], apelido });
}

if (dry) {
  for (const it of itens) console.log(`${it.id}/${it.evento}-${it.slug}-t${it.t}-${it.apelido}.mp3  [${it.backend}]  "${it.texto}"`);
  const porBackend = itens.reduce((a, i) => (a[i.backend] = (a[i.backend] || 0) + 1, a), {});
  console.log(`\n${itens.length} tomadas (${Object.entries(porBackend).map(([b, n]) => `${b}: ${n}`).join(', ')}) → ${OUT}/`);
  process.exit(0);
}

const precisa = new Set(itens.map((i) => i.backend));
const EKEY = process.env.ELEVENLABS_API_KEY, FKEY = process.env.FISH_AUDIO_API_KEY;
if (precisa.has('eleven') && !EKEY) { console.error('ELEVENLABS_API_KEY ausente.'); process.exit(1); }
if (precisa.has('fish') && !FKEY) { console.error('FISH_AUDIO_API_KEY ausente.'); process.exit(1); }

async function gerarEleven(ref, texto) {
  const res = await fetch(`${ELEVEN_API}/text-to-speech/${ref}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': EKEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: 'eleven_v3' }),
  });
  if (!res.ok) throw new Error(`eleven HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}
async function gerarFish(ref, texto) {
  const res = await fetch(FISH_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${FKEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: semTags(texto), reference_id: ref, format: 'mp3' }),
  });
  if (res.status === 402) throw new Error('fish HTTP 402 — crédito de API zerado.');
  if (!res.ok) throw new Error(`fish HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

let ok = 0, erro = 0, pulado = 0;
const falhas = [];
let fish402 = false;
for (const it of itens) {
  if (fish402 && it.backend === 'fish') { pulado++; continue; }
  const dir = join(OUT, it.id);
  await mkdir(dir, { recursive: true });
  const nome = `${it.evento}-${it.slug}-t${it.t}-${it.apelido}.mp3`;
  const destino = join(dir, nome);
  if (faltantes && await access(destino).then(() => true, () => false)) { pulado++; continue; }
  let buf = null, err = null;
  for (let tent = 1; tent <= 2 && !buf; tent++) {
    try { buf = it.backend === 'fish' ? await gerarFish(it.ref, it.texto) : await gerarEleven(it.ref, it.texto); }
    catch (e) {
      err = e;
      if (String(e.message).includes('402')) { fish402 = true; break; }
      if (tent === 1) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!buf) { erro++; falhas.push(`${it.id}/${nome}`); await unlink(destino).catch(() => {}); console.error(`✗ ${it.id}/${nome}: ${err.message}`); continue; }
  if (buf.length < 1000) { erro++; falhas.push(`${it.id}/${nome}`); console.error(`✗ ${it.id}/${nome}: áudio suspeito (${buf.length} B)`); continue; }
  await writeFile(destino, buf);
  ok++;
  console.log(`✓ ${it.id}/${nome} [${it.backend}]`);
}
console.log(`\n${ok} geradas, ${erro} erros${pulado ? `, ${pulado} puladas` : ''} → ${OUT}/`);
if (fish402) console.log('AGUARDANDO CRÉDITO FISH: re-rode com --faltantes.');
if (falhas.length) console.log(`Falhas (re-rode com --faltantes): ${falhas.join(', ')}`);
process.exit(erro ? 1 : 0);
