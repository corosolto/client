/* ============================================================================
   corrego-water-check.mjs — RÉGUA DO RC2 NO CÓRREGO (plans/23): ÁGUA ENTRÁVEL VIVA.
   ----------------------------------------------------------------------------
   Irmã da mansao-ocean-check (mesma família de cláusulas), para o caso que o
   oceano NÃO é: aqui o jogador e os bots PISAM DENTRO da água (lâmina de 14 cm,
   CANAL_AGUA = CANAL_FUNDO + 0,14 em map_corrego.js:61-62). O dono pediu
   explicitamente: "a agua no corrego". Até o RC2 a lâmina base do canal era um
   MeshStandardMaterial verde chapado: sem depth-fade, sem espuma de contato nas
   paredes do canal e nas PERNAS de quem pisa, sem onda (as camadas reflexo/poças/
   brilho da frente B continuam — são dressing, não a lâmina).

   O que ela mede, no MESMO mundo em que o jogo roda (bootGame; material VIVO do
   mesh VIVO — uso, não declaração; régua que lê declaração é o BUG-02):

     CW1  existe UM mesh com userData.aguaViva sob world.root (o contrato B o
          enxerga lá), ShaderMaterial, marcado nonSolidSurface — água entrável é
          superfície não-sólida, mesmo padrão da fauna;
     CW2  depth-fade: o fragmentShader VIVO amostra tDepth E usa a profundidade da
          cena (sceneViewZ) para tinta raso->fundo (uCorRasa/uCorFunda) e alfa;
     CW3  espuma de contato (token `foam`) — é ela que desenha a espuma na parede
          do canal e na perna do jogador;
     CW4  onda viva: vertexShader usa uTime E world.update avança o relógio;
     CW5  especular alinhado ao sol do LOOK (look.js, RC1): uSolDir ==
          normalize(LOOK.fy_corrego.sol.pos);
     CW6  fio do depth: bloom.js instala o WaterPass para scene.userData.waters
          (nível-declaração: node não tem WebGL; a captura 3:2 é a prova de uso);
     CW7  a ESCALA de profundidade é do canal, não do oceano: uProfEscala ≤ 0,5 m.
          Procedência (Lei 2): a lâmina máxima é 0,14 m (map_corrego.js:61-62);
          com os 7,0 m do oceano o ponto mais fundo leria prof = 0,14/7 = 2% —
          depth-fade morto. 0,5 m ≈ 3,6× a lâmina máxima. E o albedo poluído do
          mapa (tMapa + uMapaForca > 0) segura a identidade visual da frente B;
     CW8  a lâmina entra na LISTA scene.userData.waters (o WaterPass a renderiza)
          e mantém corregoWaterSurface='base' (o contrato B segue vendo a base).

   Mutantes (Lei 3):
     node tools/eval/corrego-water-check.mjs --mutante=depthfade
     node tools/eval/corrego-water-check.mjs --mutante=espuma
     node tools/eval/corrego-water-check.mjs --mutante=sol
     node tools/eval/corrego-water-check.mjs --mutante=escala
   ============================================================================ */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initTextures, bootGame } from './harness.mjs';
import { LOOK } from '../../public/js/look.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';

const falhas = [];
const ok = [];

const T = initTextures();
const g = bootGame('fy_corrego', { textures: T, ctf: true, seed: 13007 });

/* CW1 — o mesh existe sob world.root, é shader e é superfície não-sólida */
let agua = null;
g.world.root.traverse((o) => { if (o.isMesh && o.userData && o.userData.aguaViva) agua = o; });
if (!agua) {
  falhas.push('CW1: nenhum mesh com userData.aguaViva sob world.root — a lâmina do canal segue verde chapada');
} else {
  if (!agua.material || !agua.material.isShaderMaterial)
    falhas.push('CW1: a lâmina viva não é ShaderMaterial');
  else ok.push('CW1 mesh aguaViva (ShaderMaterial) sob world.root');
  if (agua.userData.nonSolidSurface !== true)
    falhas.push('CW1: água entrável sem nonSolidSurface — o padrão da fauna não foi seguido');
}

if (agua && agua.material && agua.material.isShaderMaterial) {
  const mat = agua.material;
  const u = mat.uniforms || {};
  let frag = mat.fragmentShader || '';
  let vert = mat.vertexShader || '';
  if (MUT === 'depthfade') frag = frag.replace(/sceneViewZ/g, 'sceneNada');
  if (MUT === 'espuma') frag = frag.replace(/foam/g, 'nada');
  if (MUT === 'sol' && u.uSolDir) u.uSolDir.value.set(0, 1, 0).normalize();
  if (MUT === 'escala' && u.uProfEscala) u.uProfEscala.value = 7.0;

  /* CW2 — depth-fade */
  if (!/tDepth/.test(frag) || !/uDepthOn/.test(frag) || !/sceneViewZ/.test(frag))
    falhas.push('CW2: sem depth-fade — o fragmentShader não amostra tDepth / não usa sceneViewZ');
  else if (!/uCorRasa/.test(frag) || !/uCorFunda/.test(frag))
    falhas.push('CW2: depth-fade sem tinta por profundidade — faltam uCorRasa/uCorFunda');
  else ok.push('CW2 depth-fade (tDepth + sceneViewZ + tinta raso->fundo)');

  /* CW3 — espuma de contato */
  if (!/foam/.test(frag)) falhas.push('CW3: sem espuma de contato (foam)');
  else ok.push('CW3 espuma de contato (parede do canal e perna)');

  /* CW4 — onda viva */
  if (!/uTime/.test(vert) || !u.uTime) {
    falhas.push('CW4: sem onda — vertexShader não usa uTime');
  } else {
    const t0 = u.uTime.value;
    if (typeof g.world.update !== 'function') falhas.push('CW4: o mapa não devolve update(dt)');
    else {
      g.world.update(0.5, 0.5);
      if (!(u.uTime.value > t0)) falhas.push(`CW4: world.update(0.5) não avançou uTime (${t0} -> ${u.uTime.value})`);
      else ok.push(`CW4 onda viva (uTime ${t0} -> ${u.uTime.value})`);
    }
  }

  /* CW5 — o sol da água é o sol do LOOK */
  const sol = LOOK.fy_corrego.sol.pos, L = Math.hypot(...sol);
  if (!u.uSolDir) falhas.push('CW5: material sem uSolDir');
  else {
    const d = u.uSolDir.value;
    const err = Math.hypot(d.x - sol[0] / L, d.y - sol[1] / L, d.z - sol[2] / L);
    if (err > 1e-3) falhas.push(`CW5: uSolDir != sol do LOOK do córrego (err ${err.toFixed(3)}) — a água inventou um segundo sol`);
    else ok.push('CW5 especular == sol do LOOK');
  }

  /* CW7 — escala do canal + albedo poluído */
  if (!u.uProfEscala || !(u.uProfEscala.value > 0 && u.uProfEscala.value <= 0.5))
    falhas.push(`CW7: uProfEscala=${u.uProfEscala && u.uProfEscala.value} — escala de oceano (7 m) num canal de 0,14 m mata o depth-fade (proc.: map_corrego.js:61-62)`);
  else if (!/tMapa/.test(frag) || !u.uMapaForca || !(u.uMapaForca.value > 0))
    falhas.push('CW7: sem albedo poluído (tMapa + uMapaForca) — a lâmina perdeu a identidade da frente B');
  else ok.push(`CW7 escala de canal (uProfEscala ${u.uProfEscala.value} ≤ 0,5) + albedo poluído`);

  /* CW8 — lista do WaterPass + marca do contrato B */
  const ws = g.scene.userData.waters || [];
  if (!ws.some((w) => w.mesh === agua)) falhas.push('CW8: a lâmina não está em scene.userData.waters — o WaterPass não a renderiza');
  else if (agua.userData.corregoWaterSurface !== 'base')
    falhas.push('CW8: sem corregoWaterSurface=\'base\' — o contrato B (corrego-contract) ficou cego para a lâmina base');
  else ok.push('CW8 lista waters[] + marca corregoWaterSurface=base');
}

/* CW6 — fio do depth no composer (nível-declaração) */
const bloomSrc = readFileSync(path.join(RAIZ, 'public/js/bloom.js'), 'utf8');
if (!/userData\.waters/.test(bloomSrc) || !/WaterPass/.test(bloomSrc))
  falhas.push('CW6: bloom.js não instala o WaterPass da lista scene.userData.waters');
else ok.push('CW6 fio do depth no composer (declaração — captura 3:2 é a prova de uso)');

for (const o of ok) console.log(`  CORREGO-ÁGUA ok · ${o}`);
if (MUT) {
  if (falhas.length) { console.log(`CORREGO-ÁGUA ok · mutante '${MUT}' reprovado como esperado (${falhas.length} cláusula(s) vermelha(s))`); process.exit(0); }
  console.log(`CORREGO-ÁGUA VERMELHA · mutante '${MUT}' passou — a régua NÃO morde`); process.exit(1);
}
for (const f of falhas) console.log(`  CORREGO-ÁGUA VERMELHA · ${f}`);
if (falhas.length) { console.log(`CORREGO-ÁGUA VERMELHA · ${falhas.length} cláusula(s)`); process.exit(1); }
console.log('CORREGO-ÁGUA ok · água entrável viva: depth-fade + espuma + onda + sol do LOOK');
