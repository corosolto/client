#!/usr/bin/env node
/* Seleção SOMENTE do pre-push local. O CI continua executando seus portões
 * completos. Qualquer dúvida de classificação escolhe check:deploy inteiro. */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { SUITES, unirSuites, passosEspecificosMapa } from './suites.mjs';

const ORDEM = ['core', 'maps', 'ui', 'audio', 'browser', 'network', 'vm'];
const ZERO = '0000000000000000000000000000000000000000';
const PASSOS_CONHECIDOS = new Set([...SUITES.fast, ...SUITES.deploy]);

const REGUAS_WORKFLOW = Object.freeze({
  '.github/workflows/ci.yml': Object.freeze(['eval:operacao-flavio', 'eval:release']),
  '.github/workflows/release.yml': Object.freeze(['eval:release']),
  '.github/workflows/deploy-prod.yml': Object.freeze(['eval:edgecache', 'eval:release']),
  '.github/workflows/prod-watch.yml': Object.freeze(['eval:edgecache', 'eval:wfpurge']),
  '.github/workflows/preview-build.yml': Object.freeze([]),
  '.github/workflows/preview-deploy.yml': Object.freeze([]),
  '.github/workflows/preview-bot.yml': Object.freeze([]),
  '.github/workflows/portao-browser.yml': Object.freeze([]),
  '.github/workflows/autofix.yml': Object.freeze([]),
});

export function validarMapaWorkflows(mapa) {
  for (const [arquivo, passos] of Object.entries(mapa)) {
    if (!Array.isArray(passos)) throw new Error(`réguas inválidas para ${arquivo}`);
    for (const passo of passos) {
      if (!PASSOS_CONHECIDOS.has(passo)) {
        throw new Error(`passo fantasma no mapa de workflows: ${arquivo} → ${passo}`);
      }
    }
  }
  return true;
}

validarMapaWorkflows(REGUAS_WORKFLOW);

const REGRAS = [
  ['core', /^(?:docs\/|(?:\.agents|\.claude|plans|launch-media)\/|(?:[^/]+\/)*[^/]+\.md$|tools\/gen-(?:docs|arch)\.mjs$|scripts\/(?:checa-coautoria-ia\.sh|install-git-hooks\.mjs|ci\/[^/]+\.py)$)/],
  ['maps', /(?:^|\/)(?:map[^/]*|maps\.js|maps\/|lajes[^/]*|sertao[^/]*|amazonia[^/]*|escadao[^/]*|corrego[^/]*|parque[^/]*|penitenciaria[^/]*|velho-oeste[^/]*|campo[^/]*|piscina[^/]*|ferro[^/]*|upa[^/]*|skylife[^/]*)/],
  ['ui', /^(?:src\/(?:components|pages|layouts|styles)\/|public\/(?:css\/|[^/]+\.(?:css|html)$)|tests\/(?:ui|menu|boot)|tools\/eval\/(?:ui-|screen-query|ranking|convida|placar|community|login|roster|chat|lobby)|public\/js\/(?:ui-|splash|screenquery|chat|login|profile|ranking|convida|placar|community|clans|account|treta-|mode-announcements|brasoes|compartilhar|rotas|nick))/],
  ['audio', /(?:^|\/)(?:audio[^/]*|soundscape[^/]*|menu-music[^/]*|.*ambience[^/]*)(?:\/|\.|$)/],
  ['browser', /(?:browser|playwright|portao-browser)/],
  ['network', /^(?:tools\/eval\/(?:net|transport|online|apis|geo-proxy|edge-cache|telemetry|telemetria|mp-|server-traffic)|tests\/net|src\/lib\/server-traffic\.mjs$|public\/js\/(?:apibase|transporte|nos|contagem|player-unique|privacy|client-id|economia-partida|compra-partida))/],
  ['vm', /^(?:tools\/viewmodels\/|tools\/eval\/(?:vm|tp-|authored|weapon|recoil|ballistics|firing|character|meshopt|glb-peso|normal-only|skin-profile|death-camera|ads1p|posto|preview-grip|knife-skin)|public\/js\/(?:vm|authoredvm|fparms|fpsrig|meleevm|recoil|weapons|weapon|glove|handik|look))/],
];

const transversal = (arquivo) => /^(?:package-lock\.json|yarn\.lock|\.github\/|\.githooks\/|tools\/eval\/(?:runner|suites|selecao-pre-push)|tests\/eval-suites\.test\.mjs|public\/js\/(?:(?:game|main)\.js|(?:boot|net)(?:[^/]*\.js|\/)))/.test(arquivo);

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

function blobsDoPackage(blobs) {
  if (blobs instanceof Map) return blobs.get('package.json');
  if (!blobs || typeof blobs !== 'object') return undefined;
  if (Object.hasOwn(blobs, 'package.json')) return blobs['package.json'];
  if (Object.hasOwn(blobs, 'antes') || Object.hasOwn(blobs, 'depois')) return blobs;
  return undefined;
}

function selecionarPackage(par) {
  if (typeof par?.antes !== 'string' || typeof par?.depois !== 'string') {
    return { erro: 'package.json exige os blobs antes/depois do diff' };
  }
  let antes;
  let depois;
  try {
    antes = JSON.parse(par.antes);
    depois = JSON.parse(par.depois);
  } catch (erro) {
    return { erro: `package.json inválido: ${erro.message}` };
  }
  const objeto = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor);
  if (!objeto(antes) || !objeto(depois)) return { erro: 'package.json não contém objetos JSON válidos' };

  const chavesTopo = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  chavesTopo.delete('scripts');
  for (const chave of chavesTopo) {
    if (!isDeepStrictEqual(antes[chave], depois[chave])) {
      return { erro: `mudança transversal em package.json (${chave})` };
    }
  }

  const scriptsAntes = antes.scripts ?? {};
  const scriptsDepois = depois.scripts ?? {};
  if (!objeto(scriptsAntes) || !objeto(scriptsDepois)) return { erro: 'package.json tem scripts inválidos' };
  const nomes = new Set([...Object.keys(scriptsAntes), ...Object.keys(scriptsDepois)]);
  const passos = [];
  for (const nome of nomes) {
    if (isDeepStrictEqual(scriptsAntes[nome], scriptsDepois[nome])) continue;
    if (!Object.hasOwn(scriptsDepois, nome)) return { erro: `remoção de script exige cobertura completa: ${nome}` };
    if (!PASSOS_CONHECIDOS.has(nome)) return { erro: `script fora de fast/deploy exige cobertura completa: ${nome}` };
    if (typeof scriptsDepois[nome] !== 'string'
      || (Object.hasOwn(scriptsAntes, nome) && typeof scriptsAntes[nome] !== 'string')) {
      return { erro: `script inválido exige cobertura completa: ${nome}` };
    }
    if (/\bnpm\s+run\b|tools\/eval\/runner\.mjs/.test(scriptsAntes[nome])
      || /\bnpm\s+run\b|tools\/eval\/runner\.mjs/.test(scriptsDepois[nome])) {
      return { erro: `agregador alterado exige cobertura completa: ${nome}` };
    }
    passos.push(nome);
  }
  return { passos };
}

export function selecionarPorArquivos(arquivos, blobs = new Map()) {
  const categorias = new Set();
  const especificos = new Set();
  const regras = [];
  for (const bruto of arquivos) {
    const arquivo = bruto.trim().replaceAll('\\', '/').replace(/^\.\//, '');
    if (!arquivo) continue;
    if (arquivo === 'package.json') {
      const selecao = selecionarPackage(blobsDoPackage(blobs));
      if (selecao.erro) return fallback(selecao.erro, regras);
      for (const passo of selecao.passos) especificos.add(passo);
      regras.push(`${arquivo} → core${selecao.passos.length ? ` + ${selecao.passos.join(', ')}` : ''}`);
      continue;
    }
    if (arquivo.startsWith('.github/workflows/')) {
      if (!Object.hasOwn(REGUAS_WORKFLOW, arquivo)) {
        return fallback(`workflow sem mapa seguro de seleção: ${arquivo}`, regras);
      }
      for (const passo of REGUAS_WORKFLOW[arquivo]) especificos.add(passo);
      regras.push(`${arquivo} → core${REGUAS_WORKFLOW[arquivo].length ? ` + ${REGUAS_WORKFLOW[arquivo].join(', ')}` : ''}`);
      continue;
    }
    if (transversal(arquivo)) return fallback(`mudança transversal exige cobertura completa: ${arquivo}`, regras);
    const achadas = REGRAS.filter(([, re]) => re.test(arquivo)).map(([nome]) => nome);
    if (!achadas.length) return fallback(`caminho sem regra segura de seleção: ${arquivo}`, regras);
    for (const nome of achadas) categorias.add(nome);
    if (achadas.includes('maps')) for (const passo of passosEspecificosMapa(arquivo)) especificos.add(passo);
    regras.push(`${arquivo} → ${achadas.join(', ')}`);
  }
  const suites = ORDEM.filter((nome) => nome === 'core' || categorias.has(nome));
  const passos = [...new Set([...unirSuites(suites), ...especificos])];
  if (!passos.length) return fallback('seleção vazia não é segura', regras);
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

/* Branch nova aberta de staging comparada com main arrasta o staging inteiro para o diff
   (09/11: 691 arquivos, fallback completo). Entre main e staging, fica a base mais perto de HEAD. */
function baseDeIntegracao(sha, remoto) {
  let melhor = '';
  for (const ref of [`${remoto}/main`, `${remoto}/staging`]) {
    let candidata = '';
    try { candidata = git(['merge-base', sha, ref]).trim(); } catch { continue; }
    if (!candidata) continue;
    if (!melhor || spawnSync('git', ['merge-base', '--is-ancestor', melhor, candidata]).status === 0) melhor = candidata;
  }
  return melhor;
}

function carregarBlobsPackage(blobs, base, head) {
  if (!blobs) return;
  const par = {
    antes: git(['show', `${base}:package.json`]),
    depois: git(['show', `${head}:package.json`]),
  };
  const existente = blobs.get('package.json');
  if (existente && !isDeepStrictEqual(existente, par)) {
    throw new Error('o push contém versões divergentes de package.json');
  }
  blobs.set('package.json', par);
}

export function arquivosDoPush(env = process.env, blobs) {
  const remoto = env.PREPUSH_REMOTE || 'origin';
  const entrada = env.PREPUSH_REFS || '';
  const arquivos = new Set();
  const linhas = entrada.split('\n').filter((linha) => linha.trim());
  if (!linhas.length) {
    const base = baseDeIntegracao('HEAD', remoto) || `${remoto}/main`;
    const nomes = nomesDoDiff(base, 'HEAD');
    if (nomes.includes('package.json')) carregarBlobsPackage(blobs, base, 'HEAD');
    return nomes;
  }

  for (const linha of linhas) {
    const [, localSha, remoteRef, remoteSha] = linha.trim().split(/\s+/);
    if (!localSha || localSha === ZERO) continue;
    let base = remoteSha;
    if (!base || base === ZERO) {
      base = baseDeIntegracao(localSha, remoto);
      if (!base) throw new Error(`sem merge-base entre ${localSha} e ${remoto}/main ou ${remoto}/staging (${remoteRef || 'ref nova'})`);
    }
    const nomes = nomesDoDiff(base, localSha);
    if (nomes.includes('package.json')) carregarBlobsPackage(blobs, base, localSha);
    for (const arquivo of nomes) arquivos.add(arquivo);
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
    const blobs = new Map();
    const arquivos = explicitos
      ? explicitos.slice('--files='.length).split(',').filter(Boolean)
      : arquivosDoPush(process.env, blobs);
    selecao = selecionarPorArquivos(arquivos, blobs);
  } catch (erro) {
    selecao = fallback(`não foi possível determinar o diff com segurança: ${erro.message}`);
  }
  process.exit(executar(selecao));
}
