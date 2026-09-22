/* eval:vm-launch — a chave de lançamento do viewmodel é TUDO-OU-NADA.
 *
 * Decisão do dono (23/09/2026): todas as armas saem com braços e mãos K, ou
 * nenhuma. O defeito que esta régua existe para pegar é a ativação PARCIAL:
 * o #618 abria o autorado por família (ak, pistol, grenade prontas) e as outras
 * 23 armas caíam no legado na MESMA partida — duas linguagens visuais de mão
 * trocando a cada arma. Estado medido na criação: 3 das 26 armas prontas
 * (ak, pistol, knife) + granada; VM_LAUNCH=false.
 *
 *   VL1 cobertura     cada id do WEAPON_IDS (+ granada) tem portão legível
 *   VL2 chave honesta VM_LAUNCH=true só com as 26 + granada `ready`
 *   VL3 decisão       tabela-verdade de vmLaunchDecision (lançamento/revisão/kill)
 *   VL4 seletor       authoredvm.js obedece a chave: 0 ou TODAS as chaves de boot
 *   VL5 jogo real     Game em node: sem chave não nasce controlador autorado nem faca
 *
 *   node tools/eval/vm-launch-check.mjs              # régua no estado do repo
 *   node tools/eval/vm-launch-check.mjs --mutantes   # prova que ela morde
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const JS = path.join(ROOT, 'public/js');
const FILES = {
  config: path.join(JS, 'data/vmconfig.js'),
  launch: path.join(JS, 'vmlaunch.js'),
  authored: path.join(JS, 'authoredvm.js'),
  game: path.join(JS, 'game.js'),
};
const read = (key) => fs.readFileSync(FILES[key], 'utf8');
let serial = 0;

// Módulo a partir de FONTE (mutável): especificador relativo vira URL absoluta,
// e os três módulos do seletor apontam uns para os outros pela versão dada.
function moduleUrl(key, sources, urls = {}) {
  const base = pathToFileURL(FILES[key]);
  const code = sources[key].replace(/from (['"])([^'"]+)\1/g, (_, q, spec) => {
    if (!spec.startsWith('.')) return `from ${q}${import.meta.resolve(spec)}${q}`;
    const abs = new URL(spec, base).href;
    const hit = Object.entries(FILES).find(([, file]) => pathToFileURL(file).href === abs);
    return `from ${q}${hit && urls[hit[0]] ? urls[hit[0]] : abs}${q}`;
  });
  return `data:text/javascript;base64,${Buffer.from(`${code}\n// vm-launch ${serial++}`).toString('base64')}`;
}
function chain(sources) {
  const urls = {};
  urls.config = moduleUrl('config', sources, urls);
  urls.launch = moduleUrl('launch', sources, urls);
  urls.authored = moduleUrl('authored', sources, urls);
  return urls;
}
async function load(sources, search = '') {
  globalThis.window = { location: { search } };
  const urls = chain(sources);
  const [config, launch, authored] = await Promise.all([import(urls.config), import(urls.launch), import(urls.authored)]);
  return { config, launch, authored };
}

// Config inteira pronta (todas as famílias, faca e granada), para medir o seletor.
function allReady(source, { launch = true, except = '' } = {}) {
  let out = source.replace(/ready: false/g, 'ready: true');
  out = out.replace(/export const VM_LAUNCH = (true|false);/, `export const VM_LAUNCH = ${launch};`);
  if (except) {
    const re = new RegExp(`(\\n  ${except}: W\\('[a-z0-9]+', \\{)`);
    if (!re.test(out)) throw Error(`MUTANTE NAO APLICOU: arma ${except} não achada no vmconfig`);
    out = out.replace(re, '$1 ready: false,');
  }
  return out;
}

async function gameProbe(gameSource, search) {
  const script = path.join(HERE, 'vm-launch-check.mjs');
  let file = '';
  if (gameSource) {
    file = path.join(os.tmpdir(), `vm-launch-game-${process.pid}-${serial++}.mjs`);
    const url = moduleUrl('game', { game: gameSource });
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  }
  const env = { ...process.env, SIM_QS: search, VM_LAUNCH_GAME_SRC: file ? pathToFileURL(file).href : '' };
  const run = spawnSync(process.execPath, [script, '--jogo'], { env, encoding: 'utf8', timeout: 120000 });
  if (file) fs.rmSync(file, { force: true });
  const line = (run.stdout || '').trim().split('\n').reverse().find((l) => l.startsWith('VM_LAUNCH_JOGO='));
  if (!line) return { erro: (run.stderr || run.stdout || 'sem saída').slice(-400) };
  return JSON.parse(line.slice('VM_LAUNCH_JOGO='.length));
}

async function audit(sources, { jogo = true } = {}) {
  const checks = [];
  const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), ...detail });
  const { config, launch, authored } = await load(sources);
  const { WEAPON_IDS } = await import('../../public/js/weapons.js');

  const semPortao = WEAPON_IDS.filter((id) => !config.VM_WEAPON[id] && !config.VM_MELEE?.[id]);
  const ids = [...launch.VM_LAUNCH_IDS].sort();
  const esperado = [...WEAPON_IDS, 'grenade'].sort();
  check('VL1', typeof config.VM_LAUNCH === 'boolean' && !semPortao.length
    && JSON.stringify(ids) === JSON.stringify(esperado) && config.VM_FAMILY?.grenade,
  { semPortao, faltandoNaChave: esperado.filter((id) => !ids.includes(id)),
    msg: 'toda arma do WEAPON_IDS precisa de portão (VM_WEAPON ou VM_MELEE) e a chave cobre WEAPON_IDS + granada' });

  const prontas = launch.VM_LAUNCH_IDS.filter((id) => launch.vmWeaponReady(id, config));
  const fora = launch.VM_LAUNCH_IDS.filter((id) => !launch.vmWeaponReady(id, config));
  check('VL2', config.VM_LAUNCH !== true || fora.length === 0, {
    VM_LAUNCH: config.VM_LAUNCH, prontas: `${prontas.length}/${launch.VM_LAUNCH_IDS.length}`, fora,
    msg: `VM_LAUNCH=true com ${fora.length} arma(s) fora de ready (${fora.slice(0, 6).join(', ')}${fora.length > 6 ? ', …' : ''}) — `
      + 'o jogo ficaria 100% no legado sem ninguém saber. Volte VM_LAUNCH=false ou feche as armas (decisão do dono).',
  });

  const d = (o) => launch.vmLaunchDecision({ ids: ['a', 'b'], ...o });
  const todas = () => true, umaFora = (id) => id !== 'b';
  const tabela = [
    ['chave+todas', d({ launch: true, ready: todas }).active === true],
    ['chave+uma-fora', d({ launch: true, ready: umaFora }).active === false],
    ['sem-chave+todas', d({ launch: false, ready: todas }).active === false],
    ['kill-switch', d({ launch: true, ready: todas, search: '?vmauthored=0' }).active === false],
    ['revisao', d({ launch: false, ready: umaFora, search: '?vmauthored=1' }).mode === 'revisao'],
    ['lista-vazia', d({ launch: true, ready: todas, ids: [] }).active === false],
  ];
  check('VL3', tabela.every(([, ok]) => ok), { falhas: tabela.filter(([, ok]) => !ok).map(([n]) => n),
    msg: 'vmLaunchDecision deixou de ser tudo-ou-nada (public/js/vmlaunch.js)' });

  // Seletor real: 0 chaves ou TODAS as armas de fogo + granada. Qualquer meio-termo é parcial.
  const armasDeFogo = WEAPON_IDS.filter((id) => config.VM_WEAPON[id]);
  const cenarios = [
    ['repo', sources.config, authored.AUTHORED_VM_ENABLED === launch.VM_RUNTIME.active],
    ['chave+todas', allReady(sources.config, { launch: true }), true],
    ['chave+uzi-fora', allReady(sources.config, { launch: true, except: 'uzi' }), false],
    ['sem-chave+todas', allReady(sources.config, { launch: false }), false],
  ];
  const vl4 = [];
  for (const [nome, configSource, esperaAtivo] of cenarios) {
    const m = nome === 'repo' ? { authored, launch } : await load({ ...sources, config: configSource });
    const chaves = m.authored.authoredBootFamilies(armasDeFogo);
    const ativo = m.authored.AUTHORED_VM_ENABLED;
    const esperadoAtivo = nome === 'repo' ? m.launch.VM_RUNTIME.active : esperaAtivo;
    const ok = ativo === esperadoAtivo && ativo === m.launch.VM_RUNTIME.active
      && (ativo ? chaves.length === armasDeFogo.length + 1 : chaves.length === 0);
    vl4.push({ nome, ok, ativo, chaves: chaves.length, esperado: ativo ? armasDeFogo.length + 1 : 0 });
  }
  check('VL4', vl4.every((c) => c.ok), { cenarios: vl4,
    msg: 'authoredvm.js não obedece a chave: ativação parcial ou seletor desligado de vmlaunch.js' });

  if (jogo) {
    const semChave = await gameProbe(sources.game !== read('game') ? sources.game : '', '');
    const revisao = await gameProbe(sources.game !== read('game') ? sources.game : '', '?vmauthored=1');
    const esperadoPadrao = launch.VM_RUNTIME.active;
    check('VL5', !semChave.erro && !revisao.erro
      && semChave.authored === esperadoPadrao && semChave.melee === esperadoPadrao
      && revisao.authored === true && revisao.melee === true,
    { padrao: semChave, revisao, esperadoPadrao,
      msg: 'Game real: sem a chave, `vm.authored` e `vm.melee` têm de ser null (faca e granada inclusive)' });
  }
  return { ok: checks.every((c) => c.ok), checks };
}

if (process.argv.includes('--jogo')) {
  const h = await import('./harness.mjs');
  let Game = h.Game;
  if (process.env.VM_LAUNCH_GAME_SRC) Game = (await import(process.env.VM_LAUNCH_GAME_SRC)).Game;
  h.seedRandom(1);
  const def = h.CHARACTERS.find((c) => c.id === h.PCHAR);
  const g = new Game({ renderer: h.renderer, textures: h.initTextures(), sfx: h.sfx,
    settings: { bots: 0, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: def.id, playerTeam: 'E', playerFaction: def.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'piscina_treta', testMode: true, onQuit() {}, onMatchEnd() {} });
  console.log(`VM_LAUNCH_JOGO=${JSON.stringify({ authored: g.vm.authored != null, melee: g.vm.melee != null })}`);
  process.exit(0);
}

const base = { config: read('config'), launch: read('launch'), authored: read('authored'), game: read('game') };
const result = await audit(base);
const imprime = (r) => {
  for (const c of r.checks) {
    const { id, ok, msg, ...rest } = c;
    console.log(`  ${ok ? 'ok   ' : 'FALHA'} ${id} ${ok ? '' : `— ${msg}`}`);
    console.log(`        ${JSON.stringify(rest)}`);
  }
};
console.log('\n  eval:vm-launch — chave tudo-ou-nada do viewmodel');
imprime(result);

if (process.argv.includes('--mutantes')) {
  const mut = (key, antes, depois) => {
    const src = base[key];
    if (src.split(antes).length !== 2) throw Error(`MUTANTE NAO APLICOU: ${key} :: ${antes.slice(0, 60)}`);
    return { ...base, [key]: src.replace(antes, depois) };
  };
  const mutantes = [
    ['chave-mentirosa', ['VL2'], mut('config', 'export const VM_LAUNCH = false;', 'export const VM_LAUNCH = true;')],
    ['uma-arma-fora', ['VL2'], { ...base, config: allReady(base.config, { launch: true, except: 'uzi' }) }],
    ['ativacao-parcial', ['VL3', 'VL4'], mut('launch', 'ids.length > 0 && notReady.length === 0', 'ids.length > 0')],
    ['seletor-ignora-chave', ['VL4'], mut('authored', 'export const AUTHORED_VM_ENABLED = VM_RUNTIME.active;',
      "export const AUTHORED_VM_ENABLED = _QS?.get('vmauthored') !== '0';")],
    ['faca-fora-da-chave', ['VL5'], mut('game', 'this.vm.melee = !AUTHORED_VM_ENABLED ? null : new KnifeMeleeViewModel({',
      'this.vm.melee = new KnifeMeleeViewModel({')],
    ['granada-fora-da-chave', ['VL1'], mut('launch', "[...WEAPON_IDS, 'grenade']", '[...WEAPON_IDS]')],
  ];
  result.mutantes = [];
  for (const [nome, espera, sources] of mutantes) {
    const r = await audit(sources, { jogo: espera.includes('VL5') });
    const vermelhas = r.checks.filter((c) => !c.ok).map((c) => c.id);
    const mordeu = espera.every((id) => vermelhas.includes(id));
    result.mutantes.push({ nome, mordeu, espera, vermelhas });
    console.log(`  mutante ${nome.padEnd(22)} ${mordeu ? 'VERMELHO (mordeu)' : 'VERDE — a régua está cega'}  ${vermelhas.join(',')}`);
  }
  result.ok &&= result.mutantes.every((m) => m.mordeu);
}
console.log(result.ok ? '\n  VERDE — sem ativação parcial\n' : '\n  VERMELHO\n');
process.exit(result.ok ? 0 : 1);
