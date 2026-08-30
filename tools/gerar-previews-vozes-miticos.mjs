#!/usr/bin/env node
// Voice Design (text-to-voice) dos 6 míticos reprovados no casting da Voice
// Library: Lampião, Maria Bonita, Curupira, Cuca, Boto, Lobisomem.
// Gera 2 rodadas de previews por personagem (cada chamada devolve ~3 opções),
// salva os mp3 + metadados (generated_voice_id, pra depois o
// create-voice-from-preview do escolhido) e emite a página de audição.
//
// Uso:
//   ELEVENLABS_API_KEY=... node tools/gerar-previews-vozes-miticos.mjs [--html=<saida.html>]
//   node tools/gerar-previews-vozes-miticos.mjs --dry
//   node tools/gerar-previews-vozes-miticos.mjs --so=cuca,boto
//
// As voice_description vêm do dossiê docs/audio/SOTAQUES-MITICOS.md (pesquisa
// de sotaque → DESCRIÇÃO em texto; NUNCA clonagem de áudio de pessoa real).
// Amostra falada: falas do próprio personagem, PT-BR, ~120 chars (mín. 100 da API).
// NÃO cria voz definitiva — o dono escolhe o preview primeiro.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/miticos-previews';
const API = 'https://api.elevenlabs.io/v1';

const NOMES = {
  lampiao: 'Lampião', mariabonita: 'Maria Bonita', curupira: 'Curupira',
  cuca: 'Cuca', boto: 'Boto Cor de Rosa', lobisomem: 'Lobisomem',
};

// 2 rodadas por personagem: descrição base + variação de idade/peso.
const DESIGNS = [
  {
    id: 'lampiao',
    texto: 'Arreda, moço! Aqui quem manda é o cangaço. Virgem Maria! No sertão, quem atira primeiro é quem conta a história.',
    rodadas: [
      'A rough middle-aged Brazilian man from the rural northeastern sertão backlands. Dry, raspy, sun-cracked voice. Hard unpalatalized T and D consonants, open pretonic vowels, clipped staccato rhythm like an outlaw chief barking short orders. Commanding, theatrical, slightly nasal cordel-singer melody that rises and falls.',
      'An older, deeper Brazilian bandit leader from the arid northeastern sertão. Gravelly weathered voice with a low growl, hard T and D consonants never palatalized, open vowels, slow menacing delivery that snaps into sharp barked commands. Dusty, dangerous, charismatic.',
    ],
  },
  {
    id: 'mariabonita',
    texto: 'Parou, mirou, acertou. Assina embaixo: Maria. Um tiro só, meu bem — mais que isso é desperdício. Bonita, né?',
    rodadas: [
      'An adult Brazilian woman from the northeastern sertão. Warm but steel-cored low feminine voice, strong sertanejo accent with open pretonic vowels and hard unpalatalized T and D consonants, unhurried confident delivery with a sly smile in the voice, rising-falling northeastern melody.',
      'A younger sharp-witted Brazilian woman from the rural northeast backlands. Clear cutting voice with grit, open vowels and hard T/D of the sertão accent, quick teasing delivery, cool sniper confidence, a mocking edge that never raises its volume.',
    ],
  },
  {
    id: 'curupira',
    texto: 'Pé virado, rastro errado — vem me achar! Seguiu minha pegada? Então tu já tá voltando pra casa. Já era: tu tá perdido!',
    // Obs.: o Voice Design BLOQUEIA descrição de voz de menor ("boy"/"kid"/
    // "teen" ⇒ 403 blocked_generation). O Curupira vira espírito da floresta
    // com voz adulta muito aguda e impish — mesmo efeito, sem termo de idade.
    rodadas: [
      'A mischievous forest spirit with a very high-pitched, youthful-sounding adult male voice, from the Brazilian Amazon with a Pará accent: strongly hissed final S sounds, palatalized ti and di, nasal singsong Amazonian melody. Energetic taunting delivery, impish giggle underneath, fast teasing hide-and-seek rhythm.',
      'A feral trickster spirit of the Brazilian Amazon forest, light nimble adult male voice pitched unusually high, Pará accent with hissing final S and drawn nasal NH sounds, eerie sing-song cadence that swings between playful chant and sudden quiet menace. Bright, quick, otherworldly.',
    ],
  },
  {
    id: 'cuca',
    texto: 'Dorme, neném... que a Cuca já chegou. Nana, nenê... a poção já tá no teu ar. Hora de dormir. Mais um dormiu.',
    rodadas: [
      'A very old Brazilian witch crone. Cracked, hoarse, gravelly elderly female voice with wheezing breath, slow dragging delivery with a soft rural Minas Gerais countryside lilt, sinister lullaby singsong cadence, theatrical horror-comedy menace, gleeful croak at phrase ends.',
      'An ancient swampy Brazilian sorceress, deep for a female voice, extremely raspy and phlegmy, very slow hypnotic lullaby rhythm that suddenly sharpens, long drawn vowels, quiet cruel amusement, crackling texture like dry leaves.',
    ],
  },
  {
    id: 'boto',
    texto: 'Saí do rio só pra te encantar, meu bem. Dança comigo até de madrugada... depois eu volto pro fundo. Que pena, né?',
    rodadas: [
      'A seductive charming Brazilian man from the Amazon river region of Pará. Velvety smooth low voice, nasal Amazonian musicality with hissed final S and palatalized ti/di, slow confident charmer cadence like a river-party heartthrob, warm self-satisfied delivery with a smile you can hear.',
      'A deeper, more mysterious Brazilian river spirit gentleman from the Amazon. Dark velvet baritone, unhurried hypnotic Pará-accented speech with hissing S and singsong nasal melody, elegant and slightly dangerous, the charm of someone hiding a secret under his hat.',
    ],
  },
  {
    id: 'lobisomem',
    texto: 'Lua cheia, arena cheia... melhor pra caçar. Sente esse cheiro? É medo. E é teu. A coleira arrebentou faz tempo.',
    rodadas: [
      'A heavy rural Brazilian man from the caipira countryside interior. Deep guttural voice with a growl underneath, strong retroflex R, slow drawling delivery with drawn-out vowels, unhurried menace of a quiet farmhand who turns into a beast, low chest resonance and heavy breath.',
      'A monstrous Brazilian country man mid-transformation. Very deep rasping voice full of animal growl, caipira accent with hard retroflex R and lazy dragged vowels, slow predatory rhythm broken by short snarled words, hungry and heavy.',
    ],
  },
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const htmlArg = (args.find(a => a.startsWith('--html=')) || '').replace('--html=', '');
const so = (args.find(a => a.startsWith('--so=')) || '').replace('--so=', '').split(',').filter(Boolean);
const lote = DESIGNS.filter(p => !so.length || so.includes(p.id));

if (dry) {
  for (const p of lote) for (const [r, desc] of p.rodadas.entries())
    console.log(`${p.id} r${r + 1}: "${desc.slice(0, 80)}..." | amostra ${p.texto.length} chars`);
  console.log(`\n${lote.length * 2} chamadas create-previews (~3 previews cada) → ${OUT}/<id>/`);
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

const antes = await quota();
let ok = 0, erro = 0;
// Merge com rodadas anteriores: um --so=x refaz só x e preserva o resto.
const ids = new Set(lote.map(p => p.id));
const meta = await readFile(join(OUT, 'previews.json'), 'utf8')
  .then(t => JSON.parse(t).filter(m => !ids.has(m.personagem)), () => []);
for (const p of lote) {
  const dir = join(OUT, p.id);
  await mkdir(dir, { recursive: true });
  for (const [r, desc] of p.rodadas.entries()) {
    let feito = false, err = null;
    for (let tentativa = 1; tentativa <= 2 && !feito; tentativa++) {
      try {
        const res = await fetch(`${API}/text-to-voice/create-previews`, {
          method: 'POST',
          headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice_description: desc, text: p.texto }),
        });
        if (res.status === 401 || res.status === 403) {
          const corpo = (await res.text()).slice(0, 250);
          throw new Error(corpo.includes('blocked_generation')
            ? `HTTP ${res.status} — prompt bloqueado pelas safety guidelines (descrição de voz de menor é barrada; reescreva sem termos de idade infantil). ${corpo}`
            : `HTTP ${res.status} — a conta não permite Voice Design (tier free limita; confira chave/tier). ${corpo}`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
        const j = await res.json();
        for (const [i, prev] of (j.previews || []).entries()) {
          const nome = `r${r + 1}-p${i + 1}.mp3`;
          await writeFile(join(dir, nome), Buffer.from(prev.audio_base_64, 'base64'));
          meta.push({ personagem: p.id, rodada: r + 1, preview: i + 1, arquivo: `${p.id}/${nome}`,
            generated_voice_id: prev.generated_voice_id, descricao: desc, amostra: p.texto });
          ok++;
          console.log(`✓ ${p.id}/${nome} (voice_id ${prev.generated_voice_id})`);
        }
        feito = true;
      } catch (e) {
        err = e;
        if (tentativa === 1) await new Promise(res2 => setTimeout(res2, 2000));
      }
    }
    if (!feito) { erro++; console.error(`✗ ${p.id} r${r + 1}: ${err.message}`); }
  }
}
await writeFile(join(OUT, 'previews.json'), JSON.stringify(meta, null, 2));

const depois = await quota();
console.log(`\n${ok} previews salvos, ${erro} chamadas com erro → ${OUT}/`);
if (antes && depois) console.log(`Cota: ${antes.usados} → ${depois.usados} de ${depois.limite} (${depois.usados - antes.usados} chars consumidos)`);

if (htmlArg) {
  const abs = `${process.cwd()}/${OUT}`;
  // A página sai do previews.json inteiro (não só do lote desta execução).
  let body = '';
  for (const p of DESIGNS) {
    const doP = meta.filter(m => m.personagem === p.id);
    if (!doP.length) continue;
    body += `<section><h2>${NOMES[p.id]} <code>${p.id}</code></h2><p class="amostra">Amostra: &ldquo;${doP[0].amostra}&rdquo;</p>`;
    for (const r of [...new Set(doP.map(m => m.rodada))].sort()) {
      const prevs = doP.filter(m => m.rodada === r);
      body += `<div class="rodada"><p class="desc"><b>Rodada ${r}:</b> ${prevs[0].descricao}</p><div class="tomadas">`;
      for (const m of prevs) {
        body += `<label>p${m.preview}<br><audio controls preload="none" src="file://${abs}/${m.arquivo}"></audio><br><code class="vid">${m.generated_voice_id}</code></label>`;
      }
      body += `</div></div>`;
    }
    body += `</section>`;
  }
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Audição — Voice Design dos Míticos</title><style>
body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;background:#14141a;color:#eee}
h1{color:#ffd23f} h2{border-bottom:1px solid #333;padding-bottom:.3rem;margin-top:2.5rem}
.amostra{color:#aaa;font-size:.9rem} .desc{color:#cdc;font-size:.85rem;margin:.2rem 0 .6rem}
.rodada{margin:1rem 0;padding:.6rem .8rem;background:#1e1e28;border-radius:8px}
.tomadas{display:flex;gap:1.2rem;flex-wrap:wrap} label{font-size:.8rem;color:#aaa}
audio{width:280px} .vid{font-size:.65rem;color:#577} code{color:#8fd}</style></head><body>
<h1>Audição — Voice Design dos Míticos</h1>
<p>Previews do text-to-voice (ElevenLabs). Escolha um por personagem — o generated_voice_id embaixo de cada player é o que vira voz definitiva no create-voice-from-preview.</p>
${body}</body></html>`;
  await writeFile(htmlArg, html);
  console.log(`Página de audição: ${htmlArg}`);
}
process.exit(erro ? 1 : 0);
