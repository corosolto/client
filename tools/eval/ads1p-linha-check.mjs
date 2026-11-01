#!/usr/bin/env node
// Rasteriza o ADS aplicado por AuthoredViewModels.update, sem réplica da montagem.
// Contratos L1–L3 e limites: docs/visual-consistency/AK-ADS.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const PERMITIDAS = new Set(['mutante', 'fix', 'armas', 'asset-root', 'fotos']);
for (const a of process.argv.slice(2)) {
  if (!a.startsWith('--')) continue;
  const k = a.slice(2).split('=')[0];
  if (!PERMITIDAS.has(k) || a === `--${k}`) { console.error(`flag inválida ou sem valor: ${a}`); process.exit(2); }
}
const MUTANTE = arg('mutante');
if (MUTANTE && !['foco', 'lateral', 'vertical'].includes(MUTANTE))
  { console.error(`mutante desconhecido: ${MUTANTE} (há: foco, lateral, vertical)`); process.exit(2); }
const FIX = MUTANTE === 'foco' ? false : arg('fix', '1') !== '0';
const ARMAS = arg('armas', 'pistol,deagle,ak').split(',').filter(Boolean);

// A flag liga/desliga ads1pfix/vmfabrica NO módulo real: location.search precisa
// existir antes do import de authoredvm.js (mesma técnica do commit 4e273b5c).
if (typeof window === 'undefined')
  globalThis.window = { location: { search: FIX ? '?vmfabrica=1' : '?vmfabrica=1&ads1pfix=0' } };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { carregar, THREE, io } = await import(pathToFileURL(path.join(ROOT, 'tools/viewmodels/prep/vmpose.mjs')).href);
const { MeshoptDecoder } = await import(pathToFileURL(path.join(ROOT, 'public/vendor/meshopt_decoder.module.js')).href);
const { dequantize } = await import(pathToFileURL(path.join(ROOT, 'node_modules/@gltf-transform/functions/dist/index.js')).href);
const { adsEfetivo, authoredFrameFor, VM_WEAPON, VM_FABRICA } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
const { AuthoredViewModels } = await import(pathToFileURL(path.join(ROOT, 'public/js/authoredvm.js')).href);
const THREE_RT = await import('three');
await MeshoptDecoder.ready;
io.registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const ASSET_ROOT = arg('asset-root', path.join(os.homedir(), 'csbrasil-private-assets/generated/viewmodels'));
const FOTOS = arg('fotos') ? path.resolve(arg('fotos')) : '';
const ASPECTOS = { '16x9': [1920, 1080], '3x2': [1800, 1200], 'r3x2': [1320, 880], 'rwide': [844, 390] };
const LIM_PX = 4;
const LIM_YAW = 0.09;
const JANELA = 60;   // meia-largura (px) da faixa central onde se procura a massa
const D2R = Math.PI / 180;
// Mesmas regras do runtime (authoredvm.js / game.js).
const HAND_MATERIAL = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;
const CURTAS = new Set(['pistol', 'deagle', 'revolver38']);
// Contrato de linha de mira (docs/visual-consistency/AK-ADS.md): o ADS destas
// armas TEM de medir linha (massa na cruz), mesmo que a config diga 'foco'.
const LINHA = new Set(['ak']);

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

// Lote inválido é GREEN falso: recusa antes de medir (exit 2).
if (!ARMAS.length) { console.error('--armas vazio'); process.exit(2); }
if (new Set(ARMAS).size !== ARMAS.length) { console.error(`--armas duplicado: ${ARMAS.join(',')}`); process.exit(2); }
for (const a of ARMAS) if (!fonte(a)) { console.error(`arma inválida: ${a} (sem fonte fab#/gold#)`); process.exit(2); }

const clipe = (pose, nome) => [...pose.anims.keys()].find((k) => k.toLowerCase() === nome) || null;

// Mutação consumida pelo update real: muda a cfg de PRODUÇÃO e devolve o restore;
// "aplicou" é verificado em adsEfetivo, a função que o próprio update chama.
function mutarCfg(f) {
  if (!MUTANTE || MUTANTE === 'foco') return () => {};
  const ads = f.cfg.ads;
  if (!ads?.linha || ads.estilo !== 'foco') throw new Error(`MUTANTE ${MUTANTE} NAO CONSUMIVEL: ${f.chave} sem ads.linha (estilo ${ads?.estilo})`);
  const tinha = ads.linha;
  const extra = typeof tinha === 'object' ? tinha : {};
  ads.linha = { ...extra };
  if (MUTANTE === 'lateral') { ads.linha.off = [...(extra.off || [0, 0, 0])]; ads.linha.off[0] += 0.002; }
  else { ads.linha.rotDeg = [...(extra.rotDeg || [0, 0, 0])]; ads.linha.rotDeg[0] += 0.5; }
  const e = adsEfetivo(ads, true);
  const campo = MUTANTE === 'lateral' ? e.off[0] : e.rotDeg[0];
  if (Math.abs(campo - (MUTANTE === 'lateral' ? 0.002 : 0.5)) > 1e-9)
    throw new Error(`MUTANTE ${MUTANTE} NAO APLICOU no consumidor (adsEfetivo devolve ${campo})`);
  console.log(`mutante ${MUTANTE}: ads.linha.${MUTANTE === 'lateral' ? 'off[0] +2 mm' : 'rotDeg[0] +0,5°'} na cfg de produção (${f.chave})`);
  return () => { ads.linha = tinha; };
}


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

// Consumidor REAL (commit 4e273b5c): AuthoredViewModels.update de produção
// monta o ADS — sockets fixture reais, setAim(1) e update; sem réplica local.
function mountAds(m) {
  const restore = mutarCfg(m.f);
  try {
    const { f, frame } = m;
    const vm = new AuthoredViewModels(new THREE_RT.Object3D());
    const scene = new THREE_RT.Group();
    const sockets = {};
    for (const kind of ['muzzle', 'sight', 'up']) {
      sockets[kind] = new THREE_RT.Object3D();
      sockets[kind].position.copy(m.pontos[kind]);
      scene.add(sockets[kind]);
    }
    const mount = new THREE_RT.Object3D();
    mount.add(scene);
    mount.position.set(frame.x, frame.y, frame.z);
    if (f.chave.startsWith('fab#') && frame.scale) mount.scale.setScalar(frame.scale);
    mount.visible = true;
    vm.parent.add(mount);
    // Pose do GLB já fixada: mixer sem ações, saque concluído, recuo zerado.
    const entry = {
      key: f.chave, family: f.familia, golden: f.chave.startsWith('gold#'), frame,
      scene, mount, sockets, mint: { active: sockets.sight }, adsSockets: sockets, weaponMeshes: [],
      mixer: new THREE_RT.AnimationMixer(scene), clips: new Map(), action: null, queue: [],
      drawTime: 1, drawDuration: 0.32, state: 'idle', stateUntil: 0, shootCycle: 0,
    };
    vm.entries.set(f.chave, entry);
    vm.weapon = m.arma;
    vm.setAim(m.arma, 1);
    vm.update(0);
    mount.updateMatrixWorld(true);
    return mount.matrixWorld.clone();
  } finally { restore(); }
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
  return { dono, z };
}

// topo = 1ª linha da ARMA na faixa central; L2 mede a estação FRONTAL além do
// corte alça/massa (sem frontal = UNKNOWN = RED). Procedência: docs/visual-consistency/AK-ADS.md.
function massaNaImagem(dono, zbuf, zCorte, w, h, exigirFrontal) {
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
  // Estação frontal: 1ª linha frontal da faixa (a massa pode estar bem abaixo do
  // topo — foco antigo em +65 px — ou espiada pela fresta da alça).
  let topoF = -1;
  for (let y = topo; y < h && topoF < 0; y++) {
    for (let x = Math.floor(cx - JANELA); x < Math.ceil(cx + JANELA); x++) if (dono[y * w + x] === 1 && zbuf[y * w + x] > zCorte) { topoF = y; break; }
  }
  let minF = Infinity, maxF = -Infinity, nF = 0, sxF = 0;
  if (topoF >= 0) {
    for (let y = topoF; y < Math.min(h, topoF + 4); y++) {
      for (let x = Math.floor(cx - JANELA); x < Math.ceil(cx + JANELA); x++) {
        if (dono[y * w + x] !== 1 || zbuf[y * w + x] <= zCorte) continue;
        const px = x + 0.5;
        if (px < minF) minF = px;
        if (px > maxF) maxF = px;
        sxF += px; nF++;
      }
    }
  }
  if (exigirFrontal && !nF) return { unknown: true, dy: topo - cy, dyF: NaN };
  if (process.env.ADS1P_DBG) console.error(`  topo dy=${topo - cy} topoFrontal dy=${topoF - cy} nF=${nF} xF∈[${minF - cx},${maxF - cx}] media=${(sxF / (nF || 1) - cx).toFixed(2)}`);
  return { dx: exigirFrontal ? (minF + maxF) / 2 - cx : sx / n - cx, dy: topo - cy, dyF: topoF - cy, nF };
}

async function foto(dono, w, h, arquivo) {
  const { default: sharp } = await import('sharp');
  const img = Buffer.alloc(w * h * 3, 235);
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let d = -12; d <= 12; d++) for (const [x, y] of [[cx + d, cy], [cx, cy + d]]) {
    const o = y * w + x; img[o * 3] = 0; img[o * 3 + 1] = 0; img[o * 3 + 2] = 0;
  }
  for (let o = 0; o < w * h; o++) {
    if (dono[o] === 1) { img[o * 3] = 200; img[o * 3 + 1] = 40; img[o * 3 + 2] = 40; }
    else if (dono[o] === 2) { img[o * 3] = 60; img[o * 3 + 1] = 160; img[o * 3 + 2] = 70; }
  }
  await sharp(img, { raw: { width: w, height: h, channels: 3 } }).png().toFile(arquivo);
}

const falhas = [];
const falhasSetup = [];
const linhaExigida = [];
const fmt = (v, c = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(c)}`;
console.log(`ads1p-linha: ${FIX ? 'linha de mira (ads1pfix ligado)' : 'foco antigo (ads1pfix=0)'} · consumidor real (AuthoredViewModels.update)${MUTANTE ? ` · mutante ${MUTANTE}` : ''}`);
for (const arma of ARMAS) {
  let m;
  try { m = await montar(arma); } catch (e) { falhasSetup.push(`${arma}: ${e.message}`); console.log(`SETUP ${arma} — ${e.message}`); continue; }
  const M = mountAds(m);
  const view = M.clone().multiply(m.camInv);
  const cenaFinal = (p) => p.clone().applyMatrix4(M);
  const alca = cenaFinal(m.pontos.sight), massa = cenaFinal(m.pontos.muzzle);
  const cano = massa.clone().sub(alca).normalize();
  const pitch = Math.atan2(cano.y, -cano.z), yaw = Math.atan2(-cano.x, -cano.z);
  // NaN/Infinity no mount/view/sockets/ângulos é lote incompleto (exit 5), não
  // "arma fora da faixa" nem UNKNOWN: falha ANTES de rasterizar (crítico R9 P2).
  const fin = (mat) => mat.elements.every((e) => Number.isFinite(e));
  if (!fin(M) || !fin(view) || !fin(m.camInv) ||
      ![alca.x, alca.y, alca.z, massa.x, massa.y, massa.z, pitch, yaw].every(Number.isFinite)) {
    falhasSetup.push(`${arma}: montagem não-finita (mount/view/sockets/ângulos com NaN/Infinity) — medidas ficariam sem significado`);
    console.log(`SETUP ${arma} — mount/view/sockets/ângulos não-finitos`);
    continue;
  }
  const exigirFrontal = LINHA.has(arma) || m.ads.estilo === 'linha';
  if (exigirFrontal) linhaExigida.push(arma);
  for (const [nome, [w, h]] of Object.entries(ASPECTOS)) {
    const fov = fovAds(m, w / h);
    if (!Number.isFinite(fov) || fov <= 0) { falhasSetup.push(`${arma} ${nome}: FOV não-finito/inválido (${fov}) — dados que alimentam as medidas`); console.log(`SETUP ${arma} ${nome} — FOV não-finito`); continue; }
    const k = (h / 2) / Math.tan(fov / 2);
    const px = (p) => [p.x / -p.z * k, -p.y / -p.z * k];
    const [sax, say] = px(alca), [smx, smy] = px(massa);
    if (alca.z === 0 || massa.z === 0 || ![k, sax, say, smx, smy].every(Number.isFinite)) {
      falhasSetup.push(`${arma} ${nome}: projeção não-finita ou socket no plano da câmera`);
      console.log(`SETUP ${arma} ${nome} — projeção/socket inválido`);
      continue;
    }
    const { dono, z: zbuf } = raster(m.tris, view, fov, w, h);
    const zCorte = (-alca.z + -massa.z) / 2;
    const vista = massaNaImagem(dono, zbuf, zCorte, w, h, exigirFrontal);
    if (FOTOS) { fs.mkdirSync(FOTOS, { recursive: true }); await foto(dono, w, h, path.join(FOTOS, `${arma}-${nome}${FIX ? '' : '-foco'}.png`)); }
    const ang = `cano pitch ${fmt(pitch / D2R)}° yaw ${fmt(yaw / D2R)}° (${fmt(yaw, 3)} rad)`;
    const sock = `socket alça (${fmt(sax, 0)}, ${fmt(say, 0)}) massa (${fmt(smx, 0)}, ${fmt(smy, 0)}) px`;
    if (!vista) {
      falhas.push(`${arma} ${nome}: nenhuma arma na faixa central de ±${JANELA} px`);
      console.log(`FALHA ${arma} ${nome} — arma fora da faixa central; ${sock}; ${ang}`);
      continue;
    }
    if (vista.unknown) {
      falhas.push(`${arma} ${nome}: UNKNOWN — arma visível na faixa mas SEM estação frontal (0 px de arma além do corte z=${zCorte.toFixed(2)} m); massa inexistente ou corte engolindo a estação`);
      console.log(`FALHA ${arma} ${nome} — sem estação frontal (UNKNOWN); ${sock}; ${ang}`);
      continue;
    }
    if (!Number.isFinite(vista.dx) || !Number.isFinite(vista.dy)) {
      falhasSetup.push(`${arma} ${nome}: medição NaN (dx=${vista.dx}, dy=${vista.dy})`);
      console.log(`SETUP ${arma} ${nome} — medição NaN`);
      continue;
    }
    const L1 = !exigirFrontal || Math.abs(vista.dy) <= LIM_PX;
    // L1v verifica também o socket: a fresta traseira pode esconder desvio no raster.
    const L1v = !exigirFrontal || (Number.isFinite(vista.dyF) && Math.abs(vista.dyF) <= LIM_PX && Math.abs(smy) <= LIM_PX);
    const L2 = Math.abs(vista.dx) <= LIM_PX && Math.abs(sax) <= LIM_PX, L3 = Math.abs(yaw) <= LIM_YAW;
    const graus = (d) => Math.atan(d / k) / D2R;
    const txt = `massa vista a (${fmt(vista.dx)}, ${fmt(vista.dyF)}, topo ${fmt(vista.dy)}) px da cruz em ${w}×${h} [${fmt(graus(vista.dx), 2)}°, ${fmt(-graus(vista.dyF), 2)}° no FOV ${(fov / D2R).toFixed(1)}°]; ${sock}; ${ang}`;
    if (!L1) falhas.push(`${arma} ${nome}: L1 topo ${fmt(vista.dy)} px da cruz (teto ${LIM_PX})`);
    if (!L2) falhas.push(`${arma} ${nome}: L2 massa ${fmt(vista.dx)} px de lado, socket alça ${fmt(sax)} px (teto ${LIM_PX})`);
    if (!L1v) falhas.push(`${arma} ${nome}: L1v vertical frontal ${fmt(vista.dyF)} px da cruz, socket massa ${fmt(smy)} px (teto ${LIM_PX})`);
    if (!L3) falhas.push(`${arma} ${nome}: L3 yaw ${fmt(yaw, 3)} rad (teto ${LIM_YAW})`);
    console.log(`${L1 && L1v && L2 && L3 ? 'PASSA' : 'FALHA'} ${arma} ${nome} — ${txt}`);
  }
}
if (falhasSetup.length) {
  console.error(`\n${falhasSetup.length} falha(s) de setup/asset — lote incompleto não é GREEN, mesmo sob mutante:\n- ${falhasSetup.join('\n- ')}`);
  process.exit(5);
}
if (MUTANTE) {
  // Mutante só vale reprovado pela cláusula própria (foco→L1, lateral→L2,
  // vertical→L1v); UNKNOWN é cegueira, não mordida (doc AK-ADS).
  const PROPRIA = { foco: / L1 /, lateral: / L2 /, vertical: / L1v / };
  const mordidas = falhas.filter((f) => PROPRIA[MUTANTE].test(f));
  const unknown = falhas.filter((f) => /UNKNOWN/.test(f));
  if (!mordidas.length) {
    console.error(`MUTANTE ${MUTANTE} SOBREVIVEU: sem falha na cláusula própria (${PROPRIA[MUTANTE]})${unknown.length ? `; UNKNOWN ignorado: ${unknown.join(' · ')}` : ''}`);
    process.exit(1);
  }
  if (unknown.length) console.log(`aviso: UNKNOWN no mutante ${MUTANTE} (não conta como mordida): ${unknown.join(' · ')}`);
  console.log(`mutante ${MUTANTE} reprovado como devia (${mordidas.length} falhas: ${mordidas.join(' · ')})`);
  process.exit(0);
}
if (falhas.length) { console.error(`\n${falhas.length} falha(s):\n- ${falhas.join('\n- ')}`); process.exit(1); }
console.log(`\nads1p-linha: contratos medidos passam — L2/L3 em ${ARMAS.join(',')}${linhaExigida.length ? `; L1/L1v exigidos e ok em ${linhaExigida.join(',')}` : ''}`);
