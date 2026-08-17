/* ============================================================================
   webgl-guard-check.mjs — O BOOT DESISTE COM ELEGÂNCIA QUANDO NÃO HÁ WEBGL?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
     Fila de crashes de produção que são todos O MESMO caso: o navegador/driver
     recusa o contexto WebGL e não há nada que JavaScript possa criar no lugar.
       #105 "THREE.WebGLRenderer: Error creating WebGL context."
       #115 "THREE.WebGLProgram: Shader Error … VALIDATE_STATUS false"
       #215 "sem_webgl … llvmpipe … BindToCurrentSequence failed"
       #217 "sem_webgl … disabled by enterprise policy or commandline switch"
       #104 "Uncaught Error: sem_webgl"
     Desde o alpha.41 o app JÁ trata isso: `criaRenderer()` devolve `null` na
     falha total (glcontext.js) e o boot ROTEIA esse null para o painel amigável
     `avisaSemWebgl()` e ABORTA com `throw` — nunca toca num renderer nulo. A
     mensagem `sem_webgl` que aparece nesses crashes é o LOG canônico do fallback,
     não um estouro: o telemetria registra a desistência controlada.

   O QUE TRAVA (contrato de roteamento em public/js/main.js)
     GR1  `criaRenderer` e `avisaSemWebgl` são importados de ./glcontext.js
     GR2  o renderer principal nasce de `const renderer = criaRenderer(`
     GR3  existe a guarda `if (!renderer)` e ela chama `avisaSemWebgl(`
     GR4  a guarda ABORTA o boot com `throw` (não cai no uso do renderer nulo)
     GR5  nenhum acesso a membro `renderer.` acontece ANTES da guarda
     GR6  glcontext.js honra o contrato: exporta os dois e o caminho fatal faz
          `window.__semWebgl = true` + `return null` (o `!renderer` é alcançável)

   MUTAÇÕES (quebram a guarda e provam que a régua morde)
     --mutante=sem-guard  remove a guarda inteira            → acende GR3/GR5
     --mutante=sem-aviso  apaga a chamada avisaSemWebgl()    → acende GR3
     --mutante=sem-throw  apaga o throw da guarda            → acende GR4
     --mutante=uso-antes  usa o renderer antes da guarda     → acende GR5
   ============================================================================ */
import { readFileSync } from 'node:fs';

const MUTS = ['sem-guard', 'sem-aviso', 'sem-throw', 'uso-antes'];
const MUT = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !MUTS.includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);

let main = readFileSync('public/js/main.js', 'utf8');
const glcontext = readFileSync('public/js/glcontext.js', 'utf8');

if (MUT === 'sem-guard') main = main.replace(/if \(!renderer\) \{[\s\S]*?\n\}\n/, '');
if (MUT === 'sem-aviso') main = main.replace(/avisaSemWebgl\('WebGL indispon[^']*'\);\n?/, '');
if (MUT === 'sem-throw') main = main.replace(/\s*throw new Error\('sem_webgl'\);/, '');
if (MUT === 'uso-antes') main = main.replace(/(const renderer = criaRenderer\([^\n]*\);\n)/, '$1renderer.setSize(innerWidth, innerHeight);\n');

const failures = [];

/* GR1 — a rota importa a factory e o painel do mesmo módulo dono do contrato. */
if (!/import \{[^}]*\bcriaRenderer\b[^}]*\bavisaSemWebgl\b[^}]*\} from '\.\/glcontext\.js'/.test(main)
  && !/import \{[^}]*\bavisaSemWebgl\b[^}]*\bcriaRenderer\b[^}]*\} from '\.\/glcontext\.js'/.test(main))
  failures.push('GR1 main.js não importa criaRenderer + avisaSemWebgl de ./glcontext.js');

/* GR2 — o renderer principal é o retorno da factory (que pode ser null). */
const criaIdx = main.search(/const renderer = criaRenderer\(/);
if (criaIdx < 0) failures.push('GR2 renderer principal não vem de const renderer = criaRenderer(');

/* GR3 — existe a guarda do null e ela abre o painel amigável. */
const guardMatch = main.match(/if \(!renderer\) \{([\s\S]*?)\n\}/);
const guardIdx = guardMatch ? main.indexOf(guardMatch[0]) : -1;
if (!guardMatch) failures.push('GR3 falta a guarda if (!renderer) para o retorno nulo da factory');
else if (!/avisaSemWebgl\(/.test(guardMatch[1])) failures.push('GR3 a guarda não chama avisaSemWebgl no caminho sem WebGL');

/* GR4 — a guarda ABORTA; sem isso o boot seguiria e desreferenciaria null. */
if (guardMatch && !/\bthrow\b/.test(guardMatch[1]))
  failures.push('GR4 a guarda não aborta o boot com throw (seguiria usando renderer nulo)');

/* GR5 — nenhum uso de membro do renderer antes da guarda passar. */
const usoIdx = main.search(/\brenderer\.[A-Za-z_]/);
if (usoIdx >= 0 && guardIdx >= 0 && usoIdx < guardIdx)
  failures.push('GR5 renderer é usado antes da guarda if (!renderer) resolver');
if (usoIdx >= 0 && guardIdx < 0)
  failures.push('GR5 renderer é usado sem nenhuma guarda anterior');

/* GR6 — o contrato do outro lado: criaRenderer devolve null e sinaliza o modo
   sem WebGL na falha total; avisaSemWebgl existe para a rota chamar. */
if (!/export function avisaSemWebgl\b/.test(glcontext))
  failures.push('GR6 glcontext.js não exporta avisaSemWebgl');
if (!/export function criaRenderer\b/.test(glcontext))
  failures.push('GR6 glcontext.js não exporta criaRenderer');
if (!/window\.__semWebgl = true;[\s\S]*?return null;/.test(glcontext))
  failures.push('GR6 caminho fatal de criaRenderer não faz __semWebgl=true + return null');

if (MUT && !failures.length) failures.push(`mutação ${MUT} não foi detectada`);

const VERM = '\x1b[31m', VERDE = '\x1b[32m', OFF = '\x1b[0m';
for (const failure of failures) console.error(`  ${VERM}✗${OFF} ${failure}`);
if (failures.length) {
  console.error(`${VERM}WEBGL-GUARD ${failures.length} VERMELHA(S)\x1b[0m${MUT ? ` (mutante=${MUT})` : ''}`);
  process.exitCode = 1;
} else console.error(`${VERDE}WEBGL-GUARD verde: null da factory vira painel amigável e aborta, sem tocar renderer nulo\x1b[0m`);
