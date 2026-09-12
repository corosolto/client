/* mansao-vaos-check.mjs — o vão DECLARADO tem que ser o vão que o corpo e a bala encontram.
   ─────────────────────────────────────────────────────────────────────────────────────────
   DEFEITO QUE ORIGINOU A RÉGUA (revisão independente do PR #533): a `paredeComVao` só sabia
   recortar no eixo X. As paredes leste/oeste correm no eixo Z, caíam no early-return e não
   construíam nada; os segmentos delas eram escritos à mão e não fechavam com a declaração.
   Medido no Game real, corpo r=0,38, ANTES do conserto:

     leste  · janela de 5,0 m em z=0  → corredores livres em z[-4,60;-2,90] e z[2,90;4,60]
              (dois rasgos de 2,5 m sem parede E sem vidro: 10 m de buraco, não 5)
     oeste  · porta de 3,0 m em z=2   → corredor livre em z[0,90;3,60] (0,5 m a mais)

   As três cláusulas medem coisas DIFERENTES de propósito — uma sozinha deixaria passar o
   defeito irmão:
     V1 CORPO      · onde `Game._collide` deixa o corpo atravessar a linha da parede.
     V2 BALA       · onde o raycast contra `occluders` atravessa (é a régua do BUG-54:
                     colisão e bala têm que concordar sobre onde a alvenaria está).
     V3 PERFIL     · continuidade VERTICAL da coluna do vão. V1 e V2 medem em UMA altura;
                     as frestas de 0,30 m (peitoril) e 0,20 m (verga) da janela viviam fora
                     da banda do corpo (`pos.y+0,3 .. pos.y+1,5`) e passavam verdes.

   Mutantes (a régua tem que ficar VERMELHA com cada um):
     --mutante=vao-largo     derruba o trecho de alvenaria depois da porta oeste → V1
     --mutante=fresta-janela derruba o peitoril da janela leste                  → V3
*/
import assert from 'node:assert/strict';
import { bootGame, initTextures, THREE } from './harness.mjs';
import { MANSAO_VAOS, CASA, PAREDE } from '../../public/js/map_mansao.js';

const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutante && !['vao-largo', 'fresta-janela'].includes(mutante)) throw Error(`mutante desconhecido: ${mutante}`);

const g = bootGame('mansao', { ctf: false, bots: 0, textures: initTextures(), seed: 14000 });
const w = g.world;
const R = 0.38;          // raio do corpo (Game._moveEntity/_collide)
const OLHO = 1.5;        // altura de mira usada pelas réguas de parede desta lane
const PASSO = 0.02, TOL = 0.05;

/* Peças marcadas pelo construtor: `{ id, parte, collider }`. É por elas que o mutante
   derruba UM trecho — sem reeditar o mapa, que é o jeito de a régua mentir. */
const pecas = [];
w.root.traverse((m) => { if (m.userData?.mansaoVao) pecas.push(m); });
const peca = (id, parte) => pecas.find((m) => m.userData.mansaoVao.id === id && m.userData.mansaoVao.parte === parte);
const derruba = (id, parte) => {
  const m = peca(id, parte);
  assert(m, `mutante não achou ${id}/${parte}`);
  const ci = w.colliders.indexOf(m.userData.mansaoVao.collider);
  assert(ci >= 0, `mutante não achou o colisor de ${id}/${parte}`);
  w.colliders.splice(ci, 1);
  const oi = w.occluders.indexOf(m); if (oi >= 0) w.occluders.splice(oi, 1);
  m.visible = false;
};
if (mutante === 'vao-largo') derruba('porta-oeste', 'depois');
if (mutante === 'fresta-janela') derruba('janela-leste', 'peitoril');
g.scene.updateMatrixWorld(true);

const falhas = [];
const ray = new THREE.Raycaster();
const quase = (a, b) => Math.abs(a - b) <= TOL;

for (const vao of MANSAO_VAOS) {
  const eixoX = vao.eixo === 'x';
  const a0 = eixoX ? CASA.x0 : CASA.z0, a1 = eixoX ? CASA.x1 : CASA.z1;
  const v0 = vao.centro - vao.largura / 2, v1 = vao.centro + vao.largura / 2;
  const ponto = (s, y) => (eixoX ? new THREE.Vector3(s, y, vao.em) : new THREE.Vector3(vao.em, y, s));

  /* Cada peça declarada tem que existir de fato: sem isto a régua ficaria verde num mapa
     que não constrói parede nenhuma — que é literalmente o estado de partida. O mutante
     só derruba colisor/occluder e apaga a peça; ela continua em `root`, então esta
     cláusula não vira ruído por cima da cláusula que o mutante quer provar. */
  const partes = ['antes', 'depois', ...(vao.tipo === 'janela' ? ['peitoril', 'verga', 'vidro'] : [])];
  for (const p of partes) if (!peca(vao.id, p)) falhas.push(`${vao.id}: peça ${p} ausente`);

  /* ---- V1 CORPO: corredores livres na linha da parede ---- */
  const livres = [];
  let atual = null;
  for (let s = a0; s <= a1 + 1e-9; s += PASSO) {
    const q = ponto(s, 0);                       // y = PÉ (o _collide olha pé+0,3 .. pé+1,5)
    const alvo = q.clone(); g._collide(q, R);
    const passa = Math.hypot(q.x - alvo.x, q.z - alvo.z) < 1e-3;
    if (passa) { if (!atual) atual = { s0: s }; atual.s1 = s; } else if (atual) { livres.push(atual); atual = null; }
  }
  if (atual) livres.push(atual);
  if (vao.tipo === 'janela') {
    // janela envidraçada é fechamento: o corpo NÃO passa em lugar nenhum da linha.
    if (livres.length) falhas.push(`V1 ${vao.id}: corpo atravessa janela em ${livres.map((l) => `[${l.s0.toFixed(2)};${l.s1.toFixed(2)}]`).join(' ')}`);
  } else if (livres.length !== 1) {
    falhas.push(`V1 ${vao.id}: ${livres.length} corredores livres (esperado 1) — ${livres.map((l) => `[${l.s0.toFixed(2)};${l.s1.toFixed(2)}]`).join(' ')}`);
  } else if (!quase(livres[0].s0, v0 + R) || !quase(livres[0].s1, v1 - R)) {
    falhas.push(`V1 ${vao.id}: corredor [${livres[0].s0.toFixed(2)};${livres[0].s1.toFixed(2)}] ≠ vão declarado [${(v0 + R).toFixed(2)};${(v1 - R).toFixed(2)}]`);
  }

  /* ---- V2 BALA: occluders concordam com a declaração na altura do olho ---- */
  const atravessa = (s, y) => {
    const de = ponto(s, y), dir = eixoX ? new THREE.Vector3(0, 0, vao.em > 0 ? -1 : 1) : new THREE.Vector3(vao.em > 0 ? -1 : 1, 0, 0);
    de.addScaledVector(dir, -1.2); ray.set(de, dir); ray.far = 2.4;
    return ray.intersectObjects(w.occluders, false).length === 0;
  };
  for (const s of [v0 - 0.4, v1 + 0.4, a0 + 0.4, a1 - 0.4]) if (atravessa(s, OLHO)) falhas.push(`V2 ${vao.id}: alvenaria vazada para bala em ${s.toFixed(2)}`);
  if (vao.tipo === 'porta') {
    /* Porta que o corpo cruza e a bala não é o desacordo do BUG-54 na passagem — foi
       assim que as ripas decorativas apareceram atravessando a porta norte de 6 m.
       Não vale para janela: ela é envidraçada e o brise na frente dela é fachada, não
       cerca — lá o que importa é peitoril e verga existirem. */
    for (const s of [vao.centro, v0 + 0.4, v1 - 0.4]) if (!atravessa(s, OLHO)) falhas.push(`V2 ${vao.id}: vão obstruído para bala em ${s.toFixed(2)}`);
  } else {
    // pano transparente fica FORA de occluders (BUG-54): a bala passa o vidro, não a alvenaria.
    if (atravessa(vao.centro, vao.peitoril / 2)) falhas.push(`V2 ${vao.id}: peitoril não para bala`);
    if (atravessa(vao.centro, (vao.verga + PAREDE.altura) / 2)) falhas.push(`V2 ${vao.id}: verga não para bala`);
  }

  /* ---- V3 PERFIL: continuidade vertical da coluna do vão ---- */
  const cobertoEm = (y) => w.colliders.some((c) => {
    const p = ponto(vao.centro, 0);
    return p.x > c.minX - 1e-6 && p.x < c.maxX + 1e-6 && p.z > c.minZ - 1e-6 && p.z < c.maxZ + 1e-6 && y > c.minY - 1e-6 && y < c.maxY + 1e-6;
  });
  const descobertos = [];
  for (let y = PASSO; y < PAREDE.altura; y += PASSO) if (!cobertoEm(y)) descobertos.push(y);
  if (vao.tipo === 'janela') {
    if (descobertos.length) falhas.push(`V3 ${vao.id}: fresta de ${(descobertos.length * PASSO).toFixed(2)} m na coluna (y≈${descobertos[0].toFixed(2)})`);
  } else if (descobertos.length * PASSO < PAREDE.altura - 3 * PASSO) {
    falhas.push(`V3 ${vao.id}: porta obstruída em ${(PAREDE.altura - descobertos.length * PASSO).toFixed(2)} m de altura`);
  }
}

if (falhas.length) { console.error(falhas.join('\n')); process.exitCode = 1; }
else console.log(`JOA VÃOS: ${MANSAO_VAOS.length} vãos — V1 corpo, V2 bala e V3 perfil batem com a declaração`);
