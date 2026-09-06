/* MESCLA os clipes de animação por pasta em 1 GLB com N clipes nomeados.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTE ARQUIVO EXISTE

   Medido pelo tools/eval/boot-waterfall.mjs (07/08): o boot frio fazia **1098
   requests**, 589 deles GLB — e ~520 eram `models/anims/<id>/<estado>.glb`, um por
   clipe por personagem (47 pastas × 11 estados). Cada arquivo é 24–104 KB: esqueleto
   de 28 nós + 1 animação, sem malha. O custo não é byte, é ROUND TRIP — 520 idas e
   vindas de HTTP + 520 parses de GLB separados, e é isso que faz o jogo online abrir
   muito mais devagar que o local.

   A mesclagem é segura por construção: o `glbchars.js` só usa `g.animations` (o THREE
   amarra o clipe no esqueleto do personagem PELO NOME do osso), então o GLB mesclado
   nem precisa de cena própria — precisa dos clipes com os nomes certos. Cada pasta
   vira `<pasta>.glb` do lado dela: `anims/doutora/*.glb` → `anims/doutora.glb`, e o
   pack compartilhado `anims/mixamo/*.glb` → `anims/mixamo.glb`. As pastas-fonte
   CONTINUAM no disco: são a fonte da verdade pra quem re-exporta clipe (retarget,
   gen-foot-offsets, pose-inflate) e o fallback de runtime se o mesclado faltar.

   Como funciona a mescla (gltf-transform): o primeiro clipe vira o documento base;
   cada clipe seguinte é mergeado, seus canais de animação são REAPONTADOS pros nós
   do base pelo nome (os esqueletos são idênticos — conferido: mesma lista de 28 nós
   em todos os clipes da pasta), os nós duplicados são descartados e o prune limpa os
   accessors órfãos.

   uso: node tools/merge-anims.mjs [--check]
     (sem args)  reescreve todos os <pasta>.glb mesclados
     --check     não escreve: verifica que cada mesclado existe e tem os clipes da pasta
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { prune, mergeDocuments, unpartition } from '@gltf-transform/functions';

const ANIMS = 'public/models/anims';
const GLBCHARS = 'public/js/glbchars.js';
const CHECK = process.argv.includes('--check');

// Os estados vêm do jogo, não de uma cópia (mesma regra do gen-anim-manifest.mjs).
const fonte = fs.readFileSync(GLBCHARS, 'utf8');
const listaDe = (nome) => {
  const m = fonte.match(new RegExp(`const ${nome} = \\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/'([a-z0-9]+)'/gi)].map((x) => x[1]) : [];
};
const ESTADOS = [...listaDe('STATES'), ...listaDe('OPT_STATES')];
if (!ESTADOS.length) { console.error('não achei STATES/OPT_STATES em', GLBCHARS); process.exit(1); }

const io = new NodeIO();

// Pastas com pelo menos 1 clipe de estado (inclui o pack compartilhado, ex. `mixamo`).
const pastas = fs.readdirSync(ANIMS).filter((f) => {
  const p = path.join(ANIMS, f);
  return fs.statSync(p).isDirectory() && ESTADOS.some((s) => fs.existsSync(path.join(p, `${s}.glb`)));
}).sort();

async function mesclar(pasta) {
  const dir = path.join(ANIMS, pasta);
  const arquivos = ESTADOS.map((s) => path.join(dir, `${s}.glb`)).filter((f) => fs.existsSync(f));
  const base = await io.read(arquivos[0]);
  const root = base.getRoot();
  // Clip GLB órfão (caso do ue2): cena VAZIA e o esqueleto solto no root. Sem prender
  // a hierarquia na cena, o prune — corretamente — joga os nós "sem uso" fora e os
  // clipes morrem junto. Anexa as raízes órfãs na cena 0 antes de qualquer coisa.
  const cena0 = root.listScenes()[0];
  if (cena0 && cena0.listChildren().length === 0) {
    const comPai = new Set();
    for (const n of root.listNodes()) for (const c of n.listChildren()) comPai.add(c);
    const presos = new Set();
    for (const s of root.listScenes()) for (const c of s.listChildren()) presos.add(c);
    for (const n of root.listNodes()) if (!comPai.has(n) && !presos.has(n)) cena0.addChild(n);
  }
  const porNome = new Map(root.listNodes().map((n) => [n.getName(), n]));
  for (const arq of arquivos.slice(1)) {
    const antesAnim = new Set(root.listAnimations());
    const antesNos = new Set(root.listNodes());
    mergeDocuments(base, await io.read(arq));
    // Reaponta os canais dos clipes recém-mergeados pros nós do base (mesmo nome).
    for (const anim of root.listAnimations()) {
      if (antesAnim.has(anim)) continue;
      for (const ch of anim.listChannels()) {
        const alvo = ch.getTargetNode() && porNome.get(ch.getTargetNode().getName());
        if (alvo) ch.setTargetNode(alvo);
      }
    }
    // Descarta os nós duplicados que vieram no merge (a cena deles morre junto).
    for (const n of root.listNodes()) if (!antesNos.has(n)) n.dispose();
    for (const s of root.listScenes().slice(1)) s.dispose();
  }
  await base.transform(prune(), unpartition());
  return base;
}

async function clipesDoMesclado(pasta) {
  const arq = path.join(ANIMS, `${pasta}.glb`);
  if (!fs.existsSync(arq)) return null;
  const doc = await io.read(arq);
  return doc.getRoot().listAnimations().map((a) => a.getName()).sort();
}

const falhas = [];
let escritos = 0;
// Mesma armadilha da A4 do gen-anim-manifest.mjs: mesclado que existe só nesta
// máquina vira 404 no deploy — o fallback per-estado cobre, mas o ganho de requests
// evapora em silêncio. No --check, exige que todo mesclado esteja versionado.
let versionados = null;
if (CHECK) {
  try {
    const { execSync } = await import('node:child_process');
    versionados = new Set(execSync('git ls-files public/models/anims', { encoding: 'utf8' }).split('\n').filter(Boolean));
  } catch { /* fora de repo git: cláusula não se aplica */ }
}
for (const p of pastas) {
  const esperados = ESTADOS.filter((s) => fs.existsSync(path.join(ANIMS, p, `${s}.glb`))).sort();
  if (CHECK) {
    const tem = await clipesDoMesclado(p);
    if (!tem) { falhas.push(`${p}.glb NÃO existe (rode \`npm run anims:merge\`)`); continue; }
    const faltando = esperados.filter((s) => !tem.includes(s));
    if (faltando.length) falhas.push(`${p}.glb sem os clipes [${faltando.join(', ')}] — defasado, rode \`npm run anims:merge\``);
    if (versionados && versionados.size && !versionados.has(`${ANIMS}/${p}.glb`))
      falhas.push(`${p}.glb existe mas NÃO está versionado — dá 404 no deploy. \`git add public/models/anims/${p}.glb\``);
  } else {
    const doc = await mesclar(p);
    const saida = path.join(ANIMS, `${p}.glb`);
    await io.write(saida, doc);
    const nomes = doc.getRoot().listAnimations().map((a) => a.getName()).sort();
    const faltando = esperados.filter((s) => !nomes.includes(s));
    if (faltando.length) falhas.push(`${p}.glb GERADO sem [${faltando.join(', ')}] — bug na mescla`);
    escritos++;
  }
}

if (falhas.length) { for (const f of falhas) console.error('  ✗', f); process.exit(1); }
console.log(CHECK
  ? `MERGE-ANIMS ✓ ${pastas.length} mesclados em dia (${pastas.length} pastas-fonte)`
  : `MERGE-ANIMS: ${escritos} GLBs mesclados em ${ANIMS}/ (${pastas.length} pastas)`);
