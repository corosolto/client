#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WEAPON_IDS } from '../../public/js/weapons.js';
import { VM_FAMILY, VM_WEAPON } from '../../public/js/data/vmconfig.js';
import { AUTHORED_VM_ENABLED } from '../../public/js/authoredvm.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const checks = [];
const check = (ok, label, detail = '') => {
  checks.push({ ok: Boolean(ok), label, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};
const text = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean));
function glbJson(file) {
  const data = fs.readFileSync(path.join(root, file));
  if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2) throw new Error(`${file}: GLB inválido`);
  const jsonLength = data.readUInt32LE(12);
  return JSON.parse(data.subarray(20, 20 + jsonLength).toString('utf8').replace(/\u0000+$/g, '').trim());
}

const gunIds = WEAPON_IDS.filter((id) => id !== 'knife');
check(WEAPON_IDS.length === 26, 'catálogo alpha.246 preserva 26 armas', WEAPON_IDS.join(','));
check(gunIds.every((id) => VM_WEAPON[id]), '25 armas de fogo têm família authored declarada');
check(Object.keys(VM_WEAPON).every((id) => gunIds.includes(id)), 'configuração não inventa armas fora do catálogo');
check(Object.values(VM_FAMILY).every((family) => family.ready === false), 'todas as famílias permanecem fechadas no Git');
check(AUTHORED_VM_ENABLED === false, 'runtime Node confirma ativação global desligada por padrão');

const authored = text('public/js/authoredvm.js');
const game = text('public/js/game.js');
const vmweapon = text('public/js/vmweapon.js');
check(authored.includes("_QS?.get('vmauthored') === '1'"), 'ativação exige opt-in explícito ?vmauthored=1');
check(game.indexOf('if (AUTHORED_VM_ENABLED)') < game.indexOf('createAuthoredViewModels(this.vm.root'), 'controladores só são criados dentro do portão global');
check(game.includes('!authored && !melee && k === w'), 'uma decisão mantém o fallback até existir controlador ativo');
check(authored.includes('request === this._activeRequest && entryKeyFor(this.weapon) === key'), 'conclusão assíncrona exige token e arma ainda ativos');
const wrapAt = vmweapon.indexOf('wrap = weaponModel(weaponId)');
const hideAt = vmweapon.indexOf('hidePackGun(entry)', wrapAt);
check(wrapAt >= 0 && hideAt > wrapAt, 'placeholder do pack só é ocultado após a malha própria existir');

const ak = 'public/models/viewmodels/coro/ak-hires.glb';
const knife = 'public/models/viewmodels/coro/melee/knife-hires.glb';
check(tracked.has(ak) && sha256(ak) === '3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29', 'AK pública bate o hash aprovado');
const akJson = glbJson(ak);
const akClips = new Set((akJson.animations || []).map((clip) => clip.name));
check(['Equip', 'Idle', 'Reload', 'Shoot'].every((name) => akClips.has(name)) && (akJson.cameras || []).length > 0,
  'AK contém câmera e os quatro clipes do contrato');
check(tracked.has('tools/blender/viewmodels/build_ak_hires_pilot.py'), 'receita Blender da AK está versionada');
check(tracked.has(knife) && sha256(knife) === '3e04fbcb67480cec0638ca552d308379c5bff7c5689ae39c8aa88e566c992621', 'faca pública bate o hash aprovado');
const knifeJson = glbJson(knife);
const knifeClips = new Set((knifeJson.animations || []).map((clip) => clip.name));
check(['Idle', 'Draw', 'Slash', 'Stab', 'QuickThrust', 'HeavyStab'].every((name) => knifeClips.has(name)), 'faca contém os seis clipes do contrato');
check((knifeJson.cameras || []).length > 0, 'faca contém câmera authored');
const handFiles = [...tracked].filter((file) => file.startsWith('public/models/viewmodels/coro/hands/') && file.endsWith('.webp'));
check(handFiles.length === 48, '48 atlas públicos de mãos estão versionados', String(handFiles.length));
check(![...tracked].some((file) => file.startsWith('public/private-assets/')), 'nenhum asset privado entrou no Git');
check(!fs.existsSync(path.join(root, 'public/models/viewmodels/coro/pistol-runtime.glb')), 'PT-38 aprovada permanece fail-closed fora do catálogo público');
check(![...tracked].some((file) => /models\/viewmodels\/.*(?:mosin|svd|sks)/i.test(file)), 'precisão Mosin/SVD/SKS não foi promovida nesta fase');

const failed = checks.filter((entry) => !entry.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks: checks.length, failed: failed.map((entry) => entry.label) }));
if (failed.length) process.exit(1);
