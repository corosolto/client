/* prop-hitbox-probe.mjs — PROP RÍGIDO NÃO PODE VIRAR HITBOX (spec 0002 §8).

   POR QUE EXISTE
   O Profeta da Calçada v2 é o primeiro GLB do elenco com malhas rígidas penduradas
   em sockets (3 placas de papelão + case, parentadas a SOCKET_PC_*). O hitscan do
   game.js raycasta o grupo INTEIRO do bot (`intersectObjects(enemyGroups, true)` em
   _fireHitscan): sem a guarda de `glbchars.js` (`if (!o.isSkinnedMesh) o.raycast = …`),
   cada placa vira hitbox de graça e alarga o alvo competitivo — exatamente o que a
   ficha veda ("partes decorativas não alteram alcance de tiro nem colisão do corpo").

   O QUE MEDE (no mounttest.html, o MESMO buildCharacterModel da seleção e dos bots)
     propLivre   raio através do centro de CADA prop (placas/case) não toca o prop.
     corpoOk     raio pelo peito (Spine02) continua acertando a malha skinnada.
     cabecaOk    raio pela caixa de cabeça continua acertando (headshot preservado).

   MUTAÇÃO (lei 3 da casa): --mutante=semguarda religa o raycast dos props na página
   (Mesh.prototype.raycast), reproduzindo o estado sem o conserto — os props têm que
   aparecer como primeiro acerto e o probe TEM que reprovar.

   uso: node tools/eval/prop-hitbox-probe.mjs [char] [--mutante=semguarda] [--out=arquivo.json]
*/
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

const CHAR = process.argv.slice(2).find((a) => !a.startsWith('-')) || 'profeta-calcada';
const MUT = process.argv.includes('--mutante=semguarda');
const OUT = (process.argv.find((a) => a.startsWith('--out=')) || '').slice('--out='.length) || null;
const BASE = process.env.BASE || 'http://localhost:8123';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/mounttest.html?char=${encodeURIComponent(CHAR)}&w=m4&play=idle&manual=1&clean=1`, {
  waitUntil: 'domcontentloaded', timeout: 60000,
});
await page.waitForFunction(() => window.MOUNT_READY, null, { timeout: 60000 });
for (let i = 0; i < 20; i++) await page.evaluate(() => window.STEP?.(1 / 30));

const result = await page.evaluate(async (mutante) => {
  const THREE = await import('three');
  const ctrl = window.MOUNT_CTRL;
  const group = ctrl?.group;
  if (!group) return { erro: 'MOUNT_CTRL.group ausente' };
  group.updateMatrixWorld(true);

  // Props = malhas NÃO-skinnadas dentro do modelo GLB (o clone fica sob group.children
  // com os ossos); a caixa de cabeça (ctrl.head) e a sombra de contato ficam no grupo
  // e NÃO são props: a cabeça é o hitbox de headshot intencional, a sombra já nasce
  // com raycast desligado. A arma (também rígida, filha do osso da mão) é comportamento
  // pré-existente de TODO o elenco e está fora do escopo desta régua.
  const model = ctrl.model;
  const props = [], armas = [];
  model.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    (o.userData.noHit ? armas : props).push(o);
  });
  if (mutante) for (const p of props) p.raycast = THREE.Mesh.prototype.raycast;

  const ray = new THREE.Raycaster();
  const centro = new THREE.Vector3();
  const tiroAtraves = (alvo) => {
    // Atira de fora pra dentro, na direção (origem do modelo -> alvo): é o tiro que
    // acertaria a placa que sobra do lado do corpo.
    const dir = new THREE.Vector3(alvo.x, 0, alvo.z);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    const origem = alvo.clone().addScaledVector(dir, 3);
    ray.set(origem, dir.clone().negate());
    ray.far = 6;
    return ray.intersectObjects([group], true);
  };

  const porProp = props.map((p) => {
    const c = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3());
    const hits = tiroAtraves(c);
    const primeiro = hits[0]?.object?.name || hits[0]?.object?.type || null;
    return { nome: p.name, acertouProp: hits.some((h) => h.object === p), primeiro };
  });

  // Corpo: raio horizontal pela altura do peito tem que acertar a malha skinnada.
  let spine = null;
  model.traverse((o) => { if (o.isBone && !spine && /spine02/i.test(o.name)) spine = o; });
  const peito = spine ? spine.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.3, 0);
  const hitsPeito = tiroAtraves(peito);
  const corpoOk = hitsPeito.some((h) => h.object.isSkinnedMesh);

  // Cabeça: a caixa invisível de headshot continua raycastável.
  const cabeca = ctrl.head.getWorldPosition(new THREE.Vector3());
  const hitsCabeca = tiroAtraves(cabeca);
  const cabecaOk = hitsCabeca.some((h) => h.object === ctrl.head);

  return {
    char: window.MOUNT_CTRL.charId, mutanteAplicado: !!mutante,
    props: porProp, armasIgnoradasNoEscopo: armas.length, corpoOk, cabecaOk,
    propLivre: porProp.every((p) => !p.acertouProp),
  };
}, MUT);
await browser.close();

if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(result, null, 2)); }
if (result.erro) { console.error('✗', result.erro); process.exit(1); }
for (const p of result.props) console.log(`${p.acertouProp ? '✗' : '✓'} prop ${p.nome}: ${p.acertouProp ? `ABSORVEU TIRO (1º acerto: ${p.primeiro})` : 'não absorve tiro'}`);
console.log(`${result.corpoOk ? '✓' : '✗'} corpo skinnado continua hittable`);
console.log(`${result.cabecaOk ? '✓' : '✗'} caixa de cabeça continua hittable`);
if (!result.props.length) { console.error('✗ nenhum prop rígido encontrado — a régua não mediu nada'); process.exit(1); }
if (!result.propLivre || !result.corpoOk || !result.cabecaOk) {
  console.error(`PROP-HITBOX ✗ ${CHAR}${MUT ? ' (mutante semguarda — reprovação esperada)' : ''}`);
  process.exit(1);
}
console.log(`PROP-HITBOX ✓ ${CHAR}: ${result.props.length} props fora do hitbox, corpo e cabeça intactos`);
