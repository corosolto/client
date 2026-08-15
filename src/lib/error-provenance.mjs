const EXTENSION_RE = /(?:chrome|moz|safari-web|safari)-extension:\/\//i;
// Bundles injetados pela Vercel (Web Analytics, Speed Insights) moram em /_vercel/: são
// servidos do próprio domínio, mas o código é de terceiro. Crash deles não é bug do jogo
// e não tem conserto no nosso fonte.
const VENDOR_RE = /\/_vercel\//i;
const CACHE_SPLIT_RE = /does not provide an export|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|prod-coherence/i;
// Aviso RECUPERÁVEL do carregador do three: uma textura embutida (webp) do GLB não
// decodifica em navegador minoritário (createImageBitmap), o three loga com console.error
// mas o modelo CARREGA sem aquele mapa — o jogo não trava. É ambiental (não é defeito de
// código) e não tem conserto no repo, então fica na telemetria bruta mas NÃO abre issue.
const RECOVERABLE_RE = /THREE\.[^:]*: Couldn't load texture/i;
const HTTP_URL_RE = /https?:\/\/[^\s)'"<>]+/gi;
/* Assinaturas opacas de terceiro/extensão/resposta corrompida: mensagens sem
   pilha e sem nome de arquivo do próprio jogo que o navegador entrega já
   anonimizadas (CORS mascara "Script error.", Firefox emite "uncaught
   exception: undefined", byte injetado vira "illegal character U+xxxx", rede
   caída vira "network error"). Cobre issues #109, #125, #126, #136. Crash real
   do jogo SEMPRE carrega filename ou stack same-origin — por isso o corte só
   vale quando não há nenhum dos dois (ver isOpaqueNoise). */
const OPAQUE_RE = /uncaught exception: undefined|illegal character\s+U\+[0-9a-f]{2,6}|^script error\.?$|^network error$/i;

const normalizedOrigin = (value, base) => {
  if (!value) return null;
  try { return new URL(value, base).origin; } catch { return null; }
};

export function isExternalCrash({ message = '', source = '', stack = '' } = {}, own = '') {
  const ownOrigin = normalizedOrigin(own, own);
  const evidence = [message, source, stack].filter(Boolean).join("\n");
  const sourceText = String(source || '');
  if (EXTENSION_RE.test(sourceText)) return true;
  // Vale antes do atalho same-origin: /_vercel/ é próprio domínio, mas terceiro.
  if (VENDOR_RE.test(sourceText) || VENDOR_RE.test(String(stack || ''))) return true;

  const sourceOrigin = /^https?:\/\//i.test(sourceText)
    ? normalizedOrigin(sourceText, ownOrigin)
    : null;
  if (sourceOrigin && sourceOrigin !== ownOrigin) return true;
  if (sourceOrigin === ownOrigin) return false;

  // URL http só prova origem em source/stack: na mensagem ela costuma ser carga do
  // próprio jogo. Esquema de extensão vale em qualquer campo (KNOWN-BUGS.md, BUG-51).
  const provenance = [source, stack].filter(Boolean).join("\n");
  const origins = [...provenance.matchAll(HTTP_URL_RE)]
    .map((match) => normalizedOrigin(match[0], ownOrigin))
    .filter(Boolean);
  if (origins.includes(ownOrigin)) return false;
  if (EXTENSION_RE.test(evidence)) return true;
  return origins.some((origin) => origin !== ownOrigin);
}

/* Ruído opaco: sem pilha E sem source (nenhum nome de arquivo do jogo), a
   mensagem sozinha bate uma assinatura conhecida de terceiro. A guarda de
   source/stack é o que impede mascarar crash real do jogo — throw undefined do
   próprio código chega com e.filename same-origin, syntax error real é pego no
   build, e nenhum dos dois cai aqui. */
export function isOpaqueNoise({ message = '', source = '', stack = '' } = {}) {
  if (source || stack) return false;
  return OPAQUE_RE.test(String(message).trim());
}

export function classifyCrash(payload = {}, ownOrigin = '') {
  const evidence = [payload.message, payload.source, payload.stack].filter(Boolean).join(' ');
  if (isExternalCrash(payload, ownOrigin)) return 'externo';
  if (isOpaqueNoise(payload)) return 'externo';
  if (CACHE_SPLIT_RE.test(evidence)) return 'cache-split';
  if (RECOVERABLE_RE.test(evidence)) return 'recuperavel';
  return 'codigo';
}

// 'externo' e 'recuperavel' ficam gravados no banco, mas não consomem dispatch nem
// abrem bug do jogo: um não pertence ao jogo, o outro o jogo já contornou sozinho.
export const shouldDispatchCrash = (classification) => classification !== 'externo' && classification !== 'recuperavel';
