#!/usr/bin/env node
/* Instala o pack Fab somente no jogo local. Os WAVs continuam fora do Git: um
   symlink ignorado aponta para o staging privado e o manifest também é ignorado. */
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync,
  renameSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (nome, padrao = '') => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=').slice(1).join('=') || padrao;
const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('uso: node tools/audio/fab-game-local.mjs <dir-do-pack> [--publico=public/audio]');
  process.exit(2);
}

const PACK = resolve(dir);
const WAVS = join(PACK, 'extracted-wav');
const SHORTLIST = join(PACK, 'shortlist-piloto.json');
const PUBLICO = resolve(arg('publico', join(RAIZ_REPO, 'public/audio')));
const LINK = join(PUBLICO, 'fab-dev');
const MANIFEST = join(PUBLICO, 'manifest.json');
const MUTANTE_SEM_VETO = process.env.FAB_GAME_LOCAL_MUTANTE === 'sem-veto';
const VETO = ['blood', 'gore', 'bone', 'scream', 'screaming'];

if (!relative(RAIZ_REPO, PACK).startsWith('..')) {
  console.error(`recusado: ${PACK} está dentro do repositório; o staging privado deve ficar fora.`);
  process.exit(2);
}
for (const p of [WAVS, SHORTLIST]) {
  if (!existsSync(p)) { console.error(`não achei ${p}`); process.exit(2); }
}

let lista;
try { lista = JSON.parse(readFileSync(SHORTLIST, 'utf8')); }
catch (e) { console.error(`shortlist inválida: ${e.message}`); process.exit(2); }
const porEvento = new Map((lista.eventos || []).map((e) => [e.evento, e]));

/* Identidade provisória de escuta, não aprovação artística. Cada arma recebe um
   take exclusivo; a AK preserva exatamente o take aprovado pelo dono. */
const TIRO_POR_ARMA = Object.freeze({
  ak: 'Gunshot_1-1.wav', akm: 'Gunshot_1-2.wav', m92: 'Gunshot_1-3.wav',
  m4: 'Gunshot_1-4.wav', md97: 'Gunshot_1-5.wav', pistol: 'Gunshot_2-1.wav',
  revolver38: 'Gunshot_2-2.wav', mp5: 'Gunshot_3-1.wav', uzi: 'Gunshot_3-2.wav',
  p90: 'Gunshot_3-3.wav', tavor: 'Gunshot_3-4.wav', famas: 'Gunshot_3-5.wav',
  carbine: 'Gunshot_3-6.wav', scar: 'Gunshot_4-1.wav', g3: 'Gunshot_4-2.wav',
  g3sg1: 'Gunshot_4-3.wav', sks: 'Gunshot_4-4.wav', svd: 'Gunshot_4-5.wav',
  m400: 'Gunshot_4-6.wav', deagle: 'Gunshot_5-1.wav', lmg: 'Gunshot_5-2.wav',
  awp: 'Gunshot_7-1.wav', mosin: 'Gunshot_7-2.wav', rem700: 'Gunshot_7-3.wav',
  shotgun: 'Gunshot_8-1.wav',
});

function candidatos(evento, { primeiro = false } = {}) {
  const vistos = new Set();
  const saida = [];
  for (const c of porEvento.get(evento)?.candidatos || []) {
    const nome = String(c?.arquivo || '');
    const baixo = nome.toLowerCase();
    if (!nome.endsWith('.wav') || nome.startsWith('/') || nome.split(/[\\/]/).includes('..')) continue;
    if (!MUTANTE_SEM_VETO && VETO.some((v) => baixo.includes(v))) continue;
    const absoluto = resolve(WAVS, nome);
    if (absoluto !== WAVS && !absoluto.startsWith(WAVS + sep)) continue;
    if (!existsSync(absoluto) || vistos.has(nome)) continue;
    vistos.add(nome);
    saida.push(`audio/fab-dev/${nome}`);
    if (primeiro) break;
  }
  return saida;
}

function todosArquivos(dir = WAVS, prefixo = '') {
  const saida = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.isDirectory()) saida.push(...todosArquivos(join(dir, item.name), rel));
    else if (item.isFile() && item.name.endsWith('.wav')) saida.push(rel);
  }
  return saida;
}
const biblioteca = todosArquivos().sort();
function seguros(nomes) {
  return nomes.filter((nome) => {
    const baixo = nome.toLowerCase();
    if (!nome.endsWith('.wav') || nome.startsWith('/') || nome.split(/[\\/]/).includes('..')) return false;
    if (!MUTANTE_SEM_VETO && VETO.some((v) => baixo.includes(v))) return false;
    const absoluto = resolve(WAVS, nome);
    return absoluto.startsWith(WAVS + sep) && existsSync(absoluto);
  }).map((nome) => `audio/fab-dev/${nome}`);
}
const filtrar = (predicate) => seguros(biblioteca.filter(predicate));

/* O tiro fixa um candidato por execução. Com dezenas de URLs sorteadas, cada
   disparo pegaria cache frio e cairia no synth; o restante continua no A/B. */
const weapons = Object.fromEntries(Object.entries(TIRO_POR_ARMA).map(([arma, nome]) => [
  arma, seguros([`Guns/Gun_Shot/${nome}`]),
]));
/* A shortlist é a entrada editorial da AK. Assim o mutante sem veto continua
   provando que um nome gore plantado não atravessa o laboratório. */
weapons.ak = candidatos('ak.shot', { primeiro: true }).length
  ? candidatos('ak.shot', { primeiro: true })
  : weapons.ak;
const magOut = candidatos('ak.magOut');
const magIn = candidatos('ak.magIn');
const bolt = candidatos('ak.bolt');
const footstepsBySurface = {
  concrete: filtrar((f) => f.startsWith('Footstep/Concrete/')),
  metal: filtrar((f) => f.startsWith('Footstep/Metal/')),
  wood: filtrar((f) => f.startsWith('Footstep/Wood/')),
  dirt: filtrar((f) => f.startsWith('Footstep/Dirt/')),
  grass: filtrar((f) => f.startsWith('Footstep/Grass/')),
  gravel: filtrar((f) => f.startsWith('Footstep/Gravel/')),
  water: filtrar((f) => /^Environment\/Water_Splash_/.test(f)),
};
/* A fixture de gate tem um único arquivo por superfície; o pack real oferece
   24 variações em cada piso seco. */
for (const [surface, event] of Object.entries({ concrete: 'passo.concreto', metal: 'passo.metal', wood: 'passo.madeira', dirt: 'passo.terra', grass: 'passo.grama', gravel: 'passo.cascalho', water: 'passo.agua' })) {
  if (!footstepsBySurface[surface].length) footstepsBySurface[surface] = candidatos(event);
}
const death = filtrar((f) => /^Combat\/Body_Falling_/.test(f));
const explosion = filtrar((f) => /^Explosions\/Small_Explosion_Realistic_/.test(f));
const grenadeThrow = seguros(['Combat/Whoosh_1-1.wav', 'Combat/Whoosh_2-1.wav']);
const grenadeBounce = seguros([
  'Environment/Rock_Impact_21.wav', 'Environment/Rock_Impact_34.wav',
  'Environment/Rock_Impact_35.wav', 'Environment/Rock_Impact_37.wav',
]);
/* Camada física, não dublagem autoral: dor/morte precisam sobreviver ao tiro e
   carregar ao menos o tipo corporal do personagem. Screams continuam vetados. */
const physicalProfiles = {
  male: {
    rate: 1,
    hurt: seguros(['Human_Vocalizations/Male_1_-_Effort_2-01.wav', 'Human_Vocalizations/Male_1_-_Effort_2-05.wav', 'Human_Vocalizations/Male_1_-_Effort_2-13.wav']),
    death: seguros(['Human_Vocalizations/Male_1_-_Grunt_20.wav', 'Human_Vocalizations/Male_1_-_Grunt_35.wav', 'Human_Vocalizations/Male_1_-_Grunt_48.wav']),
  },
  female: {
    rate: 1,
    hurt: seguros(['Human_Vocalizations/Female_1_-_Effort_1-06.wav', 'Human_Vocalizations/Female_1_-_Effort_1-11.wav', 'Human_Vocalizations/Female_1_-_Grunt_12.wav']),
    death: seguros(['Human_Vocalizations/Female_1_-_Grunt_29.wav', 'Human_Vocalizations/Female_1_-_Grunt_34.wav', 'Human_Vocalizations/Female_1_-_Grunt_39.wav']),
  },
  creature: {
    rate: 1.14,
    hurt: seguros(['Human_Vocalizations/Male_1_-_Effort_2-01.wav', 'Human_Vocalizations/Male_1_-_Effort_2-13.wav']),
    death: seguros(['Human_Vocalizations/Male_1_-_Grunt_18.wav', 'Human_Vocalizations/Male_1_-_Grunt_26.wav']),
  },
};
const CHARACTER_IDS = [
  'esquerdomacho', 'sindicato', 'mst', 'doutora', 'mistico', 'caminhoneiro', 'sertanejo', 'coach',
  'gotinha', 'farialimer', 'bombado', 'hipster', 'dollynho', 'et', 'ancap', 'canarinho', 'proerd',
  'bonzo', 'palhacomal', 'jozo', 'adjim', 'esbirro', 'titica', 'padati', 'padata', 'cadequinha',
  'emo', 'blackmetal', 'metaleiro', 'punk', 'skatista', 'clubber', 'rapper', 'reggae', 'pagodeiro',
  'mandrake', 'raul', 'oakley', 'criarj', 'chave', 'funkraiz', 'trapfunk', 'fluxo', 'ostentacao',
];
const FEMALE_CHARACTERS = new Set(['doutora']);
const CREATURE_CHARACTERS = new Set(['gotinha', 'dollynho', 'et', 'canarinho', 'proerd']);
const physicalByCharacter = Object.fromEntries(CHARACTER_IDS.map((id) => [
  id, FEMALE_CHARACTERS.has(id) ? 'female' : (CREATURE_CHARACTERS.has(id) ? 'creature' : 'male'),
]));

/* Soundscapes do laboratório: somente nomes semanticamente defensáveis do pack.
   Mapas internos recebem hum procedural no runtime em vez de chuva/vento falsos. */
function arquivo(nome) {
  const [url] = seguros([nome]);
  if (!url) { console.error(`recusado: asset Fab obrigatório ausente ou vetado: ${nome}`); process.exit(1); }
  return url;
}
const loop = (nome, vol) => ({ src: arquivo(nome), global: true, pos: [0, 0, 0], radius: 240, vol });
const shot = (nomes, minGap, maxGap, vol) => ({ srcs: nomes.map(arquivo), minGap, maxGap, vol });
const mapSoundscapes = {
  praca_poderes: { loops: [loop('Environment/Wind_Loop_6.wav', .075)], shots: [shot(['Environment/Tree_Rustling_1-1.wav'], 28, 70, .16)] },
  piscina_treta: { loops: [loop('Environment/Water_Stream_Calm_1.wav', .045)], shots: [shot(['Environment/Water_Splash_1-1.wav'], 22, 60, .13)] },
  loja_h: { loops: [loop('Environment/Wind_Loop_1.wav', .055)], shots: [shot(['Doors/Door_Open_3-1.wav', 'Doors/Door_Close_3-1.wav'], 30, 85, .12)] },
  ferro_velho: { loops: [loop('Environment/Wind_Loop_6.wav', .085)], shots: [shot(['Doors/Rusty_Metal_Creak_01.wav', 'Doors/Rusty_Metal_Creak_03.wav'], 18, 52, .18)] },
  quebrada: { loops: [loop('Environment/Wind_Loop_1.wav', .06)], shots: [shot(['Environment/Tree_Rustling_1-4.wav'], 24, 68, .15)] },
  corrego: { loops: [loop('Environment/Water_Stream_Moderate_1.wav', .13)], shots: [shot(['Environment/Water_Splash_1-1.wav'], 18, 48, .16)] },
  posto_treta: { loops: [loop('Environment/Wind_Loop_1.wav', .07)], shots: [shot(['Doors/Door_Open_3-1.wav'], 34, 90, .1)] },
  upa_24h: { synth: { kind: 'indoor-hum', vol: .027 }, shots: [shot(['Doors/Door_Open_3-1.wav', 'Doors/Door_Close_3-1.wav'], 38, 95, .09)] },
  obras_prefeitura: { loops: [loop('Environment/Wind_Loop_6.wav', .085)], shots: [shot(['Environment/Rock_Impact_21.wav', 'Environment/Wood_Move_1-1.wav'], 20, 58, .14)] },
  atacadao_treta: { synth: { kind: 'indoor-hum', vol: .022 }, shots: [shot(['Doors/Door_Open_3-1.wav'], 42, 110, .08)] },
  parque_treta: { loops: [loop('Environment/Wind_Loop_1.wav', .055), loop('Environment/Water_Stream_Calm_1.wav', .035)], shots: [shot(['Environment/Tree_Rustling_1-1.wav'], 18, 52, .14)] },
  velho_oeste: { loops: [loop('Environment/Wind_Loop_6.wav', .09)], shots: [shot(['Environment/Wood_Move_1-1.wav', 'Environment/Wood_Move_2-1.wav'], 16, 46, .17)] },
  penitenciaria: { synth: { kind: 'indoor-hum', vol: .02 }, shots: [shot(['Doors/Rusty_Metal_Creak_01.wav', 'Doors/Rusty_Metal_Creak_03.wav'], 22, 64, .14)] },
};
/* Stingers <=1,5 s pelo catalog.json. Os Special_Interface 5/6/7 duram
   2,75–9,52 s e invadiriam a rodada. Semântica ainda depende de escuta. */
const roundstart = seguros(['Interface/Interface_12-1.wav', 'Interface/Interface_12-4.wav']);
const roundwin = seguros(['Interface/Interface_5-1.wav', 'Interface/Interface_5-3.wav']);
const roundlose = seguros(['Interface/Interface_6-1.wav']);
const knife = seguros(['Combat/Whoosh_Metal_1-1.wav', 'Combat/Whoosh_Metal_1-2.wav', 'Combat/Whoosh_Metal_2-1.wav']);
const knifehit = seguros(['Combat/Stab_1-2.wav', 'Combat/Stab_1-5.wav', 'Combat/Stab_2-1.wav']);
const knifedeploy = seguros(['Combat/Draw_Weapon_Metal_1-1.wav', 'Combat/Draw_Weapon_Metal_1-2.wav', 'Combat/Draw_Weapon_Metal_2-1.wav']);
const dryfire = filtrar((f) => /^Guns\/Foley\/Dry_Fire_/.test(f));
const fallback = (pool, evento) => pool.length ? pool : candidatos(evento);
const runtime = {
  death: fallback(death, 'morte.corpo'), explosion: fallback(explosion, 'granada.explosao'),
  roundstart: fallback(roundstart, 'round.inicio'), roundwin: fallback(roundwin, 'round.vitoria'),
  roundlose: fallback(roundlose, 'round.derrota'), knife: fallback(knife, 'faca.swing'),
  knifehit: fallback(knifehit, 'faca.hit'), knifedeploy: fallback(knifedeploy, 'faca.deploy'),
  dryfire: fallback(dryfire, 'arma.dryfire'),
  grenadethrow: fallback(grenadeThrow, 'granada.arremesso'),
  grenadebounce: fallback(grenadeBounce, 'granada.quique'),
};
const mapAudioRefs = Object.values(mapSoundscapes).flatMap((cfg) => [
  ...(cfg.loops || []).map((entry) => entry.src),
  ...(cfg.shots || []).flatMap((entry) => entry.srcs || []),
]);
const obrigatorios = [
  ...Object.entries(weapons).map(([arma, pool]) => [`${arma}.shot`, pool]),
  ['ak.magOut', magOut], ['ak.magIn', magIn], ['ak.bolt', bolt],
  ...Object.entries(footstepsBySurface).map(([surface, pool]) => [`passo.${surface}`, pool]),
  ...Object.entries(runtime),
  ...Object.entries(physicalProfiles).flatMap(([profile, cfg]) => [
    [`personagem.${profile}.hurt`, cfg.hurt], [`personagem.${profile}.death`, cfg.death],
  ]),
  ['ambiencias.mapa', mapAudioRefs],
];
const vazios = obrigatorios.filter(([, arr]) => !arr.length).map(([evento]) => evento);
if (vazios.length) {
  console.error(`recusado: shortlist não tem arquivo seguro/existente para ${vazios.join(', ')}`);
  process.exit(1);
}

const manifest = {
  _localLab: {
    tipo: 'local-fab-game-lab',
    aviso: 'Somente escuta local. Nenhum candidato está aprovado para release.',
    armasComTiroProprio: Object.keys(weapons).length,
    eventosRuntime: 4 + Object.keys(footstepsBySurface).length + Object.keys(runtime).length,
    mapasComAmbiencia: Object.keys(mapSoundscapes).length,
    perfisFisicos: Object.keys(physicalProfiles).length,
    somenteEscuta: 3,
    limitacoes: [
      'a identidade das 24 armas além da AK é candidata e exige escuta humana',
      'reload, reloadend e bolt ainda são pools globais no runtime',
      'tiro distante e impactos permanecem no laboratório A/B',
      'vozes físicas são perfis provisórios; não substituem dublagem autoral por personagem',
    ],
  },
  weaponSamples: true,
  weapons,
  cs: {
    reload: magOut, reloadend: magIn, bolt,
    footsteps: footstepsBySurface.concrete,
    footstepsBySurface,
    ...runtime,
  },
  characterPhysical: { profiles: physicalProfiles, byCharacter: physicalByCharacter },
  mapSoundscapes,
};

mkdirSync(PUBLICO, { recursive: true });
if (existsSync(LINK) || (() => { try { lstatSync(LINK); return true; } catch { return false; } })()) {
  if (!lstatSync(LINK).isSymbolicLink()) {
    console.error(`recusado: ${LINK} já existe e não é symlink.`);
    process.exit(2);
  }
  const atual = realpathSync(resolve(dirname(LINK), readlinkSync(LINK)));
  if (atual !== realpathSync(WAVS)) {
    console.error(`recusado: ${LINK} já aponta para outro lugar.`);
    process.exit(2);
  }
} else {
  symlinkSync(WAVS, LINK, 'dir');
}

if (existsSync(MANIFEST)) {
  try {
    const atual = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    if (atual?._localLab?.tipo !== 'local-fab-game-lab') {
      console.error(`recusado: ${MANIFEST} já existe e não pertence ao laboratório Fab.`);
      process.exit(2);
    }
  } catch (e) {
    console.error(`recusado: ${MANIFEST} existente não é JSON válido (${e.message}).`);
    process.exit(2);
  }
}
const temporario = `${MANIFEST}.tmp`;
writeFileSync(temporario, JSON.stringify(manifest, null, 2) + '\n');
renameSync(temporario, MANIFEST);

const total = obrigatorios.reduce((sum, [, pool]) => sum + pool.length, 0);
console.log(`laboratório Fab instalado: ${total} referências em ${Object.keys(weapons).length} armas, ${Object.keys(footstepsBySurface).length} superfícies e ${Object.keys(mapSoundscapes).length} mapas.`);
console.log('AK preservada: Gunshot_1-1. Demais armas/eventos são candidatos para escuta, não aprovados.');
console.log('Abra o jogo local; o primeiro disparo por arma aquece o buffer e ainda usa o synth.');
