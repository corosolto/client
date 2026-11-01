/* Contratos causais F1/F3/F4, nominal primeiro e erros separados.
   Método e limites: docs/visual-consistency/SKINS-FLOW.md. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderer, sfx, initTextures, CHARACTERS, seedRandom } from './harness.mjs';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const JS = path.join(RAIZ, 'public/js');
const WS = Object.freeze({ ak: 'pack-caveira-urbana-ak', pistol: 'pack-caveira-urbana-pistol' });
const KNIFE = 'pack-caveira-urbana-knife';
const VALIDOS = new Set(['f1', 'f3', 'f4-earlyall', 'f4-missingawait']);
const PROBAS = new Set(['f3-entrega', 'throw-f4']);
const ESPERADO = { '': [], f1: ['F1a', 'F1b'], f3: ['F3a', 'F3d'], 'f4-earlyall': ['F4a'], 'f4-missingawait': ['F4c'] };
const ESPERADO_PROBE = { 'f3-entrega': ['F3d', 'F3e'], 'throw-f4': [] };

let MUT = '';
let PROBE = '';
for (const a of process.argv.slice(2)) {
  const m = /^--(mutante|probe)=(.+)$/.exec(a);
  const alvo = m && m[1] === 'mutante' ? MUT : PROBE;
  if (!m || alvo) {
    console.error(`CLI inválida (use nada, --mutante=${[...VALIDOS].join('|')} e/ou --probe=${[...PROBAS].join('|')}): ${a || 'repetido'}`);
    process.exit(2);
  }
  if (m[1] === 'mutante') { MUT = m[2]; if (!VALIDOS.has(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); } }
  else { PROBE = m[2]; if (!PROBAS.has(PROBE)) { console.error(`probe desconhecido: ${PROBE}`); process.exit(2); } }
}

/* Nominal REAL primeiro, pelo mesmo CLI: mutante/probe só roda com o nominal verde. */
if (MUT || PROBE) {
  const nom = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (nom.status !== 0) {
    console.error(`ERRO DE INFRA (skin-profile-flow-check): nominal REAL verde-primero falhou (status=${nom.status}, signal=${nom.signal ?? '-'})`);
    process.exit(3);
  }
}

const assertUma = (s, agulha) => {
  const n = s.split(agulha).length - 1;
  if (n !== 1) throw new Error(`âncora não-única (${n}×) na fonte real: ${JSON.stringify(agulha.slice(0, 60))}`);
};

/* Cada mutante edita a fonte REAL em memória — nunca o predicado. */
const MUTACOES_GAME = {
  f1: (s) => {
    assertUma(s, 'weaponSkins: this.playerWeaponSkins, skin: this.playerDef?.pal?.skin');
    assertUma(s, 'gloveSkinId: this.playerGloveId, weaponSkins: this.playerWeaponSkins, skin: def.pal?.skin');
    return s
      .replace('weaponSkins: this.playerWeaponSkins, skin: this.playerDef?.pal?.skin', 'skin: this.playerDef?.pal?.skin')
      .replace('gloveSkinId: this.playerGloveId, weaponSkins: this.playerWeaponSkins, skin: def.pal?.skin', 'gloveSkinId: this.playerGloveId, skin: def.pal?.skin');
  },
  f3: (s) => {
    assertUma(s, "(w === 'knife' ? (this.playerKnifeSkinId || null)");
    return s.replace("(w === 'knife' ? (this.playerKnifeSkinId || null)", "(w === 'knife' ? (null)");
  },
  'f4-earlyall': (s) => {
    const alvo = `  return Promise.all(loads.map((load) => Promise.resolve(load).catch((e) => {
    console.error('preload da partida falhou parcialmente', e);
    return null;
  })));`;
    assertUma(s, alvo);
    return s.replace(alvo, `  return Promise.all(loads).catch((e) => {
    console.error('preload da partida falhou parcialmente', e);
    return null;
  });`);
  },
};
const MUTACOES_MAIN = {
  'f4-missingawait': (s) => {
    assertUma(s, '      await aguardarPreloads([');
    return s.replace('      await aguardarPreloads([', '      aguardarPreloads([');
  },
};

/* Probe de independência (não é mutante do placar): quebra só a entrega ao builder. */
const PROBAS_GAME = {
  'f3-entrega': (s) => {
    assertUma(s, '{ weaponId: w, weaponSkinId: skinTP, gloveSkinId: this.playerGloveId }');
    return s.replace('{ weaponId: w, weaponSkinId: skinTP, gloveSkinId: this.playerGloveId }', '{ weaponId: w, gloveSkinId: this.playerGloveId }');
  },
};

const TEXTURAS = initTextures();
const falhou = new Set();
const infra = [];
const linhas = [];
const reg = (id, passou, detalhe, titulo) => {
  linhas.push(`${id} · ${titulo}\n   ${detalhe}\n   ${passou ? 'PASSA' : 'FALHA'}`);
  if (!passou) falhou.add(id);
};
/* Exceção em cláusula é infra (exit 3), nunca detecção — não preenche falhou. */
const regInfra = (id, e) => infra.push(`${id}: ${e && e.message ? e.message : e}`);
const mesmoMapa = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const drena = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
  await new Promise((r) => setImmediate(r));
  for (let i = 0; i < 30; i++) await Promise.resolve();
};

/* Sobe o game.js REAL (texto intacto no nominal, mutado nos modos) numa cópia em memória do
   módulo: arquivo temporário em node_modules (gitignored, criado e removido aqui), imports
   relativos reescritos para URL absoluta e glbchars.js substituído por um shim que registra
   os argumentos entregues a buildCharacterModel — a mesmíssima instrumentação nos dois modos. */
async function carregarFonte(qs = '') {
  let src = fs.readFileSync(path.join(JS, 'game.js'), 'utf8');
  if (MUTACOES_GAME[MUT]) src = MUTACOES_GAME[MUT](src);
  if (PROBAS_GAME[PROBE]) src = PROBAS_GAME[PROBE](src);
  const tmp = fs.mkdtempSync(path.join(RAIZ, 'node_modules', '.skinflow-'));
  try {
    const prefixo = pathToFileURL(JS).href;
    const shim = path.join(tmp, 'glbchars-spy.mjs');
    fs.writeFileSync(shim, `import * as G from ${JSON.stringify(prefixo + '/glbchars.js')};
export * from ${JSON.stringify(prefixo + '/glbchars.js')};
export function buildCharacterModel(def, opts = {}) { (globalThis.__skinflowBuilder ??= []).push(opts); return G.buildCharacterModel(def, opts); }
`);
    assertUma(src, "from './glbchars.js'");
    src = src
      .replace("from './glbchars.js'", `from ${JSON.stringify(pathToFileURL(shim).href)}`)
      .replace(/from '(\.\/[^']+)'/g, (_, rel) => `from ${JSON.stringify(prefixo + rel.slice(1))}`)
      .replace(/import\('\.\//g, `import('${prefixo}/`);
    const arquivo = path.join(tmp, `skinflow-game-${qs ? qs.replace(/[^a-z0-9]/gi, '') : 'default'}.mjs`);
    fs.writeFileSync(arquivo, src);
    globalThis.__skinflowBuilder = [];
    const buscaAntes = globalThis.location.search;
    globalThis.location.search = qs ? `?${qs}` : '';
    try {
      const mod = await import(pathToFileURL(arquivo).href);
      return { Game: mod.Game, aguardarPreloads: mod.aguardarPreloads, builder: globalThis.__skinflowBuilder };
    } finally { globalThis.location.search = buscaAntes; }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

function boot(Game) {
  seedRandom(12345);
  const playerDef = CHARACTERS.find((c) => c.team === 'E') || CHARACTERS[0];
  const g = new Game({
    renderer, textures: TEXTURAS, sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: playerDef.id, playerWeaponSkins: WS, playerKnifeSkinId: KNIFE,
    playerTeam: 'E', playerFaction: playerDef.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'posto_treta', ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  g.state = 'live';
  g.player.alive = true;
  return g;
}

try {
  const fonte = await carregarFonte();

  /* ── F1 ─ os perfis de _switchTeam/_trocarPersonagem REAIS preservam weaponSkins ── */
  await (async () => {
    const g = boot(fonte.Game);
    g._switchTeam();
    const posTeam = g.vm.authored?.profile?.weaponSkins;
    reg('F1a', mesmoMapa(posTeam, WS), `profile.weaponSkins após _switchTeam real = ${JSON.stringify(posTeam)}`, 'profile.weaponSkins sobrevive ao _switchTeam real');
    const outro = CHARACTERS.find((c) => c.id !== g.playerDef.id && c.team === g.playerFaction) || CHARACTERS.find((c) => c.id !== g.playerDef.id);
    g._trocarPersonagem(g.player, outro, true);
    const posChar = g.vm.authored?.profile?.weaponSkins;
    reg('F1b', mesmoMapa(posChar, WS), `profile.weaponSkins após _trocarPersonagem real = ${JSON.stringify(posChar)}`, 'profile.weaponSkins sobrevive ao _trocarPersonagem real');
    g.dispose?.();
  })().catch((e) => regInfra('F1', e));

  /* ── F3 ─ _ensurePlayerTP REAL: cache E entrega do ID ao builder, controles positivos ── */
  await (async () => {
    const g = boot(fonte.Game);
    g.camView = 'third';
    const entrega = (w) => [...fonte.builder].reverse().find((o) => o.weaponId === w) || null;
    fonte.builder.length = 0;
    g.player.weapon = 'knife'; g._tpWeapon = null; g._ensurePlayerTP();
    reg('F3a', g._tpArmaSkin === KNIFE, `_tpArmaSkin(knife) = ${g._tpArmaSkin}`, 'a faca resolve a própria skin pelo playerKnifeSkinId');
    const dKnife = entrega('knife');
    reg('F3d', !!dKnife && dKnife.weaponSkinId === KNIFE, `buildCharacterModel real recebeu opts = ${JSON.stringify(dKnife)}`, 'o ID da skin da faca é ENTREGUE ao builder (não só ao cache)');
    fonte.builder.length = 0;
    g.player.weapon = 'ak'; g._tpWeapon = null; g._ensurePlayerTP();
    reg('F3b', g._tpArmaSkin === WS.ak, `_tpArmaSkin(ak) = ${g._tpArmaSkin}`, 'arma comum continua resolvendo pelo playerWeaponSkins');
    const dAk = entrega('ak');
    reg('F3e', !!dAk && dAk.weaponSkinId === WS.ak, `buildCharacterModel real recebeu opts = ${JSON.stringify(dAk)}`, 'controle positivo: a AK entrega o ID do mapa ao builder');
    fonte.builder.length = 0;
    g.playerKnifeSkinId = null; g.player.weapon = 'knife'; g._tpWeapon = null; g._ensurePlayerTP();
    reg('F3c', g._tpArmaSkin === null, `_tpArmaSkin(knife sem skin) = ${g._tpArmaSkin}`, 'sem playerKnifeSkinId o 3P não inventa pintura');
    const dSem = entrega('knife');
    reg('F3f', !!dSem && dSem.weaponSkinId == null, `buildCharacterModel real recebeu opts = ${JSON.stringify(dSem)}`, 'sem skin de faca o builder não recebe weaponSkinId');
    g.dispose?.();
  })().catch((e) => regInfra('F3', e));

  /* kill-switch ?skin3p=0 zuba a entrega no caminho real (módulo próprio, QS no boot) */
  await (async () => {
    const fonte0 = await carregarFonte('skin3p=0');
    const g = boot(fonte0.Game);
    g.camView = 'third'; g.player.weapon = 'knife'; g._tpWeapon = null; g._ensurePlayerTP();
    const d = [...fonte0.builder].reverse().find((o) => o.weaponId === 'knife') || null;
    reg('F3g', g._tpArmaSkin === null && !!d && d.weaponSkinId == null, `_tpArmaSkin = ${g._tpArmaSkin}, builder opts = ${JSON.stringify(d)}`, 'kill-switch ?skin3p=0 anula cache E entrega ao builder');
    g.dispose?.();
  })().catch((e) => regInfra('F3g', e));

  /* ── F4a/F4b ─ barreira REAL de game.js: falha cedo não derruba; falha é logada ── */
  await (async () => {
    let liberar; const lento = new Promise((r) => (liberar = r));
    const rapido = Promise.reject(new Error('falhou rápido'));
    let concluiu = false;
    const barra = fonte.aguardarPreloads([rapido, lento]).then((v) => { concluiu = true; return v; });
    await drena();
    const pendenteAntes = !concluiu;
    liberar();
    const v = await barra;
    reg('F4a', pendenteAntes && concluiu, `barreira pendente com o lento pendente = ${pendenteAntes}; concluiu após liberar = ${concluiu} (resultado ${JSON.stringify(v)})`, 'rejeição cedo NÃO resolve a barreira antes do load lento (ordem, sem timer)');
    let erros = 0;
    const errOriginal = console.error;
    console.error = (...a) => { if (String(a[0]).includes('preload da partida falhou parcialmente')) erros += 1; };
    try { await fonte.aguardarPreloads([Promise.reject(new Error('x')), Promise.resolve(1)]); } finally { console.error = errOriginal; }
    reg('F4b', erros >= 1, `console.error de falha parcial chamado ${erros}×`, 'a falha de cada load é logada, não engolida');
  })().catch((e) => regInfra('F4ab', e));

  /* ── F4c/F4d ─ o bloco REAL de boot do main.js executa com promessas controladas ── */
  await (async () => {
    let mainSrc = fs.readFileSync(path.join(JS, 'main.js'), 'utf8');
    if (MUTACOES_MAIN[MUT]) mainSrc = MUTACOES_MAIN[MUT](mainSrc);
    const abertura = '  try {\n    if (!navOnly) {';
    const bf = mainSrc.indexOf(abertura);
    const bt = bf < 0 ? -1 : mainSrc.indexOf('\n  if (lancamentoPerdeu', bf);
    if (bf < 0 || bt < 0) throw new Error('bloco de boot do main.js não encontrado');
    const bloco = mainSrc.slice(bf, bt);
    const { mapPropIds } = await import(pathToFileURL(path.join(JS, 'mapprops.js')).href);
    const ordem = [];
    const cargas = [];
    let liberarFaca; const promesaFaca = new Promise((r) => (liberarFaca = () => { ordem.push('faca pronta'); r(); }));
    const env = {
      ordem,
      navOnly: false,
      aguardarPreloads: (loads) => { cargas.push([...loads]); return fonte.aguardarPreloads(loads); },
      preloadCharacterAssets: () => Promise.resolve(), _charsToLoad: [], _armasDaPartida: [], _vmBootWeapons: [],
      preloadCosmeticAssets: () => Promise.resolve(), matchSkins: [],
      preloadEyewearAssets: () => Promise.resolve(), matchEyewear: [],
      playerGloveId: null, charId: 'barbudo', preloadGloveAssets: () => Promise.resolve(),
      playerWeaponSkins: {},
      preloadWeaponSkinCandidate: (id) => { ordem.push(`preload skin ${id}`); return promesaFaca; },
      playerKnifeSkinId: KNIFE,
      sfx: { preloadWeaponSamples: () => Promise.resolve() },
      /* v7 da união: o bloco real pergunta `ehMapaJavaporcos(currentMap)` antes do
         preload de áudio do modo. Cenário desta régua não é mapa javaporcos. */
      ehMapaJavaporcos: () => false, currentMap: 'praca_poderes',
      preloadMapProps: () => Promise.resolve(), mapPropIds, mapaPartida: {},
      MOBILE_AUTO: true, preloadMapAmbientLife: () => Promise.resolve(),
      preloadFPArms: () => Promise.resolve(), POINTER_COARSE: true,
      preloadAuthoredFamilies: () => Promise.resolve(), authoredBootFamilies: () => [],
    };
    const rodar = new Function(...Object.keys(env), `return (async()=>{\n${bloco}\nordem.push('new Game');\n})();`);
    const p = rodar(...Object.values(env));
    /* Probe throw-f4: o bloco real roda e o throw vem no meio do calc — infra (3), não detecção. */
    if (PROBE === 'throw-f4') { await drena(); throw new Error('probe: throw injetado no calc do bloco F4'); }
    await drena();
    const antesDeLiberar = [...ordem];
    liberarFaca();
    await p;
    reg('F4c', !antesDeLiberar.includes('new Game') && ordem.includes('new Game'), `ordem antes de liberar a última promessa = ${JSON.stringify(antesDeLiberar)}; ordem final = ${JSON.stringify(ordem)}`, 'o bloco REAL de boot não nasce Game enquanto a última promessa da barreira está pendente (sem await = falha)');
    reg('F4d', cargas.length === 1 && cargas[0].includes(promesaFaca), `loads efetivamente entregues à barreira = ${cargas.length}×, promessa da faca entre eles = ${cargas[0]?.includes(promesaFaca)}`, 'a promessa de preloadWeaponSkinCandidate(playerKnifeSkinId) ENTRA na barreira (medido no argumento, não no texto)');
  })().catch((e) => regInfra('F4cd', e));

  console.log(`\n${linhas.join('\n\n')}\n`);
  const esperado = PROBE ? ESPERADO_PROBE[PROBE] : ESPERADO[MUT];
  const observado = [...falhou].sort();
  if (infra.length) {
    console.error(`ERRO DE INFRA (skin-profile-flow-check) — cláusula por exceção não é detecção: ${infra.join(' | ')}`);
    process.exit(3);
  }
  if (!MUT && !PROBE) {
    console.log(falhou.size === 0 ? 'PASSA (skin-profile-flow-check)' : `REPROVA (skin-profile-flow-check) — ${observado.join(', ')}`);
    process.exit(falhou.size === 0 ? 0 : 1);
  }
  const rotulo = PROBE ? `probe ${PROBE}` : `mutante ${MUT} (fonte real alterada em memória)`;
  const bateu = JSON.stringify(observado) === JSON.stringify([...esperado].sort());
  console.log(`${rotulo} — esperado reprovar exatamente [${esperado.join(', ')}], observado [${observado.join(', ')}]`);
  console.log(bateu ? `DETECTADO (skin-profile-flow-check ${rotulo})` : `FALHA NA RÉGUA (skin-profile-flow-check ${rotulo})`);
  process.exit(bateu ? 0 : 1);
} catch (e) {
  console.error(`ERRO DE INFRA (skin-profile-flow-check): ${e && e.stack ? e.stack.split('\n')[0] : e}`);
  process.exit(3);
}
