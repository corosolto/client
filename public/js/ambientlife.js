import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { VERSION } from './version.js';

const loader = new GLTFLoader();
const templates = new Map();
const ASSETS = Object.freeze({
  rat: 'models/ambient/rat_animated.glb',
  pigeonGround: 'models/ambient/pigeon_ground.glb',
  dog: 'models/ambient/dog_caramelo.glb',
  jacare: 'models/ambient/jacare_corrego.glb',
  capivara: 'models/ambient/capivara_corrego.glb',
  cat: 'models/ambient/cat_telhado.glb',
  chicken: 'models/ambient/galinha_campo.glb',
  cow: 'models/ambient/vaca_campo.glb',
  /* vida 1 (plans/22): Mint estático + locomoção procedural — Quaternius não tem
     tatu/barata/papagaio em nenhum pack (varredura 19/08 no FONTE.md do acervo) */
  armadillo: 'models/ambient/tatu_campo.glb',
  cockroach: 'models/ambient/barata_urbana.glb',
  parrot: 'models/ambient/papagaio_poleiro.glb',
  /* vida 2 (14/09): bicho que JÁ ESTAVA PAGO e parado na conta Mint (docs/maps/mint/fauna.md).
     Todos estáticos pela causa medida naquele levantamento — `list_model_animation_options`
     devolve 673 clipes e os 673 são `humanoid animation`, então quadrúpede e ave não têm
     animação neste fornecedor. Por isso a seleção é só de bicho cuja POSE PARADA é honesta,
     e o carcará entra como PERCHED (não anda; ver `_updatePerched`).
     O 8º baixado, `calango.glb`, NÃO está aqui: saiu em pose BÍPEDE ERETA (tronco vertical,
     braços à frente) e lagarto de muro é quadrúpede rente à superfície — figura em
     /tmp/faunaprobe/calango_3v.png. Sem rig não há conserto, e rig de não-humanoide é
     justamente o que o Mint não faz. */
  hen: 'models/ambient/galinha_hen.glb',
  chick: 'models/ambient/pintinho.glb',
  guinea: 'models/ambient/galinha_angola.glb',
  duck: 'models/ambient/pato_lago.glb',
  horse: 'models/ambient/cavalo_sitio.glb',
  goat: 'models/ambient/cabra_caatinga.glb',
  carcara: 'models/ambient/carcara.glb',
});
export const FAVELA_AMBIENCE_ASSETS = Object.freeze(Object.keys(ASSETS));
const TYPE_ASSET = Object.freeze({
  rat: 'rat', pigeon: 'pigeonGround', dog: 'dog', cat: 'cat', chicken: 'chicken', cow: 'cow',
  armadillo: 'armadillo', cockroach: 'cockroach', parrot: 'parrot',
  hen: 'hen', chick: 'chick', guinea: 'guinea', duck: 'duck', horse: 'horse', goat: 'goat', carcara: 'carcara',
});
/* ordem canônica: é a ordem em que os bichos nascem e a ordem do censo do `report()` */
const FAUNA_TYPES = Object.freeze(Object.keys(TYPE_ASSET));
/* nome da opção que cada tipo lê do `createFavelaAmbience(root, {...})` */
const TYPE_OPTION = Object.freeze({
  rat: 'rats', pigeon: 'pigeons', dog: 'dogs', cat: 'cats', chicken: 'chickens', cow: 'cows',
  armadillo: 'armadillos', cockroach: 'cockroaches', parrot: 'parrots',
  hen: 'hens', chick: 'chicks', guinea: 'guineas', duck: 'ducks', horse: 'horses', goat: 'goats', carcara: 'caracaras',
});
const FAUNA_NAME = Object.freeze({
  rat: 'rato', pigeon: 'pomba', dog: 'cachorro', cat: 'gato', chicken: 'galinha', cow: 'vaca',
  armadillo: 'tatu', cockroach: 'barata', parrot: 'papagaio',
  hen: 'galinha choca', chick: 'pintinho', guinea: 'galinha d’angola', duck: 'pato',
  horse: 'cavalo', goat: 'cabra', carcara: 'carcará',
});
/* quem ANDA pelo `_updateQuad`. O cavalo entra aqui com `to` ausente de propósito: a pose
   do GLB é de cabeça baixa pastando, então ele fica no lugar e só reage ao susto. */
const QUADS = new Set(['dog', 'cat', 'chicken', 'cow', 'armadillo', 'hen', 'chick', 'guinea', 'duck', 'horse', 'goat']);
/* quem fica no POLEIRO: não anda, balança e vira a cabeça (`_updatePerched`). Carcará é
   rapina pousada — bicho que passa a vida parado —, então estático aqui não mente. */
const PERCHED = new Set(['parrot', 'carcara']);
const PERCH_SWAY = Object.freeze({ parrot: .055, carcara: .03 });
const SHOT_REACTION_RADIUS = 13;
const DOG_IDLE_TIME = 3;
/* por tipo: duração do susto e velocidade de fuga/caminhada (vaca larga, gato rápido) */
const ALERT_TIME = Object.freeze({
  rat: 2.1, dog: 2.6, cat: 2.4, chicken: 2.8, cow: 3.2, pigeon: 3.2, armadillo: 2.4, cockroach: 1.8, parrot: 1.3,
  hen: 2.6, chick: 2.2, guinea: 2.6, duck: 2.4, horse: 3, goat: 2.8, carcara: 1.6,
});
const QUAD_SPEED = Object.freeze({
  dog: { walk: 1, flee: 3.2 }, cat: { walk: 1.1, flee: 3.6 }, chicken: { walk: .55, flee: 2.6 }, cow: { walk: .75, flee: 2.4 },
  armadillo: { walk: .4, flee: 1.5 },   // tatu é bicho de passo curto; fuga é um trote rápido
  /* vida 2: os 6 GLB novos são ESTÁTICOS — não há pata se mexendo para justificar
     deslocamento grande. `_updateQuad` limita a fuga a `flee × 1,4` m, então estes valores
     são o quanto de deslize o bicho pode pagar sem virar patinação: galinha 1,7 m, pinto
     1,4 m, cavalo 0,7 m (pastando, só troca o peso de pata). O pato é o único em que
     deslizar é CORRETO: pato nadando desliza mesmo. */
  hen: { walk: .5, flee: 1.2 }, chick: { walk: .35, flee: 1 }, guinea: { walk: .5, flee: 1.4 },
  duck: { walk: .22, flee: .6 }, horse: { walk: .5, flee: .5 }, goat: { walk: .42, flee: 1.1 },
});

const loadGLB = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

export async function preloadAmbientLife(ids = FAVELA_AMBIENCE_ASSETS) {
  /* lista vazia vinha de main.js/mapview para os mapas sem `ambience` no registro:
     nenhum GLB baixava e a fauna inteira caía no fallback procedural (BUG-57) */
  if (!ids || !ids.length) ids = FAVELA_AMBIENCE_ASSETS;
  await Promise.all([...new Set(ids)].filter((id) => ASSETS[id] && !templates.has(id)).map(async (id) => {
    try {
      const gltf = await loadGLB(`${ASSETS[id]}?v=${VERSION}`);
      let skinned = false;
      gltf.scene.traverse((object) => {
        if (!object.isMesh) return;
        skinned ||= object.isSkinnedMesh;
        object.material.metalness = 0;
        object.material.roughness = Math.max(.72, object.material.roughness ?? .72);
      });
      templates.set(id, { scene: gltf.scene, clips: gltf.animations, skinned });
    } catch (error) {
      console.warn('[ambientlife] GLB não carregou', id, error);
    }
  }));
}

/* ─── FAIL-CLOSED DA FAUNA (13/09/2026) ────────────────────────────────────────────
   Pedido do dono: "temos que melhorar os animais, nenhum pode ser lowpoly". O bicho
   low-poly de verdade NÃO é o GLB: é o proxy de esfera+cone abaixo, que nasce quando o
   GLB não carrega — 176 tri no cachorro contra 1.950 do GLB, 218 na pomba contra 6.928,
   114 na barata contra 2.124 (medidos no three vendorizado; docs/maps/RELATORIO-LOWPOLY.md
   §2.3). Fauna é ambientação, não jogabilidade: mapa SEM bicho é melhor que mapa com
   boneco de esfera, então no browser, sem GLB, o bicho simplesmente NÃO NASCE.

   EM NODE O PROXY CONTINUA, de propósito: no arnês nenhum GLB carrega por desenho
   (tools/eval/map-check.mjs:111 e corrego-contract-check.mjs:16-19) e régua que perde a
   fauna perde o CENSO dela — o fail-closed apagaria os ratos e a capivara que a
   `corrego-contract-check` conta. O ambiente é detectado como no resto da base
   (`game.js:44`, `authoredvm.js:16`): em node existe `process.versions.node`.

   KILL-SWITCH `?fauna=proxy` devolve o comportamento antigo no browser, do mesmo jeito
   que `?glb=0` devolve o mapa procedural — é o que permite o A/B.
   RÉGUA: POLY6 em `tools/eval/poly-check.mjs` (mutante `proxy-vivo`). ─────────────── */
const NODE_RUNTIME = typeof process !== 'undefined' && Boolean(process.versions?.node);
/* Sobrescrita de ambiente: o arnês É node, então o caminho do BROWSER só é alcançável
   forçando-o. Mesmo papel do `registerFaunaTemplate` (:522) — costura de régua, não de
   jogo; o jogo nunca chama isto. */
let faunaRuntime = null;
export function setFaunaRuntime(env) {
  faunaRuntime = env ? { node: !!env.node, search: env.search || '' } : null;
}
export function faunaProxyAllowed() {
  if (faunaRuntime ? faunaRuntime.node : NODE_RUNTIME) return true;
  const search = faunaRuntime ? faunaRuntime.search : (typeof location !== 'undefined' ? location.search : '');
  return new URLSearchParams(search || '').get('fauna') === 'proxy';
}

function fallbackRat(index) {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x5f5044 : 0x4b4a48, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xa27672, roughness: .95 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.065, 9, 6), fur);
  body.scale.set(.5, .43, 1.12); body.position.y = .01; body.userData.faunaPart = 'body'; group.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(.038, .085, 8), fur);
  head.rotation.x = -Math.PI / 2; head.position.set(0, .01, .088); head.userData.faunaPart = 'head'; group.add(head);
  for (const x of [-.026, .026]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.021, 7, 5), skin);
    ear.scale.set(1, .36, 1); ear.position.set(x, .052, .066); ear.userData.faunaPart = 'ear'; group.add(ear);
  }
  for (const [x, z] of [[-.035, -.04], [.035, -.04], [-.032, .045], [.032, .045]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.0065, .010, .036, 6), fur);
    leg.rotation.z = x < 0 ? .18 : -.18; leg.position.set(x, -.033, z); leg.userData.faunaPart = 'leg'; group.add(leg);
  }
  const points = [[0, -.01, -.06], [.035, -.018, -.11], [.06, -.01, -.16], [.025, 0, -.205]];
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3(points.slice(i, i + 2).map((point) => new THREE.Vector3(...point)));
    const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 3, [.0065, .0045, .0025][i], 4), skin);
    tail.userData.faunaPart = 'curved-tail'; group.add(tail);
  }
  for (const child of group.children) child.position.y += .052;
  return group;
}

function fallbackPigeon() {
  const group = new THREE.Group();
  const feather = new THREE.MeshStandardMaterial({ color: 0x657078, roughness: .92 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.13, 9, 7), feather);
  body.scale.set(.72, 1.1, 1.35); body.position.y = .17; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 6), feather);
  head.position.set(0, .32, .11); group.add(head);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(.11, .3, 5), feather);
    wing.rotation.z = side * 1.05; wing.position.set(side * .15, .19, 0); group.add(wing);
  }
  return group;
}

function fallbackDog() {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: .95 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe4c59a, roughness: .95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.22, .26, .62), fur);
  body.position.y = .46; group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .22), fur);
  head.position.set(0, .66, .4); group.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(.11, .1, .14), cream);
  snout.position.set(0, .62, .55); group.add(snout);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.05, .11, 4), fur);
    ear.position.set(side * .07, .8, .36); group.add(ear);
  }
  for (const [x, z] of [[-.08, .24], [.08, .24], [-.08, -.24], [.08, -.24]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.028, .024, .34, 6), fur);
    leg.position.set(x, .17, z); group.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.02, .012, .3, 5), fur);
  tail.rotation.x = -.8; tail.position.set(0, .62, -.38); group.add(tail);
  return group;
}

function fallbackArmadillo() {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x8a7d6b, roughness: .9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc9a08e, roughness: .95 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 7), shell);
  body.scale.set(.75, .62, 1.15); body.position.y = .13; group.add(body);
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.105, .014, 5, 10), shell);
    band.rotation.y = Math.PI / 2; band.scale.set(1, 1, 1.4); band.position.set(0, .13, -.06 + i * .045); group.add(band);
  }
  const head = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 7), skin);
  head.rotation.x = -Math.PI / 2; head.position.set(0, .11, .24); group.add(head);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.008, .02, .2, 5), skin);
  tail.rotation.x = Math.PI / 2 - .25; tail.position.set(0, .08, -.25); group.add(tail);
  return group;
}

function fallbackCockroach() {
  const group = new THREE.Group();
  const chitin = new THREE.MeshStandardMaterial({ color: 0x5a2e18, roughness: .55 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.05, 9, 6), chitin);
  body.scale.set(.72, .3, 1.25); body.position.y = .02; group.add(body);
  for (const side of [-1, 1]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, .09, 3), chitin);
    ant.rotation.set(Math.PI / 2 - .3, 0, side * .35); ant.position.set(side * .015, .035, .07); group.add(ant);
  }
  return group;
}

function fallbackParrot() {
  const group = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: 0x3f9142, roughness: .85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.085, 9, 7), green);
  body.scale.set(.8, 1.25, .8); body.position.y = .22; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.052, 8, 6), green);
  head.position.set(0, .37, .02); head.userData.faunaPart = 'head'; group.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.022, .05, 6), new THREE.MeshStandardMaterial({ color: 0xd97b2f, roughness: .7 }));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, .36, .07); group.add(beak);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.045, .22, .02), green);
  tail.rotation.x = .5; tail.position.set(0, .06, -.1); group.add(tail);
  return group;
}

function cloneAsset(id) {  const template = templates.get(id);
  if (!template) return null;
  return {
    model: template.skinned ? skeletonClone(template.scene) : template.scene.clone(true),
    clips: template.clips,
  };
}

/* FRENTE DO MODELO → +Z. É a convenção de `rotation.y = Math.atan2(dx, dz)`, que o
   controlador usa em TODO bicho que anda, e a mesma de `corrego-contract-check.mjs:78`.
   Medida por raster ortográfico do GLB SERVIDO (sonda em /tmp sobre @gltf-transform, e para
   os skinned pela pose que o próprio three monta com `applyBoneTransform`):
     focinho/bico em +X → yaw −π/2   ·   em −X → yaw +π/2   ·   em +Z → 0
   CONFERIDA em dois bichos revisados com figura in-game: cachorro e gato apontam +Z
   nativos e não têm correção — é o que fecha a convenção.
   CORREÇÃO DE 14/09: rato e tatu apontam −X (não +X) e estavam com −π/2, que leva a frente
   para −Z: os dois andavam DE COSTAS desde que entraram (rato em 17 mapas, tatu em 2).
   Figuras: /tmp/faunaprobe/rat_posed.png e /tmp/faunaprobe/tatu_2v.png. */
const YAW_FIX = Object.freeze({
  rat: Math.PI / 2, armadillo: Math.PI / 2,
  hen: -Math.PI / 2, guinea: -Math.PI / 2, carcara: -Math.PI / 2,
  duck: Math.PI / 2,
  /* pinto, cavalo e cabra já saíram do Mint com o focinho em +Z (yaw 0) */
});

function normalizeModel(id, model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  /* alvo em metros de mundo: altura para bichos que andam de lado pro jogador,
     comprimento para rato (silhueta deitada). Vaca 1,75 / gato 0,48 / galinha 0,5.
     vida 2 — os 7 GLB novos vêm do Mint normalizados em cubo unitário, então o alvo é a
     ÚNICA coisa que dá tamanho ao bicho. Escolhido pelo bicho real e conferido pela razão
     do bbox medido (sonda de raster em /tmp, 14/09): galinha 0,45 de altura → 0,38 de
     comprimento; pinto 0,14; capote 0,50; pato 0,40 de altura → 0,62 do bico à cauda
     (marreco de verdade: 0,50-0,65); cavalo 1,55 na cernelha → 2,50 de comprimento;
     cabra 0,75 → 0,89; carcará 0,55 → 0,62 (caracará real: 0,50-0,65). */
  const target = { rat: .36, pigeonGround: .29, dog: 1, cat: .48, chicken: .5, cow: 1.75, armadillo: .55, cockroach: .14, parrot: .34,
    hen: .45, chick: .14, guinea: .5, duck: .4, horse: 1.55, goat: .75, carcara: .55 }[id] || .5;
  const dimension = ['rat', 'armadillo', 'cockroach'].includes(id) ? Math.max(size.x, size.z) : size.y;
  const scale = target / Math.max(.001, dimension);
  // dog: altura 1 m => cernelha ~0,6 (ombro 1,83 de 3,09 de altura no GLB bruto)
  const center = box.getCenter(new THREE.Vector3());
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  model.rotation.y = YAW_FIX[id] || 0;
}

function distanceToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq < 1e-6) return point.distanceTo(start);
  const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, t));
}

class FavelaAmbience {
  constructor(root, options) {
    const { map, low = false } = options;
    this.map = map;
    this.low = low;
    this.time = 0;
    this.paused = false;
    this.ready = true;
    this.group = new THREE.Group();
    this.group.name = `AMBIENT_LIFE_${map}`;
    this.group.userData.ambientLife = true;
    root.add(this.group);
    /* nomes dos bichos que o fail-closed engoliu (sem GLB, no browser) — o construtor
       avisa uma vez e o número fica em `group.userData.faunaFailClosed`. */
    this.faunaDropped = [];
    this.animals = [];
    /* uma linha por ESPÉCIE saía do controle com 16 tipos (eram 9 declarações × 3 lugares:
       destructuring, corte do LOWQ e forEach). A fonte da verdade agora é o TYPE_OPTION. */
    for (const type of FAUNA_TYPES) {
      const list = options[TYPE_OPTION[type]] || [];
      (low ? list.slice(0, 1) : list).forEach((config, index) => this._add(type, config, index));
    }
    if (this.faunaDropped.length) {
      this.group.userData.faunaFailClosed = this.faunaDropped.length;
      /* Não saber custa o mesmo que estar errado: fauna que não nasce APARECE no console,
         senão "o mapa não tem bicho" volta a ser mistério. */
      console.warn(`[ambientlife] ${this.faunaDropped.length} bicho(s) não nasceram em ${map}:`
        + ` o GLB não carregou e o proxy procedural está desligado no browser (fail-closed,`
        + ` RELATORIO-LOWPOLY §2.3) — ${this.faunaDropped.join(', ')}. \`?fauna=proxy\` devolve o proxy.`);
    }
    this.reset();
  }

  _add(type, config, index) {
    if (type === 'pigeon' && config.mode === 'flight') {
      /* v2.1 (BUG-57): pombo não voa mais — o GLB de voo era estático com asas abertas
         (dono: "deveria ficar so na ponta das lajes ou no chao"). Config não migrada cai
         no chão/laje mantendo o y do config: pomba pousada, não pendurada no céu. */
      if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'))
        console.warn('[ambientlife] mode "flight" depreciado na v2.1 — pombo anda; migre o config para ground (BUG-57)');
    }
    const assetId = TYPE_ASSET[type] || 'pigeonGround';
    const loaded = cloneAsset(assetId);
    const animalRoot = new THREE.Group();
    animalRoot.name = `${type}:${this.map}:${index}`;
    animalRoot.userData.fauna = FAUNA_NAME[type] || 'pomba';
    animalRoot.userData.nonCollider = true;
    animalRoot.userData.motion = 'deterministic-run-idle';
    animalRoot.userData.bodyLength = type === 'rat' ? .142 : undefined;
    animalRoot.userData.bodyAspect = type === 'rat' ? 2.05 : undefined;
    animalRoot.userData.taperedTail = type === 'rat' || undefined;
    animalRoot.userData.poseId = `${type}-${index % 2}`;
    animalRoot.userData.albedoId = `${type}-${index % 2}`;
    let model;
    if (loaded) {
      model = loaded.model;
      normalizeModel(assetId, model);
      animalRoot.add(model);
    } else if (faunaProxyAllowed()) {
      model = type === 'rat' ? fallbackRat(index) : type === 'dog' ? fallbackDog()
        : type === 'armadillo' ? fallbackArmadillo() : type === 'cockroach' ? fallbackCockroach()
        : type === 'parrot' ? fallbackParrot() : fallbackPigeon();
      while (model.children.length) animalRoot.add(model.children[0]);
      model = animalRoot;
    } else {
      /* FAIL-CLOSED: nada entra em `this.group` nem em `this.animals` — o bicho não
         existe neste quadro. O `animalRoot` criado acima é descartado pelo GC. */
      this.faunaDropped.push(FAUNA_NAME[type] || type);
      return;
    }
    animalRoot.traverse((object) => {
      if (!object.isMesh) return;
      object.userData.nonSolidSurface = true;
      object.castShadow = !this.low;
      object.receiveShadow = true;
    });
    this.group.add(animalRoot);
    const clips = loaded?.clips || [];
    let mixer = null;
    let actions = null;
    if (QUADS.has(type) && clips.length) {
      // clipes Quaternius vêm como 'AnimalArmature|Idle'; casa por sufixo, cai no primeiro
      mixer = new THREE.AnimationMixer(model);
      actions = {};
      for (const [key, pattern] of [['idle', /(^|\|)Idle$/], ['walk', /(^|\|)Walk$/], ['run', /(^|\|)(Run|Gallop)$/]]) {
        const clip = clips.find((item) => pattern.test(item.name))
          || (key === 'run' ? clips.find((item) => /(^|\|)Walk$/.test(item.name)) : clips[0]);
        actions[key] = mixer.clipAction(clip);
      }
      actions.idle.play();
    } else if (!QUADS.has(type)) {
      const clip = clips.find((item) => item.name === (type === 'rat' ? 'Run' : 'Animation')) || clips[0];
      if (clip) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(clip).play();
      }
    }
    const origin = new THREE.Vector3(...config.pos);
    const to = new THREE.Vector3(...(config.to || config.pos));
    this.animals.push({
      id: `${type}-${index}`, type, mode: type === 'pigeon' ? 'ground' : (config.mode || 'ground'), root: animalRoot, model,
      origin, to, phase: config.phase || 0, radius: config.radius || [2.4, 1.8],
      source: loaded ? 'gltf' : 'fallback', mixer, actions, action: 'idle', state: 'idle', alertUntil: 0,
      alertAt: 0, alertOrigin: origin.clone(), flee: new THREE.Vector3(1, 0, 0),
      routine: origin.clone(), recoverAt: 0, recoverUntil: 0, recoverFrom: origin.clone(),
    });
  }

  setPaused(value) { this.paused = !!value; }

  reset() {
    this.time = 0;
    for (const animal of this.animals) {
      animal.alertUntil = 0;
      animal.alertAt = 0;
      animal.recoverAt = 0;
      animal.recoverUntil = .8;
      animal.recoverFrom.copy(animal.origin);
      animal.state = 'idle';
      animal.root.position.copy(animal.origin);
      animal.root.rotation.set(0, animal.phase, 0);
      if (animal.actions) {
        animal.mixer.stopAllAction();
        animal.actions.idle.reset().play();
        animal.action = 'idle';
      }
      animal.mixer?.setTime(0);
    }
  }

  onShot(start, end) {
    let reacted = 0;
    for (const animal of this.animals) {
      const position = animal.root.getWorldPosition(new THREE.Vector3());
      if (distanceToSegment(position, start, end) > SHOT_REACTION_RADIUS) continue;
      animal.alertAt = this.time;
      animal.alertUntil = this.time + (ALERT_TIME[animal.type] || 3.2);
      animal.recoverAt = 0;
      animal.recoverUntil = 0;
      animal.alertOrigin.copy(animal.root.position);
      animal.flee.copy(position).sub(start).setY(0);
      if (animal.flee.lengthSq() < .01) animal.flee.set(Math.sin(animal.phase + 1), 0, Math.cos(animal.phase + 1));
      animal.flee.normalize();
      /* pombo foge a pé pela superfície onde nasceu (v2.1: sem takeoff/flight) */
      animal.state = 'flee';
      reacted++;
    }
    return reacted;
  }

  update(dt, playerPosition) {
    this.time += Math.max(0, Math.min(.05, dt));
    for (const animal of this.animals) {
      if (playerPosition && this.time >= animal.alertUntil && animal.root.position.distanceToSquared(playerPosition) < 4.84) {
        const from = new THREE.Vector3(playerPosition.x, animal.root.position.y, playerPosition.z);
        this.onShot(from, animal.root.position.clone());
      }
      if (animal.type === 'rat' || animal.type === 'cockroach') this._updateRat(animal, dt);
      else if (animal.type === 'pigeon') this._updatePigeon(animal, dt);
      else if (PERCHED.has(animal.type)) this._updatePerched(animal, dt);
      else this._updateQuad(animal, dt);
      animal.mixer?.update(dt);
    }
  }

  _updateRat(animal) {
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, Math.min(2.7, elapsed * 2.05));
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z);
      animal.state = 'flee';
      return;
    }
    const cycle = (this.time + animal.phase) % 5;
    const moving = cycle < 3.2;
    const t = moving ? .5 - .5 * Math.cos(cycle / 3.2 * Math.PI * 2) : 0;
    animal.routine.lerpVectors(animal.origin, animal.to, t);
    const recovering = this._recoverToRoute(animal, animal.routine, 1.6);
    const direction = animal.to.clone().sub(animal.origin);
    if (cycle > 1.6) direction.negate();
    if (direction.lengthSq() > .001) animal.root.rotation.y = Math.atan2(direction.x, direction.z);
    animal.state = recovering ? 'recover' : moving ? 'run' : 'idle';
  }

  _dogAction(animal, name) {
    if (!animal.actions || animal.action === name) return;
    animal.actions[name].reset().crossFadeFrom(animal.actions[animal.action], .25, false).play();
    animal.action = name;
  }

  _updateQuad(animal) {
    const speed = QUAD_SPEED[animal.type] || QUAD_SPEED.dog;
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, Math.min(speed.flee * 1.4, elapsed * speed.flee));
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z);
      animal.state = 'flee';
      this._dogAction(animal, 'run');
      return;
    }
    const span = animal.origin.distanceTo(animal.to);
    const leg = span / speed.walk;
    const cycle = (this.time + animal.phase) % (2 * (DOG_IDLE_TIME + leg));
    let moving = false;
    let direction = null;
    if (cycle < DOG_IDLE_TIME) animal.routine.copy(animal.origin);
    else if (cycle < DOG_IDLE_TIME + leg) {
      animal.routine.lerpVectors(animal.origin, animal.to, (cycle - DOG_IDLE_TIME) / leg);
      moving = span > .05;
      direction = animal.to.clone().sub(animal.origin);
    } else if (cycle < 2 * DOG_IDLE_TIME + leg) animal.routine.copy(animal.to);
    else {
      animal.routine.lerpVectors(animal.to, animal.origin, (cycle - 2 * DOG_IDLE_TIME - leg) / leg);
      moving = span > .05;
      direction = animal.origin.clone().sub(animal.to);
    }
    const recovering = this._recoverToRoute(animal, animal.routine, 2);
    if (direction && direction.lengthSq() > .001) animal.root.rotation.y = Math.atan2(direction.x, direction.z);
    animal.state = recovering ? 'recover' : moving ? 'walk' : 'idle';
    this._dogAction(animal, recovering || moving ? 'walk' : 'idle');
  }

  _updatePigeon(animal) {
    /* v2.1 (BUG-57): pombo não voa — anda no chão e pousa na ponta das lajes. O GLB de
       voo (estático, asas abertas) saiu do acervo; alerta foge a pé na própria superfície. */
    if (this.time < animal.alertUntil) {
      const elapsed = this.time - animal.alertAt;
      animal.root.position.copy(animal.alertOrigin).addScaledVector(animal.flee, Math.min(1.4, elapsed * 2.6));
      animal.root.position.y = animal.alertOrigin.y;
      animal.root.rotation.y = Math.atan2(animal.flee.x, animal.flee.z);
      animal.state = 'flee';
      return;
    }
    const angle = (this.time * .38 + animal.phase) * Math.PI * 2;
    animal.routine.set(animal.origin.x + Math.sin(angle) * .18, animal.origin.y, animal.origin.z + Math.cos(angle) * .12);
    const recovering = this._recoverToRoute(animal, animal.routine, 2.2);
    animal.root.rotation.y = angle + Math.PI / 2;
    animal.state = recovering ? 'recover' : 'walk';
  }

  _updatePerched(animal) {
    /* POLEIRO (plans/22 · vida 2): não voa e NÃO ANDA; vida = balanço procedural e
       tiro perto = tremida rápida sem sair do poleiro. É o comportamento honesto para GLB
       estático de ave — carcará deslizando pelo chão seria o defeito, não a solução. */
    const t = this.time + animal.phase * 3;
    if (this.time < animal.alertUntil) {
      animal.root.rotation.z = Math.sin(t * 34) * .1;
      animal.root.position.y = animal.origin.y + Math.abs(Math.sin(t * 22)) * .03;
      animal.state = 'flee';
      return;
    }
    /* rapina pousada balança bem menos que papagaio em poleiro de gaiola */
    const sway = PERCH_SWAY[animal.type] ?? .055;
    animal.root.rotation.z = Math.sin(t * .9) * sway;
    animal.root.rotation.x = Math.sin(t * .63 + 1) * sway * .64;
    animal.root.position.y = animal.origin.y;
    /* virada de cabeça em degrau: 4 s por rumo, interpolação curta entre eles */
    const rumo = Math.floor(t / 4) % 3 - 1;
    const alvo = animal.phase + rumo * .9;
    const k = Math.min(1, (t % 4) / .6);
    animal.root.rotation.y = animal.root.rotation.y + (alvo - animal.root.rotation.y) * k * .3;
    animal.state = 'idle';
  }

  _recoverToRoute(animal, target, duration) {
    if (animal.alertUntil > 0 && this.time >= animal.alertUntil && animal.recoverUntil === 0) {
      animal.recoverAt = this.time;
      animal.recoverUntil = this.time + duration;
      animal.recoverFrom.copy(animal.root.position);
    }
    if (animal.recoverUntil > this.time) {
      const progress = THREE.MathUtils.smoothstep(this.time, animal.recoverAt, animal.recoverUntil);
      animal.root.position.lerpVectors(animal.recoverFrom, target, progress);
      return true;
    }
    animal.root.position.copy(target);
    if (animal.recoverUntil > 0) {
      animal.alertUntil = 0;
      animal.recoverUntil = 0;
    }
    return false;
  }

  snapshot() {
    return this.animals.map((animal) => ({
      id: animal.id, type: animal.type, state: animal.state,
      x: +animal.root.position.x.toFixed(4), y: +animal.root.position.y.toFixed(4), z: +animal.root.position.z.toFixed(4),
      clipTime: +(animal.mixer?.time || 0).toFixed(4),
    }));
  }

  report() {
    let meshes = 0, triangles = 0;
    for (const animal of this.animals) animal.root.traverse((object) => {
      if (!object.isMesh || !object.geometry) return;
      meshes++;
      const geometry = object.geometry;
      triangles += (geometry.index?.count || geometry.attributes.position?.count || 0) / 3;
    });
    /* toda espécie de FAUNA_TYPES tem chave, mesmo zerada: a AM6 lê `counts.rat` e
       `counts.pigeon` direto, e chave que some vira `undefined >= 1` silencioso. */
    const counts = { total: this.animals.length };
    for (const type of FAUNA_TYPES) counts[type] = 0;
    for (const animal of this.animals) counts[animal.type]++;
    return {
      map: this.map, low: this.low, gltf: this.animals.length > 0 && this.animals.every((animal) => animal.source === 'gltf'),
      counts, meshes, triangles: Math.round(triangles),
    };
  }

  dispose() {
    for (const animal of this.animals) animal.mixer?.stopAllAction();
    this.group.removeFromParent();
  }
}

export function createFavelaAmbience(root, options) {
  return new FavelaAmbience(root, options);
}

/* FAUNA ESTÁTICA POSICIONÁVEL (BUG-57, região append-only): GLB sem rig, escala por
   comprimento (plans/21-FAUNA-CORREGO.md); yawFix medido em tools/eval/asset-evidence/fauna/. */
const STATIC_FAUNA_META = {
  jacare: { len: 1.8, yawFix: Math.PI / 2 },
  capivara: { len: 1.0, yawFix: 0 },
};

export function registerFaunaTemplate(id, scene, meta = {}) {
  if (!scene) { templates.delete(id); return; }
  const base = STATIC_FAUNA_META[id] || {};
  templates.set(id, { scene, clips: [], skinned: false, meta: { ...base, ...meta } });
}

export function faunaAssetUrl(id) { return ASSETS[id] || null; }

export const CORREGO_FAUNA_ASSETS = Object.freeze([
  ...FAVELA_AMBIENCE_ASSETS, 'jacare', 'capivara',
]);

// Retorna o Group clonado na base `y` (com `submerge` m afundados) ou null sem
// template — o caller decide o fallback procedural.
export function placeFauna(id, { x = 0, y = 0, z = 0, ry = 0, targetLen, submerge = 0 } = {}) {
  const template = templates.get(id);
  if (!template) return null;
  const model = template.scene.clone(true);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const alvo = targetLen || template.meta?.len;
  const len = Math.max(size.x, size.z) || 1;
  const s = (alvo && alvo > 0) ? alvo / len : 1;
  model.scale.setScalar(s);
  const yawFix = template.meta?.yawFix || 0;
  const root = new THREE.Group();
  root.position.set(x, y - box.min.y * s - submerge, z);
  root.rotation.y = ry + yawFix;
  root.userData.faunaAsset = id;
  root.userData.source = 'gltf';
  root.add(model);
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.userData.nonSolidSurface = true;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return root;
}
