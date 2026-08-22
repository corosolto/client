// Contrato de segurança para habilitar mãos em primeira pessoa.
// Por que existe: `arms.glb` parece ter dedos, mas sua skin possui 24 juntas e NENHUMA
// junta de dedo. Ligar ?hands por padrão nesse estado só transforma uma falha visual
// conhecida em regressão para todo jogador. Esta régua lê o GLB que seria servido e o
// comportamento do jogo; ela não confia em comentário, nome de arquivo ou screenshot.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const GAME = path.join(ROOT, 'public/js/game.js');
const ASSET = path.join(ROOT, 'public/models/fparms/arms-v2.glb');
const WANT = ['fp_idle', 'fp_fire', 'fp_reload_rifle', 'fp_reload_pistol', 'fp_reload_sniper', 'fp_draw', 'fp_inspect'];

function glbJson(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${path.basename(file)} não é GLB`);
  const n = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + n).toString('utf8'));
}

function inspect(file) {
  if (!fs.existsSync(file)) return { exists: false, fingerJoints: 0, clips: [] };
  const g = glbJson(file);
  const joints = (g.skins || []).flatMap((s) => s.joints || []).map((i) => g.nodes?.[i]?.name || '');
  const fingerJoints = joints.filter((name) => /(?:left|right|l_|r_).*(?:thumb|index|middle|ring|pinky|little).*[123]|(?:thumb|index|middle|ring|pinky|little).*[123].*(?:left|right|l_|r_)/i.test(name)).length;
  return { exists: true, fingerJoints, clips: (g.animations || []).map((a) => a.name || '') };
}

function verdict({ game, candidate }) {
  const defaultWeaponOnly = /const\s+WEAPON_ONLY\s*=\s*_qsHands\s*!==\s*'1'\s*;/.test(game);
  const rigReady = candidate.exists && candidate.fingerJoints >= 30 && WANT.every((clip) => candidate.clips.includes(clip));
  // A política é deliberadamente assimétrica: candidato incompleto é permitido APENAS
  // enquanto o jogo continua em arma-sozinha por padrão. Isso deixa trabalho iterativo
  // possível sem expor o jogador ao asset reprovado.
  return { defaultWeaponOnly, rigReady, pass: defaultWeaponOnly || rigReady };
}

const game = fs.readFileSync(GAME, 'utf8');
const candidate = inspect(ASSET);
const live = verdict({ game, candidate });
const mutant = verdict({ game: game.replace(/const\s+WEAPON_ONLY\s*=\s*_qsHands\s*!==\s*'1'\s*;/, "const WEAPON_ONLY = _qsHands === '0';"), candidate });

if (mutant.pass) throw new Error('mutação não derrubou o portão: mãos poderiam ligar sem rig completo');
if (!live.pass) throw new Error(`mãos padrão exigem arms-v2.glb com 30 juntas de dedo e clipes: ${WANT.join(', ')}`);

console.log(`fp-arms: verde · padrão=${live.defaultWeaponOnly ? 'arma-sozinha' : 'mãos completas'} · candidato=${candidate.exists ? `${candidate.fingerJoints}/30 dedos, ${candidate.clips.length}/7 clipes` : 'ausente'}`);
