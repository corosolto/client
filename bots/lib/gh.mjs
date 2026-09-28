/* gh.mjs — cliente GitHub dos bots: PAT por indireto, dry-run de verdade.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: as três primitivas que todo bot usa (gh, api REST, gq GraphQL)
   empacotadas com as regras da casa:
     - credencial por INDERETO: config.json declara "pat_env" (nome da variável
       de ambiente, ex.: GH_PAT_FALA / GH_PAT_ESCREVE). PAT nunca em código.
       Fallback opcional ao keychain do macOS (config "keychain"), igual ao
       que o canarinho já fazia.
     - GH_DRY_RUN=1: toda chamada MUTANTE (POST/PATCH/PUT/DELETE e os verbos
       `gh` que escrevem) é IMPRESSA e SALVA em estado/dry-run/ em vez de
       enviada. Leituras passam normais — dry-run não é cegueira.
   Duas machine accounts: GH_PAT_FALA (advisory: estraga, caca-bug, vigia-prod,
   zelador, playtester) e GH_PAT_ESCREVE (conserta-codigo, cenografo, cronista
   + releases). */

import { spawnSync } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/* Lido a cada chamada (não no import): o env pode ser ligado pelo runner no
 * meio da vida do processo — avaliar no import faz o teste mentir. */
export const seco = () => !!process.env.GH_DRY_RUN;

const VERBOS_MUTANTES = new Set([
  'comment', 'edit', 'create', 'merge', 'ready', 'close', 'reopen', 'delete',
  'lock', 'unlock', 'pin', 'unpin', 'transfer', 'run', 'rerun', 'enable', 'disable',
]);

function tokenDoKeychain(servico) {
  try {
    return execFileSync('security', ['find-generic-password', '-s', servico, '-a', 'token', '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

/* bots/.env (gitignored, chmod 600): única fonte quando env e keychain falham
 * — o caso do launchd, onde o security pode negar sem UI. Parser mínimo. */
const _aqui = dirname(fileURLToPath(import.meta.url));
function tokenDoDotEnv(nomeVar, dirBots = join(_aqui, '..')) {
  try {
    const linha = readFileSync(join(dirBots, '.env'), 'utf8')
      .split('\n').find((l) => l.startsWith(`${nomeVar}=`));
    return linha ? linha.slice(nomeVar.length + 1).trim() || null : null;
  } catch { return null; }
}

export function criarCliente({ patEnv, keychain = null, estadoDir, repo }) {
  function token() {
    if (patEnv && process.env[patEnv]) return process.env[patEnv];
    if (patEnv) { const t = tokenDoDotEnv(patEnv); if (t) return t; }
    if (keychain) { const t = tokenDoKeychain(keychain); if (t) return t; }
    return null;
  }
  /* env pro spawn: GH_TOKEN SÓ quando existe de verdade. O bug real da
   * primeira rodada: GH_TOKEN:"null" fazia o gh cair no keyring logado do
   * dono e o bot postava com a identidade errada. Sem token, mutante
   * recusa NA CARA — postar como outra conta é pior que não postar. */
  function envGh() {
    const t = token();
    if (t) return { ...process.env, GH_TOKEN: t };
    if (process.env.GH_TOKEN) return process.env;
    return { ...process.env, SEM_TOKEN: '1' };
  }
  function exigirToken(acao) {
    if (!token()) {
      throw new Error(`sem credencial (${patEnv || 'sem pat_env'}): ${acao} RECUSADO — nada é postado com identidade emprestada. Coloque o token em bots/.env ou no keychain.`);
    }
  }

  function salvarDryRun(acao) {
    const dir = join(estadoDir, 'dry-run');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const slug = String(acao.label || acao.path || 'gh')
      .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'gh';
    const arq = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${slug}.json`);
    writeFileSync(arq, JSON.stringify({ quando: new Date().toISOString(), repo, ...acao }, null, 2));
    console.log(`[dry-run] ${acao.tipo} ${acao.label || acao.path} → ${arq}`);
    return arq;
  }

  function gh(args, { json = false } = {}) {
    const mutante = ehMutante(args);
    if (mutante && seco()) {
      salvarDryRun({ tipo: 'gh', label: args.join(' '), args });
      if (json) return { dry_run: true };
      return '';
    }
    if (mutante) exigirToken(`gh ${args.join(' ')}`);
    const out = spawnSync('gh', args, {
      encoding: 'utf8', env: envGh(),
      maxBuffer: 64 * 1024 * 1024,
    });
    if (out.status !== 0) throw new Error(`gh ${args.join(' ')}: ${(out.stderr || '').slice(0, 300)}`);
    return json ? JSON.parse(out.stdout) : out.stdout;
  }

  function ehMutante(args) {
    if (args[0] === 'api') {
      const xi = args.indexOf('-X');
      const metodo = xi >= 0 ? args[xi + 1].toUpperCase() : 'GET';
      return metodo !== 'GET';
    }
    return args.length >= 2 && VERBOS_MUTANTES.has(args[1]);
  }

  /* POST com corpo JSON de verdade: `gh api -f input=…` manda um CAMPO chamado
   * "input" (a API ignora e a review nasce PENDING invisível — bug real medido
   * na 1ª rodada do canarinho). O corpo vai no stdin via --input. */
  function api(path, method = 'GET', body) {
    if (body && seco()) {
      salvarDryRun({ tipo: 'api', label: path, method, path, body });
      return { dry_run: true, html_url: '(dry-run — nada foi enviado)' };
    }
    if (!body) return gh(['api', '-X', method, path], { json: true });
    exigirToken(`api ${method} ${path}`);
    const out = spawnSync('gh', ['api', '-X', method, path, '--input', '-'], {
      input: JSON.stringify(body), encoding: 'utf8', env: envGh(),
      maxBuffer: 64 * 1024 * 1024,
    });
    if (out.status !== 0) throw new Error(`gh api ${method} ${path}: ${(out.stderr || '').slice(0, 300)}`);
    return JSON.parse(out.stdout);
  }

  function gq(query, vars) {
    return gh(['api', 'graphql', '-f', `query=${query}`,
      ...Object.entries(vars).flatMap(([k, v]) => ['-F', `${k}=${v}`])], { json: true });
  }

  return { token, gh, api, gq, dry: seco, repo };
}
