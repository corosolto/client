/* RÉGUA DA TELEMETRIA DE CAMPO — o que o jogo conta ao servidor sobre o desempenho dele.

   O painel de admin diz que 20% das amostras de FPS ficam abaixo de 30, e que há sessões
   inteiras a 4-8 FPS. A pergunta seguinte — "em QUE mapa?" — não tem resposta hoje, e não é por
   falta de coleta: `public/js/ops.js` já amostra FPS por segundo numa janela de 300 s, já
   separa p50 de p5, já conta quadro travado (>100 ms) e congelado (>1 s), e já sabe em que mapa
   a partida está (`estado.partida.mapa`). O que falta é o caminho: o beacon não leva o mapa, e o
   ingestor do backend não lê o bloco `ops`.

   É o mesmo defeito do BUG-55, de outra forma: instrumento que mede uma coisa e responde outra.
   Lá o "FPS p50" do painel media o jank de BOOT; aqui ele mede um segundo de uma sessão inteira
   e não diz onde.

   Esta régua cobra o CONTRATO do lado do cliente. O lado do servidor (persistir o que chega) é
   cobrado por `api/reguas/perf-ops-check.mjs`, no repositório do backend.

   Uso: node tools/eval/perf-campo-check.mjs
        node tools/eval/perf-campo-check.mjs --mutar=sem-mapa   # tira o mapa do beacon
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.resolve(HERE, '../../public/js');
const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

let ops = fs.readFileSync(path.join(JS, 'ops.js'), 'utf8');
const main = fs.readFileSync(path.join(JS, 'main.js'), 'utf8');

/* ÂNCORA. Se o corpo destas duas funções mudar de nome, a régua não pode passar calada —
   passar calada é como uma régua vira carimbo (LIÇÃO 1). */
const trecho = (fonte, marca, arquivo) => {
  const i = fonte.indexOf(marca);
  if (i < 0) { console.log(`  FALHA âncora ausente em ${arquivo}: ${marca}`); falhas++; return ''; }
  return fonte.slice(i, i + 2000);
};

if (MUTAR === 'sem-mapa') {
  ops = ops.replace(/\n\s*mapa: [^\n]*\n/, '\n');
  console.log('\n  [MUTANTE: sem-mapa] — a régua TEM que reprovar');
}

const beacon = trecho(ops, 'function resumoBeacon()', 'ops.js');
const perf = trecho(main, 'function _perfFinish(', 'main.js');

console.log('\n· o beacon de desempenho responde "onde" e "quão ruim"');

// PCAMPO1 · sem o mapa, "20% abaixo de 30 FPS" não vira ação nenhuma
cobra(/\bmapa:/.test(beacon) && /\bmodo:/.test(beacon),
  'PCAMPO1 · o beacon leva o mapa e o modo da partida');

// PCAMPO2 · distribuição, não uma média de um segundo
cobra(/fps50:/.test(beacon) && /fps5:/.test(beacon) && /travadas:/.test(beacon) && /congeladas:/.test(beacon),
  'PCAMPO2 · leva a distribuição de FPS (p50, p5) e os quadros travados/congelados');

/* PCAMPO3 · o DPR que importa é o que o jogo DESENHA, não o que o dispositivo anuncia. O jogo
   renderiza em 0,75 no caminho leve e em min(dpr,2) no alto; mandar `window.devicePixelRatio`
   responde outra pergunta que não a que o painel faz. */
cobra(/dprEfetivo/.test(perf) || /getPixelRatio\(\)/.test(perf),
  'PCAMPO3 · o DPR enviado é o EFETIVO do renderer, não só o do dispositivo');

/* PCAMPO4 · renderer por software é a hipótese mais provável para 4-8 FPS, e o `glcontext.js`
   já sabe disso. Três estados, porque no Firefox a extensão que revela a GPU fica atrás de
   flag: afirmar "não é software" quando não deu para ler é inventar dado. */
cobra(/software/.test(perf) && /(desconhecido|null)/.test(perf),
  'PCAMPO4 · leva o estado do renderer com "desconhecido" possível (não afirma o que não leu)');

// PCAMPO5 · o que se coleta e não se envia é trabalho por quadro jogado fora
const coletado = ['fps50', 'fps5', 'travadas', 'congeladas', 'liveMs', 'readyMs'];
const faltando = coletado.filter((k) => !new RegExp(`\\b${k}\\b`).test(beacon));
cobra(faltando.length === 0,
  `PCAMPO5 · tudo que o ops coleta chega ao beacon${faltando.length ? ` — falta ${faltando.join(', ')}` : ''}`);

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
