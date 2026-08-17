// Variação de POSE de um personagem, a partir de uma arte que já existe.
//
// POR QUE UMA FERRAMENTA SÓ PARA POSE
// -----------------------------------
// A tela de fim de partida precisa do MESMO personagem em dois estados — comemorando
// e derrotado. Gerar os dois do zero daria dois personagens parecidos, não o mesmo
// em dois momentos: o que trava identidade neste pipeline é sempre a referência, e
// aqui ela é a arte de corpo inteiro que já foi aprovada (public/img/chars/molde/).
//
// A regra do prompt é a mesma das outras etapas, invertida no eixo certo: PRESERVA
// tudo que diz quem é (rosto, roupa, acessório, tom de pele, tipo físico) e MUDA só
// o que diz como ele está (postura, braços, expressão).
//
// Uso:
//   node tools/gen-pose.mjs --ref "public/img/chars/molde/molde/x.png" --id mst --pose vitoria
//   node tools/gen-pose.mjs --ref x.png --id mst --pose derrota --aspect 2:3
//
// Flags:
//   --ref <arquivo>   arte de referência (obrigatório)
//   --id <nome>       nome de saída, sem extensão (obrigatório)
//   --pose <nome>     vitoria | derrota   (obrigatório)
//   --model <id>      padrão openai/gpt-5-image
//   --aspect W:H      padrão 2:3 (retrato de corpo inteiro, que é o formato da arte)
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const die = (m) => { console.error('ERRO:', m); process.exit(1); };

const REF = arg('ref');
const ID = arg('id');
const POSE = arg('pose');
const MODEL = arg('model', 'openai/gpt-5-image');
const ASPECT = arg('aspect', '2:3');

if (!REF) die('faltou --ref');
if (!existsSync(REF)) die(`--ref não existe: ${REF}`);
if (!ID) die('faltou --id');
if (!/^[a-z0-9_-]+$/.test(ID)) die(`--id inválido: ${ID}`);

/* A ARMA SAI. Nas duas telas o personagem aparece como retrato de resultado, não em
   combate — e arma apontada no canto da tela de derrota lê como ameaça ao jogador,
   não como derrota dele. */
const PRESERVA = [
  'PRESERVE COM EXATIDÃO — é o MESMO personagem, sem nenhuma substituição: rosto e suas',
  'proporções, etnia e traços faciais, tom de pele, cabelo e corte (se a referência tem',
  'moicano, topete ou dread, ele CONTINUA lá, na mesma cor), boné/chapéu/capuz, óculos',
  'e a cor da lente, cada peça de roupa com as MESMAS cores e os mesmos blocos de cor,',
  'correntes, joias, tatuagens e suas posições, tipo físico, idade aparente e gênero.',
  'NÃO troque a etnia dos traços: se a referência é brasileira miscigenada, mantenha.',
  'Mesmo estilo de render: semi-realista de videogame AAA, com material de verdade e',
  'iluminação de estúdio. NÃO é fotografia de pessoa real e NÃO é desenho animado.',
  'ENQUADRAMENTO OBRIGATÓRIO: corpo inteiro dos pés à cabeça DENTRO do quadro, com',
  'margem visível acima da cabeça (ou do braço erguido) — nada toca a borda superior.',
  'Se comemorando, o braço sobe SEM sair do quadro. Prefira braço erguido à frente do',
  'corpo a cabeça jogada para trás: o rosto inteiro tem que aparecer, de frente.',
  'Fundo escuro liso e neutro.',
  'REMOVA a arma das mãos: aqui ele não está em combate.',
].join('\n');

const POSES = {
  vitoria: [
    'MUDE APENAS A POSTURA E A EXPRESSÃO: ele está COMEMORANDO uma vitória.',
    'Um braço erguido em punho fechado ou os dois braços abertos, peito estufado, queixo',
    'firme — cabeça erguida mas de frente, nunca jogada para trás —, peso numa perna só.',
    'Sorriso largo e genuíno de quem acabou de ganhar, olhos vivos.',
    'A luz pode ser um pouco mais quente e mais forte, reforçando o momento.',
  ].join('\n'),
  derrota: [
    'MUDE APENAS A POSTURA E A EXPRESSÃO: ele acabou de PERDER.',
    'Ombros caídos, cabeça baixa ou virada para o lado, braços soltos ao longo do corpo',
    'ou uma mão na nuca. Expressão de frustração e cansaço — decepção, não choro nem',
    'raiva teatral. Peso distribuído, corpo murcho.',
    'A luz pode ser mais fria e mais baixa, com sombra pesando no rosto.',
  ].join('\n'),
};

if (!POSES[POSE]) die(`--pose desconhecida: ${POSE} (use vitoria ou derrota)`);

const EXTRA = arg('prompt-extra', '');
const prompt = `${PRESERVA}\n\n${POSES[POSE]}\n\n`
  + 'NÃO acrescente objeto, texto, legenda, moldura nem cenário. Fundo liso.'
  + (EXTRA ? `\n\n${EXTRA}` : '');

const t0 = Date.now();
try {
  const out = execFileSync('node', [
    'tools/gen-image.mjs', '--id', `${ID}-${POSE}`, '--ref', REF,
    '--model', MODEL, '--aspect', ASPECT, '--raw-only', '--prompt', prompt,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const linha = out.trim().split('\n').filter((l) => l.includes('→')).pop() || out.trim().split('\n').pop();
  console.log(`✓ ${ID} ${POSE} · ${((Date.now() - t0) / 1000) | 0}s · ${linha.trim()}`);
} catch (e) {
  console.error(`✗ ${ID} ${POSE}: ${String(e.stderr || e.message).slice(0, 220)}`);
  process.exit(1);
}
