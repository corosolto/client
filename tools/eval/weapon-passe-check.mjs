#!/usr/bin/env node
// O passe não é uma oferta: 15 recompensas precisam continuar fora da loja.
// O teto de 400 KiB por imagem usa como referência o teto por mídia de
// treta-skin-video-check.mjs.
// PAS8: cada skin pinta o corpo com uma textura tileável (`patternAsset`) dentro de
// PATTERN_TEXTURE_BUDGET — o mutante `orcamento-textura` aperta o orçamento e precisa reprovar.
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { WEAPON_SKINS, PATTERN_TEXTURE_BUDGET } from '../../public/js/data/weapon-skin-definitions.js';
import { TRETA_WEAPON_SKINS } from '../../public/js/treta-catalog.js';

const root = fileURLToPath(new URL('../../public/', import.meta.url));
const ids = Array.from({ length: 15 }, (_, i) => `arma-${String(i + 1).padStart(2, '0')}`);
const markPath = /^\/textures\/weapon-skins\/project-marks\/[a-z0-9-]+\.webp$/;
const patternPath = /^\/textures\/weapon-skins\/patterns\/[a-z0-9-]+\.webp$/;
const hex = /^#[0-9a-f]{6}$/i;
const maxBytes = 400 * 1024;
const MUTANTS = Object.freeze({ 'skin-passe-a-venda': 'PAS3', 'orcamento-textura': 'PAS8' });
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice('--mutante='.length);
const prove = process.argv.includes('--provar-mutante');
if ((mutant && !MUTANTS[mutant]) || (prove && !mutant)) {
  throw new Error('Mutante desconhecido ou não informado');
}

// Cópia rasa é suficiente: a mutação troca só storeEnabled, sem tocar no registro congelado.
const skins = Object.fromEntries(Object.entries(WEAPON_SKINS).map(([id, skin]) => [id, { ...skin }]));
const budget = { ...PATTERN_TEXTURE_BUDGET };
if (mutant === 'skin-passe-a-venda') {
  if (!skins[ids[0]] || skins[ids[0]].storeEnabled !== false) throw new Error('MUTANTE NÃO APLICOU: arma-01 não está fora da loja');
  skins[ids[0]].storeEnabled = true;
  if (skins[ids[0]].storeEnabled !== true || WEAPON_SKINS[ids[0]].storeEnabled !== false) throw new Error('MUTANTE NÃO APLICOU: cópia não foi alterada');
}
if (mutant === 'orcamento-textura') {
  budget.maxTextures = new Set(ids.map((id) => skins[id]?.patternAsset)).size - 1;
  if (budget.maxTextures < 0 || budget.maxTextures === PATTERN_TEXTURE_BUDGET.maxTextures) throw new Error('MUTANTE NÃO APLICOU: orçamento inalterado');
}
if (mutant) console.log(`Mutação aplicada: ${mutant}`);

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

const sizeOf = (asset) => {
  try {
    const stat = statSync(`${root}${asset.slice(1)}`);
    return stat.isFile() ? stat.size : 0;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return 0;
  }
};
const assets = [...ids.map((id) => `/img/weapon-skins/${id}.webp`), ...new Set(ids.map((id) => skins[id]?.markAsset).filter((path) => markPath.test(path || '')))];
let total = 0;
for (const asset of assets) {
  const size = sizeOf(asset);
  total += size;
  check('PAS6', size > 0 && size <= maxBytes, `${asset}: ${size} bytes; arquivo obrigatório, teto ${maxBytes} bytes`);
}
check('PAS7', total > 0 && total <= assets.length * maxBytes,
  `${total}/${assets.length * maxBytes} bytes nos cartazes e marcas`);

for (const id of ids) {
  const { patternAsset, patternStyle } = skins[id] || {};
  const palette = patternStyle?.palette;
  check('PAS8', patternPath.test(patternAsset || '') && patternStyle?.scale > 0 && patternStyle?.contrast > 0
    && (palette === null || (palette?.length === 3 && palette.every((color) => hex.test(color)))),
  `${id}: patternAsset ${patternAsset || 'ausente'}; escala, contraste e paleta de 3 cores (ou null)`);
}
const patterns = [...new Set(ids.map((id) => skins[id]?.patternAsset).filter((path) => patternPath.test(path || '')))];
check('PAS8', patterns.length <= budget.maxTextures, `${patterns.length}/${budget.maxTextures} texturas de corpo distintas`);
for (const asset of patterns) {
  const size = sizeOf(asset);
  const { width = 0, height = 0 } = size ? await sharp(`${root}${asset.slice(1)}`).metadata() : {};
  const pow2 = (value) => value > 0 && (value & (value - 1)) === 0;
  check('PAS8', size > 0 && size <= budget.maxBytes && pow2(width) && pow2(height) && Math.max(width, height) <= budget.maxSize,
    `${asset}: ${size} bytes ${width}x${height}; teto ${budget.maxBytes} bytes, lado potência de 2 ≤ ${budget.maxSize}`);
}

const failed = checks.filter((entry) => !entry.ok);
console.log(JSON.stringify({ pass: failed.length === 0, mutant: mutant || null, checks }, null, 2));
if (prove) {
  const expected = MUTANTS[mutant];
  const caught = failed.length === 1 && failed[0].id === expected
    && (mutant !== 'skin-passe-a-venda' || failed[0].detail.startsWith('arma-01:'));
  if (!caught) process.exitCode = 1;
} else if (failed.length) process.exitCode = 1;
