#!/usr/bin/env node
/* rodar-24-7.mjs — supervisor de terminal, SEQUENCIAL, pros 9 bots da casa.
   ─────────────────────────────────────────────────────────────────────────────
   Por que sequencial: 4 bots (estraga-codigo, podador, caça-bug, zelador,
   cronista, playtester, cenografo — os que usam LLM) podem bater no MESMO
   qwen3.6:27b local (~17 GB carregado). Duas chamadas concorrentes ao Ollama
   competem por RAM e degradam latência/qualidade (ver OLLAMA-ROUTING-POLICY.md).
   Este supervisor roda UM bot de cada vez, nunca dois em paralelo, e fica
   vivo no terminal em vez de depender do agendamento do launchd.

   Isto SUBSTITUI a cadência do launchd (StartInterval/StartCalendarInterval)
   por um loop de terminal com os MESMOS intervalos por padrão — só muda ONDE
   roda (terminal em vez de background do sistema) e a garantia de nunca
   sobrepor. Pra rodar mais/menos vezes por dia, edite `intervaloMs` abaixo.

   USO:
     node rodar-24-7.mjs                 roda todos os 9, para sempre
     node rodar-24-7.mjs vigia estraga    só os bots listados, para sempre
     node rodar-24-7.mjs --uma-vez        uma passada em cada bot e sai (debug)

   Ctrl+C para parar. Cada bot escreve seu próprio log em estado/ como sempre;
   este script só decide QUANDO chamar `bun`/`node <script> <comando>`. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const ESTADO_DIR = join(RAIZ, 'estado-supervisor');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR, { recursive: true });
const arqUltima = join(ESTADO_DIR, 'ultima-execucao.json');
const log = (...a) => console.log(`[${new Date().toLocaleString('pt-BR')}]`, ...a);

/* Cada bot: runtime igual ao que o launchd já usava, comando igual ao que
   o cron chamava, e o MESMO intervalo que o plist tinha (30 min pro vigia,
   diário/semanal pros demais). Ajuste aqui pra rodar mais vezes por dia —
   isto NÃO edita os plists do launchd; recomendo desativar os plists
   equivalentes (launchctl unload) pra não duplicar execução. */
const BOTS = [
  { nome: 'vigia', dir: 'vigia-prod', bin: 'bun', script: 'plantao.mjs', args: ['plantao'], intervaloMs: 30 * 60_000 },
  { nome: 'estraga-codigo', dir: 'estraga-codigo', bin: 'node', script: 'canarinho.mjs', args: ['poll'], intervaloMs: 15 * 60_000 },
  { nome: 'caca-bug', dir: 'caca-bug', bin: 'bun', script: 'fiscal.mjs', args: ['rodada'], intervaloMs: 24 * 60 * 60_000 },
  { nome: 'podador', dir: 'podador', bin: 'bun', script: 'poda.mjs', args: ['rodada', '--deep'], intervaloMs: 7 * 24 * 60 * 60_000 },
  { nome: 'playtester', dir: 'playtester', bin: 'bun', script: 'rodada.mjs', args: ['rodada'], intervaloMs: 24 * 60 * 60_000 },
  { nome: 'zelador-diaria', dir: 'zelador', bin: 'bun', script: 'ronda.mjs', args: ['diaria'], intervaloMs: 24 * 60 * 60_000 },
  { nome: 'zelador-semanal', dir: 'zelador', bin: 'bun', script: 'ronda.mjs', args: ['semanal'], intervaloMs: 7 * 24 * 60 * 60_000 },
  { nome: 'cronista-rodada', dir: 'cronista', bin: 'bun', script: 'cronica.mjs', args: ['rodada'], intervaloMs: 12 * 60 * 60_000 },
  { nome: 'cronista-digest', dir: 'cronista', bin: 'bun', script: 'cronica.mjs', args: ['digest'], intervaloMs: 7 * 24 * 60 * 60_000 },
  { nome: 'cenografo', dir: 'cenografo', bin: 'node', script: 'pichacao.mjs', args: ['rodada'], intervaloMs: 24 * 60 * 60_000 },
];

/* nota sobre estraga-codigo 'poll': o canarinho.mjs original roda como
   processo persistente sem StartInterval (o launchd só garante que ele
   reinicia se cair). 'poll' verifica PRs novos pra revisar; os outros
   comandos (`review <n>`, `fix <n>`, `varre <n>`) são pontuais, não fazem
   sentido num loop 24/7 sem saber qual PR. */

function carregarUltima() {
  return existsSync(arqUltima) ? JSON.parse(readFileSync(arqUltima, 'utf8')) : {};
}
function salvarUltima(mapa) {
  writeFileSync(arqUltima, JSON.stringify(mapa, null, 2));
}

function rodarUm(bot) {
  const dirBot = join(RAIZ, bot.dir);
  log(`▶ ${bot.nome}: ${bot.bin} ${bot.script} ${bot.args.join(' ')}`);
  const inicio = Date.now();
  const r = spawnSync(bot.bin, [bot.script, ...bot.args], { cwd: dirBot, stdio: 'inherit' });
  const duracaoS = ((Date.now() - inicio) / 1000).toFixed(1);
  if (r.status !== 0) log(`✗ ${bot.nome} saiu com código ${r.status} (${duracaoS}s) — segue pro próximo bot`);
  else log(`✓ ${bot.nome} terminou em ${duracaoS}s`);
}

async function main() {
  const argv = process.argv.slice(2);
  const umaVez = argv.includes('--uma-vez');
  const filtro = argv.filter((a) => !a.startsWith('--'));
  const bots = filtro.length ? BOTS.filter((b) => filtro.some((f) => b.nome.includes(f))) : BOTS;
  if (!bots.length) { console.error(`nenhum bot casa com: ${filtro.join(', ')}`); process.exit(2); }

  log(`supervisor iniciado — ${bots.length} bot(s), sequencial, nunca em paralelo`);
  const ultima = carregarUltima();

  do {
    for (const bot of bots) {
      const desde = Date.now() - (ultima[bot.nome] || 0);
      if (!umaVez && desde < bot.intervaloMs) {
        const faltaMin = Math.ceil((bot.intervaloMs - desde) / 60_000);
        log(`… ${bot.nome}: ainda não é hora (faltam ~${faltaMin} min)`);
        continue;
      }
      rodarUm(bot);
      ultima[bot.nome] = Date.now();
      salvarUltima(ultima);
    }
    if (umaVez) break;
    log('passada completa — dormindo 60s antes de checar de novo');
    await new Promise((r) => setTimeout(r, 60_000));
  } while (true);
}

process.on('SIGINT', () => { log('interrompido (Ctrl+C) — nenhum bot fica órfão, cada um já terminou sua execução'); process.exit(0); });

main();
