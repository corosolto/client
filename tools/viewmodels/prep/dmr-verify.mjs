#!/usr/bin/env node
// Régua de runtime das candidatas DMR (lane vm-dmr-final).
// Carrega o GLB baked com o MESMO three/GLTFLoader do jogo (public/vendor),
// sem browser e sem npm, e verifica o contrato + o MECANISMO por arma:
//   Rem700: ferrolho excursiona no shoot; clipes bolt_loop presentes.
//   G3SG1:  carregador excursiona na recarga; SEM clipe de ferrolho.
// Mutantes (Lições 3 e 8): cada verificação é reexecutada contra uma cópia
// mutada e precisa REPROVAR; mutação que não aplica derruba o gate.
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Shim de browser mínimo (mesma família do tools/eval/harness.mjs). A textura
// vira uma imagem 1x1: esta régua mede GEOMETRIA/clipes/contrato, não texel —
// sem este settle o parseAsync morre pendurado e o node sai 0 silencioso.
globalThis.Image = class {
  constructor() { this.onload = null; this.onerror = null; this.width = 1; this.height = 1; }
  set src(v) { this._src = v; queueMicrotask(() => { if (this.onload) this.onload(); }); }
  get src() { return this._src || ''; }
};
globalThis.self = globalThis;
globalThis.ImageData = class { constructor(d, w, h) { this.data = d; this.width = w; this.height = h; } };
// O Node não decodifica os blob: de imagem do GLTFLoader. A cadeia de
// material/imagem é validada diretamente no JSON abaixo; silencia apenas esse
// aviso repetitivo para manter o recibo do gate pequeno.
const warnOriginal = console.warn;
const errorOriginal = console.error;
console.warn = (...args) => {
  if (String(args[0] || '').startsWith("THREE.GLTFLoader: Couldn't load texture blob:")) return;
  warnOriginal(...args);
};
console.error = (...args) => {
  if (String(args[0] || '') === "THREE.GLTFLoader: Couldn't load texture") return;
  errorOriginal(...args);
};

const ROOT = new URL('../../..', import.meta.url).pathname;
const ALVO = process.argv[2] || '';
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'tools/viewmodels/dmr-candidates.json'), 'utf8'));
const ARSENAL = {
  rem700: {
    glb: path.join(ASSET_ROOT, manifest.candidates.rem700.file),
    sha256: manifest.candidates.rem700.sha256,
    len: 1.15,
    clipes: ['idle', 'shoot', 'reload_start', 'reload_loop', 'reload_end', 'reload_empty', 'inspect'],
    mecanismo: 'bolt',
    material: 'rem700 Material',
    imagemCor: 'Color_a6cfeee8-6ed7-47e5-9a2c-4228c5baa77e',
    // Centro e eixo do corpo na pose de referência do assembly Blender.
    // O splice precisa reproduzi-los quando o runtime aplica idle@t0.
    referenciaIdle: { centro: [0.0149, 1.6107, 0.1765], eixoMaior: 2, tolerancia: 0.08 },
    mecanismos: [{ parte: 'MINT_BOLT_REM700', clipe: 'shoot', min: 0.03, maxVerts: 2000 }],
    acoes: [{ nome: 'inspect', no: 'RIG_FP_ARMS', min: 0.05, endpoint: 0.005 }],
    contato: { dedoMm: 8, polegarMm: 16 },
  },
  g3sg1: {
    glb: path.join(ASSET_ROOT, manifest.candidates.g3sg1.file),
    sha256: manifest.candidates.g3sg1.sha256,
    len: 1.12,
    clipes: ['idle', 'shoot', 'reload_tactical', 'reload_empty', 'inspect'],
    mecanismo: 'mag',
    material: 'Matte Scope Marksman Material',
    imagemCor: 'Color_edb9974f-fbad-42fd-b4fd-c91f1c470759',
    referenciaIdle: { centro: [-0.0496, 1.5352, 0.3408], eixoMaior: 2, tolerancia: 0.08 },
    mecanismos: [
      { parte: 'MINT_MAG_G3SG1', clipe: 'reload_tactical', min: 0.08, maxVerts: 800 },
      // alavanca de armar (HK slap no fim do reload_empty)
      { parte: 'MINT_ALAVANCA_G3SG1', clipe: 'reload_empty', min: 0.008, maxVerts: 400 },
    ],
    proibidos: ['reload_start', 'reload_loop', 'reload_end'],
    acoes: [
      { nome: 'shoot', no: 'RIG_FP_ARMS', min: 0.02, endpoint: 0.005 },
      { nome: 'inspect', no: 'RIG_FP_ARMS', min: 0.05, endpoint: 0.005 },
    ],
  },
};

const DEDOS = {
  indicador: ['index_01_', 'index_02_', 'index_03_'],
  medio: ['middle_01_', 'middle_02_', 'middle_03_'],
  anelar: ['ring_01_', 'ring_02_', 'ring_03_'],
  minimo: ['pinky_01_', 'pinky_02_', 'pinky_03_'],
  polegar: ['thumb_01_', 'thumb_02_', 'thumb_03_'],
};

const falhas = [];
const check = (cond, msg) => {
  if (!cond) falhas.push(msg);
  return cond;
};

async function parseGlb(caminho) {
  const dados = readFileSync(caminho);
  const loader = new GLTFLoader();
  const buf = dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength);
  return loader.parseAsync(buf, '');
}

function parseGlbJson(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('arquivo não é GLB');
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).trimEnd());
}

function inspecionaRecursos(doc, cfg, arma) {
  const mat = (doc.materials || []).find((m) => m.name === cfg.material);
  check(!!mat, `${arma}: material próprio ${cfg.material} ausente`);
  const info = mat?.pbrMetallicRoughness?.baseColorTexture;
  check(Number.isInteger(info?.index), `${arma}: baseColorTexture própria ausente`);
  check(Number.isInteger(mat?.normalTexture?.index), `${arma}: normalTexture própria ausente`);
  check(Number.isInteger(mat?.pbrMetallicRoughness?.metallicRoughnessTexture?.index),
    `${arma}: metallicRoughnessTexture própria ausente`);
  if (Number.isInteger(info?.index)) {
    const tex = doc.textures?.[info.index];
    const source = tex?.extensions?.EXT_texture_webp?.source ?? tex?.source;
    const image = Number.isInteger(source) ? doc.images?.[source] : null;
    check(!!image && image.name === cfg.imagemCor,
      `${arma}: imagem de cor própria ausente ou índice cruzado (${image?.name || 'nenhuma'})`);
  }
}

function medeContatoDedos(cena, malhasArma) {
  const triangulos = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const mesh of malhasArma.filter((item) => /^MINT_/.test(item.name || ''))) {
    const pos = mesh.geometry?.attributes?.position;
    if (!pos) continue;
    const index = mesh.geometry.index;
    const total = index ? index.count : pos.count;
    for (let i = 0; i + 2 < total; i += 3) {
      const at = (offset, out) => {
        const vi = index ? index.getX(i + offset) : i + offset;
        return out.fromBufferAttribute(pos, vi).applyMatrix4(mesh.matrixWorld).clone();
      };
      triangulos.push(new THREE.Triangle(at(0, a), at(1, b), at(2, c)));
    }
  }
  if (!triangulos.length) throw new Error('contato: triângulos MINT ausentes');

  const pontos = new Map();
  cena.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!mats.some((material) => /CoroSolto_(FP_(Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i.test(material?.name || ''))) return;
    const pos = mesh.geometry?.attributes?.position;
    const indices = mesh.geometry?.attributes?.skinIndex;
    const pesos = mesh.geometry?.attributes?.skinWeight;
    if (!pos || !indices || !pesos) return;
    mesh.skeleton.update();
    const boneNames = mesh.skeleton.bones.map((bone) => bone.name || '');
    for (let vi = 0; vi < pos.count; vi += 1) {
      const slots = [
        [indices.getX(vi), pesos.getX(vi)], [indices.getY(vi), pesos.getY(vi)],
        [indices.getZ(vi), pesos.getZ(vi)], [indices.getW(vi), pesos.getW(vi)],
      ];
      const dominante = slots.find(([, peso]) => peso > 0.55);
      if (!dominante) continue;
      const boneName = boneNames[dominante[0]] || '';
      let chave = '';
      for (const [dedo, ossos] of Object.entries(DEDOS)) {
        for (const lado of ['r', 'l']) {
          if (ossos.some((osso) => boneName === `${osso}${lado}`)) chave = `${dedo}_${lado}`;
        }
      }
      if (!chave) continue;
      const ponto = new THREE.Vector3().fromBufferAttribute(pos, vi);
      mesh.applyBoneTransform(vi, ponto);
      ponto.applyMatrix4(mesh.matrixWorld);
      if (!pontos.has(chave)) pontos.set(chave, []);
      pontos.get(chave).push(ponto);
    }
  });

  const perto = new THREE.Vector3();
  const tabela = {};
  const vetores = {};
  for (const [chave, vertices] of pontos) {
    let melhor = Infinity;
    let melhorVetor = new THREE.Vector3();
    for (const ponto of vertices) {
      for (const tri of triangulos) {
        tri.closestPointToPoint(ponto, perto);
        const distancia = perto.distanceTo(ponto);
        if (distancia < melhor) {
          melhor = distancia;
          melhorVetor = perto.clone().sub(ponto);
        }
      }
    }
    tabela[chave] = +(melhor * 1000).toFixed(2);
    vetores[chave] = melhorVetor.multiplyScalar(1000).toArray().map((value) => +value.toFixed(2));
  }
  return { tabela, vetores };
}

function inspeciona(gltf, cfg, arma) {
  const falhasAntes = falhas.length;
  const cena = gltf.scene;
  cena.updateMatrixWorld(true);
  const nomes = new Set();
  cena.traverse((o) => nomes.add(o.name));

  // contrato estrutural
  check(nomes.has(`MINT_WEAPON_${arma.toUpperCase()}`), `${arma}: nó MINT_WEAPON ausente`);
  check(nomes.has('SOCKET_MINT_MUZZLE'), `${arma}: SOCKET_MINT_MUZZLE ausente`);
  check(nomes.has('SOCKET_MINT_SIGHT'), `${arma}: SOCKET_MINT_SIGHT ausente`);
  let camera = null;
  cena.traverse((o) => { if (!camera && o.isPerspectiveCamera) camera = o; });
  check(!!camera, `${arma}: câmera VIEWMODEL ausente`);
  const cameraInverse = camera?.matrixWorld.clone().invert() || null;
  if (camera) {
    check(Math.abs(camera.fov - 80) < 0.5, `${arma}: fov da câmera ${camera.fov} ≠ 80`);
  }
  const maoMateriais = [];
  const malhasArma = [];
  let verts = 0;
  cena.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    verts += o.geometry.attributes.position.count;
    for (const m of mats) {
      if (m && /CoroSolto_(FP_(Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i.test(m.name)) maoMateriais.push(m.name);
    }
    if (!mats.some((m) => m && /CoroSolto_(FP_(Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i.test(m.name))) {
      malhasArma.push(o);
    }
  });
  check(maoMateriais.length >= 3, `${arma}: materiais de mão insuficientes (${[...new Set(maoMateriais)]})`);

  // clipes
  const clipes = new Map(gltf.animations.map((a) => [a.name, a]));
  for (const nome of cfg.clipes) {
    check(clipes.has(nome), `${arma}: clipe ${nome} ausente (há ${[...clipes.keys()]})`);
  }
  for (const nome of cfg.proibidos || []) {
    check(!clipes.has(nome), `${arma}: clipe ${nome} PROIBIDO presente (mecanismo ${cfg.mecanismo})`);
  }

  // Todas as medidas espaciais usam a pose que o runtime aplica ao equipar.
  const idle = clipes.get('idle');
  if (idle) {
    const mixer = new THREE.AnimationMixer(cena);
    mixer.clipAction(idle).play();
    mixer.setTime(0);
    cena.updateMatrixWorld(true);
  }
  const resultado = { mecanismos: [], acoes: [] };

  if (!gltf.userData?.skipContact && cfg.contato) {
    const mutante = gltf.userData?.contactMutant;
    if (mutante) {
      const hand = cena.getObjectByName(mutante === 'left' ? 'hand_l' : 'hand_r');
      if (!hand) throw new Error(`mutação de contato sem ${mutante}`);
      hand.position.x += 20;
      hand.position.y += 20;
      hand.position.z += 20;
      cena.updateMatrixWorld(true);
    }
    const contato = medeContatoDedos(cena, malhasArma);
    const tabela = contato.tabela;
    for (const [chave, mm] of Object.entries(tabela)) {
      const max = chave.startsWith('polegar_') ? cfg.contato.polegarMm : cfg.contato.dedoMm;
      check(mm <= max, `${arma}: contato ${chave} ${mm.toFixed(1)} mm (> ${max} mm)`);
    }
    check(Object.keys(tabela).length === 10, `${arma}: contato mediu ${Object.keys(tabela).length}/10 dedos`);
    resultado.contatoIdleMm = tabela;
    resultado.contatoVetoresMm = contato.vetores;
    const handL = cena.getObjectByName('hand_l');
    const apoio = Object.entries(contato.vetores)
      .filter(([chave]) => chave.endsWith('_l') && !chave.startsWith('polegar_'))
      .map(([, vetor]) => new THREE.Vector3(...vetor).multiplyScalar(0.001));
    if (handL?.parent && apoio.length) {
      const mundo = apoio.reduce((sum, vetor) => sum.add(vetor), new THREE.Vector3()).multiplyScalar(1 / apoio.length);
      const paiLinearInv = new THREE.Matrix3().setFromMatrix4(handL.parent.matrixWorld).invert();
      resultado.contatoCorrecaoLocal = mundo.clone().applyMatrix3(paiLinearInv)
        .toArray().map((value) => +value.toFixed(4));
    }
  }

  // Ação autorada: mede o root do rig em mundo para provar leitura/recuo e
  // retorno à pose inicial. Só a presença nominal do clipe não basta.
  for (const acao of cfg.acoes || []) {
    const alvo = cena.getObjectByName(acao.no);
    const clipe = clipes.get(acao.nome);
    if (!check(Boolean(alvo && clipe), `${arma}: ação ${acao.nome} sem ${acao.no}/clipe`)) continue;
    const mixer = new THREE.AnimationMixer(cena);
    mixer.clipAction(clipe).reset().play();
    const pontos = [];
    for (let i = 0; i <= 40; i += 1) {
      mixer.setTime(clipe.duration * i / 40);
      cena.updateMatrixWorld(true);
      pontos.push(alvo.getWorldPosition(new THREE.Vector3()));
    }
    const excursao = Math.max(...pontos.map((p) => p.distanceTo(pontos[0])));
    const endpoint = pontos.at(-1).distanceTo(pontos[0]);
    check(excursao >= acao.min, `${arma}: ${acao.nome} sem movimento autorado (${excursao.toFixed(4)} m)`);
    check(endpoint <= acao.endpoint, `${arma}: ${acao.nome} não fecha no idle (${endpoint.toFixed(4)} m)`);
    resultado.acoes.push({ nome: acao.nome, excursao: +excursao.toFixed(4), endpoint: +endpoint.toFixed(4) });
  }

  // tamanho real e sockets na pose idle@t0 (a bind pose não é enquadrável).
  const mintNode = cena.getObjectByName(`MINT_WEAPON_${arma.toUpperCase()}`);
  if (mintNode && mintNode.geometry) {
    if (!mintNode.geometry.boundingBox) mintNode.geometry.computeBoundingBox();
    const box = new THREE.Box3().copy(mintNode.geometry.boundingBox).applyMatrix4(mintNode.matrixWorld);
    const dim = box.getSize(new THREE.Vector3());
    const maior = Math.max(dim.x, dim.y, dim.z);
    check(Math.abs(maior - cfg.len) < 0.06,
      `${arma}: comprimento aparente ${maior.toFixed(3)} m ≠ ${cfg.len} m`);
    // pontos de contrato: boca/óculo perto das extremidades da Mint em mundo
    let eixoAds = null;
    for (const socket of ['SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT']) {
      const s_ = cena.getObjectByName(socket);
      if (check(!!s_, `${arma}: ${socket} ausente`) && s_) {
        const expandida = box.clone().expandByScalar(0.01);
        check(expandida.containsPoint(s_.getWorldPosition(new THREE.Vector3())),
          `${arma}: ${socket} fora da caixa da arma`);
      }
    }
    // ADS/luneta: eixo boca→óculo tem que ser quase colinear ao maior eixo da
    // arma (o runtime alinha esse eixo com a câmera no aim-down-sights).
    {
      const m_ = cena.getObjectByName('SOCKET_MINT_MUZZLE');
      const s_ = cena.getObjectByName('SOCKET_MINT_SIGHT');
      if (m_ && s_ && !box.isEmpty() && cameraInverse) {
        // O runtime remove a câmera embutida e transforma o pacote por sua
        // inversa antes de montar o viewmodel. O teste antigo escolhia o sinal
        // do eixo a partir do próprio socket chamado "muzzle": um produto
        // inteiro invertido continuava verde. Em câmera, frente é -Z.
        const bocaCamera = m_.getWorldPosition(new THREE.Vector3()).applyMatrix4(cameraInverse);
        const miraCamera = s_.getWorldPosition(new THREE.Vector3()).applyMatrix4(cameraInverse);
        const bocaAFrente = bocaCamera.z < miraCamera.z - 0.02;
        check(bocaAFrente,
          `${arma}: muzzle não fica à frente da sight na câmera autorada (${bocaCamera.z.toFixed(3)} >= ${miraCamera.z.toFixed(3)})`);
        const eixoArma = box.getSize(new THREE.Vector3());
        const maior = new THREE.Vector3(
          eixoArma.x >= eixoArma.y && eixoArma.x >= eixoArma.z ? 1 : 0,
          eixoArma.y >= eixoArma.x && eixoArma.y >= eixoArma.z ? 1 : 0,
          eixoArma.z >= eixoArma.x && eixoArma.z >= eixoArma.y ? 1 : 0);
        // sinal pelo lado da boca em relação ao centro da caixa
        const centro = box.getCenter(new THREE.Vector3());
        const boca = m_.getWorldPosition(new THREE.Vector3()).sub(centro);
        if (boca.dot(maior) < 0) maior.negate();
        const ads = m_.getWorldPosition(new THREE.Vector3())
          .sub(s_.getWorldPosition(new THREE.Vector3())).normalize();
        eixoAds = ads.angleTo(maior) * 57.2958;
        check(eixoAds < 12, `${arma}: eixo ADS ${eixoAds.toFixed(1)}° do cano (>12°)`);
        resultado.socketCamera = {
          muzzleZ: +bocaCamera.z.toFixed(4), sightZ: +miraCamera.z.toFixed(4), bocaAFrente,
        };
      }
    }

    if (cfg.referenciaIdle) {
      const centro = box.getCenter(new THREE.Vector3());
      const esperado = new THREE.Vector3(...cfg.referenciaIdle.centro);
      const distancia = centro.distanceTo(esperado);
      const dims = box.getSize(new THREE.Vector3()).toArray();
      const eixoMaior = dims.indexOf(Math.max(...dims));
      check(distancia <= cfg.referenciaIdle.tolerancia,
        `${arma}: corpo deslocado ${distancia.toFixed(3)} m de idle@t0 (> ${cfg.referenciaIdle.tolerancia} m)`);
      check(eixoMaior === cfg.referenciaIdle.eixoMaior,
        `${arma}: eixo maior ${eixoMaior} em idle@t0 (esperado ${cfg.referenciaIdle.eixoMaior})`);
      resultado.alinhamentoIdle = {
        centro: centro.toArray().map((value) => +value.toFixed(4)),
        distancia: +distancia.toFixed(4), eixoMaior,
      };
    }
  }

  // mecanismo: excursão de cada peça no clipe-mestre declarado
  for (const mec of cfg.mecanismos) {
    const parte = cena.getObjectByName(mec.parte);
    if (!check(!!parte, `${arma}: peça móvel ${mec.parte} ausente do GLB`)) continue;
    // censo de vértices: pega troca de peça (o caso do mag renomeado p/ alavanca)
    const nVerts = parte.geometry?.attributes?.position?.count ?? 0;
    check(nVerts > 0 && nVerts <= (mec.maxVerts ?? 2000),
      `${arma}: peça ${mec.parte} com ${nVerts} verts (teto ${mec.maxVerts ?? 2000})`);
    const clipe = clipes.get(mec.clipe);
    if (!clipe) { check(false, `${arma}: clipe ${mec.clipe} ausente para ${mec.parte}`); continue; }
    const mixer = new THREE.AnimationMixer(cena);
    mixer.clipAction(clipe).play();
    // Mede no referencial do corpo da arma. Distância em mundo confunde o
    // movimento global de mãos/recuo com o curso real do mecanismo.
    const ponto = () => {
      cena.updateMatrixWorld(true);
      const mundo = parte.getWorldPosition(new THREE.Vector3());
      return mintNode ? mintNode.worldToLocal(mundo) : mundo;
    };
    mixer.update(0);
    const p0 = ponto();
    let maxDist = 0;
    for (let i = 1; i <= 12; i += 1) {
      mixer.update(0);
      mixer.setTime((clipe.duration * i) / 12);
      maxDist = Math.max(maxDist, ponto().distanceTo(p0));
    }
    check(maxDist >= mec.min,
      `${arma}: peça ${mec.parte} excursionou ${maxDist.toFixed(4)} m (< ${mec.min} m) em ${mec.clipe}`);
    resultado.mecanismos.push({ parte: mec.parte, clipe: mec.clipe, excursion: +maxDist.toFixed(4) });
  }

  return resultado;
}

// ---------------------------------------------------------------- mutantes
async function mutaEGuarda(descricao, aplicar, cfg, arma) {
  const gltf = await parseGlb(cfg.glb);
  gltf.userData.skipContact = !descricao.startsWith('solta_mao_');
  const antes = falhas.length;
  aplicar(gltf, cfg, arma);
  inspeciona(gltf, cfg, arma);
  const mordeu = falhas.length > antes;
  check(mordeu, `mutante NÃO MORDEU: ${descricao}`);
  if (mordeu) falhas.splice(antes); // limpa as falhas do mutante
  return mordeu;
}

function mutaDocumentoEGuarda(descricao, aplicar, cfg, arma) {
  const doc = parseGlbJson(readFileSync(cfg.glb));
  const antes = falhas.length;
  aplicar(doc);
  inspecionaRecursos(doc, cfg, arma);
  const mordeu = falhas.length > antes;
  check(mordeu, `mutante NÃO MORDEU: ${descricao}`);
  if (mordeu) falhas.splice(antes);
  return mordeu;
}

const MUTANTES = {
  remove_clipe: (g) => { g.animations.splice(0, 1); if (g.animations.length === 0) g.animations.push({ name: 'x', duration: 0 }); },
  remove_inspect: (g) => { g.animations = g.animations.filter((clip) => clip.name !== 'inspect'); },
  remove_shoot: (g) => { g.animations = g.animations.filter((clip) => clip.name !== 'shoot'); },
  renomeia_mint: (g) => { const n = g.scene.getObjectByName('MINT_WEAPON_REM700') || g.scene.getObjectByName('MINT_WEAPON_G3SG1'); if (!n) throw new Error('mutação não aplicou'); n.name = 'X'; },
  tira_camera: (g) => { const c = g.scene.children.find((o) => o.isPerspectiveCamera); if (!c) throw new Error('mutação não aplicou'); c.fov = 40; },
  desloca_socket: (g) => { const s = g.scene.getObjectByName('SOCKET_MINT_MUZZLE'); if (!s) throw new Error('mutação não aplicou'); s.translateX(2); },
  troca_sockets: (g) => {
    // Controle adversarial para o erro real da Rem700: o gate geométrico
    // antigo seguia o nome do socket e aceitava as duas extremidades trocadas.
    const m = g.scene.getObjectByName('SOCKET_MINT_MUZZLE');
    const s = g.scene.getObjectByName('SOCKET_MINT_SIGHT');
    if (!m || !s || m.parent !== s.parent) throw new Error('mutação não aplicou (sockets/pais)');
    const p = m.position.clone();
    m.position.copy(s.position);
    s.position.copy(p);
    g.scene.updateMatrixWorld(true);
  },
  desalinha_corpo_idle: (g) => {
    const n = g.scene.getObjectByName('MINT_WEAPON_REM700') || g.scene.getObjectByName('MINT_WEAPON_G3SG1');
    if (!n) throw new Error('mutação não aplicou');
    n.geometry.translate(0.5, 0, 0);
    n.geometry.computeBoundingBox();
  },
  congela_peca: (g, cfg, arma) => {
    // prende a peça ao corpo preservando o mundo: sem o bone de mecanismo,
    // a excursão relativa ao corpo precisa zerar.
    const cena = g.scene;
    const parte = cena.getObjectByName(cfg.mecanismos[0].parte);
    const corpo = cena.getObjectByName(`MINT_WEAPON_${arma.toUpperCase()}`);
    if (!parte || !parte.parent || !corpo) throw new Error('mutação não aplicou (peça/corpo ausente)');
    const paiAntes = parte.parent;
    corpo.attach(parte);
    if (parte.parent === paiAntes) throw new Error('mutação não aplicou (pai não mudou)');
  },
  solta_mao_esquerda: (g) => { g.userData.contactMutant = 'left'; },
  solta_mao_direita: (g) => { g.userData.contactMutant = 'right'; },
};

const resumo = {};
async function main() {
for (const [arma, cfg] of Object.entries(ARSENAL)) {
  if (ALVO && arma !== ALVO) continue;
  const gltf = await parseGlb(cfg.glb);
  const bytes = readFileSync(cfg.glb);
  const sha = createHash('sha256').update(bytes).digest('hex');
  const antes = falhas.length;
  check(sha === cfg.sha256, `${arma}: hash ${sha} diverge do manifesto ${cfg.sha256}`);
  inspecionaRecursos(parseGlbJson(bytes), cfg, arma);
  const mec = inspeciona(gltf, cfg, arma);
  const mutantes = {};
  for (const [nome, fn] of Object.entries(MUTANTES)) {
    if (nome === 'congela_peca' && !mec.mecanismos?.length) continue;
    if (nome.startsWith('solta_mao_') && !cfg.contato) continue;
    try {
      mutantes[nome] = await mutaEGuarda(nome, fn, cfg, arma);
    } catch (e) {
      falhas.push(`${arma}: mutante ${nome} não aplicou (${e.message})`);
      mutantes[nome] = false;
    }
  }
  mutantes.remove_imagens_mint = mutaDocumentoEGuarda(
    'remove_imagens_mint', (doc) => { doc.images = []; }, cfg, arma);
  resumo[arma] = { glb: cfg.glb, sha256: sha, mecanismo: mec, mutantes,
                   verde: falhas.length === antes };
  console.log(`DMR_VERIFY ${arma} sha256=${sha} mecanismo=${JSON.stringify(mec)} mutantes=${JSON.stringify(mutantes)}`);
}
if (falhas.length) {
  console.error('DMR_VERIFY_REPROVA');
  for (const f of falhas) console.error(' -', f);
  process.exit(1);
}
console.log('DMR_VERIFY_OK');
}
main().catch((e) => { console.error(e); process.exit(1); });
