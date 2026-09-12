/* skylife.js — vida de céu: pipa, helicóptero, avião de faixa e arara.
   Por quê, contrato, escalas e as armadilhas medidas: docs/SKYLIFE.md. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { placeProp, hasProp } from './mapprops.js';
import { VERSION } from './version.js';

/* ids de `public/models/props/` que o mapa precisa declarar no seu `props` para o
   `preloadMapProps` baixar antes da partida (main.js:1079) */
export const SKY_KITE_ASSET = 'pipa_papel';
export const SKY_HELI_ASSET = 'helicoptero_pm';
export const SKY_PLANE_ASSET = 'aviao_faixa';
export const SKY_LIFE_ASSETS = Object.freeze([SKY_KITE_ASSET, SKY_HELI_ASSET, SKY_PLANE_ASSET]);

/* Arara: carregada aqui e não no ambientlife (que é fauna de CHÃO, com rota e censo).
   Asa vira nó pelo split-props-v21; o bater é procedural. docs/SKYLIFE.md. */
export const SKY_BIRD_ASSET = 'models/ambient/arara_voo.glb';
const _birdLoader = new GLTFLoader();
let _birdTemplate = null;
let _birdPromise = null;

export function preloadSkyBird() {
  if (_birdTemplate) return Promise.resolve(_birdTemplate);
  // promessa memoizada, não só o resultado: o dedup do FileLoader trava o 2º consumidor
  if (_birdPromise) return _birdPromise;
  // Sondas Node montam os mapas sem document.baseURI; a arara é só ambiente e não deve
  // deixar um FileLoader com URL relativa pendurado fora do navegador.
  if (typeof document === 'undefined' || !document.baseURI) return Promise.resolve(null);
  _birdPromise = new Promise((resolve) => {
    // try/catch: sem document.baseURI o loader estoura SÍNCRONO e o onError nunca vem
    try {
      _birdLoader.load(`${SKY_BIRD_ASSET}?v=${VERSION}`, (gltf) => {
        gltf.scene.traverse((object) => {
          if (!object.isMesh) return;
          object.material.metalness = 0;
          object.material.roughness = Math.max(.72, object.material.roughness ?? .72);
        });
        _birdTemplate = gltf.scene;
        resolve(_birdTemplate);
      }, undefined, (error) => { console.warn('[skylife] arara não carregou', error); resolve(null); });
    } catch (error) { console.warn('[skylife] arara não carregou', error); resolve(null); }
  });
  return _birdPromise;
}

/* Nariz em −X e asas em ±Z, medido na seção transversal do GLB (tabela em
   docs/SKYLIFE.md). Régua NÃO pega troca de eixo: arara de ré passa verde. */
const BIRD_FORWARD_X = -1;
const BIRD_LEN = 1.05;   // envergadura ~0,9 m; arara-canindé real tem 0,85-1,0 m

// alturas-alvo em metros; a procedência de cada número está em docs/SKYLIFE.md
const KITE_H = 1.6;
const HELI_H = 3.4;      // altura do rotor ao trem; comprimento sai ~10 m pela proporção do GLB
const PLANE_H = 2.2;

/* Proxies para quando o GLB não carrega: mesmos NOMES DE NÓ do modelo real, para a
   régua medir a mesma mecânica nos dois caminhos. */
const flatMat = (color) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });

function proxyKite() {
  const group = new THREE.Group();
  const vela = new THREE.BufferGeometry();
  vela.setAttribute('position', new THREE.Float32BufferAttribute([
    0, .5, 0, -.36, 0, 0, 0, -.54, 0,
    0, .5, 0, 0, -.54, 0, .36, 0, 0,
  ], 3));
  vela.computeVertexNormals();
  const corpo = new THREE.Mesh(vela, flatMat(0xd8c23a));
  corpo.name = 'corpo'; group.add(corpo);
  const rabiola = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .9, 3), flatMat(0x8a6a2f));
  rabiola.name = 'rabiola'; rabiola.position.y = -.99; group.add(rabiola);
  return group;
}

function proxyHeli() {
  const group = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(.5, 1.6, 4, 8), flatMat(0x23303f));
  corpo.name = 'corpo'; corpo.rotation.z = Math.PI / 2; group.add(corpo);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(3.2, .04, .16), flatMat(0x11161d));
  rotor.name = 'rotor_main'; rotor.position.y = .62; group.add(rotor);
  const cauda = new THREE.Mesh(new THREE.BoxGeometry(.06, .7, .06), flatMat(0x11161d));
  cauda.name = 'rotor_tail'; cauda.position.set(-1.55, .12, 0); group.add(cauda);
  return group;
}

function proxyBird() {
  // silhueta do pássaro do map_parque.js com os nomes de nó do GLB da arara
  const group = new THREE.Group();
  const pena = flatMat(0x2f6fd0);
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), pena);
  corpo.name = 'corpo'; corpo.scale.set(2.1, .8, .7); group.add(corpo);
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.name = side > 0 ? 'asa-direita' : 'asa-esquerda';
    pivot.position.z = side * .1;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(
      [0, 0, 0, -.14, 0, side * .42, .2, 0, side * .38], 3));
    geo.setIndex([0, 1, 2]); geo.computeVertexNormals();
    pivot.add(new THREE.Mesh(geo, pena));
    group.add(pivot);
  }
  return group;
}

function proxyPlane() {
  const group = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(.28, 1.5, 4, 8), flatMat(0xe8eef4));
  corpo.name = 'corpo'; corpo.rotation.z = Math.PI / 2; group.add(corpo);
  const asa = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, 3.2), flatMat(0xe8eef4));
  corpo.add(asa);
  const faixa = new THREE.Mesh(new THREE.PlaneGeometry(4.4, .9), flatMat(0xf2c53d));
  faixa.name = 'faixa'; faixa.position.x = -3.4; group.add(faixa);
  return group;
}

/* Faixa do avião: CanvasTexture com o texto, padrão do signTexture do map_parque.js. */
function bannerTexture(texto, bg = '#f2c53d', fg = '#1b2733') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  /* encolhe a fonte até o texto caber na largura útil — faixa com texto cortado
     reprova a régua de legibilidade tão bem quanto faixa sem texto */
  let px = 116;
  do { ctx.font = `bold ${px}px "Arial Black", Arial, sans-serif`; px -= 4; }
  while (px > 28 && ctx.measureText(texto).width > canvas.width - 72);
  ctx.fillText(texto, canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.bannerText = texto;   // a régua lê isto sem precisar de OCR
  return texture;
}

function paintBanner(root, texto) {
  const faixa = root.getObjectByName('faixa');
  if (!faixa || !texto) return null;
  /* Troca a MALHA, não só o material: o UV da fita do GLB torna o texto ilegível, e a
     geometria do template é compartilhada entre clones. docs/SKYLIFE.md. */
  // caixa da GEOMETRIA (local), não setFromObject (mundo): senão a escala entra 2×
  faixa.geometry.computeBoundingBox();
  const caixa = faixa.geometry.boundingBox;
  const comprimento = Math.max(.05, caixa.max.x - caixa.min.x);
  const altura = Math.max(.02, caixa.max.y - caixa.min.y);
  const quad = new THREE.PlaneGeometry(comprimento, altura);
  /* o quad nasce centrado; a fita do GLB começa no engate (x≈0) e vai para trás, então
     desloca meio comprimento para a faixa não atravessar o avião */
  quad.translate(comprimento / 2, 0, 0);
  faixa.geometry = quad;
  faixa.material = new THREE.MeshBasicMaterial({
    map: bannerTexture(texto),
    side: THREE.DoubleSide,   // rebocada, é vista dos dois lados na travessia
    toneMapped: false,        // faixa de propaganda é papel iluminado, não superfície PBR
  });
  return faixa;
}

// cenário aéreo: sem colisão, sem sombra, sem sujar as réguas de oclusão
function marcarCeu(object, tipo) {
  object.userData.skyLife = tipo;
  object.userData.nonCollider = true;
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.userData.nonCollider = true;
  });
}

export class SkyLife {
  constructor(root, { map = '', low = false, kites = [], helicopters = [], planes = [], birds = [] } = {}) {
    this.map = map;
    this.time = 0;
    this.items = [];
    this.root = root;
    this.birdConfigs = low ? birds.slice(0, Math.ceil(birds.length / 2)) : birds;
    // LOWQ corta o enxame, não o tipo (ver docs/SKYLIFE.md § Escalas)
    const kiteList = low ? kites.filter((_, i) => i % 2 === 0) : kites;
    const planeList = low ? [] : planes;
    kiteList.forEach((config, index) => this._addKite(config, index));
    helicopters.forEach((config, index) => this._addHeli(config, index));
    planeList.forEach((config, index) => this._addPlane(config, index));
    for (const item of this.items) root.add(item.root);
    /* assenta em t=0 antes do 1º frame: sem isto heli e araras nascem na origem do
       mapa e saltam para a órbita. dt minúsculo posiciona sem adiantar o relógio. */
    this.update(1e-6, 0);
    // arara entra assíncrona: 176 KB de ave decorativa não atrasam o 1º frame do mapa
    // `ready` existe para a RÉGUA não dormir num setTimeout; o jogo ignora
    this.ready = this.birdConfigs.length
      ? preloadSkyBird().then(() => {
        if (this._disposed) return this;
        this.birdConfigs.forEach((config, index) => {
          const item = this._addBird(config, index);
          this.root.add(item.root);
        });
        this.update(1e-6, 0);
        return this;
      })
      : Promise.resolve(this);
  }

  _mount(assetId, targetH, proxyFactory, tipo, index) {
    const model = (hasProp(assetId) && placeProp(assetId, { targetH })) || proxyFactory();
    /* placeProp põe os PÉS em y=0; no céu isso vira offset parasita e a órbita sai com
       raio errado. Recentra em Y sem tocar na escala. */
    const box = new THREE.Box3().setFromObject(model);
    model.position.y -= (box.max.y + box.min.y) / 2;
    const group = new THREE.Group();
    group.name = `${tipo}:${this.map}:${index}`;
    group.add(model);
    marcarCeu(group, tipo);
    return { group, model, usouGlb: hasProp(assetId) };
  }

  _addKite(config, index) {
    const { pos = [0, 16, 0], scale = 1, phase = 0, drift = .12 } = config;
    const { group, model, usouGlb } = this._mount(SKY_KITE_ASSET, KITE_H * scale, proxyKite, 'pipa', index);
    group.position.set(pos[0], pos[1], pos[2]);
    this.items.push({
      tipo: 'pipa', root: group, model, usouGlb, phase,
      rabiola: model.getObjectByName('rabiola'),
      origem: group.position.clone(), drift,
      /* a linha sai da mão de alguém lá embaixo: a pipa oscila em torno de um ponto
         FIXO, ela não navega. Amplitude em metros, medida na sonda AR-CEU1. */
      raio: .55 + (index % 3) * .18,
    });
  }

  _addHeli(config, index) {
    const { center = [0, 34, 0], radius = 42, speed = .17, phase = 0, scale = 1 } = config;
    const { group, model, usouGlb } = this._mount(SKY_HELI_ASSET, HELI_H * scale, proxyHeli, 'helicoptero', index);
    this.items.push({
      tipo: 'helicoptero', root: group, model, usouGlb, phase,
      rotorMain: model.getObjectByName('rotor_main'),
      rotorTail: model.getObjectByName('rotor_tail'),
      center: new THREE.Vector3(center[0], center[1], center[2]), radius, speed,
    });
  }

  _addPlane(config, index) {
    const { from = [-90, 30, -40], to = [90, 30, -40], speed = 9, phase = 0, texto = '', scale = 1 } = config;
    const { group, model, usouGlb } = this._mount(SKY_PLANE_ASSET, PLANE_H * scale, proxyPlane, 'aviao', index);
    const faixa = paintBanner(model, texto);
    const a = new THREE.Vector3(from[0], from[1], from[2]);
    const b = new THREE.Vector3(to[0], to[1], to[2]);
    const span = a.distanceTo(b);
    /* o avião aponta o nariz para o destino UMA vez: a rota é reta, não faz sentido
       recalcular atan2 todo frame para um valor constante */
    group.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
    this.items.push({
      tipo: 'aviao', root: group, model, usouGlb, phase, faixa,
      a, b, span, speed,
      /* fase inicial em fração do percurso: dois aviões não saem colados */
      t: (phase % 1 + 1) % 1,
    });
  }

  _addBird(config, index) {
    const { center = [0, 26, 0], radius = 30, speed = .28, phase = 0, scale = 1, subida = 2.4 } = config;
    let model = null;
    if (_birdTemplate) {
      model = _birdTemplate.clone(true);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const len = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
      model.scale.setScalar((BIRD_LEN * scale) / len);
      model.position.y -= (box.max.y + box.min.y) / 2 * model.scale.y;
    } else {
      model = proxyBird();
      model.scale.setScalar(scale);
    }
    const group = new THREE.Group();
    group.name = `arara:${this.map}:${index}`;
    group.add(model);
    marcarCeu(group, 'arara');
    const item = {
      tipo: 'arara', root: group, model, usouGlb: !!_birdTemplate, phase,
      asaE: model.getObjectByName('asa-esquerda'),
      asaD: model.getObjectByName('asa-direita'),
      center: new THREE.Vector3(center[0], center[1], center[2]),
      radius, speed, subida,
    };
    this.items.push(item);
    return item;
  }

  _updateBird(item, t) {
    /* Circuito em elipse achatada (raio menor em Z) para o bando cruzar o campo de
       visão em vez de rodar num carrossel perfeito, e uma subida/descida lenta por
       cima — arara de bando não voa em nível de régua. */
    const a = t * item.speed + item.phase;
    const x = item.center.x + Math.cos(a) * item.radius;
    const z = item.center.z + Math.sin(a) * item.radius * .68;
    const y = item.center.y + Math.sin(a * 1.7 + item.phase) * item.subida;
    /* direção pela DERIVADA da trajetória, não pelo ângulo cru: com raios diferentes
       em X e Z a tangente da elipse não é a+90°, e o bicho voaria de lado. */
    const dx = -Math.sin(a) * item.radius;
    const dz = Math.cos(a) * item.radius * .68;
    item.root.position.set(x, y, z);
    /* BIRD_FORWARD_X = −1: o nariz é o −X do modelo, então a rotação que leva o −X
       para (dx,dz) é atan2(dz, −dx). Com forward +1 seria atan2(−dz, dx). */
    item.root.rotation.y = BIRD_FORWARD_X < 0 ? Math.atan2(dz, -dx) : Math.atan2(-dz, dx);
    item.root.rotation.z = -.34;   // inclinação para dentro da curva
    /* BATER DE ASA — a razão de existir do split de nós. As duas asas se abrem em
       ±Z a partir do pivô na raiz, então uma rotação em X positiva DESCE a asa +Z e
       SOBE a asa −Z: os sinais têm que ser opostos, senão a arara rola em vez de bater.
       Curso ~46° (0,8 rad de amplitude total), que é o que a sonda AR-CEU2 mede. */
    const flap = Math.sin(t * 6.2 + item.phase * 2.1);
    if (item.asaD) item.asaD.rotation.x = -(.06 + flap * .40);
    if (item.asaE) item.asaE.rotation.x = .06 + flap * .40;
  }

  update(dt, time) {
    if (!(dt > 0)) return;
    this.time = typeof time === 'number' ? time : this.time + dt;
    const t = this.time;
    for (const item of this.items) {
      if (item.tipo === 'pipa') this._updateKite(item, t);
      else if (item.tipo === 'helicoptero') this._updateHeli(item, t, dt);
      else if (item.tipo === 'aviao') this._updatePlane(item, dt);
      else if (item.tipo === 'arara') this._updateBird(item, t);
    }
  }

  _updateKite(item, t) {
    /* Pipa de linha presa: dois senos de período diferente (um lento de deriva, um
       rápido de tranco de vento) para o movimento não ficar com cara de metrônomo.
       O eixo Y sobe e desce menos que o X/Z — quem está segurando a linha puxa. */
    const p = t * .55 + item.phase;
    const dx = Math.sin(p) * item.raio + Math.sin(p * 2.7 + 1.1) * item.raio * .22;
    const dz = Math.cos(p * .83 + .4) * item.raio * .8;
    const dy = Math.sin(p * 1.6 + .7) * item.raio * .35;
    item.root.position.set(item.origem.x + dx, item.origem.y + dy, item.origem.z + dz);
    /* a vela inclina PARA o lado do movimento — é o que faz ler como papel no vento
       em vez de adesivo girando */
    item.root.rotation.z = Math.sin(p * 1.35 + item.phase) * .28 + dx * .12;
    item.root.rotation.x = Math.sin(p * .93) * .19;
    item.root.rotation.y = Math.sin(p * .61 + 2) * .5;
    /* a rabiola ATRASA em relação à vela (pivô já veio na ponta pelo split-props):
       mesmo seno com defasagem, amplitude maior. Sem o atraso a rabiola vira galho. */
    if (item.rabiola) {
      item.rabiola.rotation.z = Math.sin(p * 1.35 + item.phase - .55) * .46;
      item.rabiola.rotation.x = Math.sin(p * .93 - .5) * .3;
    }
  }

  _updateHeli(item, t, dt) {
    const a = t * item.speed + item.phase;
    item.root.position.set(
      item.center.x + Math.cos(a) * item.radius,
      item.center.y + Math.sin(a * .7) * 1.6,
      item.center.z + Math.sin(a) * item.radius,
    );
    /* nariz na tangente da órbita + inclinação para dentro da curva (um heli em
       órbita voa inclinado; reto parece maquete pendurada) */
    item.root.rotation.y = -a;
    item.root.rotation.z = .17;
    /* rotor: velocidade angular ALTA e independente da órbita. Multiplicado por dt e
       acumulado, não derivado de `t`, para não travar em stroboscopia com o frame. */
    if (item.rotorMain) item.rotorMain.rotation.y += dt * 26;
    if (item.rotorTail) item.rotorTail.rotation.x += dt * 34;
  }

  _updatePlane(item, dt) {
    item.t += (dt * item.speed) / item.span;
    if (item.t > 1.25) item.t -= 1.5;   // some no horizonte e volta pelo outro lado
    item.root.position.lerpVectors(item.a, item.b, Math.max(-.25, item.t));
    /* a faixa ondula: rotação leve no próprio nó, que o split-props deixou com pivô
       no engate (x = -0,095) — gira como pano rebocado, não como placa parafusada */
    if (item.faixa) item.faixa.rotation.z = Math.sin(item.t * 22) * .06;
  }

  /* Censo para a régua: `glb` menor que `total` significa asset quebrado caindo no
     proxy — vira FALHA na sonda em vez de céu feio que ninguém mede. */
  stats() {
    const conta = (tipo) => this.items.filter((item) => item.tipo === tipo).length;
    return {
      map: this.map,
      pipas: conta('pipa'), helicopteros: conta('helicoptero'), avioes: conta('aviao'), araras: conta('arara'),
      total: this.items.length,
      glb: this.items.filter((item) => item.usouGlb).length,
      faixas: this.items.filter((item) => item.faixa).map((item) => item.faixa.material.map?.userData?.bannerText).filter(Boolean),
    };
  }
}

export function createSkyLife(root, config) {
  return new SkyLife(root, config);
}
