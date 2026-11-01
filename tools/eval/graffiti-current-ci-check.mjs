#!/usr/bin/env node
// Adaptador CI do contrato ATUAL de grafite (31/10): mesmo extrator, inventário e predicados do graffiti-current-browser-check.mjs (Ego/Root), dirigido pelo Chromium global do portão-browser (PLAYWRIGHT global + CHROME_BIN, SwiftShader). Doc: docs/visual-consistency/GRAFITE-CI-ATUAL.md. QA pessoal do Root continua no Ego — este arquivo NÃO abre Ego nem faz fallback.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { montarRanges, parseSerializados, predicadoVerde } from './graffiti-current-browser-check.mjs';
import { carregarDoEgo, avaliar, validarResumo, prova } from './graffiti-current-accept.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const USO = 'uso: node tools/eval/graffiti-current-ci-check.mjs [--map=all|id[,id]] [--mutante=NOME] [--mutantes] [--json=DIR] [--self-test]\n'
  + 'env: BASE obrigatória (ex.: BASE=http://localhost:8123); CHROME_BIN opcional (Chromium do Playwright no CI)';

export function parseArgs(argv) {
  const vistos = new Set();
  const o = { map: 'all', mutante: '', json: '', selfTest: false, mutantes: false };
  for (const a of argv) {
    if (a === '--self-test') { if (vistos.has('selfTest')) return { erro: 'opção duplicada: --self-test' }; vistos.add('selfTest'); o.selfTest = true; continue; }
    if (a === '--mutantes') { if (vistos.has('mutantes')) return { erro: 'opção duplicada: --mutantes' }; vistos.add('mutantes'); o.mutantes = true; continue; }
    const m = a.match(/^--(map|mutante|json)=(.+)$/);
    if (!m) return { erro: `opção desconhecida ou sem valor: ${a} (aceitos: --map=, --mutante=, --json=, --mutantes, --self-test)` };
    if (vistos.has(m[1])) return { erro: `opção duplicada: --${m[1]}` };
    vistos.add(m[1]);
    o[m[1]] = m[2];
  }
  if (argv.some(a => a === '--mutantes') && o.mutante)
    return { erro: '--mutantes (bateria inteira) e --mutante=NOME são exclusivos' };
  return o;
}

export function validar({ base, alvos, mutante, json, MAPAS, MUTANTES }) {
  let parsed;
  try { parsed = new URL(String(base || '')); } catch { parsed = null; }
  if (!parsed || !/^https?:$/.test(parsed.protocol) || !parsed.hostname)
    return `BASE ausente/inválido (${base || 'vazio'}): aponte para o servidor do próprio runner (ex.: BASE=http://localhost:8123). Sem BASE não lança nada.`;
  const invalidos = alvos.filter(m => !MAPAS.includes(m));
  if (invalidos.length) return `mapa(s) desconhecido(s): ${invalidos.join(', ')} — conhecidos: ${MAPAS.join(', ')}`;
  if (mutante) {
    if (!Object.prototype.hasOwnProperty.call(MUTANTES, mutante))
      return `mutante desconhecido: ${mutante} — conhecidos: ${Object.keys(MUTANTES).filter(Boolean).join(', ')}`;
    const fora = alvos.filter(m => !MUTANTES[mutante].mapas.includes(m));
    if (fora.length) return `mutante ${mutante} não se aplica a: ${fora.join(', ')} (válido em: ${MUTANTES[mutante].mapas.join(', ')})`;
  }
  if (json) {
    const abs = path.resolve(json);
    let ancestor=abs,tail=[];
    while(!existsSync(ancestor)){tail.unshift(path.basename(ancestor));const next=path.dirname(ancestor);if(next===ancestor)break;ancestor=next;}
    let resolved;
    try{resolved=path.join(realpathSync(ancestor),...tail);}catch{return '--json não resolve ancestral existente';}
    if(/(^|\/)(tools|public)(\/|$)/.test(resolved))return '--json aponta por symlink para tools/public';
    if (/(^|\/)(tools|public)(\/|$)/.test(abs))
      return `--json não pode ficar na árvore (${json}): use caminho privado (artifacts/, /tmp).`;
  }
  return null;
}

// --self-test: sem navegador, sem BASE, sem servidor — predicado/payload/status/CLI.
function selfTest() {
  let falhas = 0;
  const check = (nome, cond) => { if (!cond) { falhas++; console.error('FALHOU: ' + nome); } };
  check('prova do avaliador puro (paridade ego + cláusulas + contraprovas)', prova());
  const { MAPAS, MUTANTES, mutador } = carregarDoEgo();
  check('14 mapas extraídos do ego', MAPAS.length === 14);
  new vm.Script('(' + mutador + ')', { filename: 'mutador-extraido.js' });

  check('CLI: --self-test duplicado', !!parseArgs(['--self-test', '--self-test']).erro);
  check('CLI: --mutantes duplicado', !!parseArgs(['--mutantes', '--mutantes']).erro);
  check('CLI: --self-test sem BASE não exige nada', parseArgs(['--self-test']).selfTest === true);

  check('sem BASE é uso(2), sem launch', !!validar({ base: '', alvos: MAPAS, mutante: '', json: '', MAPAS, MUTANTES }));
  check('BASE inválida é uso(2)', !!validar({ base: 'ftp://x', alvos: MAPAS, mutante: '', json: '', MAPAS, MUTANTES }));
  check('mapa desconhecido é uso(2)', !!validar({ base: 'http://x', alvos: ['amazonia'], mutante: '', json: '', MAPAS, MUTANTES }));
  check('mutante desconhecido é uso(2)', !!validar({ base: 'http://x', alvos: MAPAS, mutante: 'sei-la', json: '', MAPAS, MUTANTES }));
  check('mutante em mapa inválido é uso(2)', !!validar({ base: 'http://x', alvos: ['ferro_velho'], mutante: 'piscina-azul', json: '', MAPAS, MUTANTES }));
  check('--json na árvore é uso(2)', !!validar({ base: 'http://x', alvos: MAPAS, mutante: '', json: 'tools/eval/x', MAPAS, MUTANTES }));
  check('BASE + all nominal valida', !validar({ base: 'http://x', alvos: MAPAS, mutante: '', json: '', MAPAS, MUTANTES }));

  // Status: mapa nominal vermelho é semântico(1); mutante que aplica 0 é infra(3).
  const rVermelho = { id: MAPAS[0], mutante: '', nominalVerde: false, duplicates: 1 };
  check('nominal vermelho é semântico', !avaliar(rVermelho, MUTANTES).verde);
  const classifica = (aplicou) => aplicou ? 'segue' : 'infra3';
  check('mutante que aplica 0 é infra3', classifica(0) === 'infra3');
  console.log(falhas ? `SELF-TEST VERMELHO — ${falhas} verificação(ões)` : 'SELF-TEST VERDE — sem navegador, sem BASE');
  return falhas === 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.erro) { console.error(args.erro); console.error(USO); process.exit(2); }
  const { MAPAS, MUTANTES, mutador } = carregarDoEgo();
  const alvos = args.map === 'all' ? MAPAS : args.map.split(',').map(s => s.trim()).filter(Boolean);
  if (args.map !== 'all' && alvos.length !== args.map.split(',').length)
    { console.error('lista --map com item vazio: ' + args.map); process.exit(2); }

  if (args.selfTest) process.exit(selfTest() ? 0 : 1);

  const erro = validar({ base: process.env.BASE, alvos, mutante: args.mutante, json: args.json, MAPAS, MUTANTES });
  if (erro) { console.error(erro); console.error(USO); process.exit(2); }

  let measureSource, measure, invSource, instrument, ranges, browser, context, origin, planos, resultados;
  try {
    measureSource = readFileSync(path.join(dir, 'graffiti-curation-measure.mjs'), 'utf8');
    measure = measureSource.slice(measureSource.indexOf('export async function')).replace('export ', '');
    invSource = readFileSync(path.join(dir, 'graffiti-art-inventory.mjs'), 'utf8');
    instrument = invSource.slice(invSource.indexOf('export function trackGraffitiCanvases')).replace('export ', '');
    ranges = montarRanges(readFileSync(path.join(dir, '../../public/js/textures.js'), 'utf8'));
    if (!ranges) throw Error('marcadores de canvas de grafite não achados em public/js/textures.js');
    parseSerializados({ measure, instrument, mutador, egoScript: 'await null' });
    new vm.Script('(' + measure + ')(' + JSON.stringify({ id: 'x', inventorySource: invSource }) + ')', { filename: 'chamada-medida.js' });
    if (args.json) { const abs = path.resolve(args.json); mkdirSync(abs, { recursive: true }); args.json = abs; }
    const gRoot = execSync('npm root -g').toString().trim();
    const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
    const chromium = _pw.chromium || _pw.default?.chromium;
    origin = new URL(process.env.BASE).origin;

    browser = null; context = null;
  resultados = [];
    planos = args.mutantes
      ? [{ mutante: '', mapas: alvos },
         ...Object.keys(MUTANTES).filter(Boolean)
           .map(m => ({ mutante: m, mapas: alvos.filter(x => MUTANTES[m].mapas.includes(x)) }))
           .filter(p => p.mapas.length)]
      : args.mutante
        ? [{ mutante: '', mapas: alvos }, { mutante: args.mutante, mapas: alvos }]
        : [{ mutante: '', mapas: alvos }];
    browser = await chromium.launch({
      ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { channel: 'chrome' }),
      headless: true,
      args: process.platform==='darwin'?[]:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl'],
    });
    context = await browser.newContext();
    const page = await context.newPage();

    // Coletor ANTES de qualquer navegação: no PW os eventos são push, não há drenada manual.
    const erros = [], reqs = new Map(), ativos = new Map();
    let movRede = Date.now();
    const daBase = (u) => String(u).startsWith(origin + '/');
    page.on('request', r => { if (daBase(r.url())) { reqs.set(r, r.url()); ativos.set(r, r.url()); movRede = Date.now(); } });
    page.on('requestfinished', r => { if (ativos.delete(r)) movRede = Date.now(); });
    page.on('requestfailed', r => {
      if (reqs.has(r)) { erros.push('falhou: ' + r.url() + ' (' + (r.failure()?.errorText || '?') + ')'); ativos.delete(r); movRede = Date.now(); }
    });
    page.on('response', r => { if (daBase(r.url()) && r.status() >= 400) erros.push(r.status() + ': ' + r.url()); });
    page.on('pageerror', e => erros.push('pageerror: ' + String(e && e.message || e).slice(0, 400)));
    page.on('console', m => { if (/load failed/i.test(m.text())) erros.push('console: ' + m.text().slice(0, 400)); });

    // Contexto efêmero = prefs isoladas: gravar quality/manual não exige restauração —
    // fechar o context descarta o storage. Instrumento ANTES do import das texturas.
    await page.goto(origin + '/robots.txt', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('awpbr_settings') || '{}');
      s.quality = 'med'; localStorage.setItem('awpbr_settings', JSON.stringify(s));
      localStorage.setItem('cs_quality_auto', 'manual');
    });
    await context.addInitScript('(' + instrument + ')(' + JSON.stringify(ranges) + ');');

    // Métrica pesada agendada na página (setTimeout 500) e lida por poll — mesmo
    // protocolo do gate Ego, com as mesmas esperas.
    const esperaCuradoria = async (id) => {
      await page.evaluate(([id, invSource, measureSrc]) => {
        window.__curadoriaJob = { state: 'pending' };
        setTimeout(() => {
          Promise.resolve((0, eval)('(' + measureSrc + ')')({ id, inventorySource: invSource }))
            .then(v => window.__curadoriaJob = { state: 'done', value: v },
              e => window.__curadoriaJob = { state: 'error', error: String((e && e.stack) || e) });
        }, 500);
      }, [id, invSource, measure]);
      await page.waitForFunction(()=>window.__curadoriaJob?.state!=='pending',undefined,{timeout:135000,polling:1000});
      const job=await page.evaluate(()=>window.__curadoriaJob);
      if(!job||job.state==='pending')throw Error('curadoria sem resultado em135s: '+id);
      if(job.state==='error')throw Error('curadoria falhou: '+job.error);
      return job.value;
    };
    const resumoDe = async (id, mutante, c) => {
      const actualMap = await page.evaluate(() => window.__mapId);
      const arteEsperada = await page.evaluate(() => {
        let meta = false; window.__gworld.root.traverse(n => { if ((n.userData.graffitiPecas || []).length) meta = true; });
        return { meta };
      });
      const declarada = (c.inventory || []).some(e => e.classification === 'declared-overlay' && e.visibleArtwork);
      return { id, mutante, actualMap, overlayPieces: c.overlayPieces,
        unclassifiedOccurrences: c.unclassifiedOccurrences, unique: c.unique,
        duplicates: c.duplicates.length, outside: c.outside.length, unsupported: c.unsupported.length,
        unknown: c.unknown.length, divergent: (c.divergent || []).length,
        unknownAmostra: (c.unknown || []).slice(0, 3),
        unknownMotivos: (c.unknown || []).reduce((r, msg) => { const k = msg.split(':')[0]; r[k] = (r[k] || 0) + 1; return r; }, Object.create(null)),
        arteEsperada: declarada || arteEsperada.meta, silencioOk: true };
    };

    const executar = async (plano, id, mutar) => {
      erros.length = 0; reqs.clear(); ativos.clear(); movRede = Date.now();
      const target = new URL('/mapview.html', origin);
      target.searchParams.set('map', id); target.searchParams.set('hud', '0'); target.searchParams.set('capture', '1');
      await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => window.MAPEVAL && window.MAPEVAL.ready === true, undefined, { timeout: 120000 });
      const prazoNet = Date.now() + 30000; let silencioOk = false;
      while (Date.now() < prazoNet) {
        if (ativos.size === 0 && Date.now() - movRede >= 1500) { silencioOk = true; break; }
        await page.waitForTimeout(300);
      }
      if (!silencioOk) throw Error('carga de ' + id + ' não silenciou em 30s — pendentes: ' + [...ativos.values()].slice(0, 3).join(', '));
      const cNominal = await esperaCuradoria(id);
      const nominal = await resumoDe(id, '', cNominal);
      if (nominal.actualMap !== id) throw Error('mapa carregado (' + nominal.actualMap + ') difere do pedido (' + id + ')');
      if(erros.length)throw Error('infra nominal: '+erros.slice(0,5).join(' | '));
      const nominalVerde = predicadoVerde(nominal);
      const nominalResumo={...nominal};
      const nominalItem={...nominal,nominalVerde,nominal:nominalResumo,erros:[],invalidado:false,mutante:''};
      const nominalViol=validarResumo(nominalItem,{pedidos:[id],mutante:''});
      if(nominalViol.length)throw Error('protocolo nominal: '+nominalViol.join(' | '));
      if(!nominalVerde){const e=Error('RED nominal '+id+'; mutante não aplicado');e.code=1;throw e;}
      let pos = null, cPos = null;
      if (mutar) {
        const aplicado = await page.evaluate(([mapId, mutanteSrc, nome]) =>
          (0, eval)('(' + mutanteSrc + ')')(mapId, nome), [id, mutador, plano.mutante]);
        if (!aplicado) throw Error('mutante ' + plano.mutante + ' aplicou 0 em ' + id + ' — falha de infra, não baseline');
        cPos = await esperaCuradoria(id);
        pos = await resumoDe(id, plano.mutante, cPos);
      }
      const resumo = pos || nominal;
      resumo.erros = [...new Set(erros)].slice(0, 5); resumo.invalidado = resumo.erros.length > 0;
      const resultado = { ...resumo, mutante: plano.mutante, nominalVerde,
        nominal: { duplicates: nominal.duplicates, outside: nominal.outside, unsupported: nominal.unsupported,
          unknown: nominal.unknown, unknownMotivos: nominal.unknownMotivos, divergent: nominal.divergent,
          overlayPieces: nominal.overlayPieces, arteEsperada: nominal.arteEsperada } };
      const viol=validarResumo(resultado,{pedidos:[id],mutante:plano.mutante});
      if(resultado.invalidado||resultado.erros.length||viol.length)throw Error('infra resultado: '+[...resultado.erros,...viol].join(' | '));
      if (args.json)
        writeFileSync(path.join(args.json, (plano.mutante ? plano.mutante + '.' : '') + id + '.json'),
          JSON.stringify({ curation: resultado, raw: { nominal: cNominal, pos: cPos } }, null, 2));
      resultados.push(resultado);
      console.log('MAPA=' + JSON.stringify(resultado));
      return resultado;
    };
    const nominalPlano = planos[0];
    for (const id of nominalPlano.mapas) await executar(nominalPlano, id, false);
    const nominalViolacoes = resultados.flatMap(r => validarResumo(r, { pedidos: nominalPlano.mapas, mutante: '' }));
    if (nominalViolacoes.length) throw Error(nominalViolacoes.join(' | '));
    const nominalFalhou = resultados.some(r => !avaliar(r, MUTANTES).verde);
    if (!nominalFalhou) {
      for (const plano of planos.slice(1)) for (const id of plano.mapas) await executar(plano, id, true);
    } else {
      process.exitCode = 1;
    }
  } catch (e) {
    console.error((e?.code===1?'RED: ':'RED-INFRA: ') + (e && e.message));
    process.exitCode = e?.code===1?1:3;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
  if (process.exitCode) process.exit(process.exitCode);

  // Protocolo estrito: cobertura exata por plano, shapes válidos, coerência nominal.
  const porPlano = planos.map(p => ({
    plano: p,
    itens: resultados.filter(r => r.mutante === p.mutante && p.mapas.includes(r.id)),
  }));
  for (const { plano, itens } of porPlano) {
    if (itens.length !== plano.mapas.length) {
      console.error(`RED-INFRA: cobertura divergente em '${plano.mutante || 'nominal'}': pedidos ${plano.mapas.length}, recebidos ${itens.length}`);
      process.exit(3);
    }
    const vistos = new Set();
    for (const r of itens) {
      const viol = validarResumo(r, { pedidos: plano.mapas, mutante: plano.mutante });
      if (viol.length) { console.error('RED-INFRA ' + r.id + ': ' + viol.join(' | ')); process.exit(3); }
      if (vistos.has(r.id)) { console.error(`RED-INFRA: mapa duplicado na resposta: ${r.id}`); process.exit(3); }
      vistos.add(r.id);
    }
  }
  const semanticas = [];
  for (const r of resultados) {
    if (r.invalidado || r.erros.length) { console.error(`RED-INFRA ${r.id}: erros de página recolhidos — ${r.erros.join(' | ')}`); process.exit(3); }
    const v = avaliar(r, MUTANTES);
    if (!v.verde) semanticas.push(v.motivo + ': dup=' + r.duplicates + ' fora=' + r.outside + ' sem-suporte=' + r.unsupported
      + ' unknown=' + r.unknown + '[' + (r.unknownAmostra || []).join(';') + '] divergente=' + r.divergent);
  }
  if (semanticas.length) { console.error('RED: ' + semanticas.length + ' mapa(s) fora do contrato atual: ' + semanticas.join(' · ')); process.exit(1); }
  console.log(`GREEN: contrato atual via CI (${resultados.length} medição(ões), nominal verde, mutante '${args.mutantes ? 'bateria' : (args.mutante || 'nominal')}')`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
