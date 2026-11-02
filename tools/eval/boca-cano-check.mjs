/* BOCA-CANO-CHECK — o tiro sai da boca da arma que está NA TELA, em toda câmera.
   ═══════════════════════════════════════════════════════════════════════════════════
   O BURACO QUE COMPROU ESTA RÉGUA

   Gustavo (jogador antigo, 28/10/2026): "até no último trailer, o tiro não sai da ponta
   da arma." Medido antes do conserto (praca_poderes, 1280×720, corpo procedural):
     3ª pessoa: clarão a 0,54 m da boca (eye + mira×0,5 − 0,28) e traçante a 0,18 m
                (origem da arma + mira×0,55). No browser o clarão ia ainda para a vmScene,
                que não é desenhada em 3P;
     bots:      clarão a 0,33 m e traçante a 0,43 m da boca (olho + mira×0,85 / ×0,7);
     1ª pessoa sem viewmodel autorado: traçante a 136 px do cano (FOV da vmCamera ≠ câmera).

   O QUE ELA MEDE (bootGame real, sem browser). A boca de referência é medida AQUI, direto
   nos vértices da arma visível (centroide dos 2% mais avançados em +Z), sem usar o código
   que está sendo julgado:
     BC1 · 3ª pessoa (third e shoulder): origem do clarão e do traçante do jogador a ≤ 3 cm
           da boca da arma do corpo;
     BC2 · 1ª pessoa: clarão do viewmodel e traçante no MESMO pixel da boca do viewmodel
           (≤ 2 px a 1280×720), no VM legado e (BC2b) no autorado com a boca da AK medida
           no browser a 2,25 m da lente — o teto antigo de 2 m jogava o traçante a 40,7 px;
     BC3 · bots em combate (simulação de até 40 s): todo clarão e traçante a ≤ 3 cm da boca
           da arma de algum bot;
     BC4 · remoto (netgame.tiroDeRede): traçante e clarão a ≤ 3 cm da boca do corpo dele;
           com a pose 5 m adiantada da origem do evento, volta ao olho (o que o MPT1 guarda).

   Mutantes (cada um TEM que reprovar):
     --mutante=antigo      desliga o conserto (mesmo efeito do ?bocacano=0);
     --mutante=centro-arma a "boca" vira a origem da arma (a mão) — pega o atalho da receita velha;
     --mutante=sem-norm    a boca GLB entra sem ÷norm (metros do pai como se fossem locais).
   Também: BC4b (meu tiro ecoado online) e BC5 (ramo GLB, metrics ÷ norm, wrap sintético).
   Uso: node tools/eval/boca-cano-check.mjs [--mutante=antigo|centro-arma|sem-norm]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { bootGame, initTextures, THREE } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['antigo', 'centro-arma', 'sem-norm'].includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);
const TETO_M = 0.03, TETO_PX = 2, W = 1280, H = 720;

const g = bootGame('praca_poderes', { textures: initTextures(), bots: 6 });
g.state = 'live';
g.camera.aspect = W / H; g.camera.updateProjectionMatrix();
if (MUT === 'antigo') g._bocaCorpo = false;
if (MUT === 'sem-norm') {
  // reproduz o "esqueceu ÷norm": a boca medida em metros do pai entra como se fosse local
  const orig = g._bocaDaArmaDoCorpo.bind(g);
  g._bocaDaArmaDoCorpo = (grp, out) => {
    const gun = grp && grp.getObjectByName('arma-glb');
    if (gun?.userData.metrics) gun.userData.bocaLocal = gun.userData.metrics.muzzle.clone();
    return orig(grp, out);
  };
}
if (MUT === 'centro-arma') {
  const orig = g._bocaDaArmaDoCorpo.bind(g);
  g._bocaDaArmaDoCorpo = (grp, out) => {
    const gun = grp && (grp.getObjectByName('arma-glb') || grp.getObjectByName('arma-caixa'));
    if (gun) gun.userData.bocaLocal = new THREE.Vector3();
    return orig(grp, out);
  };
}

const falhas = [];
const cobra = (ok, cod, txt, det) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${cod} · ${txt}\n   ${det}`); if (!ok) falhas.push(cod); };
const px = (p, cam = g.camera) => { const v = p.clone().project(cam); return new THREE.Vector2((v.x + 1) / 2 * W, (1 - v.y) / 2 * H); };

// Boca de REFERÊNCIA: vértices da arma visível do corpo, independente do game.js.
const _ref = new WeakMap();
function bocaRef(grp) {
  const gun = grp && (grp.getObjectByName('arma-glb') || grp.getObjectByName('arma-caixa'));
  if (!gun) return null;
  gun.updateWorldMatrix(true, true);
  let loc = _ref.get(gun);
  if (!loc) {
    const inv = gun.matrixWorld.clone().invert(), pts = [];
    gun.traverse((o) => {
      const pos = o.isMesh && o.geometry?.attributes?.position;
      if (!pos) return;
      const m = inv.clone().multiply(o.matrixWorld);
      for (let i = 0; i < pos.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m));
    });
    let z0 = Infinity, z1 = -Infinity;
    for (const p of pts) { z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    const corte = z1 - (z1 - z0) * 0.02; loc = new THREE.Vector3(); let n = 0;
    for (const p of pts) if (p.z >= corte) { loc.add(p); n++; }
    loc.divideScalar(n); _ref.set(gun, loc);
  }
  return gun.localToWorld(loc.clone());
}

let flashes = [], tracers = [];
const of = g._flash.bind(g), ot = g._tracer.bind(g);
g._flash = (p, d, c) => { if (p) flashes.push({ p: p.clone(), fp: !!c }); return of(p, d, c); };
g._tracer = (a, b) => { tracers.push(a.clone()); return ot(a, b); };
const vivos = g.bots.map((b) => b.alive);
for (const b of g.bots) b.alive = false;   // jogador atira sozinho: o fim do traçado é a parede

const atira = () => {
  flashes = []; tracers = [];
  g.player.ammo[g.player.weapon].mag = 5; g.player.nextShotAt = 0; g.player.reloadUntil = 0;
  g._tryShoot();
};

// ── BC1: jogador em 3ª pessoa ──
for (const modo of ['third', 'shoulder']) {
  g.setCamView(modo);
  for (let i = 0; i < 10; i++) g.update(1 / 60);
  atira();
  const ref = bocaRef(g.playerTP?.group), f = flashes.find((x) => !x.fp)?.p, t = tracers[0];
  const dF = ref && f ? f.distanceTo(ref) : Infinity, dT = ref && t ? t.distanceTo(ref) : Infinity;
  const pF = ref && f ? px(f).distanceTo(px(ref)) : Infinity, pT = ref && t ? px(t).distanceTo(px(ref)) : Infinity;
  cobra(dF <= TETO_M && dT <= TETO_M, 'BC1', `${modo}: clarão e traçante na boca da arma do corpo (teto ${TETO_M * 100} cm)`,
    `clarão ${(dF * 100).toFixed(1)} cm / ${pF.toFixed(1)} px · traçante ${(dT * 100).toFixed(1)} cm / ${pT.toFixed(1)} px`
    + (flashes.some((x) => x.fp) ? ' · clarão foi para a vmScene (invisível em 3P)' : ''));
}

// ── BC2: 1ª pessoa ──
g.setCamView('first');
for (let i = 0; i < 10; i++) g.update(1 / 60);
atira();
{
  const vmPt = g.vm.authored?.muzzleVm?.(g.player.weapon);
  const off = g._vmMuzzle[g.player.weapon] || g._vmMuzzle.rifle;
  g.vm.root.updateWorldMatrix(true, false);
  const ref = px(vmPt || g.vm.root.localToWorld(off.clone()), g.vmCamera);
  const m = g._vmMzActive.at(-1);
  const pF = m ? px(m.grp.getWorldPosition(new THREE.Vector3()), g.vmCamera).distanceTo(ref) : Infinity;
  const pT = tracers[0] ? px(tracers[0]).distanceTo(ref) : Infinity;
  cobra(pF <= TETO_PX && pT <= TETO_PX, 'BC2', `first (${g.player.weapon}, ${vmPt ? 'autorado' : 'legado'}): clarão e traçante no pixel da boca (teto ${TETO_PX} px)`,
    `clarão ${pF.toFixed(1)} px · traçante ${pT.toFixed(1)} px`);
}

// ── BC2b: 1ª pessoa com viewmodel AUTORADO. O Node não carrega o VM autorado; a boca entra
// pela mesma API (muzzleVm) no ponto MEDIDO no browser para a AK (boca-cano-prancha.mjs,
// vmScene): (0,313; −0,145; −2,227) — 2,25 m da lente, além do teto antigo de 2 m. ──
{
  const authored = g.vm.authored;
  const orig = authored?.muzzleVm;
  const BOCA_AK = new THREE.Vector3(0.313, -0.145, -2.227);
  if (authored) authored.muzzleVm = () => BOCA_AK.clone();
  atira();
  const ref = px(BOCA_AK, g.vmCamera);
  const pT = tracers[0] ? px(tracers[0]).distanceTo(ref) : Infinity;
  const m = g._vmMzActive.at(-1);
  const pF = m ? px(m.grp.getWorldPosition(new THREE.Vector3()), g.vmCamera).distanceTo(ref) : Infinity;
  if (authored) authored.muzzleVm = orig;
  cobra(!!authored && pT <= TETO_PX && pF <= TETO_PX, 'BC2b', `first (autorado, boca da AK a 2,25 m): clarão e traçante no pixel da boca (teto ${TETO_PX} px)`,
    `clarão ${pF.toFixed(1)} px · traçante ${pT.toFixed(1)} px`);
}

// ── BC3: bots em combate ──
g.bots.forEach((b, i) => { b.alive = vivos[i]; });
g.player.hp = 1e9;
const perto = (p) => { let d = Infinity; for (const b of g.bots) { const r = bocaRef(b.mesh?.group); if (r) d = Math.min(d, p.distanceTo(r)); } return d; };
const dfl = [], dtr = [];
g._flash = (p, d, c) => { if (p && !c) dfl.push(perto(p)); return of(p, d, c); };
g._tracer = (a, b) => { dtr.push(perto(a)); return ot(a, b); };
for (let i = 0; i < 60 * 40 && dfl.length < 30; i++) g.update(1 / 60);
{
  const pior = (a) => a.length ? Math.max(...a) : Infinity;
  cobra(dfl.length >= 10 && pior(dfl) <= TETO_M && pior(dtr) <= TETO_M, 'BC3', `bots: clarão e traçante na boca da arma do bot (teto ${TETO_M * 100} cm)`,
    `${dfl.length} clarões, pior ${(pior(dfl) * 100).toFixed(1)} cm · ${dtr.length} traçantes, pior ${(pior(dtr) * 100).toFixed(1)} cm`);
}

// ── BC4: remoto (netgame) ──
{
  const ent = g.bots.find((b) => b.mesh?.group);
  ent.mesh.group.updateWorldMatrix(true, true);
  const olho = g._botEye(ent);
  const cap = { t: [], f: [] };
  const fake = {
    player: g.player, settings: { quality: 'high' },
    _tracer: (a) => cap.t.push(a.clone()), _flash: (p) => cap.f.push(p.clone()), _puff() {}, _impactSfx() {},
    _bocaDaArmaDoCorpo: (...a) => g._bocaDaArmaDoCorpo(...a), _bocaLigada: () => g._bocaLigada(),
    _origemTracerJogador: (...a) => g._origemTracerJogador(...a),
  };
  const nc = makeNetcode(fake, { meta: { snapshotHz: 20 }, startPing() {}, stopPing() {}, events: [] });
  clearInterval(nc._nsTimer);
  const alvo = olho.clone().add(new THREE.Vector3(0, 0, -40));
  nc.tiroDeRede(ent, { k: 'tiro', a: 1, w: 'ak', o: olho.toArray(), p: [alvo.toArray()], s: '-' });
  const ref = bocaRef(ent.mesh.group);
  const dT = cap.t[0] ? cap.t[0].distanceTo(ref) : Infinity, dF = cap.f[0] ? cap.f[0].distanceTo(ref) : Infinity;
  // pose adiantada: a origem do evento ficou 5 m para trás — o traçante tem que voltar ao olho do evento
  const longe = olho.clone().add(new THREE.Vector3(5, 0, 0));
  cap.t.length = 0;
  nc.tiroDeRede(ent, { k: 'tiro', a: 1, w: 'ak', o: longe.toArray(), p: [alvo.toArray()], s: '-' });
  const dVolta = cap.t[0] ? cap.t[0].distanceTo(longe.clone().lerp(alvo, 0.06)) : Infinity;   // receita do olho (MPT1)
  nc.dispose?.();
  cobra(dT <= TETO_M && dF <= TETO_M && dVolta < 0.02, 'BC4', `remoto: traçante e clarão na boca do corpo; pose adiantada volta ao olho do evento`,
    `traçante ${(dT * 100).toFixed(1)} cm · clarão ${(dF * 100).toFixed(1)} cm · pose 5 m adiantada: ${(dVolta * 100).toFixed(1)} cm da receita do olho do evento`);
}

// ── BC4b: o MEU tiro ecoado pelo nó (online). Traçante na boca do corpo em 3P; clarão só se
// o _tryShoot não acendeu um há pouco (senão seriam dois). ──
{
  g.setCamView('third');
  for (let i = 0; i < 5; i++) g.update(1 / 60);
  const cap = { t: [], f: [] };
  const fake = {
    player: g.player, settings: { quality: 'high' }, get time() { return g.time; }, get _claraoLocalEm() { return g._claraoLocalEm; },
    _tracer: (a) => cap.t.push(a.clone()), _flash: (p) => cap.f.push(p.clone()), _puff() {}, _impactSfx() {},
    _bocaDaArmaDoCorpo: (...a) => g._bocaDaArmaDoCorpo(...a), _bocaLigada: () => g._bocaLigada(),
    _origemTracerJogador: (...a) => g._origemTracerJogador(...a),
  };
  const nc = makeNetcode(fake, { meta: { snapshotHz: 20 }, startPing() {}, stopPing() {}, events: [] });
  clearInterval(nc._nsTimer);
  const olho = g._eyeWorld.clone(), alvo = olho.clone().add(new THREE.Vector3(0, 0, -40));
  const ev = { k: 'tiro', a: 1, w: 'ak', o: olho.toArray(), p: [alvo.toArray()], s: '-' };
  g._claraoLocalEm = g.time;              // acabou de acender o clarão local
  nc.tiroDeRede(g.player, ev);
  const ref = bocaRef(g.playerTP.group);
  const dT = cap.t[0] ? cap.t[0].distanceTo(ref) : Infinity, ecoComLocal = cap.f.length;
  cap.f.length = 0; g._claraoLocalEm = g.time - 5;   // tiro que só o nó deu
  nc.tiroDeRede(g.player, ev);
  const semLocal = cap.f.length, dF = cap.f[0] ? cap.f[0].distanceTo(ref) : Infinity;
  nc.dispose?.();
  cobra(dT <= TETO_M && ecoComLocal === 0 && semLocal === 1 && dF <= TETO_M, 'BC4b', 'meu tiro online (3P): traçante na boca; eco não duplica o clarão local, tiro só do nó ganha clarão na boca',
    `traçante ${(dT * 100).toFixed(1)} cm · clarões com local recente ${ecoComLocal} (quer 0) · sem local ${semLocal} (quer 1) a ${(dF * 100).toFixed(1)} cm`);
}

// ── BC5: ramo da arma GLB (metrics do measureGun em metros do PAI do wrap, ÷norm). O Node não
// carrega GLB: wrap sintético com escala ≠ 1, montado num osso escalado e girado. ──
{
  const grp = new THREE.Group(), osso = new THREE.Group(), mount = new THREE.Group();
  osso.position.set(0.3, 1.2, 0.1); osso.rotation.set(0.4, -0.7, 0.2); osso.scale.setScalar(0.01);
  mount.scale.setScalar(100); mount.rotation.set(-0.3, 0.5, 0);
  const wrap = new THREE.Group(); wrap.name = 'arma-glb'; wrap.scale.setScalar(0.4);
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 2.0), new THREE.MeshBasicMaterial());
  corpo.position.z = 0.6; wrap.add(corpo);
  // medida como o measureGun faz: wrap solto, escala s → muzzle em metros do pai, norm = s
  wrap.updateMatrixWorld(true);
  wrap.userData.metrics = { muzzle: new THREE.Vector3(0, 0, (0.6 + 1.0) * 0.4), norm: 0.4 };
  grp.add(osso); osso.add(mount); mount.add(wrap); grp.position.set(5, 0, -3);
  grp.updateMatrixWorld(true);
  const b = g._bocaDaArmaDoCorpo(grp), ref = bocaRef(grp);
  const d = b && ref ? b.distanceTo(ref) : Infinity;
  cobra(d <= TETO_M, 'BC5', `arma GLB (metrics ÷ norm, mount escalado e girado): boca a ≤ ${TETO_M * 100} cm`, `${(d * 100).toFixed(1)} cm`);
}

console.log(falhas.length ? `\nVERMELHO — ${falhas.join(', ')}` : '\nVERDE');
if (MUT) {
  console.log(falhas.length ? `mutante ${MUT} detectado` : `✗ mutante ${MUT} passou: a régua não morde`);
  process.exit(falhas.length ? 0 : 1);
}
process.exit(falhas.length ? 1 : 0);
