#!/usr/bin/env node
/**
 * Gate do CONTRATO DE RIG E DE AÇÕES (R3 e R5 do padrão FPS levantado).
 *
 * R3: um esqueleto de braços para o arsenal inteiro — toda arma skinada com os
 * ossos que já existem nele. R5: o mesmo catálogo de ações em todas, porque a
 * animação é camada sobre uma base comum, não um clipe inteiro por arma.
 *
 * Sem estes dois, nenhuma outra régua produz consistência: cada arma vira um
 * ponto isolado e o conserto de uma não move nenhuma outra. É a razão medida de
 * três semanas de conserto arma a arma não terem convergido.
 *
 * O contrato vive em `tools/viewmodels/rig-contract.json`, derivado da maioria
 * que já funciona, não de gosto. Regenerar: `node tools/viewmodels/gen-rig-contract.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const contrato = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/rig-contract.json'), 'utf8'));
const OSSO_DE_BRACO = /^(hand|lowerarm|upperarm|clavicle|index|middle|ring|pinky|thumb|spine|pelvis|neck|head|ik_)/i;

const glb = (file) => {
  const bytes = fs.readFileSync(file);
  const tamanho = new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + tamanho)));
};

const candidatas = Object.assign({}, ...['rifle', 'smg', 'sidearm', 'dmr', 'precision', 'heavy']
  .map((nome) => path.join(ROOT, 'tools/viewmodels', `${nome}-candidates.json`))
  .filter((file) => fs.existsSync(file))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')).candidates || {}));

const exigidos = contrato.rig.ossosDeBraco;
const falhas = [];
const linhas = [];
// Arma servida pela GOLDEN aprovada (a 'ak', decisão do dono 24/09) não tem produto K: a fonte é
// o GLB golden público (rig A, fora deste contrato K) — confere que ele existe e segue.
const { VM_WEAPON } = await import(new URL('../../public/js/data/vmconfig.js', import.meta.url).href);
for (const [weapon, cfg] of Object.entries(candidatas)) {
  if (VM_WEAPON[weapon]?.golden === true) {
    const gold = path.join(ROOT, 'public/models/viewmodels/coro', `${weapon}-hires.glb`);
    if (!fs.existsSync(gold)) falhas.push(`${weapon}: golden ausente (${path.relative(ROOT, gold)})`);
    linhas.push({ weapon, golden: true, ossosNoContrato: exigidos.length, deExigidos: exigidos.length, semAcao: [], temRecarga: true });
    continue;
  }
  const file = path.join(ASSET_ROOT, cfg.file);
  if (!fs.existsSync(file)) { falhas.push(`${weapon}: produto ausente`); continue; }
  const json = glb(file);
  const nomes = (json.nodes || []).map((node) => node.name || '');
  const joints = new Set();
  for (const skin of json.skins || []) for (const joint of skin.joints || []) joints.add(nomes[joint]);
  const braco = new Set([...joints].filter((nome) => OSSO_DE_BRACO.test(nome)));
  const faltando = exigidos.filter((osso) => !braco.has(osso));
  const clipes = new Set((json.animations || []).map((clip) => clip.name));
  const semAcao = contrato.acoes.obrigatorias.filter((nome) => !clipes.has(nome));
  const temRecarga = contrato.acoes.recarga.umDe.some((conjunto) => conjunto.every((nome) => clipes.has(nome)));

  if (faltando.length) {
    // Rig divergente não é "faltam N ossos": é outro esqueleto.
    const fora = faltando.length === exigidos.length ? 'rig INTEIRAMENTE diferente' : `${faltando.length} ossos fora do contrato`;
    falhas.push(`${weapon}: ${fora} (ex.: ${faltando.slice(0, 3).join(', ')})`);
  }
  if (semAcao.length) falhas.push(`${weapon}: sem ${semAcao.join(', ')}`);
  if (!temRecarga) falhas.push(`${weapon}: sem recarga reconhecida (nem pente único nem carga em laço)`);
  linhas.push({ weapon, ossosNoContrato: exigidos.length - faltando.length, deExigidos: exigidos.length, semAcao, temRecarga });
}

console.log(`VM_RIG_CONTRATO=${JSON.stringify({ ok: falhas.length === 0, rig: contrato.rig.nome, armas: linhas.length, falhas }, null, 2)}`);
if (process.argv.includes('--tabela')) {
  console.log(`\n${'arma'.padEnd(12)}${'ossos'.padStart(10)}  ações faltando`);
  for (const linha of linhas.sort((a, b) => a.ossosNoContrato - b.ossosNoContrato)) {
    console.log(`${linha.weapon.padEnd(12)}${(linha.golden ? 'golden' : `${linha.ossosNoContrato}/${linha.deExigidos}`).padStart(10)}  ${linha.golden ? 'rig A aprovado (fora do contrato K)' : [...linha.semAcao, linha.temRecarga ? '' : 'recarga'].filter(Boolean).join(', ') || '—'}`);
  }
}
if (falhas.length) process.exitCode = 1;
