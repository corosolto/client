// Concept 2D de personagem a partir de uma ficha: etapa 1 da fábrica de personagens/skins.
// O concept é o que o Mint transforma em 3D; proporção errada aqui vira modelo errado.
//
// Uso:
//   node tools/personagens/gen-concept.mjs tools/personagens/fichas/<id>.json --refs-dir <pasta> [--n 2] [--model <id>]
//
// A ficha diz QUEM (identidade, roupa, corpo medido, o que não exagerar, referências).
// Este arquivo diz COMO (pose de rig, estilo e proporção do elenco) e é igual para todos:
// o estilo vem de `estilo-elenco.jpg`, render do elenco regular no jogo.
// Referências de pessoa real ficam fora do repo (CONTRIBUTING.md): a ficha lista só os nomes
// dos arquivos e `--refs-dir` diz onde eles estão nesta máquina.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const fichaPath = argv.find((a) => a.endsWith('.json'));
if (!fichaPath) { console.error('uso: gen-concept.mjs <ficha.json> [--n 2] [--model id]'); process.exit(1); }
const f = JSON.parse(readFileSync(fichaPath, 'utf8'));
const ESTILO = 'tools/personagens/estilo-elenco.jpg';

const REFS_DIR = arg('refs-dir', `references/${f.id}`);
const refs = (f.refs || []).map((r) => join(REFS_DIR, r)).filter((r) => {
  if (existsSync(r)) return true;
  console.error(`· referência ausente, ignorada: ${r}`);
  return false;
});
const nRefs = refs.length;
const quem = f.genero === 'f' ? 'ONE adult woman' : 'ONE adult man';

const prompt = [
  `Character concept sheet for a stylized 3D third-person shooter. ${quem}, full body, front view, symmetric T-pose (arms straight out horizontally, palms down, fingers slightly apart, hands EMPTY), feet shoulder-width apart flat on the ground, plain flat light-grey background, no text, no props, no weapon, no shadow on the background.`,
  '',
  `IDENTITY${nRefs ? ` (from the photo references, images 1 to ${nRefs})` : ''}: ${f.identidade}`,
  '',
  `OUTFIT: ${f.roupa}`,
  '',
  `BODY (measured on photos, the most important part): ${f.corpo}`,
  f.naoExagerar ? `Do NOT exaggerate: ${f.naoExagerar}. Respectful caricature only in the face and the signature accessory.` : '',
  '',
  `STYLE (image ${nRefs + 1} is the existing game cast — match it exactly): the same stylized-realistic 3D game look as the characters in image ${nRefs + 1}: clean readable shapes, smooth PBR materials, soft matte fabric, natural adult anatomy. Same head-to-body ratio as those characters (head about 1/7 of total height, NOT a bobblehead, NOT chibi, NOT Pixar), natural neck length, natural shoulders, arms and hands in proportion, real feet.`,
  '',
  'Matte materials, no glossy white highlights, no rim glow, no outline.',
].filter((l) => l !== null).join('\n');

const flags = ['tools/gen-image.mjs', '--id', `${f.id}-concept`, '--raw-only', '--n', arg('n', '2'),
  '--aspect', '2:3', '--model', arg('model', 'google/gemini-3-pro-image')];
for (const r of refs) flags.push('--ref', r);
flags.push('--ref', ESTILO, '--prompt', prompt);
if (argv.includes('--print')) { console.log(prompt); process.exit(0); }
execFileSync('node', flags, { stdio: 'inherit' });
