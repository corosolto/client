/* CHR7 — NENHUMA MALHA ATRAVESSA O CHÃO NUMA POSE ASSENTADA.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE (o buraco que ela fecha, medido em 07/09)

   O arnês já media o CONTATO DO PÉ (CHR3, `gen-foot-offsets.mjs`, e o `*-feet` do
   `miticos-runtime-review.mjs`): o vértice mais baixo dos ossos de perna tem de encostar
   no chão. Essa régua olha para os PÉS e só para eles. Ninguém media o RESTO do corpo.

   O Lobisomem passou 30/30 no review com a pata cravada em 0,0000 m e o quadril 45 cm
   ABAIXO do chão na morte — o cadáver afunda em vez de deitar. Foi preciso olhar a caixa
   envolvente inteira para ver:

       morte, assentado    base da malha     altura     osso mais fundo
       lobisomem              -0,4518 m      1,086 m    Hips
       mandrake               -0,0444 m      0,419 m    LeftFoot

   Mesmo esqueleto, mesmo clipe, `Hips` parando na mesma altura (0,138 × 0,129): o que
   muda é a MALHA. O corpo do lobo desce 0,59 m abaixo do próprio quadril; o do mandrake,
   0,18 m. A morte não é aterrada de propósito (`ground-lobisomem-anims.mjs` preserva a
   trajetória de morte e salto), então ninguém corrigia o que sobrava embaixo.

   E O LOBISOMEM NÃO É O PIOR — É O TERCEIRO. Varrendo os 45 personagens com GLB
   (o mesmo `buildCharacterModel` da tela, 60 Hz, quadro assentado):

       estado    pior do elenco              mediana     lobisomem
       idle      -0,0075 (cadequinha)        -0,0001      0,0000   (o melhor do elenco)
       crouch    -0,4313 (proerd)            -0,0004     -0,1158
       death     -0,7771 (proerd)            -0,0677     -0,4518

   `proerd` e `canarinho` — dois personagens que JÁ ESTÃO NO AR — enterram 75 cm de corpo
   na morte, e nada nunca acusou. Não é regressão desta lane: é uma classe inteira que
   nunca teve régua, e que aparece em quem tem corpo fora do padrão humano. Registrada
   como BUG-148.

   O QUE ESTA RÉGUA FAZ, ENTÃO
   Trava o ESTADO DE HOJE por personagem (`chao_check.json`) em vez de fingir que o teto
   certo é zero. Piorar reprova; melhorar pede que o número seja baixado no arquivo. É o
   mesmo desenho do `select_inflate.json`, pela mesma razão: um teto único no pior do
   elenco deixaria os outros 44 livres para afundar até lá sem ninguém ver.

   `idle` é a exceção e ganha teto ABSOLUTO de 1,5 cm, não catraca: é a pose que a tela de
   seleção, o menu e o retrato mostram, o elenco inteiro já cabe nela (pior -0,0075) e é
   onde afundar é visível de verdade — o personagem aparece plantado no chão errado.

   USO
     node tools/eval/chao-check.mjs                 # elenco inteiro
     node tools/eval/chao-check.mjs lobisomem,mandrake
     node tools/eval/chao-check.mjs --mutate=afunda # prova que a régua morde
     node tools/eval/chao-check.mjs --escreve       # regrava a catraca (só ao MELHORAR)
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const localFetch = async (url) => {
  const file = path.resolve('public', String(url).split('?')[0]);
  if (!fs.existsSync(file)) return new Response('', { status: 404 });
  return new Response(fs.readFileSync(file));
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
const { THREE, CHARACTERS } = await import('./harness.mjs');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
/* O GLB do elenco traz textura em `EXT_texture_webp`, que o GLTFLoader do node não sabe
   abrir sozinho — sem este plugin o `parseAsync` fica pendurado para sempre. Esta régua
   só olha GEOMETRIA, então a imagem vira um DataTexture 1×1: decodificar pixel de pelagem
   para medir altura de vértice seria caro à toa. */
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  const file = path.resolve('public', url.split('?')[0]);
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'EXT_texture_webp',
    async loadTexture() {
      const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      t.needsUpdate = true;
      return t;
    },
  }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(file);
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch((e) => fail?.(e));
};

const G = await import('../../public/js/glbchars.js');
const { charWeapon } = await import('../../public/js/characters.js');

const args = process.argv.slice(2);
const mutante = (args.find((a) => a.startsWith('--mutate=')) || '').split('=')[1];
if (mutante && mutante !== 'afunda') throw new Error(`Mutante desconhecido: ${mutante}`);
const escreve = args.includes('--escreve');
const alvoArg = args.find((a) => !a.startsWith('-'));

const ARQ = 'tools/eval/chao_check.json';
const ESTADOS = ['idle', 'crouch', 'death'];
const TETO_IDLE = -0.015;      // absoluto: pior do elenco -0,0075, e é a pose que a tela mostra
const FOLGA = 0.01;            // 1 cm — a mesma tolerância do contato de pé (CHR3)
const PASSO = 3;               // 1 vértice em 3: envelope, não máximo exato (ver docstring)
const ASSENTA = 200, ATE = 260;

const todos = CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
const alvos = alvoArg ? alvoArg.split(',') : todos;
await G.preloadCharacterAssets(alvos, { weapons: [...new Set(alvos.map(charWeapon))] });

const medido = {};
for (const id of alvos) {
  if (!G.hasModel(id)) { console.log(`sem modelo GLB, pulado: ${id}`); continue; }
  medido[id] = {};
  for (const estado of ESTADOS) {
    const char = G.buildCharacterModel(CHARACTERS.find((c) => c.id === id), { weaponId: charWeapon(id) });
    if (estado === 'crouch') char.ctrl.setCrouch(true);
    if (estado === 'death') char.ctrl.die();
    /* mut=afunda — empurra a raiz 5 cm para baixo. Não é ângulo inventado: é exatamente o
       que um clipe sem aterramento faz, e é a classe de defeito que esta régua vigia. */
    if (mutante === 'afunda') char.group.position.y -= 0.05;
    let base = Infinity;
    for (let f = 0; f < ATE; f++) {
      char.ctrl.update(1 / 60, 0, false, 0);
      if (f < ASSENTA) continue;
      char.group.updateMatrixWorld(true);
      char.group.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i += PASSO) {
          const v = new THREE.Vector3().fromBufferAttribute(pos, i);
          o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld);
          if (v.y < base) base = v.y;
        }
      });
    }
    medido[id][estado] = +base.toFixed(4);
  }
}

const catraca = fs.existsSync(ARQ) ? JSON.parse(fs.readFileSync(ARQ, 'utf8')) : { personagens: {} };
const falhas = [], melhoras = [];
for (const [id, estados] of Object.entries(medido)) {
  for (const estado of ESTADOS) {
    const v = estados[estado];
    if (estado === 'idle' && v < TETO_IDLE) {
      falhas.push(`${id}/${estado}: ${v.toFixed(4)} m abaixo do teto absoluto ${TETO_IDLE}`);
      continue;
    }
    const antes = catraca.personagens?.[id]?.[estado];
    if (antes == null) continue;                       // personagem novo entra medindo
    if (v < antes - FOLGA) falhas.push(`${id}/${estado}: afundou ${(antes - v).toFixed(4)} m (${antes.toFixed(4)} -> ${v.toFixed(4)})`);
    else if (v > antes + FOLGA) melhoras.push(`${id}/${estado}: ${antes.toFixed(4)} -> ${v.toFixed(4)}`);
  }
}

const ordenado = Object.entries(medido).sort((a, b) => Math.min(...ESTADOS.map((e) => a[1][e])) - Math.min(...ESTADOS.map((e) => b[1][e])));
console.log('=== CHR7 · PONTO MAIS BAIXO DA MALHA NA POSE ASSENTADA (metros; 0 = chão) ===');
console.log('id'.padEnd(16) + ESTADOS.map((e) => e.padStart(10)).join(''));
for (const [id, e] of ordenado) console.log(id.padEnd(16) + ESTADOS.map((s) => e[s].toFixed(4).padStart(10)).join(''));

if (escreve) {
  fs.writeFileSync(ARQ, JSON.stringify({
    gerado: new Date().toISOString(),
    instrumento: `buildCharacterModel + skinning em node, 60 Hz, quadro ${ASSENTA}-${ATE}, 1 vértice em ${PASSO}`,
    tetoIdle: TETO_IDLE, folga: FOLGA,
    personagens: { ...catraca.personagens, ...medido },
  }, null, 2) + '\n');
  console.log(`\n-> ${ARQ} regravado com ${Object.keys(medido).length} personagem(ns).`);
}

if (mutante) {
  if (!falhas.length) throw new Error(`mutação ${mutante} NÃO foi pega — a régua está cega`);
  console.log(`\n✓ mutação ${mutante} pega em ${falhas.length} caso(s): ${falhas.slice(0, 3).join('; ')}${falhas.length > 3 ? ' …' : ''}`);
  process.exit(0);
}
if (melhoras.length) {
  console.log(`\nMELHOROU em ${melhoras.length} caso(s) — baixe a catraca com --escreve:`);
  for (const m of melhoras) console.log('   ' + m);
}
if (falhas.length) {
  console.error(`\n✗ CHR7 reprovado em ${falhas.length} caso(s):`);
  for (const f of falhas) console.error('   ' + f);
  process.exit(1);
}
console.log(`\n✓ CHR7: ${Object.keys(medido).length} personagem(ns) dentro da catraca (folga ${FOLGA} m) e do teto de idle (${TETO_IDLE} m).`);
