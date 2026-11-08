/* ============================================================================
   personagem-inicial-check.mjs — SORTEIO SEGURO DO PERSONAGEM ANÔNIMO
   ----------------------------------------------------------------------------
   Prova o boot de main.js sem depender de um navegador ou de uma escolha
   anterior: o sorteio respeita o lado salvo, persiste apenas quando não há
   rota nem personagem salvo e não sobrescreve um link explícito.

   Uso: node tools/eval/personagem-inicial-check.mjs
        [--mutante=sem-sorteio|ignora-lado|grava-rota]
   ============================================================================ */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const inicio = source.indexOf('const routeChar =');
const fim = source.indexOf('let game =', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'bloco de inicialização não encontrado');
const MUTANTES = ['sem-sorteio', 'ignora-lado', 'grava-rota'];
const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
assert.ok(!mutante || MUTANTES.includes(mutante), `mutante desconhecido: ${mutante}`);

const boot = source.slice(inicio, fim);
const mutado = mutante === 'sem-sorteio'
  ? boot.replace('const initialChar = rememberedDef || randomInitialCharacter();', 'const initialChar = rememberedDef || CHARACTERS[0];')
  : mutante === 'ignora-lado'
    ? boot.replace('CHARACTERS.filter((character) => podeNoLado(character, rememberedSide))', 'CHARACTERS')
    : mutante === 'grava-rota'
      ? boot.replace('if (!routeCharacterId && !rememberedDef)', 'if (!routeCharacterId)')
      : boot;
assert.equal(mutado !== boot, Boolean(mutante), mutante ? `mutante ${mutante} não foi aplicada` : 'boot nominal foi alterado');

const CHARACTERS = [
  { id: 'esquerdo', team: 'E' },
  { id: 'dama', team: 'E' },
  { id: 'direito', team: 'B' },
  { id: 'caminhoneiro', team: 'B' },
];
const podeNoLado = (character, side) => character.team === side;
const ladosDe = (character) => [character.team];

function run({ search = '', side = 'E', stored = null, seed = 0 }) {
  const entries = new Map();
  if (stored) entries.set('csbr-home-character', stored);
  entries.set('csbr-home-side', side);
  const writes = [];
  const localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); writes.push([key, value]); },
  };
  const context = {
    CHARACTERS,
    HUB_ENABLED: true,
    location: { search },
    localStorage,
    crypto: { getRandomValues: (target) => { target[0] = seed; return target; } },
    URLSearchParams,
    podeNoLado,
    ladosDe,
    writes,
  };
  vm.runInNewContext(`${mutado}\nglobalThis.result = { initialChar: initialChar.id, initialSide, stored: localStorage.getItem('csbr-home-character'), writes };`, context);
  return context.result;
}

const inicialE = run({ side: 'E', seed: 1 });
assert.ok(['esquerdo', 'dama'].includes(inicialE.initialChar), `PEI1 personagem fora do lado E: ${inicialE.initialChar}`);
assert.equal(inicialE.initialSide, 'E', 'PEI1 lado E divergente');
assert.equal(inicialE.writes.length, 1, 'PEI1 sorteio anônimo não foi persistido');
assert.equal(inicialE.stored, inicialE.initialChar, 'PEI1 storage não recebeu o sorteio');

const inicialB = run({ side: 'B', seed: 1 });
assert.ok(['direito', 'caminhoneiro'].includes(inicialB.initialChar), `PEI2 personagem fora do lado B: ${inicialB.initialChar}`);
assert.equal(inicialB.initialSide, 'B', 'PEI2 lado B divergente');

const salvo = run({ side: 'B', stored: 'caminhoneiro', seed: 0 });
assert.equal(salvo.initialChar, 'caminhoneiro', 'PEI3 personagem salvo foi trocado');
assert.equal(salvo.writes.length, 0, 'PEI3 personagem salvo foi regravado');

const rota = run({ search: '?personagem=dama', side: 'B', stored: 'caminhoneiro', seed: 0 });
assert.equal(rota.initialChar, 'dama', 'PEI4 rota explícita não prevaleceu');
assert.equal(rota.stored, 'caminhoneiro', 'PEI4 rota explícita sobrescreveu o storage');
assert.equal(rota.writes.length, 0, 'PEI4 rota explícita gerou gravação');

console.log(`personagem-inicial-check: PASS${mutante ? ` (mutante ${mutante} detectado)` : ''}`);
