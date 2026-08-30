#!/usr/bin/env node
// Kill-shouts do Time Mítico via ElevenLabs.
// 2 tomadas por fala (2 vozes do casting por personagem) em
// public/audio/ia/miticos/<id>/ para o dono escolher no ouvido.
// public/audio é gitignorado — mp3 não entra no git.
//
// Uso:
//   ELEVENLABS_API_KEY=... node tools/gerar-vozes-miticos.mjs        # gera tudo
//   node tools/gerar-vozes-miticos.mjs --dry                          # só lista (sem chave)
//   node tools/gerar-vozes-miticos.mjs --so=saci,cuca                 # filtra personagens
//   node tools/gerar-vozes-miticos.mjs --faltantes                    # só o que não existe em disco
//
// Chave: `set -a; source /Users/ruben/game/.env; set +a` (ELEVENLABS_API_KEY).
// Modelo: eleven_v3 quando a conta lista (audio tags [laughs]/[whispers]/[shouts]
// no texto); senão eleven_multilingual_v2 (tags são removidas do texto).
// Casting: vozes PT-BR da Voice Library (shared voices) escolhidas por arquétipo;
// o script adiciona à conta o que faltar (POST /v1/voices/add). 401/403 ⇒ a conta
// não permite — mensagem clara e aborta.
//
// Roteiro versionado: docs/audio/ROTEIRO-VOZES-MITICOS.md (esta tabela espelha ele).
// Regras: arquétipo, nunca imitação de pessoa real; PT-BR; PEGI12; kill ≤ 2 s.

import { mkdir, writeFile, access, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/miticos';
const API = 'https://api.elevenlabs.io/v1';

// ── CASTING — 2 vozes PT-BR da Voice Library por personagem, por arquétipo.
// owner = public_owner_id (necessário pra adicionar a shared voice à conta).
const VOZES = {
  'silas': { id: 'mP51FBaz7jxNEIeFJwxX', owner: '7f5b74ee924319673b8a91ba827e5a5054f5f0661512b0485931e53f333f4f68', nome: 'Silas Lemos - Rural, Country & Regional' },
  'jose-rural': { id: 'aU2vcrnwi348Gnc2Y1si', owner: 'a5d1de8d4ae12abd6bca8494f65b64c120b0faabdbb1050d27cb4145ab853572', nome: 'José - Rural character' },
  'nayara': { id: '5p4THmLc2S6kXKO1pOM5', owner: '2c5f613b2a801b3a9a6142a4dd45fcf14b14c7ccd3771350cbf776815e7350af', nome: 'Nayara Técia' },
  'marina': { id: 'LoAPFpWkyQ3pDQQqXaq2', owner: 'e8105599092c35fc5fbfd0f13ed0c065ffa4c5f80e1b9318b4ca948adb573fd2', nome: 'Marina Lara' },
  'acougueirao': { id: 'PSkrmGGNwoOIKXqzUWs9', owner: '11f5dbf865f30830c546ca6660eeae1fd7c90c6d500a9e118994b04426b2ea90', nome: 'Açougueirão - Evil Cartoon Character' },
  'viajante': { id: 'urHXVUOxm0ZDI0ypEYDd', owner: '532513d7ad1f800f95393cef5f9eda8a0b387d0f21d88a50c61a78d0224b332d', nome: 'O Viajante - Cinematic Storyteller' },
  'nick': { id: '2SkYIfyzuRTrp5E5AUcL', owner: '77b8f04f66ff1b3430fcaf0f143cc8ff3ca6583a7591af333b6dd5eddc782d11', nome: 'Nick - Storyteller' },
  'wesley': { id: 'WFSxKvz27RguNRD3Phoq', owner: '6f3ed43e2ba1aec7ac466f38e2ab82c5937fe244df1e88d9213be37752ae3924', nome: 'Wesley Bessa - Narration Storyteller' },
  'lucinda': { id: 'fs3nd19KF2GO2hLTzkBm', owner: '64cbc624eb5aab4e95a968e1f41d75402277cca6e549036ed17e56ea33bbbc9e', nome: 'Lucinda - Earthy and Wise' },
  'edna': { id: 'FrCDCQwye0euHmliGxP9', owner: '9ec3cedbd85658ea190c75a333058d0cda58148f7eff8f474d271329af1bd58b', nome: 'Edna - Warm, Motherly and Calm' },
  'cassian': { id: 'SvP2QJFsRvn3JevnwLQM', owner: '64cbc624eb5aab4e95a968e1f41d75402277cca6e549036ed17e56ea33bbbc9e', nome: 'Cassian - Deep and Velvety' },
  'thiago': { id: 'ELBrtmIkk40wCZ5YnlwM', owner: '64cbc624eb5aab4e95a968e1f41d75402277cca6e549036ed17e56ea33bbbc9e', nome: 'Thiago - Warm and inviting' },
  'otto': { id: 'ycxdm1PRMs962FxyyuJ0', owner: '5e03f44c89e94859c8482d6758ec0d7bbc024364d5c67c19f6b18bd720d1087a', nome: 'Otto - Intimidating and Aggressive' },
  'adriano': { id: 'CPYJeGOY3LvpmBJRlYK9', owner: 'c6f7bbc2e650c7819acd0e5663857b01a16fdbef5867d70071c718b540990abd', nome: 'Adriano Ferreira' },
  'manoel': { id: 'kuFf6szoZvaTNcNpMHxf', owner: '1aaa519466d38c2c71d8251a8cd7eedcdb23da1e1282bb722d2e1da454337bc2', nome: 'Manoel - Serious & Elegant' },
  'artur': { id: 'DFbzZEWhyi2l6rU3obC8', owner: '562eb4e8a7aa06bf9eec43d5f03f1f7c06ca70536f6712e6ca3e5ac9be07f93b', nome: 'Artur Mechedjiana' },
  'carlos': { id: 'NFmEzNOony1UsEJGXLth', owner: '06f1f9c5e35b9b5da6e9652d13031825d85232d607a480e2a4fde335dce4d590', nome: 'Carlos - Resonant & Majestic Storyteller' },
  'junior': { id: 'GUoUIVwrYMt939C4KaXK', owner: '55cd5cfd6b6cef09fc98d4ee67f82522a9acf2950711aa276b21ea78fb32c1d0', nome: 'Júnior - Narration & History' },
};

// Falas: [slug, texto-com-tags-v3]. Tags [assim] só valem no eleven_v3; no
// fallback multilingual_v2 são removidas do texto antes de enviar.
const MITICOS = [
  {
    id: 'lampiao', vozes: ['silas', 'jose-rural'],
    falas: [
      ['arreda', '[shouts] Arreda!'],
      ['virgem-maria', 'Virgem Maria!'],
      ['cangaco', '[shouts] Cangaço!'],
      ['deitou', 'Deitou.'],
      ['no-chao', 'No chão, moço!'],
      ['sertao-manda', 'Sertão manda!'],
      ['cordel', 'Mais um pro cordel.'],
      ['pisar', 'Quem mandou pisar no meu sertão?'],
    ],
  },
  {
    id: 'mariabonita', vozes: ['nayara', 'marina'],
    falas: [
      ['acertou-eu', 'Acertou? Eu.'],
      ['primeiro-tiro', 'Primeiro tiro.'],
      ['bonita-ne', 'Bonita, né?'],
      ['caiu', '[whispers] Caiu.'],
      ['mira-e-dom', 'Mira é dom.'],
      ['de-nada', 'De nada.'],
      ['assina', 'Parou, mirou, acertou. Assina: Maria.'],
    ],
  },
  {
    id: 'saci', vozes: ['acougueirao', 'viajante'],
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
    id: 'curupira', vozes: ['nick', 'wesley'],
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
    id: 'cuca', vozes: ['lucinda', 'edna'],
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
    id: 'boto', vozes: ['cassian', 'thiago'],
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
  {
    id: 'lobisomem', vozes: ['otto', 'adriano'],
    falas: [
      ['mordi', '[growls] Mordi.'],
      ['uivo', 'Auuuu!'],
      ['lua-cheia', 'Lua cheia!'],
      ['meu', 'Meu.'],
      ['caca-encerrada', 'Caça encerrada.'],
      ['cheiro-medo', 'Cheirinho de medo.'],
      ['setimo', 'Sétimo filho... primeira mordida da noite.'],
    ],
  },
  {
    id: 'bandeirante', vozes: ['manoel', 'artur'],
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
    id: 'zumbi', vozes: ['carlos', 'junior'],
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
const lote = MITICOS.filter(p => !so.length || so.includes(p.id));

const semTags = (t) => t.replace(/\[[a-z ]+\]/gi, '').replace(/\s+/g, ' ').trim();

if (dry) {
  let n = 0, chars = 0;
  for (const p of lote) for (const [slug, texto] of p.falas) for (const [i, v] of p.vozes.entries()) {
    console.log(`${p.id}/${slug}-t${i + 1}-${v}.mp3  [${VOZES[v].nome}]  "${texto}"`);
    n++; chars += texto.length;
  }
  console.log(`\n${n} tomadas (~${chars} caracteres) → ${OUT}/<id>/`);
  process.exit(0);
}

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('ELEVENLABS_API_KEY ausente. Carregue com: set -a; source /Users/ruben/game/.env; set +a');
  process.exit(1);
}
const H = { 'xi-api-key': KEY };

async function api(caminho, opts = {}) {
  const res = await fetch(`${API}${caminho}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`HTTP ${res.status} em ${caminho} — a conta ElevenLabs não permite esta operação ` +
      '(tier free limita shared voices/Voice Design; confira a chave e o tier).');
  }
  return res;
}

// Modelo: eleven_v3 se a conta lista; senão multilingual_v2 (e remove as tags).
async function escolherModelo() {
  const res = await api('/models');
  if (!res.ok) throw new Error(`GET /models: HTTP ${res.status}`);
  const ids = (await res.json()).map(m => m.model_id);
  const v3 = ids.includes('eleven_v3');
  console.log(`Modelo: ${v3 ? 'eleven_v3 (audio tags ativos)' : 'eleven_multilingual_v2 (fallback, tags removidas)'}`);
  return v3 ? 'eleven_v3' : 'eleven_multilingual_v2';
}

// Garante que as vozes do casting existem na conta (shared voice precisa de add).
async function garantirVozes() {
  const res = await api('/voices');
  if (!res.ok) throw new Error(`GET /voices: HTTP ${res.status}`);
  const naConta = new Set((await res.json()).voices.map(v => v.voice_id));
  const usadas = new Set(lote.flatMap(p => p.vozes));
  for (const apelido of usadas) {
    const v = VOZES[apelido];
    if (naConta.has(v.id)) continue;
    const add = await api(`/voices/add/${v.owner}/${v.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: v.nome }),
    });
    if (!add.ok) throw new Error(`add voz "${v.nome}": HTTP ${add.status} — ${(await add.text()).slice(0, 200)}`);
    console.log(`+ voz adicionada à conta: ${v.nome}`);
  }
}

async function gerar(modelo, voiceId, texto) {
  const corpo = { text: modelo === 'eleven_v3' ? texto : semTags(texto), model_id: modelo };
  if (modelo !== 'eleven_v3') corpo.voice_settings = { stability: 0.35, similarity_boost: 0.8, style: 0.6 };
  const res = await api(`/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`áudio suspeito (${buf.length} B)`);
  return buf;
}

const modelo = await escolherModelo();
await garantirVozes();

let ok = 0, erro = 0, pulado = 0, chars = 0;
const falhas = [];
for (const p of lote) {
  const dir = join(OUT, p.id);
  await mkdir(dir, { recursive: true });
  for (const [slug, texto] of p.falas) {
    for (const [i, apelido] of p.vozes.entries()) {
      const nome = `${slug}-t${i + 1}-${apelido}.mp3`;
      const destino = join(dir, nome);
      if (faltantes && await access(destino).then(() => true, () => false)) { pulado++; continue; }
      let buf = null, err = null;
      for (let tentativa = 1; tentativa <= 2 && !buf; tentativa++) {
        try { buf = await gerar(modelo, VOZES[apelido].id, texto); }
        catch (e) { err = e; if (tentativa === 1) await new Promise(r => setTimeout(r, 2000)); }
      }
      if (!buf) {
        erro++;
        falhas.push(`${p.id}/${nome}`);
        await unlink(destino).catch(() => {});
        console.error(`✗ ${p.id}/${nome}: ${err.message}`);
        continue;
      }
      await writeFile(destino, buf);
      ok++;
      chars += (modelo === 'eleven_v3' ? texto : semTags(texto)).length;
      console.log(`✓ ${p.id}/${nome} (${(buf.length / 1024).toFixed(1)} KB)`);
    }
  }
}
console.log(`\n${ok} geradas, ${erro} erros${pulado ? `, ${pulado} puladas` : ''} → ${OUT}/`);
console.log(`~${chars} caracteres enviados ao ElevenLabs.`);
if (falhas.length) console.log(`Falhas (re-rode com --faltantes): ${falhas.join(', ')}`);
process.exit(erro ? 1 : 0);
