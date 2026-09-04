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
const GAME_RUNTIME = readFileSync(join(RAIZ, 'public/js/game.js'), 'utf8');
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && mutante !== 'sem-veto') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const tmp = mkdtempSync(join(tmpdir(), 'audio-fab-local-'));
const pack = join(tmp, 'pack-privado');
const wavs = join(pack, 'extracted-wav');
const publico = join(tmp, 'public', 'audio');
mkdirSync(wavs, { recursive: true });
mkdirSync(publico, { recursive: true });

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

const run = spawnSync(process.execPath, [SCRIPT, pack, `--publico=${publico}`], {
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
  const firearms = Object.keys(WEAPONS).filter((id) => id !== 'knife');
  const mapped = firearms.filter((id) => manifest.weapons?.[id]?.length === 1);
  if (mapped.length !== firearms.length) erros.push(`LAB5b armas com tiro próprio: ${mapped.length}/${firearms.length}.`);
  const uniqueShots = new Set(firearms.flatMap((id) => manifest.weapons?.[id] || []));
  if (uniqueShots.size !== firearms.length) erros.push(`LAB5c tiros distintos: ${uniqueShots.size}/${firearms.length}.`);
  if (manifest.weapons?.ak?.[0] !== 'audio/fab-dev/Guns/Gun_Shot/Gunshot_1-1.wav') erros.push('LAB5d AK aprovada pelo dono foi alterada.');
  if (manifest.cs?.reload?.length !== 1 || manifest.cs?.reloadend?.length !== 1 || manifest.cs?.bolt?.length !== 1) {
    erros.push('LAB6 foley disponível não foi ligado aos caminhos globais do runtime.');
  }
  for (const surface of ['concrete', 'metal', 'wood', 'dirt', 'grass', 'gravel', 'water']) {
    if (manifest.cs?.footstepsBySurface?.[surface]?.length !== 1) erros.push(`LAB7 passos de ${surface} não foram ligados por superfície.`);
  }
  for (const key of ['death', 'explosion', 'roundstart', 'roundwin', 'roundlose', 'knife', 'knifehit', 'knifedeploy', 'dryfire']) {
    if (!manifest.cs?.[key]?.length) erros.push(`LAB8 evento ${key} continua sem sample no runtime.`);
  }
  if (texto.includes('Distant')) erros.push('LAB8b tiro distante foi forçado sem contrato de mix por distância.');
  if (manifest._localLab?.armasComTiroProprio !== firearms.length) {
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
]) if (!AUDIO_RUNTIME.includes(needle)) erros.push(`LAB11 runtime não consome ${label}.`);
if (!/m92:\s*'ak'/.test(AUDIO_RUNTIME)) erros.push('LAB11 runtime classifica a Zastava M92 como pistola.');
if (!GAME_RUNTIME.includes('this.sfx.step(this._footstepSurface(p.pos))')) erros.push('LAB11 game não escolhe passos por arena/superfície.');

try {
  if (resolve(publico, readlinkSync(join(publico, 'fab-dev'))) !== resolve(wavs)) {
    erros.push('LAB10 symlink não aponta para a raiz privada exata dos WAVs.');
  }
} catch (e) { erros.push(`LAB10 symlink local ausente/inválido: ${e.message}`); }

rmSync(tmp, { recursive: true, force: true });
if (erros.length) {
  console.error(`AUDIO FAB LOCAL${mutante ? ` [mutante=${mutante}]` : ''}: ${erros.length} falha(s)`);
  for (const e of erros) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('AUDIO FAB LOCAL: verde — 25 armas, 7 superfícies e 9 eventos adicionais audíveis; veto ativo e nenhum caminho privado serializado.');
