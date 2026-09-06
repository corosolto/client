/* ============================================================================
   assets.mjs — O ASSET QUE O JOGO VAI PEDIR EXISTE, E É O QUE DIZ SER?
   ----------------------------------------------------------------------------
   `assert:assets` cobra o pacote no clone de build; nada cobrava o que o EDGE
   entrega depois. Um 404 de GLB no navegador não aparece em portão nenhum até
   alguém pedir aquele arquivo (docs/LICOES.md §5: textura 404 vira branco chapado,
   sem erro). Esta sonda pede uma amostra representativa — todas as armas
   (`WEAPON_IDS`), personagens, props, índices de animação, three vendorizado,
   CSS e prévias de mapa — com a MESMA URL que o runtime monta (`?v=<VERSION>`).

   Prova de conteúdo, não só status: 200 com HTML no lugar de um `.glb` é a
   reescrita/fallback servindo página de erro como modelo — o pior caso, porque
   passa como sucesso na rede e explode no parser do three.

   Range GET (`bytes=0-15`) com `accept-encoding: identity`: aproveita o cache
   do edge (HEAD era MISS de 1–6 s por pedido, medido 06/09) e devolve o total
   real no `content-range`. Tamanho só é comparado com o disco quando a versão
   servida É a versão da árvore; do contrário é INFO, não vermelho.
   ============================================================================ */
import { openSync, readSync, closeSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sonda, paralelo, totalDoContentRange, pareceHtml } from '../lib/http.mjs';
import { amostraDeAssets, provaDoConteudo, REGISTROS, RAIZ_PADRAO } from '../lib/repo.mjs';

/* Os registros (armas: weapons.js; elenco: glbchars.js) vêm do módulo que a PRODUÇÃO serve — a URL
   do import map, a mesma que o runtime pede — não da árvore: com produção e árvore em versões
   diferentes, a árvore pede o que ainda não foi publicado e não pede o que só a produção tem.
   Sem registro legível, cai na árvore e avisa. */
export async function registroServido(base, nome, { registroUrl = null, versao = null, timeoutMs = 15_000 } = {}) {
  const reg = REGISTROS[nome];
  const modulo = reg.modulo.replace(/^\.\//, '/');
  const url = registroUrl ? new URL(registroUrl, `${base}/`).href : `${base}${modulo}${versao ? `?v=${encodeURIComponent(versao)}` : ''}`;
  const r = await sonda(url, { timeoutMs, maxBytes: 65_536 });
  const limpa = url.split('?')[0];
  if (r.status !== 200) return { nome, origem: 'arvore', url: limpa, ids: null, motivo: `${limpa} → ${r.status || r.erro}` };
  if (pareceHtml(r.bytes)) return { nome, origem: 'arvore', url: limpa, ids: null, motivo: `${limpa} → 200 com corpo HTML` };
  const ids = reg.parse(r.texto());
  if (!ids) return { nome, origem: 'arvore', url: limpa, ids: null, motivo: `${limpa} → 200 sem registro legível` };
  return { nome, origem: 'registro-servido', url: limpa, ids, motivo: null };
}

export async function sondaAssetsRemoto(base, { raiz = RAIZ_PADRAO, versao, compararTamanho = false, limite = 24, concorrencia = 6, timeoutMs = 15_000, registroUrls = {} } = {}) {
  const registros = {};
  for (const nome of Object.keys(REGISTROS)) registros[nome] = await registroServido(base, nome, { registroUrl: registroUrls[nome] || null, versao, timeoutMs });
  const amostra = amostraDeAssets(raiz, { limite, armas: registros.armas.ids, personagens: registros.personagens.ids });
  const itens = await paralelo(amostra, async (a) => {
    const url = `${base}/${a.caminho}${versao ? `?v=${encodeURIComponent(versao)}` : ''}`;
    const r = await sonda(url, { range: 'bytes=0-15', timeoutMs, maxBytes: 64 });
    const total = r.status === 206 ? totalDoContentRange(r.headers) : (r.status === 200 ? Number(r.headers['content-length']) || null : null);
    const conteudoOk = (r.status === 200 || r.status === 206) && r.bytes.length > 0 ? provaDoConteudo(a.prova, r.bytes) && !pareceHtml(r.bytes) : null;
    return {
      ...a, url: url.split('?')[0], status: r.status, ms: r.ms, erro: r.erro, total, conteudoOk,
      cfCache: r.headers['cf-cache-status'] || null, encoding: r.headers['content-encoding'] || null,
      tamanhoBate: compararTamanho && total != null && a.existe ? total === a.tamanho : null,
    };
  }, concorrencia);
  return { ...resumo('assets', base, itens), registros: Object.fromEntries(Object.values(registros).map((r) => [r.nome, { origem: r.origem, url: r.url, motivo: r.motivo, total: r.ids?.length ?? null }])) };
}

export function sondaAssetsLocal({ raiz = RAIZ_PADRAO, limite = Infinity } = {}) {
  const amostra = amostraDeAssets(raiz, { limite });
  const itens = amostra.map((a) => {
    const abs = join(raiz, 'public', a.caminho);
    let conteudoOk = null;
    if (existsSync(abs)) conteudoOk = a.tamanho > 0 && provaDoConteudo(a.prova, cabecalho(abs));
    return { ...a, status: a.existe ? 200 : 404, conteudoOk };
  });
  return resumo('assets-local', raiz, itens);
}

/* 64 bytes, não o arquivo: a amostra local soma >100 MB de GLB e a prova é só o cabeçalho */
function cabecalho(abs, n = 64) {
  const fd = openSync(abs, 'r');
  try { const b = Buffer.alloc(n); const lidos = readSync(fd, b, 0, n, 0); return new Uint8Array(b.subarray(0, lidos)); } finally { closeSync(fd); }
}

function resumo(sonda_, alvo, itens) {
  const faltando = itens.filter((i) => i.status === 404 || i.status === 410);
  const semResposta = itens.filter((i) => i.status === 0);
  const outrosErros = itens.filter((i) => i.status >= 400 && i.status !== 404 && i.status !== 410);
  const conteudoErrado = itens.filter((i) => i.conteudoOk === false);
  const tamanhoDiverge = itens.filter((i) => i.tamanhoBate === false);
  const lat = itens.filter((i) => i.ms != null && i.status > 0).map((i) => i.ms).sort((a, b) => a - b);
  return {
    sonda: sonda_, alvo, total: itens.length, itens,
    faltando: faltando.map((i) => i.caminho), semResposta: semResposta.map((i) => `${i.caminho} (${i.erro})`),
    outrosErros: outrosErros.map((i) => `${i.caminho} (${i.status})`),
    conteudoErrado: conteudoErrado.map((i) => i.caminho), tamanhoDiverge: tamanhoDiverge.map((i) => `${i.caminho} (edge ${i.total} ≠ disco ${i.tamanho})`),
    p95ms: lat.length ? lat[Math.max(0, Math.ceil(lat.length * 0.95) - 1)] : null,
    cacheHits: itens.filter((i) => /HIT/i.test(i.cfCache || '')).length,
  };
}
