#!/usr/bin/env node
/* ============================================================================
   diagnose.mjs — A CAMADA OPERACIONAL: o jogo se diagnostica e explica.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   A casa já tem as réguas certas — prod-coherence, eval:boot, site-smoke,
   assert:assets, o /api/health e o prod-watch a cada 15 min — e cada uma
   responde UMA pergunta com "verde/vermelho". O que faltava era quem junta os
   sinais e escreve a frase que o dono precisa ler às 2 h da manhã: qual é a
   causa provável, qual é a evidência, quem é afetado e qual é o próximo passo.
   E que separa "tecnicamente verde" (o que medi passou) de "pronto para
   lançamento" (medi tudo, no candidato certo, com prova de boot em navegador
   e telemetria viva). Ver docs/runbooks/operacao-autonoma.md.

   O QUE RODA (sem browser, node puro, ~20–60 s)
     remoto  boot (HTML → import map → main.js → version.js → grafo via
             prod-coherence) · api (health + N chamadas por rota leve, para
             separar 5xx constante de intermitente) · ranking (flag × backend ×
             página) · assets (amostra que o runtime pede, com Range GET no edge)
     local   boot-local (package.json × version.js × index.astro × grafo da
             árvore num servidor estático) · assets-local (existe e tem o
             cabeçalho certo) · partidas (Game real em node, todo mapa × modo)
     opcional  --browser (Playwright): boot no Chromium, erros, recursos
             falhos, snapshot do public/js/ops.js; --partida amostra FPS.

   SÓ LÊ: nenhum POST, nenhum beacon, nenhuma escrita fora de --out.

   USO
     node tools/ops/diagnose.mjs                       # produção + árvore
     node tools/ops/diagnose.mjs --local               # só a árvore (CI, sem rede)
     node tools/ops/diagnose.mjs --remoto --base=https://preview.vercel.app
     node tools/ops/diagnose.mjs --browser --partida   # com Chromium
     node tools/ops/diagnose.mjs --json                # saída para máquina
   Flags: --backend=<url> --mapas=all|N|a,b --repeticoes=5 --timeout=ms
          --out=<dir> (padrão artifacts/ops/<data>) --sem-coerencia
          --aceitar-sem-trafego --gpu|--sem-gpu (padrão: GPU no macOS com Chrome) --sem-arquivo

   SAÍDA: 0 tecnicamente verde · 1 vermelho · 3 inconclusivo (alvo inalcançável)
   A prova de que morde: `node tools/ops/selftest.mjs` (mutantes por sintoma).
   ============================================================================ */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sondaBootRemoto, sondaBootLocal } from './probes/boot.mjs';
import { sondaApi } from './probes/api.mjs';
import { sondaRanking } from './probes/ranking.mjs';
import { sondaAssetsRemoto, sondaAssetsLocal } from './probes/assets.mjs';
import { sondaPartidas } from './probes/match.mjs';
import { sondaNavegador, modoGpu } from './probes/browser.mjs';
import { explicar } from './lib/explain.mjs';
import { veredito, renderMarkdown, renderJson, codigoDeSaida } from './lib/report.mjs';
import { lerPackage, backendPadrao, RAIZ_PADRAO } from './lib/repo.mjs';

export function parseArgs(argv) {
  const flags = {}; const val = (k, d) => { const v = (argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('='); return v === '' ? d : v; };
  flags.base = (val('base', 'https://www.csbrasil.online')).replace(/\/$/, '');
  flags.backend = val('backend', null);
  flags.local = argv.includes('--local');
  flags.remoto = argv.includes('--remoto');
  if (!flags.local && !flags.remoto) { flags.local = true; flags.remoto = true; }
  flags.browser = argv.includes('--browser');
  flags.partida = argv.includes('--partida');
  flags.gpu = argv.includes('--gpu') ? true : argv.includes('--sem-gpu') ? false : null;
  flags.json = argv.includes('--json');
  flags.semArquivo = argv.includes('--sem-arquivo');
  flags.semCoerencia = argv.includes('--sem-coerencia');
  flags.aceitarSemTrafego = argv.includes('--aceitar-sem-trafego');
  flags.mapas = val('mapas', 'all');
  flags.repeticoes = Number(val('repeticoes', 5));
  flags.timeout = Number(val('timeout', 15_000));
  flags.out = val('out', null);
  flags.raiz = val('raiz', RAIZ_PADRAO);
  return flags;
}

export async function diagnosticar(flags, { log = () => {} } = {}) {
  const t0 = Date.now();
  const quando = new Date().toISOString();
  const raiz = flags.raiz;
  const comandos = [];
  const limitacoes = [];
  const sondas = {};
  const contexto = { raiz, base: flags.remoto ? flags.base : null, backend: null, versaoLocal: null, erroPackage: null };
  try { contexto.versaoLocal = lerPackage(raiz).version; } catch (e) { contexto.erroPackage = e.message; limitacoes.push(`package.json ilegível: ${e.message}`); }
  try { contexto.backend = flags.backend || backendPadrao(raiz); } catch (e) { limitacoes.push(`backend padrão não lido de apibase.js: ${e.message}`); }
  sondas.contexto = contexto;

  if (flags.remoto) {
    log(`▸ remoto: ${flags.base} (backend ${contexto.backend || '—'})`);
    comandos.push(`[${quando}] GET ${flags.base}/ · import map · /js/main.js · /js/version.js · node tools/eval/prod-coherence.mjs ${flags.base}`);
    const [boot, api, ranking] = await Promise.all([
      sondaBootRemoto(flags.base, { raiz, coerencia: !flags.semCoerencia, timeoutMs: flags.timeout }),
      sondaApi(flags.base, { backend: contexto.backend, repeticoes: flags.repeticoes, timeoutMs: flags.timeout }),
      sondaRanking(flags.base, { backend: contexto.backend, raiz, timeoutMs: flags.timeout }),
    ]);
    sondas.boot = boot; sondas.api = api; sondas.ranking = ranking;
    comandos.push(`[${quando}] GET ${contexto.backend || flags.base}/api/{health,online,map-plays,leaderboard} ×${flags.repeticoes} · GET ${flags.base}/ranking`);
    if (boot.html?.status === 200) {
      const mesmaVersao = !!boot.versaoHtml && boot.versaoHtml === contexto.versaoLocal;
      sondas.assets = await sondaAssetsRemoto(flags.base, { raiz, versao: boot.versaoHtml || contexto.versaoLocal, compararTamanho: mesmaVersao, timeoutMs: flags.timeout, registroUrls: { armas: boot.importMap?.['./js/weapons.js'] || null, personagens: boot.importMap?.['./js/glbchars.js'] || null } });
      comandos.push(`[${quando}] GET ${Object.values(sondas.assets.registros).map((r) => `${r.url} (${r.nome || ''}${r.origem})`).join(' · ')} · GET Range bytes=0-15 em ${sondas.assets.total} assets de ${flags.base} (?v=${boot.versaoHtml || contexto.versaoLocal})`);
      if (!mesmaVersao) limitacoes.push(`tamanho dos assets não comparado com o disco: produção ${boot.versaoHtml || '?'} ≠ árvore ${contexto.versaoLocal || '?'}`);
    } else {
      limitacoes.push('assets no edge não sondados: a raiz não respondeu 200');
    }
    if (flags.semCoerencia) limitacoes.push('coerência do grafo remoto pulada (--sem-coerencia)');
  }

  if (flags.local) {
    log('▸ local: árvore + partida sintética');
    comandos.push(`[${quando}] servidor estático de public/ + node tools/eval/prod-coherence.mjs http://127.0.0.1:<porta> · leitura de package.json, public/js/version.js, src/pages/index.astro, scripts/module-cache.mjs`);
    sondas.bootLocal = await sondaBootLocal({ raiz, coerencia: !flags.semCoerencia });
    sondas.assetsLocal = sondaAssetsLocal({ raiz });
    comandos.push(`[${quando}] node tools/ops/probes/match-worker.mjs --mapas=${flags.mapas} --modos=rounds,ctf --updates=600`);
    sondas.partidas = await sondaPartidas({ raiz, mapas: flags.mapas });
  }

  if (flags.browser) {
    if (!flags.remoto) limitacoes.push('--browser precisa de um alvo servido pelo Astro/produção (--remoto/--base); pulado');
    else {
      log('▸ navegador (Playwright)');
      comandos.push(`[${quando}] chromium ${flags.base}/?debug=1${flags.partida ? '&auto=E' : ''} (headless, ${modoGpu({ gpu: flags.gpu }).gpu ? 'gpu' : 'swiftshader'})`);
      sondas.navegador = await sondaNavegador(flags.base, { partida: flags.partida, gpu: flags.gpu, timeoutMs: Math.max(flags.timeout, 45_000) });
    }
  } else {
    limitacoes.push('sem sonda de navegador (passe --browser com Playwright instalado): o boot foi provado até o parse, não até a avaliação do main.js');
  }

  const achados = explicar(sondas);
  const v = veredito(achados, sondas, { aceitarSemTrafego: flags.aceitarSemTrafego });
  const diag = { alvo: flags.remoto ? flags.base : null, quando, flags: { ...flags }, contexto, veredito: v, achados, sondas, limitacoes, comandos, duracaoMs: Date.now() - t0 };
  return diag;
}

export function gravar(diag, flags) {
  if (flags.semArquivo) return null;
  const dir = flags.out || join(flags.raiz, 'artifacts', 'ops', diag.quando.replace(/[:.]/g, '-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'diagnostico.md'), renderMarkdown(diag));
  writeFileSync(join(dir, 'diagnostico.json'), renderJson(diag));
  return dir;
}

const ehMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (ehMain) {
  const flags = parseArgs(process.argv.slice(2));
  const diag = await diagnosticar(flags, { log: flags.json ? () => {} : (m) => console.error(m) });
  const dir = gravar(diag, flags);
  if (flags.json) console.log(renderJson(diag));
  else {
    console.log(renderMarkdown(diag));
    if (dir) console.error(`\nrelatório em ${dir}/diagnostico.md (+ .json)`);
  }
  process.exit(codigoDeSaida(diag.veredito));
}
