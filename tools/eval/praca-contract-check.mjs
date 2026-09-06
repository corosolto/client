/* ============================================================================
   praca-contract-check.mjs — CONTRATO VISUAL DA PRAÇA DOS TRÊS PODERES (node puro).
   ----------------------------------------------------------------------------
   Irmã das `corrego-contract-check` / `corrego-water-check`: mede o mapa VIVO que o
   `bootGame` constrói (uso, não declaração — BUG-02), sem navegador. GLB não carrega em
   node; as duas cláusulas abaixo só dependem de geometria procedural, e o cabeçalho de
   cada uma diz o que ela NÃO alcança.

   PROCEDÊNCIA (ledger `docs/reports/PRACA-PODERES-LEDGER.md`, baseline de 06/09/2026):
     PA1  ÁGUA DO ESPELHO. Na captura `espelho-dagua-norte.png` a lâmina entre os
          parapeitos lê como faixa azul-marinho quase preta (MeshStandardMaterial
          0x2f6ea0, metalness 0,55, sem reflexo de céu). Na referência
          (`references/praca-poderes/planalto-fachada-*.jpg`) o espelho é claro, reflexo do
          céu. O jogo já tem UMA água viva compartilhada (`water.js`, `createWater`, usada
          pelo Córrego e medida pela `corrego-water-check`); a Praça era a única lâmina
          fora desse caminho. Cláusulas: existe mesh `userData.aguaViva` (ShaderMaterial)
          sob `world.root` dentro da bacia do espelho; está em `scene.userData.waters`
          (o DepthPass de bloom.js só desenha quem está na lista); o sol do shader
          (`uSolDir`) é o sol do mapa (`world.sun`, dot ≥ 0,98 — senão o brilho nasce do
          lado errado); escala de profundidade ≤ 1 m (bacia de 55 cm, não oceano); e NÃO
          sobrou a lâmina antiga (MeshStandardMaterial transparente na mesma cota) — duas
          águas na mesma cota é z-fight.
     PA2  HORIZONTE DOS FLANCOS. Nas capturas `piloti-leste-corredor.png` e
          `ministerio-empena.png`, das rotas de flanco sob os pilotis (rota real, CTF2) o
          jogador vê a pista do Eixo e depois um plano de cerrado até a névoa: nenhuma
          silhueta. Na referência (`esplanada-2018-ccby2.jpg`) atrás de cada fileira de
          ministérios há anexos e arvoredo contínuos. Medida: de 26 pontos nos corredores de
          flanco (x = ±36 e ±44, z de −60 a 60 a cada 10 m), a 1,62 m do chão, 9 raios em
          leque (0°, ±10°, ±20°, ±35°, ±50°) para FORA (±x). Conta o raio que acerta malha
          visível NÃO horizontal (|n.y| < 0,6) entre 20 m (fora do próprio piloti) e 330 m
          (dentro do far=400 da câmera). Teto: ≥ 50 % dos raios. Antes do conserto: 0 %.
          Não alcança: os ministérios (GLB) — irrelevante, o raio sai por baixo deles.
   Mutantes (LIÇÃO 3 / 8 — cada um assert que aplicou):
     node tools/eval/praca-contract-check.mjs --mutante=agua-velha   # troca a água viva por plano Standard
     node tools/eval/praca-contract-check.mjs --mutante=sol          # desalinha uSolDir
     node tools/eval/praca-contract-check.mjs --mutante=horizonte    # esconde o horizonte distante
   ============================================================================ */
import { initTextures, bootGame, THREE } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const falhas = [], ok = [];
const T = initTextures();
const g = bootGame('praca_poderes', { textures: T, ctf: true, seed: 3311 });
const W = g.world, root = W.root;
root.updateMatrixWorld(true);
let mutou = false;

/* ---------------- PA1: água viva do espelho ---------------- */
{
  let viva = null, velhas = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData && o.userData.aguaViva) viva = o;
    const m = o.material;
    if (m && m.isMeshStandardMaterial && m.transparent && o.geometry?.type === 'PlaneGeometry' && Math.abs(o.rotation.x + Math.PI / 2) < 1e-3
      && Math.abs(o.position.y - 0.55) < 0.05 && Math.abs(o.position.x) < 1 && o.position.z > 70) velhas.push(o);
  });
  if (MUT === 'agua-velha' && viva) { viva.userData.aguaViva = false; viva = null; mutou = true; }
  if (!viva) {
    falhas.push('PA1: nenhum mesh userData.aguaViva sob world.root — o espelho segue como MeshStandardMaterial escuro (faixa preta na captura espelho-dagua-norte). Conserto: createWater de water.js, como o Córrego.');
  } else {
    const mat = viva.material;
    if (!mat || !mat.isShaderMaterial) falhas.push('PA1: a água viva não é ShaderMaterial');
    const bb = new THREE.Box3().setFromObject(viva);
    if (!(Math.abs((bb.min.x + bb.max.x) / 2) < 1 && bb.min.z > 70 && bb.max.z < 90 && bb.max.x - bb.min.x > 20))
      falhas.push(`PA1: a água viva não está na bacia do espelho (bbox x ${bb.min.x.toFixed(1)}..${bb.max.x.toFixed(1)} z ${bb.min.z.toFixed(1)}..${bb.max.z.toFixed(1)})`);
    const lista = (g.scene.userData.waters || []);
    if (!lista.some((a) => a.mesh === viva)) falhas.push('PA1: a água viva não está em scene.userData.waters — o DepthPass não a desenha');
    const u = mat && mat.uniforms || {};
    const sol = W.sun && W.sun.position ? W.sun.position.clone().normalize() : null;
    if (!sol) falhas.push('PA1: world.sun ausente — não dá para conferir o sol do shader');
    else if (!u.uSolDir) falhas.push('PA1: uniform uSolDir ausente');
    else {
      if (MUT === 'sol') { u.uSolDir.value.set(0, 1, 0); mutou = true; }
      const d = u.uSolDir.value.clone().normalize().dot(sol);
      if (d < 0.98) falhas.push(`PA1: uSolDir desalinhado do sol do mapa (dot ${d.toFixed(3)} < 0,98) — o brilho da água nasce do lado errado`);
      else ok.push(`PA1 sol alinhado (dot ${d.toFixed(3)})`);
    }
    if (!u.uProfEscala || u.uProfEscala.value > 1.0) falhas.push(`PA1: uProfEscala ${u.uProfEscala ? u.uProfEscala.value : '?'} > 1 m — escala de oceano numa bacia de 55 cm mata o depth-fade`);
    if (velhas.length) falhas.push(`PA1: ${velhas.length} lâmina(s) MeshStandardMaterial antiga(s) ainda na cota do espelho — z-fight com a água viva`);
    if (!falhas.some((f) => f.startsWith('PA1'))) ok.push('PA1 água viva (ShaderMaterial) na bacia, listada, sem lâmina velha');
  }
}

/* ---------------- PA2: horizonte dos flancos ---------------- */
{
  if (MUT === 'horizonte') {
    let n = 0;
    root.traverse((o) => { if (o.userData && o.userData.pracaHorizonte) { o.visible = false; n++; } });
    if (!n) { console.error('MUTANTE horizonte NÃO APLICOU: nenhum objeto userData.pracaHorizonte'); process.exit(2); }
    mutou = true;
  }
  const visible = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
  const alvos = [];
  root.traverse((o) => { if (o.isMesh && !o.isSprite && visible(o) && o.material && o.material.visible !== false) alvos.push(o); });
  const ray = new THREE.Raycaster(); ray.near = 20; ray.far = 330;
  const org = new THREE.Vector3(), dir = new THREE.Vector3(), nrm = new THREE.Vector3();
  const ANG = [0, 10, -10, 20, -20, 35, -35, 50, -50].map((a) => a * Math.PI / 180);
  let total = 0, hits = 0;
  const porPonto = [];
  for (const sx of [-1, 1]) for (const ax of [36, 44]) for (let z = -60; z <= 60; z += 10) {
    let h = 0;
    for (const a of ANG) {
      org.set(sx * ax, 1.62, z);
      dir.set(sx * Math.cos(a), 0, Math.sin(a)).normalize();
      ray.set(org, dir);
      const hs = ray.intersectObjects(alvos, false);
      total++;
      const bom = hs.find((x) => {
        if (!x.face) return false;
        nrm.copy(x.face.normal).transformDirection(x.object.matrixWorld);
        return Math.abs(nrm.y) < 0.6;
      });
      if (bom) { hits++; h++; }
    }
    porPonto.push(`${sx > 0 ? 'L' : 'O'}${ax}/${z}:${h}/9`);
  }
  const frac = total ? hits / total : 0;
  const msg = `PA2 horizonte dos flancos: ${hits}/${total} raios (${(frac * 100).toFixed(0)} %) acertam malha vertical entre 20 e 330 m [≥ 50 %]`;
  if (frac < 0.5) falhas.push(`${msg} — o jogador no flanco vê pista e cerrado até a névoa. Conserto: anexos/arvoredo distantes fora dos bounds (2 draw calls), ver map_brasilia.js "HORIZONTE"`);
  else ok.push(msg);
  if (process.argv.includes('--verbose')) console.log('  ' + porPonto.join(' '));
}

if (MUT && !mutou) { console.error('MUTANTE NÃO APLICOU: ' + MUT); process.exit(2); }
for (const o of ok) console.log('  ✓ ' + o);
for (const f of falhas) console.log('  ✗ ' + f);
console.log(falhas.length ? `✗ PRACA-CONTRATO${MUT ? ' [mutante ' + MUT + ']' : ''}: ${falhas.length} cláusula(s) vermelha(s)` : `✓ PRACA-CONTRATO${MUT ? ' [mutante ' + MUT + ']' : ''}: PA1-PA2 verdes`);
process.exit(falhas.length ? 1 : 0);
