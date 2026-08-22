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
// Abort de mídia: o jogo corta `play()` pendente de propósito (audio.js:97/:119/:159) e a
// rejeição chega sem stack. ESTREITO de propósito — KNOWN-BUGS.md, BUG-73.
const MEDIA_ABORT_RE = /The play\(\) request was interrupted|(?:fetching process for the )?media resource was aborted|^AbortError: The operation was aborted/i;
const HTTP_URL_RE = /https?:\/\/[^\s)'"<>]+/gi;
/* Assinaturas opacas de terceiro/extensão/resposta corrompida: mensagens sem
   pilha e sem nome de arquivo do próprio jogo que o navegador entrega já
   anonimizadas (CORS mascara "Script error.", Firefox emite "uncaught
   exception: undefined", byte injetado vira "illegal character U+xxxx", rede
   caída vira "network error"). Cobre issues #109, #125, #126, #136. Crash real
   do jogo SEMPRE carrega filename ou stack same-origin — por isso o corte só
   vale quando não há nenhum dos dois (ver isOpaqueNoise). */
const OPAQUE_RE = /uncaught exception: undefined|illegal character\s+U\+[0-9a-f]{2,6}|^script error\.?$|^network error$/i;
/* sem_webgl: o jogo DETECTOU que o browser não tem WebGL (driver desligado/bloqueado)
   e já exibiu o painel amigável (BUG-44). É ambiente do jogador, não defeito de código —
   não abre issue (#277/#276/#274: 3 issues automáticas pela mesma causa num dia). */
const AMBIENTE_RE = /^sem_webgl:/i;

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
  if (AMBIENTE_RE.test(String(payload.message || ''))) return 'externo';
  if (CACHE_SPLIT_RE.test(evidence)) return 'cache-split';
  if (RECOVERABLE_RE.test(evidence)) return 'recuperavel';
  if (MEDIA_ABORT_RE.test(evidence)) return 'recuperavel';
  return 'codigo';
}

/* console.error com string é linha de log, não exceção: quando o console sinaliza exceção de
   verdade o hook do cliente acha a pilha entre os argumentos e ela vem junto (BUG-72). */
export function isConsoleLog({ kind, stack } = {}) {
  return kind === 'console' && !stack;
}

// 'externo' e 'recuperavel' ficam gravados no banco, mas não consomem dispatch nem
// abrem bug do jogo: um não pertence ao jogo, o outro o jogo já contornou sozinho.
export const shouldDispatchCrash = (classification) => classification !== 'externo'
  && classification !== 'recuperavel' && classification !== 'log';

/* Mesma receita do `digital()` de `index.astro`. A multiplicação é em ponto FLUTUANTE de
   propósito: passa de 2^53 e perde precisão — `Math.imul` daria outro número (BUG-71). */
export function crashFingerprint(kind, message, source) {
  const texto = `${kind}|${message ?? ''}|${source ?? ''}`;
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return `0000000${h.toString(16)}`.slice(-8);
}

/* Fingerprint na palavra do cliente funde erros distintos num grupo só e cala todos menos
   o primeiro: vale quando é o hash do conteúdo que veio junto (BUG-71). */
export function fingerprintConfere(claimed, { kind, message, source } = {}) {
  if (typeof claimed !== 'string' || !claimed) return false;
  return claimed === crashFingerprint(kind, message, source);
}
