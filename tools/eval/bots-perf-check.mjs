/* BOTS-PERF — o custo de CPU por bot não pode voltar a crescer com o número de bots.
   Relato do dono (08/11): "trava muito se tiver mais de 4 bots". Medido no Chrome
   (tools/eval/bots-perf-browser.mjs): na Operação Flávio cada defensor refazia, por quadro,
   a LOS do VIP contra todos os atacantes, num raycast linear contra 321 mil triângulos
   (66% da CPU com 12 bots); em todo mapa `_collide` varria todos os colisores (1403 na
   Amazônia) dezenas de vezes por bot e por quadro, e era a maior fonte de lixo (102 MB/s).
   Esta régua cobra, em node e de forma determinística, as três correções:
     1. LOS do VIP memorizada no passo     → chamadas de `_losClear` por bot por passo;
     2. grade de colisores no `_collide`   → colisores visitados por chamada;
     3. índice estático dos occluders      → triângulos testados por raio (malha pesada).
   E prova que as três são só desempenho: o hash da partida (posições, vida, placar e
   estado da escolta após N passos) tem de ser IDÊNTICO com e sem cada uma.
   Uso: node tools/eval/bots-perf-check.mjs [--mutante=sem-memo-los|colisao-linear|occluder-linear] [--mutantes] */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const MUTANTES = ['sem-memo-los', 'colisao-linear', 'occluder-linear'];
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && !MUTANTES.includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

if (process.argv.includes('--mutantes')) {
  const rodar = (args, env = {}) => spawnSync(process.execPath, [SELF, ...args], { encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 24, timeout: 300000 });
  const hashDe = (r) => (`${r.stdout}`.match(/^HASH (\w+)$/m) || [])[1];
  const base = rodar([]);
  assert.equal(base.status, 0, `controle tem de passar\n${base.stdout}${base.stderr}`);
  const hash = hashDe(base);
  assert.ok(hash, 'controle sem HASH');
  console.log(`controle verde · HASH ${hash}`);
  for (const nome of MUTANTES) {
    const r = rodar([`--mutante=${nome}`], nome === 'occluder-linear' ? { SIM_QS: 'occindex=0' } : {});
    const saida = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 1, `${nome}: mutante tinha de reprovar\n${saida}`);
    assert.ok(!r.signal && !/TypeError|ReferenceError|SyntaxError/.test(saida), `${nome}: falha de infraestrutura, não de régua\n${saida}`);
    assert.ok(saida.includes(`Mutação aplicada: ${nome}`), `${nome}: mutação não confirmada`);
    assert.equal(hashDe(r), hash, `${nome}: a correção mudou a simulação (hash diferente) — não é só desempenho`);
    console.log(`✓ mutante ${nome} reprovou com a MESMA partida (HASH igual)`);
  }
  process.exit(0);
}

if (mutante === 'occluder-linear' && !/occindex=0/.test(process.env.SIM_QS || '')) {
  // shot_surfaces lê ?occindex na importação: o mutante precisa nascer com a query.
  const r = spawnSync(process.execPath, [SELF, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, SIM_QS: 'occindex=0' } });
  process.exit(r.status ?? 1);
}

const { bootGame, initTextures, THREE } = await import('./harness.mjs');
const { withVisibleShotOccluders } = await import('../../public/js/shot_surfaces.js');
if (mutante) console.log(`Mutação aplicada: ${mutante}`);

/* ---------- 1+2: partida real da Operação Flávio, 7×7 (13 bots), semente fixa ---------- */
const PASSOS = 600, AQUECIMENTO = 60, DT = 1 / 60;
const g = bootGame('operacao_flavio', { textures: initTextures(), seed: 4242, bots: 7 });
if (mutante === 'sem-memo-los') g.objective.__mutSemMemoLos = true;
if (mutante === 'colisao-linear') g.__mutColideLinear = true;
g.state = 'live';
let losChamadas = 0, colideChamadas = 0, visitas = 0, medindo = false;
const los = g._losClear;
g._losClear = function (...a) { if (medindo) losChamadas++; return los.apply(this, a); };
const colide = g._collide;
g._collide = function (...a) { if (medindo) colideChamadas++; return colide.apply(this, a); };
// Visita = leitura de minX (o primeiro campo que as duas varreduras leem de cada colisor).
for (const c of g.world.colliders) {
  let minX = c.minX;
  Object.defineProperty(c, 'minX', { get() { if (medindo) visitas++; return minX; }, set(v) { minX = v; }, enumerable: true, configurable: true });
}
for (let i = 0; i < AQUECIMENTO; i++) { g.update(DT, false); g.player.hp = 1e9; }
medindo = true;
for (let i = 0; i < PASSOS; i++) { g.update(DT, false); g.player.hp = 1e9; }
medindo = false;
const bots = g.bots.length;
const losPorBot = losChamadas / PASSOS / bots, visitasPorColide = visitas / Math.max(1, colideChamadas);
const estado = g.bots.map((b) => [b.pos.x, b.pos.y, b.pos.z, b.yaw, b.hp, b.alive, b.kills, b.deaths]);
estado.push([g.player.pos.x, g.player.pos.z, g.objective.state?.checkpoint, g.objective.state?.position?.x, g.objective.state?.position?.z, g.state, g.roundNum]);
const hash = createHash('sha256').update(JSON.stringify(estado)).digest('hex').slice(0, 16);

/* ---------- 3: malha pesada passando pelo invólucro real dos occluders ---------- */
const malha = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 64), new THREE.MeshBasicMaterial());
malha.position.set(3, 1, -2); malha.updateMatrixWorld(true);
const linear = malha.clone(); linear.updateMatrixWorld(true);
withVisibleShotOccluders(() => ({ occluders: [malha] }))();
const triMalha = malha.geometry.index.count / 3;
let triTestes = 0;
const intersectTriangle = THREE.Ray.prototype.intersectTriangle;
THREE.Ray.prototype.intersectTriangle = function (...a) { triTestes++; return intersectTriangle.apply(this, a); };
const raio = new THREE.Raycaster(); let s = 99, divergencias = 0, raios = 0;
const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
for (let i = 0; i < 300; i++) {
  const o = new THREE.Vector3(3 + rnd() * 12, 1 + rnd() * 6, -2 + rnd() * 12);
  const alvo = new THREE.Vector3(3 + rnd() * 3, 1 + rnd() * 3, -2 + rnd() * 3);
  raio.set(o, alvo.sub(o).normalize()); raio.far = 30;
  const a = raio.intersectObject(malha, false).map((h) => [h.distance.toFixed(9), h.faceIndex]);
  const antes = triTestes;
  THREE.Ray.prototype.intersectTriangle = intersectTriangle;
  const b = raio.intersectObject(linear, false).map((h) => [h.distance.toFixed(9), h.faceIndex]);
  THREE.Ray.prototype.intersectTriangle = function (...x) { triTestes++; return intersectTriangle.apply(this, x); };
  triTestes = antes; raios++;
  if (JSON.stringify(a) !== JSON.stringify(b)) divergencias++;
}
THREE.Ray.prototype.intersectTriangle = intersectTriangle;
const triPorRaio = triTestes / raios;

/* ---------- veredito ---------- */
// Medido 08/11 (7×7, semente 4242): árvore antiga 3,92 LOS · 119 colisores · 97% dos triângulos;
// com as correções 1,22 · 2,3 · 0,4% — e o MESMO hash da partida (2c2320f38243e9eb) nas duas.
const TETO_LOS = 1.6;
const TETO_VISITAS = 12;
const TETO_TRIANGULOS = 0.05;  // fração da malha testada por raio
console.log(`Operação Flávio · ${bots} bots · ${PASSOS} passos`);
console.log(`  LOS por bot por passo ......... ${losPorBot.toFixed(2)} (teto ${TETO_LOS})`);
console.log(`  colisores visitados/_collide .. ${visitasPorColide.toFixed(1)} de ${g.world.colliders.length} (teto ${TETO_VISITAS})`);
console.log(`  triângulos testados por raio .. ${triPorRaio.toFixed(0)} de ${triMalha} (${(triPorRaio / triMalha * 100).toFixed(1)}%, teto ${TETO_TRIANGULOS * 100}%)`);
console.log(`HASH ${hash}`);
let falhas = 0;
const cobra = (ok, msg) => { if (!ok) { falhas++; console.log(`✗ ${msg}`); } };
cobra(colideChamadas > PASSOS, `amostra sem colisão: ${colideChamadas} chamadas`);
cobra(losChamadas > PASSOS, `amostra sem LOS: ${losChamadas} chamadas`);
cobra(losPorBot <= TETO_LOS, `LOS por bot por passo ${losPorBot.toFixed(2)} > ${TETO_LOS}`);
cobra(visitasPorColide <= TETO_VISITAS, `_collide visita ${visitasPorColide.toFixed(1)} colisores por chamada > ${TETO_VISITAS}`);
cobra(triPorRaio <= triMalha * TETO_TRIANGULOS, `raio testa ${triPorRaio.toFixed(0)} triângulos > ${(triMalha * TETO_TRIANGULOS).toFixed(0)}`);
cobra(divergencias === 0, `índice estático divergiu do raycast linear em ${divergencias}/${raios} raios`);
console.log(falhas ? `FALHA · ${falhas} cobrança(s)` : 'PASSA');
process.exit(falhas ? 1 : 0);
