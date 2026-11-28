/* #1119: personagem fora do rig compartilhado de mãos cai no só-arma mesmo com ?hands=1. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEM_MAOS_FP, maosFpSuportadas } from '../public/js/data/fp-maos.js';

const ler = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('o Lobisomem fica fora das mãos de primeira pessoa', () => {
  assert.ok(SEM_MAOS_FP.includes('lobisomem'));
  assert.equal(maosFpSuportadas('lobisomem'), false);
  assert.equal(maosFpSuportadas('mariabonita'), true);
});

test('todo id da lista existe no elenco', () => {
  const elenco = ler('public/js/characters.js');
  for (const id of SEM_MAOS_FP) assert.match(elenco, new RegExp(`\\bid: '${id}'`), id);
});

test('o game.js consulta a lista antes de montar as mãos', () => {
  assert.match(ler('public/js/game.js'),
    /const WEAPON_ONLY = _qsHands !== '1' \|\| !maosFpSuportadas\(this\.playerCharId\);/);
});
