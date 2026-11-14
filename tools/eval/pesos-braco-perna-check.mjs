#!/usr/bin/env node
/* ============================================================================
   pesos-braco-perna-check.mjs — MANGA NÃO SEGUE A PERNA
   ----------------------------------------------------------------------------
   O CASO (P4, 09/11/2026): o censo de rig achou vértices de braço com peso de
   coxa (LeftUpLeg 0,35 na parte de baixo da manga, a 1 m de altura). Quando a
   arma levanta o braço, a manga fica presa na perna e "incha" — o dono viu no
   Lula Mandrake e no Lula Cyborg. Os três Lula (mandrake, cyborg, drip) foram
   repesados por tools/personagens/repesar-skin.mjs e agora têm 0 vértice
   vazado; nove GLBs legados ainda vazam.

   O QUE MEDE: para todo GLB com skin em public/models/characters/ e
   public/models/skins/, a conta do censo (tools/personagens/pesos-skin.mjs
   medirVazamento): vértice de braço = soma de pesos em *Arm|*ForeArm|*Hand >
   0,3; vazado = soma em *UpLeg|*Leg > 0,1. Reprova se:
   - um GLB fora de tools/eval/pesos-braco-perna-tetos.json tiver QUALQUER
     vértice vazado (teto padrão 0 — vale para todo personagem/skin novo e
     para os três Lula reparados);
   - um legado listado passar do teto congelado (o teto só pode baixar);
   - o arquivo de tetos citar um id sem GLB, ou um reparado voltar à lista;
   - um reparado (lista `reparados`) rasgar mais que a origem: rasgo = maior
     distância (cm) entre vértices de peças diferentes coladas a ≤ 1 cm no
     bind, por pose (5 sintéticas + 11 clipes embutidos × 8 instantes,
     tools/personagens/pose-skin.mjs); teto `rasgoCm` = origem, por pose;
   - um reparado passar das falhas do pose test congeladas (`falhasPose`,
     limites do Studio: aresta 3,5×, costas 3,5×, mão 2,5×, costura 5 mm).

   MUTANTES (--mutante=<id>, em memória, nada é escrito em disco):
     vaza-lula     planta peso de LeftUpLeg em 5 vértices de braço do lula-mandrake
     legado-piora  planta 1 vértice vazado a mais no aljuiz-toga-mandrake
     novo-vazando  soma um "skin:personagem-novo" (cópia do lula-drip com 66
                   vértices vazados, o número do drip antes do reparo) sem teto
     teto-orfao    soma ao arquivo de tetos um id que não existe
     cola-solta    1 vértice do lula-mandrake colado a outra peça passa a seguir só Hips
     pose-piora    1 vértice de antebraço do lula-mandrake passa a seguir Hips
   --mutacoes roda todos e exige que cada um reprove pela razão certa.

   Uso: node tools/eval/pesos-braco-perna-check.mjs [--mutante=<id> | --mutacoes]
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gravarInfluencia, lerGlb, medirVazamento, paresColados, skinsDoGlb, RE_BRACO_CENSO } from '../personagens/pesos-skin.mjs';
import { medirPoses } from '../personagens/pose-skin.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MUTANTES = {
  'vaza-lula': 'skin:lula-mandrake: 5 vértice(s) de braço com peso de perna',
  'legado-piora': 'skin:aljuiz-toga-mandrake: 92 vértice(s) de braço com peso de perna > teto congelado 91',
  'novo-vazando': 'skin:personagem-novo: 66 vértice(s) de braço com peso de perna',
  'teto-orfao': 'teto para skin:nao-existe sem GLB',
  'cola-solta': 'skin:lula-mandrake: rasgo entre peças',
  'pose-piora': 'skin:lula-mandrake: pose test com',
};

if (process.argv.includes('--mutacoes')) {
  for (const [id, esperado] of Object.entries(MUTANTES)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${id}`], { encoding: 'utf8' });
    if (r.status === 0 || !r.stderr.includes(esperado)) {
      console.error(`FAIL: mutante ${id} não reprovou pela razão esperada ("${esperado}")\n${r.stdout}${r.stderr}`);
      process.exit(1);
    }
    console.log(`mutante ${id} reprovado como devia`);
  }
  console.log(`PASS: ${Object.keys(MUTANTES).length}/${Object.keys(MUTANTES).length} mutantes de vazamento braço→perna detectados`);
  process.exit(0);
}

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
if (mutante && !MUTANTES[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);

const tetosDoc = JSON.parse(readFileSync(`${RAIZ}tools/eval/pesos-braco-perna-tetos.json`, 'utf8'));
const tetos = { ...tetosDoc.tetos };
if (mutante === 'teto-orfao') tetos['skin:nao-existe'] = { vazados: 1, bracos: 1 };

// Todo GLB de personagem/skin, por id estável (sem o sufixo de hash do nome).
const glbs = new Map();
for (const [pasta, tipo] of [['public/models/characters', 'character'], ['public/models/skins', 'skin']]) {
  for (const f of readdirSync(`${RAIZ}${pasta}`).filter((n) => n.endsWith('.glb')).sort()) {
    glbs.set(`${tipo}:${f.replace(/-[0-9a-f]{12}\.glb$|\.glb$/, '')}`, `${pasta}/${f}`);
  }
}

// Planta `n` vértices vazados (braço puro → 0,6 braço + 0,4 LeftUpLeg) num GLB em memória.
function plantarVazamento(g, n) {
  for (const s of skinsDoGlb(g, { geometria: false })) {
    const coxa = s.nomes.indexOf('LeftUpLeg');
    const braco = s.nomes.map((nome) => RE_BRACO_CENSO.test(nome));
    for (let v = 0; v < s.W.length / 4 && n > 0; v++) {
      if (!(braco[s.J[v * 4]] && s.W[v * 4] >= 0.99)) continue;
      gravarInfluencia(g, s, v, 0, s.J[v * 4], 0.6);
      gravarInfluencia(g, s, v, 1, coxa, 0.4);
      for (let k = 2; k < 4; k++) gravarInfluencia(g, s, v, k, 0, 0);
      n--;
    }
  }
  if (n > 0) throw new Error('MUTANTE NÃO APLICOU');
  return g;
}

const falhas = [];
const medidas = [];
const ids = [...glbs.keys()];
if (mutante === 'novo-vazando') ids.push('skin:personagem-novo');
for (const id of ids) {
  let g;
  if (id === 'skin:personagem-novo') g = plantarVazamento(lerGlb(`${RAIZ}${glbs.get('skin:lula-drip')}`), 66);
  else g = lerGlb(`${RAIZ}${glbs.get(id)}`);
  if (!g.json.skins?.length) continue;
  if (mutante === 'vaza-lula' && id === 'skin:lula-mandrake') plantarVazamento(g, 5);
  if (mutante === 'cola-solta' && id === 'skin:lula-mandrake') { // 1 vértice colado a outra peça passa a seguir só Hips
    const par = paresColados(g)[0];
    if (!par) throw new Error('MUTANTE NÃO APLICOU');
    gravarInfluencia(g, par.s, par.v, 0, par.s.nomes.indexOf('Hips'), 1);
    for (let k = 1; k < 4; k++) gravarInfluencia(g, par.s, par.v, k, 0, 0);
  }
  if (mutante === 'pose-piora' && id === 'skin:lula-mandrake') { // 1 vértice de antebraço passa a seguir Hips
    const s = skinsDoGlb(g, { geometria: false })[0], ante = s.nomes.findIndex((n) => /ForeArm$/.test(n));
    const v = [...Array(s.W.length / 4).keys()].find((x) => s.J[x * 4] === ante && s.W[x * 4] >= 0.9);
    if (v == null) throw new Error('MUTANTE NÃO APLICOU');
    gravarInfluencia(g, s, v, 0, s.nomes.indexOf('Hips'), 1);
  }
  if (mutante === 'legado-piora' && id === 'skin:aljuiz-toga-mandrake') plantarVazamento(g, 1);
  const { bracos, vazados } = medirVazamento(g);
  medidas.push({ id, bracos, vazados });
  // Reparado não pode rasgar mais que a origem em pose nenhuma, nem ganhar falha no pose test.
  const reparado = tetosDoc.reparados?.[id];
  if (reparado?.rasgoCm) {
    const { rasgo, falhas: falhasPose } = await medirPoses(g.buf);
    for (const [pose, tetoCm] of Object.entries(reparado.rasgoCm)) {
      if (rasgo[pose] == null) falhas.push(`${id}: pose ${pose} do teto de rasgo não foi medida`);
      else if (rasgo[pose] > tetoCm) falhas.push(`${id}: rasgo entre peças ${rasgo[pose]} cm em ${pose} > ${tetoCm} cm da origem (use colar na receita)`);
    }
    if (falhasPose > reparado.falhasPose) falhas.push(`${id}: pose test com ${falhasPose} falhas > ${reparado.falhasPose} congeladas`);
  }
  const teto = tetos[id]?.vazados ?? 0;
  if (vazados > teto) {
    falhas.push(tetos[id]
      ? `${id}: ${vazados} vértice(s) de braço com peso de perna > teto congelado ${teto} (o teto só baixa)`
      : `${id}: ${vazados} vértice(s) de braço com peso de perna (teto 0 fora da lista de legados; repare com tools/personagens/repesar-skin.mjs)`);
  }
}
for (const id of Object.keys(tetos)) if (!glbs.has(id)) falhas.push(`teto para ${id} sem GLB em public/models/{characters,skins}: apague a entrada`);
for (const id of Object.keys(tetosDoc.reparados || {})) {
  if (tetos[id]) falhas.push(`${id} foi reparado e não pode voltar à lista de tetos`);
  if (!glbs.has(id)) falhas.push(`reparado ${id} sem GLB`);
}
if (mutante === 'novo-vazando' && !medidas.some((m) => m.id === 'skin:personagem-novo')) throw new Error('MUTANTE NÃO APLICOU');

const legados = medidas.filter((m) => tetos[m.id]);
const baixou = legados.filter((m) => m.vazados < tetos[m.id].vazados);
if (falhas.length) {
  for (const f of falhas) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log(`PASS: ${medidas.length} GLBs com skin; ${medidas.length - legados.length} sem vazamento braço→perna (inclui ${Object.keys(tetosDoc.reparados || {}).length} reparados), ${legados.length} legados dentro do teto congelado (${legados.reduce((t, m) => t + m.vazados, 0)} vértices).`);
for (const m of baixou) console.log(`  teto pode baixar: ${m.id} ${tetos[m.id].vazados} → ${m.vazados}`);
