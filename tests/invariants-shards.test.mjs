import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const INVARIANTES = fileURLToPath(new URL('../tools/eval/invariants.mjs', import.meta.url));
const MAP_CHECK = fileURLToPath(new URL('../tools/eval/map-check.mjs', import.meta.url));
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
