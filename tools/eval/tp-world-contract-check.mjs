#!/usr/bin/env node
/* Unidades mundiais do IK e proxy final de cabeça.
   Contratos, mutantes e exits: docs/visual-consistency/TP-WORLD.md. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const VALID = ['palma-local', 'sync-antecipado', 'sync-mudo', 'sync-alternado', 'nan-primeiro', 'nan-sempre'];
let MUT = '';
if (args.length > 1 || args.filter((a) => a.startsWith('--mutante=')).length > 1) {
  console.error('argumento inválido: use no máximo uma opção --mutante=<variante>'); process.exit(2);
}
if (args.length === 1) {
  const v = args[0].slice('--mutante='.length);
  if (!args[0].startsWith('--mutante=') || !VALID.includes(v)) {
    console.error(`mutante desconhecido ou malformado: ${args[0]} (válido: ${VALID.join(', ')})`); process.exit(2);
  }
  MUT = v;
}

const localFetch = async (url) => {
  const file = path.resolve('public', String(url).split('?')[0]);
  if (!fs.existsSync(file)) return new Response('', { status: 404 });
  return new Response(fs.readFileSync(file));
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
let THREE, CHARACTERS, GLTFLoader;
try {
  ({ THREE, CHARACTERS } = await import('./harness.mjs'));
  ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));
} catch (e) { console.error(`infra na preparação do harness: ${e.message}`); process.exit(3); }
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  const file = path.resolve('public', url.split('?')[0]);
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'EXT_texture_webp',
    async loadTexture() {
      const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      t.needsUpdate = true;
      return t;
    },
  }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(file);
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch((e) => fail?.(e));
};

/* ── fonte do produto (mutável em tmp, sem tocar o disco do produto) ─────── */
const ROOT = path.resolve('.');
let srcHandik, srcGlb;
try {
  srcHandik = fs.readFileSync(path.join(ROOT, 'public/js/handik.js'), 'utf8');
  srcGlb = fs.readFileSync(path.join(ROOT, 'public/js/glbchars.js'), 'utf8');
} catch (e) { console.error(`infra na leitura dos fontes: ${e.message}`); process.exit(3); }
const TMP = [];
function tmpMod(nome, base, trocas) {
  let t = base;
  for (const [antes, depois] of trocas) {
    if (!t.includes(antes)) throw new Error(`mutação não aplicou: trecho ausente (${antes.slice(0, 60)}…)`);
    t = t.split(antes).join(depois);
  }
  const p = path.join(ROOT, `public/js/.tp-world-tmp-${nome}.mjs`);
  fs.writeFileSync(p, t);
  TMP.push(p);
  return p;
}
process.on('exit', () => { for (const p of TMP) try { fs.unlinkSync(p); } catch { /* já foi */ } });

const NOVO_PALMA = `    if (endOffset) {
      // palma em MUNDO (escala do rig entra na conta): rigs cm+scale .01 tinham a parcela local ~100× maior
      _off.copy(endOffset); end.localToWorld(_off);
      alcance += _off.distanceTo(_pe);   // _pe ainda carrega a origem mundial de \`end\`
    }`;
const VELHO_PALMA = `    if (endOffset) alcance += endOffset.length();`;
const SYNC_FINAL = `    /* Hitbox da cabeça sincronizada por ÚLTIMO: overlays de tronco/emote/recarga/morte
       mexem em ancestrais do Head DEPOIS do ponto onde ela era copiada (crítico 31/10, docs/visual-consistency/TP-WORLD.md). */
    if (this.headBone) {
      this.group.updateMatrixWorld(true);
      this.head.position.copy(this.group.worldToLocal(this.headBone.getWorldPosition(_v)));
    }`;
const SYNC_ALTERNADO = `    /* Hitbox da cabeça sincronizada por ÚLTIMO: overlays de tronco/emote/recarga/morte
       mexem em ancestrais do Head DEPOIS do ponto onde ela era copiada (crítico 31/10, docs/visual-consistency/TP-WORLD.md). */
    if (this.headBone && ((this._proxyTick = (this._proxyTick || 0) + 1) % 2 === 0)) {
      this.group.updateMatrixWorld(true);
      this.head.position.copy(this.group.worldToLocal(this.headBone.getWorldPosition(_v)));
    }`;
const SYNC_NAN_1 = `    if (this.headBone) {
      this.group.updateMatrixWorld(true);
      this.head.position.copy(this.group.worldToLocal(this.headBone.getWorldPosition(_v)));
      // NaN transitório: um único frame após o warm-up do build (10 updates ~0.33s)
      this._tpAge = (this._tpAge || 0) + dt;
      if (!this._tpNanOnce && this._tpAge > 0.4) { this._tpNanOnce = 1; this.head.position.x = NaN; }
    }`;
const SYNC_NAN_ALL = `    if (this.headBone) {
      this.head.position.copy(this.group.worldToLocal(this.headBone.getWorldPosition(_v)));
      this.head.position.x = NaN;
    }`;
const SYNC_ANTIGO = `    if (this.headBone) {
      this.group.updateMatrixWorld(true);
      this.head.position.copy(this.group.worldToLocal(this.headBone.getWorldPosition(_v)));
    }
    // Sombra de contato: reage ao estado do corpo. No pulo ela ABRE e desbota (penumbra`;
const ANCORA_SOMBRA = '    // Sombra de contato: reage ao estado do corpo. No pulo ela ABRE e desbota (penumbra';

function caminhosDaVariante(mut) {
  let handikPath = path.join(ROOT, 'public/js/handik.js');
  let glbPath = path.join(ROOT, 'public/js/glbchars.js');
  if (mut === 'palma-local') handikPath = tmpMod('handik', srcHandik, [[NOVO_PALMA, VELHO_PALMA]]);
  if (mut === 'sync-antecipado') glbPath = tmpMod('glbchars', srcGlb, [[SYNC_FINAL, ''], [ANCORA_SOMBRA, SYNC_ANTIGO]]);
  if (mut === 'sync-mudo') glbPath = tmpMod('glbchars', srcGlb, [[SYNC_FINAL, '']]);
  if (mut === 'sync-alternado') glbPath = tmpMod('glbchars', srcGlb, [[SYNC_FINAL, SYNC_ALTERNADO]]);
  if (mut === 'nan-primeiro') glbPath = tmpMod('glbchars', srcGlb, [[SYNC_FINAL, SYNC_NAN_1]]);
  if (mut === 'nan-sempre') glbPath = tmpMod('glbchars', srcGlb, [[SYNC_FINAL, SYNC_NAN_ALL]]);
  return { handikPath, glbPath };
}

/* ── rodar uma variante (nominal usa os fontes reais) ────────────────────── */
async function rodarVariante(mut) {
  const clausulas = []; // {id, ok, motivo}
  const chk = (id, ok, motivo) => clausulas.push({ id, ok, motivo: ok ? '' : motivo });
  const { handikPath, glbPath } = caminhosDaVariante(mut);
  const { solveCCDIK } = await import(pathToFileURL(handikPath).href);
  const G = await import(pathToFileURL(glbPath).href);
  const em = await import(path.join(ROOT, 'public/js/emotes.js'));
  G.setEmoteDriver({ pose: em.poseEmote, duracao: em.emoteDuracao, laco: em.emoteLaco });

  /* ── WP1: A em metros/yaw 0; B = MESMA cena ×100 com scale .01 e yaw .7 ── */
  const YAW = 0.7, UP = new THREE.Vector3(0, 1, 0);
  function rigBraço(unidades, yaw) {
    const k = unidades;
    const wrap = new THREE.Group();
    wrap.rotation.y = yaw; wrap.scale.setScalar(1 / k);
    const shoulder = new THREE.Bone(); shoulder.position.set(0, 1.5 * k, 0);
    const fore = new THREE.Bone(); fore.position.set(0.30 * k, 0, 0);
    const hand = new THREE.Bone(); hand.position.set(0.28 * k, 0, 0);
    shoulder.add(fore); fore.add(hand); wrap.add(shoulder);
    const palmOffset = new THREE.Vector3(0.02 * k, 0.10 * k, 0);
    return { wrap, shoulder, fore, hand, palmOffset };
  }
  try {
    const A = rigBraço(1, 0), B = rigBraço(100, YAW);
    for (const rig of [A, B]) rig.wrap.updateMatrixWorld(true);
    const pa = A.hand.localToWorld(A.palmOffset.clone()); A.wrap.updateMatrixWorld(true);
    const pa2 = A.hand.localToWorld(A.palmOffset.clone());
    const pb = B.hand.localToWorld(B.palmOffset.clone()); B.wrap.updateMatrixWorld(true);
    const pb2 = B.hand.localToWorld(B.palmOffset.clone());
    void pa; void pb;
    chk('WP1p premissa rotação+escala', pa2.distanceTo(pb2.clone().applyAxisAngle(UP, -YAW)) < 1e-6,
      `palma inicial A ${pa2.toArray().map((n) => n.toFixed(4))} vs B derrotada ${pb2.clone().applyAxisAngle(UP, -YAW).toArray().map((n) => n.toFixed(4))} m (tol 1e-6) — rigs não são a mesma cena girada`);
    const alvoA = new THREE.Vector3(1.2, 1.6, -0.3);               // além do braço (~0.68 m+palm)
    const alvoB = alvoA.clone().applyAxisAngle(UP, YAW);
    const tA = alvoA.clone(), tB = alvoB.clone();
    const rA = solveCCDIK([A.shoulder, A.fore], A.hand, tA, { iterations: 20, endOffset: A.palmOffset });
    const rB = solveCCDIK([B.shoulder, B.fore], B.hand, tB, { iterations: 20, endOffset: B.palmOffset });
    chk('WP1a decisão de clamp igual', !!rA === !!rB, `metros ${rA ? 'clamp' : 'livre'} vs cm+scale ${rB ? 'clamp' : 'livre'}`);
    if (rA && rB) chk('WP1b raio em mundo igual', Math.abs(rA.alcance - rB.alcance) < 1e-3,
      `alcance metros ${rA.alcance.toFixed(4)} vs cm+scale.01 ${rB.alcance.toFixed(4)} (tol 1e-3 m)`);
    const efA = A.hand.localToWorld(A.palmOffset.clone()); A.wrap.updateMatrixWorld(true);
    const efA2 = A.hand.localToWorld(A.palmOffset.clone());
    const efB = B.hand.localToWorld(B.palmOffset.clone()); B.wrap.updateMatrixWorld(true);
    const efB2 = B.hand.localToWorld(B.palmOffset.clone());
    const inv = efB2.clone().applyAxisAngle(UP, -YAW);
    void efA; void efB;
    chk('WP1c efetor final equivalente', efA2.distanceTo(inv) < 5e-3,
      `efetor metros ${efA2.toArray().map((n) => n.toFixed(3))} vs cm+scale.01 (derrotado) ${inv.toArray().map((n) => n.toFixed(3))} (tol 5e-3 m)`);
    chk('WPx alvo preservado', tA.equals(alvoA) && tB.equals(alvoB), 'solver mutou o vetor-alvo do caller');
    const livre = new THREE.Vector3(0.25, 1.55, 0.1);
    const rA2 = solveCCDIK([A.shoulder, A.fore], A.hand, livre.clone(), { iterations: 20, endOffset: A.palmOffset });
    chk('WP1d alvo alcançável não recortado', rA2 === null, `alvo dentro do braço foi recortado: ${JSON.stringify(rA2)}`);
  } catch (e) {
    clausulas.push({ id: 'WP1/ERRO', ok: false, motivo: `infra: ${e.message}` });
  }

  /* ── WP2: raio plausível em rigs REAIS (mandrake 2H, pagodeiro 1H) ────── */
  const CENARIO = [['mandrake', 'ak'], ['pagodeiro', 'deagle']];
  try {
    await G.preloadCharacterAssets(CENARIO.map(([id]) => id), { weapons: CENARIO.map(([, w]) => w) });
    for (const [id, arma] of CENARIO) {
      if (!G.hasModel(id)) { clausulas.push({ id: `WP2/${id}/ERRO`, ok: false, motivo: 'infra: GLB ausente' }); continue; }
      const char = G.buildCharacterModel(CHARACTERS.find((c) => c.id === id), { weaponId: arma });
      for (let f = 0; f < 30; f++) char.ctrl.update(1 / 60, 0, false, 0);
      char.group.updateMatrixWorld(true);
      const t = char.ctrl.tpMount;
      const chain = char.ctrl.ikL ? [char.ctrl.ikL.chain[0], char.ctrl.ikL.chain[1]] : [t.rArm, t.rFore];
      const end = char.ctrl.ikL ? char.ctrl.ikL.end : t.handBone;
      const endOffset = char.ctrl.ikL ? char.ctrl.ikL.endOffset : t.palmLocal;
      const ombro = chain[0].getWorldPosition(new THREE.Vector3());
      const braco = chain[1].getWorldPosition(new THREE.Vector3()).sub(ombro).length()
        + end.getWorldPosition(new THREE.Vector3()).sub(chain[1].getWorldPosition(new THREE.Vector3())).length();
      const alvo = ombro.clone().add(new THREE.Vector3(0.9, 0.4, -0.9).normalize().multiplyScalar(braco * 3));
      const r = solveCCDIK(chain, end, alvo.clone(), { iterations: 8, endOffset });
      chk(`WP2 ${id} raio na casa do braço`,
        !!r && r.alcance > 0.2 && r.alcance < 2.0,
        `alcance retornado ${r ? r.alcance.toFixed(3) : 'null'} m; braço real mede ~${braco.toFixed(3)} m (faixa 0.2–2.0 m; fonte antigo infla ~100× pela palma local)`);
    }
  } catch (e) {
    clausulas.push({ id: 'WP2/ERRO', ok: false, motivo: `infra: ${e.message}` });
  }

  /* ── PS1: proxy == Head FINAL em CADA update exercitado, por estado ───── */
  try {
    if (!G.hasModel('mandrake')) throw new Error('GLB mandrake ausente');
    const erroProxy = (ctrl, group) => {
      group.updateMatrixWorld(true);
      const proxy = group.localToWorld(ctrl.head.position.clone());
      return proxy.distanceTo(ctrl.headBone.getWorldPosition(new THREE.Vector3()));
    };
    const estados = {
      idle: (c) => { for (let f = 0; f < 30; f++) { c.update(1 / 60, 0, false, 0); mede(c); } },
      locomotion: (c) => { for (let f = 0; f < 60; f++) { c.update(1 / 60, 1, true, 3.0); mede(c); } },
      reload: (c) => { c.reload(1.2); let fase = false; for (let f = 0; f < 40; f++) { c.update(1 / 60, 0, false, 0); if (c.reloadK > 0.5) fase = true; mede(c); } if (!fase) throw new Error('reloadK nunca passou de 0.5'); },
      emote: (c) => { if (!c.emote('passinho')) throw new Error('emote recusado'); let fase = false; for (let f = 0; f < 40; f++) { c.update(1 / 60, 0, false, 0); if (c._emoteK > 0.5) fase = true; mede(c); } if (!fase) throw new Error('_emoteK nunca passou de 0.5'); },
      death: (c) => { c.die(new THREE.Vector3(1, 0, 0.5)); let fase = false; for (let f = 0; f < 60; f++) { c.update(1 / 60, 0, false, 0); if ((c._deathK || 0) > 0.3) fase = true; mede(c); } if (!fase) throw new Error('_deathK nunca passou de 0.3'); },
    };
    function mede(c) {
      const e = erroProxy(c, c.group);
      if (!Number.isFinite(e)) { c._tpWorldNaoFinito = (c._tpWorldNaoFinito || 0) + 1; return; }
      if (e > c._tpWorldMaxErro) c._tpWorldMaxErro = e;
    }
    for (const [nome, roda] of Object.entries(estados)) {
      const char = G.buildCharacterModel(CHARACTERS.find((c) => c.id === 'mandrake'), { weaponId: 'ak' });
      char.ctrl._tpWorldMaxErro = 0;
      char.ctrl._tpWorldNaoFinito = 0;
      roda(char.ctrl);
      mede(char.ctrl); // inclui o último frame
      const max = char.ctrl._tpWorldMaxErro, naoFinito = char.ctrl._tpWorldNaoFinito;
      chk(`PS1 proxy==Head final [${nome}]`, naoFinito === 0 && max < 1e-4,
        naoFinito > 0 ? `${naoFinito} frame(s) com posição não finita do proxy em ${nome} — estado inválido, não erro zero`
          : `desvio máximo por update ${max.toFixed(4)} m em todos os frames do estado (tol 1e-4)`);
    }
  } catch (e) {
    clausulas.push({ id: 'PS1/ERRO', ok: false, motivo: `infra: ${e.message}` });
  }

  return clausulas;
}

function classificar(clausulas) {
  const ERRO = clausulas.filter((c) => c.id.includes('/ERRO') || c.motivo.startsWith('infra'));
  const VERM = clausulas.filter((c) => !c.ok && !ERRO.includes(c));
  return { ERRO, VERM };
}

/* conjunto EXATO de cláusulas vermelhas esperado por variante */
const EXPECTADO = {
  'nan-primeiro': ['PS1 proxy==Head final [idle]', 'PS1 proxy==Head final [locomotion]', 'PS1 proxy==Head final [reload]', 'PS1 proxy==Head final [emote]', 'PS1 proxy==Head final [death]'],
  'nan-sempre': ['PS1 proxy==Head final [idle]', 'PS1 proxy==Head final [locomotion]', 'PS1 proxy==Head final [reload]', 'PS1 proxy==Head final [emote]', 'PS1 proxy==Head final [death]'],
  'palma-local': ['WP1a decisão de clamp igual', 'WP2 mandrake raio na casa do braço', 'WP2 pagodeiro raio na casa do braço'],
  'sync-antecipado': ['PS1 proxy==Head final [reload]', 'PS1 proxy==Head final [emote]', 'PS1 proxy==Head final [death]'],
  'sync-mudo': ['PS1 proxy==Head final [idle]', 'PS1 proxy==Head final [locomotion]', 'PS1 proxy==Head final [reload]', 'PS1 proxy==Head final [emote]', 'PS1 proxy==Head final [death]'],
  'sync-alternado': ['PS1 proxy==Head final [idle]', 'PS1 proxy==Head final [locomotion]', 'PS1 proxy==Head final [reload]', 'PS1 proxy==Head final [emote]', 'PS1 proxy==Head final [death]'],
};

const imprimirs = (rotulo, clausulas) => {
  console.log(`=== TP-WORLD · ${rotulo} ===`);
  for (const c of clausulas) console.log(`${c.ok ? '✓' : '✗'} ${c.id}${c.ok ? '' : ` — ${c.motivo}`}`);
};

/* nominal REAL primeiro, MESMA aceitação — vermelho ou infra aqui reprova tudo */
try {
const nominal = await rodarVariante('');
const { ERRO: ERRO_N, VERM: VERM_N } = classificar(nominal);
imprimirs('nominal', nominal);
if (ERRO_N.length) { console.error(`infra no nominal (${ERRO_N.length}) — NÃO conta como detectado`); process.exit(3); }
if (VERM_N.length) { console.error(`nominal reprovado em ${VERM_N.length} cláusula(s) antes de qualquer mutante`); process.exit(1); }
if (!MUT) { console.log(`✓ TP-WORLD: ${nominal.length} cláusulas verdes.`); process.exit(0); }

const mutante = await rodarVariante(MUT);
const { ERRO: ERRO_M, VERM: VERM_M } = classificar(mutante);
imprimirs(`mutante ${MUT}`, mutante);
if (ERRO_M.length) { console.error(`infra no mutante (${ERRO_M.length}) — NÃO conta como detectado`); process.exit(3); }
const obtido = VERM_M.map((c) => c.id).sort();
const esperado = [...EXPECTADO[MUT]].sort();
const faltando = esperado.filter((id) => !obtido.includes(id));
const aMais = obtido.filter((id) => !esperado.includes(id));
if (faltando.length || aMais.length || obtido.length !== esperado.length) {
  console.error(`mutante ${MUT} fora do conjunto exato — faltando: [${faltando.join('; ')}] · inesperado: [${aMais.join('; ')}]`);
  process.exit(1);
}
console.log(`✓ mutante ${MUT} pego no conjunto exato: ${obtido.length} cláusula(s)`);
process.exit(0);
} catch (e) {
  console.error(`infra na execução (${e.message}) — NÃO conta como detectado`);
  process.exit(3);
}
