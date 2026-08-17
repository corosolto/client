/* Direção do indicador de dano bate com a câmera (YXZ), não com a do mesh.
 *
 * Sintoma (feedback 12/08, guilhermeraulino2704): "o sensor de tiro está ao
 * contrário, quando atiram na frente é nas costas".
 *
 * Causa raiz — confirmada por medição, não por palpite. `camera.rotation.order`
 * é 'YXZ' (game.js), então a câmera olha `(-sin yaw, -cos yaw)`: yaw=0 encara -Z.
 * O indicador (`_dmgArc`) calculava `rel = atan2(dx, dz) - yaw`, que é a convenção
 * do MESH (forward +Z = (sin,cos), bearing=yaw). O jogador enfrenta bearing
 * `yaw+π`, não `yaw` — defasagem de 180°: tiro pela frente caía no rodapé (costas).
 *
 * A régua NÃO reimplementa a fórmula: ela EXTRAI a linha real de _dmgArc no
 * game.js, detecta a correção `- Math.PI` (ou `+ Math.PI`), e exercita a rotação
 * resultante contra as 4 direções cardinais relativas à frente da câmera. Mutante
 * `sem-pi` devolve o defeito e tem que acender DD1/DD2.
 *
 * `npm run eval:dmgdir`. Mutação: `--mutante=sem-pi`. */
import { readFileSync } from 'node:fs';

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const src = readFileSync('public/js/game.js', 'utf8');

// Extrai a fórmula do caminho principal de _dmgArc:
//   const rel = Math.atan2(attacker.pos.x - ent.pos.x, attacker.pos.z - ent.pos.z) - ent.yaw [- Math.PI];
const m = src.match(/const\s+rel\s*=\s*([^;]*?Math\.atan2\(attacker\.pos\.x[^;]+);/);
if (!m) throw new Error('não achei a fórmula `rel` em _dmgArc (game.js mudou?)');
let expr = m[1];
// mutante: devolve o defeito removendo a correção de π
if (mutante === 'sem-pi') expr = expr.replace(/\s*[-+]\s*Math\.PI/g, '');
const temCorrecao = /(?<![A-Za-z0-9_])[-+]\s*Math\.PI\b/.test(m[1]);

// Monta a função real a partir da expressão extraída do fonte:
const relDe = new Function('attacker', 'ent', `return ${expr};`);
// rotação aplicada ao arco no game.js: `rotate(${-rel})` (CSS horário, 0=topo)
const rotDe = (atk, ent) => -relDe(atk, ent);

const TAU = Math.PI * 2;
const norm = (r) => ((r % TAU) + TAU) % TAU;            // [0, 2π)
const quase = (a, b, eps = 0.02) => Math.min(Math.abs(norm(a) - norm(b)), TAU - Math.abs(norm(a) - norm(b))) <= eps;

// Frente da câmera na convenção YXZ do game.js (camera olha -Z):
const camFwd = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)]; // (x, z)

const falhas = [];
for (const yaw of [0, 0.6, Math.PI, 2.4]) {
  const ent = { pos: { x: 5, z: 5 }, yaw };
  const f = camFwd(yaw);
  // atacantes nas 4 direções RELATIVAS à frente da câmera (10 m do jogador)
  const frente  = { pos: { x: ent.pos.x + f[0] * 10, z: ent.pos.z + f[1] * 10 } };
  const costas  = { pos: { x: ent.pos.x - f[0] * 10, z: ent.pos.z - f[1] * 10 } };
  const direita = { pos: { x: ent.pos.x - f[1] * 10, z: ent.pos.z + f[0] * 10 } }; // +90° no plano (right = (cos,-sin))
  const esq     = { pos: { x: ent.pos.x + f[1] * 10, z: ent.pos.z - f[0] * 10 } };
  const yawTxt = yaw.toFixed(2);
  // frente = topo (rot ≈ 0), costas = baixo (rot ≈ π)
  if (!quase(rotDe(frente, ent), 0))   falhas.push(`DD1 frente(topo) yaw=${yawTxt}: rot=${norm(rotDe(frente, ent)).toFixed(2)} esperado ~0`);
  if (!quase(rotDe(costas, ent), Math.PI)) falhas.push(`DD2 costas(baixo) yaw=${yawTxt}: rot=${norm(rotDe(costas, ent)).toFixed(2)} esperado ~π`);
  // lateral: direita = +π/2 (horário), esquerda = -π/2
  if (!quase(rotDe(direita, ent), Math.PI / 2)) falhas.push(`DD3 direita yaw=${yawTxt}: rot=${norm(rotDe(direita, ent)).toFixed(2)} esperado ~π/2`);
  if (!quase(rotDe(esq, ent), -Math.PI / 2))    falhas.push(`DD4 esquerda yaw=${yawTxt}: rot=${norm(rotDe(esq, ent)).toFixed(2)} esperado ~-π/2`);
}
// DD5: a correção de π tem que estar no fonte (guarda contra remover "sem querer")
if (!temCorrecao && !mutante) falhas.push('DD5 _dmgArc sem a correção -/+ Math.PI (convenção da câmera YXZ)');

if (falhas.length) {
  console.error(`\x1b[31mDMG-DIR ${falhas.length} VERMELHA(S)${mutante ? ` (mutante=${mutante})` : ''}\x1b[0m`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`\x1b[32mDMG-DIR verde: indicador aponta pra onde o tiro veio (frente=topo, costas=baixo)${mutante ? ` [mutante=${mutante} não acendeu — régua cega]` : ''}\x1b[32m`);
}
