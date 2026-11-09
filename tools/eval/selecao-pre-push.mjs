#!/usr/bin/env node
/* Seleção SOMENTE do pre-push local. O CI continua executando seus portões
 * completos. Qualquer dúvida de classificação escolhe check:deploy inteiro. */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { SUITES, unirSuites, passosEspecificosMapa } from './suites.mjs';

const ORDEM = ['core', 'maps', 'ui', 'audio', 'browser', 'network', 'vm'];
const ZERO = '0000000000000000000000000000000000000000';

const REGRAS = [
  ['core', /^(?:docs\/|[^/]+\.md$|tools\/gen-(?:docs|arch)\.mjs$|scripts\/(?:checa-coautoria-ia\.sh|install-git-hooks\.mjs)$)/],
  ['maps', /(?:^|\/)(?:map[^/]*|maps\.js|maps\/|lajes[^/]*|sertao[^/]*|amazonia[^/]*|escadao[^/]*|corrego[^/]*|parque[^/]*|penitenciaria[^/]*|velho-oeste[^/]*|campo[^/]*|piscina[^/]*|ferro[^/]*|upa[^/]*|skylife[^/]*)/],
  ['ui', /^(?:src\/(?:components|pages|layouts|styles)\/|public\/(?:css\/|[^/]+\.(?:css|html)$)|tests\/(?:ui|menu|boot)|tools\/eval\/(?:ui-|screen-query|ranking|convida|placar|community|login|roster|chat|lobby)|public\/js\/(?:ui-|splash|screenquery|chat|login|profile|ranking|convida|placar|community|clans|account|treta-|mode-announcements|brasoes|compartilhar|rotas|nick))/],
  ['audio', /(?:^|\/)(?:audio[^/]*|soundscape[^/]*|menu-music[^/]*|.*ambience[^/]*)(?:\/|\.|$)/],
  ['browser', /(?:browser|playwright|portao-browser)/],
  ['network', /^(?:tools\/eval\/(?:net|transport|online|apis|geo-proxy|edge-cache|telemetry|telemetria|mp-)|tests\/net|public\/js\/(?:apibase|transporte|nos|contagem|player-unique|privacy|client-id|economia-partida|compra-partida))/],
  ['vm', /^(?:tools\/viewmodels\/|tools\/eval\/(?:vm|tp-|authored|weapon|recoil|ballistics|firing|character|meshopt|glb-peso|normal-only|skin-profile|death-camera|ads1p|posto|preview-grip|knife-skin)|public\/js\/(?:vm|authoredvm|fparms|fpsrig|meleevm|recoil|weapons|weapon|glove|handik|look))/],
];

const transversal = (arquivo) => /^(?:package(?:-lock)?\.json|yarn\.lock|\.github\/|\.githooks\/|tools\/eval\/(?:runner|suites|selecao-pre-push)|public\/js\/(?:(?:game|main)\.js|(?:boot|net)(?:[^/]*\.js|\/)))/.test(arquivo);

function fallback(motivo, regras = []) {
  return {
    fallback: true,
    motivo,
    regras,
    suites: ['deploy'],
    passos: [...SUITES.deploy],
    comando: ['npm', ['run', '--silent', 'check:deploy']],
  };
}

export function selecionarPorArquivos(arquivos) {
  const categorias = new Set();
  const especificos = new Set();
  const regras = [];
  for (const bruto of arquivos) {
    const arquivo = bruto.trim().replaceAll('\\', '/').replace(/^\.\//, '');
    if (!arquivo) continue;
    if (transversal(arquivo)) return fallback(`mudança transversal exige cobertura completa: ${arquivo}`, regras);
    const achadas = REGRAS.filter(([, re]) => re.test(arquivo)).map(([nome]) => nome);
    if (!achadas.length) return fallback(`caminho sem regra segura de seleção: ${arquivo}`, regras);
    for (const nome of achadas) categorias.add(nome);
    if (achadas.includes('maps')) for (const passo of passosEspecificosMapa(arquivo)) especificos.add(passo);
    regras.push(`${arquivo} → ${achadas.join(', ')}`);
  }
  const suites = ORDEM.filter((nome) => nome === 'core' || categorias.has(nome));
  const passos = [...new Set([...unirSuites(suites), ...especificos])];
  return {
    fallback: false,
    motivo: '',
    regras,
    suites,
    passos,
    comando: [process.execPath, ['tools/eval/runner.mjs', ...passos]],
  };
}

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error((r.stderr || r.error?.message || `git saiu ${r.status}`).trim());
  return r.stdout;
}

function nomesDoDiff(base, head) {
  return git(['diff', '--name-only', '--no-renames', `${base}...${head}`]).split('\n').filter(Boolean);
}

export function arquivosDoPush(env = process.env) {
  const remoto = env.PREPUSH_REMOTE || 'origin';
  const entrada = env.PREPUSH_REFS || '';
  const arquivos = new Set();
  const linhas = entrada.split('\n').filter((linha) => linha.trim());
  if (!linhas.length) return nomesDoDiff(`${remoto}/main`, 'HEAD');

  for (const linha of linhas) {
    const [, localSha, remoteRef, remoteSha] = linha.trim().split(/\s+/);
    if (!localSha || localSha === ZERO) continue;
    let base = remoteSha;
    if (!base || base === ZERO) {
      base = git(['merge-base', localSha, `${remoto}/main`]).trim();
      if (!base) throw new Error(`sem merge-base entre ${localSha} e ${remoto}/main (${remoteRef || 'ref nova'})`);
    }
    for (const arquivo of nomesDoDiff(base, localSha)) arquivos.add(arquivo);
  }
  return [...arquivos];
}

function executar(selecao) {
  for (const regra of selecao.regras) console.log(`pre-push: regra ${regra}`);
  if (selecao.fallback) {
    console.log(`pre-push: fallback para check:deploy completo — ${selecao.motivo}`);
  } else {
    console.log(`pre-push: suites locais ${selecao.suites.join(', ')} (${selecao.passos.length} passos; CI permanece completo)`);
  }
  const [comando, args] = selecao.comando;
  const r = spawnSync(comando, args, { stdio: 'inherit' });
  if (r.error) {
    console.error(`pre-push: não foi possível executar ${comando}: ${r.error.message}`);
    return 78;
  }
  return r.status ?? 78;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let selecao;
  try {
    const explicitos = process.argv.find((arg) => arg.startsWith('--files='));
    const arquivos = explicitos
      ? explicitos.slice('--files='.length).split(',').filter(Boolean)
      : arquivosDoPush();
    selecao = selecionarPorArquivos(arquivos);
  } catch (erro) {
    selecao = fallback(`não foi possível determinar o diff com segurança: ${erro.message}`);
  }
  process.exit(executar(selecao));
}
