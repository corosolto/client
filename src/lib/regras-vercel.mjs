// Regras de `vercel.json` (headers e redirects) em runtime: compila o `source` (sintaxe
// path-to-regexp da Vercel) e avalia `has`/`missing` de query. Usado pelo Worker e pelas réguas.

/* `(grupo)` fica como regex, `{/}?` vira opcional, `:nome` vira segmento; o resto é literal. */
export function fonteParaRegex(source) {
  let saida = '';
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '(') {
      let fim = i, nivel = 0;
      for (; fim < source.length; fim++) {
        if (source[fim] === '\\') { fim++; continue; }
        if (source[fim] === '(') nivel++;
        else if (source[fim] === ')' && --nivel === 0) break;
      }
      if (nivel !== 0) throw new Error(`source com parêntese aberto: ${source}`);
      saida += source.slice(i, fim + 1);
      i = fim;
    } else if (c === '{') {
      const fim = source.indexOf('}', i);
      if (fim < 0 || source[fim + 1] !== '?') throw new Error(`source com chave sem "?": ${source}`);
      saida += `(?:${escapar(source.slice(i + 1, fim))})?`;
      i = fim + 1;
    } else if (c === ':' && /[A-Za-z]/.test(source[i + 1] || '')) {
      const m = /^:([A-Za-z]\w*)/.exec(source.slice(i));
      saida += `(?<${m[1]}>[^/]+)`;
      i += m[0].length - 1;
    } else if (c === '\\') {
      saida += c + (source[i + 1] ?? '');
      i++;
    } else saida += escapar(c);
  }
  return new RegExp(`^${saida}$`, 'i');
}

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/* Condição `has`/`missing` de query: `value` é regex inteira; grupos nomeados alimentam o destino. */
function condicaoBate(cond, url, capturas) {
  if (cond.type !== 'query') throw new Error(`condição não suportada: ${cond.type}`);
  if (!url.searchParams.has(cond.key)) return false;
  if (cond.value === undefined) return true;
  const m = new RegExp(`^(?:${cond.value})$`).exec(url.searchParams.get(cond.key));
  if (!m) return false;
  Object.assign(capturas, m.groups || {});
  return true;
}

export function compilarRedirect(regra) {
  const regex = fonteParaRegex(regra.source);
  const status = regra.statusCode ?? (regra.permanent === false ? 307 : 308);
  return { ...regra, regex, status };
}

export function compilarHeader(regra) {
  return { ...regra, regex: fonteParaRegex(regra.source) };
}

export function redirectPara(redirects, url) {
  for (const r of redirects) {
    const m = r.regex.exec(url.pathname);
    if (!m) continue;
    const capturas = { ...(m.groups || {}) };
    if ((r.has || []).some((c) => !condicaoBate(c, url, capturas))) continue;
    if ((r.missing || []).some((c) => condicaoBate(c, url, {}))) continue;
    let destino = r.destination.replace(/:([A-Za-z]\w*)/g, (_, nome) => capturas[nome] ?? '');
    /* A Vercel repassa a query original ao destino (`/?janela=x` -> `/configuracoes?janela=x`). */
    if (url.search && !/^https?:/.test(destino)) destino += (destino.includes('?') ? '&' : '?') + url.search.slice(1);
    return { destino, status: r.status };
  }
  return null;
}

/* Mesma semântica da Vercel: todas as regras que casam aplicam, a última vence por chave. */
export function headersPara(headers, pathname) {
  const saida = new Map();
  for (const h of headers) {
    if (!h.regex.test(pathname)) continue;
    for (const { key, value } of h.headers) saida.set(key.toLowerCase(), value);
  }
  return saida;
}
