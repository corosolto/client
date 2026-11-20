/* escala-lajes-check.mjs — ESCALA HUMANA DAS CASAS DO FY_LAJES (#1127, BUG-55).
   O dono reclamou da escala dos barracos do Lajes no mesmo teste do Córrego (17/08), e a
   `escala-favela-check` só mede o Córrego: lá a porta é cluster da malha de vão e as
   fileiras têm x fixo. No Lajes V4 a casa sai do `home()` de `lajes_houses.js`, com
   porta própria (tag `lajesDoor`) e collider marcado `casa: 'lajes-unidade-terrea'`.

   REFERÊNCIA: a receita da V4 (docs/maps/LAJES-V4-ESCALA.md, removido da árvore em
   7dd1c2bba e lido no 70f524937): folha de porta 2,10 m; térreo 0,05 + 2,60 + 0,15 =
   2,80 m; segundo pavimento com passo 2,75 m. O teto de 2,80 m laje-a-laje é o mesmo do
   ESC2 do Córrego. O documento chama esses números de valor inicial, e a régua mede
   contra eles sem decidir sozinha a geometria: o H do Lajes amarra plataformas, pontes e
   pulos da jogabilidade pelas lajes (#1113), então baixar o pé-direito é decisão do dono.

   ESCL1 PORTA: toda malha `lajesDoor` com altura 2,00–2,20 m e base ≤ 0,15 m.
   ESCL2 TÉRREO: casa de um pavimento (collider ≤ 4,5 m) com altura total 2,70–2,90 m.
   ESCL3 ANDAR: passo mediano entre os níveis de laje das casas, 2,40–2,80 m.
   Sem alvo mensurável a régua fica vermelha.

   REPRODUZ:  node tools/eval/escala-lajes-check.mjs
   MUTANTE:   --mutante=porta-ana   (portas com altura ×0,5)            → ESCL1
   SIMULAÇÃO: --simula=receita-v4   (térreo 2,80 m e passo 2,75 m)       → precisa passar */
import { THREE, initTextures, bootGame } from './harness.mjs';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || null;
const mutante = arg('mutante'), simula = arg('simula');
if (mutante && mutante !== 'porta-ana') { console.error(`mutante desconhecido: ${mutante}`); process.exit(78); }
if (simula && simula !== 'receita-v4') { console.error(`simulação desconhecida: ${simula}`); process.exit(78); }

const PORTA_MIN = 2.00, PORTA_MAX = 2.20;
const TERREO_MIN = 2.70, TERREO_MAX = 2.90;
const PASSO_MIN = 2.40, PASSO_MAX = 2.80;
const ANDAR_UNICO = 4.5;

const game = bootGame('lajes', { textures: initTextures(), ctf: true, seed: 13007 });
const world = game.world;

const portas = [];
world.root.traverse((o) => { if (o.isMesh && o.userData.lajesDoor) portas.push(o); });
if (mutante === 'porta-ana') for (const p of portas) p.scale.y *= 0.5;
world.root.updateMatrixWorld(true);

const casas = world.colliders.filter((c) => c.casa === 'lajes-unidade-terrea');
const cm = (x) => Math.round(x * 100) / 100;
let alturas = casas.map((c) => cm(c.maxY - c.minY));
if (simula === 'receita-v4') alturas = alturas.map((h) => {
  const andares = Math.max(1, Math.round((h - 0.12) / 3));
  return cm(2.80 + (andares - 1) * 2.75);
});

const caixa = new THREE.Box3();
const medidas = portas.map((p) => { caixa.setFromObject(p); return { base: cm(caixa.min.y), h: cm(caixa.max.y - caixa.min.y) }; });
const portasOk = medidas.filter((m) => m.base <= 0.15 && m.h >= PORTA_MIN && m.h <= PORTA_MAX);

const terreas = alturas.filter((h) => h <= ANDAR_UNICO);
const terreasOk = terreas.filter((h) => h >= TERREO_MIN && h <= TERREO_MAX);

const niveis = [...new Set(alturas.map((h) => Math.round(h * 4) / 4))].sort((a, b) => a - b);
const passos = niveis.slice(1).map((n, i) => cm(n - niveis[i])).filter((p) => p >= 2);
const passoMediano = passos.length ? [...passos].sort((a, b) => a - b)[Math.floor(passos.length / 2)] : null;

const fmt = (x) => (x == null || !isFinite(x)) ? '—' : x.toFixed(2).replace('.', ',');
const distintos = (xs) => [...new Set(xs)].sort((a, b) => a - b).map(fmt).join(' · ');
console.log(`portas: ${medidas.length} (ok ${portasOk.length}) · alturas ${distintos(medidas.map((m) => m.h))} m · bases ${distintos(medidas.map((m) => m.base))} m`);
console.log(`casas: ${casas.length} · alturas ${distintos(alturas)} m · térreas ${terreas.length} (ok ${terreasOk.length})`);
console.log(`níveis de laje: ${niveis.map(fmt).join(' · ')} m · passo mediano ${fmt(passoMediano)} m`);

const checks = [
  ['ESCL1 porta 2,00–2,20 m com base no piso',
    medidas.length >= 8 && portasOk.length === medidas.length,
    medidas.length < 8 ? `${medidas.length} portas encontradas — régua sem alvo` : `${portasOk.length}/${medidas.length} na faixa`],
  ['ESCL2 casa térrea com 2,70–2,90 m (receita V4: 2,80)',
    terreas.length >= 4 && terreasOk.length === terreas.length,
    terreas.length < 4 ? `${terreas.length} casas térreas — régua sem alvo` : `${terreasOk.length}/${terreas.length} na faixa`],
  ['ESCL3 passo de andar 2,40–2,80 m',
    passoMediano != null && passoMediano >= PASSO_MIN && passoMediano <= PASSO_MAX,
    passoMediano == null ? 'menos de 2 níveis de laje — régua sem alvo' : `passo mediano ${fmt(passoMediano)} m`],
];

let falhas = 0;
for (const [nome, ok, det] of checks) { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome} — ${det}`); }
if (falhas) {
  console.error(`ESCALA-LAJES FALHA: ${falhas}/${checks.length}${mutante ? ` (mutante ${mutante} mordido)` : ''}${simula ? ` (simulação ${simula})` : ''}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu.`);
  process.exitCode = 1;
} else console.log(`ESCALA-LAJES OK${simula ? ` (simulação ${simula})` : ''}`);
