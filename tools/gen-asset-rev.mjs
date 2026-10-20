#!/usr/bin/env node
/* ============================================================================
   gen-asset-rev.mjs — REVISÃO POR ARQUIVO DOS BINÁRIOS PESADOS (/models, /audio)
   ----------------------------------------------------------------------------
   O CASO: `vercel.json` serve `/models/(.*)` com `max-age=31536000, immutable`.
   Com cache immutable quem invalida é a URL, e a URL dos GLB carregava
   `?v=${VERSION}` — a versão do RELEASE. O projeto solta vários releases por dia,
   então toda publicação trocava a query de TODOS os ~1,3 mil binários de uma vez
   e o navegador rebaixava centenas de MB mesmo sem um único byte de asset ter
   mudado. No app de loja (WebView Android, sem service worker) isso é o download
   inteiro de novo, em dado móvel, a cada release.

   A CORREÇÃO: a query passa a ser o hash do CONTEÚDO DAQUELE ARQUIVO. Release
   que não toca o GLB não muda a URL do GLB, e o cache de 1 ano finalmente vale.
   Mesmo desenho já usado em `tools/gen-brasoes-versao.mjs` (brasões) e no
   `gen-vmbytes.mjs` (viewmodels) — aqui é o mesmo contrato, outro acervo.

   O QUE ENTRA
     `public/models/**` menos `viewmodels/` — esse ramo já tem revisão por
     conteúdo própria (`data/vmbytes.js`, `data/weaponver.js`, `data/vmsharedver.js`)
     e duplicar o hash só engordaria o módulo.

   O QUE ENTRA SÓ QUANDO EXISTE: `public/audio/**`
     `public/audio/` é IGNORADO pelo git (`.gitignore`: o áudio shipa pelo
     `audio-pack.zip`, nunca pelo repositório). Um clone sem o pacote não tem os
     bytes, então hashear o áudio como os modelos tornaria o artefato gerado
     dependente de quem rodou o gerador — e o `--check` ficaria vermelho na
     metade das máquinas. Regra: raiz NÃO VERSIONADA é tolerante nos dois
     sentidos — arquivo no disco que falta no mapa não reprova (cai no fallback
     de VERSION, que é o comportamento de hoje) e entrada no mapa cujo arquivo
     não está no disco é PRESERVADA (quem tem o pacote gera, quem não tem não
     apaga). O build da Vercel roda `fetch-audio.sh` antes, então lá o áudio
     entra com hash de conteúdo.

   SAÍDA: `public/js/data/assetver.js` — `ASSET_REV` + o helper PURO `revDe()`.
   Quem monta URL é `public/js/data/asseturl.js` (`assetUrl`), que é escrito à
   mão porque precisa do fallback de VERSION.

   Uso:
     node tools/gen-asset-rev.mjs                     escreve o módulo
     node tools/gen-asset-rev.mjs --check             reprova se estiver defasado
     node tools/gen-asset-rev.mjs --check --mutante=defasado   prova que o --check morde
   ============================================================================ */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PUBLICO = join(ROOT, 'public');
export const OUT = join(PUBLICO, 'js', 'data', 'assetver.js');

/* Binário pesado = o que o jogo baixa inteiro antes de jogar. `.md`, `.txt` e
   `.blend` que convivem com os GLB no acervo ficam de fora: ninguém os pede. */
export const EXTENSOES = /\.(glb|bin|json|mp3|ogg|webp)$/i;

export const RAIZES = Object.freeze([
  { prefixo: 'models', versionado: true, podar: ['viewmodels'] },
  { prefixo: 'audio', versionado: false, podar: [] },
]);

export const TAMANHO_REV = 10;

/** Hash de conteúdo de um arquivo: sha256, 10 hex. */
export const revDeBytes = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, TAMANHO_REV);

/** Caminhos relativos a `public/`, ordenados, de uma raiz do acervo. */
export function varreRaiz(raiz, base = PUBLICO) {
  const inicio = join(base, raiz.prefixo);
  if (!existsSync(inicio)) return [];
  const achados = [];
  const anda = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name);
      const relativo = relative(inicio, caminho).split(sep).join('/');
      if (entrada.isDirectory()) {
        if (raiz.podar.some((p) => relativo === p || relativo.startsWith(`${p}/`))) continue;
        anda(caminho);
      } else if (entrada.isFile() && EXTENSOES.test(entrada.name)) {
        achados.push(`${raiz.prefixo}/${relativo}`);
      }
    }
  };
  anda(inicio);
  return achados.sort();
}

/**
 * Monta o mapa a partir do disco.
 * @param anterior mapa já publicado (para preservar raiz não versionada ausente)
 */
export function mapaDoDisco(anterior = {}, base = PUBLICO) {
  const mapa = {};
  for (const raiz of RAIZES) {
    for (const caminho of varreRaiz(raiz, base)) {
      mapa[caminho] = revDeBytes(readFileSync(join(base, ...caminho.split('/'))));
    }
    if (raiz.versionado) continue;
    // raiz não versionada: entrada herdada só sobrevive se o arquivo não está aqui
    for (const [caminho, rev] of Object.entries(anterior)) {
      if (!caminho.startsWith(`${raiz.prefixo}/`) || mapa[caminho]) continue;
      if (!existsSync(join(base, ...caminho.split('/')))) mapa[caminho] = rev;
    }
  }
  return Object.fromEntries(Object.keys(mapa).sort().map((k) => [k, mapa[k]]));
}

export const fonte = (mapa) => `// GERADO por tools/gen-asset-rev.mjs — não editar à mão (\`npm run gen:assetrev\`).
// Revisão de URL por ARQUIVO (sha256 dos bytes, ${TAMANHO_REV} hex) dos binários pesados de
// /models e /audio. Existe porque o edge serve /models como immutable por 1 ano e a
// query carregava a VERSION do release: toda publicação invalidava o acervo inteiro.
// Quem monta a URL (com fallback de VERSION) é ./asseturl.js.
export const ASSET_REV = Object.freeze({
${Object.entries(mapa).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
});

/* Helper PURO: aceita 'models/x.glb', '/models/x.glb' e './models/x.glb', com ou
   sem query. Devolve '' para o que não está no mapa — quem decide o fallback é
   o chamador, porque asset recém-adicionado precisa continuar carregando. */
export function revDe(caminho) {
  if (typeof caminho !== 'string' || !caminho) return '';
  const limpo = caminho.split(/[?#]/)[0].replace(/^\\.?\\//, '');
  return ASSET_REV[limpo] || '';
}
`;

/** Mapa já publicado em disco, lido do próprio módulo gerado. */
export async function mapaPublicado(arquivo = OUT) {
  if (!existsSync(arquivo)) return {};
  const mod = await import(`${pathToFileURL(arquivo).href}?t=${Date.now()}`);
  return { ...mod.ASSET_REV };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
  if (MUT && MUT !== 'defasado') { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }
  const anterior = await mapaPublicado();
  const mapa = mapaDoDisco(anterior);
  const total = Object.keys(mapa).length;
  if (!total) { console.error(`ASSET-REV: nenhum binário em ${PUBLICO}/{models,audio}`); process.exit(1); }
  const nova = fonte(mapa);
  if (process.argv.includes('--check')) {
    let atual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (MUT === 'defasado') atual = atual.replace(/": "[0-9a-f]{10}",/, '": "0000000000",');
    if (atual !== nova) {
      console.error('ASSET-REV: public/js/data/assetver.js defasado em relação a public/models;'
        + ' rode `npm run gen:assetrev` e commite (senão o jogador rebaixa o acervo inteiro'
        + ' no próximo release, ou pega o GLB velho por até 1 ano).');
      process.exit(1);
    }
    console.log(`ASSET-REV: ${total} binários com hash de conteúdo em dia`);
  } else {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, nova);
    console.log(`escrito ${relative(ROOT, OUT)}: ${total} binários`);
  }
}
