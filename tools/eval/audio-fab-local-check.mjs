#!/usr/bin/env node
/* Gate do laboratório local Fab. Usa somente fixtures de texto; nenhum WAV do
   pacote comprado é lido nem entregue ao processo de avaliação. */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const RAIZ = resolve(new URL('../..', import.meta.url).pathname);
const SCRIPT = join(RAIZ, 'tools/audio/fab-game-local.mjs');
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
const eventos = [
  ['ak.shot', ['Guns/Gun_Shot/Gunshot_1-1.wav', 'Guns/Gun_Shot/Gunshot_1-2.wav']],
  ['ak.shot.distante', ['Guns/Gun_Shot/Gunshot_Distant_1-1.wav']],
  ['ak.magOut', ['Guns/Foley/Unload_1-1.wav']],
  ['ak.magIn', ['Guns/Foley/Insert_Ammo_1-1.wav']],
  ['ak.bolt', ['Guns/Foley/Load_1-1.wav']],
  ['passo.concreto', ['Footstep/Concrete/Concrete_Walk-1.wav']],
  ['morte.corpo', ['Combat/Body_Falling_1-1.wav']],
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
  if (manifest.cs?.reload?.length !== 1 || manifest.cs?.reloadend?.length !== 1 || manifest.cs?.bolt?.length !== 1) {
    erros.push('LAB6 foley disponível não foi ligado aos caminhos globais do runtime.');
  }
  if (manifest.cs?.footsteps?.length !== 1) erros.push('LAB7 passos concretos não foram ligados ao runtime.');
  if (texto.includes('Distant') || texto.includes('Body_Falling')) {
    erros.push('LAB8 evento sem caminho de runtime foi ligado e ficaria silencioso ou semanticamente errado.');
  }
  if (manifest._localLab?.mapeados !== 5 || manifest._localLab?.somenteEscuta !== 4) {
    erros.push('LAB9 resumo do que entra no jogo e do que fica só em escuta divergiu.');
  }
}

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
console.log('AUDIO FAB LOCAL: verde — 5 eventos audíveis, veto editorial ativo e nenhum caminho privado serializado.');
