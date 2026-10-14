/* ============================================================================
   ocioso-teto-check.mjs: O PRELOAD OCIOSO DAS ARMAS TEM TETO
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   As armas que a partida não sorteou chegam "em ocioso": main.js (resto do arsenal,
   drop do chão) e game.js (malha do viewmodel que faltou) usam requestIdleCallback.
   Sem `timeout`, o rIC só dispara quando o navegador acha folga entre frames. Em
   máquina lenta, com todo frame renderizando no limite, essa folga não vem nunca:
   o resto das armas não carrega e o pickup vira a caixa procedural (ARM5).
   O teto de 5 s mantém a preferência por ocioso e garante que o preload acontece.

   O QUE ELA MEDE
   Extrai a definição de `ocioso` dos dois pontos de produção e roda cada uma contra
   um rIC falso de main thread saturada: ele só chama de volta pelo caminho do timeout.
   OCI1: cada ponto ainda é encontrado na fonte.
   OCI2: o callback roda mesmo sem folga de idle (o rIC recebeu `timeout`).
   OCI3: o teto é finito e no máximo 10 s (não vira "nunca" disfarçado).
   OCI4: sem rIC (Safari antigo), o fallback por setTimeout continua.

   Mutante: --mutante=sem-teto devolve o rIC puro nos dois pontos; OCI2 tem de acender.

   Uso: node tools/eval/ocioso-teto-check.mjs [--mutante=sem-teto]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ler = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

/* Recorta o texto da declaração `const ocioso = ...;` que vem antes de `ocioso(`. */
function recorta(src, ancora) {
  const i = src.indexOf(ancora);
  if (i < 0) return null;
  const ini = src.indexOf('const ocioso =', i);
  const fim = src.indexOf('ocioso(', ini);
  if (ini < 0 || fim < 0 || fim - ini > 600) return null;
  let decl = src.slice(ini, fim).trim();
  if (MUT === 'sem-teto') {
    decl = decl.includes('window.requestIdleCallback')
      ? 'const ocioso = window.requestIdleCallback || ((f) => setTimeout(f, 1200));'
      : "const ocioso = (typeof requestIdleCallback === 'function') ? requestIdleCallback : ((f) => setTimeout(f, 1200));";
  }
  return decl;
}

const pontos = [
  ['main.js (resto do arsenal)', recorta(ler('public/js/main.js'), 'Resto das armas em ocioso')],
  ['game.js (malha do viewmodel)', recorta(ler('public/js/game.js'), 'EM OCIOSO, nunca no construtor')],
];
if (MUT) console.log(`\n  [MUTANTE: ${MUT}] a régua TEM que reprovar`);

for (const [nome, decl] of pontos) {
  console.log(`\n· ${nome}`);
  cobra(!!decl, `OCI1 · declaração de ocioso encontrada`);
  if (!decl) continue;

  /* rIC de main thread saturada: nunca há folga; só o timeout chama de volta. */
  const timeouts = [];
  let rodou = false;
  const ric = (f, opts) => {
    const t = opts && Number(opts.timeout);
    if (Number.isFinite(t) && t > 0) { timeouts.push(t); f({ didTimeout: true, timeRemaining: () => 0 }); }
  };
  const semTimer = () => { throw new Error('com rIC disponível, o fallback por setTimeout não deve ser usado'); };
  const monta = new Function('window', 'requestIdleCallback', 'setTimeout', `${decl}\nreturn ocioso;`);
  try {
    monta({ requestIdleCallback: ric }, ric, semTimer)(() => { rodou = true; });
  } catch (e) { console.log(`  erro: ${e.message}`); }
  cobra(rodou, `OCI2 · callback roda sem folga de idle (main thread saturada)`);
  cobra(timeouts.length === 1 && timeouts[0] <= 10000, `OCI3 · teto finito e <= 10 s (${timeouts.join(',') || 'nenhum'} ms)`);

  let viaTimer = 0;
  const timer = (f, ms) => { viaTimer = ms; f(); };
  let rodouSemRic = false;
  try {
    monta({}, undefined, timer)(() => { rodouSemRic = true; });
  } catch (e) { console.log(`  erro: ${e.message}`); }
  cobra(rodouSemRic && viaTimer > 0, `OCI4 · sem rIC cai no setTimeout (${viaTimer} ms)`);
}

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'}: ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
