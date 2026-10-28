#!/usr/bin/env node
/* ============================================================================
   ads1p-linha-check.mjs — ADS EM 1ª PESSOA: A MASSA ESTÁ NA CRUZ? (SEM NAVEGADOR)
   ----------------------------------------------------------------------------
   POR QUE EXISTE: crítico r4 (27/10) — AK com a massa 64 px abaixo da cruz e
   pistola 134 px abaixo, 48 px à direita. Causa: o estilo 'foco' baixava a arma
   de propósito (off y −0,08/−0,10) e a pistola nem alinhava (auto:false).
   O conserto (`adsEfetivo` em data/vmconfig.js, kill-switch ?ads1pfix=0) leva
   alça e massa ao eixo da câmera nas armas com `ads.linha` (pistol, deagle).
   A AK golden ficou no foco aprovado (cano já a 0°; eval:vm-mira reprova a linha).

   COMO MEDE: refaz em Node a cadeia do runtime (authoredvm.js: câmera do GLB
   invertida, frame, pose idle, alinhamento alça→massa, rolagem, deslize da
   alça, alívio, resíduo off/rotDeg) e o FOV da vmCamera no ADS (fov() do
   pacote × abertura de game.js). Depois RASTERIZA a malha e lê a imagem: o
   topo da arma visível na faixa central tem de cair na cruz. Medir o socket
   que o ADS automático centra seria tautologia (lição do eval:vm-mira); o
   socket aparece só como informação.

   L1  topo da arma na faixa central a ≤ 4 px da cruz (vertical), 16:9 e 3:2
   L2  centro da ponta (massa) a ≤ 4 px da cruz (horizontal)
   L3  cano sem guinada: |yaw| ≤ 0,09 rad (regra do dono: não girar para exibir)

   Uso:
     node tools/eval/ads1p-linha-check.mjs                    (pistol e deagle)
     node tools/eval/ads1p-linha-check.mjs --armas=ak,pistol,m4
     node tools/eval/ads1p-linha-check.mjs --fix=0            (mede o foco antigo)
     node tools/eval/ads1p-linha-check.mjs --mutante=foco     (tem de REPROVAR)
     --asset-root=<dir>  catálogo pago (padrão ~/csbrasil-private-assets/generated/viewmodels)
     --fotos=<dir>       grava o quadro rasterizado por arma e aspecto
   ============================================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { carregar, THREE, io } = await import(pathToFileURL(path.join(ROOT, 'tools/viewmodels/prep/vmpose.mjs')).href);
const { MeshoptDecoder } = await import(pathToFileURL(path.join(ROOT, 'public/vendor/meshopt_decoder.module.js')).href);
const { dequantize } = await import(pathToFileURL(path.join(ROOT, 'node_modules/@gltf-transform/functions/dist/index.js')).href);
const { adsEfetivo, authoredFrameFor, VM_WEAPON, VM_FABRICA } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
await MeshoptDecoder.ready;
io.registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const MUTANTE = arg('mutante');
if (MUTANTE && MUTANTE !== 'foco') throw new Error(`mutante desconhecido: ${MUTANTE} (há: foco)`);
const FIX = MUTANTE === 'foco' ? false : arg('fix', '1') !== '0';
const ARMAS = arg('armas', 'pistol,deagle').split(',').filter(Boolean);
const ASSET_ROOT = arg('asset-root', path.join(os.homedir(), 'csbrasil-private-assets/generated/viewmodels'));
const FOTOS = arg('fotos') ? path.resolve(arg('fotos')) : '';
const ASPECTOS = { '16x9': [1920, 1080], '3x2': [1800, 1200] };
const LIM_PX = 4;
const LIM_YAW = 0.09;
const JANELA = 60;   // meia-largura (px) da faixa central onde se procura a massa
const D2R = Math.PI / 180;
// Mesmas regras do runtime (authoredvm.js / game.js).
const HAND_MATERIAL = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;
const CURTAS = new Set(['pistol', 'deagle', 'revolver38']);

// Lançamento: arma com produto da fábrica serve `fab#`; a AK fica na golden.
function fonte(arma) {
  if (VM_FABRICA[arma]) {
    return { chave: `fab#${arma}`, familia: VM_FABRICA[arma].familia, cfg: VM_FABRICA[arma],
      glb: path.join(ASSET_ROOT, 'fabrica', `${arma}-fabrica.glb`) };
  }
  if (VM_WEAPON[arma]?.golden) {
    return { chave: `gold#${arma}`, familia: VM_WEAPON[arma].family, cfg: VM_WEAPON[arma],
      glb: path.join(ROOT, 'public/models/viewmodels/coro', `${arma}-hires.glb`) };
  }
  return null;
}

const clipe = (pose, nome) => [...pose.anims.keys()].find((k) => k.toLowerCase() === nome) || null;

async function montar(arma) {
  const f = fonte(arma);
  if (!f) throw new Error(`${arma}: sem fonte fab#/gold# no lançamento`);
  if (!fs.existsSync(f.glb)) throw new Error(`${arma}: GLB ausente (${f.glb}) — passe --asset-root`);
  const pose = await carregar(f.glb);
  await pose.doc.transform(dequantize());
  // Pose do ADS assentado: idle no quadro 0 + clipe `ads` aditivo com peso 1 (= ads no quadro 0).
  const trs = pose.local(clipe(pose, 'idle'), 0);
  const adsClip = f.chave.startsWith('gold#') ? null : clipe(pose, 'ads');
  if (adsClip) {
    const a = pose.local(adsClip, 0);
    for (const ch of pose.anims.get(adsClip).listChannels()) {
      const i = pose.index.get(ch.getTargetNode());
      const k = { translation: 't', rotation: 'r', scale: 's' }[ch.getTargetPath()];
      if (k) trs[i][k] = a[i][k];
    }
  }
  const W = pose.mundo(trs);
  const ci = pose.nodes.findIndex((n) => n.getCamera());
  const camNode = pose.nodes[ci].getCamera();
  const camInv = W[ci].clone().invert();
  const cameraFov = camNode.getYFov() / D2R;
  const cameraAspect = camNode.getAspectRatio() || 16 / 9;
  const frame = authoredFrameFor(arma, f.familia, f.chave, cameraFov);
  const ads = adsEfetivo(f.cfg.ads, FIX);
  // Pontos de mira em espaço de cena (câmera do GLB na origem).
  let pontos;
  if (f.chave.startsWith('gold#')) {
    const g = ads.golden;
    const B = camInv.clone().multiply(W[pose.byName.get(g.osso)]);
    const p = (v) => new THREE.Vector3(...v).applyMatrix4(B);
    pontos = { sight: p(g.alca), muzzle: p(g.massa), up: p(g.alca.map((c, k) => c + g.cima[k] * 0.1)) };
  } else {
    const p = (n) => new THREE.Vector3().setFromMatrixPosition(W[pose.byName.get(n)]).applyMatrix4(camInv);
    pontos = { sight: p('SOCKET_FAB_SIGHT'), muzzle: p('SOCKET_FAB_MUZZLE'), up: p('SOCKET_FAB_UP') };
  }
  const tris = pose.triangulos(W).map((t) => ({ ...t, mao: HAND_MATERIAL.test(t.mat) }));
  return { arma, f, pose, camInv, frame, ads, pontos, tris,
    fovPacote: f.chave.startsWith('gold#') ? cameraFov : frame.fov, cameraAspect };
}

// Espelho de AuthoredViewModels.update com ADS = 1, sem recuo nem saque.
function mountAds(m) {
  const { frame, ads, pontos } = m;
  const mount = new THREE.Object3D();
  const r = frame.rotDeg || [0, 0, 0];
  mount.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R);
  mount.position.set(frame.x, frame.y, frame.z);
  if (m.f.chave.startsWith('fab#') && frame.scale) mount.scale.setScalar(frame.scale);
  const cena = (p) => { mount.updateMatrixWorld(true); return p.clone().applyMatrix4(mount.matrixWorld); };
  if (ads.auto) {
    const fwd = cena(pontos.muzzle).sub(cena(pontos.sight)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(fwd, new THREE.Vector3(0, 0, -1));
    mount.quaternion.premultiply(q);
    const up = cena(pontos.up), alca = cena(pontos.sight);
    const rol = Math.atan2(up.x - alca.x, up.y - alca.y);
    mount.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rol));
    const s = cena(pontos.sight);
    mount.position.x -= s.x;
    mount.position.y -= s.y;
    if (ads.alivio) mount.position.z += -ads.alivio - s.z;
  }
  mount.position.x += ads.off[0];
  mount.position.y += ads.off[1];
  mount.position.z += ads.pull + ads.off[2];
  mount.rotation.x += ads.rotDeg[0] * D2R;
  mount.rotation.y += ads.rotDeg[1] * D2R;
  mount.rotation.z += ads.rotDeg[2] * D2R;
  mount.updateMatrixWorld(true);
  return mount.matrixWorld.clone();
}

// FOV vertical da vmCamera no ADS: fov() do pacote e a abertura de game.js (shortGun 0,35; resto 0,50).
function fovAds(m, aspecto) {
  const v0 = m.fovPacote * D2R;
  const halfH = Math.atan(Math.tan(v0 / 2) * m.cameraAspect);
  const base = 2 * Math.atan(Math.tan(halfH) / aspecto);
  return 2 * Math.atan(Math.tan(base / 2) * (1 + (CURTAS.has(m.arma) ? 0.35 : 0.5)));
}

function raster(tris, view, fov, w, h) {
  const z = new Float32Array(w * h).fill(Infinity);
  const dono = new Uint8Array(w * h);   // 0 vazio, 1 arma, 2 mão/manga
  const f = 1 / Math.tan(fov / 2);
  const asp = w / h;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (const t of tris) {
    for (let k = 0; k < 3; k++) v[k].set(t.p[k * 3], t.p[k * 3 + 1], t.p[k * 3 + 2]).applyMatrix4(view);
    if (v[0].z > -0.01 || v[1].z > -0.01 || v[2].z > -0.01) continue;
    const P = v.map((q) => [(q.x * f / asp / -q.z + 1) * w / 2, (1 - q.y * f / -q.z) * h / 2, -q.z]);
    const minx = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0])));
    const maxx = Math.min(w - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
    const miny = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1])));
    const maxy = Math.min(h - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
    const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    if (Math.abs(area) < 1e-9) continue;
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area;
        const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const d = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2];
        const o = y * w + x;
        if (d >= z[o]) continue;
        z[o] = d;
        dono[o] = t.mao ? 2 : 1;
      }
    }
  }
  return dono;
}

// Massa vista: topo da arma VISÍVEL na faixa central; x = centro dos pixels das 4 linhas do topo.
function massaNaImagem(dono, w, h) {
  const cx = w / 2, cy = h / 2;
  let topo = -1;
  for (let y = 0; y < h && topo < 0; y++) {
    for (let x = Math.floor(cx - JANELA); x < Math.ceil(cx + JANELA); x++) if (dono[y * w + x] === 1) { topo = y; break; }
  }
  if (topo < 0) return null;
  let sx = 0, n = 0;
  for (let y = topo; y < Math.min(h, topo + 4); y++) {
    for (let x = Math.floor(cx - JANELA); x < Math.ceil(cx + JANELA); x++) if (dono[y * w + x] === 1) { sx += x + 0.5; n++; }
  }
  return { dx: sx / n - cx, dy: topo - cy };
}

async function foto(dono, w, h, arquivo) {
  const { default: sharp } = await import('sharp');
  const img = Buffer.alloc(w * h * 3, 235);
  for (let o = 0; o < w * h; o++) {
    if (dono[o] === 1) { img[o * 3] = 200; img[o * 3 + 1] = 40; img[o * 3 + 2] = 40; }
    else if (dono[o] === 2) { img[o * 3] = 60; img[o * 3 + 1] = 160; img[o * 3 + 2] = 70; }
  }
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let d = -12; d <= 12; d++) for (const [x, y] of [[cx + d, cy], [cx, cy + d]]) { const o = y * w + x; img[o * 3] = 0; img[o * 3 + 1] = 0; img[o * 3 + 2] = 0; }
  await sharp(img, { raw: { width: w, height: h, channels: 3 } }).png().toFile(arquivo);
}

const falhas = [];
const fmt = (v, c = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(c)}`;
console.log(`ads1p-linha: ${FIX ? 'linha de mira (ads1pfix ligado)' : 'foco antigo (ads1pfix=0)'}${MUTANTE ? ` · mutante ${MUTANTE}` : ''}`);
for (const arma of ARMAS) {
  let m;
  try { m = await montar(arma); } catch (e) { falhas.push(`${arma}: não sei medir — ${e.message}`); console.log(`NÃO SEI MEDIR ${arma} — ${e.message}`); continue; }
  const M = mountAds(m);
  const view = M.clone().multiply(m.camInv);
  const cenaFinal = (p) => p.clone().applyMatrix4(M);
  const alca = cenaFinal(m.pontos.sight), massa = cenaFinal(m.pontos.muzzle);
  const cano = massa.clone().sub(alca).normalize();
  const pitch = Math.atan2(cano.y, -cano.z), yaw = Math.atan2(-cano.x, -cano.z);
  for (const [nome, [w, h]] of Object.entries(ASPECTOS)) {
    const fov = fovAds(m, w / h);
    const k = (h / 2) / Math.tan(fov / 2);
    const px = (p) => [p.x / -p.z * k, -p.y / -p.z * k];
    const [sax, say] = px(alca), [smx, smy] = px(massa);
    const dono = raster(m.tris, view, fov, w, h);
    const vista = massaNaImagem(dono, w, h);
    if (FOTOS) { fs.mkdirSync(FOTOS, { recursive: true }); await foto(dono, w, h, path.join(FOTOS, `${arma}-${nome}${FIX ? '' : '-foco'}.png`)); }
    const ang = `cano pitch ${fmt(pitch / D2R)}° yaw ${fmt(yaw / D2R)}° (${fmt(yaw, 3)} rad)`;
    const sock = `socket alça (${fmt(sax, 0)}, ${fmt(say, 0)}) massa (${fmt(smx, 0)}, ${fmt(smy, 0)}) px`;
    if (!vista) {
      falhas.push(`${arma} ${nome}: nenhuma arma na faixa central de ±${JANELA} px`);
      console.log(`FALHA ${arma} ${nome} — arma fora da faixa central; ${sock}; ${ang}`);
      continue;
    }
    const L1 = Math.abs(vista.dy) <= LIM_PX, L2 = Math.abs(vista.dx) <= LIM_PX, L3 = Math.abs(yaw) <= LIM_YAW;
    const graus = (d) => Math.atan(d / k) / D2R;
    const txt = `massa vista a (${fmt(vista.dx)}, ${fmt(vista.dy)}) px da cruz em ${w}×${h} [${fmt(graus(vista.dx), 2)}°, ${fmt(-graus(vista.dy), 2)}° no FOV ${(fov / D2R).toFixed(1)}°]; ${sock}; ${ang}`;
    if (!L1) falhas.push(`${arma} ${nome}: L1 topo ${fmt(vista.dy)} px da cruz (teto ${LIM_PX})`);
    if (!L2) falhas.push(`${arma} ${nome}: L2 massa ${fmt(vista.dx)} px de lado (teto ${LIM_PX})`);
    if (!L3) falhas.push(`${arma} ${nome}: L3 yaw ${fmt(yaw, 3)} rad (teto ${LIM_YAW})`);
    console.log(`${L1 && L2 && L3 ? 'PASSA' : 'FALHA'} ${arma} ${nome} — ${txt}`);
  }
}

if (MUTANTE) {
  if (!falhas.length) { console.error(`MUTANTE ${MUTANTE} SOBREVIVEU: a régua não distingue o foco da linha de mira`); process.exit(1); }
  console.log(`mutante ${MUTANTE} reprovado como devia (${falhas.length} falhas)`);
  process.exit(0);
}
if (falhas.length) { console.error(`\n${falhas.length} falha(s):\n- ${falhas.join('\n- ')}`); process.exit(1); }
console.log('\nads1p-linha: tudo na cruz');
