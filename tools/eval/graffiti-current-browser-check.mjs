#!/usr/bin/env node
// Gate runtime do contrato ATUAL de grafite (31/10): arte única por mapa, Ferro só na
// casa B, Piscina só no branco — fail-closed em unknown/divergente. Sem cobertura %.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
// 14 mapas abertos medidos no browser real (SURVEY6, 31/10): não é a lista de 11 do censo.
const MAPAS = ['ferro_velho', 'campomorro', 'loja_h', 'mansao', 'upa_24h', 'obras_prefeitura',
  'atacadao_treta', 'escadao', 'lajes', 'corrego', 'quebrada', 'piscina_treta',
  'praca_poderes', 'posto_treta'];
// Mapas com peça MANUAL confirmada no SURVEY6 (fonte: *-drawn-curation-SURVEY6.json,
// sources.manual>0). Mutantes de material em peça assada sujam a cláusula divergente.
const MANUAIS = ['campomorro', 'corrego', 'lajes', 'piscina_treta', 'posto_treta',
  'praca_poderes', 'quebrada'];
const MUTANTES = {
  '': { clausula: null, mapas: MAPAS },
  duplicada: { clausula: 'duplicates', mapas: MAPAS },
  'peca-no-ar': { clausula: 'unsupported', mapas: MAPAS.filter(m => m !== 'piscina_treta') },
  'ferro-fora-b': { clausula: 'outside', mapas: ['ferro_velho'] },
  'piscina-azul': { clausula: 'outside', mapas: ['piscina_treta'] },
  wireframe: { clausula: 'unknown:wireframe', mapas: MANUAIS },
  'canal-uv': { clausula: 'unknown:uv-canal', mapas: MANUAIS },
  'draw-groups': { clausula: null, mapas: MAPAS },   // controle: segue GREEN
};

export function parseArgs(argv) {
  const vistos = new Set();
  let alvo = '', out = '', mutante = '', posicionais = 0;
  for (const a of argv) {
    if (a.startsWith('--')) {
      const m = a.match(/^--(out|mutante)=(.+)$/);
      if (!m) return { erro: `opção desconhecida ou sem valor: ${a} (aceitos: --mutante=NOME, --out=CAMINHO)` };
      if (vistos.has(m[1])) return { erro: `opção duplicada: --${m[1]}` };
      vistos.add(m[1]);
      if (m[1] === 'out') out = m[2]; else mutante = m[2];
    } else {
      if (++posicionais > 1) return { erro: `mais de um alvo posicional: ${alvo} e ${a}` };
      alvo = a;
    }
  }
  if (!alvo) return { erro: `faltou o alvo: all ou um dos mapas (${MAPAS.join(', ')})` };
  return { alvo, out, mutante };
}

export function validar({ base, egoSpaceRaw, egoPage, alvo, mutante, out }) {
  if (!/^https?:\/\//.test(String(base || '')))
    return `BASE ausente/inválido (${base || 'vazio'}): aponte para o SEU servidor (ex.: BASE=http://127.0.0.1:4367 node tools/eval/graffiti-current-browser-check.mjs all). Sem BASE não lança nada.`;
  if (egoSpaceRaw === undefined || egoSpaceRaw === '' || !Number.isSafeInteger(Number(egoSpaceRaw)) || Number(egoSpaceRaw) <= 0)
    return `EGO_TASK_SPACE inválido (${egoSpaceRaw ?? 'ausente'}): este gate é runtime no browser real do Root (TaskSpace existente; Root executa, nunca finish). Inválida NÃO cai em fallback — cobertura histórica via Playwright continua no eval:grafite (censo).`;
  if (!/^p\d+$/.test(String(egoPage || ''))) return `EGO_PAGE inválido (${egoPage}): use página existente pN.`;
  if (alvo !== 'all' && !MAPAS.includes(alvo)) return `mapa desconhecido: ${alvo} — conhecidos: ${MAPAS.join(', ')} ou all`;
  if (!Object.prototype.hasOwnProperty.call(MUTANTES, mutante)) return `mutante desconhecido: ${mutante || '(vazio)'} — conhecidos: ${Object.keys(MUTANTES).filter(Boolean).join(', ')}`;
  const mapas = alvo === 'all' ? MAPAS : [alvo];
  const invalidos = mapas.filter(m => !MUTANTES[mutante].mapas.includes(m));
  if (invalidos.length) return `mutante ${mutante} não se aplica a: ${invalidos.join(', ')} (válido em: ${MUTANTES[mutante].mapas.join(', ')})`;
  if (out) {
    const abs = path.resolve(out);
    if (/\/(tools|public)\//.test(abs)) return `--out não pode ficar na árvore (${out}): use caminho privado (audits/, /tmp).`;
    const pai = path.dirname(abs);
    if (!existsSync(pai) || !statSync(pai).isDirectory()) return `--out com diretório inexistente: ${pai}`;
  }
  return null;
}

// Faixa de linhas do textures.js onde nascem os canvas de grafite (mesmos marcadores
// do SURVEY6): o preload instrumenta ANTES do import das texturas.
export function montarRanges(texturesSource) {
  const lineAt = s => texturesSource.slice(0, texturesSource.indexOf(s)).split('\n').length;
  if (!texturesSource.includes('T.graffiti =') || !texturesSource.includes('// --- fictional campaign posters'))
    return null;
  return { graffitiStart: lineAt('T.graffiti ='), graffitiEnd: lineAt('// --- fictional campaign posters') };
}

// Parse EXECUTÁVEL de cada função serializada que vai para o browser: vm.Script compila
// de verdade (o R1 passou por node --check do arquivo externo com MUTADOR quebrado dentro).
export function parseSerializados({ measure, instrument, mutador, egoScript }) {
  new vm.Script('(' + measure + ')', { filename: 'measure-serializado.js' });
  new vm.Script('(' + instrument + ')', { filename: 'instrument-serializado.js' });
  new vm.Script('(' + mutador + ')', { filename: 'mutador-serializado.js' });
  new vm.Script('(async()=>{\n' + egoScript + '\n})()', { filename: 'ego-script-serializado.mjs' });
}

// Predicado compartilhado Node/página: MESMO antes de mutar e depois de mutar.
export function predicadoVerde(r) {
  return !r.duplicates && !r.outside && !r.unsupported && !r.unknown && !r.divergent
    && !(r.overlayPieces === 0 && r.arteEsperada);
}

// Mutação REAL de cena, aplicada APÓS o build e APÓS a medição nominal verde (nunca nos
// dados de retorno do extrator). Aplicar 0 é falha de infra, não baseline.
const MUTADOR = `async (id, mutante) => {
  const THREE = await import('/vendor/three.module.js');
  const root = window.__gworld?.root || window.__game?.world?.root;
  if (!root) throw Error('cena ausente para mutar');
  root.updateMatrixWorld(true);
  const pecas = [], manuais = [];
  root.traverse(m => { if (m.isMesh && /^(decal:|mural:|poster:)/.test(m.name)) {
    pecas.push(m); if (!m.userData.pecas) manuais.push(m); } });
  const material = m => Array.isArray(m.material) ? m.material[0] : m.material;
  const clausulaManual = mutante === 'wireframe' || mutante === 'canal-uv';
  const alvo = clausulaManual ? manuais[0] : pecas[0];
  if (!alvo) throw Error('sem peça ' + (clausulaManual ? 'manual ' : '') + 'canônica p/ ' + mutante);
  const bbox = new THREE.Box3().setFromObject(alvo);
  if (bbox.isEmpty()) throw Error('peça sem bbox p/ ' + mutante);
  const sz = bbox.getSize(new THREE.Vector3());
  const eixo = sz.z < sz.x ? 2 : 0;   // 2: peça fina em z (parede ao longo de x)
  if (mutante === 'duplicada') {
    const imagem = m => material(m)?.map?.source?.data || material(m)?.map?.image;
    const origem = pecas.find(m => !Array.isArray(m.material) && imagem(m));
    const chave = m => imagem(m)?.src || imagem(m);
    const destino = origem && pecas.find(m => !Array.isArray(m.material) && imagem(m) && chave(m) !== chave(origem));
    if (!destino) throw Error('sem duas artes distintas existentes p/ duplicada');
    destino.material = destino.material.clone();
    destino.material.map = material(origem).map;
    destino.material.needsUpdate = true;
    return 1;
  }
  if (mutante === 'peca-no-ar') {
    const cena = new THREE.Box3().setFromObject(root);
    const dy = cena.max.y + 10 - bbox.min.y;
    if (!Number.isFinite(dy) || !(dy > 0)) throw Error('altura da cena inválida p/ peca-no-ar');
    let meta = null;
    if (alvo.userData.pecas) {
      if (alvo.userData.pecas !== 1) throw Error('peça assada não é quad único p/ peca-no-ar');
      const centro = bbox.getCenter(new THREE.Vector3());
      const imagem = material(alvo).map?.source?.data || material(alvo).map?.image;
      const arquivo = imagem?.src && decodeURIComponent(new URL(imagem.src, location.href).pathname).split('/').pop();
      const candidatas = [];
      root.traverse(n => { for (const p of n.userData.graffitiPecas || [])
        if (arquivo && String(p.f).replace(/^poster:/, '') === arquivo
          && Math.abs(p.x - centro.x) <= .002 && Math.abs(p.y - centro.y) <= .002 && Math.abs(p.z - centro.z) <= .002) candidatas.push(p); });
      if (candidatas.length !== 1) throw Error('metadado único da peça ausente p/ peca-no-ar');
      meta = candidatas[0];
    }
    const destino = alvo.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, dy, 0));
    alvo.position.copy(alvo.parent.worldToLocal(destino));
    alvo.updateMatrix(); alvo.updateMatrixWorld(true);
    if (meta) meta.y += dy;
    return 1;
  }
  if (mutante === 'wireframe') { const ms = Array.isArray(alvo.material) ? alvo.material : [alvo.material]; ms.forEach(m => m.wireframe = true); return ms.length; }
  if (mutante === 'canal-uv') { const map = material(alvo).map; if (!map) throw Error('peça sem map'); map.channel = 1; return 1; }
  if (mutante === 'draw-groups') {
    const g = alvo.geometry, n = g.index ? g.index.count : g.attributes.position.count;
    if (!Array.isArray(alvo.material)) alvo.material = [alvo.material];
    g.clearGroups(); g.addGroup(0, n, 0); return 1;
  }
  if (mutante === 'ferro-fora-b') {
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(alvo.matrixWorld);
    const B = { x0: -12.5, x1: 2.5, z0: -35.5, z1: -26.5 };
    let melhor = null, dist = Infinity;
    root.traverse(m => {
      if (!m.isMesh || /^(decal:|mural:|poster:|faixa:)/.test(m.name) || Array.isArray(m.material)) return;
      const b = new THREE.Box3().setFromObject(m); if (b.isEmpty()) return;
      const s = b.getSize(new THREE.Vector3()), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      if (cx >= B.x0 && cx <= B.x1 && cz >= B.z0 && cz <= B.z1) return;   // dentro da casa B
      const fino = eixo === 2 ? s.z < .8 : s.x < .8;   // parede fina na mesma orientação da peça
      const span = eixo === 2 ? s.x : s.z;
      if (!fino || span < Math.max(sz.getComponent(eixo === 2 ? 0 : 2) + .2, 6) || s.y < Math.max(sz.y + .2, 2.8)) return;
      const d = Math.hypot(cx - (B.x0 + B.x1) / 2, cz - (B.z0 + B.z1) / 2);
      if (d < dist) { dist = d; melhor = b; }
    });
    if (!melhor) throw Error('sem parede fora da casa B com a orientação da peça');
    const centro = melhor.getCenter(new THREE.Vector3());
    if (eixo === 2) centro.z = normal.z >= 0 ? melhor.max.z + .03 : melhor.min.z - .03;
    else centro.x = normal.x >= 0 ? melhor.max.x + .03 : melhor.min.x - .03;
    const delta = centro.sub(bbox.getCenter(new THREE.Vector3()));
    alvo.position.add(delta); alvo.updateMatrix(); alvo.updateMatrixWorld(true);
    // Metadado do bake acompanha a peça: mover só a malha viraria sem-metadado/sem-geometria.
    root.traverse(n => { for (const p of n.userData.graffitiPecas || [])
      if (p.x >= bbox.min.x - .1 && p.x <= bbox.max.x + .1 && p.z >= bbox.min.z - .1 && p.z <= bbox.max.z + .1) { p.x += delta.x; p.y += delta.y; p.z += delta.z; } });
    return 1;
  }
  if (mutante === 'piscina-azul') {
    // Pose legada da faixa azul (mesma do registro do censo): fora do branco aprovado hoje.
    alvo.position.set(0, 2.3, -24.97); alvo.rotation.set(0, 0, 0); alvo.updateMatrixWorld(true);
    return 1;
  }
  throw Error('mutante não tratado na cena: ' + mutante);
}`;

export function construirScriptEgo(input) {
  return `
const input = ${JSON.stringify(input)};
const fs = await import('node:fs/promises');
const verde = ${predicadoVerde.toString()};
const task = await taskSpace(input.space), page = task.page(input.page);   // Root executa; NUNCA task.finish
await page.cdp('egoAutomated.disable');
await page.cdp('Network.enable'); await page.cdp('Runtime.enable');
await page.goto(input.origin + '/robots.txt', { waitUntil: 'domcontentloaded', timeout: 60000 });
if (await page.evaluate('location.origin') !== input.origin) throw new Error('origem efetiva difere da BASE antes das preferências');
await page.events();
const original = await page.evaluate(() => ({ quality: localStorage.getItem('awpbr_settings'), manual: localStorage.getItem('cs_quality_auto') }));
if (input.out) await fs.writeFile(input.out + '.prefs-before.json', JSON.stringify(original));
// Setup e limpeza transacionais (P2-3): toda mutação de estado dentro do try, flags do que
// vingou, cada limpeza independente e erro causal distinto do erro de limpeza.
const estado = { cache: false, prefs: false, preload: null };
const resultados = [];
/* Coletor único desde a navegação: erro de asset durante a carga invalida a prova (R4). */
const erros = [], reqs = new Map(), ativos = new Map(); let movRede = Date.now();
const coletor = (e) => {
  const p = e.params || {};
  if (e.method === 'Network.requestWillBeSent' && p.request && String(p.request.url).startsWith(input.origin + '/')) {
    reqs.set(p.requestId, p.request.url); ativos.set(p.requestId, p.request.url); movRede = Date.now();
  }
  if (e.method === 'Network.responseReceived' && p.response && String(p.response.url).startsWith(input.origin + '/') && p.response.status >= 400)
    erros.push(p.response.status + ': ' + p.response.url);
  if (e.method === 'Network.loadingFailed' && reqs.has(p.requestId)) {
    erros.push('falhou: ' + reqs.get(p.requestId) + ' (' + p.errorText + ')'); ativos.delete(p.requestId); movRede = Date.now();
  }
  if (e.method === 'Network.loadingFinished' && reqs.has(p.requestId)) { ativos.delete(p.requestId); movRede = Date.now(); }
  if (e.method === 'Runtime.exceptionThrown') {
    const text = (p.exceptionDetails && p.exceptionDetails.exception && p.exceptionDetails.exception.description) || (p.exceptionDetails && p.exceptionDetails.text) || '?';
    if (!text.includes('chrome-extension://') || text.includes(input.origin + '/')) erros.push('pageerror: ' + text.slice(0, 400));
  }
  if (e.method === 'Runtime.consoleAPICalled') {
    const text = (p.args || []).map((a) => a.value || a.description || '').join(' ');
    if (/load failed/i.test(text)) erros.push('console: ' + text.slice(0, 400));
  }
};
const drena = async () => { for (const e of await page.events()) coletor(e); };
// Métrica pesada agendada (setTimeout 500) e lida por poll curto no Node: evaluate
// do Ego tem 15 s — nunca segurar a medição dentro de um evaluate único.
const esperaCuradoria = async (id) => {
  await page.evaluate('(window.__curadoriaJob = { state: "pending" }, setTimeout(() => (' + input.measure + ')(' + JSON.stringify({ id, inventorySource: input.invSource }) + ').then((v) => window.__curadoriaJob = { state: "done", value: v }, (e) => window.__curadoriaJob = { state: "error", error: String((e && e.stack) || e) }), 500), true)');
  await new Promise((r) => setTimeout(r, 45000));   // SURVEY6-tail: esperar antes de ler
  const fim = Date.now() + 90000; let job = { state: 'pending' };
  while (job.state === 'pending' && Date.now() < fim) {
    job = await page.evaluate('window.__curadoriaJob'); await drena();
    if (job.state === 'pending') await new Promise((r) => setTimeout(r, 1000));
  }
  await drena();
  if (job.state === 'pending') throw new Error('curadoria de ' + id + ' não terminou em 135s');
  if (job.state === 'error') throw new Error('curadoria falhou na página (' + id + '): ' + job.error);
  return job.value;
};
const resumoDe = async (id, mutante, c) => {
  if (c.erros && c.erros.length) throw new Error('erros de página em ' + id + ': ' + c.erros.slice(0, 5).join(' | '));
  const actualMap = await page.evaluate('window.__mapId');
  const arteEsperada = await page.evaluate('(() => { let meta = false; window.__gworld.root.traverse(n => { if ((n.userData.graffitiPecas || []).length) meta = true; }); return { meta }; })()');
  await drena();   // R4: drenar também depois da última consulta/evaluate do ciclo
  const declarada = (c.inventory || []).some(e => e.classification === 'declared-overlay' && e.visibleArtwork);
  return { id, mutante, actualMap, overlayPieces: c.overlayPieces,
    unclassifiedOccurrences: c.unclassifiedOccurrences, unique: c.unique,
    duplicates: c.duplicates.length, outside: c.outside.length, unsupported: c.unsupported.length,
    unknown: c.unknown.length, divergent: (c.divergent || []).length,
    unknownAmostra: (c.unknown || []).slice(0, 3),
    unknownMotivos: (c.unknown || []).reduce((r, msg) => { const k = msg.split(':')[0]; r[k] = (r[k] || 0) + 1; return r; }, Object.create(null)),
    arteEsperada: declarada || arteEsperada.meta, silencioOk: true };
};
let causal = null;
try {
  await page.cdp('Network.setCacheDisabled', { cacheDisabled: true }); estado.cache = true;
  // Obrigação de restauração registrada ANTES da primeira escrita (P2 R3): rollback cobre
  // escrita parcial — a restauração sempre repõe o snapshot original das duas chaves.
  estado.prefs = true;
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('awpbr_settings') || '{}'); s.quality = 'med'; localStorage.setItem('awpbr_settings', JSON.stringify(s)); localStorage.setItem('cs_quality_auto', 'manual'); });
  // Instrumento ANTES de qualquer import de texturas: addScriptToEvaluateOnNewDocument roda
  // antes de todo script da página em cada navegação; sai na limpeza.
  const preload = await page.cdp('Page.addScriptToEvaluateOnNewDocument', { source: '(' + input.instrument + ')(' + JSON.stringify(input.ranges) + ');' });
  estado.preload = preload.identifier;
  for (const id of input.mapas) {
    erros.length = 0; reqs.clear(); ativos.clear(); movRede = Date.now();
    const target = new URL('/mapview.html', input.origin);
    target.searchParams.set('map', id); target.searchParams.set('hud', '0'); target.searchParams.set('capture', '1');
    await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.MAPEVAL && window.MAPEVAL.ready === true, undefined, { timeout: 120000 });
    // Fim de carga exige 1,5 s de silêncio de rede da BASE (ativos 0 não basta sozinho).
    const prazoNet = Date.now() + 30000; let silencioOk = false;
    while (Date.now() < prazoNet) {
      await drena();
      if (ativos.size === 0 && Date.now() - movRede >= 1500) { silencioOk = true; break; }
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!silencioOk) throw new Error('carga de ' + id + ' não silenciou em 30s — pendentes: ' + [...ativos.values()].slice(0, 3).join(', '));
    // Nominal ANTES de qualquer mutação (P2-2): vermelho NÃO muta — a decisão semântica do
    // nominal chega ao main (RED 1) mesmo que o cenário não tenha peça p/ o mutante.
    const cNominal = await esperaCuradoria(id);
    const nominal = await resumoDe(id, '', cNominal);
    if (nominal.actualMap !== id) throw new Error('mapa carregado (' + nominal.actualMap + ') difere do pedido (' + id + ')');
    const nominalVerde = verde(nominal);
    let pos = null, cPos = null;
    if (input.mutante && nominalVerde) {
      const aplicado = await page.evaluate('((' + input.mutador + ')(' + JSON.stringify(id) + ', ' + JSON.stringify(input.mutante) + '))');
      await drena();
      if (!aplicado) throw new Error('mutante ' + input.mutante + ' aplicou 0 em ' + id + ' — falha de infra, não baseline');
      cPos = await esperaCuradoria(id);
      pos = await resumoDe(id, input.mutante, cPos);
    }
    const resumo = pos || nominal;
    resumo.erros = [...new Set(erros)].slice(0, 5); resumo.invalidado = resumo.erros.length > 0;
    if (!resumo.invalidado && input.out) await fs.writeFile(input.out + '.' + id + '.json', JSON.stringify({ curation: pos || nominal, raw: { nominal: cNominal, pos: cPos } }, null, 2));
    resultados.push({ ...resumo, mutante: input.mutante, nominalVerde,
      nominal: { duplicates: nominal.duplicates, outside: nominal.outside, unsupported: nominal.unsupported, unknown: nominal.unknown, unknownMotivos: nominal.unknownMotivos, divergent: nominal.divergent, overlayPieces: nominal.overlayPieces, arteEsperada: nominal.arteEsperada } });
    console.log('MAPA=' + JSON.stringify(resultados[resultados.length - 1]));
  }
} catch (e) { causal = e; }
const limpezas = [];
if (estado.preload !== null) { try { await page.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: estado.preload }); } catch (e) { limpezas.push('preload: ' + ((e && e.message) || e)); } }
if (estado.cache) { try { await page.cdp('Network.setCacheDisabled', { cacheDisabled: false }); } catch (e) { limpezas.push('cache: ' + ((e && e.message) || e)); } }
if (estado.prefs) { try {
  if (await page.evaluate('location.origin') !== input.origin) await page.goto(input.origin + '/robots.txt', { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (await page.evaluate('location.origin') !== input.origin) throw new Error('origem efetiva difere da BASE ao restaurar preferências');
  const falhas = await page.evaluate((s) => { const falhas = []; for (const [k, v] of [["awpbr_settings", s.quality], ["cs_quality_auto", s.manual]]) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { falhas.push(k + ": " + e.message); } } return falhas; }, original);
  for (const falha of falhas) limpezas.push('prefs: ' + falha);
  const depois = await page.evaluate(() => ({ quality: localStorage.getItem('awpbr_settings'), manual: localStorage.getItem('cs_quality_auto') }));
  if (input.out) await fs.writeFile(input.out + '.prefs-after.json', JSON.stringify(depois));
  if (JSON.stringify(depois) !== JSON.stringify(original)) limpezas.push('prefs: recibo final difere do snapshot');
} catch (e) { limpezas.push('prefs: ' + ((e && e.message) || e)); } }
if (causal && limpezas.length) throw new Error(causal.message + ' · limpeza falhou (estado pode ter ficado alterado): ' + limpezas.join(' | '));
if (causal) throw causal;
if (limpezas.length) throw new Error('limpeza falhou (estado pode ter ficado alterado): ' + limpezas.join(' | '));
console.log('BROWSER_CHECK_RESULT=' + JSON.stringify({ mapas: resultados }));
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.erro) { console.error(args.erro); process.exit(2); }
  const erro = validar({ base: process.env.BASE, egoSpaceRaw: process.env.EGO_TASK_SPACE,
    egoPage: process.env.EGO_PAGE || 'p2', alvo: args.alvo, mutante: args.mutante, out: args.out });
  if (erro) { console.error(erro); process.exit(2); }

  const measureSource = readFileSync(path.join(dir, 'graffiti-curation-measure.mjs'), 'utf8');
  const measure = measureSource.slice(measureSource.indexOf('export async function')).replace('export ', '');
  const invSource = readFileSync(path.join(dir, 'graffiti-art-inventory.mjs'), 'utf8');
  const instrument = invSource.slice(invSource.indexOf('export function trackGraffitiCanvases')).replace('export ', '');
  const textures = readFileSync(path.join(dir, '../../public/js/textures.js'), 'utf8');
  const ranges = montarRanges(textures);
  if (!ranges) { console.error('marcadores de canvas de grafite não achados em public/js/textures.js — instrumento sem faixa'); process.exit(2); }

  const input = { space: Number(process.env.EGO_TASK_SPACE), page: process.env.EGO_PAGE || 'p2',
    origin: new URL(process.env.BASE).origin, mapas: args.alvo === 'all' ? MAPAS : [args.alvo],
    mutante: args.mutante, measure, invSource, instrument, ranges, mutador: MUTADOR,
    out: args.out ? path.resolve(args.out).replace(/\.[^.]*$/, '') : '' };
  try {
    parseSerializados({ measure, instrument, mutador: MUTADOR, egoScript: construirScriptEgo(input) });
  } catch (e) {
    console.error('RED-INFRA: código serializado não parseia como executável: ' + e.message);
    process.exit(3);
  }

  const run = spawnSync(process.env.EGO_BROWSER_BIN || 'ego-browser', ['nodejs'], {
    input: construirScriptEgo(input), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 300000 * Math.max(1, input.mapas.length) });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  const line = output.split('\n').find(l => l.startsWith('BROWSER_CHECK_RESULT='));
  if (run.error || run.status !== 0 || !line) {
    if (input.out) { writeFileSync(input.out + '.ego-error.log', output); console.error('log completo: ' + input.out + '.ego-error.log'); }
    console.error(output.slice(0, 1500));
    console.error(output.slice(-1500));
    console.error('RED-INFRA: execução Ego falhou antes do veredito');
    process.exit(3);
  }
  // Protocolo estrito (P2-1): resposta vazia/parcial/duplicada/inesperada NUNCA é GREEN.
  const infra = (msg) => { console.error('RED-INFRA: ' + msg); process.exit(3); };
  let mapas;
  try { ({ mapas } = JSON.parse(line.slice('BROWSER_CHECK_RESULT='.length))); }
  catch (e) { infra('payload do filho não é JSON válido: ' + e.message); }
  if (!Array.isArray(mapas)) infra('resultado sem array de mapas');
  if (mapas.length !== input.mapas.length)
    infra(`cobertura divergente: pedidos ${input.mapas.length}, recebidos ${mapas.length} (${input.mapas.join(',')})`);
  const vistos = new Set();
  for (const r of mapas) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) infra('item de mapa não é objeto');
    if (!input.mapas.includes(r.id)) infra(`mapa inesperado na resposta: ${r.id} (pedidos: ${input.mapas.join(',')})`);
    if (vistos.has(r.id)) infra(`mapa duplicado na resposta: ${r.id}`);
    vistos.add(r.id);
    if (r.mutante !== input.mutante) infra(`mutante ecoado (${r.mutante}) difere do pedido (${input.mutante}) em ${r.id}`);
    if (r.actualMap !== r.id) infra(`actualMap (${r.actualMap}) difere do id pedido (${r.id})`);
    if (typeof r.nominalVerde !== 'boolean') infra(`nominalVerde ausente/não-boolean em ${r.id}`);
    if (typeof r.arteEsperada !== 'boolean') infra(`arteEsperada ausente/não-boolean em ${r.id}`);
    if (r.invalidado !== undefined && typeof r.invalidado !== 'boolean') infra(`invalidado não-boolean em ${r.id}`);
    if (!Array.isArray(r.erros) || r.erros.some((e) => typeof e !== 'string')) infra(`erros ausente/não-array-de-strings em ${r.id}`);
    const inteiroNaoNeg = (v) => Number.isInteger(v) && v >= 0;
    for (const c of ['overlayPieces', 'duplicates', 'outside', 'unsupported', 'unknown', 'divergent'])
      if (!inteiroNaoNeg(r[c])) infra(`campo ${c} ausente/não inteiro >=0 em ${r.id}`);
    if (!Array.isArray(r.unknownAmostra) || r.unknownAmostra.some((e) => typeof e !== 'string')) infra(`unknownAmostra ausente/não-array-de-strings em ${r.id}`);
    const validarMotivos = (o, n, rotulo) => {
      if (!o || typeof o !== 'object' || Array.isArray(o)
        || Object.entries(o).some(([k, v]) => !k || !Number.isInteger(v) || v <= 0)
        || Object.values(o).reduce((a, b) => a + b, 0) !== n) infra(`unknownMotivos incoerente em ${rotulo}`);
    };
    validarMotivos(r.unknownMotivos, r.unknown, r.id);
    if (!r.nominal || typeof r.nominal !== 'object') infra(`resumo nominal ausente em ${r.id}`);
    else {
      for (const c of ['duplicates', 'outside', 'unsupported', 'unknown', 'divergent', 'overlayPieces'])
        if (!inteiroNaoNeg(r.nominal[c])) infra(`nominal.${c} ausente/não inteiro >=0 em ${r.id}`);
      if (typeof r.nominal.arteEsperada !== 'boolean') infra(`nominal.arteEsperada ausente/não-boolean em ${r.id}`);
      validarMotivos(r.nominal.unknownMotivos, r.nominal.unknown, r.id + ':nominal');
      // Coerência semântica (P2 R3): o main recalcula o predicado nominal — a flag ecoada
      // nunca é a única fonte do aceite. Contradição é evidência inválida, não GREEN nem RED.
      if (predicadoVerde(r.nominal) !== r.nominalVerde)
        infra(`nominalVerde (${r.nominalVerde}) contradiz os contadores nominais em ${r.id}`);
    }
  }
  const semanticas = [];
  for (const r of mapas) {
    if (r.invalidado || r.erros.length) { console.error(`RED-INFRA ${r.id}: erros de página recolhidos — ${r.erros.join(' | ')}`); process.exit(3); }
    if (!r.nominalVerde) { semanticas.push(`${r.id}(nominal): dup=${r.nominal.duplicates} fora=${r.nominal.outside} sem-suporte=${r.nominal.unsupported} unknown=${r.nominal.unknown} divergente=${r.nominal.divergent} zero=${r.nominal.overlayPieces === 0 && r.nominal.arteEsperada}`); continue; }
    if (!r.mutante) { if (!predicadoVerde(r)) semanticas.push(`${r.id}(nominal): resumo final fora do contrato`); continue; }
    const esperado = MUTANTES[r.mutante].clausula;
    // O produto exclui do suporte a faixa azul e todas as superfícies fora da casa B.
    const bateu = ['piscina-azul', 'ferro-fora-b'].includes(r.mutante)
      ? r.outside === 1 && r.unsupported === 1 && r.duplicates === 0 && r.unknown === 0 && r.divergent === 0 && r.overlayPieces > 0
      : !esperado ? verdeSem(r, null)
      : esperado === 'duplicates' ? (r.duplicates > 0 && verdeSem(r, 'duplicates'))
      : esperado === 'outside' ? (r.outside > 0 && verdeSem(r, 'outside'))
      : esperado === 'unsupported' ? (r.unsupported > 0 && verdeSem(r, 'unsupported'))
      : r.mutante === 'wireframe' ? Object.keys(r.unknownMotivos).length === 2
        && r.unknownMotivos.wireframe > 0 && r.unknownMotivos['nao-medido'] === r.unknownMotivos.wireframe
        && r.unknown === 2 * r.unknownMotivos.wireframe && verdeSem(r, 'unknown')
      : r.unknown > 0 && Object.keys(r.unknownMotivos).length === 1
        && r.unknownMotivos[esperado.slice('unknown:'.length)] === r.unknown && verdeSem(r, 'unknown');
    if (!bateu) semanticas.push(`${r.id}(${r.mutante}): dup=${r.duplicates} fora=${r.outside} sem-suporte=${r.unsupported} unknown=${r.unknown}[${(r.unknownAmostra || []).join(';')}] divergente=${r.divergent} zero=${r.overlayPieces === 0 && r.arteEsperada}`);
  }
  if (semanticas.length) { console.error('RED: ' + semanticas.length + ' mapa(s) fora do contrato atual: ' + semanticas.join(' · ')); process.exit(1); }
  console.log(`GREEN: contrato atual (${mapas.length} mapa(s), nominal verde, mutante '${args.mutante || 'nominal'}')`);
}
// Mesma régua do predicadoVerde, com a cláusula-alvo isolada.
function verdeSem(r, excecao) {
  const cls = ['duplicates', 'outside', 'unsupported', 'unknown', 'divergent'];
  return cls.every(c => c === excecao ? r[c] > 0 : r[c] === 0) && !(r.overlayPieces === 0 && r.arteEsperada);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
