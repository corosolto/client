/* RÉGUA DA CÂMERA — o navegador projeta a MESMA câmera que aprovou o asset no Blender?
 *
 * POR QUE ELA EXISTE. De 24/08 a 09/09 o tronco da frente recompunha a projeção do
 * viewmodel no JS (`Math.max(cameraFov, 84)`, depois regra HFOV 90) enquanto o piloto
 * era aprovado no Blender com VFOV 58° em 3:2. Toda revisão visual julgava uma
 * composição que o jogador nunca veria (KNOWN-BUGS BUG-75, "divergência de câmera").
 * A régua estrutural `authored-vm-check` só confere por regex que a função existe.
 * Esta mede no jogo real, arma por arma, contra o BINÁRIO do GLB servido:
 *
 *   1. no aspecto de referência gravado na câmera do GLB (1,5 = 3:2), o
 *      `vmCamera.fov` e a matriz de projeção (P[5] = 1/tan(yfov/2), P[0] = P[5]/aspect)
 *      são os do glTF, dentro de 0,05° / 1e-3;
 *   2. em 16:9 a meia-tangente HORIZONTAL é a mesma de 3:2 (P[0] igual) — é a
 *      política declarada em `authoredvm.fov()`/`vmFovForAspect`, e fica aqui como
 *      contrato explícito para que uma troca de política seja uma decisão, não um acidente.
 *
 * Mutação:
 *   --mutante=clamp   serve o authoredvm.js com o clamp antigo (max(cameraFov, 84)) →
 *                     a régua tem que ficar VERMELHA em toda arma golden.
 *
 *   node tools/eval/vm-camera-check.mjs --porta=4361 [--armas=ak,pistol]
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const PORTA = arg('porta', '4361');
const MUTANTE = arg('mutante', '');
const SO = arg('armas', '').split(',').filter(Boolean);
const TOL_DEG = 0.05, TOL_P = 1e-3;

/* Lê a câmera direto do container glTF, sem three: é o que foi aprovado offline. */
function cameraDoGlb(caminho) {
  const buf = fs.readFileSync(caminho);
  const len = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + len).toString());
  const cam = j.cameras?.[0]?.perspective;
  if (!cam) throw new Error(`${caminho}: sem câmera perspectiva no GLB`);
  return { yfovDeg: (cam.yfov * 180) / Math.PI, aspect: cam.aspectRatio ?? null };
}

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const nav = await chromium.launch();
const erros = [];

async function abrir(viewport) {
  const pag = await nav.newPage({ viewport });
  pag.on('pageerror', (e) => erros.push(String(e).split('\n')[0].slice(0, 140)));
  if (MUTANTE === 'clamp') {
    // Reproduz o defeito do tronco (fc32ebb13…c25a14ed0): fov da família por cima da câmera.
    const fonte = fs.readFileSync('public/js/authoredvm.js', 'utf8')
      .replace('? { x: 0, y: 0, z: 0, fov: cameraFov }', '? { x: 0, y: 0, z: 0, fov: Math.max(cameraFov, 84) }');
    if (!fonte.includes('Math.max(cameraFov, 84) }')) throw new Error('mutante clamp não encontrou a linha');
    await pag.route('**/js/authoredvm.js*', (r) =>
      r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: fonte }));
  }
  // Revisão explícita: sem a chave de lançamento o jogo nasce no legado (eval:vm-launch).
  await pag.goto(`http://localhost:${PORTA}/?debug=1&auto=E&map=brasilia&armaslazy=0&vmauthored=1`,
    { waitUntil: 'load', timeout: 180000 });
  await pag.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await pag.waitForTimeout(2000);
  return pag;
}

async function medir(pag, arma) {
  return pag.evaluate(async (a) => {
    const g = window.__game;
    g._switchWeapon(a);
    const melee = a === 'knife';
    for (let i = 0; i < 40 && !(melee ? g.vm.melee?.current : g.vm.authored?.entry?.(a)); i += 1) {
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 300));
    g._applyVmVisibility?.(a);
    const c = g.vmCamera;
    const chave = melee ? 'melee' : (g.vm.authored?.entry?.(a)?.key || 'legado');
    return { chave, fov: c.fov, aspect: c.aspect, p0: c.projectionMatrix.elements[0], p5: c.projectionMatrix.elements[5] };
  }, arma);
}

const pag32 = await abrir({ width: 1200, height: 800 });
const ALVO = SO.length ? SO : await pag32.evaluate(async () => {
  const vm = await import('/js/data/vmconfig.js');
  return Object.entries(vm.VM_WEAPON || {}).filter(([, c]) => c?.golden).map(([k]) => k);
});
if (!ALVO.includes('knife') && !SO.length) ALVO.push('knife');   // a faca tem câmera própria (meleevm)

const linhas = [];
for (const arma of ALVO) {
  const glb = arma === 'knife'
    ? 'public/models/viewmodels/coro/melee/knife-hires.glb'
    : `public/models/viewmodels/coro/${arma}-hires.glb`;
  if (!fs.existsSync(glb)) { linhas.push({ arma, ok: false, motivo: 'GLB ausente' }); continue; }
  const cam = cameraDoGlb(glb);
  const m32 = await medir(pag32, arma);
  if (arma !== 'knife' && !m32.chave.startsWith('gold#')) {
    // Rota de FAMÍLIA (ex.: pistola aprovada em 07/09): a composição é o FAMILY_FRAME
    // calibrado no navegador pelo dono, não uma câmera do Blender. Fora do contrato.
    console.log(`  ${arma.padEnd(7)} rota ${m32.chave} — família, sem câmera autorada; fora do escopo`);
    continue;
  }
  const esperadoP5 = 1 / Math.tan((cam.yfovDeg * Math.PI) / 360);
  const refAspect = cam.aspect ?? 1.5;
  const fovOk = Math.abs(m32.fov - cam.yfovDeg) <= TOL_DEG;
  const p5Ok = Math.abs(m32.p5 - esperadoP5) <= TOL_P;
  const p0Ok = Math.abs(m32.p0 - esperadoP5 / refAspect) <= TOL_P;
  const aspOk = Math.abs(m32.aspect - refAspect) <= 1e-3;
  const ok = fovOk && p5Ok && p0Ok && aspOk;
  const motivo = ok ? '' : [
    !aspOk && `viewport ${m32.aspect.toFixed(3)} ≠ ref ${refAspect}`,
    !fovOk && `fov ${m32.fov.toFixed(2)}° ≠ glb ${cam.yfovDeg.toFixed(2)}°`,
    !p5Ok && `P[5] ${m32.p5.toFixed(4)} ≠ ${esperadoP5.toFixed(4)}`,
    !p0Ok && `P[0] ${m32.p0.toFixed(4)} ≠ ${(esperadoP5 / refAspect).toFixed(4)}`,
  ].filter(Boolean).join(' · ');
  linhas.push({ arma, ok, motivo, glbFov: cam.yfovDeg, fov32: m32.fov, p0_32: m32.p0 });
  console.log(`  ${arma.padEnd(7)} glb ${cam.yfovDeg.toFixed(2)}°  jogo(3:2) ${m32.fov.toFixed(2)}°  ${ok ? 'ok' : 'FALHA ' + motivo}`);
}
await pag32.close();

// Contrato de aspecto: 16:9 mantém a meia-tangente horizontal (P[0]) de 3:2.
const pag169 = await abrir({ width: 1280, height: 720 });
for (const l of linhas.filter((x) => x.ok)) {
  const m = await medir(pag169, l.arma);
  const okH = Math.abs(m.p0 - l.p0_32) <= TOL_P;
  if (!okH) { l.ok = false; l.motivo = `16:9 P[0] ${m.p0.toFixed(4)} ≠ 3:2 ${l.p0_32.toFixed(4)} (meia-tangente horizontal mudou)`; }
  console.log(`  ${l.arma.padEnd(7)} 16:9 fov ${m.fov.toFixed(2)}°  P[0] ${m.p0.toFixed(4)}  ${okH ? 'ok' : 'FALHA ' + l.motivo}`);
}
await pag169.close();
await nav.close();

const bons = linhas.filter((l) => l.ok).length;
console.log(`\n  ${bons}/${linhas.length} viewmodels projetam a câmera do próprio GLB (3:2) e mantêm o horizontal em 16:9`);
if (erros.length) console.log(`  erros de página: ${[...new Set(erros)].slice(0, 3).join(' | ')}`);
const ok = bons === linhas.length && linhas.length > 0;
console.log(ok ? '\n  VERDE — o navegador avalia a composição aprovada no Blender\n'
               : '\n  VERMELHO — a projeção do jogo não é a câmera autorada\n');
process.exit(ok ? 0 : 1);
