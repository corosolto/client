#!/usr/bin/env node
/* ============================================================================
   asset-rev-check.mjs — A REVISÃO DOS BINÁRIOS PESADOS É POR ARQUIVO?
   ----------------------------------------------------------------------------
   O CASO: `vercel.json` serve `/models/(.*)` com `max-age=31536000, immutable`.
   Em cache immutable quem invalida é a URL — e a URL dos GLB carregava
   `?v=${VERSION}`, a versão do RELEASE. Com vários releases por dia, toda
   publicação trocava a query dos ~1,3 mil binários de uma vez e o jogador
   rebaixava o acervo inteiro sem um byte de asset ter mudado. No app de loja
   (WebView Android, que não tem service worker) isso são centenas de MB em dado
   móvel, a cada release.

   O QUE MEDE (node puro, sem Chrome):
   AR1  `public/js/data/assetver.js` está em dia com o disco (o `--check` do
        gerador é o mesmo que roda aqui);
   AR2  nenhum consumidor de binário pesado de /models ou /audio monta URL com
        `?v=${VERSION}` na mão — lê os FONTES de `public/js/**`;
   AR3  bump de VERSION NÃO muda a URL de um asset inalterado (duas versões
        diferentes sobre o mesmo mapa dão a mesma URL), e a URL de um GLB real
        do acervo não carrega a VERSION;
   AR4  alterar 1 byte de um asset muda a revisão DAQUELE asset e só dele
        (acervo de mentira em diretório temporário, com o gerador de verdade);
   AR5  asset ausente do mapa cai no fallback de VERSION — asset novo que ainda
        não passou pelo gerador PRECISA continuar carregando.
   AR6  todo consumidor runtime do manifesto mutável de skins usa assetUrl(), cuja
        revisão por conteúdo vence o cache immutable do navegador.

   MUTAÇÕES (aplicam no disco e são restauradas no finally):
     `versao-crua`    devolve um consumidor ao `?v=${VERSION}` → AR2 tem que morder;
     `rev-ignorada`   faz o helper ignorar a rev e usar sempre a versão → AR3 tem que morder;
     `manifesto-cru` devolve a loja à URL sem revisão → AR6 tem que morder;
     `mapa-defasado`  envelhece o mapa publicado (no gerador) → AR1 tem que morder.

   Uso: node tools/eval/asset-rev-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { mapaDoDisco, revDeBytes, TAMANHO_REV } from '../gen-asset-rev.mjs';

const ROOT = join(import.meta.dirname, '../..');
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];

/* [arquivo, trecho original, trecho mutado, prefixo da cláusula que tem que morder] */
const mutacoes = {
  'versao-crua': [
    'public/js/mapprops.js',
    'assetUrl(`models/props/${id}.glb`)',
    '`models/props/${id}.glb?v=${VERSION}`',
    'AR2:',
  ],
  'rev-ignorada': [
    'public/js/data/asseturl.js',
    'encodeURIComponent(rev || versao)',
    'encodeURIComponent(versao)',
    'AR3:',
  ],
  'manifesto-cru': [
    'public/js/treta-store.js',
    "fetch(assetUrl('models/skins/manifest.json')",
    "fetch('models/skins/manifest.json'",
    'AR6:',
  ],
  'mapa-defasado': [null, null, null, 'AR1:'],
};
if (mutante && !mutacoes[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);

const especificacao = mutante ? mutacoes[mutante] : null;
const alvo = especificacao?.[0] ? join(ROOT, especificacao[0]) : null;
const original = alvo ? readFileSync(alvo, 'utf8') : null;
if (alvo) {
  const ocorrencias = original.split(especificacao[1]).length - 1;
  if (ocorrencias !== 1) throw new Error(`mutante exige âncora única: ${mutante} (${ocorrencias})`);
  const src = original.replace(especificacao[1], especificacao[2]);
  if (src === original) throw new Error(`mutante não aplicou: ${mutante}`);
  writeFileSync(alvo, src);
}

let falhas = [];
let temporario = null;
try {
  // ── AR1 ────────────────────────────────────────────────────────────────────
  const argsGerador = ['tools/gen-asset-rev.mjs', '--check'];
  if (mutante === 'mapa-defasado') argsGerador.push('--mutante=defasado');
  const gerador = spawnSync(process.execPath, argsGerador, { cwd: ROOT, encoding: 'utf8' });
  if (gerador.status !== 0) {
    falhas.push(`AR1: assetver.js defasado — ${(gerador.stderr || gerador.stdout || '').trim().split('\n')[0]}`);
  }

  // ── AR2 ────────────────────────────────────────────────────────────────────
  /* Quem é "binário pesado": a linha fala de /models, /audio ou de uma extensão
     de acervo. `/img`, `/video` e os viewmodels privados ficam de fora — têm
     cache e revisão próprios, e não é deste portão cobrá-los. */
  const PESADO = /models\/|audio\/|\.(glb|bin|mp3|ogg)\b/;
  const VERSAO_CRUA = /v=\$\{\s*(VERSION|version)\s*\}/;
  const fontes = [];
  const anda = (dir) => {
    for (const nome of readdirSync(dir).sort()) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) { anda(caminho); continue; }
      if (nome.endsWith('.js')) fontes.push(caminho);
    }
  };
  anda(join(ROOT, 'public/js'));
  // `data/` é o mapa gerado + o helper: é o lugar onde o fallback de VERSION MORA.
  const consumidores = fontes.filter((f) => !relative(join(ROOT, 'public/js'), f).split(sep)[0].startsWith('data'));
  for (const arquivo of consumidores) {
    const linhas = readFileSync(arquivo, 'utf8').split('\n');
    linhas.forEach((linha, i) => {
      if (!VERSAO_CRUA.test(linha) || !PESADO.test(linha)) return;
      /* viewmodels privados têm revisão própria por bytes (vmbytes/weaponver) e
         não moram em /models nem em /audio */
      if (/private-assets|viewmodels/.test(linha)) return;
      /* `/audio/manifest.json` é o ÍNDICE do acervo, servido com
         `max-age=0, must-revalidate`: ele TEM que seguir o release. */
      if (/audio\/manifest\.json/.test(linha)) return;
      falhas.push(`AR2: ${relative(ROOT, arquivo)}:${i + 1} ainda monta URL de binário pesado com a VERSION do release — ${linha.trim().slice(0, 96)}`);
    });
  }

  // ── AR6 ────────────────────────────────────────────────────────────────────
  /* O manifesto é JSON, mas a hospedagem serve /models como immutable por um ano.
     Purge resolve o edge; só revisão na URL vence a cópia já guardada no navegador. */
  const manifestoSkins = 'models/skins/manifest.json';
  const consumidoresManifesto = ['public/js/treta-store.js', 'public/js/glbchars.js', 'public/charvideo.html'];
  for (const caminho of consumidoresManifesto) {
    const fonte = readFileSync(join(ROOT, caminho), 'utf8');
    const usaRevisao = fonte.includes(`assetUrl('${manifestoSkins}')`) || fonte.includes(`assetUrl("${manifestoSkins}")`);
    const buscaCrua = /fetch\(\s*['"]\/?models\/skins\/manifest\.json['"]\s*(?:,|\))/.test(fonte);
    if (!usaRevisao || buscaCrua) {
      falhas.push(`AR6: ${caminho} busca o manifesto de skins sem revisão por conteúdo — navegador pode guardar catálogo velho por um ano`);
    }
  }

  // ── AR3 / AR5 ──────────────────────────────────────────────────────────────
  const selo = `${mutante || 'base'}-${Date.now()}`;
  const { urlComRev } = await import(`${pathToFileURL(join(ROOT, 'public/js/data/asseturl.js')).href}?m=${selo}`);
  const { ASSET_REV, revDe } = await import(`${pathToFileURL(join(ROOT, 'public/js/data/assetver.js')).href}?m=${selo}`);

  const RELEASE_A = '2.1.0-alpha.111';
  const RELEASE_B = '2.1.0-alpha.112';
  const inalterado = 'models/characters/esquerdomacho.glb';
  const revInalterada = revDe(inalterado);
  if (!revInalterada) {
    falhas.push(`AR3: ${inalterado} não está no mapa — a régua perdeu o asset de referência`);
  } else {
    const a = urlComRev(inalterado, revInalterada, RELEASE_A);
    const b = urlComRev(inalterado, revInalterada, RELEASE_B);
    if (a !== b) falhas.push(`AR3: bump de release mudou a URL de um asset inalterado (${a} → ${b})`);
    if (a.includes(RELEASE_A)) falhas.push(`AR3: a URL do GLB ainda carrega a versão do release (${a})`);
    if (!a.endsWith(`?v=${revInalterada}`)) falhas.push(`AR3: a URL não terminou na revisão por conteúdo (${a})`);
  }
  // o mapa precisa ser de CONTEÚDO, não um apelido do release: revisões distintas por arquivo
  const revs = new Set(Object.values(ASSET_REV));
  if (revs.size < 2) falhas.push(`AR3: o mapa tem ${revs.size} revisão(ões) distinta(s) — não é hash de conteúdo`);
  for (const [caminho, rev] of Object.entries(ASSET_REV)) {
    if (new RegExp(`^[0-9a-f]{${TAMANHO_REV}}$`).test(rev)) continue;
    falhas.push(`AR3: revisão fora do formato em ${caminho}: ${JSON.stringify(rev)}`);
    break;
  }

  const novoNoDisco = 'models/props/asset-que-ainda-nao-passou-pelo-gerador.glb';
  if (revDe(novoNoDisco)) falhas.push('AR5: a régua escolheu um caminho que existe no mapa');
  const urlNova = urlComRev(novoNoDisco, revDe(novoNoDisco), RELEASE_B);
  if (urlNova !== `${novoNoDisco}?v=${RELEASE_B}`) {
    falhas.push(`AR5: asset fora do mapa não caiu no fallback de VERSION (${urlNova})`);
  }
  // o fallback vale também para o override de ?animdir=, que aponta para pasta fora do acervo
  if (urlComRev('models/anims/experimental', '', RELEASE_B) !== `models/anims/experimental?v=${RELEASE_B}`) {
    falhas.push('AR5: caminho sem revisão conhecida não caiu no fallback');
  }

  // ── AR4 ────────────────────────────────────────────────────────────────────
  /* Acervo de mentira num diretório temporário, lido pelo gerador DE VERDADE:
     prova que a revisão é do arquivo, não do lote. */
  temporario = mkdtempSync(join(tmpdir(), 'asset-rev-'));
  mkdirSync(join(temporario, 'models', 'props'), { recursive: true });
  const bytesA = Buffer.from('glTF-mentira-A-'.repeat(64));
  const bytesB = Buffer.from('glTF-mentira-B-'.repeat(64));
  writeFileSync(join(temporario, 'models', 'props', 'a.glb'), bytesA);
  writeFileSync(join(temporario, 'models', 'props', 'b.glb'), bytesB);
  const antes = mapaDoDisco({}, temporario);
  const mexido = Buffer.from(bytesA);
  mexido[0] ^= 0x01;                                      // UM byte
  writeFileSync(join(temporario, 'models', 'props', 'a.glb'), mexido);
  const depois = mapaDoDisco({}, temporario);
  if (Object.keys(antes).length !== 2 || Object.keys(depois).length !== 2) {
    falhas.push(`AR4: o gerador viu ${Object.keys(antes).length}/${Object.keys(depois).length} arquivos no acervo de teste, queria 2/2`);
  } else {
    if (antes['models/props/a.glb'] === depois['models/props/a.glb']) {
      falhas.push('AR4: 1 byte trocado NÃO mudou a revisão do arquivo mexido');
    }
    if (antes['models/props/b.glb'] !== depois['models/props/b.glb']) {
      falhas.push('AR4: mexer num asset mudou a revisão de outro — o cache do vizinho morreu à toa');
    }
    if (depois['models/props/a.glb'] !== revDeBytes(mexido)) {
      falhas.push('AR4: a revisão publicada não é o hash dos bytes do arquivo');
    }
  }

  // ── veredito ───────────────────────────────────────────────────────────────
  if (mutante) {
    const prefixo = especificacao[3];
    const morde = falhas.length > 0 && falhas.every((f) => f.startsWith(prefixo));
    if (morde) {
      console.log(`mutante ${mutante} reprovado como devia: ${falhas[0]}`);
      falhas = [];
    } else {
      console.error(`MUTAÇÃO PASSOU — ${mutante} não foi visto pela régua (${falhas.length} falha(s): ${falhas.map((f) => f.slice(0, 4)).join(',') || 'nenhuma'}).`);
      process.exitCode = 1;
    }
  } else if (falhas.length) {
    console.error('revisão de asset reprovada:');
    for (const f of falhas) console.error(`  ✗ ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`revisão de asset confere: ${Object.keys(ASSET_REV).length} binários com hash de conteúdo, `
      + `${consumidores.length} fontes sem \`?v=\${VERSION}\` em /models e /audio, manifesto de skins versionado em ${consumidoresManifesto.length} consumidores, fallback de release preservado.`);
  }
} finally {
  if (alvo) writeFileSync(alvo, original);
  if (temporario) rmSync(temporario, { recursive: true, force: true });
}
process.exit(process.exitCode || 0);
