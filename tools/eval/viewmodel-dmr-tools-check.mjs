#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { VM_FAMILY, VM_WEAPON } from '../../public/js/data/vmconfig.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const checks = [];
const check = (ok, label) => {
  checks.push({ ok: Boolean(ok), label });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
};

check(VM_WEAPON.rem700?.family === 'bolt' && VM_WEAPON.rem700?.baked === true,
  'Rem700 usa produto assado próprio sobre o lifecycle bolt');
check(VM_WEAPON.g3sg1?.family === 'g3' && VM_WEAPON.g3sg1?.baked === true,
  'G3SG1 usa produto assado próprio sobre o lifecycle G3');
check(VM_FAMILY.bolt?.ready === false && VM_FAMILY.g3?.ready === false,
  'famílias DMR continuam fechadas no Git');
check(VM_WEAPON.rem700?.ready !== true && VM_WEAPON.g3sg1?.ready !== true,
  'nenhuma DMR contorna a revisão humana com ready:true por arma');
check(VM_WEAPON.rem700?.frame === 'family' && VM_WEAPON.g3sg1?.frame === 'family',
  'DMRs declaram enquadramento de família sem mudar Precisão');

const manifestPath = path.join(root, 'tools/viewmodels/dmr-candidates.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
check(manifest?.schemaVersion === 1 && Object.keys(manifest?.candidates || {}).join(',') === 'rem700,g3sg1',
  'manifesto público cobre exatamente Rem700 e G3SG1');
check(Object.values(manifest?.candidates || {}).every((entry) => entry.ready === false
  && /^[a-f0-9]{64}$/.test(entry.sha256 || '') && entry.bytes > 0),
  'manifesto registra hashes e mantém candidatos fechados');

const preview = fs.readFileSync(path.join(root, 'tools/viewmodels/prepare_precision_preview.mjs'), 'utf8');
check(preview.includes("dmr-candidates.json"), 'preview único valida também os candidatos DMR');
check(preview.includes('aponta para dentro do repositório')
  && preview.includes("if (mode === '--assert-clean')")
  && preview.includes('await fs.unlink(link)'),
  'cleanup remove somente o symlink privado externo e mantém fail-closed para caminhos do repositório');
const verifierPath = path.join(root, 'tools/viewmodels/prep/dmr-verify.mjs');
const verifier = fs.existsSync(verifierPath) ? fs.readFileSync(verifierPath, 'utf8') : '';
check(verifier.includes('CSBRASIL_VM_ASSET_ROOT') && verifier.includes('remove_clipe')
  && verifier.includes('congela_peca') && verifier.includes('desalinha_corpo_idle')
  && verifier.includes('remove_imagens_mint'),
  'gate DMR parametrizado preserva mutantes causais de pose, mecanismo e material');
const assembler = fs.readFileSync(path.join(root, 'tools/viewmodels/prep/dmr-assemble.py'), 'utf8');
check(assembler.includes('pose_primeira_chave') && assembler.includes('mundo_do_no_pose')
  && assembler.includes('recursosMint') && assembler.includes('EXT_texture_webp'),
  'assembly usa idle@t0 e transporta os recursos de material próprios');

const failed = checks.filter((entry) => !entry.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks: checks.length,
  failed: failed.map((entry) => entry.label) }));
if (failed.length) process.exitCode = 1;
