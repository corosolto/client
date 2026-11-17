#!/usr/bin/env node
/* Lote 3 — Creepypasta Season, batch 1 (14 leads). Roteiro/casting em
 * docs/audio/ROTEIRO-VOZES-CREEPYPASTA.md.
 *
 * Capitão Caveira: modelo comunitário Fish "Capitão Nascimento" — EXCEPÇÃO à regra
 * "nenhuma voz imita pessoa real" autorizada verbalmente pelo dono (Ruben, 10/11);
 * vale SÓ para este personagem e é revogável.
 * Demais 13: ElevenLabs Voice Design (arquétipo por descrição, voz ÚNICA por
 * personagem, eleven_v3). Designs são criadas uma vez e cacheadas em
 * public/audio/ia/creepypasta/voices.json (gitignorado).
 *
 * Uso:
 *   node tools/gerar-vozes-creepypasta.mjs --dry
 *   node tools/gerar-vozes-creepypasta.mjs                # gera tudo (2 tomadas por fala)
 *   node tools/gerar-vozes-creepypasta.mjs --so=dracula   # filtra
 *   node tools/gerar-vozes-creepypasta.mjs --faltantes
 *
 * Chaves: ELEVENLABS_API_KEY e FISH_AUDIO_API_KEY (set -a; source /Users/ruben/game/.env; set +a).
 * Saída: public/audio/ia/creepypasta/<id>/<evento>-<slug>-t<N>.mp3 */
import { mkdir, writeFile, access, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'public/audio/ia/creepypasta';
const VOICES_CACHE = `${OUT}/voices.json`;
const ELEVEN_API = 'https://api.elevenlabs.io/v1';
const FISH_API = 'https://api.fish.audio/v1/tts';

const CAVEIRA_REF = '102bccca7dc64b6b8f8494c199c5d153';   // Fish "Capitão Nascimento" (exceção do dono)

const semTags = (t) => t.replace(/\[[^\]]+\]\s*/g, '');
const P = {
  caveira: { fish: CAVEIRA_REF },
  // Vozes PROFISSIONAIS já na conta Eleven (distinct por personagem; PT-BR ok no eleven_v3):
  barbudo: { eleven: 'pqHfZKP75CvOlQylNhV4', nome: 'Bill — Wise, Mature' },
  bicheiro: { eleven: 'sNOgqySaECh2Vh5sDQNY', nome: 'Dantas — Deep, Warm & Slow' },
  chapeleiro: { eleven: 'N2lVS1w4EtoT3dr4eOWO', nome: 'Callum — Husky Trickster' },
  corisco: { eleven: 'aU2vcrnwi348Gnc2Y1si', nome: 'José — Rural character' },
  coronel: { eleven: 'kuFf6szoZvaTNcNpMHxf', nome: 'Manoel — Serious & Elegant' },
  dama: { eleven: 'FrCDCQwye0euHmliGxP9', nome: 'Edna — Warm, Motherly' },
  dpedro: { eleven: 'nPczCjzI2devNBz1zQrb', nome: 'Brian — Deep, Resonant' },
  dracula: { eleven: 'SvP2QJFsRvn3JevnwLQM', nome: 'Cassian — Deep and Velvety' },
  padre: { eleven: 'onwK4e9ZLuTAKqWW03F9', nome: 'Daniel — Steady Broadcaster' },
  pm: { eleven: 'iP95p4xoKVk53GoZ742B', nome: 'Chris — Charming, Down-to-earth' },
  ministro: { eleven: 'pNInz6obpgDQGcFmaJgB', nome: 'Adam — Dominant, Firm' },
  vlad: { eleven: 'SOYHLrjzK2X1ezoPC6cr', nome: 'Harry — Fierce Warrior' },
  tiradentes: { eleven: 'JBFqnCBsd6RMkjVDRZzb', nome: 'George — Warm, Captivating' },
};
const MITICOS = [
  ['capitao-caveira', 'caveira', [
    ['select', 'abertura', 'Aqui é o Caveira. Pediram peso, trouxe o pelotão.'],
    ['kill', 'abatido', 'Abatido.'],
    ['kill', 'um-a-menos', 'Um a menos.'],
    ['radio', 'contato', 'Contato à frente. Segura.'],
    ['radio', 'ali', 'Ali. Não deixa fugir.'],
    ['round', 'missao', 'Missão cumprida. Próxima.'],
  ]],
  ['barbudo-creepy', 'barbudo', [
    ['select', 'pra-sempre', 'Cheguei pra ficar... para sempre, aliás.'],
    ['kill', 'cuidamos', 'Já cuidamos disso, né?'],
    ['kill', 'nada', 'Não foi nada. Nada mesmo.'],
    ['radio', 'nao-sou-eu', 'Tem alguém aí... e não sou eu.'],
    ['radio', 'escuta', 'Escuta. Tem coisa andando.'],
    ['round', 'junto', 'Viu? No fim, todo mundo junto.'],
  ]],
  ['bicheiro-barracao', 'bicheiro', [
    ['select', 'barracao', 'Senta aí. O barracão hoje é meu.'],
    ['kill', 'apostou-errado', 'Apostou errado, campeão.'],
    ['kill', 'preco', 'Preço de não pagar, ô.'],
    ['radio', 'cerquem', 'Tem infeliz na área. Cercem.'],
    ['radio', 'movimento', 'Tô vendo o movimento, ô.'],
    ['round', 'deu-bicho', 'Deu bicho pra gente. Deu tudo.'],
  ]],
  ['chapeleiro-maluco', 'chapeleiro', [
    ['select', 'que-horas', 'Que horas são? Que dia é? Que IMPORTA — chá?'],
    ['kill', 'sem-chapeu', 'Sem chapéu, sem vez!'],
    ['kill', 'tarde', 'Tarde! Tarde demais!'],
    ['radio', 'ali', 'Ali! Não, ali! Não, ALI!'],
    ['radio', 'convidado', 'Um convidado! Que hora o chá?'],
    ['round', 'ganhamos', 'Ganhamos! Ou perdemos? Ganhamos!'],
  ]],
  ['corisco', 'corisco', [
    ['select', 'nao-morre', 'Corisco não morre. Tá provado.'],
    ['kill', 'sorte', 'Morreu de sorte, cabra.'],
    ['kill', 'riscado', 'Riscado do bando.'],
    ['radio', 'macaco', 'Tem macaco na trilha.'],
    ['radio', 'visto', 'Visto um. Perto.'],
    ['round', 'bando', 'O bando comeu. Como sempre.'],
  ]],
  ['coronel-arrego', 'coronel', [
    ['select', 'arrego', 'Aqui quem arrega sou eu. Sempre fui.'],
    ['kill', 'sem-papelada', 'Resolvido. Sem papelada.'],
    ['kill', 'proximo', 'Já era. Próximo assunto.'],
    ['radio', 'encreca', 'Tem encreca lá fora. Resolvam.'],
    ['radio', 'relatorio', 'Relatório: um na área.'],
    ['round', 'pra-ca', 'Arrego pra cá, arrego pra lá.'],
  ]],
  ['dama-creepy', 'dama', [
    ['select', 'chegue', 'Pode chegar, meu filho. A dama cuida de você.'],
    ['kill', 'dorme', 'Dorme, querido. Pra sempre.'],
    ['kill', 'repetir', 'A dama não gosta de repetir.'],
    ['radio', 'visita', 'Tem visita, meu bem.'],
    ['radio', 'quintal', 'Anda algo no quintal.'],
    ['round', 'pao', 'A mandioca deu pão pra todos.'],
  ]],
  ['dom-pedro-i', 'dpedro', [
    ['select', 'grito', 'Independência ou... ah, esquece. Grito ou morte.'],
    ['kill', 'independencia', 'Independência... da sua vida!'],
    ['kill', 'imperio', 'Cortado pelo Império!'],
    ['radio', 'as-armas', 'Um rebelde à frente! Às armas!'],
    ['radio', 'vistes', 'Vistes? Eu vi. Avante!'],
    ['round', 'prevaleceu', 'O Império prevaleceu!'],
  ]],
  ['dracula', 'dracula', [
    ['select', 'jantar', 'Entrem. O jantar... éramos nós? Não. Entrai.'],
    ['kill', 'agradavel', 'Agradável. Agradecido.'],
    ['kill', 'vinho', 'O vinho era teu, eu sei.'],
    ['radio', 'cheiro', 'Sinto o cheiro... à frente.'],
    ['radio', 'hospede', 'Hospede se aproxima.'],
    ['round', 'noite', 'A noite é nossa. De novo.'],
  ]],
  ['padre-parapsicologo', 'padre', [
    ['select', 'cetico', 'Padre, parapsicólogo, e cético. Explica aí.'],
    ['kill', 'medi', 'Reza, porque eu já medi.'],
    ['kill', 'energia', 'Energia dispersa. Amém.'],
    ['radio', 'anomalia', 'Anomalia à frente. Anoto.'],
    ['radio', 'presenca', 'Presença detectada. Que chatice.'],
    ['round', 'explicado', 'Explicado. Como sempre.'],
  ]],
  ['pm-arrego', 'pm', [
    ['select', 'desconto', 'Aqui o arrego tem desconto. Volte sempre.'],
    ['kill', 'autuado', 'Autuado. Bem autuado.'],
    ['kill', 'multa', 'Multa paga, meu amigo.'],
    ['radio', 'recibo', 'Tem um ali. Sem recibo.'],
    ['radio', 'suspeito', 'Movimento suspeito. Meu.'],
    ['round', 'fechou', 'Fechou o mês. Fechou.'],
  ]],
  ['ministro-creepy', 'ministro', [
    ['select', 'sessao', 'A sessão está instalada. Para sempre.'],
    ['kill', 'sem-recurso', 'Julgado. Sem recurso.'],
    ['kill', 'sentenca', 'Cumpriu a sentença.'],
    ['radio', 'reu', 'Há um réu à frente.'],
    ['radio', 'determino', 'Determino: cerque.'],
    ['round', 'unanime', 'Decisão unânime. Nossa.'],
  ]],
  ['vlad-creepy', 'vlad', [
    ['select', 'império', 'Vlad recebe. O império do medo é pontual.'],
    ['kill', 'empalado', 'Empalado. Tradução: abatido.'],
    ['kill', 'poste', 'Um poste a mais na estrada.'],
    ['radio', 'bencao', 'Inimigo à frente. Que bênção.'],
    ['radio', 'sangue', 'Sangue novo na área.'],
    ['round', 'wallachia', 'Wallachia vence. Eu venço.'],
  ]],
  ['tiradentes-creepy', 'tiradentes', [
    ['select', 'voltei', 'Esquartejaram-me uma vez. Voltei inteiro. Quase.'],
    ['kill', 'paguei', 'Liberdade custa. Paguei por você.'],
    ['kill', 'enforcado', 'Enforcado? Você. Não eu.'],
    ['radio', 'tiranía', 'Tirania à frente. Avante!'],
    ['radio', 'opressor', 'Vejo um opressor.'],
    ['round', 'inconfidencia', 'A Inconfidência venceu!'],
  ]],
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const faltantes = args.includes('--faltantes');
const filtro = (args.find((a) => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean);
const lote = filtro.length ? MITICOS.filter(([id]) => filtro.includes(id)) : MITICOS;

const EKEY = process.env.ELEVENLABS_API_KEY, FKEY = process.env.FISH_AUDIO_API_KEY;
let voices = {};
try { voices = JSON.parse(await readFile(VOICES_CACHE, 'utf8')); } catch { /* primeira vez */ }

async function designVoice(nome, design, seed) {
  const res = await fetch(`${ELEVEN_API}/voice-design/add`, {
    method: 'POST',
    headers: { 'xi-api-key': EKEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `CSBR ${nome}`, text: seed, voice_description: design, model_id: 'eleven_turbo_v2_5' }),
  });
  if (!res.ok) throw new Error(`voice-design HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  const { voice_id } = await res.json();
  return voice_id;
}

async function vozDe(id, perfil) {
  if (voices[id]) return voices[id];
  const ref = perfil.fish || perfil.eleven;
  if (!ref) throw new Error(`${id}: sem voz definida`);
  voices[id] = ref;
  await mkdir(OUT, { recursive: true });
  await writeFile(VOICES_CACHE, JSON.stringify(voices, null, 2) + '\n');
  return ref;
}

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

const itens = [];
for (const [id, perfilNome, falas] of lote) {
  const perfil = P[perfilNome];
  for (const [evento, slug, texto] of falas) itens.push({ id, perfilNome, perfil, evento, slug, texto });
}

if (dry) {
  for (const it of itens) console.log(`${it.id}/${it.evento}-${it.slug}-t{1,2}.mp3  [${it.perfil.fish ? 'fish-nascimento' : 'eleven-design'}]  "${it.texto}"`);
  console.log(`\n${itens.length} falas × 2 tomadas = ${itens.length * 2} clipes → ${OUT}/`);
  process.exit(0);
}
const precisaFish = itens.some((it) => Boolean(it.perfil.fish));
const precisaEleven = itens.some((it) => !it.perfil.fish);
if (precisaEleven && !EKEY) { console.error('ELEVENLABS_API_KEY ausente.'); process.exit(1); }
if (precisaFish && !FKEY) { console.error('FISH_AUDIO_API_KEY ausente.'); process.exit(1); }

let ok = 0, erro = 0, pulado = 0;
const falhas = [];
for (const it of itens) {
  const dir = join(OUT, it.id);
  await mkdir(dir, { recursive: true });
  for (const t of [1, 2]) {
    const destino = join(dir, `${it.evento}-${it.slug}-t${t}.mp3`);
    if (faltantes && await access(destino).then(() => true, () => false)) { pulado++; continue; }
    let ref;
    try { ref = await vozDe(it.id, it.perfil); }
    catch (e) { erro++; falhas.push(destino); console.error(`✗ ${it.id}: design falhou: ${e.message}`); break; }
    let buf = null, err = null;
    for (let tent = 1; tent <= 2 && !buf; tent++) {
      try { buf = it.perfil.fish ? await gerarFish(ref, it.texto) : await gerarEleven(ref, it.texto); }
      catch (e) { err = e; if (tent === 1) await new Promise((r) => setTimeout(r, 2000)); }
    }
    if (!buf || buf.length < 1000) { erro++; falhas.push(destino); console.error(`✗ ${it.id}/${it.evento}-${it.slug}-t${t}: ${err ? err.message : `suspeito (${buf ? buf.length : 0} B)`}`); continue; }
    await writeFile(destino, buf);
    ok++;
    console.log(`✓ ${it.id}/${it.evento}-${it.slug}-t${t} [${it.perfil.fish ? 'fish' : 'eleven'}]`);
  }
}
console.log(`\n${ok} geradas, ${erro} erros${pulado ? `, ${pulado} puladas` : ''} → ${OUT}/`);
if (falhas.length) console.log(`Falhas: ${falhas.join(', ')}`);
process.exit(erro ? 1 : 0);
