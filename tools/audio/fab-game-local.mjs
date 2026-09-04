#!/usr/bin/env node
/* Instala o pack Fab somente no jogo local. Os WAVs continuam fora do Git: um
   symlink ignorado aponta para o staging privado e o manifest também é ignorado. */
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, realpathSync,
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

/* O tiro fixa um candidato por execução. Com dezenas de URLs sorteadas, cada
   disparo pegaria cache frio e cairia no synth; o restante continua no A/B. */
const shot = candidatos('ak.shot', { primeiro: true });
const magOut = candidatos('ak.magOut');
const magIn = candidatos('ak.magIn');
const bolt = candidatos('ak.bolt');
const footsteps = candidatos('passo.concreto');
const obrigatorios = [['ak.shot', shot], ['ak.magOut', magOut], ['ak.magIn', magIn], ['ak.bolt', bolt], ['passo.concreto', footsteps]];
const vazios = obrigatorios.filter(([, arr]) => !arr.length).map(([evento]) => evento);
if (vazios.length) {
  console.error(`recusado: shortlist não tem arquivo seguro/existente para ${vazios.join(', ')}`);
  process.exit(1);
}

const manifest = {
  _localLab: {
    tipo: 'local-fab-game-lab',
    aviso: 'Somente escuta local. Nenhum candidato está aprovado para release.',
    mapeados: 5,
    somenteEscuta: 4,
    limitacoes: [
      'reload, reloadend, bolt e footsteps ainda são pools globais no runtime',
      'tiro distante, morte corporal e impactos permanecem no laboratório A/B',
    ],
  },
  weaponSamples: true,
  weapons: { ak: shot },
  cs: { reload: magOut, reloadend: magIn, bolt, footsteps },
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

const total = shot.length + magOut.length + magIn.length + bolt.length + footsteps.length;
console.log(`laboratório Fab instalado: ${total} candidato(s) em 5 eventos audíveis no jogo local.`);
console.log('AK: o primeiro disparo aquece o buffer e usa o synth; do segundo em diante o sample toca.');
console.log('Abra o jogo local; para os demais sons, mantenha a escuta A/B em http://127.0.0.1:8130/.');
