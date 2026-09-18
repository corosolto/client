#!/usr/bin/env node
/**
 * Congela o CONTRATO DE RIG E DE AÇÕES do arsenal em `tools/viewmodels/rig-contract.json`.
 *
 * O padrão da indústria é um esqueleto de braços para o jogo inteiro: exporta-se
 * a malha de braços uma vez e toda arma é skinada usando apenas os ossos que já
 * existem nele. O nosso catálogo tem DOIS rigs — 19 armas no KINEMATION e cinco
 * (akm, awp, g3, m400, m92) num `*_metarig` herdado do pacote golden da AK, com
 * zero ossos em comum. Enquanto isso durar, nenhuma régua produz consistência:
 * ela só mede melhor a inconsistência.
 *
 * O contrato não é inventado: sai da INTERSEÇÃO dos ossos de braço das armas do
 * grupo majoritário. Quem define é a maioria que já funciona, não um gosto.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
// Referência do rig: seis armas da família `ar`, todas do mesmo checkpoint
// KINEMATION e todas com o catálogo de ações completo.
const REFERENCIA = ['m4', 'scar', 'tavor', 'carbine', 'famas', 'md97'];
const OSSO_DE_BRACO = /^(hand|lowerarm|upperarm|clavicle|index|middle|ring|pinky|thumb|spine|pelvis|neck|head|ik_)/i;

const glb = (file) => {
  const bytes = fs.readFileSync(file);
  const tamanho = new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + tamanho)));
};
const ossosDe = (json) => {
  const nomes = (json.nodes || []).map((node) => node.name || '');
  const joints = new Set();
  for (const skin of json.skins || []) for (const joint of skin.joints || []) joints.add(nomes[joint]);
  return new Set([...joints].filter((nome) => OSSO_DE_BRACO.test(nome)));
};

const candidatas = Object.assign({}, ...['rifle', 'smg', 'sidearm', 'dmr', 'precision', 'heavy']
  .map((nome) => path.join(ROOT, 'tools/viewmodels', `${nome}-candidates.json`))
  .filter((file) => fs.existsSync(file))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')).candidates || {}));

let canonico = null;
for (const weapon of REFERENCIA) {
  const cfg = candidatas[weapon];
  if (!cfg) throw new Error(`referência ausente do manifesto: ${weapon}`);
  const file = path.join(ASSET_ROOT, cfg.file);
  if (!fs.existsSync(file)) throw new Error(`produto da referência ausente: ${file}`);
  const ossos = ossosDe(glb(file));
  canonico = canonico ? new Set([...canonico].filter((osso) => ossos.has(osso))) : ossos;
}

const contrato = {
  schemaVersion: 1,
  gerador: 'tools/viewmodels/gen-rig-contract.mjs',
  rig: {
    nome: 'KINEMATION-FP',
    referencia: REFERENCIA,
    // Um esqueleto para o arsenal: todo produto tem de conter estes ossos.
    ossosDeBraco: [...canonico].sort(),
  },
  acoes: {
    // Catálogo mínimo, derivado do que a maioria já entrega. `equip_rifle` fica
    // fora da obrigação porque várias famílias tomam o saque do pacote General
    // compartilhado em runtime, e não do próprio produto.
    obrigatorias: ['idle', 'shoot', 'inspect'],
    // Recarga aceita dois mecanismos: pente único ou carga unitária em laço.
    recarga: { umDe: [['reload_tactical'], ['reload_start', 'reload_loop', 'reload_end']] },
    opcionais: ['equip_rifle', 'reload_empty'],
  },
};
fs.writeFileSync(path.join(ROOT, 'tools/viewmodels/rig-contract.json'), `${JSON.stringify(contrato, null, 2)}\n`);
console.log(`contrato congelado: ${canonico.size} ossos de braço, referência ${REFERENCIA.join(', ')}`);
