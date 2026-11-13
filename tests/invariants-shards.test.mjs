import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { COLLIDER_SHARDS } from '../tools/eval/operacao-flavio-proof-check.mjs';

const INVARIANTES = fileURLToPath(new URL('../tools/eval/invariants.mjs', import.meta.url));
const MAP_CHECK = fileURLToPath(new URL('../tools/eval/map-check.mjs', import.meta.url));
const PORTAO_INTEIRO = fileURLToPath(new URL('../tools/eval/portao-inteiro-check.mjs', import.meta.url));
const OPERACAO_FLAVIO = fileURLToPath(new URL('../tools/eval/operacao-flavio-check.mjs', import.meta.url));
const OPERACAO_FLAVIO_PROOF = fileURLToPath(new URL('../tools/eval/operacao-flavio-proof-check.mjs', import.meta.url));
const SHARDS = ['fonte', 'vm', 'bots-base', 'bots-duelo', 'bots-diagnostico', 'bots-mount', 'chars-mat', 'mapas-nucleo', 'mapas-comunidades', 'mapas-amazonia', 'mapas-oeste', 'mapas-invasao', 'mapas-rural', 'mapas-vila'];
const IDS_HISTORICOS = [
  'SYN', 'VM1', 'VM2', 'VM3', 'VM4', 'VM5', 'VM6', 'VM7', 'VM8', 'VM9', 'VM10', 'VM12', 'VM14', 'VM15', 'VM16', 'VM17', 'VM18', 'VM18b', 'VM19', 'VM20', 'VM21', 'VM22', 'VM23',
  'AUD1', 'AUD1A', 'AUD1B', 'AUD1C', 'AUD1C-CTL', 'AUD1D', 'AUD1V', 'RIG', 'TPM1', 'TPM2', 'TPM3',
  'BOT1', 'BOT2', 'BOT3', 'BOT4', 'BOT5', 'BOT6', 'BOT7', 'BOT8', 'ARM1', 'ARM2', 'ARM4', 'ARM5', 'ESP1', 'MOD1', 'MOD2', 'LOOP1', 'PAUSA',
  'CHR1', 'CHR2', 'CHR3', 'CHR4', 'CHR5', 'CHR5B', 'CHR6', 'CHR7', 'CHR8',
  'MAPAUD', 'MAP1', 'MAP2', 'MAP2B', 'MAP3', 'MAP4', 'MAP5', 'MAP6', 'CTF1', 'CTF2', 'LRP1', 'LSP1', 'AME',
  'MAT1', 'MAT2', 'FOG1', 'TEX1', 'HUD1', 'CENA1', 'CENA2', 'CENA3',
  'AMH1', 'AMH2', 'AMH3', 'AMH4', 'PX1', 'PX2', 'PX3', 'PX4',
];

function executar(script, args, familia) {
  const env = { ...process.env };
  delete env.INVARIANTES_FAMILIA;
  if (familia !== undefined) env.INVARIANTES_FAMILIA = familia;
  return spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8', timeout: 30000 });
}

function plano(familia) {
  const r = executar(INVARIANTES, ['--plano-json'], familia);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return JSON.parse(r.stdout);
}

function selecaoMapas(ids) {
  const r = executar(MAP_CHECK, [ids, '--list-json']);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return JSON.parse(r.stdout).mapas;
}

function selecaoFlavio(familia) {
  const r = executar(OPERACAO_FLAVIO_PROOF, ['--list-json', familia]);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const plano = JSON.parse(r.stdout);
  assert.equal(plano.length, 1);
  return plano[0];
}

const chave = (bloco, id) => `${bloco.familia}:${bloco.cenario || '-'}:${id}`;
const chaves = (p) => p.blocos.flatMap((b) => b.ids.map((id) => chave(b, id))).sort();

test('default executa o plano completo e a união dos shards preserva IDs e cenários', () => {
  const completo = plano();
  const uniao = SHARDS.flatMap((familia) => plano(familia).blocos);
  assert.deepEqual(chaves({ blocos: uniao }), chaves(completo));
  assert.deepEqual(new Set(completo.blocos.map((b) => b.familia)), new Set(SHARDS));
  const ids = new Set(completo.blocos.flatMap((b) => b.ids));
  assert.deepEqual([...IDS_HISTORICOS].filter((id) => !ids.has(id)), []);
});

test('CSV combina famílias e o alias mapas seleciona todos os grupos', () => {
  const combinado = plano('vm,bots');
  assert.deepEqual([...new Set(combinado.familias)].sort(), ['vm', 'bots-base', 'bots-diagnostico', 'bots-duelo', 'bots-mount'].sort());
  assert.deepEqual(chaves(combinado), chaves({ blocos: [...plano('vm').blocos, ...plano('bots').blocos] }));
  const mapas = plano('mapas');
  assert.deepEqual(mapas.familias, SHARDS.filter((f) => f.startsWith('mapas-')));
  assert.deepEqual(chaves(mapas), chaves({ blocos: SHARDS.filter((f) => f.startsWith('mapas-')).flatMap((f) => plano(f).blocos) }));
});

test('o seletor real de mapas cobre o registro uma única vez, inclusive no default', () => {
  const todos = selecaoMapas('all');
  const completo = plano();
  const blocosMapas = completo.blocos.filter((b) => b.mapas);
  const particionados = [];
  for (const familia of new Set(blocosMapas.map((b) => b.familia))) {
    const mapas = [...new Set(blocosMapas.filter((b) => b.familia === familia).flatMap((b) => b.mapas))];
    assert.deepEqual(selecaoMapas(mapas.join(',')), mapas);
    particionados.push(...mapas);
  }
  assert.equal(new Set(particionados).size, todos.length);
  assert.deepEqual([...particionados].sort(), [...todos].sort());
  assert.deepEqual(selecaoMapas('loja_h'), ['loja_h']);
});

test('nenhuma simulação, produtor freshReport ou consumidor atravessa shards', () => {
  const donos = new Map();
  for (const familia of SHARDS) {
    for (const bloco of plano(familia).blocos) {
      for (const sim of bloco.sims) {
        if (!donos.has(sim)) donos.set(sim, new Set());
        donos.get(sim).add(familia);
      }
      if (bloco.sims.some((s) => s.startsWith('map-check['))) {
        for (const id of ['MAPAUD', 'MAP1', 'MAP2', 'MAP2B', 'MAP4', 'CTF1', 'CTF2']) assert.ok(bloco.ids.includes(id), `${bloco.familia} perdeu ${id}`);
        if (bloco.mapas.includes('loja_h')) for (const id of ['MAP3', 'MAP5']) assert.ok(bloco.ids.includes(id));
        if (bloco.mapas.includes('lajes')) for (const id of ['LRP1', 'LSP1']) assert.ok(bloco.ids.includes(id));
      }
      if (bloco.sims.includes('char-probe')) assert.ok(bloco.ids.includes('CHR1'));
      if (bloco.sims.includes('mat-check')) assert.ok(bloco.ids.includes('MAT1'));
      if (bloco.sims.includes('pickup-check')) assert.ok(bloco.ids.includes('VM14'));
    }
  }
  for (const [sim, familias] of donos) assert.equal(familias.size, 1, `${sim} cruzou shards`);
  assert.deepEqual([...donos.get('vm-kick')], ['vm']);
  assert.deepEqual([...donos.get('botsim')], ['bots-base']);
  assert.deepEqual([...donos.get('botsim-duel')], ['bots-duelo']);
  assert.deepEqual([...donos.get('botdiag')], ['bots-diagnostico']);
  assert.deepEqual([...donos.get('tp-mount')], ['bots-mount']);
});

test('família desconhecida ou vazia falha antes de executar qualquer bloco', () => {
  for (const filtro of ['desconhecida', 'vm,desconhecida', 'vm,,bots', '']) {
    const r = executar(INVARIANTES, [], filtro);
    assert.equal(r.status, 1, filtro);
    assert.match(r.stderr, /INVARIANTES_FAMILIA desconhecida/);
    assert.equal(r.stdout, '');
  }
});

test('seleção de mapa desconhecida ou duplicada falha antes do harness', () => {
  for (const filtro of ['nao-existe', 'loja_h,loja_h', 'loja_h,']) {
    const r = executar(MAP_CHECK, [filtro, '--list-json']);
    assert.equal(r.status, 1, filtro);
    assert.match(r.stderr, /Seleção de mapas inválida/);
    assert.equal(r.stdout, '');
  }
});

test('validador real cobre os 17 contratos visuais uma única vez e na ordem dos shards', () => {
  const r = executar(PORTAO_INTEIRO, []);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /PI4 17 contratos visuais únicos, ordenados e cobertos pelos \d+ shards/);
  const duplicado = executar(PORTAO_INTEIRO, ['--mutante=contrato-visual-duplicado']);
  assert.equal(duplicado.status, 1, duplicado.stderr || duplicado.stdout);
  assert.match(duplicado.stdout, /eval:knife-skin-markings: esperado uma execução no CI, encontradas 2/);
});

test('consumidor sem npm ci nem action composta falha fechado', () => {
  const semSetup = executar(PORTAO_INTEIRO, ['--mutante=sem-setup-compartilhado']);
  assert.equal(semSetup.status, 1, semSetup.stderr || semSetup.stdout);
  assert.match(semSetup.stdout, /PI4 economia-ak-hud: consumidor precisa usar exatamente \.\/\.github\/actions\/setup-ci-environment; encontrados 0/);
});

test('seletor real divide collider em shards balanceados, disjuntos, ordenados e completos', () => {
  const completo = selecaoFlavio('collider');
  const shards = COLLIDER_SHARDS.map((indice) => selecaoFlavio(`collider:${indice}`));
  const uniao = shards.flatMap((shard) => shard.mutantes);
  assert.equal(new Set(uniao).size, uniao.length);
  assert.deepEqual([...uniao].sort(), [...completo.mutantes].sort());
  assert.ok(Math.max(...shards.map((s) => s.mutantes.length)) - Math.min(...shards.map((s) => s.mutantes.length)) <= 1);
  for (const [indice, shard] of shards.entries()) {
    assert.equal(shard.script, completo.script);
    assert.deepEqual(shard.mutantes, completo.mutantes.filter((_, posicao) => posicao % COLLIDER_SHARDS.length === indice));
    const posteriores = new Set(shards.slice(indice + 1).flatMap((s) => s.mutantes));
    assert.deepEqual(shard.mutantes.filter((mutante) => posteriores.has(mutante)), []);
  }
});

test('seletor collider falha fechado para shard inválido', () => {
  for (const familia of ['collider:', 'collider:-1', 'collider:4', 'collider:01', 'collider:x', 'collider:0:1']) {
    const r = executar(OPERACAO_FLAVIO_PROOF, ['--list-json', familia]);
    assert.equal(r.status, 2, familia);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /shard collider inválido/);
  }
});

test('validador real do pai Flávio preserva online único e detecta suite-duplicada', () => {
  const nominal = executar(OPERACAO_FLAVIO, []);
  assert.equal(nominal.status, 0, nominal.stderr || nominal.stdout);
  const mutante = executar(OPERACAO_FLAVIO, ['--mutante=suite-duplicada']);
  assert.equal(mutante.status, 0, mutante.stderr || mutante.stdout);
  assert.match(mutante.stdout, /mutante suite duplicada acendeu a régua/);
});
