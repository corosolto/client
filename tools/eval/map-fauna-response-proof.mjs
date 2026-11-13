// QA: bytes do request original; nenhum refetch ou hash de manifesto como medição.
import { createHash } from 'node:crypto';
const BODY_CAP = 8 * 1024 * 1024;
const HEX = /^[0-9a-f]{64}$/;
const nonempty = value => typeof value === 'string' && value.length > 0;
const detail = error => String(error?.message || error).slice(0, 400);
export function faunaDeadline(value, label, ms = 90000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(label + ': deadline')), ms);
    Promise.resolve(value).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
export const FAUNA_BODY_EVENTS = ['Network.requestWillBeSent', 'Network.responseReceived', 'Network.dataReceived', 'Network.loadingFinished', 'Network.loadingFailed'];
const exactAbort = value => value?.kind === 'failed' && value.errorText === 'net::ERR_ABORTED' && value.canceled === true && value.blockedReason === null && value.corsErrorStatus === null;
function revisionURL(value, path, documentURL) {
  const doc = new URL(documentURL), url = new URL(value);
  return ['http:', 'https:'].includes(doc.protocol) && url.origin === doc.origin
    && url.pathname === new URL('/' + path, doc).pathname && !url.hash && !url.username && !url.password
    && [...url.searchParams.keys()].join(',') === 'v' && nonempty(url.searchParams.get('v'));
}
export function faunaDocumentURL(base, map) {
  const root = new URL(base);
  if (!['http:', 'https:'].includes(root.protocol) || root.search || root.hash || root.username || root.password
    || typeof map !== 'string' || !/^[a-z][a-z0-9_]*$/.test(map)) throw Error('BASE/mapa de navegação inválido');
  return root.href.replace(/\/$/, '') + '/mapview.html?map=' + encodeURIComponent(map) + '&hud=0&capture';
}
// Usado pelo auditor e pelo observador real; expectedURL vem de assetUrl do produto.
export function faunaResponseError(response, ref, animal, document, expectedURL, expectedDocumentURL) {
  try {
    if (!document || !nonempty(document.url) || !nonempty(document.frameId) || !nonempty(document.loaderId) || !nonempty(document.requestId)) return 'documento atual ausente';
    if (!nonempty(expectedDocumentURL) || document.url !== expectedDocumentURL) return 'documento não corresponde à BASE/path/mapa esperados';
    if (!ref || !HEX.test(ref.sha256 || '') || animal?.source !== 'gltf' || animal.assetId !== ref.assetId || animal.assetPath !== ref.path) return 'animal/referência incompatível';
    if (!revisionURL(expectedURL, ref.path, document.url) || animal.assetURL !== expectedURL) return 'URL canônica revisionada incompatível';
    if (!response || response.complete !== true || !nonempty(response.requestId) || response.loaderId !== document.loaderId
      || response.frameId !== document.frameId || response.documentURL !== document.url) return 'request fora do documento/frame/loader atual';
    if (response.url !== expectedURL || response.responseURL !== expectedURL || response.status !== 200) return 'URL/status do request original incompatível';
    if (typeof response.sha256 !== 'string' || !HEX.test(response.sha256) || response.sha256 !== ref.sha256) return 'SHA256 dos bytes recebidos diverge da referência';
    if (!Number.isSafeInteger(response.byteLength) || response.byteLength <= 0 || response.byteLength > BODY_CAP) return 'bytes decodificados ausentes/inválidos';
    if ((document.sessionId !== undefined || response.sessionId !== undefined) && response.sessionId !== document.sessionId) return 'session fora do documento atual';
    const body = response.body, terminal = response.transportTerminal;
    if (!body || body.complete !== true || body.sha256 !== response.sha256 || body.byteLength !== response.byteLength) return 'BODY integral não comprovado';
    if (terminal?.kind === 'finished') {
      if (body.source !== 'Network.getResponseBody') return 'corpo finished sem getBody original';
    } else {
      const a = body.accounting, record = response.gltfRecord;
      if (!exactAbort(terminal) || body.source !== 'Network.streamResourceContent' || !a || a.ackComplete !== true) return 'terminal falho sem prova stream elegível';
      if (![a.prefixBytes,a.chunkBytes,a.decodedDataLength,a.dataLengthWithoutData,a.events].every(n => Number.isSafeInteger(n) && n >= 0)
        || a.prefixBytes !== a.dataLengthWithoutData || a.prefixBytes + a.chunkBytes !== response.byteLength || a.decodedDataLength !== response.byteLength || a.events < 1) return 'contabilidade do stream incompleta';
      if (!record || record.map !== new URL(document.url).searchParams.get('map') || record.documentURL !== document.url || record.source !== 'gltf'
        || record.assetId !== ref.assetId || record.assetPath !== ref.path || record.assetURL !== expectedURL || !nonempty(record.path)
        || !HEX.test(record.sha256 || '') || !Number.isSafeInteger(record.byteLength) || record.byteLength <= 0 || record.byteLength > 2 * 1024 * 1024) return 'registro GLTF preproof ausente/divergente';
    }
    return '';
  } catch { return 'prova de resposta malformada'; }
}
export function createFaunaBodyObserver({ send, subscribe, drain, paths, base, deadlineMs = 90000,
  digest = bytes => createHash('sha256').update(bytes).digest('hex') }) {
  if (typeof send !== 'function' || (!subscribe && !drain) || !Array.isArray(paths) || !paths.length
    || !Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) throw Error('Configuração do observador inválida');
  faunaDocumentURL(base, 'scope');
  const live = typeof subscribe === 'function' && !drain;
  const targets = new Set(paths.map(path => '/' + path)), rows = new Map(), documents = new Map(), tasks = new Set(), proved = new Set(), links = new Map(), cancellations = new Set();
  let started = false, closing = false, closingWorkObserved = false, closed = false, unsubscribe = null, fatal = null, drainTail = Promise.resolve(), revision = 0, heldBytes = 0;
  const fail = error => { fatal ||= Error('fauna body: ' + detail(error)); };
  const bounded = (value, label) => new Promise((resolve, reject) => {
    let timer;
    const stop = () => { clearTimeout(timer); cancellations.delete(stop); reject(Error(label + ': observer closed')); };
    const finish = fn => result => { clearTimeout(timer); cancellations.delete(stop); fn(result); };
    timer = setTimeout(finish(reject), deadlineMs, Error(label + ': deadline'));
    cancellations.add(stop);Promise.resolve(value).then(finish(resolve), finish(reject));
  });
  const command = (method, params = {}) => {
    if ((closing || closed) && method !== 'Network.disable') return Promise.reject(Error('observer closed before ' + method));
    try { return bounded(send(method, params), method); } catch (error) { return Promise.reject(error); }
  };
  const track = work => {
    if (closing) closingWorkObserved = true;
    const settled = Promise.resolve(work).then(value => { tasks.delete(settled);return value; }, error => { tasks.delete(settled);fail(error); });
    tasks.add(settled);return settled;
  };
  const ensure = () => { if (closing || closed || !started) throw Error('Observador não está ativo'); if (fatal) throw fatal; };
  const pathname = value => { try { return new URL(value).pathname; } catch { return ''; } };
  const reserve = bytes => {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > BODY_CAP || heldBytes + bytes > BODY_CAP * 2) throw Error('cap de bytes8MiB/corpo ou16MiB total');
    heldBytes += bytes;
  };
  function base64Size(value, expected) {
    if (typeof value !== 'string' || value.length > Math.ceil(BODY_CAP / 3) * 4 || value.length % 4 !== 0) throw Error('base64 inválido/excessivo');
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0, size = value.length / 4 * 3 - padding;
    if (size > BODY_CAP) throw Error('cap de bytes8MiB/corpo ou16MiB total');
    let last = 0;
    for (let i = 0; i < value.length - padding; i++) {
      const c = value.charCodeAt(i);
      last = c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 71 : c >= 48 && c <= 57 ? c + 4 : c === 43 ? 62 : c === 47 ? 63 : -1;
      if (last < 0) throw Error('base64 inválido/excessivo');
    }
    if (padding && (value.length < 4 || (last & (padding === 2 ? 15 : 3)))) throw Error('base64 não canônico');
    if (expected !== undefined && expected !== size) throw Error('dataLength diverge dos bytes do chunk');
    return size;
  }
  function decode64(value, expected) {
    const size = base64Size(value, expected);reserve(size);
    try { const bytes = Buffer.from(value, 'base64'); if (bytes.length !== size || bytes.toString('base64') !== value) throw Error('base64 não canônico'); return bytes; }
    catch (error) { heldBytes -= size; throw error; }
  }
  const releaseStream = row => {
    const s = row.stream;if (!s) return;
    heldBytes -= s.retained;s.retained = 0;s.prefix = null;s.chunks.length = 0;
  };
  function arm(row) {
    const s = row.stream = { ack: false, prefix: null, chunks: [], retained: 0, prefixBytes: 0, chunkBytes: 0, decoded: 0, withoutData: 0, encoded: 0, events: 0, lastTimestamp: -1, signatures: new Set() };
    s.work = track((async () => {
      try {
        const value = await command('Network.streamResourceContent', { requestId: row.requestId });
        if (closing || closed || row.error) return;
        s.prefix = decode64(value?.bufferedData);s.prefixBytes = s.prefix.length;s.retained += s.prefix.length;s.ack = true;revision++;
        if (s.prefixBytes + s.chunkBytes > BODY_CAP) throw Error('stream corpo8MiB excedido');
      } catch (error) { row.error ||= detail(error);row.state = 'failed';revision++;releaseStream(row); }
    })());
  }
  async function measured(row, bytes, source, accounting) {
    const real = createHash('sha256').update(bytes).digest('hex');
    const injected = await bounded(Promise.resolve().then(() => digest(bytes)), 'SHA256');
    if (typeof injected !== 'string' || !HEX.test(injected) || injected !== real) throw Error('digest inválido ou divergente do SHA256 real');
    if (closing || closed || row.error) throw Error(row.error || 'observer closed during digest');
    row.sha256 = real;row.byteLength = bytes.length;row.body = { complete: true, source, sha256: real, byteLength: bytes.length, ...(accounting ? { accounting } : {}) };row.state = 'complete';revision++;
  }
  function readBody(row) {
    row.state = 'digest-pending';
    row.work = track((async () => {
      let bytes, ownedBytes = 0;
      try {
        if (row.stream) await row.stream.work;
        if (closing || closed || row.error) throw Error(row.error || 'observer closed');
        if (row.stream && (!row.stream.ack || row.stream.prefixBytes !== row.stream.withoutData || row.stream.prefixBytes + row.stream.chunkBytes !== row.stream.decoded || !row.stream.decoded)) throw Error('stream ACK/contabilidade incompleta ou gap');
        if (row.transportTerminal.kind === 'failed') {
          const s = row.stream;
          if (!s?.ack || !s.prefix || s.prefixBytes !== s.withoutData || s.prefixBytes + s.chunkBytes !== s.decoded || !s.decoded) throw Error('stream ACK/contabilidade incompleta ou gap');
          reserve(s.decoded);ownedBytes = s.decoded;bytes = Buffer.concat([s.prefix, ...s.chunks], s.decoded);
          const accounting = { ackComplete: true, prefixBytes: s.prefixBytes, chunkBytes: s.chunkBytes, decodedDataLength: s.decoded, dataLengthWithoutData: s.withoutData, events: s.events };
          releaseStream(row);await measured(row, bytes, 'Network.streamResourceContent', accounting);
        } else {
          releaseStream(row);
          const value = await command('Network.getResponseBody', { requestId: row.requestId });
          if (!value || typeof value.body !== 'string' || typeof value.base64Encoded !== 'boolean' || value.body.length > BODY_CAP * 2) throw Error('corpo CDP ausente/excessivo');
          if (value.base64Encoded) { bytes = decode64(value.body);ownedBytes = bytes.length; }
          else { const size = Buffer.byteLength(value.body);reserve(size);ownedBytes = size;bytes = Buffer.from(value.body, 'utf8'); }
          if (!bytes.length) throw Error('corpo decodificado inválido');
          await measured(row, bytes, 'Network.getResponseBody');
        }
      } catch (error) { row.error ||= detail(error);row.state = 'failed';revision++; }
      finally { heldBytes -= ownedBytes;releaseStream(row); }
    })());
  }
  async function readPreproof(preproof, map, documentURL, requirements) {
    if (!preproof) return null;
    const fs = await import('node:fs/promises'), path = await import('node:path'), { constants } = await import('node:fs');
    if (!nonempty(preproof.dir) || !path.isAbsolute(preproof.dir) || await fs.realpath(preproof.dir) !== preproof.dir
      || preproof.path !== path.join(preproof.dir, 'map-fauna-preproof-' + map + '.json') || !HEX.test(preproof.sha256 || '')
      || !Number.isSafeInteger(preproof.byteLength) || preproof.byteLength <= 0 || preproof.byteLength > 2 * 1024 * 1024) throw Error('preproof identidade/dir/mapa inválidos');
    const file = await fs.open(preproof.path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const before = await file.stat();if (!before.isFile() || before.size !== preproof.byteLength) throw Error('preproof tamanho inválido');
      const buffer = Buffer.alloc(preproof.byteLength + 1);let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
        if (!Number.isSafeInteger(bytesRead) || bytesRead < 0 || bytesRead > buffer.length - length) throw Error('preproof leitura inválida');
        if (!bytesRead) break;length += bytesRead;
      }
      const bytes = buffer.subarray(0, length), after = await file.stat();
      if (!after.isFile() || bytes.length !== before.size || after.size !== before.size || before.dev !== after.dev || before.ino !== after.ino
        || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || createHash('sha256').update(bytes).digest('hex') !== preproof.sha256) throw Error('preproof alterado/SHA divergente');
      const value = JSON.parse(bytes.toString('utf8')), record = value.record;
      if (value.scope !== 'GLTF record before network proof; not acceptance' || record?.map !== map || record.documentURL !== documentURL || !Array.isArray(record.animals) || !record.animals.length) throw Error('preproof documento/GLTF ausente');
      for (const animal of record.animals) {
        const ref = requirements.find(r => r.url === animal.assetURL);
        if (!ref || animal.source !== 'gltf' || animal.assetId !== ref.assetId || animal.assetPath !== ref.path || !record.declaredPreload?.includes(ref.assetId)) throw Error('preproof animal/referência incompatível');
      }
      if (requirements.some(ref => !record.animals.some(a => a.assetURL === ref.url))) throw Error('preproof não cobre os modelos atuais');
      return { map, documentURL, path: preproof.path, sha256: preproof.sha256, byteLength: bytes.length };
    } finally { await file.close(); }
  }
  function responseFor(row, record, ref) {
    return { complete: row.state === 'complete', requestId: row.requestId, frameId: row.frameId, loaderId: row.loaderId, documentURL: row.documentURL,
      url: row.url, responseURL: row.responseURL, status: row.status, sha256: row.sha256, byteLength: row.byteLength, body: row.body,
      ...(row.sessionId === undefined ? {} : { sessionId: row.sessionId }), transportTerminal: row.transportTerminal, ...(record ? { gltfRecord: { ...record, source: 'gltf', assetId: ref.assetId, assetPath: ref.path, assetURL: ref.url } } : {}) };
  }
  async function validateLink(link) {
    const { document, ref, requestId, expectedDocumentURL } = link;
    const docs = [...documents.values()].filter(row => row.frameId === document.frameId && row.loaderId === document.loaderId);
    if (docs.length !== 1 || docs[0].error || !docs[0].finished || docs[0].status !== 200 || docs[0].url !== document.url || docs[0].requestId !== document.requestId) throw Error('Documento original ausente/ambíguo/redirect');
    const candidates = [...rows.values()].filter(row => row.frameId === document.frameId && row.loaderId === document.loaderId && pathname(row.url) === pathname(ref.url));
    if (candidates.length !== 1 || candidates[0].requestId !== requestId || candidates[0].error || candidates[0].state !== 'complete') throw Error('Carga provada tardia ambígua/incompleta');
    const record = await bounded(readPreproof(link.preproof, link.map, document.url, link.requirements), 'preproof revalidation');
    const error = faunaResponseError(responseFor(candidates[0], record, ref), ref, { source: 'gltf', assetId: ref.assetId, assetPath: ref.path, assetURL: ref.url }, document, ref.url, expectedDocumentURL);
    if (error) throw Error(error);
  }
  function accept(event) {
    if (closed) return;
    try {
      const p = event?.params || {}, method = event?.method, sessionId = event?.sessionId ?? p.sessionId;
      if (method === 'Network.requestWillBeSent' && p.type === 'Document') {
        revision++;
        if (!nonempty(p.requestId) || documents.size >= 32) throw Error('Censo de documentos inválido');
        if (documents.has(p.requestId)) { documents.get(p.requestId).error ||= 'redirect/reuso de requestId do documento'; return; }
        documents.set(p.requestId, { requestId: p.requestId, frameId: p.frameId, loaderId: p.loaderId, url: p.request?.url, sessionId, error: p.redirectResponse || p.request?.method !== 'GET' ? 'documento redirecionado/método inválido' : null });return;
      }
      const doc = documents.get(p.requestId);
      if (doc) {
        revision++;if (sessionId !== undefined && sessionId !== doc.sessionId) doc.error ||= 'session do documento divergente';
        if (method === 'Network.responseReceived') {
          if (doc.status !== undefined || p.frameId !== doc.frameId || p.loaderId !== doc.loaderId || p.response?.url !== doc.url) doc.error ||= 'resposta de documento divergente';doc.status = p.response?.status;
        } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') {
          if (doc.terminal) doc.error ||= 'terminal de documento duplicado';else doc.terminal = method;
          if (method === 'Network.loadingFinished') doc.finished = true;else doc.error ||= 'documento loadingFailed';
        }return;
      }
      if (method === 'Network.requestWillBeSent') {
        if (!targets.has(pathname(p.request?.url))) return;
        revision++;
        if (!nonempty(p.requestId) || rows.size >= 16) throw Error('request ausente ou censo16 excedido');
        if (rows.has(p.requestId)) { rows.get(p.requestId).error ||= 'requestId reutilizado/redirect';return; }
        const row = { requestId: p.requestId, loaderId: p.loaderId, frameId: p.frameId, documentURL: p.documentURL, url: p.request.url, sessionId, state: 'requested', error: p.redirectResponse || p.request.method !== 'GET' ? 'redirect/método inválido' : null };
        rows.set(p.requestId, row);if (live && !row.error) arm(row);return;
      }
      const row = rows.get(p.requestId);if (!row) return;
      revision++;if (sessionId !== undefined && sessionId !== row.sessionId) row.error ||= 'session do request divergente';
      if (method === 'Network.responseReceived') {
        if (row.responseURL !== undefined || p.loaderId !== row.loaderId || p.frameId !== row.frameId) row.error ||= 'resposta duplicada ou frame/loader divergente';
        row.responseURL = p.response?.url;row.status = p.response?.status;
        if (row.responseURL !== row.url || row.status !== 200) row.error ||= 'URL/status da resposta inválido';
      } else if (method === 'Network.dataReceived' && row.stream) {
        if (row.transportTerminal) throw Error(row.error || 'chunk após terminal');
        const s = row.stream;
        if (!Number.isSafeInteger(p.dataLength) || p.dataLength < 0 || !Number.isSafeInteger(p.encodedDataLength) || p.encodedDataLength < 0 || !Number.isFinite(p.timestamp) || p.timestamp < s.lastTimestamp || ++s.events > 65536) throw Error('contadores/ordem/cap de eventos do stream inválidos');
        s.decoded += p.dataLength;s.encoded += p.encodedDataLength;
        if (!Number.isSafeInteger(s.encoded) || s.decoded > BODY_CAP) throw Error('cap/contadores do stream excedidos');
        const size = p.data === undefined ? 0 : base64Size(p.data, p.dataLength);
        if (heldBytes + size > BODY_CAP * 2) throw Error('cap de bytes8MiB/corpo ou16MiB total');
        const signature = [p.timestamp, p.dataLength, p.encodedDataLength, p.data === undefined ? '-' : createHash('sha256').update(p.data).digest('hex')].join(':');
        if (s.signatures.has(signature)) throw Error('chunk duplicado');s.signatures.add(signature);s.lastTimestamp = p.timestamp;
        if (p.data === undefined) s.withoutData += p.dataLength;
        else { const bytes = decode64(p.data, p.dataLength);s.chunks.push(bytes);s.retained += bytes.length;s.chunkBytes += bytes.length; }
      } else if (method === 'Network.loadingFailed' || method === 'Network.loadingFinished') {
        if (row.transportTerminal) { row.error ||= 'terminal duplicado: ' + detail(p.errorText || method);return; }
        row.transportTerminal = method === 'Network.loadingFinished' ? { kind: 'finished' } : { kind: 'failed', errorText: p.errorText ?? null, canceled: p.canceled ?? null, blockedReason: p.blockedReason ?? null, corsErrorStatus: p.corsErrorStatus ?? null };
        if (row.error || row.responseURL === undefined) { row.state = 'failed';row.error ||= 'resposta ausente'; }
        else if (row.transportTerminal.kind === 'failed' && (!row.stream || !exactAbort(row.transportTerminal))) { row.error ||= 'loadingFailed: ' + String(p.errorText).slice(0, 160);row.state = 'failed'; }
        else readBody(row);
      }
    } catch (error) { fail(error); }
  }
  async function pump() {
    if (!drain) return;
    const current = drainTail.then(() => bounded(Promise.resolve().then(drain), 'event drain'));
    drainTail = current.catch(() => {});
    const events = await current;if (!Array.isArray(events)) throw Error('event drain inválido');
    for (const event of events) accept(event);
  }
  return {
    async start() {
      if (started || closed) throw Error('Observador já iniciado/fechado');started = true;
      if (subscribe) { unsubscribe = subscribe(accept);if (typeof unsubscribe !== 'function') throw Error('Remoção do listener ausente'); }
      await command('Network.enable', { maxTotalBufferSize: BODY_CAP * 2, maxResourceBufferSize: BODY_CAP });
    },
    navigationURL: map => faunaDocumentURL(base, map),
    async prove({ map, documentURL, requirements, preproof }) {
      const expectedDocumentURL = faunaDocumentURL(base, map);
      if (documentURL !== expectedDocumentURL) throw Error('Documento observado difere da navegação esperada');
      ensure();await pump();ensure();
      const frame = (await command('Page.getFrameTree'))?.frameTree?.frame;
      if (!frame || frame.parentId || !nonempty(frame.id) || !nonempty(frame.loaderId) || frame.url !== documentURL) throw Error('Documento atual CDP não confere');
      const docs = [...documents.values()].filter(row => row.frameId === frame.id && row.loaderId === frame.loaderId);
      if (docs.length !== 1 || docs[0].error || !docs[0].finished || docs[0].status !== 200 || docs[0].url !== expectedDocumentURL) throw Error('Documento original ausente/ambíguo/redirect');
      const document = { url: frame.url, frameId: frame.id, loaderId: frame.loaderId, requestId: docs[0].requestId, ...(docs[0].sessionId === undefined ? {} : { sessionId: docs[0].sessionId }) }, proofs = {}, selectedLinks = [];
      if (!Array.isArray(requirements) || !requirements.length) throw Error('Animais esperados ausentes');
      const record = await bounded(readPreproof(preproof, map, documentURL, requirements), 'preproof');
      for (const ref of requirements) {
        if (!revisionURL(ref.url, ref.path, documentURL) || !HEX.test(ref.sha256 || '') || !nonempty(ref.assetId)) throw Error('Requisito original inválido');
        const end = Date.now() + deadlineMs;let selected;
        for (;;) {
          await pump();ensure();
          const candidates = [...rows.values()].filter(row => row.frameId === frame.id && row.loaderId === frame.loaderId && pathname(row.url) === pathname(ref.url));
          if (candidates.length > 1) throw Error('Carga GLB ambígua no documento atual');selected = candidates[0];
          if (selected?.error) throw Error('Carga GLB falhou: ' + selected.error);
          if (selected && selected.documentURL !== documentURL) throw Error('request documentURL divergente');
          if (selected?.state === 'complete') {
            await selected.work;ensure();
            if (selected.error || selected.state !== 'complete') throw Error('Carga GLB falhou: ' + (selected.error || selected.state));
            break;
          }
          if (Date.now() >= end) throw Error('Carga GLB ausente/pendente: deadline');await new Promise(resolve => setTimeout(resolve, Math.min(20, deadlineMs)));
        }
        const response = responseFor(selected, record, ref);
        const error = faunaResponseError(response, ref, { source: 'gltf', assetId: ref.assetId, assetPath: ref.path, assetURL: ref.url }, document, ref.url, expectedDocumentURL);
        if (error) throw Error(error);
        proofs[ref.url] = response;proved.add(selected);selectedLinks.push({ document: { ...document }, ref: { ...ref }, requestId: selected.requestId, expectedDocumentURL, map, preproof, requirements });
      }
      await pump();ensure();const atDecision = revision;
      const after = (await command('Page.getFrameTree'))?.frameTree?.frame;
      for (const link of selectedLinks) await validateLink(link);
      await pump();ensure();
      if (revision !== atDecision) throw Error('Rede mudou durante o snapshot final');
      if (after?.id !== frame.id || after?.loaderId !== frame.loaderId || after?.url !== frame.url) throw Error('Documento mudou durante a prova');
      for (const link of selectedLinks) links.set(JSON.stringify([link.document.frameId, link.document.loaderId, pathname(link.ref.url)]), link);
      return { document, proofs };
    },
    async close() {
      if (closed) return;
      closingWorkObserved ||= tasks.size > 0;closing = true;
      const errors = [];
      try { if (started) await faunaDeadline(pump(), 'cleanup drain', Math.min(deadlineMs, 1000)); } catch (error) { errors.push(detail(error)); }
      if (closingWorkObserved || tasks.size) errors.push('pending body/ACK work at close');
      for (const stop of [...cancellations]) stop();
      try { if (started) await faunaDeadline(command('Network.disable'), 'Network.disable cleanup', Math.min(deadlineMs, 5000)); } catch (error) { errors.push(detail(error)); }
      try { if (started) await faunaDeadline(pump(), 'final cleanup drain', Math.min(deadlineMs, 1000)); } catch (error) { errors.push(detail(error)); }
      closed = true;try { unsubscribe?.(); } catch (error) { errors.push(detail(error)); }
      for (const stop of [...cancellations]) stop();
      try { await faunaDeadline(Promise.all([...tasks]), 'digest cleanup', Math.min(deadlineMs, 1000)); } catch (error) { errors.push(detail(error)); }
      if (closingWorkObserved && !errors.includes('pending body/ACK work at close')) errors.push('pending body/ACK work at close');
      if (fatal) errors.push(detail(fatal));
      for (const row of proved) if (row.error || row.state !== 'complete') errors.push(row.error || 'prova tardia incompleta');
      for (const link of links.values()) { try { await validateLink(link); } catch (error) { errors.push(detail(error)); } }
      for (const row of rows.values()) releaseStream(row);
      if (tasks.size || cancellations.size || heldBytes !== 0) errors.push('pending tasks/timers/buffers after cleanup');
      if (errors.length) throw Error('fauna body cleanup: ' + errors.join('; '));
    },
    diagnostics: () => ({ started, closed, pending: tasks.size, requests: rows.size, proved: proved.size, bindings: links.size, timers: cancellations.size, heldBytes }),
  };
}

export function createPlaywrightFaunaObserver(cdp, paths, options = {}) {
  return createFaunaBodyObserver({ ...options, paths, send: (method, params) => cdp.send(method, params),
    subscribe: accept => {
      const listeners = FAUNA_BODY_EVENTS.map(method => [method, params => accept({ method, params })]);
      for (const [method, listener] of listeners) cdp.on(method, listener);
      return () => { for (const [method, listener] of listeners) cdp.off(method, listener); };
    } });
}
export function createEgoFaunaObserver(page, paths, options = {}) {
  return createFaunaBodyObserver({ ...options, paths, send: (method, params) => page.cdp(method, params), drain: () => page.events() });
}
