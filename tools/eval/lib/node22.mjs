/* Portões que fixam o Node do CI (22) para continuarem comparáveis. Numa máquina
 * cujo `node` é outro major, o portão procura um binário 22 instalado em vez de
 * reprovar o ambiente inteiro. Sem nenhum 22, quem chama continua reprovando.
 *
 * Ordem: CSBRASIL_NODE22 (explícito, precisa ser 22), Homebrew node@22, asdf,
 * nvm, fnm e Volta; entre versões 22 do mesmo gerenciador, a mais nova. */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAJOR = '22';
const VERSAO_22 = /^22\.\d+\.\d+$/;

export function versaoDoNode(executavel) {
  const r = spawnSync(executavel, ['-p', 'process.versions.node'], { encoding: 'utf8', timeout: 10_000 });
  if (r.error || r.status !== 0) return null;
  const versao = r.stdout.trim();
  return /^\d+\.\d+\.\d+$/.test(versao) ? versao : null;
}

const maisNova = (a, b) => {
  const [x, y] = [a, b].map(v => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i];
  return 0;
};

function instalados(raiz, prefixo, sufixo) {
  let nomes;
  try { nomes = readdirSync(raiz); } catch { return []; }
  return nomes
    .filter(nome => nome.startsWith(prefixo) && VERSAO_22.test(nome.slice(prefixo.length)))
    .sort((a, b) => maisNova(a.slice(prefixo.length), b.slice(prefixo.length)))
    .map(nome => path.join(raiz, nome, ...sufixo));
}

export function candidatosNode22({ home = os.homedir(), brew = ['/opt/homebrew', '/usr/local'] } = {}) {
  return [
    ...brew.map(raiz => path.join(raiz, `opt/node@${MAJOR}/bin/node`)),
    ...instalados(path.join(home, '.asdf/installs/nodejs'), '', ['bin', 'node']),
    ...instalados(path.join(home, '.nvm/versions/node'), 'v', ['bin', 'node']),
    ...instalados(path.join(home, '.local/share/fnm/node-versions'), 'v', ['installation', 'bin', 'node']),
    ...instalados(path.join(home, '.volta/tools/image/node'), '', ['bin', 'node']),
  ];
}

/* Caminho de um node 22 executável, ou null. CSBRASIL_NODE22 apontando para outra
 * versão é erro de configuração, nunca troca silenciosa de major. */
export function localizarNode22({
  env = process.env, home = os.homedir(), brew, atual = process.versions.node, execPath = process.execPath,
} = {}) {
  if (VERSAO_22.test(atual)) return execPath;
  if (env.CSBRASIL_NODE22) {
    const versao = versaoDoNode(env.CSBRASIL_NODE22);
    if (!VERSAO_22.test(versao ?? '')) {
      throw new Error(`CSBRASIL_NODE22=${env.CSBRASIL_NODE22} não é Node ${MAJOR} (${versao ?? 'não executa'})`);
    }
    return env.CSBRASIL_NODE22;
  }
  for (const candidato of candidatosNode22({ home, brew })) {
    if (existsSync(candidato) && VERSAO_22.test(versaoDoNode(candidato) ?? '')) return candidato;
  }
  return null;
}
