#!/usr/bin/env node
/* ============================================================================
   runner.mjs — UM TURNO DE UMA LANE, E O LAÇO QUE O REPETE.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O `00-PROMPT-ORQUESTRADOR.md` descrevia a operação certa e pressupunha um
   humano acordado colando prompt em 28 lanes. Este arquivo é o que faltava para
   aquela descrição virar máquina: monta o prompt do turno a partir do estado
   REAL (fila + ledger + git), roda o agente headless dentro da worktree certa, e
   fecha o turno no ledger — dê certo ou não.

   OS DOIS MODELOS, UM RUNNER SÓ
   O ZCode publica o GLM-5.3 num endpoint compatível com a API da Anthropic
   (`~/.zcode/cli/config.json` → provider.zai.kind = "anthropic"). Então o mesmo
   binário `claude` roda os dois: Opus 5 pela autenticação normal, GLM-5.3
   apontando ANTHROPIC_BASE_URL para a z.ai. O modelo é um parâmetro do turno.

   SOBRE A PERMISSÃO LIBERADA
   O turno roda com --dangerously-skip-permissions. Sem isso ele trava no
   primeiro pedido de permissão às 3 h da manhã e a frota para calada. A escolha
   foi do dono, e ela só é defensável porque o freio NÃO é o prompt:

     · `tools/frota/shim/` entra na frente no PATH e o git/gh de lá RECUSAM push
       na main, --force puro, --no-verify, gh pr merge/close e a label
       safe-automerge (que é o botão de merge do bot). Saída 97.
     · os hooks da casa continuam valendo — o shim recusa justamente quem
       tentaria pulá-los.
     · o turno tem teto de tempo; passou disso, morre e vira registro no ledger.

   Prompt convence. Shim impede. `selftest.mjs` prova que impede.

   USO
     node tools/frota/runner.mjs --pr=561                um turno, modelo automático
     node tools/frota/runner.mjs --pr=561 --modelo=glm
     node tools/frota/runner.mjs --pr=561 --laco         repete até sair da fila
     node tools/frota/runner.mjs --pr=561 --ensaio       monta o prompt e NÃO executa
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { montarFila } from './fila.mjs';
import { briefing } from './tarefas.mjs';
import { escrever, contextoParaPrompt } from './ledger.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const LOGS = path.join(os.homedir(), '.csbrasil-frota', 'logs');
const CLAUDE_BIN = path.join(os.homedir(), '.claude', 'local', 'claude');

const TETO_TURNO_MIN = 45;
const PAUSA_ENTRE_TURNOS_S = 30;
const TETO_TURNOS_SEGUIDOS = 12;

/** Classes que a frota trabalha. PRONTO e PARADO só viram registro. */
const TRABALHAVEIS = new Set(['CONFLITO', 'VERMELHO', 'RASCUNHO']);

/* Afinidade que a casa já tinha decidido, não preferência: Claude julga figura e
   direção visual; GLM fecha portão, conflito e integração determinística. */
const VISUAL = /viewmodel|mapa|maps|mansao|amazonia|escadao|piscina|carandiru|personagem|miticos|visual|grafite|textura|hud/i;

export function modeloPara(item) {
  if (item.classe === 'CONFLITO') return 'glm';
  return VISUAL.test(item.titulo) || VISUAL.test(item.branch) ? 'claude' : 'glm';
}

function envPara(modelo) {
  const env = { ...process.env };
  env.PATH = `${path.join(AQUI, 'shim')}:${env.PATH}`;
  env.FROTA = '1';
  env.AGENTE = modelo === 'glm' ? 'GLM-5.3 (frota)' : 'Claude Code (Opus 5, frota)';

  if (modelo === 'glm') {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(os.homedir(), '.zcode', 'cli', 'config.json'), 'utf8'),
    );
    const zai = cfg.provider.zai;
    env.ANTHROPIC_BASE_URL = zai.options.baseURL;
    env.ANTHROPIC_AUTH_TOKEN = zai.options.apiKey;
    env.ANTHROPIC_MODEL = 'GLM-5.3';
    env.ANTHROPIC_SMALL_FAST_MODEL = 'GLM-5.3';
    env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = String(zai.models['GLM-5.3'].limit.context);
    delete env.ANTHROPIC_API_KEY;
  }
  return env;
}

export function montarPrompt(item, lane, worktree) {
  const travas = fs.readFileSync(path.join(AQUI, 'GUARDRAILS.md'), 'utf8');
  return [
    '===== TRAVAS DA FROTA (contrato deste turno) =====',
    travas.trim(),
    '',
    '===== MEMÓRIA DOS TURNOS ANTERIORES =====',
    contextoParaPrompt(lane),
    '',
    '===== SEU TURNO =====',
    briefing(item, lane, worktree),
  ].join('\n');
}

async function rodarTurno(item, { modelo, ensaio }) {
  const lane = `pr-${item.numero}`;

  if (!item.worktree) {
    escrever(lane, 'BLOQUEADO', `sem worktree local — crie antes de despachar o PR #${item.numero}`);
    return { seguir: false, motivo: 'sem-worktree' };
  }
  if (!TRABALHAVEIS.has(item.classe)) {
    escrever(
      lane,
      item.classe === 'PRONTO' ? 'AGUARDANDO DONO' : 'BLOQUEADO',
      `classe ${item.classe} — nada a despachar`,
    );
    return { seguir: false, motivo: 'nao-trabalhavel' };
  }

  const escolhido = modelo ?? modeloPara(item);
  const prompt = montarPrompt(item, lane, item.worktree);

  if (ensaio) {
    console.log(prompt);
    console.log(`\n----- ensaio: rodaria ${escolhido} em ${item.worktree} -----`);
    return { seguir: false, motivo: 'ensaio' };
  }

  fs.mkdirSync(LOGS, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const log = path.join(LOGS, `${lane}-${carimbo}-${escolhido}.log`);

  escrever(lane, 'TURNO ABERTO', `${escolhido} · ${item.classe} · ${path.basename(log)}`, {
    modelo: escolhido,
    classe: item.classe,
  });

  const args = ['-p', prompt, '--dangerously-skip-permissions', '--add-dir', item.worktree];
  if (escolhido === 'glm') args.push('--model', 'GLM-5.3');

  const fluxo = fs.createWriteStream(log);
  const t0 = Date.now();
  let estourou = false;

  const codigo = await new Promise((resolve) => {
    const p = spawn(CLAUDE_BIN, args, { cwd: item.worktree, env: envPara(escolhido) });
    const teto = setTimeout(() => {
      estourou = true;
      p.kill('SIGTERM');
    }, TETO_TURNO_MIN * 60000);
    p.stdout.pipe(fluxo, { end: false });
    p.stderr.pipe(fluxo, { end: false });
    p.stdout.on('data', (d) => process.stdout.write(d));
    p.on('error', (e) => {
      fluxo.write(`\nfrota: falhou ao lançar o agente — ${e.message}\n`);
      resolve(-1);
    });
    p.on('close', (c) => {
      clearTimeout(teto);
      fluxo.end();
      resolve(c);
    });
  });

  const min = ((Date.now() - t0) / 60000).toFixed(1);
  escrever(
    lane,
    'TURNO FECHADO',
    `${estourou ? `ESTOUROU o teto de ${TETO_TURNO_MIN} min` : `saída ${codigo}`} em ${min} min · ${path.basename(log)}`,
    { codigo, minutos: Number(min), estourou },
  );
  return { seguir: true, codigo, log };
}

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const numero = Number(arg('pr', 0));

if (!numero) {
  console.error('uso: runner.mjs --pr=<numero> [--modelo=claude|glm] [--laco] [--ensaio]');
  process.exit(2);
}

const opcoes = { modelo: arg('modelo'), ensaio: process.argv.includes('--ensaio') };
const laco = process.argv.includes('--laco');
let voltas = 0;

while (true) {
  const item = (await montarFila()).find((i) => i.numero === numero);
  if (!item) {
    console.log(`frota: PR #${numero} saiu da fila (mesclado ou fechado). Encerrando.`);
    escrever(`pr-${numero}`, 'TURNO FECHADO', 'saiu da fila — mesclado ou fechado');
    break;
  }

  console.log(`\nfrota: #${item.numero} · ${item.classe} · ${item.titulo.slice(0, 58)}`);
  const r = await rodarTurno(item, opcoes);

  if (!laco || !r.seguir) break;
  if (++voltas >= TETO_TURNOS_SEGUIDOS) {
    escrever(`pr-${numero}`, 'BLOQUEADO', `${voltas} turnos seguidos sem sair da classe ${item.classe} — parando para o dono olhar`);
    console.log(`frota: ${voltas} turnos sem progresso de classe. Parando.`);
    break;
  }
  await new Promise((s) => setTimeout(s, PAUSA_ENTRE_TURNOS_S * 1000));
}
