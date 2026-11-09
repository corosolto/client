#!/usr/bin/env node
/* ============================================================================
   gen-headers-redirects.mjs — vercel.json É A FONTE; _headers/_redirects SÃO GERADOS
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Até a fase 6 da migração (docs/runbooks/MIGRACAO-CLOUDFLARE.md) o site vive nas duas
   bordas. Manter duas listas de headers à mão é como a CSP diverge sem ninguém ver.
   Este script lê `vercel.json` e escreve `public/_headers` e `public/_redirects` no
   formato do Workers Static Assets. A régua `eval:cfparidade` cobra que toda regra da
   Vercel tem contraparte aqui.

   O QUE O `_headers` NÃO EXPRESSA (vai pelo Worker, src/cf/worker.ts):
   - `(.*)` vira `*`; grupo regex arbitrário (lookahead, classes) NÃO tem splat
     equivalente: sai a aproximação mais próxima marcada `# aproximado` e a semântica
     exata fica no Worker para respostas SSR (estáticos ficam com a aproximação).
   - Mesma chave em duas regras que casam: a Vercel deixa a última vencer; o Workers
     CONCATENA com vírgula (e o asset layer já manda um Cache-Control próprio). Toda
     chave sai com `! Chave` antes de definir, para reproduzir "a última vence".
   - `_headers` só vale para respostas de ASSET; resposta gerada pelo Worker (SSR)
     não recebe nada daqui. O Worker aplica as mesmas regras por cima.
   - Redirect com `has`/`missing` (query) não existe em `_redirects`: fica só no Worker,
     e `/` roda com `run_worker_first` para o Worker ver a query.
   - `{/}?` vira duas linhas (com e sem barra). `permanent: true` é 308, `false` é 307.

   Uso: node tools/cf/gen-headers-redirects.mjs [--check]   (--check: só imprime o resumo)
   ============================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* `source` da Vercel -> padrão do Workers. Devolve também se a tradução é exata. */
export function fonteParaPadrao(source) {
  let exato = true;
  let padrao = '';
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '(') {
      let fim = i, nivel = 0;
      for (; fim < source.length; fim++) {
        if (source[fim] === '\\') { fim++; continue; }
        if (source[fim] === '(') nivel++;
        else if (source[fim] === ')' && --nivel === 0) break;
      }
      const grupo = source.slice(i + 1, fim);
      if (grupo !== '.*') {
        exato = false;
        /* Fica o sufixo literal que o grupo exige (ex.: "-runtime.glb"); o resto vira splat. */
        const sufixo = (/([A-Za-z0-9_-]+(?:\\\.[A-Za-z0-9]+)?)\)?$/.exec(grupo) || [])[1] || '';
        padrao += '*' + sufixo.replace(/\\\./g, '.');
      } else padrao += '*';
      i = fim;
    } else if (c === '{') {
      const fim = source.indexOf('}', i);
      padrao += `{${source.slice(i + 1, fim)}}`;
      i = fim + 1;
    } else if (c === '\\') {
      padrao += source[i + 1] ?? '';
      i++;
    } else padrao += c;
  }
  if ((padrao.match(/\*/g) || []).length > 1) throw new Error(`mais de um splat para ${source}`);
  return { padrao, exato };
}

/* Expande `{/}` em duas variantes; o Workers não tem opcional. */
function variantes(padrao) {
  const m = /\{([^}]*)\}/.exec(padrao);
  if (!m) return [padrao];
  return [padrao.replace(m[0], ''), padrao.replace(m[0], m[1])];
}

export function gerar(vercel) {
  const linhasHeaders = ['# GERADO por tools/cf/gen-headers-redirects.mjs a partir de vercel.json. Não edite.'];
  const aproximadas = [];
  for (const regra of vercel.headers) {
    const { padrao, exato } = fonteParaPadrao(regra.source);
    if (!exato) aproximadas.push({ source: regra.source, padrao });
    for (const variante of variantes(padrao)) {
      linhasHeaders.push('', `${exato ? '' : '# aproximado de ' + regra.source + '\n'}${variante}`);
      for (const { key, value } of regra.headers) linhasHeaders.push(`  ! ${key}`, `  ${key}: ${value}`);
    }
  }

  const linhasRedirects = ['# GERADO por tools/cf/gen-headers-redirects.mjs a partir de vercel.json. Não edite.'];
  const soNoWorker = [];
  for (const regra of vercel.redirects) {
    if (regra.has || regra.missing) { soNoWorker.push(regra); continue; }
    const { padrao, exato } = fonteParaPadrao(regra.source);
    if (!exato) { soNoWorker.push(regra); continue; }
    const status = regra.statusCode ?? (regra.permanent === false ? 307 : 308);
    for (const variante of variantes(padrao)) linhasRedirects.push(`${variante} ${regra.destination} ${status}`);
  }
  linhasRedirects.push('', `# ${soNoWorker.length} redirect(s) com has/missing ou regex ficam só no Worker (src/cf/worker.ts).`);
  return {
    headers: linhasHeaders.join('\n') + '\n',
    redirects: linhasRedirects.join('\n') + '\n',
    aproximadas,
    soNoWorker,
  };
}

export function lerVercel() {
  return JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const saida = gerar(lerVercel());
  if (!process.argv.includes('--check')) {
    writeFileSync(path.join(ROOT, 'public', '_headers'), saida.headers);
    writeFileSync(path.join(ROOT, 'public', '_redirects'), saida.redirects);
  }
  console.log(`[cf] _headers: ${saida.headers.split('\n').filter((l) => l && !l.startsWith(' ') && !l.startsWith('#')).length} bloco(s), ` +
    `${saida.aproximadas.length} aproximado(s): ${saida.aproximadas.map((a) => a.source).join(', ') || 'nenhum'}`);
  console.log(`[cf] _redirects: ${saida.redirects.split('\n').filter((l) => l && !l.startsWith('#')).length} linha(s); ` +
    `${saida.soNoWorker.length} só no Worker`);
}
