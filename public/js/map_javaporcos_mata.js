/* Cinturão de mata fechada: 5 m caminháveis com tronco colidível, depois parede opaca.
   A mata É o limite do mapa — não existe cerca-caixote. Brief: docs/maps/invasao-javaporcos.md. */
import * as THREE from 'three';
import { CIDADE, HALF, EIXOS, TRILHAS, distTrilha, paraMundo, CLAREIRA_R } from './map_javaporcos_relevo.js';

/* Cotas da mata (faixa caminhável, parede de colisor, coluna, folga de trilha e
   achatamento da copa): docs/maps/invasao-javaporcos.md, seção "Cotas da mata". */
export const V_ANDAVEL = 37.9;
export const V_PAREDE0 = 37.9;
export const V_PAREDE1 = HALF;
const COLUNA = 2.5;
const FOLGA_TRILHA = 2.9;
const ACHATAMENTO = 0.62;          // copa é disco, não bola: proporção medida nas referências

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
  const troncoGeo = new THREE.CylinderGeometry(0.16, 0.34, 1, 7, 1, true);
  const copaGeo = new THREE.IcosahedronGeometry(1, 1);
  const moitaGeo = new THREE.IcosahedronGeometry(1, 0);
  const cipoGeo = new THREE.CylinderGeometry(0.05, 0.035, 1, 4, 1, true);
  const matoGeo = new THREE.PlaneGeometry(1, 1);

  const troncos = [], copaA = [], copaB = [], copaC = [], moitas = [], cipos = [], matos = [];
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
      if (v < CIDADE - 0.6) continue;
      const px = x + (rnd() - 0.5) * 1.9, pz = z + (rnd() - 0.5) * 1.9;
      const vp = ladoDe(px, pz).v;
      if (vp < CIDADE - 0.6 || vp > HALF - 0.4) continue;
      const dt = distTrilha(px, pz);
      if (dt < 2.3) continue;
      const borda = Math.min(1, (vp - CIDADE + 0.6) / 3.5);
      const y0 = campo.amostra(px, pz);
      const alto = 6.5 + rnd() * 7.5 * (0.45 + 0.55 * borda);
      const ry = rnd() * Math.PI * 2;
      const r = 0.52 + rnd() * 0.4;
      troncos.push(matriz(px, y0 + alto / 2, pz, ry, r, alto, r));

      /* Copa ACHATADA (0,62 de proporção) e com a base SEMPRE acima de 2,4 m: a primeira
         versão alongava a copa no Y e ela descia até o chão — a câmera andava dentro dela. */
      const copas = [[0.66, 2.35], [0.82, 1.85], [0.97, 1.2]];
      const destino = [copaA, copaB, copaC];
      for (let c = 0; c < 3; c++) {
        const [frac, raio] = copas[c];
        const jr = raio * (0.82 + rnd() * 0.42);
        const cy = Math.max(y0 + 2.4 + jr * ACHATAMENTO, y0 + alto * frac);
        destino[c].push(matriz(px + (rnd() - 0.5) * 0.9, cy, pz + (rnd() - 0.5) * 0.9,
          rnd() * Math.PI * 2, jr, jr * ACHATAMENTO, jr));
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
      if (v < CIDADE - 2.5) continue;
      const px = x + (rnd() - 0.5) * 1.5, pz = z + (rnd() - 0.5) * 1.5;
      const vp = ladoDe(px, pz).v;
      if (vp < CIDADE - 2.5 || vp > HALF - 0.3) continue;
      const dt = distTrilha(px, pz);
      if (dt < 1.95) continue;
      const y0 = campo.amostra(px, pz);
      const escala = 0.75 + rnd() * 1.05;
      moitas.push(matriz(px, y0 + escala * 0.55, pz, rnd() * 6.283, escala * 1.25, escala * 0.95, escala * 1.25));
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
        copaB.push(matriz(ax + s * (1.4 + rnd()), y0 + 5.0 + rnd() * 1.4, az + (rnd() - 0.5) * 1.6,
          rnd() * 6.283, jr, jr * 0.62, jr));
      }
    }
  }

  /* Chão pisado da trilha: retalho de terra instanciado sobre o terreno. Sem ele a trilha
     é um corredor de grama e o jogador não lê "caminho", lê "falha na mata". */
  const pisadas = [];
  for (const e of EIXOS) {
    for (let t = 0; t <= 1.0001; t += 0.045) {
      const i = Math.min(e.pts.length - 2, Math.floor(t * (e.pts.length - 1)));
      const ft = t * (e.pts.length - 1) - i;
      const ax = e.pts[i][0] + (e.pts[i + 1][0] - e.pts[i][0]) * ft;
      const az = e.pts[i][1] + (e.pts[i + 1][1] - e.pts[i][1]) * ft;
      const esc = 2.6 + rnd() * 1.6;
      pisadas.push(matriz(ax + (rnd() - 0.5) * 0.7, campo.amostra(ax, az) + 0.03, az + (rnd() - 0.5) * 0.7,
        rnd() * 6.283, esc, 1, esc));
    }
    const [cx, cz] = e.clareira;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.283, r = k ? 1.6 + rnd() * 1.9 : 0;
      pisadas.push(matriz(cx + Math.cos(a) * r, campo.amostra(cx, cz) + 0.03, cz + Math.sin(a) * r,
        rnd() * 6.283, 3.0 + rnd() * 1.4, 1, 3.0 + rnd() * 1.4));
    }
  }

  const add = (lista, geo, mat, nome, sombra = true) => {
    if (!lista.length) return null;
    const malha = porMatriz(lista, geo, mat, nome, sombra);
    root.add(malha);
    return malha;
  };
  const troncoMesh = add(troncos, troncoGeo, MAT.tronco, 'mata-troncos');
  const copa1 = add(copaA, copaGeo, MAT.copaEscura, 'mata-copa-baixa');
  const copa2 = add(copaB, copaGeo, MAT.copa, 'mata-copa-media');
  const copa3 = add(copaC, copaGeo, MAT.copaClara, 'mata-copa-alta');
  const moitaMesh = add(moitas, moitaGeo, MAT.moita, 'mata-subbosque', false);
  const cipoMesh = add(cipos, cipoGeo, MAT.cipo, 'mata-cipo', false);
  const matoMesh = add(matos, matoGeo, MAT.mato, 'mata-capim', false);
  const pisadaGeo = new THREE.PlaneGeometry(1, 1);
  pisadaGeo.rotateX(-Math.PI / 2);
  const pisadaMesh = add(pisadas, pisadaGeo, MAT.terraTrilha, 'mata-trilha-pisada', false);
  for (const m of [moitaMesh, cipoMesh, matoMesh, pisadaMesh]) if (m) m.userData.nonSolidSurface = true;
  for (const m of [troncoMesh, copa1, copa2, copa3]) if (m) occluders.push(m);
  if (matoMesh) matoMesh.material.side = THREE.DoubleSide;


  const boarEntrances = EIXOS.map((e) => ({
    id: e.id, lado: e.lado, trilha: e.id,
    x: +e.clareira[0].toFixed(2), z: +e.clareira[1].toFixed(2),
  }));

  return {
    boarEntrances,
    censo: {
      arvores: troncos.length, copas: copaA.length + copaB.length + copaC.length,
      subbosque: moitas.length + matos.length + cipos.length,
      colisoresTronco: troncosColididos, colisoresParede: paredes,
      trilhaPisada: pisadas.length,
      instanciados: [troncoMesh, copa1, copa2, copa3, moitaMesh, cipoMesh, matoMesh, pisadaMesh].filter(Boolean).length,
    },
  };
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
        if (!livre && inicio !== null) { if (v - 0.5 - inicio >= 1.4) corridas.push([inicio, v - 0.5]); inicio = null; }
      }
      /* A última corrida fecha FORA do laço: sem este flush só sobravam os fragmentos ao
         lado de trilha, e a parede abria no meio de cada lado (medido: fuga a 57,4 m). */
      if (inicio !== null && V_PAREDE1 - inicio >= 1.4) corridas.push([inicio, V_PAREDE1]);
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
