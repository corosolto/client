// Exercita NetClient e os transportes reais; só as APIs de rede do navegador são fixtures.
// O nó consome a credencial ANTES da negociação, como o nó v8 em rollback.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const selected = (process.argv.find(a => a.startsWith('--mutante=')) || '').slice(10);
const mutations = {
  'replay-ticket': ["url.searchParams.set('ticket', novoTicket);", "url.searchParams.set('ticket', ticket);", ['T1', 'T11', 'T12', 'T13', 'T7', 'T9']],
  'unsafe-no-provider': ["(!ticket || typeof this._refreshTicket === 'function')", 'true', ['T3']],
  'refresh-validation': ["if (typeof novoTicket !== 'string' || !novoTicket.trim() || novoTicket === ticket) throw new Error('ticket_refresh_invalid');", '', ['T5', 'T6']],
  'node-pin': ["refreshTicket: () => obterMpTicket('connect', no),", "refreshTicket: () => obterMpTicket('connect'),", ['T14']],
};
if (selected && !mutations[selected]) throw Error('mutante desconhecido: ' + selected);
const saved = { WebSocket: globalThis.WebSocket, WebTransport: globalThis.WebTransport };
const flush = () => new Promise(resolve => setImmediate(resolve));
const metadata = version => JSON.stringify({ type: 'welcome', protocolVersion: version, yourEnt: 1, yourTeam: 'E', espectador: false });
function fixture({ node = 8, wtFailure = '', wtVersion = node, wsVersion = node, wsProtocol = `coro-snapshot-v${node}`, wsFailure = false, anonymous = false } = {}) {
  const issued = new Map(), consumed = new Set(), attempts = [], transports = [];
  let serial = 0;
  const mint = (nonce = '') => {
    const id = ++serial;
    nonce ||= `fixture-nonce-${String(id).padStart(16, '0')}`;
    const ticket = `v1.${Buffer.from(JSON.stringify({ nonce, id })).toString('base64url')}.fixture`;
    issued.set(ticket, nonce);
    return ticket;
  };
  function authorize(url, kind, offered) {
    const ticket = new URL(url).searchParams.get('ticket') || '';
    const nonce = issued.get(ticket);
    const attempt = { kind, ticket, nonce, offered: [...offered], accepted: false, error: '' }; attempts.push(attempt);
    if (!ticket && anonymous) attempt.accepted = true;
    else if (!issued.has(ticket)) attempt.error = 'ticket_invalid';
    else if (consumed.has(nonce)) attempt.error = 'ticket_reused';
    else { consumed.add(nonce); attempt.accepted = true; }
    return attempt;
  }
  globalThis.WebSocket = class {
    constructor(url, offered) {
      this.readyState = 0; this.protocol = ''; this.closes = 0; transports.push(this);
      const auth = authorize(url, 'ws', offered);
      queueMicrotask(() => {
        if (!auth.accepted || wsFailure) { this.onerror?.(); return; }
        this.protocol = offered.includes(wsProtocol) ? wsProtocol : '';
        this.readyState = 1; this.onopen?.();
        if (this.readyState === 1) this.onmessage?.({ data: metadata(wsVersion) });
      });
    }
    send() {}
    close() { this.closes++; this.readyState = 3; queueMicrotask(() => this.onclose?.()); }
  };
  globalThis.WebTransport = class {
    constructor(url) {
      this.closes = 0; transports.push(this);
      this.closed = new Promise(resolve => { this.finish = resolve; });
      const sp = new URL(url).searchParams.get('sp');
      let auth;
      if (wtFailure === 'before-auth') {
        const ticket = new URL(url).searchParams.get('ticket') || '';
        attempts.push({ kind: 'wt', ticket, nonce: issued.get(ticket), offered: [sp], accepted: false, error: 'transport' });
      }
      else auth = authorize(url, 'wt', [sp]);
      // A ponte recusa qualquer protocolo não selecionado, inclusive seleção vazia do nó v8.
      const accepted = auth?.accepted && sp === `coro-snapshot-v${node}`;
      this.ready = accepted ? Promise.resolve() : Promise.reject(Error(auth?.error || 'snapshot_protocol_mismatch'));
      const text = new TextEncoder().encode(metadata(wtVersion));
      const frame = new Uint8Array(5 + text.length);
      new DataView(frame.buffer).setUint32(0, text.length + 1); frame[4] = 0; frame.set(text, 5);
      let controller;
      this.stream = new ReadableStream({ start(c) { controller = c; c.enqueue(frame); } });
      this.endStream = () => { try { controller.close(); } catch {} };
      const stream = { readable: this.stream, writable: new WritableStream({ write() {} }) };
      this.incomingBidirectionalStreams = new ReadableStream({ start(c) { c.enqueue(stream); c.close(); } });
      this.datagrams = { readable: new ReadableStream({ start(c) { c.close(); } }), writable: new WritableStream({ write() {} }) };
    }
    close() { this.closes++; this.endStream(); this.finish(); }
  };
  return { mint, attempts, consumed, transports };
}
async function nodePin(mainSource) {
  const extract = name => {
    const match = mainSource.match(new RegExp(`^async function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?^\\}`, 'm'));
    if (!match) throw Error('INFRA: função ausente: ' + name);
    return match[0];
  };
  const original = { id: 'br', ticketNode: 'br2', url: 'wss://br.fixture/ws' };
  const changed = { id: 'us', ticketNode: 'us1', url: 'wss://us.fixture/ws' };
  const requests = [];
  let socket;
  const context = {
    URLSearchParams, location: { search: '' }, NOS: [original, changed], NO_RE: /^[a-z]{2}\d?$/,
    mpNoAtual: original, mpConectando: false, mpTicketIdentityUid: '', nickEl: { value: '' },
    getAnonId: () => 'anon', getToken: () => '', getSessionId: () => 'session', apiUrl: value => value,
    fetch: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      context.mpNoAtual = changed;
      return { ok: true, json: async () => ({ ticket: `ticket-${requests.length}` }) };
    },
    $: () => ({ value: '' }), mpErro() {}, mpEstado() {}, window: {},
    mpTimerLista: null, clearInterval() {}, mpSessao: null,
    montarChatSala: () => ({}), tr() {}, frase() {}, TOUCH: false,
    noServeMapaParado: () => true,
    NetClient: class {
      constructor(url, options) { socket = { url, options }; }
      async connect() { await socket.options.refreshTicket(); return { map: 'fixture' }; }
    },
  };
  await vm.runInNewContext(`${extract('obterMpTicket')}\n${extract('mpEntrar')}\nmpEntrar({ id: 'sala' });`, context);
  return socket?.url === original.url && socket.options.ticket === 'ticket-1' &&
    requests.length === 2 && requests.every(r => r.node === 'br2' && r.action === 'connect') &&
    context.mpSessao?.no === original && context.mpNoAtual === changed;
}
async function measure(NetClient, mainSource) {
  const rows = [];
  async function scenario(id, options, refresh, predicate) {
    const f = fixture(options), ticket = options.anonymous ? '' : f.mint();
    let calls = 0;
    const refreshTicket = refresh ? async () => { calls++; return refresh(f, ticket); } : undefined;
    const client = new NetClient('ws://fixture.invalid/ws?keep=1', { ticket, wt: 'https://fixture.invalid/wt', room: 'sala', refreshTicket });
    let error = '';
    const connected = await client.connect(100).then(() => true, e => { error = e.message; return false; });
    try { rows.push({ id, ok: await predicate({ f, ticket, client, connected, error, calls }) }); }
    finally { client.close(); for (const transport of f.transports) transport.close(); await flush(); }
  }
  await scenario('T1', {}, f => f.mint(), async ({ f, ticket, client, connected, calls }) => {
    const before = f.attempts.length;
    const replay = new WebSocket(`ws://fixture.invalid/ws?ticket=${ticket}`, ['coro-snapshot-v8']);
    await new Promise(resolve => { replay.onerror = resolve; replay.onopen = resolve; });
    const ws = f.attempts[1];
    return connected && client.connected && client.meta.protocolVersion === 8 && calls === 1 && before === 2 &&
      f.attempts[0].kind === 'wt' && f.attempts[0].offered[0] === 'coro-snapshot-v9' &&
      ws.kind === 'ws' && ws.accepted && ws.ticket !== ticket && ws.nonce !== f.attempts[0].nonce && f.consumed.size === 2 &&
      f.attempts[2].error === 'ticket_reused' && new URL(client.url).searchParams.get('keep') === '1';
  });
  await scenario('T2', { node: 9 }, f => f.mint(), ({ f, client, connected, calls }) => connected && client.connected && client.meta.protocolVersion === 9 && client.tp.protocolo === 'coro-snapshot-v9' && calls === 0 && f.attempts.length === 1 && f.attempts[0].kind === 'wt');
  await scenario('T3', {}, null, ({ f, client, connected }) => connected && client.connected && f.attempts.length === 1 && f.attempts[0].kind === 'ws' && f.consumed.size === 1);
  await scenario('T4', {}, () => { throw Error('mint_failed'); }, ({ f, client, connected, error, calls }) => !connected && !client.connected && error === 'mint_failed' && calls === 1 && f.attempts.length === 1);
  await scenario('T5', {}, () => '', ({ f, client, connected, calls }) => !connected && !client.connected && calls === 1 && f.attempts.length === 1);
  await scenario('T6', {}, (_f, ticket) => ticket, ({ f, client, connected, calls }) => !connected && !client.connected && calls === 1 && f.attempts.length === 1);
  await scenario('T7', {}, () => 'v1.fixture.unissued', ({ f, client, connected, calls }) => !connected && !client.connected && calls === 1 && f.attempts.length === 2 && f.attempts[1].error === 'ticket_invalid');
  await scenario('T8', { node: 9, wtVersion: 8, wsVersion: 8 }, f => f.mint(), ({ f, client, connected }) => !connected && !client.connected && client.meta === null && f.attempts.length === 2 && f.transports.every(t => t.closes > 0));
  await scenario('T9', { wtFailure: 'before-auth' }, f => f.mint(), ({ f, ticket, client, connected, calls }) => connected && client.connected && calls === 1 && f.attempts.length === 2 && f.attempts[1].ticket !== ticket && !f.consumed.has(f.attempts[0].nonce) && f.consumed.size === 1);
  await scenario('T10', { anonymous: true, wtFailure: 'before-auth' }, null, ({ f, client, connected }) => connected && client.connected && f.attempts.length === 2 && f.attempts[0].kind === 'wt' && f.attempts[1].kind === 'ws' && f.attempts[1].ticket === '');
  await scenario('T11', { wsProtocol: '' }, f => f.mint(), ({ f, client, connected }) => !connected && !client.connected && client.meta === null && f.attempts.length === 2 && f.attempts[1].accepted);
  await scenario('T12', { wsFailure: true }, f => f.mint(), ({ f, client, connected }) => !connected && !client.connected && client.meta === null && f.attempts.length === 2 && f.attempts[1].accepted);
  await scenario('T13', {}, f => f.mint(f.attempts[0].nonce), ({ f, ticket, client, connected }) => !connected && !client.connected && f.attempts.length === 2 && f.attempts[1].ticket !== ticket && f.attempts[1].error === 'ticket_reused' && f.consumed.size === 1);
  rows.push({ id: 'T14', ok: await nodePin(mainSource) });
  return rows.filter(row => !row.ok).map(row => row.id).sort();
}
async function run(mutant) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rede3p-ticket-'));
  try {
    let source = fs.readFileSync(path.join(root, 'public/js/net.js'), 'utf8');
    let mainSource = fs.readFileSync(path.join(root, 'public/js/main.js'), 'utf8');
    if (mutant) {
      const [from, to] = mutations[mutant];
      let target = mutant === 'node-pin' ? mainSource : source;
      if (target.split(from).length !== 2) throw Error('INFRA: âncora ausente/ambígua: ' + mutant);
      target = target.replace(from, to);
      if (mutant === 'node-pin') mainSource = target; else source = target;
    }
    source = source.replace(/from '\.\/([^']+)'/g, (_m, file) => `from '${pathToFileURL(path.join(root, 'public/js', file)).href}'`);
    const file = path.join(temp, 'net.mjs'); fs.writeFileSync(file, source);
    const { NetClient } = await import(pathToFileURL(file).href);
    return await measure(NetClient, mainSource);
  } finally { fs.rmSync(temp, { recursive: true }); }
}
try {
  const nominal = await run('');
  if (nominal.length) { console.log(JSON.stringify({ status: 'RED', cases: 14, failed: nominal })); process.exitCode = 1; }
  else {
    const failed = selected ? await run(selected) : [], expected = selected ? mutations[selected][2] : [];
    const pass = JSON.stringify(failed) === JSON.stringify(expected);
    console.log(JSON.stringify({ status: pass ? (selected ? 'DETECTED' : 'GREEN') : 'RED', cases: 14, mutant: selected, failed, expected }));
    process.exitCode = pass ? 0 : 1;
  }
} finally { globalThis.WebSocket = saved.WebSocket; globalThis.WebTransport = saved.WebTransport; }
