import * as THREE from 'three';

export function direcaoDesviada(origem, alvo, horizontal, vertical) {
  const dir = alvo.clone().sub(origem).normalize();
  const direita = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
  if (direita.lengthSq() < 1e-6) direita.set(1, 0, 0);
  direita.normalize();
  const cima = new THREE.Vector3().crossVectors(direita, dir).normalize();
  return dir.addScaledVector(direita, Math.tan(horizontal)).addScaledVector(cima, Math.tan(vertical)).normalize();
}

const EPS = 1e-6;
function caixaCompleta(objeto) {
  const g = objeto.geometry, p = g?.parameters;
  if (!objeto.isMesh || objeto.isInstancedMesh || objeto.isSkinnedMesh || objeto.children.length
    || !objeto.material || Array.isArray(objeto.material) || g?.type !== 'BoxGeometry'
    || g.morphAttributes.position?.length || g.drawRange.start !== 0 || g.drawRange.count < 36
    || !p || [p.width, p.height, p.depth].some(v => !Number.isFinite(v) || v <= 0)
    || [p.widthSegments, p.heightSegments, p.depthSegments].some(v => v !== 1)) return null;
  const modelo = new THREE.BoxGeometry(p.width, p.height, p.depth);
  const a = g.attributes.position, b = modelo.attributes.position;
  let completa = a?.count === b.count && a.itemSize === 3 && g.index?.count === modelo.index.count;
  for (let i = 0; completa && i < b.count; i++) {
    completa = a.getX(i) === b.getX(i) && a.getY(i) === b.getY(i) && a.getZ(i) === b.getZ(i);
  }
  for (let i = 0; completa && i < modelo.index.count; i++) completa = g.index.getX(i) === modelo.index.getX(i);
  modelo.dispose();
  return completa ? new THREE.Box3(new THREE.Vector3(-p.width/2, -p.height/2, -p.depth/2),
    new THREE.Vector3(p.width/2, p.height/2, p.depth/2)) : null;
}

function intervaloCaixa(origem, direcao, caixa) {
  let entrada = -Infinity, saida = Infinity;
  for (const eixo of ['x', 'y', 'z']) {
    const d = direcao[eixo], o = origem[eixo];
    if (Math.abs(d) < 1e-12) {
      if (o < caixa.min[eixo] || o > caixa.max[eixo]) return null;
      continue;
    }
    const a = (caixa.min[eixo] - o) / d, b = (caixa.max[eixo] - o) / d;
    entrada = Math.max(entrada, Math.min(a, b)); saida = Math.min(saida, Math.max(a, b));
    if (entrada > saida) return null;
  }
  return { entrada, saida };
}

// Autoriza uma única caixa verificada; volumes desconhecidos sobrepostos bloqueiam conservadoramente.
export function saidaPenetracao(hit, direcao, cfg, oclusores) {
  if (!hit?.object || !Number.isFinite(hit.distance) || hit.distance < 0
    || !Number.isFinite(direcao.lengthSq()) || Math.abs(direcao.lengthSq() - 1) > EPS) return null;
  const caixa = caixaCompleta(hit.object);
  if (!caixa) return null;
  const matriz = hit.object.matrixWorld;
  if (!matriz.elements.every(Number.isFinite) || Math.abs(matriz.determinant()) < 1e-12) return null;
  const inversa = matriz.clone().invert();
  const origem = hit.point.clone().addScaledVector(direcao, -hit.distance);
  const local = origem.clone().applyMatrix4(inversa);
  const vetor = origem.clone().add(direcao).applyMatrix4(inversa).sub(local);
  const trecho = intervaloCaixa(local, vetor, caixa);
  if (!trecho || trecho.entrada < -EPS || Math.abs(trecho.entrada - hit.distance) > EPS) return null;
  const espessura = trecho.saida - trecho.entrada;
  if (!(espessura > EPS && espessura <= cfg.maxThickness + EPS)) return null;
  for (const outro of oclusores) {
    if (outro === hit.object) continue;
    const limite = new THREE.Box3().setFromObject(outro);
    if (limite.isEmpty()) continue;
    if (![...limite.min.toArray(), ...limite.max.toArray()].every(Number.isFinite)) return null;
    const sobreposto = intervaloCaixa(hit.point, direcao, limite);
    if (sobreposto && sobreposto.saida >= -EPS && sobreposto.entrada <= espessura + EPS) return null;
  }
  return { exitDistance: trecho.saida, damageMul: cfg.damageMul };
}

export function resolverRaio({ origem, direcao, alvos, paredes, intersectar, alcance, atravessar }) {
  const parede = paredes[0], limite = parede?.distance ?? Infinity;
  let primeiro = null;
  for (const alvo of alvos) {
    const hit = intersectar(origem, direcao, alvo.pos, alvo.crouchF, alvo.cabeca);   // cabeca: perfil justo opcional (hitboxes.js)
    if (!hit || hit.dist > alcance) continue;
    if (!primeiro || hit.dist < primeiro.dist) primeiro = { ent: alvo.ent, ...hit };
  }
  const impacto = hit => ({ ...hit, point: origem.clone().addScaledVector(direcao, hit.dist) });
  if (primeiro && primeiro.dist < limite - EPS) return impacto(primeiro);
  if (primeiro && parede && atravessar) {
    const saida = atravessar(parede);
    const seguinte = paredes.find(p => p.object !== parede.object);
    if (saida && primeiro.dist > saida.exitDistance + EPS
      && (!seguinte || primeiro.dist < seguinte.distance - EPS)) {
      return impacto({ ...primeiro, damageMul: saida.damageMul, atravessou: parede });
    }
  }
  return parede ? { ent: null, head: false, dist: limite, point: parede.point,
    object: parede.object, n: parede.face?.normal || null } : null;
}
