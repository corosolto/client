/* ============================================================================
   runner.mjs — RODA TODOS OS PASSOS, NÃO PARA NO PRIMEIRO ERRO. (T4 do DevEx)
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   `check:fast` era uma cadeia de **14 `&&`**. Numa cadeia, o passo que falha
   esconde os treze seguintes: você conserta um, roda de novo (5 min), descobre o
   próximo, conserta, roda de novo. O custo não é o tempo de um erro — é o tempo de
   um erro multiplicado por quantos erros existirem.

   O sintoma já estava no próprio `package.json`: `anims:check` e `feet:check`
   tinham sido EMPURRADOS PARA O FIM da cadeia porque instabilidade neles escondia
   tudo que vinha depois. Isso é remendo — trata o sintoma da cadeia mantendo a
   cadeia.

   Aqui todo passo roda. No fim sai um placar com tempo por passo, e o código de
   saída é ≠ 0 se qualquer um falhar. Quem está consertando vê a lista inteira de
   uma vez e decide a ordem.

   ── DUAS DECISÕES QUE PARECEM DETALHE ───────────────────────────────────────
   1. A saída do passo que FALHOU é impressa; a do que passou, não. Portão que
      cospe 400 linhas de sucesso treina todo mundo a não ler nenhuma.
   2. O placar mostra o TEMPO de cada passo. É assim que se descobre qual passo
      não vale o que custa — e o `check:fast` tem 14 candidatos.

   Uso:
     node tools/eval/runner.mjs syntax arch:check docs:check
     node tools/eval/runner.mjs --suite=fast
     node tools/eval/runner.mjs --suite=core --jobs=2
     node tools/eval/runner.mjs --suite=core --json-out=/tmp/core.json
     node tools/eval/runner.mjs --npm syntax audio:check      (padrão: são scripts npm)
   ============================================================================ */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { SUITES, passosDaSuite } from './suites.mjs';
import { SAIDA_SKIP, causaNaoMedivel } from './sonda-filho.mjs';

const passos = [];
const suites = [];
let jobs = 1;
let jsonOut = 'tools/eval/out/runner-latest.json';
try {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--suite=')) {
      const nome = arg.slice('--suite='.length);
      passos.push(...passosDaSuite(nome));
      suites.push(nome);
    } else if (arg === '--suite') throw new Error('use --suite=<nome>');
    else if (arg.startsWith('--jobs=')) {
      const valor = arg.slice('--jobs='.length);
      if (valor !== '1' && valor !== '2') throw new Error('--jobs deve ser 1 ou 2');
      jobs = Number(valor);
    } else if (arg === '--jobs') throw new Error('use --jobs=1 ou --jobs=2');
    else if (arg.startsWith('--json-out=')) {
      jsonOut = arg.slice('--json-out='.length);
      if (!jsonOut) throw new Error('--json-out exige um caminho');
    } else if (arg === '--json-out') throw new Error('use --json-out=<caminho>');
    else if (!arg.startsWith('--')) passos.push(arg);
  }
  if (jobs === 2) {
    const core = new Set(SUITES.core);
    const foraDoCore = [...new Set(passos.filter((p) => !core.has(p)))];
    if (foraDoCore.length) {
      throw new Error(`--jobs=2 aceita somente passos da suite core; fora de core: ${foraDoCore.join(', ')}`);
    }
  }
} catch (erro) {
  console.error(`runner: ${erro.message}`);
  process.exit(2);
}
if (!passos.length) {
  console.error('uso: node tools/eval/runner.mjs [--suite=<nome>] [--jobs=1|2] [--json-out=<caminho>] [<script npm> …]');
  process.exit(2);
}

const VERM = '\x1b[31m', VERDE = '\x1b[32m', AMAR = '\x1b[33m', CINZA = '\x1b[90m', OFF = '\x1b[0m';
const inicioMs = Date.now();
const resultados = new Array(passos.length);

function classificar(p, r, s) {
  const saida = ((r.stdout || '') + (r.stderr || '')).trim();
  /* 78 = EX_CONFIG: nada foi medido — nem verde, nem vermelho (o conteúdo
     não foi julgado). Terceira cor, contagem própria. A causa decide ANTES
     do status (docs/docs/sonda-processos.md): o npm pode tratar SIGTERM e
     sair 0 com ENOBUFS e saída parcial — status 0 aí não é veredito. */
  const causa = causaNaoMedivel(r);
  const pulou = !!causa || r.status === SAIDA_SKIP;
  const ok = !pulou && r.status === 0;
  return {
    p, ok, pulou, s, causa: pulou ? causa : null, saida: ok ? '' : saida,
    status: pulou ? 'PULOU' : ok ? 'ok' : 'FALHOU',
    exit: r.status ?? null,
  };
}

function imprimir(r) {
  console.log(r.pulou ? `${AMAR}PULOU${OFF} ${CINZA}${r.s.toFixed(1)}s${OFF}`
    : r.ok ? `${VERDE}ok${OFF} ${CINZA}${r.s.toFixed(1)}s${OFF}`
      : `${VERM}FALHOU${OFF} ${CINZA}${r.s.toFixed(1)}s${OFF}`);
}

function spawnAssincrono(p) {
  return new Promise((resolve) => {
    const filho = spawn('npm', ['run', '--silent', p], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', resolvido = false;
    filho.stdout.setEncoding('utf8');
    filho.stderr.setEncoding('utf8');
    filho.stdout.on('data', (parte) => { stdout += parte; });
    filho.stderr.on('data', (parte) => { stderr += parte; });
    const concluir = (r) => {
      if (resolvido) return;
      resolvido = true;
      resolve({ stdout, stderr, ...r });
    };
    filho.on('error', (error) => concluir({ error, status: null, signal: null }));
    filho.on('close', (status, signal) => concluir({ status, signal }));
  });
}

async function executarParalelo() {
  const brutos = new Array(passos.length);
  let proximoPasso = 0;
  let proximoPlacar = 0;
  const imprimirProntos = () => {
    /* Um passo que termina depois nunca ultrapassa seu antecessor no placar. */
    while (proximoPlacar < brutos.length && brutos[proximoPlacar]) {
      const bruto = brutos[proximoPlacar];
      const r = classificar(bruto.p, bruto.r, bruto.s);
      resultados[proximoPlacar] = r;
      process.stdout.write(`  ${r.p} … `);
      imprimir(r);
      proximoPlacar += 1;
    }
  };
  const trabalhador = async () => {
    while (proximoPasso < passos.length) {
      const indice = proximoPasso++;
      const p = passos[indice];
      const t = Date.now();
      const r = await spawnAssincrono(p);
      brutos[indice] = { p, r, s: (Date.now() - t) / 1000 };
      imprimirProntos();
    }
  };
  await Promise.all([trabalhador(), trabalhador()]);
}

if (jobs === 2) {
  await executarParalelo();
} else {
  for (const [indice, p] of passos.entries()) {
    process.stdout.write(`  ${p} … `);
    const t = Date.now();
    const r = spawnSync('npm', ['run', '--silent', p], { encoding: 'utf8' });
    const resultado = classificar(p, r, (Date.now() - t) / 1000);
    resultados[indice] = resultado;
    imprimir(resultado);
  }
}

const pulados = resultados.filter((r) => r.pulou);
const ruins = resultados.filter((r) => !r.ok && !r.pulou);

/* A saída de quem falhou vem DEPOIS do placar, junta, pra não se perder no meio
   dos passos que ainda estavam rodando. */
for (const r of [...ruins, ...pulados]) {
  const cor = r.pulou ? AMAR : VERM;
  console.log(`\n${cor}── ${r.p} ${'─'.repeat(Math.max(0, 60 - r.p.length))}${OFF}`);
  if (r.pulou && r.causa) console.log(`${AMAR}não medido:${OFF} ${r.causa}`);
  console.log(r.saida.split('\n').slice(-25).join('\n'));
}

const exitFinal = ruins.length ? 1 : pulados.length ? SAIDA_SKIP : 0;
const fimMs = Date.now();
const relatorio = {
  suites,
  passos,
  inicio: new Date(inicioMs).toISOString(),
  fim: new Date(fimMs).toISOString(),
  duracaoTotal: (fimMs - inicioMs) / 1000,
  resultados: resultados.map((r) => ({
    passo: r.p,
    status: r.status,
    duracao: r.s,
    exit: r.exit,
    causa: r.causa,
  })),
  exitFinal,
};
try {
  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(relatorio, null, 2)}\n`);
} catch (erro) {
  console.error(`runner: não foi possível gravar ${jsonOut}: ${erro.message}`);
  process.exit(1);
}
console.log(`\n  ${resultados.length - ruins.length - pulados.length}/${resultados.length} passaram `
  + `${CINZA}(${relatorio.duracaoTotal.toFixed(1)}s no total)${OFF}`);
if (pulados.length) {
  console.log(`  ${AMAR}não medido:${OFF} ${pulados.map((r) => r.p).join(', ')}`);
}
if (ruins.length) {
  console.log(`  ${VERM}falhou:${OFF} ${ruins.map((r) => r.p).join(', ')}`);
}
/* Pulado não vira verde: um portão que não mediu nada não aprovou nada. Sai com
   o próprio 78 quando ninguém reprovou, pra diferenciar de reprovação real. */
if (exitFinal) process.exit(exitFinal);
console.log('');
