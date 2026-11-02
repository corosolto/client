/* Cinturão de mata fechada a partir de r = 54: 0,6 m de orla com tronco colidível, depois parede.
   A mata É o limite do mapa — não existe cerca-caixote. Brief: docs/maps/invasao-javaporcos.md. */
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js';
import { CIDADE, MATA_R, HALF, EIXOS, TRILHAS, distTrilha, distPasto, paraMundo, CLAREIRA_R, corteCorrego } from './map_javaporcos_relevo.js';

/* Cotas da mata (faixa caminhável, parede de colisor, coluna, folga de trilha e
   achatamento da copa): docs/maps/invasao-javaporcos-layout.md, seção "Cotas da mata". */
export const V_ANDAVEL = MATA_R + 9;
export const V_PAREDE0 = V_ANDAVEL;
export const V_PAREDE1 = HALF;
const COLUNA = 0.5;
const FOLGA_TRILHA = 2.9;
const ACHATAMENTO = 0.62;          // copa é disco, não bola: proporção medida nas referências

const NAVEGADOR = typeof document !== 'undefined';
export const FOLHAGEM_URL = '/img/textures/folhagem_mata.webp';
export const TRONCO_LADOS = 12;
const HORIZONTE = 240;             // mata impostora além de HALF, para o mapa não flutuar no vazio

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

function porMatriz(lista, geo, mat, nome, castShadow = true) {
  const malha = new THREE.InstancedMesh(geo, mat, lista.length);
  for (let i = 0; i < lista.length; i++) malha.setMatrixAt(i, lista[i]);
  malha.name = nome;
  malha.castShadow = castShadow; malha.receiveShadow = true;
  malha.instanceMatrix.needsUpdate = true;
  malha.computeBoundingSphere();
  return malha;
}

function dividirLotes(lista, cores, tamanho) {
  const lotes = new Map();
  for (let i = 0; i < lista.length; i++) {
    const e = lista[i].elements, chave = `${Math.floor(e[12]/tamanho)},${Math.floor(e[14]/tamanho)}`;
    if (!lotes.has(chave)) lotes.set(chave,{matrizes:[],cores:[]});
    const lote = lotes.get(chave);lote.matrizes.push(lista[i]);if(cores)lote.cores.push(cores[i]);
  }
  return [...lotes.values()];
}

const matriz = (x, y, z, ry, sx, sy, sz) => {
  _e.set(0, ry, 0); _q.setFromEuler(_e);
  _p.set(x, y, z); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
};

/* Lado e profundidade de um ponto do cinturão: v é a distância para fora do miolo. */
function ladoDe(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  if (az >= ax) return { lado: z < 0 ? 'N' : 'S', u: x, v: az };
  return { lado: x < 0 ? 'O' : 'L', u: z, v: ax };
}

export function construirMata(kit, campo, rnd) {
  const { root, colliders, occluders, MAT } = kit;
  const troncoGeo = new THREE.CylinderGeometry(0.16, 0.34, 1, TRONCO_LADOS, 1, true);
  const copaGeo = tufoGeo(14, 0x51a7);
  const moitaGeo = cruzadoGeo();
  const folha = materialFolhagem(MAT);
  const loc = semente(0x3f1d);
  const cipoGeo = new THREE.CylinderGeometry(0.05, 0.035, 1, 4, 1, true);
  const matoGeo = new THREE.PlaneGeometry(1, 1);

  const troncos = [], copas = [], copaCor = [], moitas = [], cipos = [], matos = [];
  const TOM = [new THREE.Color(0.54, 0.66, 0.7), new THREE.Color(0.8, 0.92, 0.96), new THREE.Color(0.98, 1.1, 1.14)];
  const FICA = [0.93, 0.9, 1];       // fração de tufo por andar: andar faltando deixava tronco pelado
  let troncosColididos = 0;
  /* A PAREDE vem antes das árvores de propósito: tronco que NÃO está dentro de uma caixa
     de parede é tronco que o jogador alcança, e tronco alcançável sem colisor é MAP1. */
  const base = colliders.length;
  const paredes = construirParede(campo, colliders);
  const caixasParede = colliders.slice(base);
  const dentroDaParede = (x, z) => {
    for (const c of caixasParede) if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) return true;
    return false;
  };

  /* Capoeira real é 1.500-2.000 indivíduos por hectare; 2,4 m de passo dá 1.736/ha.
     O jitter evita a fileira de muda de reflorestamento, que é o que denuncia maquete. */
  for (let x = -HALF + 1.2; x <= HALF - 1.2; x += 2.4) {
    for (let z = -HALF + 1.2; z <= HALF - 1.2; z += 2.4) {
      const { v } = ladoDe(x, z);
      if (v < MATA_R - 0.6) continue;
      const px = x + (rnd() - 0.5) * 1.9, pz = z + (rnd() - 0.5) * 1.9;
      const vp = ladoDe(px, pz).v;
      if (vp < MATA_R - 0.6 || vp > HALF - 0.4) continue;
      const dt = distTrilha(px, pz);
      if (dt < 2.3) continue;
      const borda = Math.min(1, (vp - MATA_R + 0.6) / 3.5);
      const y0 = campo.amostra(px, pz);
      let soloMaisAlto = y0;
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) soloMaisAlto = Math.max(soloMaisAlto, campo.amostra(px+dx,pz+dz));
      const alto = Math.max(6.5 + rnd() * 7.5 * (0.45 + 0.55 * borda), (soloMaisAlto-y0+2.4)/.40);
      const ry = rnd() * Math.PI * 2;
      const r = 0.52 + rnd() * 0.4;
      troncos.push(matriz(px, y0 + alto * 0.46, pz, ry, r, alto * 0.92, r));   // ponta some dentro do andar de cima

      /* Copa ACHATADA (0,62 de proporção) e com a base SEMPRE acima de 2,4 m: a primeira
         versão alongava a copa no Y e ela descia até o chão — a câmera andava dentro dela. */
      const andares = [[0.5, 2.8], [0.7, 2.4], [0.86, 2.0]];
      for (let c = 0; c < 3; c++) {
        const [frac, raio] = andares[c];
        const jr = raio * (0.82 + rnd() * 0.42);
        const cy = Math.max(soloMaisAlto + 2.4 + jr * ACHATAMENTO, y0 + alto * frac);
        const mt = matriz(px + (rnd() - 0.5) * 0.9, cy, pz + (rnd() - 0.5) * 0.9,
          rnd() * Math.PI * 2, jr, jr * ACHATAMENTO, jr);
        if (loc() > FICA[c]) continue;
        copas.push(mt);
        copaCor.push(TOM[c].clone().multiplyScalar(0.9 + loc() * 0.2));
      }

      /* Meia-extensão maior que o raio do pé do cone: foi tronco de 0,31 m com colisor
         curto demais que apareceu como corpo dentro de sólido no MAP1. */
      if (!dentroDaParede(px, pz)) {
        const raioCol = 0.36 * r + 0.08;
        colliders.push({ minX: px - raioCol, maxX: px + raioCol, minY: y0 - 1, maxY: y0 + alto,
          minZ: pz - raioCol, maxZ: pz + raioCol });
        troncosColididos++;
      }
    }
  }

  /* Sub-bosque, cipó e mato alto: é o que fecha a visada no nível do olho. Tudo marcado
     `nonSolidSurface` — folhagem que se atravessa não pode virar teto na sonda do map-check. */
  for (let x = -HALF + 0.8; x <= HALF - 0.8; x += 1.6) {
    for (let z = -HALF + 0.8; z <= HALF - 0.8; z += 1.6) {
      const { v } = ladoDe(x, z);
      if (v < MATA_R - 0.7) continue;
      const px = x + (rnd() - 0.5) * 1.5, pz = z + (rnd() - 0.5) * 1.5;
      const vp = ladoDe(px, pz).v;
      if (vp < MATA_R - 0.5 || vp > HALF - 0.3) continue;
      const dt = distTrilha(px, pz);
      if (dt < 1.95 || distPasto(px, pz) < 2.2) continue;
      const y0 = campo.amostra(px, pz);
      let escala = 0.75 + rnd() * 1.05;
      if (vp - escala * 1.25 < MATA_R - 0.6) escala = Math.max(0.35, (vp - MATA_R + 0.6) / 1.25);
      const ryM = rnd() * 6.283;
      if (!(kit.orlaGLB && vp < MATA_R + 0.8)) moitas.push(matriz(px, y0 - 0.08, pz, ryM, escala * 1.5, escala * 1.45, escala * 1.5));
      if (rnd() < 0.5) {
        const lado = rnd() * 6.283;
        matos.push(matriz(px + Math.cos(lado) * 0.7, y0 + 0.62, pz + Math.sin(lado) * 0.7, lado, 1.5, 1.25, 1));
      }
      if (rnd() < 0.16) {
        const comp = 2.4 + rnd() * 3.2;
        cipos.push(matriz(px + (rnd() - 0.5) * 1.4, y0 + 5.4 + rnd() * 2.6 - comp / 2, pz + (rnd() - 0.5) * 1.4,
          rnd() * 6.283, 1, comp, 1));
      }
    }
  }

  /* Túnel da boca de trilha: copa baixa atravessada sobre o corredor. Sem ela a trilha lê
     como vão claro, e a referência de arte pede entrada escura. */
  for (const e of EIXOS) {
    for (let t = 0; t <= 1.0001; t += 0.125) {
      const i = Math.min(e.pts.length - 2, Math.floor(t * (e.pts.length - 1)));
      const ft = t * (e.pts.length - 1) - i;
      const ax = e.pts[i][0] + (e.pts[i + 1][0] - e.pts[i][0]) * ft;
      const az = e.pts[i][1] + (e.pts[i + 1][1] - e.pts[i][1]) * ft;
      const y0 = campo.amostra(ax, az);
      for (const s of [-1, 1]) {
        const jr = 2.3 + rnd() * 0.9;
        copas.push(matriz(ax + s * (1.4 + rnd()), y0 + 5.0 + rnd() * 1.4, az + (rnd() - 0.5) * 1.6,
          rnd() * 6.283, jr, jr * 0.62, jr));
        copaCor.push(TOM[1].clone());
      }
    }
  }

  /* Chão pisado da trilha: retalho de terra instanciado sobre o terreno. Sem ele a trilha
     é um corredor de grama e o jogador não lê "caminho", lê "falha na mata". */
  let pisadas = [];
  for (const e of EIXOS) {
    for (let t = 0; t <= 1.0001; t += 0.045) {
      const i = Math.min(e.pts.length - 2, Math.floor(t * (e.pts.length - 1)));
      const ft = t * (e.pts.length - 1) - i;
      const ax = e.pts[i][0] + (e.pts[i + 1][0] - e.pts[i][0]) * ft;
      const az = e.pts[i][1] + (e.pts[i + 1][1] - e.pts[i][1]) * ft;
      const esc = 2.6 + rnd() * 1.6;
      const m = pisada(campo, ax + (rnd() - 0.5) * 0.7, az + (rnd() - 0.5) * 0.7, rnd() * 6.283, esc, esc);
      pisadas.push(m);
      if (!m || Math.hypot(m.elements[0], m.elements[1], m.elements[2]) < esc * 0.75) {
        for (let k = 0; k < 4; k++) pisadas.push(pisada(campo, ax + (loc() - 0.5) * 2, az + (loc() - 0.5) * 2, loc() * 6.283, esc, esc));
      }
    }
    const [cx, cz] = e.clareira;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.283, r = k ? 1.6 + rnd() * 1.9 : 0;
      pisadas.push(pisada(campo, cx + Math.cos(a) * r, cz + Math.sin(a) * r, rnd() * 6.283, 3.0 + rnd() * 1.4, 3.0 + rnd() * 1.4));
    }
    for (let i = 0; i < e.pasto.length - 1; i++) {
      const [ax, az] = e.pasto[i], [bx, bz] = e.pasto[i + 1];
      const passos = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.7);
      for (let k = 0; k < passos; k++) {
        const t = k / passos, px = ax + (bx - ax) * t + (rnd() - 0.5) * 0.5, pz = az + (bz - az) * t + (rnd() - 0.5) * 0.5;
        const esc = 1.5 + rnd() * 1.0;
        pisadas.push(pisada(campo, px, pz, rnd() * 6.283, esc, esc * (0.8 + rnd() * 0.4)));
      }
    }
  }

  const add = (lista, geo, mat, nome, sombra = true) => {
    if (!lista.length) return null;
    const malha = porMatriz(lista, geo, mat, nome, sombra);
    root.add(malha);
    return malha;
  };
  const nCopaMapa = copas.length;
  horizonte(campo, loc, copas, copaCor, TOM);
  const troncoMesh = add(troncos, troncoGeo, MAT.tronco, 'mata-troncos');
  const casca = new THREE.Color();
  for (let i = 0; i < troncos.length; i++) {
    const v = 0.62 + loc() * 0.5, cinza = loc() * 0.25;
    troncoMesh.setColorAt(i, casca.setRGB(v * (1 + cinza * 0.2), v * (1 + cinza * 0.45), v * (1 + cinza * 0.7)));
  }
  troncoMesh.instanceColor.needsUpdate = true;
  const copaMesh = add(copas.slice(0,nCopaMapa), copaGeo, folha, 'mata-copa');
  for (let i = 0; i < nCopaMapa; i++) copaMesh.setColorAt(i, copaCor[i]);
  copaMesh.instanceColor.needsUpdate = true;
  const horizonteGeo = tufoGeo(4, 0x51a7);
  for (const lote of dividirLotes(copas.slice(nCopaMapa),copaCor.slice(nCopaMapa),128)) {
    const mesh = add(lote.matrizes,horizonteGeo,folha,'mata-copa-horizonte',false);
    lote.cores.forEach((cor,i)=>mesh.setColorAt(i,cor));mesh.instanceColor.needsUpdate=true;
  }
  const moitaMesh = add(moitas, moitaGeo, folha, 'mata-subbosque', false);
  const cipoMesh = add(cipos, cipoGeo, MAT.cipo, 'mata-cipo', false);
  const matoMesh = add(matos, matoGeo, MAT.mato, 'mata-capim', false);
  pisadas = pisadas.filter(Boolean);
  const pisadaGeo = new THREE.PlaneGeometry(1, 1);
  pisadaGeo.rotateX(-Math.PI / 2);
  const pisadaMesh = add(pisadas, pisadaGeo, MAT.terraTrilha, 'mata-trilha-pisada', false);
  for (const m of [moitaMesh, cipoMesh, matoMesh, pisadaMesh]) if (m) m.userData.nonSolidSurface = true;
  for (const m of [troncoMesh, copaMesh]) if (m) occluders.push(m);
  if (matoMesh) matoMesh.material.side = THREE.DoubleSide;
  root.add(chaoHorizonte(campo, MAT.grama));


  const boarEntrances = EIXOS.map((e) => ({
    id: e.id, lado: e.lado, trilha: e.id,
    x: +e.clareira[0].toFixed(2), z: +e.clareira[1].toFixed(2),
  }));

  return {
    boarEntrances,
    censo: {
      arvores: troncos.length, copas: nCopaMapa, copasHorizonte: copas.length - nCopaMapa,
      subbosque: moitas.length + matos.length + cipos.length,
      colisoresTronco: troncosColididos, colisoresParede: paredes,
      trilhaPisada: pisadas.length,
      instanciados: [troncoMesh, copaMesh, moitaMesh, cipoMesh, matoMesh, pisadaMesh].filter(Boolean).length,
    },
  };
}

const semente = (s) => () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296);

const DECLIVE_PISADA = 0.175;      // 10°: acima disso retalho largo plano corta o barranco em degrau
const _n = new THREE.Vector3(), _cima = new THREE.Vector3(0, 1, 0), _qy = new THREE.Quaternion();
function normalChao(campo, x, z) {
  const d = 0.5;
  return _n.set(campo.amostra(x - d, z) - campo.amostra(x + d, z), 2 * d, campo.amostra(x, z - d) - campo.amostra(x, z + d)).normalize();
}
const declive = (campo, x, z) => Math.acos(normalChao(campo, x, z).y);

/* Retalho de terra deitado na normal do chão; encolhe (≤ 1,2 m no declive) até nenhum
   canto ou meio de aresta ficar a mais de 8 cm do relevo; sem encaixe, devolve null. */
const _v = new THREE.Vector3(), AMOSTRAS_PISADA = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, -0.5], [0, 0.5], [-0.5, 0], [0.5, 0]];
function pisada(campo, x, z, ry, sx, sz) {
  if (declive(campo, x, z) > DECLIVE_PISADA) { sx = Math.min(sx, 1.2); sz = Math.min(sz, 1.2); }
  _qy.setFromAxisAngle(_cima, ry);
  _q.setFromUnitVectors(_cima, normalChao(campo, x, z)).multiply(_qy);
  _p.set(x, campo.amostra(x, z) + 0.04, z);
  const m = new THREE.Matrix4();
  for (let k = 0; k < 8; k++, sx *= 0.8, sz *= 0.8) {
    m.compose(_p, _q, _s.set(sx, 1, sz));
    if (AMOSTRAS_PISADA.every(([a, b]) => Math.abs(_v.set(a, 0, b).applyMatrix4(m).y - campo.amostra(_v.x, _v.z)) <= 0.08)) return m;
  }
  return null;
}

/* Folhagem em cartão alfa sobre atlas de folhas escaneadas (Poly Haven CC0): metade
   esquerda é tufo de copa, a direita é moita. Um material para copa e sub-bosque. */
let _folha = null;
function materialFolhagem(MAT) {
  if (_folha) return _folha;
  let map = MAT.copa.map;
  if (NAVEGADOR) {
    map = new THREE.TextureLoader().load(FOLHAGEM_URL);
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  }
  // luz que atravessa a folha (dossel por baixo L* 19 → 24); o tom rosado segura a copa em 139° com o hemi 1,35
  _folha = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.82, metalness: 0,
    color: new THREE.Color(1.1, 1, 1.04), emissive: 0x5a4a54, emissiveMap: map });
  _folha.name = 'mata-folhagem';
  _folha.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>',
      THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
  };
  _folha.customProgramCacheKey = () => 'jp-folhagem-sem-verso';
  return _folha;
}

/* Tufo de copa: n cartões virados para fora de uma bola unitária, normal esférica puxada
   para cima (a copa recebe o céu por dentro em vez de virar teto preto). */
function tufoGeo(n, s) {
  const r = semente(s), g = [];
  const d = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    const y = k === 0 ? 1 : 1 - 1.75 * ((k + 0.5) / n), rr = Math.sqrt(Math.max(0, 1 - y * y));
    const a = k * 2.39996 + r() * 0.6;
    d.set(Math.cos(a) * rr, y, Math.sin(a) * rr).normalize();
    const p = new THREE.PlaneGeometry(1.25, 1.25);
    p.rotateZ(r() * 6.283);
    p.lookAt(d);
    p.translate(d.x * 0.5, d.y * 0.5, d.z * 0.5);
    const uv = p.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5);
    nrm.copy(d).add(new THREE.Vector3(0, 1.2, 0)).normalize();
    const no = p.attributes.normal;
    for (let i = 0; i < no.count; i++) no.setXYZ(i, nrm.x, nrm.y, nrm.z);
    g.push(p);
  }
  return mergeGeometries(g);
}

/* Moita: 3 cartões em pé a 60°, base no chão, metade direita do atlas. */
function cruzadoGeo() {
  const g = [];
  for (let k = 0; k < 3; k++) {
    const p = new THREE.PlaneGeometry(1, 1);
    p.translate(0, 0.5, 0); p.rotateY((k / 3) * Math.PI);
    const uv = p.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + uv.getX(i) * 0.5);
    const no = p.attributes.normal;
    for (let i = 0; i < no.count; i++) no.setXYZ(i, 0, 1, 0);
    g.push(p);
  }
  return mergeGeometries(g);
}

/* Mata impostora de HALF a HALF + HORIZONTE: só copa, sem tronco nem colisor, no mesmo
   lote da copa do mapa (zero chamada de desenho a mais). Passo cresce com a distância. */
function horizonte(campo, r, copas, cores, TOM) {
  const faixas = [[HALF - 1, HALF + 40, 4.2, 1], [HALF + 40, HALF + HORIZONTE, 9, 2]];
  for (const [r0, r1, passo, esc] of faixas) {
    for (let x = -r1; x <= r1; x += passo) {
      for (let z = -r1; z <= r1; z += passo) {
        const rr = Math.max(Math.abs(x), Math.abs(z));
        if (rr < r0 || rr >= r1) continue;
        const px = x + (r() - 0.5) * passo * 0.7, pz = z + (r() - 0.5) * passo * 0.7;
        const y0 = campo.amostra(px, pz) - 0.3;
        const andares = esc > 1 ? [[9 + r() * 5, 5.0 * esc]] : [[4.5 + r() * 3, 3.2], [9 + r() * 5, 5.0]];
        for (const [h, j] of andares) {
          const jr = j * (0.8 + r() * 0.5);
          copas.push(matriz(px + (r() - 0.5), y0 + h, pz + (r() - 0.5), r() * 6.283, jr, jr * 0.7, jr));
          cores.push(TOM[h > 8 ? 2 : 0].clone().multiplyScalar(0.85 + r() * 0.25));
        }
      }
    }
  }
}

/* Chão de 600 m que segue a borda do relevo (amostra satura fora do mapa); por dentro
   afunda 2 m para baixo do terreno de verdade. */
function chaoHorizonte(campo, grama) {
  const mat = new THREE.MeshStandardMaterial({ map: grama.map, color: 0x56653c, roughness: 1, metalness: 0 });
  const S = 600, n = 60;
  const geo = new THREE.PlaneGeometry(S, S, n, n);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const dentro = Math.max(Math.abs(x), Math.abs(z)) < HALF - 0.5;
    pos.setY(i, campo.amostra(x, z) - (dentro ? 2 : 0.25));
    uv.setXY(i, x / 2.4, z / 2.4);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.name = 'chao-horizonte'; m.receiveShadow = true; m.userData.nonSolidSurface = true;
  return m;
}

/* Parede de mata: colunas livres fundidas em caixas LONGAS. A imagem é a mesma (a mata é
   instanciada); o que cai é `world.colliders`, que o `_collide` varre linearmente por bicho. */
function construirParede(campo, colliders) {
  let n = 0;
  const lados = [
    { lado: 'N', u0: -HALF, u1: HALF }, { lado: 'S', u0: -HALF, u1: HALF },
    { lado: 'O', u0: -HALF, u1: HALF }, { lado: 'L', u0: -HALF, u1: HALF },
  ];
  for (const { lado, u0, u1 } of lados) {
    const colunas = [];
    for (let u = u0; u < u1 - 0.01; u += COLUNA) {
      const ua = u, ub = Math.min(u1, u + COLUNA);
      const corridas = [];
      let inicio = null;
      for (let v = V_PAREDE0; v <= V_PAREDE1 + 0.001; v += 0.5) {
        let livre = true;
        for (let t = 0; t <= 1 && livre; t += 0.25) {
          const [px, pz] = paraMundo(lado, ua + (ub - ua) * t, v);
          if (distTrilha(px, pz) < FOLGA_TRILHA) livre = false;
        }
        if (livre && inicio === null) inicio = v;
        if (!livre && inicio !== null) { if (v - 0.5 - inicio >= 0.5) corridas.push([inicio, v - 0.5]); inicio = null; }
      }
      /* A última corrida fecha FORA do laço: sem este flush só sobravam os fragmentos ao
         lado de trilha, e a parede abria no meio de cada lado (medido: fuga a 57,4 m). */
      if (inicio !== null && V_PAREDE1 - inicio >= 0.5) corridas.push([inicio, V_PAREDE1]);
      colunas.push({ ua, ub, chave: corridas.map((c) => c.join(':')).join('|'), corridas });
    }
    let grupo = null;
    const descarrega = () => {
      if (!grupo) return;
      for (const [a, b] of grupo.corridas) n += emitir(lado, grupo.ua, grupo.ub, a, b, campo, colliders);
      grupo = null;
    };
    for (const c of colunas) {
      if (grupo && grupo.chave === c.chave && Math.abs(grupo.ub - c.ua) < 1e-6) { grupo.ub = c.ub; continue; }
      descarrega();
      grupo = { ua: c.ua, ub: c.ub, chave: c.chave, corridas: c.corridas };
    }
    descarrega();
  }
  return n;
}

function emitir(lado, ua, ub, v0, v1, campo, colliders) {
  const [x0, z0] = paraMundo(lado, ua, v0), [x1, z1] = paraMundo(lado, ub, v1);
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minZ = Math.min(z0, z1), maxZ = Math.max(z0, z1);
  const y = campo.amostra((minX + maxX) / 2, (minZ + maxZ) / 2);
  colliders.push({ minX, maxX, minY: y - 2.5, maxY: y + 6.5, minZ, maxZ });
  return 1;
}

/* Clareira da boca de mata: chão pisado e um anel de tronco caído, para a saída da horda
   ter leitura de lugar e não de buraco no cenário. */
export function clareiras() {
  return EIXOS.map((e) => ({ id: e.id, lado: e.lado, x: e.clareira[0], z: e.clareira[1], raio: CLAREIRA_R }));
}

export const TRILHAS_IDS = TRILHAS.map((t) => t.id);

/* Pasto entre a cidade e a mata: capim denso em cartão, touceira alta, cupinzeiro e cerca
   de mourão com arame. Tudo em lote; só mourão e cupinzeiro têm colisor. */
export const CERCA_R = CIDADE + 1.2;
const VAO_PORTEIRA = [[0, 7.6], [22, 2.8], [-22, 2.8]];

export function construirPasto(kit, campo, rnd) {
  const { root, colliders, occluders, MAT } = kit;
  const noPasto = (x, z) => { const r = Math.max(Math.abs(x), Math.abs(z)); return r > CIDADE + 0.15 && r < MATA_R - 0.3; };
  const cartao = () => {
    const g = [];
    for (let k = 0; k < 3; k++) {
      const p = new THREE.PlaneGeometry(1, 1);
      p.translate(0, 0.5, 0); p.rotateY((k / 3) * Math.PI);
      g.push(p);
    }
    const geo = mergeGeometries(g);
    const n = geo.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return geo;
  };
  const capim = [], capimCor = [], touceiras = [], touceiraCor = [];
  const tom = (seco) => new THREE.Color().setRGB(0.84 + 0.26 * seco, 0.92 + 0.06 * seco, 0.86 - 0.1 * seco);
  const secura = (x, z) => 0.5 + 0.5 * Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.13 - 0.4);
  for (let x = -MATA_R; x <= MATA_R; x += 0.5) {
    for (let z = -MATA_R; z <= MATA_R; z += 0.5) {
      const px = x + (rnd() - 0.5) * 0.48, pz = z + (rnd() - 0.5) * 0.48;
      if (!noPasto(px, pz)) continue;
      const dp = distPasto(px, pz);
      if (dp < 0.7 || corteCorrego(px, pz) > 0.55) continue;
      if (dp < 1.3 && rnd() < 0.6) continue;
      const f = (Math.max(Math.abs(px), Math.abs(pz)) - CIDADE) / (MATA_R - CIDADE);
      const alto = (0.28 + 0.3 * f + rnd() * 0.22) * (dp < 1.6 ? 0.6 : 1);
      const largo = 0.5 + rnd() * 0.35;
      capim.push(matriz(px, campo.amostra(px, pz) - 0.02, pz, rnd() * 6.283, largo, alto, largo));
      capimCor.push(tom(Math.min(1, secura(px, pz) * 0.8 + rnd() * 0.35)));
    }
  }
  for (let i = 0; i < 90; i++) {
    const a = rnd() * 6.283, cx = Math.cos(a) * 60, cz = Math.sin(a) * 60;
    const esc = (CIDADE + 1.6 + rnd() * (MATA_R - CIDADE - 2.2)) / Math.max(Math.abs(cx), Math.abs(cz));
    const ox = cx * esc, oz = cz * esc;
    for (let k = 0, n = 2 + ((rnd() * 4) | 0); k < n; k++) {
      const px = ox + (rnd() - 0.5) * 1.8, pz = oz + (rnd() - 0.5) * 1.8;
      if (!noPasto(px, pz) || distPasto(px, pz) < 1.9 || corteCorrego(px, pz) > 0.4) continue;
      const alto = 0.9 + rnd() * 0.65, largo = 0.9 + rnd() * 0.5;
      touceiras.push(matriz(px, campo.amostra(px, pz) - 0.03, pz, rnd() * 6.283, largo, alto, largo));
      touceiraCor.push(tom(0.3 + rnd() * 0.6));
    }
  }

  /* Cupinzeiro: torno em 3 lóbulos (±18% no raio) com 2-3 torrões satélites. Colisor a
     0,78 do raio da base, onde o monte já passou de 0,3 m de altura. */
  const cupins = [], torroes = [], rt = semente(0xc0b1);   // semente própria: não desloca o rnd do mapa
  const cupimGeo = cupimTorno();
  for (let tent = 0; tent < 400 && cupins.length < 13; tent++) {
    const a = rnd() * 6.283, cx = Math.cos(a), cz = Math.sin(a);
    const alvo = CIDADE + 2.6 + rnd() * (MATA_R - CIDADE - 4.2);
    const esc = alvo / Math.max(Math.abs(cx), Math.abs(cz));
    const px = cx * esc, pz = cz * esc;
    if (distPasto(px, pz) < 3.2 || corteCorrego(px, pz) > 0 || Math.abs(Math.max(Math.abs(px), Math.abs(pz)) - CERCA_R) < 1.6) continue;
    if (cupins.some((c) => Math.hypot(c.x - px, c.z - pz) < 7)) continue;
    const sx = 0.55 + rnd() * 0.4, sy = 0.8 + rnd() * 1.0;
    let y = Infinity;
    for (const [dx, dz] of [[0, 0], [sx, 0], [-sx, 0], [0, sx], [0, -sx]]) y = Math.min(y, campo.amostra(px + dx, pz + dz));
    cupins.push({ x: px, z: pz, sx, sy, y: y - 0.06 });
    const h = 0.78 * sx;
    colliders.push({ minX: px - h, maxX: px + h, minY: y - 0.5, maxY: y + sy, minZ: pz - h, maxZ: pz + h });
    for (let k = 0, n = 2 + (rt() < 0.5 ? 1 : 0); k < n; k++) {
      const ang = rt() * 6.283, d = sx * 0.8 + rt() * 0.3, r = 0.3 + rt() * 0.2;
      const tx = px + Math.cos(ang) * d, tz = pz + Math.sin(ang) * d;
      const ty = campo.amostra(tx, tz) - 0.05, alto = 0.2 + rt() * 0.15;
      torroes.push({ x: tx, z: tz, sx: r, sy: alto, y: ty });
      colliders.push({ minX: tx - 0.78 * r, maxX: tx + 0.78 * r, minY: ty - 0.3, maxY: ty + alto, minZ: tz - 0.78 * r, maxZ: tz + 0.78 * r });
    }
  }

  /* Cerca a 1,2 m da cidade, aberta na avenida, nas vielas e onde a trilha passa: a horda
   atravessa por baixo do arame, o jogador só nos vãos. */
  const mouroes = [], fios = [];
  const fechado = (u, x, z) => VAO_PORTEIRA.some(([c, m]) => Math.abs(u - c) < m) || distPasto(x, z) < 2.6;
  for (const lado of ['N', 'S', 'O', 'L']) {
    let anterior = null;
    for (let u = -CERCA_R; u <= CERCA_R + 0.01; u += 2.5) {
      const uj = Math.abs(Math.abs(u) - CERCA_R) < 0.01 ? u : u + (rnd() - 0.5) * 0.3;
      const [x, z] = paraMundo(lado, uj, CERCA_R);
      if (fechado(uj, x, z) || rnd() < 0.04) { anterior = null; continue; }
      const y = campo.amostra(x, z);
      const alto = 1.35 + rnd() * 0.2;
      mouroes.push(matrizInclinada(x, y - 0.05, z, rnd() * 6.283, (rnd() - 0.5) * 0.08, alto));
      colliders.push({ minX: x - 0.09, maxX: x + 0.09, minY: y - 0.3, maxY: y + alto, minZ: z - 0.09, maxZ: z + 0.09 });
      if (anterior && rnd() > 0.06) {
        for (const h of [0.42, 0.8, 1.16]) fios.push(...fio(anterior, [x, y, z], h, rnd));
      }
      anterior = [x, y, z];
    }
  }

  const lote = (lista, geo, mat, nome, cores = null) => {
    if (!lista.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    for (let i = 0; i < lista.length; i++) { m.setMatrixAt(i, lista[i]); if (cores) m.setColorAt(i, cores[i]); }
    m.name = nome; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    root.add(m);
    return m;
  };
  const capimGeo = cartao();
  const capimMeshes = dividirLotes(capim,capimCor,12).map(l=>lote(l.matrizes,capimGeo,MAT.capimPasto,'pasto-capim',l.cores));
  const toucMesh = lote(touceiras, cartao(), MAT.touceira, 'pasto-touceira', touceiraCor);
  const giros = [...cupins.map(() => rnd()), ...torroes.map(() => rt())];   // mesma ordem de sorteio de antes
  const cupimMesh = lote(cupins.map((c, i) => matriz(c.x, c.y, c.z, giros[i] * 6.283, c.sx, c.sy, c.sx)), cupimGeo, MAT.cupim, 'pasto-cupinzeiro');
  // torrão de 0,3 m não precisa do torno de 48 lados com torrinha (é 3/4 das instâncias)
  const torraoMesh = lote(torroes.map((c, i) => matriz(c.x, c.y, c.z, giros[cupins.length + i] * 6.283, c.sx, c.sy, c.sx)), cupimTorno(12, false), MAT.cupim, 'pasto-torrao');
  const mouraoGeo = new THREE.CylinderGeometry(0.055, 0.075, 1, 7);
  mouraoGeo.translate(0, 0.5, 0);
  const mouraoMesh = lote(mouroes, mouraoGeo, MAT.mourao, 'pasto-mourao');
  const fioMesh = lote(fios, new THREE.BoxGeometry(1, 0.012, 0.012), MAT.cabo, 'pasto-arame');
  for (const m of [...capimMeshes, toucMesh, fioMesh]) if (m) m.userData.nonSolidSurface = true;
  for (const m of [cupimMesh, torraoMesh, mouraoMesh]) if (m) { m.castShadow = true; occluders.push(m); }
  return {
    cupinzeiros: cupins.map((c) => ({ x: +c.x.toFixed(2), z: +c.z.toFixed(2), r: +(0.78 * c.sx).toFixed(2) })),
    censo: { capim: capim.length, touceiras: touceiras.length, cupinzeiros: cupins.length, torroesCupim: torroes.length, mouroes: mouroes.length, fiosArame: fios.length },
  };
}

/* Perfil de torno com 3 lóbulos que torcem com a altura: cone liso lia como pirâmide de pedra.
   Rodada 4: lóbulo 0,30, ruído radial de 6–11 voltas e 2 torrinhas fora do eixo (lia domo).
   Rodada 5: torrinha baixa e gorda, abaixo do topo do corpo (a de 1,3 m lia orelha de gato). */
export const CUPIM_LOBULO = 0.30;
function cupimTorno(lados = 48, torrinhas = true) {
  const perfil = [[1.0, 0], [0.95, 0.1], [0.87, 0.3], [0.76, 0.5], [0.61, 0.69], [0.44, 0.84], [0.26, 0.95], [0.18, 1.0], [0, 1.02]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const torno = (seg, lob, fase) => {
    const geo = new THREE.LatheGeometry(perfil, seg);
    const p = geo.attributes.position, uv = geo.attributes.uv, cor = new Float32Array(p.count * 3);   // vale do lóbulo e pé escurecem: na sombra da mata só o hemisfério ilumina
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const ruido = 0.2 * (0.55 * Math.sin(6 * a + 3.1 * y + fase) + 0.45 * Math.sin(11 * a - 5.3 * y + 2 * fase)) * Math.min(1, y * 4);
      const n = 1 + lob * Math.cos(3 * a + 2.2 * y + fase) + ruido;
      p.setXYZ(i, x * n, y, z * n);
      uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 1.2);
      const crista = 0.5 + 0.5 * Math.cos(3 * a + 2.2 * y + fase), v = Math.max(0.12, 0.12 + 1.05 * crista * crista * (0.55 + 0.45 * Math.min(1, y * 2)) - 2.5 * Math.max(0, -ruido));
      cor.set([v, v * 0.96, v * 0.92], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
    return geo;
  };
  const corpo = torno(lados, CUPIM_LOBULO, 0);
  const torres = !torrinhas ? [] : [[0.25, 0.18, 0.85, 1.1], [-0.18, -0.22, 0.75, 2.9]].map(([dx, dz, alto, fase]) =>
    torno(10, 0.2, fase).scale(0.5, alto, 0.5).translate(dx, 0, dz));
  const geo = torres.length ? mergeGeometries([corpo, ...torres], false) : corpo;
  geo.computeVertexNormals();
  geo.userData.vertsTorno = corpo.attributes.position.count;   // a régua mede o lóbulo só no corpo
  return geo;
}

function matrizInclinada(x, y, z, ry, tilt, alto) {
  _e.set(tilt, ry, tilt * 0.6); _q.setFromEuler(_e);
  _p.set(x, y, z); _s.set(1, alto, 1);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

function fio(a, b, h, rnd) {
  const saida = [], n = 3, flecha = 0.05 + rnd() * 0.05;
  const eixoX = new THREE.Vector3(1, 0, 0), d = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n;
    const y0 = a[1] + (b[1] - a[1]) * t0 + h - flecha * 4 * t0 * (1 - t0);
    const y1 = a[1] + (b[1] - a[1]) * t1 + h - flecha * 4 * t1 * (1 - t1);
    const x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[2] + (b[2] - a[2]) * t0;
    const x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[2] + (b[2] - a[2]) * t1;
    d.set(x1 - x0, y1 - y0, z1 - z0);
    const len = d.length();
    _q.setFromUnitVectors(eixoX, d.normalize());
    _p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); _s.set(len, 1, 1);
    saida.push(new THREE.Matrix4().compose(_p, _q, _s));
  }
  return saida;
}
