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
     node tools/eval/runner.mjs --npm syntax audio:check      (padrão: são scripts npm)
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { SAIDA_SKIP, causaNaoMedivel } from './sonda-filho.mjs';

const passos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!passos.length) {
  console.error('uso: node tools/eval/runner.mjs <script npm> [<script npm> …]');
  process.exit(2);
}

const VERM = '\x1b[31m', VERDE = '\x1b[32m', AMAR = '\x1b[33m', CINZA = '\x1b[90m', OFF = '\x1b[0m';
const resultados = [];

for (const p of passos) {
  process.stdout.write(`  ${p} … `);
  const t = Date.now();
  const r = spawnSync('npm', ['run', '--silent', p], { encoding: 'utf8' });
  const s = (Date.now() - t) / 1000;
  const saida = ((r.stdout || '') + (r.stderr || '')).trim();
  /* 78 = EX_CONFIG: nada foi medido — nem verde, nem vermelho (o conteúdo
     não foi julgado). Terceira cor, contagem própria. A causa decide ANTES
     do status (docs/docs/sonda-processos.md): o npm pode tratar SIGTERM e
     sair 0 com ENOBUFS e saída parcial — status 0 aí não é veredito. */
  const causa = causaNaoMedivel(r);
  const pulou = !!causa || r.status === SAIDA_SKIP;
  const ok = !pulou && r.status === 0;
  console.log(pulou ? `${AMAR}PULOU${OFF} ${CINZA}${s.toFixed(1)}s${OFF}`
    : ok ? `${VERDE}ok${OFF} ${CINZA}${s.toFixed(1)}s${OFF}`
      : `${VERM}FALHOU${OFF} ${CINZA}${s.toFixed(1)}s${OFF}`);
  resultados.push({ p, ok, pulou, s, causa: pulou ? causa : null, saida: ok ? '' : saida });
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

const total = resultados.reduce((a, r) => a + r.s, 0);
console.log(`\n  ${resultados.length - ruins.length - pulados.length}/${resultados.length} passaram `
  + `${CINZA}(${total.toFixed(1)}s no total)${OFF}`);
if (pulados.length) {
  console.log(`  ${AMAR}não medido:${OFF} ${pulados.map((r) => r.p).join(', ')}`);
}
if (ruins.length) {
  console.log(`  ${VERM}falhou:${OFF} ${ruins.map((r) => r.p).join(', ')}`);
}
/* Pulado não vira verde: um portão que não mediu nada não aprovou nada. Sai com
   o próprio 78 quando ninguém reprovou, pra diferenciar de reprovação real. */
if (ruins.length) process.exit(1);
if (pulados.length) process.exit(SAIDA_SKIP);
console.log('');
