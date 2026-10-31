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
 * por arma, três coisas juntas:
 *   1. a chave resolvida é autorada: `gold#` (AK) ou `fab#` (produto da fábrica);
 *   2. o controlador tem malha de mão na entrada;
 *   3. a mão está visível com a cadeia de pais inteira.
 *
 * Mutação:
 *   --mutante=semfiacao   serve o game.js sem o `authored?.setWeapon` → 0 armas
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
if (MUTANTE && !['semfiacao', 'maos-ocultas'].includes(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);
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
    let rastroPx = Infinity;
    if (ent && g._vmVisibility?.authored) {
      const muzzle = g._muzzleWorld('rifle').clone().project(g.camera);
      const tracer = g._tracer, consultar = g._consultarTiro;
      let start;
      try {
        g._consultarTiro = () => null;
        g._tracer = (from) => { start = from.clone().project(g.camera); };
        g._fireHitscan(g.player, g._aimOrigin(g.player.pos.clone()),
          g.camera.getWorldDirection(g.player.pos.clone()), 1, true, a, a, true);
        if (start) rastroPx = Math.hypot((start.x - muzzle.x) * innerWidth / 2, (start.y - muzzle.y) * innerHeight / 2);
      } finally { g._tracer = tracer; g._consultarTiro = consultar; }
    }
    return { arma: a, chave: ent?.key || null, maos: maos.length, visiveis: maos.filter(visivel).length,
      emQuadro, rastroPx, mobile: g.mobile, autorada: g._vmVisibility?.authored, fallback: g._vmVisibility?.fallback };
  }, arma);
  if (FOTOS) {
    const dir = FOTOS;
    fs.mkdirSync(dir, { recursive: true });
    await pag.screenshot({ path: `${dir}/${arma}.png` });
    await pag.screenshot({ path: `${dir}/${arma}-sem-hud.png`, style: '#touch-ui, #hud, #tp-hud, #vm-precision-qa { visibility: hidden !important; }' });
  }
  const ok = Boolean(r.chave?.includes('#')) && r.visiveis > 0
    && (arma === 'knife' || (r.autorada && !r.fallback && r.emQuadro && r.mobile === MOBILE && r.rastroPx <= 1));
  linhas.push({ ...r, ok });
  console.log(`  ${r.arma.padEnd(10)} ${String(r.chave || 'LEGADO').padEnd(22)} maos ${r.visiveis}/${r.maos} emQuadro=${r.emQuadro} rastroPx=${r.rastroPx?.toFixed(2)} ${ok ? 'ok' : 'FALHA'}`);
}
await nav.close();

const bons = linhas.filter((l) => l.ok).length;
const semMao = linhas.filter((l) => l.chave?.includes('#') && !l.visiveis).map((l) => l.arma);
const legado = linhas.filter((l) => !l.chave?.includes('#')).map((l) => l.arma);
console.log(`\n  ${bons}/${ALVO.length} armas montam o viewmodel autorado COM mão visível`);
if (legado.length) console.log(`  caíram no legado: ${legado.join(' ')}`);
if (semMao.length) console.log(`  autoradas mas SEM mão: ${semMao.join(' ')}`);
if (erros.length) console.log(`  erros de página: ${[...new Set(erros)].slice(0, 3).join(' | ')}`);
const ok = MUTANTE ? bons === 0 && linhas.every((l) => MUTANTE === 'semfiacao' ? !l.chave : !l.visiveis) : bons === ALVO.length;
if (MUTANTE) console.log(`  mutante ${MUTANTE}: ${ok ? 'detectado' : 'sobreviveu ou falhou por outro motivo'}`);
console.log(ok ? (MUTANTE ? '\n  VERDE — regressão provocada detectada\n' : '\n  VERDE — o caminho autorado está ligado\n')
               : '\n  VERMELHO — o jogo não está montando o viewmodel novo\n');
process.exit(ok ? 0 : 1);
