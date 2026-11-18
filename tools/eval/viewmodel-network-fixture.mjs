import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/* CI usa os mesmos bytes publicados, sem credenciais nem cópias dos assets no Git.
   Rede do runner falha de passagem (17/11: 500, ECONNRESET e timeout de 60 s em rajada da mesma
   URL): 5xx, conexão cortada e timeout voltam com espera exponencial e teto de tentativas; 404,
   outro 4xx, erro que não é de transporte e bytes/sha256 fora do manifesto reprovam na hora.
   A concorrência fica limitada para o runner não abrir 63 downloads de uma vez.
   Régua: tools/eval/viewmodel-network-fixture-check.mjs. */
export const PADRAO_REDE = { tentativas: 4, timeoutMs: 60000, esperaBaseMs: 1000, concorrencia: 6 };

// Corte de conexão e timeout do undici (fetch do Node), em qualquer nível de `cause`.
const CODIGOS_TRANSITORIOS = new Set([
  'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNABORTED',
  'UND_ERR_SOCKET', 'UND_ERR_CLOSED', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT',
]);
export function falhaTransitoria(error) {
  for (let atual = error, nivel = 0; atual && nivel < 6; atual = atual.cause, nivel++) {
    if (atual.name === 'TimeoutError') return 'timeout';
    if (CODIGOS_TRANSITORIOS.has(atual.code)) return atual.code;
    if (atual instanceof TypeError && atual.message === 'terminated') return 'terminated';
  }
  return '';
}

class FalhaDefinitiva extends Error {}

export function limitador(maximo) {
  let ativos = 0;
  const fila = [];
  return async (tarefa) => {
    // A vaga passa direto de quem termina para o próximo da fila: ninguém entra no meio.
    if (ativos < maximo) ativos++;
    else await new Promise((resolve) => fila.push(resolve));
    try {
      return await tarefa();
    } finally {
      const proximo = fila.shift();
      if (proximo) proximo();
      else ativos--;
    }
  };
}

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function buscarViewmodelPublicado(url, entry, opcoes = {}) {
  const { tentativas, timeoutMs, esperaBaseMs } = { ...PADRAO_REDE, ...opcoes };
  const historico = [];
  const relato = (resumo) => `${resumo} (${url})${historico.length ? `\n  ${historico.join('\n  ')}` : ''}`;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    let motivo;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) {
        const body = Buffer.from(await response.arrayBuffer());
        const sha256 = createHash('sha256').update(body).digest('hex');
        if (body.length !== entry.bytes || sha256 !== entry.sha256) {
          throw new FalhaDefinitiva(`viewmodel publicado diverge do manifesto: ${entry.path} veio com ${body.length} bytes e sha256 ${sha256}, manifesto ${entry.bytes} bytes e ${entry.sha256}`);
        }
        return body;
      }
      await response.body?.cancel();
      if (response.status < 500) throw new FalhaDefinitiva(`viewmodel publicado: ${response.status} ${entry.path}`);
      motivo = `HTTP ${response.status}`;
    } catch (error) {
      if (error instanceof FalhaDefinitiva) {
        historico.push(`tentativa ${tentativa}: ${error.message}`);
        throw new Error(relato(error.message));
      }
      const tipo = falhaTransitoria(error);
      if (!tipo) throw new Error(relato(`viewmodel publicado: ${entry.path}: ${error.name}: ${error.message} (não transitório)`), { cause: error });
      motivo = `${error.name}: ${error.message} [${tipo}]`;
    }
    historico.push(`tentativa ${tentativa}: ${motivo}`);
    if (tentativa < tentativas) await espera(esperaBaseMs * 2 ** (tentativa - 1));
  }
  throw new Error(relato(`viewmodel publicado: ${entry.path} falhou nas ${tentativas} tentativas`));
}

export function criarBuscadorViewmodels({ origem, manifesto, ...opcoes }) {
  const { concorrencia } = { ...PADRAO_REDE, ...opcoes };
  const files = new Map(manifesto.files.map((entry) => [`${manifesto.servedRoot}/${entry.path}`, entry]));
  const vaga = limitador(concorrencia);
  return async (local) => {
    const entry = files.get(local.pathname);
    if (!entry) throw new Error(`asset fora do manifesto: ${local.pathname}`);
    const body = await vaga(() => buscarViewmodelPublicado(new URL(local.pathname + local.search, origem), entry, opcoes));
    return { entry, body };
  };
}

export async function installViewmodelAssets(page) {
  if (!process.env.VM_PUBLIC_ASSETS) return;
  const origem = new URL(process.env.VM_PUBLIC_ASSETS);
  if (origem.protocol !== 'https:') throw new Error('VM_PUBLIC_ASSETS exige HTTPS');
  const manifesto = JSON.parse(readFileSync(new URL('../viewmodels/vm-assets.manifest.json', import.meta.url)));
  const buscar = criarBuscadorViewmodels({ origem, manifesto });
  await page.route('**/private-assets/viewmodels/**', async (route) => {
    const { entry, body } = await buscar(new URL(route.request().url()));
    await route.fulfill({ status: 200, contentType: entry.contentType, body });
  });
}
