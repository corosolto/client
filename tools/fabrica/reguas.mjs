#!/usr/bin/env node
/** Fábrica — réguas offline do PRODUTO (o arquivo servido), com mutantes.
 *
 *   node tools/fabrica/reguas.mjs [ids…] [--mutantes] [--json=<arquivo>]
 *
 * FB1 cache       VM_FABRICA_BYTES (public/js/data/vmfabrica.js) = sha256 do arquivo servido;
 *                 sem isso o navegador serve o GLB de ontem (BUG-157).
 * FB2 estrutura   um skin só com o osso Arma; clipes que a ficha promete; câmera; sockets
 *                 SIGHT/MUZZLE/UP/BARREL; materiais de mão nos nomes que o runtime reconhece.
 * FB3 orientação  no idle, a boca (SOCKET_FAB_BARREL) fica mais longe do olho que o centro da
 *                 arma e à frente da mão forte — a KXG12 montada de trás para a frente (23/09)
 *                 é exatamente o mutante `invertida`.
 * FB4 zona-contato  no idle, a palma forte fica a ≤ 4 cm da malha da arma (a mão de apoio é
 *                 da régua de imagem `maos`, no jogo).
 * Mutantes (--mutantes): cache-velho, sem-socket, invertida, mao-solta — cada um TEM de reprovar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as THREE from 'three';

import { ARQUIVO_PRODUTO, MANIFESTO, RAIZ_REPO, lerJson, sha256 } from './lib/comum.mjs';
import { camera, carregarGlb, posar } from './lib/cena3.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const manifesto = lerJson(MANIFESTO);
const ids = args.filter((a) => !a.startsWith('--'));
const alvo = ids.length ? ids : Object.keys(manifesto.candidates);
const PALMA_MAX_CM = 4;

async function versoes() {
  const url = pathToFileURL(path.join(RAIZ_REPO, 'public/js/data/vmfabrica.js')).href;
  return (await import(`${url}?t=${Date.now()}`)).VM_FABRICA_BYTES;
}

function pontosArma(g) {
  const cam = camera(g);
  const inv = cam.matrixWorld.clone().invert();
  const out = [];
  const v = new THREE.Vector3();
  g.scene.traverse((o) => {
    if (!o.isSkinnedMesh || [o.material].flat().some((m) => /CoroSolto_FP_/.test(m?.name || ''))) return;
    o.skeleton.update();
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 2) {
      v.fromBufferAttribute(pos, i);
      o.applyBoneTransform(i, v);
      out.push(v.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv));
    }
  });
  return out;
}

const naCamera = (g, nome) => {
  const o = g.scene.getObjectByName(nome);
  if (!o) return null;
  return o.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera(g).matrixWorld.clone().invert());
};

export async function medir(id, mut = '') {
  const c = manifesto.candidates[id];
  const arquivo = ARQUIVO_PRODUTO(id);
  const r = { id, falhas: [], medidas: {} };
  if (!c || !fs.existsSync(arquivo)) { r.falhas.push(`${id}: produto ausente`); return r; }
  // FB1
  const versao = (await versoes())[id];
  const real = sha256(arquivo).slice(0, 10);
  r.medidas.cache = { versao, real };
  if ((mut === 'cache-velho' ? 'deadbeef00' : versao) !== real) r.falhas.push(`FB1 cache: vmfabrica.js diz ${mut === 'cache-velho' ? 'deadbeef00' : versao}, arquivo é ${real}`);
  // FB2
  const g = await carregarGlb(arquivo);
  const nos = new Set();
  g.scene.traverse((o) => nos.add(o.name));
  const skins = new Set();
  g.scene.traverse((o) => { if (o.isSkinnedMesh) skins.add(o.skeleton); });
  const sockets = ['SOCKET_FAB_SIGHT', 'SOCKET_FAB_MUZZLE', 'SOCKET_FAB_UP', 'SOCKET_FAB_BARREL', `SOCKET_WEAPON_${id.toUpperCase()}`]
    .filter((s) => (mut === 'sem-socket' ? s !== 'SOCKET_FAB_SIGHT' : true));
  const faltam = ['SOCKET_FAB_SIGHT', 'SOCKET_FAB_MUZZLE', 'SOCKET_FAB_UP', 'SOCKET_FAB_BARREL', `SOCKET_WEAPON_${id.toUpperCase()}`, 'Arma', 'ik_hand_gun']
    .filter((s) => !nos.has(s) || !sockets.concat(['Arma', 'ik_hand_gun']).includes(s));
  const clipes = new Set(g.animations.map((a) => a.name));
  const prometidos = c.clipes.map((x) => x.nome).filter((n) => !clipes.has(n));
  const maos = new Set();
  g.scene.traverse((o) => { if (o.isMesh) for (const m of [o.material].flat()) if (/CoroSolto_FP_(Cloth|Glove|Hand)/.test(m?.name || '')) maos.add(m.name); });
  r.medidas.estrutura = { skeletons: new Set([...skins].map((s) => s.bones.length)).size, clipes: [...clipes], maos: [...maos] };
  if (faltam.length) r.falhas.push(`FB2 estrutura: faltam ${faltam.join(', ')}`);
  if (prometidos.length) r.falhas.push(`FB2 estrutura: clipes prometidos ausentes ${prometidos.join(', ')}`);
  if (!camera(g)) r.falhas.push('FB2 estrutura: sem câmera de autoria');
  if (maos.size < 3) r.falhas.push(`FB2 estrutura: materiais de mão ${[...maos].join(',')} (esperado Cloth/Glove/Hand)`);
  // FB3 + FB4 no idle
  posar(g, 'idle', 0);
  let pts = pontosArma(g);
  const boca = naCamera(g, 'SOCKET_FAB_BARREL');
  const forte = naCamera(g, 'hand_r');
  if (mut === 'invertida') {
    // A arma girada 180° em torno do próprio centro (o defeito da KXG12 de 23/09).
    const ctr = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length);
    const giro = (p) => p.clone().sub(ctr).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).add(ctr);
    pts = pts.map(giro);
    boca.copy(giro(boca));
  }
  const centro = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length);
  r.medidas.orientacao = { bocaFrente: +(-boca.z).toFixed(3), centroFrente: +(-centro.z).toFixed(3), maoForteFrente: +(-forte.z).toFixed(3) };
  if (!(-boca.z > -centro.z && -boca.z > -forte.z)) r.falhas.push(`FB3 orientação: arma invertida — boca a ${(-boca.z).toFixed(2)} m, centro ${(-centro.z).toFixed(2)} m, mão forte ${(-forte.z).toFixed(2)} m`);
  const palmaF = ['hand_r', 'middle_01_r', 'index_01_r', 'ring_01_r'].map((n) => naCamera(g, n)).filter(Boolean)
    .reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(4);
  if (mut === 'mao-solta') palmaF.x += 0.12;
  let d = Infinity;
  for (const p of pts) d = Math.min(d, p.distanceTo(palmaF));
  r.medidas.contato = { palmaForteCm: +(d * 100).toFixed(2) };
  if (d * 100 > PALMA_MAX_CM) r.falhas.push(`FB4 zona de contato: palma forte a ${(d * 100).toFixed(1)} cm da arma (teto ${PALMA_MAX_CM})`);
  return r;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const saida = { schemaVersion: 1, base: [], mutantes: [] };
  for (const id of alvo) saida.base.push(await medir(id));
  if (flag('mutantes')) {
    for (const mut of ['cache-velho', 'sem-socket', 'invertida', 'mao-solta']) {
      const r = await medir(alvo[0], mut);
      saida.mutantes.push({ mutante: mut, id: alvo[0], mordeu: r.falhas.length > 0, falhas: r.falhas });
    }
  }
  for (const r of saida.base) console.log(`${r.falhas.length ? 'FALHA' : 'OK   '} ${r.id.padEnd(8)} ${r.falhas.join(' | ') || JSON.stringify(r.medidas.orientacao) + ' palma ' + r.medidas.contato.palmaForteCm + ' cm'}`);
  for (const m of saida.mutantes) console.log(`MUTANTE ${m.mutante.padEnd(12)} ${m.mordeu ? 'mordeu' : 'NÃO MORDEU'} — ${m.falhas[0] || ''}`);
  saida.ok = saida.base.every((r) => !r.falhas.length) && saida.mutantes.every((m) => m.mordeu);
  if (opt('json')) fs.writeFileSync(opt('json'), `${JSON.stringify(saida, null, 2)}\n`);
  console.log(`FABRICA_REGUAS=${JSON.stringify({ ok: saida.ok, falhas: saida.base.filter((r) => r.falhas.length).map((r) => r.id) })}`);
  process.exitCode = saida.ok ? 0 : 1;
}
