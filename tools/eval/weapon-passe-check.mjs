#!/usr/bin/env node
// O passe não é uma oferta: 15 recompensas precisam continuar fora da loja.
// O teto de 400 KiB por imagem usa como referência o teto por mídia de
// treta-skin-video-check.mjs.
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WEAPON_SKINS } from '../../public/js/data/weapon-skin-definitions.js';
import { TRETA_WEAPON_SKINS } from '../../public/js/treta-catalog.js';

const root = fileURLToPath(new URL('../../public/', import.meta.url));
const ids = Array.from({ length: 15 }, (_, i) => `arma-${String(i + 1).padStart(2, '0')}`);
const markPath = /^\/textures\/weapon-skins\/project-marks\/[a-z0-9-]+\.webp$/;
const maxBytes = 400 * 1024;
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice('--mutante='.length);
const prove = process.argv.includes('--provar-mutante');
if ((mutant && mutant !== 'skin-passe-a-venda') || (prove && !mutant)) {
  throw new Error('Mutante desconhecido ou não informado');
}

// Cópia rasa é suficiente: a mutação troca só storeEnabled, sem tocar no registro congelado.
const skins = Object.fromEntries(Object.entries(WEAPON_SKINS).map(([id, skin]) => [id, { ...skin }]));
if (mutant) {
  if (!skins[ids[0]] || skins[ids[0]].storeEnabled !== false) throw new Error('MUTANTE NÃO APLICOU: arma-01 não está fora da loja');
  skins[ids[0]].storeEnabled = true;
  if (skins[ids[0]].storeEnabled !== true || WEAPON_SKINS[ids[0]].storeEnabled !== false) throw new Error('MUTANTE NÃO APLICOU: cópia não foi alterada');
  console.log(`Mutação aplicada: ${mutant}`);
}

const checks = [];
const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });
const found = Object.keys(skins).filter((id) => /^arma-\d+$/.test(id));
check('PAS1', found.length === ids.length && ids.every((id) => Object.hasOwn(skins, id)),
  `${found.length}/15 IDs arma-NN; esperados arma-01 a arma-15`);
for (const [index, id] of ids.entries()) {
  const skin = skins[id];
  check('PAS2', skin?.id === id && skin?.passe?.season === 'sessao-da-treta-s1' && skin?.passe?.level === index + 1 && skin?.storeSeries === 'SESSÃO DA TRETA',
    `${id}: id, temporada, nível ${index + 1} e série devem corresponder ao passe`);
  check('PAS3', skin?.storeEnabled === false, `${id}: storeEnabled deve ser false; recompensa não pode ser vendida`);
  check('PAS4', skin?.rightsStatus === 'original-safe' && skin?.storePoster === `/img/weapon-skins/${id}.webp` && markPath.test(skin?.markAsset || ''),
    `${id}: direitos, cartaz e marca devem seguir o contrato`);
}
const listed = TRETA_WEAPON_SKINS.filter((skin) => ids.includes(skin.id));
check('PAS5', listed.length === 0, `${listed.length}/15 itens do passe no catálogo real: ${listed.map((skin) => skin.id).join(', ') || 'nenhum'}`);

const assets = [...ids.map((id) => `/img/weapon-skins/${id}.webp`), ...new Set(ids.map((id) => skins[id]?.markAsset).filter((path) => markPath.test(path || '')))];
let total = 0;
for (const asset of assets) {
  let size = 0;
  try {
    const stat = statSync(`${root}${asset.slice(1)}`);
    if (stat.isFile()) size = stat.size;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  total += size;
  check('PAS6', size > 0 && size <= maxBytes, `${asset}: ${size} bytes; arquivo obrigatório, teto ${maxBytes} bytes`);
}
check('PAS7', total > 0 && total <= assets.length * maxBytes,
  `${total}/${assets.length * maxBytes} bytes nos cartazes e marcas`);

const failed = checks.filter((entry) => !entry.ok);
console.log(JSON.stringify({ pass: failed.length === 0, mutant: mutant || null, checks }, null, 2));
if (prove) {
  if (failed.length !== 1 || failed[0].id !== 'PAS3' || !failed[0].detail.startsWith('arma-01:')) process.exitCode = 1;
} else if (failed.length) process.exitCode = 1;
