/* ============================================================================
   vm-teto-check.mjs — a arma em 1ª pessoa não cresce sem limite em monitor grande.
   ----------------------------------------------------------------------------
   POR QUE EXISTE — dono, 30/09/2026: "em monitores grandes a arma cresce muito, ela
   precisa ter um limite de tamanho maximo". O FOV do viewmodel trava a meia-tangente
   HORIZONTAL (vmFovForAspect), então a arma ocupava a mesma FRAÇÃO da largura: em 4K,
   o dobro de pixels do 1080p. Medido na produção em 3840×2160: a AK enche o canto.

   O QUE MEDE (arnês node, sem browser):
     TETO1  a 3840 px de largura, um ponto da arma fica à MESMA distância em pixels do
            canto inferior-direito que a 1920 px (±1 px) — a arma para de crescer.
     TETO2  abaixo do teto (1008 px, o arnês) nada muda: k = 1 e sem view offset —
            as invariantes de viewmodel (VM9, AUD1) seguem medindo a projeção de sempre.
     TETO3  no ADS completo o teto some (k = 1): a alça volta pro centro da tela.

   MUTAÇÃO: --mutante=sem-teto  _vmTetoTela vira no-op (TETO1 denuncia).
   USO: npm run eval:vm-teto
   ============================================================================ */
import { bootGame, initTextures, THREE } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'sem-teto') { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const g = bootGame('praca_poderes', { textures: initTextures() });
if (MUT === 'sem-teto') g._vmTetoTela = () => {};
const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };

const ponto = new THREE.Vector3(0.12, -0.1, -0.6);   // região da arma no canto inferior-direito
const doCanto = (w, h, ads) => {
  globalThis.innerWidth = w; globalThis.innerHeight = h;
  g.vmCamera.aspect = w / h; g.vmCamera.updateProjectionMatrix();
  g._vmTetoTela(ads);
  g.vmCamera.updateProjectionMatrix();
  const q = ponto.clone().project(g.vmCamera);
  return { dx: w - (q.x + 1) / 2 * w, dy: h - (1 - q.y) / 2 * h, k: g._vmTetoK ?? 1, view: !!g.vmCamera.view?.enabled };
};

const fhd = doCanto(1920, 1080, 0);
const uhd = doCanto(3840, 2160, 0);
cobra(Math.abs(fhd.dx - uhd.dx) <= 1 && Math.abs(fhd.dy - uhd.dy) <= 1,
  `TETO1 · 4K tem que desenhar a arma do tamanho do 1080p: canto→ponto ${uhd.dx.toFixed(0)}×${uhd.dy.toFixed(0)} px vs ${fhd.dx.toFixed(0)}×${fhd.dy.toFixed(0)} px`);
const arnes = doCanto(1008, 655, 0);
cobra(arnes.k === 1 && !arnes.view, `TETO2 · abaixo do teto nada muda (k=${arnes.k}, viewOffset=${arnes.view})`);
const mira = doCanto(3840, 2160, 1);
cobra(mira.k === 1 && !mira.view, `TETO3 · no ADS o teto some (k=${mira.k}, viewOffset=${mira.view})`);

g.dispose();
if (falhas.length) {
  console.error(`✗ VM-TETO — ${falhas.length} cláusula(s):`);
  for (const f of falhas) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`✓ VM-TETO: arma com teto de ${1920} px de largura; 4K = 1080p no canto, ADS e telas menores intactos`);
