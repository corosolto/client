#!/usr/bin/env node
/* Emotes de captura (capoeira, breakdance, gestos): pack único lazy, clipe de corpo
   inteiro retargetado por corpo, arma guardada, cancelamento, laço × uma vez, LOD,
   ressincronização de rede, fallback procedural e contrato v9 congelado nos oito IDs
   procedurais. Roda GLB/AnimationMixer reais em Node (tools/eval/lib/glbchars-node.mjs).
   O roster inteiro (99 corpos e skins) é o eval:emotes-roster.
   Cada mutante reintroduz um defeito visível e precisa reprovar a cláusula correspondente:
     emote-mocap-mudo        o clipe nunca toca (só a reserva procedural)  -> EMM3/EMM4/EMM7/EMM9
     arma-visivel-no-emote   a arma fica na mão durante o emote de clipe  -> EMM5
     emote-nao-cancela       parar/dano não tiram o corpo do clipe        -> EMM6
     id-renumerado           um emote de captura muda de posição          -> EMM0
     quadril-fora-da-capsula horizontal do Hips sem encolher              -> EMM12
     rotacao-local           rotação local da referência, sem retarget    -> EMM13
     lobby-sem-clipe         DANÇAR do lobby registra driver sem `clipe`  -> EMM11
     travessao-no-titulo     `—` volta numa `origem` (title da roda)      -> EMM0c
   Uso: node tools/eval/emotes-mocap-check.mjs [--self-test | --mutante=<nome>] */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { root, requests, THREE, CHARACTERS, parseGlb, carregaRuntime, once, step, esperaClipe } from './lib/glbchars-node.mjs';

const mutant = process.argv.find((x) => x.startsWith('--mutante='))?.split('=')[1] || '';
const mutants = ['emote-mocap-mudo', 'arma-visivel-no-emote', 'emote-nao-cancela', 'id-renumerado', 'quadril-fora-da-capsula', 'rotacao-local', 'lobby-sem-clipe', 'travessao-no-titulo'];
assert.ok(!mutant || mutants.includes(mutant), `mutante desconhecido: ${mutant}`);
if (process.argv.includes('--self-test')) {
  for (const kind of ['', ...mutants]) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...(kind ? [`--mutante=${kind}`] : [])], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, `${kind || 'normal'}: ${result.stdout.slice(-900)}${result.stderr.slice(-900)}`);
    assert.ok(result.stdout.includes(kind ? `MUTANTE ${kind} REPROVADO` : 'EMOTES-MOCAP VERDE'), result.stdout.slice(-900));
    console.log(result.stdout.trim());
  }
  process.exit(0);
}

/* Contrato de rede: 1–8 fixados pela v9 (#1266, tests/netcodec-v9.test.mjs). Os emotes
   de captura ficam no catálogo local e só podem entrar na rede sob um protocolo novo. */
const IDS_V9 = ['passinho', 'samba', 'ginga', 'frevo', 'forro', 'quadradinho', 'sarrada', 'salve'];
const IDS_CAPTURA = ['capoeira', 'meia_lua', 'bencao', 'uprock', 'freeze', 'continencia', 'marra', 'comemoracao'];
const NOMES = ['Ginga', 'Meia-lua de frente', 'Bênção', 'Uprock', 'Freeze', 'Continência', 'Marra', 'Comemoração'];
const BASE_GRATIS = ['capoeira', 'comemoracao'];
const PACK = 'models/anims/emotes-mocap.glb';

/* Catálogo + coreografia + glbchars reais (o id-renumerado troca uprock e freeze de lugar). */
const { E, G } = await carregaRuntime({
  catalogo: (catalogo) => {
    if (mutant === 'travessao-no-titulo') return once(catalogo, "origem: 'Breaking - o duelo", "origem: 'Breaking — o duelo");
    if (mutant !== 'id-renumerado') return catalogo;
    const linhas = catalogo.split('\n');
    const a = linhas.findIndex((l) => l.includes("id: 'uprock'")), b = linhas.findIndex((l) => l.includes("id: 'freeze'"));
    assert.ok(a > 0 && b > 0);
    [linhas[a], linhas[b]] = [linhas[b], linhas[a]];
    return linhas.join('\n');
  },
  glbchars: (s) => {
    if (mutant === 'emote-mocap-mudo') return once(s, 'this._to(nome, !info.laco);', 'void nome;');
    if (mutant === 'arma-visivel-no-emote') return once(s, 'n.visible = !this.emotando;', 'n.visible = !this.emotando || !!this._emoteClipeInfo;');
    if (mutant === 'emote-nao-cancela') return once(s, '} else if (this._emoteClipeInfo && this._emoteId && !this.crouch && !this._ar) {', '} else if (this._emoteClipeInfo && !this.crouch && !this._ar) {');
    if (mutant === 'quadril-fora-da-capsula') return once(s, 'const fXZ = maxXZ > limite ? limite / maxXZ : 1;', 'const fXZ = 1;');
    if (mutant === 'rotacao-local') return once(s, 'loc.copy(paiW).invert().multiply(tgtW[i]).toArray(locais[i], f * 4);', '(refQL[ref.indice.get(o.nome)] || ref.ossos.get(o.nome).q).toArray(locais[i], f * 4);');
    return s;
  },
});
await G.preloadCharacterAssets(['capitao', 'gotinha']);
const def = (id) => CHARACTERS.find((x) => x.id === id);
const body = (id = 'capitao', weapon = 'ak', mod = G) => {
  const b = mod.buildCharacterModel(def(id), { weaponId: weapon });
  assert.ok(b?.ctrl, `${id}/${weapon}: modelo real`);
  b.ctrl.aimPitch = 0;
  return b;
};
const pedidosPack = () => requests.filter((u) => u.includes('emotes-mocap.glb')).length;
const quat = (b, osso) => b.ctrl.corpo.get(osso).getWorldQuaternion(new THREE.Quaternion());
const posMundo = (b, osso) => b.ctrl.corpo.get(osso).getWorldPosition(new THREE.Vector3());
const acao = (b, id) => b.ctrl.actions[`emote_${id}`];
/* Malhas de arma (mount vivo, arma-glb ou caixa de fallback) e se aparecem de fato:
   basta um ancestral escondido para a malha sumir. */
const armas = (b) => {
  const raizes = [];
  if (b.ctrl.tpMount?.mount) raizes.push(b.ctrl.tpMount.mount);
  b.group.traverse((o) => { if (/^arma-(glb|caixa)$/.test(o.name)) raizes.push(o); });
  const malhas = new Set();
  for (const r of raizes) r.traverse((o) => { if (o.isMesh) malhas.add(o); });
  return [...malhas].map((m) => {
    let vis = true;
    for (let o = m; o && o !== b.group; o = o.parent) vis &&= o.visible;
    return { visible: vis };
  });
};
const results = [];
const medidas = {};
const check = (id, fn) => { try { fn(); results.push({ id, ok: true }); } catch (e) { results.push({ id, ok: false, erro: e.message }); } };

/* EMM0 — ids binários: os oito da v9 permanecem congelados; captura fica fora da v9. */
check('EMM0-ids-congelados', () => {
  assert.deepEqual(E.V9_EMOTE_IDS, IDS_V9, 'ids 1–8 da v9 mudaram');
  assert.deepEqual(E.EMOTE_IDS.slice(8), IDS_CAPTURA, 'catálogo local de captura mudou');
  assert.ok(IDS_CAPTURA.every((id) => !E.V9_EMOTE_IDS.includes(id)), 'captura vazou para o contrato v9');
});
check('EMM0b-catalogo', () => {
  const captura = E.EMOTES.filter((e) => e.clipe);
  assert.deepEqual(captura.map((e) => e.id).sort(), [...IDS_CAPTURA].sort(), 'catálogo de captura diverge');
  assert.deepEqual(IDS_CAPTURA.map((id) => E.emoteInfo(id)?.nome), NOMES);
  for (const id of IDS_V9) { assert.equal(E.emoteClipe(id), null, id); assert.equal(E.emoteDesbloqueio(id), 'base', id); }
  for (const id of IDS_CAPTURA) {
    const info = E.emoteClipe(id);
    assert.ok(info && IDS_V9.includes(info.reserva), `${id}: reserva procedural`);
    assert.ok(['base', 'passe'].includes(E.emoteDesbloqueio(id)), `${id}: desbloqueio`);
  }
  assert.deepEqual(IDS_CAPTURA.filter((id) => E.emoteDesbloqueio(id) === 'base'), BASE_GRATIS);
});
/* EMM0c: nome e origem viram texto do jogador (title dos botões da roda e do lobby). */
check('EMM0c-texto-publico', () => {
  for (const e of E.EMOTES) assert.ok(!/[—–]/.test(`${e.nome} ${e.origem}`), `${e.id}: travessão no texto público`);
});

/* EMM1 — o pack versionado tem exatamente os 8 clipes, com a duração do catálogo. */
const packBytes = fs.statSync(path.join(root, 'public', PACK)).size;
medidas.packBytes = packBytes;
const parsed = await parseGlb(fs.readFileSync(path.join(root, 'public', PACK)));
check('EMM1-pack', () => {
  assert.deepEqual(parsed.animations.map((a) => a.name).sort(), [...IDS_CAPTURA].sort());
  for (const a of parsed.animations) assert.ok(Math.abs(a.duration - E.emoteInfo(a.name).dur) < 0.02, `${a.name}: ${a.duration} × ${E.emoteInfo(a.name).dur}`);
  const sources = fs.readFileSync(path.join(root, 'public/models/anims/emotes-mocap.SOURCES.md'), 'utf8');
  for (const id of IDS_CAPTURA) assert.ok(sources.includes(`| ${id} | ${E.emoteInfo(id).fonte} |`), `${id}: SOURCES sem o id do catálogo`);
  assert.ok(packBytes < 400_000, `pack ${packBytes} bytes`);
});

/* EMM2 — lazy: corpo e dança procedural não baixam; o primeiro emote de clipe baixa uma vez. */
const capitao = body('capitao');
const controle = body('capitao');
step(capitao, 30); step(controle, 30);
const antes = pedidosPack();
capitao.ctrl.emote('frevo'); step(capitao, 5); capitao.ctrl.pararEmote(); step(capitao, 80);
const semPack = pedidosPack() - antes;
capitao.ctrl.emote('capoeira');
await esperaClipe(capitao);
const gotinha = body('gotinha');
gotinha.ctrl.emote('continencia');
await esperaClipe(gotinha);
check('EMM2-pack-lazy', () => {
  assert.equal(antes, 0, 'pack baixado no boot/construção do corpo');
  assert.equal(semPack, 0, 'dança procedural baixou o pack');
  assert.equal(pedidosPack(), 1, `pack pedido ${pedidosPack()}×`);
});

/* EMM3 — o clipe manda no corpo inteiro: pernas e quadril saem do idle e o quadril anda. */
step(capitao, 60); step(controle, 60);
const hipsA = posMundo(capitao, 'Hips');
step(capitao, 50); step(controle, 50);
const hipsB = posMundo(capitao, 'Hips');
check('EMM3-corpo-inteiro', () => {
  assert.equal(capitao.ctrl.curName, 'emote_capoeira');
  assert.ok(capitao.ctrl._emoteClipeAtivo && acao(capitao, 'capoeira').getEffectiveWeight() > 0.99);
  const perna = quat(capitao, 'LeftUpLeg').angleTo(quat(controle, 'LeftUpLeg'));
  const quadril = hipsA.distanceTo(hipsB);
  medidas.pernaRad = +perna.toFixed(3); medidas.quadrilAndouM = +quadril.toFixed(3);
  assert.ok(perna > 0.15, `perna ${perna.toFixed(3)} rad do idle`);
  assert.ok(quadril > 0.05, `quadril andou ${quadril.toFixed(3)} m`);
});

/* EMM4 — chão por corpo: em pé (continência) os pés ficam no chão do idle. */
const peIdle = {};
for (const id of ['capitao', 'gotinha']) { const c = body(id); step(c, 40); peIdle[id] = posMundo(c, 'LeftFoot').y; }
const capSaude = body('capitao');
capSaude.ctrl.emote('continencia'); await esperaClipe(capSaude);
step(capSaude, 60); step(gotinha, 60);
check('EMM4-chao-por-corpo', () => {
  for (const [id, b] of [['capitao', capSaude], ['gotinha', gotinha]]) {
    assert.equal(b.ctrl.curName, 'emote_continencia', `${id}: ${b.ctrl.curName}`);
    const d = posMundo(b, 'LeftFoot').y - peIdle[id];
    medidas[`pe_${id}_cm`] = +(d * 100).toFixed(1);
    assert.ok(Math.abs(d) < 0.05, `${id}: pé ${(d * 100).toFixed(1)} cm fora do chão do idle`);
  }
});

/* EMM12 — cápsula: na meia-lua (a referência viaja 0,97 m) o Hips não sai do raio do jogador,
   e o raio do runtime é o literal da colisão do jogador em game.js. */
const capsula = {};
for (const id of ['capitao', 'gotinha']) {
  const b = body(id); step(b, 30); b.ctrl.emote('meia_lua'); await esperaClipe(b);
  let max = 0;
  for (let i = 0; i < Math.ceil(E.emoteInfo('meia_lua').dur * 60); i++) {
    step(b, 1);
    const h = posMundo(b, 'Hips'); max = Math.max(max, Math.hypot(h.x - b.group.position.x, h.z - b.group.position.z));
  }
  capsula[id] = max;
}
check('EMM12-capsula', () => {
  const raioJogo = Number(/this\._collide\(p\.pos, ([\d.]+)\)/.exec(fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8'))?.[1]);
  assert.equal(G.EMOTE_CAPSULA_R, raioJogo, `raio do emote ${G.EMOTE_CAPSULA_R} × colisão do jogador ${raioJogo}`);
  for (const [id, m] of Object.entries(capsula)) {
    medidas[`capsula_${id}_m`] = +m.toFixed(3);
    assert.ok(m <= G.EMOTE_CAPSULA_R + 0.002, `${id}: Hips a ${m.toFixed(3)} m do eixo`);
  }
});

/* EMM13 — retarget por corpo: na continência a coluna (Hips→pescoço) fica onde estava no
   idle. Copiar a rotação local da referência (Hips dela a 30° em X) tombava o tronco. */
const tronco = (b) => posMundo(b, 'neck').sub(posMundo(b, 'Hips')).normalize();
const idleCap = body('capitao'); step(idleCap, 40);
check('EMM13-coluna-em-pe', () => {
  const ang = tronco(capSaude).angleTo(tronco(idleCap)) * 180 / Math.PI;
  medidas.colunaGraus = +ang.toFixed(1);
  assert.ok(ang < 12, `coluna ${ang.toFixed(1)}° fora do idle`);
});

/* EMM5 — a arma some durante o emote de clipe e volta depois. */
check('EMM5-arma-guardada', () => {
  // Corpos que só fizeram o emote de captura: nenhuma dança procedural antes guardou a arma.
  const nos = [...armas(capSaude), ...armas(gotinha)];
  assert.ok(nos.length > 0, 'corpo sem arma para guardar');
  assert.ok(nos.every((n) => !n.visible), 'arma visível durante o emote de captura');
});

/* EMM6 — parar, dano, morte e cerimônia tiram o corpo do clipe. */
capitao.ctrl.pararEmote(); step(capitao, 80);   // rampa de saída de 0,18 s até zerar
const aposParar = { cur: capitao.ctrl.curName, ativo: capitao.ctrl.emoteAtual(), armas: armas(capitao).every((n) => n.visible) };
const levaTiro = body('capitao'); levaTiro.ctrl.emote('uprock'); await esperaClipe(levaTiro); step(levaTiro, 20);
levaTiro.ctrl.flinch({ x: 0, z: 1 }, 0.4); step(levaTiro, 40);
const morre = body('capitao'); morre.ctrl.emote('marra'); await esperaClipe(morre); step(morre, 20);
morre.ctrl.die({ x: 0, z: 1 }); step(morre, 20);
check('EMM6-cancela', () => {
  assert.ok(aposParar.cur === 'idle' && aposParar.ativo === null, `parar: ${JSON.stringify(aposParar)}`);
  assert.ok(aposParar.armas, 'arma não voltou depois do emote');
  assert.ok(levaTiro.ctrl.curName !== 'emote_uprock' && levaTiro.ctrl.emoteAtual() === null, `dano: ${levaTiro.ctrl.curName}`);
  assert.ok(morre.ctrl.curName === 'death' && morre.ctrl.emoteAtual() === null, `morte: ${morre.ctrl.curName}`);
  assert.ok(acao(levaTiro, 'uprock').getEffectiveWeight() < 0.01, 'clipe do uprock ainda pesa no corpo');
});

/* EMM7 — laço segue até mandarem parar; uma vez (freeze) termina sozinho no fim. */
const laco = body('capitao'); laco.ctrl.emote('bencao'); await esperaClipe(laco);
step(laco, Math.ceil(E.emoteInfo('bencao').dur * 1.6 * 60));
const umaVez = body('capitao'); umaVez.ctrl.emote('freeze'); await esperaClipe(umaVez);
step(umaVez, Math.ceil(E.emoteInfo('freeze').dur * 0.5 * 60));
const meioFreeze = umaVez.ctrl.curName;
step(umaVez, Math.ceil((E.emoteInfo('freeze').dur * 0.5 + 0.4) * 60));
check('EMM7-laco-uma-vez', () => {
  assert.ok(laco.ctrl.emoteAtual() === 'bencao' && laco.ctrl.curName === 'emote_bencao', `laço: ${laco.ctrl.curName}`);
  assert.equal(acao(laco, 'bencao').loop, THREE.LoopRepeat);
  assert.equal(meioFreeze, 'emote_freeze');
  assert.ok(umaVez.ctrl.emoteAtual() === null && umaVez.ctrl.curName !== 'emote_freeze', `freeze: ${umaVez.ctrl.curName}`);
});

/* EMM8 — LOD≥2 não toca o clipe (reserva procedural no idle); de volta perto, retoma. */
const longe = body('capitao'); longe.ctrl.lod = 2; longe.ctrl.emote('meia_lua'); step(longe, 30);
const longeEstado = { cur: longe.ctrl.curName, ativo: longe.ctrl.emoteAtual(), dancando: longe.ctrl.emotando };
longe.ctrl.lod = 0; step(longe, 30);
check('EMM8-lod', () => {
  assert.ok(longeEstado.cur === 'idle' && longeEstado.ativo === 'meia_lua' && longeEstado.dancando, JSON.stringify(longeEstado));
  assert.equal(longe.ctrl.curName, 'emote_meia_lua');
  const a = acao(longe, 'meia_lua'); const d = Math.abs(a.time - (longe.ctrl._emoteT % a.getClip().duration));
  assert.ok(d < 0.05, `fase ${a.time.toFixed(3)} × ${longe.ctrl._emoteT.toFixed(3)}`);
});

/* EMM9 — rede (#1266): reaplicar o mesmo emote com fase próxima não reinicia o clipe;
   deriva grande ressincroniza. */
const remoto = body('capitao'); remoto.ctrl.emote('capoeira', 1.0); await esperaClipe(remoto); step(remoto, 30);
const tAntes = acao(remoto, 'capoeira').time, kAntes = remoto.ctrl._emoteK;
remoto.ctrl.emote('capoeira', remoto.ctrl._emoteT + 0.1);
const tMesmo = acao(remoto, 'capoeira').time;
remoto.ctrl.emote('capoeira', 3.0); step(remoto, 1);
check('EMM9-ressincronia', () => {
  assert.ok(Math.abs(tMesmo - tAntes) < 1e-6 && remoto.ctrl._emoteK >= kAntes, `reiniciou: ${tAntes} → ${tMesmo}`);
  assert.ok(Math.abs(acao(remoto, 'capoeira').time - (3.0 + 1 / 60)) < 0.02, `fase ${acao(remoto, 'capoeira').time}`);
});

/* EMM10 — pack ausente: o emote segue com a coreografia de reserva, sem exceção. */
if (!mutant) {
  const { G: M } = await carregaRuntime({ glbchars: (s) => once(s, "assetUrl('models/anims/emotes-mocap.glb')", "assetUrl('models/anims/emotes-ausente.glb')") });
  await M.preloadCharacterAssets(['capitao']);
  const m = body('capitao', 'ak', M), c = body('capitao', 'ak', M);
  step(m, 20); step(c, 20);
  m.ctrl.emote('capoeira');
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 10));
  step(m, 40); step(c, 40);
  check('EMM10-pack-ausente', () => {
    assert.ok(!m.ctrl._emoteClipeAtivo && m.ctrl.emoteAtual() === 'capoeira');
    const ang = quat(m, 'LeftArm').angleTo(quat(c, 'LeftArm')) + quat(m, 'RightArm').angleTo(quat(c, 'RightArm'));
    assert.ok(ang > 0.1, `reserva parada: ${ang.toFixed(3)} rad`);
  });
}

/* EMM11 — o descriptor real e compartilhado entrega o clipe exato, e partida/lobby
   instalam esse mesmo objeto em vez de reconstruírem versões divergentes. */
const gameSource = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const mainReal = fs.readFileSync(path.join(root, 'public/js/main.js'), 'utf8');
const mainSource = mutant === 'lobby-sem-clipe'
  ? once(mainReal, 'setEmoteDriver(m.EMOTE_DRIVER);', 'setEmoteDriver({ pose: m.poseEmote, duracao: m.emoteDuracao, laco: m.emoteLaco });')
  : mainReal;
check('EMM11-callsites', () => {
  const esperado = E.emoteInfo('capoeira');
  assert.equal(E.EMOTE_DRIVER.clipe('capoeira'), esperado, 'driver não devolveu o registro exato do clipe');
  assert.deepEqual(Object.keys(E.EMOTE_DRIVER).sort(), ['clipe', 'duracao', 'laco', 'pose']);
  assert.ok(gameSource.includes('setEmoteDriver(mod.EMOTE_DRIVER);'), 'partida não instala o descriptor real');
  assert.ok(mainSource.includes('setEmoteDriver(m.EMOTE_DRIVER);'), 'lobby não instala o descriptor real');
  assert.ok(gameSource.includes('this._emoteAnel(e.shiftKey)'));
  assert.ok(!/import[^;]*emotes\.js/.test(fs.readFileSync(path.join(root, 'public/js/glbchars.js'), 'utf8')), 'glbchars importou emotes.js');
});

const failures = results.filter((x) => !x.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FALHA'} ${r.id}${r.erro ? ` · ${r.erro}` : ''}`);
console.log(`medidas ${JSON.stringify(medidas)}`);
if (mutant) {
  assert.ok(failures.length > 0, `MUTAÇÃO PASSOU — ${mutant}`);
  const ESPERADO = { 'emote-mocap-mudo': ['EMM3', 'EMM4', 'EMM7', 'EMM9'], 'arma-visivel-no-emote': ['EMM5'], 'emote-nao-cancela': ['EMM6'], 'id-renumerado': ['EMM0-'],
    'quadril-fora-da-capsula': ['EMM12'], 'rotacao-local': ['EMM13'], 'lobby-sem-clipe': ['EMM11'], 'travessao-no-titulo': ['EMM0c'] };
  for (const id of ESPERADO[mutant]) assert.ok(failures.some((x) => x.id.startsWith(id)), `${mutant} não reprovou ${id}: ${failures.map((x) => x.id).join(', ')}`);
  console.log(`MUTANTE ${mutant} REPROVADO: ${failures.map((x) => x.id).join(', ')}`);
} else {
  assert.equal(failures.length, 0, `${failures.length} cláusulas vermelhas`);
  console.log(`EMOTES-MOCAP VERDE: ${results.length} cláusulas; pack ${packBytes} bytes, corpo inteiro, arma guardada, cancelamento e ids acrescentados`);
}
process.exit(0);
