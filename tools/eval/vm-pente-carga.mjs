#!/usr/bin/env node
/* ============================================================================
   vm-pente-carga.mjs — O OSSO DO PENTE CARREGA ALGUMA GEOMETRIA?
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   A queixa do dono, na letra dele: *"vários rifles puxam o carregador mas o
   pente não sai, fica a mão puxando o nada."*

   Em 11/09 a `vm-recarga-probe.mjs` mediu a AK golden e achou **18,19 cm de
   curso no `Mag_metarig`**, com o estado em `reload` e a ação `Reload` tocando.
   Ou seja: a animação NÃO está parada. Se o osso anda e o dono não vê o pente
   sair, só sobra uma explicação física — **o osso anda vazio**.

   Esta régua responde exatamente isso, por arma: existe vértice preso a esse
   osso? Duas formas de estar preso, e ela conta as duas, porque o arsenal usa
   as duas:

     1. **skinning** — vértice de um `SkinnedMesh` com peso não-nulo no índice
        do osso dentro do `skeleton.bones`. É como a AK golden segura o pente.
     2. **parentesco** — malha pendurada como descendente do osso na cena. É
        como o caminho ENCAIXADO monta a arma Mint em tempo de execução.

   E CONTA A CARGA **VISÍVEL**, que é a coluna que decide
   Ter vértice preso não basta: no caminho ENCAIXADO, `hidePackGun`
   (`public/js/vmweapon.js:35-38`) apaga a arma do pack inteira — inclusive o
   pente skinnado — e põe no lugar o wrap Mint, pendurado no soquete da arma com
   o carregador SOLDADO ao corpo. O osso continua puxando geometria, só que
   invisível. É a queixa do dono ao pé da letra, e uma régua que conta só
   vértice preso passa VERDE em cima dela.

   O QUE ELA NÃO MEDE, DE PROPÓSITO
   Não julga se o curso é bonito, nem se o pente tem a forma certa, nem se o
   material está certo. Responde UMA pergunta: **tem carga no osso?** Um osso com
   carga pode animar feio; um osso sem carga não anima nada, e é esse o defeito
   relatado.

   POR QUE NÃO USA `parts.mag` DO `vmconfig.js`
   Porque `parts.mag` é a declaração de uma *intenção* de recorte para o
   `splitParts`, e a investigação de 11/09 mostrou que esse caminho não é o que
   serve o arsenal jogável. Régua que lê declaração mede o que alguém escreveu;
   esta lê o GLB que o jogo carregou.

   USO
     node tools/eval/vm-pente-carga.mjs --porta=4361
     node tools/eval/vm-pente-carga.mjs --armas=ak,awp,pistol --porta=4361 --json
   ========================================================================== */

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const PORTA = arg('porta', '4361');
const BASE = `http://127.0.0.1:${PORTA}`;
const JSON_OUT = process.argv.includes('--json');
const MUTANTE = arg('mutante');

const PADRAO = ['ak', 'm4', 'md97', 'scar', 'famas', 'm92', 'sks', 'svd', 'mosin', 'lmg',
  'mp5', 'uzi', 'p90', 'tavor', 'awp', 'shotgun', 'carbine', 'g3', 'pistol', 'deagle', 'revolver38'];
const ARMAS = (arg('armas') || arg('arma') || PADRAO.join(',')).split(',').filter(Boolean);

/* Piso: a AK aprovada carrega 1.516 vértices no `Mag_metarig` (medido em 11/09).
   Abaixo de ~50 vértices não existe caixa de carregador — é um parafuso solto
   preso por engano, e visualmente lê como "a mão puxa o nada". */
const PISO_VERTS = 50;

/* MUTANTES (lei 2)

   `sempeso`  — ignora o skinning e conta só malha pendurada. Reintroduz, na AK
                golden, exatamente o defeito que o dono relata nas outras: o osso
                fica sem carga. Espera VERMELHO na `ak`.
   `semfilho` — ignora o parentesco e conta só peso. Espera VERMELHO em arma cujo
                pente foi recortado por `splitParts` e pendurado no osso. **Ainda
                sem alvo em 11/09**: nenhuma arma jogável declara `parts`, então
                este mutante não foi demonstrado. Ele passa a valer quando as
                caixas do BUG-90 entrarem.

     node tools/eval/vm-pente-carga.mjs --armas=ak --mutante=sempeso   # espera VERMELHO

   Medido em 11/09: sem mutante a `ak` dá 783 visíveis de 783 presos; com
   `sempeso` cai para 0 de 0 e a régua sai 1. */

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});

const resultados = [];

for (const arma of ARMAS) {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  try {
    await page.goto(`${BASE}/?debug=1&vmauthored=1&auto=E&vmweapon=${arma}&map=brasilia&armaslazy=0`,
      { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForFunction((w) => Boolean(window.__authoredVm?.entry?.(w)?.scene), arma, { timeout: 120000 });

    const medido = await page.evaluate(([nome, mutante]) => {
      const entry = window.__authoredVm.entry(nome);
      const ossosMag = [];
      const peles = [];
      entry.scene.traverse((o) => {
        if (o.isBone && /^mag/i.test(o.name || '')) ossosMag.push(o);
        if (o.isSkinnedMesh) peles.push(o);
      });
      if (!ossosMag.length) {
        // Sem osso de pente não há o que puxar: a recarga é só braço.
        return { caminho: entry.key, osso: null, verts: 0, vis: 0, via: 'sem osso de pente', peles: peles.length };
      }

      let melhor = { osso: '', verts: 0, via: '' };
      for (const osso of ossosMag) {
        // (1) skinning: vértice com peso não-nulo no índice deste osso.
        let porPeso = 0;
        let porPesoVisivel = 0;
        for (const pele of peles) {
          const i = pele.skeleton?.bones?.indexOf(osso) ?? -1;
          if (i < 0) continue;
          const idx = pele.geometry.attributes.skinIndex;
          const w = pele.geometry.attributes.skinWeight;
          if (!idx || !w) continue;
          if (mutante === 'sempeso') continue;
          // `getComponent` não existe em todo BufferAttribute desta versão do
          // Three: lê o array cru, que é estável.
          const ai = idx.array; const aw = w.array; const passo = idx.itemSize;
          let n = 0;
          for (let v = 0; v < idx.count; v += 1) {
            for (let c = 0; c < passo; c += 1) {
              if (ai[v * passo + c] === i && aw[v * w.itemSize + c] > 0.01) { n += 1; break; }
            }
          }
          porPeso += n;
          // `visible` não é herdado: um pai apagado apaga o filho na renderização.
          let vis = pele.visible;
          for (let o = pele.parent; o && vis; o = o.parent) vis = o.visible !== false || o === entry.mount;
          if (vis) porPesoVisivel += n;
        }
        // (2) parentesco: malha pendurada no osso (caminho ENCAIXADO).
        let porFilho = 0;
        let porFilhoVisivel = 0;
        osso.traverse((o) => {
          if (mutante === 'semfilho') return;
          if (o !== osso && o.isMesh && o.geometry?.attributes?.position) {
            const n = o.geometry.attributes.position.count;
            porFilho += n;
            if (o.visible) porFilhoVisivel += n;
          }
        });
        const total = porPeso + porFilho;
        if (total > melhor.verts) {
          melhor = { osso: osso.name, verts: total, vis: porPesoVisivel + porFilhoVisivel,
            via: porFilho > porPeso ? 'filho' : 'skin' };
        }
        if (!melhor.osso) melhor = { osso: osso.name, verts: 0, vis: 0, via: '—' };
      }
      /* Qual arma está de fato na tela: sem isso não se distingue "o pente está
         escondido" de "a arma inteira é outra" (`pistol` mostra a SK_G18 do pack). */
      const armaVisivel = [];
      entry.scene.traverse((o) => {
        if (!o.isMesh || !o.visible) return;
        if (/Requests_Studio_Hands|Hand-Tool|armmesh|glove|sleeve/i.test(o.name || '')) return;
        let vis = true;
        for (let a = o.parent; a && vis; a = a.parent) vis = a.visible !== false || a === entry.mount;
        if (vis) armaVisivel.push(o.name);
      });
      return { caminho: entry.key, ossos: ossosMag.map((o) => o.name), peles: peles.length,
        temMint: Boolean(entry.mint?.active), armaVisivel: armaVisivel.slice(0, 6), ...melhor };
    }, [arma, MUTANTE]);

    resultados.push({ arma, ...medido });
  } catch (e) {
    resultados.push({ arma, erro: String(e).slice(0, 100) });
  } finally {
    await page.close();
  }
}

await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify({ piso_verts: PISO_VERTS, resultados }, null, 2));
} else {
  console.log(`\n  CARGA NO OSSO DO PENTE (piso ${PISO_VERTS} vértices)${MUTANTE ? ` · MUTANTE ${MUTANTE}` : ''}\n`);
  for (const r of resultados) {
    if (r.erro) { console.log(`  ✗ ${r.arma.padEnd(11)} ${r.erro}`); continue; }
    const ok = (r.vis || 0) >= PISO_VERTS;
    const oculta = (r.verts || 0) >= PISO_VERTS && (r.vis || 0) < PISO_VERTS ? '  ← carga OCULTA' : '';
    console.log(`  ${ok ? '✓' : '✗'} ${r.arma.padEnd(11)} ${String(r.vis || 0).padStart(6)} vis / ${String(r.verts).padStart(6)} presos  ${(r.via || '').padEnd(6)} ${(r.osso || '—').padEnd(18)} ${r.caminho}${oculta}`);
    console.log(`      mint montada: ${r.temMint ? 'sim' : 'NÃO'} · na tela: ${(r.armaVisivel || []).join(', ') || '(nenhuma malha de arma visível)'}`);
  }
  // Erro NÃO é aprovação: contar só quem mediu de verdade imprime verde por cima
  // de arma que nem chegou a ser medida.
  const erros = resultados.filter((r) => r.erro);
  const verdes = resultados.filter((r) => !r.erro && (r.vis || 0) >= PISO_VERTS);
  const vazios = resultados.filter((r) => !r.erro && (r.vis || 0) < PISO_VERTS);
  console.log(`\n  ${verdes.length}/${resultados.length} com carga VISÍVEL · ${vazios.length} puxando o nada · ${erros.length} sem medida\n`);
}

const falhas = resultados.filter((r) => r.erro || (r.vis ?? 0) < PISO_VERTS);
process.exit(falhas.length ? 1 : 0);
