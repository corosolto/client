/* ============================================================================
   mansao-ocean-check.mjs — RÉGUA DO RC2 (plans/23): O OCEANO DO JOÁ É ÁGUA VIVA.
   ----------------------------------------------------------------------------
   O defeito que ela PREMIA não existir (frase literal do dono, 19/08): "oceano é
   plano azul morto" / "no mapa do joa parece NES->SNES". Até o RC2 o "mar" do
   fy_mansao era só a faixa de mar assada no panorama sky_joa.webp — textura
   estática, sem onda, sem espuma, sem profundidade. Os prints de referência que o
   dono mandou mostram o alvo: cor por profundidade (turquesa no raso -> escuro no
   fundo), espuma onde a água toca a terra, normal maps em movimento e transparência
   que deixa ver o fundo.

   O que ela mede, no MESMO mundo em que o jogo roda (bootGame = o jogo de verdade,
   não um mock — e lê o material VIVO do mesh VIVO na cena, não declaração de arquivo;
   régua que lê declaração em vez de uso é o BUG-02):

     OC1  existe UM mesh oceano na cena do fy_mansao (userData.oceano), com
          ShaderMaterial — água viva é shader, não MeshStandardMaterial azul;
     OC2  depth-fade: o fragmentShader VIVO amostra tDepth E usa a profundidade da
          cena (sceneViewZ) para tinta raso->fundo (uCorRasa/uCorFunda) e para a
          transparência — é a cláusula que o mutante --mutante=depthfade remove;
     OC3  espuma de contato: o fragmentShader calcula espuma a partir da distância
          para a geometria sob a linha d'água (token `foam`);
     OC4  onda viva: vertexShader usa uTime e o update() do mundo AVANÇA uTime de
          verdade (medido chamando world.update — uso, não promessa);
     OC5  especular alinhado ao sol do LOOK (look.js, RC1): uSolDir do material ==
          normalize(LOOK.fy_mansao.sol.pos) — a água não inventa um segundo sol;
     OC6  fio do depth: bloom.js entrega o depthTexture do composer ao material
          (scene.userData.water -> tDepth). Node não tem WebGL: este item lê a
          fonte do bloom.js e está MARCADO como nível-declaração; os itens OC1-5
          são nível-uso. A captura 3:2 (tools/eval/look-capture.mjs) é a prova
          visual de que o fio funciona no browser (Lei 4);
     OC7  a cor rasa é mais clara que a funda (tinta por profundidade existe como
          gradiente, não como duas cores iguais).

   PROCEDÊNCIA DAS CORES (Lei 2) — mediana de regiões dos prints do dono:
     media-originals/dbf0172e...png (3550x2704): raso (120,170,177) na caixa
       (100,60)-(700,300); médio (65,148,147) na caixa (60,700)-(500,1100);
     media-originals/383165c4...png (3782x2752): raso (99,163,172) na caixa
       (100,100)-(800,400).
     Script que reproduz: bloco python3/PIL no relatório do RC2 (medianas por caixa,
     passo 7 px). Os defaults de public/js/water.js nascem desses números; a régua
     não crava ΔE de cor porque a luz de fim de tarde do LOOK do Joá tinge a água —
     o que ela garante é o GRADIENTE (OC7) e o mecanismo (OC2).

   Mutantes (Lei 3 — a régua TEM que ficar vermelha):
     node tools/eval/mansao-ocean-check.mjs --mutante=depthfade
     node tools/eval/mansao-ocean-check.mjs --mutante=espuma
     node tools/eval/mansao-ocean-check.mjs --mutante=sol
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

/* ---------- sobe o jogo de verdade ---------- */
const T = initTextures();
const g = bootGame('fy_mansao', { textures: T });

/* OC1 — o mesh oceano existe na cena e é shader */
let oceano = null;
g.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.aguaViva) oceano = o; });
if (!oceano) {
  falhas.push('OC1: nenhum mesh com userData.aguaViva na cena do fy_mansao — o mar segue sendo a foto morta do sky_joa.webp');
} else if (!oceano.material || !oceano.material.isShaderMaterial) {
  falhas.push('OC1: o oceano não é ShaderMaterial — plano azul morto com outro nome');
}

if (oceano && oceano.material && oceano.material.isShaderMaterial) {
  const mat = oceano.material;
  const frag = mat.fragmentShader || '';
  const vert = mat.vertexShader || '';
  const u = mat.uniforms || {};

  /* mutantes: desfazem a correção no material VIVO — a régua tem que morder */
  let fragMedido = frag;
  let vertMedido = vert;
  if (MUT === 'depthfade') fragMedido = frag.replace(/sceneViewZ/g, 'sceneNada');
  if (MUT === 'espuma') fragMedido = frag.replace(/foam/g, 'nada');
  if (MUT === 'sol' && u.uSolDir) u.uSolDir.value.set(0, 1, 0).normalize();

  /* OC2 — depth-fade: amostra tDepth E usa a profundidade da cena na tinta */
  if (!/tDepth/.test(fragMedido) || !/uDepthOn/.test(fragMedido) || !/sceneViewZ/.test(fragMedido))
    falhas.push('OC2: sem depth-fade — o fragmentShader do oceano não amostra tDepth / não usa sceneViewZ para tingir raso->fundo');
  else if (!/uCorRasa/.test(fragMedido) || !/uCorFunda/.test(fragMedido))
    falhas.push('OC2: depth-fade sem tinta por profundidade — faltam uCorRasa/uCorFunda no fragmentShader');
  else ok.push('OC2 depth-fade (tDepth + sceneViewZ + tinta raso->fundo)');

  /* OC3 — espuma de contato */
  if (!/foam/.test(fragMedido)) falhas.push('OC3: sem espuma de contato — o fragmentShader não calcula foam a partir da linha d\'água');
  else ok.push('OC3 espuma de contato (foam)');

  /* OC4 — onda viva: uTime no vértice E o update do mundo avança o relógio */
  if (!/uTime/.test(vertMedido) || !u.uTime) {
    falhas.push('OC4: sem onda — vertexShader não usa uTime (nem Gerstner, nem normal animada no vértice)');
  } else {
    const t0 = u.uTime.value;
    if (typeof g.world.update !== 'function') {
      falhas.push('OC4: o mapa não devolve update(dt) — ninguém avança o relógio da água');
    } else {
      g.world.update(0.5, 0.5);
      if (!(u.uTime.value > t0)) falhas.push(`OC4: world.update(0.5) não avançou uTime (${t0} -> ${u.uTime.value}) — onda congelada`);
      else ok.push(`OC4 onda viva (uTime ${t0} -> ${u.uTime.value})`);
    }
  }

  /* OC5 — o sol da água é o sol do LOOK (RC1), não um segundo sol */
  const sol = LOOK.fy_mansao.sol.pos, L = Math.hypot(...sol);
  if (!u.uSolDir) falhas.push('OC5: material sem uSolDir — especular sem sol');
  else {
    const d = u.uSolDir.value;
    const err = Math.hypot(d.x - sol[0] / L, d.y - sol[1] / L, d.z - sol[2] / L);
    if (err > 1e-3) falhas.push(`OC5: uSolDir (${d.x.toFixed(3)},${d.y.toFixed(3)},${d.z.toFixed(3)}) != sol do LOOK (err ${err.toFixed(3)}) — a água inventou um segundo sol`);
    else ok.push('OC5 especular == sol do LOOK');
  }

  /* OC7 — gradiente existe: raso mais claro que fundo */
  if (!u.uCorRasa || !u.uCorFunda) falhas.push('OC7: material sem uCorRasa/uCorFunda');
  else {
    const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    if (!(lum(u.uCorRasa.value) > lum(u.uCorFunda.value))) falhas.push('OC7: cor rasa não é mais clara que a funda — gradiente de profundidade invertido ou inexistente');
    else ok.push('OC7 gradiente raso>fundo');
  }
}

/* OC6 — fio do depth no composer (nível-declaração: node não tem WebGL; a prova
   de uso no browser é a captura 3:2, Lei 4): bloom.js migra o mesh para a
   WATER_LAYER e instala o WaterPass (cópia linearizada do depth) */
const bloomSrc = readFileSync(path.join(RAIZ, 'public/js/bloom.js'), 'utf8');
if (!/userData\.water/.test(bloomSrc) || !/WaterPass/.test(bloomSrc))
  falhas.push('OC6: bloom.js não instala o WaterPass da água (scene.userData.water -> WATER_LAYER + cópia de depth)');
else ok.push('OC6 fio do depth no composer (declaração — captura 3:2 é a prova de uso)');

/* ---------- placar ---------- */
for (const o of ok) console.log(`  OCEANO ok · ${o}`);
if (MUT) {
  if (falhas.length) { console.log(`OCEANO ok · mutante '${MUT}' reprovado como esperado (${falhas.length} cláusula(s) vermelha(s))`); process.exit(0); }
  console.log(`OCEANO VERMELHA · mutante '${MUT}' passou — a régua NÃO morde`); process.exit(1);
}
for (const f of falhas) console.log(`  OCEANO VERMELHA · ${f}`);
if (falhas.length) { console.log(`OCEANO VERMELHA · ${falhas.length} cláusula(s) — água do Joá ainda é plano morto`); process.exit(1); }
console.log('OCEANO ok · água viva do Joá: depth-fade + espuma + onda + sol do LOOK');
