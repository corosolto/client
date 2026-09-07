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

const ROOT = new URL('../../..', import.meta.url).pathname;
const ALVO = process.argv[2] || '';
const ARSENAL = {
  rem700: {
    glb: 'artifacts/viewmodels/dmr/rem700/cand1/rem700-baked-runtime.glb',
    len: 1.15,
    clipes: ['idle', 'shoot', 'reload_start', 'reload_loop', 'reload_end', 'reload_empty'],
    mecanismo: 'bolt',
    parte: 'MINT_BOLT_REM700',
    bone_parte: 'Bolt',
    clipe_movimento: 'shoot',
    excursao_min: 0.03,
  },
  g3sg1: {
    glb: 'artifacts/viewmodels/dmr/g3sg1/cand1/g3sg1-baked-runtime.glb',
    len: 1.12,
    clipes: ['idle', 'reload_tactical', 'reload_empty'],
    mecanismo: 'mag',
    parte: 'MINT_MAG_G3SG1',
    bone_parte: 'Mag',
    clipe_movimento: 'reload_tactical',
    excursao_min: 0.08,
    proibidos: ['shoot', 'reload_start', 'reload_loop', 'reload_end'],
  },
};

const falhas = [];
const check = (cond, msg) => {
  if (!cond) falhas.push(msg);
  return cond;
};

async function parseGlb(caminho) {
  const dados = readFileSync(new URL(caminho, 'file://' + ROOT));
  const loader = new GLTFLoader();
  const buf = dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength);
  return loader.parseAsync(buf, '');
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

  // tamanho real: vértices vivem no espaço local do rig (cm do doador);
  // o fator é o scale de mundo do node do rig, não o chain inteiro.
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
      if (m_ && s_ && !box.isEmpty()) {
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
      }
    }
  }

  // mecanismo: excursão da peça no clipe de movimento
  const parte = cena.getObjectByName(cfg.parte);
  if (check(!!parte, `${arma}: peça móvel ${cfg.parte} ausente do GLB`)) {
    const clipe = clipes.get(cfg.clipe_movimento);
    if (clipe) {
      const mixer = new THREE.AnimationMixer(cena);
      const acao = mixer.clipAction(clipe);
      acao.play();
      // A peça é NÓ RÍGIDO filho do bone: mede a posição de mundo do nó.
      const ponto = () => {
        cena.updateMatrixWorld(true);
        return parte.getWorldPosition(new THREE.Vector3());
      };
      mixer.update(0);
      const p0 = ponto();
      let maxDist = 0;
      for (let i = 1; i <= 12; i += 1) {
        mixer.update(0);
        mixer.setTime((clipe.duration * i) / 12);
        maxDist = Math.max(maxDist, ponto().distanceTo(p0));
      }
      const maxDistM = maxDist;
      check(maxDistM >= cfg.excursao_min,
        `${arma}: peça ${cfg.parte} excursionou ${maxDistM.toFixed(4)} m (< ${cfg.excursao_min} m) em ${cfg.clipe_movimento}`);
      return { excursion: maxDistM };
    }
  }
  return { falhasNovas: falhas.length - falhasAntes };
}

// ---------------------------------------------------------------- mutantes
async function mutaEGuarda(descricao, aplicar, cfg, arma) {
  const gltf = await parseGlb(cfg.glb);
  const antes = falhas.length;
  aplicar(gltf, cfg, arma);
  inspeciona(gltf, cfg, arma);
  const mordeu = falhas.length > antes;
  check(mordeu, `mutante NÃO MORDEU: ${descricao}`);
  if (mordeu) falhas.splice(antes); // limpa as falhas do mutante
  return mordeu;
}

const MUTANTES = {
  remove_clipe: (g) => { g.animations.splice(0, 1); if (g.animations.length === 0) g.animations.push({ name: 'x', duration: 0 }); },
  renomeia_mint: (g) => { const n = g.scene.getObjectByName('MINT_WEAPON_REM700') || g.scene.getObjectByName('MINT_WEAPON_G3SG1'); if (!n) throw new Error('mutação não aplicou'); n.name = 'X'; },
  tira_camera: (g) => { const c = g.scene.children.find((o) => o.isPerspectiveCamera); if (!c) throw new Error('mutação não aplicou'); c.fov = 40; },
  desloca_socket: (g) => { const s = g.scene.getObjectByName('SOCKET_MINT_MUZZLE'); if (!s) throw new Error('mutação não aplicou'); s.translateX(0.2); },
  congela_peca: (g, cfg) => {
    // desancora a peça do bone (attach preserva o mundo no repouso): sem o
    // bone como pai, a peça congela enquanto o resto recua — é isso que a
    // régua de excursão tem que pegar.
    const cena = g.scene;
    const parte = cena.getObjectByName(cfg.parte);
    if (!parte || !parte.parent) throw new Error('mutação não aplicou (peça sem pai)');
    const paiAntes = parte.parent;
    cena.attach(parte);
    if (parte.parent === paiAntes) throw new Error('mutação não aplicou (pai não mudou)');
  },
};

const resumo = {};
async function main() {
for (const [arma, cfg] of Object.entries(ARSENAL)) {
  if (ALVO && arma !== ALVO) continue;
  const gltf = await parseGlb(cfg.glb);
  const sha = createHash('sha256').update(readFileSync(new URL(cfg.glb, 'file://' + ROOT))).digest('hex');
  const antes = falhas.length;
  const mec = inspeciona(gltf, cfg, arma);
  const mutantes = {};
  for (const [nome, fn] of Object.entries(MUTANTES)) {
    if (nome === 'congela_peca' && !mec.excursion) continue;
    try {
      mutantes[nome] = await mutaEGuarda(nome, fn, cfg, arma);
    } catch (e) {
      falhas.push(`${arma}: mutante ${nome} não aplicou (${e.message})`);
      mutantes[nome] = false;
    }
  }
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
