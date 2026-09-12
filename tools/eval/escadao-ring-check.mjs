/* ER1 inclui faces: vértices no piso não impedem pontes sobre descontinuidades.
   ER2 preserva largura <= 8,1 cm. Amostra finita de 2,5 cm, não prova visual. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.env.OUT || path.join(root, 'artifacts/escadao-visual/ring'));
const sourceFiles = ['public/js/map_escadao.js', 'public/js/game.js', 'tools/eval/escadao-ring-check.mjs'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = Object.fromEntries(sourceFiles.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const mutationArgs = process.argv.slice(2), allowed = ['anel-plano', 'anel-enterrado', 'anel-colapsado'];
if (mutationArgs.length > 1 || mutationArgs.some(a => !a.startsWith('--mutante=') || !allowed.includes(a.slice(10)))) throw Error('Argumento inválido: --mutante=anel-plano|anel-enterrado|anel-colapsado');
const mutante = mutationArgs[0]?.slice(10);
const limits = { maxClearance: .3255, minClearance: -.003, width: .081, radius: 4.5,
  // Meio tubo máximo + sagitta das 48 cordas + 1 mm numérico; não aumenta width.
  radiusTolerance: .081 / 2 + 4.5 * (1 - Math.cos(Math.PI / 48)) + .001,
  faceSpacing: .025, maxSamplesPerRing: 2000000 };
function evaluate(rows) {
  const finite = r => r.visible && r.vertices > 0 && r.triangles > 0 && r.faceSamples > 0
    && [r.minClearance, r.maxClearance, r.vertexMinClearance, r.vertexMaxClearance,
      r.minRadius, r.maxRadius, r.width, r.captureRadius].every(Number.isFinite);
  const complete = rows.length === 4 && new Set(rows.map(r => r.id)).size === 4
    && ['R', 'E', 'P', 'B'].every(id => rows.some(r => r.id === id)) && rows.every(finite);
  return [
    ['ER0', complete, 'quatro anéis visíveis com vértices/faces/medidas finitos'],
    ['ER1', complete && rows.every(r => r.minClearance >= limits.minClearance && r.maxClearance <= limits.maxClearance), 'faces entre os limites inferior e superior do piso'],
    ['ER2', complete && rows.every(r => r.width >= 0 && r.width <= limits.width
      && Math.abs(r.captureRadius - limits.radius) <= 1e-9
      && r.minRadius >= limits.radius - limits.radiusTolerance && r.maxRadius <= limits.radius + limits.radiusTolerance), 'largura original e raio de captura preservados'],
  ];
}
const passes = rows => evaluate(rows).every(([, ok]) => ok);
fs.mkdirSync(out, { recursive: true });
let browser;
let receipt = { status: 'incomplete', createdAt: new Date().toISOString(), root, sources, limits, mutante };
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto((process.env.BASE || 'http://127.0.0.1:8148') + '/?debug=1&map=escadao&auto=B,sertanejo', { timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
  const imports = await page.evaluate(() => JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports);
  receipt.served = {};
  for (const file of sourceFiles.filter(f => f.startsWith('public/'))) {
    const key = './' + file.slice(7), url = new URL(imports[key] || key, page.url()).href;
    const response = await page.request.get(url);
    if (!response.ok()) throw Error(`Fonte servido indisponível: ${url}`);
    const sha256 = hash(await response.body()); receipt.served[file] = { url, sha256 };
    if (sha256 !== sources[file]) throw Error(`Fonte servido diverge do checkout: ${file}`);
  }
  const measure = () => page.evaluate(async limits => {
    const THREE = await import('three'), g = window.__game;
    if (!g.ctfPts || g.ctfPts.length !== 4) throw Error('Quatro pontos CTF obrigatórios');
    return g.ctfPts.map(p => {
      const ring = p.ring, geometry = ring?.geometry, pos = geometry?.attributes?.position;
      if (!pos || pos.itemSize !== 3 || !pos.count) throw Error(`Anel ${p.id} sem posição mensurável`);
      ring.updateMatrixWorld(true);
      const vertices = [];
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(ring.matrixWorld);
        if (!v.toArray().every(Number.isFinite)) throw Error(`Anel ${p.id}: vértice não finito`);
        vertices.push(v);
      }
      let minClearance = Infinity, maxClearance = -Infinity, minRadius = Infinity, maxRadius = -Infinity;
      let lowest = null, highest = null, faceSamples = 0;
      const sample = (v, face = null) => {
        const floor = g.world.groundHeightAt(v.x, v.z), clearance = v.y - floor;
        const radius = Math.hypot(v.x - p.x, v.z - p.z);
        if (![floor, clearance, radius].every(Number.isFinite)) throw Error(`Anel ${p.id}: medida não finita`);
        if (clearance < minClearance) { minClearance = clearance; lowest = { position: v.toArray(), floor, face }; }
        if (clearance > maxClearance) { maxClearance = clearance; highest = { position: v.toArray(), floor, face }; }
        minRadius = Math.min(minRadius, radius); maxRadius = Math.max(maxRadius, radius);
      };
      vertices.forEach(v => sample(v));
      const vertexMinClearance = minClearance, vertexMaxClearance = maxClearance;
      // Conserva a definição anterior: extensão radial dos vértices da malha.
      const width = maxRadius - minRadius;
      const count = geometry.index?.count ?? pos.count;
      if (count % 3) throw Error(`Anel ${p.id}: índices não formam triângulos`);
      const at = i => {
        const index = geometry.index ? geometry.index.getX(i) : i;
        if (!Number.isInteger(index) || !vertices[index]) throw Error(`Anel ${p.id}: índice inválido`);
        return vertices[index];
      };
      const v = new THREE.Vector3();
      for (let i = 0; i < count; i += 3) {
        const a = at(i), b = at(i + 1), c = at(i + 2);
        const edge = Math.max(Math.hypot(a.x - b.x, a.z - b.z), Math.hypot(a.x - c.x, a.z - c.z), Math.hypot(b.x - c.x, b.z - c.z));
        // Três divisões asseguram amostra interior mesmo nas faces pequenas.
        const n = Math.max(3, Math.ceil(edge / limits.faceSpacing));
        if (faceSamples + (n + 1) * (n + 2) / 2 > limits.maxSamplesPerRing) throw Error(`Anel ${p.id}: orçamento de amostragem excedido, não aprovar parcial`);
        for (let j = 0; j <= n; j++) for (let k = 0; k <= n - j; k++) {
          v.copy(a).multiplyScalar(j / n).addScaledVector(b, k / n).addScaledVector(c, 1 - (j + k) / n);
          sample(v, i / 3); faceSamples++;
        }
      }
      let visible = ring.parent === g.scene;
      for (let o = ring; o; o = o.parent) visible &&= o.visible;
      const materials = Array.isArray(ring.material) ? ring.material : [ring.material];
      visible &&= materials.some(m => m && m.visible !== false && (!m.transparent || m.opacity > 0));
      return { id: p.id, visible, vertices: pos.count, triangles: count / 3, faceSamples,
        minClearance, maxClearance, vertexMinClearance, vertexMaxClearance, minRadius, maxRadius,
        width, captureRadius: p.r, lowest, highest };
    });
  }, limits);
  const before = await measure();
  receipt.before = before; receipt.beforeChecks = evaluate(before); receipt.pass = passes(before);
  if (mutante) {
    if (!passes(before)) throw Error('Baseline vermelho antes do mutante; não atribuir falha preexistente');
    receipt.mutation = await page.evaluate(name => {
      const g = window.__game; g.world.update = () => {};
      const changes = g.ctfPts.map(p => {
        const ring = p.ring, before = { geometry: ring.geometry.uuid, position: ring.position.toArray(), scale: ring.scale.toArray() };
        if (name === 'anel-plano') {
          if (!g._ctfRingGeo || ring.geometry === g._ctfRingGeo) throw Error('MUTANTE NÃO APLICOU: geometria já é a compartilhada');
          ring.geometry = g._ctfRingGeo;
        } else if (name === 'anel-enterrado') ring.position.y -= 10;
        else if (name === 'anel-colapsado') ring.scale.multiplyScalar(.1);
        else throw Error('MUTANTE DESCONHECIDO');
        const after = { geometry: ring.geometry.uuid, position: ring.position.toArray(), scale: ring.scale.toArray() };
        if (JSON.stringify(before) === JSON.stringify(after)) throw Error('MUTANTE NÃO ALTEROU OBJETO');
        return { id: p.id, before, after };
      });
      if (changes.length !== 4) throw Error('MUTANTE NÃO APLICOU AOS QUATRO ANÉIS');
      return { name, changes };
    }, mutante);
    const after = await measure(), checks = evaluate(after);
    const clause = mutante === 'anel-colapsado' ? 'ER2' : 'ER1';
    const causal = mutante === 'anel-enterrado' ? after.every(r => r.minClearance < limits.minClearance)
      : mutante === 'anel-colapsado' ? after.every(r => r.maxRadius < limits.radius - limits.radiusTolerance)
        : after.some(r => r.maxClearance > limits.maxClearance);
    receipt.after = after; receipt.afterChecks = checks; receipt.causal = causal;
    if (checks.find(([id]) => id === clause)?.[1] !== false || !causal) throw Error(`Mutante sobreviveu ou sem causalidade: ${clause}`);
    console.log(`MUTANTE MORDIDO: ${clause} ${mutante}`);
  } else if (!passes(before)) process.exitCode = 1;
  for (const file of sourceFiles) if (hash(fs.readFileSync(path.join(root, file))) !== sources[file]) throw Error(`Fonte mudou durante execução: ${file}`);
  receipt.errors = errors;
  if (errors.length) throw Error(`${errors.length} erros JS durante medição`);
  receipt.status = mutante ? 'mutation-detected' : passes(before) ? 'passed' : 'failed';
  for (const [id, ok, detail] of receipt.beforeChecks) console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`);
  console.log(JSON.stringify(before));
} catch (error) {
  receipt.status = 'error'; receipt.error = error.stack; process.exitCode = 1;
  console.error(error.message);
} finally {
  fs.writeFileSync(path.join(out, 'runtime.json'), JSON.stringify(receipt, null, 2));
  await browser?.close();
}
