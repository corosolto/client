/* boot-overlay.mjs — helpers puros do overlay coerente do grafo local `public/js`. O gate (boot-orcamento-check.mjs) importa daqui; nada aqui toca browser nem disco além da leitura do grafo local. Contrato financeiro e taxonomia INFRA3 estão em docs/visual-consistency/BOOT-COHERENT-OVERLAY.md. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* Os três corpos isentos continuam os ÚNICOS com carga zero; aumentar esta lista
   é afrouxar o ORC1 e exige série fria nova (docs, lei 2). */
export const JS_EXCLUSOS = ['js/main.js', 'js/client-id.js', 'js/textures.js'];

export class InfraError extends Error {
  constructor(msg) { super(msg); this.code = 3; }
}

export function carregaModulosLocais(publicRoot) {
  const raizJs = new URL('js/', publicRoot);
  const mods = new Map();
  const anda = (dir, prefixo) => {
    for (const nome of readdirSync(dir)) {
      const caminho = new URL(`${prefixo}${nome}`, raizJs);
      const alvo = fileURLToPath(caminho);
      if (statSync(alvo).isDirectory()) { anda(alvo, `${prefixo}${nome}/`); continue; }
      if (!nome.endsWith('.js')) continue;
      const rel = `js/${prefixo}${nome}`;
      const corpo = readFileSync(alvo, 'utf8');
      mods.set(rel, { corpo, bytes: Buffer.byteLength(corpo, 'utf8') });
    }
  };
  anda(fileURLToPath(raizJs), '');
  if (mods.size === 0) throw new InfraError(`nenhum módulo local em ${raizJs}`);
  return mods;
}

/* Chave de cobrança: URL RESOLVIDA (query preserva identidade, hash não);
   `includes(path)` esconde duplicatas de query e é proibido no gate. */
export function chaveDeCarga(url) {
  const u = new URL(url);
  u.hash = '';
  return u.href;
}

/* `js/**` do request → caminho relativo ao public local; fora do escopo ou com
   travessia (inclusive %2e%2e) devolve null e o gate repassa ao origin. */
export function relDeUrl(url) {
  const u = new URL(url);
  const partes = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (partes[0] !== 'js') return null;
  if (!partes.every((p) => p && p !== '.' && !p.includes('\\') && !p.split('/').includes('..'))) return null;
  const rel = partes.join('/');
  return rel.endsWith('.js') ? rel : null;
}

/* Só é overlay quando o corpo LOCAL difere do host (ou o host não tem o arquivo);
   byte-idêntico volta pela resposta original da rede. */
export function decideOverlay({ local, hostStatus, hostCorpo }) {
  if (!local) return 'host';
  if (hostStatus === 200 && hostCorpo === local.corpo) return 'host';
  return 'local';
}

export function validaEnc(enc) {
  if (!Number.isFinite(enc) || enc < 0) throw new InfraError(`encodedDataLength inválido: ${enc}`);
  return enc;
}

// Payload realmente servido é o piso; contrato em docs/visual-consistency/BOOT-COHERENT-OVERLAY.md.
export function cargaOverlay(enc, payloadBytes) {
  if (!Number.isFinite(payloadBytes) || payloadBytes < 0) throw new InfraError('tamanho do payload inválido');
  return Math.max(validaEnc(enc), payloadBytes);
}

/* Trilha do request: erro de rede é INFRA3; pendência sem fim nem erro é legal
   (termina depois do portão) e só fica registrada fora do ORC1. */
export function confereTrilha(r) {
  if (r.erro) throw new InfraError(`request com erro: ${r.url} (${r.erro})`);
  if (r.fim !== null && !Number.isFinite(r.fim)) throw new InfraError(`fim de request inválido p/ ${r.url}`);
  return r;
}

/* Partição portão: `ate` alimenta ORC1; `depois` é registrada, nunca omitida. */
export function particiona(reqs, portao, tolerancia = 50) {
  const ate = [], depois = [];
  for (const r of reqs) {
    if (r.fim !== null && r.fim <= portao + tolerancia) ate.push(r);
    else depois.push(r);
  }
  return { ate, depois };
}

/* Soma ORC1 por chave resolvida: isentas=0; sobrepostas=cargaOverlay; demais=encoded. */
export function somaCargas({ ate, isentas, sobrepostos }) {
  const cargas = new Map();
  let total = 0;
  for (const r of ate) {
    confereTrilha(r);
    const k = chaveDeCarga(r.url);
    let b;
    validaEnc(r.bytes);
    if (isentas.has(k)) b = 0;
    else if (sobrepostos.has(k)) b = cargaOverlay(validaEnc(r.bytes), sobrepostos.get(k));
    else b = validaEnc(r.bytes);
    cargas.set(k, (cargas.get(k) || 0) + b);
    total += b;
  }
  return { total, cargas };
}

/* ── self-test puro (sem navegador): node tools/eval/boot-overlay.mjs --self-test ── */
// Cancelamentos observados da UI continuam na contagem e no custo recebido do CDP.
export function cancelaUi(r,e,base) {
  const u=new URL(r.url),b=new URL(base);
  return e.canceled===true && e.errorText==='net::ERR_ABORTED' && !e.blockedReason && !e.corsErrorStatus
    && ['Other','Image'].includes(e.type) && u.origin===b.origin
    && (u.pathname==='/favicon.ico' || u.pathname==='/img/treta/coin-classic-saci.webp');
}
export function prefixoRecebido(r) {
  return validaEnc(r.recebidoResposta)+validaEnc(r.recebidoChunks);
}

export function aceitaMutante(nome, falhas) {
  if (!Array.isArray(falhas) || new Set(falhas).size!==falhas.length) return false;
  const chave=[...falhas].sort().join(',');
  return nome==='fauna-cedo' ? ['ORC3','ORC1,ORC3'].includes(chave)
    : nome==='cartaz-ansioso' ? ['ORC2','ORC1,ORC2'].includes(chave) : false;
}

export function selfTest() {
  const falhas = [];
  const t = (nome, fn) => {
    try { fn(); console.log(`ok  ${nome}`); }
    catch (e) { falhas.push(`${nome}: ${e.message}`); console.error(`FALHA  ${nome}: ${e.message}`); }
  };
  const eq = (a, b, msg = '') => { if (a !== b) throw new Error(`${msg} esperado ${b}, veio ${a}`); };
  const lancaInfra = (fn) => { try { fn(); } catch (e) { if (e.code !== 3) throw new Error(`não foi INFRA3: ${e}`); return; } throw new Error('não lançou'); };

  t('cancelamento UI é estrito e prefixo não vira isenção',()=>{
    const r={url:'https://h/favicon.ico',recebidoResposta:123,recebidoChunks:456},e={canceled:true,errorText:'net::ERR_ABORTED',type:'Other'};
    eq(cancelaUi(r,e,'https://h'),true);eq(prefixoRecebido(r),579);
    for(const bad of [{canceled:false},{errorText:'net::ERR_FAILED'},{type:'Script'},{blockedReason:'other'},{corsErrorStatus:{}}])eq(cancelaUi(r,{...e,...bad},'https://h'),false);
    eq(cancelaUi({...r,url:'https://evil/favicon.ico'},e,'https://h'),false);
    eq(cancelaUi({...r,url:'https://h/models/ambient/a.glb'},e,'https://h'),false);
    for(const x of [NaN,undefined,-1])lancaInfra(()=>prefixoRecebido({...r,recebidoChunks:x}));
    const row={...r,bytes:579,fim:10,erro:null};
    const n=somaCargas({ate:[row],isentas:new Set(),sobrepostos:new Map()});eq(n.total,579);eq(n.cargas.size,1);
  });
  t('encoded 0 em extra novo cobra o payload servido', () => eq(cargaOverlay(0, 1234), 1234));
  t('encoded maior que payload vira o máximo', () => eq(cargaOverlay(5000, 1000), 5000));
  t('os três isentos são exatamente os três históricos', () => {
    eq(JS_EXCLUSOS.length, 3);
    eq(JS_EXCLUSOS.join(','), 'js/main.js,js/client-id.js,js/textures.js');
  });
  t('mesmo path com query diferente são cargas distintas e ambas somadas', () => {
    const base = 'https://h/js/game.js';
    if (chaveDeCarga(base) === chaveDeCarga(`${base}?v=1`)) throw new Error('query deveria distinguir a chave');
    if (chaveDeCarga(`${base}?v=1`) === chaveDeCarga(`${base}?v=2`)) throw new Error('query colapsou');
    const { total } = somaCargas({
      ate: [
        { url: `${base}?v=1`, bytes: 100, fim: 10, erro: null },
        { url: `${base}?v=2`, bytes: 100, fim: 10, erro: null },
      ],
      isentas: new Set(), sobrepostos: new Map(),
    });
    eq(total, 200);
  });
  t('encoded negativo/NaN/ausente e payload inválido são INFRA3', () => { for(const x of [-1,NaN,undefined]) lancaInfra(()=>cargaOverlay(x,10)); for(const x of [-1,NaN,undefined]) lancaInfra(()=>cargaOverlay(0,x)); });
  t('mutante exige cláusula causal e nenhuma falha alheia',()=>{
    eq(aceitaMutante('fauna-cedo',['ORC3']),true);eq(aceitaMutante('fauna-cedo',['ORC1','ORC3']),true);eq(aceitaMutante('cartaz-ansioso',['ORC2']),true);
    eq(aceitaMutante('cartaz-ansioso',['ORC1','ORC2']),true);
    for(const nome of ['fauna-cedo','cartaz-ansioso'])for(const falhas of [[],['pageerror'],['ORC1'],['READY'],['READY','ORC3'],['ORC2','ORC3'],['ORC1','ORC3','unknown'],['ORC3','ORC3']])eq(aceitaMutante(nome,falhas),false);
  });
  t('trilha com erro de rede é INFRA3', () => lancaInfra(() => confereTrilha({ url: 'u', bytes: 1, fim: 5, erro: 'net::ERR_FAILED' })));
  t('request pendente fora do portão fica registrada e fora do ORC1', () => {
    const reqs = [
      { url: 'https://h/js/a.js', bytes: 50, fim: 10, erro: null },
      { url: 'https://h/js/b.js', bytes: 0, fim: null, erro: null },
      { url: 'https://h/js/c.js', bytes: 70, fim: 999, erro: null },
    ];
    const { ate, depois } = particiona(reqs, 100);
    eq(ate.length, 1); eq(depois.length, 2);
    const { total, cargas } = somaCargas({ ate, isentas: new Set(), sobrepostos: new Map() });
    eq(total, 50); eq(cargas.size, 1);
  });
  t('travessia de path é rejeitada do escopo local', () => {
    eq(relDeUrl('https://h/js/../../etc/passwd.js'), null);
    eq(relDeUrl('https://h/js/%2e%2e/main.js'), null);
    eq(relDeUrl('https://h/vendor/three.module.js'), null);
    eq(relDeUrl('https://h/js/game.js?v=9'), 'js/game.js');
  });
  t('isenta cobre a URL resolvida com query; sobreposta cobra máx', () => {
    const { total } = somaCargas({
      ate: [
        { url: 'https://h/js/main.js?cb=1', bytes: 9000, fim: 5, erro: null },
        { url: 'https://h/js/novo.js', bytes: 0, fim: 5, erro: null },
        { url: 'https://h/js/igual.js', bytes: 400, fim: 5, erro: null },
      ],
      isentas: new Set([chaveDeCarga('https://h/js/main.js?cb=1')]),
      sobrepostos: new Map([[chaveDeCarga('https://h/js/novo.js'), 777]]),
    });
    eq(total, 0 + 777 + 400);
  });
  t('decisão de overlay exige diferença real de corpo', () => {
    eq(decideOverlay({ local: { corpo: 'A' }, hostStatus: 200, hostCorpo: 'A' }), 'host');
    eq(decideOverlay({ local: { corpo: 'B' }, hostStatus: 200, hostCorpo: 'A' }), 'local');
    eq(decideOverlay({ local: { corpo: 'B' }, hostStatus: 404, hostCorpo: '' }), 'local');
    eq(decideOverlay({ local: null, hostStatus: 200, hostCorpo: 'A' }), 'host');
  });
  return falhas;
}

if (process.argv.includes('--self-test')) {
  const falhas = selfTest();
  if (falhas.length) { console.error(`\n✗ ${falhas.length} caso(s) de self-test falharam`); process.exit(1); }
  console.log('\n✓ self-test do overlay coerente passou');
}
