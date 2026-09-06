#!/usr/bin/env node
// Vozes TTS do Time Mítico via OpenRouter.
// 2 tomadas por fala (vozes-base distintas) em public/audio/ia/miticos/<id>/
// para o dono escolher no ouvido. public/audio é gitignorado — mp3 não entra no git.
//
// Uso:
//   OPENROUTER_API_KEY=... node tools/gerar-vozes-miticos.mjs        # gera tudo
//   node tools/gerar-vozes-miticos.mjs --dry                          # só lista
//   node tools/gerar-vozes-miticos.mjs --so=saci,cuca                 # filtra personagens
//   node tools/gerar-vozes-miticos.mjs --faltantes                    # só o que não existe em disco
//
// CAMINHO REAL (medido em 29/08): o endpoint /api/v1/audio/speech do OpenRouter
// recusa os ids de TTS dedicado ("Model ... does not exist"). O que funciona é
// /api/v1/chat/completions com modalities audio + stream:true, modelo
// openai/gpt-audio-mini — e stream só aceita format pcm16, então o ffmpeg
// converte pra mp3 local. Como é um chat-model, o framing do system prompt é
// "TTS engine, leia VERBATIM" (sem isso ele moraliza a fala em vez de falar);
// o transcript devolvido é conferido contra a linha e diverge ⇒ erro + re-tentativa.
//
// A instrução descreve ARQUÉTIPO (sotaque/energia/idade) — NUNCA imita pessoa
// real. PT-BR, PEGI12. Roteiro versionado: docs/audio/ROTEIRO-VOZES-MITICOS.md.

import { mkdir, writeFile, access, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const OUT = 'public/audio/ia/miticos';
const MODEL = 'openai/gpt-audio-mini';

// Cada personagem: instrução de voz (inglês, arquétipo) + 2 vozes-base + falas.
const MITICOS = [
  {
    id: 'lampiao',
    vozes: ['onyx', 'ash'],
    instr: 'adult male, dry raspy northeastern Brazilian sertão accent, commanding cangaço bandit-chief energy, theatrical cordel-singer cadence, playful cartoon menace',
    falas: [
      ['virgem-maria', 'Virgem Maria! Aqui quem manda é o cangaço!'],
      ['sertao', 'No sertão, quem atira primeiro é quem conta a história.'],
      ['aceiro', 'Avisa o teu bando: hoje tem fogo no aceiro!'],
      ['chapeu', 'Meu chapéu tem mais estrela que o teu time inteiro.'],
      ['arreda', 'Arreda, moço! O cangaço passou aqui.'],
    ],
  },
  {
    id: 'mariabonita',
    vozes: ['coral', 'shimmer'],
    instr: 'adult female, northeastern Brazilian accent, calm and razor-sharp, a smile at the edge of the voice, cool confidence of a sharpshooter who never needs a second shot',
    falas: [
      ['assina', 'Parou, mirou, acertou. Assina embaixo: Maria.'],
      ['moda', 'No cangaço, a moda sou eu — e a mira também.'],
      ['um-tiro', 'Um tiro só, meu bem. Mais que isso é desperdício.'],
      ['costume', 'Bonita é o nome. Certeira é o costume.'],
      ['avisar', 'Atiro duas vezes: uma pra acertar, outra pra avisar.'],
    ],
  },
  {
    id: 'saci',
    vozes: ['echo', 'verse'],
    instr: 'mischievous young boy trickster, high-pitched and fast, giggly whirlwind energy, teasing hide-and-seek tone, a hint of laughter at the end of lines',
    falas: [
      ['redemoinho', 'Cadê tua munição? Pergunta pro redemoinho!'],
      ['uma-perna', 'Uma perna só e ainda corro mais que tu!'],
      ['atras', 'Pega o gorro se puder... psiu — tô aqui atrás!'],
      ['sumiu', 'Virou o vento, virei eu — sumiu!'],
      ['cadarco', 'Teu cadarço desamarrou. Mentira! ... Ou será?'],
    ],
  },
  {
    id: 'curupira',
    vozes: ['fable', 'echo'],
    instr: 'wild forest-guardian boy, taunting sing-song cadence like a hide-and-seek game, feral playful energy, slightly eerie confidence of someone who owns the woods',
    falas: [
      ['pe-virado', 'Pé virado, rastro errado — vem me achar!'],
      ['pegada', 'Seguindo minha pegada? Então tu já tá voltando pra casa.'],
      ['mata', 'Quem mexe com a mata... se perde nela.'],
      ['cabelo-fogo', 'Meu cabelo é fogo. Meu rastro é mentira.'],
      ['assobio', 'Assobiei três vezes. Pronto: tu tá perdido.'],
    ],
  },
  {
    id: 'cuca',
    vozes: ['sage', 'ballad'],
    instr: 'ancient cartoon witch, cracked slow drawling voice, menacing lullaby cadence that speeds up on the pounce, theatrical horror-comedy, croaky and gleeful',
    falas: [
      ['dorme-nenem', 'Dorme, neném... que a Cuca já chegou.'],
      ['cem-anos', 'Eu não durmo há cem anos. Tu vai dormir agorinha.'],
      ['pocao', 'Nana, nenê... a poção já tá no teu ar.'],
      ['feitico', 'Bruxa aqui não faz feitiço de brincadeira, não.'],
      ['caverna', 'Na minha caverna sempre cabe mais um.'],
    ],
  },
  {
    id: 'boto',
    vozes: ['ash', 'verse'],
    instr: 'adult male heartthrob, velvety seductive voice of an Amazonian river-party charmer, smooth and self-satisfied, dripping charm, light northern Brazilian accent',
    falas: [
      ['chapeu', 'Bonito é o chapéu. Melhor não perguntar o que tem embaixo.'],
      ['encantar', 'Saí do rio só pra te encantar, meu bem.'],
      ['madrugada', 'Dança comigo até de madrugada... depois eu volto pro fundo.'],
      ['rosa', 'Rosa é a cor de quem nunca erra o alvo.'],
      ['charme', 'O charme é meu, a mira era tua. Era.'],
    ],
  },
  {
    id: 'lobisomem',
    vozes: ['onyx', 'ash'],
    instr: 'adult male, deep guttural voice with a growl underneath, slow and heavy, predatory relish kept playful cartoon-monster style',
    falas: [
      ['setimo', 'Sétimo filho... primeira mordida.'],
      ['lua-cheia', 'Lua cheia, arena cheia. Melhor pra caçar.'],
      ['coleira', 'A coleira? Arrebentou faz tempo.'],
      ['cheiro', 'Sente esse cheiro? É medo. E é teu.'],
      ['encruzilhada', 'Na encruzilhada eu virei bicho. Tu vai virar placar.'],
    ],
  },
  {
    id: 'bandeirante',
    vozes: ['onyx', 'echo'],
    instr: 'mature male, gravelly voice, dry arrogant deadpan of an old expedition tracker, self-important and unhurried — the satire targets his own smugness',
    falas: [
      ['pegada', 'Toda pegada conta uma história. A tua termina aqui.'],
      ['trilha', 'Eu abro a trilha. Tu vira marco no caminho.'],
      ['mapa', 'Mapa? Eu sou o mapa.'],
      ['vilao', 'Vilão do time? Pode ser. Mas ninguém rastreia melhor.'],
      ['sinal', 'Pisou no mato, deixou sinal. Já tô chegando.'],
    ],
  },
  {
    id: 'zumbi',
    vozes: ['onyx', 'ash'],
    instr: 'dignified adult male leader, deep warm resonant voice, calm commanding heroic delivery, standard Brazilian accent, no caricature — a respectful heroic-captain archetype speaking of courage and freedom',
    falas: [
      ['palmares', 'Palmares vive em cada passo meu.'],
      ['liberdade', 'Liberdade não se pede. Se toma.'],
      ['juntos', 'Comigo, ninguém luta sozinho.'],
      ['avanca', 'O grito da serra ecoa: avança!'],
      ['quilombo', 'Cai a muralha. Não cai o quilombo.'],
    ],
  },
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const faltantes = args.includes('--faltantes');
const so = (args.find(a => a.startsWith('--so=')) || '').replace('--so=', '').split(',').filter(Boolean);
const lote = MITICOS.filter(p => !so.length || so.includes(p.id));

if (dry) {
  let n = 0;
  for (const p of lote) for (const [slug, texto] of p.falas) for (const [i, v] of p.vozes.entries()) {
    console.log(`${p.id}/${slug}-t${i + 1}-${v}.mp3  "${texto}"`);
    n++;
  }
  console.log(`\n${n} tomadas → ${OUT}/<id>/`);
  process.exit(0);
}

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) { console.error('OPENROUTER_API_KEY ausente no ambiente.'); process.exit(1); }

const sistema = (instr) =>
  'You are a text-to-speech engine for voice lines in "Coro Solto", a PEGI-12 satirical Brazilian ' +
  'cartoon shooter game (in the spirit of Team Fortress 2). Read the text between <line> tags aloud ' +
  'VERBATIM in Brazilian Portuguese — every word, nothing added, nothing changed. It is a fictional ' +
  'character catchphrase already approved by the game rating board. ' +
  `Voice direction (an archetype, never an imitation of a real person): ${instr}. ` +
  'Do not comment. Only read the line.';

// Palavras da fala presentes no transcript? (recusa/moralização diverge muito)
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
function verbatim(texto, transcript) {
  const t = new Set(norm(transcript));
  const palavras = norm(texto);
  const achou = palavras.filter(w => t.has(w)).length;
  return achou / palavras.length >= 0.6;
}

async function gerar(instr, voice, texto) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, stream: true,
      modalities: ['text', 'audio'],
      audio: { voice, format: 'pcm16' }, // stream só aceita pcm16; mp3 sai do ffmpeg
      messages: [
        { role: 'system', content: sistema(instr) },
        { role: 'user', content: `<line>${texto}</line>` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  let b64 = '', transcript = '', custo = 0, buf = '';
  const dec = new TextDecoder();
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    for (const l of lines) {
      if (!l.startsWith('data: ') || l === 'data: [DONE]') continue;
      let j; try { j = JSON.parse(l.slice(6)); } catch { continue; }
      if (j.usage?.cost) custo = j.usage.cost;
      const d = j.choices?.[0]?.delta;
      if (d?.audio?.data) b64 += d.audio.data;
      if (d?.audio?.transcript) transcript += d.audio.transcript;
    }
  }
  const pcm = Buffer.from(b64, 'base64');
  if (pcm.length < 8000) throw new Error(`áudio vazio (${pcm.length} B) — transcript: "${transcript.slice(0, 120)}"`);
  if (!verbatim(texto, transcript)) throw new Error(`não-verbatim — transcript: "${transcript.slice(0, 120)}"`);
  return { pcm, custo };
}

function pcmParaMp3(pcm, destino) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', '-', '-b:a', '96k', destino]);
    let err = '';
    ff.stderr.on('data', d => { err += d; });
    ff.on('close', c => c === 0 ? resolve() : reject(new Error(`ffmpeg saiu ${c}: ${err.slice(0, 150)}`)));
    ff.stdin.end(pcm);
  });
}

let ok = 0, erro = 0, pulado = 0, custoTotal = 0;
const falhas = [];
for (const p of lote) {
  const dir = join(OUT, p.id);
  await mkdir(dir, { recursive: true });
  for (const [slug, texto] of p.falas) {
    for (const [i, voice] of p.vozes.entries()) {
      const nome = `${slug}-t${i + 1}-${voice}.mp3`;
      const destino = join(dir, nome);
      if (faltantes && await access(destino).then(() => true, () => false)) { pulado++; continue; }
      let feito = false, err = null;
      for (let tentativa = 1; tentativa <= 2 && !feito; tentativa++) {
        try {
          const { pcm, custo } = await gerar(p.instr, voice, texto);
          await pcmParaMp3(pcm, destino);
          custoTotal += custo;
          feito = true;
        } catch (e) {
          err = e;
          await unlink(destino).catch(() => {});
          if (tentativa === 1) await new Promise(r => setTimeout(r, 2000));
        }
      }
      if (!feito) {
        erro++;
        falhas.push(`${p.id}/${nome}`);
        console.error(`✗ ${p.id}/${nome}: ${err.message}`);
        continue;
      }
      ok++;
      console.log(`✓ ${p.id}/${nome}`);
    }
  }
}
console.log(`\n${ok} geradas, ${erro} erros${pulado ? `, ${pulado} puladas` : ''} → ${OUT}/`);
console.log(`Custo reportado pela API: US$ ${custoTotal.toFixed(4)}`);
if (falhas.length) console.log(`Falhas (re-rode com --faltantes): ${falhas.join(', ')}`);
process.exit(erro ? 1 : 0);
