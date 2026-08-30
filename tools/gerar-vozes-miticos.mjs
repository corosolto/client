#!/usr/bin/env node
// Kill-shouts do Time Mítico — ELENCO MISTO (Fish Audio + ElevenLabs).
// Casting final vive em docs/audio/ROTEIRO-VOZES-MITICOS.md; esta tabela espelha ele.
//
// Backends por personagem (veredito do dono, 30/08):
//   fish   → lampiao (A/B entre 2 modelos comunitários), mariabonita
//   eleven → cuca/curupira/boto (vozes fixadas via Voice Design),
//            saci/bandeirante/zumbi (vozes da Voice Library já na conta)
//   (lobisomem NÃO fala: set SFX *-t2.mp3 de tools/gerar-sfx-lobisomem.mjs)
//
// Uso:
//   node tools/gerar-vozes-miticos.mjs --dry                     # valida sem chave
//   node tools/gerar-vozes-miticos.mjs                           # gera tudo (chaves no env)
//   node tools/gerar-vozes-miticos.mjs --so=lampiao,cuca         # filtra personagens
//   node tools/gerar-vozes-miticos.mjs --backend=fish            # só um backend
//   node tools/gerar-vozes-miticos.mjs --faltantes               # só o que falta em disco
//
// Chaves: ELEVENLABS_API_KEY e FISH_AUDIO_API_KEY (set -a; source /Users/ruben/game/.env; set +a).
// Fish: POST https://api.fish.audio/v1/tts {text, reference_id, format:'mp3'}.
//   HTTP 402 = crédito de API zerado (fish.audio/app/developers) — o script avisa e aborta.
// Eleven: eleven_v3 (audio tags [assim] valem; no Fish as tags são removidas do texto).
// Saída: public/audio/ia/miticos/<id>/<slug>-tN-<voz>.mp3 (gitignorado; mp3 fora do git).

import { mkdir, writeFile, access, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/miticos';
const ELEVEN_API = 'https://api.elevenlabs.io/v1';
const FISH_API = 'https://api.fish.audio/v1/tts';

// Vozes: apelido → { backend, ref (voice_id do Eleven ou reference_id do Fish), nome }
const VOZES = {
  'fish-vaqueiro': { backend: 'fish', ref: '80dfc9e3e97b45ff94978b3eff801855', nome: 'Vaqueiro Nordestino Animado (Fish)' },
  'fish-nordestino': { backend: 'fish', ref: '9968a7351f6f4abda63be69518c29414', nome: 'Nordestino meia-idade (Fish)' },
  'fish-nordestina': { backend: 'fish', ref: 'e2415382319c40f4bdc9c5baa314cd76', nome: 'NORDESTINA MENINA (Fish)' },
  'cuca-vd': { backend: 'eleven', ref: 'TmfHJ19kMzZYALkBuv81', nome: 'Cuca (Mitico CS) — Voice Design r2-p3' },
  'curupira-vd': { backend: 'eleven', ref: 'zKlPFm3CStZ8TNJn803F', nome: 'Curupira (Mitico CS) — Voice Design r2-p2' },
  'boto-vd': { backend: 'eleven', ref: 'fLvlBA4sutzLZYXaKz0H', nome: 'Boto Cor de Rosa (Mitico CS) — Voice Design r2-p3' },
  'acougueirao': { backend: 'eleven', ref: 'PSkrmGGNwoOIKXqzUWs9', nome: 'Açougueirão - Evil Cartoon Character' },
  'artur': { backend: 'eleven', ref: 'DFbzZEWhyi2l6rU3obC8', nome: 'Artur Mechedjiana' },
  'carlos': { backend: 'eleven', ref: 'NFmEzNOony1UsEJGXLth', nome: 'Carlos - Resonant & Majestic Storyteller' },
};

// Falas: [slug, texto]. Tags [assim] só valem no eleven_v3 (removidas no Fish).
// `vozes`: 2 entradas = tomadas t1/t2 (A/B); entrada repetida = 2 tomadas da
// mesma voz (variação natural entre gerações) pro dono escolher a melhor.
const MITICOS = [
  {
    id: 'lampiao', vozes: ['fish-vaqueiro', 'fish-nordestino'], // A/B pro dono
    // Grafia dialetal de propósito — a pronúncia sai da grafia no TTS.
    falas: [
      ['oxente', 'Ôxente!'],
      ['vote', 'Vôte!'],
      ['arre-egua', 'Arre égua!'],
      ['cabra-da-peste', 'Cabra da peste!'],
      ['visse', 'Visse?!'],
      ['lascou-se', 'Lascô-se!'],
      ['oia', 'Óia pra isso, môço!'],
      ['pisar', 'Quem mandou pisá no meu sertão?'],
    ],
  },
  {
    id: 'mariabonita', vozes: ['fish-nordestina', 'fish-nordestina'],
    falas: [
      ['caiu-ligeiro', 'Caiu ligeiro, visse?'],
      ['assina-maria', 'Assina: Maria.'],
      ['um-tiro', 'Um tiro só.'],
      ['vote-errou', 'Vôte, errou!'],
      ['arretada', 'Arretada, eu.'],
      ['de-nada-cabra', 'De nada, cabra.'],
      ['oxente-rara', 'Ôxente, caiu foi ligeiro, visse? Assina embaixo: Maria.'],
    ],
  },
  {
    id: 'saci', vozes: ['acougueirao', 'acougueirao'],
    falas: [
      ['sumiu', 'Sumiu! [laughs]'],
      ['pegadinha', 'Pegadinha!'],
      ['redemoinho', 'Redemoinho!'],
      ['era-eu', '[laughs] Era eu!'],
      ['uma-perna', 'Uma perna!'],
      ['achou-nao', 'Achou não!'],
      ['vento', 'Cadê tua munição? Pergunta pro vento! [laughs]'],
    ],
  },
  {
    id: 'curupira', vozes: ['curupira-vd', 'curupira-vd'],
    falas: [
      ['pe-virado', 'Pé virado!'],
      ['rastro-errado', 'Rastro errado!'],
      ['perdeu', 'Se perdeu!'],
      ['mata-cobra', '[whispers] A mata cobra.'],
      ['voltou-nao', 'Voltou não!'],
      ['fiu-fiu', '[whistles] Já era!'],
      ['pegada', 'Seguiu minha pegada? Chegou no lugar errado.'],
    ],
  },
  {
    id: 'cuca', vozes: ['cuca-vd', 'cuca-vd'],
    falas: [
      ['nana-nenem', '[whispers] Nana, neném.'],
      ['dorme', 'Dorme.'],
      ['boa-noite', 'Boa noite...'],
      ['sonho-bom', 'Sonho bom? [laughs]'],
      ['hora-de-dormir', 'Hora de dormir.'],
      ['mais-um', 'Mais um dormiu.'],
      ['cem-anos', 'Cem anos acordada... e tu já dormiu. [laughs]'],
    ],
  },
  {
    id: 'boto', vozes: ['boto-vd', 'boto-vd'],
    falas: [
      ['encantei', 'Encantei.'],
      ['charme-puro', 'Charme puro.'],
      ['meu-bem', 'Meu bem...'],
      ['afundou', 'Afundou.'],
      ['que-pena', 'Que pena.'],
      ['rosa-vence', 'Rosa vence.'],
      ['danca', 'A dança acabou, meu bem. Volto pro fundo.'],
    ],
  },
  // Lobisomem: SEM fala humana — set SFX aprovado: *-t2.mp3 (gerar-sfx-lobisomem.mjs).
  {
    id: 'bandeirante', vozes: ['artur', 'artur'],
    falas: [
      ['rastreado', 'Rastreado.'],
      ['marco-novo', 'Marco novo.'],
      ['fim-da-trilha', 'Fim da trilha.'],
      ['previsivel', '[sighs] Previsível.'],
      ['mapeado', 'Mapeado.'],
      ['achei', 'Achei.'],
      ['historia', 'Toda pegada conta uma história. A tua acabou.'],
    ],
  },
  {
    id: 'zumbi', vozes: ['carlos', 'carlos'],
    falas: [
      ['palmares', '[shouts] Palmares!'],
      ['liberdade', '[shouts] Liberdade!'],
      ['avanca', 'Avança!'],
      ['de-pe', 'De pé!'],
      ['pela-serra', 'Pela serra!'],
      ['coragem', 'Coragem!'],
      ['quilombo', 'Cai a muralha. Não cai o quilombo.'],
    ],
  },
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const faltantes = args.includes('--faltantes');
const so = (args.find(a => a.startsWith('--so=')) || '').replace('--so=', '').split(',').filter(Boolean);
const backendFiltro = (args.find(a => a.startsWith('--backend=')) || '').replace('--backend=', '');
const lote = MITICOS.filter(p => !so.length || so.includes(p.id));

const semTags = (t) => t.replace(/\[[a-z ]+\]/gi, '').replace(/\s+/g, ' ').trim();
const itens = [];
for (const p of lote) for (const [slug, texto] of p.falas) for (const [i, apelido] of p.vozes.entries()) {
  const v = VOZES[apelido];
  if (backendFiltro && v.backend !== backendFiltro) continue;
  itens.push({ id: p.id, slug, texto, t: i + 1, apelido, ...v });
}

if (dry) {
  for (const it of itens)
    console.log(`${it.id}/${it.slug}-t${it.t}-${it.apelido}.mp3  [${it.backend}: ${it.nome}]  "${it.texto}"`);
  const porBackend = itens.reduce((a, i) => (a[i.backend] = (a[i.backend] || 0) + 1, a), {});
  console.log(`\n${itens.length} tomadas (${Object.entries(porBackend).map(([b, n]) => `${b}: ${n}`).join(', ')}) → ${OUT}/<id>/`);
  process.exit(0);
}

const precisa = new Set(itens.map(i => i.backend));
const EKEY = process.env.ELEVENLABS_API_KEY, FKEY = process.env.FISH_AUDIO_API_KEY;
if (precisa.has('eleven') && !EKEY) { console.error('ELEVENLABS_API_KEY ausente (set -a; source /Users/ruben/game/.env; set +a).'); process.exit(1); }
if (precisa.has('fish') && !FKEY) { console.error('FISH_AUDIO_API_KEY ausente (set -a; source /Users/ruben/game/.env; set +a).'); process.exit(1); }

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
  if (res.status === 402) {
    throw new Error('fish HTTP 402 — crédito de API zerado; carregue em fish.audio/app/developers (crédito de API é separado do da plataforma).');
  }
  if (!res.ok) throw new Error(`fish HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

let ok = 0, erro = 0, pulado = 0;
const falhas = [];
let fish402 = false;
for (const it of itens) {
  if (fish402 && it.backend === 'fish') { pulado++; continue; } // 402 não muda no meio do lote
  const dir = join(OUT, it.id);
  await mkdir(dir, { recursive: true });
  const nome = `${it.slug}-t${it.t}-${it.apelido}.mp3`;
  const destino = join(dir, nome);
  if (faltantes && await access(destino).then(() => true, () => false)) { pulado++; continue; }
  let buf = null, err = null;
  for (let tent = 1; tent <= 2 && !buf; tent++) {
    try { buf = it.backend === 'fish' ? await gerarFish(it.ref, it.texto) : await gerarEleven(it.ref, it.texto); }
    catch (e) {
      err = e;
      if (e.message.includes('402')) { fish402 = true; break; }
      if (tent === 1) await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!buf) {
    erro++;
    falhas.push(`${it.id}/${nome}`);
    await unlink(destino).catch(() => {});
    console.error(`✗ ${it.id}/${nome}: ${err.message}`);
    continue;
  }
  if (buf.length < 1000) { erro++; falhas.push(`${it.id}/${nome}`); console.error(`✗ ${it.id}/${nome}: áudio suspeito (${buf.length} B)`); continue; }
  await writeFile(destino, buf);
  ok++;
  console.log(`✓ ${it.id}/${nome} [${it.backend}]`);
}
console.log(`\n${ok} geradas, ${erro} erros${pulado ? `, ${pulado} puladas` : ''} → ${OUT}/`);
if (fish402) console.log('AGUARDANDO CRÉDITO FISH: re-rode com --faltantes quando o crédito entrar.');
if (falhas.length) console.log(`Falhas (re-rode com --faltantes): ${falhas.join(', ')}`);
process.exit(erro ? 1 : 0);
