#!/usr/bin/env node
/* Gate do laboratório local Fab. Usa somente fixtures de texto; nenhum WAV do
   pacote comprado é lido nem entregue ao processo de avaliação. */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { WEAPONS } from '../../public/js/data/weapons.js';

const RAIZ = resolve(new URL('../..', import.meta.url).pathname);
const SCRIPT = join(RAIZ, 'tools/audio/fab-game-local.mjs');
const AUDIO_RUNTIME = readFileSync(join(RAIZ, 'public/js/audio.js'), 'utf8');
const MAIN_RUNTIME = readFileSync(join(RAIZ, 'public/js/main.js'), 'utf8');
const GAME_RUNTIME = readFileSync(join(RAIZ, 'public/js/game.js'), 'utf8');
const NET_RUNTIME = readFileSync(join(RAIZ, 'public/js/netgame.js'), 'utf8');
const CHARACTERS_RUNTIME = readFileSync(join(RAIZ, 'public/js/characters.js'), 'utf8');
const SOUNDSCAPE_RUNTIME = readFileSync(join(RAIZ, 'public/js/soundscape.js'), 'utf8');
const MAP_IDS = [
  'praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho', 'quebrada', 'corrego',
  'posto_treta', 'upa_24h', 'obras_prefeitura', 'atacadao_treta', 'parque_treta',
  'velho_oeste', 'penitenciaria',
];
const FIREARM_IDS = Object.keys(WEAPONS).filter((id) => id !== 'knife');
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && mutante !== 'sem-veto') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const tmp = mkdtempSync(join(tmpdir(), 'audio-fab-local-'));
const pack = join(tmp, 'pack-privado');
const wavs = join(pack, 'extracted-wav');
const firearmsCc0 = join(tmp, 'firearms-cc0');
const publico = join(tmp, 'public', 'audio');
mkdirSync(wavs, { recursive: true });
mkdirSync(firearmsCc0, { recursive: true });
mkdirSync(publico, { recursive: true });
const shotgunFixture = [
  'shotgun-01-mossberg-room.wav', 'shotgun-02-model12-room.wav', 'shotgun-03-nova-room.wav',
  'shotgun-04-mossberg-near.wav', 'shotgun-05-model12-near.wav', 'shotgun-06-nova-near.wav',
];
const firearmFixture = Object.fromEntries(FIREARM_IDS.filter((id) => id !== 'ak').map((id) => [
  id, [id === 'shotgun' ? shotgunFixture[0] : `${id}.wav`],
]));
for (const nome of new Set([...Object.values(firearmFixture).flat(), ...shotgunFixture])) {
  writeFileSync(join(firearmsCc0, nome), 'fixture-cc0-sem-audio');
}
writeFileSync(join(firearmsCc0, 'manifest.json'), JSON.stringify({
  license: 'CC0-1.0', approval: 'local-candidates-only',
  weapons: firearmFixture, weaponCandidates: { shotgun: shotgunFixture },
}));

const candidato = (arquivo) => ({ arquivo, sha256: 'a'.repeat(64), familia: arquivo.replace(/-\d+\.wav$/, '') });
const tiros = [
  'Gunshot_1-1.wav', 'Gunshot_1-2.wav', 'Gunshot_1-3.wav', 'Gunshot_1-4.wav', 'Gunshot_1-5.wav',
  'Gunshot_2-1.wav', 'Gunshot_2-2.wav', 'Gunshot_3-1.wav', 'Gunshot_3-2.wav', 'Gunshot_3-3.wav',
  'Gunshot_3-4.wav', 'Gunshot_3-5.wav', 'Gunshot_3-6.wav', 'Gunshot_4-1.wav', 'Gunshot_4-2.wav',
  'Gunshot_4-3.wav', 'Gunshot_4-4.wav', 'Gunshot_4-5.wav', 'Gunshot_4-6.wav', 'Gunshot_5-1.wav',
  'Gunshot_5-2.wav', 'Gunshot_7-1.wav', 'Gunshot_7-2.wav', 'Gunshot_7-3.wav', 'Gunshot_8-1.wav',
].map((name) => `Guns/Gun_Shot/${name}`);
const eventos = [
  ['ak.shot', tiros],
  ['ak.shot.distante', ['Guns/Gun_Shot/Gunshot_Distant_1-1.wav']],
  ['ak.magOut', ['Guns/Foley/Unload_1-1.wav']],
  ['ak.magIn', ['Guns/Foley/Insert_Ammo_1-1.wav']],
  ['ak.bolt', ['Guns/Foley/Load_1-1.wav']],
  ['passo.concreto', ['Footstep/Concrete/Concrete_Walk-1.wav']],
  ['passo.metal', ['Footstep/Metal/Metal_Walk-1.wav']],
  ['passo.madeira', ['Footstep/Wood/Wood_Walk-1.wav']],
  ['passo.terra', ['Footstep/Dirt/Dirt_Walk-1.wav']],
  ['passo.grama', ['Footstep/Grass/Grass_Walk-1.wav']],
  ['passo.cascalho', ['Footstep/Gravel/Gravel_Walk-1.wav']],
  ['passo.agua', ['Environment/Water_Splash_1-1.wav']],
  ['morte.corpo', ['Combat/Body_Falling_1-1.wav']],
  ['granada.explosao', ['Explosions/Small_Explosion_Realistic_1-1.wav']],
  ['round.inicio', ['Interface/Interface_12-1.wav']],
  ['round.vitoria', ['Interface/Interface_5-1.wav']],
  ['round.derrota', ['Interface/Interface_6-1.wav']],
  ['faca.swing', ['Combat/Whoosh_Metal_1-1.wav']],
  ['faca.hit', ['Combat/Stab_1-2.wav']],
  ['faca.deploy', ['Combat/Draw_Weapon_Metal_1-1.wav']],
  ['arma.dryfire', ['Guns/Foley/Dry_Fire_1-1.wav']],
  ['impacto.concreto', []],
  ['impacto.metal', []],
  ['granada.arremesso', ['Combat/Whoosh_1-1.wav', 'Combat/Whoosh_2-1.wav']],
  ['granada.quique', ['Environment/Rock_Impact_21.wav', 'Environment/Rock_Impact_35.wav']],
  ['personagem.masculino.dor', ['Human_Vocalizations/Male_1_-_Effort_2-01.wav', 'Human_Vocalizations/Male_1_-_Effort_2-05.wav']],
  ['personagem.masculino.morte', ['Human_Vocalizations/Male_1_-_Grunt_20.wav', 'Human_Vocalizations/Male_1_-_Grunt_35.wav']],
  ['personagem.feminino.dor', ['Human_Vocalizations/Female_1_-_Effort_1-06.wav', 'Human_Vocalizations/Female_1_-_Effort_1-11.wav']],
  ['personagem.feminino.morte', ['Human_Vocalizations/Female_1_-_Grunt_29.wav', 'Human_Vocalizations/Female_1_-_Grunt_34.wav']],
  ['personagem.criatura.morte', ['Human_Vocalizations/Male_1_-_Grunt_18.wav', 'Human_Vocalizations/Male_1_-_Grunt_26.wav']],
  ['ambiente.vento', ['Environment/Wind_Loop_1.wav', 'Environment/Wind_Loop_6.wav']],
  ['ambiente.agua', ['Environment/Water_Stream_Calm_1.wav', 'Environment/Water_Stream_Moderate_1.wav']],
  ['ambiente.arvores', ['Environment/Tree_Rustling_1-1.wav', 'Environment/Tree_Rustling_1-4.wav']],
  ['ambiente.madeira', ['Environment/Wood_Move_1-1.wav', 'Environment/Wood_Move_2-1.wav']],
  ['ambiente.metal', ['Doors/Rusty_Metal_Creak_01.wav', 'Doors/Rusty_Metal_Creak_03.wav']],
  ['ambiente.porta', ['Doors/Door_Open_3-1.wav', 'Doors/Door_Close_3-1.wav']],
].map(([evento, arquivos]) => ({ evento, candidatos: arquivos.map(candidato) }));
/* Um nome proibido é plantado dentro de um evento aparentemente permitido. O
   instalador tem que barrá-lo por conta própria, não confiar cegamente na shortlist. */
eventos[0].candidatos.unshift(candidato('Guns/Gore/Gunshot_Blood-1.wav'));
for (const e of eventos) for (const c of e.candidatos) {
  const alvo = join(wavs, c.arquivo);
  mkdirSync(resolve(alvo, '..'), { recursive: true });
  writeFileSync(alvo, 'fixture-sem-audio');
}
writeFileSync(join(pack, 'shortlist-piloto.json'), JSON.stringify({ eventos, biblioteca: [] }));

const run = spawnSync(process.execPath, [SCRIPT, pack, `--publico=${publico}`, `--firearms-cc0=${firearmsCc0}`], {
  encoding: 'utf8', env: { ...process.env, FAB_GAME_LOCAL_MUTANTE: mutante },
});
const erros = [];
if (run.status !== 0) erros.push(`LAB1 instalador saiu ${run.status}: ${(run.stderr || run.stdout).trim()}`);

let manifest = null;
try { manifest = JSON.parse(readFileSync(join(publico, 'manifest.json'), 'utf8')); }
catch (e) { erros.push(`LAB2 manifest local ausente/inválido: ${e.message}`); }

if (manifest) {
  const texto = JSON.stringify(manifest);
  if (texto.includes(tmp)) erros.push('LAB3 caminho privado absoluto vazou para o manifest.');
  if (texto.toLowerCase().includes('blood') || texto.toLowerCase().includes('gore')) {
    erros.push('LAB4 veto editorial não mordeu: gore apareceu no manifest local.');
  }
  if (manifest.weapons?.ak?.length !== 1) erros.push(`LAB5 tiro da AK deve fixar 1 candidato por vez; veio ${manifest.weapons?.ak?.length}.`);
  const mapped = FIREARM_IDS.filter((id) => manifest.weapons?.[id]?.length === 1);
  if (mapped.length !== FIREARM_IDS.length) erros.push(`LAB5b armas com tiro próprio: ${mapped.length}/${FIREARM_IDS.length}.`);
  const uniqueShots = new Set(FIREARM_IDS.flatMap((id) => manifest.weapons?.[id] || []));
  if (uniqueShots.size !== FIREARM_IDS.length) erros.push(`LAB5c tiros distintos: ${uniqueShots.size}/${FIREARM_IDS.length}.`);
  if (manifest.weapons?.ak?.[0] !== 'audio/fab-dev/Guns/Gun_Shot/Gunshot_1-1.wav') erros.push('LAB5d AK aprovada pelo dono foi alterada.');
  if (manifest.weaponSamplesAuthentic !== true) {
    erros.push('LAB5dc arsenal CC0 real não ativou o caminho de reprodução neutra.');
  }
  const cc0Mapped = FIREARM_IDS.filter((id) => id !== 'ak' && manifest.weapons?.[id]?.[0]?.startsWith('audio/firearms-cc0-dev/'));
  if (cc0Mapped.length !== FIREARM_IDS.length - 1) {
    erros.push(`LAB5da arsenal sem AK mapeado semanticamente para CC0: ${cc0Mapped.length}/${FIREARM_IDS.length - 1}.`);
  }
  if (manifest.weapons?.shotgun?.[0] !== 'audio/firearms-cc0-dev/shotgun-01-mossberg-room.wav') {
    erros.push('LAB5e shotgun rejeitada continua usando o take Fab que soa como estilingue.');
  }
  const shotgunCandidates = manifest.weaponCandidates?.shotgun || [];
  if (shotgunCandidates.length !== 6 || !shotgunCandidates.every((url) => url.startsWith('audio/firearms-cc0-dev/'))) {
    erros.push(`LAB5f candidatos reais de shotgun no seletor local: ${shotgunCandidates.length}/6.`);
  }
  if (manifest.cs?.reload?.length !== 1 || manifest.cs?.reloadend?.length !== 1 || manifest.cs?.bolt?.length !== 1) {
    erros.push('LAB6 foley disponível não foi ligado aos caminhos globais do runtime.');
  }
  for (const surface of ['concrete', 'metal', 'wood', 'dirt', 'grass', 'gravel', 'water']) {
    if (manifest.cs?.footstepsBySurface?.[surface]?.length !== 1) erros.push(`LAB7 passos de ${surface} não foram ligados por superfície.`);
  }
  for (const key of ['death', 'explosion', 'roundstart', 'roundwin', 'roundlose', 'knife', 'knifehit', 'knifedeploy', 'dryfire']) {
    if (!manifest.cs?.[key]?.length) erros.push(`LAB8 evento ${key} continua sem sample no runtime.`);
  }
  for (const key of ['grenadethrow', 'grenadebounce']) {
    if (!manifest.cs?.[key]?.length) erros.push(`LAB8c evento ${key} continua sem sample no runtime.`);
  }
  const profiles = manifest.characterPhysical?.profiles || {};
  for (const profile of ['male', 'female', 'creature']) {
    if (!profiles[profile]?.hurt?.length || !profiles[profile]?.death?.length) {
      erros.push(`LAB8d perfil físico ${profile} não cobre dor e morte.`);
    }
  }
  const rosterBlock = CHARACTERS_RUNTIME.split('export const CHARACTERS = [')[1]?.split('];\nexport const byId')[0] || '';
  const characterIds = [...rosterBlock.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
  const mappedCharacters = characterIds.filter((id) => profiles[manifest.characterPhysical?.byCharacter?.[id]]);
  if (mappedCharacters.length !== characterIds.length || characterIds.length < 40) {
    erros.push(`LAB8e personagens com perfil físico: ${mappedCharacters.length}/${characterIds.length}.`);
  }
  if (/scream/i.test(JSON.stringify(manifest.characterPhysical))) erros.push('LAB8f vocal físico vetado atravessou o manifest.');
  const soundscapes = manifest.mapSoundscapes || {};
  for (const id of MAP_IDS) {
    const cfg = soundscapes[id];
    if (!cfg || (!(cfg.loops?.length) && !(cfg.shots?.length) && !cfg.synth)) {
      erros.push(`LAB8g mapa ${id} continua sem ambiência local.`);
    }
  }
  const signatures = new Set(MAP_IDS.map((id) => JSON.stringify(soundscapes[id])));
  if (signatures.size < 8) erros.push(`LAB8h ambiências distintas insuficientes: ${signatures.size}/8.`);
  if (texto.includes('Distant')) erros.push('LAB8b tiro distante foi forçado sem contrato de mix por distância.');
  if (manifest._localLab?.armasComTiroProprio !== FIREARM_IDS.length) {
    erros.push('LAB9 resumo do que entra no jogo e do que fica só em escuta divergiu.');
  }
}

for (const [label, needle] of [
  ['passos por superfície', 'footstepsBySurface?.[surface]'],
  ['morte por sample', "this._cs('death')"],
  ['granada por sample', "this._cs('explosion')"],
  ['início de round por sample', "this._cs('roundstart')"],
  ['vitória de round por sample', "this._cs('roundwin')"],
  ['derrota de round por sample', "this._cs('roundlose')"],
  ['dry fire por sample', "this._cs('dryfire')"],
  ['arremesso de granada', 'grenadeThrow(kind'],
  ['quique de granada', 'grenadeBounce(kind'],
  ['abertura da fumaça', 'smokePop(vol'],
  ['vocal físico por personagem', '_characterPhysical(kind, characterId'],
]) if (!AUDIO_RUNTIME.includes(needle)) erros.push(`LAB11 runtime não consome ${label}.`);
if (!/m92:\s*'ak'/.test(AUDIO_RUNTIME)) erros.push('LAB11 runtime classifica a Zastava M92 como pistola.');
if (!AUDIO_RUNTIME.includes('SAMPLE_WEAPON_SIGNATURE')
  || !AUDIO_RUNTIME.includes('SAMPLE_CLASS_SIGNATURE')
  || !AUDIO_RUNTIME.includes('this._shotSample(f, w, dist, vol, pan, propDelay)')) {
  erros.push('LAB11a samples continuam sem assinatura de fonte por arma e fallback por família.');
}
if (AUDIO_RUNTIME.includes('_sampleGunSignature(')) {
  erros.push('LAB11aa sample ainda recebe transiente/sub sintetizado por cima do WAV.');
}
const signatureBlock = AUDIO_RUNTIME.split('static SAMPLE_WEAPON_SIGNATURE = {')[1]?.split('};')[0] || '';
for (const id of ['ak', 'pistol', 'revolver38', 'deagle', 'shotgun']) {
  if (!new RegExp(`${id}:\\s*\\{[^}]*rate:[^}]*hp:[^}]*lp:[^}]*gain:`).test(signatureBlock)) {
    erros.push(`LAB11ab arma ${id} continua sem perfil próprio de fonte.`);
  }
}
const pistolProfiles = ['pistol', 'revolver38', 'deagle'].map((id) =>
  signatureBlock.match(new RegExp(`${id}:\\s*\\{([^}]*)\\}`))?.[1]?.replace(/\\s+/g, '') || '');
if (new Set(pistolProfiles).size !== pistolProfiles.length) {
  erros.push('LAB11ac pistolas continuam compartilhando a mesma assinatura.');
}
if (!/ak:\s*\{\s*rate:\s*1(?:\.00)?,\s*hp:\s*0,\s*lp:\s*22000,\s*gain:\s*1(?:\.00)?\s*\}/.test(signatureBlock)) {
  erros.push('LAB11ad a AK aprovada deixou de usar o take neutro.');
}
if (!/shotgun:\s*\{\s*rate:\s*1(?:\.00)?,\s*hp:\s*0,\s*lp:\s*22000,\s*gain:\s*\.95\s*\}/.test(signatureBlock)) {
  erros.push('LAB11ae shotgun real ainda recebe pitch/EQ que descaracteriza a gravação.');
}
if (!AUDIO_RUNTIME.includes('async preloadWeaponSamples(weapons = [])')
  || !MAIN_RUNTIME.includes('sfx.preloadWeaponSamples(_armasDaPartida)')) {
  erros.push('LAB11af primeiro tiro ainda pode cair no synth enquanto o WAV carrega.');
}
if (!AUDIO_RUNTIME.includes('_weaponSample(weapon)')
  || !AUDIO_RUNTIME.includes("get('shotguntake')")
  || AUDIO_RUNTIME.includes("this._pick(this.pack?.weapons?.[w])")) {
  erros.push('LAB11ag jogo não permite comparar takes reais de shotgun de forma determinística.');
}
if (!AUDIO_RUNTIME.includes('this.pack?.weaponSamplesAuthentic')
  || !AUDIO_RUNTIME.includes('Sfx.SAMPLE_SOURCE_NEUTRAL')) {
  erros.push('LAB11ah gravações reais ainda passam por pitch/EQ genérico de família.');
}
if (!GAME_RUNTIME.includes('this.sfx.step(this._footstepSurface(p.pos))')) erros.push('LAB11 game não escolhe passos por arena/superfície.');
for (const [label, needle] of [
  ['pino da granada', 'this.sfx.grenadePin(kind)'],
  ['arremesso da granada', 'this.sfx.grenadeThrow(kind'],
  ['quique da granada', 'this.sfx.grenadeBounce(g.kind'],
  ['fumaça abrindo', 'this.sfx.smokePop('],
  ['explosão espacial', 'this.sfx.explosion(spatial.vol, spatial.pan, spatial.delay)'],
  ['ambiência do manifest por mapa', 'this.sfx.pack?.mapSoundscapes?.[this._mapId]'],
]) if (!GAME_RUNTIME.includes(needle)) erros.push(`LAB11 game não dispara ${label}.`);
if (!/this\._eventSample\(sample,\s*0\.72\s*\*\s*vol,\s*pan,\s*propDelay,\s*true/.test(AUDIO_RUNTIME)) {
  erros.push('LAB11b morte corporal ainda passa pelo duck do tiro.');
}
const deathBlock = AUDIO_RUNTIME.split("death(characterId = ''")[1]?.split('\n  jump()')[0] || '';
if (deathBlock.includes("_characterPhysical('death'") || deathBlock.includes('this._beep(')) {
  erros.push('LAB11ba morte padrão ainda sobrepõe vocal dramático ou sting tonal ao corpo.');
}
if (!AUDIO_RUNTIME.includes('this._sample(url, vol, !direct')) erros.push('LAB11c cache frio do evento ignora barramento direto.');
if (!GAME_RUNTIME.includes('this.sfx.death(ent.def?.id') || !NET_RUNTIME.includes('game.sfx.death(ent.def?.id')) {
  erros.push('LAB11d morte local/remota não carrega a identidade do personagem.');
}
for (const [label, needle] of [
  ['one-shots declarados pelo mapa', '...(state.config.shots || [])'],
  ['pré-carga dos eventos ambientais', 'Promise.all([...wanted].map((src) => load(src)))'],
  ['leito global sem queda pelo centro', 'loop.global ? 1'],
  ['hum procedural dos mapas internos', "state.config.synth?.kind === 'indoor-hum'"],
]) if (!SOUNDSCAPE_RUNTIME.includes(needle)) erros.push(`LAB11e soundscape não consome ${label}.`);

try {
  if (resolve(publico, readlinkSync(join(publico, 'fab-dev'))) !== resolve(wavs)) {
    erros.push('LAB10 symlink não aponta para a raiz privada exata dos WAVs.');
  }
} catch (e) { erros.push(`LAB10 symlink local ausente/inválido: ${e.message}`); }
try {
  if (resolve(publico, readlinkSync(join(publico, 'firearms-cc0-dev'))) !== resolve(firearmsCc0)) {
    erros.push('LAB10b symlink CC0 não aponta para a raiz privada exata do arsenal derivado.');
  }
} catch (e) { erros.push(`LAB10b symlink CC0 local ausente/inválido: ${e.message}`); }

rmSync(tmp, { recursive: true, force: true });
if (erros.length) {
  console.error(`AUDIO FAB LOCAL${mutante ? ` [mutante=${mutante}]` : ''}: ${erros.length} falha(s)`);
  for (const e of erros) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('AUDIO FAB LOCAL: verde — arsenal, granadas, 13 mapas e vozes físicas do elenco audíveis; veto ativo e nenhum caminho privado serializado.');
