/* RÉGUA DO CAMINHO AUTORADO — o jogo monta mesmo o viewmodel golden, com mãos?
 *
 * POR QUE ELA EXISTE. O merge com a main levou uma linha de `_applyVmVisibility`
 * (`this.vm.authored?.setWeapon(w)`) porque a main não conhece o caminho
 * autorado. Sem ela `authored.weapon` ficava vazio, nenhuma entrada era pedida,
 * e as 26 armas caíam no viewmodel legado: modelo antigo e SEM MÃOS. O
 * `check:fast` ficou VERDE o tempo todo — ele roda o motor em node e nunca
 * monta viewmodel. O dono viu em dois segundos: "não aparece nenhuma mão".
 *
 * Régua de contagem não pegaria: as malhas existem no GLB e a config está certa.
 * O que falhava era a LIGAÇÃO. Por isso esta régua mede no jogo de verdade, arma
 * por arma:
 *   1. a chave resolvida é autorada: `gold#` (AK) ou `fab#` (produto da fábrica);
 *   2. o controlador tem malha de mão na entrada;
 *   3. a mão está visível com a cadeia de pais inteira.
 *   4. mãos e boca ficam no quadro; o traçante coincide com o socket/vértices
 *      do modelo, projetados pela vmCamera sem consultar _muzzleWorld.
 *
 * Mutação:
 *   --mutante=semfiacao   serve o game.js sem o `authored?.setWeapon` → 0 armas
 *   --mutante=maos-ocultas   oculta as mãos reais
 *   --mutante=cano-lateral  desloca só a origem do traçante, mantendo o modelo
 *   --mutante=boot-catalogo  volta a bloquear o mobile com modelos não equipados
 *
 *   node tools/eval/vm-autorado-vivo.mjs --porta=4361
 *   node tools/eval/vm-autorado-vivo.mjs --porta=4361 --todas   # as 25 armas de fogo
 *
 * `--sem-flags` mede o padrão publicado, inclusive a faca; o modo antigo abre
 * `?vmauthored=1`, e `--todas` abre o portão de todas as famílias na revisão.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { installViewmodelAssets } from './viewmodel-network-fixture.mjs';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const PORTA = arg('porta', '4361');
const MUTANTE = arg('mutante', '');
if (MUTANTE && !['semfiacao', 'maos-ocultas', 'cano-lateral', 'boot-catalogo'].includes(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);
const SO = arg('armas', '').split(',').filter(Boolean);
const TODAS = process.argv.includes('--todas');
const SEM_FLAGS = process.argv.includes('--sem-flags');
const MOBILE = process.argv.includes('--mobile');
const FOTOS = arg('fotos', '');
const BASE = process.env.BASE || `http://localhost:${PORTA}`;

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

console.log(`VMH: ${MOBILE ? 'mobile' : 'desktop'} abre navegador`);
const nav = await chromium.launch({ args: ['--mute-audio', '--enable-unsafe-swiftshader'],
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
console.log('VMH: navegador aberto');
const pag = await nav.newPage({ viewport: MOBILE ? { width: 844, height: 390 } : { width: 1440, height: 960 },
  ...(MOBILE ? { isMobile: true, hasTouch: true } : {}) });
await installViewmodelAssets(pag);
const bootPaths = new Set();
pag.on('request', (r) => {
  const path = new URL(r.url()).pathname;
  if (path.startsWith('/private-assets/viewmodels/')) bootPaths.add(path);
});
if (MOBILE && SEM_FLAGS) await pag.route('**/js/main.js*', async (route) => {
  const res = await route.fetch();
  const before = await res.text();
  let source = before.replace(
    "import { preloadAuthoredFamilies, authoredBootFamilies } from './authoredvm.js';",
    "import { preloadAuthoredFamilies as preloadVmReal, authoredBootFamilies } from './authoredvm.js'; const preloadAuthoredFamilies = (keys) => { (globalThis.__vmBootKeys ||= []).push([...keys]); return preloadVmReal(keys); };");
  if (source === before) throw new Error('instrumentação do boot não aplicou');
  if (MUTANTE === 'boot-catalogo') {
    const mutated = source.replace('authoredBootFamilies(_vmBootWeapons, playerWeaponSkins)', 'authoredBootFamilies(_armasDaPartida, playerWeaponSkins)');
    if (mutated === source) throw new Error('boot-catalogo não aplicou');
    source = mutated;
  }
  await route.fulfill({ response: res, body: source });
});

await pag.route(/\.astro\/eval-vite|dev-toolbar|@vite\/client/, (r) => r.fulfill({ contentType: 'text/javascript', body: 'export default {};export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},off(){},send(){},invalidate(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=u=>u;export class ErrorOverlay{}' }));
const erros = [];
pag.on('pageerror', (e) => { const text = String(e).split('\n')[0].slice(0, 140); erros.push(text); console.error(text); });

if (MUTANTE === 'semfiacao') {
  // Reproduz EXATAMENTE o defeito do merge: a troca some, o resto fica.
  const fonte = fs.readFileSync('public/js/game.js', 'utf8')
    .replace('const authored = melee ? false : (this.vm.authored?.setWeapon(w) || false);',
             'const authored = false;');
  if (fonte === fs.readFileSync('public/js/game.js', 'utf8')) throw new Error('semfiacao não aplicou');
  await pag.route('**/js/game.js*', (r) =>
    r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: fonte }));
}
if (MUTANTE === 'maos-ocultas') {
  const antes = fs.readFileSync('public/js/authoredvm.js', 'utf8');
  const fonte = antes.replace('handMeshes.push(object);', 'object.visible = false; handMeshes.push(object);');
  if (fonte === antes) throw new Error('maos-ocultas não aplicou');
  await pag.route('**/js/authoredvm.js*', (r) => r.fulfill({ contentType: 'application/javascript', body: fonte }));
}
if (MUTANTE === 'cano-lateral') {
  const antes = fs.readFileSync('public/js/game.js', 'utf8');
  const fonte = antes.replace('return cam.addScaledVector(ray, 1.5);',
    'return cam.addScaledVector(ray, 1.5).add(this.camera.getWorldDirection(new THREE.Vector3()).cross(this.camera.up).multiplyScalar(0.2));');
  if (fonte === antes) throw new Error('cano-lateral não aplicou');
  await pag.route('**/js/game.js*', (r) => r.fulfill({ contentType: 'application/javascript', body: fonte }));
}

const FAMILIAS = 'ak,ar,mp5,smg,p90,g3,marksman,svd,sniper,bolt,deagle,pistol,revolver,shotgun,lmg,grenade';
console.log('VMH: carrega partida');
await pag.goto(`${BASE}/?ui=v3&debug=1&auto=E,esquerdomacho&map=piscina_treta&armaslazy=0${SEM_FLAGS ? '' : `&vmauthored=1${TODAS ? `&vmready=${FAMILIAS}` : ''}`}`,
  { waitUntil: 'commit', timeout: 180000 });
await pag.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
console.log('VMH: partida viva');
await pag.waitForTimeout(2500);
await pag.evaluate(() => { document.getElementById('crash-overlay')?.remove(); window.__game.timeLeft = Infinity; });

/* A lista golden sai do vmconfig LIDO PELA PÁGINA, não de regex no arquivo: o
   parser à mão já falhou aqui e devolveu zero armas com o arquivo correto.
   Só entram as que o portão de rollout deixa passar (família ready + arma não
   segurada): as demais caem no legado DE PROPÓSITO e não são defeito. */
const ALVO = SO.length ? SO : SEM_FLAGS ? await pag.evaluate(async () =>
  (await import('/js/weapons.js')).WEAPON_IDS) : await pag.evaluate(async (todas) => {
  const vm = await import('/js/data/vmconfig.js');
  return Object.entries(vm.VM_WEAPON || {})
    .filter(([, c]) => todas || (c.ready !== false && vm.VM_FAMILY?.[c.family]?.ready === true))
    .map(([k]) => k);
}, TODAS);
if (!ALVO.length) {
  await nav.close();
  console.log('\n  VERMELHO — nenhuma arma pronta no vmconfig\n');
  process.exit(1);
}

let bootOk = true;
if (MOBILE && SEM_FLAGS) {
  const boot = await pag.evaluate(async () => { const weapon = window.__game.player.weapon; return { keys: globalThis.__vmBootKeys?.[0], weapon, source: (await import('/js/authoredvm.js')).vmFonteDe(weapon) }; });
  const manifest = JSON.parse(fs.readFileSync('tools/viewmodels/vm-assets.manifest.json'));
  const root = manifest.servedRoot + '/';
  const allowed = new Map(manifest.files.filter((f) => /^(?:shared\/|melee\/|grenade\/|recoil\.json$)/.test(f.path) || root + f.path === new URL(boot.source.url, BASE).pathname)
    .map((f) => [root + f.path, f.bytes]));
  const unrelated = [...bootPaths].filter((p) => !allowed.has(p));
  const bytes = [...bootPaths].reduce((sum, p) => sum + (manifest.files.find((f) => root + f.path === p)?.bytes || 0), 0);
  const budget = [...allowed.values()].reduce((a, b) => a + b, 0);
  bootOk = boot.keys?.length === 2 && boot.keys.includes(boot.source.chave)
    && boot.keys.includes('grenade') && !unrelated.length && bytes > 0 && bytes <= budget;
  console.log(`VMH boot mobile: ${JSON.stringify({ ...boot, bytes, budget, unrelated, ok: bootOk })}`);
}

const linhas = [];
for (const arma of ALVO) {
  const r = await pag.evaluate(async (a) => {
    const g = window.__game;
    g.player.alive = true; g.player.hp = 100; g.setCamView('first');
    g._switchWeapon(a);
    if (a === 'knife') {
      for (let i = 0; i < 60 && !g.vm.melee?.active; i += 1) {
        await new Promise((r2) => setTimeout(r2, 120));
      }
      const visivel = (o) => { let v = o.visible; let p = o.parent; while (v && p) { v = p.visible; p = p.parent; } return v; };
      const maos = [];
      g.vm.melee?.scene?.traverse((o) => {
        if (o.isMesh && (Array.isArray(o.material) ? o.material : [o.material])
          .some((m) => /CoroSolto_FP_(?:Hand|Glove|Cloth)/i.test(m?.name || ''))) maos.push(o);
      });
      return { arma: a, chave: g.vm.melee?.active ? 'melee#knife' : null,
        maos: maos.length, visiveis: maos.filter(visivel).length };
    }
    for (let i = 0; i < 60 && !g.vm.authored?.entry?.(a); i += 1) {
      await new Promise((r2) => setTimeout(r2, 120));     // espera o GLB chegar
    }
    for (let i = 0; i < 120; i += 1) {
      const e = g.vm.authored?.entry?.(a);
      if (!e || (g.vm.authored.state(a) === 'idle' && e.drawTime >= e.drawDuration)) break;
      await new Promise((r2) => setTimeout(r2, 120));
    }
    await new Promise((r2) => setTimeout(r2, 250));
    const ent = g.vm.authored?.entry?.(a);
    const visivel = (o) => { let v = o.visible; let p = o.parent; while (v && p) { v = p.visible; p = p.parent; } return v; };
    const maos = ent?.handMeshes || [];
    let emQuadro = false;
    for (const hand of maos.filter(visivel)) {
      g.vm.root.updateWorldMatrix(true, true); hand.skeleton?.update();
      g.vmCamera.updateMatrixWorld(true);
      const p = g.player.pos.clone();
      for (let i = 0; i < hand.geometry.attributes.position.count; i += 1) {
        hand.getVertexPosition(i, p).applyMatrix4(hand.matrixWorld).project(g.vmCamera);
        if (Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1) { emQuadro = true; break; }
      }
      if (emQuadro) break;
    }
    let rastroPx = Infinity, canoEmQuadro = false, fonteCano = null;
    if (ent && g._vmVisibility?.authored) {
      // Oráculo independente: socket do GLB visível, ou vértices deformados da boca
      // nos goldens sem socket. Nunca chama _muzzleWorld/muzzleVm do runtime.
      ent.scene.updateWorldMatrix(true, true);
      const socket = ent.sockets?.boca || ent.sockets?.muzzle;
      let muzzle = null;
      if (socket) {
        muzzle = socket.getWorldPosition(g.player.pos.clone());
        fonteCano = 'socket';
      } else {
        const pontos = [], p = g.player.pos.clone();
        let frente = Infinity;
        for (const mesh of ent.weaponMeshes.filter(visivel)) {
          mesh.skeleton?.update();
          for (let i = 0; i < (mesh.geometry?.attributes?.position?.count || 0); i += 1) {
            mesh.getVertexPosition(i, p).applyMatrix4(mesh.matrixWorld);
            pontos.push(p.clone()); frente = Math.min(frente, p.z);
          }
        }
        const boca = pontos.filter((p) => p.z < frente + 0.03);
        if (boca.length) {
          muzzle = boca.reduce((s, p) => s.add(p), g.player.pos.clone().set(0, 0, 0)).divideScalar(boca.length);
          fonteCano = 'vertices';
        }
      }
      if (muzzle) {
        muzzle.project(g.vmCamera);
        canoEmQuadro = [muzzle.x, muzzle.y, muzzle.z].every((v) => Number.isFinite(v) && Math.abs(v) < 1);
      }
      const tracer = g._tracer, consultar = g._consultarTiro;
      let start;
      try {
        g._consultarTiro = () => null;
        g._tracer = (from) => { start = from.clone().project(g.camera); };
        g._fireHitscan(g.player, g._aimOrigin(g.player.pos.clone()),
          g.camera.getWorldDirection(g.player.pos.clone()), 1, true, a, a, true);
        if (start && muzzle) rastroPx = Math.hypot((start.x - muzzle.x) * innerWidth / 2, (start.y - muzzle.y) * innerHeight / 2);
      } finally { g._tracer = tracer; g._consultarTiro = consultar; }
    }
    return { arma: a, chave: ent?.key || null, maos: maos.length, visiveis: maos.filter(visivel).length,
      emQuadro, canoEmQuadro, fonteCano, rastroPx, mobile: g.mobile, autorada: g._vmVisibility?.authored, fallback: g._vmVisibility?.fallback };
  }, arma);
  if (FOTOS) {
    const dir = FOTOS;
    fs.mkdirSync(dir, { recursive: true });
    await pag.screenshot({ path: `${dir}/${arma}.png` });
    await pag.screenshot({ path: `${dir}/${arma}-sem-hud.png`, style: '#touch-ui, #hud, #tp-hud, #vm-precision-qa { visibility: hidden !important; }' });
  }
  const ok = Boolean(r.chave?.includes('#')) && r.visiveis > 0
    && (arma === 'knife' || (r.autorada && !r.fallback && r.emQuadro && r.canoEmQuadro && r.mobile === MOBILE && r.rastroPx <= 1));
  linhas.push({ ...r, ok });
  console.log(`  ${r.arma.padEnd(10)} ${String(r.chave || 'LEGADO').padEnd(22)} maos ${r.visiveis}/${r.maos} emQuadro=${r.emQuadro} cano=${r.fonteCano}/${r.canoEmQuadro} rastroPx=${r.rastroPx?.toFixed(2)} ${ok ? 'ok' : 'FALHA'}`);
}
await nav.close();

const bons = linhas.filter((l) => l.ok).length;
const semMao = linhas.filter((l) => l.chave?.includes('#') && !l.visiveis).map((l) => l.arma);
const legado = linhas.filter((l) => !l.chave?.includes('#')).map((l) => l.arma);
console.log(`\n  ${bons}/${ALVO.length} armas montam o viewmodel autorado COM mão visível`);
if (legado.length) console.log(`  caíram no legado: ${legado.join(' ')}`);
if (semMao.length) console.log(`  autoradas mas SEM mão: ${semMao.join(' ')}`);
if (erros.length) console.log(`  erros de página: ${[...new Set(erros)].slice(0, 3).join(' | ')}`);
const ok = MUTANTE === 'boot-catalogo' ? !bootOk && bons === ALVO.length : MUTANTE ? bootOk && bons === 0 && linhas.every((l) => MUTANTE === 'semfiacao' ? !l.chave
  : MUTANTE === 'cano-lateral' ? l.visiveis > 0 && l.emQuadro && l.canoEmQuadro && l.autorada && !l.fallback && l.mobile === MOBILE && Number.isFinite(l.rastroPx) && l.rastroPx > 1
  : !l.visiveis) : bootOk && bons === ALVO.length;
if (MUTANTE) console.log(`  mutante ${MUTANTE}: ${ok ? 'detectado' : 'sobreviveu ou falhou por outro motivo'}`);
console.log(ok ? (MUTANTE ? '\n  VERDE — regressão provocada detectada\n' : '\n  VERDE — o caminho autorado está ligado\n')
               : '\n  VERMELHO — o jogo não está montando o viewmodel novo\n');
process.exit(ok ? 0 : 1);
