// Real rigged GLB characters (Mint-generated) with shared animation clips.
//
// Meshy delivers a rigged base mesh per character plus one GLB per animation clip.
// All characters share the same humanoid rig, so the 5 clips (idle/walk/run/shoot/
// death) are loaded ONCE and re-bound by bone name onto every character's skeleton.
// Base meshes are ~270KB (texture downscaled to 512/webp); clips ~30-70KB each.
//
// Only bots use these models (the player is first-person). Characters without a GLB
// fall back to the procedural box meshes in characters.js.
//
// Kill-switches de clareza (todos em characters.js, valem p/ GLB e procedural):
//   ?charfx=0     desliga TODA a injeção de shader (volta ao material cru)
//   ?charclamp=0  desliga só o clamp de ambiente + o piso/ganho de albedo
//   ?rim=0        desliga só o rim/fresnel por time
//   ?cshadow=0    desliga a sombra de contato   |  ?charrecv=0  o char não recebe sombra
//   tuning ao vivo: ?charfloor= ?charfloorfar= ?charceil= ?charsat= ?rimnear= ?rimfar=
import * as THREE from 'three';
import { VERSION } from './version.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { buildRifle, CHAR_FX, charRimColor, upgradeCharMaterial, makeContactShadow } from './characters.js';
import { weaponModel, preloadWeapons, ONE_HANDED, gripPoints } from './weapons.js';
import { solveCCDIK } from './handik.js';

// Character ids that have a real model under public/models/characters/<id>.glb.
export const GLB_CHARS = new Set([
  'esquerdomacho', 'sindicato', 'mst', 'doutora', 'mistico',
  'caminhoneiro', 'sertanejo', 'coach',
  'gotinha', 'farialimer',
  'bombado', 'hipster', 'dollynho', 'et', 'ancap',
  'musculoso',
  'bonzo', 'canarinho', 'proerd',
  // Palhaços (4ª facção). bonzo (ex-bozo) veio da Mint; os 8 abaixo foram rigados offline
  // (tools/rig-from-donor.mjs: esqueleto do mst transplantado + auto-skin por proximidade),
  // então usam os clips compartilhados por nome de osso, sem retarget por char.
  'palhacomal', 'jozo', 'adjim', 'esbirro', 'titica', 'padati', 'padata', 'cadequinha',
  // Tribos Urbanas (3º grupo, GLB Mint riggado).
  'emo', 'blackmetal', 'metaleiro', 'punk', 'skatista', 'clubber', 'rapper', 'reggae', 'pagodeiro',
  // Funkeiros (5ª facção). mandrake = o antigo funkeiro.glb renomeado (com clips próprios);
  // os outros 8 são GLBs Mint riggados offline (tools/rig-from-donor.mjs, esqueleto do mst)
  // com clips retargetados em models/anims/<id>/ (tools/retarget-glb.mjs).
  'mandrake', 'raul', 'oakley', 'criarj', 'chave', 'funkraiz', 'trapfunk', 'fluxo', 'ostentacao',
]);

const CHAR_MODEL_SOURCE = Object.freeze({ musculoso: 'bombado' });
const CHAR_GRIP_REFERENCE = Object.freeze({ musculoso: 'doutora' });

// Mascotes de braços-toco: a mão de apoio via IK vira uma mão gigante flutuando
// (caso do Dollynho na tela de seleção). Neles, a mão L segue a pose do clipe.
// Exportado para a select-mount.mjs: nesses, MÃO-L não se aplica (é decisão, não defeito).
export const IK_L_SKIP = new Set(['dollynho', 'gotinha', 'et', 'canarinho']);

const STATES = ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump'];
// Clipes OPCIONAIS: 1 mão (pistolas) + andando atirando. Se o arquivo não existir,
// o load falha em silêncio e cai no comportamento padrão (idle/walk/shoot de 2 mãos).
const OPT_STATES = ['idle1h', 'walk1h', 'walkfire'];
const qp = new URLSearchParams(location.search);
/* CORREÇÃO DE PÉ NO CHÃO, POR CLIPE (invariante CHR3) — tabela GERADA por
   `npm run feet` a partir da medição do char-probe. Ver tools/gen-foot-offsets.mjs.

   Por que por CLIPE e não por personagem: o probe mede `bind = 0.000` nos 44 — o rig está
   certo. Quem tira o pé do chão é o clipe (walk ≈ -2,8 cm, crouch ≈ -1,7 cm…), e 38 dos 44
   compartilham os mesmos clipes, logo os mesmos desvios.

   Carrega assíncrono e falha em silêncio: sem a tabela o jogo fica exatamente como estava
   (offset 0), nunca quebra. `?feet=0` desliga pra comparar lado a lado. */
let _footOff = null;
if (qp.get('feet') !== '0') {
  fetch(`models/anims/foot-offsets.json?v=${VERSION}`)
    .then(r => (r.ok ? r.json() : null))
    .then(j => { _footOff = (j && j.offsets) || null; })
    .catch(() => {});
}
export function footOffset(id, pose) { return (_footOff && _footOff[id] && _footOff[id][pose]) || 0; }

/* ÍNDICE DE CLIPES POR PERSONAGEM (models/anims/index.json, gerado por `npm run anims`).
   MEDIDO: sem ele o preload pedia os 11 clipes de TODO personagem, e 8 dos 44 (os 8
   palhaços) nunca tiveram pasta — **88 requisições 404 por carregamento de partida**.
   O `catch` vazio abaixo engolia tudo, então o jogo funcionava e o console mentia: com
   88 erros por partida, qualquer exceção de verdade ficava enterrada, e foi assim que o
   dono viu "vários erros no console" enquanto caçávamos um reinício.
   Página estática não lista diretório: quem sabe o que existe é o build (mesmo desenho
   do `audio/manifest.json` e do `foot-offsets.json`).
   Falha do fetch = `null` = comportamento antigo (pede tudo). Nunca quebra. */
let _animIdxP = null;
function animIndex() {
  if (!_animIdxP) {
    _animIdxP = fetch(`models/anims/index.json?v=${VERSION}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return _animIdxP;
}

const ANIM_DIR = qp.get('animdir') || 'models/anims/mixamo';   // pack Mixamo rifle (retarget próprio, tools/retarget-mixamo.mjs) — padrão desde 22/07; override via ?animdir=
const TARGET_HEIGHT = parseFloat(qp.get('charh')) || 1.72;      // meters (match box silhouette)
// Per-clip natural ground speed (m/s) that plants the feet at timeScale 1, MEASURED from
// each clip's real foot stride (tools: iktest HARNESS.measureStride / tools/eval/mixamo-measure.mjs).
const WALK_REF   = parseFloat(qp.get('wref')) || 0.84;
const RUN_REF    = parseFloat(qp.get('rref')) || 2.08;
const CROUCH_REF = parseFloat(qp.get('cref')) || 0.75;
const FACING_OFFSET = (parseFloat(qp.get('charface')) || 0) * Math.PI / 180; // yaw fix if model faces -Z
// FASE 3: clamp de segurança da correção de pitch da cabeça (malha fechada, ~28°).
// (O antigo HEAD_UP fixo foi removido: ele acumulava rotação quando o mixer não
// escrevia o osso — a correção agora é sempre em malha fechada, ver update().)
const AIM_CORR_CLAMP = 0.5;

// Rifle mounted in the right hand (bone-local meters via a scale-compensated mount).
// Tunable live with ?gunpos=x,y,z ?gunrot=xdeg,ydeg,zdeg ?guns=scale.
const _num3 = (s, d) => { const p = (s || '').split(',').map(Number); return p.length === 3 && p.every((n) => !isNaN(n)) ? p : d; };
// z era 0,10: o grip (origem do weaponModel) nascia 10 cm À FRENTE do centro da palma —
// era o revólver "na ponta dos dedos" do bonzo/cadequinha e a arma apoiada na palma aberta
// em vez de dentro dela (reprovação de 05/08). 0,04 deixa o grip DENTRO da mão com os
// dedos por cima do corpo da arma. A/B por figura: scratchpad sel_now × sel_fix (05/08).
const GUN_POS = _num3(qp.get('gunpos'), [0.02, 0.02, 0.04]);
const GUN_ROT = _num3(qp.get('gunrot'), [90, 0, 0]).map((d) => d * Math.PI / 180);
const GUN_SCALE = parseFloat(qp.get('guns')) || 1.0;
// Armas que precisam de +180° só na 3ª pessoa (mount). VAZIO desde 04/08: o flip da p90
// era da época de outro GLB; o modelo atual já nasce com o cano em +Z e o flip a deixava
// de coronha pra frente (visto pelo dono na tela de seleção; A/B por figura no scratchpad
// v2-padata.png × v2-padata-semflip.png). Mutação que prova: readicionar 'p90' aqui
// reproduz a inversão na hora.
const TP_FLIP_Y = new Set([]);

// ── MOUNT V2 (rodada de CONSISTÊNCIA) ───────────────────────────────────────
// O mount antigo tirava a direção do cano da linha ANTEBRAÇO->MÃO. Medido rig a rig
// (tools/eval/tp-mount-probe.mjs) esse vetor dá, no clipe de idle:
//   • pitch entre -21° e -35° em TODOS os 27 personagens  -> toda arma apontada pro chão
//   • yaw de 63° no coach                                  -> a "arma pra trás" que o dono viu
// Ou seja: o defeito não era de um personagem, era do método. A direção do cano agora
// vem do CORPO (frente do personagem), que é o que CS 1.6/ev.io/VALORANT fazem: em 3ª
// pessoa a arma aponta pra onde o boneco olha, ponto. Só o ângulo de porte (leve
// inclinação) é constante, e ele é o mesmo pra todo mundo — consistência antes de tudo.
// Kill-switch: ?tpmount=0 volta ao algoritmo antigo (linha do antebraço).
const TP_MOUNT_V2 = qp.get('tpmount') !== '0';
// ?tpmountlive=0 -> mount volta a ser resolvido só uma vez, na pose de idle (ver o bloco
// longo em buildCharacterModel). Existe pra permitir A/B do defeito, não pra uso normal.
const TP_MOUNT_LIVE = qp.get('tpmountlive') !== '0';
const _tpc = (qp.get('tpcarry') || '').split(',').map(Number);
const TP_CARRY_PITCH = ((_tpc.length === 2 && !isNaN(_tpc[0]) ? _tpc[0] : -6)) * Math.PI / 180;  // cano levemente pro chão (porte)
const TP_CARRY_YAW = ((_tpc.length === 2 && !isNaN(_tpc[1]) ? _tpc[1] : 4)) * Math.PI / 180;     // levemente cruzando o corpo
const TP_CLEAR = parseFloat(qp.get('tpclear')) || 0.06;   // folga mínima entre o grip e a superfície do corpo (m)
// O empurrão só entra quando a palma está ENTERRADA de verdade. Medido: humano típico
// tem a palma 3-10 cm dentro do volume do quadril na pose de idle (braço encostado no
// corpo) e mesmo assim a arma lê bem; o Dollynho está 25 cm dentro da garrafa e o Ancap
// 12 cm dentro da túnica. A tolerância abaixo separa os dois casos. Teto baixo de
// propósito: arma longe da mão é mão solta (C7), que é pior que um encosto na roupa.
const TP_BURIED_TOL = 0.10;
const TP_CLEAR_MAX = 0.20;
/* CLAMP DE FRENTE (04-05/08, BUG do dono: "arma por trás do corpo" — jozo, trapfunk,
   coach). O clipe assentado da seleção deixa a mão direita de alguns rigs ATRÁS do plano
   do corpo (select-mount.mjs: coach frenteZ -0,052 m, esbirro -0,065) e a arma, que é
   filha do osso da mão, vai junto. Nenhum porte real carrega arma atrás do quadril.
   Correção por-quadro (a de build não segura: a mão MUDA de lugar quando o idle assenta):
   a âncora da palma é reprojetada no espaço do modelo e o Z é clampado a um mínimo à
   frente. Procedência do 0,15: pior elogiado da select-mount (mandrake 0,187) ÷ 1,25.
   Kill-switch ?tpfz=0; valor tunável ?tpfz=0.2. */
const TP_FRONT_MIN = qp.get('tpfz') === '0' ? -Infinity : (parseFloat(qp.get('tpfz')) || 0.15);
// Guarda de palma (ver measurePalmLocal): teto de alavanca do mount, em antebraços.
const PALM_GUARD = qp.get('palmguard') !== '0';
const PALM_MAX_LEVER = parseFloat(qp.get('palmlever')) || 0.9;

const loader = new GLTFLoader();
const loadGLB = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

let _clips = null;                 // { idle: AnimationClip, ... } shared fallback
const _clipsByChar = {};           // id -> per-character retargeted clip set (fallback to _clips)
const _base = new Map();           // id -> THREE.Object3D template scene

export function hasModel(id) { return _base.has(id); }
// Acesso ao template já carregado (fparms.js clona daqui p/ os braços de 1ª pessoa)
// e aos clipes compartilhados (pose base congelada). Pré-requisito: preloadCharacterAssets.
export function getCharTemplate(id) { return _base.get(id); }
export function getSharedClips() { return _clips; }

// Mede o centro REAL da palma no espaço local do osso Hand: média (em BIND pose) dos
// verts da malha com peso dominante (>0.5) no osso Hand ou no seu filho Curl (os dedos
// são skinned nos ossos Curl). Rígido por construção (independe da pose) e adaptado a
// cada personagem — sem isso o IK crava o PULSO no grip e a palma visível flutua
// centímetros fora da arma. Compartilhado por fparms.js (1ª pessoa) e pelo IK de 3ª
// pessoa (mão de apoio dos bots). Fallback: fração do antebraço ao longo de +Y.
export function measurePalmLocal(model, hand, curl) {
  const fallback = new THREE.Vector3(0, hand.position.length() * 0.25, 0);
  let sk = null;
  model.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; });
  if (!sk) return fallback;
  const bones = sk.skeleton.bones;
  const hi = bones.indexOf(hand);
  if (hi < 0) return fallback;
  // `curl` agora pode ser UMA LISTA de ossos (ver o bloco de curl em buildCharacterModel):
  // nos 18 GLB de 28 juntas o Curl_R e o Curl_L aparecem DUPLICADOS na hierarquia.
  const ci = (Array.isArray(curl) ? curl : [curl]).map((b) => (b ? bones.indexOf(b) : -1)).filter((i) => i >= 0);
  const pos = sk.geometry.attributes.position, si = sk.geometry.attributes.skinIndex, sw = sk.geometry.attributes.skinWeight;
  const at = (a, i, k) => (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i));
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < pos.count; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) { const bi = at(si, i, k); if (bi === hi || ci.includes(bi)) w += at(sw, i, k); }
    if (w > 0.5) { c.add(v.fromBufferAttribute(pos, i)); n++; }
  }
  if (!n) return fallback;
  c.divideScalar(n);
  // bind: posição do vértice no espaço local do osso = inv(handBindWorld) × meshBindWorld × c
  // (boneInverses[hi] já É inv(handBindWorld) por definição do esqueleto)
  const toLocal = new THREE.Matrix4().copy(sk.skeleton.boneInverses[hi]).multiply(sk.bindMatrix);
  c.applyMatrix4(toLocal);
  /* ── glbchars.js:143 — GUARDA DE PALMA: "o jozo tá com a arma por trás" ─────────────
     O vetor devolvido aqui vira `mount.position` (linha ~403), e o mount é FILHO do osso
     da mão. Ou seja: este vetor é um BRAÇO DE ALAVANCA. Quando o clipe gira a mão em θ, a
     arma varre um arco de 2·|palma|·sin(θ/2). Meio palmo de alavanca é invisível; um braço
     inteiro joga a arma pro outro lado do corpo.
     MEDIDO nos 45 GLB (tools/eval/tp-mount-probe.mjs, seção 5, personagem em 1,72 m):
       mediana do elenco   |palma| = 0,45 do antebraço  -> arco a 90° = 15 cm
       pior rig SÃO         0,85 (blackmetal, manga larga)
       jozo                 1,38  -> arco a 90° = 46 cm   <- a arma vai parar nas costas
       trapfunk             1,15  -> arco a 90° = 38 cm
     A CAUSA: os 18 GLB de 28 juntas compartilham UM esqueleto (translações de junta
     byte-idênticas — o doador `mst`, tools/rig-from-donor.mjs) que está em T-POSE, mas a
     malha do jozo e a do trapfunk está em A-POSE (braços caídos ~40°). O osso da mão
     direita fica em [-0,634, 1,230, -0,025] nos 18; a mão VISÍVEL do jozo está 32 cm dali.
     A auto-skinagem por proximidade pendurou no osso `RightHand` um pedaço de malha que
     não está na mão, e o centroide sai fora de alcance.
     Regra: acima de 0,9 antebraço o centroide não é palma — é ruído de skin. Volta pro
     fallback (25% do antebraço ao longo de +Y, a direção dos dedos na cadeia), que é onde
     o punho está. Teto 0,9 escolhido NO VÃO MEDIDO entre o pior rig são (0,85) e o pior
     quebrado (1,15): não é palpite, é o meio do buraco. Nos outros 43 personagens este
     ramo NUNCA dispara — a mudança é cirúrgica.
     Kill-switch: ?palmguard=0. */
  if (PALM_GUARD) {
    const antebraco = hand.position.length() || 0;
    if (antebraco > 0 && c.length() > PALM_MAX_LEVER * antebraco) {
      if (qp.get('chartune')) console.log(`[glbchars] palma descolada do osso (${(c.length() / antebraco).toFixed(2)}x antebraço) — mount volta pro punho`);
      return fallback;
    }
  }
  return c;
}

// Perfil de RAIO DO TRONCO por altura, medido nos vértices (bind), sem braços/mãos.
// PORQUÊ: em mascote de braço-toco a palma nasce DENTRO do volume do corpo e a arma
// montada nela fica enterrada na malha — foi assim que o Dollynho apareceu "sem arma
// nenhuma" (a palma dele está 25 cm dentro da garrafa; o 2º pior é o Ancap com 12 cm,
// e o humano típico está FORA por 3-10 cm). Com o perfil dá pra empurrar a arma pra
// fora só de quem precisa, na medida exata, em vez de chutar offset por personagem.
// Espaço: com o GLTFLoader do three o bind é IDENTIDADE, então a posição crua do
// vértice já está no espaço local do `model` (o mesmo de model.worldToLocal).
// Cache por id: o custo (uma passada com stride) é pago uma vez por personagem.
const _torsoCache = new Map();
const BUCKET = 0.05;
function torsoProfile(id, model) {
  if (_torsoCache.has(id)) return _torsoCache.get(id);
  let sk = null;
  model.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; });
  let prof = null;
  if (sk) {
    const bones = sk.skeleton.bones;
    const arm = new Set();
    bones.forEach((b, i) => { if (/arm|hand|shoulder|clavicle|curl/i.test(b.name)) arm.add(i); });
    const pos = sk.geometry.attributes.position, si = sk.geometry.attributes.skinIndex, sw = sk.geometry.attributes.skinWeight;
    const at = (a, i, k) => (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i));
    const r = new Float32Array(64);
    for (let i = 0; i < pos.count; i += 3) {
      if (si && sw) { let w = 0; for (let k = 0; k < 4; k++) if (arm.has(at(si, i, k))) w += at(sw, i, k); if (w > 0.3) continue; }
      const y = pos.getY(i), b = Math.floor(y / BUCKET);
      if (b < 0 || b >= 64) continue;
      const rad = Math.hypot(pos.getX(i), pos.getZ(i));
      if (rad > r[b]) r[b] = rad;
    }
    prof = r;
  }
  _torsoCache.set(id, prof);
  return prof;
}
const torsoRadiusAt = (prof, y) => {
  if (!prof) return 0;
  const b = Math.floor(y / BUCKET);
  let m = 0;
  for (let k = b - 1; k <= b + 1; k++) if (k >= 0 && k < 64 && prof[k] > m) m = prof[k];
  return m;
};

// Preload shared clips + base meshes for the given character ids. Safe to call once
// before a match; already-loaded assets are skipped. Failures are swallowed per-asset
// so a missing model just falls back to the box mesh.
export async function preloadCharacterAssets(ids) {
  if (!_clips) {
    _clips = {};
    await Promise.all([
      preloadWeapons(), // real weapon GLBs (mounts fall back to box if missing)
      // Pack compartilhado em 1 GLB MESCLADO (tools/merge-anims.mjs): os 11 requests de
      // clipe viram 1. O THREE amarra o clipe no esqueleto pelo NOME do osso, então
      // basta ler as animações nomeadas. Se o mesclado faltar (deploy velho, ?animdir=
      // experimental), o per-estado de sempre cobre o que faltou.
      (async () => {
        try {
          const g = await loadGLB(`${ANIM_DIR}.glb?v=${VERSION}`);
          for (const c of g.animations) _clips[c.name] = c;
        } catch (e) { /* fallback: per-estado abaixo */ }
        await Promise.all([
          ...STATES.filter((s) => !_clips[s]).map(async (s) => {
            try {
              const g = await loadGLB(`${ANIM_DIR}/${s}.glb?v=${VERSION}`);
              if (g.animations[0]) { g.animations[0].name = s; _clips[s] = g.animations[0]; }
            } catch (e) { console.warn('anim load failed', s, e); }
          }),
          // Opcionais (idle/walk de 1 mão p/ pistolas): ausência NÃO é erro — sem warn.
          ...OPT_STATES.filter((s) => !_clips[s]).map(async (s) => {
            try {
              const g = await loadGLB(`${ANIM_DIR}/${s}.glb?v=${VERSION}`);
              if (g.animations[0]) { g.animations[0].name = s; _clips[s] = g.animations[0]; }
            } catch (e) { /* fallback: idle/walk de 2 mãos */ }
          }),
        ]);
      })(),
    ]);
  }
  const wanted = [...new Set(ids)].filter((id) => GLB_CHARS.has(id) && !_base.has(id));
  await Promise.all(wanted.map(async (id) => {
    try {
      const sourceId = CHAR_MODEL_SOURCE[id] || id;
      const g = await loadGLB(`models/characters/${sourceId}.glb?v=${VERSION}`);
      _base.set(id, g.scene);
    } catch (e) { console.warn('model load failed', id, e); }
    // Clipes retargetados POR PERSONAGEM (models/anims/<id>/): cada rig do Meshy tem
    // proporção de esqueleto diferente, então o pack único (assado contra 1 referência)
    // deformava quem divergia (doutora agachada, dollynho dobrado). Aqui cada char usa
    // seus próprios clipes; qualquer estado ausente cai no pack compartilhado (_clips).
    const set = { ..._clips };
    // GUARDA DE DISPONIBILIDADE — ver o comentário do animIndex(). `disponiveis === null`
    // (manifesto ausente ou fetch falhou) mantém o comportamento antigo: pede tudo.
    const _idx = await animIndex();
    const disponiveis = _idx && _idx.clipes ? (_idx.clipes[id] || []) : null;
    // 1 GLB MESCLADO por personagem (tools/merge-anims.mjs): 11 requests viram 1.
    // O manifesto diz quem tem mesclado; quem não tem (os 8 palhaços) nem tenta —
    // senão o 404 voltava por outra porta. Sem o mesclado ou sem clipe dentro dele,
    // cai no per-estado, que cai no compartilhado.
    let mesclado = null;
    if (!disponiveis || disponiveis.length) {
      try { mesclado = (await loadGLB(`models/anims/${id}.glb?v=${VERSION}`)).animations; }
      catch (e) { /* fallback: per-estado */ }
    }
    await Promise.all([...STATES, ...OPT_STATES].map(async (s) => {
      if (disponiveis && !disponiveis.includes(s)) return;   // não pede o que o build sabe que não existe
      if (mesclado) {
        const c = mesclado.find((a) => a.name === s);
        if (c) { set[s] = c; return; }
        if (disponiveis) return;  // mesclado em dia (manifesto) e sem o clipe: compartilhado
      }
      try {
        const g = await loadGLB(`models/anims/${id}/${s}.glb?v=${VERSION}`);
        if (g.animations[0]) { g.animations[0].name = s; set[s] = g.animations[0]; }
      } catch (e) { /* fallback: clipe compartilhado */ }
    }));
    _clipsByChar[id] = set;
  }));
}

const _v = new THREE.Vector3();
const _gq = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _headUpQ = new THREE.Quaternion();
const _right = new THREE.Vector3();
const _ikTgt = new THREE.Vector3();

// Build a bot mesh from a loaded GLB. Returns an object shaped like buildCharacter()'s
// result ({ group, parts }) plus animation control (isGLB, mixer, ctrl). Returns null
// if the character has no model loaded.
export function buildCharacterModel(def, opts = {}) {
  const template = _base.get(def.id);
  if (!template || !_clips) return null;
  const withWeapon = opts.weapon !== false; // menu showcase passes weapon:false

  const model = skeletonClone(template);

  // Normalize: scale to target height, drop feet to y=0, apply facing fix.
  // Update world matrices first so the bounding box reflects the real transforms.
  model.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(model);
  const h = bbox.max.y - bbox.min.y || 1;
  const s = TARGET_HEIGHT / h;
  if (qp.get('chartune')) console.log(`[glbchars] ${def.id} rawH=${h.toFixed(3)} min.y=${bbox.min.y.toFixed(3)} scale=${s.toFixed(3)}`);
  model.scale.setScalar(s);
  model.position.y = -bbox.min.y * s;
  model.rotation.y = FACING_OFFSET;
  // Materiais: CLONE POR PERSONAGEM. skeletonClone compartilha o material com o
  // template do cache (_base), e o fparms.js clona ESSE MESMO template pros braços de
  // 1ª pessoa — mutar o material aqui vazaria pro viewmodel já validado. Cada bot
  // ganha seu material, com a cor de rim do time dele.
  const rimCol = charRimColor(def);
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    // receiveShadow: sem isto a sombra do sol NUNCA escurecia o personagem — parte do
    // motivo de ele ler como adesivo. Quem impede que essa sombra o faça SUMIR é o piso
    // de irradiância do characters.js (CS_AMB) — e desde a R3 esse piso é MULTIPLICATIVO,
    // então ele garante o mínimo de luz sem apagar a diferença entre cabelo preto e
    // jaleco branco (era esse o bug do "fantasma" da R2). Off em quality low e ?charrecv=0.
    o.receiveShadow = CHAR_FX.recv;
    o.frustumCulled = false;
    if (!o.material) return;
    if (CHAR_FX.mats) {
      o.material = Array.isArray(o.material)
        ? o.material.map((m) => upgradeCharMaterial(m, rimCol))
        : upgradeCharMaterial(o.material, rimCol);
    }
  });

  const group = new THREE.Group();
  group.add(model);

  // Sombra de contato (A2). Ancorada no GRUPO, não no modelo: game.js crava
  // `g.position.y = world.groundHeightAt(x,z)` TODO quadro (game.js:3791-3792), ou
  // seja, a origem do grupo JÁ está no piso por construção. Um raycast por bot por
  // quadro contra a cena inteira (sem BVH, em SwiftShader de 2 CPUs) repetiria essa
  // conta e custaria caro sem acrescentar informação — o acompanhamento do piso vem
  // de graça; o "sumir no ar" vem do estado de pulo, tratado no CharController.
  const shadow = CHAR_FX.shadow ? makeContactShadow() : null;
  if (shadow) group.add(shadow);

  // Head hitbox: an invisible (unrendered) but raycastable box tracked to the head bone
  // each frame, so headshots stay accurate through the animation.
  let headBone = null;
  model.traverse((o) => { if (o.isBone && !headBone && /head/i.test(o.name)) headBone = o; });
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.30, 0.26),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  group.add(head);

  // Rifle in the right hand: a scale-compensated mount parented to the hand bone so
  // GUN_POS/GUN_ROT are expressed in world meters regardless of the bone's scale.
  let handBone = null, lhandBone = null, rforeBone = null, gunObj = null;
  model.traverse((o) => { if (o.isBone && !handBone && /right.?hand|hand.?r\b|rhand|r_hand/i.test(o.name)) handBone = o; });
  model.traverse((o) => { if (o.isBone && !lhandBone && /left.?hand|hand.?l\b|lhand|l_hand/i.test(o.name)) lhandBone = o; });
  model.traverse((o) => { if (o.isBone && !rforeBone && /right.?forearm|r_forearm/i.test(o.name)) rforeBone = o; });
  if (!handBone) model.traverse((o) => { if (o.isBone && !handBone && /hand/i.test(o.name)) handBone = o; });
  if (handBone && withWeapon) {
    const gun = weaponModel(opts.weaponId || 'awp') || buildRifle();
    // Flip de 180° SÓ na 3ª pessoa p/ armas que ficam de costas no mount (o cano +Z da
    // weaponModel não bate com a mão nesses casos). O FP tem seu próprio ajuste (vmRotY),
    // então corrigimos aqui sem tocar no viewmodel já validado. (P90: usuário viu ao contrário.)
    if (TP_FLIP_Y.has(opts.weaponId)) gun.rotateY(Math.PI);
    gunObj = gun;
    // Measure the weapon's authored (real-world) size in its own space, before parenting.
    gun.updateMatrixWorld(true);
    const asz = new THREE.Vector3(); new THREE.Box3().setFromObject(gun).getSize(asz);
    const authored = Math.max(asz.x, asz.y, asz.z) || 1;
    const mount = new THREE.Group();
    handBone.add(mount); mount.add(gun);
    // Orientation is computed AFTER the controller is created (below).
    group.updateMatrixWorld(true);
    if (TP_MOUNT_V2) {
      // ESCALA: direto da escala de mundo do OSSO (exata e independente de giro).
      // A conta antiga comparava o tamanho da arma solta com a AABB dela já pendurada
      // no osso — e AABB é alinhada aos eixos do MUNDO, então ela ENCOLHE quando o osso
      // está girado. Medido: erro de -12% (uzi no reggae) a +7% (ak no coach), ou seja,
      // até 19% de diferença de tamanho da MESMA arma entre dois personagens. Aqui a
      // arma renderiza exatamente no comprimento real dela em qualquer rig.
      const e = handBone.matrixWorld.elements;
      const boneScale = Math.hypot(e[0], e[1], e[2]) || 1;   // ~0.0101-0.0116 nestes rigs
      mount.scale.setScalar(GUN_SCALE / boneScale);
      gun.position.set(0, 0, 0);   // o grip já é a origem do weaponModel; quem posiciona é o mount
    } else {
      const wsz = new THREE.Vector3(); new THREE.Box3().setFromObject(gun).getSize(wsz);
      const worldLen = Math.max(wsz.x, wsz.y, wsz.z) || authored;
      mount.scale.setScalar(GUN_SCALE * authored / worldLen); // -> mount space ~= world meters
      gun.position.set(GUN_POS[0], GUN_POS[1], GUN_POS[2]);
    }
    gun.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.userData.noHit = true; } });
  }

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  const clips = _clipsByChar[def.id] || _clips;   // clipes retargetados por personagem
  for (const name of [...STATES, ...OPT_STATES]) if (clips[name]) actions[name] = mixer.clipAction(clips[name]);

  const ctrl = new CharController(mixer, actions, group, headBone, head, def.id, model);
  ctrl.shadow = shadow;   // antes do settle loop abaixo (ctrl.update já a atualiza)
  // Arma de 1 mão (pistol/deagle/revolver38/knife): usa idle1h/walk1h quando carregados.
  ctrl.oneHanded = !!(opts.weaponId && ONE_HANDED.has(opts.weaponId));

  if (handBone && withWeapon) {
    // A pose tem que estar ASSENTADA antes de medir qualquer coisa: o mixer acabou de
    // ser criado e o modelo ainda está na pose de bind (braços abertos). Medir antes
    // disso é a origem clássica dos mounts errados neste projeto. (O código antigo
    // pedia 'walk' e logo em seguida chamava update(...,moving=0,...), que devolve o
    // controlador pra 'idle' — ele media, na prática, um BLEND no meio da transição,
    // e blend de transição é diferente em cada rig: daí a aleatoriedade dos defeitos.)
    for (let i = 0; i < 10; i++) ctrl.update(1 / 30, 0, false, 0);
    model.updateMatrixWorld(true);
    const mount = handBone.children.find((c) => c.isGroup);
    /* ── glbchars.js:365 — OS OSSOS DE CURL VÊM DUPLICADOS EM 18 PERSONAGENS ───────────
       Medido nos GLB: os 18 modelos de 28 juntas (palhaços + funkeiros rigados offline por
       tools/rig-from-donor.mjs, mais o próprio doador `mst`) trazem `Curl_R` e `Curl_L`
       DUAS VEZES cada, ambos filhos da mesma mão — 4 ossos de dedo em vez de 2. É um
       defeito do transplante de esqueleto, não do modelo.
       O código antigo (`if (o.name === 'Curl_R') curlR = o`) não parava no primeiro: ele
       varria a árvore inteira e ficava com o ÚLTIMO. E o último é justamente a cópia SEM
       PESO NENHUM — no `mst`, o primeiro Curl_R tem 185 vértices e o segundo tem 0. Ou
       seja: o `curlR.rotation.x += curl` fechava os dedos de um osso que não move malha
       nenhuma, e a mão ficava aberta na arma nos 18. E o mesmo `curlR` era passado pro
       measurePalmLocal, que perdia os vértices dos dedos na média da palma.
       Agora: junta TODOS os ossos com esse nome e prefere os que têm peso de skin. */
    const curlsR = [], curlsL = [];
    model.traverse((o) => { if (o.isBone) { if (o.name === 'Curl_R') curlsR.push(o); if (o.name === 'Curl_L') curlsL.push(o); } });
    const comPeso = (lista) => {
      if (lista.length < 2) return lista;
      let sk = null;
      model.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; });
      if (!sk) return lista;
      const bones = sk.skeleton.bones, si = sk.geometry.attributes.skinIndex, sw = sk.geometry.attributes.skinWeight;
      if (!si || !sw) return lista;
      const at = (a, i, k) => (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i));
      const peso = new Map(lista.map((b) => [b, 0]));
      const idx = new Map(lista.map((b) => [bones.indexOf(b), b]));
      for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) {
        const b = idx.get(at(si, i, k));
        if (b) peso.set(b, peso.get(b) + at(sw, i, k));
      }
      const uteis = lista.filter((b) => peso.get(b) > 0);
      return uteis.length ? uteis : lista;
    };
    const curlRs = comPeso(curlsR), curlLs = comPeso(curlsL);
    if (TP_MOUNT_V2 && mount) {
      // 1) ORIENTAÇÃO: cano na direção do CORPO + ângulo de porte fixo (igual pra todos).
      // `opts.preview` liga o porte de EXIBIÇÃO, usado SÓ pela tela de seleção
      // (main.js/pvSetChar): com o porte funcional (−6°, 4°) o cano aponta pra CÂMERA do
      // preview e a arma vira um toco sem silhueta — era o "posturas bizarras" do dono em
      // 05/08 (coach/trapfunk/mandrake com a arma "sumida" na mão). Arma de 2 mãos fica
      // atravessada no peito (−14° = cano ~14° pra cima, yaw 40°, estilo vitrine de CS);
      // arma de 1 mão compensa a inclinação intrínseca do cano das pistolas (+18°..21°
      // medidos por vértice, probe-muzzle 05/08) com pitch pra baixo — sem isso o revólver
      // do bonzo aponta ~35° pro céu. No jogo o porte funcional fica intocado: bot mira
      // pra onde olha (funcional > identidade). A/B: scratchpad sel_now × sel_fix.
      const cd = opts.preview ? (ONE_HANDED.has(opts.weaponId) ? [4, 26] : [-14, 40]) : null;
      const carry = new THREE.Quaternion().setFromEuler(cd
        ? new THREE.Euler(cd[0] * Math.PI / 180, cd[1] * Math.PI / 180, 0, 'YXZ')
        : new THREE.Euler(TP_CARRY_PITCH, TP_CARRY_YAW, 0, 'YXZ'));
      const bodyQ = model.getWorldQuaternion(new THREE.Quaternion());
      const desired = bodyQ.multiply(carry);
      const handQ = handBone.getWorldQuaternion(new THREE.Quaternion());
      mount.quaternion.copy(handQ.invert().multiply(desired));
      /* ── O MOUNT ESTAVA CONGELADO NA POSE DE IDLE (rodada da RÉGUA) ──────────────
         O bloco acima roda UMA VEZ, aqui na construção, depois do settle de 10 quadros de
         idle (linha ~352). Ele resolve `mount.quaternion` para que, NAQUELE INSTANTE, o
         cano aponte pra frente do corpo. Mas o mount é filho do OSSO DA MÃO: assim que o
         clipe começa a girar a mão — andar, correr, atirar, agachar, morrer — o cano gira
         JUNTO, e a correção calculada no idle deixa de valer. Ou seja, a promessa do MOUNT
         V2 ("em 3ª pessoa a arma aponta pra onde o boneco olha, ponto", linha ~76) só era
         cumprida em UMA pose, justamente a pose em que ninguém está olhando pro bot.
         Conserto: guardar o que a conta precisa e REFAZER a orientação por quadro, no fim
         do CharController.update (depois do mixer). É uma inversão de quaternion e duas
         multiplicações por bot — comparável ao que o pitch da cabeça já faz ali.
         A POSIÇÃO não entra: `mount.position` está no espaço LOCAL DO OSSO e a palma é
         rígida em relação a ele (measurePalmLocal mede em bind), então ela acompanha o
         osso sozinha e recalcular seria custo sem efeito.
         Kill-switch: ?tpmountlive=0 volta ao comportamento congelado. */
      let rArmBone = null;
      model.traverse((o) => { if (o.isBone && !rArmBone && o.name === 'RightArm') rArmBone = o; });
      if (TP_MOUNT_LIVE) ctrl.tpMount = { mount, handBone, model, carry, palmLocal: null, rArm: rArmBone, rFore: rforeBone };
      // 2) POSIÇÃO: no centro medido da PALMA, não na origem do osso (que é o PULSO).
      // É a diferença entre "a mão segura a arma" e "a arma flutua perto da mão" (C7).
      const palmLocal = measurePalmLocal(model, handBone, curlRs);
      const palmW = handBone.localToWorld(palmLocal.clone());
      // 3) FOLGA: se a palma nasce dentro da silhueta do corpo, empurra a arma pra fora
      // na medida exata (Dollynho: 25 cm dentro da garrafa; humano típico: 0).
      const palmM = model.worldToLocal(palmW.clone());
      const prof = torsoProfile(def.id, model);
      const rNow = Math.hypot(palmM.x, palmM.z);
      const need = Math.min(TP_CLEAR_MAX, torsoRadiusAt(prof, palmM.y) + TP_CLEAR - rNow - TP_BURIED_TOL);
      if (need > 0.005) {
        // Direção do empurrão: frente do corpo + um pouco pra direita. Usar a direção
        // da própria palma não serve nos mascotes — lá o raio é ~0 e a direção é ruído.
        palmM.x += need * 0.33; palmM.z += need * 0.94;
        if (qp.get('chartune')) console.log(`[glbchars] ${def.id}: arma empurrada ${need.toFixed(3)} m pra fora do corpo`);
      }
      mount.position.copy(handBone.worldToLocal(model.localToWorld(palmM)));
      // A âncora da palma em espaço do OSSO: é o que o clamp de frente por-quadro
      // (CharController.update) reprojeta no espaço do modelo a cada frame.
      if (ctrl.tpMount) ctrl.tpMount.palmLocal = mount.position.clone();
    } else if (mount) {
      // --- caminho antigo (?tpmount=0): direção do cano pela linha antebraço->mão ---
      const dirAvg = new THREE.Vector3();
      if (rforeBone) {
        for (let i = 0; i < 8; i++) {
          ctrl.update(1 / 24, 0, false, 0);
          model.updateMatrixWorld(true);
          const d = handBone.getWorldPosition(new THREE.Vector3()).sub(rforeBone.getWorldPosition(new THREE.Vector3()));
          if (d.lengthSq() > 1e-6) dirAvg.add(d.normalize());
        }
      }
      let dir = dirAvg.lengthSq() > 1e-6 ? dirAvg.normalize() : null;
      if (!dir) dir = new THREE.Vector3(0, 0, 1).applyQuaternion(group.getWorldQuaternion(new THREE.Quaternion()));
      const lookM = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir.clone().negate(), new THREE.Vector3(0, 1, 0));
      const desired = new THREE.Quaternion().setFromRotationMatrix(lookM);
      mount.quaternion.copy(handBone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));
    }
    // Grip curl: close the fingers onto the grip (the auto-skinned curl bones).
    // Two-handed weapons curl both hands; one-handed only the grip (right) hand.
    const gripWeaponId = CHAR_GRIP_REFERENCE[def.id] === 'doutora' ? 'm4' : (opts.weaponId || 'awp');
    const twoHanded = !ONE_HANDED.has(gripWeaponId);
    /* CURL DOS DEDOS: era 0,5 rad CRAVADO nas duas mãos, para as 26 armas.
       O curl é o quanto os dedos fecham em volta do PUNHO da arma, então o valor certo é
       função da GROSSURA do que a mão agarra — um punho de pistola e o guarda-mão de uma
       AWP não fecham a mão no mesmo ângulo. Com 0,5 fixo, ou a mão fica aberta na arma
       fina ou os dedos atravessam a arma grossa; nos dois casos lê como "mão solta".
       Aqui o ângulo sai da própria arma: `gripPoints` dá o ponto do guarda-mão e o
       weaponModel dá a caixa, então a espessura no grip é MEDIDA e não tabelada.
       Faixa 0,35-0,80 rad: abaixo disso a mão não fecha, acima os dedos entram na palma.
       RESSALVA HONESTA: sem os GLB de personagem nesta árvore não deu pra conferir o
       resultado em imagem. A faixa é conservadora e contém o 0,5 antigo, então o pior
       caso é ficar igual ao que já estava. */
    const curlPara = (obj) => {
      if (!obj) return 0.5;
      const sz = new THREE.Vector3();
      new THREE.Box3().setFromObject(obj).getSize(sz);
      const esp = Math.min(sz.x, sz.y, sz.z);            // menor dimensão = espessura do corpo da arma
      if (!isFinite(esp) || esp <= 0) return 0.5;
      // mão humana fecha ~0,8 rad em volta de 3 cm e ~0,35 rad em volta de 9 cm
      return Math.max(0.35, Math.min(0.80, 0.80 - (esp - 0.03) * (0.45 / 0.06)));
    };
    const curl = gunObj ? curlPara(gunObj) : 0.5;
    // fecha TODOS os ossos de curl com peso (nos 18 rigs transplantados eles vêm em par)
    for (const b of curlRs) b.rotation.x += curl;
    if (twoHanded) for (const b of curlLs) b.rotation.x += curl;
    // IK da mão de apoio (FASE 2): em armas de 2 mãos, o CharController trava a palma L
    // no guarda-mão depois de cada mixer.update — vale pra idle/walk dos bots E pro
    // preview da tela de seleção (mesmo ctrl.update). Posicional apenas: os clipes já
    // orientam a mão perto do certo (rifle-hold); o IK resolve o contato por arma.
    if (twoHanded && lhandBone) {
      let lArm = null, lFore = null;
      model.traverse(o => { if (o.isBone) { if (o.name === 'LeftArm') lArm = o; if (o.name === 'LeftForeArm') lFore = o; } });
      const gp = gripPoints(gripWeaponId);
      if (lArm && lFore && gp.fore && gunObj && !IK_L_SKIP.has(def.id)) ctrl.ikL = { chain: [lArm, lFore], end: lhandBone, endOffset: measurePalmLocal(model, lhandBone, curlLs), gun: gunObj, fore: gp.fore.clone() };
    }
  }
  return { group, parts: { head }, isGLB: true, mixer, ctrl };
}

const FADE = 0.16;

class CharController {
  constructor(mixer, actions, group, headBone, head, charId, model) {
    this.mixer = mixer; this.actions = actions;
    this.group = group; this.headBone = headBone; this.head = head;
    /* Base do Y vem do enquadramento da bind (`model.position.y = -bbox.min.y * s`, acima).
       A correção do clipe é somada A ELA, nunca substitui — senão o personagem perde o
       alinhamento de bind que já estava certo em todos os 44. */
    this.charId = charId; this.model = model || null;
    this._footBase = model ? model.position.y : 0;
    this.cur = null; this.dead = false; this.shooting = false; this.crouch = false; this.jumping = false;
    this.shadow = null; this._airK = 0;   // sombra de contato + fator "está no ar" (0..1, suavizado)
    this.oneHanded = false; // arma de 1 mão: idle/walk trocam p/ idle1h/walk1h (setado em buildCharacterModel)
    this._loco = 'idle'; // current locomotion state (hysteresis memory for walk/run choice)
    mixer.addEventListener('finished', (e) => {
      if (e.action === actions.shoot) this.shooting = false;
      if (e.action === actions.jump) this.jumping = false;
    });
    this._to('idle');
  }

  _to(name, once = false) {
    const a = this.actions[name];
    if (!a || this.cur === a) return;
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    a.enabled = true; a.fadeIn(FADE); a.play();
    if (this.cur) this.cur.fadeOut(FADE);
    this.cur = a;
    this.curName = name;   // nome do estado atual — o clamp de frente do mount lê daqui
    // pé no chão: o offset do clipe que ENTRA (ver footOffset)
    if (this.model) this.model.position.y = this._footBase + footOffset(this.charId, name);
  }

  setCrouch(v) { this.crouch = !!v; }

  jump() {
    if (this.dead || this.crouch || this.jumping || !this.actions.jump) return;
    this.jumping = true;
    const a = this.actions.jump;
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false;
    a.enabled = true; a.fadeIn(0.08).play();
    if (this.cur && this.cur !== a) this.cur.fadeOut(0.08);
    this.cur = a;
  }

  shoot() {
    if (this.dead || this.crouch || !this.actions.shoot) return; // crouch pose already aims
    this.shooting = true;
    this._shootUntil = this.mixer.time + this.actions.shoot.getClip().duration;
    this.actions.shoot.reset();
    this.actions.shoot.setLoop(THREE.LoopOnce, 1);
    this.actions.shoot.clampWhenFinished = true;
    this.actions.shoot.enabled = true; this.actions.shoot.fadeIn(0.06).play();
    if (this.cur && this.cur !== this.actions.shoot) this.cur.fadeOut(0.06);
    this.cur = this.actions.shoot;
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.shooting = false;
    this._to('death', true);
    if (this.actions.death) this.actions.death.timeScale = 1.8; // snappy fall, not slow-mo
  }

  // Stop ALL actions first — the death clip runs with clampWhenFinished, so it holds
  // its last (fallen) frame at full weight forever. Without stopAllAction the revived
  // character does everything on top of the fallen pose (the "walking while falling
  // backward" bug). Then start idle clean.
  revive() {
    this.dead = false; this.shooting = false;
    this.mixer.stopAllAction();
    this.cur = null;
    this._to('idle');
  }

  // moving: 0..1, hasTarget: bool, speed: real ground speed (m/s), back: true when the
  // body is moving BACKWARD relative to its facing (combat retreat). Advances the mixer,
  // picks the locomotion state, and scales the leg-cycle rate to the actual ground speed
  // so the feet plant instead of ice-skating (root-motion-free clips have no built-in
  // stride, so we drive the cycle rate from how fast the body is really moving).
  update(dt, moving, hasTarget, speed = 0, back = false) {
    if (!this.dead) {
      if (this.crouch) {
        this._to(moving > 0.05 ? 'crouchwalk' : 'crouch');
      } else if (this.shooting && moving > 0.05 && this.actions.walkfire) {
        // Atirar EM MOVIMENTO: o clipe combinado (walk+fire) mantém as pernas andando —
        // antes as pernas congelavam ~1s a cada disparo (usuário reprovou).
        this._to('walkfire');
        if (this.mixer.time >= (this._shootUntil || 0)) this.shooting = false;
      } else if (!this.shooting && !this.jumping) {
        if (moving <= 0.05) { this._to(this.oneHanded && this.actions.idle1h ? 'idle1h' : 'idle'); this._loco = 'idle'; }
        else if (back) {
          // Backpedal: walk clip REVERSED (negative timeScale below) so the feet step
          // backward — a forward clip while retreating is the classic moonwalk.
          this._to(this.oneHanded && this.actions.walk1h ? 'walk1h' : 'walk'); this._loco = 'walk';
        } else {
          // Pick the clip by SPEED with hysteresis (not by hasTarget): fast movement with
          // the slow walk clip needs a frantic ~2.4x cycle; slow movement with the run
          // clip looks like gliding. run > 1.45 m/s, walk < 1.15, keep current in between.
          if (this._loco !== 'run' && speed > 1.45) this._loco = 'run';
          else if (this._loco !== 'walk' && speed < 1.15) this._loco = 'walk';
          else if (this._loco !== 'walk' && this._loco !== 'run') this._loco = hasTarget && speed < 1.7 ? 'walk' : 'run';
          this._to(this._loco === 'walk' && this.oneHanded && this.actions.walk1h ? 'walk1h' : this._loco);
        }
      }
      // Per-clip cycle rate = ground speed / that clip's measured natural speed, so the
      // feet plant instead of ice-skating. clamp keeps it from looking frantic/frozen.
      const rate = (ref) => Math.max(0.45, Math.min(3.0, speed / ref));
      if (this.actions.run) this.actions.run.timeScale = rate(RUN_REF);
      if (this.actions.walk) this.actions.walk.timeScale = back ? -rate(WALK_REF) : rate(WALK_REF);
      if (this.actions.walk1h) this.actions.walk1h.timeScale = back ? -rate(WALK_REF) : rate(WALK_REF);
      if (this.actions.crouchwalk) this.actions.crouchwalk.timeScale = rate(CROUCH_REF);
    }
    this.mixer.update(dt);
    // Pitch da cabeça em MALHA FECHADA (substitui o HEAD_UP fixo, que ACUMULAVA rotação
    // quando o mixer parava de escrever o osso — ex.: idle.glb com duração zero, que
    // dobrava a cabeça do personagem na tela de seleção). Mede o pitch real do olhar
    // (eixo +Z local da cabeça em mundo) e gira o osso pela DIFERENÇA pro aimPitch.
    // Só roda quando aimPitch é DEFINIDO (bots) — preview da seleção e braços FP ficam
    // com a pose natural do clipe (aplicar em todos deixava as cabeças esquisitas).
    if (this.headBone && this.aimPitch !== undefined && !this.dead) {
      const target = this.aimPitch;
      this.group.getWorldQuaternion(_gq);
      _right.set(1, 0, 0).applyQuaternion(_gq);
      this.headBone.getWorldQuaternion(_wq);
      _v.set(0, 0, 1).applyQuaternion(_wq);
      const curPitch = Math.asin(Math.max(-1, Math.min(1, _v.y)));
      let corr = target - curPitch;
      corr = Math.max(-AIM_CORR_CLAMP, Math.min(AIM_CORR_CLAMP, corr));
      this._aimCorr = (this._aimCorr || 0) + (corr - (this._aimCorr || 0)) * Math.min(1, dt * 6);
      if (Math.abs(this._aimCorr) > 1e-4) {
        _headUpQ.setFromAxisAngle(_right, -this._aimCorr);
        this.headBone.parent.getWorldQuaternion(_pq);
        this.headBone.quaternion.copy(_pq.invert().multiply(_headUpQ).multiply(_wq));
        this.headBone.updateWorldMatrix(false, true);
      }
    }
    if (this.headBone) {
      this.group.updateMatrixWorld(true);
      this.head.position.copy(this.group.worldToLocal(this.headBone.getWorldPosition(_v)));
    }
    // Sombra de contato: reage ao estado do corpo. No pulo ela ABRE e desbota (penumbra
    // que cresce com a distância do contato, critério A4); agachado ela FECHA e escurece
    // (o corpo está mais perto do chão); morto, alivia — o corpo tombou e a mancha sob
    // o eixo do grupo deixaria de fazer sentido se ficasse cheia.
    if (this.shadow) {
      const air = this.jumping ? 1 : 0;
      this._airK += (air - this._airK) * Math.min(1, dt * 8);
      const k = 1 - this._airK;
      const s = this.shadow, base = s.userData.csBase || 0.9;
      const tight = this.crouch ? 0.82 : 1.0;
      const sc = base * tight * (1 + this._airK * 0.6);
      s.scale.set(sc, sc, 1);
      s.material.opacity = CHAR_FX.csOp * (0.12 + 0.88 * k) * (this.crouch ? 1.15 : 1) * (this.dead ? 0.5 : 1);
      s.visible = s.material.opacity > 0.02;
    }
    // ORIENTAÇÃO DO MOUNT, POR QUADRO (ver o bloco em buildCharacterModel): sem isto o
    // cano acompanha a rotação da mão do clipe e a arma sai apontando pra qualquer lado
    // fora do idle. Roda DEPOIS do mixer e depois da correção de cabeça — as duas mexem
    // em osso e a conta aqui depende da matriz de mundo já resolvida.
    if (this.tpMount && !this.dead) {
      const t = this.tpMount;
      t.handBone.updateWorldMatrix(true, false);
      t.model.getWorldQuaternion(_gq);
      _wq.copy(_gq).multiply(t.carry);                  // orientação desejada do cano (mundo)
      t.handBone.getWorldQuaternion(_pq);
      t.mount.quaternion.copy(_pq.invert().multiply(_wq));
      // CLAMP DE FRENTE via IK DO BRAÇO DIREITO (ver TP_FRONT_MIN): o clipe assentado
      // deixa a palma de alguns rigs atrás do plano do corpo e a arma vai junto
      // ("arma por trás" — jozo/trapfunk/coach). Empurrar só o MOUNT foi tentado e
      // reprovado no olho: a arma descolava da mão (esbirro: 11 cm). Aqui a MÃO inteira
      // vem pra frente (CCD em Arm→ForeArm, o mesmo solver da mão de apoio) e a arma,
      // filha do osso, vem colada. SÓ em porte parado (idle/idle1h/crouch): no walk/run
      // a mão balança pra trás por natureza. Nota de ordem: este bloco roda ANTES da
      // orientação do cano (acima), então na 1ª chamada a orientação usa a mão pré-IK e
      // converge no quadro seguinte — o assentamento da seleção roda 60 quadros.
      if (t.palmLocal && t.rArm && t.rFore && TP_FRONT_MIN > -Infinity
          && /^(idle|idle1h|crouch)$/.test(this.curName || '')) {
        _v.copy(t.palmLocal);
        t.handBone.localToWorld(_v);
        t.model.worldToLocal(_v);
        if (_v.z < TP_FRONT_MIN) {
          _v.z = TP_FRONT_MIN;
          t.model.localToWorld(_v);
          solveCCDIK([t.rArm, t.rFore], t.handBone, _v, { iterations: 6, endOffset: t.palmLocal });
          t.handBone.updateWorldMatrix(true, false);
          t.model.getWorldQuaternion(_gq);
          _wq.copy(_gq).multiply(t.carry);
          t.handBone.getWorldQuaternion(_pq);
          t.mount.quaternion.copy(_pq.invert().multiply(_wq));   // reorienta o cano pós-IK
        }
      }
    }
    // IK da mão de apoio (FASE 2): palma L no guarda-mão da arma montada (só 2 mãos).
    // Roda depois do mixer/pose — corrige o contato por arma sem tocar na orientação.
    if (this.ikL && !this.dead) {
      const ik = this.ikL;
      ik.gun.updateWorldMatrix(true, false);
      _ikTgt.copy(ik.fore);
      ik.gun.localToWorld(_ikTgt);
      solveCCDIK(ik.chain, ik.end, _ikTgt, { iterations: 8, endOffset: ik.endOffset });
    }
  }
}
