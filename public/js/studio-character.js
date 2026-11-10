/* Resolvedor só de navegador: pin → Blob URLs de bytes já verificados (modelo, 11 clipes, prévias),
   fail-closed com StudioCharacterError.code. Ordem e limites: docs/studio-character-release.md. */
import { VERSION } from './version.js';
import { STUDIO_CHARACTER_STATES, STUDIO_CHARACTER_SKELETON } from './data/content-releases.js';

export class StudioCharacterError extends Error {
  constructor(code, detail = '', options = undefined) {
    super(detail ? `${code}: ${detail}` : code, options);
    this.name = 'StudioCharacterError';
    this.code = code;
  }
}
const fail = (code, detail, cause) => {
  throw new StudioCharacterError(code, detail, cause === undefined ? undefined : { cause });
};

const HEX64 = /^[a-f0-9]{64}$/;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
// Teto do contrato de personagem (budgets.bytes ≤ 16 MiB) — vale mesmo se o manifesto declarar mais.
const MAX_PACK_BYTES = 16 * 1024 * 1024;
const MIME = { glb: 'model/gltf-binary', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const PREVIEW_EXT = /\.(?:png|jpe?g|webp)$/;

/* Segmentos [A-Za-z0-9_][A-Za-z0-9._-]*: sem `.`/`..`, barra inicial/dupla, `\`, `%` ou `:`.
   scripts/studio-pack-serving.mjs usa a mesma regra. */
export function isSafePackPath(path) {
  return typeof path === 'string' && path.length > 0 && path.length <= 512
    && path.split('/').every((segment) => SEGMENT.test(segment));
}

function parseVersion(text) {
  const m = typeof text === 'string' ? SEMVER.exec(text) : null;
  return m ? { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] } : null;
}
/* Precedência SemVer 2.0 (pré-release < release; identificador numérico < textual). */
export function compareRuntimeVersions(a, b) {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) throw new StudioCharacterError('studio_pin_invalid', `versão inválida: ${!x ? a : b}`);
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1;
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : (x.pre.length ? -1 : 1);
  for (let i = 0; i < Math.min(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i], q = y.pre[i];
    if (p === q) continue;
    const pn = /^\d+$/.test(p), qn = /^\d+$/.test(q);
    if (pn && qn) return Number(p) < Number(q) ? -1 : 1;
    if (pn !== qn) return pn ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return x.pre.length === y.pre.length ? 0 : (x.pre.length < y.pre.length ? -1 : 1);
}

function validatePin(pin) {
  const ok = pin && typeof pin === 'object' && pin.kind === 'character' && ID_RE.test(pin.id || '')
    && parseVersion(pin.version) && HEX64.test(pin.manifestSha256 || '') && parseVersion(pin.minRuntime)
    && typeof pin.manifestUrl === 'string' && /\/manifest\.json$/.test(pin.manifestUrl)
    && pin.skeleton === STUDIO_CHARACTER_SKELETON;
  if (!ok) fail('studio_pin_invalid', `pin de release inválido (${pin?.id ?? '?'})`);
}

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const extensionOf = (path) => path.slice(path.lastIndexOf('.') + 1).toLowerCase();

/* Valida o manifesto (já autenticado pelo hash) e devolve o plano de busca. */
function verifyManifest(manifest, pin) {
  if (!isObject(manifest) || manifest.schemaVersion !== 1) fail('studio_manifest_invalid', 'schemaVersion ≠ 1');
  if (manifest.kind !== pin.kind || manifest.id !== pin.id || manifest.version !== pin.version) {
    fail('studio_identity_mismatch', `${manifest.kind}/${manifest.id}@${manifest.version} ≠ ${pin.kind}/${pin.id}@${pin.version}`);
  }
  if (manifest.skeleton !== pin.skeleton) fail('studio_skeleton_mismatch', `${manifest.skeleton} ≠ ${pin.skeleton}`);
  for (const minimo of [pin.minRuntime, manifest.minRuntime].filter((v) => v !== undefined)) {
    if (!parseVersion(minimo)) fail('studio_manifest_invalid', `minRuntime inválido: ${minimo}`);
    if (compareRuntimeVersions(minimo, VERSION) > 0) fail('studio_runtime_too_old', `pacote exige ${minimo}, runtime é ${VERSION}`);
  }

  if (!Array.isArray(manifest.files) || !manifest.files.length) fail('studio_inventory_invalid', 'files vazio');
  const files = new Map();
  let total = 0;
  for (const entry of manifest.files) {
    if (!isObject(entry)) fail('studio_inventory_invalid', 'entrada de files não é objeto');
    if (!isSafePackPath(entry.path)) fail('studio_unsafe_path', `files: ${JSON.stringify(entry.path)}`);
    if (!HEX64.test(entry.sha256 || '') || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) {
      fail('studio_inventory_invalid', `sha256/bytes inválidos em ${entry.path}`);
    }
    if (files.has(entry.path)) fail('studio_inventory_invalid', `caminho repetido em files: ${entry.path}`);
    files.set(entry.path, { sha256: entry.sha256, bytes: entry.bytes });
    total += entry.bytes;
  }
  const budget = manifest.budgets?.bytes;
  if (!Number.isSafeInteger(budget) || budget <= 0) fail('studio_manifest_invalid', 'budgets.bytes ausente');
  if (total > Math.min(budget, MAX_PACK_BYTES)) fail('studio_budget_exceeded', `${total} bytes > ${Math.min(budget, MAX_PACK_BYTES)}`);

  const owners = new Map();
  const own = (role, path, ext) => {
    if (!isSafePackPath(path)) fail('studio_unsafe_path', `${role}: ${JSON.stringify(path)}`);
    if (ext && !ext.test(path)) fail('studio_manifest_invalid', `${role} com extensão inesperada: ${path}`);
    if (owners.has(path)) fail('studio_role_duplicate', `${path} declarado por ${owners.get(path)} e ${role}`);
    if (!files.has(path)) fail('studio_role_unknown_file', `${role} aponta para ${path}, fora de files`);
    owners.set(path, role);
  };

  own('model', manifest.model, /\.glb$/);
  if (!isObject(manifest.animations)) fail('studio_state_missing', 'animations ausente');
  for (const state of STUDIO_CHARACTER_STATES) {
    if (!Object.hasOwn(manifest.animations, state)) fail('studio_state_missing', state);
  }
  for (const state of Object.keys(manifest.animations)) {
    if (!STUDIO_CHARACTER_STATES.includes(state)) fail('studio_state_unknown', state);
    own(`animations.${state}`, manifest.animations[state], /\.glb$/);
  }
  if (!Array.isArray(manifest.previews) || !manifest.previews.length) fail('studio_manifest_invalid', 'previews vazio');
  manifest.previews.forEach((path, i) => own(`previews[${i}]`, path, PREVIEW_EXT));
  if (manifest.evidence !== undefined) {
    if (!Array.isArray(manifest.evidence)) fail('studio_manifest_invalid', 'evidence não é lista');
    manifest.evidence.forEach((path, i) => own(`evidence[${i}]`, path, null));
  }
  for (const path of files.keys()) if (!owners.has(path)) fail('studio_file_unowned', path);

  return {
    files,
    model: manifest.model,
    animations: Object.fromEntries(STUDIO_CHARACTER_STATES.map((s) => [s, manifest.animations[s]])),
    previews: [...manifest.previews],
  };
}

async function sha256Hex(subtle, bytes) {
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  let hex = '';
  for (const b of digest) hex += b.toString(16).padStart(2, '0');
  return hex;
}

async function fetchBytes(fetchImpl, url, maxBytes) {
  let res;
  try { res = await fetchImpl(url, { credentials: 'same-origin' }); }
  catch (e) { fail('studio_fetch_failed', url, e); }
  if (!res || !res.ok) fail('studio_fetch_failed', `${url} HTTP ${res?.status ?? '?'}`);
  /* Sem atalho por Content-Length: com Content-Encoding ele mede o corpo comprimido.
     O limite é aplicado enquanto o corpo decodificado chega, antes de reter bytes além do contrato. */
  const reader = res.body?.getReader?.();
  if (!reader) fail('studio_fetch_failed', `${url}: body reader indisponível`);
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        fail(maxBytes === MAX_PACK_BYTES ? 'studio_budget_exceeded' : 'studio_file_length_mismatch', `${url}: > ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } catch (e) {
    if (e instanceof StudioCharacterError) throw e;
    fail('studio_fetch_failed', url, e);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

const baseHref = () => globalThis.location?.href || 'http://localhost/';

async function resolveUncached(pin, fetchImpl, subtle) {
  validatePin(pin);
  if (!subtle || typeof subtle.digest !== 'function') fail('studio_webcrypto_unavailable', 'crypto.subtle ausente: sem verificação não há carga');
  if (typeof fetchImpl !== 'function') fail('studio_fetch_failed', 'fetch indisponível');

  const manifestUrl = new URL(pin.manifestUrl, baseHref());
  const manifestBytes = await fetchBytes(fetchImpl, manifestUrl.href, MAX_PACK_BYTES);
  const manifestSha256 = await sha256Hex(subtle, manifestBytes);
  if (manifestSha256 !== pin.manifestSha256) fail('studio_manifest_sha_mismatch', `${manifestSha256} ≠ ${pin.manifestSha256}`);
  let manifest;
  try { manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes)); }
  catch (e) { fail('studio_manifest_invalid', 'JSON ilegível', e); }
  const plan = verifyManifest(manifest, pin);

  const wanted = [plan.model, ...STUDIO_CHARACTER_STATES.map((s) => plan.animations[s]), ...plan.previews];
  const created = [];
  const settled = await Promise.allSettled(wanted.map(async (path) => {
    const entry = plan.files.get(path);
    const bytes = await fetchBytes(fetchImpl, new URL(path, manifestUrl).href, entry.bytes);
    if (bytes.byteLength !== entry.bytes) fail('studio_file_length_mismatch', `${path}: ${bytes.byteLength} ≠ ${entry.bytes}`);
    const sha256 = await sha256Hex(subtle, bytes);
    if (sha256 !== entry.sha256) fail('studio_file_sha_mismatch', `${path}: ${sha256} ≠ ${entry.sha256}`);
    const url = URL.createObjectURL(new Blob([bytes], { type: MIME[extensionOf(path)] || 'application/octet-stream' }));
    created.push(url);
    return [path, url];
  }));
  const failure = settled.find((r) => r.status === 'rejected');
  if (failure) {
    for (const url of created) URL.revokeObjectURL(url);
    const reason = failure.reason;
    throw reason instanceof StudioCharacterError ? reason : new StudioCharacterError('studio_fetch_failed', String(reason?.message || reason), { cause: reason });
  }
  const urls = new Map(settled.map((r) => r.value));
  return Object.freeze({
    kind: pin.kind,
    id: pin.id,
    version: pin.version,
    manifest,
    manifestSha256,
    modelSha256: plan.files.get(plan.model).sha256,
    modelUrl: urls.get(plan.model),
    animationUrls: Object.freeze(Object.fromEntries(STUDIO_CHARACTER_STATES.map((s) => [s, urls.get(plan.animations[s])]))),
    previewUrls: Object.freeze(plan.previews.map((path) => urls.get(path))),
  });
}


/* Cache de promessa por URL + SHA do manifesto (e identidade do pin). Sucesso fica
   para a vida da página; falha sai do cache para a próxima chamada tentar de novo. */
const _requests = new Map();
export function resolveStudioCharacter(pin, { fetchImpl = globalThis.fetch?.bind(globalThis), subtle = globalThis.crypto?.subtle } = {}) {
  const key = JSON.stringify([pin?.manifestUrl, pin?.manifestSha256, pin?.kind, pin?.id, pin?.version, pin?.minRuntime, pin?.skeleton]);
  const cached = _requests.get(key);
  if (cached) return cached;
  const request = resolveUncached(pin, fetchImpl, subtle);
  _requests.set(key, request);
  request.catch(() => { if (_requests.get(key) === request) _requests.delete(key); });
  return request;
}
