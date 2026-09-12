/* RÉGUA DA MÁQUINA FRACA — cada motivo de rebaixamento custa o que custa.
   ═══════════════════════════════════════════════════════════════════════════════════
   O painel diz que 20% das amostras de FPS ficam abaixo de 30, e havia a tentação de culpar a
   detecção. Ela FUNCIONA: `glcontext.js` lê `WEBGL_debug_renderer_info`, reconhece
   llvmpipe/SwiftShader e o jogo já cai para o caminho leve. O defeito é outro, e é de
   agrupamento: `degraded` juntava QUATRO fatos com custos muito diferentes —

     compatibility (modo ?safe=1)  ·  tier != 'padrao' (o driver recusou MSAA)
     api != 'webgl2' (WebGL1)      ·  software (desenha pela CPU: 2 a 8 FPS medidos)

   — e `main.js` tratava os quatro igual. Consequência: uma GPU REAL que só disse não ao
   antialias era rebaixada ao mesmo caminho de uma que não tem GPU nenhuma: qualidade forçada
   em BAIXA, sombra desligada, DPR 0,75 e previews estáticos. O jogador perdia sombra e nitidez
   por causa de uma opção de contexto.

   USO
     node tools/eval/maquina-fraca-check.mjs
     node tools/eval/maquina-fraca-check.mjs --mutar=junta-tudo   # volta ao `degraded` único
     node tools/eval/maquina-fraca-check.mjs --mutar=sem-aviso    # tira o aviso honesto
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

let main = fs.readFileSync(path.join(RAIZ, 'public/js/main.js'), 'utf8');
let glc = fs.readFileSync(path.join(RAIZ, 'public/js/glcontext.js'), 'utf8');
if (MUTAR === 'junta-tudo') {
  main = main.replace(/const COMPAT_MODE = [^\n]+/, "const COMPAT_MODE = SAFE_MODE || renderer.__csWebgl?.degraded === true;");
  console.log('\n  [MUTANTE: junta-tudo] — a régua TEM que reprovar');
}
if (MUTAR === 'sem-aviso') {
  main = main.replace(/\nif \(SOFTWARE\) avisaSoftware[^\n]+/, '');
  console.log('\n  [MUTANTE: sem-aviso] — a régua TEM que reprovar');
}

console.log('\n· o motivo do rebaixamento é lido separado, e não em bloco');

/* MF1 · os fatos existem separados na metadata. Sem isto quem consome não TEM como distinguir,
   por mais bem-intencionado que seja. */
cobra(/semWebgl2:/.test(glc) && /semMsaa:/.test(glc) && /compat:/.test(glc) && /software:/.test(glc),
  'MF1 · a metadata do contexto separa software, WebGL1, MSAA e modo compatibilidade');

/* MF2 · e `main.js` decide pelos fatos, não pelo agrupado. Lê o USO: é a diferença entre
   declarar quatro campos e realmente consultá-los (a lição do BUG-02). */
const linhaCompat = (main.match(/const COMPAT_MODE = [^\n]+/) || [''])[0];
cobra(/SOFTWARE/.test(linhaCompat) && /semWebgl2/.test(linhaCompat) && !/\.degraded/.test(linhaCompat),
  `MF2 · o caminho leve nasce dos fatos, não do \`degraded\` agrupado (${linhaCompat.trim().slice(0, 84)}…)`);

/* MF3 · MSAA recusado NÃO entra sozinho no caminho leve. É a cláusula que devolve sombra e
   nitidez a quem tem GPU de verdade — e a que o mutante `junta-tudo` derruba. */
cobra(!/semMsaa/.test(linhaCompat),
  'MF3 · driver que recusou antialias não é motivo para rebaixar a qualidade inteira');

/* MF4 · software começa no degrau MÍNIMO. Medir 8 s para descobrir o que o renderizador já
   disse é gastar os únicos quadros que essa máquina tem. */
const linhaDpr = (main.match(/renderer\.setPixelRatio\([^\n]+/) || [''])[0];
cobra(/SOFTWARE \? 0\.5/.test(linhaDpr),
  `MF4 · com renderizador de software o DPR já nasce no mínimo (${linhaDpr.trim()})`);

/* MF5 · e o jogador é AVISADO — uma vez, dispensável, sem bloquear. Barra, não overlay: a tela
   cheia é para quem não consegue jogar; este consegue, devagar, e merece saber por quê. */
cobra(/if \(SOFTWARE\) avisaSoftware/.test(main) && /export function avisaSoftware/.test(glc),
  'MF5 · renderizador de software gera aviso honesto ao jogador');
/* A fatia é o CORPO da função, e isso já mordeu: a primeira versão cortava em `avisaSoftware`,
   que aparece UMA vez no arquivo — `[2]` era `undefined`, e a cláusula passava sobre o vazio. */
const avisoSrc = glc.split('export function avisaSoftware')[1] || '';
cobra(avisoSrc.length > 200 && /cs_aviso_software/.test(avisoSrc) && /el\.remove\(\)/.test(avisoSrc) && !/inset:0/.test(avisoSrc),
  'MF6 · o aviso é dispensável, lembrado, e não é overlay de tela cheia');
/* MF6b · E NÃO BLOQUEIA O CLIQUE. Escrito depois de o smoke do CI reprovar por causa deste
   aviso: ele cobre a faixa de baixo da tela, onde mora o `#ms-continue`, e o Playwright ficou
   397 tentativas esperando "element is visible, enabled and stable" com a barra na frente.
   "Não bloqueia" é uma promessa sobre o clique, não só sobre a área pintada. */
cobra(/pointer-events:none/.test(avisoSrc) && /pointer-events:auto/.test(avisoSrc)
    && !/left:0;right:0/.test(avisoSrc) && !/justify-content:center/.test(avisoSrc),
  'MF6b · fica no CANTO, não intercepta ponteiro, e só o botão de dispensar aceita clique');

/* MF7 · a telemetria continua com o tri-estado. `software: false` quando ninguém conseguiu ler
   a GPU é AFIRMAR o que não se leu — e o Firefox esconde a extensão atrás de flag. */
cobra(/softwareEstado/.test(glc) && /desconhecido/.test(glc),
  'MF7 · quando não dá para saber, a telemetria diz "desconhecido" em vez de "não"');

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
